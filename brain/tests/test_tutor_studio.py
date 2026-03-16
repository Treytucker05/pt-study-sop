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


def _insert_course(course_id: int, name: str = "Neuroscience") -> None:
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


def _insert_workspace_state(course_id: int, session_id: str) -> None:
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
        VALUES (?, ?, 'studio', 'project', '[11,22]', 3, datetime('now'))
        """,
        (course_id, session_id),
    )
    conn.commit()
    conn.close()


def _insert_tutor_session(
    course_id: int,
    session_id: str,
    *,
    topic: str,
    status: str = "active",
    started_at: str,
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO tutor_sessions (
            session_id, course_id, phase, topic, status, turn_count, started_at, ended_at
        )
        VALUES (?, ?, 'first_pass', ?, ?, 4, ?, NULL)
        """,
        (session_id, course_id, topic, status, started_at),
    )
    conn.commit()
    conn.close()


def _insert_course_event(course_id: int, *, title: str) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO course_events (course_id, course, type, title, date, due_date, status, created_at)
        VALUES (?, ?, 'assignment', ?, '2026-03-20', '2026-03-20', 'pending', datetime('now'))
        """,
        (course_id, f"C-{course_id}", title),
    )
    conn.commit()
    conn.close()


def _insert_material(
    material_id: int,
    *,
    course_id: int,
    title: str,
    source_path: str,
    file_type: str = "pdf",
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO rag_docs (
            id, title, source_path, file_path, file_type, content,
            course_id, corpus, enabled, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, '', ?, 'materials', 1, datetime('now'), datetime('now'))
        """,
        (material_id, title, source_path, source_path, file_type, course_id),
    )
    conn.commit()
    conn.close()


def _insert_learning_objective(
    objective_id: int,
    *,
    course_id: int,
    title: str,
    lo_code: str,
    group_name: str,
    status: str = "not_started",
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO learning_objectives (
            id, course_id, module_id, lo_code, title, status,
            last_session_id, last_session_date, next_action, group_name,
            managed_by_tutor, created_at, updated_at
        )
        VALUES (?, ?, NULL, ?, ?, ?, NULL, NULL, NULL, ?, 1, datetime('now'), datetime('now'))
        """,
        (objective_id, course_id, lo_code, title, status, group_name),
    )
    conn.commit()
    conn.close()


def _insert_card_draft(
    draft_id: int,
    *,
    course_id: int | None,
    session_id: str | None,
    tutor_session_id: str | None,
    deck_name: str,
    status: str = "draft",
    front: str = "Front",
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO card_drafts (
            id, session_id, course_id, topic_id, deck_name, card_type, front, back,
            tags, source_citation, status, anki_note_id, created_at, synced_at, tutor_session_id
        )
        VALUES (?, ?, ?, NULL, ?, 'basic', ?, 'Back', '', NULL, ?, NULL, datetime('now'), NULL, ?)
        """,
        (draft_id, session_id, course_id, deck_name, front, status, tutor_session_id),
    )
    conn.commit()
    conn.close()


def _insert_studio_item(
    item_id: int,
    *,
    course_id: int,
    scope: str,
    status: str,
    tutor_session_id: str | None = None,
    item_type: str = "note",
    title: str | None = None,
    body_markdown: str = "Saved note",
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO studio_items (
            id, course_id, tutor_session_id, scope, item_type, source_kind, title,
            body_markdown, source_path, source_locator_json, payload_json, status,
            promoted_from_id, version, deleted_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'studio', ?, ?, NULL, NULL, NULL, ?, NULL, 1, NULL, ?, ?)
        """,
        (
            item_id,
            course_id,
            tutor_session_id,
            scope,
            item_type,
            title or f"Item {item_id}",
            body_markdown,
            status,
            "2026-03-15T10:00:00+00:00",
            "2026-03-15T10:00:00+00:00",
        ),
    )
    conn.commit()
    conn.close()


def _insert_studio_action(
    action_id: int,
    *,
    course_id: int,
    tutor_session_id: str | None,
    action_type: str,
    created_at: str,
) -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT INTO studio_actions (
            id, idempotency_key, course_id, tutor_session_id, action_type,
            destination_kind, request_id, status, details_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, 'project', ?, 'completed', '{}', ?)
        """,
        (action_id, f"{action_type}:{action_id}", course_id, tutor_session_id, action_type, f"req-{action_id}", created_at),
    )
    conn.commit()
    conn.close()


