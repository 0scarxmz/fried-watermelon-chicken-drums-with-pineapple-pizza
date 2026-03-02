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

    // Push timer
    const lastPushTime = useRef(0);

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

    const cameraTarget = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();

    useFrame((state, delta) => {
        if (!rbRef.current) return;

        const { forward, backward, left, right, jump } = getKeys() as any;
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

        // Raycast straight down from center. 
        // We use two BallColliders on the ends so the center is EMPTY.
        // This ensures the raycast ONLY hits the floor and NEVER the player!
        const rayOrigin = { x: pos.x, y: pos.y + 0.4, z: pos.z };
        const rayDir = { x: 0, y: -1, z: 0 };
        const ray = new rapier.Ray(rayOrigin, rayDir);
        const hit = world.castRay(ray, 1.5, true);

        let floorNormal = new THREE.Vector3(0, 1, 0);
        let isGrounded = false;

        // Ground check: Ray starts at pos.y + 0.4. Floor is around pos.y. So toi should be ~0.4.
        if (hit && hit.toi < 0.65) {
            isGrounded = true;
            floorNormal.set(hit.normal.x, hit.normal.y, hit.normal.z);
        }

        const slopeForward = forwardDir.clone().projectOnPlane(floorNormal).normalize();

        // --- MOVEMENT & PHYSICS ---
        if (isGrounded) {
            // Push Mechanic: massive burst of speed every 1.2 seconds
            if (forward && now - lastPushTime.current > 1.2) {
                lastPushTime.current = now;
                const pushForce = slopeForward.clone().multiplyScalar(25);
                rbRef.current.applyImpulse({ x: pushForce.x, y: pushForce.y, z: pushForce.z }, true);
                
                // Visual jolt to show the push
                if (meshRef.current) meshRef.current.position.z = 0.5;
            }

            // Braking / Fakie
            if (backward) {
                const brakeForce = slopeForward.clone().multiplyScalar(-30 * delta);
                rbRef.current.applyImpulse({ x: brakeForce.x, y: brakeForce.y, z: brakeForce.z }, true);
            }

            const currentVelocity = new THREE.Vector3(vel.x, vel.y, vel.z);
            const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(rbQuat).projectOnPlane(floorNormal).normalize();
            
            // Grip: Kill lateral sliding
            const lateralSpeed = currentVelocity.dot(rightDir);
            const lateralForce = rightDir.clone().multiplyScalar(-lateralSpeed * 50 * delta);
            rbRef.current.applyImpulse({ x: lateralForce.x, y: lateralForce.y, z: lateralForce.z }, true);

            // Downward pull to stick to ramps
            rbRef.current.applyImpulse({ x: -floorNormal.x * 2, y: -floorNormal.y * 2, z: -floorNormal.z * 2 }, true);
        } else {
            // Minimal air control
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
            
            // Redirect momentum so the skateboard actually changes movement direction when turning
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
                // First Jump
                rbRef.current.applyImpulse({ x: 0, y: 16, z: 0 }, true);
                canDoubleJump.current = true;
            } else if (canDoubleJump.current) {
                // Double Jump / Kickflip
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
            // Smoothly recover from the push jolt
            meshRef.current.position.lerp(new THREE.Vector3(0, 0, 0), 8 * delta);

            const targetUp = floorNormal.clone().normalize();
            const targetForward = forwardDir.clone().projectOnPlane(targetUp).normalize();
            const rightVec = new THREE.Vector3().crossVectors(targetForward, targetUp).normalize();
            
            const targetMat = new THREE.Matrix4().makeBasis(rightVec, targetUp, targetForward);
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

        cameraPosition.lerp(idealPosition, 5 * delta);
        cameraTarget.lerp(idealTarget, 10 * delta);

        state.camera.position.copy(cameraPosition);
        state.camera.lookAt(cameraTarget);
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
            {/* 
              By splitting the colliders into the front and back trucks, 
              the very center of the board is completely clear.
              This prevents our downward ground-detection raycast from ever hitting the player!
            */}
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
