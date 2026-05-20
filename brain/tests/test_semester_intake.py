from __future__ import annotations

import importlib.util
import os
import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
import dashboard.api_adapter as _api_adapter_mod
from dashboard.app import create_app
from text_extractor import get_pdf_capabilities


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "semester-intake.db"
    original_db_path = config.DB_PATH
    original_db_setup = db_setup.DB_PATH

    config.DB_PATH = str(db_path)
    db_setup.DB_PATH = str(db_path)
    monkeypatch.setenv("PT_STUDY_DB", str(db_path))
    db_setup.init_database()

    app = create_app()
    app.config["TESTING"] = True
    yield app.test_client()

    config.DB_PATH = original_db_path
    db_setup.DB_PATH = original_db_setup
    _api_adapter_mod._SELECTOR_COLS_ENSURED_SESSIONS = False


def _touch(path: Path, content: bytes = b"fixture") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def _course_count() -> int:
    conn = sqlite3.connect(config.DB_PATH)
    try:
        return int(conn.execute("SELECT COUNT(*) FROM courses").fetchone()[0])
    finally:
        conn.close()


def _insert_course(*, name: str, code: str | None = None) -> int:
    conn = sqlite3.connect(config.DB_PATH)
    try:
        cur = conn.execute(
            """
            INSERT INTO courses (name, code, default_study_mode, created_at)
            VALUES (?, ?, 'Core', '2026-05-13T00:00:00')
            """,
            (name, code),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def test_semester_document_extractors_are_available() -> None:
    missing = [
        module_name
        for module_name in ("docx", "pptx", "pdfplumber", "pymupdf4llm", "docling")
        if importlib.util.find_spec(module_name) is None
    ]
    assert missing == []

    capabilities = get_pdf_capabilities()
    assert capabilities["docling"] is True
    assert capabilities["pymupdf4llm"] is True
    assert capabilities["pdfplumber"] is True


def test_semester_intake_preview_classifies_files_without_writing(client, tmp_path):
    root = tmp_path / "PT School"
    _touch(root / "00_Class schedules" / "Summer Schedule PT School.pdf")
    _touch(root / "10_Dx Mgmt Integumtary" / "PHYT 6262_Hyb.docx")
    _touch(root / "10_Dx Mgmt Integumtary" / "Week 1 Slides.pdf")
    _touch(root / "13_Professionalism" / "PHYT 6109 Course Map and Schedule 2026.docx")
    _touch(root / "90_Misc" / "EXXAT Uploads" / "Resume_2026.pdf")

    response = client.post(
        "/api/semester-intake/preview",
        json={"folder_path": str(root)},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["counts"]["courses"] == 2
    assert payload["counts"]["schedule_files"] == 2
    assert payload["counts"]["material_files"] == 1
    assert _course_count() == 0

    dx_course = next(course for course in payload["courses"] if "Dx Mgmt" in course["name"])
    assert dx_course["folder_path"] == "10_Dx Mgmt Integumtary"
    assert dx_course["readiness"]["course"] == "missing"
    assert dx_course["syllabus_files"][0]["path"] == "10_Dx Mgmt Integumtary/PHYT 6262_Hyb.docx"
    assert dx_course["material_files"][0]["path"] == "10_Dx Mgmt Integumtary/Week 1 Slides.pdf"

    assert payload["global_schedule_files"][0]["path"] == "00_Class schedules/Summer Schedule PT School.pdf"
    assert payload["ignored_files"][0]["path"] == "90_Misc/EXXAT Uploads/Resume_2026.pdf"


def test_semester_intake_preview_matches_existing_course_by_file_code(
    client, tmp_path
):
    existing_course_id = _insert_course(
        name="Dx Mgmt Integumentary",
        code="PHYT 6262",
    )
    root = tmp_path / "PT School"
    _touch(root / "10_Dx Mgmt Integumtary" / "PHYT 6262 Dx Mgmt Integumentary Syllabus.docx")

    response = client.post(
        "/api/semester-intake/preview",
        json={"folder_path": str(root)},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["counts"]["courses"] == 1
    course = payload["courses"][0]
    assert course["name"] == "Dx Mgmt Integumtary"
    assert course["code"] == "PHYT 6262"
    assert course["course_id"] == existing_course_id
    assert course["readiness"]["course"] == "exists"
    assert _course_count() == 1


def test_semester_intake_preview_marks_existing_embedded_course_ready(
    client, tmp_path
):
    existing_course_id = _insert_course(
        name="Professionalism",
        code="PHYT 6109",
    )
    conn = sqlite3.connect(config.DB_PATH)
    try:
        cur = conn.execute(
            """
            INSERT INTO rag_docs (
                source_path, course_id, topic_tags, doc_type, content, checksum,
                metadata_json, corpus, enabled, created_at
            ) VALUES (?, ?, 'study-folder', 'pdf', 'content', 'checksum', '{}', 'materials', 1, '2026-05-13T00:00:00')
            """,
            (
                "13_Professionalism/Week 1.pdf",
                existing_course_id,
            ),
        )
        conn.execute(
            """
            INSERT INTO rag_embeddings (
                rag_doc_id, chunk_index, chunk_text, embedding_model, provider, chroma_id, created_at
            ) VALUES (?, 0, 'content', 'gemini-embedding-2-preview', 'gemini', 'chunk-1', '2026-05-13T00:00:00')
            """,
            (int(cur.lastrowid),),
        )
        conn.commit()
    finally:
        conn.close()

    root = tmp_path / "PT School"
    _touch(root / "13_Professionalism" / "PHYT 6109 Professionalism Syllabus.docx")

    response = client.post(
        "/api/semester-intake/preview",
        json={"folder_path": str(root)},
    )

    assert response.status_code == 200
    payload = response.get_json()
    course = payload["courses"][0]
    assert course["course_id"] == existing_course_id
    assert course["readiness"]["materials"] == "found"
    assert course["readiness"]["embeddings"] == "ready"
    assert course["readiness"]["readyForTutor"] is True


def test_semester_intake_apply_creates_courses_structured_data_and_sync_job(
    client, tmp_path, monkeypatch
):
    root = tmp_path / "PT School"
    _touch(root / "10_Dx Mgmt Integumtary" / "PHYT 6262 Syllabus.docx")
    _touch(root / "10_Dx Mgmt Integumtary" / "Week 1 Slides.pdf")

    launched_jobs = []

    def fake_launch_material_sync_job(root_path, allowed_exts, *, selected_files=None, course_id=None):
        launched_jobs.append(
            {
                "root": str(root_path),
                "allowed_exts": sorted(allowed_exts or []),
                "selected_files": sorted(selected_files or []),
                "course_id": course_id,
            }
        )
        return "semester-sync-job"

    monkeypatch.setattr(
        "dashboard.api_semester_intake._launch_materials_sync_job",
        fake_launch_material_sync_job,
    )

    response = client.post(
        "/api/semester-intake/apply",
        json={
            "folder_path": str(root),
            "courses": [
                {
                    "name": "Dx Mgmt Integumentary",
                    "code": "PHYT 6262",
                    "folder_path": "10_Dx Mgmt Integumtary",
                    "material_files": ["10_Dx Mgmt Integumtary/Week 1 Slides.pdf"],
                    "syllabus": {
                        "modules": [
                            {
                                "name": "Week 1 Wound Healing",
                                "orderIndex": 1,
                                "objectives": [
                                    {"loCode": "LO1", "title": "Explain wound healing phases"}
                                ],
                            }
                        ]
                    },
                    "schedule": {
                        "events": [
                            {
                                "type": "lecture",
                                "title": "Skin integrity lecture",
                                "date": "2026-05-12",
                                "startTime": "09:00",
                            }
                        ]
                    },
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["coursesCreated"] == 1
    assert payload["modulesCreated"] == 1
    assert payload["objectivesCreated"] == 1
    assert payload["eventsCreated"] == 1
    assert payload["materialSyncJobs"] == [{"courseId": 1, "jobId": "semester-sync-job"}]
    assert launched_jobs == [
        {
            "root": str(root),
            "allowed_exts": [],
            "selected_files": ["10_Dx Mgmt Integumtary/Week 1 Slides.pdf"],
            "course_id": 1,
        }
    ]

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        course = conn.execute("SELECT id, name, code FROM courses").fetchone()
        assert dict(course) == {
            "id": 1,
            "name": "Dx Mgmt Integumentary",
            "code": "PHYT 6262",
        }
        assert conn.execute("SELECT COUNT(*) FROM modules").fetchone()[0] == 1
        objective = conn.execute(
            "SELECT title, group_name FROM learning_objectives"
        ).fetchone()
        assert tuple(objective) == (
            "Explain wound healing phases",
            "Week 1 Wound Healing",
        )
        assert conn.execute("SELECT COUNT(*) FROM course_events").fetchone()[0] == 1
    finally:
        conn.close()


def test_semester_intake_apply_parses_setup_files_into_planning_tables(client, tmp_path):
    root = tmp_path / "PT School"
    setup_path = root / "10_Dx Mgmt Integumtary" / "PHYT 6262 Course Map and Schedule.txt"
    _touch(
        setup_path,
        (
            "WEEK 1: May 16 | Module 1: Wound Healing | "
            "VS Class 1: Tuesday, 5/12/26, 1-4 pm Topic: Skin lecture | "
            "Quiz #1 Due 5/13/26"
        ).encode("utf-8"),
    )

    response = client.post(
        "/api/semester-intake/apply",
        json={
            "folder_path": str(root),
            "courses": [
                {
                    "name": "Dx Mgmt Integumentary",
                    "folder_path": "10_Dx Mgmt Integumtary",
                    "syllabus_files": [
                        "10_Dx Mgmt Integumtary/PHYT 6262 Course Map and Schedule.txt"
                    ],
                    "schedule_files": [
                        "10_Dx Mgmt Integumtary/PHYT 6262 Course Map and Schedule.txt"
                    ],
                    "material_files": [],
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["setupFilesParsed"] == 1
    assert payload["setupParseErrors"] == []
    assert payload["modulesCreated"] == 1
    assert payload["objectivesCreated"] == 1
    assert payload["eventsCreated"] == 2

    conn = sqlite3.connect(config.DB_PATH)
    try:
        module_names = [
            row[0] for row in conn.execute("SELECT name FROM modules ORDER BY order_index")
        ]
        assert module_names == ["Week 1: Wound Healing"]
        objective = conn.execute(
            "SELECT lo_code, title, group_name FROM learning_objectives"
        ).fetchone()
        assert tuple(objective) == (
            "MOD-1",
            "Study Week 1: Wound Healing",
            "Week 1: Wound Healing",
        )
        events = conn.execute(
            "SELECT type, title, date, due_date FROM course_events ORDER BY type"
        ).fetchall()
        assert {row[0] for row in events} == {"lecture", "quiz"}
        assert {row[2] for row in events} == {"2026-05-12", "2026-05-13"}
    finally:
        conn.close()
