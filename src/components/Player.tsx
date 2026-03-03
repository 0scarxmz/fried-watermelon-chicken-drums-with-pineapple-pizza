"use client";

import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody, RapierRigidBody, BallCollider, useRapier } from "@react-three/rapier";

export default function Player() {
    const rbRef = useRef<RapierRigidBody>(null);
    const meshRef = useRef<THREE.Group>(null);
    const flipRef = useRef<THREE.Group>(null);

    const { rapier, world } = useRapier();

    const isFlipping = useRef(false);
    const flipAngle = useRef(0);
    const wasJumpPressed = useRef(false);
    const lastJumpTime = useRef(-1); // Tracks when the last jump tap happened (for double-tap detection)

    // Speed tracking for acceleration
    const currentSpeed = useRef(0);

    const smoothedCameraPosition = useRef(new THREE.Vector3(0, 10, -10));
    const smoothedCameraTarget = useRef(new THREE.Vector3());

    const [, getKeys] = useKeyboardControls();

    const { scene, materials } = useGLTF('/skateboard.glb') as any;

    useEffect(() => {
        if (materials && materials.colormap) {
            scene.traverse((child: any) => {
                if (child.isMesh) {
                    child.material = materials.colormap;
                }
            });
        }
    }, [scene, materials]);

    useFrame((state, delta) => {
        if (!rbRef.current) return;

        const keys = getKeys() as any;
        const { forward, backward, left, right, jump } = keys;
        const now = state.clock.getElapsedTime();

        const pos = rbRef.current.translation();
        const vel = rbRef.current.linvel();
        const rot = rbRef.current.rotation();

        if (pos.y < -15) {
            rbRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true);
            rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            return;
        }

        const rbQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
        const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(rbQuat);

        const rayOrigin = { x: pos.x, y: pos.y + 0.1, z: pos.z };
        const rayDir = { x: 0, y: -1, z: 0 };
        const ray = new rapier.Ray(rayOrigin, rayDir);

        let floorNormal = new THREE.Vector3(0, 1, 0);
        let isGrounded = false;

        // solid=false ensures the raycast completely ignores the inside of the player's own colliders
        const hit = world.castRay(ray, 1.5, false);

        if (hit && hit.toi < 0.8) {
            isGrounded = true;
            floorNormal.set(hit.normal.x, hit.normal.y, hit.normal.z);
        }

        const slopeForward = forwardDir.clone().projectOnPlane(floorNormal).normalize();
        const currentVelocity = new THREE.Vector3(vel.x, vel.y, vel.z);
        const horizontalVelocity = new THREE.Vector3(vel.x, 0, vel.z);
        const speedXZ = horizontalVelocity.length();

        // --- ARCADE MOVEMENT (NO SLIDING, NO DRIFTING) ---
        const moveSpeed = 20;

        if (isGrounded) {
            rbRef.current.setGravityScale(0, true);

            if (!forward && !backward) {
                // HARD INSTANT STOP: Zero sliding, zero drifting
                currentSpeed.current = 0;
                rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                rbRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

                // Sleep entirely freezes the physics body in the engine. It cannot be moved by gravity, ramps, or collision forces.
                rbRef.current.sleep();
            } else {
                rbRef.current.wakeUp();

                let targetSpeed = 0;
                if (forward) targetSpeed = moveSpeed;
                if (backward) targetSpeed = -moveSpeed;

                currentSpeed.current = targetSpeed;

                // Move exactly along the direction you are facing instantly.
                const newVel = slopeForward.clone().multiplyScalar(targetSpeed);

                // FORCE velocity. Do not let physics engine apply momentum or gravity slides.
                rbRef.current.setLinvel({
                    x: newVel.x,
                    y: newVel.y,
                    z: newVel.z
                }, true);
            }
        } else {
            rbRef.current.wakeUp();
            // Re-enable gravity when in the air so you can fall/jump
            rbRef.current.setGravityScale(1, true);

            // Fixed air control (no speed increase/impulses)
            let airSpeed = 0;
            if (forward) airSpeed = moveSpeed * 0.8;
            if (backward) airSpeed = -moveSpeed * 0.8;

            if (airSpeed !== 0) {
                const airVel = forwardDir.clone().multiplyScalar(airSpeed);
                rbRef.current.setLinvel({ x: airVel.x, y: vel.y, z: airVel.z }, true);
            } else {
                // Instantly kill forward/backward momentum in the air when W is released
                rbRef.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
            }
        }

        // --- TURNING ---
        let turnSpeed = 0;
        if (left) turnSpeed = 3.5;
        if (right) turnSpeed = -3.5;

        // Instant, snappy turning with zero residual spin
        if (turnSpeed !== 0 && (forward || backward || !isGrounded)) {
            rbRef.current.wakeUp();
            rbRef.current.setAngvel({ x: 0, y: turnSpeed, z: 0 }, true);
        } else if (forward || backward || !isGrounded) {
            rbRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }

        // --- JUMP & TRICK (double-tap Space) ---
        if (jump && !wasJumpPressed.current) {
            rbRef.current.wakeUp();

            const timeSinceLastJump = now - lastJumpTime.current;
            const isDoubleTap = timeSinceLastJump < 0.4; // Within 0.4 seconds = double-tap

            if (isGrounded) {
                if (isDoubleTap) {
                    // DOUBLE TAP: Ollie + kickflip trick
                    rbRef.current.setLinvel({ x: vel.x, y: 0, z: vel.z }, true);
                    rbRef.current.applyImpulse({ x: 0, y: 15, z: 0 }, true); // Higher ollie for trick
                    isFlipping.current = true;
                    flipAngle.current = 0;
                } else {
                    // SINGLE TAP: Normal ollie
                    rbRef.current.applyImpulse({ x: 0, y: 11, z: 0 }, true);
                }
                lastJumpTime.current = now;
            }
        }
        wasJumpPressed.current = jump;

        // Reset trick when landing
        if (isGrounded && isFlipping.current) {
            isFlipping.current = false;
            flipAngle.current = 0;
        }

        // --- VISUALS ---
        if (meshRef.current) {
            const targetUp = floorNormal.clone().normalize();
            const targetForward = forwardDir.clone().projectOnPlane(targetUp).normalize();
            const targetRight = new THREE.Vector3().crossVectors(targetUp, targetForward).normalize();

            const targetMat = new THREE.Matrix4().makeBasis(targetRight, targetUp, targetForward);
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetMat);

            const localTargetQuat = targetQuat.clone().premultiply(rbQuat.clone().invert());

            // I REMOVED the sideways lean drifting animation entirely as requested
            meshRef.current.quaternion.slerp(localTargetQuat, 15 * delta);
        }

        if (flipRef.current) {
            if (isFlipping.current) {
                flipAngle.current += Math.PI * 6 * delta;
                if (flipAngle.current >= Math.PI * 2) {
                    flipAngle.current = 0;
                    isFlipping.current = false;
                }
            }
            flipRef.current.rotation.z = flipAngle.current;
        }

        // --- CAMERA ---
        // Skate 4-style: elevated behind the board, angled down so you see the top and front
        const cameraDistance = 7;
        const cameraHeight = 5;

        const playerPosVec = new THREE.Vector3(pos.x, pos.y, pos.z);

        const idealOffset = forwardDir.clone().multiplyScalar(-cameraDistance)
            .add(new THREE.Vector3(0, cameraHeight, 0));

        const idealPosition = playerPosVec.clone().add(idealOffset);

        // Look slightly ahead of the board + slightly elevated so camera angles down naturally
        const idealTarget = playerPosVec.clone()
            .add(forwardDir.clone().multiplyScalar(2))
            .add(new THREE.Vector3(0, 0.5, 0));

        const camSpeed = (forward || backward) ? 12 : 30;
        smoothedCameraPosition.current.lerp(idealPosition, camSpeed * delta);
        smoothedCameraTarget.current.lerp(idealTarget, 20 * delta);

        state.camera.position.copy(smoothedCameraPosition.current);
        state.camera.lookAt(smoothedCameraTarget.current);
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
            linearDamping={0}
            angularDamping={10.0} // MASSIVE angular drag to prevent spinning
        >
            <BallCollider args={[0.2]} position={[0, 0.2, 0.4]} />
            <BallCollider args={[0.2]} position={[0, 0.2, -0.4]} />

            <group ref={meshRef} position={[0, 0, 0]}>
                <group ref={flipRef}>
                    <primitive object={scene} position={[0, -0.2, 0]} rotation={[0, 0, 0]} scale={6.75} />
                </group>
            </group>
        </RigidBody>
    );
}

useGLTF.preload('/skateboard.glb');