def test_studio_overview_returns_course_scoped_l2_payload(client):
    _insert_course(201, "Neuro")
    _insert_tutor_session(
        201,
        "tutor-neuro-1",
        topic="Brainstem Review",
        started_at="2026-03-15T09:00:00+00:00",
    )
    _insert_tutor_session(
        201,
        "tutor-neuro-0",
        topic="Cerebellum Review",
        status="completed",
        started_at="2026-03-14T09:00:00+00:00",
    )
    _insert_workspace_state(201, "tutor-neuro-1")
    _insert_course_event(201, title="Neuro Case Study")
    _insert_material(11, course_id=201, title="Z Slides", source_path="/tmp/z-slides.pdf")
    _insert_material(22, course_id=201, title="A Notes", source_path="/tmp/a-notes.txt", file_type="txt")
    _insert_learning_objective(
        301,
        course_id=201,
        lo_code="LO-1",
        title="Explain brainstem pathways",
        group_name="Unit 1",
        status="in_progress",
    )
    _insert_card_draft(
        401,
        course_id=201,
        session_id="legacy-session",
        tutor_session_id=None,
        deck_name="Deck Alpha",
        front="Direct course draft",
        status="draft",
    )
    _insert_card_draft(
        402,
        course_id=None,
        session_id="tutor-neuro-1",
        tutor_session_id="tutor-neuro-1",
        deck_name="Deck Beta",
        front="Session fallback draft",
        status="approved",
    )
    _insert_studio_item(
        501,
        course_id=201,
        tutor_session_id="tutor-neuro-1",
        scope="session",
        status="captured",
        title="Captured Summary",
    )
    _insert_studio_item(
        502,
        course_id=201,
        tutor_session_id=None,
        scope="project",
        status="promoted",
        title="Promoted Note",
    )
    _insert_studio_action(
        601,
        course_id=201,
        tutor_session_id="tutor-neuro-1",
        action_type="promote",
        created_at="2026-03-15T10:30:00+00:00",
    )

    response = client.get("/api/tutor/studio/overview?course_id=201")

    assert response.status_code == 200
    body = response.get_json()
    assert body["course"]["id"] == 201
    assert body["shell"]["workspace_state"]["active_tutor_session_id"] == "tutor-neuro-1"
    assert body["shell"]["continuation"]["active_tutor_session_id"] == "tutor-neuro-1"
    assert body["shell"]["counts"]["session_count"] == 2
    assert body["shell"]["counts"]["studio_total_items"] == 2
    assert body["shell"]["counts"]["studio_captured_items"] == 1
    assert body["shell"]["counts"]["studio_promoted_items"] == 1
    assert body["shell"]["counts"]["pending_schedule_events"] == 1

    assert [item["title"] for item in body["materials"]] == ["A Notes", "Z Slides"]
    assert body["objectives"][0]["groupName"] == "Unit 1"
    assert body["card_drafts"]["counts"]["total"] == 2
    assert {item["front"] for item in body["card_drafts"]["items"]} == {
        "Direct course draft",
        "Session fallback draft",
    }
    assert body["vault_resources"]["counts"]["total"] == 1
    assert body["vault_resources"]["items"][0]["title"] == "Promoted Note"
    assert {item["kind"] for item in body["recent_activity"]} == {"session", "studio_action"}


def test_studio_overview_requires_existing_course(client):
    response = client.get("/api/tutor/studio/overview?course_id=999")

    assert response.status_code == 404
    assert response.get_json()["error"] == "course not found"


