"""Unit tests for brain/chain_validator.py"""

import sys
from pathlib import Path

# Add brain/ to path for imports
brain_dir = Path(__file__).parent.parent
sys.path.insert(0, str(brain_dir))

import pytest
from chain_validator import validate_chain, ChainReport


# Test fixtures - method blocks with different control stages/names
def make_block(name, control_stage):
    """Helper to create method block dict"""
    return {"name": name, "control_stage": control_stage}


# Valid sequences
def test_valid_full_cp_sequence():
    """Valid PRIME→TEACH→CALIBRATE→ENCODE→REFERENCE→RETRIEVE→OVERLEARN passes."""
    blocks = [
        make_block("Topic Preview", "PRIME"),
        make_block("Analogy Bridge", "TEACH"),
        make_block("Micro Precheck", "CALIBRATE"),
        make_block("Cornell Notes", "ENCODE"),
        make_block("One-Page Anchor", "REFERENCE"),
        make_block("Flashcard Drill", "RETRIEVE"),
        make_block("Daily Review", "OVERLEARN"),
    ]
    report = validate_chain("Full CP", blocks)

    assert report.valid is True
    assert len(report.violations) == 0
    assert report.stage_sequence == [
        "PRIME",
        "TEACH",
        "CALIBRATE",
        "ENCODE",
        "REFERENCE",
        "RETRIEVE",
        "OVERLEARN",
    ]
    assert report.stage_coverage["PRIME"] is True
    assert report.stage_coverage["TEACH"] is True
    assert report.stage_coverage["CALIBRATE"] is True
    assert report.stage_coverage["ENCODE"] is True
    assert report.stage_coverage["REFERENCE"] is True
    assert report.stage_coverage["RETRIEVE"] is True
    assert report.stage_coverage["OVERLEARN"] is True


def test_valid_short_pe_chain():
    """Valid PRIME→ENCODE chain passes but warns about no RETRIEVE/OVERLEARN."""
    blocks = [
        make_block("Topic Preview", "PRIME"),
        make_block("Cornell Notes", "ENCODE"),
    ]
    report = validate_chain("Short PE", blocks)

    assert report.valid is True
    assert len(report.violations) == 0
    assert len(report.warnings) == 1
    assert "no RETRIEVE or OVERLEARN" in report.warnings[0]
    assert report.stage_sequence == ["PRIME", "ENCODE"]


def test_encoding_only_chain_warns():
    """Chain with only ENCODE blocks is valid but gets warning."""
    blocks = [
        make_block("Cornell Notes", "ENCODE"),
        make_block("Concept Mapping", "ENCODE"),
    ]
    report = validate_chain("Encode Only", blocks)

    assert report.valid is True
    assert len(report.violations) == 0
    assert len(report.warnings) == 1
    assert "no RETRIEVE or OVERLEARN" in report.warnings[0]


def test_overlearn_after_encoding_valid():
    """OVERLEARN after ENCODE is valid."""
    blocks = [
        make_block("Cornell Notes", "ENCODE"),
        make_block("Daily Review", "OVERLEARN"),
    ]
    report = validate_chain("E→O", blocks)

    assert report.valid is True
    assert len(report.violations) == 0


def test_overlearn_after_retrieval_valid():
    """OVERLEARN after RETRIEVE is valid."""
    blocks = [
        make_block("Topic Preview", "PRIME"),
        make_block("Cornell Notes", "ENCODE"),
        make_block("Flashcard Drill", "RETRIEVE"),
        make_block("Daily Review", "OVERLEARN"),
    ]
    report = validate_chain("P→E→R→O", blocks)

    assert report.valid is True
    assert len(report.violations) == 0


# Invalid sequences
def test_empty_blocks_invalid():
    """Empty blocks list → invalid with violation"""
    report = validate_chain("Empty", [])

    assert report.valid is False
    assert len(report.violations) == 1
    assert "no blocks" in report.violations[0]


