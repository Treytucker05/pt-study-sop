"""Backend smoke coverage for all selectable template chains."""

from __future__ import annotations

import os
import sys
import tempfile
import uuid

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
import dashboard.api_data as _api_data_mod
import dashboard.api_adapter as _api_adapter_mod
import dashboard.api_tutor as _api_tutor_mod
import llm_provider
import tutor_tools
import tutor_context
import vault_artifact_router


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

    _api_adapter_mod.obsidian_get_file = orig_obsidian_get
    _api_adapter_mod.obsidian_save_file = orig_obsidian_save
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


def _template_chains():
    import sqlite3

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT id, name, context_tags
        FROM method_chains
        WHERE COALESCE(is_template, 0) = 1
        ORDER BY name
        """
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def test_every_template_chain_can_create_status_advance_and_end(client, monkeypatch):
    monkeypatch.setattr(
        tutor_tools,
        "get_tool_schemas",
        lambda: [],
    )
    monkeypatch.setattr(
        tutor_tools,
        "execute_tool",
        lambda *_a, **_k: {"success": True},
    )
    monkeypatch.setattr(
        vault_artifact_router,
        "execute_vault_artifact",
        lambda *_a, **_k: {"success": True, "path": "mocked/path.md"},
    )
    monkeypatch.setattr(
        tutor_context,
        "build_context",
        lambda *_a, **_k: {
            "materials": "",
            "notes": "",
            "vault_state": "",
            "course_map": "",
            "debug": {},
        },
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        yield {"type": "delta", "text": "ok"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-smoke",
            "thread_id": "thread-smoke",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    for chain in _template_chains():
        topic = f"Smoke-{chain['id']}-{uuid.uuid4().hex[:8]}"
        create_resp = client.post(
            "/api/tutor/session",
            json={
                "mode": "Core",
                "topic": topic,
                "method_chain_id": chain["id"],
                "content_filter": {
                    "objective_scope": "module_all",
                    "accuracy_profile": "strict",
                },
            },
        )
        assert create_resp.status_code == 201, f"{chain['name']}: create failed {create_resp.get_json()}"
        session_id = create_resp.get_json()["session_id"]

        status_resp = client.get(f"/api/tutor/session/{session_id}/chain-status")
        assert status_resp.status_code == 200, f"{chain['name']}: chain-status failed"
        status_payload = status_resp.get_json()
        assert status_payload["chain_id"] == chain["id"]
        assert status_payload["total_blocks"] >= 1

        turn_resp = client.post(
            f"/api/tutor/session/{session_id}/turn",
            json={"message": "Give me the next step for this chain."},
        )
        assert turn_resp.status_code == 200, f"{chain['name']}: turn failed"
        body = turn_resp.get_data(as_text=True)
        assert "data:" in body, f"{chain['name']}: turn did not stream SSE"

        advance_resp = client.post(f"/api/tutor/session/{session_id}/advance-block", json={})
        assert advance_resp.status_code in (200, 201), f"{chain['name']}: advance failed {advance_resp.get_json()}"

        end_resp = client.post(f"/api/tutor/session/{session_id}/end")
        assert end_resp.status_code == 200, f"{chain['name']}: end failed {end_resp.get_json()}"
        end_payload = end_resp.get_json()
        assert end_payload["status"] == "completed"
        assert end_payload["summary"]["turn_count"] >= 0


def test_consolidation_chain_is_allowed_to_start_without_prime(client):
    import sqlite3

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT id FROM method_chains WHERE name = ?",
        ("Mastery Review",),
    ).fetchone()
    conn.close()
    assert row is not None

    resp = client.post(
        "/api/tutor/session",
        json={
            "mode": "Core",
            "topic": f"Mastery-Smoke-{uuid.uuid4().hex[:8]}",
            "method_chain_id": row["id"],
            "content_filter": {
                "objective_scope": "module_all",
                "accuracy_profile": "strict",
            },
        },
    )

    assert resp.status_code == 201, resp.get_json()
