---
name: Physics
description: Guidelines and standard practices for handling physics interactions and rigid bodies.
---

# Physics Backend

## Overview
This skill outlines the approach and rules for implementing physics within our application, primarily using `@react-three/rapier`.

## Core Principles
1. **Rigid Bodies**: Wrap physical objects in `<RigidBody>` components to register them with the physics engine. Specify `dynamic`, `fixed`, or `kinematicPosition` types appropriately.
2. **Colliders**: Prefer using simple primitive colliders (e.g., `<CuboidCollider>`, `<BallCollider>`) over auto-generating complex convex hulls whenever possible to maintain high performance.
3. **Imperative Control**: Use references (`useRef<RapierRigidBody>(null)`) to access physics objects and apply forces imperatively instead of relying solely on declarative state changes.
4. **Applying Forces**: 
   - Use `applyImpulse` for instantaneous forces (like jumps or impacts).
   - Use `applyImpulse` continuously (scaled by `delta`) or `setLinvel`/`setAngvel` for continuous movement like accelerating a vehicle.
5. **Damping**: Apply `linearDamping` and `angularDamping` to rigid bodies to restrict infinite sliding or spinning.
6. **Constraints (e.g., Skateboard stability)**: 
   - **Prevent Flipping**: Utilize constraints to lock object rotations if needed (e.g., passing `enabledRotations={[false, true, false]}` to prevent a skateboard from flipping on its side). Ensure the skateboard stays upright and only spins along the Y-axis.
   - **Prevent Flying**: Be careful with large explosive forces or overlapping colliders that cause physics jitter, throwing the player out of bounds. Adjust damping or clamp velocities if the physics feel too bouncy.
   - **Focus on Grounding**: A skateboard should ideally only perform its intended physics behaviors (rolling forward, carving) without becoming an unpredictable projectile.
