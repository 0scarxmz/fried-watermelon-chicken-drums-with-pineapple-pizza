# 🚲 3D Bike Game — Progress Tracker

## Stack
- **Framework**: Next.js (App Router)
- **3D**: Three.js + React Three Fiber (`@react-three/fiber`)
- **Helpers**: `@react-three/drei` (GLTF, camera, keyboard)
- **Physics**: `@react-three/rapier` (Rapier via WASM)
- **Model**: `bike.gltf` (Blender-exported, CC0)

---

## ✅ Completed

### Project Setup
- [x] Initialized Next.js project
- [x] Installed `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`
- [x] Cleared default Next.js boilerplate, set up bare canvas page

### Scene
- [x] `<Canvas>` with sky, ambient + hemisphere + directional lights
- [x] Infinite flat ground (`Ground.tsx`) with `RigidBody type="fixed"` and friction
- [x] Physics world via `<Physics>` from Rapier

### Bike (`BMX.tsx` + `BikeModel.tsx`)
- [x] Loaded real GLTF bike model, generated typed component via `gltfjsx`
- [x] Bike orientated correctly (rotated `-90°` on Y to face forward)
- [x] WASD keyboard controls (`KeyboardControls` from Drei)
- [x] Arcade-style movement: impulse-based forward/backward, torque for turning
- [x] Collider locked on pitch/roll so bike stays upright
- [x] Wheel spin animation: front and back wheel groups rotate via `useFrame` proportional to speed
- [x] Bike sits on top of ground (not clipping through)
- [x] Third-person follow camera

---

## 🧪 In Progress / Known Issues
- [ ] Wheels may not perfectly align visually with tire geometry spin (rotation axis fine-tuning)
- [ ] No sound effects
- [ ] No jump mechanic
- [ ] Physics debug wireframes removed; may want toggle

---

## 💡 Ideas / Backlog
- [ ] Jump / trick system
- [ ] Ramps and terrain
- [ ] Opponent AIs
- [ ] Score / timer HUD
- [ ] Sound: engine hum, tire squeal
