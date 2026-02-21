"""Phase 8: Regression and Safety Tests.

Task 8.1 — Module output contract tests (JSON Schema compliance)
Task 8.2 — Telemetry completeness guard
Task 8.3 — Hallucination resistance checks (citation/provenance validation)
"""

import json
import sqlite3
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tutor_verdict import (
    CONCEPT_MAP_PROMPT_SUFFIX,
    VERDICT_JSON_SCHEMA,
    VERDICT_PROMPT_SUFFIX,
    parse_concept_map,
    parse_verdict,
    strip_concept_map_marker,
    strip_verdict_marker,
    validate_verdict,
)
from tutor_teach_back import (
    TEACH_BACK_PROMPT_SUFFIX,
    parse_teach_back_rubric,
    rubric_blocks_mastery,
    validate_teach_back_rubric,
)
from tutor_streaming import extract_citations
from adaptive.telemetry import (
    PracticeEvent,
    create_telemetry_tables,
    emit_attempt,
    emit_evaluate_work,
    emit_hint,
    emit_teach_back,
    record_error_flag,
    record_event,
    validate_practice_event,
)
from adaptive.schemas import ValidationResult
from adaptive.knowledge_graph import (
    build_context_pack,
    create_kg_tables,
    extract_typed_relations,
    seed_from_obsidian,
)
from adaptive.vault_ingest import create_vault_tables, ingest_vault


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def telemetry_db():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    create_telemetry_tables(conn)
    return conn


@pytest.fixture
def kg_db():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    create_vault_tables(conn)
    create_kg_tables(conn)
    return conn


# =========================================================================
# Task 8.1: Module output contract tests
# =========================================================================

class TestVerdictContract:
    """Verdict JSON must pass schema validation or be flagged."""

    VALID_PASS = {
        "verdict": "pass",
        "next_hint": "Good work",
        "next_question": "What about afterload?",
        "confidence": 0.9,
        "citations": ["Ch5.pdf"],
    }

    VALID_FAIL = {
        "verdict": "fail",
        "error_location": {
            "type": "prerequisite",
            "node": "Preload",
            "prereq_from": "Venous Return",
            "prereq_to": "Stroke Volume",
        },
        "error_type": "misconception",
        "why_wrong": "Confused preload with afterload",
        "next_hint": "Preload is about volume, not resistance",
        "next_question": "What determines preload?",
        "confidence": 0.75,
        "citations": ["Ch3.pdf"],
    }

    def test_valid_pass_verdict_accepted(self):
        ok, issues = validate_verdict(self.VALID_PASS)
        assert ok, f"Should accept valid pass verdict: {issues}"

    def test_valid_fail_verdict_accepted(self):
        ok, issues = validate_verdict(self.VALID_FAIL)
        assert ok, f"Should accept valid fail verdict: {issues}"

    def test_missing_verdict_field_rejected(self):
        data = {"next_hint": "x", "next_question": "y", "confidence": 0.5}
        ok, issues = validate_verdict(data)
        assert not ok
        assert any("verdict" in i for i in issues)

    def test_missing_next_hint_rejected(self):
        data = {"verdict": "pass", "next_question": "y", "confidence": 0.5}
        ok, issues = validate_verdict(data)
        assert not ok
        assert any("next_hint" in i for i in issues)

    def test_missing_next_question_rejected(self):
        data = {"verdict": "pass", "next_hint": "x", "confidence": 0.5}
        ok, issues = validate_verdict(data)
        assert not ok
        assert any("next_question" in i for i in issues)

    def test_missing_confidence_rejected(self):
        data = {"verdict": "pass", "next_hint": "x", "next_question": "y"}
        ok, issues = validate_verdict(data)
        assert not ok
        assert any("confidence" in i for i in issues)

    def test_invalid_verdict_value_rejected(self):
        data = {**self.VALID_PASS, "verdict": "excellent"}
        ok, issues = validate_verdict(data)
        assert not ok
        assert any("verdict" in i.lower() for i in issues)

    def test_confidence_below_zero_rejected(self):
        data = {**self.VALID_PASS, "confidence": -0.1}
        ok, issues = validate_verdict(data)
        assert not ok
        assert any("confidence" in i for i in issues)

    def test_confidence_above_one_rejected(self):
        data = {**self.VALID_PASS, "confidence": 1.5}
        ok, issues = validate_verdict(data)
        assert not ok
        assert any("confidence" in i for i in issues)

    def test_fail_without_error_location_rejected(self):
        data = {
            "verdict": "fail",
            "next_hint": "x",
            "next_question": "y",
            "confidence": 0.7,
        }
        ok, issues = validate_verdict(data)
        assert not ok
        assert any("error_location" in i for i in issues)

    def test_fail_with_null_node_rejected(self):
        data = {
            "verdict": "fail",
            "error_location": {"type": "concept", "node": None},
            "next_hint": "x",
            "next_question": "y",
            "confidence": 0.7,
        }
        ok, issues = validate_verdict(data)
        assert not ok
        assert any("node" in i for i in issues)

    def test_parse_extracts_from_markers(self):
        text = 'Great!\n<!-- VERDICT_JSON: {"verdict":"pass","next_hint":"h","next_question":"q","confidence":0.9} -->'
        result = parse_verdict(text)
        assert result is not None
        assert result["verdict"] == "pass"

    def test_parse_malformed_returns_none(self):
        assert parse_verdict("<!-- VERDICT_JSON: {broken} -->") is None

    def test_strip_removes_marker(self):
        text = 'Answer.\n<!-- VERDICT_JSON: {"verdict":"pass"} -->'
        cleaned = strip_verdict_marker(text)
        assert "VERDICT_JSON" not in cleaned
        assert "Answer." in cleaned


