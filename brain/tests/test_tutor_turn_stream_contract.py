from __future__ import annotations

import json
import os
import sys
import tempfile
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
import dashboard.api_data as _api_data_mod
import dashboard.api_tutor as _api_tutor_mod
import llm_provider
import tutor_context
import tutor_tools


@pytest.fixture(scope="module")
def app():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    orig_env = os.environ.get("PT_STUDY_DB")
    orig_config = config.DB_PATH
    orig_db_setup = db_setup.DB_PATH
    orig_api_data = _api_data_mod.DB_PATH

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path

    db_setup.init_database()
    db_setup._METHOD_LIBRARY_ENSURED = False
    app_obj = create_app()
    app_obj.config["TESTING"] = True
    yield app_obj

    config.DB_PATH = orig_config
    db_setup.DB_PATH = orig_db_setup
    _api_data_mod.DB_PATH = orig_api_data
    if orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = orig_env

    _api_tutor_mod._SELECTOR_COLS_ENSURED = False

    try:
        os.unlink(tmp_path)
    except OSError:
        pass


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


def _create_tutor_session(client) -> str:
    resp = client.post(
        "/api/tutor/session",
        json={"mode": "Core", "topic": "Tutor Stream Contract"},
    )
    assert resp.status_code == 201
    body = resp.get_json()
    assert isinstance(body, dict)
    assert isinstance(body.get("session_id"), str)
    return body["session_id"]


def _parse_sse_events(raw: str) -> list[object]:
    events: list[object] = []
    for line in raw.splitlines():
        if not line.startswith("data: "):
            continue
        payload = line[6:]
        if payload == "[DONE]":
            events.append(payload)
            continue
        events.append(json.loads(payload))
    return events


def test_send_turn_stream_emits_delta_done_and_timing_metadata(client, monkeypatch):
    session_id = _create_tutor_session(client)

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
        tutor_tools,
        "execute_tool",
        lambda *_a, **_k: {"success": True},
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        yield {"type": "delta", "text": "Hello "}
        yield {"type": "delta", "text": "world"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-stream",
            "thread_id": "thread-stream",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    resp = client.post(
        f"/api/tutor/session/{session_id}/turn",
        json={"message": "Give me the big picture overview"},
    )
    assert resp.status_code == 200
    assert resp.mimetype == "text/event-stream"
    cache_control = resp.headers["Cache-Control"]
    assert "no-cache" in cache_control
    assert "no-store" in cache_control
    assert resp.headers["X-Accel-Buffering"] == "no"
    assert resp.headers["Connection"] == "keep-alive"

    events = _parse_sse_events(resp.get_data(as_text=True))
    assert events[-1] == "[DONE]"

    payloads = [event for event in events if isinstance(event, dict)]
    token_events = [event for event in payloads if event.get("type") == "token"]
    assert [event["content"] for event in token_events] == ["Hello ", "world"]

    done_event = next(event for event in payloads if event.get("type") == "done")
    assert done_event["model"] == "gpt-5.3-codex"
    assert isinstance(done_event.get("retrieval_debug"), dict)
    assert done_event["timing"]["tool_rounds"] == 0
    assert done_event["timing"]["total_ms"] >= 0
    assert done_event["timing"]["retrieval_ms"] >= 0
    assert done_event["timing"]["first_chunk_ms"] >= 0


def test_send_turn_stream_emits_tool_round_frames_before_done(client, monkeypatch):
    session_id = _create_tutor_session(client)
    execute_calls: list[tuple[str, dict]] = []

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
    monkeypatch.setattr(
        tutor_tools,
        "get_tool_schemas",
        lambda: [
            {
                "name": "mock_lookup",
                "description": "Mock tool",
                "parameters": {"type": "object", "properties": {}},
            }
        ],
    )

    def fake_execute_tool(name, args, **_kwargs):
        execute_calls.append((name, args))
        return {"success": True, "message": "tool ok"}

    monkeypatch.setattr(tutor_tools, "execute_tool", fake_execute_tool)

    def fake_stream(_system_prompt, _user_prompt, **kwargs):
        if kwargs.get("input_override"):
            yield {"type": "delta", "text": "Tool-assisted answer"}
            yield {
                "type": "done",
                "model": "gpt-5.3-codex",
                "response_id": "resp-round-2",
                "thread_id": "thread-round",
            }
            return
        yield {
            "type": "tool_call",
            "name": "mock_lookup",
            "call_id": "call-1",
            "arguments": json.dumps({"topic": "hip"}),
        }
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-round-1",
            "thread_id": "thread-round",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    resp = client.post(
        f"/api/tutor/session/{session_id}/turn",
        json={"message": "Overview"},
    )
    assert resp.status_code == 200

    events = _parse_sse_events(resp.get_data(as_text=True))
    payloads = [event for event in events if isinstance(event, dict)]
    tool_call_event = next(
        event for event in payloads if event.get("type") == "tool_call"
    )
    tool_result_event = next(
        event for event in payloads if event.get("type") == "tool_result"
    )
    done_event = next(event for event in payloads if event.get("type") == "done")

    assert json.loads(tool_call_event["content"]) == {
        "tool": "mock_lookup",
        "arguments": {"topic": "hip"},
    }
    assert json.loads(tool_result_event["content"]) == {
        "tool": "mock_lookup",
        "success": True,
        "message": "tool ok",
    }
    assert execute_calls == [("mock_lookup", {"topic": "hip"})]
    assert done_event["timing"]["tool_rounds"] == 1
    assert done_event["timing"]["total_ms"] >= done_event["timing"]["first_chunk_ms"]


def test_send_turn_stream_emits_error_frame_and_done_sentinel(client, monkeypatch):
    session_id = _create_tutor_session(client)

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
        tutor_tools,
        "execute_tool",
        lambda *_a, **_k: {"success": True},
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        yield {"type": "delta", "text": "partial"}
        yield {"type": "error", "error": "timed out waiting for provider"}

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    resp = client.post(
        f"/api/tutor/session/{session_id}/turn",
        json={"message": "Overview"},
    )
    assert resp.status_code == 200

    events = _parse_sse_events(resp.get_data(as_text=True))
    assert events[-1] == "[DONE]"
    error_event = next(
        event
        for event in events
        if isinstance(event, dict) and event.get("type") == "error"
    )
    assert error_event["type"] == "error"
    assert "Response timed out." in error_event["content"]


def test_send_turn_stream_emits_sse_heartbeat_comments_while_waiting(
    app, client, monkeypatch
):
    session_id = _create_tutor_session(client)
    app.config["TUTOR_SSE_HEARTBEAT_SECONDS"] = 0.01

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
        tutor_tools,
        "execute_tool",
        lambda *_a, **_k: {"success": True},
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        time.sleep(0.03)
        yield {"type": "delta", "text": "Delayed"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-heartbeat",
            "thread_id": "thread-heartbeat",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    resp = client.post(
        f"/api/tutor/session/{session_id}/turn",
        json={"message": "Overview"},
    )
    assert resp.status_code == 200

    raw = resp.get_data(as_text=True)
    assert ":\n\n" in raw
    events = _parse_sse_events(raw)
    done_event = next(
        event for event in events if isinstance(event, dict) and event.get("type") == "done"
    )
    assert done_event["timing"]["first_chunk_ms"] >= 0
