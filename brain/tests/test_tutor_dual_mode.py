"""Slice 1: General Q&A vs Tutor teach gate (dual-mode send)."""

from __future__ import annotations

import os
import sqlite3
import sys
import tempfile
from typing import Any

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
import llm_provider
import tutor_context
import tutor_tools
from dashboard.app import create_app
import dashboard.api_adapter as _api_adapter_mod
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
    assert isinstance(chains, list) and chains
    template = next((c for c in chains if c.get("is_template")), chains[0])
    return int(template["id"])


def _patch_send_turn_llm(monkeypatch) -> None:
    monkeypatch.setattr(
        tutor_context,
        "build_context",
        lambda *args, **kwargs: {
            "materials": "",
            "instructions": "",
            "notes": "",
            "course_map": "",
            "debug": {},
        },
    )
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True})

    def fake_stream(_system_prompt, _user_prompt, **kwargs):
        yield {"type": "delta", "text": "ok"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-1",
            "thread_id": "thread-1",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)


def _create_general_session(client) -> str:
    resp = client.post(
        "/api/tutor/session",
        json={"mode": "Core", "topic": "General workspace", "session_kind": "general"},
    )
    assert resp.status_code == 201, resp.get_json()
    sid = resp.get_json().get("session_id")
    assert isinstance(sid, str) and sid
    return sid


def test_send_turn_persists_interaction_mode_general(client, monkeypatch):
    """General turn_mode is stored on the transcript row."""
    _patch_send_turn_llm(monkeypatch)
    session_id = _create_general_session(client)

    resp = client.post(
        f"/api/tutor/session/{session_id}/turn",
        json={"message": "Quick question", "turn_mode": "general"},
    )
    assert resp.status_code == 200
    _ = resp.get_data(as_text=True)

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT interaction_mode FROM tutor_turns WHERE tutor_session_id = ?",
        (session_id,),
    )
    row = cur.fetchone()
    conn.close()
    assert row is not None
    assert row["interaction_mode"] == "general"


def test_create_teach_session_rejects_without_materials(client):
    chain_id = _get_template_chain_id(client)
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "ACL",
            "teach_leg_label": "ACL mechanics",
            "method_chain_id": chain_id,
            "session_kind": "tutor",
            "content_filter": {"material_ids": []},
        },
    )
    assert resp.status_code == 400
    body = resp.get_json()
    assert body.get("code") == "TEACH_MATERIALS_REQUIRED"


def test_create_teach_session_rejects_without_chain(client):
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "ACL",
            "teach_leg_label": "ACL mechanics",
            "session_kind": "tutor",
            "content_filter": {"material_ids": [1]},
        },
    )
    assert resp.status_code == 400
    body = resp.get_json()
    assert body.get("code") == "TEACH_CHAIN_REQUIRED"


def test_create_teach_session_rejects_without_teach_leg_label(client):
    chain_id = _get_template_chain_id(client)
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "",
            "method_chain_id": chain_id,
            "session_kind": "tutor",
            "content_filter": {"material_ids": [1]},
        },
    )
    assert resp.status_code == 400
    body = resp.get_json()
    assert body.get("code") == "TEACH_LEG_LABEL_REQUIRED"


def test_create_teach_session_accepts_template_chain_and_materials(client):
    chain_id = _get_template_chain_id(client)
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "ACL mechanics",
            "teach_leg_label": "ACL mechanics",
            "method_chain_id": chain_id,
            "session_kind": "tutor",
            "content_filter": {"material_ids": [1]},
        },
    )
    assert resp.status_code == 201, resp.get_json()
    body = resp.get_json()
    assert body.get("session_id")


def test_send_turn_rejects_tutor_mode_without_teach_chain(client, monkeypatch):
    _patch_send_turn_llm(monkeypatch)
    session_id = _create_general_session(client)
    resp = client.post(
        f"/api/tutor/session/{session_id}/turn",
        json={"message": "Teach me this", "turn_mode": "tutor"},
    )
    assert resp.status_code == 400
    assert resp.get_json().get("code") == "TUTOR_TURN_REQUIRES_TEACH_SESSION"
