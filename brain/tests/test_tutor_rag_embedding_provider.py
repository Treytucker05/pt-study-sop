"""Targeted tests for Tutor RAG embedding provider and compatibility behavior."""

from __future__ import annotations

import sqlite3
from types import SimpleNamespace

import video_enrich_providers.gemini_provider as gemini_provider

from tutor_rag import (
    COLLECTION_MATERIALS,
    _build_gemini_embedding_function,
    _build_rag_embedding_insert_sql,
    _collection_for_embeddings,
    _resolve_embedding_provider,
    embed_rag_docs,
)


def test_resolve_embedding_provider_prefers_gemini_in_auto_mode(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "dummy")
    monkeypatch.delenv("OPENAI_EMBEDDING_MODEL", raising=False)
    monkeypatch.delenv("TUTOR_RAG_EMBEDDING_MODEL", raising=False)
    monkeypatch.delenv("TUTOR_RAG_EMBEDDING_PROVIDER", raising=False)

    cfg = _resolve_embedding_provider()
    assert cfg["provider"] == "gemini"
    assert cfg["auto_selected"] is True
    assert cfg["model"] == "gemini-embedding-2-preview"


def test_resolve_embedding_provider_falls_back_openai_without_gemini_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY_BUSINESS", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "openai-test-key")
    monkeypatch.setenv("TUTOR_RAG_EMBEDDING_PROVIDER", "auto")

    cfg = _resolve_embedding_provider()
    assert cfg["provider"] == "openai"
    assert cfg["auto_selected"] is True


def test_resolve_embedding_provider_explicit_gemini_requires_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY_BUSINESS", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setenv("TUTOR_RAG_EMBEDDING_PROVIDER", "gemini")

    try:
        _resolve_embedding_provider()
        raise AssertionError("Expected RuntimeError for missing Gemini key")
    except RuntimeError:
        pass


def test_collection_suffix_includes_provider_and_model():
    assert (
        _collection_for_embeddings(
            COLLECTION_MATERIALS, "gemini", "gemini-embedding-2-preview"
        )
        == "tutor_materials_gemini_gemini-embedding-2-preview"
    )


def test_gemini_embedding_function_uses_embed_content_config(monkeypatch):
    calls: list[dict[str, object]] = []

    class _FakeModels:
        def embed_content(self, **kwargs):
            calls.append(kwargs)
            return SimpleNamespace(embedding=SimpleNamespace(values=[0.1, 0.2, 0.3]))

    class _FakeClient:
        def __init__(self):
            self.models = _FakeModels()

    def fake_failover(operation_name, runner):
        del operation_name
        return runner(_FakeClient(), "GEMINI_API_KEY")

    monkeypatch.setattr(gemini_provider, "_run_with_key_failover", fake_failover)

    embedder = _build_gemini_embedding_function("gemini-embedding-2-preview")

    assert embedder.embed_documents(["doc text"]) == [[0.1, 0.2, 0.3]]
    assert embedder.embed_query("query text") == [0.1, 0.2, 0.3]

    assert len(calls) == 2
    assert all("task_type" not in call for call in calls)
    assert calls[0]["config"].task_type == "RETRIEVAL_DOCUMENT"
    assert calls[1]["config"].task_type == "RETRIEVAL_QUERY"


