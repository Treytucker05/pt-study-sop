"""Slices #163–#166: teach legs, working summary, prompt assembler, polish drafts."""

from __future__ import annotations

import json
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


def _db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH, timeout=30)
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn


def _create_workflow(client) -> str:
    workflow_id = f"wf-{uuid.uuid4().hex[:12]}"
    conn = _db_connect()
    conn.execute(
        """INSERT INTO tutor_workflows (
            workflow_id, course_id, topic, current_stage, status,
            active_tutor_session_id, created_at, updated_at
        ) VALUES (?, NULL, 'Memory Slice Test', 'tutor', 'tutor_in_progress', NULL, datetime('now'), datetime('now'))""",
        (workflow_id,),
    )
    conn.commit()
    conn.close()
    return workflow_id


def _create_teach_session(
    client,
    *,
    workflow_id: str,
    label: str,
    chain_id: int,
) -> str:
    resp = client.post(
        "/api/tutor/session",
        json={
            "workflow_id": workflow_id,
            "session_kind": "tutor",
            "teach_leg_label": label,
            "topic": label,
            "method_chain_id": chain_id,
            "content_filter": {
                "session_kind": "tutor",
                "teach_leg_label": label,
                "material_ids": [1],
            },
        },
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["session_id"]


def _insert_turn(
    conn: sqlite3.Connection,
    session_id: str,
    *,
    turn_number: int,
    question: str,
    answer: str,
    interaction_mode: str,
) -> None:
    conn.execute(
        """INSERT INTO tutor_turns
           (session_id, tutor_session_id, turn_number, question, answer, interaction_mode, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))""",
        (session_id, session_id, turn_number, question, answer, interaction_mode),
    )
    conn.execute(
        "UPDATE tutor_sessions SET turn_count = ? WHERE session_id = ?",
        (turn_number, session_id),
    )
    conn.commit()


def test_teach_legs_list_two_sessions(client):
    """#163: two teach legs on one workflow appear in teach-legs list."""
    chain_id = _get_template_chain_id(client)
    workflow_id = _create_workflow(client)
    leg_a = _create_teach_session(
        client, workflow_id=workflow_id, label="Leg A", chain_id=chain_id
    )
    client.post(
        f"/api/tutor/session/{leg_a}/end",
        json={"advance_workflow": False},
    )
    leg_b = _create_teach_session(
        client, workflow_id=workflow_id, label="Leg B", chain_id=chain_id
    )

    resp = client.get(f"/api/tutor/workflows/{workflow_id}/teach-legs")
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["count"] == 2
    labels = {leg["teach_leg_label"] for leg in payload["teach_legs"]}
    assert labels == {"Leg A", "Leg B"}
    session_ids = {leg["session_id"] for leg in payload["teach_legs"]}
    assert session_ids == {leg_a, leg_b}

    conn = _db_connect()
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT workflow_id FROM tutor_sessions WHERE session_id = ?",
        (leg_b,),
    ).fetchone()
    assert row["workflow_id"] == workflow_id
    conn.close()


def test_compact_excludes_general_turns(client):
    """#164: compaction uses tutor turns only; transcript rows remain."""
    chain_id = _get_template_chain_id(client)
    workflow_id = _create_workflow(client)
    session_id = _create_teach_session(
        client, workflow_id=workflow_id, label="Compact Leg", chain_id=chain_id
    )
    conn = _db_connect()
    _insert_turn(
        conn,
        session_id,
        turn_number=1,
        question="General?",
        answer="General answer",
        interaction_mode="general",
    )
    _insert_turn(
        conn,
        session_id,
        turn_number=2,
        question="Teach?",
        answer="Teach answer about stroke volume",
        interaction_mode="tutor",
    )
    conn.close()

    resp = client.post(f"/api/tutor/session/{session_id}/compact")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["tutor_turn_count"] == 1
    assert body["transcript_turn_count"] == 2
    assert "Teach answer" in body["working_summary"]["summary_text"]
    assert "General answer" not in body["working_summary"]["summary_text"]
    assert body["working_summary"]["version"] == 1

    resp2 = client.post(f"/api/tutor/session/{session_id}/compact")
    assert resp2.status_code == 200
    assert resp2.get_json()["working_summary"]["version"] == 2

    conn = _db_connect()
    turn_count = conn.execute(
        "SELECT COUNT(*) FROM tutor_turns WHERE tutor_session_id = ?",
        (session_id,),
    ).fetchone()[0]
    assert turn_count == 2
    conn.close()


def test_prompt_assembler_uses_summary(client):
    """#165: send_turn history uses working summary when present."""
    from dashboard.api_tutor_memory import build_prompt_turn_history

    chain_id = _get_template_chain_id(client)
    workflow_id = _create_workflow(client)
    session_id = _create_teach_session(
        client, workflow_id=workflow_id, label="Prompt Leg", chain_id=chain_id
    )
    conn = _db_connect()
    for i in range(1, 6):
        _insert_turn(
            conn,
            session_id,
            turn_number=i,
            question=f"Tutor Q{i}",
            answer=f"Tutor A{i}",
            interaction_mode="tutor",
        )
    conn.execute(
        """INSERT INTO tutor_working_summaries
           (tutor_session_id, version, summary_text, trigger_source, created_at)
           VALUES (?, 1, ?, 'manual', datetime('now'))""",
        (session_id, "SUMMARY_MARKER consolidated teach context"),
    )
    conn.commit()
    conn.close()

    conn = _db_connect()
    history, summary = build_prompt_turn_history(conn, session_id, tail_k=2)
    conn.close()
    assert summary is not None
    assert any("SUMMARY_MARKER" in str(m.get("content", "")) for m in history if m["role"] == "system")
    user_msgs = [m for m in history if m["role"] == "user"]
    assert len(user_msgs) <= 2
    assert user_msgs[-1]["content"] == "Tutor Q5"


def test_polish_drafts_checkpoint_and_final(client):
    """#166: compact creates checkpoint; end teach creates final draft."""
    chain_id = _get_template_chain_id(client)
    workflow_id = _create_workflow(client)
    session_id = _create_teach_session(
        client, workflow_id=workflow_id, label="Polish Leg", chain_id=chain_id
    )
    conn = _db_connect()
    _insert_turn(
        conn,
        session_id,
        turn_number=1,
        question="Q",
        answer="Teach content for polish",
        interaction_mode="tutor",
    )
    conn.close()

    compact_resp = client.post(f"/api/tutor/session/{session_id}/compact")
    assert compact_resp.status_code == 200
    checkpoint = compact_resp.get_json().get("polish_draft")
    assert checkpoint is not None
    assert checkpoint["kind"] == "checkpoint"

    end_resp = client.post(
        f"/api/tutor/session/{session_id}/end",
        json={"advance_workflow": False},
    )
    assert end_resp.status_code == 200

    drafts_resp = client.get(f"/api/tutor/workflows/{workflow_id}/polish-drafts")
    assert drafts_resp.status_code == 200
    drafts = drafts_resp.get_json()["drafts"]
    kinds = {d["kind"] for d in drafts}
    assert "checkpoint" in kinds
    assert "final" in kinds

    final_draft = next(d for d in drafts if d["kind"] == "final")
    approve_resp = client.post(
        f"/api/tutor/workflows/{workflow_id}/polish-drafts/{final_draft['id']}/approve"
    )
    assert approve_resp.status_code == 200
    assert approve_resp.get_json()["status"] == "approved"
