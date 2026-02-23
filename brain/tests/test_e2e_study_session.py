"""
End-to-end study session test.

Exercises the full tutor lifecycle:
  create_session (with chain) → send turns → advance blocks →
  end_session → verify method_ratings, session_chains, summary,
  recommendations, and rate_method_block tool.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
import dashboard.api_data as _api_data_mod
import dashboard.api_adapter as _api_adapter_mod
import dashboard.api_tutor as _api_tutor_mod
import tutor_tools


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def app():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    _orig_env = os.environ.get("PT_STUDY_DB")
    _orig_config = config.DB_PATH
    _orig_db_setup = db_setup.DB_PATH
    _orig_api_data = _api_data_mod.DB_PATH
    _orig_obsidian_get = _api_adapter_mod.obsidian_get_file
    _orig_obsidian_save = _api_adapter_mod.obsidian_save_file

    obsidian_store: dict[str, str] = {}

    def _fake_get(path: str):
        content = obsidian_store.get(path)
        if content is None:
            return {"success": False, "error": "not found"}
        return {"success": True, "content": content, "path": path}

    def _fake_save(path: str, content: str):
        obsidian_store[path] = content
        return {"success": True, "path": path}

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path
    _api_adapter_mod.obsidian_get_file = _fake_get
    _api_adapter_mod.obsidian_save_file = _fake_save

    db_setup.init_database()
    db_setup._METHOD_LIBRARY_ENSURED = False
    db_setup.ensure_method_library_seeded()

    app_obj = create_app()
    app_obj.config["TESTING"] = True
    app_obj.config["TEST_OBSIDIAN_STORE"] = obsidian_store
    yield app_obj

    config.DB_PATH = _orig_config
    db_setup.DB_PATH = _orig_db_setup
    _api_data_mod.DB_PATH = _orig_api_data
    _api_adapter_mod.obsidian_get_file = _orig_obsidian_get
    _api_adapter_mod.obsidian_save_file = _orig_obsidian_save
    if _orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = _orig_env

    _api_adapter_mod._SELECTOR_COLS_ENSURED_SESSIONS = False
    _api_tutor_mod._SELECTOR_COLS_ENSURED = False

    try:
        os.unlink(tmp_path)
    except OSError:
        pass


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


@pytest.fixture(scope="module")
def db_path():
    return config.DB_PATH


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_chain_id(client) -> int:
    """Get the first template chain ID from the seeded data."""
    import sqlite3
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT id FROM method_chains WHERE is_template = 1 LIMIT 1"
    ).fetchone()
    conn.close()
    assert row is not None, "No template chains found — seed_methods may not have run"
    return row["id"]


def _get_chain_blocks(chain_id: int) -> list[dict]:
    """Get blocks for a chain."""
    import sqlite3
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT block_ids FROM method_chains WHERE id = ?", (chain_id,)
    ).fetchone()
    if not row:
        conn.close()
        return []
    block_ids = json.loads(row["block_ids"] or "[]")
    blocks = []
    for bid in block_ids:
        brow = conn.execute(
            "SELECT id, name, method_id FROM method_blocks WHERE id = ?", (bid,)
        ).fetchone()
        if brow:
            blocks.append(dict(brow))
    conn.close()
    return blocks


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestFullStudySession:
    """End-to-end: create → turn simulation → advance → end → verify loop."""

    def test_01_create_session_with_chain(self, client):
        """Create a tutor session using a template chain."""
        chain_id = _get_chain_id(client)
        resp = client.post("/api/tutor/session", json={
            "mode": "Core",
            "topic": "Hip and Pelvis Complex",
            "phase": "first_pass",
            "method_chain_id": chain_id,
            "content_filter": {
                "stage": "pre-class",
                "energy": "medium",
                "class_type": "lecture",
            },
        })
        assert resp.status_code == 201, f"Create failed: {resp.get_json()}"
        data = resp.get_json()
        assert data["session_id"].startswith("tutor-")
        assert data["method_chain_id"] == chain_id
        assert data["current_block_index"] == 0
        # Store for later tests
        TestFullStudySession._session_id = data["session_id"]
        TestFullStudySession._chain_id = chain_id

    def test_02_session_chains_populated(self):
        """Verify session_chains table was populated on create."""
        import sqlite3
        conn = sqlite3.connect(config.DB_PATH)
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM session_chains WHERE topic = ?",
            ("Hip and Pelvis Complex",),
        ).fetchone()
        conn.close()
        assert row is not None, "session_chains row not created"
        ids = json.loads(row["session_ids_json"])
        assert self._session_id in ids

    def test_03_get_chain_status(self, client):
        """Chain status endpoint returns valid data."""
        resp = client.get(f"/api/tutor/session/{self._session_id}/chain-status")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "chain_id" in data or "chain_name" in data or "blocks" in data

    def test_04_advance_block(self, client):
        """Advance to the next block in the chain."""
        resp = client.post(
            f"/api/tutor/session/{self._session_id}/advance-block",
            json={},
        )
        # Should succeed (200) or return chain info
        assert resp.status_code in (200, 201), f"Advance failed: {resp.get_json()}"
        data = resp.get_json()
        # Store the block we advanced from
        TestFullStudySession._advanced = True

    def test_05_end_session(self, client):
        """End the session and verify summary."""
        resp = client.post(f"/api/tutor/session/{self._session_id}/end")
        assert resp.status_code == 200, f"End failed: {resp.get_json()}"
        data = resp.get_json()
        assert data["status"] == "completed"
        assert data["session_id"] == self._session_id
        assert "summary" in data
        summary = data["summary"]
        assert "turn_count" in summary
        assert "duration_minutes" in summary
        assert "ratings_captured" in summary
        TestFullStudySession._summary = summary
        TestFullStudySession._brain_session_id = data.get("brain_session_id")

    def test_06_method_ratings_captured(self):
        """Verify method_ratings were auto-captured for completed blocks."""
        import sqlite3
        conn = sqlite3.connect(config.DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM method_ratings WHERE session_id = ?",
            (self._brain_session_id,),
        ).fetchall()
        conn.close()

        ratings_captured = self._summary.get("ratings_captured", 0)
        assert len(rows) == ratings_captured
        # If we advanced a block, there should be at least 1 rating
        if getattr(self, "_advanced", False) and ratings_captured > 0:
            row = rows[0]
            assert row["effectiveness"] == 3  # neutral default
            assert row["engagement"] == 3
            context = json.loads(row["context"] or "{}")
            assert "topic" in context

    def test_07_get_session_summary(self, client):
        """GET summary endpoint returns valid wrap data."""
        resp = client.get(
            f"/api/tutor/session/{self._session_id}/summary"
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "turn_count" in data
        assert "duration_minutes" in data

    def test_08_rate_method_block_tool(self):
        """Test the rate_method_block tutor tool directly."""
        blocks = _get_chain_blocks(self._chain_id)
        if not blocks:
            pytest.skip("No blocks in chain")

        block = blocks[0]
        result = tutor_tools.execute_tool(
            "rate_method_block",
            {
                "block_name": block["name"],
                "effectiveness": 5,
                "engagement": 4,
                "notes": "This method really helped me understand the hip joint",
            },
            session_id=self._session_id,
        )
        assert result["success"], f"rate_method_block failed: {result}"
        assert result["rating_id"] is not None
        assert result["block_id"] == block["id"]

    def test_09_explicit_rating_in_db(self):
        """Verify the explicit rating was stored correctly."""
        import sqlite3
        conn = sqlite3.connect(config.DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """SELECT * FROM method_ratings
               WHERE context LIKE '%tutor_tool%'
               ORDER BY id DESC LIMIT 1"""
        ).fetchall()
        conn.close()
        assert len(rows) >= 1
        row = rows[0]
        assert row["effectiveness"] == 5
        assert row["engagement"] == 4
        assert "hip joint" in (row["notes"] or "")

    def test_10_scholar_endpoints_reachable(self, client):
        """Verify Scholar API endpoints respond."""
        for path in [
            "/api/scholar",
            "/api/scholar/digest",
            "/api/scholar/clusters",
        ]:
            resp = client.get(path)
            assert resp.status_code == 200, f"{path} returned {resp.status_code}"

    def test_11_recommendations_available(self, client):
        """Create a second session — should include recommendations
        now that we have ratings in the DB."""
        chain_id = _get_chain_id(client)
        resp = client.post("/api/tutor/session", json={
            "mode": "Core",
            "topic": "Knee Complex",
            "method_chain_id": chain_id,
            "content_filter": {
                "stage": "pre-class",
                "energy": "medium",
                "class_type": "lecture",
            },
        })
        assert resp.status_code == 201
        data = resp.get_json()
        # recommended_chains may or may not be present depending on
        # whether ratings match context — just verify no crash
        assert "session_id" in data
        # Clean up
        client.post(f"/api/tutor/session/{data['session_id']}/end")

    def test_12_session_chains_accumulate(self):
        """Second session should have been appended to session_chains."""
        import sqlite3
        conn = sqlite3.connect(config.DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM session_chains"
        ).fetchall()
        conn.close()
        # Should have at least 2 rows (Hip and Knee topics)
        assert len(rows) >= 2
