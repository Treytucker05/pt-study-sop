"""Lightweight artifact validators — regex/line-based checks for block outputs.

Validates structured artifacts (Anki cards, Mermaid diagrams) against the
canonical spec in sop/library/research/artifact_spec.md.

Each validator returns a ValidationResult with pass/fail, message, and example.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ValidationResult:
    valid: bool
    block_name: str
    artifact_type: str
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def summary(self) -> str:
        if self.valid:
            return f"[OK] {self.block_name}: {self.artifact_type} output valid"
        lines = [f"[FAIL] {self.block_name}: {self.artifact_type} validation failed"]
        for e in self.errors:
            lines.append(f"  - {e}")
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Anki Card Validator (batch chain format)
# ---------------------------------------------------------------------------

ANKI_EXAMPLE = (
    "CARD 1:\n"
    "TYPE: basic\n"
    "FRONT: What is the primary action of the supraspinatus?\n"
    "BACK: Initiates shoulder abduction (first 15 degrees)\n"
    "TAGS: anatomy, shoulder"
)

_CARD_HEADER_RE = re.compile(r"^\s*CARD\s+\d+\s*:", re.IGNORECASE)
_FRONT_RE = re.compile(r"^\s*FRONT\s*:\s*(.+)", re.IGNORECASE)
_BACK_RE = re.compile(r"^\s*BACK\s*:\s*(.+)", re.IGNORECASE)
_TYPE_RE = re.compile(r"^\s*TYPE\s*:\s*(.+)", re.IGNORECASE)
_CLOZE_RE = re.compile(r"\{\{c\d+::")


def validate_anki_cards(output: str, block_name: str = "Anki Card Draft") -> ValidationResult:
    """Validate output matches the batch Anki card format."""
    result = ValidationResult(valid=True, block_name=block_name, artifact_type="cards")

    if not output or not output.strip():
        result.valid = False
        result.errors.append(f"Empty output. Expected format:\n{ANKI_EXAMPLE}")
        return result

    # Count cards by FRONT+BACK pairs
    cards_found = 0
    has_front = False
    has_back = False
    current_type = ""

    for line in output.split("\n"):
        stripped = line.strip()

        if _CARD_HEADER_RE.match(stripped):
            if has_front and has_back:
                cards_found += 1
            has_front = False
            has_back = False
            current_type = ""

        type_match = _TYPE_RE.match(stripped)
        if type_match:
            current_type = type_match.group(1).strip().lower()
            if current_type not in ("basic", "cloze"):
                result.warnings.append(
                    f"Unexpected TYPE '{current_type}' — expected 'basic' or 'cloze'"
                )

        front_match = _FRONT_RE.match(stripped)
        if front_match:
            has_front = True
            front_text = front_match.group(1).strip()
            if current_type == "cloze" and not _CLOZE_RE.search(front_text):
                result.warnings.append(
                    f"Cloze card missing {{{{c1::...}}}} in FRONT: {front_text[:60]}"
                )

        if _BACK_RE.match(stripped):
            has_back = True

    # Final card
    if has_front and has_back:
        cards_found += 1

    if cards_found == 0:
        result.valid = False
        result.errors.append(
            f"No valid cards found (need FRONT: + BACK: per card). "
            f"Expected format:\n{ANKI_EXAMPLE}"
        )

    return result


# ---------------------------------------------------------------------------
# Mermaid Validator
# ---------------------------------------------------------------------------

MERMAID_EXAMPLE = (
    '```mermaid\n'
    'graph TD\n'
    '    A["Main Topic"]\n'
    '    B["Subtopic"]\n'
    '    A --> B\n'
    '```'
)

_MERMAID_FENCE_RE = re.compile(r"```mermaid\s*\n([\s\S]*?)```", re.IGNORECASE)
_GRAPH_HEADER_RE = re.compile(r"^\s*graph\s+(TD|TB|LR|RL|BT)\s*$", re.IGNORECASE)
_NODE_RE = re.compile(r"^\s*(\w+)\s*[\[\(\{]")
_EDGE_RE = re.compile(r"^\s*(\w+)\s*-->")
_SKIP_RE = re.compile(r"^\s*(subgraph|end|style|class|classDef|linkStyle)\b", re.IGNORECASE)


def validate_mermaid(output: str, block_name: str = "Concept Map") -> ValidationResult:
    """Validate output contains a parseable Mermaid graph."""
    result = ValidationResult(valid=True, block_name=block_name, artifact_type="mermaid")

    if not output or not output.strip():
        result.valid = False
        result.errors.append(f"Empty output. Expected format:\n{MERMAID_EXAMPLE}")
        return result

    fences = _MERMAID_FENCE_RE.findall(output)
    if not fences:
        result.valid = False
        result.errors.append(
            "No ```mermaid fence found. Wrap diagram in:\n"
            "```mermaid\\n...\\n```"
        )
        return result

    for i, block in enumerate(fences):
        lines = [l.strip() for l in block.strip().split("\n") if l.strip()]
        if not lines:
            result.errors.append(f"Mermaid block {i + 1} is empty")
            result.valid = False
            continue

        # Check graph header
        if not _GRAPH_HEADER_RE.match(lines[0]):
            if lines[0].lower().startswith("flowchart"):
                result.warnings.append(
                    f"Block {i + 1}: 'flowchart' keyword not supported by parser — use 'graph TD' instead"
                )
            else:
                result.errors.append(
                    f"Block {i + 1}: first line must be 'graph TD|TB|LR|RL' — got: {lines[0][:60]}"
                )
                result.valid = False

        # Count nodes and edges
        node_count = 0
        edge_count = 0
        for line in lines[1:]:
            if _SKIP_RE.match(line):
                continue
            if _EDGE_RE.match(line):
                edge_count += 1
            elif _NODE_RE.match(line):
                node_count += 1

        if node_count == 0 and edge_count == 0:
            result.errors.append(
                f"Block {i + 1}: no nodes or edges found. "
                f"Expected format:\n{MERMAID_EXAMPLE}"
            )
            result.valid = False
        elif edge_count == 0:
            result.warnings.append(f"Block {i + 1}: no edges found — diagram has isolated nodes")

    return result


# ---------------------------------------------------------------------------
# Markdown Table Validator (lightweight)
# ---------------------------------------------------------------------------

_TABLE_SEP_RE = re.compile(r"^\s*\|[\s\-:|]+\|\s*$")


def validate_markdown_table(output: str, block_name: str = "Comparison Table") -> ValidationResult:
    """Validate output contains at least one markdown table."""
    result = ValidationResult(valid=True, block_name=block_name, artifact_type="comparison-table")

    if not output or not output.strip():
        result.valid = False
        result.errors.append("Empty output. Expected a markdown table with | delimiters.")
        return result

    has_separator = False
    pipe_rows = 0
    for line in output.split("\n"):
        stripped = line.strip()
        if _TABLE_SEP_RE.match(stripped):
            has_separator = True
        if stripped.startswith("|") and stripped.endswith("|"):
            pipe_rows += 1

    if not has_separator or pipe_rows < 3:
        result.valid = False
        result.errors.append(
            "No valid markdown table found. Expected:\n"
            "| Feature | A | B |\n"
            "|---------|---|---|\n"
            "| ... | ... | ... |"
        )

    return result


# ---------------------------------------------------------------------------
# Dispatcher — validate based on artifact_type
# ---------------------------------------------------------------------------

# artifact_type values that have machine-readable parsers
_VALIDATORS = {
    "cards": validate_anki_cards,
    "concept-map": validate_mermaid,
    "flowchart": validate_mermaid,
    "decision-tree": validate_mermaid,
    "comparison-table": validate_markdown_table,
}


def validate_step_output(
    block: dict, output: str
) -> Optional[ValidationResult]:
    """Validate a block's output if the block declares a machine-readable artifact_type.

    Returns None if the block has no parseable artifact_type (no validation needed).
    """
    artifact_type = block.get("artifact_type", "")
    if not artifact_type or artifact_type not in _VALIDATORS:
        return None

    validator = _VALIDATORS[artifact_type]
    return validator(output, block_name=block.get("name", "Unknown"))
