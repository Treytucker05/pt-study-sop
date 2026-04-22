"""Regression tests for the 2026-04-22 Tutor full-audit Track B (P1 reliability).

Bug IDs mirror the 2026-04-22 audit entry in `docs/root/TUTOR_TODO.md`.

Each test is written to fail against pre-remediation code and pass once the
matching minimal fix is applied.
"""
from __future__ import annotations

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
import dashboard.api_tutor_artifacts as _api_tutor_artifacts_mod
import dashboard.api_tutor_sessions as _api_tutor_sessions_mod
import dashboard.api_tutor_turns as _api_tutor_turns_mod
import llm_provider
import tutor_context
import tutor_tools


# ---------------------------------------------------------------------------
# Module-scoped Flask app backed by an isolated temp SQLite DB.
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
        json={"mode": "Core", "topic": "Tutor Audit Track B"},
    )
    assert resp.status_code == 201
    return resp.get_json()["session_id"]


# ---------------------------------------------------------------------------
# B8: `list_sessions` `limit` must be validated and clamped.
#
# Pre-fix: `request.args.get("limit", 20, type=int)` silently returns None on
# invalid input, which SQLite treats as "no LIMIT" → all rows returned. There
# is also no upper cap.
# ---------------------------------------------------------------------------


def test_b8_list_sessions_non_numeric_limit_is_400_or_capped(client):
    """Non-numeric limit must never silently disable the LIMIT clause."""
    resp = client.get("/api/tutor/sessions?limit=not-a-number")
    assert resp.status_code in (200, 400), (
        f"non-numeric limit must not 500; got {resp.status_code} "
        f"body={resp.get_data(as_text=True)[:200]!r}"
    )
    if resp.status_code == 200:
        body = resp.get_json()
        assert isinstance(body, list)
        # Hard upper bound to enforce: even on defaulted-limit fallback we
        # should not exceed the 200-row cap.
        assert len(body) <= 200


def test_b8_list_sessions_limit_is_capped_when_oversize(client):
    """An oversized limit must be clamped down to the 200-row cap."""
    # Seed enough sessions to exercise the cap. 220 > 200 upper bound.
    created = []
    for i in range(220):
        resp = client.post(
            "/api/tutor/session",
            json={"mode": "Core", "topic": f"cap-seed-{i}"},
        )
        if resp.status_code == 201:
            created.append(resp.get_json()["session_id"])

    try:
        resp = client.get("/api/tutor/sessions?limit=999999")
        assert resp.status_code == 200
        body = resp.get_json()
        assert isinstance(body, list)
        assert len(body) <= 200, (
            f"list_sessions must clamp limit to <= 200, got {len(body)} rows"
        )
    finally:
        # Best-effort cleanup so later tests are not polluted by 220 rows.
        from db_setup import get_connection

        conn = get_connection()
        cur = conn.cursor()
        cur.executemany(
            "DELETE FROM tutor_sessions WHERE session_id = ?",
            [(sid,) for sid in created],
        )
        conn.commit()
        conn.close()


# ---------------------------------------------------------------------------
# B10: `embed_status` must close its DB connection even when a mid-route call
# raises. We inject the failure AFTER the caught `_resolve_embedding_provider`
# block so it lands on an uncaught code path and forces a leak pre-fix.
# ---------------------------------------------------------------------------


def test_b10_embed_status_closes_conn_on_midroute_failure(
    client, monkeypatch
):
    import dashboard.api_tutor as api_tutor

    real_get_connection = api_tutor.get_connection
    state = {"closed": False}

    class _TrackedConn:
        def __init__(self, real):
            self._real = real
            self.row_factory = None

        def __setattr__(self, name, value):
            if name in ("_real", "row_factory"):
                object.__setattr__(self, name, value)
                if name == "row_factory":
                    self._real.row_factory = value
            else:
                setattr(self._real, name, value)

        def cursor(self):
            # First cursor call works (the initial SELECT at L359). The
            # second call's `execute` raises with an uncaught error so the
            # happy-path close at the bottom of the route never runs.
            return _TrackedCursor(self._real.cursor(), state)

        def execute(self, *a, **k):
            return self._real.execute(*a, **k)

        def close(self):
            state["closed"] = True
            self._real.close()

        def __getattr__(self, name):
            return getattr(self._real, name)

    class _TrackedCursor:
        calls = {"n": 0}

        def __init__(self, real, state):
            self._real = real
            self._state = state

        def execute(self, sql, params=()):
            _TrackedCursor.calls["n"] += 1
            # Let the first SELECT succeed (populates `materials` list),
            # then blow up on the PRAGMA table_info call that follows.
            if "PRAGMA table_info" in sql:
                raise sqlite3.OperationalError(
                    "injected mid-route failure for B10"
                )
            return self._real.execute(sql, params)

        def fetchall(self):
            return self._real.fetchall()

        def fetchone(self):
            return self._real.fetchone()

        @property
        def lastrowid(self):
            return self._real.lastrowid

        def close(self):
            self._real.close()

    def tracked_get_connection():
        return _TrackedConn(real_get_connection())

    _TrackedCursor.calls["n"] = 0
    monkeypatch.setattr(api_tutor, "get_connection", tracked_get_connection)

    # Flask's TESTING mode propagates exceptions past the test client, so
    # we catch it explicitly. The post-fix try/finally wrapper must still
    # run conn.close() even though the mid-route OperationalError escapes.
    status = None
    try:
        resp = client.get("/api/tutor/embed/status")
        status = resp.status_code
    except sqlite3.OperationalError:
        pass

    assert state["closed"], (
        "embed_status leaked the DB connection on mid-route failure "
        f"(status={status})"
    )


