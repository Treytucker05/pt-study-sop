"""Regression tests for P0/P1 tutor audit remediation fixes.

Covers:
- Session summary contract fields (duration_seconds, artifact_count, objectives_covered)
- Chain progress structured response
- Artifact type aliasing (table → note, structured_map → map)
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


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def app():
    """Isolated temp DB for audit remediation tests."""
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    _orig_env = os.environ.get("PT_STUDY_DB")
    _orig_config = config.DB_PATH
    _orig_db_setup = db_setup.DB_PATH
    _orig_api_data = _api_data_mod.DB_PATH

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
    yield app_obj

    config.DB_PATH = _orig_config
    db_setup.DB_PATH = _orig_db_setup
    _api_data_mod.DB_PATH = _orig_api_data
    _api_adapter_mod._SELECTOR_COLS_ENSURED_SESSIONS = False
    _api_tutor_mod._SELECTOR_COLS_ENSURED = False

    if _orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = _orig_env

    try:
        os.unlink(tmp_path)
    except OSError:
        pass


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


@pytest.fixture(scope="module")
def session_id(client):
    """Create a tutor session for tests."""
    resp = client.post(
        "/api/tutor/session",
        data=json.dumps({"mode": "Core", "topic": "Audit Remediation Test"}),
        content_type="application/json",
    )
    assert resp.status_code == 201, f"Session create failed: {resp.get_json()}"
    return resp.get_json()["session_id"]


# ---------------------------------------------------------------------------
# P0.2: Session summary contract fields
# ---------------------------------------------------------------------------


class TestSessionSummaryContract:
    """Summary response must include frontend-expected fields."""

    def test_summary_returns_duration_seconds(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "duration_seconds" in data
        assert isinstance(data["duration_seconds"], (int, float))

    def test_summary_returns_artifact_count(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "artifact_count" in data
        assert isinstance(data["artifact_count"], int)

    def test_summary_returns_objectives_covered(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "objectives_covered" in data
        assert isinstance(data["objectives_covered"], list)

    def test_summary_duration_seconds_matches_minutes(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        data = resp.get_json()
        assert data["duration_seconds"] == round(data["duration_minutes"] * 60)

    def test_summary_artifact_count_matches_artifacts_list(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        data = resp.get_json()
        total = sum(a["count"] for a in data["artifacts"])
        assert data["artifact_count"] == total


# ---------------------------------------------------------------------------
# P0.3: Chain progress structured object
# ---------------------------------------------------------------------------


class TestChainProgressShape:
    """chain_progress must be structured object or None, never a string."""

    def test_chain_progress_not_string(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        data = resp.get_json()
        cp = data.get("chain_progress")
        assert not isinstance(cp, str), f"chain_progress should not be a string, got: {cp!r}"

    def test_chain_progress_null_when_no_chain(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        data = resp.get_json()
        # Session created without a chain, so progress should be None/null
        assert data["chain_progress"] is None


# ---------------------------------------------------------------------------
# P1.4: Artifact type aliasing
# ---------------------------------------------------------------------------


class TestArtifactTypeAliasing:
    """table → note, structured_map → map."""

    def test_create_artifact_table_stored_as_note(self, client, session_id):
        resp = client.post(
            f"/api/tutor/session/{session_id}/artifact",
            data=json.dumps({
                "type": "table",
                "title": "Test Table",
                "content": "| Col1 | Col2 |\n|------|------|\n| A | B |",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.get_json()}"
        data = resp.get_json()
        assert data["type"] == "note"

    def test_create_artifact_structured_map_stored_as_map(self, client, session_id):
        resp = client.post(
            f"/api/tutor/session/{session_id}/artifact",
            data=json.dumps({
                "type": "structured_map",
                "title": "Test Map",
                "content": "graph TD\n  A --> B",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.get_json()}"
        data = resp.get_json()
        assert data["type"] == "map"

    def test_invalid_type_still_rejected(self, client, session_id):
        resp = client.post(
            f"/api/tutor/session/{session_id}/artifact",
            data=json.dumps({
                "type": "invalid_type",
                "title": "Bad",
                "content": "nope",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 400
