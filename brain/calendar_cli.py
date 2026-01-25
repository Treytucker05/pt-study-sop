#!/usr/bin/env python3
"""
CLI utilities for dashboard calendar data.

Supports:
- Add events via quick natural-language input or structured prompts.
- Clear calendar tables (courses, course_events, study_tasks).
"""

from __future__ import annotations

import argparse
import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from db_setup import get_connection, init_database
from import_syllabus import import_events, upsert_course

EVENT_TYPE_ALIASES = {
    "lecture": "lecture",
    "reading": "reading",
    "quiz": "quiz",
    "exam": "exam",
    "assignment": "assignment",
    "lab": "other",
    "immersion": "other",
    "practical": "exam",
    "checkoff": "other",
    "async": "reading",
    "other": "other",
}

WEEKDAY_LOOKUP = {
    "mon": 0,
    "monday": 0,
    "tue": 1,
    "tues": 1,
    "tuesday": 1,
    "wed": 2,
    "weds": 2,
    "wednesday": 2,
    "thu": 3,
    "thur": 3,
    "thurs": 3,
    "thursday": 3,
    "fri": 4,
    "friday": 4,
    "sat": 5,
    "saturday": 5,
    "sun": 6,
    "sunday": 6,
}


def _prompt(label: str, default: Optional[str] = None, required: bool = False) -> str:
    while True:
        suffix = f" [{default}]" if default else ""
        value = input(f"{label}{suffix}: ").strip()
        if value:
            return value
        if default is not None:
            return default
        if not required:
            return ""
        print("Value required.")


def _normalize_event_type(value: Optional[str]) -> str:
    if not value:
        return "other"
    key = value.strip().lower()
    return EVENT_TYPE_ALIASES.get(
        key, key if key in EVENT_TYPE_ALIASES.values() else "other"
    )


def _parse_weight(raw: Optional[str]) -> Optional[float]:
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    if text.endswith("%"):
        try:
            return float(text[:-1].strip()) / 100
        except ValueError:
            return None
    try:
        return float(text)
    except ValueError:
        return None


def _parse_time(text: str) -> Optional[str]:
    match = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", text, re.IGNORECASE)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        meridian = match.group(3).upper()
        hour = max(1, min(hour, 12))
        return f"{hour}:{minute:02d} {meridian}"

    match = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", text)
    if match:
        return f"{int(match.group(1)):02d}:{int(match.group(2)):02d}"

    if "noon" in text.lower():
        return "12:00 PM"
    if "midnight" in text.lower():
        return "12:00 AM"
    return None


def _parse_explicit_date(text: str, today: date) -> Optional[str]:
    if not text:
        return None
    cleaned = text.strip()
    formats = ["%Y-%m-%d", "%m/%d/%Y", "%m/%d", "%m-%d-%Y", "%m-%d"]
    for fmt in formats:
        try:
            parsed = datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
        if fmt in ("%m/%d", "%m-%d"):
            parsed = parsed.replace(year=today.year)
            if parsed < today:
                parsed = parsed.replace(year=today.year + 1)
        return parsed.isoformat()
    return None


def _parse_relative_date(text: str, today: date) -> Optional[str]:
    lowered = text.lower()
    if "today" in lowered:
        return today.isoformat()
    if "tomorrow" in lowered:
        return (today + timedelta(days=1)).isoformat()

    match = re.search(
        r"\b(next\s+)?(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b",
        lowered,
    )
    if not match:
        return None
    force_next = bool(match.group(1))
    weekday_key = match.group(2)
    weekday = WEEKDAY_LOOKUP.get(weekday_key, None)
    if weekday is None:
        return None
    days_ahead = (weekday - today.weekday()) % 7
    if days_ahead == 0 and force_next:
        days_ahead = 7
    target = today + timedelta(days=days_ahead)
    return target.isoformat()


def _guess_event_type(text: str) -> Optional[str]:
    lowered = text.lower()
    for key in EVENT_TYPE_ALIASES:
        if re.search(rf"\b{re.escape(key)}\b", lowered):
            return EVENT_TYPE_ALIASES[key]
    return None


def _pop_tag(text: str, labels: Tuple[str, ...]) -> Tuple[Optional[str], str]:
    pattern = rf"\b(?:{'|'.join(labels)})\s*[:=]\s*([^|]+)"
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        return None, text
    value = match.group(1).strip()
    updated = text[: match.start()] + " " + text[match.end() :]
    return value, updated


