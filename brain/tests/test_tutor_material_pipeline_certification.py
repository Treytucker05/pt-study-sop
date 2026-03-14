"""Material pipeline certification coverage for Tutor 10/10."""

from __future__ import annotations

import io
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
import dashboard.api_data as _api_data_mod
import dashboard.api_tutor as _api_tutor_mod
import dashboard.api_adapter as _api_adapter_mod
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

    uploads_dir = Path(tempfile.mkdtemp(prefix="tutor-materials-uploads-"))

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path
    _api_tutor_mod.UPLOADS_DIR = uploads_dir

    db_setup.init_database()
    app_obj = create_app()
    app_obj.config["TESTING"] = True
    yield app_obj

    _api_tutor_mod.UPLOADS_DIR = orig_uploads
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

    monkeypatch.setattr(
        "text_extractor.extract_text",
        lambda _path: {"content": f"content for {filename}", "error": None, "metadata": {}},
    )
    monkeypatch.setattr(
        "tutor_rag.embed_rag_docs",
        lambda **_kwargs: {"embedded": 1},
    )

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
        lambda root, allowed_exts, selected_files=None, course_id=None: "job-sync-123",
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
