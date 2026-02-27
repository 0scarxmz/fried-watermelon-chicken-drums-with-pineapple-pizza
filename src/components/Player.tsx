"use client";

import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useGLTF } from "@react-three/drei";
import { RigidBody, RapierRigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef, useEffect } from "react";
import * as THREE from "three";

export default function Player() {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const frontAssemblyRef = useRef<THREE.Group>(null);
    const frontWheelRef = useRef<THREE.Group>(null);
    const backWheelRef = useRef<THREE.Group>(null);
    const bikeChassisRef = useRef<THREE.Group>(null);

    const [, getKeys] = useKeyboardControls();
    const { nodes, materials } = useGLTF("/models/bike.gltf") as any;

    // Log missing nodes if necessary
    useEffect(() => {
        const requiredNodes = ["Bike", "Cylinder011", "Cylinder004", "Torus002", "Torus003"];
        requiredNodes.forEach(nodeName => {
            if (!nodes[nodeName]) {
                console.warn(`Missing GLTF node: ${nodeName}`);
            }
        });
    }, [nodes]);

    const playerPosition = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    const currentWheelRotation = useRef(0);

    useFrame((state, delta) => {
        if (!rigidBodyRef.current) return;

        const { forward, backward, left, right } = getKeys();

        // 1. Physics Movement
        const linvel = rigidBodyRef.current.linvel();
        const velocity = new THREE.Vector3(linvel.x, linvel.y, linvel.z);
        const speed = velocity.length();

        // Get bike's current orientation
        const rotation = rigidBodyRef.current.rotation();
        const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
        const forwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

        // Apply impulses
        const impulseStrength = 2.0;
        if (forward) {
            rigidBodyRef.current.applyImpulse(forwardDirection.clone().multiplyScalar(impulseStrength), true);
        }
        if (backward) {
            rigidBodyRef.current.applyImpulse(forwardDirection.clone().multiplyScalar(-impulseStrength), true);
        }

        // Apply torque for turning the physics body
        const turnStrength = 5.0;
        if (left) {
            rigidBodyRef.current.applyTorqueImpulse({ x: 0, y: turnStrength, z: 0 }, true);
        }
        if (right) {
            rigidBodyRef.current.applyTorqueImpulse({ x: 0, y: -turnStrength, z: 0 }, true);
        }

        // 2. Visual Steering (lerp frontAssemblyRef.current.rotation.y up to 35 degrees)
        if (frontAssemblyRef.current) {
            // Positive Y rotation to turn left when facing -Z
            const targetSteer = left ? 0.61 : right ? -0.61 : 0; 
            frontAssemblyRef.current.rotation.y = THREE.MathUtils.lerp(
                frontAssemblyRef.current.rotation.y,
                targetSteer,
                10 * delta
            );
        }

        // 3. Rolling (Wheel spin based on speed)
        const forwardDot = forwardDirection.dot(velocity);
        // Multiply by -1 because the wheels are rotated 90deg on Y in the sub-group
        const wheelSpinSpeed = -forwardDot * 2.0; 
        currentWheelRotation.current += wheelSpinSpeed * delta;

        if (frontWheelRef.current) {
            frontWheelRef.current.rotation.x = currentWheelRotation.current;
        }
        if (backWheelRef.current) {
            backWheelRef.current.rotation.x = currentWheelRotation.current;
        }

        // 4. The Lean (Banking)
        if (bikeChassisRef.current) {
            // Negative Z rotation to lean left when facing -Z
            const leanAmount = 0.4;
            const targetLean = (left ? -leanAmount : right ? leanAmount : 0) * Math.min(speed / 5, 1);
            bikeChassisRef.current.rotation.z = THREE.MathUtils.lerp(
                bikeChassisRef.current.rotation.z,
                targetLean,
                5 * delta
            );
        }

        // Camera follow logic
        const translation = rigidBodyRef.current.translation();
        playerPosition.set(translation.x, translation.y, translation.z);

        // Camera behind player relative to bike orientation (+Z relative to bike facing -Z)
        const cameraOffset = new THREE.Vector3(0, 4, 10).applyQuaternion(quaternion);
        cameraPosition.copy(playerPosition).add(cameraOffset);

        state.camera.position.lerp(cameraPosition, 5 * delta);
        cameraTarget.copy(playerPosition).add(new THREE.Vector3(0, 1.5, 0));
        state.camera.lookAt(cameraTarget);
    });

    return (
        <RigidBody
            ref={rigidBodyRef}
            colliders={false}
            mass={1}
            type="dynamic"
            position={[0, 5, 0]}
            friction={1}
            linearDamping={2}
            angularDamping={2}
            enabledRotations={[false, true, false]}
        >
            <CuboidCollider args={[0.3, 0.5, 1.4]} position={[0, 0.8, 0]} />
            
            <group ref={bikeChassisRef}>
                <group rotation={[0, -Math.PI / 2, 0]}>
                    {/* Main Body (Quadro) */}
                    {nodes.Bike && (
                        <mesh geometry={nodes.Bike.geometry} material={materials.Quadro} />
                    )}
                    
                    {/* Back Wheel Assembly - ONLY ROLLS, DOES NOT STEER */}
                    <group ref={backWheelRef} position={[-1.053, -1.178, 0.005]}>
                        {nodes.Cylinder002_1 && <mesh geometry={nodes.Cylinder002_1.geometry} material={materials.Eixo} />}
                        {nodes.Cylinder002_2 && <mesh geometry={nodes.Cylinder002_2.geometry} material={materials.Roda} />}
                        {nodes.Torus003 && (
                            <group rotation={[Math.PI / 2, 0, 0]} scale={[0.792, 0.546, 0.792]} position={[0.006, -0.003, 0]}>
                                <mesh geometry={nodes.Torus003.geometry} material={materials.Pneu} />
                                <mesh geometry={nodes.Torus003_1.geometry} material={materials.Roda} />
                                <mesh geometry={nodes.Torus003_2.geometry} material={materials.Faixa} />
                            </group>
                        )}
                        {nodes.B_Raios && <mesh geometry={nodes.B_Raios.geometry} material={materials.Raio} />}
                    </group>

                    {/* Front Assembly (Fork + Handlebars + Front Wheel) */}
                    <group ref={frontAssemblyRef} position={[1.308, 0.35, 0.012]}>
                        <group position={[-1.308, -0.35, -0.012]}>
                            {/* Fork */}
                            {nodes.Cylinder004 && (
                                <group position={[1.73, -0.423, 0.134]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 3.023, 1]}>
                                    <mesh geometry={nodes.Cylinder004.geometry} material={materials.Roda} />
                                    <mesh geometry={nodes.Cylinder004_1.geometry} material={materials.Pneu} />
                                </group>
                            )}
                            
                            {/* Handlebars */}
                            {nodes.Cylinder011 && (
                                <group position={[1.308, 0.35, 0.012]} rotation={[Math.PI / 2, 0, 0]} scale={0.371}>
                                    <mesh geometry={nodes.Cylinder011.geometry} material={materials.Raio} />
                                    <mesh geometry={nodes.Cylinder011_1.geometry} material={materials.Pneu} />
                                </group>
                            )}

                            {/* Front Wheel */}
                            <group ref={frontWheelRef} position={[1.899, -1.178, 0.005]}>
                                {nodes.Cylinder_1 && <mesh geometry={nodes.Cylinder_1.geometry} material={materials.Eixo} />}
                                {nodes.Cylinder_2 && <mesh geometry={nodes.Cylinder_2.geometry} material={materials.Roda} />}
                                {nodes.Torus002 && (
                                    <group rotation={[Math.PI / 2, 0, 0]} scale={[0.792, 0.546, 0.792]} position={[0.006, -0.003, 0]}>
                                        <mesh geometry={nodes.Torus002.geometry} material={materials.Pneu} />
                                        <mesh geometry={nodes.Torus002_1.geometry} material={materials.Roda} />
                                        <mesh geometry={nodes.Torus002_2.geometry} material={materials.Faixa} />
                                    </group>
                                )}
                                {nodes.F_Raios && <mesh geometry={nodes.F_Raios.geometry} material={materials.Raio} />}
                            </group>
                        </group>
                    </group>

                    {/* Other parts */}
                    {nodes.Cylinder006 && (
                        <group position={[-0.428, -0.32, 0.011]} rotation={[1.571, -1.414, 3.142]} scale={[1, 3.023, 1]}>
                            <mesh geometry={nodes.Cylinder006.geometry} material={materials.Roda} />
                            <mesh geometry={nodes.Cylinder006_1.geometry} material={materials.Pneu} />
                        </group>
                    )}
                    {nodes.Cube && <mesh geometry={nodes.Cube.geometry} material={materials.Pneu} position={[-0.061, 0.319, 0]} scale={0.091} />}
                </group>
            </group>
        </RigidBody>
    );
}

useGLTF.preload("/models/bike.gltf");
