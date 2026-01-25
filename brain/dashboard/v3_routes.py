from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Optional, Tuple

from flask import Blueprint, jsonify, render_template, request

from dashboard.calendar import get_calendar_data
from dashboard.syllabus import fetch_all_courses_and_events


REPO_ROOT = Path(__file__).resolve().parents[2]
V3_CODE_DIR = REPO_ROOT / "dashboard_rebuild" / "code"
V3_TEMPLATES_DIR = V3_CODE_DIR / "templates"
V3_STATIC_DIR = V3_CODE_DIR / "static"


dashboard_v3_bp = Blueprint(
    "dashboard_v3",
    __name__,
    url_prefix="/v3",
    template_folder=str(V3_TEMPLATES_DIR),
    static_folder=str(V3_STATIC_DIR),
    static_url_path="/static",
)

dashboard_v3_api_bp = Blueprint("dashboard_v3_api", __name__, url_prefix="/api/v3")


SOURCE_LABELS = {
    "course_event": "Course Events",
    "study_session": "Study Sessions",
    "planned_repetition": "Planned Repetition",
}

SOURCE_COLORS = {
    "course_event": "#1a73e8",
    "study_session": "#188038",
    "planned_repetition": "#f9ab00",
}


@dashboard_v3_bp.route("/")
def v3_calendar():
    return render_template("v3_calendar.html")


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    value = value.strip()
    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            return None


def _combine_date_time(
    date_str: str, time_str: Optional[str], duration_minutes: Optional[int]
) -> Tuple[str, Optional[str], bool]:
    if not time_str:
        return date_str, None, True
    time_str = time_str.strip()
    try:
        start_dt = datetime.fromisoformat(f"{date_str}T{time_str}")
    except ValueError:
        return date_str, None, True

    end_dt = None
    if duration_minutes:
        end_dt = start_dt + timedelta(minutes=duration_minutes)
    return start_dt.isoformat(), end_dt.isoformat() if end_dt else None, False


def _build_course_title(event: dict) -> str:
    course_code = (event.get("course_code") or "").strip()
    course_name = (event.get("course_name") or "").strip()
    title = (event.get("title") or "").strip()
    if course_code and title:
        return f"{course_code} · {title}"
    if course_name and title:
        return f"{course_name} · {title}"
    return title or course_code or course_name or "Untitled"


@dashboard_v3_api_bp.route("/calendar/data", methods=["GET"])
def v3_calendar_data():
    start = _parse_date(request.args.get("start"))
    end = _parse_date(request.args.get("end"))
    today = datetime.now().date()
    if not start:
        start = today - timedelta(days=30)
    if not end:
        end = today + timedelta(days=60)

    course_id = request.args.get("course_id", type=int)
    event_type = request.args.get("event_type")

    data = get_calendar_data(start, end, course_id=course_id, event_type=event_type)
    courses, _ = fetch_all_courses_and_events()
    course_by_id = {c.get("id"): c for c in courses}

    events = []

    for ev in data.get("events", []):
        course_color = ev.get("course_color") or SOURCE_COLORS["course_event"]
        events.append(
            {
                "id": ev.get("id"),
                "title": _build_course_title(ev),
                "start": ev.get("date"),
                "allDay": True,
                "backgroundColor": course_color,
                "borderColor": course_color,
                "extendedProps": {
                    "source": "course_event",
                    "event_type": ev.get("event_type"),
                    "course_id": ev.get("course_id"),
                    "course_code": ev.get("course_code"),
                    "course_name": ev.get("course_name"),
                    "google_calendar_id": ev.get("google_calendar_id"),
                    "google_calendar_name": ev.get("google_calendar_name"),
                    "status": ev.get("status"),
                },
            }
        )

    for session in data.get("sessions", []):
        start_str, end_str, all_day = _combine_date_time(
            session.get("date"),
            session.get("time"),
            session.get("duration_minutes"),
        )
        events.append(
            {
                "id": session.get("id"),
                "title": (session.get("topic") or "Study Session").strip(),
                "start": start_str,
                "end": end_str,
                "allDay": all_day,
                "backgroundColor": SOURCE_COLORS["study_session"],
                "borderColor": SOURCE_COLORS["study_session"],
                "extendedProps": {
                    "source": "study_session",
                    "mode": session.get("mode"),
                    "duration_minutes": session.get("duration_minutes"),
                    "understanding": session.get("understanding"),
                    "retention": session.get("retention"),
                },
            }
        )

    for task in data.get("planned", []):
        course = course_by_id.get(task.get("course_id"))
        course_color = (
            (course or {}).get("color")
            or task.get("course_color")
            or SOURCE_COLORS["planned_repetition"]
        )
        title_bits = ["Planned Review"]
        if task.get("course_code"):
            title_bits.append(task.get("course_code"))
        events.append(
            {
                "id": task.get("id"),
                "title": " · ".join(title_bits),
                "start": task.get("date"),
                "allDay": True,
                "backgroundColor": course_color,
                "borderColor": course_color,
                "extendedProps": {
                    "source": "planned_repetition",
                    "course_id": task.get("course_id"),
                    "course_code": task.get("course_code"),
                    "course_name": task.get("course_name"),
                    "planned_minutes": task.get("planned_minutes"),
                    "status": task.get("status"),
                    "notes": task.get("notes"),
                },
            }
        )

    sources = [{"id": key, "label": label} for key, label in SOURCE_LABELS.items()]

    return jsonify(
        {
            "ok": True,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "events": events,
            "courses": courses,
            "sources": sources,
        }
    )
