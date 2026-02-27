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
    const floorSize = 100;
    const wallHeight = 15;
    const wallThickness = 2;
    const concreteColor = "#acacac"; // Light grey

    return (
        <>
            {/* ──────────────────────────────────────────────
          THE WAREHOUSE ROOM (Base Environment)
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
          NEW 3D MODEL SKATEPARK ELEMENTS
          Note: Models need to be scaled up as the Kenney mini kit is quite small.
          Scale of 5.0 seems appropriate for the BMX bike scale.
          ────────────────────────────────────────────── */}
            <group scale={8}>
                {/* Center Funbox made of modular obstacle pieces */}
                <RigidBody type="fixed" colliders="trimesh" friction={0.6} restitution={0.05}>
                    <group position={[0, 0, 0]}>
                        <ObstacleEnd position={[0, 0, -1]} rotation={[0, Math.PI, 0]} />
                        <ObstacleMiddle position={[0, 0, 0]} />
                        <ObstacleEnd position={[0, 0, 1]} />
                    </group>
                </RigidBody>

                {/* A Half Pipe on one side */}
                <RigidBody type="fixed" colliders="trimesh" friction={0.4} restitution={0.05}>
                    <HalfPipe position={[-4, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
                </RigidBody>

                {/* Wooden platform and rails */}
                <RigidBody type="fixed" colliders="trimesh" friction={0.6}>
                    <StructurePlatform position={[4, 0, 2]} />
                    <StructureWood position={[4, 0, -2]} />
                </RigidBody>

                {/* Grind rail */}
                <RigidBody type="fixed" colliders="hull" friction={0.2} restitution={0.05}>
                    <RailHigh position={[0, 0, -3]} />
                </RigidBody>

                {/* A Quarter Pipe (Bowl Side) against a wall */}
                <RigidBody type="fixed" colliders="trimesh" friction={0.5}>
                    <BowlSide position={[0, 0, 4]} />
                </RigidBody>
            </group>
        </>
    );
}
