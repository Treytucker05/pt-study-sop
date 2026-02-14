"""Smoke tests for artifact validators — Anki cards, Mermaid diagrams, markdown tables."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from artifact_validators import (
    validate_anki_cards,
    validate_mermaid,
    validate_markdown_table,
    validate_step_output,
    ValidationResult,
)


# ---------------------------------------------------------------------------
# Anki Card Validator
# ---------------------------------------------------------------------------

class TestValidateAnkiCards:
    def test_valid_basic_cards(self):
        output = (
            "CARD 1:\n"
            "TYPE: basic\n"
            "FRONT: What is the GH joint?\n"
            "BACK: Ball and socket joint of the shoulder\n"
            "TAGS: anatomy, shoulder\n"
            "\n"
            "CARD 2:\n"
            "TYPE: basic\n"
            "FRONT: What stabilizes the GH joint?\n"
            "BACK: Rotator cuff muscles\n"
            "TAGS: anatomy, shoulder\n"
        )
        result = validate_anki_cards(output)
        assert result.valid is True
        assert len(result.errors) == 0

    def test_valid_cloze_card(self):
        output = (
            "CARD 1:\n"
            "TYPE: cloze\n"
            "FRONT: The {{c1::supraspinatus}} initiates abduction\n"
            "BACK: Supraspinatus muscle\n"
            "TAGS: anatomy\n"
        )
        result = validate_anki_cards(output)
        assert result.valid is True

    def test_cloze_missing_syntax_warns(self):
        output = (
            "CARD 1:\n"
            "TYPE: cloze\n"
            "FRONT: The supraspinatus initiates abduction\n"
            "BACK: Supraspinatus\n"
        )
        result = validate_anki_cards(output)
        assert result.valid is True  # Still valid (FRONT+BACK present)
        assert any("c1::" in w for w in result.warnings)

    def test_empty_output_fails(self):
        result = validate_anki_cards("")
        assert result.valid is False
        assert len(result.errors) == 1

    def test_no_cards_fails(self):
        output = "Here are some study tips:\n- Review daily\n- Use active recall"
        result = validate_anki_cards(output)
        assert result.valid is False
        assert "No valid cards" in result.errors[0]

    def test_missing_back_fails(self):
        output = "CARD 1:\nTYPE: basic\nFRONT: What is the ACL?\n"
        result = validate_anki_cards(output)
        assert result.valid is False

    def test_case_insensitive(self):
        output = "card 1:\ntype: basic\nfront: Question?\nback: Answer\n"
        result = validate_anki_cards(output)
        assert result.valid is True

    def test_unexpected_type_warns(self):
        output = "CARD 1:\nTYPE: matching\nFRONT: Q?\nBACK: A\n"
        result = validate_anki_cards(output)
        assert result.valid is True
        assert any("matching" in w for w in result.warnings)


# ---------------------------------------------------------------------------
# Mermaid Validator
# ---------------------------------------------------------------------------

class TestValidateMermaid:
    def test_valid_graph_td(self):
        output = (
            "```mermaid\n"
            "graph TD\n"
            '    A["Shoulder Complex"]\n'
            '    B["GH Joint"]\n'
            '    C["AC Joint"]\n'
            "    A --> B\n"
            "    A --> C\n"
            "```"
        )
        result = validate_mermaid(output)
        assert result.valid is True
        assert len(result.errors) == 0

    def test_valid_with_labeled_edges(self):
        output = (
            "```mermaid\n"
            "graph LR\n"
            '    A["ACL"]\n'
            '    B["Tibial Translation"]\n'
            "    A -->|resists| B\n"
            "```"
        )
        result = validate_mermaid(output)
        assert result.valid is True

    def test_no_fence_fails(self):
        output = (
            "graph TD\n"
            '    A["Topic"]\n'
            '    B["Detail"]\n'
            "    A --> B\n"
        )
        result = validate_mermaid(output)
        assert result.valid is False
        assert "fence" in result.errors[0].lower()

    def test_flowchart_keyword_warns(self):
        output = (
            "```mermaid\n"
            "flowchart TD\n"
            '    A["Topic"]\n'
            '    B["Detail"]\n'
            "    A --> B\n"
            "```"
        )
        result = validate_mermaid(output)
        assert any("flowchart" in w.lower() for w in result.warnings)

    def test_empty_block_fails(self):
        output = "```mermaid\n\n```"
        result = validate_mermaid(output)
        assert result.valid is False

    def test_empty_output_fails(self):
        result = validate_mermaid("")
        assert result.valid is False

    def test_no_edges_warns(self):
        output = (
            "```mermaid\n"
            "graph TD\n"
            '    A["Topic"]\n'
            '    B["Detail"]\n'
            "```"
        )
        result = validate_mermaid(output)
        assert result.valid is True  # Nodes exist
        assert any("no edges" in w.lower() for w in result.warnings)

    def test_surrounding_text_ok(self):
        output = (
            "Here is the concept map:\n\n"
            "```mermaid\n"
            "graph TD\n"
            '    A["Main"]\n'
            "    A --> B\n"
            "```\n\n"
            "This shows the relationships."
        )
        result = validate_mermaid(output)
        assert result.valid is True


# ---------------------------------------------------------------------------
# Markdown Table Validator
# ---------------------------------------------------------------------------

class TestValidateMarkdownTable:
    def test_valid_table(self):
        output = (
            "| Feature | Ligament A | Ligament B |\n"
            "|---------|-----------|------------|\n"
            "| Location | Anterior | Posterior |\n"
            "| Function | Resist translation | Resist rotation |\n"
        )
        result = validate_markdown_table(output)
        assert result.valid is True

    def test_no_table_fails(self):
        output = "Here are the differences:\n- A is anterior\n- B is posterior"
        result = validate_markdown_table(output)
        assert result.valid is False

    def test_empty_fails(self):
        result = validate_markdown_table("")
        assert result.valid is False


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

class TestValidateStepOutput:
    def test_dispatches_cards(self):
        block = {"name": "Anki Card Draft", "artifact_type": "cards"}
        output = "CARD 1:\nTYPE: basic\nFRONT: Q?\nBACK: A\n"
        result = validate_step_output(block, output)
        assert result is not None
        assert result.valid is True
        assert result.artifact_type == "cards"

    def test_dispatches_mermaid(self):
        block = {"name": "Concept Map", "artifact_type": "concept-map"}
        output = '```mermaid\ngraph TD\n    A["X"]\n    A --> B\n```'
        result = validate_step_output(block, output)
        assert result is not None
        assert result.valid is True

    def test_returns_none_for_outline(self):
        block = {"name": "Brain Dump", "artifact_type": "outline"}
        result = validate_step_output(block, "some text")
        assert result is None

    def test_returns_none_for_no_artifact_type(self):
        block = {"name": "Pre-Test", "artifact_type": ""}
        result = validate_step_output(block, "some text")
        assert result is None

    def test_returns_none_for_missing_key(self):
        block = {"name": "Brain Dump"}
        result = validate_step_output(block, "some text")
        assert result is None
