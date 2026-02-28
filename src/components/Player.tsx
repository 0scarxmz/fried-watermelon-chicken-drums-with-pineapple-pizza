"use client";

import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useGLTF, useTexture } from "@react-three/drei";
import { RigidBody, RapierRigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";

export default function Player() {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const meshRef = useRef<THREE.Group>(null);

    const [, getKeys] = useKeyboardControls();

    const { scene } = useGLTF('/skateboard.glb');
    const texture = useTexture('/colormap.png');

    // Apply texture to the skateboard model
    useEffect(() => {
        texture.flipY = false;
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.material = new THREE.MeshStandardMaterial({ map: texture });
            }
        });
    }, [scene, texture]);

    const cameraTarget = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();

    // Disable X and Z rotations entirely for a skateboard (it shouldn't flip over)
    const enabledRotations = useMemo(() => [false, true, false] as [boolean, boolean, boolean], []);

    useFrame((state, delta) => {
        if (!rigidBodyRef.current) return;

        const { forward, backward, left, right } = getKeys();

        // 1. Physics Movement
        const linvel = rigidBodyRef.current.linvel();
        const velocity = new THREE.Vector3(linvel.x, linvel.y, linvel.z);
        const speed = velocity.length();

        const rotation = rigidBodyRef.current.rotation();
        const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

        const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
        const rightDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
        const forwardDot = forwardDirection.dot(velocity);

        const engineForce = 15.0 * delta;
        const reverseForce = 10.0 * delta;
        const maxSpeed = 15.0;

        if (forward && forwardDot < maxSpeed) {
            rigidBodyRef.current.applyImpulse(forwardDirection.clone().multiplyScalar(engineForce), true);
        }
        if (backward && forwardDot > -maxSpeed * 0.5) {
            rigidBodyRef.current.applyImpulse(forwardDirection.clone().multiplyScalar(-reverseForce), true);
        }

        // --- GRIP AND HANDLING ---
        const lateralSpeed = velocity.dot(rightDirection);
        const gripImpulse = {
            x: rightDirection.x * -lateralSpeed * 60.0 * delta,
            y: rightDirection.y * -lateralSpeed * 60.0 * delta,
            z: rightDirection.z * -lateralSpeed * 60.0 * delta
        };
        rigidBodyRef.current.applyImpulse(gripImpulse, true);

        // Apply angular velocity for carving
        const turnMultiplier = Math.min(speed / 5.0, 1.0) * (forwardDot < 0 ? -1 : 1);
        let steerAmount = 0;
        if (left) steerAmount = 1;
        if (right) steerAmount = -1;

        let targetLean = 0;

        // Only allow turning if moving
        if (steerAmount !== 0 && Math.abs(forwardDot) > 0.5) {
            const turnSpeed = steerAmount * turnMultiplier * 3.0;
            const currentAngVel = rigidBodyRef.current.angvel();

            // Set Y angular velocity for a smooth carving arc (Use plain object for Rapier)
            rigidBodyRef.current.setAngvel(
                { x: currentAngVel.x, y: turnSpeed, z: currentAngVel.z },
                true
            );

            // Calculate target visual lean
            targetLean = steerAmount * 0.3 * (forwardDot < 0 ? -1 : 1);
        }

        // Apply visual lean to the skateboard mesh
        if (meshRef.current) {
            meshRef.current.rotation.z = THREE.MathUtils.lerp(
                meshRef.current.rotation.z,
                targetLean,
                10 * delta
            );
        }

        if (!forward && !backward && speed > 0.1) {
            const dampDirection = velocity.clone().normalize().multiplyScalar(-speed * 15.0 * delta);
            rigidBodyRef.current.applyImpulse({ x: dampDirection.x, y: dampDirection.y, z: dampDirection.z }, true);
        }

        // Camera follow logic
        const translation = rigidBodyRef.current.translation();
        const playerPos = new THREE.Vector3(translation.x, translation.y, translation.z);

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
        <RigidBody
            ref={rigidBodyRef}
            colliders={false}
            mass={20}
            type="dynamic"
            position={[0, 5, 0]}
            friction={0}
            restitution={0.1}
            linearDamping={1.5}
            angularDamping={4}
            enabledRotations={enabledRotations}
        >
            <CuboidCollider args={[0.3, 0.1, 1.0]} position={[0, 0.1, 0]} />

            <group ref={meshRef}>
                <primitive object={scene} position={[0, -0.4, 0]} rotation={[0, Math.PI, 0]} scale={1.5} />
            </group>

        </RigidBody>
    );
}

useGLTF.preload('/skateboard.glb');