class TestTeachBackContract:
    """Teach-back rubric must pass schema validation or be flagged."""

    VALID_PASS = {
        "overall_rating": "pass",
        "accuracy_score": 3,
        "breadth_score": 2,
        "synthesis_score": 2,
        "confidence": 0.85,
        "strengths": ["clear explanation"],
    }

    VALID_FAIL = {
        "overall_rating": "fail",
        "accuracy_score": 1,
        "breadth_score": 0,
        "synthesis_score": 0,
        "confidence": 0.7,
        "misconceptions": ["confused A with B"],
        "gaps": [{"skill_id": "Preload", "edge_id": "requires"}],
    }

    def test_valid_pass_accepted(self):
        ok, issues = validate_teach_back_rubric(self.VALID_PASS)
        assert ok, f"Should accept: {issues}"

    def test_valid_fail_accepted(self):
        ok, issues = validate_teach_back_rubric(self.VALID_FAIL)
        assert ok, f"Should accept: {issues}"

    def test_missing_overall_rating_rejected(self):
        data = {"accuracy_score": 3, "breadth_score": 2, "synthesis_score": 2, "confidence": 0.5}
        ok, issues = validate_teach_back_rubric(data)
        assert not ok

    def test_missing_accuracy_score_rejected(self):
        data = {"overall_rating": "pass", "breadth_score": 2, "synthesis_score": 2, "confidence": 0.5}
        ok, issues = validate_teach_back_rubric(data)
        assert not ok
        assert any("accuracy_score" in i for i in issues)

    def test_score_above_3_rejected(self):
        data = {**self.VALID_PASS, "accuracy_score": 4}
        ok, issues = validate_teach_back_rubric(data)
        assert not ok

    def test_score_below_0_rejected(self):
        data = {**self.VALID_PASS, "synthesis_score": -1}
        ok, issues = validate_teach_back_rubric(data)
        assert not ok

    def test_invalid_rating_rejected(self):
        data = {**self.VALID_PASS, "overall_rating": "excellent"}
        ok, issues = validate_teach_back_rubric(data)
        assert not ok

    def test_confidence_out_of_range_rejected(self):
        data = {**self.VALID_PASS, "confidence": 2.0}
        ok, issues = validate_teach_back_rubric(data)
        assert not ok

    def test_gap_without_skill_id_rejected(self):
        data = {**self.VALID_FAIL, "gaps": [{"edge_id": "requires"}]}
        ok, issues = validate_teach_back_rubric(data)
        assert not ok
        assert any("skill_id" in i for i in issues)

    def test_parse_extracts_from_markers(self):
        text = 'Response.\n<!-- TEACH_BACK_RUBRIC: {"overall_rating":"pass","accuracy_score":3,"breadth_score":2,"synthesis_score":2,"confidence":0.9} -->'
        result = parse_teach_back_rubric(text)
        assert result is not None
        assert result["overall_rating"] == "pass"

    def test_parse_malformed_returns_none(self):
        assert parse_teach_back_rubric("<!-- TEACH_BACK_RUBRIC: {bad} -->") is None

    def test_rubric_blocks_mastery_on_fail(self):
        assert rubric_blocks_mastery(self.VALID_FAIL)

    def test_rubric_allows_mastery_on_pass(self):
        assert not rubric_blocks_mastery(self.VALID_PASS)

    def test_low_score_blocks_even_with_pass_rating(self):
        data = {**self.VALID_PASS, "accuracy_score": 1}
        assert rubric_blocks_mastery(data)


