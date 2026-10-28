# ShanX Streets 3D | Homewood-Inspired Browser Alpha

Owner: X | ShanX Services LLC
Scope: Separate static browser-game micro-world. Not the main Unreal ShanX Streets project.
Access: Unlisted public GitHub Pages URL for invited testers. No paywall, password, or private access claim.

## Build v0.1 | Implemented 2026-10-27
- Scene: Original fictionalized Homewood-inspired street grid, public road-name labels, business frontages, residential rowhomes/porches, streetlights, trees, sidewalks, crosswalks.
- Uses Three.js WebGL (CDN pinned to r128); smooth geometry and PBR-ish MeshStandardMaterial for characters/car details. Device performance needs live QA.
- Playable: walk, drive blue coupe, keyboard and touch controls, orbit camera, reset, mini-map, five collectible tour corners.
- Feedback: email draft with tester nickname and comments (not a website backend).
- Separate from existing /arcade/ listings. No changes to MONSTER or Unreal project.
- Gameplay location layout is **not** georeferenced or a one-to-one model. Street labels are geographic references, not claims about geometry or legal addresses.
- Public game page is intentionally noindex, but this is not real access control. Do not claim secrecy or charge testers.

## Legal source boundary
Google Maps/Street View: use as a separate visual research/viewing tool, not as an asset-scraping or 3D geometry extraction source. No Google image pixels or screenshots have been embedded in this game. See https://about.google/brand-resource-center/products-and-services/geo-guidelines/ and https://www.google.com/help/terms_maps/

Open reference sources:
- Homewood Mobility Plan: https://engage.pittsburghpa.gov/Homewood-mobility-plan
- Pittsburgh Streets Centerline FeatureServer: https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PavementPublic/FeatureServer
- Pittsburgh GIS: https://www.pittsburghpa.gov/Business-Development/Geographic-Information-Systems-Mapping-Open-Data
- OpenStreetMap ODbL and attribution: https://www.openstreetmap.org/copyright

## Street research sequence | Next stages
1. Validate map geometry from lawful geographic datasets, not visual tracing of Google Maps. Confirm real road alignment and walking/driving scale from GIS source and provenance, replacing current **artistic prototype layout**.
2. Compare local houses, porches, shopfronts, sidewalks, street furniture and terrain using permitted photos and City of Pittsburgh planning resources. Create distinct original assets, not copies of Google photographs.
3. Improve body and car animation with rigged glTF meshes, shared vertex normals, PBR materials, roughness/normal-map textures, LOD and draw call budgets. ComfyUI may help create owned textures and concept art, but is not itself a real-time renderer.
4. Improve driving: acceleration, reverse, handbrake, steering, vehicle-camera collision, traffic and pedestrian simulation, safe checkpoints. No copy of proprietary game assets.
5. Tester acceptance: mobile touch movement/camera, walking collision, car enter/exit/steering, no blank display, feedback draft, 5-corner mission, loading behavior and stable frame rate on low-power devices.
6. Paid release: decide Android wrapper/PWA/download, license/asset provenance, user support, account/payment integration and proper access control. A public URL alone cannot enforce a $0.99 paywall.

## Version control / evidence
The game file is `index.html`, which has QA state `window.__SXS_STREETS_QA__.state()`. Actual live browser QA has **not** been independently verified by the assistant. Avoid calling any end-to-end device test DONE without evidence.
## Source research checkpoint | San Andreas clone engines | 2026-10-27
- Discovery page: https://osgameclones.com/grand-theft-auto-san-andreas/
- SanAndreasUnity: https://github.com/in0finite/SanAndreasUnity (MIT; Unity C#; source is a real playable engine reimplementation, not a JavaScript/WebGL browser engine). Its README expressly requires a user's owned GTA installation and requests the original installation path. Use for architectural study of movement, world streaming, vehicles, gameplay and modular code, not Rockstar assets.
- Grit Engine: https://github.com/grit-engine/grit-engine (MIT; C++/Lua; native engine plus separate media tree and GTA:SA asset extraction tools). Requires an older native toolchain; use as architectural reference, not as our HTML engine or GTA asset source.
- Earlier user links: https://github.com/himanshu007-creator/GTA-SA and https://github.com/J33sus/GTA-SA-Menu are HTML menu/presentation projects, **not playable 3D game engines**. Second project explicitly states that it uses extracted game resources, which are unsuitable for commercial reuse without appropriate rights.
- Browser implementation decision: original ShanX Streets browser runtime continues on licensed Three.js/WebGL, with own/independently licensed glTF 3D models, skeleton animations, texture maps, PBR materials, spatial streaming and LOD, city/traffic/driving systems, camera occlusion, mobile performance optimization. Preserve original prototype as a mechanics test bed while developing a distinct visual-architecture upgrade.
- Licensing boundary: MIT source-code licenses do not confer ownership or redistributable licenses for GTA graphics/audio/models/map data. Verify *each asset's* license, provenance, restrictions and commercial permissions. Any retained MIT source requires license/copyright attribution. Do not import third-party game assets. An unlisted webpage is not private security or a paywall.
- Proof Before Next milestone: build a single detailed original Homewood-inspired storefront block with a textured, properly rigged playable human and a detailed vehicle, then compare to the original 2004 GTA San Andreas baseline on a mobile browser. Measure FPS/triangle budgets and verify touches, collisions and camera before scaling to the full neighborhood.

## Source-code study | Engineering patterns, not redistribution | October 27, 2026
**Owner intent:** study GTA-related open-source projects as technical references only. Do not redistribute, port, package, or copy their game assets or code into ShanX Streets. Design independently from engineering principles. Avoid unsolicited legal/distribution digressions.

Actual SanAndreasUnity source files reviewed (read-only):
- `Assets/Scripts/Behaviours/Vehicles/Vehicle_Physics.cs`: `VehicleInput` separates accelerator, steering, handbrake and clamping. Engine physics uses Rigidbody/WheelCollider, drive/brake torque and suspension. ShanX browser version should independently implement input validation, acceleration/braking, wheel states, traction, turning and suspension with a suitable browser physics engine or bounded equivalent.
- `Assets/Scripts/Behaviours/Vehicles/VehicleController.cs`: separates vehicle controller, driver seat state and vehicle-synchronization data from physics. Browser architecture: vehicle controls/state/physics/rendering independent; multiplayer synchronization only if needed later.
- `Assets/Scripts/Behaviours/PedModel.cs`: character model tracks animation IDs, animation states, run/walk loading and root-frame state. Browser architecture: original humanoid rigged glTF with walk/run/idle/enter-car animation clips, state machine and blending rather than ad-hoc bobbing primitive meshes.
- `Docs/AddingNewAnims.md`: animation groups share abstract action categories (e.g. Walk) across distinct pedestrian types. Browser architecture: character-animation interface separates actions from the source clip; reuses original licensed animations across multiple characters.

**Proof-before-next acceptance:** one original Homewood-inspired detailed block with a rigged walking/running/entering-car character and modeled car exhibiting throttle, brake, steering, suspension, and camera collision handling, while sustaining measurable mobile FPS. Do not claim this is implemented yet. Preserve the existing prototype as a reference; no MONSTER/Unreal changes.
