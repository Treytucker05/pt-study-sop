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
import scholar_research
from dashboard.app import create_app
import dashboard.api_data as _api_data_mod
import dashboard.api_scholar_research as _api_scholar_mod


def _seed_minimal_profile_data(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    now = datetime.now(timezone.utc)
    session_date = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    session_time = "10:00"

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
            72,
            3,
            7,
            json.dumps(["basal ganglia"]),
            json.dumps(["timing drift"]),
            json.dumps(["recall drift"]),
            json.dumps(["thalamus"]),
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
            1,
            0.75,
            1200,
            0,
            "free_recall",
            "attempt",
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
        ("default", "skill-a", 0.72, 0.1, 0.2, 0.1, now.timestamp()),
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
    orig_scholar_research = scholar_research.DB_PATH

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path
    scholar_research.DB_PATH = tmp_path

    db_setup.init_database()
    _seed_minimal_profile_data(tmp_path)

    yield tmp_path

    config.DB_PATH = orig_config
    db_setup.DB_PATH = orig_db_setup
    _api_data_mod.DB_PATH = orig_api_data
    scholar_research.DB_PATH = orig_scholar_research
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


def _fake_search(_query: str, _limit: int):
    return [
        {
            "title": "Retrieval support study",
            "url": "https://example.edu/retrieval-support",
            "normalized_url": "https://example.edu/retrieval-support",
            "snippet": "Study about retrieval support and learner calibration.",
            "domain": "example.edu",
            "publisher": "Example University",
            "trust_tier": "high",
            "rank_order": 1,
            "source_type": "web",
        },
        {
            "title": "Calibration drift article",
            "url": "https://nih.gov/calibration-drift",
            "normalized_url": "https://nih.gov/calibration-drift",
            "snippet": "NIH article about calibration drift and scaffolding.",
            "domain": "nih.gov",
            "publisher": "NIH",
            "trust_tier": "high",
            "rank_order": 2,
            "source_type": "web",
        },
    ]


def _fake_fetch(result):
    return {
        "title": result["title"],
        "url": result["url"],
        "normalized_url": result["normalized_url"],
        "domain": result["domain"],
        "publisher": result["publisher"],
        "published_at": "2025-01-01",
        "snippet": result["snippet"],
        "source_type": "web",
        "trust_tier": result["trust_tier"],
        "rank_order": result["rank_order"],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _fake_llm(*_args, **_kwargs):
    return {
        "success": True,
        "content": json.dumps(
            {
                "confidence": "medium",
                "uncertainty_summary": "Evidence is directionally aligned, but Scholar still needs learner confirmation.",
                "findings": [
                    {
                        "title": "Scaffolds may be masking calibration drift",
                        "summary": "The sources suggest guided retrieval can hide uncertainty in self-judgment.",
                        "relevance": "This changes how Scholar should interpret scaffold-heavy sessions.",
                        "confidence": "medium",
                        "uncertainty": "Needs learner confirmation.",
                        "source_ids": ["placeholder-1", "placeholder-2"],
                    }
                ],
                "questions": [
                    {
                        "question_text": "Does guided retrieval still feel necessary late in the session?",
                        "rationale": "Scholar needs learner-specific context before changing later strategy.",
                        "evidence_needed": "Direct learner confirmation or contradiction.",
                        "is_blocking": False,
                    }
                ],
            }
        ),
    }


def test_run_investigation_sync_blocks_when_no_sources():
    investigation = scholar_research.create_investigation(
        title="No sources case",
        query_text="What should Scholar do with no sources?",
        rationale="Validate no-source fallback",
    )

    detail = scholar_research.run_investigation_sync(
        investigation["investigation_id"],
        search_fn=lambda *_args, **_kwargs: [],
        fetch_fn=lambda *_args, **_kwargs: {},
        llm_fn=lambda *_args, **_kwargs: {"success": False, "error": "skip"},
    )

    assert detail["status"] == "blocked"
    assert len(detail["questions"]) >= 1
    assert detail["questions"][0]["is_blocking"] is True


def test_scholar_investigation_api_persists_findings_and_questions(client, monkeypatch):
    def _start_sync(**kwargs):
        investigation = scholar_research.create_investigation(
            title=kwargs["title"],
            query_text=kwargs["query_text"],
            rationale=kwargs["rationale"],
            audience_type=kwargs.get("audience_type", "learner"),
            mode=kwargs.get("mode", "brain"),
            requested_by=kwargs.get("requested_by", "ui"),
        )
        return scholar_research.run_investigation_sync(
            investigation["investigation_id"],
            search_fn=_fake_search,
            fetch_fn=_fake_fetch,
            llm_fn=_fake_llm,
        )

    monkeypatch.setattr(_api_scholar_mod, "start_investigation_run", _start_sync)

    response = client.post(
        "/api/scholar/investigations",
        json={
            "query_text": "Why does Brain think I need scaffolds?",
            "rationale": "Scholar should research whether that pattern is real.",
            "audience_type": "learner",
        },
    )
    assert response.status_code == 200
    created = response.get_json()
    assert created["investigation_id"]
    assert created["status"] == "completed"
    assert created["findings_count"] == 1
    assert created["open_question_count"] == 1

    list_response = client.get("/api/scholar/investigations")
    assert list_response.status_code == 200
    investigations = list_response.get_json()
    assert len(investigations) >= 1

    detail_response = client.get(
        f"/api/scholar/investigations/{created['investigation_id']}"
    )
    assert detail_response.status_code == 200
    detail = detail_response.get_json()
    assert len(detail["sources"]) == 2
    assert len(detail["findings"]) == 1
    assert len(detail["questions"]) == 1
    assert detail["questions"][0]["linked_investigation_id"] == created["investigation_id"]

    findings_response = client.get(
        f"/api/scholar/research/findings?investigation_id={created['investigation_id']}"
    )
    assert findings_response.status_code == 200
    findings = findings_response.get_json()
    assert len(findings) == 1
    assert len(findings[0]["sources"]) == 2


def test_answer_question_api_marks_question_answered(client):
    questions_response = client.get("/api/scholar/research/questions?status=all")
    assert questions_response.status_code == 200
    questions = questions_response.get_json()
    target = next(question for question in questions if question["status"] != "answered")

    answer_response = client.post(
        f"/api/scholar/research/questions/{target['question_id']}/answer",
        json={"answer": "Yes, I still need guided checkpoints near the end.", "source": "ui"},
    )
    assert answer_response.status_code == 200
    answered = answer_response.get_json()
    assert answered["status"] == "answered"
    assert answered["answer_text"] == "Yes, I still need guided checkpoints near the end."
    assert answered["answer_incorporation_status"] == "ready_for_refresh"


def test_export_scholar_research_contract(client):
    response = client.get("/api/scholar/export")
    assert response.status_code == 200
    payload = response.get_json()
    assert "exportedAt" in payload
    assert isinstance(payload["investigations"], list)
    assert isinstance(payload["questions"], list)
    assert isinstance(payload["findings"], list)
