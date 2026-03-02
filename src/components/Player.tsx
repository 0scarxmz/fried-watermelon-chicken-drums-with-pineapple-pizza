"use client";

import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody, RapierRigidBody, BallCollider, useRapier } from "@react-three/rapier";

export default function Player() {
    const rbRef = useRef<RapierRigidBody>(null);
    const meshRef = useRef<THREE.Group>(null);
    const flipRef = useRef<THREE.Group>(null);

    const { rapier, world } = useRapier();

    const canDoubleJump = useRef(false);
    const isFlipping = useRef(false);
    const flipAngle = useRef(0);
    const wasJumpPressed = useRef(false);
    const lastPushTime = useRef(0);

    // FIX: Using refs for the camera prevents it from violently snapping on React re-renders!
    const smoothedCameraPosition = useRef(new THREE.Vector3(0, 10, -10));
    const smoothedCameraTarget = useRef(new THREE.Vector3());

    const [, getKeys] = useKeyboardControls();

    const { scene, materials } = useGLTF('/skateboard.glb') as any;

    useEffect(() => {
        if (materials && materials.colormap) {
            scene.traverse((child: any) => {
                if (child.isMesh) {
                    child.material = materials.colormap;
                }
            });
        }
    }, [scene, materials]);

    useFrame((state, delta) => {
        if (!rbRef.current) return;

        const keys = getKeys() as any;
        const { forward, backward, left, right, jump } = keys;
        const now = state.clock.getElapsedTime();

        const pos = rbRef.current.translation();
        const vel = rbRef.current.linvel();
        const rot = rbRef.current.rotation();

        if (pos.y < -15) {
            rbRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true);
            rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            return;
        }

        const rbQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
        const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(rbQuat);

        // FIX: Start ray slightly BELOW the rigid body center. 
        // This guarantees the ray NEVER hits the player's own colliders, fully fixing jumps.
        const rayOrigin = { x: pos.x, y: pos.y - 0.1, z: pos.z };
        const rayDir = { x: 0, y: -1, z: 0 };
        const ray = new rapier.Ray(rayOrigin, rayDir);
        const hit = world.castRay(ray, 1.5, true);

        let floorNormal = new THREE.Vector3(0, 1, 0);
        let isGrounded = false;

        // Since we start the ray 0.1 units lower, the ground should be ~0.1 units away on a flat surface
        if (hit && hit.toi < 0.35) {
            isGrounded = true;
            floorNormal.set(hit.normal.x, hit.normal.y, hit.normal.z);
        }

        const slopeForward = forwardDir.clone().projectOnPlane(floorNormal).normalize();

        // --- MOVEMENT & PHYSICS ---
        if (isGrounded) {
            if (forward && now - lastPushTime.current > 1.2) {
                lastPushTime.current = now;
                const pushForce = slopeForward.clone().multiplyScalar(25);
                rbRef.current.applyImpulse({ x: pushForce.x, y: pushForce.y, z: pushForce.z }, true);
                if (meshRef.current) meshRef.current.position.z = 0.5;
            }

            if (backward) {
                const brakeForce = slopeForward.clone().multiplyScalar(-30 * delta);
                rbRef.current.applyImpulse({ x: brakeForce.x, y: brakeForce.y, z: brakeForce.z }, true);
            }

            const currentVelocity = new THREE.Vector3(vel.x, vel.y, vel.z);
            const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(rbQuat).projectOnPlane(floorNormal).normalize();
            
            const lateralSpeed = currentVelocity.dot(rightDir);
            const lateralForce = rightDir.clone().multiplyScalar(-50 * lateralSpeed * delta);
            rbRef.current.applyImpulse({ x: lateralForce.x, y: lateralForce.y, z: lateralForce.z }, true);

            rbRef.current.applyImpulse({ x: -floorNormal.x * 2, y: -floorNormal.y * 2, z: -floorNormal.z * 2 }, true);
        } else {
            if (forward) rbRef.current.applyImpulse(forwardDir.clone().multiplyScalar(10 * delta), true);
            if (backward) rbRef.current.applyImpulse(forwardDir.clone().multiplyScalar(-10 * delta), true);
        }

        // --- TURNING ---
        let turnSpeed = 0;
        if (left) turnSpeed = 4.0;
        if (right) turnSpeed = -4.0;
        
        const currentSpeed = new THREE.Vector3(vel.x, vel.y, vel.z).length();
        if (currentSpeed > 1 || !isGrounded) {
            rbRef.current.setAngvel({ x: 0, y: turnSpeed, z: 0 }, true);
            
            if (isGrounded && turnSpeed !== 0) {
                const flatVel = new THREE.Vector3(vel.x, 0, vel.z);
                const flatSpeed = flatVel.length();
                const newVel = forwardDir.clone().multiplyScalar(flatSpeed);
                rbRef.current.setLinvel({ x: newVel.x, y: vel.y, z: newVel.z }, true);
            }
        } else {
            rbRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }

        // --- JUMPING ---
        if (jump && !wasJumpPressed.current) {
            if (isGrounded) {
                rbRef.current.applyImpulse({ x: 0, y: 16, z: 0 }, true);
                canDoubleJump.current = true;
            } else if (canDoubleJump.current) {
                rbRef.current.setLinvel({ x: vel.x, y: Math.max(vel.y, 0) + 12, z: vel.z }, true);
                canDoubleJump.current = false;

                isFlipping.current = true;
                flipAngle.current = 0;
            }
        }
        wasJumpPressed.current = jump;

        if (isGrounded && isFlipping.current) {
            isFlipping.current = false;
            flipAngle.current = 0;
        }

        // --- VISUALS ---
        if (meshRef.current) {
            meshRef.current.position.lerp(new THREE.Vector3(0, 0, 0), 8 * delta);

            const targetUp = floorNormal.clone().normalize();
            const targetForward = forwardDir.clone().projectOnPlane(targetUp).normalize();
            
            // FIX: The cross product was reversed, generating an invalid, corrupted math matrix.
            // This is exactly why the skateboard mesh was breaking and refusing to turn visually!
            const targetRight = new THREE.Vector3().crossVectors(targetUp, targetForward).normalize();
            
            const targetMat = new THREE.Matrix4().makeBasis(targetRight, targetUp, targetForward);
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetMat);

            const localTargetQuat = targetQuat.clone().premultiply(rbQuat.clone().invert());

            let targetLean = 0;
            if (left && (forward || backward)) targetLean = -0.25;
            if (right && (forward || backward)) targetLean = 0.25;
            const leanQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), targetLean);

            localTargetQuat.multiply(leanQuat);
            meshRef.current.quaternion.slerp(localTargetQuat, 15 * delta);
        }

        if (flipRef.current) {
            if (isFlipping.current) {
                flipAngle.current += Math.PI * 6 * delta;
                if (flipAngle.current >= Math.PI * 2) {
                    flipAngle.current = 0;
                    isFlipping.current = false;
                }
            }
            flipRef.current.rotation.z = flipAngle.current;
        }

        // --- CAMERA ---
        const playerPosVec = new THREE.Vector3(pos.x, pos.y, pos.z);
        const idealOffset = forwardDir.clone().multiplyScalar(-10).add(new THREE.Vector3(0, 6, 0));
        const idealPosition = playerPosVec.clone().add(idealOffset);
        const idealTarget = playerPosVec.clone().add(forwardDir.clone().multiplyScalar(15));

        // Using refs for smooth camera lerping ensures it survives React state changes
        smoothedCameraPosition.current.lerp(idealPosition, 5 * delta);
        smoothedCameraTarget.current.lerp(idealTarget, 10 * delta);

        state.camera.position.copy(smoothedCameraPosition.current);
        state.camera.lookAt(smoothedCameraTarget.current);
    });

    return (
        <RigidBody
            ref={rbRef}
            colliders={false}
            mass={1}
            type="dynamic"
            position={[0, 5, 0]}
            friction={0}
            restitution={0}
            enabledRotations={[false, true, false]}
            linearDamping={0.4}
            angularDamping={4}
        >
            <BallCollider args={[0.2]} position={[0, 0.2, 0.4]} />
            <BallCollider args={[0.2]} position={[0, 0.2, -0.4]} />

            <group ref={meshRef} position={[0, 0, 0]}>
                <group ref={flipRef}>
                    <primitive object={scene} position={[0, -0.2, 0]} rotation={[0, Math.PI, 0]} scale={6.75} />
                </group>
            </group>
        </RigidBody>
    );
}

useGLTF.preload('/skateboard.glb');
