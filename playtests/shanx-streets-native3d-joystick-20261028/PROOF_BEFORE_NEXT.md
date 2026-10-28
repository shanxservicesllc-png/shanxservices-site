# ShanX Streets: Homewood | Native Three.js 3D + Joystick Review
Date: 2026-10-28 | Owner: X / SXS Interactive / ShanX Services LLC
Status: SOURCE AND SIMULATED INPUT CHECKS PASSED; LIVE WEBGL/ANDROID ACCEPTANCE NOT VERIFIED.

## Owner's correction
Previous map-based walking version used magnified raster aerial map tiles, making terrain blurry and failing to show a true 3D street world. Four directional D-pad buttons were also explicitly rejected. A new path was required, preserving prior approved versions untouched.

## What was created
- index.html and world.js in isolated playtests/shanx-streets-native3d-joystick-20261028.
- Game mode uses its own WebGLRenderer, PerspectiveCamera and actual scene mesh geometry. This is NOT a zoomed MapLibre aerial photograph.
- Real mapped OpenStreetMap vector tile transport lines and building polygons are converted into Three.js road meshes and building geometry; approximate pitched roofs, brick/siding materials, windows, doors, porches, sidewalks, street trees, lighting and scene fog. Actual address-by-address facades have NOT been verified.
- 360-degree analog touch joystick with continuous direction and variable speed, a separate Run button, drag-to-look and camera distance buttons; no on-screen D-pad.
- Original Three.js Soldier.glb reference skin mesh and Idle/Walk/Run animation clip loader. This is still a licensed-asset placeholder requiring a production character.
- Aerial Overview is an independent optional map view with real imagery and attribution. It is not used as the game ground closeup.
- World loading uses bounded local batches of nearby roads/houses and triggers new OSM vector tile queries as player moves further into Homewood. Geometry depends on third-party source availability and must be tested on owner device.
- Original Unreal HasTwoStreets and all earlier HTML builds were not modified.

## Proof completed
1. GitHub create/readback: both files verified in correct new path with stable content hashes.
2. JavaScript parser: world.js passed after removing static import declarations for syntax-only check.
3. Source checks: PerspectiveCamera, 3D mesh street road, roof/house generator, native WebGL, geographic source-layer queries and streaming code verified present.
4. UI DOM: analog joystick present, no D-pad element, Aerial toggle retained.
5. Simulated exact thumb() input: center = zero; up = (0,-1); right = (1,0); diagonal normalized; pointer outside radius clamped to max magnitude 1.
6. Road quad winding and UV correction made after detecting possible invisible road mesh / undefined texture coordinates.
7. Streaming correction after detecting terrain rebuild was unintentionally preventing map tile recentering; now uses a separate lastTileCenter.

## Open / blocked acceptance
- Actual website deployment reachability could not be verified by public browsing tool; GitHub readback confirms source only.
- Real Android WebGL render, model visibility, animation playback, correct geometry and full joystick gesture handling remain UNVERIFIED.
- Mapped roads/buildings depend on OpenFreeMap vector tiles. When unavailable, an explicit UI error should appear rather than making up a fake accurate neighborhood.
- Performance/FPS, phone heating and multi-block traversal not verified.
- Final character/NPCs/vehicle physics and missions not implemented.
- OSM roads/footprints and approximate procedural facades are not photorealistic surveyed 3D houses or an actual Google Street View engine.
- The research stability streak is 0/13 after new material discoveries. Thirteen distinct research topics ≠ thirteen stable passes. A real-phone demo is a separate must-pass gate.

## Next
Review on owner's Android device. Specifically verify: analog joystick moves freely, full-size animated character, actually modeled streets/houses, perspective camera height/distance, street traversal, map availability, FPS and visibility. If that gate fails, inspect screenshot/video and debug the exact defect. Do not replace the approved earlier versions or touch Unreal.