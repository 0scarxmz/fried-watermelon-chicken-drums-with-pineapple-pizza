"use client";

import { Canvas } from "@react-three/fiber";
import { KeyboardControls, KeyboardControlsEntry } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import Skatepark from "@/components/Skatepark";
import BMX from "@/components/BMX";
import { useMemo } from "react";

enum Controls {
  forward = "forward",
  backward = "backward",
  left = "left",
  right = "right",
  jump = "jump",
}

export default function Home() {
  const map = useMemo<KeyboardControlsEntry<Controls>[]>(() => [
    { name: Controls.forward, keys: ["ArrowUp", "w", "W"] },
    { name: Controls.backward, keys: ["ArrowDown", "s", "S"] },
    { name: Controls.left, keys: ["ArrowLeft", "a", "A"] },
    { name: Controls.right, keys: ["ArrowRight", "d", "D"] },
    { name: Controls.jump, keys: [" "] },
  ], []);

  return (
    <KeyboardControls map={map}>
      <Canvas shadows camera={{ position: [0, 15, -18], fov: 65 }}>
        {/* Indoor Warehouse Atmosphere: Darker background, bright work lights inside */}
        <color attach="background" args={["#050505"]} />
        <ambientLight intensity={0.5} />

        {/* Soft fill light from the ceiling to ensure we can see everywhere */}
        <hemisphereLight args={["#ffffff", "#444444", 0.8]} />

        <Physics gravity={[0, -18, 0]}>
          <Skatepark />
          <BMX />
        </Physics>
      </Canvas>
    </KeyboardControls>
  );
}
