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
import re
import sqlite3
from pathlib import Path
from typing import Any, Optional

from config import DB_PATH, load_env

load_env()

_CHROMA_BASE = Path(__file__).parent / "data" / "chroma_tutor"
_vectorstores: dict[str, object] = {}

COLLECTION_MATERIALS = "tutor_materials"
COLLECTION_INSTRUCTIONS = "tutor_instructions"
COLLECTION_NOTES = "tutor_notes"

DEFAULT_CHROMA_BATCH_SIZE = 1000
DEFAULT_MAX_CHUNKS_PER_DOC = 2
DEFAULT_MMR_LAMBDA_MULT = 0.2
SCOPED_CANDIDATE_MULTIPLIER = 12
SCOPED_CANDIDATE_MIN = 120
SCOPED_CANDIDATE_MAX = 800
SCOPED_MMR_FETCH_MAX = 1600

_IMAGE_MD_PATTERN = re.compile(r'!\[[^\]]*\]\([^)]+\)')
_IMAGE_PLACEHOLDER = re.compile(r'<!--\s*image\s*-->', re.IGNORECASE)


def strip_image_refs_for_rag(content: str) -> str:
    """Remove markdown image references before RAG chunking."""
    content = _IMAGE_MD_PATTERN.sub('', content)
    content = _IMAGE_PLACEHOLDER.sub('', content)
    return content


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
    content = strip_image_refs_for_rag(content)
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
    """Limit candidates per document before reranking to avoid source domination."""
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
            source = str((getattr(doc, "metadata", None) or {}).get("source") or "").strip()
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
    Decide how many vector candidates to fetch before reranking.

    Material-scoped retrieval needs a wider candidate pool so the final top-k can
    include chunks from more than a handful of dominant files.
    """
    if not material_ids:
        return max(k * 2, 12)
    scoped_k = max(int(k), 1)
    candidate_k = max(scoped_k * SCOPED_CANDIDATE_MULTIPLIER, SCOPED_CANDIDATE_MIN)
    return min(candidate_k, SCOPED_CANDIDATE_MAX)


def rerank_results(
    query: str,
    docs: list,
    k_final: int,
    *,
    max_chunks_per_doc: int = DEFAULT_MAX_CHUNKS_PER_DOC,
) -> list:
    """Re-rank results with keyword scoring plus per-file diversity caps."""
    if not docs or k_final <= 0:
        return []
    if len(docs) <= k_final and max_chunks_per_doc <= 0:
        return docs

    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
        "to", "for", "of", "and", "or", "it", "this", "that", "with",
    }
    keywords = [
        w.lower()
        for w in query.split()
        if w.lower() not in stop_words and len(w) > 2
    ]

    scored: list[tuple[int, int, object]] = []
    for idx, doc in enumerate(docs):
        if keywords:
            text_lower = str(getattr(doc, "page_content", "")).lower()
            score = sum(1 for kw in keywords if kw in text_lower)
        else:
            score = 0
        scored.append((score, idx, doc))

    # Higher keyword score first; preserve original similarity order on ties.
    scored.sort(key=lambda item: (-item[0], item[1]))

    selected: list[object] = []
    selected_indexes: set[int] = set()
    per_doc_counts: dict[str, int] = {}

    # Pass 1: guarantee breadth (at most one chunk per source file).
    for score, idx, doc in scored:
        identity = _doc_identity(doc, idx)
        if per_doc_counts.get(identity, 0) > 0:
            continue
        selected.append(doc)
        selected_indexes.add(idx)
        per_doc_counts[identity] = 1
        if len(selected) >= k_final:
            return selected[:k_final]

    # Pass 2: fill while respecting max chunks per file.
    cap = max_chunks_per_doc if max_chunks_per_doc > 0 else k_final
    for score, idx, doc in scored:
        if idx in selected_indexes:
            continue
        identity = _doc_identity(doc, idx)
        if per_doc_counts.get(identity, 0) >= cap:
            continue
        selected.append(doc)
        selected_indexes.add(idx)
        per_doc_counts[identity] = per_doc_counts.get(identity, 0) + 1
        if len(selected) >= k_final:
            return selected[:k_final]

    # Pass 3: if still short, fill from remaining regardless of cap.
    for score, idx, doc in scored:
        if idx in selected_indexes:
            continue
        selected.append(doc)
        selected_indexes.add(idx)
        if len(selected) >= k_final:
            return selected[:k_final]

    return selected[:k_final]


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
    Vector search via ChromaDB with keyword/diversity re-ranking.
    Fetches a widened candidate pool, then returns top k chunks.
    Falls back to keyword search if vectorstore is empty.
    """
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

    corpus_fallback = "instructions" if collection_name == COLLECTION_INSTRUCTIONS else None

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
    # When explicit material IDs are provided, they define the scope and should
    # not be additionally constrained by course_id.
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
                mmr_fetch_k = min(max(mmr_k * 3, mmr_k + 40), SCOPED_MMR_FETCH_MAX)
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
            # Keep enough per-doc candidates to satisfy high-k requests while
            # still preventing any single source from flooding the rerank pool.
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
                    0, len(merged_candidates_uncapped) - len(merged_candidates)
                )
        elif debug is not None:
            debug["candidate_pool_after_cap"] = len(merged_candidates)

        if merged_candidates:
            final_docs = rerank_results(query, merged_candidates, k)
            if debug is not None:
                dist = _doc_distribution_stats(final_docs)
                debug["final_chunks"] = len(final_docs)
                debug["final_unique_docs"] = dist["unique_docs"]
                debug["final_top_doc_share"] = round(float(dist["top_doc_share"]), 4)
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

    stop_words = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "and", "or", "it"}
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
    Query both collections and return structured context.

    Returns: {
        materials: list[Document],
        instructions: list[Document],
    }
    """
    material_debug: dict[str, Any] = {}
    instruction_debug: dict[str, Any] = {}

    materials = search_with_embeddings(
        query,
        course_id=course_id,
        material_ids=material_ids,
        collection_name=COLLECTION_MATERIALS,
        k=k_materials,
        debug=material_debug,
    )

    instructions = search_with_embeddings(
        query,
        collection_name=COLLECTION_INSTRUCTIONS,
        k=k_instructions,
        debug=instruction_debug,
    )

    if debug is not None:
        debug.clear()
        debug["materials"] = material_debug
        debug["instructions"] = instruction_debug

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
    debug: Optional[dict[str, Any]] = None,
) -> dict:
    """
    Keyword-only dual search (no embeddings). For Codex/ChatGPT provider.

    Returns: { materials: list[Document], instructions: list[Document] }
    """
    material_debug: dict[str, Any] = {}
    instruction_debug: dict[str, Any] = {}

    materials = _keyword_fallback(
        query, course_id, material_ids=material_ids, k=k_materials,
        debug=material_debug,
    )

    instructions = _keyword_fallback(
        query, k=k_instructions, corpus="instructions",
        debug=instruction_debug,
    )

    if debug is not None:
        debug.clear()
        debug["materials"] = material_debug
        debug["instructions"] = instruction_debug

    return {
        "materials": materials,
        "instructions": instructions,
    }


# ---------------------------------------------------------------------------
# Vault notes embedding (for GraphRAG-lite)
# ---------------------------------------------------------------------------

def embed_vault_notes(conn: sqlite3.Connection) -> dict[str, int]:
    """Read vault_docs, chunk, and embed into the tutor_notes collection.

    Returns summary with embedded/skipped counts.
    """
    cur = conn.execute("SELECT id, path, content FROM vault_docs WHERE content IS NOT NULL")
    rows = cur.fetchall()

    if not rows:
        return {"embedded": 0, "skipped": 0}

    vs = init_vectorstore(COLLECTION_NOTES)
    existing_ids = set(vs._collection.get()["ids"]) if vs._collection.count() > 0 else set()

    texts: list[str] = []
    metadatas: list[dict] = []
    ids: list[str] = []
    skipped = 0

    for row in rows:
        doc_id = row[0]
        path = row[1]
        content = row[2]
        if not content or not content.strip():
            skipped += 1
            continue

        chunks = chunk_document(content)
        for i, chunk in enumerate(chunks):
            chroma_id = f"vault-{doc_id}-{i}"
            if chroma_id in existing_ids:
                skipped += 1
                continue
            texts.append(chunk)
            metadatas.append({"source_path": path, "doc_id": doc_id, "chunk_index": i})
            ids.append(chroma_id)

    if texts:
        _add_documents_batched(vs, texts, metadatas, ids)

    return {"embedded": len(texts), "skipped": skipped}


def search_notes(query: str, k: int = 4) -> list[dict]:
    """Vector search in the vault notes collection."""
    try:
        vs = init_vectorstore(COLLECTION_NOTES)
        if vs._collection.count() == 0:
            return []
        results = vs.similarity_search(query, k=k)
        return [
            {"content": doc.page_content, "metadata": doc.metadata}
            for doc in results
        ]
    except Exception:
        return []
