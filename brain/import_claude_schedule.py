"""
Import Claude-generated schedule JSON files into the study system.

This script converts Claude's JSON format to the system's expected format
and imports via the existing import_syllabus functions.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Any

# Add brain directory to path for imports
BRAIN_DIR = Path(__file__).parent
sys.path.insert(0, str(BRAIN_DIR))

from import_syllabus import upsert_course, import_events, dedupe_course_events


# Mapping of Claude's event types to system event types
EVENT_TYPE_MAPPING = {
    "exam": "exam",
    "quiz": "quiz",
    "assignment": "assignment",
    "lab": "other",
    "lecture": "lecture",
    "immersion": "other",
    "checkoff": "other",
    "practical": "exam",
    "async": "reading",
    "other": "other"
}


def convert_claude_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a Claude event to system format.

    Claude format includes: id, date, time, end_time, type, title, description,
                           location, reading, week, is_graded, priority

    System format expects: type, title, date, due_date, weight, raw_text
    """
    # Map event type
    event_type = EVENT_TYPE_MAPPING.get(event.get("type", "other"), "other")

    # Build raw_text from all the extra fields
    raw_parts = []
    if event.get("description"):
        raw_parts.append(event["description"])
    if event.get("time"):
        time_str = event["time"]
        if event.get("end_time"):
            time_str += f" - {event['end_time']}"
        raw_parts.append(f"Time: {time_str}")
    if event.get("location"):
        raw_parts.append(f"Location: {event['location']}")
    if event.get("reading"):
        raw_parts.append(f"Reading: {event['reading']}")
    if event.get("priority"):
        raw_parts.append(f"Priority: {event['priority']}")

    raw_text = " | ".join(raw_parts) if raw_parts else ""

    # Estimate weight based on event type and is_graded flag
    weight = 0.0
    if event.get("is_graded"):
        if event.get("type") == "exam":
            weight = 0.3  # Default exam weight
        elif event.get("type") in ["quiz", "practical", "checkoff"]:
            weight = 0.1  # Default quiz/assessment weight
        elif event.get("type") == "assignment":
            weight = 0.05  # Default assignment weight

    return {
        "type": event_type,
        "title": event["title"],
        "date": event["date"],
        "due_date": event.get("due_date"),
        "weight": weight,
        "raw_text": raw_text
    }


def convert_claude_course(claude_course: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a Claude course to system format.

    Claude format: course_id, course_name, semester, events
    System format: name, code, term, instructor, default_study_mode,
                   time_budget_per_week_minutes, events
    """
    # Extract course code (e.g., "PHYT_6313" -> "PHYT 6313")
    course_code = claude_course["course_id"].replace("_", " ")

    # Convert events
    converted_events = [convert_claude_event(e) for e in claude_course["events"]]

    # Set defaults for missing fields
    # Default study mode: Core for theory/lecture heavy, Sprint for intensive courses
    default_mode = "Core"
    course_name = claude_course["course_name"]
    if any(word in course_name.lower() for word in ["lab", "clinical", "immersion", "practical"]):
        default_mode = "Sprint"

    # Estimate weekly time budget based on event density and course type
    event_count = len(converted_events)
    time_budget = 300  # 5 hours default (300 minutes)
    if event_count > 30:  # Heavy course load
        time_budget = 540  # 9 hours
    elif event_count > 20:
        time_budget = 420  # 7 hours

    return {
        "name": claude_course["course_name"],
        "code": course_code,
        "term": claude_course["semester"],
        "instructor": "TBD",  # Not in Claude's data
        "default_study_mode": default_mode,
        "time_budget_per_week_minutes": time_budget,
        "events": converted_events
    }


def import_claude_json(file_path: str, dry_run: bool = False) -> None:
    """
    Import courses from a Claude-generated JSON file.

    Args:
        file_path: Path to JSON file (individual course or master schedule)
        dry_run: If True, only print what would be imported without actually importing
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Detect format: master schedule vs individual course
    if "courses" in data:
        # Master schedule format
        courses = data["courses"]
        print(f"[MASTER] Found master schedule with {len(courses)} courses")
    elif "course_id" in data:
        # Individual course format
        courses = [data]
        print(f"[COURSE] Found individual course: {data['course_name']}")
    else:
        print("[ERROR] Unknown JSON format. Expected 'courses' or 'course_id' field.")
        return

    print(f"\n{'='*60}")
    print(f"{'DRY RUN - No changes will be made' if dry_run else 'LIVE IMPORT - Data will be written to database'}")
    print(f"{'='*60}\n")

    for claude_course in courses:
        # Convert to system format
        system_course = convert_claude_course(claude_course)

        print(f"\n[COURSE] {system_course['name']} ({system_course['code']})")
        print(f"   Term: {system_course['term']}")
        print(f"   Study Mode: {system_course['default_study_mode']}")
        print(f"   Weekly Budget: {system_course['time_budget_per_week_minutes']} min")
        print(f"   Events: {len(system_course['events'])}")

        if dry_run:
            # Show sample events
            print(f"\n   Sample events:")
            for event in system_course['events'][:3]:
                print(f"     • {event['date']} - {event['type'].upper()}: {event['title']}")
                if event['raw_text']:
                    print(f"       {event['raw_text'][:80]}...")
            if len(system_course['events']) > 3:
                print(f"     ... and {len(system_course['events']) - 3} more")
        else:
            # Actually import
            try:
                # upsert_course expects a dictionary
                course_data = {
                    "name": system_course['name'],
                    "code": system_course['code'],
                    "term": system_course['term'],
                    "instructor": system_course['instructor'],
                    "default_study_mode": system_course['default_study_mode'],
                    "time_budget_per_week_minutes": system_course['time_budget_per_week_minutes']
                }
                course_id = upsert_course(course_data)
                print(f"   [OK] Course upserted (ID: {course_id})")

                import_events(course_id, system_course['events'])
                print(f"   [OK] {len(system_course['events'])} events imported")

                # Dedupe (apply=True means actually delete, apply=False is dry-run)
                result = dedupe_course_events(course_id, apply=True, verbose=False)
                if result.get("removed", 0) > 0:
                    print(f"   [DEDUPE] Removed {result['removed']} duplicate events")

            except Exception as e:
                print(f"   [ERROR] Error importing course: {e}")

    print(f"\n{'='*60}")
    if dry_run:
        print(f"[DRY RUN] Complete. Re-run with --live to actually import.")
    else:
        print(f"[COMPLETE] Import finished successfully!")
    print(f"{'='*60}\n")


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Import Claude-generated schedule JSON into the study system"
    )
    parser.add_argument(
        "file",
        help="Path to JSON file (individual course or master schedule)"
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Actually import data (default is dry-run)"
    )

    args = parser.parse_args()

    if not Path(args.file).exists():
        print(f"[ERROR] File not found: {args.file}")
        return 1

    import_claude_json(args.file, dry_run=not args.live)
    return 0


if __name__ == "__main__":
    sys.exit(main())
