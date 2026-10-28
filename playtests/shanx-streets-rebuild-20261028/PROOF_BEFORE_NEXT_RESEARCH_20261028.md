# ShanX Streets | Proof Before Next | Research checkpoint 2026-10-28

Owner: X | ShanX Services LLC
Scope: RESEARCH ONLY. The existing playable game's `game.js` and `index.html` are not changed by this checkpoint.

## Canonical stopping rule
Research adaptively with independent, differentiated review angles. Maintain a source/evidence ledger. Every material new finding, contradiction, new defect, or required correction resets the stability streak to ZERO. **Advance only after 13 consecutive differentiated passes on an unchanged and properly verified stage show no material new finding, contradiction, defect, or required change, and after the stage acceptance gate passes.** A repeated query is not an independent pass. 13^13 literal iterations are NOT required. Research stability is not evidence of runtime/game functionality.

## Current status
Discovery investigations: 13 differentiated avenues recorded below; several yielded material findings or unresolved defects. Current stable streak: **0 / 13**. Stage acceptance: FAIL / NOT VERIFIED. This is not an approved rebuild and no game patch has been made in this checkpoint.

### Evidence provenance
- Owner's latest phone recording `17950.mp4` duration about 34.81 s, resolution 1728x1080, H.264; local SHA-256 `cd16e5718f3847047f32afe853e8c00184b61f1677e9fcdad69e1e5a9f02a1e8`. Inspected screenshots from `shanx_last_review/contact.jpg` and `f13.jpg` and `f33.jpg`. Observed an opaque black angular shape occluding upper screen, no visible player figure, visible imported cars near roads, interface available. Cannot identify exact offending mesh by image alone. Owner reports car still driving backward, steering-wheel rotation and stuck interaction.
- Current website source: `playtests/shanx-streets-rebuild-20261028/game.js` on owner GitHub `shanxservicesllc-png/shanxservices-site`; read and compared logic. Last prior patch uses `modelForward` detection, `cameraStep` AABB checks, and on-foot car collision escape. Source checks do not establish real rendered behavior.
- Original GTA: San Andreas (2004/2005), *not* Definitive Edition or modded 4K graphics, is the reference. Video discovery: https://www.youtube.com/watch?v=oKdWB_Z6kxc and original historical records: https://www.gtasanandreas.net/news/single.php?id=1348 . YouTube video metadata and descriptions retrieved; direct complete playback of reference video was not independently performed.
- Official Three.js Soldier reference: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_animation_skinning_blending.html ; official Ferrari: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_car.html .
- Official engine references: https://threejs.org/docs/pages/SkinnedMesh.html ; https://threejs.org/docs/pages/AnimationAction.html ; https://threejs.org/manual/pages/shadows.html ; https://threejs.org/docs/pages/GLTFLoader .
- SA road routing data: https://open.mp/docs/scripting/resources/path-nodes ; handling: https://www.grandtheftwiki.com/Handling.cfg ; original architectural study: https://github.com/in0finite/SanAndreasUnity ; city streets: https://services1.arcgis.com/YZCmUqbcsUpOKfj7/ArcGIS/rest/services/PavementPublic/FeatureServer .

