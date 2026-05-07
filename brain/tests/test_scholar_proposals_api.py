"""Tests for the Scholar Proposals API (SCHOLAR-002).

Exercises POST/GET/decide via Flask's test client against an isolated
temp DB. Covers ≥5 cases per the acceptance criteria.

Run: ``uv run pytest brain/tests/test_scholar_proposals_api.py -v``
"""

from __future__ import annotations

import importlib
import json
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


_SCHOLAR_PROPOSALS_DDL = """
CREATE TABLE IF NOT EXISTS scholar_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    filepath TEXT,
    title TEXT,
    proposal_type TEXT,
    status TEXT,
    created_at TEXT,
    reviewed_at TEXT,
    reviewer_notes TEXT,
    superseded_by INTEGER,
    content_hash TEXT,
    content TEXT,
    cluster_id TEXT,
    proposal_kind TEXT,
    structured_changes TEXT,
    apply_status TEXT,
    applied_at TEXT,
    apply_error TEXT
)
"""


@pytest.fixture
def app_client(tmp_path, monkeypatch):
    """Point the API at a temp DB with just the scholar_proposals table.

    Full ``db_setup.py`` initialization is not run here — the API only
    touches this one table, and using a temp DB keeps the test isolated
    from any live data while avoiding the seed/migration overhead.
    """
    db_path = tmp_path / "pt_study_test.db"
    # Each canonical DB-path env var that ``brain/config.py`` looks up.
    monkeypatch.setenv("PT_BRAIN_DB_PATH", str(db_path))
    monkeypatch.setenv("PT_STUDY_DB_OVERRIDE", str(db_path))
    monkeypatch.setenv("PT_STUDY_DB", str(db_path))

    # Create just the scholar_proposals table the API touches.
    conn = sqlite3.connect(str(db_path))
    conn.executescript(_SCHOLAR_PROPOSALS_DDL)
    conn.commit()
    conn.close()

    # Reload db_setup + the API module so they pick up the new env var.
    for mod_name in ("config", "db_setup", "dashboard.api_scholar_proposals"):
        if mod_name in sys.modules:
            importlib.reload(sys.modules[mod_name])

    # Build a minimal Flask app with just our blueprint mounted; avoids
    # pulling in the full dashboard stack.
    from flask import Flask

    from dashboard.api_scholar_proposals import scholar_proposals_bp

    app = Flask(__name__)
    app.register_blueprint(scholar_proposals_bp)
    app.testing = True
    return app.test_client()


# ────────────────────────────────────────────────────────────────────────
# POST
# ────────────────────────────────────────────────────────────────────────


