"""Regression tests for the 2026-04-22 Tutor full-audit Track A (P0 correctness + security).

Each test targets a specific audit bug ID. Tests are written to FAIL against the
pre-remediation code and PASS once the matching minimal fix is applied.

Bug IDs mirror `docs/root/TUTOR_TODO.md` audit entry dated 2026-04-22.
"""
from __future__ import annotations

import io
import json
import logging
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
import dashboard.api_data as _api_data_mod
import dashboard.api_tutor as _api_tutor_mod
import dashboard.api_tutor_turns as _api_tutor_turns_mod
import llm_provider
import tutor_context
import tutor_tools


# ---------------------------------------------------------------------------
# Module-scoped Flask app backed by an isolated temp SQLite DB
# ---------------------------------------------------------------------------


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
        json={"mode": "Core", "topic": "Tutor Audit P0"},
    )
    assert resp.status_code == 201
    body = resp.get_json()
    return body["session_id"]


def _parse_sse_events(raw: str):
    events = []
    for line in raw.splitlines():
        if not line.startswith("data: "):
            continue
        payload = line[6:]
        if payload == "[DONE]":
            events.append(payload)
            continue
        try:
            events.append(json.loads(payload))
        except json.JSONDecodeError:
            events.append({"_raw": payload})
    return events


# ---------------------------------------------------------------------------
# B3: `adaptive_conn` must be safely initialized before the outer try so the
#     finally-block cleanup never raises UnboundLocalError when `build_context`
#     (or any other early step) throws.
# ---------------------------------------------------------------------------


def test_b3_adaptive_conn_uninitialized_does_not_mask_real_error(
    client, monkeypatch, caplog
):
    session_id = _create_tutor_session(client)

    def boom(*_a, **_k):
        raise RuntimeError("context-retrieval exploded")

    monkeypatch.setattr(tutor_context, "build_context", boom)
    monkeypatch.setattr(tutor_tools, "get_tool_schemas", lambda: [])

    with caplog.at_level(logging.DEBUG, logger="dashboard.api_tutor_turns"):
        resp = client.post(
            f"/api/tutor/session/{session_id}/turn",
            json={"message": "Does adaptive_conn survive a build_context crash?"},
        )
    assert resp.status_code == 200
    events = _parse_sse_events(resp.get_data(as_text=True))
    assert events[-1] == "[DONE]"

    error_events = [e for e in events if isinstance(e, dict) and e.get("type") == "error"]
    assert len(error_events) == 1, f"expected one error frame, got: {error_events!r}"
    assert "context-retrieval exploded" in (error_events[0].get("content") or "")

    # Asserting on the remediation: once adaptive_conn is pre-initialised to
    # None, no log record should complain about an unbound reference.
    unbound_hits = [
        r for r in caplog.records
        if "UnboundLocalError" in (r.getMessage() or "")
        or (
            "adaptive_conn" in (r.getMessage() or "").lower()
            and "referenced before assignment" in (r.getMessage() or "")
        )
    ]
    assert unbound_hits == [], f"adaptive_conn leaked a NameError: {unbound_hits!r}"


# ---------------------------------------------------------------------------
# B2 / B6: tutor_turns persistence failure and tutor_accuracy_log insert
#         failure must both log at WARNING or higher. Previously the turn
#         persistence swallowed with a bare `except: pass` and the accuracy
#         log emitted only at DEBUG, making silent data loss invisible.
# ---------------------------------------------------------------------------


