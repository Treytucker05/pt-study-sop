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


def _insert_material(
    material_id: int,
    *,
    course_id: int,
    title: str,
    source_path: str,
    file_type: str,
    content: str,
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
        (material_id, title, source_path, source_path, file_type, content, course_id),
    )
    conn.commit()
    conn.close()


def test_priming_assist_returns_source_linked_outputs(client, mock_llm):
    course_id = 901
    _insert_course(course_id, "Neuro")
    _insert_material(
        11,
        course_id=course_id,
        title="Brainstem Slides",
        source_path="/tmp/brainstem-slides.pdf",
        file_type="pdf",
        content="Brainstem nuclei organize motor and sensory pathways for cranial nerves.",
    )
    _insert_material(
        22,
        course_id=course_id,
        title="Cranial Nerve Notes",
        source_path="/tmp/cranial-notes.txt",
        file_type="txt",
        content="Cranial nerve nuclei can be grouped by modality and longitudinal columns.",
    )

    workflow_response = client.post(
        "/api/tutor/workflows",
        json={
            "course_id": course_id,
            "study_unit": "Week 9",
            "topic": "Brainstem",
            "current_stage": "priming",
            "status": "priming_in_progress",
        },
    )
    assert workflow_response.status_code == 200
    workflow_id = workflow_response.get_json()["workflow"]["workflow_id"]

    mock_llm.set_response(
        json.dumps(
            {
                "summary": "Brainstem nuclei are organized by modality and pathway.",
                "concepts": ["cranial nerve nuclei", "functional columns"],
                "terminology": ["somatic motor", "visceral sensory"],
                "root_explanation": "Columns help explain how nuclei align across the brainstem.",
                "gaps": ["Need a cleaner map of modalities by level."],
                "learning_objectives": [{"title": "Map cranial nerve nuclei by column", "lo_code": "LO-9A"}],
            }
        )
    )

    response = client.post(
        f"/api/tutor/workflows/{workflow_id}/priming-assist",
        json={
            "material_ids": [11, 22],
            "study_unit": "Week 9",
            "topic": "Brainstem",
            "priming_method": "summary_first",
            "priming_chain_id": "ingest_objectives_concepts_summary_gaps",
        },
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body.get("failures") in (None, [])
    assert mock_llm.call_count == 2

    source_inventory = body["source_inventory"]
    assert [item["id"] for item in source_inventory] == [11, 22]
    assert {item["content_type"] for item in source_inventory} == {"pdf", "txt"}

    for item in source_inventory:
        priming_output = item["priming_output"]
        assert priming_output["material_id"] == item["id"]
        assert priming_output["title"] == item["title"]
        assert priming_output["source_path"] == item["source_path"]
        assert priming_output["summary"] == "Brainstem nuclei are organized by modality and pathway."
        assert priming_output["concepts"] == ["cranial nerve nuclei", "functional columns"]
        assert priming_output["terminology"] == ["somatic motor", "visceral sensory"]
        assert priming_output["gaps"] == ["Need a cleaner map of modalities by level."]
        assert priming_output["learning_objectives"] == [
            {"title": "Map cranial nerve nuclei by column", "lo_code": "LO-9A"}
        ]

    aggregate = body["aggregate"]
    assert len(aggregate["summaries"]) == 2
    assert len(aggregate["concepts"]) == 4
    assert len(aggregate["terminology"]) == 4
    assert len(aggregate["root_explanations"]) == 2
    assert len(aggregate["identified_gaps"]) == 2
    assert len(aggregate["learning_objectives"]) == 2
    assert {item["material_id"] for item in aggregate["summaries"]} == {11, 22}
