"""Regression tests for P0/P1 tutor audit remediation fixes.

Covers:
- Session summary contract fields (duration_seconds, artifact_count, objectives_covered)
- Chain progress structured response
- Artifact type aliasing (table → note, structured_map → map)
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import tempfile
from datetime import datetime

import pytest

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
    """Isolated temp DB for audit remediation tests."""
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    _orig_env = os.environ.get("PT_STUDY_DB")
    _orig_config = config.DB_PATH
    _orig_db_setup = db_setup.DB_PATH
    _orig_api_data = _api_data_mod.DB_PATH
    _orig_tutor_vault_read = _api_tutor_mod._vault_read_note
    _orig_tutor_vault_save = _api_tutor_mod._vault_save_note
    _orig_tutor_vault_delete = _api_tutor_mod._vault_delete_note

    obsidian_store: dict[str, str] = {}

    def _fake_get(path: str):
        content = obsidian_store.get(path)
        if content is None:
            return {"success": False, "error": "not found"}
        return {"success": True, "content": content, "path": path}

    def _fake_save(path: str, content: str):
        obsidian_store[path] = content
        return {"success": True, "path": path}

    def _fake_delete(path: str):
        obsidian_store.pop(path, None)
        return {"success": True, "path": path}

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
    db_setup._METHOD_LIBRARY_ENSURED = False
    db_setup.ensure_method_library_seeded()

    app_obj = create_app()
    app_obj.config["TESTING"] = True
    yield app_obj

    config.DB_PATH = _orig_config
    db_setup.DB_PATH = _orig_db_setup
    _api_data_mod.DB_PATH = _orig_api_data
    _api_tutor_mod._vault_read_note = _orig_tutor_vault_read
    _api_tutor_mod._vault_save_note = _orig_tutor_vault_save
    _api_tutor_mod._vault_delete_note = _orig_tutor_vault_delete
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
def session_id(client):
    """Create a tutor session for tests."""
    resp = client.post(
        "/api/tutor/session",
        data=json.dumps({"mode": "Core", "topic": "Audit Remediation Test"}),
        content_type="application/json",
    )
    assert resp.status_code == 201, f"Session create failed: {resp.get_json()}"
    return resp.get_json()["session_id"]


# ---------------------------------------------------------------------------
# P0.2: Session summary contract fields
# ---------------------------------------------------------------------------


class TestSessionSummaryContract:
    """Summary response must include frontend-expected fields."""

    def test_summary_returns_duration_seconds(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "duration_seconds" in data
        assert isinstance(data["duration_seconds"], (int, float))

    def test_summary_returns_artifact_count(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "artifact_count" in data
        assert isinstance(data["artifact_count"], int)

    def test_summary_returns_objectives_covered(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "objectives_covered" in data
        assert isinstance(data["objectives_covered"], list)

    def test_summary_duration_seconds_matches_minutes(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        data = resp.get_json()
        assert data["duration_seconds"] == round(data["duration_minutes"] * 60)

    def test_summary_artifact_count_matches_artifacts_list(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        data = resp.get_json()
        total = sum(a["count"] for a in data["artifacts"])
        assert data["artifact_count"] == total


# ---------------------------------------------------------------------------
# P0.3: Chain progress structured object
# ---------------------------------------------------------------------------


class TestChainProgressShape:
    """chain_progress must be structured object or None, never a string."""

    def test_chain_progress_not_string(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        data = resp.get_json()
        cp = data.get("chain_progress")
        assert not isinstance(cp, str), f"chain_progress should not be a string, got: {cp!r}"

    def test_chain_progress_null_when_no_chain(self, client, session_id):
        resp = client.get(f"/api/tutor/session/{session_id}/summary")
        data = resp.get_json()
        # Session created without a chain, so progress should be None/null
        assert data["chain_progress"] is None


# ---------------------------------------------------------------------------
# P1.4: Artifact type aliasing
# ---------------------------------------------------------------------------


class TestArtifactTypeAliasing:
    """table → note, structured_map → map."""

    def test_create_artifact_table_stored_as_note(self, client, session_id):
        resp = client.post(
            f"/api/tutor/session/{session_id}/artifact",
            data=json.dumps({
                "type": "table",
                "title": "Test Table",
                "content": "| Col1 | Col2 |\n|------|------|\n| A | B |",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.get_json()}"
        data = resp.get_json()
        assert data["type"] == "note"

    def test_create_artifact_structured_map_stored_as_map(self, client, session_id):
        resp = client.post(
            f"/api/tutor/session/{session_id}/artifact",
            data=json.dumps({
                "type": "structured_map",
                "title": "Test Map",
                "content": "graph TD\n  A --> B",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.get_json()}"
        data = resp.get_json()
        assert data["type"] == "map"

    def test_invalid_type_still_rejected(self, client, session_id):
        resp = client.post(
            f"/api/tutor/session/{session_id}/artifact",
            data=json.dumps({
                "type": "invalid_type",
                "title": "Bad",
                "content": "nope",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 400


def _open_db() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _create_course(conn: sqlite3.Connection, name: str) -> int:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO courses (name, code, term, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (name, name[:8].upper(), "Spring 2026", datetime.now().isoformat()),
    )
    conn.commit()
    return int(cur.lastrowid)


def _create_tutor_session(
    conn: sqlite3.Connection,
    *,
    session_id: str,
    course_id: int,
    topic: str,
    content_filter: dict[str, object] | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO tutor_sessions
            (session_id, course_id, topic, content_filter_json, status, turn_count, started_at)
        VALUES (?, ?, ?, ?, 'active', 0, ?)
        """,
        (
            session_id,
            course_id,
            topic,
            json.dumps(content_filter or {}),
            datetime.now().isoformat(),
        ),
    )
    conn.commit()