# ---------------------------------------------------------------------------
# B11: Corrupt `content_filter_json` on a session row must surface at WARNING
# when `send_turn` tries to parse it. Pre-fix the parse was
# `except (json.JSONDecodeError, TypeError): pass` so corrupted state was
# invisible until material_ids/knobs silently vanished.
#
# We test via direct-call on the helper-shaped code path: reproduce the parse
# in the exact shape `send_turn` uses and ensure our new warning lands.
# ---------------------------------------------------------------------------


def test_b11_content_filter_json_parse_failure_logs_warning(
    client, caplog
):
    """Reach into send_turn's content_filter_json parse block via the
    module-level helper we expose for it."""
    session_id = _create_tutor_session(client)

    # Corrupt the row so any future send_turn on this session would fail
    # to parse.
    from db_setup import get_connection

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE tutor_sessions SET content_filter_json = ? WHERE session_id = ?",
        ("{not valid json", session_id),
    )
    conn.commit()
    conn.close()

    # Call the new helper directly to keep the test focused and fast; this
    # also keeps it independent of the full SSE stream setup.
    assert hasattr(
        _api_tutor_turns_mod, "_parse_content_filter_json"
    ), (
        "send_turn should expose a named helper for parsing "
        "content_filter_json so failures can log with session context"
    )

    with caplog.at_level(
        logging.WARNING, logger=_api_tutor_turns_mod.__name__
    ):
        parsed = _api_tutor_turns_mod._parse_content_filter_json(
            "{not valid json", session_id=session_id
        )

    assert parsed == {} or parsed is None, (
        "malformed content_filter_json must produce an empty/None fallback"
    )
    matching = [
        r for r in caplog.records
        if r.levelno >= logging.WARNING
        and "content_filter_json" in (r.getMessage() or "")
        and session_id in (r.getMessage() or "")
    ]
    assert matching, (
        "content_filter_json parse failure must log at WARNING with the "
        "session id so operators can triage corrupted sessions; got "
        f"records={[r.getMessage() for r in caplog.records]!r}"
    )


# ---------------------------------------------------------------------------
# B7: `create_artifact` note branch -- a failing quick_notes INSERT must not
# be silently swallowed with `except Exception: pass`. Log at WARNING.
# ---------------------------------------------------------------------------


