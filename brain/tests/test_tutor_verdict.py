"""Tests for tutor_verdict module."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tutor_verdict import parse_verdict, strip_verdict_marker, validate_verdict


class TestParseVerdict:
    def test_valid_verdict_extracted(self):
        response = (
            "Your answer is mostly correct.\n\n"
            '<!-- VERDICT_JSON: {"verdict":"pass","error_location":null,'
            '"error_type":null,"why_wrong":null,"next_hint":"Try explaining the mechanism",'
            '"next_question":"What drives venous return?","confidence":0.9,"citations":["Ch5 p.42"]} -->'
        )
        result = parse_verdict(response)
        assert result is not None
        assert result["verdict"] == "pass"
        assert result["confidence"] == 0.9
        assert result["citations"] == ["Ch5 p.42"]

    def test_fail_verdict_with_error_location(self):
        response = (
            "That's not quite right.\n\n"
            '<!-- VERDICT_JSON: {"verdict":"fail",'
            '"error_location":{"type":"prerequisite","node":"Starling Law",'
            '"prereq_from":"Preload","prereq_to":"Stroke Volume"},'
            '"error_type":"reversed_causality",'
            '"why_wrong":"You reversed the cause and effect of preload on stroke volume.",'
            '"next_hint":"Think about what happens when more blood fills the ventricle.",'
            '"next_question":"How does increased preload affect stroke volume?",'
            '"confidence":0.85,"citations":["Ch3 p.22"]} -->'
        )
        result = parse_verdict(response)
        assert result is not None
        assert result["verdict"] == "fail"
        assert result["error_location"]["node"] == "Starling Law"

    def test_no_verdict_returns_none(self):
        assert parse_verdict("Just a regular response") is None

    def test_malformed_json_returns_none(self):
        response = '<!-- VERDICT_JSON: {broken json}} -->'
        assert parse_verdict(response) is None

    def test_multiline_verdict(self):
        response = (
            "Good work.\n\n"
            '<!-- VERDICT_JSON: {\n'
            '  "verdict": "partial",\n'
            '  "next_hint": "Review the concept",\n'
            '  "next_question": "What is preload?",\n'
            '  "confidence": 0.7,\n'
            '  "citations": []\n'
            '} -->'
        )
        result = parse_verdict(response)
        assert result is not None
        assert result["verdict"] == "partial"


class TestValidateVerdict:
    def test_valid_pass_verdict(self):
        data = {
            "verdict": "pass",
            "next_hint": "Try the next concept",
            "next_question": "What is afterload?",
            "confidence": 0.95,
        }
        valid, issues = validate_verdict(data)
        assert valid is True
        assert issues == []

    def test_missing_required_fields(self):
        valid, issues = validate_verdict({})
        assert valid is False
        assert len(issues) >= 4

    def test_invalid_verdict_value(self):
        data = {
            "verdict": "maybe",
            "next_hint": "h",
            "next_question": "q",
            "confidence": 0.5,
        }
        valid, issues = validate_verdict(data)
        assert valid is False
        assert any("Invalid verdict" in i for i in issues)

    def test_fail_without_error_location(self):
        data = {
            "verdict": "fail",
            "next_hint": "h",
            "next_question": "q",
            "confidence": 0.5,
        }
        valid, issues = validate_verdict(data)
        assert valid is False
        assert any("error_location" in i for i in issues)

    def test_fail_with_empty_node(self):
        data = {
            "verdict": "fail",
            "error_location": {"type": "concept", "node": None},
            "next_hint": "h",
            "next_question": "q",
            "confidence": 0.5,
        }
        valid, issues = validate_verdict(data)
        assert valid is False
        assert any("node" in i for i in issues)

    def test_confidence_out_of_range(self):
        data = {
            "verdict": "pass",
            "next_hint": "h",
            "next_question": "q",
            "confidence": 1.5,
        }
        valid, issues = validate_verdict(data)
        assert valid is False
        assert any("out of range" in i for i in issues)


class TestStripVerdictMarker:
    def test_strips_marker(self):
        text = 'Great answer!\n\n<!-- VERDICT_JSON: {"verdict":"pass"} -->'
        assert strip_verdict_marker(text) == "Great answer!"

    def test_no_marker_unchanged(self):
        text = "Just a normal response"
        assert strip_verdict_marker(text) == text
