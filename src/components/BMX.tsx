"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { RigidBody, RapierRigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import { BikeModel } from "./BikeModel";

export default function BMX() {
    const bikeRef = useRef<RapierRigidBody>(null!);
    const modelRef = useRef<THREE.Group>(null!);
    const wheelAngle = useRef(0);
    const steeringAngle = useRef(0);

    const [, getKeys] = useKeyboardControls();

    // Stable refs for enabledRotations
    const enabledRotations = useMemo(
        () => [false, true, false] as [boolean, boolean, boolean],
        []
    );

    useFrame((state, delta) => {
        if (!bikeRef.current) return;

        const { forward, backward, left, right } = getKeys();

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

        // --- MOVEMENT ---
        const engineForce = 8.0;
        if (forward) {
            bikeRef.current.applyImpulse(
                forwardDirection.clone().multiplyScalar(engineForce), true
            );
        }
        if (backward) {
            bikeRef.current.applyImpulse(
                forwardDirection.clone().multiplyScalar(-engineForce * 0.6), true
            );
        }

        // --- STEERING ---
        const speed = velocity.length();
        const forwardDot = forwardDirection.dot(velocity);
        const turnMultiplier = Math.min(speed / 3, 1) * (forwardDot < 0 ? -1 : 1);

        let steerAmount = 0;
        if (left) steerAmount = 1;
        if (right) steerAmount = -1;

        if (steerAmount !== 0) {
            // Adjusted steering impulse to be balanced for the platform
            const steeringImpulse = steerAmount * turnMultiplier * delta * 160;
            bikeRef.current.applyTorqueImpulse(
                upDirection.clone().multiplyScalar(steeringImpulse), true
            );
        }

        // --- VISUAL: Steering ---
        // Smoothly interpolate steering angle for the front wheel.
        // Positive left, negative right. Maximum angle ~45 degrees (0.8 rad)
        steeringAngle.current = THREE.MathUtils.lerp(
            steeringAngle.current, steerAmount * 0.8, 10 * delta
        );

        // --- VISUAL: Lean into turns ---
        if (modelRef.current) {
            const targetLean = steerAmount * -0.15 * turnMultiplier;
            modelRef.current.rotation.z = THREE.MathUtils.lerp(
                modelRef.current.rotation.z, targetLean, 8 * delta
            );
        }

        // --- VISUAL: Calculate Wheel Spin ---
        const wheelRadius = 0.55;
        // Negative sign to make wheels spin forward (since +Z is out of the screen, right hand rule on Z axis makes +angle spin backward relative to wheel coordinates? Let's fix if needed)
        // Bike is rotated -90 deg on Y, so its Z is pointing right locally.
        // Actually, let's keep it simple: speed / radius. We can flip sign if it rolls backwards.
        wheelAngle.current += (forwardDot / wheelRadius) * delta;

        // --- CAMERA ---
        const pos = bikeRef.current.translation();
        const bikePos = new THREE.Vector3(pos.x, pos.y, pos.z);

        const idealOffset = forwardDirection.clone().multiplyScalar(-8).add(new THREE.Vector3(0, 5, 0));
        const cameraTarget = bikePos.clone().add(new THREE.Vector3(0, 1.5, 0));

        state.camera.position.lerp(bikePos.clone().add(idealOffset), 4 * delta);
        state.camera.lookAt(cameraTarget);
    });

    return (
        <RigidBody
            ref={bikeRef}
            colliders={false}
            enabledRotations={enabledRotations}
            mass={20}
            position={[0, 3, 0]}
            friction={1}
            restitution={0.1}
            linearDamping={1.5}
            angularDamping={3}
        >
            {/* Collider: bottom at y=0, top at y=1.8 */}
            <CuboidCollider args={[0.5, 0.9, 1.2]} position={[0, 0.9, 0]} />

            {/* 3D model rotated to face +Z forward, raised so wheels sit on ground */}
            <group ref={modelRef}>
                <BikeModel
                    wheelAngleRef={wheelAngle}
                    steeringAngleRef={steeringAngle}
                    scale={1.5}
                    rotation={[0, -Math.PI / 2, 0]}
                    position={[0, 3.2, 0]}
                />
            </group>
        </RigidBody>
    );
}