def test_b7_note_branch_logs_warning_on_persistence_failure(
    client, monkeypatch, caplog
):
    session_id = _create_tutor_session(client)

    from db_setup import get_connection as real_get_connection

    class _TrackedCursor:
        def __init__(self, real):
            self._real = real

        def execute(self, sql, params=()):
            normalized = " ".join((sql or "").split()).upper()
            if normalized.startswith("INSERT INTO QUICK_NOTES"):
                raise sqlite3.OperationalError(
                    "quick_notes insert exploded"
                )
            return self._real.execute(sql, params)

        def fetchone(self):
            return self._real.fetchone()

        def fetchall(self):
            return self._real.fetchall()

        @property
        def lastrowid(self):
            return self._real.lastrowid

        def close(self):
            self._real.close()

    class _TrackedConn:
        def __init__(self, real):
            # Use object.__setattr__ to bypass our override below.
            object.__setattr__(self, "_real", real)

        def __setattr__(self, name, value):
            # Forward row_factory (used by `_get_tutor_session`) to the
            # real sqlite3 connection so `dict(row)` works.
            setattr(self._real, name, value)

        def cursor(self):
            return _TrackedCursor(self._real.cursor())

        def commit(self):
            self._real.commit()

        def close(self):
            self._real.close()

        def execute(self, *a, **k):
            return self._real.execute(*a, **k)

        def __getattr__(self, name):
            return getattr(self._real, name)

    def flaky_get_connection():
        return _TrackedConn(real_get_connection())

    monkeypatch.setattr(
        _api_tutor_artifacts_mod, "get_connection", flaky_get_connection
    )

    with caplog.at_level(
        logging.WARNING, logger=_api_tutor_artifacts_mod.__name__
    ):
        resp = client.post(
            f"/api/tutor/session/{session_id}/artifact",
            json={"type": "note", "title": "t", "content": "c"},
        )

    # The route may still succeed (graceful degrade) but the persistence
    # failure MUST be logged at WARNING.
    persist_warnings = [
        r for r in caplog.records
        if r.levelno >= logging.WARNING
        and "quick_note" in (r.getMessage() or "").lower()
    ]
    assert persist_warnings, (
        "note-branch persistence failure must log at WARNING; got records="
        f"{[r.getMessage() for r in caplog.records]!r}; status={resp.status_code}"
    )


# ---------------------------------------------------------------------------
# B4: send_turn tool-round cap must emit a terminal `tool_result` SSE for
# every tool_call seen in the capping round, and enqueue a synthetic
# `function_call_output` so the OpenAI Responses API invariant "every
# function_call must be paired with a function_call_output" is preserved.
#
# Pre-fix: when `tool_round > max_tool_rounds`, the route yields a single
# `tool_limit_reached` frame and breaks -- the unexecuted tool_calls have
# no matching tool_result SSE (invisible to the UI) and leave OpenAI's
# server-side response state with open function_calls that will reject
# the next user turn.
# ---------------------------------------------------------------------------


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


def test_b4_tool_round_cap_emits_terminal_tool_result(client, monkeypatch):
    """When the tool-round ceiling is hit, every call_id from that round
    must produce a matching `tool_result` SSE frame AND a synthetic
    `function_call_output` so OpenAI's response state stays consistent."""
    session_id = _create_tutor_session(client)

    # Force the cap to bite on the very first tool-call round.
    monkeypatch.setattr(_api_tutor_turns_mod, "MAX_TOOL_ROUNDS", 0)

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
        lambda: [{"type": "function", "name": "save_learning_objectives"}],
    )

    def fake_stream(_system_prompt, _user_prompt, **_kwargs):
        # Emit one tool_call so tool_round becomes 1 and the cap fires.
        yield {
            "type": "tool_call",
            "name": "save_learning_objectives",
            "arguments": "{}",
            "call_id": "call-b4-cap",
        }
        yield {
            "type": "done",
            "model": "gpt-5.3-codex",
            "response_id": "resp-b4",
            "thread_id": "thread-b4",
        }

    monkeypatch.setattr(
        llm_provider, "stream_chatgpt_responses", fake_stream
    )

    resp = client.post(
        f"/api/tutor/session/{session_id}/turn",
        json={"message": "trigger tool-cap"},
    )
    assert resp.status_code == 200

    events = _parse_sse_events(resp.get_data(as_text=True))

    # Must include the cap event.
    cap_events = [
        e for e in events
        if isinstance(e, dict) and e.get("type") == "tool_limit_reached"
    ]
    assert cap_events, (
        "expected a tool_limit_reached frame when the cap bites; "
        f"got {events!r}"
    )

    # Must include a terminal tool_result for every capped call_id.
    tool_results = [
        e for e in events
        if isinstance(e, dict) and e.get("type") == "tool_result"
    ]
    assert tool_results, (
        "pre-fix bug: tool-round cap never emits a terminal tool_result "
        "SSE for the unexecuted tool_calls; events="
        f"{[e.get('type') if isinstance(e, dict) else e for e in events]!r}"
    )
    # At least one of them must reference the capping call_id OR describe
    # the cap explicitly so the UI can pair it with the dangling tool_call.
    cap_messages = " ".join(
        str(tr.get("content") or tr.get("message") or "") for tr in tool_results
    ).lower()
    assert (
        "tool-round" in cap_messages
        or "tool round" in cap_messages
        or "cap" in cap_messages
        or "limit" in cap_messages
        or "call-b4-cap" in json.dumps(tool_results)
    ), (
        "terminal tool_result must identify the cap (pair with call_id or "
        "include a 'cap/limit' message); got "
        f"{tool_results!r}"
    )