def test_b2_b6_persistence_failures_log_at_warning(client, monkeypatch, caplog):
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
    monkeypatch.setattr(tutor_tools, "execute_tool", lambda *_a, **_k: {"success": True})

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        yield {"type": "delta", "text": "ok"}
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-b2",
            "thread_id": "thread-b2",
        }

    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", fake_stream)

    # Force the post-stream DB path to blow up right at INSERT time so we
    # exercise the outer persistence try/except and confirm a WARNING lands.
    class _ExplodingCursor:
        def execute(self, *_a, **_k):
            raise sqlite3.OperationalError("persistence-path boom")

        def close(self):
            pass

    class _ExplodingConn:
        def cursor(self):
            return _ExplodingCursor()

        def commit(self):
            pass

        def close(self):
            pass

    # Only break the second `get_connection()` usage (the persistence block).
    real_get_connection = _api_tutor_turns_mod.get_connection
    calls = {"n": 0}

    def flaky_get_connection():
        calls["n"] += 1
        # The generator opens several connections before the persistence
        # block; break only the persistence-time ones by biasing toward
        # late calls. In practice one of these WILL be the persistence conn.
        if calls["n"] >= 3:
            return _ExplodingConn()
        return real_get_connection()

    monkeypatch.setattr(_api_tutor_turns_mod, "get_connection", flaky_get_connection)

    with caplog.at_level(logging.WARNING, logger="dashboard.api_tutor_turns"):
        resp = client.post(
            f"/api/tutor/session/{session_id}/turn",
            json={"message": "persistence-fault injection"},
        )
    assert resp.status_code == 200
    # The stream must still complete even though persistence blew up.
    events = _parse_sse_events(resp.get_data(as_text=True))
    assert events[-1] == "[DONE]"

    persistence_warnings = [
        r for r in caplog.records
        if r.levelno >= logging.WARNING
        and "persist tutor turn" in (r.getMessage() or "").lower()
    ]
    assert persistence_warnings, (
        "expected at least one WARNING-level log when tutor turn persistence "
        f"fails; got records={[r.getMessage() for r in caplog.records]!r}"
    )


# ---------------------------------------------------------------------------
# B5: stream_chatgpt_responses must not emit the same tool_call twice.
#     response.function_call_arguments.done + response.completed currently
#     produce a duplicate tool_call chunk for the same call_id.
# ---------------------------------------------------------------------------


class _FakeResponse:
    """Minimal urllib3-style response that yields SSE bytes for stream_chatgpt_responses."""

    def __init__(self, lines):
        self._lines = list(lines)
        self.status = 200

    def __iter__(self):
        return iter(self._lines)

    def readline(self):
        if not self._lines:
            return b""
        return self._lines.pop(0)

    def read(self, *_a, **_k):
        out = b"".join(self._lines)
        self._lines = []
        return out

    def close(self):
        pass


def test_b5_stream_chatgpt_responses_dedupes_tool_calls(monkeypatch):
    """Same call_id emitted on both `function_call_arguments.done` and the
    `response.completed` output scan must only produce ONE tool_call chunk."""
    call_id = "call-abc-123"

    def _line(obj: dict) -> bytes:
        return f"data: {json.dumps(obj)}\n".encode()

    lines = [
        _line({
            "type": "response.function_call_arguments.done",
            "name": "mock_lookup",
            "arguments": "{\"topic\":\"hip\"}",
            "call_id": call_id,
        }),
        _line({
            "type": "response.completed",
            "response": {
                "id": "resp-dup",
                "model": "gpt-5.3-codex",
                "output": [
                    {
                        "type": "function_call",
                        "name": "mock_lookup",
                        "arguments": "{\"topic\":\"hip\"}",
                        "call_id": call_id,
                    }
                ],
                "usage": {"input_tokens": 1, "output_tokens": 1},
            },
        }),
        b"data: [DONE]\n",
    ]

    fake_resp = _FakeResponse(lines)

    class _Conn:
        def __init__(self, *_a, **_k):
            pass

        def request(self, *_a, **_k):
            pass

        def getresponse(self):
            return fake_resp

        def close(self):
            pass

    # stream_chatgpt_responses uses `http.client.HTTPSConnection` internally;
    # patch it to return our fake SSE stream.
    import http.client
    monkeypatch.setattr(http.client, "HTTPSConnection", _Conn)
    monkeypatch.setattr(http.client, "HTTPConnection", _Conn)

    # Ensure an API key is present so the function does not short-circuit.
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-dedup")

    from llm_provider import stream_chatgpt_responses

    chunks = list(stream_chatgpt_responses(
        "system", "user", model="gpt-5.3-codex", tools=[{"type": "function", "name": "mock_lookup"}]
    ))
    tool_calls = [c for c in chunks if c.get("type") == "tool_call"]
    call_ids = [c.get("call_id") for c in tool_calls]
    assert call_ids.count(call_id) == 1, (
        f"expected tool_call {call_id!r} emitted once, got {call_ids!r}"
    )


