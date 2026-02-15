from __future__ import annotations

from typing import Any


STAGES = ["priming", "encoding", "reference", "retrieval", "overlearning"]


def grade_chain_run(
    block_logs: list[dict], chain_meta: dict | None = None
) -> dict[str, Any]:
    chain_meta = chain_meta or {}
    stage_scores = {stage: 0 for stage in STAGES}
    flags: list[str] = []

    stages_present = {stage: False for stage in STAGES}
    for record in block_logs:
        stage = record.get("display_stage")
        if stage in stages_present:
            stages_present[stage] = True

    for stage, present in stages_present.items():
        stage_scores[stage] = 20 if present else 0

    overall_score = sum(stage_scores.values())

    if any(record.get("success") is False for record in block_logs):
        flags.append("block_failure")
        overall_score = max(0, overall_score - 10)

    if any(record.get("artifact_valid") is False for record in block_logs):
        if "artifact_failure" not in flags:
            flags.append("artifact_failure")
        overall_score = min(overall_score, 50)

    if not stages_present.get("retrieval"):
        flags.append("missing_retrieval")

    chain_id = str(chain_meta.get("chain_id", ""))
    chain_name = str(chain_meta.get("chain_name", ""))
    is_first_exposure = (
        chain_id.startswith("C-FE")
        or chain_id.startswith("C-QF")
        or ("first exposure" in chain_name.lower())
    )
    if is_first_exposure and not stages_present.get("encoding"):
        flags.append("missing_encoding_first_exposure")

    return {
        "overall_score": int(overall_score),
        "stage_scores": stage_scores,
        "flags": flags,
    }
