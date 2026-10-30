"""PBP fail-closed tests, no network, no Git writes, no release approval."""
import contextlib
import io
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import x13_pbp as pbp


class ProofBeforePublishTests(unittest.TestCase):
    def test_digest_changes_with_single_byte(self):
        a = [{"path": "index.html", "bytes": 1, "sha256": "aa"}]
        b = [{"path": "index.html", "bytes": 1, "sha256": "bb"}]
        self.assertNotEqual(pbp.fingerprint("palmageddon", a), pbp.fingerprint("palmageddon", b))

    def test_missing_source_file_blocks(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(SystemExit) as e:
                pbp.files_for("palmageddon", pathlib.Path(d))
            self.assertIn("PBP BLOCKED", str(e.exception))

    def build_fixture(self, root):
        site = pathlib.Path(root)
        for game, info in pbp.GAMES.items():
            target = site / pbp.DEST / game
            rows = []
            for filename in info["files"]:
                path = target / filename
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes((game + "/" + filename).encode("utf-8"))
                rows.append({"path": filename, "bytes": path.stat().st_size, "sha256": pbp.sha(path)})
            public = {
                "schema": "x13-pbp-1", "release_id": game + "-fixture",
                "game": game, "approval": "owner-approved", "browser_qa_passed": True,
                "files": rows, "content_sha256": pbp.fingerprint(game, rows)
            }
            (target / pbp.MANIFEST_NAME).write_text(pbp.pretty(public), encoding="utf-8")

    def test_published_hash_tamper_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self.build_fixture(d)
            with patch.object(pbp, "SITE", pathlib.Path(d)):
                with contextlib.redirect_stdout(io.StringIO()):
                    pbp.verify_site()
                broken = pathlib.Path(d) / pbp.DEST / "palmageddon" / "game.js"
                broken.write_bytes(b"UNAPPROVED CHANGE")
                with self.assertRaises(SystemExit) as e:
                    with contextlib.redirect_stdout(io.StringIO()):
                        pbp.verify_site()
                self.assertIn("modified", str(e.exception))

    def test_missing_owner_approval_blocks(self):
        with tempfile.TemporaryDirectory() as d:
            self.build_fixture(d)
            target = pathlib.Path(d) / pbp.DEST / "panic-kitchen" / pbp.MANIFEST_NAME
            data = json.loads(target.read_text())
            data["approval"] = "pending"
            target.write_text(pbp.pretty(data), encoding="utf-8")
            with patch.object(pbp, "SITE", pathlib.Path(d)):
                with self.assertRaises(SystemExit) as e:
                    with contextlib.redirect_stdout(io.StringIO()):
                        pbp.verify_site()
                self.assertIn("unapproved", str(e.exception))

    def test_changed_allowlist_blocks_even_with_self_consistent_hashes(self):
        with tempfile.TemporaryDirectory() as d:
            self.build_fixture(d)
            target = pathlib.Path(d) / pbp.DEST / "palmageddon" / pbp.MANIFEST_NAME
            data = json.loads(target.read_text())
            data["files"] = data["files"][:-1]
            data["content_sha256"] = pbp.fingerprint("palmageddon", data["files"])
            target.write_text(pbp.pretty(data), encoding="utf-8")
            with patch.object(pbp, "SITE", pathlib.Path(d)):
                with self.assertRaises(SystemExit) as e:
                    with contextlib.redirect_stdout(io.StringIO()):
                        pbp.verify_site()
                self.assertIn("allowlist", str(e.exception))


if __name__ == "__main__":
    unittest.main()
