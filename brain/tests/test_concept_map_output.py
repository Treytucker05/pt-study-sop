"""Tests for concept map output contract (M7)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tutor_verdict import parse_concept_map, strip_concept_map_marker


class TestParseConceptMap:
    def test_parse_mermaid_and_metadata(self):
        response = (
            "Here is the concept map:\n\n"
            "```mermaid\n"
            "graph TD\n"
            "    A[Cardiac Output] -->|equals| B[SV x HR]\n"
            "    B -->|depends on| C[Preload]\n"
            "```\n\n"
            "Key observations:\n"
            "- CO is the product of SV and HR\n"
            "- Preload directly affects SV\n"
            "- These form a prerequisite chain\n\n"
            '<!-- CONCEPT_MAP: {"nodes":["Cardiac Output","SV","HR","Preload"],'
            '"edges":[{"from":"CO","to":"SV x HR","label":"equals"}],'
            '"topic":"cardiac output","note_count":3} -->'
        )
        result = parse_concept_map(response)
        assert result is not None
        assert "mermaid" in result
        assert "graph TD" in result["mermaid"]
        assert result["metadata"]["topic"] == "cardiac output"
        assert len(result["metadata"]["nodes"]) == 4

    def test_mermaid_only(self):
        response = (
            "```mermaid\n"
            "graph TD\n"
            "    A --> B\n"
            "```\n"
        )
        result = parse_concept_map(response)
        assert result is not None
        assert "mermaid" in result
        assert result["metadata"] is None

    def test_no_map_returns_none(self):
        assert parse_concept_map("Just a regular response") is None

    def test_malformed_metadata_still_returns_mermaid(self):
        response = (
            "```mermaid\ngraph TD\n    A --> B\n```\n"
            "<!-- CONCEPT_MAP: {broken} -->"
        )
        result = parse_concept_map(response)
        assert result is not None
        assert "mermaid" in result
        assert result["metadata"] is None


class TestStripConceptMapMarker:
    def test_strips_marker(self):
        text = 'A concept map.\n\n<!-- CONCEPT_MAP: {"nodes":[]} -->'
        cleaned = strip_concept_map_marker(text)
        assert "CONCEPT_MAP" not in cleaned
        assert "A concept map." in cleaned

    def test_no_marker_unchanged(self):
        text = "No map here"
        assert strip_concept_map_marker(text) == text
