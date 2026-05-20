"""Slice 2: study run lifecycle — End teach vs Finish study run."""

from __future__ import annotations

import os
import sqlite3
import sys
import tempfile
import uuid

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
import dashboard.api_data as _api_data_mod
import dashboard.api_tutor as _api_tutor_mod


@pytest.fixture(scope="module")
def app():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    _orig_env = os.environ.get("PT_STUDY_DB")
    _orig_config = config.DB_PATH
    _orig_db_setup = db_setup.DB_PATH
    _orig_api_data = _api_data_mod.DB_PATH

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path

    db_setup.init_database()
    db_setup._METHOD_LIBRARY_ENSURED = False
    db_setup.ensure_method_library_seeded()

    app_obj = create_app()
    app_obj.config["TESTING"] = True
    yield app_obj

    config.DB_PATH = _orig_config
    db_setup.DB_PATH = _orig_db_setup
    _api_data_mod.DB_PATH = _orig_api_data
    if _orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = _orig_env
    _api_tutor_mod._SELECTOR_COLS_ENSURED = False
    try:
        os.unlink(tmp_path)
    except OSError:
        pass


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


def _get_template_chain_id(client) -> int:
    resp = client.get("/api/chains")
    assert resp.status_code == 200
    chains = resp.get_json()
    template = next((c for c in chains if c.get("is_template")), chains[0])
    return int(template["id"])


def _create_workflow(client) -> str:
    workflow_id = f"wf-{uuid.uuid4().hex[:12]}"
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """INSERT INTO tutor_workflows (
            workflow_id, course_id, topic, current_stage, status,
            active_tutor_session_id, created_at, updated_at
        ) VALUES (?, NULL, 'Lifecycle Test', 'tutor', 'tutor_in_progress', NULL, datetime('now'), datetime('now'))""",
        (workflow_id,),
    )
    conn.commit()
    conn.close()
    return workflow_id


def _create_tutor_session(client, *, workflow_id: str, chain_id: int) -> str:
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Leg A",
            "method_chain_id": chain_id,
            "session_kind": "tutor",
            "teach_leg_label": "Leg A",
            "content_filter": {"material_ids": [1]},
        },
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    session_id = resp.get_json()["session_id"]
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        "UPDATE tutor_workflows SET active_tutor_session_id = ? WHERE workflow_id = ?",
        (session_id, workflow_id),
    )
    conn.commit()
    conn.close()
    return session_id


def _workflow_row(workflow_id: str) -> sqlite3.Row:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT status, current_stage, active_tutor_session_id FROM tutor_workflows WHERE workflow_id = ?",
        (workflow_id,),
    ).fetchone()
    conn.close()
    assert row is not None
    return row


def _session_status(session_id: str) -> str:
    conn = sqlite3.connect(config.DB_PATH)
    row = conn.execute(
        "SELECT status FROM tutor_sessions WHERE session_id = ?",
        (session_id,),
    ).fetchone()
    conn.close()
    assert row is not None
    return row[0]


def test_end_teach_does_not_advance_workflow_to_polish(client):
    chain_id = _get_template_chain_id(client)
    workflow_id = _create_workflow(client)
    session_id = _create_tutor_session(client, workflow_id=workflow_id, chain_id=chain_id)

    resp = client.post(
        f"/api/tutor/session/{session_id}/end",
        json={"advance_workflow": False},
    )
    assert resp.status_code == 200

    assert _session_status(session_id) == "completed"
    row = _workflow_row(workflow_id)
    assert row["active_tutor_session_id"] is None
    assert row["current_stage"] == "tutor"
    assert row["status"] == "tutor_in_progress"


def test_end_session_advance_workflow_still_moves_to_polish(client):
    chain_id = _get_template_chain_id(client)
    workflow_id = _create_workflow(client)
    session_id = _create_tutor_session(client, workflow_id=workflow_id, chain_id=chain_id)

    resp = client.post(
        f"/api/tutor/session/{session_id}/end",
        json={"advance_workflow": True},
    )
    assert resp.status_code == 200

    row = _workflow_row(workflow_id)
    assert row["current_stage"] == "polish"
    assert row["status"] == "polish_in_progress"


def test_finish_study_run_closes_workflow_not_tutor_session_only(client):
    chain_id = _get_template_chain_id(client)
    workflow_id = _create_workflow(client)
    session_id = _create_tutor_session(client, workflow_id=workflow_id, chain_id=chain_id)

    resp = client.post(f"/api/tutor/workflows/{workflow_id}/finish")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["workflow"]["status"] == "study_run_finished"
    assert body["workflow"]["active_tutor_session_id"] is None

    # Active leg may still be open until explicitly ended; finish closes the run.
    row = _workflow_row(workflow_id)
    assert row["status"] == "study_run_finished"
    assert row["active_tutor_session_id"] is None
