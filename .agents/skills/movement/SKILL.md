---
name: Movement
description: Guidelines and instructions for 3D character and vehicle movement implementation.
---

# Movement Backend

## Overview
This skill defines the standard practices for implementing smooth, frame-rate independent movement controls in 3D space using React Three Fiber.

## Core Principles
1. **Input Management**: Centralize input gathering (e.g., using `@react-three/drei`'s `useKeyboardControls`) rather than attaching loose event listeners.
2. **Frame Loop**: Handle all movement logic within the `useFrame((state, delta) => { ... })` hook so it runs every frame.
3. **Delta Time**: Always multiply continuous movement or speed values by `delta` (time since last frame) to ensure movement speed is consistent across different monitor refresh rates.
4. **Position vs. Velocity**:
   - For non-physics objects, manually update `ref.current.position` or `ref.current.translateZ()`.
   - For objects with physics (`RigidBody`), do **not** set position directly. Instead, modify linear velocity (`setLinvel`) or apply forces (`applyImpulse`) to let the physics engine orchestrate the movement.
5. **Smoothing & Interpolation**: Use `THREE.MathUtils.lerp(current, target, factor * delta)` to smoothly transition visual states, rotations, and camera following constraints over time.
6. **Separation of Concerns**: Separate the logical movement (physics body, invisible bounds) from the visual representation (the 3D mesh). The visual mesh can have local rotations or leaning effects applied independently of the collision box.