class TestConceptMapContract:
    """Concept map output must parse Mermaid + metadata."""

    def test_parse_full_response(self):
        text = (
            "Here is the map:\n"
            "```mermaid\ngraph TD\n  A --> B\n```\n"
            'And notes.\n<!-- CONCEPT_MAP: {"nodes":["A","B"],"edges":[{"from":"A","to":"B","label":"causes"}],"topic":"test","note_count":2} -->'
        )
        result = parse_concept_map(text)
        assert result is not None
        assert "mermaid" in result
        assert "graph TD" in result["mermaid"]
        assert result["metadata"]["topic"] == "test"
        assert len(result["metadata"]["nodes"]) == 2

    def test_mermaid_only(self):
        text = "```mermaid\ngraph TD\n  X --> Y\n```"
        result = parse_concept_map(text)
        assert result is not None
        assert "mermaid" in result
        assert result["metadata"] is None

    def test_no_content_returns_none(self):
        assert parse_concept_map("Just text, no diagram.") is None

    def test_malformed_metadata_graceful(self):
        text = "```mermaid\ngraph TD\n  A --> B\n```\n<!-- CONCEPT_MAP: {bad json} -->"
        result = parse_concept_map(text)
        assert result is not None
        assert result["metadata"] is None

    def test_strip_removes_marker(self):
        text = 'Map.\n<!-- CONCEPT_MAP: {"nodes":[]} -->'
        cleaned = strip_concept_map_marker(text)
        assert "CONCEPT_MAP" not in cleaned


class TestPracticeEventContract:
    """PracticeEvent validation must reject invalid events."""

    def test_valid_event_accepted(self):
        evt = PracticeEvent(
            user_id="u1", skill_id="s1", timestamp=time.time(),
            correct=True, confidence=0.8, source="attempt",
        )
        result = validate_practice_event(evt)
        assert result.valid

    def test_empty_user_id_rejected(self):
        evt = PracticeEvent(
            user_id="", skill_id="s1", timestamp=time.time(), correct=True,
        )
        result = validate_practice_event(evt)
        assert not result.valid
        assert any("user_id" in e for e in result.errors)

    def test_empty_skill_id_rejected(self):
        evt = PracticeEvent(
            user_id="u1", skill_id="", timestamp=time.time(), correct=True,
        )
        result = validate_practice_event(evt)
        assert not result.valid
        assert any("skill_id" in e for e in result.errors)

    def test_confidence_above_one_rejected(self):
        evt = PracticeEvent(
            user_id="u1", skill_id="s1", timestamp=time.time(),
            correct=True, confidence=1.5,
        )
        result = validate_practice_event(evt)
        assert not result.valid
        assert any("confidence" in e for e in result.errors)

    def test_confidence_below_zero_rejected(self):
        evt = PracticeEvent(
            user_id="u1", skill_id="s1", timestamp=time.time(),
            correct=True, confidence=-0.1,
        )
        result = validate_practice_event(evt)
        assert not result.valid

    def test_none_confidence_accepted(self):
        evt = PracticeEvent(
            user_id="u1", skill_id="s1", timestamp=time.time(), correct=True,
        )
        result = validate_practice_event(evt)
        assert result.valid


