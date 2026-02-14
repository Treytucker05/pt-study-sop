"""Structured logging and grading for chain block executions.

Logs block runs as newline-delimited JSON to logs/block_runs.jsonl.
Grades chain runs using PERO stage coverage and simple heuristic rules.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from pero_mapping import get_pero_stage, PERO_STAGES, PERO_LABELS

_LOGS_DIR = Path(__file__).resolve().parent.parent / "logs"
_BLOCK_RUNS_FILE = _LOGS_DIR / "block_runs.jsonl"


def log_block_run(
    *,
    chain_id: int,
    chain_name: str,
    run_id: int,
    block_id: int,
    block_name: str,
    category: str,
    duration_seconds: float,
    success: bool,
    artifact_validation_pass: Optional[bool] = None,
    accuracy: Optional[float] = None,
    misses_count: Optional[int] = None,
    interleaving_used: bool = False,
    spacing_interval_days: Optional[int] = None,
    repair_invoked: bool = False,
) -> dict[str, Any]:
    """Log a single block execution. Appends to logs/block_runs.jsonl."""
    pero_stage = get_pero_stage(block_name, category)

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "chain_id": chain_id,
        "chain_name": chain_name,
        "block_id": block_id,
        "block_name": block_name,
        "category": category,
        "pero_stage": pero_stage,
        "duration_seconds": round(duration_seconds, 2),
        "success": success,
        "artifact_validation_pass": artifact_validation_pass,
        "accuracy": accuracy,
        "misses_count": misses_count,
        "interleaving_used": interleaving_used,
        "spacing_interval_days": spacing_interval_days,
        "repair_invoked": repair_invoked,
    }

    _LOGS_DIR.mkdir(parents=True, exist_ok=True)
    with open(_BLOCK_RUNS_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

    return record


def load_run_logs(run_id: Optional[int] = None) -> list[dict]:
    """Load block run logs, optionally filtered by run_id.

    If run_id is None, returns the most recent run's logs (by highest run_id).
    """
    if not _BLOCK_RUNS_FILE.exists():
        return []

    all_records: list[dict] = []
    with open(_BLOCK_RUNS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                all_records.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    if not all_records:
        return []

    if run_id is not None:
        return [r for r in all_records if r.get("run_id") == run_id]

    # Find highest run_id
    max_run_id = max(r.get("run_id", 0) for r in all_records)
    return [r for r in all_records if r.get("run_id") == max_run_id]


def grade_chain_run(log_records: list[dict]) -> dict[str, Any]:
    """Grade a chain run from its block log records.

    Returns:
        {
            "overall_score": 0-100,
            "stage_scores": {"P": 0-100, "E": ..., "R": ..., "O": ...},
            "flags": [...],
            "stage_coverage": {"P": bool, ...},
            "blocks_total": int,
            "blocks_passed": int,
        }
    """
    if not log_records:
        return {
            "overall_score": 0,
            "stage_scores": {s: 0 for s in PERO_STAGES},
            "flags": ["no_log_records"],
            "stage_coverage": {s: False for s in PERO_STAGES},
            "blocks_total": 0,
            "blocks_passed": 0,
        }

    flags: list[str] = []
    chain_name = log_records[0].get("chain_name", "")

    # Group blocks by PERO stage
    stage_blocks: dict[str, list[dict]] = {s: [] for s in PERO_STAGES}
    for rec in log_records:
        stage = rec.get("pero_stage", "E")
        if stage in stage_blocks:
            stage_blocks[stage].append(rec)

    # Stage coverage
    stage_coverage = {s: len(blocks) > 0 for s, blocks in stage_blocks.items()}
    missing_stages = [s for s, present in stage_coverage.items() if not present]
    for ms in missing_stages:
        flags.append(f"missing_stage_{PERO_LABELS[ms]}")

    # Check: first-exposure chains should have Priming + Encoding
    ctx_tags = log_records[0].get("context_tags", {})
    is_first_exposure = "first" in chain_name.lower() or "intake" in chain_name.lower()
    if is_first_exposure:
        if not stage_coverage.get("P"):
            flags.append("missing_priming_in_first_exposure")
        if not stage_coverage.get("E"):
            flags.append("missing_encoding_in_first_exposure")

    # Score per stage
    stage_scores: dict[str, float] = {}
    for stage in PERO_STAGES:
        blocks = stage_blocks[stage]
        if not blocks:
            stage_scores[stage] = 0
            continue

        block_scores = []
        for b in blocks:
            score = 100 if b.get("success") else 0
            # Artifact validation penalty
            if b.get("artifact_validation_pass") is False:
                score = max(0, score - 30)
                if "artifact_failures" not in flags:
                    flags.append("artifact_failures")
            block_scores.append(score)

        stage_scores[stage] = round(sum(block_scores) / len(block_scores), 1)

    # Retrieval accuracy check
    retrieval_blocks = stage_blocks.get("R", [])
    accuracies = [b["accuracy"] for b in retrieval_blocks if b.get("accuracy") is not None]
    if accuracies:
        avg_accuracy = sum(accuracies) / len(accuracies)
        if avg_accuracy < 70:
            flags.append("low_retrieval_accuracy")
            # Check if repair was invoked
            any_repair = any(b.get("repair_invoked") for b in log_records)
            if not any_repair:
                flags.append("no_repair_after_low_accuracy")
        elif avg_accuracy > 95:
            flags.append("retrieval_too_easy")

    # Early retrieval exception (Pre-Test in P stage doing diagnostic retrieval)
    for rec in log_records:
        if rec.get("block_name") == "Pre-Test" and rec.get("pero_stage") == "P":
            if rec.get("accuracy") is not None and rec["accuracy"] < 30:
                if "early_retrieval_exception" not in flags:
                    flags.append("early_retrieval_exception")

    # High error rate
    total = len(log_records)
    failed = sum(1 for r in log_records if not r.get("success"))
    if total > 0 and (failed / total) > 0.3:
        flags.append("high_error_rate")

    # Overall score: weighted average of stage scores with coverage bonus
    present_stages = [s for s in PERO_STAGES if stage_coverage[s]]
    if present_stages:
        raw_avg = sum(stage_scores[s] for s in present_stages) / len(present_stages)
        coverage_bonus = (len(present_stages) / len(PERO_STAGES)) * 20
        overall = min(100, round(raw_avg * 0.8 + coverage_bonus, 1))
    else:
        overall = 0

    # Penalty for critical flags
    if "artifact_failures" in flags:
        overall = max(0, overall - 10)
    if "high_error_rate" in flags:
        overall = max(0, overall - 15)

    blocks_passed = sum(1 for r in log_records if r.get("success"))

    return {
        "overall_score": overall,
        "stage_scores": {s: stage_scores[s] for s in PERO_STAGES},
        "flags": flags,
        "stage_coverage": stage_coverage,
        "blocks_total": total,
        "blocks_passed": blocks_passed,
    }