# ---------------------------------------------------------------------------
# SEC1 / B1: get_material_file must refuse to serve files outside the allowed
#            uploads/extracted-images roots, even if the DB row claims they are.
# ---------------------------------------------------------------------------


def test_sec1_get_material_file_blocks_path_traversal(app, client, tmp_path):
    rogue = tmp_path / "rogue_secret.txt"
    rogue.write_text("SECRET-FILE-MUST-NOT-LEAK", encoding="utf-8")

    conn = db_setup.get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO rag_docs (source_path, file_path, content, corpus, created_at)
           VALUES (?, ?, ?, 'materials', datetime('now'))""",
        (str(rogue), str(rogue), "rogue material"),
    )
    material_id = cur.lastrowid
    conn.commit()
    conn.close()

    resp = client.get(f"/api/tutor/materials/{material_id}/file")

    assert resp.status_code in (403, 404), (
        f"path traversal must not succeed, got status {resp.status_code} "
        f"body={resp.get_data(as_text=True)[:200]!r}"
    )
    assert b"SECRET-FILE-MUST-NOT-LEAK" not in resp.get_data(), (
        "get_material_file leaked a file outside the allowed uploads root"
    )


# ---------------------------------------------------------------------------
# B9: accuracy-profile must not return HTTP 500 when `limit` is non-numeric.
# ---------------------------------------------------------------------------


def test_b9_accuracy_profile_limit_non_numeric_is_400_or_default(client):
    resp = client.get("/api/tutor/accuracy-profile?limit=not-a-number")
    # Accept either a clean 400 (validated) or a 200 with defaulted limit.
    # A 500 means `int('not-a-number')` still escapes unhandled.
    assert resp.status_code in (200, 400), (
        f"non-numeric limit must not 500; got {resp.status_code} "
        f"body={resp.get_data(as_text=True)[:200]!r}"
    )


# ---------------------------------------------------------------------------
# S1: tutor_turns schema must not reference the dropped `topics` table and
#     must index the `tutor_session_id` column used by newer code.
# ---------------------------------------------------------------------------


def test_s1_tutor_turns_schema_is_clean(tmp_path):
    """Build a fresh DB by driving ``init_database`` with a scoped DB_PATH swap
    and assert the post-remediation invariants on `tutor_turns`.
    """
    db_file = str(tmp_path / "schema_s1.db")
    orig_config = config.DB_PATH
    orig_db_setup = db_setup.DB_PATH
    config.DB_PATH = db_file
    db_setup.DB_PATH = db_file
    try:
        db_setup.init_database()
    finally:
        config.DB_PATH = orig_config
        db_setup.DB_PATH = orig_db_setup

    conn = sqlite3.connect(db_file)
    cur = conn.cursor()

    cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='tutor_turns'")
    row = cur.fetchone()
    assert row is not None, "tutor_turns table is missing"
    create_sql = (row[0] or "").lower()
    assert "references topics" not in create_sql, (
        "tutor_turns still declares a FOREIGN KEY to the dropped `topics` table"
    )

    cur.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='tutor_turns'"
    )
    index_names = {r[0] for r in cur.fetchall()}
    assert "idx_tutor_turns_tutor_session_id" in index_names, (
        f"missing idx_tutor_turns_tutor_session_id; present indices: {index_names!r}"
    )

    conn.close()


# ---------------------------------------------------------------------------
# R1: verdict parser must cope with verdict JSON that embeds '}' or the
#     literal '-->' inside string values.
# ---------------------------------------------------------------------------


def test_r1_verdict_parser_handles_nested_braces_in_strings():
    from tutor_verdict import parse_verdict

    raw = (
        "Good job.\n\n"
        '<!-- VERDICT_JSON: {"verdict":"pass",'
        '"why_wrong":"contains } and --> inside string",'
        '"error_location":{"type":"concept","node":"Starling Law"},'
        '"next_hint":"h","next_question":"q","confidence":0.82,'
        '"citations":["ref-1"]} -->'
    )

    result = parse_verdict(raw)
    assert result is not None, "parser dropped a valid verdict due to embedded } / -->"
    assert result["verdict"] == "pass"
    assert result["error_location"]["node"] == "Starling Law"
    assert "}" in result["why_wrong"]
    assert "-->" in result["why_wrong"]
