from __future__ import annotations

import json
import os
import sqlite3
import tempfile

import config
import db_setup
import pytest
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


def test_delete_tutor_workflow_removes_related_rows(client):
    course_id = 903
    _insert_course(course_id, "Exercise Physiology")

    workflow_response = client.post(
        "/api/tutor/workflows",
        json={
            "course_id": course_id,
            "assignment_title": "Week 7 Study Plan",
            "study_unit": "Week 7",
            "topic": "Cardiovascular regulation",
            "current_stage": "priming",
            "status": "priming_in_progress",
        },
    )
    assert workflow_response.status_code == 200
    workflow_id = workflow_response.get_json()["workflow"]["workflow_id"]

    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO tutor_priming_bundles (
            workflow_id, course_id, study_unit, topic, selected_material_ids_json,
            selected_paths_json, source_inventory_json, priming_method, priming_chain_id,
            learning_objectives_json, concepts_json, concept_graph_json, terminology_json,
            root_explanations_json, summaries_json, identified_gaps_json,
            confidence_flags_json, readiness_status, readiness_blockers_json,
            recommended_tutor_strategy_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, '[]', '[]', '[]', ?, ?, '[]', '[]', '{}', '[]', '[]', '[]', '[]', '{}', ?, '[]', '{}', datetime('now'), datetime('now'))
        """,
        (
            workflow_id,
            course_id,
            "Week 7",
            "Cardiovascular regulation",
            "summary_first",
            "ingest_objectives_concepts_summary_gaps",
            "ready",
        ),
    )
    priming_bundle_id = int(cur.lastrowid)

    cur.execute(
        """
        INSERT INTO tutor_captured_notes (
            workflow_id, tutor_session_id, stage, note_mode, title, content, status
        ) VALUES (?, NULL, 'tutor', 'exact', 'Exact note', 'Important point', 'captured')
        """,
        (workflow_id,),
    )
    cur.execute(
        """
        INSERT INTO tutor_feedback_events (
            workflow_id, tutor_session_id, stage, source_type, source_id, sentiment, issue_type, message, handoff_to_polish
        ) VALUES (?, NULL, 'tutor', 'session', 'session-1', 'liked', 'good', 'Helpful', 1)
        """,
        (workflow_id,),
    )
    cur.execute(
        """
        INSERT INTO tutor_stage_time_logs (
            workflow_id, stage, start_ts, end_ts, seconds_active, pause_count, notes_json, trigger_source
        ) VALUES (?, 'tutor', datetime('now'), datetime('now'), 120, 0, '[]', 'test')
        """,
        (workflow_id,),
    )
    cur.execute(
        """
        INSERT INTO tutor_memory_capsules (
            workflow_id, tutor_session_id, stage, capsule_version, summary_text, current_objective, study_unit,
            concept_focus_json, weak_points_json, unresolved_questions_json, exact_notes_json,
            editable_notes_json, feedback_json, card_requests_json, artifact_refs_json, source_turn_ids_json
        ) VALUES (?, NULL, 'tutor', 1, 'Summary', 'LO-1', 'Week 7', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]')
        """,
        (workflow_id,),
    )
    cur.execute(
        """
        INSERT INTO tutor_polish_bundles (
            workflow_id, tutor_session_id, priming_bundle_id, exact_notes_json, editable_notes_json,
            summaries_json, feedback_queue_json, card_requests_json, reprime_requests_json,
            studio_payload_json, publish_targets_json, status, created_at, updated_at
        ) VALUES (?, NULL, ?, '[]', '[]', '[]', '[]', '[]', '[]', '{}', '{}', 'draft', datetime('now'), datetime('now'))
        """,
        (workflow_id, priming_bundle_id),
    )
    polish_bundle_id = int(cur.lastrowid)
    cur.execute(
        """
        INSERT INTO tutor_publish_results (
            workflow_id, polish_bundle_id, obsidian_results_json, anki_results_json,
            brain_index_payload_json, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, '{}', 'completed', datetime('now'), datetime('now'))
        """,
        (
            workflow_id,
            polish_bundle_id,
            json.dumps([{"success": True}]),
            json.dumps([{"success": True}]),
        ),
    )
    conn.commit()
    conn.close()

    delete_response = client.delete(f"/api/tutor/workflows/{workflow_id}")
    assert delete_response.status_code == 200
    body = delete_response.get_json()
    assert body["deleted"] is True
    assert body["workflow_id"] == workflow_id
    assert body["related_records_deleted"] == {
        "publish_results": 1,
        "polish_bundles": 1,
        "memory_capsules": 1,
        "stage_time_logs": 1,
        "feedback_events": 1,
        "captured_notes": 1,
        "priming_bundles": 1,
    }

    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    for table in (
        "tutor_workflows",
        "tutor_priming_bundles",
        "tutor_captured_notes",
        "tutor_feedback_events",
        "tutor_stage_time_logs",
        "tutor_memory_capsules",
        "tutor_polish_bundles",
        "tutor_publish_results",
    ):
        cur.execute(f"SELECT COUNT(*) FROM {table} WHERE workflow_id = ?", (workflow_id,))
        assert cur.fetchone()[0] == 0
    conn.close()

    missing_response = client.get(f"/api/tutor/workflows/{workflow_id}")
    assert missing_response.status_code == 404


def test_put_priming_bundle_creates_new_row(client):
    """Regression: INSERT path needs created_at AND updated_at (24 params)."""
    course_id = 904
    _insert_course(course_id, "Anatomy")

    wf_resp = client.post(
        "/api/tutor/workflows",
        json={
            "course_id": course_id,
            "assignment_title": "Week 1 Study Plan",
            "study_unit": "Week 1",
            "topic": "Upper Extremity",
            "current_stage": "priming",
            "status": "priming_in_progress",
        },
    )
    assert wf_resp.status_code == 200
    workflow_id = wf_resp.get_json()["workflow"]["workflow_id"]

    bundle_resp = client.put(
        f"/api/tutor/workflows/{workflow_id}/priming-bundle",
        json={
            "course_id": course_id,
            "study_unit": "Week 1",
            "topic": "Upper Extremity",
            "selected_material_ids": [1],
            "selected_paths": [],
            "source_inventory": [],
            "priming_methods": ["M-PRE-010"],
            "priming_method_runs": [],
            "learning_objectives": [{"title": "Identify brachial plexus branches"}],
            "concepts": [],
            "terminology": [],
            "root_explanations": [],
            "summaries": [],
            "identified_gaps": [],
            "readiness_status": "ready",
            "readiness_blockers": [],
        },
    )
    assert bundle_resp.status_code == 200, f"PUT priming-bundle failed: {bundle_resp.get_json()}"
    body = bundle_resp.get_json()
    assert body["priming_bundle"] is not None
    assert body["priming_bundle"]["study_unit"] == "Week 1"
    assert len(body["priming_bundle"]["learning_objectives"]) == 1

    # Verify UPDATE path also works (second PUT to same workflow)
    bundle_resp2 = client.put(
        f"/api/tutor/workflows/{workflow_id}/priming-bundle",
        json={
            "course_id": course_id,
            "study_unit": "Week 1",
            "topic": "Upper Extremity",
            "selected_material_ids": [1, 2],
            "selected_paths": [],
            "source_inventory": [],
            "priming_methods": ["M-PRE-010", "M-PRE-008"],
            "priming_method_runs": [],
            "learning_objectives": [
                {"title": "Identify brachial plexus branches"},
                {"title": "Describe rotator cuff anatomy"},
            ],
            "concepts": [],
            "terminology": [],
            "root_explanations": [],
            "summaries": [],
            "identified_gaps": [],
            "readiness_status": "ready",
            "readiness_blockers": [],
        },
    )
    assert bundle_resp2.status_code == 200
    body2 = bundle_resp2.get_json()
    assert len(body2["priming_bundle"]["learning_objectives"]) == 2
    assert len(body2["priming_bundle"]["selected_material_ids"]) == 2