def test_restore_excludes_archived_items_by_default(client):
    _insert_course(301, "Movement Science")
    _insert_tutor_session(
        301,
        "tutor-move-1",
        topic="Hip Review",
        started_at="2026-03-15T11:00:00+00:00",
    )
    _insert_studio_item(
        701,
        course_id=301,
        tutor_session_id="tutor-move-1",
        scope="session",
        status="captured",
        title="Visible Capture",
    )
    _insert_studio_item(
        702,
        course_id=301,
        tutor_session_id="tutor-move-1",
        scope="session",
        status="archived",
        title="Archived Capture",
    )

    response = client.get("/api/tutor/studio/restore?course_id=301&scope=session&tutor_session_id=tutor-move-1")

    assert response.status_code == 200
    body = response.get_json()
    assert [item["id"] for item in body["items"]] == [701]
    assert body["counts"] == {
        "total": 1,
        "captured": 1,
        "boarded": 0,
        "promoted": 0,
        "archived": 0,
    }

    archived_response = client.get(
        "/api/tutor/studio/restore?course_id=301&scope=session&tutor_session_id=tutor-move-1&include_archived=1"
    )
    archived_body = archived_response.get_json()
    assert archived_response.status_code == 200
    assert [item["id"] for item in archived_body["items"]] == [702, 701]
    assert archived_body["counts"]["archived"] == 1


def test_update_item_writes_revisions_and_history(client):
    _insert_course(302, "Therapeutic Intervention")
    _insert_tutor_session(
        302,
        "tutor-ti-1",
        topic="Lumbar Review",
        started_at="2026-03-15T12:00:00+00:00",
    )
    _insert_studio_item(
        801,
        course_id=302,
        tutor_session_id="tutor-ti-1",
        scope="session",
        status="captured",
        title="Initial Summary",
        body_markdown="Original body",
    )

    response = client.patch(
        "/api/tutor/studio/items/801",
        json={
            "title": "Boarded Summary",
            "body_markdown": "Updated body",
            "payload": {"kind": "summary", "score": 4},
            "source_locator": {"material_id": 11, "page": 3},
            "status": "boarded",
        },
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["item"]["title"] == "Boarded Summary"
    assert body["item"]["body_markdown"] == "Updated body"
    assert body["item"]["payload"] == {"kind": "summary", "score": 4}
    assert body["item"]["source_locator"] == {"material_id": 11, "page": 3}
    assert body["item"]["status"] == "boarded"
    assert body["item"]["version"] == 2

    revisions_response = client.get("/api/tutor/studio/items/801/revisions")
    assert revisions_response.status_code == 200
    revisions = revisions_response.get_json()["revisions"]
    assert [revision["revision"] for revision in revisions] == [2, 1]
    assert revisions[0]["body_markdown"] == "Updated body"
    assert revisions[0]["payload"] == {"kind": "summary", "score": 4}
    assert revisions[0]["source_locator"] == {"material_id": 11, "page": 3}
    assert revisions[1]["body_markdown"] == "Original body"
    assert revisions[1]["payload"] is None
    assert revisions[1]["source_locator"] is None

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    action_row = conn.execute(
        """
        SELECT action_type, details_json
        FROM studio_actions
        WHERE course_id = 302
        ORDER BY id DESC
        LIMIT 1
        """
    ).fetchone()
    conn.close()
    assert action_row is not None
    assert action_row["action_type"] == "board"
    assert "\"version\": 2" in action_row["details_json"]


def test_update_item_rejects_invalid_status_transition(client):
    _insert_course(303, "Exercise Physiology")
    _insert_studio_item(
        901,
        course_id=303,
        tutor_session_id=None,
        scope="project",
        status="promoted",
        title="Promoted Resource",
    )

    response = client.patch("/api/tutor/studio/items/901", json={"status": "archived"})

    assert response.status_code == 400
    body = response.get_json()
    assert body["error"] == "invalid status transition"
    assert body["current_status"] == "promoted"
    assert body["next_status"] == "archived"
