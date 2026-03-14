from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from learner_profile import DEFAULT_USER_ID, get_profile_claims, get_profile_summary

DEFAULT_WORKSPACE_ID = "default"

DEFAULT_FEATURE_FLAGS = (
    {
        "flag_key": "brain_scholar_tutor_shell",
        "enabled": 1,
        "variant": "primary",
        "description": "Promote Brain, Scholar, and Tutor as the primary product loop.",
    },
    {
        "flag_key": "scholar_live_research",
        "enabled": 1,
        "variant": "trusted-first",
        "description": "Allow Scholar to run cited web research from the backend runtime.",
    },
    {
        "flag_key": "tutor_bounded_strategy",
        "enabled": 1,
        "variant": "scholar-envelope",
        "description": "Allow bounded Scholar strategy snapshots to inform Tutor sessions.",
    },
    {
        "flag_key": "premium_data_rights",
        "enabled": 1,
        "variant": "export-and-reset",
        "description": "Expose export, privacy, and reset-personalization controls.",
    },
    {
        "flag_key": "premium_outcome_report",
        "enabled": 1,
        "variant": "json-report",
        "description": "Expose a learner-facing outcome report for proof and review.",
    },
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_iso_now() -> str:
    return _utc_now().isoformat()


def _json_dumps(payload: Any) -> str:
    return json.dumps(payload or {}, ensure_ascii=True)


def _ensure_row_factory(conn: sqlite3.Connection) -> None:
    conn.row_factory = sqlite3.Row


def _table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        """
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
        LIMIT 1
        """,
        (table_name,),
    ).fetchone()
    return bool(row)


def ensure_product_ops_schema(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS product_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL UNIQUE,
            user_id TEXT NOT NULL DEFAULT 'default',
            workspace_id TEXT NOT NULL DEFAULT 'default',
            event_type TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'system',
            metadata_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_product_events_scope_created
        ON product_events(user_id, workspace_id, created_at DESC)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_product_events_type_created
        ON product_events(event_type, created_at DESC)
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS product_privacy_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default',
            workspace_id TEXT NOT NULL DEFAULT 'default',
            retention_days INTEGER NOT NULL DEFAULT 180,
            allow_tier2_signals INTEGER NOT NULL DEFAULT 1,
            allow_vault_signals INTEGER NOT NULL DEFAULT 1,
            allow_calendar_signals INTEGER NOT NULL DEFAULT 1,
            allow_scholar_personalization INTEGER NOT NULL DEFAULT 1,
            allow_outcome_reports INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, workspace_id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS product_feature_flags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            flag_key TEXT NOT NULL UNIQUE,
            enabled INTEGER NOT NULL DEFAULT 1,
            variant TEXT NOT NULL DEFAULT 'on',
            description TEXT,
            scope TEXT NOT NULL DEFAULT 'global',
            updated_at TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_product_feature_flags_scope
        ON product_feature_flags(scope, enabled)
        """
    )

    now = _utc_iso_now()
    for flag in DEFAULT_FEATURE_FLAGS:
        cur.execute(
            """
            INSERT INTO product_feature_flags (
                flag_key,
                enabled,
                variant,
                description,
                scope,
                updated_at
            )
            VALUES (?, ?, ?, ?, 'global', ?)
            ON CONFLICT(flag_key) DO UPDATE SET
                description = excluded.description,
                updated_at = excluded.updated_at
            """,
            (
                flag["flag_key"],
                int(flag["enabled"]),
                flag["variant"],
                flag["description"],
                now,
            ),
        )

    conn.commit()


def log_product_event(
    conn: sqlite3.Connection,
    *,
    event_type: str,
    source: str = "system",
    metadata: dict[str, Any] | None = None,
    user_id: str = DEFAULT_USER_ID,
    workspace_id: str = DEFAULT_WORKSPACE_ID,
) -> dict[str, Any]:
    ensure_product_ops_schema(conn)
    now = _utc_iso_now()
    event_id = f"evt_{uuid4().hex}"
    conn.execute(
        """
        INSERT INTO product_events (
            event_id,
            user_id,
            workspace_id,
            event_type,
            source,
            metadata_json,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event_id,
            user_id,
            workspace_id,
            event_type,
            source,
            _json_dumps(metadata),
            now,
        ),
    )
    conn.commit()
    return {
        "eventId": event_id,
        "userId": user_id,
        "workspaceId": workspace_id,
        "eventType": event_type,
        "source": source,
        "metadata": metadata or {},
        "createdAt": now,
    }


