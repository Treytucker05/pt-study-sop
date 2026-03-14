from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

from learner_profile import get_profile_claims, get_profile_summary

ALLOWED_ADAPTIVE_FIELDS = (
    "pacing",
    "scaffoldDepth",
    "retrievalIntensity",
    "explanationDensity",
    "hintBudget",
    "checkpointFrequency",
    "wrapStyle",
)

FORBIDDEN_ADAPTIVE_FIELDS = (
    "controlStageOrder",
    "sourceLockPolicy",
    "factualTruthPolicy",
    "chainRuleAuthority",
    "obsidianNoteRules",
    "assessmentSemantics",
)


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _score(claim_map: dict[str, dict[str, Any]], key: str) -> float:
    try:
        return float(claim_map.get(key, {}).get("score") or 0.0)
    except (TypeError, ValueError):
        return 0.0


def _confidence(claim_map: dict[str, dict[str, Any]], key: str) -> float:
    try:
        return float(claim_map.get(key, {}).get("confidence") or 0.0)
    except (TypeError, ValueError):
        return 0.0


def _claim_ref(claim: dict[str, Any] | None) -> dict[str, Any]:
    if not claim:
        return {}
    return {
        "claimKey": claim.get("claimKey"),
        "label": claim.get("label"),
        "score": claim.get("score"),
        "confidence": claim.get("confidence"),
        "valueBand": claim.get("valueBand"),
        "recommendedStrategy": claim.get("recommendedStrategy"),
    }


def _latest_investigation(conn: sqlite3.Connection) -> dict[str, Any] | None:
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        """
        SELECT *
        FROM scholar_investigations
        ORDER BY
            CASE status
                WHEN 'completed' THEN 0
                WHEN 'blocked' THEN 1
                WHEN 'running' THEN 2
                ELSE 3
            END,
            updated_at DESC,
            created_at DESC
        LIMIT 1
        """
    ).fetchone()
    if not row:
        return None

    payload = dict(row)
    finding = conn.execute(
        """
        SELECT finding_id, title, summary, confidence, uncertainty, source_ids_json
        FROM scholar_findings
        WHERE investigation_id = ?
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 1
        """,
        (payload["investigation_id"],),
    ).fetchone()
    if finding:
        finding_payload = dict(finding)
        try:
            finding_payload["source_ids"] = json.loads(
                finding_payload.get("source_ids_json") or "[]"
            )
        except json.JSONDecodeError:
            finding_payload["source_ids"] = []
        payload["top_finding"] = finding_payload

    pending = conn.execute(
        """
        SELECT COUNT(*)
        FROM scholar_questions
        WHERE linked_investigation_id = ?
          AND status = 'pending'
        """,
        (payload["investigation_id"],),
    ).fetchone()
    payload["open_question_count"] = int(pending[0] or 0) if pending else 0
    return payload


def _format_strategy_field(
    *,
    key: str,
    value: str,
    rationale: str,
    claim_map: dict[str, dict[str, Any]],
    claim_keys: list[str],
    investigation: dict[str, Any] | None,
) -> dict[str, Any]:
    evidence = [
        {
            "sourceType": "brain_claim",
            **_claim_ref(claim_map.get(claim_key)),
        }
        for claim_key in claim_keys
        if claim_map.get(claim_key)
    ]
    if investigation:
        evidence.append(
            {
                "sourceType": "scholar_investigation",
                "investigationId": investigation.get("investigation_id"),
                "title": investigation.get("title"),
                "status": investigation.get("status"),
                "confidence": investigation.get("confidence"),
                "uncertainty": investigation.get("uncertainty_summary"),
                "findingTitle": (investigation.get("top_finding") or {}).get("title"),
            }
        )
    return {
        "field": key,
        "value": value,
        "rationale": rationale,
        "sourceClaimKeys": claim_keys,
        "evidence": evidence,
    }


