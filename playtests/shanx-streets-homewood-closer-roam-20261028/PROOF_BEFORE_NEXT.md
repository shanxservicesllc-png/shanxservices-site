# ShanX Streets | Close camera and longer roaming | October 28, 2026
Owner: X | SXS Interactive | Browser edition

## Owner's phone feedback driving this revision
- Google real Street View button correctly opened Google Maps; preserve it.
- Walking avatar looked too small/far and walking seemed confined to a little section.
- Owner said the building/aerial visuals are improving but third-person view and travel still need much more work.

## Root cause findings
1. Old map camera used fixed zoom 19.2, pitch 69 and an offset map center, not a camera placed immediately behind the avatar. Source: prior gameplay.js.
2. Old map-house geometry discarded buildings beyond 185m of initial coordinates. Source: prior architecture.js.
3. Old collision-polygons discarded all polygons beyond 250m from initial coordinates and relied partly on idle events for updates. Source: prior gameplay.js.
4. MapLibre's officially documented calculateCameraOptionsFromTo(from, altitudeFrom, to, altitudeTo) allows real physical third-person follow-camera positioning. https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/
5. MapLibre querySourceFeatures returns only currently loaded tiles, so dynamic collision refreshing is required while traveling. https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/

## Changes in isolated reviewed version
- Index starts in WALK/RUN instead of overhead aerial mode; Aerial and 3D Houses still selectable.
- Physical camera from about 2.65m behind character at 2.7m height looking near shoulder; default. +/- button adjusts distance from 1.55m to 6m; up/down drag adjusts height, left/right rotates.
- Walking speed ~3.5m/s; run ~6m/s. A distance-walked counter is exposed alongside approximate JS frame rate.
- Collision filter follows player position with 260m dynamic window and periodic bounded source-tile refresh rather than the static starting-area radius.
- Original houses are regenerated around current view point (200m radius), throttled movement events; bounded to 45 detailed structures for mobile.
- Existing skinned 3D avatar, roads, imagery, Google Maps external Street View button preserved; protected Unreal project unchanged.

## Evidence and bounded tests
- GitHub index/architecture/avatar/gameplay created under a fresh folder, all files read back and JavaScript syntax parsed PASS.
- Mock MapLibre controller with camera calculations and keyboard/run held for roughly 104 simulated seconds moved over 624 model meters and maintained a dynamic follow camera. Mock plus button decreased behind-character distance from 2.65m to 2m.
- Synthetic footprint test blocked forward movement at about 3.3m before a model building polygon and reported collision data loaded.
- Real map tiles, GLTF skinning appearance, mobile WebGL visuals, phone controls, real walking distance, and performance remain NOT independently verified.
- Public site reachability from testing environment is unavailable, so GitHub commit/readback is not proof that deployment propagated.

## Proof Before Next
- Owner phone visual/runtime review is the next acceptance gate. If distant/tiny or movement blocked in actual render, diagnose with exact measured camera options, distance counter, and tile data; keep stage OPEN.
- 13 separate previous research subjects are not 13 consecutive stable passes. Any material new correction resets count; currently 0/13 stable.
- This is an independent camera/streaming fix, NOT a completed open-world game or full game physics engine. Vehicles, NPCs and real missions remain pending.

## Safeguards
- Owner-approved architecture build remains available and unchanged.
- This revision is additive under a new path. Do not touch Unreal HasTwoStreets or unrelated projects.