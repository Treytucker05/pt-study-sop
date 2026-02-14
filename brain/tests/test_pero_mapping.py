"""Unit tests for PERO stage mapping."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from pero_mapping import (
    get_pero_stage,
    get_pero_info,
    get_pero_sequence,
    get_stage_coverage,
    get_exception_flags,
    PERO_STAGES,
    PERO_LABELS,
)


class TestGetPeroStage:
    """Test basic stage mapping logic."""

    def test_category_defaults_all_six(self):
        assert get_pero_stage("Any Method", "prepare") == "P"
        assert get_pero_stage("Any Method", "encode") == "E"
        assert get_pero_stage("Any Method", "retrieve") == "R"
        assert get_pero_stage("Any Method", "interrogate") == "E"
        assert get_pero_stage("Any Method", "refine") == "R"
        assert get_pero_stage("Any Method", "overlearn") == "O"

    def test_method_override_clinical_application(self):
        assert get_pero_stage("Clinical Application", "interrogate") == "R"

    def test_method_override_pre_test(self):
        assert get_pero_stage("Pre-Test", "prepare") == "P"

    def test_method_override_case_walkthrough(self):
        assert get_pero_stage("Case Walkthrough", "interrogate") == "R"

    def test_method_override_analogy_bridge(self):
        assert get_pero_stage("Analogy Bridge", "interrogate") == "E"

    def test_method_override_error_autopsy(self):
        assert get_pero_stage("Error Autopsy", "refine") == "R"

    def test_unknown_category_defaults_to_encoding(self):
        assert get_pero_stage("Any Method", "unknown") == "E"
        assert get_pero_stage("Any Method", "") == "E"

    def test_override_takes_precedence_over_category(self):
        assert get_pero_stage("Clinical Application", "encode") == "R"
        assert get_pero_stage("Pre-Test", "retrieve") == "P"


class TestGetPeroInfo:
    """Test full info dict with label, subtag, exception."""

    def test_category_default_returns_full_dict(self):
        info = get_pero_info("Generic Method", "prepare")
        assert info["pero"] == "P"
        assert info["label"] == "Priming"
        assert info["subtag"] == ""
        assert info["exception"] is False
        assert info["category"] == "prepare"

    def test_method_override_returns_subtag(self):
        info = get_pero_info("Clinical Application", "interrogate")
        assert info["pero"] == "R"
        assert info["label"] == "Retrieval"
        assert info["subtag"] == "application"
        assert info["exception"] is False
        assert info["category"] == "interrogate"

    def test_pre_test_has_exception_true(self):
        info = get_pero_info("Pre-Test", "prepare")
        assert info["pero"] == "P"
        assert info["exception"] is True
        assert info["subtag"] == "diagnostic-retrieval"

    def test_error_autopsy_subtag(self):
        info = get_pero_info("Error Autopsy", "refine")
        assert info["pero"] == "R"
        assert info["subtag"] == "repair"
        assert info["exception"] is False

    def test_analogy_bridge_elaboration_subtag(self):
        info = get_pero_info("Analogy Bridge", "interrogate")
        assert info["pero"] == "E"
        assert info["subtag"] == "elaboration"

    def test_unknown_category_returns_encoding_default(self):
        info = get_pero_info("Unknown Method", "unknown")
        assert info["pero"] == "E"
        assert info["label"] == "Encoding"
        assert info["category"] == "unknown"


class TestGetPeroSequence:
    """Test sequence mapping for multiple blocks."""

    def test_multiple_blocks_correct_order(self):
        blocks = [
            {"name": "Pre-Test", "category": "prepare"},
            {"name": "Cornell Notes", "category": "encode"},
            {"name": "Clinical Application", "category": "interrogate"},
            {"name": "Reflection", "category": "overlearn"},
        ]
        seq = get_pero_sequence(blocks)

        assert len(seq) == 4
        assert seq[0]["name"] == "Pre-Test"
        assert seq[0]["pero"] == "P"
        assert seq[0]["exception"] is True

        assert seq[1]["name"] == "Cornell Notes"
        assert seq[1]["pero"] == "E"

        assert seq[2]["name"] == "Clinical Application"
        assert seq[2]["pero"] == "R"
        assert seq[2]["subtag"] == "application"

        assert seq[3]["name"] == "Reflection"
        assert seq[3]["pero"] == "O"

    def test_empty_blocks_returns_empty_list(self):
        assert get_pero_sequence([]) == []

    def test_sequence_preserves_all_fields(self):
        blocks = [{"name": "Error Autopsy", "category": "refine"}]
        seq = get_pero_sequence(blocks)

        assert seq[0]["name"] == "Error Autopsy"
        assert seq[0]["category"] == "refine"
        assert seq[0]["pero"] == "R"
        assert seq[0]["label"] == "Retrieval"
        assert seq[0]["subtag"] == "repair"
        assert seq[0]["exception"] is False

    def test_missing_name_or_category_handled(self):
        blocks = [
            {"name": "Test"},
            {"category": "encode"},
            {},
        ]
        seq = get_pero_sequence(blocks)
        assert len(seq) == 3
        assert seq[0]["pero"] == "E"
        assert seq[1]["pero"] == "E"
        assert seq[2]["pero"] == "E"


class TestGetStageCoverage:
    """Test PERO stage coverage detection."""

    def test_full_coverage_all_four_stages(self):
        blocks = [
            {"name": "Preview", "category": "prepare"},
            {"name": "Cornell Notes", "category": "encode"},
            {"name": "Flashcards", "category": "retrieve"},
            {"name": "Reflection", "category": "overlearn"},
        ]
        coverage = get_stage_coverage(blocks)
        assert coverage == {"P": True, "E": True, "R": True, "O": True}

    def test_partial_coverage(self):
        blocks = [
            {"name": "Cornell Notes", "category": "encode"},
            {"name": "Flashcards", "category": "retrieve"},
        ]
        coverage = get_stage_coverage(blocks)
        assert coverage == {"P": False, "E": True, "R": True, "O": False}

    def test_empty_blocks_no_coverage(self):
        coverage = get_stage_coverage([])
        assert coverage == {"P": False, "E": False, "R": False, "O": False}

    def test_duplicate_stages_counted_once(self):
        blocks = [
            {"name": "Cornell Notes", "category": "encode"},
            {"name": "Concept Map", "category": "encode"},
            {"name": "Analogy Bridge", "category": "interrogate"},
        ]
        coverage = get_stage_coverage(blocks)
        assert coverage["E"] is True
        assert coverage["P"] is False
        assert coverage["R"] is False
        assert coverage["O"] is False

    def test_coverage_respects_overrides(self):
        blocks = [
            {"name": "Clinical Application", "category": "interrogate"},
        ]
        coverage = get_stage_coverage(blocks)
        assert coverage["R"] is True
        assert coverage["E"] is False


class TestGetExceptionFlags:
    """Test exception flagging for special methods."""

    def test_pre_test_flagged(self):
        blocks = [{"name": "Pre-Test", "category": "prepare"}]
        flags = get_exception_flags(blocks)
        assert len(flags) == 1
        assert "Pre-Test" in flags[0]
        assert "diagnostic-retrieval" in flags[0]

    def test_normal_methods_not_flagged(self):
        blocks = [
            {"name": "Cornell Notes", "category": "encode"},
            {"name": "Clinical Application", "category": "interrogate"},
            {"name": "Flashcards", "category": "retrieve"},
        ]
        flags = get_exception_flags(blocks)
        assert len(flags) == 0

    def test_empty_blocks_returns_empty_list(self):
        assert get_exception_flags([]) == []

    def test_multiple_exceptions_all_flagged(self):
        blocks = [
            {"name": "Pre-Test", "category": "prepare"},
            {"name": "Cornell Notes", "category": "encode"},
            {"name": "Pre-Test", "category": "prepare"},
        ]
        flags = get_exception_flags(blocks)
        assert len(flags) == 2
        assert all("Pre-Test" in flag for flag in flags)

    def test_exception_flag_format(self):
        blocks = [{"name": "Pre-Test", "category": "prepare"}]
        flags = get_exception_flags(blocks)
        assert flags[0] == "Pre-Test: diagnostic-retrieval"


class TestConstants:
    """Test module constants are correct."""

    def test_pero_stages_tuple(self):
        assert PERO_STAGES == ("P", "E", "R", "O")

    def test_pero_labels_mapping(self):
        assert PERO_LABELS == {
            "P": "Priming",
            "E": "Encoding",
            "R": "Retrieval",
            "O": "Overlearning",
        }