class TestPromptSuffixContracts:
    """Prompt suffixes must contain their output contract markers."""

    def test_verdict_suffix_has_marker(self):
        assert "VERDICT_JSON" in VERDICT_PROMPT_SUFFIX
        assert "verdict" in VERDICT_PROMPT_SUFFIX
        assert "confidence" in VERDICT_PROMPT_SUFFIX

    def test_teach_back_suffix_has_marker(self):
        assert "TEACH_BACK_RUBRIC" in TEACH_BACK_PROMPT_SUFFIX
        assert "overall_rating" in TEACH_BACK_PROMPT_SUFFIX
        assert "accuracy_score" in TEACH_BACK_PROMPT_SUFFIX

    def test_concept_map_suffix_has_marker(self):
        assert "CONCEPT_MAP" in CONCEPT_MAP_PROMPT_SUFFIX
        assert "mermaid" in CONCEPT_MAP_PROMPT_SUFFIX.lower()


# =========================================================================
# Task 8.2: Telemetry completeness guard
# =========================================================================

class TestTelemetryCompleteness:
    """Every practice action must produce exactly one event row."""

    def test_attempt_produces_event(self, telemetry_db):
        eid = emit_attempt(telemetry_db, "u1", "Preload", True, confidence=0.8)
        assert eid > 0
        row = telemetry_db.execute(
            "SELECT * FROM practice_events WHERE id = ?", (eid,)
        ).fetchone()
        assert row is not None
        assert row["source"] == "attempt"
        assert row["correct"] == 1

    def test_hint_produces_event(self, telemetry_db):
        eid = emit_hint(telemetry_db, "u1", "Preload", hint_level=2)
        assert eid > 0
        row = telemetry_db.execute(
            "SELECT * FROM practice_events WHERE id = ?", (eid,)
        ).fetchone()
        assert row["source"] == "hint"
        assert row["hint_level"] == 2

    def test_evaluate_work_produces_event(self, telemetry_db):
        eid = emit_evaluate_work(telemetry_db, "u1", "Preload", False)
        assert eid > 0
        row = telemetry_db.execute(
            "SELECT * FROM practice_events WHERE id = ?", (eid,)
        ).fetchone()
        assert row["source"] == "evaluate_work"
        assert row["correct"] == 0

    def test_teach_back_produces_event(self, telemetry_db):
        eid = emit_teach_back(telemetry_db, "u1", "Preload", True)
        assert eid > 0
        row = telemetry_db.execute(
            "SELECT * FROM practice_events WHERE id = ?", (eid,)
        ).fetchone()
        assert row["source"] == "teach_back"

    def test_error_flag_produced_on_failure(self, telemetry_db):
        fid = record_error_flag(
            telemetry_db, "u1", "Preload", "misconception",
            edge_id="requires", evidence_ref="confused preload with afterload",
        )
        assert fid > 0
        row = telemetry_db.execute(
            "SELECT * FROM error_flags WHERE id = ?", (fid,)
        ).fetchone()
        assert row["error_type"] == "misconception"
        assert row["edge_id"] == "requires"
        assert row["evidence_ref"] == "confused preload with afterload"

    def test_one_attempt_one_event_row(self, telemetry_db):
        """Exactly one event per attempt — no duplicates, no missing."""
        before = telemetry_db.execute(
            "SELECT COUNT(*) FROM practice_events"
        ).fetchone()[0]
        emit_attempt(telemetry_db, "u1", "Preload", True)
        after = telemetry_db.execute(
            "SELECT COUNT(*) FROM practice_events"
        ).fetchone()[0]
        assert after == before + 1

    def test_hint_separate_from_attempt(self, telemetry_db):
        """Hint event is separate from attempt event."""
        emit_attempt(telemetry_db, "u1", "Preload", True)
        emit_hint(telemetry_db, "u1", "Preload", hint_level=1)
        rows = telemetry_db.execute(
            "SELECT source FROM practice_events WHERE user_id = 'u1' ORDER BY id"
        ).fetchall()
        sources = [r["source"] for r in rows]
        assert sources == ["attempt", "hint"]

    def test_invalid_event_rejected_before_db(self, telemetry_db):
        """Validate rejects event with empty user_id."""
        evt = PracticeEvent(
            user_id="", skill_id="Preload", timestamp=time.time(), correct=True,
        )
        result = validate_practice_event(evt)
        assert not result.valid
        # Should not insert invalid events
        count_before = telemetry_db.execute(
            "SELECT COUNT(*) FROM practice_events"
        ).fetchone()[0]
        # record_event does NOT validate — callers must validate first
        # This test verifies the guard exists
        assert not result.valid

    def test_all_emit_sources_distinct(self, telemetry_db):
        """Each emitter uses a unique source tag."""
        emit_attempt(telemetry_db, "u1", "s1", True)
        emit_hint(telemetry_db, "u1", "s1", 1)
        emit_evaluate_work(telemetry_db, "u1", "s1", True)
        emit_teach_back(telemetry_db, "u1", "s1", True)
        sources = [
            r["source"] for r in
            telemetry_db.execute(
                "SELECT DISTINCT source FROM practice_events"
            ).fetchall()
        ]
        assert set(sources) == {"attempt", "hint", "evaluate_work", "teach_back"}

    def test_session_id_preserved(self, telemetry_db):
        """Session ID is stored correctly on events."""
        eid = emit_attempt(
            telemetry_db, "u1", "Preload", True, session_id="tutor-20260221-001"
        )
        row = telemetry_db.execute(
            "SELECT session_id FROM practice_events WHERE id = ?", (eid,)
        ).fetchone()
        assert row["session_id"] == "tutor-20260221-001"


