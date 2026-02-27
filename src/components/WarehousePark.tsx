"use client";

import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

export default function WarehousePark() {
    const floorSize = 100;
    const wallHeight = 15;
    const wallThickness = 2;

    // Plywood material settings
    const plyColor = "#d2b48c"; // Warm light brown

    // Concrete material settings
    const concreteColor = "#acacac"; // Light grey

    return (
        <>
            {/* ──────────────────────────────────────────────
          THE WAREHOUSE ROOM
          ────────────────────────────────────────────── */}
            <RigidBody type="fixed" friction={1.5} restitution={0.1}>
                {/* Floor */}
                <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[floorSize, floorSize]} />
                    <meshStandardMaterial color={concreteColor} roughness={0.8} />
                </mesh>

                {/* Walls */}
                <mesh receiveShadow position={[0, wallHeight / 2, -floorSize / 2 - wallThickness / 2]}>
                    <boxGeometry args={[floorSize, wallHeight, wallThickness]} />
                    <meshStandardMaterial color={concreteColor} roughness={0.9} />
                </mesh>
                <mesh receiveShadow position={[0, wallHeight / 2, floorSize / 2 + wallThickness / 2]}>
                    <boxGeometry args={[floorSize, wallHeight, wallThickness]} />
                    <meshStandardMaterial color={concreteColor} roughness={0.9} />
                </mesh>
                <mesh receiveShadow position={[-floorSize / 2 - wallThickness / 2, wallHeight / 2, 0]}>
                    <boxGeometry args={[wallThickness, wallHeight, floorSize]} />
                    <meshStandardMaterial color={concreteColor} roughness={0.9} />
                </mesh>
                <mesh receiveShadow position={[floorSize / 2 + wallThickness / 2, wallHeight / 2, 0]}>
                    <boxGeometry args={[wallThickness, wallHeight, floorSize]} />
                    <meshStandardMaterial color={concreteColor} roughness={0.9} />
                </mesh>
            </RigidBody>

            {/* ──────────────────────────────────────────────
          OVERHEAD LIGHTING
          ────────────────────────────────────────────── */}
            <pointLight position={[0, 20, 0]} intensity={1.5} castShadow />
            <pointLight position={[30, 20, 30]} intensity={1.2} />
            <pointLight position={[-30, 20, -30]} intensity={1.2} />
            <pointLight position={[30, 20, -30]} intensity={1.2} />
            <pointLight position={[-30, 20, 30]} intensity={1.2} />

            {/* ──────────────────────────────────────────────
          THE CENTER JUMP BOX (FUNBOX)
          ────────────────────────────────────────────── */}
            <RigidBody type="fixed" friction={0.6} restitution={0.05}>
                <group position={[0, 0, 0]}>
                    {/* Table-top center */}
                    <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
                        <boxGeometry args={[8, 3, 4]} />
                        <meshStandardMaterial color={plyColor} roughness={0.6} />
                    </mesh>

                    {/* Launch ramp (front) */}
                    <mesh castShadow receiveShadow position={[0, 0.75, 4]} rotation={[-Math.PI / 6, 0, 0]}>
                        <boxGeometry args={[8, 4.5, 0.5]} />
                        <meshStandardMaterial color={plyColor} roughness={0.6} />
                    </mesh>

                    {/* Landing ramp (back) */}
                    <mesh castShadow receiveShadow position={[0, 0.75, -4]} rotation={[Math.PI / 6, 0, 0]}>
                        <boxGeometry args={[8, 4.5, 0.5]} />
                        <meshStandardMaterial color={plyColor} roughness={0.6} />
                    </mesh>

                    {/* Side walls (to close the jump box visually) */}
                    <mesh castShadow receiveShadow position={[4, 1.5, 0]}>
                        <boxGeometry args={[0.5, 3, 4]} />
                        <meshStandardMaterial color={plyColor} roughness={0.6} />
                    </mesh>
                    <mesh castShadow receiveShadow position={[-4, 1.5, 0]}>
                        <boxGeometry args={[0.5, 3, 4]} />
                        <meshStandardMaterial color={plyColor} roughness={0.6} />
                    </mesh>
                </group>
            </RigidBody>

            {/* ──────────────────────────────────────────────
          THE QUARTER PIPE (TURNAROUND)
          ────────────────────────────────────────────── */}
            <RigidBody type="fixed" friction={0.6} restitution={0.05}>
                <group position={[0, 0, -floorSize / 2 + 3]}>
                    {/* A wide, steep bank resting against the back wall */}
                    {/* Instead of a curve, we'll use a steep angled plane/box as requested */}
                    <mesh castShadow receiveShadow position={[0, 3, 0]} rotation={[Math.PI / 3, 0, 0]}>
                        <boxGeometry args={[30, 12, 0.5]} />
                        <meshStandardMaterial color={plyColor} roughness={0.6} />
                    </mesh>

                    {/* Top deck for the quarter pipe */}
                    <mesh castShadow receiveShadow position={[0, 6, -3]}>
                        <boxGeometry args={[30, 0.5, 6]} />
                        <meshStandardMaterial color={plyColor} roughness={0.6} />
                    </mesh>
                </group>
            </RigidBody>
        </>
    );
}
