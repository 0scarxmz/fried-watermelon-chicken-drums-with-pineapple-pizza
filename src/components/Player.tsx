"use client";

import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useGLTF } from "@react-three/drei";
import { RigidBody, RapierRigidBody, CuboidCollider, BallCollider } from "@react-three/rapier";
import { useRef, useMemo } from "react";
import * as THREE from "three";

export default function Player() {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const frontAssemblyRef = useRef<THREE.Group>(null);
    const frontWheelRef = useRef<THREE.Group>(null);
    const backWheelRef = useRef<THREE.Group>(null);
    const bikeChassisRef = useRef<THREE.Group>(null);

    const [, getKeys] = useKeyboardControls();
    const { nodes, materials } = useGLTF("/models/bike.gltf") as any;

    const playerPosition = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    const currentWheelRotation = useRef(0);
    const steeringAngle = useRef(0);
    const accelerationTime = useRef(0);

    const enabledRotations = useMemo(() => [true, true, false] as [boolean, boolean, boolean], []);
    
    // The fork/handlebars pivot axis from BikeModel.tsx
    const steeringAxis = useMemo(() => new THREE.Vector3(-0.591, 1.528, 0).normalize(), []);

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
        
        // Face +Z
        const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
        const upDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
        const rightDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
        const forwardDot = forwardDirection.dot(velocity);

        // Track how long the pedal is held to increase acceleration exponentially
        if (forward) {
            accelerationTime.current += delta;
        } else {
            // Rapidly reset the acceleration momentum when the pedal is released
            accelerationTime.current = 0;
        }

        // Apply impulses (accelerate faster the longer you hold the button)
        const maxSpeed = 40.0; 
        
        // Base force + an exponentially increasing force based on time held. 
        const dynamicForce = 150.0 + Math.pow(Math.min(accelerationTime.current, 3.5), 2.5) * 40.0;
        const engineForce = dynamicForce * delta;
        const reverseForce = 150.0 * delta;
        
        if (forward && forwardDot < maxSpeed) {
            rigidBodyRef.current.applyImpulse(forwardDirection.clone().multiplyScalar(engineForce), true);
        }
        if (backward && forwardDot > -maxSpeed * 0.5) {
            rigidBodyRef.current.applyImpulse(forwardDirection.clone().multiplyScalar(-reverseForce), true);
        }

        // --- GRIP AND HANDLING ---
        // Cancel lateral velocity to stop the bike from sliding like it's on ice
        const lateralSpeed = velocity.dot(rightDirection);
        const gripImpulse = rightDirection.clone().multiplyScalar(-lateralSpeed * 30.0 * delta);
        rigidBodyRef.current.applyImpulse(gripImpulse, true);

        // Apply torque for turning the physics body
        const turnMultiplier = Math.min(speed / 5.0, 1.0) * (forwardDot < 0 ? -1 : 1);
        let steerAmount = 0;
        if (left) steerAmount = 1;
        if (right) steerAmount = -1;

        if (steerAmount !== 0 && speed > 0.5) {
            const steeringImpulse = steerAmount * turnMultiplier * delta * 70.0; // Smoother turning
            rigidBodyRef.current.applyTorqueImpulse(
                upDirection.clone().multiplyScalar(steeringImpulse), true
            );
        }

        // Simulated air/tire friction to slow down rapidly when not pedaling
        if (!forward && !backward && speed > 0.1) {
            rigidBodyRef.current.applyImpulse(velocity.clone().normalize().multiplyScalar(-speed * 15.0 * delta), true);
        }

        // --- PITCH STABILIZATION (Anti-Flip) ---
        // The bike can tilt up ramps naturally, but if it pitches too far (like doing an unwanted backflip),
        // we apply a gentle counter-torque to auto-level it back out, just like in GTA 5!
        const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
        if (Math.abs(euler.x) > 0.1) {
            const pitchLevelingTorque = rightDirection.clone().multiplyScalar(-euler.x * 35.0 * delta);
            rigidBodyRef.current.applyTorqueImpulse(pitchLevelingTorque, true);
        }

        // 2. Visual Steering (Lerp custom angled axis)
        steeringAngle.current = THREE.MathUtils.lerp(
            steeringAngle.current,
            steerAmount * 0.8,
            10 * delta
        );

        if (frontAssemblyRef.current) {
            frontAssemblyRef.current.setRotationFromAxisAngle(steeringAxis, steeringAngle.current);
        }

        // 3. Rolling (Wheel spin based on speed)
        const wheelRadius = 0.55;
        const wheelSpinSpeed = forwardDot / wheelRadius; 
        currentWheelRotation.current += wheelSpinSpeed * delta;

        if (frontWheelRef.current) {
            frontWheelRef.current.rotation.z = currentWheelRotation.current;
        }
        if (backWheelRef.current) {
            backWheelRef.current.rotation.z = currentWheelRotation.current;
        }

        // 4. The Lean (Banking)
        if (bikeChassisRef.current) {
            const targetLean = steerAmount * -0.15 * turnMultiplier;
            bikeChassisRef.current.rotation.z = THREE.MathUtils.lerp(
                bikeChassisRef.current.rotation.z,
                targetLean,
                8 * delta
            );
        }

        // Camera follow logic
        const translation = rigidBodyRef.current.translation();
        const bikePos = new THREE.Vector3(translation.x, translation.y, translation.z);

        const idealOffset = forwardDirection.clone().multiplyScalar(-15).add(new THREE.Vector3(0, 10, 0));
        const idealPosition = bikePos.clone().add(idealOffset);
        
        const idealTarget = bikePos.clone().add(
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
            {/* Front Wheel */}
            <BallCollider args={[0.55]} position={[0, 0.55, 1.58]} />
            {/* Back Wheel */}
            <BallCollider args={[0.55]} position={[0, 0.55, -1.58]} />
            {/* Bike Body */}
            <CuboidCollider args={[0.3, 0.5, 1.4]} position={[0, 1.2, 0]} />

            <group ref={bikeChassisRef}>
                {/* Scale 1.5 and correct offset/rotation matching BMX.tsx to align hitboxes correctly */}
                <group position={[0, 3.2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={1.5}>
                    <mesh geometry={nodes.Bike.geometry} material={materials.Quadro}>
                        {/* BACK WHEEL */}
                        <group ref={backWheelRef} position={[-1.053, -1.178, 0.005]}>
                            <group position={[0, 0, 0]}>
                                <mesh geometry={nodes.Cylinder002_1.geometry} material={materials.Eixo} />
                                <mesh geometry={nodes.Cylinder002_2.geometry} material={materials.Roda} />
                            </group>
                            <group position={[0.006, -0.003, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.792, 0.546, 0.792]}>
                                <mesh geometry={nodes.Torus003.geometry} material={materials.Pneu} />
                                <mesh geometry={nodes.Torus003_1.geometry} material={materials.Roda} />
                                <mesh geometry={nodes.Torus003_2.geometry} material={materials.Faixa} />
                            </group>
                            <mesh geometry={nodes.B_Raios.geometry} material={materials.Raio} position={[0, 0, 0]} />
                        </group>

                        {/* FRONT ASSEMBLY */}
                        <group ref={frontAssemblyRef} position={[1.308, 0.35, 0.012]}>
                            <group position={[-1.308, -0.35, -0.012]}>
                                {/* FRONT WHEEL */}
                                <group ref={frontWheelRef} position={[1.899, -1.178, 0.005]}>
                                    <group position={[0, 0, 0]}>
                                        <mesh geometry={nodes.Cylinder_1.geometry} material={materials.Eixo} />
                                        <mesh geometry={nodes.Cylinder_2.geometry} material={materials.Roda} />
                                    </group>
                                    <group position={[0.006, -0.003, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.792, 0.546, 0.792]}>
                                        <mesh geometry={nodes.Torus002.geometry} material={materials.Pneu} />
                                        <mesh geometry={nodes.Torus002_1.geometry} material={materials.Roda} />
                                        <mesh geometry={nodes.Torus002_2.geometry} material={materials.Faixa} />
                                    </group>
                                    <mesh geometry={nodes.F_Raios.geometry} material={materials.Raio} position={[0, 0, 0]} />
                                </group>

                                {/* FORK */}
                                <group position={[1.73, -0.423, 0.134]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 3.023, 1]}>
                                    <mesh geometry={nodes.Cylinder004.geometry} material={materials.Roda} />
                                    <mesh geometry={nodes.Cylinder004_1.geometry} material={materials.Pneu} />
                                </group>

                                {/* FRONT BRAKE CABLE */}
                                <mesh geometry={nodes.CaboFreioFrente.geometry} material={materials.Pneu} position={[1.676, -0.253, -0.146]} />

                                {/* HANDLEBARS */}
                                <group position={[1.308, 0.35, 0.012]} rotation={[Math.PI / 2, 0, 0]} scale={0.371}>
                                    <mesh geometry={nodes.Cylinder011.geometry} material={materials.Raio} />
                                    <mesh geometry={nodes.Cylinder011_1.geometry} material={materials.Pneu} />
                                </group>

                                {/* BRAKE PART */}
                                <mesh geometry={nodes.Sphere002.geometry} material={materials.Raio} position={[1.676, -0.251, -0.192]} scale={0.01} />
                            </group>
                        </group>

                        {/* REST OF BIKE */}
                        <group position={[-0.428, -0.32, 0.011]} rotation={[1.571, -1.414, 3.142]} scale={[1, 3.023, 1]}>
                            <mesh geometry={nodes.Cylinder006.geometry} material={materials.Roda} />
                            <mesh geometry={nodes.Cylinder006_1.geometry} material={materials.Pneu} />
                        </group>
                        <mesh geometry={nodes.Cube.geometry} material={materials.Pneu} position={[-0.061, 0.319, 0]} scale={0.091} />

                        {/* Pedals */}
                        <group position={[0.272, -1.172, 0.013]}>
                            <mesh geometry={nodes.Cylinder005.geometry} material={materials.PedalInterno} />
                            <mesh geometry={nodes.Cylinder005_1.geometry} material={materials.PedalExterno} />
                        </group>
                        <mesh geometry={nodes.Cylinder001.geometry} material={materials.PedalInterno} position={[-1.029, -1.179, 0.165]} scale={0.501} />

                        <group position={[0.286, -0.975, 0.155]} rotation={[Math.PI / 2, 0, 0]} scale={[0.207, 0.127, 0.207]}>
                            <mesh geometry={nodes.Cylinder010.geometry} material={materials.Raio} />
                            <mesh geometry={nodes.Cylinder010_1.geometry} material={materials.Pneu} />
                        </group>
                        <mesh geometry={nodes.NurbsCurve.geometry} material={materials.Pneu} position={[0.43, -0.796, 0.092]} rotation={[Math.PI / 2, 0, 0]} />
                        <group position={[0.272, -1.527, -0.49]} scale={[3.421, 3.276, 10.4]}>
                            <mesh geometry={nodes.Cylinder007.geometry} material={materials.Pneu} />
                            <mesh geometry={nodes.Cylinder007_1.geometry} material={materials.Quadro} />
                        </group>
                        <group position={[0.272, -0.814, 0.522]} scale={[3.421, 3.276, 10.4]}>
                            <mesh geometry={nodes.Cylinder008.geometry} material={materials.Pneu} />
                            <mesh geometry={nodes.Cylinder008_1.geometry} material={materials.Quadro} />
                        </group>
                        <mesh geometry={nodes.Sphere.geometry} material={materials.Roda} position={[-0.381, -0.26, 0.18]} scale={0.009} />
                    </mesh>
                </group>
            </group>
        </RigidBody>
    );
}

useGLTF.preload("/models/bike.gltf");