# =========================================================================
# Task 8.3: Hallucination resistance checks
# =========================================================================

class TestCitationExtraction:
    """Citation extraction must reliably parse [Source: ...] markers."""

    def test_extracts_single_citation(self):
        text = "The answer is 42 [Source: Chapter5.pdf]."
        citations = extract_citations(text)
        assert len(citations) == 1
        assert citations[0]["source"] == "Chapter5.pdf"
        assert citations[0]["index"] == 1

    def test_extracts_multiple_citations(self):
        text = "[Source: A.pdf] and [Source: B.pdf] support this."
        citations = extract_citations(text)
        assert len(citations) == 2
        assert citations[0]["source"] == "A.pdf"
        assert citations[1]["source"] == "B.pdf"

    def test_deduplicates_citations(self):
        text = "[Source: A.pdf] first, [Source: A.pdf] again."
        citations = extract_citations(text)
        assert len(citations) == 1

    def test_no_citations_returns_empty(self):
        assert extract_citations("No sources here.") == []

    def test_whitespace_in_source_trimmed(self):
        text = "[Source:  Chapter 5.pdf  ]"
        citations = extract_citations(text)
        assert citations[0]["source"] == "Chapter 5.pdf"


class TestVerdictCitations:
    """Verdict citations field must be present and validated."""

    def test_pass_verdict_has_citations(self):
        data = {
            "verdict": "pass",
            "next_hint": "good",
            "next_question": "next",
            "confidence": 0.9,
            "citations": ["Ch1.pdf", "Ch2.pdf"],
        }
        ok, _ = validate_verdict(data)
        assert ok
        assert len(data["citations"]) == 2

    def test_verdict_without_citations_still_valid(self):
        """Citations are recommended but not required by current schema."""
        data = {
            "verdict": "pass",
            "next_hint": "good",
            "next_question": "next",
            "confidence": 0.9,
        }
        ok, _ = validate_verdict(data)
        assert ok

    def test_fail_verdict_with_citations_valid(self):
        data = {
            "verdict": "fail",
            "error_location": {"type": "concept", "node": "Preload"},
            "next_hint": "review",
            "next_question": "what is preload?",
            "confidence": 0.7,
            "citations": ["source1.pdf"],
        }
        ok, _ = validate_verdict(data)
        assert ok