def test_build_rag_embedding_insert_sql_handles_legacy_schema(tmp_path):
    db = sqlite3.connect(tmp_path / "rag.db")
    try:
        cur = db.cursor()
        cur.execute(
            """
            CREATE TABLE rag_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rag_doc_id INTEGER NOT NULL,
                chunk_index INTEGER NOT NULL DEFAULT 0,
                chunk_text TEXT NOT NULL,
                chroma_id TEXT,
                token_count INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cur.execute("PRAGMA table_info(rag_embeddings)")
        columns = {row[1] for row in cur.fetchall()}
        sql, col_list = _build_rag_embedding_insert_sql(columns)
        assert "provider" not in col_list
        assert "embedding_model" not in col_list
        assert col_list[-1] == "created_at"
        assert "INSERT OR IGNORE INTO rag_embeddings" in sql
    finally:
        db.close()


class _FakeVectorstore:
    def __init__(self):
        self.deleted_ids: list[str] = []
        self.added_ids: list[str] = []
        self._collection = SimpleNamespace(get=self.get)

    def delete(self, ids: list[str]) -> None:
        self.deleted_ids.extend(ids)

    def add_documents(self, docs, ids: list[str]) -> None:  # noqa: ANN001
        del docs
        self.added_ids.extend(ids)

    def get(self, ids=None, where=None, include=None):  # noqa: ANN001
        del where, include
        live_ids = [doc_id for doc_id in (ids or []) if doc_id in self.added_ids]
        return {"ids": live_ids}


def test_embed_rag_docs_reembeds_when_provider_or_model_changes(tmp_path, monkeypatch):
    db_path = tmp_path / "rag.db"
    db = sqlite3.connect(db_path)
    try:
        cur = db.cursor()
        cur.execute(
            """
            CREATE TABLE rag_docs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_path TEXT NOT NULL,
                content TEXT NOT NULL,
                course_id INTEGER,
                folder_path TEXT,
                corpus TEXT,
                enabled INTEGER DEFAULT 1
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE rag_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rag_doc_id INTEGER NOT NULL,
                chunk_index INTEGER NOT NULL DEFAULT 0,
                chunk_text TEXT NOT NULL,
                embedding_model TEXT,
                provider TEXT,
                chroma_id TEXT,
                token_count INTEGER,
                embedding_dimension INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cur.execute(
            """
            INSERT INTO rag_docs (id, source_path, content, course_id, folder_path, corpus, enabled)
            VALUES (1, 'Uploaded Files/intro-notes.pdf', 'alpha content', 7, 'Uploaded Files', 'materials', 1)
            """
        )
        cur.execute(
            """
            INSERT INTO rag_embeddings
                (rag_doc_id, chunk_index, chunk_text, embedding_model, provider, chroma_id, token_count, created_at)
            VALUES
                (1, 0, 'stale chunk', 'text-embedding-3-small', 'openai', 'stale-chroma-id', 3, CURRENT_TIMESTAMP)
            """
        )
        db.commit()
    finally:
        db.close()

    vectorstores: dict[tuple[str, str], _FakeVectorstore] = {}

    def fake_init_vectorstore(
        collection_name=COLLECTION_MATERIALS,
        persist_dir=None,
        *,
        provider_override=None,
        model_override=None,
    ):
        del collection_name, persist_dir
        key = (str(provider_override or "gemini"), str(model_override or "gemini-embedding-2-preview"))
        return vectorstores.setdefault(key, _FakeVectorstore())

    monkeypatch.setattr("tutor_rag.DB_PATH", str(db_path))
    monkeypatch.setattr(
        "tutor_rag._resolve_embedding_provider",
        lambda requested_provider=None: {  # noqa: ARG005
            "provider": "gemini",
            "model": "gemini-embedding-2-preview",
            "auto_selected": False,
        },
    )
    monkeypatch.setattr(
        "tutor_rag.chunk_document",
        lambda *args, **kwargs: [SimpleNamespace(page_content="fresh chunk")],  # noqa: ARG005
    )
    monkeypatch.setattr("tutor_rag.init_vectorstore", fake_init_vectorstore)
    monkeypatch.setattr("tutor_rag._count_tokens_for_embedding", lambda text, model: 5)

    result = embed_rag_docs()

    assert result["provider"] == "gemini"
    assert result["model"] == "gemini-embedding-2-preview"
    assert result["embedded"] == 1
    assert result["skipped"] == 0
    assert result["total_chunks"] == 1

    stale_vs = vectorstores[("openai", "text-embedding-3-small")]
    assert stale_vs.deleted_ids == ["stale-chroma-id"]
    current_vs = vectorstores[("gemini", "gemini-embedding-2-preview")]
    assert current_vs.added_ids == ["rag-1-0"]

    verify = sqlite3.connect(db_path)
    try:
        verify.row_factory = sqlite3.Row
        rows = verify.execute(
            """
            SELECT provider, embedding_model, chroma_id, chunk_text
            FROM rag_embeddings
            WHERE rag_doc_id = 1
            ORDER BY chunk_index
            """
        ).fetchall()
        assert len(rows) == 1
        assert rows[0]["provider"] == "gemini"
        assert rows[0]["embedding_model"] == "gemini-embedding-2-preview"
        assert rows[0]["chroma_id"] == "rag-1-0"
        assert rows[0]["chunk_text"] == "fresh chunk"
    finally:
        verify.close()


def test_embed_rag_docs_reembeds_when_matching_rows_are_missing_from_index(
    tmp_path, monkeypatch
):
    db_path = tmp_path / "rag.db"
    db = sqlite3.connect(db_path)
    try:
        cur = db.cursor()
        cur.execute(
            """
            CREATE TABLE rag_docs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_path TEXT NOT NULL,
                content TEXT NOT NULL,
                course_id INTEGER,
                folder_path TEXT,
                corpus TEXT,
                enabled INTEGER DEFAULT 1
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE rag_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rag_doc_id INTEGER NOT NULL,
                chunk_index INTEGER NOT NULL DEFAULT 0,
                chunk_text TEXT NOT NULL,
                embedding_model TEXT,
                provider TEXT,
                chroma_id TEXT,
                token_count INTEGER,
                embedding_dimension INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cur.execute(
            """
            INSERT INTO rag_docs (id, source_path, content, course_id, folder_path, corpus, enabled)
            VALUES (1, 'Uploaded Files/index-drift.pdf', 'alpha content', 7, 'Uploaded Files', 'materials', 1)
            """
        )
        cur.execute(
            """
            INSERT INTO rag_embeddings
                (rag_doc_id, chunk_index, chunk_text, embedding_model, provider, chroma_id, token_count, embedding_dimension, created_at)
            VALUES
                (1, 0, 'stale chunk', 'gemini-embedding-2-preview', 'gemini', 'rag-1-0', 3, 3, CURRENT_TIMESTAMP)
            """
        )
        db.commit()
    finally:
        db.close()

    current_vs = _FakeVectorstore()

    def fake_init_vectorstore(
        collection_name=COLLECTION_MATERIALS,
        persist_dir=None,
        *,
        provider_override=None,
        model_override=None,
    ):
        del collection_name, persist_dir, provider_override, model_override
        return current_vs

    monkeypatch.setattr("tutor_rag.DB_PATH", str(db_path))
    monkeypatch.setattr(
        "tutor_rag._resolve_embedding_provider",
        lambda requested_provider=None: {  # noqa: ARG005
            "provider": "gemini",
            "model": "gemini-embedding-2-preview",
            "auto_selected": False,
        },
    )
    monkeypatch.setattr(
        "tutor_rag.chunk_document",
        lambda *args, **kwargs: [SimpleNamespace(page_content="fresh chunk")],  # noqa: ARG005
    )
    monkeypatch.setattr("tutor_rag.init_vectorstore", fake_init_vectorstore)
    monkeypatch.setattr("tutor_rag._count_tokens_for_embedding", lambda text, model: 5)

    result = embed_rag_docs()

    assert result["embedded"] == 1
    assert result["skipped"] == 0
    assert result["total_chunks"] == 1
    assert current_vs.deleted_ids == ["rag-1-0"]
    assert current_vs.added_ids == ["rag-1-0"]


def test_embed_rag_docs_records_failure_telemetry(tmp_path, monkeypatch):
    db_path = tmp_path / "rag.db"
    db = sqlite3.connect(db_path)
    try:
        cur = db.cursor()
        cur.execute(
            """
            CREATE TABLE rag_docs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_path TEXT NOT NULL,
                content TEXT NOT NULL,
                course_id INTEGER,
                folder_path TEXT,
                corpus TEXT,
                enabled INTEGER DEFAULT 1
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE rag_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rag_doc_id INTEGER NOT NULL,
                chunk_index INTEGER NOT NULL DEFAULT 0,
                chunk_text TEXT NOT NULL,
                embedding_model TEXT,
                provider TEXT,
                chroma_id TEXT,
                token_count INTEGER,
                embedding_dimension INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE rag_embedding_failures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rag_doc_id INTEGER NOT NULL,
                provider TEXT,
                embedding_model TEXT,
                collection_name TEXT,
                failure_stage TEXT,
                error_type TEXT,
                error_message TEXT,
                failed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cur.execute(
            """
            INSERT INTO rag_docs (id, source_path, content, course_id, folder_path, corpus, enabled)
            VALUES (1, 'Uploaded Files/failure.pdf', 'alpha content', 7, 'Uploaded Files', 'materials', 1)
            """
        )
        db.commit()
    finally:
        db.close()

    monkeypatch.setattr("tutor_rag.DB_PATH", str(db_path))
    monkeypatch.setattr(
        "tutor_rag._resolve_embedding_provider",
        lambda requested_provider=None: {  # noqa: ARG005
            "provider": "gemini",
            "model": "gemini-embedding-2-preview",
            "auto_selected": False,
        },
    )
    monkeypatch.setattr(
        "tutor_rag.chunk_document",
        lambda *args, **kwargs: [SimpleNamespace(page_content="fresh chunk")],  # noqa: ARG005
    )
    monkeypatch.setattr(
        "tutor_rag.init_vectorstore",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("boom")),
    )

    result = embed_rag_docs()

    assert result["embedded"] == 0
    assert result["skipped"] == 1
    assert len(result["failures"]) == 1
    failure = result["failures"][0]
    assert failure["rag_doc_id"] == 1
    assert failure["error_type"] == "RuntimeError"
    assert failure["error_message"] == "boom"

    verify = sqlite3.connect(db_path)
    try:
        verify.row_factory = sqlite3.Row
        row = verify.execute(
            """
            SELECT rag_doc_id, provider, embedding_model, failure_stage, error_type, error_message
            FROM rag_embedding_failures
            """
        ).fetchone()
        assert row is not None
        assert row["rag_doc_id"] == 1
        assert row["provider"] == "gemini"
        assert row["embedding_model"] == "gemini-embedding-2-preview"
        assert row["failure_stage"] == "embed_document"
        assert row["error_type"] == "RuntimeError"
        assert row["error_message"] == "boom"
    finally:
        verify.close()
