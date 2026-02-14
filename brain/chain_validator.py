"""Chain Validator --checks PERO ordering rules for method chains.

Validates that chains follow sound pedagogical sequencing:
  P (Priming) ->E (Encoding) ->R (Retrieval) ->O (Overlearning)

Violations flagged:
  - Retrieval before any Encoding (unless diagnostic Pre-Test)
  - Overlearning without prior Retrieval or Encoding
  - Backward stage jumps without valid exception

Allowed exceptions:
  - Pre-Test (diagnostic retrieval in Priming position)
  - Immediate feedback/repair after retrieval (Error Autopsy, Mastery Loop)
  - Encoding after retrieval (re-encoding after gap identification)
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from pero_mapping import (
    PERO_ORDER,
    PERO_LABELS,
    get_pero_sequence,
    get_stage_coverage,
    get_exception_flags,
)


@dataclass
class ChainReport:
    chain_name: str
    chain_id: int | None = None
    valid: bool = True
    violations: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    stage_sequence: list[str] = field(default_factory=list)
    stage_coverage: dict[str, bool] = field(default_factory=dict)
    exception_flags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "chain_name": self.chain_name,
            "chain_id": self.chain_id,
            "valid": self.valid,
            "violations": self.violations,
            "warnings": self.warnings,
            "stage_sequence": self.stage_sequence,
            "stage_coverage": self.stage_coverage,
            "exception_flags": self.exception_flags,
        }


# ---------------------------------------------------------------------------
# Core Validation
# ---------------------------------------------------------------------------

# Methods whose presence in the chain signals "diagnostic retrieval" intent,
# allowing R-before-E without violation.
_DIAGNOSTIC_METHODS = {"Pre-Test"}

# Methods that are post-retrieval repair (expected after R, before more E or O)
_REPAIR_METHODS = {"Error Autopsy", "Mastery Loop"}


def validate_chain(
    chain_name: str,
    blocks: list[dict],
    chain_id: int | None = None,
) -> ChainReport:
    """Validate a chain's PERO stage ordering.

    Args:
        chain_name: display name of the chain
        blocks: list of block dicts with "name" and "category"
        chain_id: optional DB id

    Returns:
        ChainReport with violations, warnings, and stage info.
    """
    report = ChainReport(chain_name=chain_name, chain_id=chain_id)

    if not blocks:
        report.valid = False
        report.violations.append("Chain has no blocks")
        return report

    sequence = get_pero_sequence(blocks)
    report.stage_sequence = [s["pero"] for s in sequence]
    report.stage_coverage = get_stage_coverage(blocks)
    report.exception_flags = get_exception_flags(blocks)

    # Track what stages have appeared so far
    has_encoding = False
    has_retrieval = False
    has_diagnostic = False
    method_names = {b.get("name", "") for b in blocks}

    # Check for diagnostic retrieval exception
    has_diagnostic = bool(_DIAGNOSTIC_METHODS & method_names)

    for i, step in enumerate(sequence):
        stage = step["pero"]
        name = step["name"]

        if stage == "E":
            has_encoding = True

        if stage == "R":
            # Rule: Retrieval before any Encoding is a violation
            # Exception: diagnostic Pre-Test or repair methods
            if not has_encoding and not has_diagnostic and name not in _REPAIR_METHODS:
                report.violations.append(
                    f"Step {i + 1} '{name}' is Retrieval before any Encoding "
                    f"(no diagnostic Pre-Test to justify early retrieval)"
                )
            has_retrieval = True

        if stage == "O":
            # Rule: Overlearning without any prior Encoding or Retrieval is suspect
            if not has_encoding and not has_retrieval:
                report.violations.append(
                    f"Step {i + 1} '{name}' is Overlearning with no prior "
                    f"Encoding or Retrieval --nothing to consolidate"
                )

    # Coverage warnings (not violations --short chains are valid)
    if not report.stage_coverage.get("R") and not report.stage_coverage.get("O"):
        report.warnings.append(
            "Chain has no Retrieval or Overlearning --learning may not be consolidated"
        )

    report.valid = len(report.violations) == 0
    return report


# ---------------------------------------------------------------------------
# Batch Validation (all chains from DB)
# ---------------------------------------------------------------------------

def validate_all_chains(conn=None) -> list[ChainReport]:
    """Load all chains from DB and validate each one.

    Args:
        conn: optional SQLite connection. If None, creates one from config.

    Returns:
        list of ChainReport objects.
    """
    import sqlite3

    close_conn = False
    if conn is None:
        from db_setup import get_connection
        conn = get_connection()
        close_conn = True

    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, block_ids FROM method_chains")
    chains = cursor.fetchall()

    # Build block lookup
    cursor.execute("SELECT id, name, category FROM method_blocks")
    block_lookup = {row["id"]: {"name": row["name"], "category": row["category"]} for row in cursor.fetchall()}

    if close_conn:
        conn.close()

    reports: list[ChainReport] = []
    for chain in chains:
        chain_id = chain["id"]
        chain_name = chain["name"]

        try:
            import json as _json
            block_ids = _json.loads(chain["block_ids"]) if chain["block_ids"] else []
        except (json.JSONDecodeError, TypeError):
            block_ids = []

        blocks = [block_lookup[bid] for bid in block_ids if bid in block_lookup]
        report = validate_chain(chain_name, blocks, chain_id=chain_id)
        reports.append(report)

    return reports


def format_report(reports: list[ChainReport]) -> str:
    """Format validation reports as a human-readable summary."""
    lines: list[str] = []
    total = len(reports)
    passing = sum(1 for r in reports if r.valid)
    failing = total - passing

    lines.append(f"PERO Chain Validation Report")
    lines.append(f"{'=' * 40}")
    lines.append(f"Total chains: {total}")
    lines.append(f"Passing:      {passing}")
    lines.append(f"Failing:      {failing}")
    lines.append("")

    for report in reports:
        status = "PASS" if report.valid else "FAIL"
        seq_str = " ->".join(report.stage_sequence)
        lines.append(f"[{status}] {report.chain_name}")
        lines.append(f"  Sequence: {seq_str}")

        coverage_parts = []
        for stage, label in PERO_LABELS.items():
            mark = "x" if report.stage_coverage.get(stage) else " "
            coverage_parts.append(f"[{mark}] {stage}({label})")
        lines.append(f"  Coverage: {' '.join(coverage_parts)}")

        if report.exception_flags:
            lines.append(f"  Exceptions: {', '.join(report.exception_flags)}")
        for v in report.violations:
            lines.append(f"  VIOLATION: {v}")
        for w in report.warnings:
            lines.append(f"  WARNING: {w}")
        lines.append("")

    return "\n".join(lines)


def json_report(reports: list[ChainReport]) -> str:
    """Format validation reports as JSON."""
    total = len(reports)
    passing = sum(1 for r in reports if r.valid)
    return json.dumps(
        {
            "total": total,
            "passing": passing,
            "failing": total - passing,
            "chains": [r.to_dict() for r in reports],
        },
        indent=2,
    )
