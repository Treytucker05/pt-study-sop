#!/usr/bin/env python3
"""
Generate a read-only telemetry snapshot from the Brain database for Scholar.
Outputs a markdown report in scholar/outputs/telemetry/.
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Optional, List


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _db_path() -> Path:
    return _repo_root() / "brain" / "data" / "pt_study.db"


def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    )
    return cur.fetchone() is not None


def _scalar(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> Optional[Any]:
    cur = conn.execute(sql, params)
    row = cur.fetchone()
    return row[0] if row else None


def _safe_parse_json(text: Optional[str]) -> List[Any]:
    if not text:
        return []
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return []


def _count_terms(text: Optional[str]) -> int:
    if not text:
        return 0
    parts = []
    for chunk in text.splitlines():
        parts.extend(chunk.split(";"))
    return sum(1 for p in parts if p.strip() and not p.strip().startswith("#"))


def build_snapshot(run_id: str, days_recent: int = 30) -> Path:
    repo_root = _repo_root()
    out_dir = repo_root / "scholar" / "outputs" / "telemetry"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"telemetry_snapshot_{run_id}.md"

    db_path = _db_path()
    now = datetime.now()
    recent_cutoff = (now - timedelta(days=days_recent)).strftime("%Y-%m-%d")
    recent_7 = (now - timedelta(days=7)).strftime("%Y-%m-%d")

    lines: List[str] = []
    lines.append(f"# Telemetry Snapshot")
    lines.append(f"Run ID: {run_id}")
    lines.append(f"Generated: {now.isoformat(timespec='seconds')}")
    lines.append("")
    lines.append("## Database")
    lines.append(f"- Path: {db_path}")
    lines.append(f"- Exists: {db_path.exists()}")
    lines.append("")

    if not db_path.exists():
        out_path.write_text("\n".join(lines), encoding="utf-8")
        return out_path

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        # Sessions
        lines.append("## Sessions")
        if _table_exists(conn, "sessions"):
            total_sessions = _scalar(conn, "SELECT COUNT(*) FROM sessions") or 0
            last_7 = _scalar(
                conn,
                "SELECT COUNT(*) FROM sessions WHERE session_date >= ?",
                (recent_7,),
            ) or 0
            last_30 = _scalar(
                conn,
                "SELECT COUNT(*) FROM sessions WHERE session_date >= ?",
                (recent_cutoff,),
            ) or 0
            avg_row = conn.execute(
                """
                SELECT
                    AVG(understanding_level) as avg_u,
                    AVG(retention_confidence) as avg_r,
                    AVG(system_performance) as avg_p,
                    AVG(COALESCE(duration_minutes, time_spent_minutes, 0)) as avg_d
                FROM sessions
                """
            ).fetchone()
            avg_u = round(avg_row["avg_u"] or 0, 2)
            avg_r = round(avg_row["avg_r"] or 0, 2)
            avg_p = round(avg_row["avg_p"] or 0, 2)
            avg_d = round(avg_row["avg_d"] or 0, 1)

            wrap_yes = 0
            wrap_total = 0
            spaced_yes = 0
            errors_any = 0
            glossary_terms = 0
            anki_total = 0

            cur = conn.execute(
                """
                SELECT wrap_phase_reached, spaced_reviews,
                       errors_conceptual, errors_discrimination, errors_recall,
                       glossary_entries, anki_cards_count
                FROM sessions
                """
            )
            for row in cur.fetchall():
                wrap_total += 1
                wrap_val = (row["wrap_phase_reached"] or "").strip().lower()
                if wrap_val in ("yes", "y", "true", "1"):
                    wrap_yes += 1
                if (row["spaced_reviews"] or "").strip():
                    spaced_yes += 1
                if (row["errors_conceptual"] or "").strip() or (row["errors_discrimination"] or "").strip() or (row["errors_recall"] or "").strip():
                    errors_any += 1
                glossary_terms += _count_terms(row["glossary_entries"])
                anki_total += int(row["anki_cards_count"] or 0)

            wrap_pct = round((wrap_yes / wrap_total) * 100, 1) if wrap_total else 0
            spaced_pct = round((spaced_yes / wrap_total) * 100, 1) if wrap_total else 0

            lines.append(f"- Total: {total_sessions}")
            lines.append(f"- Last 7 days: {last_7}")
            lines.append(f"- Last {days_recent} days: {last_30}")
            lines.append(f"- Avg understanding/retention/performance: {avg_u}/{avg_r}/{avg_p}")
            lines.append(f"- Avg duration (min): {avg_d}")
            lines.append(f"- WRAP completion: {wrap_yes}/{wrap_total} ({wrap_pct}%)")
            lines.append(f"- Spaced reviews logged: {spaced_yes}/{wrap_total} ({spaced_pct}%)")
            lines.append(f"- Sessions with errors: {errors_any}")
            lines.append(f"- Total Anki cards (count field): {anki_total}")
            lines.append(f"- Glossary terms (approx): {glossary_terms}")
        else:
            lines.append("- sessions table not found")
        lines.append("")

        # Tutor turns
        lines.append("## Tutor Turns")
        if _table_exists(conn, "tutor_turns"):
            total_turns = _scalar(conn, "SELECT COUNT(*) FROM tutor_turns") or 0
            last_7 = _scalar(
                conn,
                "SELECT COUNT(*) FROM tutor_turns WHERE DATE(created_at) >= ?",
                (recent_7,),
            ) or 0
            last_30 = _scalar(
                conn,
                "SELECT COUNT(*) FROM tutor_turns WHERE DATE(created_at) >= ?",
                (recent_cutoff,),
            ) or 0
            cur = conn.execute(
                """
                SELECT citations_json, unverified
                FROM tutor_turns
                WHERE DATE(created_at) >= ?
                """,
                (recent_cutoff,),
            )
            unverified = 0
            citations_total = 0
            turns_recent = 0
            for row in cur.fetchall():
                turns_recent += 1
                if row["unverified"]:
                    unverified += 1
                citations_total += len(_safe_parse_json(row["citations_json"]))

            unverified_ratio = round(unverified / turns_recent, 3) if turns_recent else 0
            citations_per_turn = round(citations_total / turns_recent, 2) if turns_recent else 0
            lines.append(f"- Total: {total_turns}")
            lines.append(f"- Last 7 days: {last_7}")
            lines.append(f"- Last {days_recent} days: {last_30}")
            lines.append(f"- Unverified (last {days_recent}d): {unverified} ({unverified_ratio})")
            lines.append(f"- Citations per turn (last {days_recent}d): {citations_per_turn}")
        else:
            lines.append("- tutor_turns table not found")
        lines.append("")

        # Topic mastery
        lines.append("## Topic Mastery")
        if _table_exists(conn, "topic_mastery"):
            total_topics = _scalar(conn, "SELECT COUNT(*) FROM topic_mastery") or 0
            stale_cutoff = (now - timedelta(days=14)).strftime("%Y-%m-%d")
            stale_topics = _scalar(
                conn,
                "SELECT COUNT(*) FROM topic_mastery WHERE last_studied < ?",
                (stale_cutoff,),
            ) or 0
            lines.append(f"- Total topics: {total_topics}")
            lines.append(f"- Stale topics (14+ days): {stale_topics}")
            lines.append("- Lowest understanding (top 5):")
            cur = conn.execute(
                """
                SELECT topic, avg_understanding, avg_retention, last_studied
                FROM topic_mastery
                WHERE avg_understanding IS NOT NULL
                ORDER BY avg_understanding ASC
                LIMIT 5
                """
            )
            rows = cur.fetchall()
            if rows:
                for row in rows:
                    lines.append(
                        f"  - {row['topic']}: U={round(row['avg_understanding'], 2)}, "
                        f"R={round(row['avg_retention'] or 0, 2)}, last={row['last_studied']}"
                    )
            else:
                lines.append("  - (none)")
        else:
            lines.append("- topic_mastery table not found")
        lines.append("")

        # Study tasks
        lines.append("## Study Tasks")
        if _table_exists(conn, "study_tasks"):
            counts = {}
            for status in ("pending", "in_progress", "completed", "deferred"):
                counts[status] = _scalar(
                    conn,
                    "SELECT COUNT(*) FROM study_tasks WHERE status = ?",
                    (status,),
                ) or 0
            upcoming = _scalar(
                conn,
                """
                SELECT COUNT(*) FROM study_tasks
                WHERE scheduled_date >= ? AND scheduled_date <= ?
                """,
                (now.strftime("%Y-%m-%d"), (now + timedelta(days=7)).strftime("%Y-%m-%d")),
            ) or 0
            lines.append(f"- Pending: {counts['pending']}")
            lines.append(f"- In progress: {counts['in_progress']}")
            lines.append(f"- Completed: {counts['completed']}")
            lines.append(f"- Deferred: {counts['deferred']}")
            lines.append(f"- Upcoming 7 days: {upcoming}")
        else:
            lines.append("- study_tasks table not found")
        lines.append("")

        # RAG docs
        lines.append("## RAG Docs")
        if _table_exists(conn, "rag_docs"):
            total = _scalar(conn, "SELECT COUNT(*) FROM rag_docs") or 0
            enabled = _scalar(conn, "SELECT COUNT(*) FROM rag_docs WHERE enabled = 1") or 0
            lines.append(f"- Total: {total}")
            lines.append(f"- Enabled: {enabled}")
            lines.append("- By corpus:")
            cur = conn.execute(
                """
                SELECT COALESCE(corpus, 'unknown') as corpus, COUNT(*) as c
                FROM rag_docs
                GROUP BY COALESCE(corpus, 'unknown')
                ORDER BY c DESC
                """
            )
            rows = cur.fetchall()
            if rows:
                for row in rows:
                    lines.append(f"  - {row['corpus']}: {row['c']}")
            else:
                lines.append("  - (none)")
        else:
            lines.append("- rag_docs table not found")
        lines.append("")

        # Card drafts
        lines.append("## Card Drafts")
        if _table_exists(conn, "card_drafts"):
            counts = {}
            for status in ("pending", "approved", "rejected", "synced", "draft"):
                counts[status] = _scalar(
                    conn,
                    "SELECT COUNT(*) FROM card_drafts WHERE status = ?",
                    (status,),
                ) or 0
            for key in ("pending", "approved", "rejected", "synced", "draft"):
                lines.append(f"- {key}: {counts[key]}")
        else:
            lines.append("- card_drafts table not found")
        lines.append("")

        # Courses/events
        lines.append("## Courses and Events")
        if _table_exists(conn, "courses"):
            courses = _scalar(conn, "SELECT COUNT(*) FROM courses") or 0
            lines.append(f"- Courses: {courses}")
        else:
            lines.append("- courses table not found")
        if _table_exists(conn, "course_events"):
            events = _scalar(conn, "SELECT COUNT(*) FROM course_events") or 0
            lines.append(f"- Events: {events}")
        else:
            lines.append("- course_events table not found")
        lines.append("")

    finally:
        conn.close()

    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Generate Scholar telemetry snapshot")
    parser.add_argument("--run-id", required=False, help="Run ID for output filename")
    parser.add_argument("--days", type=int, default=30, help="Recent window in days")
    args = parser.parse_args()

    run_id = args.run_id or datetime.now().strftime("%Y-%m-%d_%H%M%S")
    out_path = build_snapshot(run_id=run_id, days_recent=args.days)
    print(f"[OK] Wrote {out_path}")


if __name__ == "__main__":
    main()
