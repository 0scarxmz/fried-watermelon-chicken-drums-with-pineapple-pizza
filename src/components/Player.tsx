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
    const lastJumpTime = useRef(-1);

    // Ground tracking via collision events
    const groundContactCount = useRef(0);

    // Real-world speed tracking (in m/s, 1 m/s = 3.6 km/h)
    const currentSpeedMs = useRef(0);

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
            currentSpeedMs.current = 0;
            groundContactCount.current = 0;
            return;
        }

        const rbQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
        const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(rbQuat);

        // --- GROUND DETECTION using velocity + position ---
        // The floor top surface is at y=0. Ball colliders at pos.y+0.2 with radius 0.2
        // means the board sits at pos.y ≈ 0 when on the ground.
        // Also check vertical velocity is near zero (not moving up fast = not just jumped)
        const isGrounded = pos.y < 0.5 && vel.y > -3;

        let floorNormal = new THREE.Vector3(0, 1, 0);

        // Optionally refine floor normal using a ray (but fallback if miss)
        try {
            const rayOrigin = { x: pos.x, y: pos.y + 0.3, z: pos.z };
            const ray = new rapier.Ray(rayOrigin, { x: 0, y: -1, z: 0 });
            const hit = world.castRay(ray, 2.0, false);
            if (hit && hit.toi < 1.5) {
                const n = hit.normal;
                if (n && Math.abs(n.y) > 0.3) {
                    floorNormal.set(n.x, n.y, n.z);
                }
            }
        } catch (_) {
            // If castRay fails, keep default up normal
        }

        const slopeForward = forwardDir.clone().projectOnPlane(floorNormal).normalize();

        // --- REALISTIC SKATEBOARD SPEED (km/h) ---
        // 1 Rapier unit = 1 m, so 1 m/s = 3.6 km/h
        const maxSpeedMs = 28 / 3.6;    // 28 km/h top speed
        const accelMs = 5.0;             // m/s² while holding W
        const decelMs = 12;              // m/s² when releasing W
        const brakeMs = 22;              // m/s² when pressing S

        if (isGrounded) {
            rbRef.current.wakeUp();
            rbRef.current.setGravityScale(0, true);

            if (forward) {
                currentSpeedMs.current = Math.min(maxSpeedMs, currentSpeedMs.current + accelMs * delta);
            } else if (backward) {
                if (currentSpeedMs.current > 0) {
                    currentSpeedMs.current = Math.max(0, currentSpeedMs.current - brakeMs * delta);
                } else {
                    currentSpeedMs.current = Math.max(-maxSpeedMs * 0.4, currentSpeedMs.current - (brakeMs * 0.4) * delta);
                }
            } else {
                if (currentSpeedMs.current > 0) {
                    currentSpeedMs.current = Math.max(0, currentSpeedMs.current - decelMs * delta);
                } else if (currentSpeedMs.current < 0) {
                    currentSpeedMs.current = Math.min(0, currentSpeedMs.current + decelMs * delta);
                }
            }

            const newVel = slopeForward.clone().multiplyScalar(currentSpeedMs.current);
            rbRef.current.setLinvel({ x: newVel.x, y: newVel.y, z: newVel.z }, true);

        } else {
            rbRef.current.wakeUp();
            rbRef.current.setGravityScale(1, true);
            // Carry forward speed through air
            const airVel = forwardDir.clone().multiplyScalar(currentSpeedMs.current);
            rbRef.current.setLinvel({ x: airVel.x, y: vel.y, z: airVel.z }, true);
        }

        // --- TURNING ---
        let turnSpeed = 0;
        if (left) turnSpeed = 3.5;
        if (right) turnSpeed = -3.5;

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
            const isDoubleTap = timeSinceLastJump < 0.4;

            if (isGrounded) {
                rbRef.current.setGravityScale(1, true);
                if (isDoubleTap) {
                    rbRef.current.setLinvel({ x: vel.x, y: 0, z: vel.z }, true);
                    rbRef.current.applyImpulse({ x: 0, y: 15, z: 0 }, true);
                    isFlipping.current = true;
                    flipAngle.current = 0;
                } else {
                    rbRef.current.applyImpulse({ x: 0, y: 11, z: 0 }, true);
                }
                lastJumpTime.current = now;
            }
        }
        wasJumpPressed.current = jump;

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

        // --- CAMERA (Skate 4 style) ---
        const cameraDistance = 7;
        const cameraHeight = 7;

        const playerPosVec = new THREE.Vector3(pos.x, pos.y, pos.z);
        const idealOffset = forwardDir.clone().multiplyScalar(-cameraDistance)
            .add(new THREE.Vector3(0, cameraHeight, 0));
        const idealPosition = playerPosVec.clone().add(idealOffset);
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
            angularDamping={10.0}
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