def _ensure_privacy_row(
    conn: sqlite3.Connection,
    *,
    user_id: str = DEFAULT_USER_ID,
    workspace_id: str = DEFAULT_WORKSPACE_ID,
) -> None:
    ensure_product_ops_schema(conn)
    conn.execute(
        """
        INSERT INTO product_privacy_settings (
            user_id,
            workspace_id,
            updated_at
        )
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, workspace_id) DO NOTHING
        """,
        (user_id, workspace_id, _utc_iso_now()),
    )
    conn.commit()


def _serialize_privacy_row(row: sqlite3.Row | None) -> dict[str, Any]:
    payload = dict(row) if row else {}
    return {
        "userId": payload.get("user_id") or DEFAULT_USER_ID,
        "workspaceId": payload.get("workspace_id") or DEFAULT_WORKSPACE_ID,
        "retentionDays": int(payload.get("retention_days") or 180),
        "allowTier2Signals": bool(payload.get("allow_tier2_signals", 1)),
        "allowVaultSignals": bool(payload.get("allow_vault_signals", 1)),
        "allowCalendarSignals": bool(payload.get("allow_calendar_signals", 1)),
        "allowScholarPersonalization": bool(
            payload.get("allow_scholar_personalization", 1)
        ),
        "allowOutcomeReports": bool(payload.get("allow_outcome_reports", 1)),
        "updatedAt": payload.get("updated_at") or _utc_iso_now(),
    }


def get_privacy_settings(
    conn: sqlite3.Connection,
    *,
    user_id: str = DEFAULT_USER_ID,
    workspace_id: str = DEFAULT_WORKSPACE_ID,
) -> dict[str, Any]:
    _ensure_row_factory(conn)
    _ensure_privacy_row(conn, user_id=user_id, workspace_id=workspace_id)
    row = conn.execute(
        """
        SELECT *
        FROM product_privacy_settings
        WHERE user_id = ? AND workspace_id = ?
        LIMIT 1
        """,
        (user_id, workspace_id),
    ).fetchone()
    return _serialize_privacy_row(row)


def update_privacy_settings(
    conn: sqlite3.Connection,
    payload: dict[str, Any],
    *,
    user_id: str = DEFAULT_USER_ID,
    workspace_id: str = DEFAULT_WORKSPACE_ID,
) -> dict[str, Any]:
    _ensure_privacy_row(conn, user_id=user_id, workspace_id=workspace_id)
    current = get_privacy_settings(conn, user_id=user_id, workspace_id=workspace_id)

    retention_days = int(payload.get("retentionDays", current["retentionDays"]))
    retention_days = max(30, min(retention_days, 3650))

    next_state = {
        "retentionDays": retention_days,
        "allowTier2Signals": bool(
            payload.get("allowTier2Signals", current["allowTier2Signals"])
        ),
        "allowVaultSignals": bool(
            payload.get("allowVaultSignals", current["allowVaultSignals"])
        ),
        "allowCalendarSignals": bool(
            payload.get("allowCalendarSignals", current["allowCalendarSignals"])
        ),
        "allowScholarPersonalization": bool(
            payload.get(
                "allowScholarPersonalization",
                current["allowScholarPersonalization"],
            )
        ),
        "allowOutcomeReports": bool(
            payload.get("allowOutcomeReports", current["allowOutcomeReports"])
        ),
    }

    now = _utc_iso_now()
    conn.execute(
        """
        UPDATE product_privacy_settings
        SET retention_days = ?,
            allow_tier2_signals = ?,
            allow_vault_signals = ?,
            allow_calendar_signals = ?,
            allow_scholar_personalization = ?,
            allow_outcome_reports = ?,
            updated_at = ?
        WHERE user_id = ? AND workspace_id = ?
        """,
        (
            next_state["retentionDays"],
            int(next_state["allowTier2Signals"]),
            int(next_state["allowVaultSignals"]),
            int(next_state["allowCalendarSignals"]),
            int(next_state["allowScholarPersonalization"]),
            int(next_state["allowOutcomeReports"]),
            now,
            user_id,
            workspace_id,
        ),
    )
    conn.commit()
    log_product_event(
        conn,
        event_type="privacy_settings_updated",
        source="product.privacy",
        metadata=next_state,
        user_id=user_id,
        workspace_id=workspace_id,
    )
    return get_privacy_settings(conn, user_id=user_id, workspace_id=workspace_id)


