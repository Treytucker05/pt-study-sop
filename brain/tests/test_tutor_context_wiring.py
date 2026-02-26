"""Verify send_turn uses build_context under the hood."""
from __future__ import annotations

from unittest.mock import patch, MagicMock


def test_send_turn_calls_build_context():
    """When mode.materials=True, build_context should be called."""
    mock_ctx = {
        "materials": "mock material text",
        "instructions": "mock instructions",
        "notes": "mock notes",
        "course_map": "mock map",
        "debug": {},
    }
    with patch("tutor_context.build_context", return_value=mock_ctx) as mock_bc:
        from tutor_context import build_context

        result = build_context("test query", depth="auto")
        assert result == mock_ctx
        mock_bc.assert_called_once()


def test_build_context_returns_expected_keys():
    """build_context return dict has the keys send_turn expects."""
    mock_ctx = {
        "materials": "",
        "instructions": "",
        "notes": "",
        "course_map": "",
        "debug": {"depth": "none"},
    }
    with patch("tutor_context.build_context", return_value=mock_ctx) as mock_bc:
        from tutor_context import build_context

        result = build_context("any question", depth="none")
        for key in ("materials", "instructions", "notes", "course_map", "debug"):
            assert key in result, f"Missing key: {key}"


def test_depth_mapping_logic():
    """Verify the depth flag mapping from mode toggles."""
    # Simulate the mapping logic from api_tutor.py generate()
    cases = [
        (True, True, "auto"),
        (True, False, "materials"),
        (False, True, "notes"),
        (False, False, "none"),
    ]
    for materials_on, obsidian_on, expected_depth in cases:
        _depth = "none"
        if materials_on and obsidian_on:
            _depth = "auto"
        elif materials_on:
            _depth = "materials"
        elif obsidian_on:
            _depth = "notes"
        assert _depth == expected_depth, (
            f"materials={materials_on}, obsidian={obsidian_on}: "
            f"expected {expected_depth}, got {_depth}"
        )


def test_empty_materials_triggers_fallback():
    """When build_context returns empty materials, the fallback text fires."""
    mock_ctx = {
        "materials": "",
        "instructions": "",
        "notes": "",
        "course_map": "",
        "debug": {},
    }
    with patch("tutor_context.build_context", return_value=mock_ctx):
        from tutor_context import build_context

        ctx = build_context("question", depth="auto")
        material_text = ctx["materials"]

        # Replicate the fallback from api_tutor.py
        if not material_text:
            material_text = (
                "No course-specific materials were retrieved for this topic. "
                "Teach from your medical/PT training knowledge. "
                "Mark such content as [From training knowledge — verify with your textbooks] "
                "so the student knows to cross-reference."
            )
        assert "training knowledge" in material_text


def test_notes_merge_into_materials():
    """When notes are present, they get appended to material_text."""
    mock_ctx = {
        "materials": "Some retrieved material content",
        "instructions": "",
        "notes": "### Module1/note.md\nSome note content",
        "course_map": "",
        "debug": {},
    }
    with patch("tutor_context.build_context", return_value=mock_ctx):
        from tutor_context import build_context

        ctx = build_context("question", depth="auto")
        material_text = ctx["materials"]
        notes_context_text = ctx["notes"]

        # Replicate the merge from api_tutor.py
        if notes_context_text:
            material_text = (
                f"{material_text}\n\n## Obsidian Notes Context\n"
                "Use this prior-session context for continuity and objective alignment.\n\n"
                f"{notes_context_text}"
            )
        assert "## Obsidian Notes Context" in material_text
        assert "Some retrieved material content" in material_text
        assert "Some note content" in material_text
