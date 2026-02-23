import json
import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
import dashboard.api_tutor as api_tutor_mod


@pytest.fixture(scope="module")
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
    _app = create_app()
    _app.config["TESTING"] = True
    yield _app

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


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


def _insert_material(file_path: Path, file_type: str, *, title: str) -> int:
    conn = db_setup.get_connection()
    cur = conn.cursor()
    now = datetime.now().isoformat()
    cur.execute(
        """
        INSERT INTO rag_docs (
            source_path, content, checksum, corpus, title, file_path, file_size,
            file_type, doc_type, topic_tags, enabled, extraction_error, created_at, updated_at
        ) VALUES (?, ?, ?, 'materials', ?, ?, ?, ?, 'upload', '', 1, NULL, ?, ?)
        """,
        (
            str(file_path),
            "",
            "checksum-test",
            title,
            str(file_path),
            file_path.stat().st_size if file_path.exists() else 0,
            file_type,
            now,
            now,
        ),
    )
    material_id = int(cur.lastrowid)
    conn.commit()
    conn.close()
    return material_id


def test_process_video_material_starts_job(
    client, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    video_path = tmp_path / "lecture.mp4"
    video_path.write_bytes(b"fake mp4 bytes")
    material_id = _insert_material(video_path, "mp4", title="Lecture Video")

    monkeypatch.setattr(
        api_tutor_mod,
        "_launch_video_process_job",
        lambda **kwargs: "job-test-123",
    )

    resp = client.post(
        "/api/tutor/materials/video/process",
        data=json.dumps({"material_id": material_id, "language": "en"}),
        content_type="application/json",
    )
    assert resp.status_code == 202
    payload = resp.get_json()
    assert payload["ok"] is True
    assert payload["job_id"] == "job-test-123"
    assert payload["material_id"] == material_id


def test_process_video_material_rejects_non_mp4(client, tmp_path: Path) -> None:
    pdf_path = tmp_path / "slides.pdf"
    pdf_path.write_bytes(b"%PDF-1.4")
    material_id = _insert_material(pdf_path, "pdf", title="Slides")

    resp = client.post(
        "/api/tutor/materials/video/process",
        data=json.dumps({"material_id": material_id}),
        content_type="application/json",
    )
    assert resp.status_code == 400
    assert "not an mp4" in (resp.get_json() or {}).get("error", "").lower()


def test_video_status_endpoint(client) -> None:
    api_tutor_mod.VIDEO_JOBS["job-status-1"] = {
        "job_id": "job-status-1",
        "status": "running",
        "phase": "processing",
    }
    resp = client.get("/api/tutor/materials/video/status/job-status-1")
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["job_id"] == "job-status-1"
    assert payload["status"] == "running"
