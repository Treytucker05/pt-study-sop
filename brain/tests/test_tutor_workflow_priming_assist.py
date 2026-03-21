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
                "method_outputs": {
                    "M-PRE-013": {
                        "summary": "Brainstem nuclei are organized by modality and pathway.",
                        "major_sections": ["cranial nerve nuclei", "functional columns"],
                    },
                    "M-PRE-005": {
                        "concepts": ["cranial nerve nuclei", "functional columns"],
                        "map": "graph TD\nROOT[Brainstem] --> COLS[Functional columns]",
                        "follow_up_targets": ["Need a cleaner map of modalities by level."],
                    },
                }
            }
        )
    )

    response = client.post(
        f"/api/tutor/workflows/{workflow_id}/priming-assist",
        json={
            "material_ids": [11, 22],
            "study_unit": "Week 9",
            "topic": "Brainstem",
            "priming_methods": ["summary_first", "concept_mapping"],
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
        assert [run["method_id"] for run in item["method_outputs"]] == ["M-PRE-013", "M-PRE-005"]
        priming_output = item["priming_output"]
        assert priming_output["material_id"] == item["id"]
        assert priming_output["title"] == item["title"]
        assert priming_output["source_path"] == item["source_path"]
        assert priming_output["summary"] == "Brainstem nuclei are organized by modality and pathway."
        assert priming_output["concepts"] == ["cranial nerve nuclei", "functional columns"]
        assert priming_output["root_explanation"] == "graph TD\nROOT[Brainstem] --> COLS[Functional columns]"
        assert priming_output["terminology"] == []
        assert priming_output["gaps"] == ["Need a cleaner map of modalities by level."]
        assert priming_output["learning_objectives"] == []

    aggregate = body["aggregate"]
    assert [run["method_id"] for run in body["priming_method_runs"]] == ["M-PRE-013", "M-PRE-005"]
    assert len(aggregate["summaries"]) == 2
    assert len(aggregate["concepts"]) == 4
    assert len(aggregate["terminology"]) == 0
    assert len(aggregate["root_explanations"]) == 2
    assert len(aggregate["identified_gaps"]) == 2
    assert len(aggregate["learning_objectives"]) == 0
    assert {item["material_id"] for item in aggregate["summaries"]} == {11, 22}
    assert "Selected Priming methods: M-PRE-013 (Big-Picture Orientation Summary), M-PRE-005 (Skeleton Concept Hierarchy)" in mock_llm.last_args["user_prompt"]
    assert "Priming chain:" not in mock_llm.last_args["user_prompt"]
    assert "Selected method logic:" in mock_llm.last_args["user_prompt"]
    assert "Coverage mode: full material coverage" in mock_llm.last_args["user_prompt"]


def test_priming_assist_merges_new_method_outputs_into_existing_inventory(client, mock_llm):
    course_id = 902
    _insert_course(course_id, "Neuro")
    _insert_material(
        33,
        course_id=course_id,
        title="Week 9 Notes",
        source_path="/tmp/week9-notes.txt",
        file_type="txt",
        content="Basal ganglia circuits regulate movement scaling and suppression.",
    )

    workflow_response = client.post(
        "/api/tutor/workflows",
        json={
            "course_id": course_id,
            "study_unit": "Week 9",
            "topic": "Basal ganglia",
            "current_stage": "priming",
            "status": "priming_in_progress",
        },
    )
    assert workflow_response.status_code == 200
    workflow_id = workflow_response.get_json()["workflow"]["workflow_id"]

    mock_llm.set_response(
        json.dumps(
            {
                "method_outputs": {
                    "M-PRE-013": {
                        "summary": "Basal ganglia set movement selection context.",
                        "major_sections": ["selection", "suppression"],
                    }
                }
            }
        )
    )

    response = client.post(
        f"/api/tutor/workflows/{workflow_id}/priming-assist",
        json={
            "material_ids": [33],
            "study_unit": "Week 9",
            "topic": "Basal ganglia",
            "priming_methods": ["M-PRE-013"],
            "source_inventory": [
                {
                    "id": 33,
                    "title": "Week 9 Notes",
                    "source_path": "/tmp/week9-notes.txt",
                    "method_outputs": [
                        {
                            "method_id": "M-PRE-010",
                            "method_name": "Learning Objectives Primer",
                            "output_family": "learning_objectives",
                            "outputs": {
                                "learning_objectives": [
                                    {"lo_code": "LO-1", "title": "Explain direct vs indirect pathway roles"}
                                ]
                            },
                            "source_ids": [33],
                            "status": "complete",
                            "updated_at": "2026-03-20T10:00:00Z",
                        }
                    ],
                }
            ],
        },
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body.get("failures") in (None, [])
    item = body["source_inventory"][0]
    assert [run["method_id"] for run in item["method_outputs"]] == ["M-PRE-010", "M-PRE-013"]
    assert {run["method_id"] for run in body["priming_method_runs"]} == {"M-PRE-010", "M-PRE-013"}
    assert body["aggregate"]["learning_objectives"] == [
        {
            "material_id": 33,
            "lo_code": "LO-1",
            "title": "Explain direct vs indirect pathway roles",
        }
    ]


def test_priming_assist_uses_method_logic_and_existing_outputs_as_prompt_context(client, mock_llm):
    course_id = 903
    _insert_course(course_id, "Neuro")
    _insert_material(
        44,
        course_id=course_id,
        title="Week 10 Objectives",
        source_path="/tmp/week10-objectives.txt",
        file_type="txt",
        content="Objective 1: Explain the vestibulospinal tract. Objective 2: Compare reticulospinal pathways.",
    )

    workflow_response = client.post(
        "/api/tutor/workflows",
        json={
            "course_id": course_id,
            "study_unit": "Week 10",
            "topic": "Descending pathways",
            "current_stage": "priming",
            "status": "priming_in_progress",
        },
    )
    assert workflow_response.status_code == 200
    workflow_id = workflow_response.get_json()["workflow"]["workflow_id"]

    mock_llm.set_response(
        json.dumps(
            {
                "method_outputs": {
                    "M-PRE-010": {
                        "learning_objectives": [
                            {"lo_code": "LO-1", "title": "Explain the vestibulospinal tract"}
                        ]
                    }
                }
            }
        )
    )

    response = client.post(
        f"/api/tutor/workflows/{workflow_id}/priming-assist",
        json={
            "material_ids": [44],
            "study_unit": "Week 10",
            "topic": "Descending pathways",
            "priming_methods": ["M-PRE-010"],
            "source_inventory": [
                {
                    "id": 44,
                    "title": "Week 10 Objectives",
                    "source_path": "/tmp/week10-objectives.txt",
                    "method_outputs": [
                        {
                            "method_id": "M-PRE-010",
                            "method_name": "Learning Objectives Primer",
                            "output_family": "learning_objectives",
                            "outputs": {
                                "learning_objectives": [
                                    {"lo_code": "LO-1", "title": "Explain the vestibulospinal tract"}
                                ]
                            },
                            "source_ids": [44],
                            "status": "complete",
                            "updated_at": "2026-03-20T10:00:00Z",
                        }
                    ],
                }
            ],
        },
    )

    assert response.status_code == 200
    prompt = mock_llm.last_args["user_prompt"]
    assert "Facilitation logic:" in prompt
    assert "Objective source precedence:" in prompt
    assert "Existing outputs already stored for the selected methods on this material:" in prompt
    assert "Explain the vestibulospinal tract" in prompt
    assert "prefer stable counts and stable wording across reruns" in prompt


def test_priming_assist_uses_full_material_coverage_for_long_content(client, mock_llm):
    course_id = 904
    _insert_course(course_id, "Neuro")
    long_content = ("Vestibular nuclei organize balance signals. " * 900).strip()
    _insert_material(
        55,
        course_id=course_id,
        title="Long Neuro Packet",
        source_path="/tmp/long-neuro-packet.txt",
        file_type="txt",
        content=long_content,
    )

    workflow_response = client.post(
        "/api/tutor/workflows",
        json={
            "course_id": course_id,
            "study_unit": "Week 10",
            "topic": "Vestibular pathways",
            "current_stage": "priming",
            "status": "priming_in_progress",
        },
    )
    assert workflow_response.status_code == 200
    workflow_id = workflow_response.get_json()["workflow"]["workflow_id"]

    mock_llm.set_response(
        json.dumps(
            {
                "method_outputs": {
                    "M-PRE-013": {
                        "summary": "Vestibular nuclei organize balance pathways.",
                        "major_sections": ["vestibular nuclei", "balance pathways"],
                    }
                }
            }
        )
    )

    response = client.post(
        f"/api/tutor/workflows/{workflow_id}/priming-assist",
        json={
            "material_ids": [55],
            "study_unit": "Week 10",
            "topic": "Vestibular pathways",
            "priming_methods": ["M-PRE-013"],
        },
    )

    assert response.status_code == 200
    assert mock_llm.call_count == 5
    assert "Current chunk: 1/4" in mock_llm.call_history[0]["user_prompt"]
    assert "Current chunk: 4/4" in mock_llm.call_history[3]["user_prompt"]
    assert "Chunk count: 4" in mock_llm.call_history[4]["user_prompt"]
