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
import json
from typing import Any
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
import dashboard.api_data as _api_data_mod
import dashboard.api_adapter as _api_adapter_mod
import dashboard.api_tutor as _api_tutor_mod
import llm_provider
import tutor_context
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
    _orig_obsidian_get = _api_adapter_mod.obsidian_get_file
    _orig_obsidian_save = _api_adapter_mod.obsidian_save_file
    _orig_tutor_vault_read = _api_tutor_mod._vault_read_note
    _orig_tutor_vault_save = _api_tutor_mod._vault_save_note
    _orig_tutor_vault_delete = _api_tutor_mod._vault_delete_note

    map_of_contents_store: dict[str, str] = {}
    map_of_contents_write_calls: list[str] = []

    def _fake_obsidian_get_file(path: str):
        rel_path = _normalize_path(path)
        content = map_of_contents_store.get(rel_path)
        if content is None:
            return {"success": False, "error": "not found"}
        return {"success": True, "content": content, "path": rel_path}

    def _fake_obsidian_save_file(path: str, content: str):
        rel_path = _normalize_path(path)
        map_of_contents_write_calls.append(rel_path)
        map_of_contents_store[rel_path] = content
        return {"success": True, "path": rel_path}

    def _normalize_path(path: str) -> str:
        return str(path or "").replace("\\", "/").strip().lstrip("/")

    def _fake_tutor_vault_read(path: str):
        rel_path = _normalize_path(path)
        content = map_of_contents_store.get(rel_path)
        if content is None:
            return {"success": False, "error": "file not found", "path": rel_path}
        return {"success": True, "content": content, "path": rel_path}

    def _fake_tutor_vault_save(path: str, content: str):
        rel_path = _normalize_path(path)
        map_of_contents_write_calls.append(rel_path)
        map_of_contents_store[rel_path] = content
        return {"success": True, "path": rel_path}

    def _fake_tutor_vault_delete(path: str):
        rel_path = _normalize_path(path)
        map_of_contents_store.pop(rel_path, None)
        return {"success": True, "path": rel_path}

    # Patch module-cached DB paths
    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path
    _api_adapter_mod.obsidian_get_file = _fake_obsidian_get_file
    _api_adapter_mod.obsidian_save_file = _fake_obsidian_save_file
    _api_tutor_mod._vault_read_note = _fake_tutor_vault_read
    _api_tutor_mod._vault_save_note = _fake_tutor_vault_save
    _api_tutor_mod._vault_delete_note = _fake_tutor_vault_delete

    db_setup.init_database()
    db_setup._METHOD_LIBRARY_ENSURED = False
    app_obj = create_app()
    app_obj.config["TESTING"] = True
    app_obj.config["TEST_MAP_OF_CONTENTS_WRITES"] = map_of_contents_write_calls
    app_obj.config["TEST_OBSIDIAN_STORE"] = map_of_contents_store
    yield app_obj

    # Restore environment/module state
    config.DB_PATH = _orig_config
    db_setup.DB_PATH = _orig_db_setup
    _api_data_mod.DB_PATH = _orig_api_data
    _api_adapter_mod.obsidian_get_file = _orig_obsidian_get
    _api_adapter_mod.obsidian_save_file = _orig_obsidian_save
    _api_tutor_mod._vault_read_note = _orig_tutor_vault_read
    _api_tutor_mod._vault_save_note = _orig_tutor_vault_save
    _api_tutor_mod._vault_delete_note = _orig_tutor_vault_delete
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


def _create_tutor_session(
    client,
    *,
    brain_session_id: int | None = None,
    method_chain_id: int | None = None,
) -> str:
    payload: dict[str, Any] = {"mode": "Core", "topic": "Tutor Link Test"}
    if brain_session_id is not None:
        payload["brain_session_id"] = brain_session_id
    if method_chain_id is not None:
        payload["method_chain_id"] = method_chain_id
    resp = client.post("/api/tutor/session", json=payload)
    assert resp.status_code == 201
    data = resp.get_json()
    assert isinstance(data, dict)
    sid = data.get("session_id")
    assert isinstance(sid, str) and sid
    return sid


def _insert_method_block(
    *,
    name: str,
    control_stage: str,
    method_id: str = "",
    facilitation_prompt: str = "Prompt",
    artifact_type: str = "notes",
    knob_overrides_json: str = "{}",
) -> int:
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO method_blocks
            (method_id, name, category, control_stage, description, default_duration_min,
             energy_cost, best_stage, tags, evidence, facilitation_prompt, artifact_type,
             knob_overrides_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        (
            method_id,
            name,
            "prepare",
            control_stage,
            "test block",
            5,
            "low",
            "first_exposure",
            "[]",
            "",
            facilitation_prompt,
            artifact_type,
            knob_overrides_json,
        ),
    )
    last_row_id = cur.lastrowid
    assert last_row_id is not None
    block_id = int(last_row_id)
    conn.commit()
    conn.close()
    return block_id


def _create_chain(client, *, name: str, block_ids: list[int]) -> int:
    chain_resp = client.post(
        "/api/chains",
        json={
            "name": name,
            "description": "test chain",
            "block_ids": block_ids,
            "context_tags": {},
            "is_template": 0,
        },
    )
    assert chain_resp.status_code == 201
    return int(chain_resp.get_json()["id"])


def _extract_done_payload(sse_body: str) -> dict:
    for line in sse_body.splitlines():
        if not line.startswith("data: "):
            continue
        payload = line[6:]
        if payload == "[DONE]":
            continue
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            continue
        if parsed.get("type") == "done":
            return parsed
    return {}


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
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

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


