"""Material pipeline certification coverage for Tutor 10/10."""

from __future__ import annotations

import io
import os
import sqlite3
import sys
import tempfile
import threading
import time
from pathlib import Path
from unittest.mock import ANY

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
import dashboard.api_data as _api_data_mod
import dashboard.api_tutor as _api_tutor_mod
import dashboard.api_adapter as _api_adapter_mod
import dashboard.api_tutor_materials as _api_tutor_materials_mod
from dashboard.app import create_app
import rag_notes


@pytest.fixture(scope="module")
def app():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    orig_env = os.environ.get("PT_STUDY_DB")
    orig_config = config.DB_PATH
    orig_db_setup = db_setup.DB_PATH
    orig_api_data = _api_data_mod.DB_PATH
    orig_uploads = _api_tutor_mod.UPLOADS_DIR
    orig_material_uploads = _api_tutor_materials_mod.UPLOADS_DIR

    uploads_dir = Path(tempfile.mkdtemp(prefix="tutor-materials-uploads-"))

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path
    _api_tutor_mod.UPLOADS_DIR = uploads_dir
    _api_tutor_materials_mod.UPLOADS_DIR = uploads_dir

    db_setup.init_database()
    app_obj = create_app()
    app_obj.config["TESTING"] = True
    yield app_obj

    _api_tutor_mod.UPLOADS_DIR = orig_uploads
    _api_tutor_materials_mod.UPLOADS_DIR = orig_material_uploads
    config.DB_PATH = orig_config
    db_setup.DB_PATH = orig_db_setup
    _api_data_mod.DB_PATH = orig_api_data
    if orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = orig_env
    _api_adapter_mod._SELECTOR_COLS_ENSURED_SESSIONS = False
    _api_tutor_mod._SELECTOR_COLS_ENSURED = False

    try:
        os.unlink(tmp_path)
    except OSError:
        pass


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


def _insert_course(course_id: int, name: str = "Neuroscience") -> None:
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute(
        """
        INSERT OR IGNORE INTO courses (id, code, name, color, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        """,
        (course_id, f"C-{course_id}", name, "#ff0000"),
    )
    conn.commit()
    conn.close()


@pytest.mark.parametrize(
    ("filename", "expected_file_type"),
    [
        ("fixture.pdf", "pdf"),
        ("fixture.pptx", "pptx"),
        ("fixture.docx", "docx"),
        ("fixture.txt", "txt"),
        ("fixture.md", "md"),
    ],
)
def test_upload_material_supported_formats_persist_in_rag_docs(
    client, monkeypatch: pytest.MonkeyPatch, filename: str, expected_file_type: str
) -> None:
    _insert_course(301)
    embed_calls: list[dict] = []

    monkeypatch.setattr(
        "text_extractor.extract_text",
        lambda _path: {"content": f"content for {filename}", "error": None, "metadata": {}},
    )

    def fake_embed_rag_docs(**kwargs):
        embed_calls.append(kwargs)
        return {"embedded": 1}

    monkeypatch.setattr("tutor_rag.embed_rag_docs", fake_embed_rag_docs)

    resp = client.post(
        "/api/tutor/materials/upload",
        data={
            "file": (io.BytesIO(b"dummy material"), filename),
            "course_id": "301",
            "title": f"Upload {filename}",
        },
        content_type="multipart/form-data",
    )

    assert resp.status_code == 201
    payload = resp.get_json()
    assert payload["file_type"] == expected_file_type
    assert payload["embedded"] is True
    assert payload["char_count"] == len(f"content for {filename}")
    assert embed_calls == [
        {"corpus": "materials", "rag_doc_ids": [payload["id"]]},
    ]

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT title, file_type, content, course_id FROM rag_docs WHERE id = ?",
        (payload["id"],),
    ).fetchone()
    conn.close()

    assert row is not None
    assert row["title"] == f"Upload {filename}"
    assert row["file_type"] == expected_file_type
    assert row["content"] == f"content for {filename}"
    assert row["course_id"] == 301


