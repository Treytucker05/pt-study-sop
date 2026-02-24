"""Tests that send_turn respects mode flags from request body."""
from __future__ import annotations

import json
import os
import sys
import tempfile

import pytest
from unittest.mock import patch

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
    """Isolated temp DB for mode-flag tests."""
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
def seed_session(client):
    """Create a real active tutor session and return its ID."""
    resp = client.post(
        "/api/tutor/session",
        data=json.dumps({"mode": "Core", "topic": "Shoulder Anatomy"}),
        content_type="application/json",
    )
    assert resp.status_code == 201, f"Session create failed: {resp.get_json()}"
    return resp.get_json()["session_id"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_turn_body(mode: dict) -> dict:
    return {
        "message": "What is the supraspinatus?",
        "content_filter": {"material_ids": [], "accuracy_profile": "standard"},
        "mode": mode,
    }


def _post_turn(client, session_id: str, mode: dict):
    """POST a turn and consume the SSE stream, returning the response."""
    return client.post(
        f"/api/tutor/session/{session_id}/turn",
        data=json.dumps(_make_turn_body(mode)),
        content_type="application/json",
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@patch("llm_provider.stream_chatgpt_responses")
@patch("tutor_rag.get_dual_context")
def test_chat_only_skips_rag(mock_rag, mock_stream, client, seed_session):
    """mode.materials=False must not call get_dual_context."""
    mock_stream.return_value = iter([{"type": "done", "usage": {}}])

    _post_turn(
        client,
        seed_session,
        {"materials": False, "obsidian": False, "web_search": False, "deep_think": False},
    )

    mock_rag.assert_not_called()


@patch("llm_provider.stream_chatgpt_responses")
def test_chat_only_uses_spark_model(mock_stream, client, seed_session):
    """Chat-only mode must use gpt-5.3-codex-spark."""
    mock_stream.return_value = iter([{"type": "done", "usage": {}}])

    _post_turn(
        client,
        seed_session,
        {"materials": False, "obsidian": False, "web_search": False, "deep_think": False},
    )

    call_kwargs = mock_stream.call_args.kwargs
    assert call_kwargs["model"] == "gpt-5.3-codex-spark"
    assert call_kwargs.get("reasoning_effort") is None
    assert call_kwargs["web_search"] is False


@patch("llm_provider.stream_chatgpt_responses")
def test_deep_think_uses_full_model_and_high_reasoning(mock_stream, client, seed_session):
    """Deep Think must use gpt-5.3-codex with reasoning_effort='high'."""
    mock_stream.return_value = iter([{"type": "done", "usage": {}}])

    _post_turn(
        client,
        seed_session,
        {"materials": False, "obsidian": False, "web_search": False, "deep_think": True},
    )

    call_kwargs = mock_stream.call_args.kwargs
    assert call_kwargs["model"] == "gpt-5.3-codex"
    assert call_kwargs["reasoning_effort"] == "high"


@patch("llm_provider.stream_chatgpt_responses")
def test_web_search_flag_passes_through(mock_stream, client, seed_session):
    """mode.web_search=True must set web_search=True on the LLM call."""
    mock_stream.return_value = iter([{"type": "done", "usage": {}}])

    _post_turn(
        client,
        seed_session,
        {"materials": False, "obsidian": False, "web_search": True, "deep_think": False},
    )

    call_kwargs = mock_stream.call_args.kwargs
    assert call_kwargs["web_search"] is True


@patch("llm_provider.stream_chatgpt_responses")
@patch("tutor_rag.search_notes_prioritized")
@patch("tutor_rag.get_dual_context")
def test_legacy_no_mode_uses_full_model_and_rag(mock_get_dual, mock_search_notes, mock_stream, client, seed_session):
    """When no mode key is sent, legacy callers get full model + RAG (backward compat)."""
    mock_get_dual.return_value = {"materials": [], "instructions": []}
    mock_search_notes.return_value = []
    mock_stream.return_value = iter([{"type": "done", "usage": {}}])

    # No "mode" key — old-style request
    body = {
        "message": "What is the supraspinatus?",
        "content_filter": {"material_ids": [], "accuracy_profile": "standard"},
    }

    client.post(
        f"/api/tutor/session/{seed_session}/turn",
        data=json.dumps(body),
        content_type="application/json",
    )

    call_kwargs = mock_stream.call_args.kwargs
    assert call_kwargs["model"] == "gpt-5.3-codex"
    assert call_kwargs.get("reasoning_effort") == "high"
    mock_get_dual.assert_called()
