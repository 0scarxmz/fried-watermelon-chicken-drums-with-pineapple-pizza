"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { RigidBody, RapierRigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import { BikeModel } from "./BikeModel";

export default function BMX() {
    const bikeRef = useRef<RapierRigidBody>(null!);
    const leanRef = useRef<THREE.Group>(null!);
    const pitchRef = useRef<THREE.Group>(null!);
    const wheelAngle = useRef(0);
    const steeringAngle = useRef(0);
    const jumpCharge = useRef(0);
    const wasJumping = useRef(false);
    const smoothedCameraPosition = useRef(new THREE.Vector3(0, 5, -10));
    const smoothedCameraTarget = useRef(new THREE.Vector3());

    const [, getKeys] = useKeyboardControls();

    // Stable refs for enabledRotations
    const enabledRotations = useMemo(
        () => [false, true, false] as [boolean, boolean, boolean],
        []
    );

    useFrame((state, delta) => {
        if (!bikeRef.current) return;

        // "jump" from keyboard controls needs to be in getKeys, we added it in page.tsx
        // If typescript complains, we can cast it
        const keys = getKeys() as Record<string, boolean>;
        const forward = keys.forward;
        const backward = keys.backward;
        const left = keys.left;
        const right = keys.right;
        const jump = keys.jump;

        const linvel = bikeRef.current.linvel();
        const velocity = new THREE.Vector3(linvel.x, linvel.y, linvel.z);

        // Get bike's current rotation
        const rotation = bikeRef.current.rotation();
        const quaternion = new THREE.Quaternion(
            rotation.x, rotation.y, rotation.z, rotation.w
        );

        // +Z is forward
        const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
        const upDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);

        const speed = velocity.length();
        const forwardDot = forwardDirection.dot(velocity);

        // --- MOVEMENT ---
        const engineForce = 8.0;
        if (forward) {
            bikeRef.current.applyImpulse(
                forwardDirection.clone().multiplyScalar(engineForce), true
            );
        }
        
        // If backward is pressed, we brake (or reverse).
        // But if forward AND backward are pressed, we don't brake, allowing us to gain speed for a wheelie!
        if (backward && !forward) {
            bikeRef.current.applyImpulse(
                forwardDirection.clone().multiplyScalar(-engineForce * 0.6), true
            );
        }

        // --- JUMPING ---
        // A simple ground check (Assuming flat ground)
        const pos = bikeRef.current.translation();
        const isGrounded = pos.y < 1.0;

        if (jump) {
            // Charge the jump up to 1 second
            jumpCharge.current = Math.min(jumpCharge.current + delta, 1.0);
        } else if (wasJumping.current && !jump) {
            // Released jump
            if (isGrounded) {
                // Base jump + charged jump - lowered significantly for realism
                const jumpStrength = 40 + jumpCharge.current * 60; // Tuned for mass=20
                const jumpImpulse = upDirection.clone().multiplyScalar(jumpStrength);
                
                // Add a forward boost if moving to simulate pumping a ramp
                if (speed > 2) {
                    jumpImpulse.add(forwardDirection.clone().multiplyScalar(jumpStrength * 0.3));
                }

                bikeRef.current.applyImpulse(jumpImpulse, true);
            }
            jumpCharge.current = 0;
        }
        wasJumping.current = jump;

        // --- STEERING ---
        const turnMultiplier = Math.min(speed / 3, 1) * (forwardDot < 0 ? -1 : 1);

        let steerAmount = 0;
        if (left) steerAmount = 1;
        if (right) steerAmount = -1;

        if (steerAmount !== 0) {
            const steeringImpulse = steerAmount * turnMultiplier * delta * 160;
            bikeRef.current.applyTorqueImpulse(
                upDirection.clone().multiplyScalar(steeringImpulse), true
            );
        }

        // --- VISUAL: Steering ---
        steeringAngle.current = THREE.MathUtils.lerp(
            steeringAngle.current, steerAmount * 0.8, 10 * delta
        );

        // --- VISUAL: Wheelie & Lean ---
        if (leanRef.current && pitchRef.current) {
            // Lean into turns
            const targetLean = steerAmount * -0.15 * turnMultiplier;
            leanRef.current.rotation.z = THREE.MathUtils.lerp(
                leanRef.current.rotation.z, targetLean, 8 * delta
            );

            // Wheelie and Air logic
            let targetPitch = 0;
            if (!isGrounded) {
                // Mid-air animation: tip bike based on vertical velocity
                // When going up, pitch up slightly. When falling, pitch down.
                targetPitch = -THREE.MathUtils.clamp(linvel.y * 0.05, -0.4, 0.4);
            } else if (backward) {
                // Wheelie active on ground.
                targetPitch = -Math.PI / 5; // Pitch back by 36 degrees
            } else if (jump) {
                // Visual jump anticipation squash
                targetPitch = jumpCharge.current * 0.2; // slight tip forward while charging
            }

            pitchRef.current.rotation.x = THREE.MathUtils.lerp(
                pitchRef.current.rotation.x, targetPitch, 6 * delta
            );
        }

        // --- VISUAL: Calculate Wheel Spin ---
        const wheelRadius = 0.55;
        wheelAngle.current += (forwardDot / wheelRadius) * delta;

        // --- CAMERA ---
        const bikePos = new THREE.Vector3(pos.x, pos.y, pos.z);

        const idealPosition = bikePos.clone().add(
            forwardDirection.clone().multiplyScalar(-8).add(new THREE.Vector3(0, 5, 0))
        );
        const idealTarget = bikePos.clone().add(new THREE.Vector3(0, 1.5, 0));

        smoothedCameraPosition.current.lerp(idealPosition, 5 * delta);
        smoothedCameraTarget.current.lerp(idealTarget, 15 * delta);

        state.camera.position.copy(smoothedCameraPosition.current);
        state.camera.lookAt(smoothedCameraTarget.current);
    });

    return (
        <RigidBody
            ref={bikeRef}
            colliders={false}
            enabledRotations={enabledRotations}
            mass={20}
            position={[0, 3, 0]}
            friction={0}
            restitution={0.1}
            linearDamping={1.5}
            angularDamping={3}
        >
            <CuboidCollider args={[0.5, 0.9, 1.2]} position={[0, 0.9, 0]} />

            {/* Pivot group for lean (rotates around center) */}
            <group ref={leanRef}>
                {/* Pivot group for wheelie - pivots exactly at the back wheel's ground contact point (Z = -1.58, Y = 0) */}
                <group position={[0, 0, -1.58]}>
                    <group ref={pitchRef}>
                        {/* Translate back forward so bike center is at Z = 0 */}
                        <group position={[0, 0, 1.58]}>
                            <BikeModel
                                wheelAngleRef={wheelAngle}
                                steeringAngleRef={steeringAngle}
                                scale={1.5}
                                rotation={[0, -Math.PI / 2, 0]}
                                position={[0, 3.2, 0]}
                            />
                        </group>
                    </group>
                </group>
            </group>
        </RigidBody>
    );
}