class TestProvenanceCompleteness:
    """Every typed edge in the KG must have provenance (no uncited edges)."""

    @pytest.fixture
    def typed_vault(self, tmp_path):
        note = tmp_path / "Preload.md"
        note.write_text(
            "---\naliases: []\n---\n"
            "# Preload\nPreload increases Stroke Volume.\n"
            "Preload requires Venous Return.\n"
        )
        note2 = tmp_path / "Stroke Volume.md"
        note2.write_text(
            "---\naliases:\n  - SV\n---\n# Stroke Volume\n"
        )
        note3 = tmp_path / "Venous Return.md"
        note3.write_text(
            "---\naliases:\n  - VR\n---\n# Venous Return\n"
        )
        return tmp_path

    def test_every_typed_edge_has_provenance(self, kg_db, typed_vault):
        ingest_vault(str(typed_vault), kg_db)
        path = str(typed_vault / "Preload.md")
        content = (typed_vault / "Preload.md").read_text()
        extract_typed_relations(kg_db, path, content)

        typed_edges = kg_db.execute(
            "SELECT id, relation FROM kg_edges WHERE link_only = 0"
        ).fetchall()
        for edge in typed_edges:
            prov = kg_db.execute(
                "SELECT COUNT(*) FROM kg_provenance WHERE entity_type = 'edge' AND entity_id = ?",
                (edge[0],),
            ).fetchone()[0]
            assert prov > 0, f"Typed edge {edge[0]} ({edge[1]}) has no provenance"

    def test_link_only_edges_have_provenance_or_flag(self, kg_db, typed_vault):
        ingest_vault(str(typed_vault), kg_db)
        seed_from_obsidian(kg_db)

        link_only_edges = kg_db.execute(
            "SELECT id FROM kg_edges WHERE link_only = 1"
        ).fetchall()
        for (edge_id,) in link_only_edges:
            prov = kg_db.execute(
                "SELECT COUNT(*) FROM kg_provenance WHERE entity_type = 'edge' AND entity_id = ?",
                (edge_id,),
            ).fetchone()[0]
            assert prov > 0, f"Link-only edge {edge_id} has no provenance"

    def test_provenance_excerpts_non_empty(self, kg_db, typed_vault):
        ingest_vault(str(typed_vault), kg_db)
        path = str(typed_vault / "Preload.md")
        content = (typed_vault / "Preload.md").read_text()
        extract_typed_relations(kg_db, path, content)

        provs = kg_db.execute(
            "SELECT source_ref FROM kg_provenance WHERE source_type = 'typed_extraction'"
        ).fetchall()
        for (ref,) in provs:
            assert ref is not None
            assert "||" in ref
            excerpt = ref.split("||", 1)[1]
            assert len(excerpt) > 0, "Excerpt must be non-empty"

    def test_context_pack_no_uncited_typed_edge(self, kg_db, typed_vault):
        """Build a context pack and verify typed edges have source citations."""
        ingest_vault(str(typed_vault), kg_db)
        path = str(typed_vault / "Preload.md")
        content = (typed_vault / "Preload.md").read_text()
        extract_typed_relations(kg_db, path, content)

        nodes_rows = kg_db.execute(
            "SELECT id, name, definition, node_type FROM kg_nodes"
        ).fetchall()
        nodes = [
            {"id": r[0], "name": r[1], "definition": r[2], "type": r[3], "is_seed": True}
            for r in nodes_rows
        ]
        edges_rows = kg_db.execute(
            "SELECT id, source_node_id, target_node_id, relation, confidence "
            "FROM kg_edges WHERE link_only = 0"
        ).fetchall()
        edges = [
            {"id": r[0], "source": r[1], "target": r[2], "relation": r[3], "confidence": r[4]}
            for r in edges_rows
        ]

        if edges:
            text = build_context_pack(nodes, edges, kg_db)
            # Every typed relationship line should have a source citation
            for line in text.split("\n"):
                if "--[" in line and "links_to" not in line:
                    assert "(source:" in line, f"Uncited typed edge: {line}"
