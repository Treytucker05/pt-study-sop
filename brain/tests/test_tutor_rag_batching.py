"""Unit tests for Chroma batching safeguards in tutor_rag."""

import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

# Add brain/ to path for imports
brain_dir = Path(__file__).parent.parent
sys.path.insert(0, str(brain_dir))

from tutor_rag import (
    COLLECTION_INSTRUCTIONS,
    COLLECTION_MATERIALS,
    DEFAULT_CHROMA_BATCH_SIZE,
    DEFAULT_MMR_LAMBDA_MULT,
    _add_documents_batched,
    _cap_candidates_per_doc,
    _merge_candidate_pools,
    _resolve_candidate_pool_size,
    _resolve_chroma_max_batch_size,
    get_dual_context,
    keyword_search_dual,
    search_with_embeddings,
)


class _ClientWithMaxBatch:
    def __init__(self, max_batch_size: int):
        self._max_batch_size = max_batch_size

    def get_max_batch_size(self) -> int:
        return self._max_batch_size


class _FakeVectorStore:
    def __init__(
        self,
        runtime_max_batch_size: int | None = None,
        hard_limit: int | None = None,
        fail_on_call: int | None = None,
        fail_error: Exception | None = None,
    ):
        self.calls: list[int] = []
        self.deleted_ids: list[str] = []
        self.hard_limit = hard_limit
        self.fail_on_call = fail_on_call
        self.fail_error = fail_error
        self._collection = self
        if runtime_max_batch_size is not None:
            self._client = _ClientWithMaxBatch(runtime_max_batch_size)

    def add_documents(self, chunks, ids):  # noqa: ANN001 - test double
        call_number = len(self.calls) + 1
        if self.fail_on_call == call_number and self.fail_error is not None:
            raise self.fail_error
        if self.hard_limit is not None and len(chunks) > self.hard_limit:
            raise ValueError(
                f"Batch size of {len(chunks)} is greater than max batch size of {self.hard_limit}"
            )
        if len(chunks) != len(ids):
            raise AssertionError("test double received mismatched chunks/ids")
        self.calls.append(len(chunks))

    def delete(self, ids):  # noqa: ANN001 - test double
        self.deleted_ids.extend(ids)


class _FakeSearchCollection:
    def __init__(self, count: int = 1):
        self._count = count

    def count(self) -> int:
        return self._count


class _FakeSearchVectorStore:
    def __init__(self, similarity_docs: list, mmr_docs: list):
        self._collection = _FakeSearchCollection(count=1)
        self._similarity_docs = similarity_docs
        self._mmr_docs = mmr_docs
        self.similarity_calls: list[dict] = []
        self.mmr_calls: list[dict] = []

    def similarity_search(self, query, k, filter=None):  # noqa: ANN001
        self.similarity_calls.append({"query": query, "k": k, "filter": filter})
        return list(self._similarity_docs)

    def max_marginal_relevance_search(self, query, k, fetch_k, lambda_mult, filter=None):  # noqa: ANN001,E501
        self.mmr_calls.append(
            {
                "query": query,
                "k": k,
                "fetch_k": fetch_k,
                "lambda_mult": lambda_mult,
                "filter": filter,
            }
        )
        return list(self._mmr_docs)


def test_resolve_chroma_max_batch_size_prefers_client_value():
    vs = _FakeVectorStore(runtime_max_batch_size=5461)
    assert _resolve_chroma_max_batch_size(vs) == 5461


def test_resolve_chroma_max_batch_size_falls_back_without_client():
    vs = _FakeVectorStore()
    assert _resolve_chroma_max_batch_size(vs) == DEFAULT_CHROMA_BATCH_SIZE


def test_resolve_chroma_max_batch_size_falls_back_for_invalid_client_value():
    vs = _FakeVectorStore(runtime_max_batch_size=0)
    assert _resolve_chroma_max_batch_size(vs) == DEFAULT_CHROMA_BATCH_SIZE


def test_add_documents_batched_uses_runtime_max_batch_size():
    vs = _FakeVectorStore(runtime_max_batch_size=3, hard_limit=3)
    chunks = [f"chunk-{i}" for i in range(8)]
    ids = [f"id-{i}" for i in range(8)]

    _add_documents_batched(vs, chunks, ids)

    assert vs.calls == [3, 3, 2]


def test_add_documents_batched_halves_batch_when_limit_error_occurs():
    # Runtime reports 10, but true hard limit is 4 (simulates stale/misreported max)
    vs = _FakeVectorStore(runtime_max_batch_size=10, hard_limit=4)
    chunks = [f"chunk-{i}" for i in range(8)]
    ids = [f"id-{i}" for i in range(8)]

    _add_documents_batched(vs, chunks, ids)

    assert vs.calls == [4, 4]


