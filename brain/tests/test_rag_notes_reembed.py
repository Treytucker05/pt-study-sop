"""Regression tests for re-embedding behavior in rag_notes ingestion."""

import sqlite3
import sys
from pathlib import Path

import pytest

# Add brain/ to import path
brain_dir = Path(__file__).parent.parent
if str(brain_dir) not in sys.path:
    sys.path.insert(0, str(brain_dir))

import rag_notes


def _init_db(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.executescript(
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


def _connect_factory(db_path: Path):
    def _connect() -> sqlite3.Connection:
        conn = sqlite3.connect(db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    return _connect


def test_upsert_keeps_embeddings_when_checksum_unchanged(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    db_path = tmp_path / "rag.db"
    _init_db(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO rag_docs
            (source_path, doc_type, file_type, content, checksum, metadata_json, corpus, enabled, created_at)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        """,
        ("/tmp/sample.pdf", "pdf", "pdf", "old content", "same-checksum", "{}", "materials"),
    )
    doc_id = cur.lastrowid
    cur.execute(
        """
        INSERT INTO rag_embeddings (rag_doc_id, chunk_index, chunk_text, chroma_id, token_count, created_at)
        VALUES (?, 0, ?, ?, 5, datetime('now'))
        """,
        (doc_id, "old chunk", f"rag-{doc_id}-0"),
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(rag_notes, "_connect", _connect_factory(db_path))

    cleanup_calls: list[tuple[list[str], str]] = []

    def _capture_cleanup(chroma_ids: list[str], *, corpus: str) -> None:
        cleanup_calls.append((chroma_ids, corpus))

    monkeypatch.setattr(rag_notes, "_delete_from_chroma", _capture_cleanup)

    rag_notes._upsert_rag_doc(
        source_path="/tmp/sample.pdf",
        doc_type="pdf",
        course_id=None,
        topic_tags="study-folder",
        content="old content",
        checksum="same-checksum",
        metadata={},
        corpus="materials",
        folder_path="",
        enabled=1,
        file_type="pdf",
        file_size=100,
    )

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM rag_embeddings WHERE rag_doc_id = ?", (doc_id,))
    assert cur.fetchone()[0] == 1
    conn.close()

    assert cleanup_calls == []


def test_upsert_clears_embeddings_when_checksum_changes(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    db_path = tmp_path / "rag.db"
    _init_db(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO rag_docs
            (source_path, doc_type, file_type, content, checksum, metadata_json, corpus, enabled, created_at)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        """,
        ("/tmp/sample.pdf", "pdf", "pdf", "old content", "old-checksum", "{}", "materials"),
    )
    doc_id = cur.lastrowid
    old_chroma_id = f"rag-{doc_id}-0"
    cur.execute(
        """
        INSERT INTO rag_embeddings (rag_doc_id, chunk_index, chunk_text, chroma_id, token_count, created_at)
        VALUES (?, 0, ?, ?, 5, datetime('now'))
        """,
        (doc_id, "old chunk", old_chroma_id),
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(rag_notes, "_connect", _connect_factory(db_path))

    cleanup_calls: list[tuple[list[str], str]] = []

    def _capture_cleanup(chroma_ids: list[str], *, corpus: str) -> None:
        cleanup_calls.append((chroma_ids, corpus))

    monkeypatch.setattr(rag_notes, "_delete_from_chroma", _capture_cleanup)

    rag_notes._upsert_rag_doc(
        source_path="/tmp/sample.pdf",
        doc_type="pdf",
        course_id=None,
        topic_tags="study-folder",
        content="new content",
        checksum="new-checksum",
        metadata={},
        corpus="materials",
        folder_path="",
        enabled=1,
        file_type="pdf",
        file_size=150,
    )

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM rag_embeddings WHERE rag_doc_id = ?", (doc_id,))
    assert cur.fetchone()[0] == 0
    cur.execute("SELECT checksum, content FROM rag_docs WHERE id = ?", (doc_id,))
    row = cur.fetchone()
    conn.close()

    assert row[0] == "new-checksum"
    assert row[1] == "new content"
    assert cleanup_calls == [([old_chroma_id], "materials")]


def test_text_ingest_clears_embeddings_on_checksum_change(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    db_path = tmp_path / "rag.db"
    _init_db(db_path)

    note_path = tmp_path / "note.md"
    note_path.write_text("# Title\n\nNew body", encoding="utf-8")

    old_content = "Old body"
    old_checksum = rag_notes._checksum(old_content)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO rag_docs
            (source_path, doc_type, file_type, content, checksum, metadata_json, corpus, enabled, created_at)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        """,
        (str(note_path), "transcript", "md", old_content, old_checksum, "{}", "materials"),
    )
    doc_id = cur.lastrowid
    old_chroma_id = f"rag-{doc_id}-0"
    cur.execute(
        """
        INSERT INTO rag_embeddings (rag_doc_id, chunk_index, chunk_text, chroma_id, token_count, created_at)
        VALUES (?, 0, ?, ?, 5, datetime('now'))
        """,
        (doc_id, "old chunk", old_chroma_id),
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(rag_notes, "_connect", _connect_factory(db_path))

    cleanup_calls: list[tuple[list[str], str]] = []

    def _capture_cleanup(chroma_ids: list[str], *, corpus: str) -> None:
        cleanup_calls.append((chroma_ids, corpus))

    monkeypatch.setattr(rag_notes, "_delete_from_chroma", _capture_cleanup)

    rag_notes._ingest_document(str(note_path), "transcript")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM rag_embeddings WHERE rag_doc_id = ?", (doc_id,))
    assert cur.fetchone()[0] == 0
    cur.execute("SELECT checksum, content FROM rag_docs WHERE id = ?", (doc_id,))
    row = cur.fetchone()
    conn.close()

    assert row[0] == rag_notes._checksum("# Title\n\nNew body")
    assert row[1] == "# Title\n\nNew body"
    assert cleanup_calls == [([old_chroma_id], "materials")]
