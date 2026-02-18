"""
Tutor RAG Pipeline — LangChain + ChromaDB vector search for Adaptive Tutor.

Supports two named collections:
  - "tutor_materials"    — user-uploaded study materials
  - "tutor_instructions" — SOP library teaching rules/methods/frameworks

Falls back to keyword search when ChromaDB is empty.
"""

from __future__ import annotations

import pydantic_v1_patch  # noqa: F401  — must be first (fixes PEP 649 on Python 3.14)

import os
import sqlite3
from pathlib import Path
from typing import Optional

from config import DB_PATH, load_env

load_env()

_CHROMA_BASE = Path(__file__).parent / "data" / "chroma_tutor"
_vectorstores: dict[str, object] = {}

COLLECTION_MATERIALS = "tutor_materials"
COLLECTION_INSTRUCTIONS = "tutor_instructions"

DEFAULT_CHROMA_BATCH_SIZE = 1000


def _get_openai_api_key() -> str:
    """Resolve OpenAI API key from env (supports OpenRouter-compatible keys)."""
    return (
        os.environ.get("OPENAI_API_KEY")
        or os.environ.get("OPENROUTER_API_KEY")
        or ""
    )


def init_vectorstore(collection_name: str = COLLECTION_MATERIALS, persist_dir: Optional[str] = None):
    """Initialize or return cached ChromaDB vectorstore for a named collection."""
    if collection_name in _vectorstores:
        return _vectorstores[collection_name]

    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import Chroma

    persist = persist_dir or str(_CHROMA_BASE / collection_name.replace("tutor_", ""))
    os.makedirs(persist, exist_ok=True)

    api_key = _get_openai_api_key()
    base_url = os.environ.get("OPENAI_BASE_URL")

    embed_kwargs: dict = {
        "model": "text-embedding-3-small",
        "api_key": api_key,
    }
    if base_url:
        embed_kwargs["base_url"] = base_url

    embeddings = OpenAIEmbeddings(**embed_kwargs)

    vs = Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=persist,
    )
    _vectorstores[collection_name] = vs
    return vs


