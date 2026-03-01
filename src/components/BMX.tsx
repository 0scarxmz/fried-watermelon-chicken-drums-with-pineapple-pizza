"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { BikeModel } from "./BikeModel";

export default function BMX() {
    const playerRef = useRef<THREE.Group>(null!);
    const leanRef = useRef<THREE.Group>(null!);
    const pitchRef = useRef<THREE.Group>(null!);
    const wheelAngle = useRef(0);
    const steeringAngle = useRef(0);

    const smoothedCameraPosition = useRef(new THREE.Vector3(0, 25, 15));
    const smoothedCameraTarget = useRef(new THREE.Vector3());

    const [, getKeys] = useKeyboardControls();

    const speed = 10;
    const turnSpeed = 2;

    useFrame((state, delta) => {
        if (!playerRef.current) return;

        const keys = getKeys() as Record<string, boolean>;
        const forward = keys.forward;
        const backward = keys.backward;
        const left = keys.left;
        const right = keys.right;

        // 1. Simple manual translation/rotation without physics
        if (forward) {
            playerRef.current.translateZ(speed * delta);
        }
        if (backward) {
            playerRef.current.translateZ(-speed * delta);
        }
        
        let steerAmount = 0;
        if (left) {
            playerRef.current.rotation.y += turnSpeed * delta;
            steerAmount = 1;
        }
        if (right) {
            playerRef.current.rotation.y -= turnSpeed * delta;
            steerAmount = -1;
        }

        // --- VISUAL: Steering ---
        steeringAngle.current = THREE.MathUtils.lerp(
            steeringAngle.current, steerAmount * 0.8, 10 * delta
        );

        // --- VISUAL: Wheelie & Lean ---
        if (leanRef.current && pitchRef.current) {
            const targetLean = steerAmount * -0.15;
            leanRef.current.rotation.z = THREE.MathUtils.lerp(
                leanRef.current.rotation.z, targetLean, 8 * delta
            );

            let targetPitch = 0;
            if (backward) {
                targetPitch = -Math.PI / 5; 
            }

            pitchRef.current.rotation.x = THREE.MathUtils.lerp(
                pitchRef.current.rotation.x, targetPitch, 6 * delta
            );
        }

        // --- VISUAL: Calculate Wheel Spin ---
        const wheelRadius = 0.55;
        if (forward || backward) {
            const direction = forward ? 1 : -1;
            wheelAngle.current += (direction * speed / wheelRadius) * delta;
        }

        // --- CAMERA ---
        const playerPos = playerRef.current.position;
        const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(playerRef.current.quaternion);

        const idealOffset = forwardDirection.clone().multiplyScalar(-18).add(new THREE.Vector3(0, 15, 0));
        const idealPosition = playerPos.clone().add(idealOffset);

        const idealTarget = playerPos.clone().add(
            forwardDirection.clone().multiplyScalar(10)
        );

        smoothedCameraPosition.current.lerp(idealPosition, 5 * delta);
        smoothedCameraTarget.current.lerp(idealTarget, 15 * delta);

        state.camera.position.copy(smoothedCameraPosition.current);
        state.camera.lookAt(smoothedCameraTarget.current);
    });

    return (
        <group ref={playerRef} position={[0, 1.2, 0]}>
            <group ref={leanRef}>
                <group position={[0, 0, -1.58]}>
                    <group ref={pitchRef}>
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
        </group>
    );
}
