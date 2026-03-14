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
import dashboard.api_data as _api_data_mod
from dashboard.app import create_app
from scholar_strategy import build_tutor_strategy_snapshot


def _seed_minimal_profile_data(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    now = datetime.now(timezone.utc)
    session_date = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    session_time = "09:00"

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
            68,
            4,
            6,
            json.dumps(["timing"]),
            json.dumps(["scaffold dependence"]),
            json.dumps(["recall drift"]),
            json.dumps(["basal ganglia"]),
        ),
    )

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
            "default",
            "skill-a",
            now.timestamp(),
            0,
            0.82,
            1800,
            2,
            "free_recall",
            "hint",
            "seed-session",
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
        ("default", "skill-a", 0.44, 0.18, 0.2, 0.15, now.timestamp()),
    )
    conn.execute(
        """
        INSERT INTO scholar_investigations (
            investigation_id,
            title,
            query_text,
            rationale,
            audience_type,
            mode,
            requested_by,
            status,
            confidence,
            uncertainty_summary,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "investigation-1",
            "Scaffold dependence investigation",
            "Why does this learner still need guided checkpoints?",
            "Validate the pattern before Tutor adapts too far.",
            "learner",
            "brain",
            "test",
            "completed",
            "medium",
            "Needs learner confirmation.",
            now.isoformat(),
            now.isoformat(),
        ),
    )
    conn.execute(
        """
        INSERT INTO scholar_findings (
            finding_id,
            investigation_id,
            title,
            summary,
            relevance,
            confidence,
            uncertainty,
            source_ids_json,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "finding-1",
            "investigation-1",
            "Guided checkpoints may be arriving too early",
            "The learner likely needs tighter checkpointing before Tutor speeds up.",
            "High",
            "medium",
            "Needs more learner feedback.",
            json.dumps([]),
            now.isoformat(),
            now.isoformat(),
        ),
    )
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

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path

    db_setup.init_database()
    _seed_minimal_profile_data(tmp_path)

    yield tmp_path

    config.DB_PATH = orig_config
    db_setup.DB_PATH = orig_db_setup
    _api_data_mod.DB_PATH = orig_api_data
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


@pytest.fixture
def client(app):
    return app.test_client()


def test_build_strategy_snapshot_is_bounded(isolated_db: str):
    conn = sqlite3.connect(isolated_db)
    conn.row_factory = sqlite3.Row
    try:
        snapshot = build_tutor_strategy_snapshot(conn, user_id="default")
    finally:
        conn.close()

    assert snapshot["profileSnapshotId"] is not None
    assert snapshot["boundedBy"]["allowedFields"] == [
        "pacing",
        "scaffoldDepth",
        "retrievalIntensity",
        "explanationDensity",
        "hintBudget",
        "checkpointFrequency",
        "wrapStyle",
    ]
    assert "controlStageOrder" in snapshot["boundedBy"]["forbiddenFields"]
    assert snapshot["activeInvestigation"]["investigationId"] == "investigation-1"
    assert snapshot["fields"]["scaffoldDepth"]["value"] in {"guided", "full", "light", "minimal"}


def test_create_session_returns_scholar_strategy(client):
    response = client.post(
        "/api/tutor/session",
        json={
            "phase": "first_pass",
            "mode": "Core",
            "topic": "Basal Ganglia",
        },
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["brain_profile_snapshot_id"] is not None
    assert payload["scholar_strategy"]["summary"]
    assert payload["scholar_strategy"]["activeInvestigation"]["investigationId"] == "investigation-1"

    session_id = payload["session_id"]
    detail = client.get(f"/api/tutor/session/{session_id}")
    assert detail.status_code == 200
    session = detail.get_json()
    assert session["scholar_strategy"]["fields"]["pacing"]["value"]


def test_strategy_feedback_endpoint_persists_on_session(client):
    created = client.post(
        "/api/tutor/session",
        json={
            "phase": "first_pass",
            "mode": "Core",
            "topic": "Thalamus",
        },
    ).get_json()
    session_id = created["session_id"]

    response = client.post(
        f"/api/tutor/session/{session_id}/strategy-feedback",
        json={
            "pacing": "good",
            "scaffolds": "more",
            "retrievalPressure": "lighter",
            "explanationDensity": "good",
            "notes": "Needs more explicit checkpointing before retrieval ramps up.",
        },
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["strategy_feedback"]["pacing"] == "good"
    assert payload["strategy_feedback"]["notes"].startswith("Needs more explicit")

    detail = client.get(f"/api/tutor/session/{session_id}")
    session = detail.get_json()
    assert session["strategy_feedback"]["scaffolds"] == "more"