def test_add_documents_batched_rejects_mismatched_lengths():
    vs = _FakeVectorStore(runtime_max_batch_size=2, hard_limit=2)
    with pytest.raises(ValueError, match="same length"):
        _add_documents_batched(vs, ["a", "b"], ["id-1"])


def test_add_documents_batched_rolls_back_partial_inserts_on_fatal_error():
    vs = _FakeVectorStore(
        runtime_max_batch_size=2,
        hard_limit=2,
        fail_on_call=2,
        fail_error=RuntimeError("non-batch failure"),
    )
    chunks = [f"chunk-{i}" for i in range(4)]
    ids = [f"id-{i}" for i in range(4)]

    with pytest.raises(RuntimeError, match="non-batch failure"):
        _add_documents_batched(vs, chunks, ids)

    assert vs.calls == [2]
    assert vs.deleted_ids == ["id-0", "id-1"]


def _fake_doc(doc_id: int, *, text: str = "learning objective", source: str | None = None):
    return SimpleNamespace(
        page_content=text,
        metadata={
            "rag_doc_id": doc_id,
            "source": source or f"doc-{doc_id}.md",
        },
    )


def test_merge_candidate_pools_preserves_priority_and_dedupes():
    sim_0 = _fake_doc(1, text="doc1 chunk0")
    sim_0.metadata["chunk_index"] = 0
    sim_1 = _fake_doc(1, text="doc1 chunk1")
    sim_1.metadata["chunk_index"] = 1
    mmr_dup = _fake_doc(1, text="doc1 chunk1 duplicate")
    mmr_dup.metadata["chunk_index"] = 1
    mmr_new = _fake_doc(2, text="doc2 chunk0")
    mmr_new.metadata["chunk_index"] = 0

    merged = _merge_candidate_pools([sim_0, sim_1], [mmr_dup, mmr_new], max_total=3)

    assert merged == [sim_0, sim_1, mmr_new]


def test_cap_candidates_per_doc_limits_per_doc_and_total():
    docs = [_fake_doc(1, text=f"doc1 chunk{i}") for i in range(3)]
    for index, doc in enumerate(docs):
        doc.metadata["chunk_index"] = index
    doc2 = _fake_doc(2, text="doc2 chunk0")
    doc2.metadata["chunk_index"] = 0
    doc3 = _fake_doc(3, text="doc3 chunk0")
    doc3.metadata["chunk_index"] = 0

    capped = _cap_candidates_per_doc(
        docs + [doc2, doc3],
        max_per_doc=2,
        max_total=3,
    )

    capped_ids = [doc.metadata["rag_doc_id"] for doc in capped]
    assert capped_ids == [1, 1, 2]
    assert capped_ids.count(1) == 2
    assert len(capped) == 3


def test_search_with_embeddings_merges_and_caps(monkeypatch):
    sim_docs = [_fake_doc(1, text=f"doc1 chunk{i}") for i in range(8)]
    for index, doc in enumerate(sim_docs):
        doc.metadata["chunk_index"] = index

    mmr_docs = [_fake_doc(1, text=f"doc1 mmr chunk{i}") for i in range(4, 8)]
    for index, doc in enumerate(mmr_docs, start=4):
        doc.metadata["chunk_index"] = index
    for index in range(3):
        doc = _fake_doc(2, text=f"doc2 chunk{index}")
        doc.metadata["chunk_index"] = index
        mmr_docs.append(doc)

    vs = _FakeSearchVectorStore(sim_docs, mmr_docs)
    monkeypatch.setattr("tutor_rag.init_vectorstore", lambda _collection: vs)

    material_ids = [101, 102, 103]
    k = 6
    debug: dict = {}
    result = search_with_embeddings(
        "alpha objective",
        course_id=7,
        material_ids=material_ids,
        collection_name=COLLECTION_MATERIALS,
        k=k,
        debug=debug,
    )

    candidate_k = _resolve_candidate_pool_size(k, material_ids)
    expected_filter = {"rag_doc_id": {"$in": material_ids}}

    assert len(vs.similarity_calls) == 1
    assert vs.similarity_calls[0]["k"] == candidate_k
    assert vs.similarity_calls[0]["filter"] == expected_filter

    assert len(vs.mmr_calls) == 1
    assert vs.mmr_calls[0]["k"] == candidate_k
    assert vs.mmr_calls[0]["fetch_k"] == min(max(candidate_k * 3, candidate_k + 40), 1600)
    assert vs.mmr_calls[0]["lambda_mult"] == DEFAULT_MMR_LAMBDA_MULT
    assert vs.mmr_calls[0]["filter"] == expected_filter

    # Pre-truncation cap should limit dominant source chunks in materials retrieval.
    assert debug["candidate_pool_after_cap"] == 9
    assert len(result) == k


