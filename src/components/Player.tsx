"use client";

import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";

export default function Player() {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const [, getKeys] = useKeyboardControls();

    const playerPosition = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();

    useFrame((state, delta) => {
        if (!rigidBodyRef.current) return;

        const { forward, backward, left, right } = getKeys();

        // Apply movement
        const impulse = new THREE.Vector3();
        const impulseStrength = 0.5;

        if (forward) impulse.z -= impulseStrength;
        if (backward) impulse.z += impulseStrength;
        if (left) impulse.x -= impulseStrength;
        if (right) impulse.x += impulseStrength;

        impulse.applyQuaternion(state.camera.quaternion);
        impulse.y = 0; // Keep movement horizontal
        impulse.normalize().multiplyScalar(impulseStrength);

        // Check if there is any movement before applying
        if (impulse.lengthSq() > 0) {
            rigidBodyRef.current.applyImpulse(impulse, true);
        }

        // Camera follow logic
        const translation = rigidBodyRef.current.translation();
        playerPosition.set(translation.x, translation.y, translation.z);

        // Camera should be behind and above the player
        // Calculate the ideal offset
        const idealOffset = new THREE.Vector3(0, 5, 10);

        // We update the camera position to smoothly follow
        cameraPosition.copy(playerPosition).add(idealOffset);

        state.camera.position.lerp(cameraPosition, 5 * delta);

        // Camera looks slightly above the player
        cameraTarget.copy(playerPosition).add(new THREE.Vector3(0, 1, 0));
        state.camera.lookAt(cameraTarget);
    });

    return (
        <RigidBody
            ref={rigidBodyRef}
            colliders="cuboid"
            mass={1}
            type="dynamic"
            position={[0, 5, 0]}
            friction={1}
        >
            <mesh castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="hotpink" />
            </mesh>
        </RigidBody>
    );
}
