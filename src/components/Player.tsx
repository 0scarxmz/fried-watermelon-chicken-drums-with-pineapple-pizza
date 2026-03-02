"use client";

import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useGLTF, useTexture } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";

export default function Player() {
    const playerRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Group>(null); // For leaning
    const flipRef = useRef<THREE.Group>(null); // For the flip animation

    // Jump state variables
    const yVelocity = useRef(0);
    const isGrounded = useRef(true);
    const canDoubleJump = useRef(false);
    const isFlipping = useRef(false);
    const flipAngle = useRef(0);
    const wasJumpPressed = useRef(false);

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
    const speed = 36;
    const turnSpeed = 1.2;
    const jumpPower = 15;
    const doubleJumpPower = 12;
    const gravity = 40;

    useFrame((state, delta) => {
        if (!playerRef.current) return;

        const { forward, backward, left, right, jump } = getKeys() as any;

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

        // --- JUMPING & GRAVITY ---
        if (jump && !wasJumpPressed.current) {
            if (isGrounded.current) {
                // First jump
                yVelocity.current = jumpPower;
                isGrounded.current = false;
                canDoubleJump.current = true;
            } else if (canDoubleJump.current) {
                // Double jump
                yVelocity.current = doubleJumpPower;
                canDoubleJump.current = false;
                
                // Start flip animation
                isFlipping.current = true;
                flipAngle.current = 0;
            }
        }
        wasJumpPressed.current = jump;

        if (!isGrounded.current) {
            yVelocity.current -= gravity * delta;
            playerRef.current.position.y += yVelocity.current * delta;

            // Ground collision check (assuming floor is at y = 1)
            if (playerRef.current.position.y <= 1) {
                playerRef.current.position.y = 1;
                isGrounded.current = true;
                yVelocity.current = 0;
                canDoubleJump.current = false;
                
                // Reset flip safely if landed early
                if (isFlipping.current) {
                    isFlipping.current = false;
                    flipAngle.current = 0;
                }
            }
        }

        // --- VISUALS (Lean & Flip) ---
        // Apply visual lean to the skateboard mesh based on input
        let targetLean = 0;
        if (left && (forward || backward)) targetLean = -0.3;
        if (right && (forward || backward)) targetLean = 0.3;

        if (meshRef.current) {
            meshRef.current.rotation.z = THREE.MathUtils.lerp(
                meshRef.current.rotation.z,
                targetLean,
                10 * delta
            );
        }

        if (flipRef.current) {
            if (isFlipping.current) {
                const flipSpeed = Math.PI * 6; // Very fast flip
                flipAngle.current += flipSpeed * delta;

                // Stop flipping after a full 360 rotation (2 * PI)
                if (flipAngle.current >= Math.PI * 2) {
                    flipAngle.current = 0;
                    isFlipping.current = false;
                }
            }
            // Rotate around X axis for a kickflip style animation
            flipRef.current.rotation.z = flipAngle.current; 
        }

        // --- CAMERA FOLLOW ---
        const playerPos = playerRef.current.position;
        const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(playerRef.current.quaternion);

        // Calculate ideal camera offset
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
                <group ref={flipRef}>
                    <primitive object={scene} position={[0, -0.4, 0]} rotation={[0, Math.PI, 0]} scale={6.75} />
                </group>
            </group>
        </group>
    );
}

useGLTF.preload('/skateboard.glb');
