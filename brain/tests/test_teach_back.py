"""Tests for teach-back gate module (Phase 6)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tutor_teach_back import (
    TEACH_BACK_PROMPT_SUFFIX,
    check_teach_back_gate,
    parse_teach_back_rubric,
    rubric_blocks_mastery,
    strip_teach_back_marker,
    validate_teach_back_rubric,
)
from tutor_behavior_directives import get_directive


class TestParseTeachBackRubric:
    def test_parse_valid_rubric(self):
        response = (
            "That's a good start! But can you explain why preload affects stroke volume?\n\n"
            '<!-- TEACH_BACK_RUBRIC: {"overall_rating":"partial","accuracy_score":2,'
            '"breadth_score":1,"synthesis_score":1,"misconceptions":["confused preload with afterload"],'
            '"gaps":[{"skill_id":"Afterload","edge_id":"opposes"}],'
            '"strengths":["correct CO formula"],"next_focus":"Afterload",'
            '"confidence":0.8} -->'
        )
        result = parse_teach_back_rubric(response)
        assert result is not None
        assert result["overall_rating"] == "partial"
        assert result["accuracy_score"] == 2
        assert result["breadth_score"] == 1
        assert result["synthesis_score"] == 1
        assert len(result["misconceptions"]) == 1
        assert result["gaps"][0]["skill_id"] == "Afterload"

    def test_no_rubric_returns_none(self):
        assert parse_teach_back_rubric("Just a normal response") is None

    def test_malformed_json_returns_none(self):
        response = "<!-- TEACH_BACK_RUBRIC: {broken json} -->"
        assert parse_teach_back_rubric(response) is None

    def test_non_dict_returns_none(self):
        response = '<!-- TEACH_BACK_RUBRIC: [1, 2, 3] -->'
        assert parse_teach_back_rubric(response) is None


class TestValidateTeachBackRubric:
    def test_valid_rubric_passes(self):
        rubric = {
            "overall_rating": "pass",
            "accuracy_score": 3,
            "breadth_score": 2,
            "synthesis_score": 2,
            "confidence": 0.9,
        }
        is_valid, issues = validate_teach_back_rubric(rubric)
        assert is_valid
        assert len(issues) == 0

    def test_missing_required_fields(self):
        rubric = {"overall_rating": "pass"}
        is_valid, issues = validate_teach_back_rubric(rubric)
        assert not is_valid
        assert any("accuracy_score" in i for i in issues)

    def test_invalid_rating(self):
        rubric = {
            "overall_rating": "excellent",
            "accuracy_score": 3,
            "breadth_score": 2,
            "synthesis_score": 2,
            "confidence": 0.9,
        }
        is_valid, issues = validate_teach_back_rubric(rubric)
        assert not is_valid
        assert any("overall_rating" in i for i in issues)

    def test_score_out_of_range(self):
        rubric = {
            "overall_rating": "pass",
            "accuracy_score": 5,
            "breadth_score": 2,
            "synthesis_score": 2,
            "confidence": 0.9,
        }
        is_valid, issues = validate_teach_back_rubric(rubric)
        assert not is_valid
        assert any("accuracy_score" in i for i in issues)

    def test_confidence_out_of_range(self):
        rubric = {
            "overall_rating": "pass",
            "accuracy_score": 3,
            "breadth_score": 2,
            "synthesis_score": 2,
            "confidence": 1.5,
        }
        is_valid, issues = validate_teach_back_rubric(rubric)
        assert not is_valid
        assert any("confidence" in i for i in issues)

    def test_gap_without_skill_id(self):
        rubric = {
            "overall_rating": "fail",
            "accuracy_score": 1,
            "breadth_score": 1,
            "synthesis_score": 0,
            "confidence": 0.7,
            "gaps": [{"edge_id": "requires"}],
        }
        is_valid, issues = validate_teach_back_rubric(rubric)
        assert not is_valid
        assert any("skill_id" in i for i in issues)


class TestStripTeachBackMarker:
    def test_strips_marker(self):
        text = 'Good explanation!\n\n<!-- TEACH_BACK_RUBRIC: {"overall_rating":"pass"} -->'
        cleaned = strip_teach_back_marker(text)
        assert "TEACH_BACK_RUBRIC" not in cleaned
        assert "Good explanation!" in cleaned

    def test_no_marker_unchanged(self):
        text = "No rubric here"
        assert strip_teach_back_marker(text) == text


class TestTeachBackGate:
    def test_below_threshold_blocked(self):
        assert not check_teach_back_gate(0.3)
        assert not check_teach_back_gate(0.59)

    def test_at_threshold_allowed(self):
        assert check_teach_back_gate(0.6)

    def test_above_threshold_allowed(self):
        assert check_teach_back_gate(0.8)
        assert check_teach_back_gate(1.0)


class TestRubricBlocksMastery:
    def test_pass_does_not_block(self):
        rubric = {
            "overall_rating": "pass",
            "accuracy_score": 3,
            "breadth_score": 2,
            "synthesis_score": 2,
        }
        assert not rubric_blocks_mastery(rubric)

    def test_fail_rating_blocks(self):
        rubric = {
            "overall_rating": "fail",
            "accuracy_score": 3,
            "breadth_score": 3,
            "synthesis_score": 3,
        }
        assert rubric_blocks_mastery(rubric)

    def test_partial_rating_blocks(self):
        rubric = {
            "overall_rating": "partial",
            "accuracy_score": 2,
            "breadth_score": 2,
            "synthesis_score": 2,
        }
        assert rubric_blocks_mastery(rubric)

    def test_low_score_blocks_even_with_pass(self):
        rubric = {
            "overall_rating": "pass",
            "accuracy_score": 1,
            "breadth_score": 3,
            "synthesis_score": 3,
        }
        assert rubric_blocks_mastery(rubric)

    def test_all_scores_at_2_with_pass_allows(self):
        rubric = {
            "overall_rating": "pass",
            "accuracy_score": 2,
            "breadth_score": 2,
            "synthesis_score": 2,
        }
        assert not rubric_blocks_mastery(rubric)


class TestDirectiveIntegration:
    def test_teach_back_directive_exists(self):
        directive = get_directive("teach_back")
        assert directive != ""
        assert "Teach-Back" in directive
        assert "NOVICE" in directive.upper()

    def test_unknown_override_returns_empty(self):
        assert get_directive("nonexistent") == ""

    def test_null_override_returns_empty(self):
        assert get_directive(None) == ""


class TestPromptSuffix:
    def test_suffix_contains_rubric_contract(self):
        assert "TEACH_BACK_RUBRIC" in TEACH_BACK_PROMPT_SUFFIX
        assert "overall_rating" in TEACH_BACK_PROMPT_SUFFIX
        assert "accuracy_score" in TEACH_BACK_PROMPT_SUFFIX

    def test_suffix_instructs_novice_behavior(self):
        assert "NOVICE" in TEACH_BACK_PROMPT_SUFFIX.upper()
        assert "Do NOT explain" in TEACH_BACK_PROMPT_SUFFIX
