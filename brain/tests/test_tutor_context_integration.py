"""Integration test: build_context with real ChromaDB (materials only)."""

import os
import pytest

pytestmark = [
    pytest.mark.integration,
    pytest.mark.timeout(180),
]


@pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"),
    reason="OPENAI_API_KEY not set — ChromaDB embeddings require it",
)
def test_build_context_auto_returns_materials_from_chroma():
    """Materials collection has 14,583 vectors — this should return content."""
    from tutor_context import build_context

    result = build_context(
        "What muscles does the brachial plexus innervate?",
        depth="materials",
        k_materials=3,
    )
    materials_error = str(result["debug"].get("materials_error") or "")
    if "no such table: rag_docs" in materials_error:
        pytest.skip("rag_docs table is not present in this test environment")
    # Verify no errors in debug
    assert "materials_error" not in result["debug"], (
        f"Material retrieval failed: {materials_error}"
    )
    # Should have some material content from the 14k vectors
    assert result["materials"], "Expected material content from ChromaDB"
    assert isinstance(result["course_map"], str)
    assert result["notes"] == "", "Notes should be empty when depth=materials"


def test_build_context_none_skips_retrieval():
    """depth=none should return empty materials/notes without calling retrievers."""
    from tutor_context import build_context

    result = build_context("hello", depth="none")
    assert result["materials"] == "", "depth=none should not retrieve materials"
    assert result["notes"] == "", "depth=none should not retrieve notes"
    assert isinstance(result["course_map"], str)