def _moc_stub(objective_ids: list[str], *, topic: str):
    return (
        {
            "path": f"Courses/Test/{topic}/_Map of Contents.md",
            "status": "saved",
            "module_name": "Test Module",
            "course_name": "Test Course",
            "subtopic_name": topic,
            "objective_ids": objective_ids,
            "reference_targets": [],
            "follow_up_targets": [],
        },
        None,
    )


def _save_objectives(
    monkeypatch: pytest.MonkeyPatch,
    *,
    session_id: str,
    topic: str,
    objectives: list[dict[str, str]],
) -> dict[str, object]:
    objective_ids = [
        _api_tutor_mod._normalize_objective_id(obj.get("id"), idx)
        for idx, obj in enumerate(objectives)
    ]
    monkeypatch.setattr(
        _api_tutor_mod,
        "_ensure_moc_context",
        lambda **_kwargs: _moc_stub(objective_ids, topic=topic),
    )
    return _api_tutor_mod.save_learning_objectives_from_tool(
        session_id=session_id,
        objectives=objectives,
    )


def test_save_learning_objectives_scopes_same_lo_code_by_module(client, monkeypatch):
    conn = _open_db()
    try:
        course_id = _create_course(conn, "Tutor Scoped Objectives")
        _create_tutor_session(
            conn,
            session_id="scoped-week-7",
            course_id=course_id,
            topic="Week 7 Topic",
            content_filter={"module_name": "Week 7 - Development of Nervous System"},
        )
        _create_tutor_session(
            conn,
            session_id="scoped-week-8",
            course_id=course_id,
            topic="Week 8 Topic",
            content_filter={"module_name": "Week 8 - Brain Structure"},
        )

        objectives = [{"id": "OBJ-1", "description": "Explain the scoped objective"}]
        first = _save_objectives(
            monkeypatch,
            session_id="scoped-week-7",
            topic="Week 7 Topic",
            objectives=objectives,
        )
        second = _save_objectives(
            monkeypatch,
            session_id="scoped-week-8",
            topic="Week 8 Topic",
            objectives=objectives,
        )

        assert first["success"] is True
        assert second["success"] is True

        rows = conn.execute(
            """
            SELECT lo_code, group_name
            FROM learning_objectives
            WHERE course_id = ? AND lo_code = ?
            ORDER BY id ASC
            """,
            (course_id, "OBJ-1"),
        ).fetchall()

        assert [row["group_name"] for row in rows] == [
            "Week 7 - Development of Nervous System",
            "Week 8 - Brain Structure",
        ]
    finally:
        conn.close()