def test_upload_material_mp4_stays_fast_and_metadata_only(client) -> None:
    _insert_course(302)

    resp = client.post(
        "/api/tutor/materials/upload",
        data={
            "file": (io.BytesIO(b"\x00\x00\x00\x18ftypmp42"), "lecture.mp4"),
            "course_id": "302",
            "title": "Lecture Video",
        },
        content_type="multipart/form-data",
    )

    assert resp.status_code == 201
    payload = resp.get_json()
    assert payload["file_type"] == "mp4"
    assert payload["char_count"] == 0
    assert payload["embedded"] is False
    assert payload["extraction_error"] is None


def test_upload_course_setup_file_is_raw_setup_source_not_embedded_study_material(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    _insert_course(6262, name="Dx Mgmt Integumentary")
    embed_calls: list[dict] = []

    monkeypatch.setattr(
        "text_extractor.extract_text",
        lambda _path: {
            "content": "Course schedule and objectives for integumentary management",
            "error": None,
            "metadata": {},
        },
    )

    def fake_embed_rag_docs(**kwargs):
        embed_calls.append(kwargs)
        return {"embedded": 1}

    monkeypatch.setattr("tutor_rag.embed_rag_docs", fake_embed_rag_docs)

    resp = client.post(
        "/api/tutor/materials/upload",
        data={
            "file": (io.BytesIO(b"dummy setup"), "dx-syllabus-schedule.docx"),
            "course_id": "6262",
            "title": "Dx Mgmt Syllabus and Schedule",
            "library_role": "setup",
            "setup_kind": "syllabus_schedule",
        },
        content_type="multipart/form-data",
    )

    assert resp.status_code == 201
    payload = resp.get_json()
    assert payload["embedded"] is False
    assert payload["library_role"] == "setup"
    assert payload["setup_kind"] == "syllabus_schedule"
    assert embed_calls == []

    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        """
        SELECT title, file_type, doc_type, corpus, content, course_id, metadata_json
        FROM rag_docs
        WHERE id = ?
        """,
        (payload["id"],),
    ).fetchone()
    listed = conn.execute(
        """
        SELECT id, doc_type, corpus, metadata_json
        FROM rag_docs
        WHERE id = ?
        """,
        (payload["id"],),
    ).fetchone()
    conn.close()

    assert row is not None
    assert row["title"] == "Dx Mgmt Syllabus and Schedule"
    assert row["file_type"] == "docx"
    assert row["doc_type"] == "course_setup"
    assert row["corpus"] == "course_setup"
    assert row["content"] == "Course schedule and objectives for integumentary management"
    assert row["course_id"] == 6262
    assert '"library_role": "setup"' in row["metadata_json"]
    assert '"setup_kind": "syllabus_schedule"' in row["metadata_json"]
    assert listed is not None


