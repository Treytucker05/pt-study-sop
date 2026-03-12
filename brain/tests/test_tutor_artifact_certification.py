"""Artifact reliability certification for Tutor 10/10."""

from __future__ import annotations

import json
import os
import sqlite3
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


@pytest.fixture(scope="module")
def app():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    orig_env = os.environ.get("PT_STUDY_DB")
    orig_config = config.DB_PATH
    orig_db_setup = db_setup.DB_PATH
    orig_api_data = _api_data_mod.DB_PATH
    orig_obsidian_get = _api_adapter_mod.obsidian_get_file
    orig_obsidian_save = _api_adapter_mod.obsidian_save_file
    orig_tutor_vault_read = _api_tutor_mod._vault_read_note
    orig_tutor_vault_save = _api_tutor_mod._vault_save_note
    orig_tutor_vault_delete = _api_tutor_mod._vault_delete_note

    obsidian_store: dict[str, str] = {}

    def _normalize_path(path: str) -> str:
        return str(path or "").replace("\\", "/").strip().lstrip("/")

    def _fake_get(path: str):
        rel_path = _normalize_path(path)
        content = obsidian_store.get(rel_path)
        if content is None:
            return {"success": False, "error": "not found"}
        return {"success": True, "content": content, "path": rel_path}

    def _fake_save(path: str, content: str):
        rel_path = _normalize_path(path)
        obsidian_store[rel_path] = content
        return {"success": True, "path": rel_path}

    def _fake_delete(path: str):
        rel_path = _normalize_path(path)
        obsidian_store.pop(rel_path, None)
        return {"success": True, "path": rel_path}

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path
    _api_adapter_mod.obsidian_get_file = _fake_get
    _api_adapter_mod.obsidian_save_file = _fake_save
    _api_tutor_mod._vault_read_note = _fake_get
    _api_tutor_mod._vault_save_note = _fake_save
    _api_tutor_mod._vault_delete_note = _fake_delete

    db_setup.init_database()
    app_obj = create_app()
    app_obj.config["TESTING"] = True
    app_obj.config["TEST_OBSIDIAN_STORE"] = obsidian_store
    yield app_obj

    _api_adapter_mod.obsidian_get_file = orig_obsidian_get
    _api_adapter_mod.obsidian_save_file = orig_obsidian_save
    _api_tutor_mod._vault_read_note = orig_tutor_vault_read
    _api_tutor_mod._vault_save_note = orig_tutor_vault_save
    _api_tutor_mod._vault_delete_note = orig_tutor_vault_delete
    config.DB_PATH = orig_config
    db_setup.DB_PATH = orig_db_setup
    _api_data_mod.DB_PATH = orig_api_data
    _api_adapter_mod._SELECTOR_COLS_ENSURED_SESSIONS = False
    _api_tutor_mod._SELECTOR_COLS_ENSURED = False
    if orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = orig_env

    try:
        os.unlink(tmp_path)
    except OSError:
        pass


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


def _create_tutor_session(client, *, topic: str = "Artifact Certification") -> str:
    resp = client.post(
        "/api/tutor/session",
        json={"mode": "Core", "topic": topic},
    )
    assert resp.status_code == 201
    return resp.get_json()["session_id"]