def chunk_document(
    content: str,
    source_path: str,
    *,
    chunk_size: int = 500,
    chunk_overlap: int = 100,
    course_id: Optional[int] = None,
    folder_path: Optional[str] = None,
    rag_doc_id: Optional[int] = None,
    corpus: Optional[str] = None,
):
    """Split document content into LangChain Documents with metadata."""
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_core.documents import Document

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " "],
    )

    chunks = splitter.split_text(content)

    docs = []
    for i, chunk_text in enumerate(chunks):
        metadata = {
            "source": source_path,
            "chunk_index": i,
        }
        if course_id is not None:
            metadata["course_id"] = course_id
        if folder_path:
            metadata["folder_path"] = folder_path
        if rag_doc_id is not None:
            metadata["rag_doc_id"] = rag_doc_id
        if corpus:
            metadata["corpus"] = corpus

        docs.append(Document(page_content=chunk_text, metadata=metadata))

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
    return (
        ("batch size" in msg and ("max" in msg or "maximum" in msg))
        or ("cannot submit more than" in msg and "embeddings at once" in msg)
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


def embed_rag_docs(
    course_id: Optional[int] = None,
    folder_path: Optional[str] = None,
    corpus: Optional[str] = None,
) -> dict:
    """
    Embed rag_docs from SQLite into ChromaDB. Tracks chunks in rag_embeddings table.
    Routes to correct collection based on corpus.
    Returns {embedded: int, skipped: int, total_chunks: int}.
    """
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

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

    embedded = 0
    skipped = 0
    total_chunks = 0

    for doc in docs:
        # Skip if already embedded (check rag_embeddings)
        cur.execute(
            "SELECT COUNT(*) FROM rag_embeddings WHERE rag_doc_id = ?",
            (doc["id"],),
        )
        if cur.fetchone()[0] > 0:
            skipped += 1
            continue

        content = doc["content"] or ""
        if not content.strip():
            skipped += 1
            continue

        doc_corpus = doc["corpus"] or "materials"
        collection = COLLECTION_INSTRUCTIONS if doc_corpus == "instructions" else COLLECTION_MATERIALS

        chunks = chunk_document(
            content,
            doc["source_path"] or "",
            course_id=doc["course_id"],
            folder_path=doc["folder_path"],
            rag_doc_id=doc["id"],
            corpus=doc_corpus,
        )

        if not chunks:
            skipped += 1
            continue

        # Add to correct ChromaDB collection
        vs = init_vectorstore(collection)
        ids = [f"rag-{doc['id']}-{i}" for i in range(len(chunks))]
        _add_documents_batched(vs, chunks, ids)

        # Record in rag_embeddings
        for i, chunk in enumerate(chunks):
            try:
                import tiktoken
                enc = tiktoken.encoding_for_model("text-embedding-3-small")
                token_count = len(enc.encode(chunk.page_content))
            except Exception:
                token_count = len(chunk.page_content) // 4

            cur.execute(
                """INSERT OR IGNORE INTO rag_embeddings
                   (rag_doc_id, chunk_index, chunk_text, chroma_id, token_count, created_at)
                   VALUES (?, ?, ?, ?, ?, datetime('now'))""",
                (doc["id"], i, chunk.page_content, ids[i], token_count),
            )

        embedded += 1
        total_chunks += len(chunks)

    conn.commit()
    conn.close()
    return {"embedded": embedded, "skipped": skipped, "total_chunks": total_chunks}


def rerank_results(query: str, docs: list, k_final: int) -> list:
    """Re-rank retrieved documents by keyword overlap with the query.

    Scores each doc by counting how many query keywords appear in its text,
    then returns the top ``k_final`` docs sorted by descending score.
    """
    if len(docs) <= k_final:
        return docs

    stop_words = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
                  "to", "for", "of", "and", "or", "it", "this", "that", "with"}
    keywords = [w.lower() for w in query.split() if w.lower() not in stop_words and len(w) > 2]

    if not keywords:
        return docs[:k_final]

    scored = []
    for doc in docs:
        text_lower = doc.page_content.lower()
        score = sum(1 for kw in keywords if kw in text_lower)
        scored.append((score, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored[:k_final]]


def search_with_embeddings(
    query: str,
    course_id: Optional[int] = None,
    folder_paths: Optional[list[str]] = None,
    material_ids: Optional[list[int]] = None,
    collection_name: str = COLLECTION_MATERIALS,
    k: int = 6,
):
    """
    Vector search via ChromaDB with keyword re-ranking.
    Fetches 2*k candidates, re-ranks by keyword overlap, returns top k.
    Falls back to keyword search if vectorstore is empty.
    """
    vs = init_vectorstore(collection_name)

    corpus_fallback = "instructions" if collection_name == COLLECTION_INSTRUCTIONS else None

    try:
        collection = vs._collection
        if collection.count() == 0:
            return _keyword_fallback(query, course_id, folder_paths, material_ids, k,
                                     corpus=corpus_fallback)
    except Exception:
        return _keyword_fallback(query, course_id, folder_paths, material_ids, k,
                                 corpus=corpus_fallback)

    # Build metadata filter
    where_filter = None
    conditions = []
    if course_id is not None:
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
        # Fetch 2x candidates for re-ranking
        results = vs.similarity_search(
            query,
            k=k * 2,
            filter=where_filter,
        )
        if results:
            return rerank_results(query, results, k)
    except Exception:
        pass

    return _keyword_fallback(query, course_id, folder_paths, material_ids, k,
                             corpus=corpus_fallback)


def _keyword_fallback(
    query: str,
    course_id: Optional[int] = None,
    folder_paths: Optional[list[str]] = None,
    material_ids: Optional[list[int]] = None,
    k: int = 6,
    corpus: Optional[str] = None,
):
    """Fallback to SQL keyword search when ChromaDB is empty/unavailable."""
    from langchain_core.documents import Document

    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    stop_words = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "and", "or", "it"}
    keywords = [w for w in query.lower().split() if w not in stop_words and len(w) > 2]

    conditions = ["COALESCE(enabled, 1) = 1"]
    params: list = []

    if corpus:
        conditions.append("corpus = ?")
        params.append(corpus)

    if course_id is not None:
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
        keyword_clauses.append(
            f"(CASE WHEN LOWER(content) LIKE ? THEN 1 ELSE 0 END)"
        )
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
) -> dict:
    """
    Query both collections and return structured context.

    Returns: {
        materials: list[Document],
        instructions: list[Document],
    }
    """
    materials = search_with_embeddings(
        query,
        course_id=course_id,
        material_ids=material_ids,
        collection_name=COLLECTION_MATERIALS,
        k=k_materials,
    ) if material_ids else []

    instructions = search_with_embeddings(
        query,
        collection_name=COLLECTION_INSTRUCTIONS,
        k=k_instructions,
    )

    return {
        "materials": materials,
        "instructions": instructions,
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
    return _keyword_fallback(query, course_id, folder_paths, material_ids, k, corpus=corpus)


def keyword_search_dual(
    query: str,
    course_id: Optional[int] = None,
    material_ids: Optional[list[int]] = None,
    k_materials: int = 6,
    k_instructions: int = 4,
) -> dict:
    """
    Keyword-only dual search (no embeddings). For Codex/ChatGPT provider.

    Returns: { materials: list[Document], instructions: list[Document] }
    """
    materials = _keyword_fallback(
        query, course_id, material_ids=material_ids, k=k_materials,
    ) if material_ids else []

    instructions = _keyword_fallback(
        query, k=k_instructions, corpus="instructions",
    )

    return {
        "materials": materials,
        "instructions": instructions,
    }
