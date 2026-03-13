from __future__ import annotations

import os
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config
import db_setup
from dashboard.app import create_app


@pytest.fixture()
def app():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    orig_env = os.environ.get("PT_STUDY_DB")
    orig_config = config.DB_PATH
    orig_db_setup = db_setup.DB_PATH

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    db_setup.init_database()

    app_obj = create_app()
    app_obj.config["TESTING"] = True
    yield app_obj

    config.DB_PATH = orig_config
    db_setup.DB_PATH = orig_db_setup
    if orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = orig_env
    try:
        os.unlink(tmp_path)
    except OSError:
        pass


@pytest.fixture()
def client(app):
    return app.test_client()


def _insert_course(course_id: int, name: str = "Anatomy") -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO courses (id, name, code, term, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        """,
        (course_id, name, f"C-{course_id}", "Spring 2026"),
    )
    conn.commit()
    conn.close()


def _insert_course_event(course_id: int, title: str = "Quiz 1") -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO course_events (course_id, course, type, title, date, status, created_at)
        VALUES (?, ?, 'quiz', ?, '2026-03-20', 'pending', datetime('now'))
        """,
        (course_id, f"C-{course_id}", title),
    )
    conn.commit()
    conn.close()


def _insert_tutor_session(course_id: int, session_id: str, topic: str = "Week 1 Review") -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO tutor_sessions (session_id, course_id, phase, topic, status, turn_count, started_at)
        VALUES (?, ?, 'first_pass', ?, 'active', 0, datetime('now'))
        """,
        (session_id, course_id, topic),
    )
    conn.commit()
    conn.close()


def _insert_material(
    material_id: int,
    *,
    title: str,
    source_path: str,
    file_path: str | None = None,
    file_type: str = "pdf",
    content: str = "",
    course_id: int | None = None,
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO rag_docs (
            id, title, source_path, file_path, file_type, content,
            course_id, corpus, enabled, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'materials', 1, datetime('now'), datetime('now'))
        """,
        (material_id, title, source_path, file_path, file_type, content, course_id),
    )
    conn.commit()
    conn.close()


def test_project_shell_returns_defaults_and_counts(client):
    _insert_course(101, "Anatomy")
    _insert_course_event(101, "Thorax Quiz")
    _insert_tutor_session(101, "tutor-shell-101", "Thorax")

    response = client.get("/api/tutor/project-shell?course_id=101")

    assert response.status_code == 200
    body = response.get_json()
    assert body["course"]["id"] == 101
    assert body["workspace_state"]["last_mode"] == "studio"
    assert body["workspace_state"]["revision"] == 0
    assert body["active_session"] is None
    assert body["counts"]["session_count"] == 1
    assert body["counts"]["pending_schedule_events"] == 1
    assert len(body["recent_sessions"]) == 1
    assert body["recent_sessions"][0]["session_id"] == "tutor-shell-101"


def test_project_shell_state_persists_and_increments_revision(client):
    _insert_course(102, "Neuro")
    _insert_tutor_session(102, "tutor-shell-102", "Brainstem")

    save_response = client.put(
        "/api/tutor/project-shell/state",
        json={
            "course_id": 102,
            "active_tutor_session_id": "tutor-shell-102",
            "last_mode": "tutor",
            "active_board_scope": "session",
            "selected_material_ids": [4, "7", 4],
            "viewer_state": {"sourcePath": "Uploads/brainstem.pdf", "page": 3},
            "revision": 0,
        },
    )

    assert save_response.status_code == 200
    saved = save_response.get_json()["workspace_state"]
    assert saved["revision"] == 1
    assert saved["selected_material_ids"] == [4, 7]
    assert saved["last_mode"] == "tutor"
    assert saved["active_tutor_session_id"] == "tutor-shell-102"

    shell_response = client.get("/api/tutor/project-shell?course_id=102")
    assert shell_response.status_code == 200
    shell = shell_response.get_json()
    assert shell["workspace_state"]["revision"] == 1
    assert shell["workspace_state"]["viewer_state"]["page"] == 3
    assert shell["continuation"]["can_resume"] is True
    assert shell["active_session"]["session_id"] == "tutor-shell-102"

    update_response = client.put(
        "/api/tutor/project-shell/state",
        json={
            "course_id": 102,
            "active_tutor_session_id": "tutor-shell-102",
            "last_mode": "studio",
            "active_board_scope": "project",
            "selected_material_ids": [9],
            "viewer_state": {"sourcePath": "Uploads/brainstem.pdf", "page": 5},
            "revision": 1,
        },
    )

    assert update_response.status_code == 200
    updated = update_response.get_json()["workspace_state"]
    assert updated["revision"] == 2
    assert updated["last_mode"] == "studio"
    assert updated["selected_material_ids"] == [9]