def test_single_focus_session_requires_explicit_focus_objective(client):
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO courses (id, name, code, color, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        """,
        (3, "Neuroscience", "PHYT 6313", "#ff0000"),
    )
    conn.commit()
    conn.close()

    resp = client.post(
        "/api/tutor/session",
        json={
            "course_id": 3,
            "mode": "Core",
            "topic": "Week 7 - Development of Nervous System",
            "module_name": "Week 7 - Development of Nervous System",
            "objective_scope": "single_focus",
            "learning_objectives": [
                {"lo_code": "OBJ-1", "title": "Describe neurulation."},
                {
                    "lo_code": "OBJ-6",
                    "title": "Differentiate neural tube and neural crest derivatives.",
                },
            ],
            "content_filter": {
                "vault_folder": "Courses/Neuroscience/Week 7",
                "objective_scope": "single_focus",
            },
        },
    )

    assert resp.status_code == 400
    body = resp.get_json()
    assert body["code"] == "FOCUS_OBJECTIVE_REQUIRED"
    assert "OBJ-1" in body["objective_ids"]
    assert "OBJ-6" in body["objective_ids"]


def test_reference_bounds_allows_continuation_style_followups():
    allowed = _api_tutor_mod._question_within_reference_targets(
        "Yes. Give me chunk 3 and make the derivative map explicit.",
        ["[[OBJ-6]]", "[[Differentiate embryologic origins of the CNS and PNS]]"],
    )

    assert allowed is True


def test_reference_bounds_rejects_generic_continue_without_target():
    allowed = _api_tutor_mod._question_within_reference_targets(
        "Continue.",
        ["[[OBJ-6]]", "[[Differentiate embryologic origins of the CNS and PNS]]"],
    )

    assert allowed is False


def test_preflight_reports_focus_objective_blocker(client):
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO courses (id, name, code, color, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        """,
        (7, "Neuroscience", "PHYT 6313", "#ff0000"),
    )
    conn.commit()
    conn.close()

    resp = client.post(
        "/api/tutor/session/preflight",
        json={
            "course_id": 7,
            "study_unit": "Week 7 - Development of Nervous System",
            "objective_scope": "single_focus",
            "learning_objectives": [
                {"lo_code": "OBJ-1", "title": "Describe neurulation."},
                {"lo_code": "OBJ-6", "title": "Differentiate neural tube and neural crest derivatives."},
            ],
            "content_filter": {
                "material_ids": [1, 2],
                "vault_folder": "Courses/Neuroscience/Week 7",
            },
        },
    )

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["ok"] is False
    assert any(blocker["code"] == "FOCUS_OBJECTIVE_REQUIRED" for blocker in body["blockers"])
    assert body["map_of_contents"]["path"] == "Courses/Neuroscience/Week 7/_Map of Contents.md"
    assert (
        body["learning_objectives_page"]["path"]
        == "Courses/Neuroscience/Week 7/Learning Objectives & To Do.md"
    )
    assert body["page_sync_result"]["ok"] is True
    assert body["page_sync_result"]["map_of_contents"]["status"] == "test_mode_no_write"
    assert (
        body["page_sync_result"]["learning_objectives_todo"]["status"]
        == "test_mode_no_write"
    )


def test_create_session_requires_preflight_for_objective_scoped_setup(client):
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Week 7 without preflight",
            "focus_objective_id": "OBJ-6",
            "objective_scope": "single_focus",
            "learning_objectives": [
                {"lo_code": "OBJ-6", "title": "Differentiate neural tube and neural crest derivatives."}
            ],
            "content_filter": {
                "material_ids": [11, 12],
                "vault_folder": "Courses/Neuroscience/Week 7",
                "objective_scope": "single_focus",
                "focus_objective_id": "OBJ-6",
            },
        },
    )

    assert resp.status_code == 400
    body = resp.get_json()
    assert body["code"] == "PREFLIGHT_REQUIRED"


def test_preflight_requires_study_unit(client):
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO courses (id, name, code, color, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        """,
        (9, "Neuroscience", "PHYT 6313", "#ff0000"),
    )
    conn.commit()
    conn.close()

    resp = client.post(
        "/api/tutor/session/preflight",
        json={
            "course_id": 9,
            "objective_scope": "module_all",
            "content_filter": {"material_ids": [1]},
        },
    )

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["ok"] is False
    assert any(blocker["code"] == "STUDY_UNIT_REQUIRED" for blocker in body["blockers"])


def test_preflight_blocks_missing_approved_objectives_without_syncing_placeholder_pages(
    client,
):
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO courses (id, name, code, color, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        """,
        (10, "Neuroscience", "PHYT 6313", "#ff0000"),
    )
    conn.commit()
    conn.close()

    resp = client.post(
        "/api/tutor/session/preflight",
        json={
            "course_id": 10,
            "study_unit": "Week 9 - Basal Ganglia",
            "topic": "Stale Topic Should Not Sync",
            "objective_scope": "module_all",
            "content_filter": {
                "material_ids": [1],
                "vault_folder": "Courses/Neuroscience/Week 9",
            },
        },
    )

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["ok"] is False
    assert any(
        blocker["code"] == "APPROVED_OBJECTIVES_REQUIRED"
        for blocker in body["blockers"]
    )
    assert body["page_sync_result"]["ok"] is False
    assert (
        body["page_sync_result"]["map_of_contents"]["status"]
        == "skipped_missing_objectives"
    )
    assert (
        body["page_sync_result"]["learning_objectives_todo"]["status"]
        == "skipped_missing_objectives"
    )