def test_vault_import_accepts_heading_objectives_and_preserves_other_groups(monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    conn = _open_db()
    try:
        course_id = _create_course(conn, "Tutor Vault Import Scope")
        conn.execute(
            """
            INSERT INTO learning_objectives
                (course_id, module_id, lo_code, title, status, group_name, managed_by_tutor, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'active', ?, 1, ?, ?)
            """,
            (
                course_id,
                None,
                "OBJ-1",
                "Legacy week 7 objective",
                "Week 7 - Development of Nervous System",
                datetime.now().isoformat(),
                datetime.now().isoformat(),
            ),
        )
        conn.commit()
    finally:
        conn.close()

    monkeypatch.setattr(
        _api_tutor_mod,
        "_vault_read_note",
        lambda _path: {
            "success": True,
            "content": "\n".join(
                [
                    "### OBJ-1 — Describe basal ganglia direct pathway",
                    "#### OBJ-2A — Differentiate direct vs indirect pathway",
                ]
            ),
        },
    )

    imported = _api_tutor_mod._try_import_objectives_from_vault(
        course_id=course_id,
        module_id=None,
        module_name="Week 9 - Basal Ganglia",
        vault_folder="Courses/Neuroscience/Week 9",
    )

    assert [item["objective_id"] for item in imported] == ["OBJ-1", "OBJ-2A"]

    conn = _open_db()
    try:
        rows = conn.execute(
            """
            SELECT lo_code, title, group_name
            FROM learning_objectives
            WHERE course_id = ?
            ORDER BY id ASC
            """,
            (course_id,),
        ).fetchall()
        assert [(row["lo_code"], row["group_name"]) for row in rows] == [
            ("OBJ-1", "Week 7 - Development of Nervous System"),
            ("OBJ-1", "Week 9 - Basal Ganglia"),
            ("OBJ-2A", "Week 9 - Basal Ganglia"),
        ]
        assert rows[1]["title"] == "Describe basal ganglia direct pathway"
    finally:
        conn.close()


def test_delete_session_preserves_shared_learning_objective(client, monkeypatch):
    conn = _open_db()
    try:
        course_id = _create_course(conn, "Tutor Shared Objective")
        _create_tutor_session(
            conn,
            session_id="shared-session-1",
            course_id=course_id,
            topic="Hip Shared One",
            content_filter={"module_name": "Hip Shared Module"},
        )
        _create_tutor_session(
            conn,
            session_id="shared-session-2",
            course_id=course_id,
            topic="Hip Shared Two",
            content_filter={"module_name": "Hip Shared Module"},
        )

        objectives = [{"id": "OBJ-HIP", "description": "Explain hip stabilizers"}]
        assert _save_objectives(
            monkeypatch,
            session_id="shared-session-1",
            topic="Hip Shared One",
            objectives=objectives,
        )["success"] is True
        assert _save_objectives(
            monkeypatch,
            session_id="shared-session-2",
            topic="Hip Shared Two",
            objectives=objectives,
        )["success"] is True

        before = conn.execute(
            "SELECT COUNT(*) FROM learning_objectives WHERE course_id = ? AND lo_code = ?",
            (course_id, "OBJ-HIP"),
        ).fetchone()[0]
        assert before == 1

        resp = client.delete("/api/tutor/session/shared-session-1")
        assert resp.status_code == 200
        payload = resp.get_json()
        assert payload["deleted"] is True
        assert payload["objectives_deleted"] == 0

        after = conn.execute(
            "SELECT COUNT(*) FROM learning_objectives WHERE course_id = ? AND lo_code = ?",
            (course_id, "OBJ-HIP"),
        ).fetchone()[0]
        remaining_links = conn.execute(
            """
            SELECT COUNT(*)
            FROM tutor_session_learning_objectives tso
            JOIN learning_objectives lo ON lo.id = tso.lo_id
            WHERE lo.course_id = ? AND lo.lo_code = ?
            """,
            (course_id, "OBJ-HIP"),
        ).fetchone()[0]
        assert after == 1
        assert remaining_links == 1
    finally:
        conn.close()


def test_delete_session_unlink_failure_keeps_session_and_skips_obsidian_delete(
    client, monkeypatch
):
    conn = _open_db()
    try:
        course_id = _create_course(conn, "Tutor Unlink Failure")
        _create_tutor_session(
            conn,
            session_id="unlink-failure-session",
            course_id=course_id,
            topic="Unlink Failure Topic",
        )

        cascade_calls = {"count": 0}

        def _fail_unlink(_conn: sqlite3.Connection, _session_id: str) -> int:
            raise RuntimeError("unlink failed")

        def _track_cascade(_session: dict[str, object]) -> list[str]:
            cascade_calls["count"] += 1
            return ["Study Notes/Test/should-not-delete.md"]

        monkeypatch.setattr(
            _api_tutor_mod,
            "_unlink_all_tutor_session_learning_objectives",
            _fail_unlink,
        )
        monkeypatch.setattr(
            _api_tutor_mod,
            "_cascade_delete_obsidian_files",
            _track_cascade,
        )

        resp = client.delete("/api/tutor/session/unlink-failure-session")
        assert resp.status_code == 500
        payload = resp.get_json()
        assert payload["deleted"] is False
        assert payload["status"] == "objective_unlink_failed"
        assert payload["obsidian_deleted"] == []
        assert cascade_calls["count"] == 0

        remaining = conn.execute(
            "SELECT COUNT(*) FROM tutor_sessions WHERE session_id = ?",
            ("unlink-failure-session",),
        ).fetchone()[0]
        assert remaining == 1
    finally:
        conn.close()


def test_delete_session_removes_tutor_managed_objective_after_last_link(
    client, monkeypatch
):
    conn = _open_db()
    try:
        course_id = _create_course(conn, "Tutor Last Link Objective")
        _create_tutor_session(
            conn,
            session_id="last-link-session-1",
            course_id=course_id,
            topic="Last Link One",
            content_filter={"module_name": "Last Link Module"},
        )
        _create_tutor_session(
            conn,
            session_id="last-link-session-2",
            course_id=course_id,
            topic="Last Link Two",
            content_filter={"module_name": "Last Link Module"},
        )

        objectives = [{"id": "OBJ-LAST", "description": "Explain talocrural arthrokinematics"}]
        _save_objectives(
            monkeypatch,
            session_id="last-link-session-1",
            topic="Last Link One",
            objectives=objectives,
        )
        _save_objectives(
            monkeypatch,
            session_id="last-link-session-2",
            topic="Last Link Two",
            objectives=objectives,
        )

        first = client.delete("/api/tutor/session/last-link-session-1")
        assert first.status_code == 200
        assert first.get_json()["objectives_deleted"] == 0

        second = client.delete("/api/tutor/session/last-link-session-2")
        assert second.status_code == 200
        assert second.get_json()["objectives_deleted"] == 1

        remaining = conn.execute(
            "SELECT COUNT(*) FROM learning_objectives WHERE course_id = ? AND lo_code = ?",
            (course_id, "OBJ-LAST"),
        ).fetchone()[0]
        assert remaining == 0
    finally:
        conn.close()


def test_delete_session_preserves_manual_learning_objective(client, monkeypatch):
    conn = _open_db()
    try:
        course_id = _create_course(conn, "Tutor Manual Objective")
        _create_tutor_session(
            conn,
            session_id="manual-objective-session",
            course_id=course_id,
            topic="Manual Objective Topic",
        )
        conn.execute(
            """
            INSERT INTO learning_objectives
                (course_id, lo_code, title, status, managed_by_tutor, created_at, updated_at)
            VALUES (?, ?, ?, 'active', 0, ?, ?)
            """,
            (
                course_id,
                "OBJ-MANUAL",
                "Manual objective from dashboard",
                datetime.now().isoformat(),
                datetime.now().isoformat(),
            ),
        )
        conn.commit()

        result = _save_objectives(
            monkeypatch,
            session_id="manual-objective-session",
            topic="Manual Objective Topic",
            objectives=[
                {"id": "OBJ-MANUAL", "description": "Manual objective from dashboard"}
            ],
        )
        assert result["success"] is True

        resp = client.delete("/api/tutor/session/manual-objective-session")
        assert resp.status_code == 200
        assert resp.get_json()["objectives_deleted"] == 0

        row = conn.execute(
            """
            SELECT managed_by_tutor
            FROM learning_objectives
            WHERE course_id = ? AND lo_code = ?
            """,
            (course_id, "OBJ-MANUAL"),
        ).fetchone()
        assert row is not None
        assert row["managed_by_tutor"] == 0
    finally:
        conn.close()


def test_delete_session_does_not_delete_canonical_map_of_contents(client, monkeypatch):
    conn = _open_db()
    deleted_paths: list[str] = []
    try:
        course_id = _create_course(conn, "Tutor Canonical Notes")
        map_path = "Courses/Test/Construct 2 - Lower Quarter/_Map of Contents.md"
        session_note_path = "Sessions/tutor-delete-smoke.md"
        _create_tutor_session(
            conn,
            session_id="canonical-moc-session",
            course_id=course_id,
            topic="Construct 2 - Lower Quarter",
            content_filter={
                "module_name": "Construct 2 - Lower Quarter",
                "map_of_contents": {"path": map_path},
            },
        )
        conn.execute(
            "UPDATE tutor_sessions SET artifacts_json = ? WHERE session_id = ?",
            (
                json.dumps(
                    [
                        {
                            "type": "note",
                            "session_path": session_note_path,
                            "concept_paths": [],
                        }
                    ]
                ),
                "canonical-moc-session",
            ),
        )
        conn.commit()

        monkeypatch.setattr(
            _api_tutor_mod,
            "_vault_delete_note",
            lambda path: deleted_paths.append(path) or {"success": True, "path": path},
        )

        resp = client.delete("/api/tutor/session/canonical-moc-session")
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["deleted"] is True
        assert body["obsidian_deleted"] == [session_note_path]
        assert map_path not in deleted_paths
        assert session_note_path in deleted_paths
    finally:
        conn.close()


def test_reconcile_obsidian_state_unlinks_without_deleting_shared_objective(
    monkeypatch,
):
    conn = _open_db()
    try:
        course_id = _create_course(conn, "Tutor Reconcile Objective")
        _create_tutor_session(
            conn,
            session_id="reconcile-session-1",
            course_id=course_id,
            topic="Reconcile One",
            content_filter={"module_name": "Reconcile Module"},
        )
        _create_tutor_session(
            conn,
            session_id="reconcile-session-2",
            course_id=course_id,
            topic="Reconcile Two",
            content_filter={"module_name": "Reconcile Module"},
        )

        objectives = [{"id": "OBJ-RECON", "description": "Explain lumbar opening patterns"}]
        _save_objectives(
            monkeypatch,
            session_id="reconcile-session-1",
            topic="Reconcile One",
            objectives=objectives,
        )
        _save_objectives(
            monkeypatch,
            session_id="reconcile-session-2",
            topic="Reconcile Two",
            objectives=objectives,
        )

        session_row = conn.execute(
            "SELECT * FROM tutor_sessions WHERE session_id = ?",
            ("reconcile-session-1",),
        ).fetchone()
        session = dict(session_row)

        monkeypatch.setattr(
            _api_tutor_mod,
            "_vault_read_note",
            lambda _path: {"success": False, "error": "missing"},
        )

        _api_tutor_mod._reconcile_obsidian_state(
            session,
            persist=True,
            prune_learning_objectives=True,
        )

        lo_count = conn.execute(
            "SELECT COUNT(*) FROM learning_objectives WHERE course_id = ? AND lo_code = ?",
            (course_id, "OBJ-RECON"),
        ).fetchone()[0]
        link_count = conn.execute(
            """
            SELECT COUNT(*)
            FROM tutor_session_learning_objectives tso
            JOIN learning_objectives lo ON lo.id = tso.lo_id
            WHERE lo.course_id = ? AND lo.lo_code = ?
            """,
            (course_id, "OBJ-RECON"),
        ).fetchone()[0]
        refreshed = conn.execute(
            "SELECT content_filter_json FROM tutor_sessions WHERE session_id = ?",
            ("reconcile-session-1",),
        ).fetchone()[0]
        refreshed_filter = json.loads(refreshed)

        assert lo_count == 1
        assert link_count == 2
        assert refreshed_filter["map_of_contents"]["status"] == "saved"
    finally:
        conn.close()
