"""Wave 1 Brain learner-profile derivation and persistence."""

from __future__ import annotations

import json
import sqlite3
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

DEFAULT_USER_ID = "default"
PROFILE_MODEL_VERSION = "brain-profile-v1"
PROFILE_REFRESH_HOURS = 12


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_datetime(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

    text = str(value).strip()
    if not text:
        return None
    text = text.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        pass

    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M", "%m/%d/%Y", "%m/%d/%Y %H:%M"):
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_session_datetime(row: sqlite3.Row | dict[str, Any]) -> datetime | None:
    session_date = row["session_date"] if "session_date" in row.keys() else row.get("session_date")
    session_time = row["session_time"] if "session_time" in row.keys() else row.get("session_time")
    created_at = row["created_at"] if "created_at" in row.keys() else row.get("created_at")

    if session_date:
        if session_time:
            combined = f"{session_date} {session_time}"
            parsed = _parse_datetime(combined)
            if parsed is not None:
                return parsed
        parsed = _parse_datetime(session_date)
        if parsed is not None:
            return parsed
    return _parse_datetime(created_at)


def _ensure_row_factory(conn: sqlite3.Connection) -> None:
    if conn.row_factory is not sqlite3.Row:
        conn.row_factory = sqlite3.Row


def _load_json(value: Any, fallback: Any) -> Any:
    if value in (None, ""):
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(str(value))
    except (TypeError, json.JSONDecodeError):
        return fallback


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def _average(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _normalize_score(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if numeric > 10:
        return _clamp(numeric / 100.0)
    if numeric > 1:
        return _clamp(numeric / 10.0)
    return _clamp(numeric)


def _score_band(score: float) -> str:
    if score >= 0.7:
        return "high"
    if score >= 0.4:
        return "moderate"
    return "low"


def _confidence_band(confidence: float) -> str:
    if confidence >= 0.7:
        return "strong"
    if confidence >= 0.4:
        return "moderate"
    return "weak"


def _freshness_days(latest_signal: datetime | None) -> float | None:
    if latest_signal is None:
        return None
    age = _utc_now() - latest_signal
    return round(max(age.total_seconds(), 0.0) / 86400.0, 2)


def _serialize_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True, sort_keys=True)


def _fetch_latest_snapshot(conn: sqlite3.Connection, user_id: str) -> sqlite3.Row | None:
    cur = conn.execute(
        """
        SELECT *
        FROM learner_profile_snapshots
        WHERE user_id = ? AND active = 1
        ORDER BY id DESC
        LIMIT 1
        """,
        (user_id,),
    )
    return cur.fetchone()


def _snapshot_is_stale(snapshot: sqlite3.Row | None) -> bool:
    if snapshot is None:
        return True
    created_at = _parse_datetime(snapshot["created_at"])
    if created_at is None:
        return True
    return (_utc_now() - created_at) >= timedelta(hours=PROFILE_REFRESH_HOURS)


def _fetch_sessions(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    cur = conn.execute(
        """
        SELECT
            id,
            session_date,
            session_time,
            main_topic,
            topic,
            study_mode,
            understanding_level,
            retention_confidence,
            calibration_gap,
            rsr_percent,
            confusions,
            issues,
            errors_recall,
            errors_conceptual,
            gaps_identified,
            source_lock,
            created_at
        FROM sessions
        ORDER BY session_date DESC, session_time DESC, created_at DESC
        LIMIT 240
        """
    )
    return cur.fetchall()


def _fetch_practice_events(conn: sqlite3.Connection, user_id: str) -> list[sqlite3.Row]:
    cur = conn.execute(
        """
        SELECT
            id,
            skill_id,
            timestamp,
            correct,
            confidence,
            latency_ms,
            hint_level,
            item_format,
            source,
            session_id
        FROM practice_events
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT 500
        """,
        (user_id,),
    )
    return cur.fetchall()


def _fetch_error_flags(conn: sqlite3.Connection, user_id: str) -> list[sqlite3.Row]:
    cur = conn.execute(
        """
        SELECT
            id,
            skill_id,
            error_type,
            severity,
            timestamp,
            evidence_ref
        FROM error_flags
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT 500
        """,
        (user_id,),
    )
    return cur.fetchall()


def _fetch_skill_mastery(conn: sqlite3.Connection, user_id: str) -> list[sqlite3.Row]:
    cur = conn.execute(
        """
        SELECT skill_id, p_mastery_latent, last_practiced_at, updated_at
        FROM skill_mastery
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT 500
        """,
        (user_id,),
    )
    return cur.fetchall()


def _source_window(
    sessions: list[sqlite3.Row],
    practice_events: list[sqlite3.Row],
    error_flags: list[sqlite3.Row],
    mastery_rows: list[sqlite3.Row],
) -> tuple[str | None, str | None]:
    timestamps: list[datetime] = []
    for row in sessions:
        parsed = _parse_session_datetime(row)
        if parsed is not None:
            timestamps.append(parsed)
    for row in practice_events:
        parsed = _parse_datetime(row["timestamp"])
        if parsed is not None:
            timestamps.append(parsed)
    for row in error_flags:
        parsed = _parse_datetime(row["timestamp"])
        if parsed is not None:
            timestamps.append(parsed)
    for row in mastery_rows:
        parsed = _parse_datetime(row["last_practiced_at"]) or _parse_datetime(row["updated_at"])
        if parsed is not None:
            timestamps.append(parsed)
    if not timestamps:
        return None, None
    timestamps.sort()
    return timestamps[0].isoformat(), timestamps[-1].isoformat()


def _derive_claims(
    sessions: list[sqlite3.Row],
    practice_events: list[sqlite3.Row],
    error_flags: list[sqlite3.Row],
    mastery_rows: list[sqlite3.Row],
) -> list[dict[str, Any]]:
    now = _utc_now()
    session_times = [dt for row in sessions if (dt := _parse_session_datetime(row))]
    recent_session_times = [dt for dt in session_times if dt >= now - timedelta(days=28)]
    active_days = len({dt.date().isoformat() for dt in recent_session_times})
    study_consistency_score = _clamp(active_days / 12.0)
    study_consistency_confidence = _clamp(min(len(recent_session_times), 12) / 12.0)
    study_consistency_contradiction = (
        "mixed" if len(recent_session_times) >= 6 and active_days <= 2 else "stable"
    )
    study_consistency_latest = max(session_times) if session_times else None

    practice_correctness = [float(bool(row["correct"])) for row in practice_events]
    practice_confidence_pairs = [
        (_clamp(float(row["confidence"])), float(bool(row["correct"])))
        for row in practice_events
        if row["confidence"] is not None
    ]
    session_rsr = [
        score
        for row in sessions
        if (score := _normalize_score(row["rsr_percent"])) is not None
    ]
    retrieval_components = []
    if practice_correctness:
        retrieval_components.append(_average(practice_correctness))
    if session_rsr:
        retrieval_components.append(_average(session_rsr))
    retrieval_resilience_score = _average(
        [value for value in retrieval_components if value is not None]
    ) or 0.0
    retrieval_resilience_confidence = _clamp(
        min(len(practice_events), 20) / 20.0 * 0.7 + min(len(session_rsr), 8) / 8.0 * 0.3
    )
    retrieval_resilience_contradiction = "stable"
    if practice_correctness and session_rsr:
        if abs((_average(practice_correctness) or 0.0) - (_average(session_rsr) or 0.0)) > 0.2:
            retrieval_resilience_contradiction = "mixed"
    retrieval_latest = max(
        [_parse_datetime(row["timestamp"]) for row in practice_events if _parse_datetime(row["timestamp"]) is not None]
        + session_times,
        default=None,
    )

    calibration_gap_scores = [
        score
        for row in sessions
        if (score := _normalize_score(row["calibration_gap"])) is not None
    ]
    confidence_errors = [abs(conf - correct) for conf, correct in practice_confidence_pairs]
    calibration_components: list[float] = []
    if confidence_errors:
        calibration_components.append(1.0 - _clamp(_average(confidence_errors) or 0.0))
    if calibration_gap_scores:
        calibration_components.append(1.0 - _clamp(_average(calibration_gap_scores) or 0.0))
    calibration_accuracy_score = _average(calibration_components) or 0.0
    calibration_accuracy_confidence = _clamp(
        min(len(practice_confidence_pairs), 12) / 12.0 * 0.7
        + min(len(calibration_gap_scores), 8) / 8.0 * 0.3
    )
    high_confidence_wrong = 0
    high_confidence_total = 0
    for confidence, correct in practice_confidence_pairs:
        if confidence >= 0.7:
            high_confidence_total += 1
            if correct < 1.0:
                high_confidence_wrong += 1
    calibration_accuracy_contradiction = "stable"
    if high_confidence_total >= 3 and (high_confidence_wrong / high_confidence_total) > 0.34:
        calibration_accuracy_contradiction = "contradicted"
    elif practice_confidence_pairs and calibration_gap_scores:
        if abs(
            (1.0 - (_average(confidence_errors) or 0.0))
            - (1.0 - (_average(calibration_gap_scores) or 0.0))
        ) > 0.25:
            calibration_accuracy_contradiction = "mixed"
    calibration_latest = max(
        [_parse_datetime(row["timestamp"]) for row in practice_events if _parse_datetime(row["timestamp"]) is not None]
        + session_times,
        default=None,
    )

    hint_events = [
        row
        for row in practice_events
        if str(row["source"] or "").lower() == "hint" or int(row["hint_level"] or 0) > 0
    ]
    hint_ratio = (len(hint_events) / len(practice_events)) if practice_events else 0.0
    avg_hint_level = _average([float(int(row["hint_level"] or 0)) for row in practice_events]) or 0.0
    scaffold_dependence_score = _clamp(hint_ratio * 0.7 + _clamp(avg_hint_level / 3.0) * 0.3)
    scaffold_dependence_confidence = _clamp(min(len(practice_events), 16) / 16.0)
    scaffold_dependence_contradiction = (
        "mixed" if scaffold_dependence_score >= 0.65 and retrieval_resilience_score >= 0.75 else "stable"
    )
    scaffold_latest = max(
        [_parse_datetime(row["timestamp"]) for row in practice_events if _parse_datetime(row["timestamp"]) is not None],
        default=None,
    )

    error_skill_counts = Counter(str(row["skill_id"] or "") for row in error_flags if row["skill_id"])
    repeated_skills = sum(1 for count in error_skill_counts.values() if count > 1)
    session_error_mentions = 0
    for row in sessions:
        for field in ("errors_recall", "errors_conceptual", "gaps_identified", "issues"):
            payload = _load_json(row[field], [])
            if isinstance(payload, list):
                session_error_mentions += len(payload)
            elif payload:
                session_error_mentions += 1
    recurrence_from_flags = _clamp(len(error_flags) / 12.0)
    recurrence_from_repeats = _clamp(repeated_skills / max(len(error_skill_counts), 1))
    recurrence_from_sessions = _clamp(session_error_mentions / 16.0) if sessions else 0.0
    error_recurrence_score = _average(
        [recurrence_from_flags, recurrence_from_repeats, recurrence_from_sessions]
    ) or 0.0
    error_recurrence_confidence = _clamp(
        min(len(error_flags), 12) / 12.0 * 0.8 + min(session_error_mentions, 8) / 8.0 * 0.2
    )
    error_recurrence_contradiction = (
        "mixed" if len(error_flags) == 0 and session_error_mentions >= 6 else "stable"
    )
    error_latest = max(
        [_parse_datetime(row["timestamp"]) for row in error_flags if _parse_datetime(row["timestamp"]) is not None]
        + session_times,
        default=None,
    )

    mastery_scores = [
        float(row["p_mastery_latent"])
        for row in mastery_rows
        if row["p_mastery_latent"] is not None
    ]
    mastery_average = _average(mastery_scores) or 0.0

    claims = [
        {
            "claimKey": "study_consistency",
            "label": "Study Consistency",
            "score": round(study_consistency_score, 4),
            "valueBand": _score_band(study_consistency_score),
            "confidence": round(study_consistency_confidence, 4),
            "confidenceBand": _confidence_band(study_consistency_confidence),
            "freshnessDays": _freshness_days(study_consistency_latest),
            "contradictionState": study_consistency_contradiction,
            "evidenceTier": 1,
            "evidenceLabel": "Tier 1 trusted telemetry",
            "signalDirection": "strength",
            "observedCount": len(recent_session_times),
            "explanation": (
                f"Brain sees {active_days} active study day(s) in the last 28 days across "
                f"{len(recent_session_times)} recent session(s)."
            ),
            "recommendedStrategy": (
                "Protect repeatable study windows before changing methods."
                if study_consistency_score < 0.55
                else "Keep the current cadence and let Scholar tune within it."
            ),
            "evidence": {"recentSessionCount": len(recent_session_times), "activeDays28": active_days},
        },
        {
            "claimKey": "retrieval_resilience",
            "label": "Retrieval Resilience",
            "score": round(retrieval_resilience_score, 4),
            "valueBand": _score_band(retrieval_resilience_score),
            "confidence": round(retrieval_resilience_confidence, 4),
            "confidenceBand": _confidence_band(retrieval_resilience_confidence),
            "freshnessDays": _freshness_days(retrieval_latest),
            "contradictionState": retrieval_resilience_contradiction,
            "evidenceTier": 1,
            "evidenceLabel": "Tier 1 trusted telemetry",
            "signalDirection": "strength",
            "observedCount": len(practice_events) + len(session_rsr),
            "explanation": (
                "Brain combines practice correctness with session retrieval signals to estimate "
                "how well you hold up when you have to pull information back out."
            ),
            "recommendedStrategy": (
                "Increase unsupported recall reps before adding more sources."
                if retrieval_resilience_score < 0.55
                else "Use Tutor to press harder on retrieval before wrap."
            ),
            "evidence": {
                "practiceEventCount": len(practice_events),
                "practiceCorrectRate": round(_average(practice_correctness) or 0.0, 4),
                "sessionRsrAverage": round(_average(session_rsr) or 0.0, 4),
                "masteryAverage": round(mastery_average, 4),
            },
        },
        {
            "claimKey": "calibration_accuracy",
            "label": "Calibration Accuracy",
            "score": round(calibration_accuracy_score, 4),
            "valueBand": _score_band(calibration_accuracy_score),
            "confidence": round(calibration_accuracy_confidence, 4),
            "confidenceBand": _confidence_band(calibration_accuracy_confidence),
            "freshnessDays": _freshness_days(calibration_latest),
            "contradictionState": calibration_accuracy_contradiction,
            "evidenceTier": 1,
            "evidenceLabel": "Tier 1 trusted telemetry",
            "signalDirection": "strength",
            "observedCount": len(practice_confidence_pairs) + len(calibration_gap_scores),
            "explanation": (
                "Brain compares how sure you felt with what actually happened, then checks that "
                "against the calibration gap captured in study sessions."
            ),
            "recommendedStrategy": (
                "Add more explicit confidence checks before Tutor advances."
                if calibration_accuracy_score < 0.55
                else "Use Scholar to tighten strategy around the moments confidence drifts."
            ),
            "evidence": {
                "confidencePairCount": len(practice_confidence_pairs),
                "averageConfidenceError": round(_average(confidence_errors) or 0.0, 4),
                "averageCalibrationGap": round(_average(calibration_gap_scores) or 0.0, 4),
                "highConfidenceWrongRate": round(
                    (high_confidence_wrong / high_confidence_total) if high_confidence_total else 0.0,
                    4,
                ),
            },
        },
        {
            "claimKey": "scaffold_dependence",
            "label": "Scaffold Dependence",
            "score": round(scaffold_dependence_score, 4),
            "valueBand": _score_band(scaffold_dependence_score),
            "confidence": round(scaffold_dependence_confidence, 4),
            "confidenceBand": _confidence_band(scaffold_dependence_confidence),
            "freshnessDays": _freshness_days(scaffold_latest),
            "contradictionState": scaffold_dependence_contradiction,
            "evidenceTier": 1,
            "evidenceLabel": "Tier 1 trusted telemetry",
            "signalDirection": "watchout",
            "observedCount": len(practice_events),
            "explanation": (
                "Brain estimates how often progress depends on hints or stronger guidance before "
                "you can move forward."
            ),
            "recommendedStrategy": (
                "Shorten explanations and force a first retrieval attempt before hints."
                if scaffold_dependence_score >= 0.55
                else "You can tolerate lighter scaffolding without losing momentum."
            ),
            "evidence": {
                "practiceEventCount": len(practice_events),
                "hintEventCount": len(hint_events),
                "hintRatio": round(hint_ratio, 4),
                "averageHintLevel": round(avg_hint_level, 4),
            },
        },
        {
            "claimKey": "error_recurrence",
            "label": "Error Recurrence",
            "score": round(error_recurrence_score, 4),
            "valueBand": _score_band(error_recurrence_score),
            "confidence": round(error_recurrence_confidence, 4),
            "confidenceBand": _confidence_band(error_recurrence_confidence),
            "freshnessDays": _freshness_days(error_latest),
            "contradictionState": error_recurrence_contradiction,
            "evidenceTier": 1,
            "evidenceLabel": "Tier 1 trusted telemetry",
            "signalDirection": "watchout",
            "observedCount": len(error_flags) + session_error_mentions,
            "explanation": (
                "Brain tracks whether the same skills and error types keep reappearing instead of "
                "clearing after practice."
            ),
            "recommendedStrategy": (
                "Route recurring weak spots into targeted overlearn loops."
                if error_recurrence_score >= 0.55
                else "Current error patterns look containable; focus on retrieval quality."
            ),
            "evidence": {
                "errorFlagCount": len(error_flags),
                "repeatedSkillCount": repeated_skills,
                "distinctErroredSkills": len(error_skill_counts),
                "sessionErrorMentions": session_error_mentions,
            },
        },
    ]
    return claims


def _build_hybrid_archetype(claims: list[dict[str, Any]]) -> dict[str, Any]:
    claim_map = {claim["claimKey"]: claim for claim in claims}
    consistency = claim_map["study_consistency"]["score"]
    retrieval = claim_map["retrieval_resilience"]["score"]
    calibration = claim_map["calibration_accuracy"]["score"]
    scaffold = claim_map["scaffold_dependence"]["score"]
    recurrence = claim_map["error_recurrence"]["score"]

    if consistency >= 0.7 and retrieval >= 0.65:
        label = "Consistency-Driven Builder"
        slug = "consistency-driven-builder"
        summary = (
            "Brain sees a learner who benefits from keeping study rhythm stable and then pushing "
            "retrieval inside that rhythm."
        )
    elif retrieval >= 0.65:
        label = "Retrieval Consolidator"
        slug = "retrieval-consolidator"
        summary = (
            "Brain sees strongest momentum when learning is forced back out through retrieval "
            "rather than extended passive review."
        )
    elif calibration < 0.5:
        label = "Calibration Builder"
        slug = "calibration-builder"
        summary = (
            "Brain sees the biggest unlock in tightening confidence calibration so effort goes to "
            "the right weak spots sooner."
        )
    elif scaffold >= 0.6:
        label = "Scaffold-Supported Learner"
        slug = "scaffold-supported-learner"
        summary = (
            "Brain sees better performance when support is sequenced carefully and then tapered "
            "back into retrieval."
        )
    else:
        label = "Emerging Pattern"
        slug = "emerging-pattern"
        summary = (
            "Brain has enough signal to sketch a pattern, but not enough stable evidence to lock a "
            "strong archetype yet."
        )

    supporting_traits: list[str] = []
    if consistency >= 0.6:
        supporting_traits.append("cadence-holding")
    if retrieval >= 0.6:
        supporting_traits.append("retrieval-positive")
    if calibration < 0.55:
        supporting_traits.append("needs-calibration-checks")
    if scaffold >= 0.55:
        supporting_traits.append("benefits-from-scaffolds")
    if recurrence >= 0.55:
        supporting_traits.append("needs-recurring-gap-repair")

    return {
        "slug": slug,
        "label": label,
        "summary": summary,
        "supportingTraits": supporting_traits,
    }


def _build_profile_summary(claims: list[dict[str, Any]], archetype: dict[str, Any]) -> dict[str, Any]:
    strengths: list[str] = []
    watchouts: list[str] = []
    next_actions: list[str] = []

    for claim in claims:
        is_watchout = claim["signalDirection"] == "watchout"
        strong_signal = claim["score"] >= 0.65
        if not is_watchout and strong_signal:
            strengths.append(claim["label"])
        if is_watchout and strong_signal:
            watchouts.append(claim["label"])
        if claim["confidence"] < 0.55 or claim["contradictionState"] != "stable":
            next_actions.append(claim["recommendedStrategy"])
        elif is_watchout and claim["score"] >= 0.55:
            next_actions.append(claim["recommendedStrategy"])

    if not next_actions:
        next_actions.append(
            "Keep collecting clean telemetry so Scholar can tune within a stable Brain profile."
        )

    return {
        "headline": archetype["summary"],
        "strengths": strengths[:3],
        "watchouts": watchouts[:3],
        "nextBestActions": next_actions[:3],
        "backfillMode": "single_snapshot_seed",
    }


def _build_questions(claims: list[dict[str, Any]]) -> list[dict[str, Any]]:
    templates = {
        "study_consistency": {
            "question": "When your study rhythm breaks, what is usually the first thing that interrupts it: time, energy, uncertainty, or materials?",
            "rationale": "Brain needs to know what disrupts consistency before Scholar recommends schedule or workflow changes.",
            "evidenceNeeded": "self_reported_interrupt_pattern",
        },
        "retrieval_resilience": {
            "question": "When recall gets hard, do you learn more from another attempt, a smaller hint, or seeing the full answer?",
            "rationale": "Brain wants to distinguish retrieval friction from true content gaps.",
            "evidenceNeeded": "preferred_retrieval_support",
        },
        "calibration_accuracy": {
            "question": "When you feel confident and still miss, is it usually because you recognized the idea but could not explain it under pressure?",
            "rationale": "Brain is checking whether confidence drift is recognition-based or explanation-based.",
            "evidenceNeeded": "confidence_failure_pattern",
        },
        "scaffold_dependence": {
            "question": "What kind of support unlocks you fastest: a hint, an example, or a direct explanation?",
            "rationale": "Brain needs to know which scaffold type actually helps before Scholar adjusts support depth.",
            "evidenceNeeded": "effective_scaffold_type",
        },
        "error_recurrence": {
            "question": "Do repeated mistakes usually come from forgetting, mixing concepts together, or running out of time to review them properly?",
            "rationale": "Brain is separating recurring content confusion from review-process failure.",
            "evidenceNeeded": "recurring_error_cause",
        },
    }

    questions: list[dict[str, Any]] = []
    for claim in claims:
        if claim["confidence"] >= 0.55 and claim["contradictionState"] == "stable":
            continue
        template = templates[claim["claimKey"]]
        question_type = "challenge" if claim["contradictionState"] == "contradicted" else "calibration"
        questions.append(
            {
                "questionKey": f"{claim['claimKey']}:{question_type}",
                "questionText": template["question"],
                "claimKey": claim["claimKey"],
                "rationale": template["rationale"],
                "questionType": question_type,
                "status": "pending",
                "blocking": 0,
                "evidenceNeeded": template["evidenceNeeded"],
            }
        )
    return questions[:3]


def _persist_profile_snapshot(
    conn: sqlite3.Connection,
    user_id: str,
    claims: list[dict[str, Any]],
    archetype: dict[str, Any],
    profile_summary: dict[str, Any],
    source_window: tuple[str | None, str | None],
) -> int:
    conn.execute("UPDATE learner_profile_snapshots SET active = 0 WHERE user_id = ?", (user_id,))
    evidence_summary = {
        "claimCount": len(claims),
        "highConfidenceClaims": sum(1 for claim in claims if claim["confidence"] >= 0.7),
        "contradictedClaims": sum(
            1 for claim in claims if claim["contradictionState"] == "contradicted"
        ),
    }
    cur = conn.execute(
        """
        INSERT INTO learner_profile_snapshots (
            user_id,
            archetype_slug,
            archetype_label,
            archetype_summary,
            supporting_traits_json,
            profile_summary_json,
            evidence_summary_json,
            model_version,
            source_window_start,
            source_window_end,
            active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """,
        (
            user_id,
            archetype["slug"],
            archetype["label"],
            archetype["summary"],
            _serialize_json(archetype["supportingTraits"]),
            _serialize_json(profile_summary),
            _serialize_json(evidence_summary),
            PROFILE_MODEL_VERSION,
            source_window[0],
            source_window[1],
        ),
    )
    snapshot_id = int(cur.lastrowid)
    for claim in claims:
        conn.execute(
            """
            INSERT INTO learner_profile_claims (
                snapshot_id,
                user_id,
                claim_key,
                claim_label,
                score,
                value_band,
                confidence,
                freshness_days,
                contradiction_state,
                evidence_tier,
                evidence_label,
                signal_direction,
                observed_count,
                explanation,
                recommended_strategy,
                evidence_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                snapshot_id,
                user_id,
                claim["claimKey"],
                claim["label"],
                claim["score"],
                claim["valueBand"],
                claim["confidence"],
                claim["freshnessDays"],
                claim["contradictionState"],
                claim["evidenceTier"],
                claim["evidenceLabel"],
                claim["signalDirection"],
                claim["observedCount"],
                claim["explanation"],
                claim["recommendedStrategy"],
                _serialize_json(claim["evidence"]),
            ),
        )
    conn.commit()
    return snapshot_id


def _sync_questions(
    conn: sqlite3.Connection,
    user_id: str,
    snapshot_id: int,
    questions: list[dict[str, Any]],
) -> None:
    for question in questions:
        cur = conn.execute(
            """
            SELECT id
            FROM learner_profile_questions
            WHERE user_id = ? AND question_key = ? AND status = 'pending'
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id, question["questionKey"]),
        )
        existing = cur.fetchone()
        if existing:
            conn.execute(
                """
                UPDATE learner_profile_questions
                SET snapshot_id = ?,
                    question_text = ?,
                    claim_key = ?,
                    rationale = ?,
                    question_type = ?,
                    blocking = ?,
                    evidence_needed = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    snapshot_id,
                    question["questionText"],
                    question["claimKey"],
                    question["rationale"],
                    question["questionType"],
                    question["blocking"],
                    question["evidenceNeeded"],
                    existing["id"],
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO learner_profile_questions (
                    user_id,
                    snapshot_id,
                    question_key,
                    question_text,
                    claim_key,
                    rationale,
                    question_type,
                    status,
                    blocking,
                    evidence_needed
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
                (
                    user_id,
                    snapshot_id,
                    question["questionKey"],
                    question["questionText"],
                    question["claimKey"],
                    question["rationale"],
                    question["questionType"],
                    question["blocking"],
                    question["evidenceNeeded"],
                ),
            )
    conn.commit()


def _hydrate_profile(conn: sqlite3.Connection, snapshot: sqlite3.Row) -> dict[str, Any]:
    claims_cur = conn.execute(
        """
        SELECT *
        FROM learner_profile_claims
        WHERE snapshot_id = ?
        ORDER BY claim_key
        """,
        (snapshot["id"],),
    )
    claims = []
    for row in claims_cur.fetchall():
        claims.append(
            {
                "claimKey": row["claim_key"],
                "label": row["claim_label"],
                "score": row["score"],
                "valueBand": row["value_band"],
                "confidence": row["confidence"],
                "confidenceBand": _confidence_band(float(row["confidence"] or 0.0)),
                "freshnessDays": row["freshness_days"],
                "contradictionState": row["contradiction_state"],
                "evidenceTier": row["evidence_tier"],
                "evidenceLabel": row["evidence_label"],
                "signalDirection": row["signal_direction"],
                "observedCount": row["observed_count"],
                "explanation": row["explanation"],
                "recommendedStrategy": row["recommended_strategy"],
                "evidence": _load_json(row["evidence_json"], {}),
            }
        )

    questions_cur = conn.execute(
        """
        SELECT *
        FROM learner_profile_questions
        WHERE user_id = ? AND status = 'pending'
        ORDER BY id ASC
        """,
        (snapshot["user_id"],),
    )
    questions = []
    for row in questions_cur.fetchall():
        questions.append(
            {
                "id": row["id"],
                "snapshotId": row["snapshot_id"],
                "questionKey": row["question_key"],
                "questionText": row["question_text"],
                "claimKey": row["claim_key"],
                "rationale": row["rationale"],
                "questionType": row["question_type"],
                "status": row["status"],
                "blocking": bool(row["blocking"]),
                "evidenceNeeded": row["evidence_needed"],
                "answerText": row["answer_text"],
                "createdAt": row["created_at"],
                "updatedAt": row["updated_at"],
            }
        )

    profile_summary = _load_json(snapshot["profile_summary_json"], {})
    evidence_summary = _load_json(snapshot["evidence_summary_json"], {})
    archetype = {
        "slug": snapshot["archetype_slug"],
        "label": snapshot["archetype_label"],
        "summary": snapshot["archetype_summary"],
        "supportingTraits": _load_json(snapshot["supporting_traits_json"], []),
    }
    return {
        "userId": snapshot["user_id"],
        "snapshotId": snapshot["id"],
        "generatedAt": snapshot["created_at"],
        "modelVersion": snapshot["model_version"],
        "hybridArchetype": archetype,
        "profileSummary": profile_summary,
        "claimsOverview": {
            "count": len(claims),
            "highConfidence": sum(1 for claim in claims if claim["confidence"] >= 0.7),
            "needsCalibration": sum(
                1
                for claim in claims
                if claim["confidence"] < 0.55 or claim["contradictionState"] != "stable"
            ),
            "watchouts": sum(
                1
                for claim in claims
                if claim["signalDirection"] == "watchout" and claim["score"] >= 0.55
            ),
        },
        "sourceWindow": {"start": snapshot["source_window_start"], "end": snapshot["source_window_end"]},
        "backfillMode": profile_summary.get("backfillMode", "single_snapshot_seed"),
        "reliabilityTiers": [
            {"tier": 1, "label": "Trusted", "description": "Brain-owned telemetry and adaptive signals."},
            {"tier": 2, "label": "Conditional", "description": "Contextual product evidence such as vault and library behavior."},
            {"tier": 3, "label": "Advisory", "description": "Heuristic or sparse signals that should not dominate profile claims."},
        ],
        "evidenceSummary": evidence_summary,
        "claims": claims,
        "questions": questions,
    }


def build_or_refresh_profile(
    conn: sqlite3.Connection,
    user_id: str = DEFAULT_USER_ID,
    *,
    force_refresh: bool = False,
) -> dict[str, Any]:
    _ensure_row_factory(conn)
    snapshot = _fetch_latest_snapshot(conn, user_id)
    if snapshot is not None and not force_refresh and not _snapshot_is_stale(snapshot):
        return _hydrate_profile(conn, snapshot)

    sessions = _fetch_sessions(conn)
    practice_events = _fetch_practice_events(conn, user_id)
    error_flags = _fetch_error_flags(conn, user_id)
    mastery_rows = _fetch_skill_mastery(conn, user_id)

    claims = _derive_claims(sessions, practice_events, error_flags, mastery_rows)
    archetype = _build_hybrid_archetype(claims)
    profile_summary = _build_profile_summary(claims, archetype)
    snapshot_id = _persist_profile_snapshot(
        conn,
        user_id,
        claims,
        archetype,
        profile_summary,
        _source_window(sessions, practice_events, error_flags, mastery_rows),
    )
    _sync_questions(conn, user_id, snapshot_id, _build_questions(claims))
    snapshot = _fetch_latest_snapshot(conn, user_id)
    if snapshot is None:
        raise RuntimeError("Failed to persist learner profile snapshot")
    return _hydrate_profile(conn, snapshot)


def get_profile_summary(
    conn: sqlite3.Connection,
    user_id: str = DEFAULT_USER_ID,
    *,
    force_refresh: bool = False,
) -> dict[str, Any]:
    profile = build_or_refresh_profile(conn, user_id=user_id, force_refresh=force_refresh)
    return {
        key: profile[key]
        for key in (
            "userId",
            "snapshotId",
            "generatedAt",
            "modelVersion",
            "hybridArchetype",
            "profileSummary",
            "claimsOverview",
            "sourceWindow",
            "backfillMode",
            "reliabilityTiers",
            "evidenceSummary",
        )
    }


def get_profile_claims(
    conn: sqlite3.Connection,
    user_id: str = DEFAULT_USER_ID,
    *,
    force_refresh: bool = False,
) -> dict[str, Any]:
    profile = build_or_refresh_profile(conn, user_id=user_id, force_refresh=force_refresh)
    return {
        "userId": profile["userId"],
        "snapshotId": profile["snapshotId"],
        "generatedAt": profile["generatedAt"],
        "claims": profile["claims"],
        "count": len(profile["claims"]),
    }


def get_profile_questions(
    conn: sqlite3.Connection,
    user_id: str = DEFAULT_USER_ID,
    *,
    force_refresh: bool = False,
) -> dict[str, Any]:
    profile = build_or_refresh_profile(conn, user_id=user_id, force_refresh=force_refresh)
    return {
        "userId": profile["userId"],
        "snapshotId": profile["snapshotId"],
        "questions": profile["questions"],
        "count": len(profile["questions"]),
    }


def get_profile_history(
    conn: sqlite3.Connection,
    user_id: str = DEFAULT_USER_ID,
    *,
    limit: int = 12,
) -> dict[str, Any]:
    _ensure_row_factory(conn)
    cur = conn.execute(
        """
        SELECT *
        FROM learner_profile_snapshots
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (user_id, limit),
    )
    history = []
    for row in cur.fetchall():
        claims_cur = conn.execute(
            """
            SELECT claim_key, score, confidence, contradiction_state
            FROM learner_profile_claims
            WHERE snapshot_id = ?
            ORDER BY claim_key
            """,
            (row["id"],),
        )
        history.append(
            {
                "snapshotId": row["id"],
                "generatedAt": row["created_at"],
                "modelVersion": row["model_version"],
                "archetypeLabel": row["archetype_label"],
                "archetypeSummary": row["archetype_summary"],
                "topSignals": [
                    {
                        "claimKey": claim["claim_key"],
                        "score": claim["score"],
                        "confidence": claim["confidence"],
                        "contradictionState": claim["contradiction_state"],
                    }
                    for claim in claims_cur.fetchall()
                ],
                "sourceWindow": {"start": row["source_window_start"], "end": row["source_window_end"]},
            }
        )
    return {"userId": user_id, "history": history, "count": len(history)}


def submit_profile_feedback(
    conn: sqlite3.Connection,
    payload: dict[str, Any],
    user_id: str = DEFAULT_USER_ID,
) -> dict[str, Any]:
    _ensure_row_factory(conn)
    snapshot = _fetch_latest_snapshot(conn, user_id)
    question_id = payload.get("questionId")
    claim_key = payload.get("claimKey")
    response_type = str(payload.get("responseType") or "").strip().lower()
    response_text = str(payload.get("responseText") or "").strip()
    source = str(payload.get("source") or "ui").strip() or "ui"

    if response_type not in {"answer", "challenge", "confirm"}:
        raise ValueError("responseType must be one of: answer, challenge, confirm")
    if response_type == "answer" and not question_id:
        raise ValueError("questionId is required for answer responses")
    if response_type != "answer" and not claim_key:
        raise ValueError("claimKey is required for non-question feedback")

    updated_question = None
    if question_id:
        conn.execute(
            """
            UPDATE learner_profile_questions
            SET status = 'answered',
                answer_text = ?,
                answer_source = ?,
                answered_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (response_text, source, question_id, user_id),
        )
        cur = conn.execute(
            "SELECT * FROM learner_profile_questions WHERE id = ? AND user_id = ?",
            (question_id, user_id),
        )
        updated_question = cur.fetchone()
        if updated_question is None:
            raise ValueError("questionId not found")
        claim_key = claim_key or updated_question["claim_key"]

    cur = conn.execute(
        """
        INSERT INTO learner_profile_feedback_events (
            user_id,
            snapshot_id,
            claim_key,
            question_id,
            feedback_type,
            response_text,
            source
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            snapshot["id"] if snapshot is not None else None,
            claim_key,
            question_id,
            response_type,
            response_text,
            source,
        ),
    )
    conn.commit()

    serialized_question = None
    if updated_question is not None:
        serialized_question = {
            "id": updated_question["id"],
            "snapshotId": updated_question["snapshot_id"],
            "questionKey": updated_question["question_key"],
            "questionText": updated_question["question_text"],
            "claimKey": updated_question["claim_key"],
            "rationale": updated_question["rationale"],
            "questionType": updated_question["question_type"],
            "status": updated_question["status"],
            "blocking": bool(updated_question["blocking"]),
            "evidenceNeeded": updated_question["evidence_needed"],
            "answerText": updated_question["answer_text"],
            "createdAt": updated_question["created_at"],
            "updatedAt": updated_question["updated_at"],
        }

    return {
        "ok": True,
        "feedbackId": int(cur.lastrowid),
        "snapshotId": snapshot["id"] if snapshot is not None else None,
        "claimKey": claim_key,
        "responseType": response_type,
        "question": serialized_question,
    }