def test_retrieval_before_encoding_violation():
    """RETRIEVE before ENCODE/REFERENCE violates the chain contract."""
    blocks = [
        make_block("Topic Preview", "PRIME"),
        make_block("Flashcard Drill", "RETRIEVE"),
        make_block("Cornell Notes", "ENCODE"),
    ]
    report = validate_chain("R before E", blocks)

    assert report.valid is False
    assert len(report.violations) == 1
    assert "RETRIEVE before any ENCODE or REFERENCE" in report.violations[0]
    assert "Flashcard Drill" in report.violations[0]


def test_overlearn_without_encoding_or_retrieval_violation():
    """OVERLEARN without ENCODE/REFERENCE/RETRIEVE violates the chain contract."""
    blocks = [
        make_block("Topic Preview", "PRIME"),
        make_block("Daily Review", "OVERLEARN"),
    ]
    report = validate_chain("O without E/R", blocks)

    assert report.valid is False
    assert len(report.violations) == 1
    assert "OVERLEARN with no prior ENCODE, REFERENCE, or RETRIEVE" in report.violations[0]


def test_prime_teach_calibrate_encode_valid():
    """TEACH is valid when it sits between PRIME and CALIBRATE."""
    blocks = [
        make_block("Learning Objectives Primer", "PRIME"),
        make_block("Analogy Bridge", "TEACH"),
        make_block("Micro Precheck", "CALIBRATE"),
        make_block("Concept Map", "ENCODE"),
    ]
    report = validate_chain("Teach Chain", blocks)

    assert report.valid is True
    assert len(report.violations) == 0


def test_calibrate_before_teach_invalid_when_both_present():
    """CALIBRATE cannot appear before TEACH when both stages exist."""
    blocks = [
        make_block("Learning Objectives Primer", "PRIME"),
        make_block("Micro Precheck", "CALIBRATE"),
        make_block("Analogy Bridge", "TEACH"),
        make_block("Concept Map", "ENCODE"),
    ]
    report = validate_chain("Bad Teach Order", blocks)

    assert report.valid is False
    assert any("CALIBRATE before TEACH" in v for v in report.violations)


def test_teach_after_encode_invalid():
    """TEACH cannot appear after downstream stages."""
    blocks = [
        make_block("Learning Objectives Primer", "PRIME"),
        make_block("Concept Map", "ENCODE"),
        make_block("Analogy Bridge", "TEACH"),
    ]
    report = validate_chain("Late Teach", blocks)

    assert report.valid is False
    assert any("TEACH after downstream stages" in v for v in report.violations)


# ChainReport.to_dict()
def test_chain_report_to_dict():
    """ChainReport.to_dict() returns correct structure"""
    blocks = [
        make_block("Topic Preview", "PRIME"),
        make_block("Cornell Notes", "ENCODE"),
    ]
    report = validate_chain("Test Chain", blocks, chain_id=42)

    result = report.to_dict()

    assert result["chain_name"] == "Test Chain"
    assert result["chain_id"] == 42
    assert result["valid"] is True
    assert isinstance(result["violations"], list)
    assert isinstance(result["warnings"], list)
    assert result["stage_sequence"] == ["PRIME", "ENCODE"]
    assert isinstance(result["stage_coverage"], dict)
    assert isinstance(result["exception_flags"], list)


def test_chain_id_propagates():
    """chain_id propagates correctly through validate_chain"""
    blocks = [make_block("Topic Preview", "PRIME")]

    report_with_id = validate_chain("With ID", blocks, chain_id=123)
    assert report_with_id.chain_id == 123

    report_without_id = validate_chain("No ID", blocks)
    assert report_without_id.chain_id is None


def test_multiple_violations_accumulate():
    """Multiple violations are all captured."""
    blocks = [
        make_block("Topic Preview", "PRIME"),
        make_block("Micro Precheck", "CALIBRATE"),
        make_block("Analogy Bridge", "TEACH"),
        make_block("Flashcard Drill", "RETRIEVE"),
    ]
    report = validate_chain("Multiple Violations", blocks)

    assert report.valid is False
    assert len(report.violations) >= 1
    assert any("CALIBRATE before TEACH" in v for v in report.violations)
