#!/usr/bin/env python3
"""X13 Proof Before Publish (PBP), production release guard for SXS Arcade.

Phases: PREPARE -> QA -> APPROVE -> PUBLISH -> VERIFY.
No background services, no secrets stored, no automatic release of unapproved files.
Source roots are explicitly allowlisted; game assets never come from arbitrary input paths.
Requires Python 3.11+, Git, GitHub CLI authentication, Node 20+, local Chrome for QA.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
SITE = HERE.parent
WORKSPACE = SITE.parents[2]
CONTESTS = WORKSPACE / "CONTESTS"
RELEASES = CONTESTS / "X13_PROOF_BEFORE_PUBLISH_20261029" / "releases"
SITE_ORIGIN = "https://shanxservices.com"
DEST = "arcade/games"
EXPECTED_REMOTE = "https://github.com/shanxservicesllc-png/shanxservices-site.git"
GAMES = {
    "palmageddon": {
        "src": "SLAPJAM_3_PALMAGEDDON_V3_REAL_HUMANS_20261029",
        "files": [
            "index.html", "game.js", "audio_v7.js",
            "vendor/playcanvas.mjs", "vendor/LICENSE-playcanvas.txt",
            "assets/basement_slap_stage.glb", "assets/basketball_slap_stage.glb",
            "assets/street_slap_stage.glb", "assets/real_slap_stage.glb",
            "assets/VOLT_VIPER_REAL.glb", "assets/MITTENS_MCFURY_REAL.glb",
            "assets/COACH_RIVERA_REAL.glb", "assets/IRON_MALIK_REAL.glb",
            "assets/VANCE_STONE_REAL.glb",
            "README_PLAYTEST.txt",
        ],
        "url": "/arcade/games/palmageddon/",
    },
    "panic-kitchen": {
        "src": "SLAPJAM_3_PANIC_KITCHEN_REBUILD_20261029",
        "files": [
            "index.html", "game.js", "dining.css", "dining.js",
            "rush.css", "rush.js", "tycoon.js",
            "vendor/playcanvas.mjs", "vendor/LICENSE-playcanvas.txt",
            "assets/panic_district.glb", "assets/panic_hero_food_truck.glb",
        ],
        "url": "/arcade/games/panic-kitchen/",
    },
}
MANIFEST_NAME = "pbp-release.json"
LOG_NAME = "qa-evidence.json"
APPROVAL_NAME = "OWNER_APPROVAL.json"


def abort(message: str) -> None:
    raise SystemExit("PBP BLOCKED: " + message)


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def utc() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def pretty(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, indent=2, ensure_ascii=False) + "\n"


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8", newline="\n") as f:
        f.write(pretty(value))


def run(cmd: list[str], cwd: Path | None = None, timeout: int = 45, **kw) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8",
        errors="replace", timeout=timeout, **kw
    )


def must_run(cmd: list[str], cwd: Path | None = None, timeout: int = 45) -> str:
    r = run(cmd, cwd, timeout)
    if r.returncode:
        abort(f"command failed ({r.returncode}): {cmd[0]} {cmd[1:3]} ... {r.stderr.strip()[-500:]}")
    return r.stdout.strip()


def files_for(game: str, src: Path) -> list[dict]:
    out = []
    for rel in GAMES[game]["files"]:
        f = src / rel
        if not f.is_file() or f.is_symlink() or not f.stat().st_size:
            abort(f"missing/empty/disallowed source file: {f}")
        if not f.resolve().is_relative_to(src.resolve()):
            abort(f"source path escape: {rel}")
        out.append({"path": rel, "bytes": f.stat().st_size, "sha256": sha(f)})
    return out


def fingerprint(game: str, files: list[dict]) -> str:
    stable = json.dumps({"game": game, "files": files}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(stable.encode("utf-8")).hexdigest()


def release_path(release: str) -> Path:
    if len(release) < 18 or not release.replace("-", "").replace("_", "").isalnum():
        abort("invalid release identifier")
    p = RELEASES / release
    if not p.is_dir() or not p.resolve().is_relative_to(RELEASES.resolve()):
        abort("unknown release; run prepare")
    return p


def load_release(release: str) -> tuple[Path, dict, str]:
    p = release_path(release)
    manifest = json.loads((p / MANIFEST_NAME).read_text(encoding="utf-8"))
    game = manifest["game"]
    if game not in GAMES or manifest.get("release_id") != release:
        abort("tampered release metadata")
    expected = files_for(game, p / "bundle")
    digest = fingerprint(game, expected)
    if digest != manifest["content_sha256"]:
        abort("release content changed since preparation")
    if expected != manifest["files"]:
        abort("release file manifest mismatch")
    return p, manifest, game


def qa(game: str, game_dir: Path) -> dict:
    script = HERE / "qa_release.cjs"
    if not script.is_file():
        abort("browser acceptance harness is missing")
    # Browser is a throwaway short-lived process and serves a dynamic localhost port.
    r = run(
        ["node", str(script), "--game", game, "--dir", str(game_dir)],
        cwd=SITE, timeout=210
    )
    if r.returncode:
        abort(f"browser QA failed for {game}: {(r.stdout + chr(10) + r.stderr)[-1800:]}")
    lines = [line for line in r.stdout.splitlines() if line.startswith("PBP_QA_JSON ")]
    if len(lines) != 1:
        abort("QA returned no single machine-readable proof record")
    proof = json.loads(lines[0].split(" ", 1)[1])
    if proof.get("game") != game or proof.get("passed") is not True:
        abort("browser QA did not positively establish PASS")
    if proof.get("page_errors") != 0 or proof.get("asset_errors") != 0:
        abort("QA browser errors detected")
    return proof


def prepare(game: str) -> None:
    src = (CONTESTS / GAMES[game]["src"]).resolve()
    if not src.is_dir():
        abort("source directory unavailable: " + str(src))
    rows = files_for(game, src)
    digest = fingerprint(game, rows)
    release_id = f"{game}-{digest[:16]}"
    target = RELEASES / release_id
    if target.exists():
        p, manifest, _ = load_release(release_id)
        print(f"EXISTING VERIFIED RELEASE: {p}\nRELEASE_ID: {release_id}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    # Atomic staging directory, not a website write.
    with tempfile.TemporaryDirectory(prefix="PBP_TMP_", dir=RELEASES) as temporary:
        temp = Path(temporary)
        bundle = temp / "bundle"
        for item in rows:
            rel = item["path"]
            dest = bundle / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src / rel, dest)
            if sha(dest) != item["sha256"]:
                abort(f"source copy readback mismatch {rel}")
        browser = qa(game, bundle)
        manifest = {
            "schema": "x13-pbp-1",
            "game": game,
            "release_id": release_id,
            "content_sha256": digest,
            "files": rows,
            "qa_required": True,
            "website_path": f"{DEST}/{game}/",
            "prepared_at_utc": utc(),
            "owner_approved": False,
        }
        write_json(temp / MANIFEST_NAME, manifest)
        write_json(temp / LOG_NAME, {
            "release_id": release_id, "browser": browser, "created_at_utc": utc(),
            "qa_script_sha256": sha(HERE / "qa_release.cjs"),
            "file_sha256": digest
        })
        temp.rename(target)
    print(f"PREPARED + QA PASSED: {release_id}\nCONTENT_SHA256: {digest}\nNEXT OWNER APPROVAL PHRASE: APPROVE {release_id}")
    print("No public files changed.")


def approve(release: str, phrase: str) -> None:
    p, manifest, game = load_release(release)
    expected = f"APPROVE {release}"
    if phrase != expected:
        abort(f"release-specific owner approval required. Exact phrase: {expected}")
    if (p / APPROVAL_NAME).exists():
        abort("release already approved; no duplicate approval")
    # Approval can only refer to the exact source content that passed the QA.
    proof = json.loads((p / LOG_NAME).read_text(encoding="utf-8"))
    if proof["file_sha256"] != manifest["content_sha256"] or not proof["browser"]["passed"]:
        abort("QA receipt does not match release")
    write_json(p / APPROVAL_NAME, {
        "release_id": release, "content_sha256": manifest["content_sha256"],
        "decision": "OWNER_APPROVED_FOR_WEBSITE_PUBLICATION",
        "approved_at_utc": utc(), "single_use": True
    })
    print("OWNER APPROVAL RECORDED:", release)
    print("NEXT: python scripts/x13_pbp.py publish", release)


def git_clean() -> None:
    if not (SITE / ".git").exists():
        abort("this tool requires the verified SXS site Git checkout")
    if must_run(["git", "remote", "get-url", "origin"], SITE) != EXPECTED_REMOTE:
        abort("origin URL does not match verified ShanX website")
    status = must_run(["git", "status", "--porcelain"], SITE)
    if status:
        abort("website Git worktree dirty; reconcile first (no auto-stash/overwrite)")
    must_run(["git", "fetch", "--quiet", "origin", "main"], SITE, timeout=90)
    if must_run(["git", "rev-parse", "HEAD"], SITE) != must_run(["git", "rev-parse", "origin/main"], SITE):
        abort("remote website has changed or local branch is behind; no forced push")


def verify_remote(game: str, manifest: dict) -> dict:
    url = SITE_ORIGIN + GAMES[game]["url"]
    # HEAD/GET can be subject to Pages rollout delay. Never claim verified without matching bytes.
    required = ["index.html", "game.js"]
    filemap = {x["path"]: x for x in manifest["files"]}
    results = []
    for rel in required:
        req = urllib.request.Request(url + rel + "?pbp=" + manifest["content_sha256"][:16],
                                     headers={"User-Agent": "X13-PBP/1.0", "Cache-Control": "no-cache"})
        try:
            with urllib.request.urlopen(req, timeout=22) as resp:
                content = resp.read()
                result = {"file": rel, "status": resp.status, "sha256": hashlib.sha256(content).hexdigest()}
        except (urllib.error.URLError, TimeoutError) as ex:
            abort(f"remote verification unavailable: {url}{rel}: {ex}")
        if result["status"] != 200 or result["sha256"] != filemap[rel]["sha256"]:
            abort(f"public website has not deployed verified {rel}: {result}")
        results.append(result)
    return {"url": url, "matched": results}


def publish(release: str) -> None:
    p, manifest, game = load_release(release)
    approved = p / APPROVAL_NAME
    if not approved.exists():
        abort("no release-specific owner approval. Run approve first.")
    approval = json.loads(approved.read_text(encoding="utf-8"))
    if (approval.get("release_id") != release or
        approval.get("content_sha256") != manifest["content_sha256"] or
        approval.get("decision") != "OWNER_APPROVED_FOR_WEBSITE_PUBLICATION"):
        abort("owner approval does not match exact prepared bytes")
    if (p / "PUBLISHED.json").exists():
        abort("this release was already published; use verify-live")
    evidence = json.loads((p / LOG_NAME).read_text(encoding="utf-8"))
    if evidence.get("qa_script_sha256") != sha(HERE / "qa_release.cjs"):
        abort("QA harness changed since release preparation; prepare fresh release")
    # Proof before NEXT: rerun browser QA against the exact staged payload.
    fresh = qa(game, p / "bundle")
    if not fresh["passed"]:
        abort("second browser acceptance failed")
    git_clean()
    dest = SITE / DEST / game
    if not dest.is_dir() or not dest.resolve().is_relative_to(SITE.resolve()):
        abort("expected website game path missing")
    files = {x["path"] for x in manifest["files"]}
    # Preserve user-supplied additional files and reject unexplained destination contents.
    oldfiles = {f.relative_to(dest).as_posix() for f in dest.rglob("*") if f.is_file()}
    unknown = oldfiles - files - {MANIFEST_NAME, "manifest.json"}
    if unknown:
        abort("unexpected website files (no deletes allowed): " + ", ".join(sorted(unknown)[:6]))
    backup = p / "rollback_website"
    if backup.exists():
        abort("rollback snapshot already exists; manual inspection needed")
    shutil.copytree(dest, backup)
    if not backup.is_dir():
        abort("rollback snapshot failed")
    for row in manifest["files"]:
        rel = row["path"]
        out = dest / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        temp = out.with_suffix(out.suffix + ".pbp.tmp")
        if temp.exists():
            abort("stale temporary file: " + str(temp))
        shutil.copyfile(p / "bundle" / rel, temp)
        if sha(temp) != row["sha256"]:
            abort("post-write checksum mismatch; not publishing")
        os.replace(temp, out)
        if sha(out) != row["sha256"]:
            abort("published file readback failed")
    # Manifest is public QA evidence, not a credential.
    public_manifest = {
        "schema": manifest["schema"], "release_id": release, "game": game,
        "content_sha256": manifest["content_sha256"], "files": manifest["files"],
        "approval": "owner-approved", "approved_at_utc": approval["approved_at_utc"],
        "browser_qa_passed": True
    }
    (dest / MANIFEST_NAME).write_text(pretty(public_manifest), encoding="utf-8", newline="\n")
    must_run(["git", "add", "--", f"{DEST}/{game}"], SITE)
    staged = must_run(["git", "diff", "--cached", "--name-only"], SITE).splitlines()
    if not staged or any(not x.replace("\\", "/").startswith(f"{DEST}/{game}/") for x in staged):
        abort("unexpected staged path or no game changes; push disabled")
    name = "ShanX Services LLC"
    email = "henry.shannon@shanxservices.com"
    must_run(["git", "-c", f"user.name={name}", "-c", f"user.email={email}",
              "commit", "-m", f"X13 PBP approved {game} {release}"], SITE)
    # Local per-command GitHub CLI auth, do not write credential or change global settings.
    os.environ["GIT_TERMINAL_PROMPT"] = "0"
    os.environ["GCM_INTERACTIVE"] = "Never"
    result = run([
        "git", "-c", "credential.helper=", "-c",
        "credential.https://github.com.helper=!gh auth git-credential",
        "push", "origin", "HEAD:main"
    ], SITE, timeout=180)
    if result.returncode:
        abort("Git push failed; local commit exists but publication is not confirmed: " + result.stderr[-500:])
    pushed = must_run(["git", "rev-parse", "HEAD"], SITE)
    write_json(p / "PUBLISHED.json", {
        "release_id": release, "commit": pushed,
        "pushed_at_utc": utc(), "browser_qa": fresh,
        "status": "PUSHED_UNTIL_LIVE_VERIFIED"
    })
    print("PUSHED", pushed, "for", game)
    try:
        proof = verify_remote(game, manifest)
        write_json(p / "LIVE_VERIFIED.json", {"verified_at_utc": utc(), **proof})
        print("LIVE VERIFIED", proof["url"])
    except SystemExit as ex:
        # A delayed GitHub Pages build is not a completed verified release.
        print("DEPLOY PENDING:", str(ex), "\nRun verify-live after Pages deploys.")


def verify_live(release: str) -> None:
    p, manifest, game = load_release(release)
    if not (p / "PUBLISHED.json").is_file():
        abort("release not pushed")
    result = verify_remote(game, manifest)
    if not (p / "LIVE_VERIFIED.json").exists():
        write_json(p / "LIVE_VERIFIED.json", {"verified_at_utc": utc(), **result})
    print("LIVE VERIFIED", result["url"], "SHA matched")
    for record in result["matched"]:
        print(record["file"], record["sha256"])


def verify_site() -> None:
    """CI static integrity gate; fails for missing/unlisted/edited releases."""
    count = 0
    for game, spec in GAMES.items():
        public = SITE / DEST / game
        file = public / MANIFEST_NAME
        if not file.is_file():
            abort(f"missing proof manifest: {file}")
        data = json.loads(file.read_text(encoding="utf-8"))
        rows = data.get("files", [])
        if not rows or data.get("game") != game:
            abort(f"invalid public proof for {game}")
        if data.get("approval") != "owner-approved" or not data.get("browser_qa_passed"):
            abort(f"unapproved game build in public site: {game}")
        if len({r["path"] for r in rows}) != len(rows):
            abort("duplicate file paths in manifest")
        if sorted(r["path"] for r in rows) != sorted(spec["files"]):
            abort(f"public manifest bypasses required allowlist: {game}")
        for r in rows:
            rel = Path(r["path"])
            if rel.is_absolute() or ".." in rel.parts or "\\" in r["path"]:
                abort("unsafe manifest path")
            f = public / rel
            if not f.is_file() or sha(f) != r["sha256"] or f.stat().st_size != r["bytes"]:
                abort(f"public website content missing/modified: {game}/{rel}")
        if fingerprint(game, rows) != data.get("content_sha256"):
            abort(f"website release content hash mismatched: {game}")
        count += 1
        print("CI VERIFIED", game, data["release_id"], len(rows), "files")
    print("PROOF BEFORE PUBLISH WEBSITE STATIC GATE PASS:", count, "games")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="cmd", required=True)
    a = subs.add_parser("prepare", help="Copy allowlisted game assets and run independent browser QA")
    a.add_argument("game", choices=GAMES)
    a = subs.add_parser("approve", help="Record explicit release-ID-specific owner approval")
    a.add_argument("release")
    a.add_argument("--phrase", required=True, help='Exact phrase: APPROVE <release-id>')
    a = subs.add_parser("publish", help="Re-test, safely copy, push and verify HTTPS")
    a.add_argument("release")
    a = subs.add_parser("verify-live", help="Check the deployed game hashes against release proof")
    a.add_argument("release")
    subs.add_parser("verify-site", help="Offline CI gate for published release manifests")
    args = parser.parse_args()
    if args.cmd == "prepare":
        prepare(args.game)
    elif args.cmd == "approve":
        approve(args.release, args.phrase)
    elif args.cmd == "publish":
        publish(args.release)
    elif args.cmd == "verify-live":
        verify_live(args.release)
    elif args.cmd == "verify-site":
        verify_site()


if __name__ == "__main__":
    main()
