from tutor_templates import (
    render_concept_note_markdown,
    render_session_note_markdown,
    render_template_artifact,
)


def test_render_session_note_markdown_includes_sections() -> None:
    artifact = {
        "metadata": {
            "control_stage": "PRIME",
            "method_id": "M-PRE-010",
            "session_mode": "module_all",
        },
        "session": {
            "stage_flow": ["PRIME", "ENCODE"],
            "unknowns": ["[[Concept A]]"],
            "follow_up_targets": ["[[Concept B]]"],
            "source_ids": ["material:1"],
        },
        "concepts": [{"file_name": "Concept A"}],
    }
    out = render_session_note_markdown(
        artifact=artifact,
        session_id="sess-123",
        topic="Hip and Pelvis LO",
        module_name="Hip and Pelvis",
    )
    assert "Tutor Session - Hip and Pelvis LO" in out
    assert "- [[Concept A]]" in out
    assert "- material:1" in out


def test_render_concept_note_markdown_includes_relationships() -> None:
    concept = {
        "file_name": "Acetabulum",
        "why_it_matters": "Load transfer and hip stability.",
        "prerequisites": ["[[Pelvis]]"],
        "retrieval_targets": ["Name the socket articulation."],
        "common_errors": ["Confusing acetabulum with acetabular labrum."],
        "relationships": [
            {
                "target_concept": "[[Femoral Head]]",
                "relationship_type": "part_of",
            }
        ],
        "next_review_date": "2026-03-01",
    }
    out = render_concept_note_markdown(concept=concept, module_name="Hip and Pelvis")
    assert "# Acetabulum" in out
    assert "- [[Femoral Head]] (part_of)" in out
    assert "2026-03-01" in out


def test_render_template_artifact_requires_payload_shape() -> None:
    bad = render_template_artifact("session_note", {"topic": "x"})
    assert bad["success"] is False

    ok = render_template_artifact(
        "reference_targets",
        {"title": "Today", "targets": ["[[A]]", "[[B]]"]},
    )
    assert ok["success"] is True
    assert "## Targets" in str(ok.get("content"))
