"""Regression tests for truthful Tutor embedding status reporting."""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config as app_config
import db_setup
from dashboard.app import create_app


@pytest.fixture
def embed_status_client(tmp_path, monkeypatch):
    db_file = tmp_path / "embed_status.db"
    monkeypatch.setenv("PT_STUDY_DB", str(db_file))
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-test-key")
    monkeypatch.setenv("TUTOR_RAG_EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setenv("TUTOR_RAG_GEMINI_EMBEDDING_MODEL", "gemini-embedding-2-preview")
    monkeypatch.setattr(app_config, "DB_PATH", str(db_file))
    monkeypatch.setattr(db_setup, "DB_PATH", str(db_file))
    db_setup.init_database()

    app = create_app()
    app.config["TESTING"] = True
    return app.test_client(), str(db_file)


def _seed_embed_status_db(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.executemany(
            """
            INSERT INTO rag_docs
                (id, source_path, course_id, content, created_at, updated_at, corpus, folder_path, enabled, title)
            VALUES (?, ?, NULL, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'materials', 'Uploaded Files', 1, ?)
            """,
            [
                (1, "Uploaded Files/current.pdf", "current content", "Current Material"),
                (2, "Uploaded Files/stale.pdf", "stale content", "Stale Material"),
                (3, "Uploaded Files/legacy.pdf", "legacy content", "Legacy Material"),
            ],
        )
        cur.executemany(
            """
            INSERT INTO rag_embeddings
                (rag_doc_id, chunk_index, chunk_text, embedding_model, provider, chroma_id, token_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            [
                (1, 0, "current-a", "gemini-embedding-2-preview", "gemini", "g-1", 5),
                (1, 1, "current-b", "gemini-embedding-2-preview", "gemini", "g-2", 5),
                (2, 0, "stale-a", "text-embedding-3-small", "openai", "o-1", 5),
                (2, 1, "stale-b", "text-embedding-3-small", "openai", "o-2", 5),
                (3, 0, "legacy-a", "", "", "legacy-1", 5),
            ],
        )
        cur.execute(
            """
            INSERT INTO rag_embedding_failures
                (rag_doc_id, provider, embedding_model, collection_name, failure_stage, error_type, error_message, failed_at)
            VALUES
                (2, 'gemini', 'gemini-embedding-2-preview', 'tutor_materials_gemini_gemini-embedding-2-preview', 'embed_document', 'RuntimeError', 'quota failure', CURRENT_TIMESTAMP)
            """
        )
        conn.commit()
    finally:
        conn.close()


def test_embed_status_reports_current_and_stale_materials(embed_status_client):
    client, db_path = embed_status_client
    _seed_embed_status_db(db_path)

    class _FakeCollection:
        def get(self, ids=None, where=None, include=None):  # noqa: ANN001
            del where, include
            return {"ids": list(ids or [])}

    class _FakeVectorstore:
        def __init__(self):
            self._collection = _FakeCollection()

    from dashboard import api_tutor as api_tutor_module

    original_init = api_tutor_module.init_vectorstore
    api_tutor_module.init_vectorstore = lambda *args, **kwargs: _FakeVectorstore()
    try:
        response = client.get("/api/tutor/embed/status")
    finally:
        api_tutor_module.init_vectorstore = original_init

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["provider"] == "gemini"
    assert payload["model"] == "gemini-embedding-2-preview"
    assert payload["collection"] == "tutor_materials_gemini_gemini-embedding-2-preview"
    assert payload["embedded"] == 1
    assert payload["pending"] == 2
    assert payload["stale"] == 2

    materials = {row["id"]: row for row in payload["materials"]}

    assert materials[1]["chunk_count"] == 2
    assert materials[1]["stale_chunk_count"] == 0
    assert materials[1]["embedded"] == 1
    assert materials[1]["needs_reembed"] is False
    assert materials[1]["provider"] == "gemini"
    assert materials[1]["embedding_model"] == "gemini-embedding-2-preview"
    assert materials[1]["embedding_dimension"] is None
    assert materials[1]["index_state"] == "ready"
    assert materials[1]["last_failure"] is None

    assert materials[2]["chunk_count"] == 0
    assert materials[2]["stale_chunk_count"] == 2
    assert materials[2]["embedded"] == 0
    assert materials[2]["needs_reembed"] is True
    assert materials[2]["index_state"] == "stale"
    assert materials[2]["last_failure"]["error_type"] == "RuntimeError"
    assert materials[2]["last_failure"]["error_message"] == "quota failure"

    assert materials[3]["chunk_count"] == 0
    assert materials[3]["stale_chunk_count"] == 1
    assert materials[3]["embedded"] == 0
    assert materials[3]["needs_reembed"] is True
    assert materials[3]["index_state"] == "stale"


def test_embed_status_marks_missing_index_rows_for_reembed(embed_status_client, monkeypatch):
    client, db_path = embed_status_client
    _seed_embed_status_db(db_path)

    class _FakeCollection:
        def get(self, ids=None, where=None, include=None):  # noqa: ANN001
            del where, include
            return {"ids": [doc_id for doc_id in (ids or []) if doc_id == "g-1"]}

    class _FakeVectorstore:
        def __init__(self):
            self._collection = _FakeCollection()

    monkeypatch.setattr(
        "dashboard.api_tutor.init_vectorstore",
        lambda *args, **kwargs: _FakeVectorstore(),
    )

    response = client.get("/api/tutor/embed/status")

    assert response.status_code == 200
    payload = response.get_json()
    materials = {row["id"]: row for row in payload["materials"]}

    assert materials[1]["chunk_count"] == 2
    assert materials[1]["missing_index_chunk_count"] == 1
    assert materials[1]["needs_reembed"] is True
    assert materials[1]["index_state"] == "index_missing"
