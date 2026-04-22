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
        INSERT INTO course_events (course_id, course, type, title, date, due_date, status, created_at)
        VALUES (?, ?, 'quiz', ?, '2026-03-20', '2026-03-20', 'pending', datetime('now'))
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


def _insert_workspace_state(
    course_id: int,
    *,
    session_id: str | None = None,
    last_mode: str = "studio",
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO project_workspace_state (
            course_id,
            active_tutor_session_id,
            last_mode,
            active_board_scope,
            selected_material_ids_json,
            revision,
            updated_at
        )
        VALUES (?, ?, ?, 'project', '[]', 1, datetime('now'))
        """,
        (course_id, session_id, last_mode),
    )
    conn.commit()
    conn.close()


def _insert_study_task(
    course_id: int,
    *,
    course_event_id: int | None = None,
    scheduled_date: str = "2026-03-15",
    anchor_text: str = "Review block",
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO study_tasks (
            course_id,
            course_event_id,
            scheduled_date,
            planned_minutes,
            status,
            notes,
            created_at,
            source,
            priority,
            anchor_text
        )
        VALUES (?, ?, ?, 45, 'pending', '', datetime('now'), 'manual', 1, ?)
        """,
        (course_id, course_event_id, scheduled_date, anchor_text),
    )
    conn.commit()
    conn.close()


