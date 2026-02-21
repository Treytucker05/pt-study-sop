"""Tests for tutor_behavior_directives module."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tutor_behavior_directives import DIRECTIVES, get_directive


class TestGetDirective:
    def test_socratic_returns_content(self):
        result = get_directive("socratic")
        assert result != ""
        assert "Socratic" in result
        assert "questions" in result.lower()

    def test_evaluate_returns_content(self):
        result = get_directive("evaluate")
        assert result != ""
        assert "Evaluate" in result
        assert "verdict" in result.lower()

    def test_concept_map_returns_content(self):
        result = get_directive("concept_map")
        assert result != ""
        assert "Concept Map" in result
        assert "Mermaid" in result

    def test_each_directive_has_five_lines(self):
        for mode, text in DIRECTIVES.items():
            lines = [l for l in text.split("\n") if l.strip()]
            assert len(lines) == 6, f"{mode} has {len(lines)} non-empty lines, expected 6 (header + 5)"

    def test_null_returns_empty(self):
        assert get_directive(None) == ""

    def test_empty_string_returns_empty(self):
        assert get_directive("") == ""

    def test_unknown_override_returns_empty(self):
        assert get_directive("unknown_mode") == ""

    def test_directive_does_not_modify_question(self):
        """Verify behavior override is prompt-only — does not alter RAG query."""
        original_question = "What is cardiac output?"
        directive = get_directive("socratic")
        assert original_question not in directive
        assert directive.startswith("## Behavior Override")
