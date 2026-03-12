"""
Tutor RAG Pipeline — LangChain + ChromaDB vector search for Adaptive Tutor.

Uses the "tutor_materials" collection for user-uploaded study materials.
Falls back to keyword search when ChromaDB is empty.
"""

from __future__ import annotations

import pydantic_v1_patch  # noqa: F401  — must be first (fixes PEP 649 on Python 3.14)

import logging
import os
import re
import sqlite3
import threading
from collections.abc import Iterable
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from pathlib import Path
from typing import Any, Callable, Optional

from config import DB_PATH, load_env

logger = logging.getLogger(__name__)

load_env()

_CHROMA_BASE = Path(__file__).parent / "data" / "chroma_tutor"
_vectorstores: dict[str, object] = {}
_chroma_lock = threading.RLock()  # serialises all ChromaDB operations per-process

COLLECTION_MATERIALS = "tutor_materials"

DEFAULT_CHROMA_BATCH_SIZE = 1000
DEFAULT_MAX_CHUNKS_PER_DOC = 4
DEFAULT_MMR_LAMBDA_MULT = 0.2
DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_GEMINI_EMBEDDING_MODEL = "gemini-embedding-2-preview"
DEFAULT_EMBEDDING_PROVIDER = "auto"
GEMINI_PROVIDER = "gemini"
OPENAI_PROVIDER = "openai"
SCOPED_CANDIDATE_MULTIPLIER = 12
SCOPED_CANDIDATE_MIN = 120
SCOPED_CANDIDATE_MAX = 800
SCOPED_MMR_FETCH_MAX = 1600

_IMAGE_MD_PATTERN = re.compile(r"!\[[^\]]*\]\([^)]+\)")
_IMAGE_PLACEHOLDER = re.compile(r"<!--\s*image\s*-->", re.IGNORECASE)


def strip_image_refs_for_rag(content: str) -> str:
    """Remove markdown image references before RAG chunking."""
    content = _IMAGE_MD_PATTERN.sub("", content)
    content = _IMAGE_PLACEHOLDER.sub("", content)
    return content


def _normalize_embedding_provider(raw: Optional[str]) -> str:
    provider = (raw or "").strip().lower()
    if provider in {"", "auto"}:
        return DEFAULT_EMBEDDING_PROVIDER
    if provider in {OPENAI_PROVIDER, GEMINI_PROVIDER}:
        return provider
    logger.warning("Unknown embedding provider %s, falling back to auto", provider)
    return DEFAULT_EMBEDDING_PROVIDER


def _get_openai_api_key() -> str:
    """Resolve OpenAI API key from env."""
    return os.environ.get("OPENAI_API_KEY") or ""


def _has_gemini_key() -> bool:
    ordered_sources = ("GEMINI_API_KEY", "GEMINI_API_KEY_BUSINESS", "GOOGLE_API_KEY")
    for source in ordered_sources:
        if (os.environ.get(source) or "").strip():
            return True
    return False


def _get_openai_embedding_model(requested_model: Optional[str] = None) -> str:
    return (
        (requested_model or "").strip()
        or os.environ.get("TUTOR_RAG_OPENAI_EMBEDDING_MODEL", "").strip()
        or os.environ.get("OPENAI_EMBEDDING_MODEL", "").strip()
        or DEFAULT_OPENAI_EMBEDDING_MODEL
    )


def _get_gemini_embedding_model(requested_model: Optional[str] = None) -> str:
    return (
        (requested_model or "").strip()
        or os.environ.get("TUTOR_RAG_GEMINI_EMBEDDING_MODEL", "").strip()
        or os.environ.get("GEMINI_EMBEDDING_MODEL", "").strip()
        or DEFAULT_GEMINI_EMBEDDING_MODEL
    )


def _parse_embedding_dimension(value: Any) -> int | None:
    try:
        parsed = int(str(value).strip())
    except (TypeError, ValueError, AttributeError):
        return None
    return parsed if parsed > 0 else None


def _get_embedding_dimension_override(provider: str) -> int | None:
    provider_prefix = provider.strip().upper()
    for env_name in (
        f"TUTOR_RAG_{provider_prefix}_EMBEDDING_DIMENSION",
        "TUTOR_RAG_EMBEDDING_DIMENSION",
        "EMBEDDING_DIMENSION",
    ):
        parsed = _parse_embedding_dimension(os.environ.get(env_name))
        if parsed:
            return parsed
    return None


def _resolve_embedding_provider(
    requested_provider: Optional[str] = None,
) -> dict[str, str | bool]:
    provider = _normalize_embedding_provider(
        requested_provider or os.environ.get("TUTOR_RAG_EMBEDDING_PROVIDER")
    )
    requested_model = (os.environ.get("TUTOR_RAG_EMBEDDING_MODEL") or "").strip()

    if provider == GEMINI_PROVIDER and not _has_gemini_key():
        raise RuntimeError(
            "Gemini embeddings requested via TUTOR_RAG_EMBEDDING_PROVIDER, but no key is set."
            " Set GEMINI_API_KEY (or GEMINI_API_KEY_BUSINESS/GOOGLE_API_KEY) or set provider to openai."
        )

    openai_model = _get_openai_embedding_model(requested_model)
    gemini_model = _get_gemini_embedding_model(requested_model)

    if provider == DEFAULT_EMBEDDING_PROVIDER:
        if _has_gemini_key():
            return {
                "provider": GEMINI_PROVIDER,
                "model": gemini_model,
                "auto_selected": True,
            }
        return {
            "provider": OPENAI_PROVIDER,
            "model": openai_model,
            "auto_selected": True,
        }

    if provider == GEMINI_PROVIDER:
        return {"provider": GEMINI_PROVIDER, "model": gemini_model, "auto_selected": False}

    return {"provider": OPENAI_PROVIDER, "model": openai_model, "auto_selected": False}


