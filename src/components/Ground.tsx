"use client";

import { RigidBody } from "@react-three/rapier";

export default function Ground() {
  return (
    <RigidBody type="fixed" friction={2}>
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[1000, 1, 1000]} />
        <meshStandardMaterial color="#6b6b6b" />
      </mesh>
    </RigidBody>
  );
}
