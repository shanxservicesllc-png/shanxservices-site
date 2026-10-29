# X13 | SHANX STREETS | PLAYCANVAS VISUAL EDITOR MIGRATION GATE
Date: 2026-10-28 (Eastern)
Owner: X | ShanX Services LLC
Status: PARTIAL / EDITOR PROJECT NOT CREATED / DO NOT CLAIM EDITOR ACCEPTANCE
Original PlayCanvas browser test: /playtests/shanx-streets-playcanvas-alpha-20261028/
Live runtime source: /playtests/shanx-streets-playcanvas-alpha-20261028/game.js
Earlier working 3D car / entry / exit prototype: /playtests/shanx-streets-cars-first-recovery-20261028/
Separate older versions remain immutable. MONSTER Unreal worker remains untouched.

## Owner acceptance evidence
Source: owner's October 28, 2026 tablet recording (93.68 seconds, 1080x1728), provided in project chat.
- Imported detailed black car appearance: POSITIVE; preserve art-direction quality, avoid procedural block-car regression.
- Camera WIDE/AERIAL: POSITIVE, useful for judging block layout; must retain CHASE/WIDE/AERIAL and manual zoom.
- Road: partial improvement.
- Architecture: FAILED: low-detail repeated box buildings, smooth one-piece roof masses, no individually modeled stoops, detailed roof geometry, railings, facades, masonry details or credible Homewood streetscape.
- Civilian avatar: FAILED: gray/white small T-pose-like figure, not a believable rigged civilian resembling owner. No verified idle/walk/run animation.
- Joystick: FAILED: owner reports movement feels reversed.
- First frame / camera: FAILED: video starts in black or inside geometry for several seconds.
- Actual car handling / wheel or body orientation: needs verification; previous Three.js version had reported flip during steering. Do not presume this is resolved in PlayCanvas.
- No claim that this scene represents accurate Homewood parcel geography.

## Why the current browser test falls short (source evidence)
- Current game.js constructs houses by calls to box(), e.g. 'Brick walls' and 'Sloped roof ridge'; materials are simple color-based StandardMaterial.
- Current person uses runtime external GLB; placeGlb() normalizes height, but a proper animation state machine and fitted visual scale in viewport are not verified.
- Character asset may fall back to CesiumMan, explaining visible gray reference character.
- Camera exists entirely in script and isn't visually tuned with Editor inspection.
- No signed-in PlayCanvas Editor project exists that has been verified in this conversation.

## Required next foundation: actual PlayCanvas Visual Editor
Project label: SHANX STREETS | HOMEWOOD | EDITOR ALPHA (distinct from browser and Unreal work)
Project state: NOT CREATED until PlayCanvas session + Editor readback proves it.
Project must use PlayCanvas Editor 2.35+, Engine v2, ESM scripts, imported GLB models/templates, version control checkpoints, and Editor Launch verification.
Reference manuals:
- https://developer.playcanvas.com/user-manual/editor/
- https://developer.playcanvas.com/user-manual/editor/mcp-server/
- https://developer.playcanvas.com/user-manual/editor/assets/importing/
- https://developer.playcanvas.com/user-manual/editor/scripting/managing-scripts/
- https://blog.playcanvas.com/new-in-playcanvas-editor-projects-home-and-mcp/

### Suggested Editor entity hierarchy (NOT YET CREATED)
Scene: Homewood_VisualQA_01
  Lighting_Environment
    Sun
    Ambient_Sky
    Fog_Exposure
  Cameras
    Chase_Camera
    Wide_Inspection_Camera
    Aerial_Inspection_Camera
  Roads
    Homewood_Street_Base
    Intersections
    Curbs
    Sidewalks
    Crosswalks
  Block_One
    Lot_01_Porch_House
    Lot_02_Brick_Rowhouse
    Lot_03_Duplex
    Lot_04_Storefront
    Fences_Railings_Stairs_Doorframes
    Trees_UtilityPoles_Signs
  Characters
    Player_1_78m_Adult_Civilian_Rigged
    Idle_Walk_Run_Animations
  Vehicles
    Player_Driveable_Car
    Body
    Steerable_Wheels
    NonSteerable_Wheels
    Collision_Body
  Scripts
    Joystick_Input
    ThirdPerson_Camera
    Player_Controller
    Vehicle_Controller
    World_Streaming
    Diagnostics
  QA_Annotations

## Proof Before Next: bounded acceptance gates
G1 Editor authentication and access: signed-in project created/opened, its Editor scene and asset list read back. **UNVERIFIED**.
G2 Geometry/art baseline: replace repeated block housing with at least two *distinct* modeled residential facades (pitched-roof geometry, porch columns, railings, stoops, doors, window recesses and masonry PBR). Screenshot in Editor viewport from pedestrian height and aerial view. **UNVERIFIED**.
G3 Character: imported humanoid adult GLB with verified skeleton + idle/walk/run clips, visual height 1.7–1.9m against 2m prop and vehicle roof. Frame screenshot. No soldier or T pose. **UNVERIFIED**.
G4 Controls: joystick physical UP means walking toward visible camera-forward road horizon; directional and speed test; no reversed screen direction. **UNVERIFIED**.
G5 Camera: third-person, wide, aerial, zoom in/out; prevent camera starting inside walls and geometry; no occluding black polygon at startup. **UNVERIFIED**.
G6 Vehicle: preserve detailed asset; enter, drive, exit, brake; check wheel axle orientation / spin independently from chassis; screenshot during a left/right turn. **UNVERIFIED**.
G7 Runtime: Editor Launch viewport screenshot + browser log + PlayCanvas device input test, plus owner tablet evidence. **UNVERIFIED**.
Do not advance beyond each gate before recording its evidence. A source commit, editor asset list, or engine launch alone is not a visual-quality acceptance.

## Execution constraints
- Never overwrite prior playable GitHub paths or the existing Unreal / HasTwoStreets MONSTER work.
- No MONSTER GPU or direct access without separate owner authorization. The owner did not authorize interrupting active Unreal worker.
- Connected GitHub content is available. PlayCanvas Editor account/session and MCP client are not connected to this ChatGPT chat.
- PlayCanvas Editor MCP requires a local MCP client server, then signed-in Editor session connecting to the server. No PlayCanvas plugin is currently installed for ChatGPT in this session.
- A separate Work mode signed-in browser session may be used to operate the web Editor. Do not claim Editor changes until the session or connection actually exists.

## Four R's
Research: identify camera, character, building and controller failure modes from video and source.
Retain: preserve the detailed car and all known working camera modes, joystick baseline and older versions.
Refine: use visual editor to correct scale, materials, lighting and geometry with reference screenshots and live edit.
Reuse: share verified editor scenes, model prefabs, input controllers and material standards for **future** separate game projects; do not reuse prohibited ShanX Streets contest assets in Slap Jam.
