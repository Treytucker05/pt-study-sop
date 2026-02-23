import json
import re
import sqlite3
from pathlib import Path

import pytest


DB_PATH = Path(__file__).resolve().parent.parent / "data" / "pt_study.db"


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text or ""))


def _has_citation_marker(answer: str, citations_json: str | None) -> bool:
    if "[Source:" in (answer or ""):
        return True
    if not citations_json:
        return False
    try:
        parsed = json.loads(citations_json)
        return isinstance(parsed, list) and len(parsed) > 0
    except Exception:
        return False


def _has_follow_up(answer: str) -> bool:
    text = (answer or "").strip()
    if not text:
        return False
    tail = text[-240:]
    return "?" in tail


def test_recent_tutor_turn_quality_snapshot() -> None:
    """
    Snapshot evaluator for recent real tutor turns.

    Weighted score:
    - citation rate (45%)
    - follow-up question rate (25%)
    - concise response rate (30%)
    """
    if not DB_PATH.exists():
        pytest.skip(f"DB not found: {DB_PATH}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT answer, citations_json
        FROM tutor_turns
        WHERE answer IS NOT NULL
          AND TRIM(answer) != ''
        ORDER BY id DESC
        LIMIT 40
        """
    )
    rows = cur.fetchall()
    conn.close()

    if len(rows) < 10:
        pytest.skip("Not enough tutor turns for a stable quality snapshot (need at least 10).")

    citation_hits = 0
    follow_up_hits = 0
    concise_hits = 0
    total = len(rows)

    for row in rows:
        answer = str(row["answer"] or "")
        citations_json = row["citations_json"]
        if _has_citation_marker(answer, citations_json):
            citation_hits += 1
        if _has_follow_up(answer):
            follow_up_hits += 1
        if _word_count(answer) <= 180:
            concise_hits += 1

    citation_rate = citation_hits / total
    follow_up_rate = follow_up_hits / total
    concise_rate = concise_hits / total
    weighted_score = (
        citation_rate * 0.45
        + follow_up_rate * 0.25
        + concise_rate * 0.30
    ) * 100.0

    print(
        "\nTutor quality snapshot:"
        f" turns={total}, citation_rate={citation_rate:.2f},"
        f" follow_up_rate={follow_up_rate:.2f}, concise_rate={concise_rate:.2f},"
        f" score={weighted_score:.1f}/100"
    )

    assert weighted_score >= 65.0, (
        "Tutor quality score below threshold (65). "
        f"Current={weighted_score:.1f}; "
        f"citation_rate={citation_rate:.2f}, "
        f"follow_up_rate={follow_up_rate:.2f}, "
        f"concise_rate={concise_rate:.2f}"
    )