## Discovery-pass ledger (NOT a 13-stable-pass certificate)
| Review | Independent approach / source | Finding | Evidence status | Stability count |
|---|---|---|---|---|
| 01 | Owner's new phone recording | Large moving black/brown polygon blocks view; player never apparent | VISUALLY CONFIRMED, cause unknown | 0 |
| 02 | Owner's earlier phone recording | Same family of occlusion artifacts; improved model visual detail nevertheless real | VISUALLY CONFIRMED | 0 |
| 03 | Live-game camera source compared with captures | AABB-based camera obstacle checks cannot identify mesh owner and may miss roofs/model interiors; logging target mesh and ray hits is needed | CODE VERIFIED; causal attribution unverified | 0 |
| 04 | Three.js SkinnedMesh official docs | Rig visibility requires independent per-mesh position, skeleton/bind, bounds, render state and pixels-in-frame test; a loaded GLB or `root.visible` is insufficient | ENGINE VERIFIED; culprit unknown | 0 |
| 05 | Three.js official Soldier example | Correct idle/run/walk clips and mixer update must be compared; use isolated avatar visibility test before integrating into world | SOURCE VERIFIED | 0 |
| 06 | Three.js official Ferrari model example vs code | Game uses `/wheel/i` to rotate all matching descendants; example names only four tires (`wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`). Broad match risks spinning steering wheel and other parts | SOURCE VERIFIED; specific steering-wheel node still to inspect | 0 |
| 07 | Car model forward-axis and vehicle state code | Model orientation and physics direction are separate: measure nose/front vs rear in model space, then verify motion and visual facing in device render, not by guessing 0/180-degree rotation | CODE VERIFIED; device result unverified | 0 |
| 08 | SA handling model reference | Distinct braking, steering lock, inertia, traction and suspension matter; current simplistic vector velocity/steer cannot replicate SA handling yet | ARCHITECTURE VERIFIED | 0 |
| 09 | SA path nodes documentation | SA vehicles/peds navigate connected node networks; current straight-line loops are insufficient and create dead ends around junctions | ARCHITECTURE VERIFIED | 0 |
| 10 | MDN collision volumes vs existing game's source | Existing building AABBs, car point distances and walkers lack a shared collision/navigation planner. Must ensure player cannot be locked at start or when a car stops nearby | CODE VERIFIED; runtime failure reported | 0 |
| 11 | Three.js shadows and z-fighting docs vs video | Opaque black sky-filling shapes are NOT proven to be shadow acne; possible camera-inside-mesh or wrong geometry must be identified by individual render-layer toggles. Do not falsely label as a shader bug | HYPOTHESES SPLIT; cause unknown | 0 |
| 12 | Pittsburgh official GIS street centerlines | Real Homewood street layout can be built from public centerline geometry rather than guessed road crossing positions; owner says displayed Homewood Ave looks like Hamilton | SOURCE VERIFIED; city alignment unimplemented | 0 |
| 13 | Original gameplay footage references and existing test coverage | San Andreas acceptance must verify readable on-foot player, clear chase camera, natural traffic lanes and interactions. Existing JavaScript parse tests are NOT render/gameplay proof | BENCHMARK ESTABLISHED; runtime acceptance FAIL | 0 |

## Hard quality gate before any next gameplay release
1. **Visual forensic isolation:** render only ground, only character, only car, only buildings; toggle shader shadows; capture GPU screenshots identifying the black occluder by object name/material, not guess.
2. **Player visibility:** known skinned character bounding box in front of camera, persistent visible silhouette on walking screen and 10s locomotion, proper bone animation with proof screenshot/video. If absent, fail.
3. **Car detail:** rotate ONLY the four physical road wheels, verify interior steering wheel does not spin around its horizontal axle, verify nose matches direction, steering/reverse and brake states with visual evidence.
4. **Collision/intersections:** drive both directions through road crossings, avoid stopped car/ped, free blocked player and camera, no ghosting, no deadlock.
5. **Neighborhood:** validate road GIS alignment after gameplay visibility fixed; preserve camera drag-anywhere and current better textured/meshed visual direction.
6. **Phone acceptance:** actual Android Chrome recording with readable avatar, no black occlusion, traffic in correct direction, no stationary lock, FPS and clear controls.
7. **Convergence:** only THEN perform differentiated proof reviews; reset stability streak whenever material new findings arise, require 13 in a row. No fake 13-pass tally.

## Blockers
- No real-device render-level object IDs or WebGL capture currently exists. Uploaded recordings show the effect but not the precise scene object.
- Original GTA reference video streams were located; do not claim we watched complete playbacks. Use video reference as benchmark where verified and source-code/docs as engineering evidence.
- The existing game *still* has user-confirmed defects. Not approved. No changes to Unreal, MONSTER, Speed and Swing or the published game's code for this research checkpoint.
