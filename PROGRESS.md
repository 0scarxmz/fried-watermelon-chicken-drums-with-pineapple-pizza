# 🚲 3D Bike Game — Progress Tracker

## Stack
- **Framework**: Next.js (App Router)
- **3D**: Three.js + React Three Fiber (`@react-three/fiber`)
- **Helpers**: `@react-three/drei` (GLTF, camera, keyboard, Sky, Stars)
- **Physics**: `@react-three/rapier` (Rapier via WASM)
- **Model**: `bike.gltf` (Blender-exported, CC0)

---

## ✅ Completed

### Project Setup
- [x] Initialized Next.js project
- [x] Installed `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`
- [x] Cleared default Next.js boilerplate, set up bare canvas page

### Scene
- [x] `<Canvas>` with sky, stars, ambient + hemisphere + directional lights
- [x] Physics world via `<Physics>` from Rapier

### 3D Model Skatepark (`Skatepark.tsx`)
- [x] **Imported Assets**: Switched to the Kenney Mini Skate Kit (CC0).
- [x] **Converted Meshes**: Ran `gltfjsx` to generate React Native component pipelines.
- [x] **The Environment**: Recreated a warehouse environment using basic floor and wall geometry.
- [x] **Ramps & Rails**: Populated the center with a funbox, halfpipe, quarter pipe, rails, and a wooden structure.
- [x] **Complex Collisions**: Wrapped all curved models with `<RigidBody type="fixed" colliders="trimesh">` to allow accurate, smooth riding geometries.

### Atmosphere
- [x] Darker, enclosed background (`#050505`).
- [x] Bright overhead industrial `<PointLight>`s to simulate warehouse lighting.

### Bike (`BMX.tsx` + `BikeModel.tsx`)
- [x] Loaded real GLTF bike model, generated typed component via `gltfjsx`
- [x] Bike orientated correctly (rotated `-90°` on Y to face forward)
- [x] WASD keyboard controls (`KeyboardControls` from Drei)
- [x] Arcade-style movement: impulse-based forward/backward, torque for turning
- [x] Collider locked on pitch/roll so bike stays upright
- [x] Wheel spin animation: front and back wheel groups rotate via `useFrame` proportional to speed
- [x] Bike sits on top of ground (not clipping through)
- [x] Third-person follow camera
- [x] **Respawn system**: If bike Y < -10, teleport to [0, 5, 0] with zero velocity

---

## 🧪 In Progress / Known Issues
- [ ] Wheels may not perfectly align visually with tire geometry spin (rotation axis fine-tuning)
- [ ] No sound effects
- [ ] isGrounded check is approximate (Y threshold) — could use raycasting for precision

---

## 💡 Ideas / Backlog
- [ ] Jump / trick system (grabs, spins)
- [ ] More ramps and terrain on mini-platforms
- [ ] Opponent AIs
- [ ] Score / timer HUD
- [ ] Sound: engine hum, tire squeal, wind
- [ ] Procedural platform spawning
