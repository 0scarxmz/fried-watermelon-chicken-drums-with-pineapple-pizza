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

    // Skate 4 Movement Logic
    const lastPushTime = useRef(0);
    const wasForwardPressed = useRef(false);

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

        const rayOrigin = { x: pos.x, y: pos.y, z: pos.z };
        const rayDir = { x: 0, y: -1, z: 0 };
        const ray = new rapier.Ray(rayOrigin, rayDir);
        const hit = world.castRay(ray, 1.5, true);

        let floorNormal = new THREE.Vector3(0, 1, 0);
        let isGrounded = false;

        // Start ray at center of board, so distance to floor is ~0.4 units. 
        // 0.6 gives us a generous margin to stay stuck to the ground.
        if (hit && hit.toi < 0.6) {
            isGrounded = true;
            floorNormal.set(hit.normal.x, hit.normal.y, hit.normal.z);
        }

        const slopeForward = forwardDir.clone().projectOnPlane(floorNormal).normalize();
        const currentVelocity = new THREE.Vector3(vel.x, vel.y, vel.z);
        const horizontalVelocity = new THREE.Vector3(vel.x, 0, vel.z);
        const speedXZ = horizontalVelocity.length();

        // --- ARCADE MOVEMENT ---
        const moveSpeed = 25; 
        
        if (isGrounded) {
            rbRef.current.setGravityScale(0, true);

            if (!forward && !backward) {
                // HARD STOP. Absolutely zero velocity.
                rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                
                // Nuke all angular velocity too so we don't spin or drift
                rbRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
                
                // Instantly kill any residual physical momentum on the RigidBody
                rbRef.current.resetForces(true);
                rbRef.current.resetTorques(true);
            } else {
                let targetSpeed = 0;
                if (forward) targetSpeed = moveSpeed;
                if (backward) targetSpeed = -moveSpeed;

                const newVel = slopeForward.clone().multiplyScalar(targetSpeed);
                const stickVel = floorNormal.clone().multiplyScalar(-2.0); 
                
                rbRef.current.setLinvel({ 
                    x: newVel.x + stickVel.x, 
                    y: newVel.y + stickVel.y, 
                    z: newVel.z + stickVel.z 
                }, true);
            }
        } else {
            // Re-enable gravity when in the air so you can fall/jump
            rbRef.current.setGravityScale(1, true);
            
            // Minimal air control
            if (forward) rbRef.current.applyImpulse(forwardDir.clone().multiplyScalar(5 * delta), true);
            if (backward) rbRef.current.applyImpulse(forwardDir.clone().multiplyScalar(-5 * delta), true);
        }

        // --- TURNING ---
        let turnSpeed = 0;
        if (left) turnSpeed = 3.5;
        if (right) turnSpeed = -3.5;

        // Instant, snappy turning.
        if (turnSpeed !== 0) {
            rbRef.current.setAngvel({ x: 0, y: turnSpeed, z: 0 }, true);
        } else {
            rbRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }

        // --- JUMPING ---
        if (jump && !wasJumpPressed.current) {
            if (isGrounded) {
                rbRef.current.applyImpulse({ x: 0, y: 12, z: 0 }, true);
                canDoubleJump.current = true;
            } else if (canDoubleJump.current) {
                rbRef.current.setLinvel({ x: vel.x, y: Math.max(vel.y, 0) + 10, z: vel.z }, true);
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
            meshRef.current.position.lerp(new THREE.Vector3(0, 0, 0), 10 * delta);
            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 10 * delta);

            const targetUp = floorNormal.clone().normalize();
            const targetForward = forwardDir.clone().projectOnPlane(targetUp).normalize();
            const targetRight = new THREE.Vector3().crossVectors(targetUp, targetForward).normalize();

            const targetMat = new THREE.Matrix4().makeBasis(targetRight, targetUp, targetForward);
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetMat);

            const localTargetQuat = targetQuat.clone().premultiply(rbQuat.clone().invert());

            // I REMOVED the sideways lean drifting animation entirely as requested
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
        // Lock the camera tightly at a fixed distance so it never pulls away
        const cameraDistance = 7;
        const cameraHeight = 3.5;

        const playerPosVec = new THREE.Vector3(pos.x, pos.y, pos.z);
        const idealOffset = forwardDir.clone().multiplyScalar(-cameraDistance).add(new THREE.Vector3(0, cameraHeight, 0));
        const idealPosition = playerPosVec.clone().add(idealOffset);

        // Target specifically ahead of the player to lock the FOV properly
        const idealTarget = playerPosVec.clone().add(forwardDir.clone().multiplyScalar(5));

        // Massively increased lerp speed to force the camera to stick tightly to the player
        smoothedCameraPosition.current.lerp(idealPosition, 12 * delta);
        smoothedCameraTarget.current.lerp(idealTarget, 15 * delta);

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
            linearDamping={10.0} // MASSIVE linear drag to prevent floating
            angularDamping={10.0} // MASSIVE angular drag to prevent spinning
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
