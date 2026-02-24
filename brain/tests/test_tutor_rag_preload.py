"""Tests for cross-encoder preloading."""

import tutor_rag


def test_preload_reranker_is_idempotent(monkeypatch):
    """Calling preload_reranker twice doesn't reload the model."""

    class FakeCrossEncoder:
        def __init__(self, name):
            self.name = name

    sentinel = FakeCrossEncoder("already-loaded")
    monkeypatch.setattr(tutor_rag, "_RERANKER", sentinel)

    tutor_rag.preload_reranker()

    assert tutor_rag._RERANKER is sentinel  # Same object, not reloaded


def test_preload_reranker_loads_when_none(monkeypatch):
    """preload_reranker() initializes the global _RERANKER when it is None."""
    monkeypatch.setattr(tutor_rag, "_RERANKER", None)

    loaded_model = None

    original_get_reranker = tutor_rag._get_reranker

    def fake_get_reranker():
        nonlocal loaded_model

        class FakeModel:
            name = "fake-loaded"

        loaded_model = FakeModel()
        tutor_rag._RERANKER = loaded_model
        return loaded_model

    monkeypatch.setattr(tutor_rag, "_get_reranker", fake_get_reranker)

    tutor_rag.preload_reranker()

    assert tutor_rag._RERANKER is not None
    assert tutor_rag._RERANKER is loaded_model
