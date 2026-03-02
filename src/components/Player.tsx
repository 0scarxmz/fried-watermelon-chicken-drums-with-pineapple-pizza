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

        const rayOrigin = { x: pos.x, y: pos.y - 0.1, z: pos.z };
        const rayDir = { x: 0, y: -1, z: 0 };
        const ray = new rapier.Ray(rayOrigin, rayDir);
        const hit = world.castRay(ray, 1.5, true);

        let floorNormal = new THREE.Vector3(0, 1, 0);
        let isGrounded = false;

        if (hit && hit.toi < 0.35) {
            isGrounded = true;
            floorNormal.set(hit.normal.x, hit.normal.y, hit.normal.z);
        }

        const slopeForward = forwardDir.clone().projectOnPlane(floorNormal).normalize();
        const currentVelocity = new THREE.Vector3(vel.x, vel.y, vel.z);
        const horizontalVelocity = new THREE.Vector3(vel.x, 0, vel.z);
        const speedXZ = horizontalVelocity.length();

        // --- REALISTIC SPEED & NO SLIDING ---
        const maxSpeed = 15; // Realistic max speed
        const pushForce = 6; // Burst of speed per push
        const pushInterval = 0.8; // Seconds between automatic pushes when holding
        const tapCooldown = 0.2; // Minimum time between manual taps
        const braking = 25;

        if (isGrounded) {
            // How fast are we going exactly along the direction the board is pointing?
            let forwardSpeed = currentVelocity.dot(slopeForward);

            // --- TAP & HOLD TO PUSH ---
            const timeSinceLastPush = now - lastPushTime.current;
            const isTap = forward && !wasForwardPressed.current && timeSinceLastPush > tapCooldown;
            const isHold = forward && wasForwardPressed.current && timeSinceLastPush > pushInterval;

            if (isTap || isHold) {
                if (forwardSpeed < maxSpeed) {
                    forwardSpeed += pushForce;
                    lastPushTime.current = now;
                }
            }

            // --- BRAKING ---
            if (backward) {
                if (forwardSpeed > 0.5) {
                    forwardSpeed -= braking * delta;
                } else if (forwardSpeed < -0.5) {
                    forwardSpeed += braking * delta; // Brake while going fakie
                } else {
                    forwardSpeed = 0;
                }
            }

            // Enforce maximum speed cap smoothly
            if (forwardSpeed > maxSpeed) {
                forwardSpeed = THREE.MathUtils.lerp(forwardSpeed, maxSpeed, 5 * delta);
            } else if (forwardSpeed < -maxSpeed) {
                forwardSpeed = THREE.MathUtils.lerp(forwardSpeed, -maxSpeed, 5 * delta);
            }

            // --- APPLY FORWARD MOMENTUM ---
            // Re-align the velocity entirely along the slopeForward vector to eliminate sliding
            const newVel = slopeForward.clone().multiplyScalar(forwardSpeed);

            // Preserve any vertical velocity that isn't pushing into the floor (like bouncing)
            rbRef.current.setLinvel({ x: newVel.x, y: vel.y < 0 ? newVel.y : vel.y, z: newVel.z }, true);

            // Downward force to stick to ramps
            rbRef.current.applyImpulse({ x: -floorNormal.x * 2, y: -floorNormal.y * 2, z: -floorNormal.z * 2 }, true);
        } else {
            if (forward) rbRef.current.applyImpulse(forwardDir.clone().multiplyScalar(5 * delta), true);
            if (backward) rbRef.current.applyImpulse(forwardDir.clone().multiplyScalar(-5 * delta), true);
        }

        wasForwardPressed.current = forward;

        // --- TURNING (DYNAMIC CARVING) ---
        // Steer slower at high speeds, faster at low speeds for smooth carving
        let turnSpeed = 0;
        const turnMultiplier = isGrounded ? Math.max(1.5, 4.0 - (speedXZ * 0.15)) : 3.0; // Dynamic turn speed based on velocity

        if (left) turnSpeed = turnMultiplier;
        if (right) turnSpeed = -turnMultiplier;

        // Only allow turning if moving or in the air
        if (speedXZ > 1 || !isGrounded) {
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
            // Smoothly recover from the push jolt (both position and pitch rotation)
            meshRef.current.position.lerp(new THREE.Vector3(0, 0, 0), 10 * delta);
            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 10 * delta);

            const targetUp = floorNormal.clone().normalize();
            const targetForward = forwardDir.clone().projectOnPlane(targetUp).normalize();
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
            linearDamping={0.2}
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