def test_project_shell_state_rejects_stale_revision(client):
    _insert_course(103, "MSK")

    first_write = client.put(
        "/api/tutor/project-shell/state",
        json={"course_id": 103, "revision": 0},
    )
    assert first_write.status_code == 200

    stale_write = client.put(
        "/api/tutor/project-shell/state",
        json={"course_id": 103, "last_mode": "publish", "revision": 0},
    )

    assert stale_write.status_code == 409
    body = stale_write.get_json()
    assert body["code"] == "REVISION_CONFLICT"
    assert body["expected_revision"] == 1


def test_project_shell_state_rejects_session_from_another_course(client):
    _insert_course(104, "Path")
    _insert_course(105, "Pharm")
    _insert_tutor_session(105, "tutor-shell-105", "Pharmacology")

    response = client.put(
        "/api/tutor/project-shell/state",
        json={
            "course_id": 104,
            "active_tutor_session_id": "tutor-shell-105",
            "revision": 0,
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "active_tutor_session_id must belong to the selected course"


def test_studio_capture_restore_and_promote_copy(client):
    _insert_course(106, "Cardio")
    _insert_tutor_session(106, "tutor-shell-106", "Cardiac Cycle")

    capture = client.post(
        "/api/tutor/studio/capture",
        json={
            "course_id": 106,
            "tutor_session_id": "tutor-shell-106",
            "scope": "session",
            "item_type": "note",
            "source_kind": "tutor_message",
            "title": "Frank-Starling note",
            "body_markdown": "Stretch increases force.",
            "source_locator": {"turn": 2},
            "payload": {"source": "assistant"},
        },
    )

    assert capture.status_code == 201
    captured_item = capture.get_json()["item"]
    assert captured_item["scope"] == "session"
    assert captured_item["status"] == "captured"

    restore = client.get("/api/tutor/studio/restore?course_id=106&tutor_session_id=tutor-shell-106")
    assert restore.status_code == 200
    restore_body = restore.get_json()
    assert restore_body["counts"]["total"] == 1
    assert restore_body["items"][0]["id"] == captured_item["id"]

    promote = client.post(
        "/api/tutor/studio/promote",
        json={"item_id": captured_item["id"], "promotion_mode": "copy"},
    )
    assert promote.status_code == 200
    promoted_item = promote.get_json()["item"]
    assert promoted_item["scope"] == "project"
    assert promoted_item["status"] == "promoted"
    assert promoted_item["promoted_from_id"] == captured_item["id"]

    restore_after = client.get("/api/tutor/studio/restore?course_id=106")
    assert restore_after.status_code == 200
    body = restore_after.get_json()
    assert body["counts"]["total"] == 2
    assert body["counts"]["promoted"] == 1


def test_studio_promote_move_updates_existing_item_and_revision(client):
    _insert_course(107, "Pulm")
    _insert_tutor_session(107, "tutor-shell-107", "Ventilation")

    capture = client.post(
        "/api/tutor/studio/capture",
        json={
            "course_id": 107,
            "tutor_session_id": "tutor-shell-107",
            "scope": "session",
            "item_type": "table",
            "body_markdown": "| A | B |",
        },
    )
    assert capture.status_code == 201
    item = capture.get_json()["item"]

    promote = client.post(
        "/api/tutor/studio/promote",
        json={"item_id": item["id"], "promotion_mode": "move"},
    )
    assert promote.status_code == 200
    moved = promote.get_json()["item"]
    assert moved["id"] == item["id"]
    assert moved["scope"] == "project"
    assert moved["status"] == "promoted"
    assert moved["version"] == 2

    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM studio_item_revisions WHERE studio_item_id = ?",
        (item["id"],),
    )
    revision_count = cur.fetchone()[0]
    cur.execute(
        "SELECT COUNT(*) FROM studio_actions WHERE course_id = ? AND action_type = 'promote'",
        (107,),
    )
    promote_actions = cur.fetchone()[0]
    conn.close()

    assert revision_count == 2
    assert promote_actions == 1


def test_studio_restore_includes_project_items_without_session_id(client):
    """Gap fix: project-scope items (tutor_session_id IS NULL) should appear
    when restoring with a tutor_session_id filter."""
    _insert_course(110, "Ortho")
    _insert_tutor_session(110, "tutor-shell-110", "Fractures")

    # Capture a session-scoped item
    session_capture = client.post(
        "/api/tutor/studio/capture",
        json={
            "course_id": 110,
            "tutor_session_id": "tutor-shell-110",
            "scope": "session",
            "item_type": "note",
            "title": "Session note",
            "body_markdown": "Session-level content.",
        },
    )
    assert session_capture.status_code == 201

    # Capture a project-scoped item (no tutor_session_id)
    project_capture = client.post(
        "/api/tutor/studio/capture",
        json={
            "course_id": 110,
            "scope": "project",
            "item_type": "summary",
            "title": "Project summary",
            "body_markdown": "Course-level summary.",
        },
    )
    assert project_capture.status_code == 201

    # Restore with tutor_session_id — should include BOTH items
    restore = client.get(
        "/api/tutor/studio/restore",
        query_string={
            "course_id": 110,
            "tutor_session_id": "tutor-shell-110",
        },
    )
    assert restore.status_code == 200
    items = restore.get_json()["items"]
    scopes = {item["scope"] for item in items}
    assert "session" in scopes, "Expected session-scoped item"
    assert "project" in scopes, "Expected project-scoped item (tutor_session_id IS NULL)"
    assert len(items) == 2


def test_promoted_project_item_visible_from_different_session(client):
    """Gap fix: promoting a session item to project scope should null out
    tutor_session_id so it appears in project restore from any session."""
    _insert_course(111, "Histo")
    _insert_tutor_session(111, "tutor-shell-111a", "Epithelia")
    _insert_tutor_session(111, "tutor-shell-111b", "Connective Tissue")

    # Capture under session A
    capture = client.post(
        "/api/tutor/studio/capture",
        json={
            "course_id": 111,
            "tutor_session_id": "tutor-shell-111a",
            "scope": "session",
            "item_type": "note",
            "title": "Epithelia note",
            "body_markdown": "Simple columnar lines the gut.",
        },
    )
    assert capture.status_code == 201
    item_id = capture.get_json()["item"]["id"]

    # Promote via copy
    promote_copy = client.post(
        "/api/tutor/studio/promote",
        json={"item_id": item_id, "promotion_mode": "copy"},
    )
    assert promote_copy.status_code == 200
    promoted_copy = promote_copy.get_json()["item"]
    assert promoted_copy["scope"] == "project"
    assert promoted_copy["tutor_session_id"] is None

    # Restore from session B — promoted project item should be visible
    restore_b = client.get(
        "/api/tutor/studio/restore",
        query_string={
            "course_id": 111,
            "tutor_session_id": "tutor-shell-111b",
        },
    )
    assert restore_b.status_code == 200
    items_b = restore_b.get_json()["items"]
    project_items = [i for i in items_b if i["scope"] == "project"]
    assert len(project_items) >= 1, "Promoted project item should be visible from session B"

    # Also test move path: capture another item under session A and promote via move
    capture2 = client.post(
        "/api/tutor/studio/capture",
        json={
            "course_id": 111,
            "tutor_session_id": "tutor-shell-111a",
            "scope": "session",
            "item_type": "table",
            "body_markdown": "| Type | Location |",
        },
    )
    assert capture2.status_code == 201
    item2_id = capture2.get_json()["item"]["id"]

    promote_move = client.post(
        "/api/tutor/studio/promote",
        json={"item_id": item2_id, "promotion_mode": "move"},
    )
    assert promote_move.status_code == 200
    moved = promote_move.get_json()["item"]
    assert moved["scope"] == "project"
    assert moved["tutor_session_id"] is None

    # Restore from session B again — both promoted items visible
    restore_b2 = client.get(
        "/api/tutor/studio/restore",
        query_string={
            "course_id": 111,
            "tutor_session_id": "tutor-shell-111b",
        },
    )
    assert restore_b2.status_code == 200
    items_b2 = restore_b2.get_json()["items"]
    project_items2 = [i for i in items_b2 if i["scope"] == "project"]
    assert len(project_items2) >= 2, "Both promoted project items should be visible from session B"


def test_migration_handles_legacy_tutor_sessions_schema(app):
    """Migration proof: init_database on a fresh DB should create all new
    tables and the legacy tutor_sessions columns should be intact."""
    conn = sqlite3.connect(config.DB_PATH)

    # Verify project_workspace_state table exists
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='project_workspace_state'"
    )
    assert cur.fetchone() is not None, "project_workspace_state table should exist"

    # Verify studio tables exist
    for table in ["studio_items", "studio_item_revisions", "studio_boards",
                  "studio_board_entries", "studio_actions"]:
        cur = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table,),
        )
        assert cur.fetchone() is not None, f"{table} table should exist"

    # Verify tutor_sessions still has essential columns
    cur = conn.execute("PRAGMA table_info(tutor_sessions)")
    columns = {row[1] for row in cur.fetchall()}
    for required in ["session_id", "course_id", "phase", "topic", "status", "turn_count"]:
        assert required in columns, f"tutor_sessions should retain '{required}' column"

    # Verify idempotent rerun doesn't crash
    db_setup.init_database()

    conn.close()


def test_material_file_route_streams_original_file(client, tmp_path):
    _insert_course(108, "Neuro")
    pdf_path = tmp_path / "brainstem.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 test")
    _insert_material(
        8801,
        title="Brainstem PDF",
        source_path=str(pdf_path),
        file_type="pdf",
        content="brainstem notes",
        course_id=108,
    )

    response = client.get("/api/tutor/materials/8801/file")

    assert response.status_code == 200
    assert response.data == b"%PDF-1.4 test"


def test_material_file_route_returns_404_when_file_missing(client):
    _insert_course(109, "MSK")
    _insert_material(
        8802,
        title="Missing File",
        source_path="C:/missing/path/lecture.pdf",
        file_type="pdf",
        content="placeholder",
        course_id=109,
    )

    response = client.get("/api/tutor/materials/8802/file")

    assert response.status_code == 404
    assert response.get_json()["error"] == "Material file not found"
