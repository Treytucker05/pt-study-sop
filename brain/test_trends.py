import sys
from datetime import datetime, UTC
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))
brain_dir = ROOT / "brain"
if str(brain_dir) not in sys.path:
    sys.path.append(str(brain_dir))

from dashboard import cli as dashboard
import db_setup


@pytest.fixture
def temp_db(tmp_path, monkeypatch):
    temp_db_path = tmp_path / "pt_study.db"
    temp_db_path.parent.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(db_setup, "DB_PATH", str(temp_db_path.resolve()))
    db_setup.init_database()
    # Touch the file to ensure SQLite can open it in subsequent calls
    connection = db_setup.get_connection()
    connection.close()
    yield temp_db_path


@pytest.fixture
def sample_sessions(temp_db):
    conn = db_setup.get_connection()
    cursor = conn.cursor()
    rows = [
            ("2024-02-15", "10:00", "Topic B", "Sprint", 50, "", "No", "No", 3, 4, 4, 4, "", "", "", datetime.now(UTC).isoformat()),
            ("2024-01-01", "09:00", "Topic C", "Drill", 30, "", "No", "No", 1, 2, 2, 2, "", "", "", datetime.now(UTC).isoformat()),
            ("2023-12-31", "20:00", "Topic A", "Core", 40, "", "No", "No", 2, 5, 5, 5, "", "", "", datetime.now(UTC).isoformat()),
    ]
    cursor.executemany(
        """
        INSERT INTO sessions (
            session_date, session_time, topic, study_mode, time_spent_minutes,
            frameworks_used, gated_platter_triggered, wrap_phase_reached,
            anki_cards_count, understanding_level, retention_confidence,
            system_performance, what_worked, what_needs_fixing, notes_insights,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    conn.commit()
    conn.close()
    return rows


def test_get_all_sessions_returns_reverse_chronological(sample_sessions):
    sessions = dashboard.get_all_sessions()
    ordered_dates = [(s["session_date"], s["session_time"]) for s in sessions]
    assert ordered_dates == [
        ("2024-02-15", "10:00"),
        ("2024-01-01", "09:00"),
        ("2023-12-31", "20:00"),
    ]


def test_display_trends_reports_direction(monkeypatch, capsys):
    synthetic_sessions = [
        {"understanding_level": 4, "retention_confidence": 4, "system_performance": 4},
        {"understanding_level": 5, "retention_confidence": 5, "system_performance": 5},
        {"understanding_level": 2, "retention_confidence": 2, "system_performance": 2},
        {"understanding_level": 3, "retention_confidence": 3, "system_performance": 3},
    ]

    dashboard.display_trends(synthetic_sessions)
    output = capsys.readouterr().out

    assert "Understanding Level:  Improving" in output
    assert "Retention Confidence: Improving" in output
    assert "System Performance:   Improving" in output
