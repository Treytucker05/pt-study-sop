import pytest
from tutor_templates import (
    _SafeFormatDict,
    render_block_artifact,
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


class TestSafeFormatDict:
    """Test _SafeFormatDict missing key behavior."""

    def test_missing_key_returns_empty_string(self) -> None:
        """Missing keys should return empty string, not raise KeyError."""
        d = _SafeFormatDict({"a": "value_a"})
        assert d["a"] == "value_a"
        assert d["missing_key"] == ""

    def test_format_map_with_missing_keys(self) -> None:
        """str.format_map should not raise KeyError for missing keys."""
        d = _SafeFormatDict({"name": "Test"})
        template = "Name: {name}, Missing: {missing}"
        result = template.format_map(d)
        assert result == "Name: Test, Missing: "

    def test_safe_format_dict_is_dict_subclass(self) -> None:
        """_SafeFormatDict should be a dict subclass."""
        d = _SafeFormatDict({"key": "value"})
        assert isinstance(d, dict)
        assert d["key"] == "value"


class TestRenderBlockArtifactNotes:
    """Test render_block_artifact() with artifact_type='notes'."""

    def test_notes_artifact_includes_frontmatter(self) -> None:
        """Notes artifact should include YAML frontmatter."""
        result = render_block_artifact(
            block_id="block-001",
            block_name="Study Notes",
            control_stage="ENCODE",
            artifact_type="notes",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="Key points about the acetabulum.",
        )
        assert "---" in result
        assert "note_type: block_notes" in result
        assert "block_id: block-001" in result
        assert "artifact_type: notes" in result

    def test_notes_artifact_includes_content(self) -> None:
        """Notes artifact should include the provided content."""
        content = "The acetabulum is a cup-shaped socket."
        result = render_block_artifact(
            block_id="block-001",
            block_name="Study Notes",
            control_stage="ENCODE",
            artifact_type="notes",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content=content,
        )
        assert content in result
        assert "## Notes" in result

    def test_notes_artifact_with_optional_paths(self) -> None:
        """Notes artifact should include optional moc_path and session_note_path."""
        result = render_block_artifact(
            block_id="block-001",
            block_name="Study Notes",
            control_stage="ENCODE",
            artifact_type="notes",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="Notes here.",
            moc_path="Hip/MOC",
            session_note_path="Sessions/2026-03-01",
        )
        assert "[[Hip/MOC|Map of Contents]]" in result
        assert "[[Sessions/2026-03-01|Session Note]]" in result

    def test_notes_artifact_returns_string(self) -> None:
        """render_block_artifact should return a non-empty string."""
        result = render_block_artifact(
            block_id="block-001",
            block_name="Study Notes",
            control_stage="ENCODE",
            artifact_type="notes",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="Notes.",
        )
        assert isinstance(result, str)
        assert len(result) > 0
        assert result.endswith("\n")


class TestRenderBlockArtifactConceptMap:
    """Test render_block_artifact() with artifact_type='concept-map'."""

    def test_concept_map_artifact_includes_frontmatter(self) -> None:
        """Concept-map artifact should include YAML frontmatter."""
        result = render_block_artifact(
            block_id="block-002",
            block_name="Concept Map",
            control_stage="ENCODE",
            artifact_type="concept-map",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="graph TD\n  A[Acetabulum] --> B[Femoral Head]",
        )
        assert "---" in result
        assert "note_type: block_diagram" in result
        assert "artifact_type: concept-map" in result

    def test_concept_map_artifact_includes_mermaid_diagram(self) -> None:
        """Concept-map artifact should include mermaid diagram block."""
        diagram = "graph TD\n  A[Acetabulum] --> B[Femoral Head]"
        result = render_block_artifact(
            block_id="block-002",
            block_name="Concept Map",
            control_stage="ENCODE",
            artifact_type="concept-map",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content=diagram,
        )
        assert "```mermaid" in result
        assert diagram in result
        assert "## Concept Diagram" in result

    def test_concept_map_artifact_returns_string(self) -> None:
        """Concept-map artifact should return a non-empty string."""
        result = render_block_artifact(
            block_id="block-002",
            block_name="Concept Map",
            control_stage="ENCODE",
            artifact_type="concept-map",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="graph TD\n  A --> B",
        )
        assert isinstance(result, str)
        assert len(result) > 0


class TestRenderBlockArtifactComparisonTable:
    """Test render_block_artifact() with artifact_type='comparison-table'."""

    def test_comparison_table_artifact_includes_frontmatter(self) -> None:
        """Comparison-table artifact should include YAML frontmatter."""
        result = render_block_artifact(
            block_id="block-003",
            block_name="Comparison Table",
            control_stage="ENCODE",
            artifact_type="comparison-table",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="| Structure | Function |\n|-----------|----------|\n| Acetabulum | Socket |",
        )
        assert "---" in result
        assert "note_type: block_comparison" in result
        assert "artifact_type: comparison-table" in result

    def test_comparison_table_artifact_includes_table_content(self) -> None:
        """Comparison-table artifact should include the table content."""
        table = "| Structure | Function |\n|-----------|----------|\n| Acetabulum | Socket |"
        result = render_block_artifact(
            block_id="block-003",
            block_name="Comparison Table",
            control_stage="ENCODE",
            artifact_type="comparison-table",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content=table,
        )
        assert table in result
        assert "## Comparison Table" in result

    def test_comparison_table_artifact_returns_string(self) -> None:
        """Comparison-table artifact should return a non-empty string."""
        result = render_block_artifact(
            block_id="block-003",
            block_name="Comparison Table",
            control_stage="ENCODE",
            artifact_type="comparison-table",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="| A | B |",
        )
        assert isinstance(result, str)
        assert len(result) > 0


class TestRenderBlockArtifactRecall:
    """Test render_block_artifact() with artifact_type='recall'."""

    def test_recall_artifact_includes_frontmatter(self) -> None:
        """Recall artifact should include YAML frontmatter."""
        result = render_block_artifact(
            block_id="block-004",
            block_name="Recall Output",
            control_stage="RETRIEVE",
            artifact_type="recall",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="Q: What is the acetabulum?\nA: A cup-shaped socket in the pelvis.",
        )
        assert "---" in result
        assert "note_type: block_recall" in result
        assert "artifact_type: recall" in result

    def test_recall_artifact_includes_recall_content(self) -> None:
        """Recall artifact should include the recall content."""
        recall_content = (
            "Q: What is the acetabulum?\nA: A cup-shaped socket in the pelvis."
        )
        result = render_block_artifact(
            block_id="block-004",
            block_name="Recall Output",
            control_stage="RETRIEVE",
            artifact_type="recall",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content=recall_content,
        )
        assert recall_content in result
        assert "## Recall Output" in result

    def test_recall_artifact_returns_string(self) -> None:
        """Recall artifact should return a non-empty string."""
        result = render_block_artifact(
            block_id="block-004",
            block_name="Recall Output",
            control_stage="RETRIEVE",
            artifact_type="recall",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="Recall output here.",
        )
        assert isinstance(result, str)
        assert len(result) > 0


class TestRenderBlockArtifactCards:
    """Test render_block_artifact() with artifact_type='cards'."""

    def test_cards_artifact_includes_frontmatter(self) -> None:
        """Cards artifact should include YAML frontmatter."""
        result = render_block_artifact(
            block_id="block-005",
            block_name="Anki Cards",
            control_stage="OVERLEARN",
            artifact_type="cards",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="Q: Acetabulum function?\nA: Load transfer and hip stability.",
        )
        assert "---" in result
        assert "note_type: block_cards" in result
        assert "artifact_type: cards" in result

    def test_cards_artifact_includes_cards_content(self) -> None:
        """Cards artifact should include the card content."""
        cards_content = "Q: Acetabulum function?\nA: Load transfer and hip stability."
        result = render_block_artifact(
            block_id="block-005",
            block_name="Anki Cards",
            control_stage="OVERLEARN",
            artifact_type="cards",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content=cards_content,
        )
        assert cards_content in result
        assert "## Anki Card Drafts" in result

    def test_cards_artifact_returns_string(self) -> None:
        """Cards artifact should return a non-empty string."""
        result = render_block_artifact(
            block_id="block-005",
            block_name="Anki Cards",
            control_stage="OVERLEARN",
            artifact_type="cards",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="Card content.",
        )
        assert isinstance(result, str)
        assert len(result) > 0


class TestRenderBlockArtifactFallback:
    """Test render_block_artifact() fallback behavior for unknown types."""

    def test_unknown_artifact_type_falls_back_to_notes(self) -> None:
        """Unknown artifact_type should fall back to notes renderer."""
        result = render_block_artifact(
            block_id="block-999",
            block_name="Unknown Type",
            control_stage="ENCODE",
            artifact_type="unknown-type",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="This should render as notes.",
        )
        assert "note_type: block_notes" in result
        assert "## Notes" in result
        assert "This should render as notes." in result

    def test_empty_artifact_type_falls_back_to_notes(self) -> None:
        """Empty artifact_type should fall back to notes renderer."""
        result = render_block_artifact(
            block_id="block-999",
            block_name="Empty Type",
            control_stage="ENCODE",
            artifact_type="",
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="Fallback content.",
        )
        assert "note_type: block_notes" in result


class TestRenderBlockArtifactAllTypes:
    """Integration tests for all 5 artifact types."""

    @pytest.mark.parametrize(
        "artifact_type,expected_note_type,expected_section",
        [
            ("notes", "block_notes", "## Notes"),
            ("concept-map", "block_diagram", "## Concept Diagram"),
            ("comparison-table", "block_comparison", "## Comparison Table"),
            ("recall", "block_recall", "## Recall Output"),
            ("cards", "block_cards", "## Anki Card Drafts"),
        ],
    )
    def test_all_artifact_types_render_correctly(
        self, artifact_type: str, expected_note_type: str, expected_section: str
    ) -> None:
        """All 5 artifact types should render with correct note_type and section."""
        result = render_block_artifact(
            block_id="block-test",
            block_name="Test Block",
            control_stage="ENCODE",
            artifact_type=artifact_type,
            session_id="sess-001",
            course="PTA 101",
            module="Hip Anatomy",
            topic="Acetabulum",
            started_at="2026-03-01 10:00",
            ended_at="2026-03-01 10:30",
            content="Test content.",
        )
        assert f"note_type: {expected_note_type}" in result
        assert expected_section in result
        assert "---" in result
        assert "block_id: block-test" in result
        assert "artifact_type: " + artifact_type in result

    def test_all_artifact_types_include_frontmatter_and_links(self) -> None:
        """All artifact types should include YAML frontmatter and wiki links."""
        for artifact_type in [
            "notes",
            "concept-map",
            "comparison-table",
            "recall",
            "cards",
        ]:
            result = render_block_artifact(
                block_id="block-test",
                block_name="Test Block",
                control_stage="ENCODE",
                artifact_type=artifact_type,
                session_id="sess-001",
                course="PTA 101",
                module="Hip Anatomy",
                topic="Acetabulum",
                started_at="2026-03-01 10:00",
                ended_at="2026-03-01 10:30",
                content="Content.",
                moc_path="Hip/MOC",
                session_note_path="Sessions/2026-03-01",
            )
            assert "---" in result
            assert "[[Hip/MOC|Map of Contents]]" in result
            assert "[[Sessions/2026-03-01|Session Note]]" in result
