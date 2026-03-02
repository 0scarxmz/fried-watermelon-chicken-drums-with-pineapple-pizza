"use client";

import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useGLTF, useTexture } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";

export default function Player() {
    const playerRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Group>(null);

    const [, getKeys] = useKeyboardControls();

    const { scene, materials } = useGLTF('/skateboard.glb') as any;

    useEffect(() => {
        // Ensure the scene uses its built-in materials correctly rather than overriding with a unified map
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

    // Start from 0: simple movement variables
    const speed = 4;
    const turnSpeed = 1.2;

    useFrame((state, delta) => {
        if (!playerRef.current) return;

        const { forward, backward, left, right } = getKeys();

        // 1. Simple manual translation/rotation without physics
        if (forward) {
            playerRef.current.translateZ(speed * delta);
        }
        if (backward) {
            playerRef.current.translateZ(-speed * delta);
        }
        if (left) {
            playerRef.current.rotation.y += turnSpeed * delta;
        }
        if (right) {
            playerRef.current.rotation.y -= turnSpeed * delta;
        }

        // Apply visual lean to the skateboard mesh based on input
        let targetLean = 0;
        if (left && (forward || backward)) targetLean = 0.3;
        if (right && (forward || backward)) targetLean = -0.3;

        if (meshRef.current) {
            meshRef.current.rotation.z = THREE.MathUtils.lerp(
                meshRef.current.rotation.z,
                targetLean,
                10 * delta
            );
        }

        // Camera follow logic
        const playerPos = playerRef.current.position;
        const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(playerRef.current.quaternion);

        const idealOffset = forwardDirection.clone().multiplyScalar(-10).add(new THREE.Vector3(0, 8, 0));
        const idealPosition = playerPos.clone().add(idealOffset);

        const idealTarget = playerPos.clone().add(
            forwardDirection.clone().multiplyScalar(10)
        );

        cameraPosition.lerp(idealPosition, 5 * delta);
        cameraTarget.lerp(idealTarget, 15 * delta);

        state.camera.position.copy(cameraPosition);
        state.camera.lookAt(cameraTarget);
    });

    return (
        <group ref={playerRef} position={[0, 1, 0]}>
            <group ref={meshRef}>
                <primitive object={scene} position={[0, -0.4, 0]} rotation={[0, Math.PI, 0]} scale={4.5} />
            </group>
        </group>
    );
}

useGLTF.preload('/skateboard.glb');