def _insert_wheel_course(
    course_id: int,
    *,
    position: int = 0,
    active: int = 1,
    total_sessions: int = 0,
    total_minutes: int = 0,
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS wheel_courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            position INTEGER,
            total_sessions INTEGER NOT NULL DEFAULT 0,
            total_minutes INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        INSERT INTO wheel_courses (course_id, name, active, position, total_sessions, total_minutes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        (course_id, f"Course {course_id}", active, position, total_sessions, total_minutes),
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


def test_tutor_hub_buckets_events_and_builds_class_cards(client):
    _insert_course(201, "Neuro")
    _insert_course(202, "MSK")
    _insert_course_event(201, "Quiz 1")
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        UPDATE course_events SET type = 'assignment', due_date = '2026-03-18', date = '2026-03-18' WHERE course_id = 201
        """
    )
    conn.execute(
        """
        INSERT INTO course_events (course_id, course, type, title, date, due_date, status, created_at)
        VALUES (201, 'C-201', 'project', 'Case Project', '2026-03-19', '2026-03-19', 'pending', datetime('now'))
        """
    )
    conn.execute(
        """
        INSERT INTO course_events (course_id, course, type, title, date, due_date, status, created_at)
        VALUES (202, 'C-202', 'quiz', 'MSK Quiz', '2026-03-20', '2026-03-20', 'pending', datetime('now'))
        """
    )
    conn.execute(
        """
        INSERT INTO course_events (course_id, course, type, title, date, due_date, status, created_at)
        VALUES (202, 'C-202', 'exam', 'MSK Exam', '2026-03-22', '2026-03-22', 'pending', datetime('now'))
        """
    )
    conn.commit()
    conn.close()


def _insert_studio_item(
    course_id: int,
    *,
    tutor_session_id: str | None = None,
    scope: str = "session",
    status: str = "captured",
    item_type: str = "note",
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO studio_items (
            course_id,
            tutor_session_id,
            scope,
            item_type,
            status,
            version,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        """,
        (course_id, tutor_session_id, scope, item_type, status),
    )
    conn.commit()
    conn.close()
    _insert_tutor_session(201, "hub-session-201", "Brainstem")
    _insert_workspace_state(201, session_id="hub-session-201", last_mode="tutor")
    _insert_material(
        9001,
        title="Neuro Packet",
        source_path="Uploads/neuro-packet.pdf",
        course_id=201,
    )
    _insert_studio_item(201, tutor_session_id="hub-session-201", status="captured")
    _insert_studio_item(201, scope="project", status="promoted")
    _insert_wheel_course(201, position=0, total_sessions=3, total_minutes=90)
    _insert_wheel_course(202, position=1, total_sessions=2, total_minutes=55)

    response = client.get("/api/tutor/hub")

    assert response.status_code == 200
    body = response.get_json()
    assert [item["type"] for item in body["upcoming_assignments"]] == ["assignment", "project"]
    assert [item["type"] for item in body["upcoming_tests"]] == ["quiz", "exam"]
    assert body["resume_candidate"]["can_resume"] is True
    assert body["resume_candidate"]["session_id"] == "hub-session-201"
    assert body["study_wheel"]["current_course_id"] == 201
    assert body["study_wheel"]["next_course_id"] == 202
    neuro_card = next(item for item in body["class_projects"] if item["course_id"] == 201)
    assert neuro_card["material_count"] == 1
    assert neuro_card["recent_session_count"] == 1
    assert neuro_card["last_studied_at"] == neuro_card["active_session"]["started_at"]
    assert neuro_card["pending_event_count"] == 2
    assert neuro_card["captured_item_count"] == 1
    assert neuro_card["promoted_item_count"] == 1
    assert neuro_card["active_session"]["session_id"] == "hub-session-201"
    assert neuro_card["next_due_event"]["title"] == "Quiz 1"


def test_tutor_hub_recommendation_prefers_active_resume_over_tasks_and_wheel(client):
    _insert_course(203, "Cardio")
    _insert_tutor_session(203, "hub-session-203", "Cardiac Cycle")
    _insert_workspace_state(203, session_id="hub-session-203", last_mode="tutor")
    _insert_course_event(203, "Cardio Quiz")
    conn = sqlite3.connect(config.DB_PATH)
    course_event_id = conn.execute(
        "SELECT id FROM course_events WHERE course_id = 203 LIMIT 1"
    ).fetchone()[0]
    conn.close()
    _insert_study_task(203, course_event_id=course_event_id)
    _insert_wheel_course(203, position=0, total_sessions=1, total_minutes=40)

    response = client.get("/api/tutor/hub")

    assert response.status_code == 200
    body = response.get_json()
    assert body["recommended_action"]["kind"] == "resume_session"
    assert body["recommended_action"]["session_id"] == "hub-session-203"
    assert body["recommended_action"]["action_label"] == "RESUME"


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
            "panel_layout": [
                {
                    "id": "panel-source-shelf",
                    "panel": "source_shelf",
                    "position": {"x": 24, "y": 32},
                    "size": {"width": 320, "height": 680},
                    "zIndex": 2,
                    "collapsed": False,
                }
            ],
            "document_tabs": [
                {
                    "id": "doc-material-101",
                    "kind": "material",
                    "title": "Cardiac Output Lecture",
                    "sourceId": 101,
                }
            ],
            "active_document_tab_id": "doc-material-101",
            "runtime_state": {
                "active_memory_capsule_id": 12,
                "compaction_telemetry": {
                    "tokenCount": 18750,
                    "contextWindow": 24000,
                    "pressureLevel": "high",
                },
                "direct_note_save_status": {
                    "state": "saved",
                    "path": "Tutor Workspace/Cardio Note.md",
                },
                "notes_draft": {
                    "session_key": "session:tutor-shell-102",
                    "content": "Remember venous return.",
                },
            },
            "tutor_chain_id": 77,
            "tutor_custom_block_ids": [91, 92],
            "prime_packet_promoted_objects": [
                {
                    "id": "excerpt:101:abc123",
                    "kind": "excerpt",
                    "title": "Excerpt: Cardiac Output Lecture",
                    "detail": "Cardiac output is determined by stroke volume multiplied by heart rate.",
                    "badge": "EXCERPT",
                    "provenance": {
                        "materialId": 101,
                        "sourcePath": "uploads/cardio-output.pdf",
                        "fileType": "pdf",
                        "sourceTitle": "Cardiac Output Lecture",
                        "selectionLabel": "Paragraph 1",
                    },
                }
            ],
            "polish_packet_promoted_notes": [
                {
                    "id": "assistant-1",
                    "title": "Tutor Reply 3",
                    "content": "Cardiac output is determined by stroke volume multiplied by heart rate.",
                    "badge": "TUTOR",
                }
            ],
            "revision": 0,
        },
    )

    assert save_response.status_code == 200
    saved = save_response.get_json()["workspace_state"]
    assert saved["revision"] == 1
    assert saved["selected_material_ids"] == [4, 7]
    assert saved["last_mode"] == "tutor"
    assert saved["active_tutor_session_id"] == "tutor-shell-102"
    assert saved["panel_layout"][0]["panel"] == "source_shelf"
    assert saved["document_tabs"][0]["title"] == "Cardiac Output Lecture"
    assert saved["active_document_tab_id"] == "doc-material-101"
    assert saved["runtime_state"]["active_memory_capsule_id"] == 12
    assert saved["runtime_state"]["compaction_telemetry"]["pressureLevel"] == "high"
    assert saved["runtime_state"]["direct_note_save_status"]["state"] == "saved"
    assert saved["runtime_state"]["notes_draft"]["session_key"] == "session:tutor-shell-102"
    assert saved["runtime_state"]["notes_draft"]["content"] == "Remember venous return."
    assert saved["tutor_chain_id"] == 77
    assert saved["tutor_custom_block_ids"] == [91, 92]
    assert len(saved["prime_packet_promoted_objects"]) == 1
    assert len(saved["polish_packet_promoted_notes"]) == 1
    assert (
        saved["prime_packet_promoted_objects"][0]["detail"]
        == "Cardiac output is determined by stroke volume multiplied by heart rate."
    )
    assert saved["polish_packet_promoted_notes"][0]["title"] == "Tutor Reply 3"

    shell_response = client.get("/api/tutor/project-shell?course_id=102")
    assert shell_response.status_code == 200
    shell = shell_response.get_json()
    assert shell["workspace_state"]["revision"] == 1
    assert shell["workspace_state"]["viewer_state"]["page"] == 3
    assert shell["workspace_state"]["panel_layout"][0]["panel"] == "source_shelf"
    assert shell["workspace_state"]["document_tabs"][0]["id"] == "doc-material-101"
    assert shell["workspace_state"]["active_document_tab_id"] == "doc-material-101"
    assert shell["workspace_state"]["runtime_state"]["active_memory_capsule_id"] == 12
    assert shell["workspace_state"]["runtime_state"]["notes_draft"]["content"] == "Remember venous return."
    assert shell["workspace_state"]["tutor_chain_id"] == 77
    assert shell["workspace_state"]["tutor_custom_block_ids"] == [91, 92]
    assert len(shell["workspace_state"]["prime_packet_promoted_objects"]) == 1
    assert len(shell["workspace_state"]["polish_packet_promoted_notes"]) == 1
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
            "panel_layout": [],
            "document_tabs": [],
            "active_document_tab_id": None,
            "runtime_state": {
                "active_memory_capsule_id": None,
                "compaction_telemetry": None,
                "direct_note_save_status": None,
                "notes_draft": {
                    "session_key": None,
                    "content": "",
                },
            },
            "tutor_chain_id": None,
            "tutor_custom_block_ids": [],
            "prime_packet_promoted_objects": [],
            "polish_packet_promoted_notes": [],
            "revision": 1,
        },
    )

    assert update_response.status_code == 200
    updated = update_response.get_json()["workspace_state"]
    assert updated["revision"] == 2
    assert updated["last_mode"] == "studio"
    assert updated["selected_material_ids"] == [9]
    assert updated["panel_layout"] == []
    assert updated["document_tabs"] == []
    assert updated["active_document_tab_id"] is None
    assert updated["runtime_state"]["active_memory_capsule_id"] is None
    assert updated["tutor_chain_id"] is None
    assert updated["tutor_custom_block_ids"] == []
    assert updated["prime_packet_promoted_objects"] == []
    assert updated["polish_packet_promoted_notes"] == []


