"use client";

import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody, RapierRigidBody, BallCollider, useRapier } from "@react-three/rapier";

export default function Player() {
    const rbRef = useRef<RapierRigidBody>(null);
    const meshRef = useRef<THREE.Group>(null); // For leaning and ramp alignment
    const flipRef = useRef<THREE.Group>(null); // For the flip animation

    const { rapier, world } = useRapier();

    // Jump state variables
    const canDoubleJump = useRef(false);
    const isFlipping = useRef(false);
    const flipAngle = useRef(0);
    const wasJumpPressed = useRef(false);

    // Push timer
    const lastPushTime = useRef(0);

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

    useFrame((state, delta) => {
        if (!rbRef.current) return;

        const { forward, backward, left, right, jump } = getKeys() as any;
        const now = state.clock.getElapsedTime();

        const pos = rbRef.current.translation();
        const vel = rbRef.current.linvel();
        const rot = rbRef.current.rotation();

        // Respawn if fell off map
        if (pos.y < -15) {
            rbRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true);
            rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            return;
        }

        // The RigidBody is locked upright (only rotates on Y axis)
        const rbQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
        const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(rbQuat);

        // Raycast straight down from center of the ball to find the ground/ramp
        const rayOrigin = { x: pos.x, y: pos.y + 0.4, z: pos.z };
        const rayDir = { x: 0, y: -1, z: 0 };
        const ray = new rapier.Ray(rayOrigin, rayDir);
        
        // solid=false is crucial! It ignores the inside of the player's own collider
        const hit = world.castRay(ray, 1.5, false);

        let floorNormal = new THREE.Vector3(0, 1, 0);
        let isGrounded = false;

        // Radius is 0.4. If toi is around 0.4, we are touching the floor.
        // We give it a generous margin (0.6) to stick to ramps
        if (hit && hit.toi < 0.6) {
            isGrounded = true;
            floorNormal.set(hit.normal.x, hit.normal.y, hit.normal.z);
        }

        // Project the flat forward direction onto the ramp's slope
        const slopeForward = forwardDir.clone().projectOnPlane(floorNormal).normalize();

        // --- MOVEMENT & PHYSICS ---
        if (isGrounded) {
            // Push Mechanic
            if (forward && now - lastPushTime.current > 1.2) {
                lastPushTime.current = now;
                // Give a strong forward impulse
                const pushForce = slopeForward.clone().multiplyScalar(15);
                rbRef.current.applyImpulse({ x: pushForce.x, y: pushForce.y, z: pushForce.z }, true);
            }

            // Braking / Fakie
            if (backward) {
                const brakeForce = slopeForward.clone().multiplyScalar(-30 * delta);
                rbRef.current.applyImpulse({ x: brakeForce.x, y: brakeForce.y, z: brakeForce.z }, true);
            }

            const currentVelocity = new THREE.Vector3(vel.x, vel.y, vel.z);

            // Grip: Kill lateral velocity so the skateboard doesn't slide sideways down ramps
            const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(rbQuat).projectOnPlane(floorNormal).normalize();
            const lateralSpeed = currentVelocity.dot(rightDir);
            const lateralForce = rightDir.clone().multiplyScalar(-lateralSpeed * 40 * delta);
            rbRef.current.applyImpulse({ x: lateralForce.x, y: lateralForce.y, z: lateralForce.z }, true);

            // Slight downward pull to stick to the ramps over bumps
            rbRef.current.applyImpulse({ x: -floorNormal.x, y: -floorNormal.y, z: -floorNormal.z }, true);
        } else {
            // Minimal air control
            if (forward) rbRef.current.applyImpulse(forwardDir.clone().multiplyScalar(10 * delta), true);
            if (backward) rbRef.current.applyImpulse(forwardDir.clone().multiplyScalar(-10 * delta), true);
        }

        // --- TURNING ---
        let turnSpeed = 0;
        if (left) turnSpeed = 3.5;
        if (right) turnSpeed = -3.5;
        
        // Only allow turning if we are moving, or if we're in the air
        const speed = new THREE.Vector3(vel.x, vel.y, vel.z).length();
        if (speed > 1 || !isGrounded) {
            rbRef.current.setAngvel({ x: 0, y: turnSpeed, z: 0 }, true);
        } else {
            rbRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }

        // --- JUMPING ---
        if (jump && !wasJumpPressed.current) {
            if (isGrounded) {
                // First Jump
                rbRef.current.applyImpulse({ x: 0, y: 14, z: 0 }, true);
                canDoubleJump.current = true;
            } else if (canDoubleJump.current) {
                // Double Jump / Kickflip
                rbRef.current.setLinvel({ x: vel.x, y: Math.max(vel.y, 0), z: vel.z }, true);
                rbRef.current.applyImpulse({ x: 0, y: 12, z: 0 }, true);
                canDoubleJump.current = false;

                // Start Flip
                isFlipping.current = true;
                flipAngle.current = 0;
            }
        }
        wasJumpPressed.current = jump;

        if (isGrounded && isFlipping.current) {
            // Landed early
            isFlipping.current = false;
            flipAngle.current = 0;
        }

        // --- VISUALS (Ramp alignment & Leaning) ---
        if (meshRef.current) {
            // Calculate the world-space target orientation based on floor normal
            const targetUp = floorNormal.clone().normalize();
            const targetForward = forwardDir.clone().projectOnPlane(targetUp).normalize();
            const targetRight = new THREE.Vector3().crossVectors(targetUp, targetForward).normalize();

            // Negate right vector since cross(up, forward) = right, but depending on handedness it could be left.
            // Actually crossVectors(targetForward, targetUp) = targetRight.
            const rightVec = new THREE.Vector3().crossVectors(targetForward, targetUp).normalize();
            
            const targetMat = new THREE.Matrix4().makeBasis(rightVec, targetUp, targetForward);
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetMat);

            // Because meshRef is a child of the RigidBody, its local rotation should just be the difference
            const localTargetQuat = targetQuat.clone().premultiply(rbQuat.clone().invert());

            // Add slight lean when turning
            let targetLean = 0;
            if (left && (forward || backward)) targetLean = -0.2;
            if (right && (forward || backward)) targetLean = 0.2;
            const leanQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), targetLean);

            localTargetQuat.multiply(leanQuat);

            // Smoothly rotate the visual mesh to match the ramp
            meshRef.current.quaternion.slerp(localTargetQuat, 15 * delta);
        }

        // Flip Animation
        if (flipRef.current) {
            if (isFlipping.current) {
                flipAngle.current += Math.PI * 5 * delta;
                if (flipAngle.current >= Math.PI * 2) {
                    flipAngle.current = 0;
                    isFlipping.current = false;
                }
            }
            flipRef.current.rotation.z = flipAngle.current;
        }

        // --- CAMERA FOLLOW ---
        const playerPosVec = new THREE.Vector3(pos.x, pos.y, pos.z);

        const idealOffset = forwardDir.clone().multiplyScalar(-10).add(new THREE.Vector3(0, 6, 0));
        const idealPosition = playerPosVec.clone().add(idealOffset);

        const idealTarget = playerPosVec.clone().add(
            forwardDir.clone().multiplyScalar(15)
        );

        cameraPosition.lerp(idealPosition, 5 * delta);
        cameraTarget.lerp(idealTarget, 10 * delta);

        state.camera.position.copy(cameraPosition);
        state.camera.lookAt(cameraTarget);
    });

    return (
        <RigidBody
            ref={rbRef}
            colliders={false}
            mass={1}
            type="dynamic"
            position={[0, 5, 0]}
            friction={0}
            restitution={0}
            enabledRotations={[false, true, false]}
            linearDamping={0.4}
            angularDamping={4}
        >
            <BallCollider args={[0.4]} position={[0, 0.4, 0]} />

            <group ref={meshRef} position={[0, 0, 0]}>
                <group ref={flipRef}>
                    <primitive object={scene} position={[0, -0.2, 0]} rotation={[0, Math.PI, 0]} scale={6.75} />
                </group>
            </group>
        </RigidBody>
    );
}

useGLTF.preload('/skateboard.glb');