def _derive_fields(
    claim_map: dict[str, dict[str, Any]],
    investigation: dict[str, Any] | None,
) -> dict[str, dict[str, Any]]:
    consistency = _score(claim_map, "study_consistency")
    retrieval = _score(claim_map, "retrieval_resilience")
    calibration = _score(claim_map, "calibration_accuracy")
    scaffold = _score(claim_map, "scaffold_dependence")
    recurrence = _score(claim_map, "error_recurrence")

    pacing = "slower" if calibration < 0.5 or consistency < 0.45 else "steady"
    if pacing == "steady" and retrieval >= 0.72 and scaffold < 0.45:
        pacing = "faster"

    scaffold_depth = "guided" if scaffold >= 0.55 else "light"
    if scaffold >= 0.72:
        scaffold_depth = "full"
    elif scaffold < 0.35 and retrieval >= 0.65:
        scaffold_depth = "minimal"

    retrieval_intensity = "targeted"
    if retrieval >= 0.7:
        retrieval_intensity = "high"
    elif retrieval < 0.45:
        retrieval_intensity = "measured"

    explanation_density = "dense" if scaffold >= 0.68 else "balanced"
    if retrieval >= 0.72 and calibration >= 0.6:
        explanation_density = "lean"

    hint_budget = "structured"
    if scaffold < 0.4 and retrieval >= 0.65:
        hint_budget = "minimal"
    elif scaffold >= 0.75:
        hint_budget = "liberal"

    checkpoint_frequency = "frequent" if calibration < 0.55 else "standard"
    if consistency < 0.4:
        checkpoint_frequency = "frequent"

    wrap_style = "repair_loop" if recurrence >= 0.55 else "retrieval_close"
    if retrieval >= 0.72 and recurrence < 0.4:
        wrap_style = "synthesis_close"

    return {
        "pacing": _format_strategy_field(
            key="pacing",
            value=pacing,
            rationale=(
                "Scholar is holding the pace back until calibration and rhythm stabilize."
                if pacing == "slower"
                else "Scholar sees enough stability to keep pace neutral."
                if pacing == "steady"
                else "Scholar sees stable retrieval and low scaffold dependence, so Tutor can move faster."
            ),
            claim_map=claim_map,
            claim_keys=["study_consistency", "calibration_accuracy", "retrieval_resilience"],
            investigation=investigation,
        ),
        "scaffoldDepth": _format_strategy_field(
            key="scaffoldDepth",
            value=scaffold_depth,
            rationale=(
                "Brain still sees repeated hint dependence, so Tutor should taper support instead of dropping it."
                if scaffold_depth in {"guided", "full"}
                else "Brain shows the learner can tolerate lighter support without losing momentum."
            ),
            claim_map=claim_map,
            claim_keys=["scaffold_dependence", "retrieval_resilience"],
            investigation=investigation,
        ),
        "retrievalIntensity": _format_strategy_field(
            key="retrievalIntensity",
            value=retrieval_intensity,
            rationale=(
                "Scholar wants retrieval pressure kept measured until Brain sees stronger unsupported recall."
                if retrieval_intensity == "measured"
                else "Scholar is pushing targeted recall reps against the current weak spots."
                if retrieval_intensity == "targeted"
                else "Scholar sees enough retrieval resilience to push harder before wrap."
            ),
            claim_map=claim_map,
            claim_keys=["retrieval_resilience", "error_recurrence"],
            investigation=investigation,
        ),
        "explanationDensity": _format_strategy_field(
            key="explanationDensity",
            value=explanation_density,
            rationale=(
                "Tutor should stay explicit because the learner still benefits from fuller scaffolds."
                if explanation_density == "dense"
                else "Tutor should keep explanations balanced and push the learner to fill some gaps."
                if explanation_density == "balanced"
                else "Tutor should keep explanations lean and use retrieval to surface the missing pieces."
            ),
            claim_map=claim_map,
            claim_keys=["scaffold_dependence", "calibration_accuracy", "retrieval_resilience"],
            investigation=investigation,
        ),
        "hintBudget": _format_strategy_field(
            key="hintBudget",
            value=hint_budget,
            rationale=(
                "Hints should follow a predictable ladder instead of appearing too early."
                if hint_budget == "structured"
                else "Hints should stay rare because Brain sees enough independence."
                if hint_budget == "minimal"
                else "Tutor can afford a more generous hint ladder while Scholar keeps measuring fade-out."
            ),
            claim_map=claim_map,
            claim_keys=["scaffold_dependence", "retrieval_resilience"],
            investigation=investigation,
        ),
        "checkpointFrequency": _format_strategy_field(
            key="checkpointFrequency",
            value=checkpoint_frequency,
            rationale=(
                "Scholar wants more explicit checkpoints because Brain still sees calibration drift or broken study cadence."
                if checkpoint_frequency == "frequent"
                else "Standard checkpoints are enough for the current confidence pattern."
            ),
            claim_map=claim_map,
            claim_keys=["calibration_accuracy", "study_consistency"],
            investigation=investigation,
        ),
        "wrapStyle": _format_strategy_field(
            key="wrapStyle",
            value=wrap_style,
            rationale=(
                "Wrap should force recurring errors into repair loops before the session closes."
                if wrap_style == "repair_loop"
                else "Wrap should end on retrieval and next-step reinforcement."
                if wrap_style == "retrieval_close"
                else "Wrap can close on synthesis because the core retrieval signal is already strong."
            ),
            claim_map=claim_map,
            claim_keys=["error_recurrence", "retrieval_resilience"],
            investigation=investigation,
        ),
    }