def test_project_shell_state_rejects_stale_revision(client):
    _insert_course(103, "MSK")

    first_write = client.put(
        "/api/tutor/project-shell/state",
        json={"course_id": 103, "revision": 0},
    )
    assert first_write.status_code == 200

    stale_write = client.put(
        "/api/tutor/project-shell/state",
        json={"course_id": 103, "last_mode": "tutor", "revision": 0},
    )

    assert stale_write.status_code == 409
    body = stale_write.get_json()
    assert body["code"] == "REVISION_CONFLICT"
    assert body["expected_revision"] == 1


@pytest.mark.parametrize("last_mode", ["schedule", "publish"])
def test_project_shell_state_rejects_unshipped_shell_modes(client, last_mode):
    _insert_course(103, "MSK")

    response = client.put(
        "/api/tutor/project-shell/state",
        json={"course_id": 103, "last_mode": last_mode, "revision": 0},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "last_mode must be one of ['studio', 'tutor']"


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


def test_material_file_route_streams_original_file(client, tmp_path, monkeypatch):
    # Point the uploads root at the pytest tmp dir so the SEC1 containment
    # check (added 2026-04-22) accepts files written inside tmp_path as
    # legitimately-served materials.
    from dashboard import api_tutor_utils as _utils

    monkeypatch.setattr(_utils, "UPLOADS_DIR", tmp_path, raising=False)

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


def test_studio_run_returns_combined_shell_and_studio_state(client):
    _insert_course(120, "Physiology")
    _insert_tutor_session(120, "studio-run-120", "Cardiac Output")

    save_response = client.put(
        "/api/tutor/project-shell/state",
        json={
            "course_id": 120,
            "active_tutor_session_id": "studio-run-120",
            "last_mode": "studio",
            "active_board_scope": "project",
            "prime_packet_promoted_objects": [],
            "polish_packet_promoted_notes": [
                {
                    "id": "assistant-12",
                    "title": "Tutor Reply 12",
                    "content": "Afterload raises ventricular work.",
                    "badge": "TUTOR",
                }
            ],
            "selected_material_ids": [12],
            "revision": 0,
        },
    )
    assert save_response.status_code == 200

    capture_response = client.post(
        "/api/tutor/studio/capture",
        json={
            "course_id": 120,
            "tutor_session_id": "studio-run-120",
            "scope": "session",
            "item_type": "note",
            "title": "Repair note",
            "body_markdown": "Revisit preload vs afterload.",
            "status": "boarded",
        },
    )
    assert capture_response.status_code == 201

    response = client.get(
        "/api/tutor/studio-run",
        query_string={
            "course_id": 120,
            "tutor_session_id": "studio-run-120",
        },
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["course"]["id"] == 120
    assert body["workspace_state"]["active_tutor_session_id"] == "studio-run-120"
    assert len(body["workspace_state"]["polish_packet_promoted_notes"]) == 1
    assert body["workspace_state"]["polish_packet_promoted_notes"][0]["title"] == "Tutor Reply 12"
    assert body["studio_restore"]["counts"]["total"] == 1
    assert body["studio_restore"]["items"][0]["title"] == "Repair note"
    assert body["publish_confirmation_required"] is True


def test_studio_run_put_persists_workspace_state_and_blocks_publish(client):
    _insert_course(121, "Renal")
    _insert_tutor_session(121, "studio-run-121", "Filtration")

    blocked_response = client.put(
        "/api/tutor/studio-run",
        json={
            "course_id": 121,
            "workspace_state": {"revision": 0},
            "request_publish": True,
        },
    )
    assert blocked_response.status_code == 400
    assert blocked_response.get_json()["error"] == "publish requires explicit user confirmation"

    response = client.put(
        "/api/tutor/studio-run",
        json={
            "course_id": 121,
            "tutor_session_id": "studio-run-121",
            "workspace_state": {
                "active_tutor_session_id": "studio-run-121",
                "last_mode": "studio",
                "active_board_scope": "project",
                "active_board_id": None,
                "viewer_state": {"sourcePath": "Uploads/renal.pdf", "page": 2},
                "runtime_state": {
                    "active_memory_capsule_id": 22,
                    "compaction_telemetry": {
                        "tokenCount": 9900,
                        "contextWindow": 24000,
                        "pressureLevel": "medium",
                    },
                    "direct_note_save_status": {
                        "state": "saved",
                        "path": "Tutor Workspace/Renal Note.md",
                    },
                    "notes_draft": {
                        "session_key": "session:studio-run-121",
                        "content": "Filtration note",
                    },
                },
                "tutor_chain_id": 55,
                "tutor_custom_block_ids": [7, 8],
                "prime_packet_promoted_objects": [],
                "polish_packet_promoted_notes": [
                    {
                        "id": "assistant-2",
                        "title": "Tutor Reply 2",
                        "content": "Filtration fraction depends on GFR relative to renal plasma flow.",
                        "badge": "TUTOR",
                    }
                ],
                "selected_material_ids": [21],
                "revision": 0,
            },
        },
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["workspace_state"]["revision"] == 1
    assert body["workspace_state"]["viewer_state"]["page"] == 2
    assert body["workspace_state"]["runtime_state"]["active_memory_capsule_id"] == 22
    assert body["workspace_state"]["runtime_state"]["notes_draft"]["content"] == "Filtration note"
    assert body["workspace_state"]["tutor_chain_id"] == 55
    assert body["workspace_state"]["tutor_custom_block_ids"] == [7, 8]
    assert len(body["workspace_state"]["polish_packet_promoted_notes"]) == 1
    assert body["publish_confirmation_required"] is True

    restore_response = client.get("/api/tutor/studio-run", query_string={"course_id": 121})
    assert restore_response.status_code == 200
    restored = restore_response.get_json()
    assert restored["workspace_state"]["selected_material_ids"] == [21]
    assert restored["workspace_state"]["runtime_state"]["direct_note_save_status"]["state"] == "saved"
    assert restored["workspace_state"]["runtime_state"]["notes_draft"]["session_key"] == "session:studio-run-121"
    assert restored["workspace_state"]["tutor_chain_id"] == 55
    assert restored["workspace_state"]["tutor_custom_block_ids"] == [7, 8]
    assert restored["workspace_state"]["polish_packet_promoted_notes"][0]["title"] == "Tutor Reply 2"


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
