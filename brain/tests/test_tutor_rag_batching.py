"""Unit tests for Chroma batching safeguards in tutor_rag."""

import sys
from pathlib import Path

import pytest

# Add brain/ to path for imports
brain_dir = Path(__file__).parent.parent
sys.path.insert(0, str(brain_dir))

from tutor_rag import (
    DEFAULT_CHROMA_BATCH_SIZE,
    _add_documents_batched,
    _resolve_chroma_max_batch_size,
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