def test_search_with_embeddings_skips_cap_for_instruction_collection(monkeypatch):
    sim_docs = [_fake_doc(1, text=f"doc1 chunk{i}") for i in range(8)]
    for index, doc in enumerate(sim_docs):
        doc.metadata["chunk_index"] = index
    vs = _FakeSearchVectorStore(sim_docs, [])
    monkeypatch.setattr("tutor_rag.init_vectorstore", lambda _collection: vs)

    def _fail_if_called(*args, **kwargs):  # noqa: ANN001
        raise AssertionError("_cap_candidates_per_doc should not be called for instructions")

    monkeypatch.setattr("tutor_rag._cap_candidates_per_doc", _fail_if_called)

    docs = search_with_embeddings(
        "teaching principles",
        collection_name=COLLECTION_INSTRUCTIONS,
        k=4,
    )

    assert len(docs) == 4  # truncated to k


def test_search_with_embeddings_high_k_is_not_truncated_by_pre_cap(monkeypatch):
    sim_docs = [_fake_doc(1, text=f"doc1 chunk{i}") for i in range(60)]
    for index, doc in enumerate(sim_docs):
        doc.metadata["chunk_index"] = index

    vs = _FakeSearchVectorStore(sim_docs, [])
    monkeypatch.setattr("tutor_rag.init_vectorstore", lambda _collection: vs)

    docs = search_with_embeddings(
        "alpha objective",
        material_ids=[1],
        collection_name=COLLECTION_MATERIALS,
        k=30,
    )

    assert len(docs) == 30


def test_search_with_embeddings_populates_debug_candidate_metrics(monkeypatch):
    sim_docs = [_fake_doc(1, text=f"doc1 chunk{i}") for i in range(20)]
    for index, doc in enumerate(sim_docs):
        doc.metadata["chunk_index"] = index

    vs = _FakeSearchVectorStore(sim_docs, [])
    monkeypatch.setattr("tutor_rag.init_vectorstore", lambda _collection: vs)

    debug: dict = {}
    docs = search_with_embeddings(
        "alpha objective",
        material_ids=[1],
        collection_name=COLLECTION_MATERIALS,
        k=6,
        debug=debug,
    )

    assert len(docs) == 6
    assert debug["used_keyword_fallback"] is False
    assert debug["candidate_pool_similarity"] == 20
    assert debug["candidate_pool_merged"] == 20
    assert debug["candidate_pool_after_cap"] == 6
    assert debug["candidate_pool_dropped_by_cap"] == 14
    assert debug["final_chunks"] == 6
    assert debug["final_unique_docs"] == 1
    assert debug["final_top_doc_share"] == 1.0


def test_get_dual_context_queries_materials_without_explicit_material_ids(monkeypatch):
    calls: list[dict] = []

    def fake_search(query, **kwargs):  # noqa: ANN001
        calls.append(kwargs)
        return []

    monkeypatch.setattr("tutor_rag.search_with_embeddings", fake_search)

    dual = get_dual_context(
        "find learning objectives",
        course_id=7,
        material_ids=None,
        k_materials=6,
        k_instructions=2,
    )

    assert dual == {"materials": [], "instructions": []}
    assert len(calls) == 2
    material_call, instruction_call = calls
    assert material_call["collection_name"] == COLLECTION_MATERIALS
    assert material_call["course_id"] == 7
    assert material_call["material_ids"] is None
    assert material_call["k"] == 6
    assert instruction_call["collection_name"] == COLLECTION_INSTRUCTIONS
    assert instruction_call["k"] == 2


def test_keyword_search_dual_queries_materials_without_explicit_material_ids(monkeypatch):
    calls: list[dict] = []

    def fake_keyword_fallback(  # noqa: ANN001,E501
        query,
        course_id=None,
        folder_paths=None,
        material_ids=None,
        k=6,
        corpus=None,
        debug=None,
    ):
        calls.append(
            {
                "course_id": course_id,
                "folder_paths": folder_paths,
                "material_ids": material_ids,
                "k": k,
                "corpus": corpus,
                "debug": debug,
            }
        )
        return []

    monkeypatch.setattr("tutor_rag._keyword_fallback", fake_keyword_fallback)

    dual = keyword_search_dual(
        "find learning objectives",
        course_id=5,
        material_ids=None,
        k_materials=6,
        k_instructions=2,
    )

    assert dual == {"materials": [], "instructions": []}
    assert len(calls) == 2
    material_call, instruction_call = calls
    assert material_call["course_id"] == 5
    assert material_call["material_ids"] is None
    assert material_call["k"] == 6
    assert material_call["corpus"] is None
    assert instruction_call["course_id"] is None
    assert instruction_call["k"] == 2
    assert instruction_call["corpus"] == "instructions"