def test_template_chains_endpoint_exposes_certification_metadata(client):
    resp = client.get("/api/tutor/chains/templates")
    assert resp.status_code == 200
    body = resp.get_json()
    assert isinstance(body, list) and body

    top_down = next(
        (item for item in body if item.get("name") == "Top-Down Narrative Mastery"),
        None,
    )
    assert top_down is not None
    assert top_down["template_id"] == "C-TRY-001"
    assert top_down["certification"]["disposition"] == "strict-certification"
    assert top_down["certification"]["gold_standard"] is True


def test_create_session_uses_preflight_bundle(client):
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO courses (id, name, code, color, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        """,
        (8, "Neuroscience", "PHYT 6313", "#ff0000"),
    )
    conn.commit()
    conn.close()

    preflight_resp = client.post(
        "/api/tutor/session/preflight",
        json={
            "course_id": 8,
            "study_unit": "Week 7 - Development of Nervous System",
            "topic": "Week 7 - Development of Nervous System",
            "objective_scope": "single_focus",
            "focus_objective_id": "OBJ-6",
            "learning_objectives": [
                {"lo_code": "OBJ-1", "title": "Describe neurulation.", "group": "Week 7 - Development of Nervous System"},
                {"lo_code": "OBJ-6", "title": "Differentiate neural tube and neural crest derivatives.", "group": "Week 7 - Development of Nervous System"},
            ],
            "content_filter": {
                "material_ids": [11, 12],
                "vault_folder": "Courses/Neuroscience/Week 7",
                "accuracy_profile": "strict",
            },
        },
    )
    assert preflight_resp.status_code == 200
    preflight = preflight_resp.get_json()
    assert preflight["ok"] is True
    assert preflight["map_of_contents"]["follow_up_targets"][0] == "[[OBJ-6]]"
    assert "[[OBJ-UNMAPPED]]" not in preflight["map_of_contents"]["follow_up_targets"]

    session_resp = client.post(
        "/api/tutor/session",
        json={
            "preflight_id": preflight["preflight_id"],
            "mode": "Core",
        },
    )
    assert session_resp.status_code == 201
    body = session_resp.get_json()
    assert body["focus_objective_id"] == "OBJ-6"
    assert body["map_of_contents"]["path"] == "Courses/Neuroscience/Week 7/_Map of Contents.md"
    assert (
        body["learning_objectives_page"]["path"]
        == "Courses/Neuroscience/Week 7/Learning Objectives & To Do.md"
    )
    assert body["page_sync_result"]["ok"] is True

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT content_filter_json FROM tutor_sessions WHERE session_id = ?",
        (body["session_id"],),
    ).fetchone()
    conn.close()
    saved_filter = json.loads(row["content_filter_json"] or "{}")
    assert saved_filter["focus_objective_id"] == "OBJ-6"
    assert saved_filter["vault_folder"] == "Courses/Neuroscience/Week 7"
    assert (
        saved_filter["learning_objectives_page"]["path"]
        == "Courses/Neuroscience/Week 7/Learning Objectives & To Do.md"
    )
    assert saved_filter["page_sync_result"]["ok"] is True
    assert saved_filter["follow_up_targets"][0] == "[[OBJ-6]]"
    assert "[[OBJ-UNMAPPED]]" not in saved_filter["follow_up_targets"]


def test_send_turn_scales_material_retrieval_to_selected_materials(client, monkeypatch):
    material_ids = list(range(1, 31))
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Material K Test",
            "content_filter": {"material_ids": material_ids, "web_search": False},
        },
    )
    assert resp.status_code == 201
    tutor_sid = resp.get_json()["session_id"]

    captured = {"k_materials": None, "material_ids": None}

    def fake_build_context(_question, **kwargs):
        captured["k_materials"] = kwargs.get("k_materials")
        captured["material_ids"] = kwargs.get("material_ids")
        return {
            "materials": "doc 1\n\ndoc 2",
            "instructions": "",
            "notes": "",
            "course_map": "",
            "debug": {},
        }

    monkeypatch.setattr(tutor_context, "build_context", fake_build_context)
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        yield {"type": "delta", "text": "ok"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-k",
            "thread_id": "thread-k",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    turn_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "Use the selected materials"},
    )
    assert turn_resp.status_code == 200
    _ = turn_resp.get_data(as_text=True)

    assert captured["material_ids"] == material_ids
    assert captured["k_materials"] == 34


def test_send_turn_strict_profile_boosts_retrieval_depth(client, monkeypatch):
    material_ids = list(range(1, 21))
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Strict Profile Retrieval Test",
            "content_filter": {
                "material_ids": material_ids,
                "accuracy_profile": "strict",
                "web_search": False,
            },
        },
    )
    assert resp.status_code == 201
    tutor_sid = resp.get_json()["session_id"]

    captured = {"k_materials": None}

    def fake_build_context(_question, **kwargs):
        captured["k_materials"] = kwargs.get("k_materials")
        return {
            "materials": "strict doc",
            "instructions": "",
            "notes": "",
            "course_map": "",
            "debug": {},
        }

    monkeypatch.setattr(tutor_context, "build_context", fake_build_context)
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        yield {"type": "delta", "text": "ok"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-strict",
            "thread_id": "thread-strict",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    turn_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "Use strict profile"},
    )
    assert turn_resp.status_code == 200
    _ = turn_resp.get_data(as_text=True)

    # Base k for 20 selected is 20; strict adds +4.
    assert captured["k_materials"] == 24


def test_send_turn_applies_per_turn_material_override(client, monkeypatch):
    base_ids = [1, 2, 3]
    override_ids = [10, 11]
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Override Test",
            "content_filter": {"material_ids": base_ids, "web_search": False},
        },
    )
    assert resp.status_code == 201
    tutor_sid = resp.get_json()["session_id"]

    captured = {"material_ids": None}

    def fake_build_context(_query, **kwargs):
        captured["material_ids"] = kwargs.get("material_ids")
        return {
            "materials": "",
            "instructions": "",
            "notes": "",
            "course_map": "",
            "debug": {},
        }

    monkeypatch.setattr(tutor_context, "build_context", fake_build_context)
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        yield {"type": "delta", "text": "ok"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-ovr",
            "thread_id": "thread-ovr",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    turn_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={
            "message": "Use just two files",
            "content_filter": {"material_ids": override_ids},
        },
    )
    assert turn_resp.status_code == 200
    _ = turn_resp.get_data(as_text=True)

    assert captured["material_ids"] == override_ids

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT content_filter_json FROM tutor_sessions WHERE session_id = ?",
        (tutor_sid,),
    )
    row = dict(cur.fetchone())
    conn.close()
    saved_filter = json.loads(row["content_filter_json"])
    assert saved_filter.get("material_ids") == override_ids


def test_send_turn_includes_selected_material_scope_in_prompt(client, monkeypatch):
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.executemany(
        """INSERT INTO rag_docs
           (id, title, source_path, content, corpus, enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'materials', 1, datetime('now'), datetime('now'))""",
        [
            (901, "Alpha Notes", "C:/materials/alpha.md", "alpha content"),
            (902, "Beta Notes", "C:/materials/beta.md", "beta content"),
        ],
    )
    conn.commit()
    conn.close()

    selected_ids = [901, 902]
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Prompt Scope Test",
            "content_filter": {"material_ids": selected_ids},
        },
    )
    assert resp.status_code == 201
    tutor_sid = resp.get_json()["session_id"]

    monkeypatch.setattr(
        tutor_context,
        "build_context",
        lambda *_a, **_k: {
            "materials": "",
            "notes": "",
            "course_map": "",
            "debug": {
                "materials": {
                    "mode": "vector_search",
                    "retrieved_chunks": 4,
                    "retrieved_unique_sources": 2,
                    "sources": ["gamma.md", "delta.md"],
                    "top_source": "gamma.md",
                    "top_source_share": 0.5,
                    "candidate_pool_similarity": 12,
                    "candidate_pool_mmr": 6,
                    "candidate_pool_merged": 14,
                    "candidate_pool_after_cap": 10,
                    "candidate_pool_dropped_by_cap": 4,
                }
            },
        },
    )
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

    captured: dict[str, str] = {"system_prompt": ""}

    def fake_stream(system_prompt, _user_prompt, **_kwargs):
        captured["system_prompt"] = system_prompt
        yield {"type": "delta", "text": "ok"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-scope",
            "thread_id": "thread-scope",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    turn_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "What files do you see?"},
    )
    assert turn_resp.status_code == 200
    _ = turn_resp.get_data(as_text=True)

    prompt = captured["system_prompt"]
    assert "Selected Material Scope" in prompt
    assert "Student selected materials for this turn: 2" in prompt
    assert "answer with the selected count above first" in prompt
    assert "Alpha Notes" in prompt
    assert "Beta Notes" in prompt


def test_send_turn_material_count_question_uses_selected_scope(client, monkeypatch):
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.executemany(
        """INSERT INTO rag_docs
           (id, title, source_path, content, corpus, enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'materials', 1, datetime('now'), datetime('now'))""",
        [
            (951, "Gamma Notes", "C:/materials/gamma.md", "gamma content"),
            (952, "Delta Notes", "C:/materials/delta.md", "delta content"),
        ],
    )
    conn.commit()
    conn.close()

    selected_ids = [951, 952]
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Material Count Test",
            "content_filter": {"material_ids": selected_ids},
        },
    )
    assert resp.status_code == 201
    tutor_sid = resp.get_json()["session_id"]

    monkeypatch.setattr(
        tutor_context,
        "build_context",
        lambda *_a, **_k: {
            "materials": "",
            "notes": "",
            "course_map": "",
            "debug": {
                "materials": {
                    "mode": "vector_search",
                    "retrieved_chunks": 4,
                    "retrieved_unique_sources": 2,
                    "sources": ["gamma.md", "delta.md"],
                    "top_source": "gamma.md",
                    "top_source_share": 0.5,
                    "candidate_pool_similarity": 12,
                    "candidate_pool_mmr": 6,
                    "candidate_pool_merged": 14,
                    "candidate_pool_after_cap": 10,
                    "candidate_pool_dropped_by_cap": 4,
                }
            },
        },
    )
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

    stream_calls = {"count": 0}

    def fake_stream(*_args, **_kwargs):
        stream_calls["count"] += 1
        yield {"type": "delta", "text": "llm-stream-should-not-run"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-count",
            "thread_id": "thread-count",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    turn_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "How many files are you using?"},
    )
    assert turn_resp.status_code == 200
    body = turn_resp.get_data(as_text=True)

    assert "You selected 2 files for this turn." in body
    assert "No excerpts were retrieved for this exact question" in body
    assert stream_calls["count"] == 0


def test_send_turn_selected_scope_listing_question_uses_selected_scope(
    client, monkeypatch
):
    selected_ids = [953, 954]
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.executemany(
        """INSERT INTO rag_docs
           (id, title, source_path, content, corpus, enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'materials', 1, datetime('now'), datetime('now'))""",
        [
            (selected_ids[0], "Gamma Notes", "C:/materials/gamma.md", "gamma content"),
            (selected_ids[1], "Delta Notes", "C:/materials/delta.md", "delta content"),
        ],
    )
    conn.commit()
    conn.close()

    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Material Scope Listing Test",
            "content_filter": {"material_ids": selected_ids},
        },
    )
    assert resp.status_code == 201
    tutor_sid = resp.get_json()["session_id"]

    monkeypatch.setattr(
        tutor_context,
        "build_context",
        lambda *_a, **_k: {
            "materials": "",
            "notes": "",
            "course_map": "",
            "debug": {
                "materials": {
                    "mode": "vector_search",
                    "retrieved_chunks": 4,
                    "retrieved_unique_sources": 2,
                    "sources": ["gamma.md", "delta.md"],
                    "top_source": "gamma.md",
                    "top_source_share": 0.5,
                    "candidate_pool_similarity": 12,
                    "candidate_pool_mmr": 6,
                    "candidate_pool_merged": 14,
                    "candidate_pool_after_cap": 10,
                    "candidate_pool_dropped_by_cap": 4,
                }
            },
        },
    )
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

    stream_calls = {"count": 0}

    def fake_stream(*_args, **_kwargs):
        stream_calls["count"] += 1
        yield {"type": "delta", "text": "llm-stream-should-not-run"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-list",
            "thread_id": "thread-list",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    turn_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={
            "message": "List every selected file you can currently access for this turn."
        },
    )
    assert turn_resp.status_code == 200
    body = turn_resp.get_data(as_text=True)

    assert "You selected 2 files for this turn." in body
    assert "No chunks were retrieved for this exact question." in body
    assert "All selected files:" in body
    assert "Gamma Notes" in body
    assert "Delta Notes" in body
    assert stream_calls["count"] == 0


def test_material_context_expands_selected_mp4_to_linked_processed_docs():
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    mp4_id = 3001
    transcript_id = 3002
    cur.executemany(
        """INSERT INTO rag_docs
           (id, title, source_path, content, checksum, metadata_json, corpus, file_type, enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'materials', ?, 1, datetime('now'), datetime('now'))""",
        [
            (
                mp4_id,
                "Lecture Video",
                "C:/materials/lecture.mp4",
                "",
                "checksum-mp4",
                json.dumps({}),
                "mp4",
            ),
            (
                transcript_id,
                "Lecture Transcript",
                "C:/materials/lecture_transcript.md",
                "Transcribed pathway explanation from the processed video.",
                "checksum-transcript",
                json.dumps({"video_material_id": mp4_id, "video_doc_role": "transcript"}),
                "md",
            ),
        ],
    )
    conn.commit()
    conn.close()
    ctx = tutor_context.build_context(
        "Teach me from the selected video only.",
        depth="materials",
        material_ids=[mp4_id],
        k_materials=4,
    )

    assert "lecture_transcript.md" in ctx["materials"]
    assert "Transcribed pathway explanation from the processed video." in ctx["materials"]


def test_material_count_shortcut_does_not_overwrite_last_response_id(
    client, monkeypatch
):
    selected_ids = [951, 952]
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Material Count Continuity",
            "content_filter": {"material_ids": selected_ids},
        },
    )
    assert resp.status_code == 201
    tutor_sid = resp.get_json()["session_id"]

    monkeypatch.setattr(
        tutor_context,
        "build_context",
        lambda *_a, **_k: {
            "materials": "",
            "instructions": "",
            "notes": "",
            "course_map": "",
            "debug": {},
        },
    )
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

    stream_calls = {"count": 0}

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        stream_calls["count"] += 1
        yield {"type": "delta", "text": "normal reply"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-1",
            "thread_id": "thread-1",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    first_turn = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "Teach me one concept"},
    )
    assert first_turn.status_code == 200
    _ = first_turn.get_data(as_text=True)

    second_turn = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "How many files are you using?"},
    )
    assert second_turn.status_code == 200
    body = second_turn.get_data(as_text=True)
    assert "You selected 2 files for this turn." in body
    assert stream_calls["count"] == 1

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT turn_number, response_id FROM tutor_turns WHERE tutor_session_id = ? ORDER BY turn_number",
        (tutor_sid,),
    )
    turns = [dict(r) for r in cur.fetchall()]
    cur.execute(
        "SELECT last_response_id FROM tutor_sessions WHERE session_id = ?",
        (tutor_sid,),
    )
    session_row = dict(cur.fetchone())
    conn.close()

    assert turns[0]["response_id"] == "resp-1"
    assert turns[1]["response_id"] is None
    assert session_row["last_response_id"] == "resp-1"


def test_send_turn_material_scope_overrides_course_filter(client, monkeypatch):
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """INSERT OR IGNORE INTO courses (id, code, name, term, created_at)
           VALUES (123, 'TEST123', 'Test Course 123', 'Test', datetime('now'))"""
    )
    conn.commit()
    conn.close()

    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Cross-course material scope",
            "course_id": 123,
            "content_filter": {"material_ids": [2001, 2002]},
        },
    )
    assert resp.status_code == 201
    tutor_sid = resp.get_json()["session_id"]

    captured: dict[str, object] = {"course_id": "unset", "material_ids": None}

    def fake_build_context(_query, **kwargs):
        captured["course_id"] = kwargs.get("course_id")
        captured["material_ids"] = kwargs.get("material_ids")
        return {
            "materials": "",
            "instructions": "",
            "notes": "",
            "course_map": "",
            "debug": {},
        }

    monkeypatch.setattr(tutor_context, "build_context", fake_build_context)
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        yield {"type": "delta", "text": "ok"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-cross",
            "thread_id": "thread-cross",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    turn_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "Use selected files across courses"},
    )
    assert turn_resp.status_code == 200
    _ = turn_resp.get_data(as_text=True)

    assert captured["course_id"] is None
    assert captured["material_ids"] == [2001, 2002]


def test_send_turn_done_payload_includes_retrieval_debug(client, monkeypatch):
    selected_ids = [951, 952]
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Retrieval Debug Payload",
            "content_filter": {"material_ids": selected_ids},
        },
    )
    assert resp.status_code == 201
    tutor_sid = resp.get_json()["session_id"]

    monkeypatch.setattr(
        tutor_context,
        "build_context",
        lambda *_a, **_k: {
            "materials": "",
            "notes": "",
            "course_map": "",
            "debug": {
                "materials": {
                    "mode": "vector_search",
                    "retrieved_chunks": 4,
                    "retrieved_unique_sources": 2,
                    "sources": ["gamma.md", "delta.md"],
                    "top_source": "gamma.md",
                    "top_source_share": 0.5,
                    "candidate_pool_similarity": 12,
                    "candidate_pool_mmr": 6,
                    "candidate_pool_merged": 14,
                    "candidate_pool_after_cap": 10,
                    "candidate_pool_dropped_by_cap": 4,
                }
            },
        },
    )
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        yield {"type": "delta", "text": "[Source: C:/materials/gamma.md]"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-debug",
            "thread_id": "thread-debug",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    turn_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "Give me one cited point"},
    )
    assert turn_resp.status_code == 200
    body = turn_resp.get_data(as_text=True)
    done_payload = _extract_done_payload(body)
    debug = done_payload.get("retrieval_debug")
    assert isinstance(debug, dict)
    assert debug["material_ids_provided"] is True
    assert debug["material_ids_count"] == 2
    assert debug["selected_material_count"] == 2
    assert debug["material_k"] == 10
    assert debug["material_retrieval_mode"] == "vector_search"
    assert debug["retrieved_material_chunks"] == 4
    assert debug["retrieved_material_unique_sources"] == 2
    assert debug["retrieved_material_sources"] == ["gamma.md", "delta.md"]
    assert debug["citations_total"] >= 1
    assert debug["citations_unique_sources"] >= 1
    assert debug["accuracy_profile"] == "strict"
    assert 0.0 <= debug["material_top_source_share"] <= 1.0
    assert "material_dropped_by_cap" in debug
    assert 0.0 <= debug["retrieval_confidence"] <= 1.0
    assert debug["retrieval_confidence_tier"] in ("low", "medium", "high")


def test_material_count_shortcut_done_payload_includes_retrieval_debug(
    client, monkeypatch
):
    selected_ids = [951, 952]
    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": "Retrieval Debug Count Shortcut",
            "content_filter": {"material_ids": selected_ids},
        },
    )
    assert resp.status_code == 201
    tutor_sid = resp.get_json()["session_id"]

    monkeypatch.setattr(
        tutor_context,
        "build_context",
        lambda *_a, **_k: {
            "materials": "",
            "notes": "",
            "course_map": "",
            "debug": {
                "materials": {
                    "mode": "full_content",
                    "retrieved_chunks": 2,
                    "retrieved_unique_sources": 2,
                    "sources": ["alpha.pdf", "beta.pdf"],
                    "top_source": "alpha.pdf",
                    "top_source_share": 0.5,
                }
            },
        },
    )
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )
    monkeypatch.setattr(
        llm_provider,
        "stream_chatgpt_responses",
        lambda *_a, **_k: iter(()),
    )

    turn_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "How many files are you using?"},
    )
    assert turn_resp.status_code == 200
    body = turn_resp.get_data(as_text=True)
    done_payload = _extract_done_payload(body)
    debug = done_payload.get("retrieval_debug")
    assert isinstance(debug, dict)
    assert debug["material_ids_provided"] is True
    assert debug["material_ids_count"] == 2
    assert debug["selected_material_count"] == 2
    assert debug["material_retrieval_mode"] == "full_content"
    assert debug["retrieved_material_chunks"] == 2
    assert debug["retrieved_material_unique_sources"] == 2
    assert debug["citations_total"] == 0
    assert debug["citations_unique_sources"] == 0
    assert debug["accuracy_profile"] == "strict"
    assert "material_dropped_by_cap" in debug
    assert 0.0 <= debug["retrieval_confidence"] <= 1.0


def test_finalize_structured_notes_writes_obsidian_and_artifact_index(
    client, app, monkeypatch
):
    tutor_sid = _create_tutor_session(client)

    monkeypatch.setattr(
        _api_tutor_mod,
        "_sync_graph_for_paths",
        lambda **_kwargs: {
            "status": "ok",
            "notes_synced": 2,
            "deleted": 0,
            "edges_created": 3,
            "skipped": 0,
            "paths": {},
        },
    )

    payload = {
        "metadata": {
            "control_stage": "PRIME",
            "method_id": "M-PRE-010",
            "session_mode": "single_focus",
            "knob_snapshot": {},
        },
        "session": {
            "source_ids": ["src-1"],
            "unknowns": ["[[Unknown Concept]]"],
            "follow_up_targets": ["[[Follow Up Concept]]"],
            "stage_flow": ["PRIME", "CALIBRATE"],
        },
        "concepts": [
            {
                "file_name": "Action Potential",
                "why_it_matters": "Core mechanism in neuro and muscle physiology.",
                "prerequisites": ["[[Membrane Potential]]"],
                "retrieval_targets": ["Define depolarization sequence."],
                "common_errors": ["Confusing depolarization with repolarization."],
                "next_review_date": None,
                "relationships": [
                    {
                        "target_concept": "[[Depolarization]]",
                        "relationship_type": "part_of",
                    }
                ],
            }
        ],
    }

    resp = client.post(
        f"/api/tutor/session/{tutor_sid}/finalize",
        json={"artifact": payload},
    )
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["type"] == "structured_notes"
    assert isinstance(data.get("session_path"), str) and data["session_path"]
    assert (
        isinstance(data.get("concept_paths"), list) and len(data["concept_paths"]) == 1
    )
    assert data["graph_sync"]["notes_synced"] == 2

    store = app.config.get("TEST_OBSIDIAN_STORE") or {}
    assert data["session_path"] in store
    assert data["concept_paths"][0] in store

    session_resp = client.get(f"/api/tutor/session/{tutor_sid}")
    assert session_resp.status_code == 200
    session_data = session_resp.get_json()
    artifacts = session_data.get("artifacts_json")
    if isinstance(artifacts, str):
        artifacts = json.loads(artifacts)
    assert isinstance(artifacts, list)
    assert any(
        a.get("type") == "structured_notes" for a in artifacts if isinstance(a, dict)
    )


def test_finalize_rejects_invalid_single_focus_concept_count(client):
    tutor_sid = _create_tutor_session(client)
    invalid_payload = {
        "metadata": {
            "control_stage": "ENCODE",
            "method_id": "M-ENC-004",
            "session_mode": "single_focus",
            "knob_snapshot": {},
        },
        "session": {
            "source_ids": [],
            "unknowns": [],
            "follow_up_targets": [],
            "stage_flow": ["ENCODE"],
        },
        "concepts": [
            {
                "file_name": "Concept A",
                "why_it_matters": "A",
                "prerequisites": [],
                "retrieval_targets": [],
                "common_errors": [],
                "next_review_date": None,
                "relationships": [],
            },
            {
                "file_name": "Concept B",
                "why_it_matters": "B",
                "prerequisites": [],
                "retrieval_targets": [],
                "common_errors": [],
                "next_review_date": None,
                "relationships": [],
            },
        ],
    }
    resp = client.post(
        f"/api/tutor/session/{tutor_sid}/finalize",
        json={"artifact": invalid_payload},
    )
    assert resp.status_code == 400
    body = resp.get_json()
    assert body["error"] == "validation_failed"
    assert any(
        "session_mode 'single_focus'" in detail for detail in body.get("details", [])
    )


def test_finalize_rejects_prime_confidence_fields(client):
    tutor_sid = _create_tutor_session(client)
    payload = {
        "metadata": {
            "control_stage": "PRIME",
            "method_id": "M-PRE-010",
            "session_mode": "single_focus",
            "knob_snapshot": {"confidence_score": 0.0},
        },
        "session": {
            "source_ids": ["src-1"],
            "unknowns": [],
            "follow_up_targets": [],
            "stage_flow": ["PRIME"],
        },
        "concepts": [
            {
                "file_name": "Prime Concept",
                "why_it_matters": "Prime guardrail test.",
                "prerequisites": [],
                "retrieval_targets": [],
                "common_errors": [],
                "next_review_date": None,
                "relationships": [],
            }
        ],
    }

    resp = client.post(
        f"/api/tutor/session/{tutor_sid}/finalize",
        json={"artifact": payload},
    )
    assert resp.status_code == 400
    body = resp.get_json()
    assert body["error"] == "validation_failed"
    assert any("prime_guardrail" in detail for detail in body.get("details", []))


def test_send_turn_blocks_prime_evaluate_mode(client):
    method_resp = client.post(
        "/api/methods",
        json={"name": "Prime Guard Test Method", "category": "prepare"},
    )
    assert method_resp.status_code == 201
    method_id = int(method_resp.get_json()["id"])

    chain_resp = client.post(
        "/api/chains",
        json={
            "name": "Prime Guard Test Chain",
            "description": "Prime-first chain for guardrail test",
            "block_ids": [method_id],
            "context_tags": {},
            "is_template": 0,
        },
    )
    assert chain_resp.status_code == 201
    chain_id = int(chain_resp.get_json()["id"])

    tutor_sid = _create_tutor_session(client, method_chain_id=chain_id)

    resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "Please evaluate me", "behavior_override": "evaluate"},
    )
    assert resp.status_code == 400
    body = resp.get_json()
    assert body["code"] == "PRIME_ASSESSMENT_BLOCKED"
    assert body["active_stage"] == "PRIME"


def test_create_session_rejects_chain_not_starting_prime(client):
    block_id = _insert_method_block(
        name="Chain Start Not Prime",
        control_stage="ENCODE",
        method_id="M-ENC-001",
    )
    chain_id = _create_chain(client, name="Bad Start Chain", block_ids=[block_id])
    resp = client.post(
        "/api/tutor/session",
        json={"mode": "Core", "topic": "bad start", "method_chain_id": chain_id},
    )
    assert resp.status_code == 400
    body = resp.get_json()
    assert body["code"] == "CHAIN_PRIME_REQUIRED"


def test_create_session_rejects_stage_method_mismatch(client):
    block_id = _insert_method_block(
        name="Stage Mismatch Block",
        control_stage="PRIME",
        method_id="M-CAL-001",
        facilitation_prompt="Prompt",
        artifact_type="notes",
    )
    chain_id = _create_chain(client, name="Mismatch Chain", block_ids=[block_id])
    resp = client.post(
        "/api/tutor/session",
        json={"mode": "Core", "topic": "mismatch", "method_chain_id": chain_id},
    )
    assert resp.status_code == 400
    body = resp.get_json()
    assert body["code"] == "METHOD_STAGE_MISMATCH"
    assert isinstance(body.get("details"), list)
    assert body["details"][0]["method_id"] == "M-CAL-001"


def test_send_turn_autofills_missing_knob_snapshot_and_reports_drift(
    client, monkeypatch
):
    block_id = _insert_method_block(
        name="Prime Drift Autofill",
        control_stage="PRIME",
        method_id="M-PRE-010",
        facilitation_prompt="prompt from db",
        artifact_type="notes",
        knob_overrides_json="{}",
    )
    chain_id = _create_chain(
        client, name="Prime Drift Autofill Chain", block_ids=[block_id]
    )
    tutor_sid = _create_tutor_session(client, method_chain_id=chain_id)

    monkeypatch.setattr(
        tutor_context,
        "build_context",
        lambda *_a, **_k: {
            "materials": "",
            "instructions": "",
            "notes": "",
            "course_map": "",
            "debug": {},
        },
    )
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])
    monkeypatch.setattr(
        tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True}
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        yield {"type": "delta", "text": "ok"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-1",
            "thread_id": "thread-1",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "prime turn"},
    )
    assert resp.status_code == 200
    done = _extract_done_payload(resp.get_data(as_text=True))
    retrieval_debug = done.get("retrieval_debug") or {}
    drift_events = retrieval_debug.get("runtime_drift_events") or []
    assert any(
        event.get("code") == "MISSING_KNOB_SNAPSHOT_FILLED" for event in drift_events
    )
    assert retrieval_debug.get("active_method_id") == "M-PRE-010"

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT content_filter_json FROM tutor_sessions WHERE session_id = ?",
        (tutor_sid,),
    )
    row = cur.fetchone()
    conn.close()
    assert row is not None
    content_filter = json.loads(row["content_filter_json"] or "{}")
    assert isinstance(content_filter.get("knob_snapshot"), dict)


def test_send_turn_blocks_when_prompt_and_artifact_contract_missing(
    client, monkeypatch
):
    block_id = _insert_method_block(
        name="Prime Contract Missing",
        control_stage="PRIME",
        method_id="M-PRE-010",
        facilitation_prompt="",
        artifact_type="",
    )
    chain_id = _create_chain(
        client, name="Prime Contract Missing Chain", block_ids=[block_id]
    )
    tutor_sid = _create_tutor_session(client, method_chain_id=chain_id)

    monkeypatch.setattr(_api_tutor_mod, "_load_method_contracts", lambda: {})

    resp = client.post(
        f"/api/tutor/session/{tutor_sid}/turn",
        json={"message": "prime turn"},
    )
    assert resp.status_code == 409
    body = resp.get_json()
    assert body["code"] == "METHOD_CONTRACT_DRIFT"
    assert "missing_method_prompt" in body.get("critical_issues", [])
    assert "missing_artifact_contract" in body.get("critical_issues", [])


def test_sync_graph_uses_session_artifact_paths(client, monkeypatch):
    tutor_sid = _create_tutor_session(client)
    payload = {
        "metadata": {
            "control_stage": "REFERENCE",
            "method_id": "M-REF-003",
            "session_mode": "single_focus",
            "knob_snapshot": {},
        },
        "session": {
            "source_ids": ["s1"],
            "unknowns": [],
            "follow_up_targets": ["[[Target X]]"],
            "stage_flow": ["REFERENCE"],
        },
        "concepts": [
            {
                "file_name": "Concept Sync",
                "why_it_matters": "sync test",
                "prerequisites": [],
                "retrieval_targets": ["What is Concept Sync?"],
                "common_errors": [],
                "next_review_date": None,
                "relationships": [],
            }
        ],
    }

    monkeypatch.setattr(
        _api_tutor_mod,
        "_sync_graph_for_paths",
        lambda **kwargs: {
            "status": "ok",
            "notes_synced": len(kwargs.get("notes_by_path", {})),
            "deleted": 0,
            "edges_created": 1,
            "skipped": 0,
            "paths": {},
        },
    )

    finalize_resp = client.post(
        f"/api/tutor/session/{tutor_sid}/finalize",
        json={"artifact": payload},
    )
    assert finalize_resp.status_code == 201
    sync_resp = client.post(f"/api/tutor/session/{tutor_sid}/sync-graph", json={})
    assert sync_resp.status_code == 200
    sync_data = sync_resp.get_json()
    assert sync_data["session_id"] == tutor_sid
    assert isinstance(sync_data.get("synced_paths"), list)
    assert len(sync_data["synced_paths"]) >= 2
    assert sync_data["graph_sync"]["notes_synced"] >= 2


def test_testing_mode_blocks_map_of_contents_writes(app):
    writes = app.config.get("TEST_MAP_OF_CONTENTS_WRITES") or []
    normalized = [str(w).replace("\\", "/") for w in writes]
    assert all(not w.endswith("/Map of Contents.md") for w in normalized)
