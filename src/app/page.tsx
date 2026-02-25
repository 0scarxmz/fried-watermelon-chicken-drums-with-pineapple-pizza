"use client";

import { Canvas } from "@react-three/fiber";
import { Sky, KeyboardControls, KeyboardControlsEntry } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import Ground from "@/components/Ground";
import BMX from "@/components/BMX";
import { useMemo } from "react";

enum Controls {
  forward = "forward",
  backward = "backward",
  left = "left",
  right = "right",
}

export default function Home() {
  const map = useMemo<KeyboardControlsEntry<Controls>[]>(() => [
    { name: Controls.forward, keys: ["ArrowUp", "w", "W"] },
    { name: Controls.backward, keys: ["ArrowDown", "s", "S"] },
    { name: Controls.left, keys: ["ArrowLeft", "a", "A"] },
    { name: Controls.right, keys: ["ArrowRight", "d", "D"] },
  ], []);

  return (
    <KeyboardControls map={map}>
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
        <Sky sunPosition={[100, 100, 100]} />
        <ambientLight intensity={1.2} />
        <hemisphereLight
          args={["#87ceeb", "#362d1b", 0.8]}
        />
        <directionalLight
          castShadow
          position={[50, 50, 25]}
          intensity={2.5}
          shadow-mapSize={[2048, 2048]}
        />
        <Physics>
          <Ground />
          <BMX />
        </Physics>
      </Canvas>
    </KeyboardControls>
  );
}