def _parse_quick_input(text: str) -> Dict[str, Any]:
    today = date.today()
    remaining = text

    course_name, remaining = _pop_tag(remaining, ("course", "class"))
    course_code, remaining = _pop_tag(remaining, ("code",))
    course_term, remaining = _pop_tag(remaining, ("term", "semester"))
    title, remaining = _pop_tag(remaining, ("title",))
    event_type, remaining = _pop_tag(remaining, ("type", "event"))
    date_tag, remaining = _pop_tag(remaining, ("date",))
    due_tag, remaining = _pop_tag(remaining, ("due", "due_date", "due-date"))
    time_tag, remaining = _pop_tag(remaining, ("time",))
    location_tag, remaining = _pop_tag(remaining, ("location", "loc"))
    weight_tag, remaining = _pop_tag(remaining, ("weight",))
    notes_tag, remaining = _pop_tag(remaining, ("notes", "note"))

    parsed_date = _parse_explicit_date(date_tag or "", today) or _parse_explicit_date(
        text, today
    )
    if parsed_date is None:
        parsed_date = _parse_relative_date(text, today)

    parsed_due = _parse_explicit_date(due_tag or "", today)
    parsed_time = time_tag or _parse_time(text)
    parsed_type = _normalize_event_type(event_type or _guess_event_type(text))

    if not title:
        cleaned = remaining
        cleaned = re.sub(
            r"\b(next|this|today|tomorrow)\b", " ", cleaned, flags=re.IGNORECASE
        )
        cleaned = re.sub(
            r"\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b",
            " ",
            cleaned,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", " ", cleaned)
        cleaned = re.sub(r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b", " ", cleaned)
        cleaned = re.sub(
            r"\b\d{1,2}(:\d{2})?\s*(am|pm)\b", " ", cleaned, flags=re.IGNORECASE
        )
        if parsed_type:
            cleaned = re.sub(
                rf"\b{re.escape(parsed_type)}\b", " ", cleaned, flags=re.IGNORECASE
            )
        cleaned = cleaned.replace("|", " ").replace("@", " ")
        title = " ".join(cleaned.split()).strip("- ") or None

    return {
        "course_name": course_name,
        "course_code": course_code,
        "course_term": course_term,
        "title": title,
        "event_type": parsed_type,
        "date": parsed_date,
        "due_date": parsed_due,
        "time": parsed_time,
        "location": location_tag,
        "weight": _parse_weight(weight_tag),
        "notes": notes_tag,
    }


def _build_raw_text(
    time_str: Optional[str], location: Optional[str], notes: Optional[str]
) -> str:
    parts = []
    if time_str:
        parts.append(f"Time: {time_str}")
    if location:
        parts.append(f"Location: {location}")
    if notes:
        parts.append(f"Notes: {notes}")
    return " | ".join(parts)


def _fetch_courses() -> List[Dict[str, Any]]:
    init_database()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, code, term FROM courses ORDER BY name")
    rows = cur.fetchall()
    conn.close()
    return [
        {"id": row[0], "name": row[1], "code": row[2], "term": row[3]} for row in rows
    ]


def _select_or_create_course(parsed: Dict[str, Any], args: argparse.Namespace) -> int:
    if args.course_id:
        return args.course_id

    course_name = args.course_name or parsed.get("course_name")
    course_code = args.course_code or parsed.get("course_code")
    course_term = args.course_term or parsed.get("course_term")

    if course_name or course_code or course_term:
        return upsert_course(
            {
                "name": course_name or course_code or "Untitled Course",
                "code": course_code,
                "term": course_term,
                "instructor": args.course_instructor,
                "default_study_mode": args.course_mode or "Core",
                "time_budget_per_week_minutes": args.course_budget or 0,
            }
        )

    courses = _fetch_courses()
    if courses:
        print("\nExisting courses:")
        for idx, course in enumerate(courses, start=1):
            label = course["name"]
            if course.get("code"):
                label += f" ({course['code']})"
            if course.get("term"):
                label += f" - {course['term']}"
            print(f"  {idx}. {label}")
        selection = _prompt("Select course number or type 'new'", required=True)
        if selection.strip().lower() != "new":
            try:
                chosen = courses[int(selection) - 1]
                return int(chosen["id"])
            except (ValueError, IndexError):
                print("Invalid selection. Creating new course.")

    name = _prompt("Course name", required=True)
    code = _prompt("Course code", default="") or None
    term = _prompt("Term", default="") or None
    instructor = _prompt("Instructor", default="") or None
    mode = _prompt("Default study mode (Core/Sprint/Drill)", default="Core")
    budget_raw = _prompt("Weekly time budget (minutes)", default="0")
    try:
        budget = int(budget_raw)
    except ValueError:
        budget = 0

    return upsert_course(
        {
            "name": name,
            "code": code,
            "term": term,
            "instructor": instructor,
            "default_study_mode": mode,
            "time_budget_per_week_minutes": budget,
        }
    )


def _add_event(args: argparse.Namespace) -> int:
    quick_text = " ".join(args.text or []).strip()
    parsed = _parse_quick_input(quick_text) if quick_text else {}

    course_id = _select_or_create_course(parsed, args)
    title = args.title or parsed.get("title")
    if not title or args.interactive:
        title = _prompt("Event title", default=title, required=True)

    event_type = _normalize_event_type(args.event_type or parsed.get("event_type"))
    if args.interactive:
        event_type = _normalize_event_type(_prompt("Event type", default=event_type))

    date_value = args.date or parsed.get("date")
    if not date_value or args.interactive:
        date_value = _prompt(
            "Event date (YYYY-MM-DD or 'next Tue')", default=date_value, required=True
        )
    date_value = _parse_explicit_date(date_value, date.today()) or _parse_relative_date(
        date_value, date.today()
    )

    if not date_value:
        raise SystemExit("[ERROR] Could not parse a valid event date.")

    due_date = args.due_date or parsed.get("due_date")
    if due_date:
        due_date = _parse_explicit_date(due_date, date.today())

    time_str = args.time or parsed.get("time")
    if args.interactive:
        time_str = _prompt("Time (optional)", default=time_str)
    time_str = _parse_time(time_str or "") or time_str

    location = args.location or parsed.get("location")
    if args.interactive:
        location = _prompt("Location (optional)", default=location)

    weight = args.weight if args.weight is not None else parsed.get("weight")
    if args.interactive:
        weight_raw = _prompt(
            "Weight (optional, e.g. 0.2 or 20%)", default=str(weight or "")
        )
        weight = _parse_weight(weight_raw)

    notes = args.notes or parsed.get("notes")
    if args.interactive:
        notes = _prompt("Notes (optional)", default=notes)

    raw_text = _build_raw_text(time_str, location, notes)

    event = {
        "type": event_type,
        "title": title,
        "date": date_value,
        "due_date": due_date,
        "weight": float(weight or 0.0),
        "raw_text": raw_text,
    }

    if args.dry_run:
        print("[DRY RUN] Would add event:")
        print(event)
        return 0

    import_events(course_id, [event], replace=False)
    print(f"[OK] Added event '{title}' on {date_value}.")
    return 0


def _clear_calendar(args: argparse.Namespace) -> int:
    init_database()
    conn = get_connection()
    cur = conn.cursor()
    tables = ["study_tasks", "course_events", "courses"]

    counts: Dict[str, int] = {}
    for table in tables:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        counts[table] = cur.fetchone()[0]

    total_rows = sum(counts.values())
    print("\n" + "=" * 60)
    print("PT Study Brain - Calendar Clear")
    print("=" * 60)
    print("\nThis will DELETE data from:")
    print("  - study_tasks")
    print("  - course_events")
    print("  - courses")
    print("\nRow counts:")
    for table, count in counts.items():
        print(f"  - {table}: {count}")
    print(f"\nTotal rows to delete: {total_rows}")

    if total_rows == 0:
        print("\n[INFO] No calendar rows to clear.")
        conn.close()
        return 0

    if not args.yes:
        confirm = _prompt("Type 'CLEAR' to confirm", required=True)
        if confirm.strip().upper() != "CLEAR":
            print("[CANCELLED] Calendar clear cancelled.")
            conn.close()
            return 1

    for table in tables:
        cur.execute(f"DELETE FROM {table}")
        cur.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))

    conn.commit()
    conn.close()
    print("[OK] Calendar data cleared. Sessions and RAG docs remain intact.")
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Calendar CLI for PT Study Brain")
    subparsers = parser.add_subparsers(dest="command", required=True)

    add_parser = subparsers.add_parser("add", help="Add a calendar event")
    add_parser.add_argument("text", nargs="*", help="Quick-add text")
    add_parser.add_argument(
        "--interactive", action="store_true", help="Prompt for fields"
    )
    add_parser.add_argument("--course-id", type=int, help="Existing course id")
    add_parser.add_argument("--course-name", help="Course name")
    add_parser.add_argument("--course-code", help="Course code")
    add_parser.add_argument("--course-term", help="Course term")
    add_parser.add_argument("--course-instructor", help="Course instructor")
    add_parser.add_argument("--course-mode", help="Default study mode")
    add_parser.add_argument(
        "--course-budget", type=int, help="Weekly time budget (minutes)"
    )
    add_parser.add_argument("--title", help="Event title")
    add_parser.add_argument("--type", dest="event_type", help="Event type")
    add_parser.add_argument("--date", help="Event date (YYYY-MM-DD)")
    add_parser.add_argument("--due-date", help="Due date (YYYY-MM-DD)")
    add_parser.add_argument("--time", help="Time (e.g., 7pm)")
    add_parser.add_argument("--location", help="Location")
    add_parser.add_argument(
        "--weight", type=float, help="Event weight (0-1 or percent)"
    )
    add_parser.add_argument("--notes", help="Notes for raw_text")
    add_parser.add_argument(
        "--dry-run", action="store_true", help="Show output without writing"
    )
    add_parser.set_defaults(handler=_add_event)

    clear_parser = subparsers.add_parser("clear", help="Clear calendar tables")
    clear_parser.add_argument("--yes", action="store_true", help="Skip confirmation")
    clear_parser.set_defaults(handler=_clear_calendar)

    return parser


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()
    return int(args.handler(args))


if __name__ == "__main__":
    raise SystemExit(main())
