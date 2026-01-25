from datetime import datetime, timedelta
from db_setup import get_connection
from dashboard.cli import get_all_sessions
from dashboard.syllabus import fetch_all_courses_and_events


def get_calendar_data(start_date, end_date, course_id=None, event_type=None):
    """
    Return calendar data: course events, study sessions, and planned spaced repetition.
    """

    # Fetch courses and events
    courses, events = fetch_all_courses_and_events()
    if course_id is not None:
        events = [ev for ev in events if ev["course_id"] == course_id]
    if event_type:
        events = [
            ev for ev in events if (ev.get("type") or "").lower() == event_type.lower()
        ]

    # Filter events by date range
    calendar_events = []
    for ev in events:
        ev_date_str = ev.get("date") or ev.get("due_date")
        if not ev_date_str:
            continue
        try:
            ev_date = datetime.strptime(ev_date_str, "%Y-%m-%d").date()
            if start_date <= ev_date <= end_date:
                course = next((c for c in courses if c["id"] == ev["course_id"]), None)
                calendar_events.append(
                    {
                        "id": f"event_{ev['id']}",
                        "type": "course_event",
                        "date": ev_date_str,
                        "title": ev.get("title", ""),
                        "event_type": ev.get("type", ""),
                        "course_id": ev.get("course_id"),
                        "course_code": course.get("code") if course else None,
                        "course_name": course.get("name") if course else None,
                        "course_color": course.get("color") if course else None,
                        "weight": ev.get("weight", 0.0),
                        "raw_text": ev.get("raw_text", ""),
                        "status": ev.get("status"),
                        "google_calendar_id": ev.get("google_calendar_id"),
                        "google_calendar_name": ev.get("google_calendar_name"),
                    }
                )
        except ValueError:
            continue

    # Fetch study sessions in date range
    raw_sessions = get_all_sessions()
    calendar_sessions = []
    for s in raw_sessions:
        session_date_str = s.get("session_date")
        if not session_date_str:
            continue
        try:
            session_date = datetime.strptime(session_date_str, "%Y-%m-%d").date()
            if start_date <= session_date <= end_date:
                calendar_sessions.append(
                    {
                        "id": f"session_{s.get('id')}",
                        "type": "study_session",
                        "date": session_date_str,
                        "topic": s.get("main_topic") or s.get("topic") or "",
                        "mode": s.get("study_mode", ""),
                        "time": s.get("session_time"),
                        "duration_minutes": s.get("time_spent_minutes")
                        or s.get("duration_minutes")
                        or 0,
                        "understanding": s.get("understanding_level"),
                        "retention": s.get("retention_confidence"),
                    }
                )

        except ValueError:
            continue

    # Fetch planned spaced repetition (study_tasks with scheduled_date)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, course_id, topic_id, course_event_id, scheduled_date,
               planned_minutes, status, notes
        FROM study_tasks
        WHERE scheduled_date IS NOT NULL
          AND scheduled_date >= ? AND scheduled_date <= ?
        ORDER BY scheduled_date ASC
        """,
        (start_date.isoformat(), end_date.isoformat()),
    )
    task_rows = cur.fetchall()
    conn.close()

    calendar_planned = []
    for row in task_rows:
        task_id, cid, tid, eid, sched_date, planned_mins, status, notes = row
        if not sched_date:
            continue
        try:
            task_date = datetime.strptime(sched_date, "%Y-%m-%d").date()
            if start_date <= task_date <= end_date:
                course = (
                    next((c for c in courses if c["id"] == cid), None) if cid else None
                )
                calendar_planned.append(
                    {
                        "id": f"planned_{task_id}",
                        "type": "planned_repetition",
                        "date": sched_date,
                        "course_id": cid,
                        "course_code": course.get("code") if course else None,
                        "course_name": course.get("name") if course else None,
                        "course_color": course.get("color") if course else None,
                        "planned_minutes": planned_mins or 0,
                        "status": status or "pending",
                        "notes": notes or "",
                    }
                )
        except ValueError:
            continue

    return {
        "ok": True,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "events": calendar_events,
        "sessions": calendar_sessions,
        "planned": calendar_planned,
    }
