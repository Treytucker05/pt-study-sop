"""Tests for tutor_scaffolding module (M8)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tutor_scaffolding import SCAFFOLDING_LEVELS, get_scaffolding_directive


class TestScaffoldingLevels:
    def test_zero_mastery_full_support(self):
        directive = get_scaffolding_directive(0.0)
        assert "Full Support" in directive

    def test_low_mastery_full_support(self):
        directive = get_scaffolding_directive(0.15)
        assert "Full Support" in directive

    def test_boundary_03_guided(self):
        directive = get_scaffolding_directive(0.3)
        assert "Guided Practice" in directive

    def test_mid_mastery_guided(self):
        directive = get_scaffolding_directive(0.45)
        assert "Guided Practice" in directive

    def test_boundary_06_independent(self):
        directive = get_scaffolding_directive(0.6)
        assert "Independent Practice" in directive

    def test_high_mastery_independent(self):
        directive = get_scaffolding_directive(0.75)
        assert "Independent Practice" in directive

    def test_boundary_09_mastered(self):
        directive = get_scaffolding_directive(0.9)
        assert "Mastery Review" in directive

    def test_full_mastery(self):
        directive = get_scaffolding_directive(1.0)
        assert "Mastery Review" in directive

    def test_above_one_mastered(self):
        directive = get_scaffolding_directive(1.1)
        assert "Mastery Review" in directive

    def test_all_levels_have_directives(self):
        for name, info in SCAFFOLDING_LEVELS.items():
            assert info["directive"], f"{name} has empty directive"
            assert info["range"][0] < info["range"][1], f"{name} has invalid range"

    def test_directive_starts_with_scaffolding_header(self):
        for mastery in [0.0, 0.3, 0.6, 0.9]:
            directive = get_scaffolding_directive(mastery)
            assert directive.startswith("## Scaffolding:")
