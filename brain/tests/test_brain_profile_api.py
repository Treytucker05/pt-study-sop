"""Wave 1 Brain learner-profile API and derivation tests."""

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
from learner_profile import (
    DEFAULT_USER_ID,
    build_or_refresh_profile,
    get_profile_questions,
    submit_profile_feedback,
)
import dashboard.api_data as _api_data_mod


def _iso_days_ago(days: int) -> tuple[str, str]:
    dt = datetime.now(timezone.utc) - timedelta(days=days)
    return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M")


def _seed_profile_telemetry(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    sessions = [
        (1, 0.8, 0.2, 0.7),
        (3, 0.7, 0.3, 0.6),
        (5, 0.6, 0.4, 0.5),
        (9, 0.9, 0.2, 0.8),
    ]
    for index, (days_ago, rsr_score, calibration_gap, retention_confidence) in enumerate(sessions, start=1):
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
                retention_confidence,
                confusions,
                issues,
                errors_recall,
                gaps_identified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                json.dumps(["basal ganglia"] if index % 2 else []),
                json.dumps(["mixing loops"] if index % 2 else []),
                json.dumps(["recall drift"] if index % 2 else []),
                json.dumps(["thalamus"] if index % 2 else []),
            ),
        )

    practice_rows = [
        ("skill-a", 1, 0.9, 0, "attempt", 0),
        ("skill-a", 0, 0.8, 1, "hint", 1),
        ("skill-b", 1, 0.7, 0, "teach_back", 2),
        ("skill-b", 0, 0.6, 1, "attempt", 3),
        ("skill-c", 1, 0.95, 0, "attempt", 5),
    ]
    now = datetime.now(timezone.utc)
    for idx, (skill_id, correct, confidence, hint_level, source, days_ago) in enumerate(practice_rows, start=1):
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

    error_rows = [
        ("skill-a", "recall_failure", "high", 1),
        ("skill-a", "confusion", "medium", 2),
        ("skill-b", "misclassification", "medium", 3),
    ]
    for skill_id, error_type, severity, days_ago in error_rows:
        ts = now - timedelta(days=days_ago)
        conn.execute(
            """
            INSERT INTO error_flags (
                user_id,
                skill_id,
                error_type,
                severity,
                timestamp,
                evidence_ref
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                DEFAULT_USER_ID,
                skill_id,
                error_type,
                severity,
                ts.timestamp(),
                f"telemetry:{skill_id}:{error_type}",
            ),
        )

    mastery_rows = [
        ("skill-a", 0.72),
        ("skill-b", 0.58),
        ("skill-c", 0.83),
    ]
    for skill_id, mastery in mastery_rows:
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
                skill_id,
                mastery,
                0.1,
                0.2,
                0.1,
                now.timestamp(),
            ),
        )

    conn.commit()
    conn.close()


@pytest.fixture(scope="module", autouse=True)
def isolated_db():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    _orig_env = os.environ.get("PT_STUDY_DB")
    _orig_config = config.DB_PATH
    _orig_db_setup = db_setup.DB_PATH
    _orig_api_data = _api_data_mod.DB_PATH

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path

    db_setup.init_database()
    _seed_profile_telemetry(tmp_path)

    yield tmp_path

    config.DB_PATH = _orig_config
    db_setup.DB_PATH = _orig_db_setup
    _api_data_mod.DB_PATH = _orig_api_data
    if _orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = _orig_env
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


def test_build_or_refresh_profile_persists_snapshot():
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    profile = build_or_refresh_profile(conn)
    assert profile["snapshotId"] > 0
    assert profile["hybridArchetype"]["label"]
    assert len(profile["claims"]) == 5
    assert profile["profileSummary"]["backfillMode"] == "single_snapshot_seed"
    assert profile["claimsOverview"]["count"] == 5
    conn.close()


def test_submit_profile_feedback_answers_pending_question():
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    questions = get_profile_questions(conn)
    assert questions["count"] >= 1
    question_id = questions["questions"][0]["id"]
    result = submit_profile_feedback(
        conn,
        {
            "questionId": question_id,
            "responseType": "answer",
            "responseText": "Interruptions usually come from uncertainty about where to restart.",
            "source": "test",
        },
    )
    assert result["ok"] is True
    assert result["question"]["status"] == "answered"
    conn.close()


def test_get_brain_profile_summary_contract(client):
    resp = client.get("/api/brain/profile")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["snapshotId"] > 0
    assert "hybridArchetype" in data
    assert "profileSummary" in data
    assert "claimsOverview" in data
    assert "reliabilityTiers" in data


def test_get_brain_profile_claims_contract(client):
    resp = client.get("/api/brain/profile/claims")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["count"] == 5
    assert isinstance(data["claims"], list)
    assert any(claim["claimKey"] == "calibration_accuracy" for claim in data["claims"])


def test_post_brain_profile_feedback_contract(client):
    questions_resp = client.get("/api/brain/profile/questions?force=1")
    assert questions_resp.status_code == 200
    questions = questions_resp.get_json()["questions"]
    question_id = questions[0]["id"]

    resp = client.post(
        "/api/brain/profile/feedback",
        data=json.dumps(
            {
                "questionId": question_id,
                "responseType": "answer",
                "responseText": "A short example usually unlocks the next attempt.",
                "source": "ui-test",
            }
        ),
        content_type="application/json",
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ok"] is True
    assert data["question"]["status"] == "answered"


def test_invalid_feedback_payload_returns_400(client):
    resp = client.post(
        "/api/brain/profile/feedback",
        data=json.dumps({"responseType": "answer", "responseText": "missing question id"}),
        content_type="application/json",
    )
    assert resp.status_code == 400
