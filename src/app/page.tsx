"use client";

import { Canvas } from "@react-three/fiber";
import { Sky, KeyboardControls, KeyboardControlsEntry } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import Ground from "@/components/Ground";
import Player from "@/components/Player";
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
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          position={[10, 10, 10]}
          intensity={1.5}
          shadow-mapSize={[1024, 1024]}
        />
        <Physics debug>
          <Ground />
          <Player />
        </Physics>
      </Canvas>
    </KeyboardControls>
  );
}
