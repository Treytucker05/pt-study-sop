from datetime import datetime
from config import (
    WEAK_THRESHOLD,
    STRONG_THRESHOLD,
    STALE_DAYS,
    FRESH_DAYS,
)
from db_setup import init_database, get_connection

# Reuse existing session helper to keep behavior consistent with main dashboard
from dashboard.cli import get_all_sessions


def fetch_all_courses_and_events():
    """
    Helper to fetch all courses and their course_events from the DB.
    Returns (courses, events) where each is a list of dicts.
    """
    init_database()
    conn = get_connection()
    cur = conn.cursor()

    # Courses (include color column)
    cur.execute(
        """
        SELECT id, name, code, term, instructor,
               default_study_mode, time_budget_per_week_minutes, color
        FROM courses
        ORDER BY COALESCE(term, '') DESC, name ASC
        """
    )
    course_rows = cur.fetchall()
    courses = [
        {
            "id": row[0],
            "name": row[1],
            "code": row[2],
            "term": row[3],
            "instructor": row[4],
            "default_study_mode": row[5],
            "time_budget_per_week_minutes": row[6],
            "color": row[7] if len(row) > 7 else None,
        }
        for row in course_rows
    ]

    # Events
    cur.execute(
        """
        SELECT
            id,
            course_id,
            type,
            title,
            date,
            due_date,
            weight,
            raw_text,
            status,
            google_event_id,
            google_calendar_id,
            google_calendar_name,
            google_updated_at,
            updated_at
        FROM course_events

        ORDER BY
            COALESCE(date, due_date) ASC,
            id ASC
        """
    )
    event_rows = cur.fetchall()
    events = [
        {
            "id": row[0],
            "course_id": row[1],
            "type": row[2],
            "title": row[3],
            "date": row[4],
            "due_date": row[5],
            "weight": row[6],
            "raw_text": row[7],
            "status": row[8] if len(row) > 8 else None,
            "google_event_id": row[9] if len(row) > 9 else None,
            "google_calendar_id": row[10] if len(row) > 10 else None,
            "google_calendar_name": row[11] if len(row) > 11 else None,
            "google_updated_at": row[12] if len(row) > 12 else None,
            "updated_at": row[13] if len(row) > 13 else None,
        }
        for row in event_rows
    ]

    conn.close()
    return courses, events


def attach_event_analytics(events, sessions):
    """
    Attach coverage analytics to each event:
    - sessions_count
    - avg_understanding
    - avg_retention
    - last_session_date
    - freshness_status: fresh / stale / unstarted
    """

    if not events:
        return []

    # Pre-normalize sessions for cheap substring matching
    enriched_events = []
    today = datetime.now().date()

    for ev in events:
        title = (ev.get("title") or "").strip()
        if not title:
            enriched_events.append({**ev, "coverage": {}})
            continue

        title_lower = title.lower()
        related = []
        for s in sessions:
            main_topic = (s.get("main_topic") or s.get("topic") or "").lower()
            notes = (s.get("notes_insights") or "").lower()
            target_exam = (s.get("target_exam") or "").lower()
            if (
                title_lower in main_topic
                or title_lower in notes
                or title_lower in target_exam
            ):
                related.append(s)

        sessions_count = len(related)
        if sessions_count:
            u_vals = [
                s.get("understanding_level")
                for s in related
                if s.get("understanding_level") is not None
            ]
            r_vals = [
                s.get("retention_confidence")
                for s in related
                if s.get("retention_confidence") is not None
            ]
            avg_u = sum(u_vals) / len(u_vals) if u_vals else None
            avg_r = sum(r_vals) / len(r_vals) if r_vals else None

            # Last session date
            last_date = None
            for s in related:
                sd = s.get("session_date")
                try:
                    if sd:
                        d = datetime.strptime(sd, "%Y-%m-%d").date()
                        if last_date is None or d > last_date:
                            last_date = d
                except Exception:
                    continue

            freshness_status = "unstarted"
            if last_date is not None:
                delta_days = (today - last_date).days
                if delta_days <= FRESH_DAYS:
                    freshness_status = "fresh"
                elif delta_days >= STALE_DAYS:
                    freshness_status = "stale"
                else:
                    freshness_status = "warming_up"
        else:
            avg_u = None
            avg_r = None
            last_date = None
            freshness_status = "unstarted"

        coverage = {
            "sessions_count": sessions_count,
            "avg_understanding": round(avg_u, 2) if avg_u is not None else None,
            "avg_retention": round(avg_r, 2) if avg_r is not None else None,
            "last_session_date": last_date.isoformat() if last_date else None,
            "freshness_status": freshness_status,
        }

        enriched_events.append({**ev, "coverage": coverage})

    return enriched_events