def test_materials_list_excludes_setup_files_unless_requested(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    _insert_course(6263, name="Dx Mgmt Integumentary")

    monkeypatch.setattr(
        "text_extractor.extract_text",
        lambda path: {
            "content": f"extracted {Path(path).name}",
            "error": None,
            "metadata": {},
        },
    )
    monkeypatch.setattr(
        "tutor_rag.embed_rag_docs",
        lambda **_kwargs: {"embedded": 1},
    )

    setup_resp = client.post(
        "/api/tutor/materials/upload",
        data={
            "file": (io.BytesIO(b"setup bytes"), "dx-syllabus-schedule.docx"),
            "course_id": "6263",
            "title": "Dx Syllabus and Schedule",
            "library_role": "setup",
            "setup_kind": "syllabus_schedule",
        },
        content_type="multipart/form-data",
    )
    study_resp = client.post(
        "/api/tutor/materials/upload",
        data={
            "file": (io.BytesIO(b"study bytes"), "dx-week-1.pdf"),
            "course_id": "6263",
            "title": "Dx Week 1",
        },
        content_type="multipart/form-data",
    )
    assert setup_resp.status_code == 201
    assert study_resp.status_code == 201
    setup_id = setup_resp.get_json()["id"]
    study_id = study_resp.get_json()["id"]

    default_list = client.get("/api/tutor/materials?course_id=6263")
    assert default_list.status_code == 200
    assert [item["id"] for item in default_list.get_json()] == [study_id]

    library_list = client.get("/api/tutor/materials?course_id=6263&include_setup=1")
    assert library_list.status_code == 200
    ids = [item["id"] for item in library_list.get_json()]
    assert setup_id in ids
    assert study_id in ids


def test_course_setup_file_can_be_served_to_priming_reader(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    _insert_course(6264, name="Professionalism")
    raw_pdf = b"%PDF-1.4 setup syllabus"
    monkeypatch.setattr(
        "text_extractor.extract_text",
        lambda _path: {"content": "setup text", "error": None, "metadata": {}},
    )

    resp = client.post(
        "/api/tutor/materials/upload",
        data={
            "file": (io.BytesIO(raw_pdf), "professionalism-syllabus.pdf"),
            "course_id": "6264",
            "title": "Professionalism Syllabus",
            "library_role": "setup",
            "setup_kind": "syllabus",
        },
        content_type="multipart/form-data",
    )
    assert resp.status_code == 201
    material_id = resp.get_json()["id"]

    file_resp = client.get(f"/api/tutor/materials/{material_id}/file")
    assert file_resp.status_code == 200
    assert file_resp.data == raw_pdf


def test_course_setup_reextract_uses_file_type_and_course_setup_corpus(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    _insert_course(6265, name="Cardiovascular Pulmonary")
    monkeypatch.setattr(
        "text_extractor.extract_text",
        lambda _path: {"content": "setup text", "error": None, "metadata": {}},
    )

    resp = client.post(
        "/api/tutor/materials/upload",
        data={
            "file": (io.BytesIO(b"setup docx"), "cardiopulm-schedule.docx"),
            "course_id": "6265",
            "title": "Cardiopulm Schedule",
            "library_role": "setup",
            "setup_kind": "schedule",
        },
        content_type="multipart/form-data",
    )
    assert resp.status_code == 201
    material_id = resp.get_json()["id"]
    calls: list[dict] = []

    def fake_ingest_document(**kwargs):
        calls.append(kwargs)
        return material_id

    monkeypatch.setattr("rag_notes.ingest_document", fake_ingest_document)

    reextract_resp = client.post(f"/api/tutor/materials/{material_id}/reextract")
    assert reextract_resp.status_code == 200
    assert calls == [
        {
            "path": ANY,
            "doc_type": "docx",
            "course_id": 6265,
            "topic_tags": [],
            "corpus": "course_setup",
            "folder_path": "",
            "enabled": 1,
        }
    ]
    assert calls[0]["path"].endswith("cardiopulm-schedule.docx")


def test_upload_material_reports_duplicate_of_existing_checksum(
    client, monkeypatch: pytest.MonkeyPatch
) -> None:
    _insert_course(304)
    monkeypatch.setattr(
        "text_extractor.extract_text",
        lambda _path: {"content": "same duplicate content", "error": None, "metadata": {}},
    )
    monkeypatch.setattr(
        "tutor_rag.embed_rag_docs",
        lambda **_kwargs: {"embedded": 1},
    )

    first = client.post(
        "/api/tutor/materials/upload",
        data={
            "file": (io.BytesIO(b"first"), "duplicate.txt"),
            "course_id": "304",
            "title": "Duplicate A",
        },
        content_type="multipart/form-data",
    )
    assert first.status_code == 201
    first_id = first.get_json()["id"]

    second = client.post(
        "/api/tutor/materials/upload",
        data={
            "file": (io.BytesIO(b"second"), "duplicate.txt"),
            "course_id": "304",
            "title": "Duplicate B",
        },
        content_type="multipart/form-data",
    )
    assert second.status_code == 201
    payload = second.get_json()
    assert payload["duplicate_of"]["id"] == first_id
    assert payload["duplicate_of"]["title"] == "Duplicate A"


def test_sync_preview_lists_supported_files_only(client, tmp_path: Path) -> None:
    root = tmp_path / "materials"
    (root / "Week7").mkdir(parents=True)
    (root / "Week7" / "lesson.pdf").write_bytes(b"%PDF-1.4")
    (root / "Week7" / "outline.txt").write_text("outline", encoding="utf-8")
    (root / "Week7" / "ignore.png").write_bytes(b"png")

    resp = client.post(
        "/api/tutor/materials/sync/preview",
        json={"folder_path": str(root)},
    )

    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["ok"] is True
    assert payload["counts"]["files"] == 2
    assert payload["counts"]["folders"] >= 1
    assert ".pdf" in payload["allowed_exts"]
    assert ".txt" in payload["allowed_exts"]

    tree = payload["tree"]
    week7 = next(child for child in tree["children"] if child["name"] == "Week7")
    names = [child["name"] for child in week7["children"]]
    assert "lesson.pdf" in names
    assert "outline.txt" in names
    assert "ignore.png" not in names


def test_sync_start_validates_selected_files_and_course_id(client, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    _insert_course(303, name="Brain Structure")
    root = tmp_path / "sync"
    root.mkdir(parents=True)
    (root / "week8.txt").write_text("week 8", encoding="utf-8")

    monkeypatch.setattr(
        _api_tutor_mod,
        "_launch_materials_sync_job",
        lambda root, allowed_exts, selected_files=None, setup_files=None, course_id=None: "job-sync-123",
    )

    resp = client.post(
        "/api/tutor/materials/sync",
        json={
            "folder_path": str(root),
            "selected_files": ["week8.txt"],
            "course_id": 303,
        },
    )

    assert resp.status_code == 202
    payload = resp.get_json()
    assert payload["ok"] is True
    assert payload["job_id"] == "job-sync-123"
    assert payload["selected_count"] == 1
    assert payload["course_id"] == 303


def test_sync_start_accepts_setup_files_without_study_embedding_selection(
    client, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _insert_course(304, name="Dx Mgmt Integumentary")
    root = tmp_path / "source-refresh"
    (root / "Dx").mkdir(parents=True)
    (root / "Dx" / "syllabus.docx").write_text("syllabus", encoding="utf-8")
    (root / "Dx" / "week1.pptx").write_text("slides", encoding="utf-8")
    launch_calls: list[dict] = []

    def fake_launch(root, allowed_exts, selected_files=None, setup_files=None, course_id=None):
        launch_calls.append(
            {
                "root": root,
                "selected_files": selected_files,
                "setup_files": setup_files,
                "course_id": course_id,
            }
        )
        return "job-source-refresh"

    monkeypatch.setattr(_api_tutor_mod, "_launch_materials_sync_job", fake_launch)

    resp = client.post(
        "/api/tutor/materials/sync/start",
        json={
            "folder_path": str(root),
            "selected_files": ["Dx/week1.pptx"],
            "setup_files": ["Dx/syllabus.docx"],
            "course_id": 304,
        },
    )

    assert resp.status_code == 202
    payload = resp.get_json()
    assert payload["ok"] is True
    assert payload["job_id"] == "job-source-refresh"
    assert payload["selected_count"] == 2
    assert payload["setup_count"] == 1
    assert payload["course_id"] == 304
    assert launch_calls == [
        {
            "root": root,
            "selected_files": {"Dx/week1.pptx"},
            "setup_files": {"Dx/syllabus.docx"},
            "course_id": 304,
        }
    ]


def test_material_sync_job_embeds_only_docs_from_that_sync(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    root = tmp_path / "materials"
    root.mkdir(parents=True)
    finished = threading.Event()
    embed_calls: list[dict] = []

    def fake_sync_folder_to_rag(*args, **kwargs):  # noqa: ANN002, ANN003
        return {
            "ok": True,
            "total": 2,
            "processed": 2,
            "failed": 0,
            "errors": [],
            "doc_ids": [101, 102],
        }

    def fake_embed_rag_docs(**kwargs):
        embed_calls.append(kwargs)
        finished.set()
        return {"embedded": 2, "skipped": 0, "total_chunks": 2}

    monkeypatch.setattr("rag_notes.sync_folder_to_rag", fake_sync_folder_to_rag)
    monkeypatch.setattr("tutor_rag.embed_rag_docs", fake_embed_rag_docs)

    job_id = _api_tutor_materials_mod._launch_materials_sync_job(
        root,
        None,
        selected_files={"week1/slides.pdf", "week1/objectives.docx"},
        course_id=77,
    )

    assert finished.wait(timeout=2), "sync job did not reach embedding"

    deadline = time.time() + 2
    status = None
    while time.time() < deadline:
        with _api_tutor_materials_mod.SYNC_JOBS_LOCK:
            status = (_api_tutor_materials_mod.SYNC_JOBS.get(job_id) or {}).get("status")
        if status == "completed":
            break
        time.sleep(0.01)

    assert status == "completed"
    assert embed_calls == [
        {
            "corpus": "materials",
            "rag_doc_ids": [101, 102],
            "progress_callback": ANY,
        }
    ]


def test_sync_folder_to_rag_prunes_missing_files_on_full_sync(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    db_path = tmp_path / "rag.db"

    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS rag_docs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT,
            course_id INTEGER,
            topic_tags TEXT,
            doc_type TEXT,
            file_type TEXT,
            file_size INTEGER,
            content TEXT,
            checksum TEXT,
            metadata_json TEXT,
            corpus TEXT,
            folder_path TEXT,
            enabled INTEGER,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS rag_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rag_doc_id INTEGER,
            chunk_index INTEGER,
            chunk_text TEXT,
            chroma_id TEXT,
            token_count INTEGER,
            created_at TEXT
        );
        """
    )
    conn.commit()
    conn.close()

    def _connect() -> sqlite3.Connection:
        conn = sqlite3.connect(db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    monkeypatch.setattr(rag_notes, "_connect", _connect)

    root = tmp_path / "sync-root"
    root.mkdir()
    keep = root / "keep.txt"
    keep.write_text("keep", encoding="utf-8")
    stale = root / "stale.txt"
    stale.write_text("stale", encoding="utf-8")

    stale_id = rag_notes._upsert_rag_doc(
        source_path=str(stale),
        doc_type="txt",
        course_id=None,
        topic_tags="study-folder",
        content="stale",
        checksum=rag_notes._checksum("stale"),
        metadata={},
        corpus="materials",
        folder_path="",
        enabled=1,
        file_type="txt",
        file_size=5,
    )

    conn = _connect()
    conn.execute(
        """
        INSERT INTO rag_embeddings (rag_doc_id, chunk_index, chunk_text, chroma_id, token_count, created_at)
        VALUES (?, 0, ?, ?, 5, datetime('now'))
        """,
        (stale_id, "stale chunk", "stale-chroma-id"),
    )
    conn.commit()
    conn.close()

    cleanup_calls: list[tuple[list[str], str]] = []

    def _capture_cleanup(chroma_ids: list[str], *, corpus: str) -> None:
        cleanup_calls.append((chroma_ids, corpus))

    monkeypatch.setattr(rag_notes, "_delete_from_chroma", _capture_cleanup)

    def _fake_ingest_document(path: str, doc_type: str, **kwargs) -> int:
        content = Path(path).read_text(encoding="utf-8")
        return rag_notes._upsert_rag_doc(
            source_path=path,
            doc_type=doc_type,
            course_id=kwargs.get("course_id"),
            topic_tags="study-folder",
            content=content,
            checksum=rag_notes._checksum(content),
            metadata={},
            corpus=kwargs.get("corpus", "materials"),
            folder_path=kwargs.get("folder_path", ""),
            enabled=kwargs.get("enabled", 1),
            file_type="txt",
            file_size=len(content),
        )

    monkeypatch.setattr(rag_notes, "ingest_document", _fake_ingest_document)

    stale.unlink()

    result = rag_notes.sync_folder_to_rag(str(root), corpus="materials")

    assert result["ok"] is True
    assert result["processed"] == 1
    assert result["deleted"] == 1
    assert any("stale.txt" in path for path in result["deleted_paths"])

    conn = _connect()
    rows = conn.execute(
        "SELECT source_path FROM rag_docs WHERE COALESCE(corpus, 'runtime') = 'materials'"
    ).fetchall()
    conn.close()

    remaining = [row["source_path"] for row in rows]
    assert str(keep) in remaining
    assert str(stale) not in remaining
    assert cleanup_calls == [(["stale-chroma-id"], "materials")]


def test_sync_folder_to_rag_partial_sync_does_not_prune_unselected_files(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    db_path = tmp_path / "rag.db"

    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS rag_docs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT,
            course_id INTEGER,
            topic_tags TEXT,
            doc_type TEXT,
            file_type TEXT,
            file_size INTEGER,
            content TEXT,
            checksum TEXT,
            metadata_json TEXT,
            corpus TEXT,
            folder_path TEXT,
            enabled INTEGER,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS rag_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rag_doc_id INTEGER,
            chunk_index INTEGER,
            chunk_text TEXT,
            chroma_id TEXT,
            token_count INTEGER,
            created_at TEXT
        );
        """
    )
    conn.commit()
    conn.close()

    def _connect() -> sqlite3.Connection:
        conn = sqlite3.connect(db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    monkeypatch.setattr(rag_notes, "_connect", _connect)
    monkeypatch.setattr(rag_notes, "_delete_from_chroma", lambda *args, **kwargs: None)

    root = tmp_path / "sync-root"
    root.mkdir()
    a_file = root / "a.txt"
    b_file = root / "b.txt"
    a_file.write_text("A", encoding="utf-8")
    b_file.write_text("B", encoding="utf-8")

    rag_notes._upsert_rag_doc(
        source_path=str(a_file),
        doc_type="txt",
        course_id=None,
        topic_tags="study-folder",
        content="A",
        checksum=rag_notes._checksum("A"),
        metadata={},
        corpus="materials",
        folder_path="",
        enabled=1,
        file_type="txt",
        file_size=1,
    )
    rag_notes._upsert_rag_doc(
        source_path=str(b_file),
        doc_type="txt",
        course_id=None,
        topic_tags="study-folder",
        content="B",
        checksum=rag_notes._checksum("B"),
        metadata={},
        corpus="materials",
        folder_path="",
        enabled=1,
        file_type="txt",
        file_size=1,
    )

    def _fake_ingest_document(path: str, doc_type: str, **kwargs) -> int:
        content = Path(path).read_text(encoding="utf-8")
        return rag_notes._upsert_rag_doc(
            source_path=path,
            doc_type=doc_type,
            course_id=kwargs.get("course_id"),
            topic_tags="study-folder",
            content=content,
            checksum=rag_notes._checksum(content),
            metadata={},
            corpus=kwargs.get("corpus", "materials"),
            folder_path=kwargs.get("folder_path", ""),
            enabled=kwargs.get("enabled", 1),
            file_type="txt",
            file_size=len(content),
        )

    monkeypatch.setattr(rag_notes, "ingest_document", _fake_ingest_document)

    result = rag_notes.sync_folder_to_rag(
        str(root),
        corpus="materials",
        include_paths={"a.txt"},
    )

    assert result["ok"] is True
    assert result["processed"] == 1
    assert result["deleted"] == 0

    conn = _connect()
    rows = conn.execute(
        "SELECT source_path FROM rag_docs WHERE COALESCE(corpus, 'runtime') = 'materials'"
    ).fetchall()
    conn.close()

    remaining = {row["source_path"] for row in rows}
    assert str(a_file) in remaining
    assert str(b_file) in remaining


def test_sync_folder_to_rag_updates_existing_file_without_duplicate_row(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    db_path = tmp_path / "rag.db"

    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS rag_docs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT,
            course_id INTEGER,
            topic_tags TEXT,
            doc_type TEXT,
            file_type TEXT,
            file_size INTEGER,
            content TEXT,
            checksum TEXT,
            metadata_json TEXT,
            corpus TEXT,
            folder_path TEXT,
            enabled INTEGER,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS rag_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rag_doc_id INTEGER,
            chunk_index INTEGER,
            chunk_text TEXT,
            chroma_id TEXT,
            token_count INTEGER,
            created_at TEXT
        );
        """
    )
    conn.commit()
    conn.close()

    def _connect() -> sqlite3.Connection:
        conn = sqlite3.connect(db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    monkeypatch.setattr(rag_notes, "_connect", _connect)
    monkeypatch.setattr(rag_notes, "_delete_from_chroma", lambda *args, **kwargs: None)

    root = tmp_path / "sync-root"
    root.mkdir()
    file_path = root / "lesson.txt"
    file_path.write_text("version one", encoding="utf-8")

    def _fake_ingest_document(path: str, doc_type: str, **kwargs) -> int:
        content = Path(path).read_text(encoding="utf-8")
        return rag_notes._upsert_rag_doc(
            source_path=path,
            doc_type=doc_type,
            course_id=kwargs.get("course_id"),
            topic_tags="study-folder",
            content=content,
            checksum=rag_notes._checksum(content),
            metadata={},
            corpus=kwargs.get("corpus", "materials"),
            folder_path=kwargs.get("folder_path", ""),
            enabled=kwargs.get("enabled", 1),
            file_type="txt",
            file_size=len(content),
        )

    monkeypatch.setattr(rag_notes, "ingest_document", _fake_ingest_document)

    first = rag_notes.sync_folder_to_rag(str(root), corpus="materials")
    assert first["processed"] == 1

    file_path.write_text("version two", encoding="utf-8")
    second = rag_notes.sync_folder_to_rag(str(root), corpus="materials")
    assert second["processed"] == 1

    conn = _connect()
    rows = conn.execute(
        "SELECT id, content, checksum FROM rag_docs WHERE COALESCE(corpus, 'runtime') = 'materials'"
    ).fetchall()
    conn.close()

    assert len(rows) == 1
    assert rows[0]["content"] == "version two"
    assert rows[0]["checksum"] == rag_notes._checksum("version two")


def test_sync_folder_to_rag_restricted_allowed_exts_do_not_prune_other_supported_files(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    db_path = tmp_path / "rag.db"

    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS rag_docs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT,
            course_id INTEGER,
            topic_tags TEXT,
            doc_type TEXT,
            file_type TEXT,
            file_size INTEGER,
            content TEXT,
            checksum TEXT,
            metadata_json TEXT,
            corpus TEXT,
            folder_path TEXT,
            enabled INTEGER,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS rag_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rag_doc_id INTEGER,
            chunk_index INTEGER,
            chunk_text TEXT,
            chroma_id TEXT,
            token_count INTEGER,
            created_at TEXT
        );
        """
    )
    conn.commit()
    conn.close()

    def _connect() -> sqlite3.Connection:
        conn = sqlite3.connect(db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    monkeypatch.setattr(rag_notes, "_connect", _connect)
    monkeypatch.setattr(rag_notes, "_delete_from_chroma", lambda *args, **kwargs: None)

    root = tmp_path / "sync-root"
    root.mkdir()
    txt_file = root / "lesson.txt"
    pdf_file = root / "slides.pdf"
    txt_file.write_text("lesson", encoding="utf-8")
    pdf_file.write_bytes(b"%PDF-1.4")

    rag_notes._upsert_rag_doc(
        source_path=str(txt_file),
        doc_type="txt",
        course_id=None,
        topic_tags="study-folder",
        content="lesson",
        checksum=rag_notes._checksum("lesson"),
        metadata={},
        corpus="materials",
        folder_path="",
        enabled=1,
        file_type="txt",
        file_size=6,
    )
    rag_notes._upsert_rag_doc(
        source_path=str(pdf_file),
        doc_type="pdf",
        course_id=None,
        topic_tags="study-folder",
        content="pdf text",
        checksum=rag_notes._checksum("pdf text"),
        metadata={},
        corpus="materials",
        folder_path="",
        enabled=1,
        file_type="pdf",
        file_size=8,
    )

    def _fake_ingest_document(path: str, doc_type: str, **kwargs) -> int:
        content = Path(path).read_text(encoding="utf-8") if Path(path).suffix.lower() == ".txt" else "pdf text"
        return rag_notes._upsert_rag_doc(
            source_path=path,
            doc_type=doc_type,
            course_id=kwargs.get("course_id"),
            topic_tags="study-folder",
            content=content,
            checksum=rag_notes._checksum(content),
            metadata={},
            corpus=kwargs.get("corpus", "materials"),
            folder_path=kwargs.get("folder_path", ""),
            enabled=kwargs.get("enabled", 1),
            file_type=Path(path).suffix.lower().lstrip("."),
            file_size=len(content),
        )

    monkeypatch.setattr(rag_notes, "ingest_document", _fake_ingest_document)

    result = rag_notes.sync_folder_to_rag(
        str(root),
        corpus="materials",
        allowed_exts={".txt"},
    )

    assert result["ok"] is True
    assert result["deleted"] == 0

    conn = _connect()
    rows = conn.execute(
        "SELECT source_path FROM rag_docs WHERE COALESCE(corpus, 'runtime') = 'materials'"
    ).fetchall()
    conn.close()

    remaining = {row["source_path"] for row in rows}
    assert str(txt_file) in remaining
    assert str(pdf_file) in remaining
