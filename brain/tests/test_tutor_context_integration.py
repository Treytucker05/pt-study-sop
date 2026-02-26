"""Integration test: build_context with real ChromaDB (materials only).

These tests require langchain_openai + a populated ChromaDB — skip on CI.
"""
import pytest

try:
    import langchain_openai  # noqa: F401

    HAS_LANGCHAIN_OPENAI = True
except ImportError:
    HAS_LANGCHAIN_OPENAI = False

skip_no_langchain = pytest.mark.skipif(
    not HAS_LANGCHAIN_OPENAI, reason="langchain_openai not installed (CI)"
)


@skip_no_langchain
def test_build_context_auto_returns_materials_from_chroma():
    """Materials collection has 14,583 vectors — this should return content."""
    from tutor_context import build_context

    result = build_context(
        "What muscles does the brachial plexus innervate?",
        depth="materials",
        k_materials=3,
    )
    # Verify no errors in debug
    assert "materials_error" not in result["debug"], (
        f"Material retrieval failed: {result['debug'].get('materials_error')}"
    )
    # Should have some material content from the 14k vectors
    assert result["materials"], "Expected material content from ChromaDB"
    assert result["notes"] == "", "Notes should be empty when depth=materials"


@skip_no_langchain
def test_build_context_none_skips_retrieval():
    """depth=none should return empty materials/notes without calling retrievers."""
    from tutor_context import build_context

    result = build_context("hello", depth="none")
    assert result["materials"] == "", "depth=none should not retrieve materials"
    assert result["notes"] == "", "depth=none should not retrieve notes"
    # course_map may be empty on CI without vault_courses.yaml
    assert isinstance(result["course_map"], str)
