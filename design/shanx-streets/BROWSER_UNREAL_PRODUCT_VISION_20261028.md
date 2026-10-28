# ShanX Streets | SXS Interactive | Two-Edition Release Strategy
Owner: X | ShanX Services LLC
Date: 2026-10-28
Status: Owner creative / product vision documented; implementation gates OPEN.

## Browser first, Unreal premium second
The owner specifically selects the **reverse of a conventional premium-first adaptation**. Release a credible modern HTML/browser open-world game first, then use its players, evidence and reusable original assets/learning to build demand for a more comprehensive, higher-cost Unreal edition. Reason: ShanX Streets does not yet have established market recognition; starting with full premium Unreal production increases cost and investment risk.

**Browser edition is a real game, not a cut-down technical mockup.** Third-person visible rigged characters, natural walking/running, free-look mobile camera, real physics/collisions, vehicle entry/exits, steering/doors/seats, civilian life, connected traffic, and optional modular missions are foundation-level requirements. Free roam must work without ever starting a mission.

**Unreal edition is a separately developed premium experience**, not a byte-for-byte port, using greater environmental density and polish, deeper mechanics, visuals and story, when commercially sensible. Existing HasTwoStreets UE 5.8 CitySample and H2StreetsGameplay original sources on MONSTER are protected and NOT to be modified merely because browser planning proceeds.

## Browser-world fidelity
- Base streets and blocks on independently verifiable Pittsburgh Homewood road topology (prefer licensed public centerlines), not a generic rectangular grid.
- Compare current and dated visual references for North/South/West Homewood, Homewood Ave, Hamilton Ave, Frankstown Ave and characteristic housing, commercial buildings, bars and motorcycle-club spaces. Public map/3D reference viewing is permitted as visual research; don't scrape imagery or reconstruct protected Google 3D directly.
- Bars should resemble neighborhood bars; clubhouses should resemble social clubs, motorcycles and parking/streets should be believable, not signage slapped onto repeated facades.
- Reusable original source assets, layout contracts and provenance must support later Unreal production without violating CitySample/third-party licenses.

## World stories and character principles
- Missions are entirely optional and independently addable after open-world engine foundations pass. Topic research can cover approximately the past 5–10 years of positive, negative and neutral public Homewood news, local commerce, celebrations, development and emergencies.
- Base NPC archetypes on authentic publicly documented *roles* and events. Do not lift recognizable private persons' faces or make unverified criminal claims merely because a photo appeared in news. Identifiable appearances require appropriate rights/review. Fictionalize sensitive incidents carefully.
- Preserve neutral free-roam experiences independent of storyline.

## Engineering strategy
- Start from proven contemporary browser game engine subsystems (character controller, animation graph, physics-driven vehicles, world streaming / LOD, traffic/navmesh, scene management) instead of iterating endlessly on the prior ad hoc single-file Three.js prototype.
- Make a reusable source of truth for authored 3D geometry, rigged animations and named controls, vehicle axle/wheel/steering/door/seat pivots, road graphs, NPC activities and missions. Engine-specific render/physics implementations remain distinct.
- Browser version's good visuals and functional core must be actually demonstrated on owner Android; syntax checks are not acceptance.
- Preserve existing modern-looking browser test as a **visual reference** without further bolting features onto its structurally inadequate foundation.
- Reuse the existing X13 Mission Generator as reference only after verifying the prototype and its integration schema; current sandbox says local command-line fictional template generator, not production-integrated.

## Proof Before Next
Check each bounded stage for actual artifacts, objective test evidence, and independent verification. New material findings reset the differentiated research stability counter; 13 stable passes required before treating a research stage as converged. Keep the owner briefed with a concise PRIORITY / DONE / BLOCKED / NEXT status. No misleading claims of a shipped game or geographically accurate map.

## Commercial rationale
1. Lower initial expense and establish player interest with playable browser delivery.
2. Learn from actual performance, player behavior and feedback.
3. Make a clear visual/content premium upgrade path to Unreal rather than duplicating everything manually.
4. Avoid committing to full Unreal production expenses without audience and product evidence.
5. Verify any projected cost savings later; browser-first can still be costly if chosen source/assets are not portable.

## State as of this memo
OWNER STRATEGY CAPTURED. No claims of a newly implemented browser game, true Google 3D model digitization, complete geodata import, or full owner acceptance. Existing Unreal project remains untouched.
