# ShanX Streets 3D | Visual-first rebuild direction
Owner: X | ShanX Services LLC
Date: 2026-10-27
Scope: NEW browser-based Homewood, Pittsburgh 15208 micro-open-world game. Separate from the Unreal ShanX Streets project.

## Owner correction: prioritize visual quality before missions
The existing `playtests/shanx-streets-homewood-alpha/index.html` is an experimental walking/driving control demonstrator. It is **not** an acceptable game prototype or approved art direction. Its glowing marker/dot hunt is **not** the requested mission design. Preserve the experiment unchanged as a reference, but **do not turn the dot hunt into the mission system**. Rebuild foundations rather than repeatedly decorating basic cuboids.

**Visual gate first** (the original 2004 GTA: San Andreas is an approximate minimum quality reference, not material to clone):
- One recognizable, original Homewood-inspired block whose geometry and style are grounded in reusable street and map data and original/cleared visual reference.
- Original proportionate **rigged 3D human character** with face, hair, clothes, fingers/shoes, smooth shaded textured mesh and working idle/walk/run transitions.
- Detailed original drivable car with true wheels, body, windows and vehicle animations.
- Buildings with distinct stoops, porches, brick/stone textures, storefronts, road marks and realistic neighborhood details; no bare mass-copied boxes as the final look.
- Smooth normals + PBR materials, AO/shadow techniques appropriate to mobile WebGL, original/licensed texture maps and optional generated original glTF assets. Use LoD/instancing and a measured frame-rate/memory budget.
- Camera follows, rotates and handles obstructions; touch gamepad works on mobile/tablet. Measure performance in a **real browser**, not just parse checks.
- Start with a polished playable **one-block vertical slice**: walking, car entry/exit and driving. Build outward only after owner sees appropriate quality.

## Missions and story are DEFERRED until owner approves visual direction
After visuals and foundational mechanics are convincingly improved, invite community/tester feedback to design meaningful missions. Owner's brainstorming **possibilities only** include taxi jobs, neighborhood hustles, adult relationships/dating, police pursuits and hiding, kidnappings as fictional crime narrative, shootouts, bar fights, and other open-world activities. **None are approved missions** and no scripted scenario, characters, objectives, rewards or dialog are locked. Community ideas are to be gathered **after** the visual gate. Do not impose a toy-style collectible dot quest as a placeholder for the requested mature game.

Homewood deserves everyday life and variety in the portrayal: residents, shops, families, conversations, local businesses, culture, city atmosphere, and fictional story conflicts. Do not claim that particular crimes or fictional events occur at real named addresses or characterize real people. Use original characters, fictional businesses when needed and responsibly licensed geography/assets.

## Source research, not distribution
User supplied Open Source Game Clones, SanAndreasUnity and Grit as **engineering study references**, not assets or code to copy, redistribute, or reskin. Study how camera, animation, vehicle physics, draw-distance/streaming, and open-world interaction systems are structured; independently implement ShanX Streets in a browser-oriented architecture. Do not interrupt or modify the main Unreal project or MONSTER.

## Evidence and next gate
- Current `index.html` proof remains unchanged and unlisted.
- This document records direction, not a completed visual rebuild.
- Next acceptance: demonstration of original **textured rigged playable character, detailed vehicle, and distinctive Homewood-inspired block** at readable quality on user's tablet, with performance evidence, before any mission programming or tester call.
- Report DONE/PARTIAL/BLOCKED/NEXT with proof. No claim of GTA SA-level graphics until a real device comparison confirms it.