def list_feature_flags(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    _ensure_row_factory(conn)
    ensure_product_ops_schema(conn)
    rows = conn.execute(
        """
        SELECT flag_key, enabled, variant, description, scope, updated_at
        FROM product_feature_flags
        ORDER BY flag_key ASC
        """
    ).fetchall()
    return [
        {
            "flagKey": row["flag_key"],
            "enabled": bool(row["enabled"]),
            "variant": row["variant"],
            "description": row["description"] or "",
            "scope": row["scope"] or "global",
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


def _count_value(
    conn: sqlite3.Connection, query: str, params: tuple[Any, ...] = ()
) -> int:
    row = conn.execute(query, params).fetchone()
    if not row:
        return 0
    return int(row[0] or 0)


def build_product_analytics(
    conn: sqlite3.Connection,
    *,
    user_id: str = DEFAULT_USER_ID,
    workspace_id: str = DEFAULT_WORKSPACE_ID,
) -> dict[str, Any]:
    _ensure_row_factory(conn)
    ensure_product_ops_schema(conn)
    profile = get_profile_summary(conn, user_id=user_id, force_refresh=False)
    claim_rows = get_profile_claims(conn, user_id=user_id, force_refresh=False).get(
        "claims"
    ) or []
    window_start = (_utc_now() - timedelta(days=30)).isoformat()

    onboarding_completed = conn.execute(
        """
        SELECT created_at
        FROM product_events
        WHERE user_id = ? AND workspace_id = ? AND event_type = 'onboarding_completed'
        ORDER BY created_at ASC
        LIMIT 1
        """,
        (user_id, workspace_id),
    ).fetchone()

    export_count = _count_value(
        conn,
        """
        SELECT COUNT(*)
        FROM product_events
        WHERE user_id = ? AND workspace_id = ? AND event_type IN (
            'brain_exported',
            'scholar_exported',
            'outcome_report_exported'
        )
        """,
        (user_id, workspace_id),
    )

    sessions_started = _count_value(
        conn,
        """
        SELECT COUNT(*)
        FROM tutor_sessions
        WHERE started_at IS NOT NULL AND started_at >= ?
        """,
        (window_start,),
    ) if _table_exists(conn, "tutor_sessions") else 0
    sessions_completed = _count_value(
        conn,
        """
        SELECT COUNT(*)
        FROM tutor_sessions
        WHERE status = 'completed' AND ended_at IS NOT NULL AND ended_at >= ?
        """,
        (window_start,),
    ) if _table_exists(conn, "tutor_sessions") else 0
    strategy_feedback_count = _count_value(
        conn,
        """
        SELECT COUNT(*)
        FROM tutor_sessions
        WHERE strategy_feedback_json IS NOT NULL
          AND TRIM(strategy_feedback_json) <> ''
        """,
    ) if _table_exists(conn, "tutor_sessions") else 0

    brain_feedback_count = _count_value(
        conn,
        """
        SELECT COUNT(*)
        FROM learner_profile_feedback_events
        WHERE user_id = ? AND created_at >= ?
        """,
        (user_id, window_start),
    ) if _table_exists(conn, "learner_profile_feedback_events") else 0

    scholar_total_questions = _count_value(
        conn,
        "SELECT COUNT(*) FROM scholar_questions",
    ) if _table_exists(conn, "scholar_questions") else 0
    scholar_answered_questions = _count_value(
        conn,
        """
        SELECT COUNT(*)
        FROM scholar_questions
        WHERE status = 'answered'
        """,
    ) if _table_exists(conn, "scholar_questions") else 0
    scholar_pending_questions = _count_value(
        conn,
        """
        SELECT COUNT(*)
        FROM scholar_questions
        WHERE status = 'pending'
        """,
    ) if _table_exists(conn, "scholar_questions") else 0
    scholar_investigations = _count_value(
        conn,
        "SELECT COUNT(*) FROM scholar_investigations",
    ) if _table_exists(conn, "scholar_investigations") else 0

    question_response_rate = round(
        scholar_answered_questions / scholar_total_questions, 2
    ) if scholar_total_questions else 0.0
    tutor_completion_rate = round(
        sessions_completed / sessions_started, 2
    ) if sessions_started else 0.0

    retrieval_claim = next(
        (
            claim
            for claim in claim_rows
            if claim.get("claimKey") == "retrieval_resilience"
        ),
        None,
    )

    return {
        "generatedAt": _utc_iso_now(),
        "userId": user_id,
        "workspaceId": workspace_id,
        "activation": {
            "onboardingCompleted": bool(onboarding_completed),
            "onboardingCompletedAt": onboarding_completed["created_at"]
            if onboarding_completed
            else None,
            "brainProfileReady": bool(profile.get("snapshotId")),
            "firstArchetypeLabel": (profile.get("hybridArchetype") or {}).get("label"),
        },
        "engagement": {
            "brainTrustInteractions30d": brain_feedback_count,
            "scholarInvestigations": scholar_investigations,
            "scholarPendingQuestions": scholar_pending_questions,
            "scholarAnsweredQuestions": scholar_answered_questions,
            "scholarQuestionResponseRate": question_response_rate,
            "tutorSessionsStarted30d": sessions_started,
            "tutorSessionsCompleted30d": sessions_completed,
            "tutorCompletionRate30d": tutor_completion_rate,
            "strategyFeedbackCount": strategy_feedback_count,
            "exportsTriggered": export_count,
        },
        "valueProof": {
            "clearerDiagnosis": bool(profile.get("snapshotId"))
            and bool((profile.get("hybridArchetype") or {}).get("label")),
            "betterFollowThrough": sessions_completed,
            "strongerRetrieval": retrieval_claim.get("score") if retrieval_claim else None,
            "betterSelfUnderstanding": brain_feedback_count + scholar_answered_questions,
        },
        "nextBestActions": (profile.get("profileSummary") or {}).get("nextBestActions")
        or [],
    }


def build_outcome_report(
    conn: sqlite3.Connection,
    *,
    user_id: str = DEFAULT_USER_ID,
    workspace_id: str = DEFAULT_WORKSPACE_ID,
) -> dict[str, Any]:
    analytics = build_product_analytics(
        conn,
        user_id=user_id,
        workspace_id=workspace_id,
    )
    profile = get_profile_summary(conn, user_id=user_id, force_refresh=False)
    archetype = profile.get("hybridArchetype") or {}
    profile_summary = profile.get("profileSummary") or {}

    engagement = analytics["engagement"]
    highlights = [
        f"Brain currently sees your strongest pattern as {archetype.get('label', 'an emerging learner pattern')}.",
        (
            f"Scholar has answered {engagement['scholarAnsweredQuestions']} of "
            f"{engagement['scholarAnsweredQuestions'] + engagement['scholarPendingQuestions']} tracked learner questions."
        ),
        (
            f"Tutor completed {engagement['tutorSessionsCompleted30d']} session(s) in the last 30 days "
            f"with a {int(engagement['tutorCompletionRate30d'] * 100) if engagement['tutorCompletionRate30d'] else 0}% completion rate."
        ),
    ]

    narrative = (
        f"Brain identifies the learner as {archetype.get('label', 'an emerging learner pattern')} with "
        f"{profile_summary.get('headline', 'a still-forming evidence picture')}. "
        f"Scholar has a {int(engagement['scholarQuestionResponseRate'] * 100) if engagement['scholarQuestionResponseRate'] else 0}% learner-question response rate, "
        f"and Tutor has completed {engagement['tutorSessionsCompleted30d']} guided session(s) in the last 30 days."
    )

    return {
        "generatedAt": _utc_iso_now(),
        "userId": user_id,
        "workspaceId": workspace_id,
        "headline": "Brain / Scholar / Tutor outcome report",
        "narrative": narrative,
        "brain": {
            "snapshotId": profile.get("snapshotId"),
            "hybridArchetype": archetype,
            "profileSummary": profile_summary,
            "claimsOverview": profile.get("claimsOverview") or {},
        },
        "scholar": {
            "investigationCount": engagement["scholarInvestigations"],
            "answeredQuestions": engagement["scholarAnsweredQuestions"],
            "pendingQuestions": engagement["scholarPendingQuestions"],
            "responseRate": engagement["scholarQuestionResponseRate"],
        },
        "tutor": {
            "sessionsStarted30d": engagement["tutorSessionsStarted30d"],
            "sessionsCompleted30d": engagement["tutorSessionsCompleted30d"],
            "completionRate30d": engagement["tutorCompletionRate30d"],
            "strategyFeedbackCount": engagement["strategyFeedbackCount"],
        },
        "proof": analytics["valueProof"],
        "highlights": highlights,
        "recommendedNextActions": analytics["nextBestActions"],
    }


def reset_personalization(
    conn: sqlite3.Connection,
    *,
    user_id: str = DEFAULT_USER_ID,
    workspace_id: str = DEFAULT_WORKSPACE_ID,
) -> dict[str, Any]:
    ensure_product_ops_schema(conn)
    deleted: dict[str, int] = {}

    if _table_exists(conn, "learner_profile_feedback_events"):
        deleted["learnerProfileFeedbackEvents"] = _count_value(
            conn,
            "SELECT COUNT(*) FROM learner_profile_feedback_events WHERE user_id = ?",
            (user_id,),
        )
        conn.execute(
            "DELETE FROM learner_profile_feedback_events WHERE user_id = ?",
            (user_id,),
        )

    if _table_exists(conn, "learner_profile_questions"):
        deleted["learnerProfileQuestions"] = _count_value(
            conn,
            "SELECT COUNT(*) FROM learner_profile_questions WHERE user_id = ?",
            (user_id,),
        )
        conn.execute("DELETE FROM learner_profile_questions WHERE user_id = ?", (user_id,))

    if _table_exists(conn, "learner_profile_claims"):
        deleted["learnerProfileClaims"] = _count_value(
            conn,
            "SELECT COUNT(*) FROM learner_profile_claims WHERE user_id = ?",
            (user_id,),
        )
        conn.execute("DELETE FROM learner_profile_claims WHERE user_id = ?", (user_id,))

    if _table_exists(conn, "learner_profile_snapshots"):
        deleted["learnerProfileSnapshots"] = _count_value(
            conn,
            "SELECT COUNT(*) FROM learner_profile_snapshots WHERE user_id = ?",
            (user_id,),
        )
        conn.execute(
            "DELETE FROM learner_profile_snapshots WHERE user_id = ?",
            (user_id,),
        )

    if _table_exists(conn, "scholar_findings"):
        deleted["scholarFindings"] = _count_value(conn, "SELECT COUNT(*) FROM scholar_findings")
        conn.execute("DELETE FROM scholar_findings")
    if _table_exists(conn, "scholar_sources"):
        deleted["scholarSources"] = _count_value(conn, "SELECT COUNT(*) FROM scholar_sources")
        conn.execute("DELETE FROM scholar_sources")
    if _table_exists(conn, "scholar_questions"):
        deleted["scholarQuestions"] = _count_value(conn, "SELECT COUNT(*) FROM scholar_questions")
        conn.execute("DELETE FROM scholar_questions")
    if _table_exists(conn, "scholar_investigations"):
        deleted["scholarInvestigations"] = _count_value(
            conn, "SELECT COUNT(*) FROM scholar_investigations"
        )
        conn.execute("DELETE FROM scholar_investigations")

    if _table_exists(conn, "tutor_sessions"):
        deleted["tutorStrategySnapshotsCleared"] = _count_value(
            conn,
            """
            SELECT COUNT(*)
            FROM tutor_sessions
            WHERE scholar_strategy_json IS NOT NULL
               OR strategy_feedback_json IS NOT NULL
               OR brain_profile_snapshot_id IS NOT NULL
            """,
        )
        conn.execute(
            """
            UPDATE tutor_sessions
            SET scholar_strategy_json = NULL,
                strategy_feedback_json = NULL,
                brain_profile_snapshot_id = NULL
            """
        )

    conn.commit()

    event = log_product_event(
        conn,
        event_type="personalization_reset",
        source="product.privacy",
        metadata=deleted,
        user_id=user_id,
        workspace_id=workspace_id,
    )
    return {
        "ok": True,
        "userId": user_id,
        "workspaceId": workspace_id,
        "deleted": deleted,
        "note": "Current Scholar research data is still single-user scoped, so the reset clears all Scholar investigations and findings in this local workspace.",
        "event": event,
    }
