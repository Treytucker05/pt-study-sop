"""Chain Validator --checks CP-MSS stage ordering rules.

Validates that chains follow sound control-plane sequencing:
  PRIME -> TEACH -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN

Violations flagged:
  - TEACH before PRIME or after downstream stages
  - CALIBRATE before TEACH when both are present, unless the chain uses the
    locked first-exposure opening MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE
  - Retrieval before any prior ENCODE/REFERENCE (unless diagnostic Pre-Test)
  - Overlearning without prior Encoding/Reference/Retrieval
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from pero_mapping import get_exception_flags


# Canonical CP-MSS v2.0 order.
CONTROL_STAGE_ORDER = {
    "PRIME": 0,
    "TEACH": 1,
    "CALIBRATE": 2,
    "ENCODE": 3,
    "REFERENCE": 4,
    "RETRIEVE": 5,
    "OVERLEARN": 6,
}

CONTROL_STAGE_LABELS = {stage: stage.title() for stage in CONTROL_STAGE_ORDER}


# 2026-04-21 vault hardening expanded the operational stage taxonomy
# (PLAN, ORIENT, EXPLAIN, ELABORATE, INTERLEAVE, CONSOLIDATE). The chain
# validator routes these to the legacy 7-stage runtime vocabulary so
# coverage and stage-order checks continue to operate against PRIME /
# TEACH / CALIBRATE / ENCODE / REFERENCE / RETRIEVE / OVERLEARN. The
# richer taxonomy stays visible in the YAML specs themselves.
_RUNTIME_STAGE_EQUIVALENT = {
    "PLAN": "PRIME",
    "ORIENT": "PRIME",
    "PRIME": "PRIME",
    "TEACH": "TEACH",
    "EXPLAIN": "TEACH",
    "CALIBRATE": "CALIBRATE",
    "ENCODE": "ENCODE",
    "ELABORATE": "REFERENCE",
    "INTERLEAVE": "REFERENCE",
    "REFERENCE": "REFERENCE",
    "CONSOLIDATE": "REFERENCE",
    "RETRIEVE": "RETRIEVE",
    "OVERLEARN": "OVERLEARN",
}


def _normalize_control_stage(block: dict[str, Any]) -> str:
    raw_stage = str(block.get("control_stage") or "").strip().upper()
    if raw_stage:
        return _RUNTIME_STAGE_EQUIVALENT.get(raw_stage, raw_stage)
    raw_category = str(block.get("category") or "").strip().lower()
    return {
        "plan": "PRIME",
        "orient": "PRIME",
        "prime": "PRIME",
        "teach": "TEACH",
        "explain": "TEACH",
        "calibrate": "CALIBRATE",
        "prepare": "PRIME",
        "encode": "ENCODE",
        "elaborate": "REFERENCE",
        "interleave": "REFERENCE",
        "reference": "REFERENCE",
        "consolidate": "REFERENCE",
        "retrieve": "RETRIEVE",
        "refine": "RETRIEVE",
        "overlearn": "OVERLEARN",
    }.get(raw_category, "ENCODE")


def _stage_coverage(sequence: list[dict[str, str]]) -> dict[str, bool]:
    seen = {step["stage"] for step in sequence}
    return {stage: stage in seen for stage in CONTROL_STAGE_ORDER}


def summarize_stage_truth(blocks: list[dict[str, Any]]) -> dict[str, Any]:
    """Return normalized stage truth for a chain-like block sequence.

    The runtime uses a simplified `selected_blocks` list for selector metadata
    and UI summaries. That list must come from the actual block sequence,
    not a hand-maintained approximation.
    """
    sequence = [
        {
            "name": str(block.get("name") or ""),
            "stage": _normalize_control_stage(block),
        }
        for block in blocks
    ]
    stage_sequence = [step["stage"] for step in sequence]

    selected_blocks: list[str] = []
    for stage in stage_sequence:
        if stage not in selected_blocks:
            selected_blocks.append(stage)

    return {
        "sequence": sequence,
        "stage_sequence": stage_sequence,
        "selected_blocks": selected_blocks,
        "stage_coverage": _stage_coverage(sequence),
    }


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

_DIAGNOSTIC_METHODS = {"Pre-Test"}
_OPENING_MICRO_CALIBRATE_METHODS = {"Micro Precheck"}


def _is_allowed_opening_micro_calibrate(
    sequence: list[dict[str, str]],
    index: int,
) -> bool:
    """Return True when a CALIBRATE step is the allowed opening micro-check.

    Canon rule:
      MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE

    We allow CALIBRATE before TEACH only when the pre-TEACH CALIBRATE block is
    an explicit opening micro-calibrate step, no downstream stages have already
    started, and the chain also contains a later CALIBRATE block after TEACH.
    """
    step = sequence[index]
    if step["stage"] != "CALIBRATE":
        return False

    if step["name"] not in _OPENING_MICRO_CALIBRATE_METHODS:
        return False

    prior_steps = sequence[:index]
    if any(prev["stage"] not in {"PRIME", "CALIBRATE"} for prev in prior_steps):
        return False

    if any(
        prev["stage"] == "CALIBRATE"
        and prev["name"] not in _OPENING_MICRO_CALIBRATE_METHODS
        for prev in prior_steps
    ):
        return False

    later_teach_idx = next(
        (j for j in range(index + 1, len(sequence)) if sequence[j]["stage"] == "TEACH"),
        None,
    )
    if later_teach_idx is None:
        return False

    return any(
        later["stage"] == "CALIBRATE" for later in sequence[later_teach_idx + 1 :]
    )


def validate_chain(
    chain_name: str,
    blocks: list[dict],
    chain_id: int | None = None,
) -> ChainReport:
    """Validate a chain's PERO stage ordering.

    Args:
        chain_name: display name of the chain
        blocks: list of block dicts with "name" and either "control_stage" or "category"
        chain_id: optional DB id

    Returns:
        ChainReport with violations, warnings, and stage info.
    """
    report = ChainReport(chain_name=chain_name, chain_id=chain_id)

    if not blocks:
        report.valid = False
        report.violations.append("Chain has no blocks")
        return report

    stage_truth = summarize_stage_truth(blocks)
    sequence = stage_truth["sequence"]
    report.stage_sequence = stage_truth["stage_sequence"]
    report.stage_coverage = stage_truth["stage_coverage"]
    report.exception_flags = get_exception_flags(blocks)

    has_encode_or_reference = False
    has_retrieval = False
    has_diagnostic = False
    seen_teach = False
    method_names = {b.get("name", "") for b in blocks}
    has_diagnostic = bool(_DIAGNOSTIC_METHODS & method_names)

    for i, step in enumerate(sequence):
        stage = step["stage"]
        name = step["name"]

        if stage not in CONTROL_STAGE_ORDER:
            report.violations.append(
                f"Step {i + 1} '{name}' has unknown control stage '{stage}'"
            )
            continue

        if stage == "TEACH":
            seen_teach = True
            prior_prime = any(prev["stage"] == "PRIME" for prev in sequence[:i])
            if not prior_prime:
                report.violations.append(
                    f"Step {i + 1} '{name}' is TEACH before PRIME"
                )
            has_invalid_prior_downstream = any(
                prev["stage"] in {"ENCODE", "REFERENCE", "RETRIEVE", "OVERLEARN"}
                or (
                    prev["stage"] == "CALIBRATE"
                    and not _is_allowed_opening_micro_calibrate(sequence, prev_idx)
                )
                for prev_idx, prev in enumerate(sequence[:i])
            )
            if has_invalid_prior_downstream:
                report.violations.append(
                    f"Step {i + 1} '{name}' is TEACH after downstream stages"
                )

        if stage == "CALIBRATE" and any(prev["stage"] == "TEACH" for prev in sequence[i + 1:]):
            if not _is_allowed_opening_micro_calibrate(sequence, i):
                report.violations.append(
                    f"Step {i + 1} '{name}' is CALIBRATE before TEACH"
                )

        if stage in {"ENCODE", "REFERENCE"}:
            has_encode_or_reference = True

        if stage == "RETRIEVE":
            if not has_encode_or_reference and not has_diagnostic:
                report.violations.append(
                    f"Step {i + 1} '{name}' is RETRIEVE before any ENCODE or REFERENCE "
                    f"(no diagnostic Pre-Test to justify early retrieval)"
                )
            has_retrieval = True

        if stage == "OVERLEARN":
            if not has_encode_or_reference and not has_retrieval:
                report.violations.append(
                    f"Step {i + 1} '{name}' is OVERLEARN with no prior "
                    f"ENCODE, REFERENCE, or RETRIEVE"
                )

    if not report.stage_coverage.get("RETRIEVE") and not report.stage_coverage.get("OVERLEARN"):
        report.warnings.append(
            "Chain has no RETRIEVE or OVERLEARN stage --learning may not be consolidated"
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
    cursor.execute("SELECT id, name, category, control_stage FROM method_blocks")
    block_lookup = {
        row["id"]: {
            "name": row["name"],
            "category": row["category"],
            "control_stage": row["control_stage"],
        }
        for row in cursor.fetchall()
    }

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

    lines.append("CP-MSS Chain Validation Report")
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
        for stage, label in CONTROL_STAGE_LABELS.items():
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
