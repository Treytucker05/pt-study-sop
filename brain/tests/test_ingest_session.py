import sys
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))
brain_dir = ROOT / "brain"
if str(brain_dir) not in sys.path:
    sys.path.append(str(brain_dir))

import ingest_session


@pytest.fixture
def valid_markdown(tmp_path):
    content = """
    # Session Log - 2025-01-01

    ## Session Info
    - Date: 2025-01-01
    - Time: 09:15
    - Topic: Shoulder anatomy basics
    - Study Mode: sprint
    - Time Spent: 45 Minutes

    ## Execution Details
    - Frameworks Used: H-Series, M2
    - Gated Platter Triggered: yes
    - WRAP Phase Reached: YES
    - Anki Cards Created: 12

    ## Ratings
    - Understanding Level: 4
    - Retention Confidence: 3
    - System Performance: 5

    ## Reflection
    ### What Worked
    Visual-first approach.

    ### What Needs Fixing
    Need more spaced repetition.

    ### Notes/Insights
    Add more Anki cloze deletions.
    """
    file_path = tmp_path / "session.md"
    file_path.write_text(content)
    return file_path


@pytest.fixture
def invalid_markdown(tmp_path):
    content = """
    # Session Log - Missing fields

    ## Session Info
    - Time: 07:45
    - Topic: Knee anatomy
    - Study Mode: Drill

    ## Ratings
    - Understanding Level: 2
    """
    file_path = tmp_path / "session_invalid.md"
    file_path.write_text(content)
    return file_path


def test_parse_markdown_relaxed_accepts_mixed_casing(valid_markdown):
    data = ingest_session.parse_markdown_session(valid_markdown)

    assert data["session_date"] == "2025-01-01"
    assert data["session_time"] == "09:15"
    assert data["topic"] == "Shoulder anatomy basics"
    assert data["study_mode"] == "Sprint"
    assert data["time_spent_minutes"] == 45
    assert data["frameworks_used"] == "H-Series, M2"
    assert data["gated_platter_triggered"] == "Yes"
    assert data["wrap_phase_reached"] == "Yes"
    assert data["anki_cards_count"] == 12
    assert data["understanding_level"] == 4
    assert data["retention_confidence"] == 3
    assert data["system_performance"] == 5
    assert "Visual-first approach" in data["what_worked"]
    assert "spaced repetition" in data["what_needs_fixing"]
    assert "cloze deletions" in data["notes_insights"]


def test_parse_markdown_missing_required_fields_raises(invalid_markdown):
    with pytest.raises(ValueError, match="Date not found in session log"):
        ingest_session.parse_markdown_session(invalid_markdown)


def test_parse_json_payloads_merges_tracker_and_enhanced():
    tracker = {
        "schema_version": "9.3",
        "date": "2025-01-02",
        "topic": "Hip joint",
        "mode": "Core",
        "duration_min": 30,
        "understanding": 4,
        "retention": 3,
        "calibration_gap": 5,
        "rsr_percent": 75,
        "cognitive_load": "intrinsic",
        "transfer_check": "yes",
        "anchors": "acetabulum; labrum",
        "what_worked": "visualization",
        "what_needs_fixing": "rotator confusion",
        "notes": "focus on attachments",
    }
    enhanced = {
        "schema_version": "9.3",
        "date": "2025-01-02",
        "topic": "Hip joint",
        "mode": "Core",
        "duration_min": 30,
        "understanding": 4,
        "retention": 3,
        "calibration_gap": 5,
        "rsr_percent": 75,
        "cognitive_load": "intrinsic",
        "transfer_check": "yes",
        "source_lock": "Gray",
        "plan_of_attack": "atlas review",
        "frameworks_used": "H-Series",
        "buckets": "anatomy",
        "confusables_interleaved": "glute med vs min",
        "anchors": "acetabulum; labrum",
        "anki_cards": "labrum function; acetabulum depth",
        "glossary": "labrum",
        "exit_ticket_blurt": "hip stability",
        "exit_ticket_muddiest": "capsule attachments",
        "exit_ticket_next_action": "draw pelvis",
        "retrospective_status": "yellow",
        "spaced_reviews": "R1=2025-01-03; R2=2025-01-05",
        "what_worked": "visualization",
        "what_needs_fixing": "rotator confusion",
        "next_session": "pelvis landmarks",
        "notes": "focus on attachments",
    }
    content = f"""```json
{json.dumps(tracker)}
```
```json
{json.dumps(enhanced)}
```"""

    merged, tracker_payload, enhanced_payload = ingest_session._parse_json_payloads(content)

    assert merged["topic"] == "Hip joint"
    assert tracker_payload["mode"] == "Core"
    assert enhanced_payload["source_lock"] == "Gray"


def test_map_json_payload_to_session_sets_counts():
    payload = {
        "date": "2025-01-03",
        "topic": "Shoulder",
        "mode": "Core",
        "duration_min": 20,
        "anki_cards": "rotator cuff; scapular rhythm",
    }

    data = ingest_session._map_json_payload_to_session(payload)

    assert data["session_date"] == "2025-01-03"
    assert data["main_topic"] == "Shoulder"
    assert data["study_mode"] == "Core"
    assert data["duration_minutes"] == 20
    assert data["anki_cards_text"] == "rotator cuff; scapular rhythm"
    assert data["anki_cards_count"] == 2
