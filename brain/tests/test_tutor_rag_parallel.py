"""Tests that get_dual_context runs both collection searches in parallel."""
import time
from unittest.mock import patch, MagicMock
from tutor_rag import get_dual_context


def _slow_search(*args, **kwargs):
    """Mock search that takes 0.3s."""
    time.sleep(0.3)
    return []


def test_dual_context_runs_searches_in_parallel():
    """Both collection searches should run concurrently, not sequentially."""
    with patch("tutor_rag.search_with_embeddings", side_effect=_slow_search):
        start = time.monotonic()
        result = get_dual_context("what is the rotator cuff?")
        elapsed = time.monotonic() - start

    # Sequential would take ~0.6s. Parallel should finish in ~0.35s.
    assert elapsed < 0.5, f"Expected parallel execution (~0.3s), got {elapsed:.2f}s"
    assert "materials" in result
    assert "instructions" in result


def test_dual_context_returns_correct_structure():
    """Return shape is unchanged after parallelization."""
    mock_docs = [MagicMock()]
    with patch("tutor_rag.search_with_embeddings", return_value=mock_docs):
        result = get_dual_context("test query")

    assert result["materials"] == mock_docs
    assert result["instructions"] == mock_docs
