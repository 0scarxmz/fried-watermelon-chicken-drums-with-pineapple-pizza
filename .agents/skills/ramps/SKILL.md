---
name: Ramps
description: Guidelines and standard practices for handling ramps, transitions, and angled surfaces for skateboards or vehicles.
---

# Ramps Backend

## Overview
This skill outlines the approach for interacting with ramps, bowls, and varied terrain, ensuring realistic gravity and momentum behavior.

## Core Principles
1. **Surface Normals & Raycasting**: 
   - Use raycasting (e.g., shooting a ray straight down from the board) to determine the ground's normal vector. 
   - Align the skateboard's rotation to match the surface normal so it continuously hugs the ramp's curve rather than clipping through or hovering above it.

2. **Gravity & Momentum (Coasting)**:
   - When going **down** a ramp, gravity should naturally increase the linear velocity without any player input.
   - When going **up** a ramp, gravity should naturally fight the player's momentum, slowing them down.

3. **Pumping Mechanics (Advanced)**:
   - To mimic real skateboarding (e.g., the *Skate* series), implement a "pump" mechanic. 
   - When the player presses a specific button (like crouch) going into the curve of a ramp, and releases it on the way up, apply a forward impulse. This allows them to gain speed in a halfpipe without pushing.

4. **Collider Shapes for Ramps**:
   - Ramps should use `trimesh` colliders if they are complex curves, or precise rotated `cuboid` colliders if they are flat banks. `hull` or `convexHull` might smooth out curves too much or create invisible bumps.
   - Ensure the transition from flat ground to the ramp vertex is seamless to avoid the physics engine snagging the wheels on a harsh edge.

5. **Avoiding Launch Bugs**:
   - If the player hits the top edge of a ramp (coping) too fast, the physics engine might over-compensate and launch them into the stratosphere. 
   - Clamp the maximum vertical velocity, or use a "stick to ground" threshold that only releases the player if they explicitly jump or the ramp ends abruptly.
