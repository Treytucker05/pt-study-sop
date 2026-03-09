"""Mock ChromaDB collection for tutor RAG tests.

Provides an in-memory vector store that supports ``add``, ``query``,
and ``delete`` without requiring ChromaDB, OpenAI embeddings, or
any external services.  Queries match by simple substring overlap
to give plausible-looking results in tests.
"""

from __future__ import annotations

from typing import Any


class MockChromaCollection:
    """In-memory substitute for a ChromaDB ``Collection``.

    Usage::

        col = MockChromaCollection()
        col.add(
            ids=["doc-1-0"],
            documents=["Neurons transmit signals via action potentials."],
            metadatas=[{"source": "neuro.md", "chunk_index": 0}],
        )
        results = col.query(query_texts=["action potentials"], n_results=3)
        assert len(results["ids"][0]) >= 1
    """

    def __init__(self, name: str = "test_collection") -> None:
        self.name: str = name
        self._docs: dict[str, str] = {}
        self._metas: dict[str, dict[str, Any]] = {}
        self._embeddings: dict[str, list[float]] = {}
        self.operations: list[dict[str, Any]] = []

    # -- Core ChromaDB-compatible methods ------------------------------------

    def add(
        self,
        ids: list[str],
        documents: list[str] | None = None,
        metadatas: list[dict[str, Any]] | None = None,
        embeddings: list[list[float]] | None = None,
    ) -> None:
        """Add documents to the in-memory store."""
        self.operations.append({
            "op": "add",
            "ids": list(ids),
            "doc_count": len(documents) if documents else 0,
        })
        for i, doc_id in enumerate(ids):
            if documents:
                self._docs[doc_id] = documents[i] if i < len(documents) else ""
            if metadatas:
                self._metas[doc_id] = metadatas[i] if i < len(metadatas) else {}
            if embeddings:
                self._embeddings[doc_id] = embeddings[i] if i < len(embeddings) else []

    def query(
        self,
        query_texts: list[str] | None = None,
        query_embeddings: list[list[float]] | None = None,
        n_results: int = 10,
        where: dict[str, Any] | None = None,
        where_document: dict[str, Any] | None = None,
        include: list[str] | None = None,
    ) -> dict[str, list]:
        """Query by substring overlap, returning ChromaDB-shaped results.

        Scoring: for each stored document, count how many query words
        appear in the document text (case-insensitive).  Return the
        top *n_results* ordered by score descending.
        """
        self.operations.append({
            "op": "query",
            "query_texts": query_texts,
            "n_results": n_results,
            "where": where,
        })

        query_str = " ".join(query_texts or []).lower()
        query_words = query_str.split()

        scored: list[tuple[str, int]] = []
        for doc_id, text in self._docs.items():
            # Apply metadata filter if provided
            if where and not self._matches_where(doc_id, where):
                continue
            text_lower = text.lower()
            score = sum(1 for w in query_words if w in text_lower)
            # Boost exact substring match
            if query_str and query_str in text_lower:
                score += len(query_words)
            scored.append((doc_id, score))

        # Sort by score descending, then by id for deterministic ordering
        scored.sort(key=lambda x: (-x[1], x[0]))
        top = scored[:n_results]

        result_ids: list[str] = []
        result_docs: list[str] = []
        result_metas: list[dict[str, Any]] = []
        result_distances: list[float] = []

        for doc_id, score in top:
            result_ids.append(doc_id)
            result_docs.append(self._docs.get(doc_id, ""))
            result_metas.append(self._metas.get(doc_id, {}))
            # Lower distance = better match (invert score)
            result_distances.append(max(0.0, 1.0 - score * 0.1))

        return {
            "ids": [result_ids],
            "documents": [result_docs],
            "metadatas": [result_metas],
            "distances": [result_distances],
        }

    def delete(
        self,
        ids: list[str] | None = None,
        where: dict[str, Any] | None = None,
    ) -> None:
        """Remove documents by ID or metadata filter."""
        self.operations.append({"op": "delete", "ids": ids, "where": where})

        targets: list[str] = []
        if ids:
            targets = list(ids)
        elif where:
            targets = [
                doc_id for doc_id in list(self._docs)
                if self._matches_where(doc_id, where)
            ]

        for doc_id in targets:
            self._docs.pop(doc_id, None)
            self._metas.pop(doc_id, None)
            self._embeddings.pop(doc_id, None)

    def get(
        self,
        ids: list[str] | None = None,
        where: dict[str, Any] | None = None,
        include: list[str] | None = None,
    ) -> dict[str, list]:
        """Retrieve documents by ID (ChromaDB ``get`` interface)."""
        self.operations.append({"op": "get", "ids": ids, "where": where})
        result_ids: list[str] = []
        result_docs: list[str] = []
        result_metas: list[dict[str, Any]] = []

        target_ids = ids or sorted(self._docs.keys())
        for doc_id in target_ids:
            if doc_id in self._docs:
                if where and not self._matches_where(doc_id, where):
                    continue
                result_ids.append(doc_id)
                result_docs.append(self._docs[doc_id])
                result_metas.append(self._metas.get(doc_id, {}))

        return {
            "ids": result_ids,
            "documents": result_docs,
            "metadatas": result_metas,
        }

    def count(self) -> int:
        """Return the number of stored documents."""
        return len(self._docs)

    def peek(self, limit: int = 10) -> dict[str, list]:
        """Return a sample of stored documents."""
        sample_ids = sorted(self._docs.keys())[:limit]
        return self.get(ids=sample_ids)

    # -- Internal helpers ----------------------------------------------------

    def _matches_where(self, doc_id: str, where: dict[str, Any]) -> bool:
        """Check if a document's metadata matches a ``where`` filter."""
        meta = self._metas.get(doc_id, {})
        for key, value in where.items():
            if key.startswith("$"):
                # Skip ChromaDB logical operators for simplicity
                continue
            if isinstance(value, dict):
                # Handle operators like {"$eq": "x"}, {"$in": [...]}
                for op, operand in value.items():
                    if op == "$eq" and meta.get(key) != operand:
                        return False
                    if op == "$ne" and meta.get(key) == operand:
                        return False
                    if op == "$in" and meta.get(key) not in operand:
                        return False
            elif meta.get(key) != value:
                return False
        return True

    # -- Convenience ----------------------------------------------------------

    def reset(self) -> None:
        """Clear all stored data and operation history."""
        self._docs.clear()
        self._metas.clear()
        self._embeddings.clear()
        self.operations.clear()
