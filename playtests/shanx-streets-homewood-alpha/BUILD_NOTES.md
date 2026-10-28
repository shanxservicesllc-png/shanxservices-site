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