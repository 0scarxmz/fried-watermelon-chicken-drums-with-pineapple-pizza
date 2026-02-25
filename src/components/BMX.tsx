"use client";

import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { RigidBody, RapierRigidBody, useRevoluteJoint } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";

export default function BMX() {
    const frameRef = useRef<RapierRigidBody>(null!);
    const frontWheelRef = useRef<RapierRigidBody>(null!);
    const backWheelRef = useRef<RapierRigidBody>(null!);
    // Optional: fork to allow steering rotation independent of frame
    const forkRef = useRef<RapierRigidBody>(null!);

    const [, getKeys] = useKeyboardControls();

    // Camera tracking
    const cameraTarget = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();

    // Joint setup needs refs to be attached first, so we use optional joint hooks
    // Back wheel to frame (drive wheel) - Revolute joint (hinge)
    const backJoint = useRevoluteJoint(frameRef, backWheelRef, [
        [-0.5, -0.5, 0], // position of joint on frame
        [0, 0, 0],       // position of joint on wheel
        [0, 0, 1]        // axis of rotation (z-axis for rolling)
    ]);

    // Front wheel to fork - Revolute joint
    const frontJoint = useRevoluteJoint(forkRef, frontWheelRef, [
        [0, -0.5, 0],    // position of joint on fork
        [0, 0, 0],       // position of joint on wheel
        [0, 0, 1]        // axis of rotation (z-axis for rolling)
    ]);

    // Fork to frame - Revolute joint (steering), rotating around Y axis
    const steeringJoint = useRevoluteJoint(frameRef, forkRef, [
        [0.5, -0.2, 0],    // position of joint on frame
        [0, 0.3, 0],       // position of joint on fork
        [0, 1, 0]          // axis of rotation (y-axis for steering)
    ]);

    // Configure limits for steering
    useEffect(() => {
        if (steeringJoint.current) {
            // Limit steering angle to roughly +/- 45 degrees (in radians)
            steeringJoint.current.setLimits(-Math.PI / 4, Math.PI / 4);
        }
    }, [steeringJoint]);

    useFrame((state, delta) => {
        if (!frameRef.current || !backWheelRef.current || !forkRef.current || !frontWheelRef.current) return;

        const { forward, backward, left, right } = getKeys();

        // Reset forces
        if (backJoint.current) {
            backJoint.current.configureMotorVelocity(0, 10);
        }

        // Motor control (rear wheel)
        const speed = 20; // rad/s
        if (forward && backJoint.current) {
            // Rotate "forward" around Z axis (negative speed depending on orientation)
            backJoint.current.configureMotorVelocity(-speed, 100);
        } else if (backward && backJoint.current) {
            backJoint.current.configureMotorVelocity(speed, 100);
        }

        // Steering control
        const steerAngle = Math.PI / 4; // Max steering angle
        if (steeringJoint.current) {
            if (left) {
                steeringJoint.current.configureMotorPosition(steerAngle, 100, 10);
            } else if (right) {
                steeringJoint.current.configureMotorPosition(-steerAngle, 100, 10);
            } else {
                // Return to center
                steeringJoint.current.configureMotorPosition(0, 100, 10);
            }
        }

        // Camera Follow
        const translation = frameRef.current.translation();
        const pos = new THREE.Vector3(translation.x, translation.y, translation.z);

        // Get the frame's rotation to place camera behind it
        const rotation = frameRef.current.rotation();
        const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

        // Forward vector of the bike
        const forwardDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);

        // Calculate ideal offset (behind and above)
        // We go opposite of forward direction
        const idealOffset = forwardDirection.clone().multiplyScalar(-5).add(new THREE.Vector3(0, 3, 0));

        cameraPosition.copy(pos).add(idealOffset);
        state.camera.position.lerp(cameraPosition, 5 * delta);

        // Look slightly ahead of the bike
        cameraTarget.copy(pos).add(new THREE.Vector3(0, 1, 0));
        state.camera.lookAt(cameraTarget);
    });

    return (
        <group position={[0, 2, 0]}>
            {/* Frame */}
            <RigidBody ref={frameRef} colliders="cuboid" mass={10} position={[0, 0, 0]}>
                <mesh castShadow>
                    {/* Main frame box */}
                    <boxGeometry args={[1.5, 0.2, 0.2]} />
                    <meshStandardMaterial color="red" />
                </mesh>
                <mesh castShadow position={[0.5, 0.2, 0]}>
                    {/* Handlebar stem area */}
                    <boxGeometry args={[0.2, 0.4, 0.2]} />
                    <meshStandardMaterial color="red" />
                </mesh>
                <mesh castShadow position={[-0.5, -0.25, 0]}>
                    {/* Seat tube area */}
                    <boxGeometry args={[0.2, 0.5, 0.2]} />
                    <meshStandardMaterial color="red" />
                </mesh>
            </RigidBody>

            {/* Fork */}
            <RigidBody ref={forkRef} colliders="cuboid" mass={2} position={[0.5, -0.2, 0]}>
                <mesh castShadow position={[0, -0.15, 0]}>
                    <boxGeometry args={[0.1, 0.6, 0.1]} />
                    <meshStandardMaterial color="silver" />
                </mesh>
                <mesh castShadow position={[0, 0.3, 0]}>
                    {/* Handlebars */}
                    <boxGeometry args={[0.1, 0.1, 0.8]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </RigidBody>

            {/* Front Wheel */}
            <RigidBody ref={frontWheelRef} colliders="hull" mass={3} position={[0.5, -0.7, 0]} rotation={[Math.PI / 2, 0, 0]} friction={2}>
                <mesh castShadow>
                    <cylinderGeometry args={[0.4, 0.4, 0.1, 32]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
            </RigidBody>

            {/* Back Wheel */}
            <RigidBody ref={backWheelRef} colliders="hull" mass={4} position={[-0.5, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]} friction={2}>
                <mesh castShadow>
                    <cylinderGeometry args={[0.4, 0.4, 0.1, 32]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
            </RigidBody>
        </group>
    );
}
