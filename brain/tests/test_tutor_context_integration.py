"""Integration test: build_context with real ChromaDB (materials only)."""


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
    assert result["course_map"] != "", "Course map should always be present"
    assert result["notes"] == "", "Notes should be empty when depth=materials"


def test_build_context_none_skips_retrieval():
    """depth=none should return empty materials/notes without calling retrievers."""
    from tutor_context import build_context

    result = build_context("hello", depth="none")
    assert result["materials"] == "", "depth=none should not retrieve materials"
    assert result["notes"] == "", "depth=none should not retrieve notes"
    assert result["course_map"], "Course map should always be present"
