"""Tests for course-level frontmatter in tutor-generated Obsidian notes."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_session_note_contains_course_frontmatter() -> None:
    """Session note markdown should include course/unit fields in frontmatter."""
    from tutor_templates import render_session_note_markdown

    artifact: dict = {
        "metadata": {"control_stage": "guided", "method_id": "active-recall"},
        "session": {"stage_flow": ["intro", "practice", "review"]},
        "concepts": [],
    }
    md = render_session_note_markdown(
        artifact=artifact,
        session_id="test-123",
        topic="Knee Complex",
        module_name="Construct 2 - Lower Quarter",
        course_label="Movement Science",
        course_code="PHYT 6314",
        unit_type="construct",
    )
    assert "course: Movement Science" in md
    assert "course_code: PHYT 6314" in md
    assert "unit_type: construct" in md


def test_concept_note_contains_course_frontmatter() -> None:
    """Concept note markdown should include course/unit fields in frontmatter."""
    from tutor_templates import render_concept_note_markdown

    concept: dict = {
        "file_name": "Goniometry Basics",
        "why_it_matters": "Foundation of ROM measurement",
        "prerequisites": [],
        "retrieval_targets": [],
        "relationships": [],
    }
    md = render_concept_note_markdown(
        concept=concept,
        module_name="Construct 1 - Movement Foundations",
        course_label="Movement Science",
        course_code="PHYT 6314",
        unit_type="construct",
    )
    assert "course: Movement Science" in md
    assert "course_code: PHYT 6314" in md
    assert "unit_type: construct" in md


def test_frontmatter_defaults_when_no_course_fields() -> None:
    """Backward compat: omitted course fields should not break rendering."""
    from tutor_templates import render_session_note_markdown

    artifact: dict = {
        "metadata": {},
        "session": {},
        "concepts": [],
    }
    md = render_session_note_markdown(
        artifact=artifact,
        session_id="test-456",
        topic="General",
        module_name="General Module",
    )
    assert "note_type: tutor_session" in md
