"use client";

import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

// Import generated models
import { Model as HalfPipe } from "./skatepark/half-pipe";
import { Model as ObstacleBox } from "./skatepark/obstacle-box";
import { Model as ObstacleEnd } from "./skatepark/obstacle-end";
import { Model as ObstacleMiddle } from "./skatepark/obstacle-middle";
import { Model as StructurePlatform } from "./skatepark/structure-platform";
import { Model as StructureWood } from "./skatepark/structure-wood";
import { Model as RailHigh } from "./skatepark/rail-high";
import { Model as BowlCornerInner } from "./skatepark/bowl-corner-inner";
import { Model as BowlCornerOuter } from "./skatepark/bowl-corner-outer";
import { Model as BowlSide } from "./skatepark/bowl-side";

export default function Skatepark() {
    const floorSize = 1000;
    const wallHeight = 50;
    const wallThickness = 2;
    const concreteColor = "#acacac"; // Light grey

    return (
        <>
            {/* ──────────────────────────────────────────────
          THE WAREHOUSE ROOM (Base Environment)
          ────────────────────────────────────────────── */}
            {/* Floor */}
            <RigidBody type="fixed" friction={1.5} restitution={0.1}>
                <mesh receiveShadow position={[0, -0.5, 0]}>
                    <boxGeometry args={[floorSize, 1, floorSize]} />
                    <meshStandardMaterial color={concreteColor} roughness={0.8} />
                </mesh>
            </RigidBody>

            {/* Walls - Each gets its own RigidBody to prevent invisible compound hulls! */}
            <RigidBody type="fixed">
                <mesh receiveShadow position={[0, wallHeight / 2, -floorSize / 2 - wallThickness / 2]}>
                    <boxGeometry args={[floorSize, wallHeight, wallThickness]} />
                    <meshStandardMaterial color={concreteColor} roughness={0.9} />
                </mesh>
            </RigidBody>
            <RigidBody type="fixed">
                <mesh receiveShadow position={[0, wallHeight / 2, floorSize / 2 + wallThickness / 2]}>
                    <boxGeometry args={[floorSize, wallHeight, wallThickness]} />
                    <meshStandardMaterial color={concreteColor} roughness={0.9} />
                </mesh>
            </RigidBody>
            <RigidBody type="fixed">
                <mesh receiveShadow position={[-floorSize / 2 - wallThickness / 2, wallHeight / 2, 0]}>
                    <boxGeometry args={[wallThickness, wallHeight, floorSize]} />
                    <meshStandardMaterial color={concreteColor} roughness={0.9} />
                </mesh>
            </RigidBody>
            <RigidBody type="fixed">
                <mesh receiveShadow position={[floorSize / 2 + wallThickness / 2, wallHeight / 2, 0]}>
                    <boxGeometry args={[wallThickness, wallHeight, floorSize]} />
                    <meshStandardMaterial color={concreteColor} roughness={0.9} />
                </mesh>
            </RigidBody>

            {/* ──────────────────────────────────────────────
          OVERHEAD LIGHTING
          ────────────────────────────────────────────── */}
            <pointLight position={[0, 40, 0]} intensity={2.0} castShadow />
            <pointLight position={[100, 40, 100]} intensity={1.5} />
            <pointLight position={[-100, 40, -100]} intensity={1.5} />
            <pointLight position={[100, 40, -100]} intensity={1.5} />
            <pointLight position={[-100, 40, 100]} intensity={1.5} />

            {/* ──────────────────────────────────────────────
          NEW 3D MODEL SKATEPARK ELEMENTS
          ────────────────────────────────────────────── */}
            <>
                {/* Half Pipe on the left */}
                <RigidBody type="fixed" colliders="trimesh" friction={0.4} restitution={0.05} position={[-80, 0, 0]}>
                    <HalfPipe scale={15} rotation={[0, Math.PI / 2, 0]} />
                </RigidBody>

                {/* Funbox moved forward to not block spawn at [0,0,0] */}
                <RigidBody type="fixed" colliders="trimesh" friction={0.6} restitution={0.05} position={[0, 0, -100]}>
                    <group scale={15}>
                        <ObstacleEnd position={[0, 0, -2]} rotation={[0, Math.PI, 0]} />
                        <ObstacleMiddle position={[0, 0, 0]} />
                        <ObstacleEnd position={[0, 0, 2]} />
                    </group>
                </RigidBody>

                {/* Wooden platform on the right */}
                <RigidBody type="fixed" colliders="trimesh" friction={0.6} position={[80, 0, 0]}>
                    <StructurePlatform scale={15} />
                </RigidBody>
                
                {/* Quarter Pipe Bowl far back */}
                <RigidBody type="fixed" colliders="trimesh" friction={0.5} position={[0, 0, 120]}>
                    <BowlSide scale={15} />
                </RigidBody>
            </>
        </>
    );
}