def _build_summary(
    profile_summary: dict[str, Any],
    archetype: dict[str, Any],
    fields: dict[str, dict[str, Any]],
) -> str:
    return (
        f"Scholar is tuning Tutor for a {archetype.get('label') or 'developing learner pattern'}: "
        f"{profile_summary.get('headline') or archetype.get('summary') or 'Brain is still refining the learner model.'} "
        f"Pacing is {fields['pacing']['value']}, scaffold depth is {fields['scaffoldDepth']['value']}, "
        f"and wrap style is {fields['wrapStyle']['value']}."
    )


def build_tutor_strategy_snapshot(
    conn: sqlite3.Connection,
    *,
    user_id: str = "default",
) -> dict[str, Any]:
    profile_summary = get_profile_summary(conn, user_id=user_id, force_refresh=False)
    profile_claims = get_profile_claims(conn, user_id=user_id, force_refresh=False)
    claims = profile_claims.get("claims") or []
    claim_map = {claim.get("claimKey"): claim for claim in claims if claim.get("claimKey")}
    investigation = _latest_investigation(conn)
    fields = _derive_fields(claim_map, investigation)

    snapshot = {
        "strategyId": f"scholar-strategy-{_utc_iso_now().replace(':', '').replace('-', '')}",
        "generatedAt": _utc_iso_now(),
        "profileSnapshotId": profile_summary.get("snapshotId"),
        "hybridArchetype": profile_summary.get("hybridArchetype") or {},
        "profileSummary": profile_summary.get("profileSummary") or {},
        "boundedBy": {
            "allowedFields": list(ALLOWED_ADAPTIVE_FIELDS),
            "forbiddenFields": list(FORBIDDEN_ADAPTIVE_FIELDS),
            "note": (
                "Scholar can tune only these learner-facing execution knobs. "
                "Tutor stage order, chain rules, source boundaries, and truth policy stay fixed."
            ),
        },
        "activeInvestigation": (
            {
                "investigationId": investigation.get("investigation_id"),
                "title": investigation.get("title"),
                "status": investigation.get("status"),
                "confidence": investigation.get("confidence"),
                "uncertaintySummary": investigation.get("uncertainty_summary"),
                "openQuestionCount": investigation.get("open_question_count"),
                "topFinding": (investigation.get("top_finding") or {}).get("summary"),
            }
            if investigation
            else None
        ),
        "fields": fields,
    }
    snapshot["summary"] = _build_summary(
        snapshot["profileSummary"], snapshot["hybridArchetype"], fields
    )
    return snapshot


def render_strategy_prompt(snapshot: dict[str, Any] | None) -> str:
    if not isinstance(snapshot, dict) or not snapshot:
        return ""

    fields = snapshot.get("fields") or {}
    lines = [
        "## Scholar Strategy Snapshot (Bounded)",
        "- Apply only the listed execution fields below.",
        "- Do not change stage order, source-lock policy, truth policy, chain rules, or note rules.",
    ]
    for field_key in ALLOWED_ADAPTIVE_FIELDS:
        field = fields.get(field_key)
        if not isinstance(field, dict):
            continue
        lines.append(
            f"- {field_key}: {field.get('value')}. Rationale: {field.get('rationale')}"
        )
    active_investigation = snapshot.get("activeInvestigation")
    if isinstance(active_investigation, dict) and active_investigation.get("title"):
        lines.append(
            "- Active Scholar investigation: "
            f"{active_investigation.get('title')} "
            f"(status={active_investigation.get('status')}, confidence={active_investigation.get('confidence') or 'unknown'})."
        )
    return "\n".join(lines)

