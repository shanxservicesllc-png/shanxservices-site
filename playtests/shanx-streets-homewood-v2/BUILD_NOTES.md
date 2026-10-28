# ShanX Streets | Homewood Living Block V2
Date: October 27, 2026 | Owner: X, ShanX Services LLC

## Scope
Separate unlisted browser-world visual test under `/playtests/shanx-streets-homewood-v2/`. The v1 Homewood controls experiment and the main Unreal ShanX Streets game remain untouched. The existing Arcade index remains untouched. This is **not** the final game, approved art direction, a mission system, or a claimed GTA San Andreas-equivalent visual build.

## Implemented in V2
- 12 articulated procedural NPCs across walking, waiting, socializing, shopping, sitting or idling roles, plus a small group of animated street-gathering participants (manually previewed; periodic appearance).
- 4 circulating vehicles in addition to existing parked and player-drivable cars.
- Original canvas-generated brick and asphalt textures applied to existing environment; storefront signage, market/cafe awnings, directional sunlight with shadow maps, capped rendering pixel ratio.
- Removed old 5-point collectible-dot mission geometry from this test. Displays ambient-world status instead of fake quests.
- Optional original synthesized audio, muted by default and activated by a button; no sound samples, soundtrack extraction or auto-playing copyrighted audio.
- Existing touch joystick, camera orbit, walk/drive, minimap, and email-draft feedback remain.
- Source assets in this HTML were created procedurally. The only external browser script is the public MIT-licensed Three.js r128 library via cdnjs; no Rockstar models, music, images or code imported.

## Evidence
- GitHub default branch source written and read back via owner connection `shanxservicesllc-png`.
- JavaScript compilation/syntax check passed and feedback/control feature markers checked.
- The user-facing website URL could not be loaded from the assistant's public web reader. Actual gameplay behavior, mobile framerate, responsiveness, lighting and visuals require live-device confirmation. **Do not call those verified.**

## Quality limitations and next acceptance gate
The visual baseline still uses procedural primitive figures and building block geometry. This is an **ambient-behavior proof** and interim environment step, not a professional game character/art pass. Continue toward an original, licensed rigged glTF human with idle/walk/run states, detailed modelled car, higher-quality individual building meshes and physically based textures, smoother terrain and neighborhood-specific reference, pedestrian collision and traffic rules. Measure render performance (FPS) and QA on the user's tablet. Neither current names nor street alignments are surveyed maps.

Only after the visual gate is approved, collect community ideas for meaningful neighborhood mission narratives. Avoid inferring real criminal behavior from real Homewood residents; all characters and incidents fictional.

## V2.1 collision correction | October 27, 2026
User's live-tablet feedback: V2 is smoother, but cars visibly pass through cars and people; overall art still below the original GTA: San Andreas baseline. **This feedback overrides any earlier implication that V2 is visually complete.**

Source changes:
- Added bounded 2D proximity checks and swept movement sampling to the drivable car and AI traffic: stop for other vehicle bodies, pedestrians and existing building obstacles.
- Added pedestrian yielding when a parked or moving vehicle occupies a walking route; stopped pedestrians no longer cycle walking legs as if moving.
- Walking player cannot pass directly through parked/driven cars. Cars stop for the on-foot player.
- Changed one original stationary car's position because it overlapped a seated resident at startup.
- On vehicle exit, choose a nearby non-overlapping location or keep player in the car if neither side is clear.
- Expose `collisionStats` and version 2.1 via `window.__SXS_STREETS_QA__.state()`.

Evidence: committed GitHub code, independent JavaScript parsing checks, unit tests for close-vehicle, close-person, open-route and swept-contact cases, and a subsequent GitHub readback of all collision paths. **Actual touchscreen/browser collision behavior is not yet independently verified.** This is a geometric blocker/stop system, **not** true rigid-body car physics, pedestrian avoidance navigation, or a fix for all corner cases. It does **not** improve character or vehicle asset realism.

Next: collect real-device collision and FPS observations, then focus on rigged textured people, proper vehicle meshes and geometry, PBR surface details, and a visually credible Homewood block before mission design. Do not claim San Andreas minimum met.