def test_note_card_and_structured_notes_persist_across_end_session(client, app, monkeypatch):
    tutor_sid = _create_tutor_session(client)

    note_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/artifact",
        json={
            "type": "note",
            "title": "Tutor Note",
            "content": "This note should persist to Brain artifacts and quick notes.",
        },
    )
    assert note_resp.status_code == 201

    card_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/artifact",
        json={
            "type": "card",
            "title": "Axon hillock",
            "front": "What happens at the axon hillock?",
            "back": "Action potential initiation when threshold is reached.",
            "tags": "neuro,week7",
        },
    )
    assert card_resp.status_code == 201
    card_id = card_resp.get_json()["card_id"]

    monkeypatch.setattr(
        _api_tutor_mod,
        "_sync_graph_for_paths",
        lambda **_kwargs: {
            "status": "ok",
            "notes_synced": 2,
            "deleted": 0,
            "edges_created": 1,
            "skipped": 0,
            "paths": {},
        },
    )

    finalize_payload = {
        "metadata": {
            "control_stage": "ENCODE",
            "method_id": "M-ENC-004",
            "session_mode": "single_focus",
            "knob_snapshot": {},
        },
        "session": {
            "source_ids": ["material:519"],
            "unknowns": ["[[Neural Crest]]"],
            "follow_up_targets": ["[[Neural Tube]]"],
            "stage_flow": ["ENCODE", "REFERENCE"],
        },
        "concepts": [
            {
                "file_name": "Neural Crest",
                "why_it_matters": "Links embryology to peripheral nervous system development.",
                "prerequisites": ["[[Neurulation]]"],
                "retrieval_targets": ["Name one neural crest derivative."],
                "common_errors": ["Confusing neural crest with neural tube."],
                "next_review_date": None,
                "relationships": [],
            }
        ],
    }

    finalize_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/finalize",
        json={"artifact": finalize_payload},
    )
    assert finalize_resp.status_code == 201
    finalize_data = finalize_resp.get_json()
    assert finalize_data["type"] == "structured_notes"
    assert finalize_data["session_path"]
    assert len(finalize_data["concept_paths"]) == 1

    end_resp = client.post(f"/api/tutor/session/{tutor_sid}/end")
    assert end_resp.status_code == 200
    end_data = end_resp.get_json()
    brain_session_id = end_data["brain_session_id"]
    assert brain_session_id is not None

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        "SELECT title, content, note_type FROM quick_notes WHERE title = ?",
        ("Tutor Note",),
    )
    note_row = cur.fetchone()
    assert note_row is not None
    assert note_row["note_type"] == "tutor"
    assert "persist to Brain" in note_row["content"]

    cur.execute(
        "SELECT tutor_session_id, session_id, front, back, tags, status FROM card_drafts WHERE id = ?",
        (card_id,),
    )
    card_row = cur.fetchone()
    assert card_row is not None
    assert card_row["tutor_session_id"] == tutor_sid
    assert card_row["session_id"] == str(brain_session_id)
    assert card_row["status"] == "draft"
    assert "axon hillock" in card_row["front"].lower()

    cur.execute(
        "SELECT artifacts_json FROM tutor_sessions WHERE session_id = ?",
        (tutor_sid,),
    )
    session_row = cur.fetchone()
    conn.close()

    artifacts = json.loads(session_row["artifacts_json"] or "[]")
    artifact_types = [a.get("type") for a in artifacts if isinstance(a, dict)]
    assert "note" in artifact_types
    assert "card" in artifact_types
    assert "structured_notes" in artifact_types

    store = app.config["TEST_OBSIDIAN_STORE"]
    assert finalize_data["session_path"] in store
    assert finalize_data["concept_paths"][0] in store


def test_artifact_mutations_are_blocked_after_session_end(client):
    tutor_sid = _create_tutor_session(client, topic="Ended Session Guardrail")

    end_resp = client.post(f"/api/tutor/session/{tutor_sid}/end")
    assert end_resp.status_code == 200

    artifact_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/artifact",
        json={"type": "note", "title": "Late Note", "content": "should fail"},
    )
    assert artifact_resp.status_code == 400
    artifact_body = artifact_resp.get_json()
    assert artifact_body["code"] == "SESSION_NOT_ACTIVE"

    finalize_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/finalize",
        json={"artifact": {"metadata": {}, "session": {}, "concepts": []}},
    )
    assert finalize_resp.status_code == 400
    finalize_body = finalize_resp.get_json()
    assert finalize_body["code"] == "SESSION_NOT_ACTIVE"

    sync_resp = client.post(f"/api/tutor/session/{tutor_sid}/sync-graph", json={})
    assert sync_resp.status_code == 400
    sync_body = sync_resp.get_json()
    assert sync_body["code"] == "SESSION_NOT_ACTIVE"