class TestPostProposal:
    def test_structured_proposal_round_trip(self, app_client):
        payload = {
            "proposal_type": "method_block_edit",
            "proposal_kind": "structured",
            "target_table": "method_blocks",
            "target_id": 42,
            "field_changes": {"facilitation_prompt": "improved prompt"},
            "rationale": "low effectiveness over 3 sessions",
            "title": "Tighten Cardio prompt",
        }
        resp = app_client.post(
            "/api/scholar/method-proposals",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert isinstance(body["id"], int)
        assert body["status"] == "pending"

    def test_missing_proposal_type_400(self, app_client):
        payload = {
            "rationale": "x",
            "target_table": "method_blocks",
            "target_id": 1,
            "field_changes": {"facilitation_prompt": "y"},
        }
        resp = app_client.post(
            "/api/scholar/method-proposals",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 400
        assert "proposal_type" in resp.get_json()["error"]

    def test_structured_missing_target_400(self, app_client):
        payload = {
            "proposal_type": "method_block_edit",
            "proposal_kind": "structured",
            "rationale": "x",
            # missing target_table / target_id / field_changes
        }
        resp = app_client.post(
            "/api/scholar/method-proposals",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 400


# ────────────────────────────────────────────────────────────────────────
# GET
# ────────────────────────────────────────────────────────────────────────


class TestGetProposals:
    def test_pending_only_default(self, app_client):
        # Insert one pending and one approved
        for status in ("pending", "approved"):
            payload = {
                "proposal_type": "method_block_edit",
                "proposal_kind": "structured",
                "target_table": "method_blocks",
                "target_id": 1,
                "field_changes": {"facilitation_prompt": "p"},
                "rationale": "r",
            }
            r = app_client.post(
                "/api/scholar/method-proposals",
                data=json.dumps(payload),
                content_type="application/json",
            )
            new_id = r.get_json()["id"]
            if status == "approved":
                # Approve via decide so status flips
                app_client.post(
                    f"/api/scholar/method-proposals/{new_id}/decide",
                    data=json.dumps({"decision": "approve"}),
                    content_type="application/json",
                )

        resp = app_client.get("/api/scholar/method-proposals")  # default status=pending
        assert resp.status_code == 200
        rows = resp.get_json()
        assert all(r["status"] == "pending" for r in rows)
        assert len(rows) == 1

    def test_status_all_returns_everything(self, app_client):
        for _ in range(2):
            app_client.post(
                "/api/scholar/method-proposals",
                data=json.dumps(
                    {
                        "proposal_type": "method_block_edit",
                        "proposal_kind": "structured",
                        "target_table": "method_blocks",
                        "target_id": 1,
                        "field_changes": {"facilitation_prompt": "p"},
                        "rationale": "r",
                    }
                ),
                content_type="application/json",
            )

        resp = app_client.get("/api/scholar/method-proposals?status=all")
        assert resp.status_code == 200
        assert len(resp.get_json()) >= 2

    def test_invalid_status_400(self, app_client):
        resp = app_client.get("/api/scholar/method-proposals?status=banana")
        assert resp.status_code == 400


# ────────────────────────────────────────────────────────────────────────
# DECIDE
# ────────────────────────────────────────────────────────────────────────


class TestDecide:
    def _create(self, app_client) -> int:
        r = app_client.post(
            "/api/scholar/method-proposals",
            data=json.dumps(
                {
                    "proposal_type": "method_block_edit",
                    "proposal_kind": "structured",
                    "target_table": "method_blocks",
                    "target_id": 1,
                    "field_changes": {"facilitation_prompt": "p"},
                    "rationale": "r",
                }
            ),
            content_type="application/json",
        )
        return r.get_json()["id"]

    def test_approve_flips_status_and_stamps_reviewed_at(self, app_client):
        pid = self._create(app_client)
        resp = app_client.post(
            f"/api/scholar/method-proposals/{pid}/decide",
            data=json.dumps({"decision": "approve", "reviewer_notes": "lgtm"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["status"] == "approved"
        assert body["reviewed_at"] is not None
        assert body["reviewer_notes"] == "lgtm"

    def test_reject_flips_status(self, app_client):
        pid = self._create(app_client)
        resp = app_client.post(
            f"/api/scholar/method-proposals/{pid}/decide",
            data=json.dumps({"decision": "reject"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "rejected"

    def test_invalid_decision_400(self, app_client):
        pid = self._create(app_client)
        resp = app_client.post(
            f"/api/scholar/method-proposals/{pid}/decide",
            data=json.dumps({"decision": "maybe"}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_decide_missing_proposal_404(self, app_client):
        resp = app_client.post(
            "/api/scholar/method-proposals/99999/decide",
            data=json.dumps({"decision": "approve"}),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_decide_already_decided_409(self, app_client):
        pid = self._create(app_client)
        # First approve
        app_client.post(
            f"/api/scholar/method-proposals/{pid}/decide",
            data=json.dumps({"decision": "approve"}),
            content_type="application/json",
        )
        # Try again
        resp = app_client.post(
            f"/api/scholar/method-proposals/{pid}/decide",
            data=json.dumps({"decision": "reject"}),
            content_type="application/json",
        )
        assert resp.status_code == 409