def _normalize_collection_component(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return "default"
    return re.sub(r"[^a-z0-9._-]+", "-", value)


def _collection_for_embeddings(collection_name: str, provider: str, model: str) -> str:
    model_slug = _normalize_collection_component(model)
    provider_slug = _normalize_collection_component(provider)
    if collection_name == COLLECTION_MATERIALS:
        return f"{collection_name}_{provider_slug}_{model_slug}"
    return collection_name


def _build_gemini_embedding_function(model: str):
    from google import genai  # type: ignore[import-not-found]
    from google.genai import types  # type: ignore[import-not-found]
    from video_enrich_providers.gemini_provider import _run_with_key_failover

    output_dimensionality = _get_embedding_dimension_override(GEMINI_PROVIDER)

    class _GeminiEmbeddingFunction:
        def __init__(self) -> None:
            self.last_dimension: int | None = output_dimensionality

        def _extract_embedding(self, response: Any) -> list[float]:
            if response is None:
                return []

            if isinstance(response, dict):
                value = response.get("embedding")
                if isinstance(value, dict):
                    values = value.get("values")
                    if isinstance(values, Iterable):
                        return [float(v) for v in values]
                embedding_list = response.get("embeddings")
                if isinstance(embedding_list, list) and embedding_list:
                    entry = embedding_list[0]
                    values = None
                    if isinstance(entry, dict):
                        values = entry.get("values")
                    if values is not None:
                        return [float(v) for v in values]

            if hasattr(response, "embedding"):
                values = getattr(response.embedding, "values", None)
                if values is not None:
                    return [float(v) for v in values]

            if hasattr(response, "embeddings"):
                embeddings = getattr(response, "embeddings")
                if embeddings:
                    values = getattr(embeddings[0], "values", None)
                    if values is not None:
                        return [float(v) for v in values]

            if hasattr(response, "candidates") and response.candidates:
                first = response.candidates[0]
                if hasattr(first, "embedding"):
                    values = getattr(first.embedding, "values", None)
                    if values is not None:
                        return [float(v) for v in values]

            raise RuntimeError("No embedding vector in Gemini response")

        def _embed_one(self, client: Any, text: str, *, task_type: str) -> list[float]:
            config_kwargs: dict[str, Any] = {"task_type": task_type}
            if output_dimensionality is not None:
                config_kwargs["output_dimensionality"] = output_dimensionality
            response = client.models.embed_content(
                model=model,
                contents=text,
                config=types.EmbedContentConfig(**config_kwargs),
            )
            vector = self._extract_embedding(response)
            self.last_dimension = len(vector) or self.last_dimension
            return vector

        def _embed_documents(
            self,
            texts: list[str],
            *,
            task_type: str,
        ) -> list[list[float]]:
            if not texts:
                return []

            def _runner(client, key_source):  # noqa: ARG001
                del key_source  # compatibility with failover helpers
                vectors: list[list[float]] = []
                for chunk in texts:
                    vectors.append(self._embed_one(client, chunk, task_type=task_type))
                return vectors

            result: list[list[float]] = _run_with_key_failover(
                "embed_content", _runner
            )
            if not result:
                raise RuntimeError("Gemini returned empty embedding list")
            return result

        def embed_documents(self, texts: list[str]) -> list[list[float]]:
            return self._embed_documents(texts, task_type="RETRIEVAL_DOCUMENT")

        def embed_query(self, text: str) -> list[float]:
            def _runner(client, key_source):  # noqa: ARG001
                return self._embed_one(client, text, task_type="RETRIEVAL_QUERY")

            return _run_with_key_failover("embed_query", _runner)

    return _GeminiEmbeddingFunction()


def init_vectorstore(
    collection_name: str = COLLECTION_MATERIALS,
    persist_dir: Optional[str] = None,
    *,
    provider_override: Optional[str] = None,
    model_override: Optional[str] = None,
):
    """Initialize or return cached ChromaDB vectorstore for a named collection."""
    with _chroma_lock:
        if provider_override or model_override:
            runtime_cfg = _resolve_embedding_provider(provider_override)
            provider = str(provider_override or runtime_cfg["provider"])
            model = str(model_override or runtime_cfg["model"])
        else:
            runtime_cfg = _resolve_embedding_provider()
            provider = str(runtime_cfg["provider"])
            model = str(runtime_cfg["model"])
        provider_collection = _collection_for_embeddings(
            collection_name, provider, model
        )

        cache_key = f"{provider_collection}::{provider}::{model}"
        if cache_key in _vectorstores:
            return _vectorstores[cache_key]

        persist = persist_dir or str(
            _CHROMA_BASE / provider_collection.replace("tutor_", "")
        )
        os.makedirs(persist, exist_ok=True)

        if provider == OPENAI_PROVIDER:
            from langchain_openai import OpenAIEmbeddings
            from langchain_chroma import Chroma

            api_key = _get_openai_api_key()
            base_url = os.environ.get("OPENAI_BASE_URL")
            embed_kwargs: dict = {
                "model": model,
                "api_key": api_key,
            }
            dimensions = _get_embedding_dimension_override(OPENAI_PROVIDER)
            if dimensions is not None:
                embed_kwargs["dimensions"] = dimensions
            if base_url:
                embed_kwargs["base_url"] = base_url
            embeddings = OpenAIEmbeddings(**embed_kwargs)
        else:
            from langchain_chroma import Chroma

            embeddings = _build_gemini_embedding_function(str(model))

        vs = Chroma(
            collection_name=provider_collection,
            embedding_function=embeddings,
            persist_directory=persist,
        )
        _vectorstores[cache_key] = vs
        logger.info(
            "Initialized embedding collection %s using provider=%s model=%s",
            provider_collection,
            provider,
            model,
        )
        return vs


def _stored_embedding_matches(row: sqlite3.Row, provider: str, model: str) -> bool:
    row_provider = str(row["provider"] or "").strip().lower() if "provider" in row.keys() else ""
    row_model = str(row["embedding_model"] or "").strip() if "embedding_model" in row.keys() else ""
    return row_provider == provider and row_model == model


def _stored_embedding_dimension_matches(
    row: sqlite3.Row, configured_dimension: int | None
) -> bool:
    if configured_dimension is None or "embedding_dimension" not in row.keys():
        return True
    stored_dimension = _parse_embedding_dimension(row["embedding_dimension"])
    return stored_dimension == configured_dimension


def _stored_embedding_source(row: sqlite3.Row) -> tuple[str, str] | None:
    if "provider" not in row.keys() or "embedding_model" not in row.keys():
        return None
    provider = str(row["provider"] or "").strip().lower()
    model = str(row["embedding_model"] or "").strip()
    if not provider or not model:
        return None
    return provider, model


def _load_doc_embedding_rows(
    cur: sqlite3.Cursor,
    rag_doc_id: int,
    columns: set[str],
) -> list[sqlite3.Row]:
    selected_columns = ["chroma_id"]
    if "provider" in columns:
        selected_columns.append("provider")
    if "embedding_model" in columns:
        selected_columns.append("embedding_model")
    if "embedding_dimension" in columns:
        selected_columns.append("embedding_dimension")

    cur.execute(
        f"SELECT {', '.join(selected_columns)} FROM rag_embeddings WHERE rag_doc_id = ?",
        (rag_doc_id,),
    )
    return cur.fetchall()


def _delete_vector_ids(vectorstore: object, chroma_ids: list[str]) -> None:
    if not chroma_ids:
        return
    try:
        delete_fn = getattr(vectorstore, "delete", None)
        if callable(delete_fn):
            delete_fn(ids=chroma_ids)
    except Exception as exc:
        logger.warning("Could not delete stale Chroma ids %s: %s", chroma_ids, exc)


def _clear_stale_doc_embeddings(
    cur: sqlite3.Cursor,
    rag_doc_id: int,
    rows: list[sqlite3.Row],
) -> None:
    stale_by_source: dict[tuple[str, str], list[str]] = {}
    for row in rows:
        source = _stored_embedding_source(row)
        chroma_id = str(row["chroma_id"] or "").strip() if "chroma_id" in row.keys() else ""
        if source and chroma_id:
            stale_by_source.setdefault(source, []).append(chroma_id)

    for (provider, model), chroma_ids in stale_by_source.items():
        try:
            vectorstore = init_vectorstore(
                COLLECTION_MATERIALS,
                provider_override=provider,
                model_override=model,
            )
            _delete_vector_ids(vectorstore, chroma_ids)
        except Exception as exc:
            logger.warning(
                "Failed clearing stale collection entries for provider=%s model=%s: %s",
                provider,
                model,
                exc,
            )

    cur.execute("DELETE FROM rag_embeddings WHERE rag_doc_id = ?", (rag_doc_id,))


def _extract_collection_ids(raw_ids: Any) -> set[str]:
    if raw_ids is None:
        return set()
    if isinstance(raw_ids, str):
        return {raw_ids}
    if isinstance(raw_ids, Iterable):
        collected: set[str] = set()
        for entry in raw_ids:
            collected.update(_extract_collection_ids(entry))
        return collected
    return set()


def _lookup_existing_index_ids(vectorstore: object, chroma_ids: list[str]) -> set[str] | None:
    if not chroma_ids:
        return set()
    collection = getattr(vectorstore, "_collection", None)
    getter = getattr(collection, "get", None)
    if not callable(getter):
        return None
    try:
        result = getter(ids=chroma_ids)
    except TypeError:
        result = getter(chroma_ids)
    except Exception as exc:
        logger.warning("Could not probe Chroma ids %s: %s", chroma_ids, exc)
        return None
    if isinstance(result, dict):
        return _extract_collection_ids(result.get("ids"))
    return None


def _record_embedding_failure(
    cur: sqlite3.Cursor,
    *,
    rag_doc_id: int,
    provider: str,
    embedding_model: str,
    collection_name: str,
    failure_stage: str,
    error_type: str,
    error_message: str,
) -> None:
    try:
        cur.execute(
            """
            INSERT INTO rag_embedding_failures
                (rag_doc_id, provider, embedding_model, collection_name, failure_stage, error_type, error_message, failed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                rag_doc_id,
                provider,
                embedding_model,
                collection_name,
                failure_stage,
                error_type,
                error_message[:4000],
            ),
        )
    except sqlite3.OperationalError:
        logger.debug("rag_embedding_failures table not available; skipping failure telemetry")


def _clear_embedding_failures(
    cur: sqlite3.Cursor, *, rag_doc_id: int, provider: str, embedding_model: str
) -> None:
    try:
        cur.execute(
            """
            DELETE FROM rag_embedding_failures
            WHERE rag_doc_id = ? AND provider = ? AND embedding_model = ?
            """,
            (rag_doc_id, provider, embedding_model),
        )
    except sqlite3.OperationalError:
        logger.debug("rag_embedding_failures table not available; skipping failure clear")


SMALL_DOC_CHAR_LIMIT = (
    8_000  # ~2000 tokens — fits in one embedding, no splitting needed
)
MIN_CHUNK_CHARS = 50  # filter out header-only fragments
MAX_CONTENT_CHARS = (
    500_000  # ~125K tokens — hard cap to prevent regex hang on bloated docs
)
DOC_EMBED_TIMEOUT_SEC = 120  # per-doc embedding timeout in seconds


def chunk_document(
    content: str,
    source_path: str = "",
    *,
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
    course_id: Optional[int] = None,
    folder_path: Optional[str] = None,
    rag_doc_id: Optional[int] = None,
    corpus: Optional[str] = None,
):
    """Split document content into LangChain Documents with metadata.

    Strategy:
      - Small docs (<=8000 chars): returned as a single chunk (no splitting).
      - Larger docs: two-stage split — first by markdown headers to keep
        sections intact, then by character count within each section.
    """
    content = strip_image_refs_for_rag(content)

    # Cap document size before chunking to prevent MarkdownHeaderTextSplitter hang
    if len(content) > MAX_CONTENT_CHARS:
        logger.warning(
            "Document content too large (%d chars), truncating to %d: %s",
            len(content),
            MAX_CONTENT_CHARS,
            source_path,
        )
        content = content[:MAX_CONTENT_CHARS]

    from langchain_core.documents import Document

    stripped = content.strip()
    if not stripped:
        return []

    def _build_metadata(index: int) -> dict:
        metadata: dict = {"source": source_path, "chunk_index": index}
        if course_id is not None:
            metadata["course_id"] = course_id
        if folder_path:
            metadata["folder_path"] = folder_path
        if rag_doc_id is not None:
            metadata["rag_doc_id"] = rag_doc_id
        if corpus:
            metadata["corpus"] = corpus
        return metadata

    # Small-document bypass — return the whole thing as one chunk
    if len(stripped) <= SMALL_DOC_CHAR_LIMIT:
        return [Document(page_content=stripped, metadata=_build_metadata(0))]

    # Two-stage splitting for larger documents
    from langchain_text_splitters import (
        MarkdownHeaderTextSplitter,
        RecursiveCharacterTextSplitter,
    )

    # Stage 1: split by markdown headers (keeps header text in page_content)
    headers_to_split_on = [("#", "H1"), ("##", "H2"), ("###", "H3")]
    md_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on,
        strip_headers=False,
    )
    header_splits = md_splitter.split_text(stripped)

    # Stage 2: constrain chunk size within each header section
    char_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " "],
    )
    raw_chunks = char_splitter.split_documents(header_splits)

    # Filter out tiny/empty fragments (e.g. bare header lines)
    docs = []
    for chunk in raw_chunks:
        text = chunk.page_content.strip()
        if len(text) < MIN_CHUNK_CHARS:
            continue
        docs.append(
            Document(
                page_content=text,
                metadata=_build_metadata(len(docs)),
            )
        )

    return docs


def _resolve_chroma_max_batch_size(vs: object) -> int:
    """Best-effort lookup of Chroma's runtime max batch size."""
    client = getattr(vs, "_client", None)
    get_max_batch_size = getattr(client, "get_max_batch_size", None)
    if not callable(get_max_batch_size):
        return DEFAULT_CHROMA_BATCH_SIZE

    try:
        max_batch_size = int(get_max_batch_size())
    except Exception:
        return DEFAULT_CHROMA_BATCH_SIZE

    return max_batch_size if max_batch_size > 0 else DEFAULT_CHROMA_BATCH_SIZE


def _is_chroma_batch_limit_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return ("batch size" in msg and ("max" in msg or "maximum" in msg)) or (
        "cannot submit more than" in msg and "embeddings at once" in msg
    )


def _rollback_chroma_ids(vs: object, ids: list[str]) -> None:
    """Best-effort rollback for partially inserted vector IDs."""
    if not ids:
        return

    collection = getattr(vs, "_collection", None)
    delete_from_collection = getattr(collection, "delete", None)
    if callable(delete_from_collection):
        try:
            delete_from_collection(ids=ids)
            return
        except Exception:
            pass

    delete_from_vs = getattr(vs, "delete", None)
    if callable(delete_from_vs):
        try:
            delete_from_vs(ids=ids)
        except Exception:
            pass


def _add_documents_batched(vs: object, chunks: list, ids: list[str]) -> None:
    """
    Add documents to Chroma using bounded batch sizes.

    Some Chroma backends enforce a max batch size and will raise ValueError when
    a single add/upsert exceeds that limit.
    """
    if not chunks:
        return
    if len(chunks) != len(ids):
        raise ValueError("chunks and ids must have the same length")

    batch_size = min(len(chunks), _resolve_chroma_max_batch_size(vs))
    index = 0
    added_ids: list[str] = []
    while index < len(chunks):
        next_index = min(index + batch_size, len(chunks))
        batch_ids = ids[index:next_index]
        try:
            vs.add_documents(chunks[index:next_index], ids=batch_ids)
            added_ids.extend(batch_ids)
            index = next_index
        except ValueError as exc:
            if not _is_chroma_batch_limit_error(exc) or batch_size <= 1:
                _rollback_chroma_ids(vs, added_ids)
                raise
            batch_size = max(1, batch_size // 2)
        except Exception:
            _rollback_chroma_ids(vs, added_ids)
            raise


def _get_rag_embedding_columns(cur: sqlite3.Cursor) -> set[str]:
    """Return existing rag_embeddings columns for compatibility with older schemas."""
    cur.execute("PRAGMA table_info(rag_embeddings)")
    return {row["name"] if isinstance(row, sqlite3.Row) else row[1] for row in cur.fetchall()}


def _build_rag_embedding_insert_sql(columns: set[str]) -> tuple[str, list[str]]:
    base_columns = [
        "rag_doc_id",
        "chunk_index",
        "chunk_text",
        "chroma_id",
        "token_count",
    ]
    if "provider" in columns:
        base_columns.append("provider")
    if "embedding_model" in columns:
        base_columns.append("embedding_model")
    if "embedding_dimension" in columns:
        base_columns.append("embedding_dimension")

    base_columns.append("created_at")

    placeholders = ", ".join("?" for _ in base_columns[:-1]) + ", datetime('now')"
    columns_clause = ", ".join(base_columns)
    return (
        f"INSERT OR IGNORE INTO rag_embeddings ({columns_clause}) VALUES ({placeholders})",
        base_columns,
    )


def _count_tokens_for_embedding(text: str, model: str) -> int:
    if model.lower().startswith("text-embedding-3-"):
        try:
            import tiktoken

            enc = tiktoken.encoding_for_model(model)
            return len(enc.encode(text))
        except Exception:
            return max(1, len(text) // 4)

    # Fallback for non-OpenAI models.
    return max(1, len(text) // 4)


def embed_rag_docs(
    course_id: Optional[int] = None,
    folder_path: Optional[str] = None,
    corpus: Optional[str] = None,
    progress_callback: Optional[Callable[[int, int, str], None]] = None,
) -> dict:
    """
    Embed rag_docs from SQLite into ChromaDB. Tracks chunks in rag_embeddings table.
    Routes to correct collection based on corpus.
    Returns {embedded: int, skipped: int, total_chunks: int, timed_out: int}.
    """
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    embedding_cfg = _resolve_embedding_provider()
    embedding_provider = str(embedding_cfg["provider"])
    embedding_model = str(embedding_cfg["model"])
    configured_dimension = _get_embedding_dimension_override(embedding_provider)
    active_collection = _collection_for_embeddings(
        COLLECTION_MATERIALS, embedding_provider, embedding_model
    )

    conditions = ["COALESCE(enabled, 1) = 1"]
    params: list = []

    if corpus:
        conditions.append("corpus = ?")
        params.append(corpus)
    if course_id is not None:
        conditions.append("(course_id = ? OR course_id IS NULL)")
        params.append(course_id)
    if folder_path:
        conditions.append("folder_path LIKE ?")
        params.append(f"%{folder_path}%")

    where = " AND ".join(conditions)
    cur.execute(
        f"SELECT id, source_path, content, course_id, folder_path, corpus FROM rag_docs WHERE {where}",
        params,
    )
    docs = cur.fetchall()

    embed_counts = {
        "embedded": 0,
        "skipped": 0,
        "timed_out": 0,
        "total_chunks": 0,
    }
    failures: list[dict[str, Any]] = []

    embedding_columns = _get_rag_embedding_columns(cur)
    insert_sql, insert_columns = _build_rag_embedding_insert_sql(embedding_columns)

    for idx, doc in enumerate(docs):
        if progress_callback:
            progress_callback(idx, len(docs), doc["source_path"] or "unknown")

        existing_rows = _load_doc_embedding_rows(cur, doc["id"], embedding_columns)
        matching_rows = [
            row
            for row in existing_rows
            if _stored_embedding_matches(row, embedding_provider, embedding_model)
            and _stored_embedding_dimension_matches(row, configured_dimension)
        ]
        if matching_rows:
            matching_ids = [
                str(row["chroma_id"] or "").strip()
                for row in matching_rows
                if "chroma_id" in row.keys() and str(row["chroma_id"] or "").strip()
            ]
            index_matches = None
            if matching_ids:
                try:
                    current_vs = init_vectorstore(
                        COLLECTION_MATERIALS,
                        provider_override=embedding_provider,
                        model_override=embedding_model,
                    )
                    index_matches = _lookup_existing_index_ids(current_vs, matching_ids)
                except Exception as exc:
                    logger.warning(
                        "Failed probing active Chroma collection for doc %s: %s",
                        doc["id"],
                        exc,
                    )
            if index_matches is None or set(matching_ids).issubset(index_matches):
                embed_counts["skipped"] += 1
                continue
        if existing_rows:
            _clear_stale_doc_embeddings(cur, doc["id"], existing_rows)

        content = doc["content"] or ""
        if not content.strip():
            embed_counts["skipped"] += 1
            continue

        doc_corpus = doc["corpus"] or "materials"
        collection = COLLECTION_MATERIALS
        doc_id = doc["id"]
        doc_source = doc["source_path"] or ""
        doc_course_id = doc["course_id"]
        doc_folder_path = doc["folder_path"]

        def _embed_one(doc_row: object) -> int:
            _chunks = chunk_document(
                content,
                doc_source,
                course_id=doc_course_id,
                folder_path=doc_folder_path,
                rag_doc_id=doc_id,
                corpus=doc_corpus,
            )
            if not _chunks:
                return 0
            _vs = init_vectorstore(
                collection,
                provider_override=embedding_provider,
                model_override=embedding_model,
            )
            _ids = [f"rag-{doc_id}-{i}" for i in range(len(_chunks))]
            _add_documents_batched(_vs, _chunks, _ids)
            embedding_dimension = None
            embeddings_fn = getattr(_vs, "_embedding_function", None)
            if embeddings_fn is not None:
                embedding_dimension = _parse_embedding_dimension(
                    getattr(embeddings_fn, "last_dimension", None)
                )
            if embedding_dimension is None:
                embedding_dimension = configured_dimension
            for i, chunk in enumerate(_chunks):
                token_count = _count_tokens_for_embedding(
                    chunk.page_content, embedding_model
                )
                value_map = {
                    "rag_doc_id": doc_id,
                    "chunk_index": i,
                    "chunk_text": chunk.page_content,
                    "chroma_id": _ids[i],
                    "token_count": token_count,
                }
                if "provider" in embedding_columns:
                    value_map["provider"] = embedding_provider
                if "embedding_model" in embedding_columns:
                    value_map["embedding_model"] = embedding_model
                if "embedding_dimension" in embedding_columns:
                    value_map["embedding_dimension"] = embedding_dimension

                cur.execute(
                    insert_sql,
                    [value_map[column] for column in insert_columns[:-1]]
                )
            return len(_chunks)

        try:
            with ThreadPoolExecutor(max_workers=1) as _executor:
                _future = _executor.submit(_embed_one, doc)
                chunk_count = _future.result(timeout=DOC_EMBED_TIMEOUT_SEC)
            if chunk_count == 0:
                embed_counts["skipped"] += 1
            else:
                embed_counts["total_chunks"] += chunk_count
                embed_counts["embedded"] += 1
                _clear_embedding_failures(
                    cur,
                    rag_doc_id=doc_id,
                    provider=embedding_provider,
                    embedding_model=embedding_model,
                )
        except FuturesTimeout:
            logger.error(
                "Embedding timed out after %ds for doc %d: %s",
                DOC_EMBED_TIMEOUT_SEC,
                doc_id,
                doc_source,
            )
            cur.execute(
                "DELETE FROM rag_embeddings WHERE rag_doc_id = ?", (doc_id,)
            )
            failure = {
                "rag_doc_id": doc_id,
                "source_path": doc_source,
                "provider": embedding_provider,
                "embedding_model": embedding_model,
                "collection_name": active_collection,
                "failure_stage": "embed_document",
                "error_type": "TimeoutError",
                "error_message": f"Embedding timed out after {DOC_EMBED_TIMEOUT_SEC}s",
            }
            _record_embedding_failure(
                cur,
                rag_doc_id=doc_id,
                provider=embedding_provider,
                embedding_model=embedding_model,
                collection_name=active_collection,
                failure_stage="embed_document",
                error_type="TimeoutError",
                error_message=f"Embedding timed out after {DOC_EMBED_TIMEOUT_SEC}s",
            )
            conn.commit()
            embed_counts["timed_out"] += 1
            failures.append(failure)
        except Exception as exc:
            logger.error("Embedding failed for doc %d: %s", doc_id, str(exc))
            cur.execute(
                "DELETE FROM rag_embeddings WHERE rag_doc_id = ?", (doc_id,)
            )
            failure = {
                "rag_doc_id": doc_id,
                "source_path": doc_source,
                "provider": embedding_provider,
                "embedding_model": embedding_model,
                "collection_name": active_collection,
                "failure_stage": "embed_document",
                "error_type": exc.__class__.__name__,
                "error_message": str(exc) or repr(exc),
            }
            _record_embedding_failure(
                cur,
                rag_doc_id=doc_id,
                provider=embedding_provider,
                embedding_model=embedding_model,
                collection_name=active_collection,
                failure_stage="embed_document",
                error_type=exc.__class__.__name__,
                error_message=str(exc) or repr(exc),
            )
            conn.commit()
            embed_counts["skipped"] += 1
            failures.append(failure)

    conn.commit()
    conn.close()

    return {
        **embed_counts,
        "failures": failures,
        "provider": embedding_provider,
        "model": embedding_model,
        "collection": active_collection,
        "auto_selected_provider": bool(embedding_cfg.get("auto_selected", False)),
    }


def _doc_identity(doc: object, fallback_index: int) -> str:
    """Return a stable per-document identity for diversity controls."""
    metadata = getattr(doc, "metadata", None) or {}
    rag_doc_id = metadata.get("rag_doc_id")
    if rag_doc_id is not None:
        return f"id:{rag_doc_id}"
    source = metadata.get("source")
    if source:
        return f"source:{source}"
    return f"idx:{fallback_index}"


def _chunk_identity(doc: object, fallback_index: int) -> str:
    """Return a stable per-chunk identity to dedupe merged candidate pools."""
    metadata = getattr(doc, "metadata", None) or {}
    identity = _doc_identity(doc, fallback_index)
    chunk_index = metadata.get("chunk_index")
    if chunk_index is not None:
        return f"{identity}/chunk:{chunk_index}"
    text = str(getattr(doc, "page_content", "") or "")
    return f"{identity}/text:{hash(text[:240])}"


def _merge_candidate_pools(*pools: list, max_total: int) -> list:
    """
    Merge multiple candidate pools while preserving order and deduping chunks.

    The first pool has highest priority. Additional pools can introduce
    diversity that might be missing from a pure similarity-search ranking.
    """
    if max_total <= 0:
        return []

    merged: list[object] = []
    seen_chunk_ids: set[str] = set()
    for pool in pools:
        for idx, doc in enumerate(pool):
            cid = _chunk_identity(doc, idx)
            if cid in seen_chunk_ids:
                continue
            seen_chunk_ids.add(cid)
            merged.append(doc)
            if len(merged) >= max_total:
                return merged
    return merged


def _cap_candidates_per_doc(docs: list, *, max_per_doc: int, max_total: int) -> list:
    """Limit candidates per document before final selection to avoid source domination."""
    if max_total <= 0 or max_per_doc <= 0 or not docs:
        return []

    capped: list[object] = []
    per_doc_counts: dict[str, int] = {}
    for idx, doc in enumerate(docs):
        identity = _doc_identity(doc, idx)
        if per_doc_counts.get(identity, 0) >= max_per_doc:
            continue
        per_doc_counts[identity] = per_doc_counts.get(identity, 0) + 1
        capped.append(doc)
        if len(capped) >= max_total:
            break
    return capped


def _doc_distribution_stats(docs: list) -> dict[str, object]:
    """Compute lightweight concentration metrics for retrieval diagnostics."""
    if not docs:
        return {
            "unique_docs": 0,
            "top_doc_identity": None,
            "top_doc_source": None,
            "top_doc_count": 0,
            "top_doc_share": 0.0,
        }

    counts: dict[str, int] = {}
    top_source_by_identity: dict[str, str] = {}
    for idx, doc in enumerate(docs):
        identity = _doc_identity(doc, idx)
        counts[identity] = counts.get(identity, 0) + 1
        if identity not in top_source_by_identity:
            source = str(
                (getattr(doc, "metadata", None) or {}).get("source") or ""
            ).strip()
            top_source_by_identity[identity] = source

    top_identity, top_count = max(counts.items(), key=lambda kv: kv[1])
    total = len(docs)
    return {
        "unique_docs": len(counts),
        "top_doc_identity": top_identity,
        "top_doc_source": top_source_by_identity.get(top_identity) or None,
        "top_doc_count": top_count,
        "top_doc_share": float(top_count / total) if total else 0.0,
    }


def _resolve_candidate_pool_size(k: int, material_ids: Optional[list[int]]) -> int:
    """
    Decide how many vector candidates to fetch before final selection.

    Material-scoped retrieval needs a wider candidate pool so the final top-k can
    include chunks from more than a handful of dominant files.
    """
    if not material_ids:
        return max(k * 2, 12)
    scoped_k = max(int(k), 1)
    candidate_k = max(scoped_k * SCOPED_CANDIDATE_MULTIPLIER, SCOPED_CANDIDATE_MIN)
    return min(candidate_k, SCOPED_CANDIDATE_MAX)


def search_with_embeddings(
    query: str,
    course_id: Optional[int] = None,
    folder_paths: Optional[list[str]] = None,
    material_ids: Optional[list[int]] = None,
    collection_name: str = COLLECTION_MATERIALS,
    k: int = 6,
    debug: Optional[dict[str, Any]] = None,
):
    """
    Vector search via ChromaDB with candidate merging and diversity capping.
    Fetches a widened candidate pool, then returns top k chunks.
    Falls back to keyword search if vectorstore is empty.
    """
    with _chroma_lock:
        if debug is not None:
            debug.clear()
            debug.update(
                {
                    "collection": collection_name,
                    "k_requested": k,
                    "used_keyword_fallback": False,
                    "candidate_pool_similarity": 0,
                    "candidate_pool_mmr": 0,
                    "candidate_pool_merged": 0,
                    "candidate_pool_after_cap": 0,
                    "candidate_pool_dropped_by_cap": 0,
                    "final_chunks": 0,
                    "final_unique_docs": 0,
                    "final_top_doc_share": 0.0,
                    "final_top_doc_source": None,
                }
            )

        vs = init_vectorstore(collection_name)

        corpus_fallback = None

        try:
            collection = vs._collection
            if collection.count() == 0:
                if debug is not None:
                    debug["used_keyword_fallback"] = True
                    debug["fallback_reason"] = "empty_collection"
                return _keyword_fallback(
                    query,
                    course_id,
                    folder_paths,
                    material_ids,
                    k,
                    corpus=corpus_fallback,
                    debug=debug,
                )
        except Exception:
            if debug is not None:
                debug["used_keyword_fallback"] = True
                debug["fallback_reason"] = "collection_probe_failed"
            return _keyword_fallback(
                query,
                course_id,
                folder_paths,
                material_ids,
                k,
                corpus=corpus_fallback,
                debug=debug,
            )

        # Build metadata filter
        where_filter = None
        conditions = []
        # When explicit material IDs are provided, they define the scope and
        # should not be additionally constrained by course_id.
        if course_id is not None and not material_ids:
            conditions.append({"course_id": course_id})
        if folder_paths:
            conditions.append({"folder_path": {"$in": folder_paths}})
        if material_ids:
            conditions.append({"rag_doc_id": {"$in": material_ids}})

        if len(conditions) == 1:
            where_filter = conditions[0]
        elif len(conditions) > 1:
            where_filter = {"$and": conditions}

        try:
            candidate_k = _resolve_candidate_pool_size(k, material_ids)
            if debug is not None:
                debug["candidate_k"] = candidate_k
            similarity_candidates = vs.similarity_search(
                query,
                k=candidate_k,
                filter=where_filter,
            )
            if debug is not None:
                debug["candidate_pool_similarity"] = len(similarity_candidates)
            mmr_candidates: list = []
            mmr_k = 0
            mmr_search = getattr(vs, "max_marginal_relevance_search", None)
            if callable(mmr_search):
                try:
                    mmr_k = candidate_k
                    mmr_fetch_k = min(
                        max(mmr_k * 3, mmr_k + 40), SCOPED_MMR_FETCH_MAX
                    )
                    if debug is not None:
                        debug["mmr_k"] = mmr_k
                        debug["mmr_fetch_k"] = mmr_fetch_k
                    mmr_candidates = mmr_search(
                        query,
                        k=mmr_k,
                        fetch_k=mmr_fetch_k,
                        lambda_mult=DEFAULT_MMR_LAMBDA_MULT,
                        filter=where_filter,
                    )
                except Exception:
                    mmr_candidates = []
                    if debug is not None:
                        debug["mmr_error"] = True
            if debug is not None:
                debug["candidate_pool_mmr"] = len(mmr_candidates)

            merged_candidates_uncapped = _merge_candidate_pools(
                similarity_candidates,
                mmr_candidates,
                max_total=max(candidate_k * 2, k * 8),
            )
            if debug is not None:
                debug["candidate_pool_merged"] = len(merged_candidates_uncapped)

            merged_candidates = merged_candidates_uncapped

            if collection_name == COLLECTION_MATERIALS and merged_candidates:
                # Keep enough per-doc candidates to satisfy high-k requests
                # while still preventing any single source from flooding the
                # rerank pool.
                pre_cap = max(k, 6)
                if debug is not None:
                    debug["pre_cap_per_doc"] = pre_cap
                merged_candidates = _cap_candidates_per_doc(
                    merged_candidates,
                    max_per_doc=pre_cap,
                    max_total=max(candidate_k, k),
                )
                if debug is not None:
                    debug["candidate_pool_after_cap"] = len(merged_candidates)
                    debug["candidate_pool_dropped_by_cap"] = max(
                        0,
                        len(merged_candidates_uncapped) - len(merged_candidates),
                    )
            elif debug is not None:
                debug["candidate_pool_after_cap"] = len(merged_candidates)

            if merged_candidates:
                final_docs = merged_candidates[:k]
                if is_video_query(query):
                    final_docs = boost_video_chunks(final_docs, query)
                if debug is not None:
                    dist = _doc_distribution_stats(final_docs)
                    debug["final_chunks"] = len(final_docs)
                    debug["final_unique_docs"] = dist["unique_docs"]
                    debug["final_top_doc_share"] = round(
                        float(dist["top_doc_share"]), 4
                    )
                    debug["final_top_doc_source"] = dist["top_doc_source"]
                return final_docs
        except Exception:
            if debug is not None:
                debug["used_keyword_fallback"] = True
                debug["fallback_reason"] = "search_exception"
            return _keyword_fallback(
                query,
                course_id,
                folder_paths,
                material_ids,
                k,
                corpus=corpus_fallback,
                debug=debug,
            )

        if debug is not None:
            debug["used_keyword_fallback"] = True
            debug["fallback_reason"] = "no_candidates"
        return _keyword_fallback(
            query,
            course_id,
            folder_paths,
            material_ids,
            k,
            corpus=corpus_fallback,
            debug=debug,
        )


def _keyword_fallback(
    query: str,
    course_id: Optional[int] = None,
    folder_paths: Optional[list[str]] = None,
    material_ids: Optional[list[int]] = None,
    k: int = 6,
    corpus: Optional[str] = None,
    debug: Optional[dict[str, Any]] = None,
):
    """Fallback to SQL keyword search when ChromaDB is empty/unavailable."""
    from langchain_core.documents import Document

    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    stop_words = {
        "the",
        "a",
        "an",
        "is",
        "are",
        "was",
        "were",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "and",
        "or",
        "it",
    }
    keywords = [w for w in query.lower().split() if w not in stop_words and len(w) > 2]

    conditions = ["COALESCE(enabled, 1) = 1"]
    params: list = []

    if corpus:
        conditions.append("corpus = ?")
        params.append(corpus)

    # Explicit material IDs define scope; avoid over-constraining by course_id.
    if course_id is not None and not material_ids:
        conditions.append("(course_id = ? OR course_id IS NULL)")
        params.append(course_id)

    if folder_paths:
        fp_conditions = ["folder_path LIKE ?" for _ in folder_paths]
        conditions.append(f"({' OR '.join(fp_conditions)})")
        params.extend(f"%{fp}%" for fp in folder_paths)

    if material_ids:
        placeholders = ",".join("?" * len(material_ids))
        conditions.append(f"id IN ({placeholders})")
        params.extend(material_ids)

    keyword_clauses = []
    keyword_params: list = []
    for kw in keywords[:5]:
        keyword_clauses.append(f"(CASE WHEN LOWER(content) LIKE ? THEN 1 ELSE 0 END)")
        keyword_params.append(f"%{kw}%")

    score_expr = " + ".join(keyword_clauses) if keyword_clauses else "0"
    where = " AND ".join(conditions)

    # score_expr appears twice (SELECT + WHERE) so keyword_params needed twice
    query_params = keyword_params + params + keyword_params + [k]

    cur.execute(
        f"""SELECT id, source_path, content, course_id, folder_path,
                   ({score_expr}) as relevance
            FROM rag_docs
            WHERE {where} AND ({score_expr}) > 0
            ORDER BY relevance DESC
            LIMIT ?""",
        query_params,
    )

    results = []
    for row in cur.fetchall():
        content = row["content"] or ""
        if len(content) > 1000:
            content = content[:1000] + "..."
        results.append(
            Document(
                page_content=content,
                metadata={
                    "source": row["source_path"] or "",
                    "course_id": row["course_id"],
                    "folder_path": row["folder_path"],
                    "rag_doc_id": row["id"],
                },
            )
        )

    conn.close()
    if debug is not None:
        dist = _doc_distribution_stats(results)
        debug["fallback_query_mode"] = "keyword_sql"
        debug["final_chunks"] = len(results)
        debug["final_unique_docs"] = dist["unique_docs"]
        debug["final_top_doc_share"] = round(float(dist["top_doc_share"]), 4)
        debug["final_top_doc_source"] = dist["top_doc_source"]
        # Keyword fallback does not run vector candidate pre-cap.
        debug["candidate_pool_after_cap"] = len(results)
    return results


def get_retriever(
    course_id: Optional[int] = None,
    folder_paths: Optional[list[str]] = None,
    material_ids: Optional[list[int]] = None,
    collection_name: str = COLLECTION_MATERIALS,
    k: int = 6,
):
    """Return a LangChain BaseRetriever wrapping our search logic."""
    from langchain_core.retrievers import BaseRetriever
    from langchain_core.documents import Document
    from langchain_core.callbacks import CallbackManagerForRetrieverRun
    from pydantic import Field

    class TutorRetriever(BaseRetriever):
        """Custom retriever that combines ChromaDB + keyword fallback."""

        course_id_filter: Optional[int] = Field(default=None)
        folder_paths_filter: Optional[list[str]] = Field(default=None)
        material_ids_filter: Optional[list[int]] = Field(default=None)
        collection: str = Field(default=COLLECTION_MATERIALS)
        top_k: int = Field(default=6)

        def _get_relevant_documents(
            self, query: str, *, run_manager: CallbackManagerForRetrieverRun
        ) -> list[Document]:
            folder_filter = self.folder_paths_filter
            if self.material_ids_filter:
                folder_filter = None

            return search_with_embeddings(
                query,
                course_id=self.course_id_filter,
                folder_paths=folder_filter,
                material_ids=self.material_ids_filter,
                collection_name=self.collection,
                k=self.top_k,
            )

    return TutorRetriever(
        course_id_filter=course_id,
        folder_paths_filter=folder_paths,
        material_ids_filter=material_ids,
        collection=collection_name,
        top_k=k,
    )


def get_dual_context(
    query: str,
    course_id: Optional[int] = None,
    material_ids: Optional[list[int]] = None,
    k_materials: int = 6,
    k_instructions: int = 4,
    debug: Optional[dict[str, Any]] = None,
) -> dict:
    """
    Search materials collection and return structured context.

    Note: instructions collection removed — instructions now come from YAML.
    k_instructions parameter kept for backward compatibility but ignored.

    Returns: {
        materials: list[Document],
        instructions: [],
    }
    """
    material_debug: dict[str, Any] = {}
    materials = search_with_embeddings(
        query,
        course_id=course_id,
        material_ids=material_ids,
        collection_name=COLLECTION_MATERIALS,
        k=k_materials,
        debug=material_debug,
    )

    if debug is not None:
        debug.clear()
        debug["materials"] = material_debug

    return {
        "materials": materials,
        "instructions": [],
    }


def keyword_search(
    query: str,
    course_id: Optional[int] = None,
    folder_paths: Optional[list[str]] = None,
    material_ids: Optional[list[int]] = None,
    k: int = 6,
    corpus: Optional[str] = None,
):
    """
    Keyword-only RAG search (no embeddings).

    Use this when you want to avoid embedding API calls (e.g. Codex/ChatGPT-login tutor).
    Returns a list of LangChain `Document` objects (same shape as `search_with_embeddings`).
    """
    return _keyword_fallback(
        query, course_id, folder_paths, material_ids, k, corpus=corpus
    )


def keyword_search_dual(
    query: str,
    course_id: Optional[int] = None,
    material_ids: Optional[list[int]] = None,
    k_materials: int = 6,
    k_instructions: int = 4,
    debug: Optional[dict[str, Any]] = None,
) -> dict:
    """
    Keyword-only dual search (no embeddings). For Codex/ChatGPT provider.

    Note: instructions collection removed — instructions now come from YAML.
    """
    material_debug: dict[str, Any] = {}
    materials = _keyword_fallback(
        query,
        course_id,
        material_ids=material_ids,
        k=k_materials,
        debug=material_debug,
    )

    if debug is not None:
        debug.clear()
        debug["materials"] = material_debug

    return {
        "materials": materials,
        "instructions": [],
    }


# ---------------------------------------------------------------------------
# Video query detection & chunk boosting
# ---------------------------------------------------------------------------

_VIDEO_TIME_PATTERN = re.compile(
    r"\b\d{1,2}:\d{2}(?::\d{2})?\b"
    r"|"
    r"\bat\s+\d+\s*(?:min(?:ute)?s?|sec(?:ond)?s?)\b",
    re.IGNORECASE,
)

_VIDEO_KEYWORDS: frozenset[str] = frozenset(
    {
        "video",
        "lecture video",
        "recording",
        "lecture recording",
        "timestamp",
        "slide",
        "frame",
        "keyframe",
        "visual",
        "screen",
    }
)


def is_video_query(query: str) -> bool:
    """Detect whether a query is asking about video/lecture content."""
    if _VIDEO_TIME_PATTERN.search(query):
        return True
    query_lower = query.lower()
    return any(kw in query_lower for kw in _VIDEO_KEYWORDS)


def _is_video_chunk(doc: object) -> bool:
    """Check if a document chunk originates from video ingest."""
    metadata = getattr(doc, "metadata", None) or {}
    topic_tags = metadata.get("topic_tags", [])
    if isinstance(topic_tags, str):
        topic_tags = [t.strip() for t in topic_tags.split(",")]
    video_tags = {"transcript", "visual_notes", "video"}
    if video_tags & set(topic_tags):
        return True
    folder_path = str(metadata.get("folder_path") or "")
    return "video_ingest" in folder_path


def boost_video_chunks(docs: list, query: str) -> list:
    """Reorder docs so video-origin chunks appear first when query is video-related."""
    video: list = []
    other: list = []
    for doc in docs:
        if _is_video_chunk(doc):
            video.append(doc)
        else:
            other.append(doc)
    return video + other
