from __future__ import annotations

import json
import os
import sqlite3
import sys
import tempfile
from datetime import datetime, timedelta, timezone

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
from learner_profile import DEFAULT_USER_ID, build_or_refresh_profile
from product_ops import DEFAULT_WORKSPACE_ID
from scholar_research import ensure_scholar_research_schema
import dashboard.api_data as _api_data_mod
import scholar_research as _scholar_research_mod


def _iso_days_ago(days: int) -> tuple[str, str]:
    dt = datetime.now(timezone.utc) - timedelta(days=days)
    return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M")


def _seed_product_state(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    ensure_scholar_research_schema(conn)

    sessions = [
        (1, 0.8, 0.2, 0.7),
        (3, 0.7, 0.3, 0.6),
        (5, 0.6, 0.4, 0.5),
    ]
    for index, (days_ago, rsr_score, calibration_gap, retention_confidence) in enumerate(
        sessions, start=1
    ):
        session_date, session_time = _iso_days_ago(days_ago)
        conn.execute(
            """
            INSERT INTO sessions (
                session_date,
                session_time,
                study_mode,
                main_topic,
                created_at,
                rsr_percent,
                calibration_gap,
                retention_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_date,
                session_time,
                "Tutor",
                "Neuroscience",
                f"{session_date}T{session_time}:00+00:00",
                int(rsr_score * 100),
                int(calibration_gap * 10),
                int(retention_confidence * 10),
            ),
        )

    practice_rows = [
        ("skill-a", 1, 0.9, 0, "attempt", 0),
        ("skill-a", 0, 0.8, 1, "hint", 1),
        ("skill-b", 1, 0.7, 0, "teach_back", 2),
    ]
    now = datetime.now(timezone.utc)
    for idx, (skill_id, correct, confidence, hint_level, source, days_ago) in enumerate(
        practice_rows, start=1
    ):
        ts = now - timedelta(days=days_ago)
        conn.execute(
            """
            INSERT INTO practice_events (
                user_id,
                skill_id,
                timestamp,
                correct,
                confidence,
                latency_ms,
                hint_level,
                item_format,
                source,
                session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                DEFAULT_USER_ID,
                skill_id,
                ts.timestamp(),
                correct,
                confidence,
                1200 + idx * 50,
                hint_level,
                "free_recall",
                source,
                f"session-{idx}",
            ),
        )

    conn.execute(
        """
        INSERT INTO skill_mastery (
            user_id,
            skill_id,
            p_mastery_latent,
            p_learn,
            p_guess,
            p_slip,
            last_practiced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            DEFAULT_USER_ID,
            "skill-a",
            0.72,
            0.1,
            0.2,
            0.1,
            now.timestamp(),
        ),
    )

    conn.execute(
        """
        INSERT INTO tutor_sessions (
            session_id,
            started_at,
            ended_at,
            status,
            scholar_strategy_json,
            strategy_feedback_json,
            brain_profile_snapshot_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "tutor-1",
            now.isoformat(),
            now.isoformat(),
            "completed",
            json.dumps({"summary": "bounded"}),
            json.dumps({"pacing": "helpful"}),
            1,
        ),
    )

    created_at = now.isoformat()
    conn.execute(
        """
        INSERT INTO scholar_investigations (
            investigation_id,
            title,
            query_text,
            rationale,
            audience_type,
            mode,
            status,
            source_policy,
            confidence,
            linked_profile_snapshot_id,
            requested_by,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "scholar-inv-test",
            "Research retrieval gaps",
            "How should Scholar reduce retrieval failures?",
            "Outcome-report and analytics coverage",
            "learner",
            "brain",
            "completed",
            "trusted-first",
            "medium",
            "1",
            "ui",
            created_at,
            created_at,
        ),
    )
    conn.execute(
        """
        INSERT INTO scholar_questions (
            question_id,
            question_hash,
            question_text,
            source,
            status,
            created_at,
            updated_at,
            audience_type,
            rationale,
            linked_investigation_id,
            evidence_needed,
            answer_text,
            answer_source,
            answered_at,
            answer_incorporation_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "sq-1",
            "hash-1",
            "What part of retrieval breaks down first?",
            "scholar-research",
            "answered",
            created_at,
            created_at,
            "learner",
            "Need learner context",
            "scholar-inv-test",
            "learner response",
            "Free recall stalls first.",
            "ui",
            created_at,
            "incorporated",
        ),
    )
    conn.execute(
        """
        INSERT INTO scholar_findings (
            finding_id,
            investigation_id,
            title,
            summary,
            confidence,
            uncertainty,
            learner_visible,
            source_ids_json,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "finding-1",
            "scholar-inv-test",
            "Retrieval breaks during cold starts",
            "Learner needs a lighter runway before high-pressure recall.",
            "medium",
            "Needs more repetitions",
            1,
            "[]",
            created_at,
            created_at,
        ),
    )

    conn.commit()
    build_or_refresh_profile(conn)
    conn.commit()
    conn.close()


@pytest.fixture(scope="module", autouse=True)
def isolated_db():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    orig_env = os.environ.get("PT_STUDY_DB")
    orig_config = config.DB_PATH
    orig_db_setup = db_setup.DB_PATH
    orig_api_data = _api_data_mod.DB_PATH
    orig_scholar_db = _scholar_research_mod.DB_PATH

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path
    _scholar_research_mod.DB_PATH = tmp_path

    db_setup.init_database()
    _seed_product_state(tmp_path)

    yield tmp_path

    config.DB_PATH = orig_config
    db_setup.DB_PATH = orig_db_setup
    _api_data_mod.DB_PATH = orig_api_data
    _scholar_research_mod.DB_PATH = orig_scholar_db
    if orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = orig_env
    try:
        os.unlink(tmp_path)
    except OSError:
        pass


@pytest.fixture(scope="module")
def app(isolated_db):
    app_obj = create_app()
    app_obj.config["TESTING"] = True
    return app_obj


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


def test_get_product_analytics_contract(client):
    resp = client.get("/api/product/analytics")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["userId"] == DEFAULT_USER_ID
    assert data["workspaceId"] == DEFAULT_WORKSPACE_ID
    assert "activation" in data
    assert "engagement" in data
    assert "valueProof" in data


def test_product_privacy_settings_round_trip(client):
    resp = client.get("/api/product/privacy")
    assert resp.status_code == 200
    current = resp.get_json()
    assert current["retentionDays"] >= 30

    update = client.post(
        "/api/product/privacy",
        data=json.dumps({"retentionDays": 365, "allowOutcomeReports": False}),
        content_type="application/json",
    )
    assert update.status_code == 200
    payload = update.get_json()
    assert payload["retentionDays"] == 365
    assert payload["allowOutcomeReports"] is False


def test_product_event_and_feature_flags_contract(client):
    event_resp = client.post(
        "/api/product/events",
        data=json.dumps(
            {
                "eventType": "onboarding_completed",
                "source": "dashboard.onboarding",
                "metadata": {"goal": "retain more after sessions"},
            }
        ),
        content_type="application/json",
    )
    assert event_resp.status_code == 200
    event = event_resp.get_json()
    assert event["eventType"] == "onboarding_completed"

    flags_resp = client.get("/api/product/feature-flags")
    assert flags_resp.status_code == 200
    flags = flags_resp.get_json()["flags"]
    assert any(flag["flagKey"] == "premium_outcome_report" for flag in flags)


def test_get_product_outcome_report_contract(client):
    resp = client.get("/api/product/outcome-report")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["userId"] == DEFAULT_USER_ID
    assert data["workspaceId"] == DEFAULT_WORKSPACE_ID
    assert data["brain"]["snapshotId"] is not None
    assert isinstance(data["highlights"], list)
    assert isinstance(data["recommendedNextActions"], list)


def test_reset_personalization_contract(client):
    resp = client.post(
        "/api/product/privacy/reset-personalization",
        data=json.dumps({}),
        content_type="application/json",
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ok"] is True
    assert data["deleted"]["learnerProfileSnapshots"] >= 1
    assert data["deleted"]["scholarInvestigations"] >= 1
