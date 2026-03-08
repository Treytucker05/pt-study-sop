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


def test_learning_objectives_sync_sections_render_expected_contract() -> None:
    from tutor_templates import render_learning_objectives_todo_sections

    sections = render_learning_objectives_todo_sections(
        {
            "module_name": "Week 8 - Brain Structure",
            "course_name": "Neuroscience",
            "topic": "Week 8 - Brain Structure",
            "objective_scope": "module_all",
            "objectives": [
                {"objective_id": "OBJ-6", "title": "Explain the major brain divisions.", "status": "active"},
                {"objective_id": "OBJ-6A", "title": "Identify telencephalon structures.", "status": "active"},
                {"objective_id": "OBJ-6B", "title": "Identify diencephalon structures.", "status": "active"},
            ],
            "materials": [
                {"id": 527, "title": "Week 8 LO and To Do", "file_type": "txt", "source_path": "Week 8 LO and To Do.txt"},
            ],
        }
    )

    assert "Learning Objectives" in sections
    assert "Parent Objectives" in sections
    assert "Child Objectives / Atomic Targets" in sections
    assert "Hierarchical ASCII Chapter Map" in sections
    assert "- [ ] **OBJ-6 -- Explain the major brain divisions.**" in sections["Parent Objectives"]
    assert "OBJ-6A -- Identify telencephalon structures." in sections["Child Objectives / Atomic Targets"]
    assert "| Resource | Type | Location |" in sections["Source Materials"]
    assert sections["Hierarchical ASCII Chapter Map"].count("Source Materials") == 1


def test_learning_objectives_sync_extracts_todos_and_reading_lines() -> None:
    from tutor_templates import render_learning_objectives_todo_sections

    sections = render_learning_objectives_todo_sections(
        {
            "module_name": "Week 8 - Brain Structure",
            "course_name": "Neuroscience",
            "topic": "Week 8 - Brain Structure",
            "objective_scope": "module_all",
            "objectives": [
                {"objective_id": "OBJ-6", "title": "Explain the major brain divisions.", "status": "active"},
            ],
            "materials": [
                {
                    "id": 527,
                    "title": "Week 8 LO and To Do",
                    "file_type": "txt",
                    "source_path": "Week 8 LO and To Do.txt",
                    "content_text": "\n".join(
                        [
                            "To-do list",
                            "",
                            "• Label lobes on a blank brain diagram",
                            "• Trace CSF flow",
                            "",
                            "Reading: Lundy-Ekmark Ch 9",
                        ]
                    ),
                },
            ],
        }
    )

    assert "Label lobes on a blank brain diagram" in sections["To Do"]
    assert "Trace CSF flow" in sections["To Do"]
    assert "Lundy-Ekmark Ch 9" in sections["Assigned Chapters / Reading"]


def test_map_of_contents_sync_sections_render_expected_contract() -> None:
    from tutor_templates import render_map_of_contents_sections

    sections = render_map_of_contents_sections(
        {
            "module_name": "Week 8 - Brain Structure",
            "course_name": "Neuroscience",
            "topic": "Week 8 - Brain Structure",
            "learning_objectives_page_name": "Learning Objectives & To Do",
            "objectives": [
                {"objective_id": "OBJ-6", "title": "Explain the major brain divisions.", "status": "active"},
                {"objective_id": "OBJ-6A", "title": "Identify telencephalon structures.", "status": "active"},
            ],
            "materials": [],
        }
    )

    assert "[[Learning Objectives & To Do]]" in sections["Module Spine"]
    assert "[[OBJ-6A]]" in sections["Objective Index"]
    assert "Hierarchical ASCII Chapter Map" not in sections["Objective Index"]


def test_map_of_contents_sync_dedupes_material_root_and_surfaces_reading() -> None:
    from tutor_templates import render_map_of_contents_sections

    sections = render_map_of_contents_sections(
        {
            "module_name": "Week 8 - Brain Structure",
            "course_name": "Neuroscience",
            "topic": "Week 8 - Brain Structure",
            "learning_objectives_page_name": "Learning Objectives & To Do",
            "objectives": [
                {"objective_id": "OBJ-6", "title": "Explain the major brain divisions.", "status": "active"},
                {"objective_id": "OBJ-6A", "title": "Identify telencephalon structures.", "status": "active"},
            ],
            "materials": [
                {
                    "id": 527,
                    "title": "Week 8 LO and To Do",
                    "file_type": "txt",
                    "source_path": "Week 8 LO and To Do.txt",
                    "content_text": "Reading: Lundy-Ekmark Ch 9",
                },
                {
                    "id": 529,
                    "title": "Week 8 LO and To Do.txt",
                    "file_type": "txt",
                    "source_path": "Week 8 LO and To Do.txt",
                    "content_text": "Reading: Lundy-Ekmark Ch 9",
                },
            ],
        }
    )

    assert sections["Hierarchical ASCII Chapter Map"].count("Source Materials") == 1
    assert "Reading: Lundy-Ekmark Ch 9" in sections["Schedule Context"]
