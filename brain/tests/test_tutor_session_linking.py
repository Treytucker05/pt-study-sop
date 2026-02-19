"""
Tutor session linking/continuity tests.

Verifies:
1) Tutor sessions can be linked to archived brain sessions.
2) response_id continuity is persisted and reused across turns.
"""

from __future__ import annotations

import os
import sys
import tempfile
import sqlite3

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
import dashboard.api_data as _api_data_mod
import dashboard.api_adapter as _api_adapter_mod
import dashboard.api_tutor as _api_tutor_mod
import llm_provider
import tutor_rag
import tutor_tools


@pytest.fixture(scope="module")
def app():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    # Save originals
    _orig_env = os.environ.get("PT_STUDY_DB")
    _orig_config = config.DB_PATH
    _orig_db_setup = db_setup.DB_PATH
    _orig_api_data = _api_data_mod.DB_PATH

    # Patch module-cached DB paths
    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path

    db_setup.init_database()
    app_obj = create_app()
    app_obj.config["TESTING"] = True
    yield app_obj

    # Restore environment/module state
    config.DB_PATH = _orig_config
    db_setup.DB_PATH = _orig_db_setup
    _api_data_mod.DB_PATH = _orig_api_data
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


def _create_archive_session(client) -> int:
    resp = client.post(
        "/api/sessions",
        json={"mode": "brain", "topic": "Archive Link Test"},
    )
    assert resp.status_code == 201
    data = resp.get_json()
    assert isinstance(data, dict)
    assert isinstance(data.get("id"), int)
    return int(data["id"])


def _create_tutor_session(client, *, brain_session_id: int | None = None) -> str:
    payload = {"mode": "Core", "topic": "Tutor Link Test"}
    if brain_session_id is not None:
        payload["brain_session_id"] = brain_session_id
    resp = client.post("/api/tutor/session", json=payload)
    assert resp.status_code == 201
    data = resp.get_json()
    assert isinstance(data, dict)
    sid = data.get("session_id")
    assert isinstance(sid, str) and sid
    return sid


def test_link_archive_round_trip(client):
    archive_id = _create_archive_session(client)
    tutor_sid = _create_tutor_session(client)

    link_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/link-archive",
        json={"brain_session_id": archive_id},
    )
    assert link_resp.status_code == 200
    link_data = link_resp.get_json()
    assert link_data["linked"] is True
    assert link_data["brain_session_id"] == archive_id

    reverse_resp = client.get(f"/api/tutor/archive/{archive_id}/linked-chat")
    assert reverse_resp.status_code == 200
    reverse_data = reverse_resp.get_json()
    assert reverse_data["brain_session_id"] == archive_id
    assert reverse_data["count"] >= 1
    assert any(s["session_id"] == tutor_sid for s in reverse_data["linked_sessions"])


def test_send_turn_persists_and_reuses_response_id(client, monkeypatch):
    tutor_sid = _create_tutor_session(client)

    # Remove external dependencies from this unit test path.
    monkeypatch.setattr(
        tutor_rag, "get_dual_context", lambda *args, **kwargs: {"materials": [], "instructions": []}
    )
    monkeypatch.setattr(
        tutor_rag, "keyword_search_dual", lambda *args, **kwargs: {"materials": [], "instructions": []}
    )
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True})

    calls: list[str | None] = []
    counter = {"n": 0}

    def fake_stream(_system_prompt, _user_prompt, **kwargs):
        calls.append(kwargs.get("previous_response_id"))
        counter["n"] += 1
        rid = f"resp-{counter['n']}"
        yield {"type": "delta", "text": "ok"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": rid,
            "thread_id": "thread-1",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    # Turn 1: no previous response id should be present.
    r1 = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "First turn"},
    )
    assert r1.status_code == 200
    _ = r1.get_data(as_text=True)

    # Turn 2: should carry previous_response_id=resp-1 from DB.
    r2 = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "Second turn"},
    )
    assert r2.status_code == 200
    _ = r2.get_data(as_text=True)

    assert calls[0] is None
    assert calls[1] == "resp-1"

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT last_response_id, codex_thread_id, turn_count FROM tutor_sessions WHERE session_id = ?",
        (tutor_sid,),
    )
    sess = dict(cur.fetchone())
    assert sess["last_response_id"] == "resp-2"
    assert sess["codex_thread_id"] == "thread-1"
    assert int(sess["turn_count"]) == 2

    cur.execute(
        "SELECT response_id, model_id FROM tutor_turns WHERE tutor_session_id = ? ORDER BY turn_number ASC",
        (tutor_sid,),
    )
    turns = [dict(r) for r in cur.fetchall()]
    conn.close()

    assert len(turns) == 2
    assert turns[0]["response_id"] == "resp-1"
    assert turns[1]["response_id"] == "resp-2"
    assert turns[0]["model_id"] == "gpt-5.3-codex"
