# ShanX Streets | Independent Homewood Browser Rebuild | 2026-10-28

**Owner:** X · ShanX Services LLC  
**Scope:** Standalone original browser-game source. Independent of the rejected Homewood V1/V2 and other MONSTER bridge experiments; no source files from those projects imported. Unreal ShanX Streets and Speed and Swing remain untouched.

## Delivered in this build
- An unlisted web page at `/playtests/shanx-streets-rebuild-20261028/`, not linked from the Arcade home page.
- Three.js r170 (MIT) with standard physically-based rendering, directional and ambient lighting, soft shadows, fog, procedurally authored masonry/asphalt/stone textures.
- A skin-aware Three.js GLTF character importer, idle/walk/run clips and multiple animated background pedestrians.
- A separate glTF vehicle importer with distinct wheel meshes, road traffic and a car the player can enter/exit and drive.
- A new original 3D residential/commercial streetscape inspired by Homewood's road names, with houses, stoops, shopfronts, roofs, windows, road markings, sidewalks, trees, lamps, signs and street props.
- Third-person movable camera plus close view, left virtual joystick, drive/run controls, keyboard input, camera obstructions, bounding-volume collision tests, mini-map, and email-draft tester feedback.

## Live runtime model dependencies
The source imports demonstration assets hosted by the Three.js example site, with jsDelivr fallback:
- `https://threejs.org/examples/models/gltf/Soldier.glb`
- `https://threejs.org/examples/models/gltf/ferrari.glb`
- Fallback `https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/Soldier.glb`
- Fallback `https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/ferrari.glb`

These are **temporary development/reference assets**, not final original ShanX characters or branded commercial-ready vehicles. The demonstration car may show an existing brand shape. Before selling/distributing a compiled game, independently verify each model's asset license and replace temporary examples with original/licensed CC0-equivalent production assets. A publicly accessible example asset is not automatically CC0. No Rockstar graphics, code, sounds or maps were imported.

The browser must reach the 3D engine CDN and model hosts. When assets cannot load, the game shows an explicit error instead of substituting balloon-like fake characters.

## Geographic limitations
Current buildings and streets are a fictional scene, not the true Homewood street network. Actual roads and parcel placement require properly attributed or separately licensed city GIS/OpenStreetMap data. No Street View imagery was copied.

## Proof before done
- GitHub create/update source commits returned success and source readback was performed.
- JavaScript parsing passed with ES imports removed for a source check.
- Function presence and new-path separation were verified.
- **Not independently verified:** browser loading on shanxservices.com, actual model CORS response in phone browser, avatar placement, FPS, touchscreen controls, collisions, camera clearance, visual adequacy versus original GTA: San Andreas.
- No claims that source syntax equals live acceptance.

## Exit criteria for next release
Get screenshot and test results on an actual phone/tablet. Replace temporary imported soldier and sports car with realistic civilian character and original sedan assets. Compare the visible scene to original San Andreas, update architecture and shading, improve world collision and car handling, and expand to GIS-grounded Homewood only after first believable street passes X's visual acceptance. Do not develop invented missions before visual acceptance.

## Phone test findings and targeted V1.1 repair (2026-10-28)
Owner recorded a ~31-second portrait-phone session and reported that the streets and cars **look significantly better**, but the player character was not visible, multiple vehicles looked like they drove backward, traffic stopped at crossing areas, and dark geometry flickered across the scene. The current fictional street arrangement was also judged geographically unlike Homewood Avenue, resembling Hamilton Avenue more. **No claim of completed graphics or gameplay acceptance.**

Source changes in `game.js`:
- Removed an unnecessary 180-degree visual yaw on the imported Ferrari. AI cars now have fixed positive/negative travel lanes with their render yaw aligned to motion, without reversing in response to contact.
- Moved the player and drivable car starting positions to improve visibility and approach distance.
- Lowered chase-camera height/pitch, disabled skinned-mesh frustum culling, and added building-volume checks to stop camera transitions into walls and roofs.
- Replaced intersecting full-length road/sidewalk strips with roadway segments and curb breaks at both east/west crossings, preventing coplanar asphalt and sidewalk slabs over open cross streets.
- Kept the existing visual assets, models, texture and lighting foundation unchanged. No new game was created.

Evidence: owner video was inspected in this chat but not uploaded to GitHub. Code changes were committed, independently read back, JavaScript syntax and expected-source-marker checks passed. **Not yet verified** on device: visual character actually appearing, road/traffic corrections, all collision behavior, flicker elimination, and FPS.

**NEXT separate geography stage:** obtain genuine Homewood 15208 road centerlines and intersection geometry from Pittsburgh GIS or OSM with provenance; compare to Google Maps/Street View as visual reference only, not an extractable texture/asset source. Rebuild street width, orientation, intersections and parcel placement. Do not call the current fictional block geographically faithful.
