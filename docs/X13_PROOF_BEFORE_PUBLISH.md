# X13 Proof Before Publish (PBP)

Owner: X | ShanX Services LLC
Website: https://shanxservices.com/arcade/playtests/
Policy: PROOF BEFORE NEXT → PROOF BEFORE PUBLISH → PROOF BEFORE DONE.

## What PBP automates

Build on MONSTER → curated distributable files → SHA-256 manifest → real Chrome game QA → owner approval for this exact release → independent QA again → GitHub push → GitHub Pages → live website hash verification.

The game and website do not automatically update when a worker changes source code. That is intentional: an experimental build must not replace the public game. After approval, PBP performs the GitHub steps without requiring the owner to upload files manually. No persistent watcher or extra game server is created.

## Source mapping

- palmageddon: CONTESTS/SLAPJAM_3_PALMAGEDDON_V3_REAL_HUMANS_20261029 → arcade/games/palmageddon/
- panic-kitchen: CONTESTS/SLAPJAM_3_PANIC_KITCHEN_REBUILD_20261029 → arcade/games/panic-kitchen/

Only specifically allowlisted distributable files are copied. Personal files, development scripts, browser profiles, QA evidence, backups and secrets are not part of the public bundle.

## Operator commands (from the verified bridge_lab workspace)

1. PREPARE: python CONTESTS/SXS_GAME_PLAYTEST_HUB_20261029/site/scripts/x13_pbp.py prepare palmageddon
   For PANIC KITCHEN use prepare panic-kitchen. The command prints a release ID, after validating all files, SHA hashes, real touch gameplay and screen rotation in Chrome.

2. APPROVE: python CONTESTS/SXS_GAME_PLAYTEST_HUB_20261029/site/scripts/x13_pbp.py approve RELEASE_ID --phrase "APPROVE RELEASE_ID"
   Replace both occurrences with the exact printed release ID. Only use when the owner actually accepts that specific build.

3. PUBLISH: python CONTESTS/SXS_GAME_PLAYTEST_HUB_20261029/site/scripts/x13_pbp.py publish RELEASE_ID
   Reruns QA, checks release-specific approval and immutable hashes, verifies clean Git and remote, preserves an on-disk rollback copy, stages only the approved game, pushes to the owner's GitHub Pages main branch, then verifies remote bytes.

4. VERIFY LIVE: python CONTESTS/SXS_GAME_PLAYTEST_HUB_20261029/site/scripts/x13_pbp.py verify-live RELEASE_ID
   Needed if GitHub Pages deployment is still propagating after the push. A successful push alone is NOT proof of a successful live release.

5. VERIFY SITE: python CONTESTS/SXS_GAME_PLAYTEST_HUB_20261029/site/scripts/x13_pbp.py verify-site
   Checks both published game manifests, owner approval fields, allowlist completeness, SHA-256 values and exact file lengths.

## Gates and receipts

- Exact file allowlist, hash and positive independent browser QA (no errors).
- Separate release-specific owner authorization, not blanket approval.
- Revalidation immediately before publishing.
- Clean site checkout and unchanged remote HEAD, never force push.
- Verified rollback snapshot before copying any published file.
- Push confirmation, then exact live HTTP bytes for index.html and game.js.
- JSON audit artifacts: qa-evidence.json, OWNER_APPROVAL.json, PUBLISHED.json and LIVE_VERIFIED.json.
- All temporary browser QA processes and loopback servers exit when their test finishes. Shared Code Engine and workers are off limits.

## Enforcement limit

GitHub Actions runs an independent public-file integrity check on pushes and PRs. The existing GitHub Pages site serves main directly; unless GitHub branch protection is separately configured, someone with repository write access could bypass the PBP command by pushing straight to main. Therefore PBP is a verified authorized release workflow, not an unbreakable repository-wide permission system.

## Current state

The two already-owner-published public builds were independently re-tested and SHA-256 certified without modifying their game files. Their release-proof manifests mark these existing live baselines. New working source is not automatically approved. PANIC KITCHEN currently has source changes not present on the website and needs a future explicit release decision. The website feedback form remains separate from publication automation.
