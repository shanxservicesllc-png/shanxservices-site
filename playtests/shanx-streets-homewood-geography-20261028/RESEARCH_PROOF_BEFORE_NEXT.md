# ShanX Streets | Homewood browser edition
Date: 2026-10-28
Owner: X | SXS Interactive / ShanX Services LLC

## Proof Before Next status
This record documents 13 **distinct research/engineering review angles**, NOT 13 consecutive unchanged convergence passes. The latter counter is **0/13** after material new findings. A code commit/readback is not a rendered phone acceptance test.

## 13 research angles
1. Unreal concept recovery: read-only MONSTER HasTwoStreets / H2StreetsGameplay / CitySample 5.8 handoff, native walking/vehicle/objective phases; preserved. This is an architectural reference, not exported Unreal source.
2. Modern browser engines: PlayCanvas and native scene/rigged animation capabilities. https://playcanvas.com/products/engine
3. Engine-provided character controller: PlayCanvas official third-person rigidbody controller with keyboard, mobile and collision avoidance; candidate for later real gameplay integration. https://github.com/playcanvas/engine/blob/main/scripts/esm/third-person-controller.mjs
4. Vehicle physics: PlayCanvas official Ammo.js raycast vehicle demo, mobile-capable, rather than coordinate-sliding car code. https://developer.playcanvas.com/tutorials/vehicle-physics/
5. Collision implementation: PlayCanvas Ammo.js/Bullet rigidbody integration is opt-in and requires runtime module loading; cannot claim collisions without running it. https://developer.playcanvas.com/user-manual/physics/
6. Historical emulation: experimental PS2 WebAssembly/browser systems establish the compute envelope but are not a game editor or source-port tool. https://github.com/jpd002/Play-
7. Later console research: RPCS3 native and experimental WebAssembly forks do not establish a tested Android browser release pipeline. https://rpcs3.net/
8. County roads: 2026 Allegheny County street centerlines available; use official road segmentation and georeferencing for long-term authored route graph. https://www.pasda.psu.edu/uci/DataSummary.aspx?dataset=1224
9. County building footprints: 2026 footprint layer available, though polygon height/roof geometry is incomplete; OSM extrusions are for recognition, not photorealistic building claims. https://pasda.psu.edu/uci/DataSummary.aspx?dataset=1195
10. City planning: Pittsburgh Homewood mobility/signal plan identifies real intersections on Frankstown, including Homewood Ave; use as contextual reference. https://engage.pittsburghpa.gov/index.php?cID=1404
11. Actual 3D map method: official MapLibre 3D building extrusion using vector tile geometry/height from OpenFreeMap; implemented for inspection. https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/
12. Actual street walking method: official MapLibre first-person eye-height camera over 3D footprints, keyboard/touch; adapted for Homewood geography proof. https://maplibre.org/maplibre-gl-js/docs/examples/walk-around-a-map-in-first-person/
13. Handset QA, IP and portable assets: verify load/fps/controls/buildings on owner's Android, no copy of proprietary Google 3D meshes or identifiable private likeness; separate browser gameplay engine and Unreal source asset contracts. Browser rendering on owner hardware is NOT yet verified.

## First bounded artifact
- Code: playtests/shanx-streets-homewood-geography-20261028/index.html
- Isolated and additive; does not modify rejected earlier playtests or existing Unreal game.
- Uses OSM/OpenFreeMap real map geometry and building footprints; optional 3D orbit survey and eye-height walking camera with touch/keyboard.
- Origin uses City of Pittsburgh's known coordinates for **7321 Frankstown Avenue** (40.4568844, -79.8929402), not an invented Homewood/Frankstown intersection coordinate.
- Walk camera has **no building collision, rigged character, animations, car controls, NPC AI or missions**. It MUST NOT be advertised as playable ShanX Streets production foundation.

## Technical checks achieved
- GitHub contents API create and independent readback completed.
- Readback contained 3D building fill-extrusion, MapLibre 6.16 library, walking camera via documented calculateCameraOptionsFromTo method, mobile pointer input, preview scope notes.
- Static HTML and JS syntax checks were performed for a separate larger local review draft, not claimed as test of the exact committed online file.
- Live website render + Android playability + geographical on-screen correctness are UNVERIFIED.

## Next bounded game engineering gate
1. Owner reviews geographic alignment on actual phone and marks building/street errors; compare source publicly available Google Street View **visually**, never download/copy copyrighted meshes.
2. Choose and integrate a proven third-person visible rigged pedestrian controller with actual physics, animations and wall camera collision as its own pass/fail gate.
3. Add full vehicle subsystem, named tires/doors/seats/rig + physical turning/braking with runtime footage, not patches onto previous toy controls.
4. Add licensed original building facade assets prioritized by surveyed street/lot source; then pedestrians, traffic and optional event-inspired fictional mission modules.
5. Produce shared neutral asset manifests and evidence to inform the protected Unreal HasTwoStreets premium edition.
6. 13-consecutive **stable** differentiated review passes begin only once the bounded research stage has no material new findings; reset on correction. Actual phone/runtime QA is independent.

## Interpretation
The current artifact is stage-one **geography and camera exploration**, NOT fulfillment of full open-world game requirements. Proof Before Next keeps that boundary clear.
