---
name: Movement
description: Guidelines and instructions for 3D character and vehicle movement implementation.
---

# Movement Backend

## Overview
This skill defines the standard practices for implementing smooth, realistic skateboard movement (the "Skate" feel) in 3D space using React Three Fiber and Rapier physics. **Arcade-style "hold to move" logic is strictly prohibited.**

## Core Principles
1. **Input Management**: Centralize input gathering (e.g., using `@react-three/drei`'s `useKeyboardControls`).
2. **Frame Loop**: Handle all movement logic within the `useFrame((state, delta) => { ... })` hook so it runs every frame.
3. **Physics-Driven Propulsion**: You must not translate the position of the board manually. All movement must occur by applying forces to the `RigidBody`.

## Realistic Skateboard Momentum (The "Skate 4" Feel)
To achieve a realistic simulation, adhere strictly to these physical rules:

1. **Tap-to-Push (Impulse Generation)**:
   - **Rule:** Forward input must NOT set a static speed or continuous acceleration.
   - **Implementation:** Treat forward input as a discrete "kick" or "push". When the forward key is pressed (tapped), apply a one-time forward `applyImpulse` to the RigidBody. 
   - **Cooldown:** Implement a cooldown mechanism (e.g., 0.5 seconds) between valid pushes to simulate the physical time it takes a skater's leg to return to the board.

2. **Releasing Input (No Drag/Coasting)**:
   - **Rule:** The skateboard must NOT coast or preserve momentum when input is released.
   - **Implementation:** The skateboard must rapidly decelerate to a complete stop as soon as the forward or backward keys are released, ensuring the player feels no "dragging" sensation.

3. **Speed Caps**:
   - Limit the maximum speed so rapid pushes don't compound infinitely. Cap speed realistically using damping or opposing drag forces when `vel.length() > maxSpeed`.

4. **Smooth Carving (Turning)**:
   - **Rule:** Turning is not an instant snap. It's a smooth carve that depends on your forward velocity.
   - **Implementation:** Steering (`left`/`right`) applies angular velocity (`setAngvel`) around the Y-axis. The turning radius should feel smooth and wide at higher speeds, requiring the player to plan their carves rather than spinning instantly.

5. **Braking / Powersliding**:
   - **Rule:** Holding backward acts as friction/braking, NOT reversing.
   - **Implementation:** Apply negative thrust or high damping when braking. The board must never move physically backward unless rolling down a ramp.

6. **Separation of Concerns**: Separate the logical movement (physics body, invisible bounds) from the visual representation (the 3D mesh). The visual mesh can have local rotations or leaning effects (carving leans) applied independently of the collision box.
