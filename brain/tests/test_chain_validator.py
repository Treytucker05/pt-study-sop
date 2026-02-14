"""Unit tests for brain/chain_validator.py"""

import sys
from pathlib import Path

# Add brain/ to path for imports
brain_dir = Path(__file__).parent.parent
sys.path.insert(0, str(brain_dir))

import pytest
from chain_validator import validate_chain, ChainReport


# Test fixtures - method blocks with different categories/names
def make_block(name, category):
    """Helper to create method block dict"""
    return {"name": name, "category": category}


# Valid sequences
def test_valid_full_pero_sequence():
    """Valid P→E→R→O chain passes with no violations"""
    blocks = [
        make_block("Topic Preview", "prepare"),
        make_block("Elaborative Interrogation", "interrogate"),
        make_block("Flashcard Drill", "retrieve"),
        make_block("Daily Review", "overlearn"),
    ]
    report = validate_chain("Full PERO", blocks)

    assert report.valid is True
    assert len(report.violations) == 0
    assert report.stage_sequence == ["P", "E", "R", "O"]
    assert report.stage_coverage == {"P": True, "E": True, "R": True, "O": True}


def test_valid_short_pe_chain():
    """Valid P→E chain passes but warns about no R/O"""
    blocks = [
        make_block("Topic Preview", "prepare"),
        make_block("Cornell Notes", "encode"),
    ]
    report = validate_chain("Short PE", blocks)

    assert report.valid is True
    assert len(report.violations) == 0
    assert len(report.warnings) == 1
    assert "no Retrieval or Overlearning" in report.warnings[0]
    assert report.stage_sequence == ["P", "E"]


def test_encoding_only_chain_warns():
    """Chain with only encoding blocks is valid but gets warning"""
    blocks = [
        make_block("Cornell Notes", "encode"),
        make_block("Concept Mapping", "encode"),
    ]
    report = validate_chain("Encode Only", blocks)

    assert report.valid is True
    assert len(report.violations) == 0
    assert len(report.warnings) == 1
    assert "no Retrieval or Overlearning" in report.warnings[0]


def test_overlearn_after_encoding_valid():
    """O after E is valid (has encoding)"""
    blocks = [
        make_block("Cornell Notes", "encode"),
        make_block("Daily Review", "overlearn"),
    ]
    report = validate_chain("E→O", blocks)

    assert report.valid is True
    assert len(report.violations) == 0


def test_overlearn_after_retrieval_valid():
    """O after R is valid (has retrieval)"""
    blocks = [
        make_block("Topic Preview", "prepare"),
        make_block("Cornell Notes", "encode"),
        make_block("Flashcard Drill", "retrieve"),
        make_block("Daily Review", "overlearn"),
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
    """R before E → violation (no diagnostic exception)"""
    blocks = [
        make_block("Topic Preview", "prepare"),
        make_block("Flashcard Drill", "retrieve"),  # R before any E
        make_block("Cornell Notes", "encode"),
    ]
    report = validate_chain("R before E", blocks)

    assert report.valid is False
    assert len(report.violations) == 1
    assert "Retrieval before any Encoding" in report.violations[0]
    assert "Flashcard Drill" in report.violations[0]


def test_overlearn_without_encoding_or_retrieval_violation():
    """O without E or R → violation (nothing to consolidate)"""
    blocks = [
        make_block("Topic Preview", "prepare"),
        make_block("Daily Review", "overlearn"),  # O with no E/R
    ]
    report = validate_chain("O without E/R", blocks)

    assert report.valid is False
    assert len(report.violations) == 1
    assert "Overlearning with no prior Encoding or Retrieval" in report.violations[0]


# Exception cases
def test_pretest_allows_early_retrieval():
    """Pre-Test in chain → R before E is allowed (diagnostic exception)"""
    blocks = [
        make_block("Pre-Test", "retrieve"),  # Diagnostic retrieval
        make_block("Topic Preview", "prepare"),
        make_block("Cornell Notes", "encode"),
    ]
    report = validate_chain("Pre-Test Exception", blocks)

    assert report.valid is True
    assert len(report.violations) == 0
    assert any("Pre-Test" in flag for flag in report.exception_flags)


def test_error_autopsy_before_encoding_allowed():
    """Error Autopsy before E → no violation (repair method exception)"""
    blocks = [
        make_block("Topic Preview", "prepare"),
        make_block("Error Autopsy", "refine"),  # Repair method
        make_block("Cornell Notes", "encode"),
    ]
    report = validate_chain("Error Autopsy Exception", blocks)

    assert report.valid is True
    assert len(report.violations) == 0


def test_mastery_loop_before_encoding_allowed():
    """Mastery Loop before E → no violation (repair method exception)"""
    blocks = [
        make_block("Topic Preview", "prepare"),
        make_block("Mastery Loop", "refine"),  # Repair method
        make_block("Cornell Notes", "encode"),
    ]
    report = validate_chain("Mastery Loop Exception", blocks)

    assert report.valid is True
    assert len(report.violations) == 0


# ChainReport.to_dict()
def test_chain_report_to_dict():
    """ChainReport.to_dict() returns correct structure"""
    blocks = [
        make_block("Topic Preview", "prepare"),
        make_block("Cornell Notes", "encode"),
    ]
    report = validate_chain("Test Chain", blocks, chain_id=42)

    result = report.to_dict()

    assert result["chain_name"] == "Test Chain"
    assert result["chain_id"] == 42
    assert result["valid"] is True
    assert isinstance(result["violations"], list)
    assert isinstance(result["warnings"], list)
    assert result["stage_sequence"] == ["P", "E"]
    assert isinstance(result["stage_coverage"], dict)
    assert isinstance(result["exception_flags"], list)


def test_chain_id_propagates():
    """chain_id propagates correctly through validate_chain"""
    blocks = [make_block("Topic Preview", "prepare")]

    report_with_id = validate_chain("With ID", blocks, chain_id=123)
    assert report_with_id.chain_id == 123

    report_without_id = validate_chain("No ID", blocks)
    assert report_without_id.chain_id is None


def test_multiple_violations_accumulate():
    """Multiple violations are all captured"""
    # Note: O after R doesn't violate since has_retrieval is True from first step
    # Use P→O to get both violations
    blocks = [
        make_block("Topic Preview", "prepare"),
        make_block("Flashcard Drill", "retrieve"),  # R before E
        make_block("Cornell Notes", "encode"),
        make_block("Flashcard Drill", "retrieve"),  # Another R (no violation, has E now)
    ]
    report = validate_chain("R before E", blocks)

    assert report.valid is False
    assert len(report.violations) >= 1
    assert any("Retrieval before any Encoding" in v for v in report.violations)
