"""
Tutor RAG Pipeline — LangChain + ChromaDB vector search for Adaptive Tutor.

Handles: document chunking, OpenAI embeddings, ChromaDB storage, retrieval.
Falls back to keyword search from tutor_engine when ChromaDB is empty.
"""

from __future__ import annotations

import pydantic_v1_patch  # noqa: F401  — must be first (fixes PEP 649 on Python 3.14)

import os
import json
import sqlite3
from pathlib import Path
from typing import Optional

from config import DB_PATH, load_env

load_env()

# LangChain imports (lazy to avoid import cost when unused)
_vectorstore = None
_CHROMA_DIR = Path(__file__).parent / "data" / "chroma_tutor"


def _get_openai_api_key() -> str:
    """Resolve OpenAI API key from env (supports OpenRouter-compatible keys)."""
    return (
        os.environ.get("OPENAI_API_KEY")
        or os.environ.get("OPENROUTER_API_KEY")
        or ""
    )


def init_vectorstore(persist_dir: Optional[str] = None):
    """Initialize or return cached ChromaDB vectorstore with OpenAI embeddings."""
    global _vectorstore
    if _vectorstore is not None:
        return _vectorstore

    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import Chroma

    persist = persist_dir or str(_CHROMA_DIR)
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

    _vectorstore = Chroma(
        collection_name="tutor_rag",
        embedding_function=embeddings,
        persist_directory=persist,
    )
    return _vectorstore


def chunk_document(
    content: str,
    source_path: str,
    *,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    course_id: Optional[int] = None,
    folder_path: Optional[str] = None,
    rag_doc_id: Optional[int] = None,
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

        docs.append(Document(page_content=chunk_text, metadata=metadata))

    return docs


def embed_rag_docs(
    course_id: Optional[int] = None,
    folder_path: Optional[str] = None,
) -> dict:
    """
    Embed rag_docs from SQLite into ChromaDB. Tracks chunks in rag_embeddings table.
    Returns {embedded: int, skipped: int, total_chunks: int}.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    conditions = ["COALESCE(enabled, 1) = 1"]
    params: list = []

    if course_id is not None:
        conditions.append("(course_id = ? OR course_id IS NULL)")
        params.append(course_id)
    if folder_path:
        conditions.append("folder_path LIKE ?")
        params.append(f"%{folder_path}%")

    where = " AND ".join(conditions)
    cur.execute(
        f"SELECT id, source_path, content, course_id, folder_path FROM rag_docs WHERE {where}",
        params,
    )
    docs = cur.fetchall()

    vs = init_vectorstore()
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

        chunks = chunk_document(
            content,
            doc["source_path"] or "",
            course_id=doc["course_id"],
            folder_path=doc["folder_path"],
            rag_doc_id=doc["id"],
        )

        if not chunks:
            skipped += 1
            continue

        # Add to ChromaDB
        ids = [f"rag-{doc['id']}-{i}" for i in range(len(chunks))]
        vs.add_documents(chunks, ids=ids)

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


def search_with_embeddings(
    query: str,
    course_id: Optional[int] = None,
    folder_paths: Optional[list[str]] = None,
    k: int = 6,
):
    """
    Vector search via ChromaDB. Returns list of LangChain Documents.
    Falls back to keyword search if vectorstore is empty.
    """
    vs = init_vectorstore()

    # Check if vectorstore has documents
    try:
        collection = vs._collection
        if collection.count() == 0:
            return _keyword_fallback(query, course_id, folder_paths, k)
    except Exception:
        return _keyword_fallback(query, course_id, folder_paths, k)

    # Build metadata filter
    where_filter = None
    conditions = []
    if course_id is not None:
        conditions.append({"course_id": course_id})
    if folder_paths:
        conditions.append({"folder_path": {"$in": folder_paths}})

    if len(conditions) == 1:
        where_filter = conditions[0]
    elif len(conditions) > 1:
        where_filter = {"$and": conditions}

    try:
        results = vs.similarity_search(
            query,
            k=k,
            filter=where_filter,
        )
        if results:
            return results
    except Exception:
        pass

    return _keyword_fallback(query, course_id, folder_paths, k)


def _keyword_fallback(
    query: str,
    course_id: Optional[int] = None,
    folder_paths: Optional[list[str]] = None,
    k: int = 6,
):
    """Fallback to SQL keyword search when ChromaDB is empty/unavailable."""
    from langchain_core.documents import Document

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Extract keywords (simple)
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "and", "or", "it"}
    keywords = [w for w in query.lower().split() if w not in stop_words and len(w) > 2]

    conditions = ["COALESCE(enabled, 1) = 1"]
    params: list = []

    if course_id is not None:
        conditions.append("(course_id = ? OR course_id IS NULL)")
        params.append(course_id)

    if folder_paths:
        fp_conditions = ["folder_path LIKE ?" for _ in folder_paths]
        conditions.append(f"({' OR '.join(fp_conditions)})")
        params.extend(f"%{fp}%" for fp in folder_paths)

    # Keyword matching — score by number of keyword hits
    keyword_clauses = []
    for kw in keywords[:5]:
        keyword_clauses.append(
            f"(CASE WHEN LOWER(content) LIKE ? THEN 1 ELSE 0 END)"
        )
        params.append(f"%{kw}%")

    score_expr = " + ".join(keyword_clauses) if keyword_clauses else "0"
    where = " AND ".join(conditions)

    cur.execute(
        f"""SELECT id, source_path, content, course_id, folder_path,
                   ({score_expr}) as relevance
            FROM rag_docs
            WHERE {where} AND ({score_expr}) > 0
            ORDER BY relevance DESC
            LIMIT ?""",
        params + [k],
    )

    results = []
    for row in cur.fetchall():
        content = row["content"] or ""
        # Truncate to ~1000 chars for context
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
        top_k: int = Field(default=6)

        def _get_relevant_documents(
            self, query: str, *, run_manager: CallbackManagerForRetrieverRun
        ) -> list[Document]:
            return search_with_embeddings(
                query,
                course_id=self.course_id_filter,
                folder_paths=self.folder_paths_filter,
                k=self.top_k,
            )

    return TutorRetriever(
        course_id_filter=course_id,
        folder_paths_filter=folder_paths,
        top_k=k,
    )
