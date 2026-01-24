from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
import sqlite3
import json
import os
import requests
from typing import List, Dict, Any

# Import internal modules from the "Brain"
from db_setup import get_connection
from config import load_env, COURSE_FOLDERS
from dashboard.utils import load_api_config

# ==============================================================================
# OBSIDIAN LOCAL REST API CONFIG
# ==============================================================================
OBSIDIAN_API_URL = "https://127.0.0.1:27124"

# Load .env so OBSIDIAN_API_KEY is available if set there
load_env()

def get_obsidian_api_key() -> str:
    """Get Obsidian API key, with fallback to direct .env read."""
    key = os.environ.get("OBSIDIAN_API_KEY", "")
    if key:
        return key
    # Fallback: read directly from brain/.env
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("OBSIDIAN_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
        except Exception:
            pass
    return ""

OBSIDIAN_API_KEY = get_obsidian_api_key()

def obsidian_health_check() -> dict:
    """Check if Obsidian Local REST API is running."""
    try:
        resp = requests.get(
            f"{OBSIDIAN_API_URL}/",
            headers={"Authorization": f"Bearer {OBSIDIAN_API_KEY}"},
            timeout=3,
            verify=False  # Self-signed cert
        )
        if resp.status_code == 200:
            return {"connected": True, "status": "online"}
        return {"connected": False, "status": "error", "error": f"Status {resp.status_code}"}
    except requests.exceptions.ConnectionError:
        return {"connected": False, "status": "offline", "error": "Obsidian not running or plugin disabled"}
    except Exception as e:
        return {"connected": False, "status": "error", "error": str(e)}

def obsidian_append(path: str, content: str) -> dict:
    """Append content to a file in Obsidian vault using Local REST API."""
    try:
        # Local REST API uses POST to append content
        resp = requests.post(
            f"{OBSIDIAN_API_URL}/vault/{path}",
            data=content.encode('utf-8'),
            headers={
                "Authorization": f"Bearer {OBSIDIAN_API_KEY}",
                "Content-Type": "text/markdown"
            },
            timeout=10,
            verify=False  # Self-signed cert
        )
        if resp.status_code in [200, 204]:
            return {"success": True, "path": path, "bytes": len(content)}
        return {"success": False, "error": f"Status {resp.status_code}: {resp.text}"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Obsidian not running or plugin disabled"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def obsidian_list_files(folder: str = "") -> dict:
    """List files in Obsidian vault folder."""
    try:
        url = f"{OBSIDIAN_API_URL}/vault/" if not folder else f"{OBSIDIAN_API_URL}/vault/{folder}/"
        resp = requests.get(
            url,
            headers={"Authorization": f"Bearer {OBSIDIAN_API_KEY}", "Accept": "application/json"},
            timeout=10,
            verify=False  # Self-signed cert
        )
        if resp.status_code == 200:
            try:
                data = resp.json()
            except Exception:
                return {"success": False, "error": "Non-JSON response from Obsidian"}

            files = []
            folders = []

            if isinstance(data, list):
                files = data
            elif isinstance(data, dict):
                if "files" in data:
                    files = data.get("files") or []
                elif "data" in data:
                    files = data.get("data") or []
                else:
                    # Some APIs return a path->metadata mapping
                    files = list(data.keys())

                folders = data.get("folders") or data.get("dirs") or []
            else:
                files = []

            def normalize_item(item):
                if isinstance(item, dict) and "path" in item:
                    return item.get("path")
                return item

            normalized = []
            for item in files:
                path = normalize_item(item)
                if path:
                    normalized.append(path)

            for item in folders:
                path = normalize_item(item)
                if path:
                    if not path.endswith("/"):
                        path = f"{path}/"
                    normalized.append(path)

            return {"success": True, "files": normalized}

        return {"success": False, "error": f"Status {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def obsidian_get_file(path: str) -> dict:
    """Get content of a file from Obsidian vault."""
    try:
        resp = requests.get(
            f"{OBSIDIAN_API_URL}/vault/{path}",
            headers={"Authorization": f"Bearer {OBSIDIAN_API_KEY}", "Accept": "text/markdown"},
            timeout=10,
            verify=False  # Self-signed cert
        )
        if resp.status_code == 200:
            return {"success": True, "content": resp.text, "path": path}
        return {"success": False, "error": f"Status {resp.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def obsidian_save_file(path: str, content: str) -> dict:
    """Save/overwrite a file in Obsidian vault."""
    try:
        resp = requests.put(
            f"{OBSIDIAN_API_URL}/vault/{path}",
            data=content.encode('utf-8'),
            headers={
                "Authorization": f"Bearer {OBSIDIAN_API_KEY}",
                "Content-Type": "text/markdown"
            },
            timeout=10,
            verify=False  # Self-signed cert
        )
        if resp.status_code in [200, 204]:
            return {"success": True, "path": path}
        return {"success": False, "error": f"Status {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_current_course_name() -> str | None:
    """Get the current course name from the study wheel (position 0)."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT name FROM wheel_courses
            WHERE active = 1
            ORDER BY position ASC
            LIMIT 1
        """)
        row = cur.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception:
        return None


def get_course_obsidian_folder(course_name: str) -> str | None:
    """Get the Obsidian folder path for a course name."""
    if not course_name:
        return None
    # Exact match first
    if course_name in COURSE_FOLDERS:
        return COURSE_FOLDERS[course_name]
    # Case-insensitive match
    course_lower = course_name.lower()
    for name, folder in COURSE_FOLDERS.items():
        if name.lower() == course_lower:
            return folder
    # Partial match (course name contains key or vice versa)
    for name, folder in COURSE_FOLDERS.items():
        if course_lower in name.lower() or name.lower() in course_lower:
            return folder
    return None


# Wrap optional imports to prevent crash if Scholar/Google libs missing
try:
    from scholar.brain_reader import (
        get_all_sessions,
        get_session_by_id,
        get_session_count,
        calculate_session_metrics,
    )
    from scholar.friction_alerts import generate_alerts
except ImportError:
    # Scholar modules are optional - provide fallbacks silently
    get_all_sessions = lambda limit=None: []
    get_session_by_id = lambda x: None
    get_session_count = lambda: 0
    calculate_session_metrics = lambda: {}
    generate_alerts = lambda: []

from dashboard.syllabus import fetch_all_courses_and_events

# Define the Blueprint that mimics the Node.js API
adapter_bp = Blueprint("api_adapter", __name__, url_prefix="/api")

# ==============================================================================
# SESSIONS
# ==============================================================================


def serialize_session_row(row):
    raw_date = row["session_date"] if "session_date" in row.keys() else None
    raw_time = row["session_time"] if "session_time" in row.keys() else None
    if raw_date and raw_time:
        date_str = f"{raw_date}T{raw_time}"
    else:
        date_str = raw_date

    final_date = safe_iso_date(date_str) or datetime.now().isoformat()

    confusions_val = row["confusions"] if "confusions" in row.keys() else None
    if not confusions_val:
        confusions_val = row["errors_conceptual"] if "errors_conceptual" in row.keys() else None
    if not confusions_val:
        confusions_val = row["gaps_identified"] if "gaps_identified" in row.keys() else None

    concepts_val = row["concepts"] if "concepts" in row.keys() else None
    if not concepts_val:
        concepts_val = row["subtopics"] if "subtopics" in row.keys() else None

    issues_val = row["issues"] if "issues" in row.keys() else None
    if not issues_val:
        issues_val = row["what_needs_fixing"] if "what_needs_fixing" in row.keys() else None

    duration_minutes = row["duration_minutes"] if "duration_minutes" in row.keys() else None
    minutes = row["time_spent_minutes"] if "time_spent_minutes" in row.keys() else None
    if minutes in (None, "") or (minutes == 0 and duration_minutes not in (None, "", 0)):
        minutes = duration_minutes
    minutes = minutes or 0

    if duration_minutes in (None, "") or duration_minutes == 0:
        duration_minutes = minutes

    return {
        "id": row["id"],
        "date": final_date,
        "topic": row["main_topic"] or row["topic"] or "Study Session",
        "courseId": None,
        "mode": row["study_mode"] or "study",
        "duration": str(duration_minutes or 0),
        "minutes": minutes,
        "errors": 0,
        "cards": row["anki_cards_count"] or 0,
        "notes": row["notes_insights"] if "notes_insights" in row.keys() else None,
        "confusions": confusions_val,
        "weakAnchors": row["weak_anchors"] if "weak_anchors" in row.keys() else None,
        "concepts": concepts_val,
        "issues": issues_val,
        "sourceLock": row["source_lock"] if "source_lock" in row.keys() else None,
        "createdAt": row["created_at"] if "created_at" in row.keys() else final_date,
    }


@adapter_bp.route("/sessions", methods=["GET"])
def get_sessions():
    """
    Mimics: app.get("/api/sessions")
    Returns a list of study sessions.
    """
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                id,
                session_date,
                session_time,
                main_topic,
                topic,
                study_mode,
                time_spent_minutes,
                duration_minutes,
                anki_cards_count,
                notes_insights,
                weak_anchors,
                source_lock,
                confusions,
                concepts,
                issues,
                errors_conceptual,
                gaps_identified,
                subtopics,
                what_needs_fixing,
                created_at
            FROM sessions
            ORDER BY session_date DESC, session_time DESC
        """
        )
        rows = cur.fetchall()
        conn.close()

        return jsonify([serialize_session_row(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/sessions/stats", methods=["GET"])
def get_session_stats():
    """
    Mimics: app.get("/api/sessions/stats")
    """
    from scholar.brain_reader import get_session_count, get_average_metrics

    count = get_session_count()
    avgs = get_average_metrics()

    return jsonify(
        {
            "total": count,
            "avgErrors": 0,  # Placeholder
            "totalCards": int(
                avgs.get("avg_duration_minutes", 0) * count * 0.5
            ),  # Estimate for now
        }
    )


@adapter_bp.route("/sessions/<int:session_id>", methods=["GET"])
def get_single_session(session_id):
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                id,
                session_date,
                session_time,
                main_topic,
                topic,
                study_mode,
                time_spent_minutes,
                duration_minutes,
                anki_cards_count,
                notes_insights,
                weak_anchors,
                source_lock,
                confusions,
                concepts,
                issues,
                errors_conceptual,
                gaps_identified,
                subtopics,
                what_needs_fixing,
                created_at
            FROM sessions
            WHERE id = ?
        """,
            (session_id,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return jsonify({"error": "Session not found"}), 404
        return jsonify(serialize_session_row(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/sessions", methods=["POST"])
def create_session():
    """
    Mimics: app.post("/api/sessions")
    Creates a real session in the SQLite DB.
    """
    data = request.json or {}

    topic = data.get("topic", "Untitled")
    mode = data.get("mode") or "Core"
    minutes = data.get("minutes")
    if minutes is None:
        minutes = data.get("durationMinutes") or 0
    cards = data.get("cards") or 0
    notes = data.get("notes")
    confusions = normalize_list_value(data.get("confusions"))
    weak_anchors = normalize_list_value(data.get("weakAnchors"))
    concepts = normalize_list_value(data.get("concepts"))
    issues = normalize_list_value(data.get("issues"))
    source_lock = normalize_list_value(data.get("sourceLock"))

    date_str = datetime.now().strftime("%Y-%m-%d")
    time_str = datetime.now().strftime("%H:%M:%S")

    # Manual insertion since brain_reader is read-only
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO sessions (
                session_date, session_time, main_topic, study_mode,
                created_at, time_spent_minutes, duration_minutes,
                anki_cards_count, notes_insights,
                confusions, weak_anchors, concepts, issues, source_lock
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                date_str,
                time_str,
                topic,
                mode,
                datetime.now().isoformat(),
                minutes,
                minutes,
                cards,
                notes,
                confusions,
                weak_anchors,
                concepts,
                issues,
                source_lock,
            ),
        )
        conn.commit()
        new_id = cursor.lastrowid
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

    return jsonify(
        {
            "id": new_id,
            "topic": topic,
            "date": f"{date_str}T{time_str}",
            "type": "study",
            "mode": mode,
            "minutes": minutes,
            "cards": cards,
        }
    ), 201


@adapter_bp.route("/sessions/<int:session_id>", methods=["PATCH"])
def update_session(session_id):
    """Update session details."""
    data = request.json or {}
    try:
        conn = get_connection()
        cur = conn.cursor()

        fields = []
        values = []

        if "topic" in data:
            fields.append("main_topic = ?")
            values.append(data["topic"])
        if "mode" in data:
            fields.append("study_mode = ?")
            values.append(data["mode"])
        if "minutes" in data:
            fields.append("time_spent_minutes = ?")
            values.append(data["minutes"])
            fields.append("duration_minutes = ?")
            values.append(data["minutes"])
        if "durationMinutes" in data:
            fields.append("duration_minutes = ?")
            values.append(data["durationMinutes"])
        if "cards" in data:
            fields.append("anki_cards_count = ?")
            values.append(data["cards"])
        if "notes" in data:
            fields.append("notes_insights = ?")
            values.append(data["notes"])
        if "confusions" in data:
            fields.append("confusions = ?")
            values.append(normalize_list_value(data["confusions"]))
        if "weakAnchors" in data:
            fields.append("weak_anchors = ?")
            values.append(normalize_list_value(data["weakAnchors"]))
        if "concepts" in data:
            fields.append("concepts = ?")
            values.append(normalize_list_value(data["concepts"]))
        if "issues" in data:
            fields.append("issues = ?")
            values.append(normalize_list_value(data["issues"]))
        if "sourceLock" in data:
            fields.append("source_lock = ?")
            values.append(normalize_list_value(data["sourceLock"]))

        if not fields:
            return jsonify({"success": True})

        values.append(session_id)
        cur.execute(
            f"UPDATE sessions SET {', '.join(fields)} WHERE id = ?", tuple(values)
        )
        conn.commit()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                id,
                session_date,
                session_time,
                main_topic,
                topic,
                study_mode,
                time_spent_minutes,
                duration_minutes,
                anki_cards_count,
                notes_insights,
                weak_anchors,
                source_lock,
                confusions,
                concepts,
                issues,
                errors_conceptual,
                gaps_identified,
                subtopics,
                what_needs_fixing,
                created_at
            FROM sessions
            WHERE id = ?
        """,
            (session_id,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return jsonify({"error": "Session not found"}), 404
        return jsonify(serialize_session_row(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/sessions/<int:session_id>", methods=["DELETE"])
def delete_session(session_id):
    """Delete a session."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/sessions/bulk-delete", methods=["POST"])
def bulk_delete_sessions():
    """Delete multiple sessions by IDs."""
    try:
        data = request.get_json()
        ids = data.get("ids", [])
        
        if not ids:
            return jsonify({"deleted": 0})
        
        conn = get_connection()
        cur = conn.cursor()
        placeholders = ",".join("?" * len(ids))
        cur.execute(f"DELETE FROM sessions WHERE id IN ({placeholders})", ids)
        deleted = cur.rowcount
        conn.commit()
        conn.close()
        return jsonify({"deleted": deleted})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# EVENTS (Calendar)
# ==============================================================================


# Helper for date safety
def safe_iso_date(date_val):
    if not date_val:
        return None
    try:
        if isinstance(date_val, str):
            if "T" in date_val:
                return date_val
            return f"{date_val}T00:00:00"
        if hasattr(date_val, "isoformat"):
            return date_val.isoformat()
    except:
        pass
    return None


def parse_json_array(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value if v is not None]
    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return []
        try:
            parsed = json.loads(trimmed)
            if isinstance(parsed, list):
                return [str(v) for v in parsed if v is not None]
        except Exception:
            pass
        return [v.strip() for v in trimmed.split(",") if v.strip()]
    return [str(value)]


def normalize_list_value(value):
    if value is None:
        return None
    if isinstance(value, list):
        return json.dumps(value)
    if isinstance(value, str):
        return value
    return json.dumps([str(value)])


@adapter_bp.route("/events", methods=["GET"])
def get_events():
    """
    Mimics: app.get("/api/events")
    Sources from 'course_events' table via syllabus.py helper.
    """
    from brain.dashboard.syllabus import fetch_all_courses_and_events

    try:
        courses, events = fetch_all_courses_and_events()
        course_map = {c["id"]: c for c in courses}

        serialized = []
        for ev in events:
            # Date safety: Ensure we have a valid date
            raw_start = ev.get("date") or ev.get("due_date")
            start_date = safe_iso_date(raw_start)

            if not start_date:
                continue

            c_info = course_map.get(ev.get("course_id"), {})
            title = ev.get("title", "Untitled")

            serialized.append(
                {
                    "id": ev["id"],
                    "title": title,
                    "date": start_date,
                    "endDate": ev.get("due_date"),
                    "allDay": True,
                    "eventType": (ev.get("type") or "event").lower(),
                    "course": c_info.get("code") or c_info.get("name"),
                    "color": c_info.get("color") or "#ef4444",
                    "status": ev.get("status", "pending"),
                }
            )

        return jsonify(serialized)
    except Exception as e:
        print(f"Calendar Error: {e}")
        return jsonify([]), 500


@adapter_bp.route("/events", methods=["POST"])
def create_event():
    """
    Mimics: app.post("/api/events")
    Creates a local event in course_events table.
    """
    from db_setup import get_connection

    data = request.json
    try:
        conn = get_connection()
        cur = conn.cursor()

        title = data.get("title", "Untitled Event")
        date_val = data.get("date", "")
        if "T" in date_val:
            date_val = date_val.split("T")[0]
        
        end_date = data.get("endDate")
        if end_date and "T" in end_date:
            end_date = end_date.split("T")[0]
        
        event_type = data.get("eventType", "event")
        color = data.get("color", "#ef4444")
        status = data.get("status", "pending")
        notes = data.get("notes", "")
        course_id = data.get("courseId")

        cur.execute(
            """INSERT INTO course_events (title, date, due_date, type, status, notes, course_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (title, date_val, end_date, event_type, status, notes, course_id)
        )
        event_id = cur.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            "id": event_id,
            "title": title,
            "date": date_val,
            "endDate": end_date,
            "eventType": event_type,
            "color": color,
            "status": status,
        }), 201
    except Exception as e:
        print(f"Create Event Error: {e}")
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/events/<int:event_id>", methods=["DELETE"])
def delete_event(event_id):
    """Delete a local course event."""
    from db_setup import get_connection

    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM course_events WHERE id = ?", (event_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/events/<int:event_id>", methods=["PATCH"])
def update_event(event_id):
    """Update a local course event."""
    data = request.json
    try:
        conn = get_connection()
        cur = conn.cursor()

        fields = []
        values = []

        # Map frontend fields to DB columns
        if "title" in data:
            fields.append("title = ?")
            values.append(data["title"])
        if "date" in data:
            # handle iso
            dt = data["date"].split("T")[0] if "T" in data["date"] else data["date"]
            fields.append("date = ?")
            values.append(dt)
        if "status" in data:
            fields.append("status = ?")
            values.append(data["status"])

        if not fields:
            return jsonify({"success": True})

        values.append(event_id)
        cur.execute(
            f"UPDATE course_events SET {', '.join(fields)} WHERE id = ?", tuple(values)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# SCHEDULE EVENTS (Course Events mapping)
# ==============================================================================


@adapter_bp.route("/schedule-events", methods=["GET"])
def get_schedule_events():
    """Return schedule events for a course (mapped to course_events)."""
    try:
        course_id = request.args.get("courseId", type=int)
        if not course_id:
            return jsonify({"error": "courseId query param required"}), 400

        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, course_id, type, title, due_date, date, raw_text, created_at, updated_at
            FROM course_events
            WHERE course_id = ?
            ORDER BY COALESCE(due_date, date) ASC
        """,
            (course_id,),
        )
        rows = cur.fetchall()
        conn.close()

        events = []
        for r in rows:
            events.append({
                "id": r[0],
                "courseId": r[1],
                "type": r[2],
                "title": r[3],
                "dueDate": r[4] or r[5],
                "linkedModuleId": None,
                "notes": r[6],
                "createdAt": r[7],
                "updatedAt": r[8] or r[7],
            })

        return jsonify(events)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/schedule-events", methods=["POST"])
def create_schedule_event():
    """Create a schedule event (mapped to course_events)."""
    data = request.get_json() or {}
    course_id = data.get("courseId")
    event_type = data.get("type")
    title = data.get("title")
    due_date = data.get("dueDate")
    notes = data.get("notes")

    if not course_id or not event_type or not title:
        return jsonify({"error": "courseId, type, and title are required"}), 400

    try:
        conn = get_connection()
        cur = conn.cursor()
        now = datetime.now().isoformat()
        cur.execute(
            """
            INSERT INTO course_events (
                course_id, type, title, date, due_date, raw_text, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        """,
            (
                course_id,
                event_type,
                title,
                due_date,
                due_date,
                notes,
                now,
                now,
            ),
        )
        conn.commit()
        new_id = cur.lastrowid
        conn.close()

        return jsonify({
            "id": new_id,
            "courseId": course_id,
            "type": event_type,
            "title": title,
            "dueDate": due_date,
            "linkedModuleId": None,
            "notes": notes,
            "createdAt": now,
            "updatedAt": now,
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/schedule-events/bulk", methods=["POST"])
def bulk_create_schedule_events():
    data = request.get_json() or {}
    events = data.get("events", [])
    course_id = data.get("courseId")
    if not isinstance(events, list) or not course_id:
        return jsonify({"error": "events array and courseId required"}), 400

    try:
        conn = get_connection()
        cur = conn.cursor()
        now = datetime.now().isoformat()
        created = []
        for ev in events:
            event_type = ev.get("type")
            title = ev.get("title")
            due_date = ev.get("dueDate")
            notes = ev.get("notes")
            if not event_type or not title:
                continue
            cur.execute(
                """
                INSERT INTO course_events (
                    course_id, type, title, date, due_date, raw_text, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
                (
                    course_id,
                    event_type,
                    title,
                    due_date,
                    due_date,
                    notes,
                    now,
                    now,
                ),
            )
            created.append({
                "id": cur.lastrowid,
                "courseId": course_id,
                "type": event_type,
                "title": title,
                "dueDate": due_date,
                "linkedModuleId": None,
                "notes": notes,
                "createdAt": now,
                "updatedAt": now,
            })
        conn.commit()
        conn.close()
        return jsonify(created), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/schedule-events/<int:event_id>", methods=["PATCH"])
def update_schedule_event(event_id):
    data = request.get_json() or {}
    try:
        conn = get_connection()
        cur = conn.cursor()

        fields = []
        values = []
        if "type" in data:
            fields.append("type = ?")
            values.append(data["type"])
        if "title" in data:
            fields.append("title = ?")
            values.append(data["title"])
        if "dueDate" in data:
            fields.append("due_date = ?")
            values.append(data["dueDate"])
            fields.append("date = ?")
            values.append(data["dueDate"])
        if "notes" in data:
            fields.append("raw_text = ?")
            values.append(data["notes"])

        if not fields:
            return jsonify({"error": "No fields to update"}), 400

        fields.append("updated_at = ?")
        values.append(datetime.now().isoformat())

        values.append(event_id)
        cur.execute(
            f"UPDATE course_events SET {', '.join(fields)} WHERE id = ?", values
        )
        conn.commit()

        cur.execute(
            """
            SELECT id, course_id, type, title, due_date, date, raw_text, created_at, updated_at
            FROM course_events
            WHERE id = ?
        """,
            (event_id,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return jsonify({"error": "Schedule event not found"}), 404

        return jsonify({
            "id": row[0],
            "courseId": row[1],
            "type": row[2],
            "title": row[3],
            "dueDate": row[4] or row[5],
            "linkedModuleId": None,
            "notes": row[6],
            "createdAt": row[7],
            "updatedAt": row[8] or row[7],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/schedule-events/<int:event_id>", methods=["DELETE"])
def delete_schedule_event(event_id):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM course_events WHERE id = ?", (event_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# TASKS
# ==============================================================================


@adapter_bp.route("/tasks", methods=["GET"])
def get_tasks():
    """
    Mimics: app.get("/api/tasks")
    Maps incomplete course assignments to Tasks.
    """
    from brain.db_setup import get_connection

    tasks = []
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Fetch Course Assignments that are pending
        cur.execute("""
            SELECT id, title, status, created_at
            FROM course_events
            WHERE type IN ('assignment', 'exam', 'quiz') 
              AND status != 'completed'
            ORDER BY created_at DESC
        """)
        assignment_rows = cur.fetchall()
        for r in assignment_rows:
            # r[3] is createdAt
            created_at = safe_iso_date(r[3]) or datetime.now().isoformat()

            tasks.append(
                {
                    "id": r[0],
                    "title": r[1],
                    "status": "pending",
                    "createdAt": created_at,
                }
            )

        conn.close()
    except Exception as e:
        print(f"Task Fetch Error: {e}")
        return jsonify([]), 500

    return jsonify(tasks)


@adapter_bp.route("/proposals", methods=["GET"])
def get_proposals():
    """
    Mimics: app.get("/api/proposals")
    Maps 'scholar_proposals' to Proposals.
    """
    # get_connection already imported at top of file

    proposals = []

    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, title, proposal_type, status, created_at, filename 
            FROM scholar_proposals 
            WHERE status != 'superseded'
            ORDER BY created_at DESC
        """)
        rows = cur.fetchall()

        for r in rows:
            created_at = safe_iso_date(r[4]) or datetime.now().isoformat()

            proposals.append(
                {
                    "id": r[0],
                    "proposalId": r[5] or str(r[0]),
                    "summary": r[1] or "Untitled Proposal",
                    "status": (r[3] or "DRAFT").upper(),
                    "priority": "MED",
                    "targetSystem": r[2],
                    "createdAt": created_at,
                }
            )
        conn.close()
    except Exception as e:
        print(f"Proposal Fetch Error: {e}")
        return jsonify([]), 500

    return jsonify(proposals)


@adapter_bp.route("/proposals", methods=["POST"])
def create_proposal():
    """Create a new proposal."""
    data = request.json
    try:
        conn = get_connection()
        cur = conn.cursor()

        # proposalId from frontend is used as filename/identifier
        proposal_id = data.get("proposalId")
        if not proposal_id:
            # Auto-generate if missing
            cur.execute("SELECT COUNT(*) FROM scholar_proposals")
            count = cur.fetchone()[0]
            proposal_id = f"P-{count + 101}"

        summary = data.get("summary", "Untitled")
        target_system = data.get("targetSystem", "General")
        status = data.get("status", "DRAFT").lower()
        now = datetime.now().isoformat()

        # We need a filepath as per schema.
        # We'll point to a conceptual path.
        filepath = f"brain/scholar/proposals/{proposal_id}.md"

        cur.execute(
            """
            INSERT INTO scholar_proposals 
            (filename, filepath, title, proposal_type, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (proposal_id, filepath, summary, target_system, status, now),
        )

        new_id = cur.lastrowid
        conn.commit()
        conn.close()

        return jsonify(
            {
                "id": new_id,
                "proposalId": proposal_id,
                "summary": summary,
                "status": status.upper(),
                "priority": "MED",
                "targetSystem": target_system,
                "createdAt": now,
            }
        ), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/proposals/<int:prop_id>", methods=["PATCH"])
def update_proposal(prop_id):
    """Update a proposal."""
    data = request.json
    try:
        conn = get_connection()
        cur = conn.cursor()

        fields = []
        values = []

        if "status" in data:
            fields.append("status = ?")
            values.append(data["status"].lower())

        # Frontend might mock other fields in UI but only sends status updates mostly?
        # scholar.tsx updateMutation sends {id, data}.

        if not fields:
            return jsonify({"success": True})

        values.append(prop_id)
        cur.execute(
            f"UPDATE scholar_proposals SET {', '.join(fields)} WHERE id = ?",
            tuple(values),
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/proposals/<int:prop_id>", methods=["DELETE"])
def delete_proposal(prop_id):
    """Delete a proposal."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM scholar_proposals WHERE id = ?", (prop_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/tasks", methods=["POST"])
def create_task():
    """
    Mimics: app.post("/api/tasks")
    """
    # TODO: Implement manual task creation if needed
    return jsonify({"id": 999, "status": "mocked"}), 201


# ==============================================================================
# SCHOLAR AGENT CONTROL
# ==============================================================================


@adapter_bp.route("/scholar/run", methods=["POST"])
def run_scholar():
    """
    Triggers the Scholar agent loop.
    Uses subprocess to spawn independent process or background thread?
    For safety, let's use a background thread calling `scholar.run_scholar_orchestrator` if properly isolated,
    or subprocess to run `run_scholar.bat` (unattended).

    Subprocess is safer to avoid blocking Flask.
    """
    import subprocess
    from pathlib import Path

    try:
        repo_root = Path(__file__).parent.parent.parent.resolve()
        script_path = repo_root / "scripts" / "run_scholar.bat"

        # Check if running? (Optional)

        # Spawn process
        # We use a special flag or mode? The bat file shows a menu.
        # We need an unattended mode.
        # The user wants "Unattended execution" from menu.
        # But for now, let's just assume we can call the python script directly.

        # Direct python call to bypass menu:
        # python brain/dashboard/scholar.py --mode orchestrator

        py_script = repo_root / "brain" / "dashboard" / "scholar.py"

        # Use Popen to run in background
        subprocess.Popen(
            ["python", str(py_script), "--mode", "orchestrator"],
            cwd=str(repo_root),
            start_new_session=True,  # Detach
        )

        return jsonify({"success": True, "message": "Scholar process started"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/scholar/status", methods=["GET"])
def scholar_status():
    """Check if Scholar is running."""
    from pathlib import Path

    try:
        repo_root = Path(__file__).parent.parent.parent.resolve()
        run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"

        is_running = False
        if run_dir.exists():
            for pid_file in run_dir.glob("*.pid"):
                # If pid file exists, check if process is still running
                is_running = True
                break

        return jsonify(
            {"running": is_running, "status": "active" if is_running else "idle"}
        )
    except:
        return jsonify({"running": False, "status": "unknown"})


@adapter_bp.route("/scholar/logs", methods=["GET"])
def scholar_logs():
    """Get latest logs."""
    from pathlib import Path

    try:
        repo_root = Path(__file__).parent.parent.parent.resolve()
        run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"

        # Find latest .log
        log_files = list(run_dir.glob("*.log"))
        if not log_files:
            return jsonify({"logs": ["No logs found."]})

        latest_log = max(log_files, key=lambda f: f.stat().st_mtime)

        # Read last N lines
        content = latest_log.read_text(encoding="utf-8", errors="ignore")
        lines = content.splitlines()[-50:]  # Last 50 lines

        return jsonify({"logs": lines})
    except Exception as e:
        return jsonify({"logs": [f"Error reading logs: {str(e)}"]})


@adapter_bp.route("/scholar/api-key", methods=["POST"])
def update_api_key():
    """Update API Config."""
    data = request.json
    # TODO: Implement updating api_config.json safely
    return jsonify({"success": True})


@adapter_bp.route("/chat/<session_id>", methods=["POST"])
def chat_message(session_id):
    """
    Mimics: app.post("/api/chat/:sessionId")
    Connects to the real Tutor Engine (RAG + OpenRouter).
    """
    try:
        # Import Tutor Engine components dynamically
        import sys
        from pathlib import Path

        brain_dir = Path(__file__).resolve().parent.parent
        if str(brain_dir) not in sys.path:
            sys.path.append(str(brain_dir))

        from brain.tutor_engine import process_tutor_turn, log_tutor_turn
        from brain.tutor_api_types import TutorQueryV1, TutorSourceSelector

        data = request.json
        user_message = data.get("content")

        if not user_message:
            return jsonify({"error": "Message content required"}), 400

        # Construct Query Object
        query = TutorQueryV1(
            user_id="user",
            session_id=str(session_id),
            course_id=None,
            topic_id=None,
            mode="Core",
            question=user_message,
            plan_snapshot_json="{}",
            sources=TutorSourceSelector(),
        )

        # Process with Tutor Engine
        response = process_tutor_turn(query)

        # Log the turn
        log_tutor_turn(query, response)

        # Return in format expected by React frontend
        return jsonify(
            {
                "id": int(datetime.now().timestamp()),
                "sender": "ai",
                "content": response.answer,
                "timestamp": datetime.now().isoformat(),
                "unverified": response.unverified,
                "citations": [asdict(c) for c in response.citations]
                if response.citations
                else [],
            }
        )

    except Exception as e:
        print(f"Tutor Engine Error: {e}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# GOOGLE CALENDAR
# ==============================================================================


@adapter_bp.route("/google/status", methods=["GET"])
def google_status():
    """
    Mimics: app.get("/api/google/status")
    Checks if backend is connected to Google Calendar.
    """
    from dashboard import gcal

    status = gcal.check_auth_status()
    # status = { connected: bool, email: str, error: str }

    # Frontend expects: configured, connected, hasClientId...
    is_connected = status.get("connected", False)
    error_msg = status.get("error", "")

    # Simple heuristic: if specific config error, then not configured
    is_configured = "configured" not in error_msg.lower()

    return jsonify(
        {
            "configured": is_configured,
            "connected": is_connected,
            "hasClientId": is_configured,
            "hasClientSecret": is_configured,
            "email": status.get("email"),
        }
    )


@adapter_bp.route("/google/auth", methods=["GET"])
def google_auth_url():
    """
    Mimics: app.get("/api/google/auth")
    Returns the OAuth URL to start the flow.
    """
    from dashboard import gcal

    url, state_or_msg = gcal.get_auth_url()
    if not url:
        return jsonify({"error": state_or_msg}), 500

    return jsonify({"authUrl": url})


@adapter_bp.route("/gcal/oauth/callback", methods=["GET"])
def google_oauth_callback():
    """
    The redirect target for Google OAuth.
    Exchanges code for token, then redirects user back to dashboard.
    """
    from flask import redirect
    from dashboard import gcal
    import logging

    logging.info(f"OAuth callback received. Args: {request.args}")

    code = request.args.get("code")
    error = request.args.get("error")

    if error:
        logging.error(f"OAuth error from Google: {error}")
        return f"Google OAuth Error: {error}", 400

    if not code:
        logging.error("Missing authorization code")
        return "Missing code", 400

    success, msg = gcal.complete_oauth(code)
    logging.info(f"OAuth complete result: success={success}, msg={msg}")

    if success:
        return redirect("/calendar")

    logging.error(f"OAuth failed: {msg}")
    return f"Google Auth Failed: {msg}", 400


@adapter_bp.route("/google/disconnect", methods=["POST"])
def google_disconnect():
    """
    Mimics: app.post("/api/google/disconnect")
    """
    from dashboard import gcal

    gcal.revoke_auth()
    return jsonify({"success": True})


# ==============================================================================
# GOOGLE DATA PROXIES (Direct Fetch)
# ==============================================================================


@adapter_bp.route("/google-calendar/calendars", methods=["GET"])
def get_google_calendars():
    from dashboard import gcal

    calendars, error = gcal.fetch_calendar_list()
    if error:
        return jsonify({"error": error}), 500

    # Inject backgroundColor if missing (gcal.py doesn't always expose it raw)
    # But usually 'backgroundColor' is in the calendar resource
    # Frontend expects: id, summary, backgroundColor
    return jsonify(calendars)


@adapter_bp.route("/google-calendar/events", methods=["GET"])
def get_google_events():
    from dashboard import gcal
    from datetime import datetime

    # Frontend sends timeMin, timeMax
    # gcal.fetch_calendar_events currently uses hardcoded logic or list of IDs
    # We need to fetch all selected calendars.
    # For now, let's fetch 'primary' or all configured.

    config = gcal.load_gcal_config() or {}
    # Force visibility of ALL calendars for the frontend
    config["sync_all_calendars"] = True

    calendars, _ = gcal.fetch_calendar_list()
    selected_ids, _, _, calendar_meta = gcal.resolve_calendar_selection(
        config, calendars
    )

    # Build a color map
    calendar_colors = {c["id"]: c.get("backgroundColor", "#ef4444") for c in calendars}

    time_min = request.args.get("timeMin")
    time_max = request.args.get("timeMax")

    events, error = gcal.fetch_calendar_events(
        selected_ids, calendar_meta, time_min=time_min, time_max=time_max
    )
    if error:
        return jsonify({"error": error}), 500

    # Enrich events for frontend
    enriched_events = []
    for event in events:
        cal_id = event.get("_calendar_id")
        # Map fields for frontend
        event["calendarId"] = cal_id
        event["calendarSummary"] = event.get("_calendar_name")
        event["calendarColor"] = calendar_colors.get(cal_id)
        enriched_events.append(event)

    enriched_events = []
    for event in events:
        cal_id = event.get("_calendar_id")
        # Map fields for frontend
        event["calendarId"] = cal_id
        event["calendarSummary"] = event.get("_calendar_name")
        event["calendarColor"] = calendar_colors.get(cal_id)
        enriched_events.append(event)

    return jsonify(enriched_events)


@adapter_bp.route("/google-calendar/events", methods=["POST"])
def create_google_event():
    from dashboard import gcal

    data = request.json
    calendar_id = data.get("calendarId")
    if not calendar_id:
        return jsonify({"error": "Missing calendarId"}), 400

    # Construct "local_event" format expected by gcal.upsert_gcal_event
    local_event = {
        "title": data.get("title"),
        "date": data.get("date"),  # ISO string
        "raw_text": data.get("description", ""),
        # Additional parsing might be needed if date processing is complex
    }

    service = gcal.get_calendar_service()
    if not service:
        return jsonify({"error": "Not authenticated"}), 401

    # We might need calendar metadata (timezone)
    config = gcal.load_gcal_config()
    calendars, _ = gcal.fetch_calendar_list()
    cal_meta = next((c for c in calendars if c["id"] == calendar_id), {})
    timezone = cal_meta.get("timeZone", "UTC")

    # We need to adapt the payload because upsert_gcal_event expects
    # a "local_event" structure which is DB-centric.
    # Alternatively, we can just call service directly here for simplicity if gcal.py is too coupled to DB.
    # However, let's try to reuse or adapt.
    # gcal.upsert_gcal_event calls build_gcal_event_payload

    # Let's do a direct insert to avoid DB coupling complexity for now
    # Or cleaner: update gcal.py to expose a clean insert function.
    # For speed, I'll implement a direct service call here mimicking gcal logic.

    try:
        from datetime import datetime, timedelta

        start_dt = datetime.fromisoformat(data["date"].replace("Z", "+00:00"))
        if data.get("allDay"):
            end_dt = (
                datetime.fromisoformat(data.get("endDate").replace("Z", "+00:00"))
                if data.get("endDate")
                else start_dt + timedelta(days=1)
            )
            start = {"date": start_dt.date().isoformat()}
            end = {"date": end_dt.date().isoformat()}
        else:
            end_dt = (
                datetime.fromisoformat(data.get("endDate").replace("Z", "+00:00"))
                if data.get("endDate")
                else start_dt + timedelta(hours=1)
            )
            start = {"dateTime": start_dt.isoformat(), "timeZone": timezone}
            end = {"dateTime": end_dt.isoformat(), "timeZone": timezone}

        body = {
            "summary": data.get("title", "Untitled"),
            "start": start,
            "end": end,
            "description": data.get("description", ""),
        }

        # Recurrence
        if data.get("recurrence"):
            # Ensure it's a list
            rrules = data["recurrence"]
            if isinstance(rrules, str):
                rrules = [rrules]
            body["recurrence"] = rrules

        event = service.events().insert(calendarId=calendar_id, body=body).execute()
        return jsonify(event)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/google-calendar/events/<event_id>", methods=["PATCH"])
@adapter_bp.route("/google-calendar/events/<event_id>", methods=["PATCH"])
def update_google_event(event_id):
    from dashboard import gcal

    data = request.json
    calendar_id = data.get("calendarId")
    if not calendar_id:
        return jsonify({"error": "Missing calendarId"}), 400

    service = gcal.get_calendar_service()
    if not service:
        return jsonify({"error": "Not authenticated"}), 401

    try:
        # 1. Verify Access Role
        calendars, _ = gcal.fetch_calendar_list()
        target_cal = next((c for c in calendars if c["id"] == calendar_id), None)

        if not target_cal:
            # If not found in list, we might not have access or it's hidden
            # Try to proceed? Or fail safe?
            # Let's try to fetch it specifically if missing, or assume we can't write if we can't see it.
            # Strict permission check:
            pass
        else:
            role = target_cal.get("accessRole", "reader")
            if role not in ["owner", "writer"]:
                return jsonify(
                    {
                        "error": f"Permission denied: You have '{role}' access to this calendar."
                    }
                ), 403

        # 2. Fetch existing event (Crucial for patches to minimal fields)
        try:
            existing_event = (
                service.events().get(calendarId=calendar_id, eventId=event_id).execute()
            )
        except Exception as e:
            return jsonify({"error": f"Event not found: {str(e)}"}), 404

        # 3. Prepare Update Body
        body = {}

        # Basic fields
        if "summary" in data:
            body["summary"] = data["summary"]
        elif "title" in data:
            body["summary"] = data["title"]

        if "description" in data:
            body["description"] = data["description"]

        if "location" in data:
            body["location"] = data["location"]

        # Recurrence
        if "recurrence" in data:
            rrules = data["recurrence"]
            if isinstance(rrules, str):
                rrules = [rrules]
            body["recurrence"] = rrules

        # Date Logic
        # Frontend might send 'start'/'end' objects OR 'date'/'startDate' strings.
        # We prioritize 'start'/'end' objects if valid.

        if "start" in data and isinstance(data["start"], dict):
            body["start"] = data["start"]

        if "end" in data and isinstance(data["end"], dict):
            body["end"] = data["end"]

        # Fallback: Constructed date logic if objects missing but flat fields present
        # (This matches the Agent task description "If allDay or date has no T...")
        if "start" not in body and ("date" in data or "allDay" in data):
            is_all_day = data.get("allDay", False)
            date_val = data.get("date")
            end_date_val = data.get("endDate")

            if not date_val:
                # Keep existing start if not updating date?
                # If we are here, we probably aren't updating date.
                pass
            else:
                if is_all_day or "T" not in date_val:
                    # All Day
                    start_d = date_val.split("T")[0]
                    if end_date_val:
                        end_d = end_date_val.split("T")[0]
                    else:
                        # Default 1 day
                        from datetime import datetime, timedelta

                        dt = datetime.strptime(start_d, "%Y-%m-%d")
                        end_d = (dt + timedelta(days=1)).strftime("%Y-%m-%d")

                    body["start"] = {"date": start_d}
                    body["end"] = {"date": end_d}
                else:
                    # Timed
                    body["start"] = {"dateTime": date_val}
                    # If end missing, default
                    if end_date_val:
                        body["end"] = {"dateTime": end_date_val}
                    else:
                        # Fallback to existing end duration or +1h
                        # Easier: +1h
                        from datetime import datetime, timedelta

                        dt = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
                        end_dt = dt + timedelta(hours=1)
                        body["end"] = {"dateTime": end_dt.isoformat()}

        # 4. Patch
        updated_event = (
            service.events()
            .patch(calendarId=calendar_id, eventId=event_id, body=body)
            .execute()
        )

        return jsonify(updated_event)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/google-calendar/events/<event_id>", methods=["DELETE"])
def delete_google_event(event_id):
    from dashboard import gcal

    calendar_id = request.args.get("calendarId")
    if not calendar_id:
        return jsonify({"error": "Missing calendarId parameter"}), 400

    service = gcal.get_calendar_service()
    if not service:
        return jsonify({"error": "Not authenticated"}), 401

    try:
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/google-calendar/clear", methods=["POST"])
def clear_calendars():
    from dashboard import gcal

    data = request.json
    calendar_ids = data.get("calendarIds", [])

    if not calendar_ids:
        return jsonify({"error": "No calendarIds provided"}), 400

    service = gcal.get_calendar_service()
    if not service:
        return jsonify({"error": "Not authenticated"}), 401

    deleted_count = 0
    errors = []

    for cal_id in calendar_ids:
        try:
            # Fetch all events (singleEvents=False to get series parent, but 'delete' works on ID)
            # If we want to clear everything, iterating list is best.
            pageToken = None
            while True:
                events_res = (
                    service.events()
                    .list(calendarId=cal_id, pageToken=pageToken)
                    .execute()
                )
                items = events_res.get("items", [])

                for item in items:
                    try:
                        service.events().delete(
                            calendarId=cal_id, eventId=item["id"]
                        ).execute()
                        deleted_count += 1
                    except Exception as ex:
                        pass  # Best effort

                pageToken = events_res.get("nextPageToken")
                if not pageToken:
                    break
        except Exception as e:
            errors.append(f"{cal_id}: {str(e)}")

    return jsonify({"success": True, "deletedEvents": deleted_count, "errors": errors})


# ==============================================================================
# CALENDAR ASSISTANT (AI-powered)
# ==============================================================================


@adapter_bp.route("/calendar/assistant", methods=["POST"])
def calendar_assistant():
    """
    AI-powered calendar assistant endpoint.
    Uses the calendar_assistant module's run_calendar_assistant function.
    This is SEPARATE from brain_chat to avoid study session logging bleeding into calendar responses.
    """
    try:
        data = request.get_json() or {}
        message = data.get("message", "")

        if not message or not isinstance(message, str) or not message.strip():
            return jsonify({
                "response": "Please provide a message.",
                "success": False
            })

        # Import and run the calendar assistant
        from dashboard.calendar_assistant import run_calendar_assistant

        result = run_calendar_assistant(message.strip())

        return jsonify({
            "response": result.get("response", ""),
            "success": result.get("success", False),
            "error": result.get("error")
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "response": f"Calendar assistant error: {str(e)}",
            "success": False,
            "error": str(e)
        }), 500


@adapter_bp.route("/google-tasks", methods=["GET"])
def get_google_tasks():
    from dashboard import gcal

    task_lists, error = gcal.fetch_task_lists()
    if error:
        return jsonify({"error": error}), 500

    all_tasks = []

    # Iterate over ALL lists found
    for tl in task_lists:
        t_list, err = gcal.fetch_tasks_from_list(tl["id"])
        if err:
            continue  # specific list fail shouldn't crash all

        for t in t_list:
            t["listId"] = tl["id"]
            t["listTitle"] = tl["title"]
            all_tasks.append(t)

    # Include list metadata so frontend knows available lists
    # We can handle this by a separate endpoint or embedding it.
    # Frontend requirement: "Add list selector".
    # I'll embed `lists` in the response or trust frontend calls another endpoint?
    # Better: return { tasks: [...], lists: [...] } ?
    # Standard REST: GET /tasks returns tasks. GET /lists returns lists.
    # Current adapter structure returns array of tasks.
    # I'll stick to array of tasks. Frontend can deduce lists from the tasks or we add a separate endpoint /google-tasks/lists.
    # User didn't ask for /lists endpoint explicitly but "Add list selector" implies we need available lists.
    # I'll just return the tasks. Frontend can unique() the listIds or I'll add a /lists endpoint if needed.
    # Wait, if a list is empty, frontend won't know it exists.
    # I'll modify returning structure or add /lists endpoint. I'll add /google-tasks/lists.

    return jsonify(all_tasks)


@adapter_bp.route("/google-tasks/lists", methods=["GET"])
def get_google_task_lists():
    from dashboard import gcal

    task_lists, error = gcal.fetch_task_lists()
    if error:
        return jsonify({"error": error}), 500

    return jsonify(task_lists)


@adapter_bp.route("/google-tasks", methods=["POST"])
def create_google_task_endpoint():
    from dashboard import gcal

    data = request.json
    list_id = data.get("listId")
    if not list_id:
        return jsonify({"error": "Missing listId"}), 400

    # Construct body
    body = {
        "title": data.get("title"),
        "notes": data.get("notes"),
        "status": "completed" if data.get("completed") else "needsAction",
    }
    if data.get("due"):
        # due is date-only string RFC 3339 timestamp but API says: "DueDate (as an RFC 3339 timestamp) ... optional time portion is discarded".
        # We accept ISO string.
        body["due"] = data.get("due")

    result, error = gcal.create_google_task(list_id, body)
    if error:
        return jsonify({"error": error}), 500
    return jsonify(result)


@adapter_bp.route("/google-tasks/<task_id>", methods=["PATCH"])
def patch_google_task_endpoint(task_id):
    from dashboard import gcal

    data = request.json
    list_id = data.get("listId")
    if not list_id:
        return jsonify({"error": "Missing listId"}), 400

    body = {}
    if "title" in data:
        body["title"] = data["title"]
    if "notes" in data:
        body["notes"] = data["notes"]
    if "status" in data:
        body["status"] = data["status"]
    if "due" in data:
        body["due"] = data["due"]
    if "completed" in data:
        body["status"] = "completed" if data["completed"] else "needsAction"
        # If un-completing, we might need to clear 'completed' date field? API handles status logic.
        if not data["completed"]:
            body["completed"] = None

    result, error = gcal.patch_google_task(list_id, task_id, body)
    if error:
        return jsonify({"error": error}), 500
    return jsonify(result)


@adapter_bp.route("/google-tasks/<task_id>", methods=["DELETE"])
def delete_google_task_endpoint(task_id):
    from dashboard import gcal

    list_id = request.args.get("listId")
    if not list_id:
        return jsonify({"error": "Missing listId"}), 400

    success, error = gcal.delete_google_task(list_id, task_id)
    if not success:
        return jsonify({"error": error}), 500
    return jsonify({"success": True})


@adapter_bp.route("/google-tasks/<task_id>/move", methods=["POST"])
def move_google_task_endpoint(task_id):
    from dashboard import gcal

    data = request.json
    list_id = data.get("listId")
    dest_list_id = data.get("destinationListId")
    previous = data.get("previousTaskId")
    parent = data.get("parentTaskId")

    if not list_id:
        return jsonify({"error": "Missing listId"}), 400

    # Cross-list Move
    if dest_list_id and dest_list_id != list_id:
        # 1. Fetch source task
        # We assume we don't have full body here, need to fetch it?
        # Or frontend sends body? Frontend logic "reorder" might not send full body.
        # Safest is fetch.
        # But gcal helper fetch_tasks_from_list returns list.
        # I need `get_task`. I didn't add `get_task` helper.
        # I'll rely on frontend or add helper.
        # I'll assume frontend sends title/notes/status/due if resizing complexity.
        # For now, I'll attempt to fetch by filtering the list (slow) or modifying gcal.py.
        # I'll modify gcal.py? No, I'll iterate list.
        # Wait, I can just use `get_tasks_service` here directly if needed.
        service = gcal.get_tasks_service()
        if not service:
            return jsonify({"error": "Auth"}), 401

        try:
            task = service.tasks().get(tasklist=list_id, task=task_id).execute()
        except:
            return jsonify({"error": "Task not found"}), 404

        # 2. Insert into dest
        new_body = {
            "title": task.get("title"),
            "notes": task.get("notes"),
            "status": task.get("status"),
            "due": task.get("due"),
        }
        # Insert with previous/parent if supported? Insert supports 'previous' and 'parent' params!
        # insert(..., previous=previous, parent=parent)
        insert_kwargs = {"tasklist": dest_list_id, "body": new_body}
        if previous:
            insert_kwargs["previous"] = previous
        if parent:
            insert_kwargs["parent"] = parent

        try:
            new_task = service.tasks().insert(**insert_kwargs).execute()
            # 3. Delete from source
            service.tasks().delete(tasklist=list_id, task=task_id).execute()
            return jsonify(new_task)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # Same-list Reorder
    result, error = gcal.move_google_task(list_id, task_id, previous, parent)
    if error:
        return jsonify({"error": error}), 500
    return jsonify(result)


# ==============================================================================
# CALENDAR ASSISTANT (Copilot w/ Codex + Undo) - v9.3
# ==============================================================================


@adapter_bp.route("/calendar/assistant", methods=["POST"])
def calendar_assistant_endpoint():
    """
    Chat with Calendar Assistant using direct OpenAI API.
    Stateless, simple tool calling for calendar operations.
    """
    data = request.json
    messages = data.get("messages", [])

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    last_user_msg = messages[-1]["content"]

    try:
        # Import the simple calendar assistant module
        from dashboard.calendar_assistant import run_calendar_assistant

        # Run the calendar assistant
        result = run_calendar_assistant(last_user_msg)

        if result.get("success"):
            can_undo = False
            try:
                conn = get_connection()
                cur = conn.cursor()
                cur.execute(
                    "SELECT id FROM calendar_action_ledger ORDER BY id DESC LIMIT 1"
                )
                row = cur.fetchone()
                conn.close()
                can_undo = bool(row)
            except Exception:
                can_undo = False

            return jsonify(
                {
                    "response": result["response"],
                    "can_undo": can_undo,
                }
            )
        else:
            return jsonify({"error": result.get("error", "Unknown error")}), 500

    except ImportError as e:
        print(f"[Calendar Assistant] Import failed: {e}")
        return jsonify(
            {
                "response": "Calendar assistant is temporarily unavailable. Please try again.",
                "error": str(e),
            }
        ), 503
    except Exception as e:
        import traceback

        print(f"[Calendar Assistant] Error: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Assistant error: {str(e)}"}), 500


@adapter_bp.route("/calendar/assistant/undo", methods=["POST"])
def undo_calendar_action_endpoint():
    """Revert the last action in the ledger."""
    from brain.db_setup import get_connection
    from dashboard import gcal

    try:
        conn = get_connection()
        cur = conn.cursor()
        # Get last action
        cur.execute(
            "SELECT id, action_type, target_id, pre_state, post_state FROM calendar_action_ledger ORDER BY id DESC LIMIT 1"
        )
        row = cur.fetchone()

        if not row:
            conn.close()
            return jsonify({"error": "Nothing to undo"}), 400

        lid, action, tid, pre_json, post_json = row
        pre_state = json.loads(pre_json) if pre_json else None

        # Undo Logic
        if action == "create_event":
            # Inverse: Delete
            gcal.delete_event("primary", tid)

        elif action == "delete_event":
            # Inverse: Re-create (using pre_state)
            if pre_state:
                # Remove ID to let Google assign new one? Or reuse?
                # Insert ignores ID usually. Import might allow it.
                # Just insert as new.
                body = {
                    "summary": pre_state.get("summary"),
                    "description": pre_state.get("description"),
                    "start": pre_state.get("start"),
                    "end": pre_state.get("end"),
                }
                gcal.create_event("primary", body)

        elif action == "create_task":
            # Inverse: Delete (need list_id - stored? No. Need to parse from pre/post or store list_id in ledger?)
            # I didn't store list_id in ledger column specifically.
            # But post_state might have it? (Not standard Google Task resource field?)
            # Actually, Google Task resource doesn't always have 'listId'.
            # Fail: I need list_id to delete.
            # Assume I can find it or I should have stored context in description or separate col.
            # For now, simplistic undo might fail for tasks if list_id missing.
            # I'll try to find it from post_state json if I enriched it?
            # In create_task above: I did NOT enrich post_state with listId.
            # FIXME: Storing 'selfLink' might help?
            pass  # TODO: Fix Task Undo context

        elif action == "delete_task":
            # Inverse: Re-create
            pass

        # Delete ledger entry
        cur.execute("DELETE FROM calendar_action_ledger WHERE id = ?", (lid,))
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": f"Undid {action}"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# NOTES (Quick Notes / Scratchpad)
# ==============================================================================

def _ensure_quick_notes_schema(conn):
    """Ensure quick_notes has required columns (note_type)."""
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(quick_notes)")
        cols = {row[1] for row in cur.fetchall()}
        if "note_type" not in cols:
            cur.execute("ALTER TABLE quick_notes ADD COLUMN note_type TEXT DEFAULT 'notes'")
            cur.execute("UPDATE quick_notes SET note_type = COALESCE(note_type, 'notes')")
            conn.commit()
    except Exception:
        # Fail silently to avoid breaking read paths; caller handles missing fields.
        pass


@adapter_bp.route("/notes", methods=["GET"])
def get_notes():
    """Get all quick notes."""
    try:
        conn = get_connection()
        _ensure_quick_notes_schema(conn)
        cur = conn.cursor()
        cur.execute(
            "SELECT id, title, content, note_type, position, created_at, updated_at FROM quick_notes ORDER BY note_type, position ASC, created_at DESC"
        )
        rows = cur.fetchall()

        notes = []
        for r in rows:
            notes.append(
                {
                    "id": r[0],
                    "title": r[1],
                    "content": r[2],
                    "noteType": r[3] or "notes",
                    "position": r[4],
                    "createdAt": r[5],
                    "updatedAt": r[6],
                }
            )

        conn.close()
        return jsonify(notes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/notes", methods=["POST"])
def create_note():
    """Create a new note."""
    data = request.json
    from datetime import datetime

    try:
        conn = get_connection()
        _ensure_quick_notes_schema(conn)
        cur = conn.cursor()
        now = datetime.now().isoformat()
        note_type = (data.get("noteType") or data.get("note_type") or "notes").strip().lower()
        if not note_type:
            note_type = "notes"

        # Get max position
        cur.execute("SELECT MAX(position) FROM quick_notes WHERE note_type = ?", (note_type,))
        max_pos = cur.fetchone()[0] or 0

        cur.execute(
            """
            INSERT INTO quick_notes (title, content, note_type, position, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (data.get("title", ""), data.get("content", ""), note_type, max_pos + 1, now, now),
        )

        new_id = cur.lastrowid
        conn.commit()
        conn.close()

        return jsonify(
            {
                "id": new_id,
                "title": data.get("title", ""),
                "content": data.get("content", ""),
                "noteType": note_type,
                "position": max_pos + 1,
                "createdAt": now,
                "updatedAt": now,
            }
        ), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/notes/<int:note_id>", methods=["PATCH"])
def update_note(note_id):
    """Update a note."""
    data = request.json
    from datetime import datetime

    try:
        conn = get_connection()
        _ensure_quick_notes_schema(conn)
        cur = conn.cursor()

        fields = ["updated_at = ?"]
        values = [datetime.now().isoformat()]

        if "title" in data:
            fields.append("title = ?")
            values.append(data["title"])
        if "content" in data:
            fields.append("content = ?")
            values.append(data["content"])
        if "noteType" in data or "note_type" in data:
            fields.append("note_type = ?")
            values.append(data.get("noteType") or data.get("note_type"))
        if "position" in data:
            fields.append("position = ?")
            values.append(data["position"])

        values.append(note_id)

        cur.execute(
            f"UPDATE quick_notes SET {', '.join(fields)} WHERE id = ?", tuple(values)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/notes/<int:note_id>", methods=["DELETE"])
def delete_note(note_id):
    """Delete a note."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM quick_notes WHERE id = ?", (note_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/notes/reorder", methods=["POST"])
def reorder_notes():
    """Update positions for a batch of notes."""
    # Expects { "notes": [ {id: 1, position: 0}, ... ] } or "updates"
    data = request.json
    try:
        conn = get_connection()
        _ensure_quick_notes_schema(conn)
        cur = conn.cursor()

        items = data.get("notes", []) or data.get("updates", [])
        if not items:
            note_ids = data.get("noteIds", []) or []
            items = [{"id": note_id, "position": idx} for idx, note_id in enumerate(note_ids)]
        for item in items:
            note_type = item.get("noteType") or item.get("note_type")
            if note_type is not None:
                cur.execute(
                    "UPDATE quick_notes SET position = ?, note_type = ? WHERE id = ?",
                    (item["position"], note_type, item["id"]),
                )
            else:
                cur.execute(
                    "UPDATE quick_notes SET position = ? WHERE id = ?",
                    (item["position"], item["id"]),
                )

        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# CHAT HISTORY
# ==============================================================================


@adapter_bp.route("/chat/<session_id>", methods=["GET"])
def get_chat_history(session_id):
    """Get chat history for a tutor session."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Simple retrieval from tutor_turns
        cur.execute(
            """
            SELECT turn_number, question, answer, citations_json, created_at 
            FROM tutor_turns 
            WHERE session_id = ? 
            ORDER BY turn_number ASC
        """,
            (session_id,),
        )

        rows = cur.fetchall()
        history = []
        for r in rows:
            history.append({"role": "user", "content": r[1], "timestamp": r[4]})
            history.append(
                {
                    "role": "assistant",
                    "content": r[2],
                    "citations": json.loads(r[3]) if r[3] else [],
                    "timestamp": r[4],
                }
            )

        conn.close()
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================================================================
# COURSES (Study Wheel Support)
# ==============================================================================


@adapter_bp.route("/courses", methods=["GET"])
def get_courses():
    """Get all courses for the study wheel ordered by position."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Ensure courses table exists with correct schema
        cur.execute("""
            CREATE TABLE IF NOT EXISTS wheel_courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                position INTEGER DEFAULT 0,
                total_sessions INTEGER DEFAULT 0,
                total_minutes INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Track if wheel has been initialized (prevents re-seeding after user clears it)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS wheel_config (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        conn.commit()

        # Query wheel_courses table ordered by position
        cur.execute("""
            SELECT id, name, active, position, total_sessions, total_minutes, created_at 
            FROM wheel_courses 
            WHERE active = 1
            ORDER BY position ASC
        """)
        rows = cur.fetchall()
        
        courses = []
        for r in rows:
            courses.append({
                "id": r[0],
                "name": r[1],
                "active": bool(r[2]),
                "position": r[3],
                "totalSessions": r[4] or 0,
                "totalMinutes": r[5] or 0,
                "createdAt": r[6] or datetime.now().isoformat(),
            })
        
        conn.close()
        return jsonify(courses)
    except Exception as e:
        print(f"[GET COURSES] ERROR: {str(e)}")
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/courses/active", methods=["GET"])
def get_active_courses():
    """Get active courses only. Same as /courses since we filter by active."""
    return get_courses()


@adapter_bp.route("/courses", methods=["POST"])
def create_course():
    """Create a new course for the study wheel."""
    try:
        data = request.get_json()
        name = data.get("name", "New Course")
        active = data.get("active", True)
        position = data.get("position", 0)

        conn = get_connection()
        cur = conn.cursor()

        # Ensure wheel_courses table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS wheel_courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                position INTEGER DEFAULT 0,
                total_sessions INTEGER DEFAULT 0,
                total_minutes INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cur.execute("""
            INSERT INTO wheel_courses (name, active, position, total_sessions, total_minutes, created_at)
            VALUES (?, ?, ?, 0, 0, ?)
        """, (name, 1 if active else 0, position, datetime.now().isoformat()))

        course_id = cur.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            "id": course_id,
            "name": name,
            "active": active,
            "position": position,
            "totalSessions": 0,
            "totalMinutes": 0,
            "createdAt": datetime.now().isoformat(),
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/courses/<int:course_id>", methods=["PATCH"])
def update_course(course_id):
    """Update a course."""
    try:
        data = request.get_json()
        conn = get_connection()
        cur = conn.cursor()
        
        updates = []
        params = []
        if "name" in data:
            updates.append("name = ?")
            params.append(data["name"])
        if "active" in data:
            updates.append("active = ?")
            params.append(1 if data["active"] else 0)
        if "position" in data:
            updates.append("position = ?")
            params.append(data["position"])
        
        if updates:
            params.append(course_id)
            cur.execute(f"UPDATE wheel_courses SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()
        
        # Return updated course
        cur.execute("SELECT id, name, active, position, total_sessions, total_minutes, created_at FROM wheel_courses WHERE id = ?", (course_id,))
        r = cur.fetchone()
        conn.close()
        
        if r:
            return jsonify({
                "id": r[0],
                "name": r[1],
                "active": bool(r[2]),
                "position": r[3],
                "totalSessions": r[4] or 0,
                "totalMinutes": r[5] or 0,
                "createdAt": r[6],
            })
        return jsonify({"error": "Course not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/courses/<int:course_id>", methods=["DELETE"])
def delete_course(course_id):
    """Delete a course from the study wheel."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        print(f"[DELETE] Attempting to delete course ID: {course_id}")
        
        # First check if course exists
        cur.execute("SELECT id, name, position FROM wheel_courses WHERE id = ?", (course_id,))
        row = cur.fetchone()
        
        if not row:
            print(f"[DELETE] Course ID {course_id} NOT FOUND in wheel_courses!")
            conn.close()
            return jsonify({"error": f"Course {course_id} not found"}), 404
        
        print(f"[DELETE] Found course: id={row[0]}, name={row[1]}, position={row[2]}")
        deleted_position = row[2]
        
        # Delete the course
        cur.execute("DELETE FROM wheel_courses WHERE id = ?", (course_id,))
        deleted_count = cur.rowcount
        print(f"[DELETE] Rows deleted: {deleted_count}")
        
        # Shift all courses with higher positions down
        cur.execute("UPDATE wheel_courses SET position = position - 1 WHERE position > ?", (deleted_position,))
        shifted_count = cur.rowcount
        print(f"[DELETE] Rows shifted: {shifted_count}")
        
        conn.commit()
        print(f"[DELETE] Commit successful for course ID: {course_id}")
        
        # Verify deletion
        cur.execute("SELECT id FROM wheel_courses WHERE id = ?", (course_id,))
        still_exists = cur.fetchone()
        if still_exists:
            print(f"[DELETE] WARNING: Course {course_id} STILL EXISTS after delete!")
        else:
            print(f"[DELETE] Verified: Course {course_id} successfully deleted")
        
        conn.close()
        return "", 204
    except Exception as e:
        print(f"[DELETE] ERROR: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# MODULES
# ==============================================================================


def serialize_module_row(row):
    return {
        "id": row["id"],
        "courseId": row["course_id"],
        "name": row["name"],
        "orderIndex": row["order_index"] or 0,
        "filesDownloaded": bool(row["files_downloaded"]),
        "notebooklmLoaded": bool(row["notebooklm_loaded"]),
        "sources": row["sources"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"] or row["created_at"],
    }


@adapter_bp.route("/modules", methods=["GET"])
def get_modules():
    course_id = request.args.get("courseId", type=int)
    if not course_id:
        return jsonify({"error": "courseId query param required"}), 400
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, course_id, name, order_index, files_downloaded, notebooklm_loaded, sources, created_at, updated_at
            FROM modules WHERE course_id = ?
            ORDER BY order_index ASC
        """,
            (course_id,),
        )
        rows = cur.fetchall()
        conn.close()
        return jsonify([serialize_module_row(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/modules/<int:module_id>", methods=["GET"])
def get_module(module_id):
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, course_id, name, order_index, files_downloaded, notebooklm_loaded, sources, created_at, updated_at
            FROM modules WHERE id = ?
        """,
            (module_id,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return jsonify({"error": "Module not found"}), 404
        return jsonify(serialize_module_row(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/modules", methods=["POST"])
def create_module():
    data = request.get_json() or {}
    course_id = data.get("courseId")
    name = data.get("name")
    if not course_id or not name:
        return jsonify({"error": "courseId and name are required"}), 400
    order_index = data.get("orderIndex")
    files_downloaded = 1 if data.get("filesDownloaded") else 0
    notebooklm_loaded = 1 if data.get("notebooklmLoaded") else 0
    sources = data.get("sources")

    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        if order_index is None:
            cur.execute(
                "SELECT COALESCE(MAX(order_index), -1) FROM modules WHERE course_id = ?",
                (course_id,),
            )
            order_index = (cur.fetchone()[0] or -1) + 1
        now = datetime.now().isoformat()
        cur.execute(
            """
            INSERT INTO modules (course_id, name, order_index, files_downloaded, notebooklm_loaded, sources, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                course_id,
                name,
                order_index,
                files_downloaded,
                notebooklm_loaded,
                sources,
                now,
                now,
            ),
        )
        conn.commit()
        module_id = cur.lastrowid
        cur.execute(
            """
            SELECT id, course_id, name, order_index, files_downloaded, notebooklm_loaded, sources, created_at, updated_at
            FROM modules WHERE id = ?
        """,
            (module_id,),
        )
        row = cur.fetchone()
        conn.close()
        return jsonify(serialize_module_row(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/modules/bulk", methods=["POST"])
def bulk_create_modules():
    data = request.get_json() or {}
    course_id = data.get("courseId")
    modules_data = data.get("modules", [])
    if not course_id or not isinstance(modules_data, list):
        return jsonify({"error": "courseId and modules array required"}), 400

    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        now = datetime.now().isoformat()
        created = []
        for idx, m in enumerate(modules_data):
            name = m.get("name")
            if not name:
                continue
            files_downloaded = 1 if m.get("filesDownloaded") else 0
            notebooklm_loaded = 1 if m.get("notebooklmLoaded") else 0
            sources = m.get("sources")
            order_index = m.get("orderIndex", idx)
            cur.execute(
                """
                INSERT INTO modules (course_id, name, order_index, files_downloaded, notebooklm_loaded, sources, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    course_id,
                    name,
                    order_index,
                    files_downloaded,
                    notebooklm_loaded,
                    sources,
                    now,
                    now,
                ),
            )
            created.append({
                "id": cur.lastrowid,
                "courseId": course_id,
                "name": name,
                "orderIndex": order_index,
                "filesDownloaded": bool(files_downloaded),
                "notebooklmLoaded": bool(notebooklm_loaded),
                "sources": sources,
                "createdAt": now,
                "updatedAt": now,
            })
        conn.commit()
        conn.close()
        return jsonify(created), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/modules/<int:module_id>", methods=["PATCH"])
def update_module(module_id):
    data = request.get_json() or {}
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        fields = []
        values = []
        if "name" in data:
            fields.append("name = ?")
            values.append(data["name"])
        if "orderIndex" in data:
            fields.append("order_index = ?")
            values.append(data["orderIndex"])
        if "filesDownloaded" in data:
            fields.append("files_downloaded = ?")
            values.append(1 if data["filesDownloaded"] else 0)
        if "notebooklmLoaded" in data:
            fields.append("notebooklm_loaded = ?")
            values.append(1 if data["notebooklmLoaded"] else 0)
        if "sources" in data:
            fields.append("sources = ?")
            values.append(data["sources"])

        fields.append("updated_at = ?")
        values.append(datetime.now().isoformat())

        values.append(module_id)
        cur.execute(
            f"UPDATE modules SET {', '.join(fields)} WHERE id = ?", values
        )
        conn.commit()
        cur.execute(
            """
            SELECT id, course_id, name, order_index, files_downloaded, notebooklm_loaded, sources, created_at, updated_at
            FROM modules WHERE id = ?
        """,
            (module_id,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return jsonify({"error": "Module not found"}), 404
        return jsonify(serialize_module_row(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/modules/<int:module_id>", methods=["DELETE"])
def delete_module(module_id):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM modules WHERE id = ?", (module_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# LEARNING OBJECTIVES
# ==============================================================================


def serialize_learning_objective_row(row):
    return {
        "id": row["id"],
        "courseId": row["course_id"],
        "moduleId": row["module_id"],
        "loCode": row["lo_code"],
        "title": row["title"],
        "status": row["status"],
        "lastSessionId": row["last_session_id"],
        "lastSessionDate": row["last_session_date"],
        "nextAction": row["next_action"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"] or row["created_at"],
    }


@adapter_bp.route("/learning-objectives", methods=["GET"])
def get_learning_objectives():
    course_id = request.args.get("courseId", type=int)
    module_id = request.args.get("moduleId", type=int)
    if not course_id and not module_id:
        return jsonify({"error": "courseId or moduleId query param required"}), 400
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        if course_id:
            cur.execute(
                """
                SELECT id, course_id, module_id, lo_code, title, status, last_session_id, last_session_date, next_action, created_at, updated_at
                FROM learning_objectives WHERE course_id = ?
                ORDER BY lo_code ASC
            """,
                (course_id,),
            )
        else:
            cur.execute(
                """
                SELECT id, course_id, module_id, lo_code, title, status, last_session_id, last_session_date, next_action, created_at, updated_at
                FROM learning_objectives WHERE module_id = ?
                ORDER BY lo_code ASC
            """,
                (module_id,),
            )
        rows = cur.fetchall()
        conn.close()
        return jsonify([serialize_learning_objective_row(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/learning-objectives/<int:lo_id>", methods=["GET"])
def get_learning_objective(lo_id):
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, course_id, module_id, lo_code, title, status, last_session_id, last_session_date, next_action, created_at, updated_at
            FROM learning_objectives WHERE id = ?
        """,
            (lo_id,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return jsonify({"error": "Learning objective not found"}), 404
        return jsonify(serialize_learning_objective_row(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/learning-objectives", methods=["POST"])
def create_learning_objective():
    data = request.get_json() or {}
    course_id = data.get("courseId")
    title = data.get("title")
    if not course_id or not title:
        return jsonify({"error": "courseId and title are required"}), 400
    module_id = data.get("moduleId")
    lo_code = data.get("loCode")
    status = data.get("status") or "not_started"
    next_action = data.get("nextAction")
    last_session_id = data.get("lastSessionId")
    last_session_date = data.get("lastSessionDate")

    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        now = datetime.now().isoformat()
        cur.execute(
            """
            INSERT INTO learning_objectives (
                course_id, module_id, lo_code, title, status,
                last_session_id, last_session_date, next_action,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                course_id,
                module_id,
                lo_code,
                title,
                status,
                last_session_id,
                last_session_date,
                next_action,
                now,
                now,
            ),
        )
        conn.commit()
        lo_id = cur.lastrowid
        cur.execute(
            """
            SELECT id, course_id, module_id, lo_code, title, status, last_session_id, last_session_date, next_action, created_at, updated_at
            FROM learning_objectives WHERE id = ?
        """,
            (lo_id,),
        )
        row = cur.fetchone()
        conn.close()
        return jsonify(serialize_learning_objective_row(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/learning-objectives/bulk", methods=["POST"])
def bulk_create_learning_objectives():
    data = request.get_json() or {}
    course_id = data.get("courseId")
    module_id = data.get("moduleId")
    los = data.get("los", [])
    if not course_id or not isinstance(los, list):
        return jsonify({"error": "courseId and los array required"}), 400

    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        now = datetime.now().isoformat()
        created = []
        for lo in los:
            title = lo.get("title")
            if not title:
                continue
            lo_code = lo.get("loCode")
            status = lo.get("status") or "not_started"
            cur.execute(
                """
                INSERT INTO learning_objectives (
                    course_id, module_id, lo_code, title, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    course_id,
                    module_id,
                    lo_code,
                    title,
                    status,
                    now,
                    now,
                ),
            )
            created.append({
                "id": cur.lastrowid,
                "courseId": course_id,
                "moduleId": module_id,
                "loCode": lo_code,
                "title": title,
                "status": status,
                "lastSessionId": None,
                "lastSessionDate": None,
                "nextAction": None,
                "createdAt": now,
                "updatedAt": now,
            })
        conn.commit()
        conn.close()
        return jsonify(created), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/learning-objectives/<int:lo_id>", methods=["PATCH"])
def update_learning_objective(lo_id):
    data = request.get_json() or {}
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        fields = []
        values = []
        if "loCode" in data:
            fields.append("lo_code = ?")
            values.append(data["loCode"])
        if "title" in data:
            fields.append("title = ?")
            values.append(data["title"])
        if "status" in data:
            fields.append("status = ?")
            values.append(data["status"])
        if "moduleId" in data:
            fields.append("module_id = ?")
            values.append(data["moduleId"])
        if "lastSessionId" in data:
            fields.append("last_session_id = ?")
            values.append(data["lastSessionId"])
        if "lastSessionDate" in data:
            fields.append("last_session_date = ?")
            values.append(data["lastSessionDate"])
        if "nextAction" in data:
            fields.append("next_action = ?")
            values.append(data["nextAction"])

        fields.append("updated_at = ?")
        values.append(datetime.now().isoformat())

        values.append(lo_id)
        cur.execute(
            f"UPDATE learning_objectives SET {', '.join(fields)} WHERE id = ?", values
        )
        conn.commit()
        cur.execute(
            """
            SELECT id, course_id, module_id, lo_code, title, status, last_session_id, last_session_date, next_action, created_at, updated_at
            FROM learning_objectives WHERE id = ?
        """,
            (lo_id,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return jsonify({"error": "Learning objective not found"}), 404
        return jsonify(serialize_learning_objective_row(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/learning-objectives/<int:lo_id>", methods=["DELETE"])
def delete_learning_objective(lo_id):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM learning_objectives WHERE id = ?", (lo_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# LO SESSIONS
# ==============================================================================


@adapter_bp.route("/lo-sessions", methods=["POST"])
def create_lo_session():
    data = request.get_json() or {}
    lo_id = data.get("loId")
    session_id = data.get("sessionId")
    if not lo_id or not session_id:
        return jsonify({"error": "loId and sessionId are required"}), 400
    status_before = data.get("statusBefore")
    status_after = data.get("statusAfter")
    notes = data.get("notes")

    try:
        conn = get_connection()
        cur = conn.cursor()
        now = datetime.now().isoformat()
        cur.execute(
            """
            INSERT INTO lo_sessions (lo_id, session_id, status_before, status_after, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (lo_id, session_id, status_before, status_after, notes, now),
        )
        conn.commit()
        lo_session_id = cur.lastrowid
        conn.close()
        return jsonify({
            "id": lo_session_id,
            "loId": lo_id,
            "sessionId": session_id,
            "statusBefore": status_before,
            "statusAfter": status_after,
            "notes": notes,
            "createdAt": now,
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# STUDY WHEEL
# ==============================================================================


@adapter_bp.route("/study-wheel/current", methods=["GET"])
def get_current_course():
    """Get the current course in the study wheel rotation (position 0)."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Ensure wheel_courses table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS wheel_courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                position INTEGER DEFAULT 0,
                total_sessions INTEGER DEFAULT 0,
                total_minutes INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

        # Get the course at position 0 (top of wheel)
        cur.execute("""
            SELECT id, name, active, position, total_sessions, total_minutes, created_at 
            FROM wheel_courses 
            WHERE active = 1
            ORDER BY position ASC
            LIMIT 1
        """)
        r = cur.fetchone()
        conn.close()

        if r:
            return jsonify({
                "currentCourse": {
                    "id": r[0],
                    "name": r[1],
                    "active": bool(r[2]),
                    "position": r[3],
                    "totalSessions": r[4] or 0,
                    "totalMinutes": r[5] or 0,
                    "createdAt": r[6],
                }
            })
        return jsonify({"currentCourse": None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/study-wheel/complete-session", methods=["POST"])
def complete_wheel_session():
    """Complete a session and rotate the wheel - move completed course to bottom."""
    try:
        data = request.get_json()
        course_id = data.get("courseId")
        minutes = data.get("minutes", 0)
        try:
            minutes = int(minutes)
        except (TypeError, ValueError):
            minutes = 0
        mode = data.get("mode") or "Core"
        mode = str(mode).title()

        conn = get_connection()
        cur = conn.cursor()

        # Get the current course (should be at position 0)
        cur.execute("""
            SELECT id, name, position FROM wheel_courses WHERE id = ?
        """, (course_id,))
        current = cur.fetchone()

        if not current:
            conn.close()
            return jsonify({"error": "Course not found"}), 404

        course_name = current[1]

        # Create session record
        cur.execute("""
            INSERT INTO sessions (
                session_date,
                session_time,
                main_topic,
                topic,
                study_mode,
                time_spent_minutes,
                duration_minutes,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.now().strftime("%Y-%m-%d"),
            datetime.now().strftime("%H:%M"),
            course_name,
            course_name,
            mode,
            minutes,
            minutes,
            datetime.now().isoformat()
        ))
        session_id = cur.lastrowid

        # Update the course's session count and minutes
        cur.execute("""
            UPDATE wheel_courses 
            SET total_sessions = total_sessions + 1, 
                total_minutes = total_minutes + ?
            WHERE id = ?
        """, (minutes, course_id))

        # ROTATE THE WHEEL: Move completed course to bottom, shift others up
        # Get max position
        cur.execute("SELECT MAX(position) FROM wheel_courses WHERE active = 1")
        max_pos = cur.fetchone()[0] or 0

        # Move all courses up by 1 position (except the current one)
        cur.execute("""
            UPDATE wheel_courses 
            SET position = position - 1 
            WHERE position > 0 AND id != ?
        """, (course_id,))

        # Move the completed course to the bottom
        cur.execute("""
            UPDATE wheel_courses 
            SET position = ? 
            WHERE id = ?
        """, (max_pos, course_id))

        conn.commit()

        # Get the new current course (now at position 0)
        cur.execute("""
            SELECT id, name, active, position, total_sessions, total_minutes, created_at 
            FROM wheel_courses 
            WHERE active = 1
            ORDER BY position ASC
            LIMIT 1
        """)
        r = cur.fetchone()

        next_course = None
        if r:
            next_course = {
                "id": r[0],
                "name": r[1],
                "active": bool(r[2]),
                "position": r[3],
                "totalSessions": r[4] or 0,
                "totalMinutes": r[5] or 0,
                "createdAt": r[6],
            }

        # Update streak
        update_streak(conn)
        conn.close()

        return jsonify({
            "session": {"id": session_id, "minutes": minutes},
            "nextCourse": next_course
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def update_streak(conn):
    """Update study streak after completing a session."""
    try:
        cur = conn.cursor()

        # Ensure streak table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS study_streak (
                id INTEGER PRIMARY KEY,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_study_date TEXT
            )
        """)

        today = datetime.now().strftime("%Y-%m-%d")

        cur.execute("SELECT current_streak, longest_streak, last_study_date FROM study_streak WHERE id = 1")
        streak = cur.fetchone()

        if not streak:
            cur.execute("INSERT INTO study_streak (id, current_streak, longest_streak, last_study_date) VALUES (1, 1, 1, ?)", (today,))
        else:
            current, longest, last_date = streak
            if last_date == today:
                pass  # Already studied today
            elif last_date == (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"):
                # Consecutive day
                new_streak = current + 1
                new_longest = max(longest, new_streak)
                cur.execute("UPDATE study_streak SET current_streak = ?, longest_streak = ?, last_study_date = ? WHERE id = 1",
                           (new_streak, new_longest, today))
            else:
                # Streak broken, start fresh
                cur.execute("UPDATE study_streak SET current_streak = 1, last_study_date = ? WHERE id = 1", (today,))

        conn.commit()
    except Exception:
        pass  # Don't fail the session for streak errors


# ==============================================================================
# STREAK
# ==============================================================================


@adapter_bp.route("/streak", methods=["GET"])
def get_streak():
    """Get current study streak."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='study_streak'")
        if not cur.fetchone():
            conn.close()
            return jsonify({"currentStreak": 0, "longestStreak": 0, "lastStudyDate": None})

        cur.execute("SELECT current_streak, longest_streak, last_study_date FROM study_streak WHERE id = 1")
        streak = cur.fetchone()
        conn.close()

        if streak:
            return jsonify({
                "currentStreak": streak[0] or 0,
                "longestStreak": streak[1] or 0,
                "lastStudyDate": streak[2]
            })

        return jsonify({"currentStreak": 0, "longestStreak": 0, "lastStudyDate": None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# WEAKNESS QUEUE
# ==============================================================================


@adapter_bp.route("/weakness-queue", methods=["GET"])
def get_weakness_queue():
    """Get flagged topics for review."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='weakness_queue'")
        if not cur.fetchone():
            # Create table if missing
            cur.execute("""
                CREATE TABLE IF NOT EXISTS weakness_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic TEXT NOT NULL,
                    course_id INTEGER,
                    reason TEXT,
                    flagged_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            conn.close()
            return jsonify([])

        cur.execute("SELECT id, topic, reason FROM weakness_queue ORDER BY flagged_at DESC LIMIT 10")
        rows = cur.fetchall()
        conn.close()

        return jsonify([{"id": r[0], "topic": r[1], "reason": r[2]} for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# SESSIONS TODAY
# ==============================================================================


@adapter_bp.route("/sessions/today", methods=["GET"])
def get_sessions_today():
    """Get sessions from today."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        today = datetime.now().strftime("%Y-%m-%d")
        cur.execute("""
            SELECT
                id,
                session_date,
                session_time,
                main_topic,
                topic,
                study_mode,
                time_spent_minutes,
                duration_minutes,
                anki_cards_count,
                notes_insights,
                weak_anchors,
                source_lock,
                confusions,
                concepts,
                issues,
                errors_conceptual,
                gaps_identified,
                subtopics,
                what_needs_fixing,
                created_at
            FROM sessions WHERE session_date = ?
            ORDER BY session_time DESC
        """, (today,))

        rows = cur.fetchall()
        conn.close()

        return jsonify([serialize_session_row(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# SESSION CONTEXT
# ==============================================================================


@adapter_bp.route("/sessions/last-context", methods=["GET"])
def get_last_session_context():
    """Return last session + course + recent LOs for a course (optional)."""
    course_id = request.args.get("courseId", type=int)
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        course = None
        course_name = None
        if course_id:
            cur.execute(
                """
                SELECT id, name, active, position, total_sessions, total_minutes, created_at
                FROM wheel_courses WHERE id = ?
            """,
                (course_id,),
            )
            course_row = cur.fetchone()
            if course_row:
                course = {
                    "id": course_row["id"],
                    "name": course_row["name"],
                    "active": bool(course_row["active"]),
                    "position": course_row["position"],
                    "totalSessions": course_row["total_sessions"] or 0,
                    "totalMinutes": course_row["total_minutes"] or 0,
                    "createdAt": course_row["created_at"],
                }
                course_name = course_row["name"]

        if course_name:
            cur.execute(
                """
                SELECT
                    id,
                    session_date,
                    session_time,
                    main_topic,
                    topic,
                    study_mode,
                    time_spent_minutes,
                    duration_minutes,
                    anki_cards_count,
                    notes_insights,
                    weak_anchors,
                    source_lock,
                    confusions,
                    concepts,
                    issues,
                    errors_conceptual,
                    gaps_identified,
                    subtopics,
                    what_needs_fixing,
                    created_at
                FROM sessions
                WHERE main_topic = ? OR topic = ?
                ORDER BY session_date DESC, session_time DESC
                LIMIT 1
            """,
                (course_name, course_name),
            )
        else:
            cur.execute(
                """
                SELECT
                    id,
                    session_date,
                    session_time,
                    main_topic,
                    topic,
                    study_mode,
                    time_spent_minutes,
                    duration_minutes,
                    anki_cards_count,
                    notes_insights,
                    weak_anchors,
                    source_lock,
                    confusions,
                    concepts,
                    issues,
                    errors_conceptual,
                    gaps_identified,
                    subtopics,
                    what_needs_fixing,
                    created_at
                FROM sessions
                ORDER BY session_date DESC, session_time DESC
                LIMIT 1
            """
            )

        session_row = cur.fetchone()
        last_session = serialize_session_row(session_row) if session_row else None

        if not course and session_row:
            session_course_name = session_row["main_topic"] or session_row["topic"]
            if session_course_name:
                cur.execute(
                    """
                    SELECT id, name, active, position, total_sessions, total_minutes, created_at
                    FROM wheel_courses
                    WHERE LOWER(name) = LOWER(?)
                    LIMIT 1
                """,
                    (session_course_name,),
                )
                course_row = cur.fetchone()
                if course_row:
                    course = {
                        "id": course_row["id"],
                        "name": course_row["name"],
                        "active": bool(course_row["active"]),
                        "position": course_row["position"],
                        "totalSessions": course_row["total_sessions"] or 0,
                        "totalMinutes": course_row["total_minutes"] or 0,
                        "createdAt": course_row["created_at"],
                    }
                    course_id = course_row["id"]

        recent_los = []
        if course_id:
            cur.execute(
                """
                SELECT id, course_id, module_id, lo_code, title, status, last_session_id, last_session_date, next_action, created_at, updated_at
                FROM learning_objectives
                WHERE course_id = ? AND status IN ('in_progress', 'need_review')
                ORDER BY last_session_date DESC
                LIMIT 5
            """,
                (course_id,),
            )
            lo_rows = cur.fetchall()
            recent_los = [serialize_learning_objective_row(r) for r in lo_rows]

        conn.close()

        return jsonify({
            "lastSession": last_session,
            "course": course,
            "recentLos": recent_los,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# BRAIN METRICS
# ==============================================================================


@adapter_bp.route("/brain/metrics", methods=["GET"])
def get_brain_metrics():
    """Get aggregated brain analytics metrics."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.execute(
            """
            SELECT
                session_date,
                session_time,
                main_topic,
                topic,
                study_mode,
                time_spent_minutes,
                duration_minutes,
                anki_cards_count,
                confusions,
                weak_anchors,
                concepts,
                issues,
                errors_conceptual,
                gaps_identified,
                subtopics,
                what_needs_fixing
            FROM sessions
        """
        )
        rows = cur.fetchall()
        conn.close()

        sessions_per_course_map = {}
        mode_map = {}
        confusions_map = {}
        weak_map = {}
        concept_map = {}
        issues_map = {}
        total_minutes = 0
        total_cards = 0

        for row in rows:
            course = row["main_topic"] or row["topic"] or "General"
            minutes = row["time_spent_minutes"]
            duration = row["duration_minutes"]
            if minutes in (None, "") or (minutes == 0 and duration not in (None, "", 0)):
                minutes = duration
            minutes = minutes or 0
            total_minutes += minutes
            total_cards += row["anki_cards_count"] or 0

            # Sessions per course
            if course not in sessions_per_course_map:
                sessions_per_course_map[course] = {"course": course, "count": 0, "minutes": 0}
            sessions_per_course_map[course]["count"] += 1
            sessions_per_course_map[course]["minutes"] += minutes

            # Mode distribution
            mode = row["study_mode"] or "study"
            if mode not in mode_map:
                mode_map[mode] = {"mode": mode, "count": 0, "minutes": 0}
            mode_map[mode]["count"] += 1
            mode_map[mode]["minutes"] += minutes

            # Confusions
            confusions_val = row["confusions"] or row["errors_conceptual"] or row["gaps_identified"]
            for item in parse_json_array(confusions_val):
                key = item.lower().strip()
                if not key:
                    continue
                if key in confusions_map:
                    confusions_map[key]["count"] += 1
                else:
                    confusions_map[key] = {"text": item, "count": 1, "course": course}

            # Weak anchors
            for item in parse_json_array(row["weak_anchors"]):
                key = item.lower().strip()
                if not key:
                    continue
                if key in weak_map:
                    weak_map[key]["count"] += 1
                else:
                    weak_map[key] = {"text": item, "count": 1, "course": course}

            # Concepts
            concepts_val = row["concepts"] or row["subtopics"]
            for item in parse_json_array(concepts_val):
                key = item.lower().strip()
                if not key:
                    continue
                concept_map[key] = concept_map.get(key, 0) + 1

            # Issues log
            issues_val = row["issues"] or row["what_needs_fixing"]
            for item in parse_json_array(issues_val):
                key = item.lower().strip()
                if not key:
                    continue
                if key in issues_map:
                    issues_map[key]["count"] += 1
                else:
                    issues_map[key] = {"issue": item, "count": 1, "course": course}

        sessions_per_course = sorted(
            sessions_per_course_map.values(), key=lambda x: x["count"], reverse=True
        )
        mode_dist = sorted(mode_map.values(), key=lambda x: x["count"], reverse=True)
        recent_confusions = sorted(confusions_map.values(), key=lambda x: x["count"], reverse=True)[:10]
        recent_weak = sorted(weak_map.values(), key=lambda x: x["count"], reverse=True)[:10]
        concept_frequency = sorted(
            [{"concept": k, "count": v} for k, v in concept_map.items()],
            key=lambda x: x["count"],
            reverse=True,
        )[:10]
        issues_log = sorted(issues_map.values(), key=lambda x: x["count"], reverse=True)[:10]

        return jsonify({
            "sessionsPerCourse": sessions_per_course,
            "modeDistribution": mode_dist,
            "recentConfusions": recent_confusions,
            "recentWeakAnchors": recent_weak,
            "conceptFrequency": concept_frequency,
            "issuesLog": issues_log,
            "totalMinutes": total_minutes,
            "totalSessions": len(rows),
            "totalCards": total_cards,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/brain/llm-status", methods=["GET"])
def get_llm_status():
    """Check whether an LLM API key is configured for chat endpoints."""
    try:
        config = load_api_config()
        api_provider = config.get("api_provider", "openrouter")
        if api_provider == "openai":
            api_key = config.get("openai_api_key", "")
        else:
            api_key = config.get("openrouter_api_key", "")
        model = config.get("model", "openrouter/auto")
        connected = bool(api_key)

        return jsonify({
            "connected": connected,
            "model": model,
            "status": "Connected" if connected else "Disconnected",
            "error": None if connected else "No API key configured",
        })
    except Exception as e:
        return jsonify({
            "connected": False,
            "model": "unknown",
            "status": "Error",
            "error": str(e),
        })


@adapter_bp.route("/brain/chat", methods=["POST"])
def brain_chat():
    """
    Intelligent study data processor.
    Takes raw study session input, uses LLM to organize into:
    - Anki cards → inserted into card_drafts table
    - Session metadata (strengths, weaknesses, what went well, issues)
    - Notes and insights
    """
    import json
    import re
    import os
    import traceback
    from datetime import datetime
    
    try:
        data = request.get_json() or {}
        message = data.get("message", "")
        mode = data.get("mode", "all")  # all, obsidian, anki, metrics

        # Import LLM provider using absolute path
        import sys
        brain_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if brain_dir not in sys.path:
            sys.path.insert(0, brain_dir)
        
        from llm_provider import call_llm
        from ingest_session import (
            insert_session,
            validate_session_data,
            _map_json_payload_to_session,
            _parse_json_payloads,
            _classify_json_payload,
            V93_SCHEMA_VERSION,
        )
        from wrap_parser import (
            is_wrap_format,
            parse_wrap,
            extract_obsidian_notes,
        )
        from obsidian_merge import merge_sections

        direct_payload = None
        direct_tracker = None
        direct_enhanced = None

        has_direct_payload = isinstance(data.get("payload"), dict) or isinstance(data.get("tracker"), dict) or isinstance(data.get("enhanced"), dict)
        if not has_direct_payload and isinstance(message, str) and message.strip() and is_wrap_format(message):
            wrap_data = parse_wrap(message)
            if wrap_data:
                now = datetime.now()
                metadata = wrap_data.get("metadata", {})
                section_d = wrap_data.get("section_d", {}) or {}
                merged_payload = section_d.get("merged") or {}
                tracker_payload = section_d.get("tracker") or {}
                enhanced_payload = section_d.get("enhanced") or {}

                session_data = _map_json_payload_to_session(merged_payload)

                def _safe_int(value, default=0):
                    try:
                        return int(float(value))
                    except (TypeError, ValueError):
                        return default

                session_date = metadata.get("date") or merged_payload.get("date") or now.strftime("%Y-%m-%d")
                session_time = now.strftime("%H:%M:%S")
                topic = metadata.get("topic") or merged_payload.get("topic") or metadata.get("course") or "General"
                study_mode = metadata.get("mode") or metadata.get("study_mode") or merged_payload.get("mode") or "Core"
                duration_minutes = _safe_int(
                    metadata.get("duration_min")
                    or metadata.get("duration_minutes")
                    or metadata.get("duration")
                    or merged_payload.get("duration_min")
                    or 0
                )

                session_data.setdefault("session_date", session_date)
                session_data.setdefault("session_time", session_time)
                session_data.setdefault("study_mode", str(study_mode).title())
                session_data.setdefault("main_topic", topic)
                session_data.setdefault("topic", topic)
                session_data.setdefault("duration_minutes", duration_minutes)
                session_data.setdefault("time_spent_minutes", duration_minutes)
                session_data.setdefault("source_lock", metadata.get("source_lock") or metadata.get("source_lock_active") or session_data.get("source_lock", ""))
                session_data.setdefault("notes_insights", (wrap_data.get("section_a") or {}).get("raw", ""))

                spaced_schedule = wrap_data.get("section_c") or {}
                if spaced_schedule:
                    spaced_parts = [f"{key}={value}" for key, value in spaced_schedule.items()]
                    session_data["spaced_reviews"] = "; ".join(spaced_parts)

                cards = wrap_data.get("section_b") or []
                card_texts = []
                for card in cards:
                    front = str(card.get("front", "")).strip() if isinstance(card, dict) else ""
                    back = str(card.get("back", "")).strip() if isinstance(card, dict) else ""
                    if front and back:
                        card_texts.append(f"{front} :: {back}")
                    elif front:
                        card_texts.append(front)
                if card_texts:
                    session_data["anki_cards_text"] = "; ".join(card_texts)
                session_data["anki_cards_count"] = len(card_texts)

                if tracker_payload:
                    session_data["tracker_json"] = json.dumps(tracker_payload, ensure_ascii=True)
                if enhanced_payload:
                    session_data["enhanced_json"] = json.dumps(enhanced_payload, ensure_ascii=True)

                session_data["raw_input"] = message
                session_data["created_at"] = now.isoformat()
                session_data["schema_version"] = V93_SCHEMA_VERSION
                session_data.setdefault("source_path", "api/brain/chat:wrap")

                session_saved = False
                session_id = None
                session_error = None
                try:
                    is_valid, error = validate_session_data(session_data)
                    if is_valid:
                        success, msg = insert_session(session_data)
                        session_saved = success
                        if success:
                            match = re.search(r"ID:\\s*(\\d+)", msg or "")
                            if match:
                                session_id = int(match.group(1))
                        else:
                            session_error = msg
                    else:
                        session_error = error
                except Exception as e:
                    session_error = str(e)

                wrap_session_id = metadata.get("session_id") or (str(session_id) if session_id else None)

                cards_created = 0
                cards_synced_to_anki = 0
                anki_sync_error = None
                if cards and mode in ("all", "anki"):
                    conn = get_connection()
                    cur = conn.cursor()
                    course = metadata.get("course") or topic or "General"
                    session_ref = wrap_session_id or f"wrap_{now.strftime('%Y%m%d_%H%M%S')}"
                    # If mode is "anki", auto-approve cards for immediate sync
                    card_status = "approved" if mode == "anki" else "pending"
                    for card in cards:
                        if isinstance(card, dict) and card.get("front") and card.get("back"):
                            cur.execute("""
                                INSERT INTO card_drafts 
                                (session_id, course_id, topic_id, deck_name, card_type, front, back, tags, source_citation, status, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                session_ref,
                                None,
                                None,
                                f"PT::{course}",
                                "basic",
                                card.get("front", ""),
                                card.get("back", ""),
                                card.get("tags", ""),
                                card.get("source") or metadata.get("source_lock"),
                                card_status,
                                now.isoformat()
                            ))
                            cards_created += 1
                    conn.commit()
                    conn.close()
                    
                    # If mode is "anki", trigger immediate sync to Anki
                    if mode == "anki" and cards_created > 0:
                        try:
                            from anki_sync import sync_pending_cards
                            sync_result = sync_pending_cards()
                            cards_synced_to_anki = sync_result.get("synced", 0)
                            if sync_result.get("errors"):
                                anki_sync_error = "; ".join(sync_result["errors"])
                        except Exception as sync_err:
                            anki_sync_error = str(sync_err)

                obsidian_synced = False
                obsidian_error = None
                obsidian_path = None
                notes = extract_obsidian_notes(wrap_data)
                if notes:
                    wrap_date = metadata.get("date") or session_date
                    route_course = metadata.get("course") or (topic if topic and topic.lower() != "general" else None)
                    if not route_course:
                        wheel_course = get_current_course_name()
                        if wheel_course:
                            route_course = wheel_course
                    course_folder = get_course_obsidian_folder(route_course) if route_course else None
                    obsidian_path = f"{course_folder}/Session-{wrap_date}.md" if course_folder else f"Inbox/Study-Log-{wrap_date}.md"

                    existing_resp = obsidian_get_file(obsidian_path)
                    existing_content = existing_resp.get("content", "") if existing_resp.get("success") else ""
                    merged_content = merge_sections(existing_content, notes, session_id=wrap_session_id)
                    save_result = obsidian_save_file(obsidian_path, merged_content)
                    if save_result.get("success"):
                        obsidian_synced = True
                    else:
                        obsidian_error = save_result.get("error")

                issues_logged = 0
                tutor_issues = wrap_data.get("tutor_issues") or []
                if tutor_issues:
                    conn = get_connection()
                    cur = conn.cursor()
                    for issue in tutor_issues:
                        if not isinstance(issue, dict):
                            continue
                        cur.execute("""
                            INSERT INTO tutor_issues
                            (session_id, issue_type, description, severity, resolved, created_at)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (
                            wrap_session_id,
                            issue.get("issue_type"),
                            issue.get("description"),
                            issue.get("severity"),
                            0,
                            now.isoformat()
                        ))
                        issues_logged += 1
                    conn.commit()
                    conn.close()

                response_parts = [
                    "WRAP ingestion complete.",
                    f"Cards drafted: {cards_created}",
                ]
                if mode == "anki" and cards_created > 0:
                    response_parts.append(f"Cards synced to Anki: {cards_synced_to_anki}")
                    if anki_sync_error:
                        response_parts.append(f"Anki sync error: {anki_sync_error}")
                response_parts.extend([
                    f"Notes merged: {'Yes' if obsidian_synced else 'No'}",
                    f"Tutor issues logged: {issues_logged}",
                ])
                if obsidian_path and obsidian_synced:
                    response_parts.append(f"Obsidian note: {obsidian_path}")
                if session_saved and session_id:
                    response_parts.append(f"Session logged (ID: {session_id}).")
                elif session_error:
                    response_parts.append(f"Session log failed: {session_error}")

                return jsonify({
                    "response": "\n".join(response_parts),
                    "isStub": False,
                    "parsed": True,
                    "wrapProcessed": True,
                    "cardsCreated": cards_created,
                    "cardsSyncedToAnki": cards_synced_to_anki,
                    "ankiSyncError": anki_sync_error,
                    "obsidianSynced": obsidian_synced,
                    "obsidianError": obsidian_error,
                    "obsidianPath": obsidian_path,
                    "issuesLogged": issues_logged,
                    "sessionSaved": session_saved,
                    "sessionId": session_id,
                    "wrapSessionId": wrap_session_id,
                    "sessionError": session_error,
                })

        if isinstance(data.get("tracker"), dict) or isinstance(data.get("enhanced"), dict):
            direct_tracker = data.get("tracker") if isinstance(data.get("tracker"), dict) else None
            direct_enhanced = data.get("enhanced") if isinstance(data.get("enhanced"), dict) else None
            direct_payload = {}
            if direct_tracker:
                direct_payload.update(direct_tracker)
            if direct_enhanced:
                direct_payload.update(direct_enhanced)
        elif isinstance(data.get("payload"), dict):
            direct_payload = data.get("payload")

        if direct_payload is None and isinstance(message, str) and message.strip():
            merged_payload, tracker_payload, enhanced_payload = _parse_json_payloads(message)
            if merged_payload:
                direct_payload = merged_payload
                direct_tracker = tracker_payload
                direct_enhanced = enhanced_payload

        use_direct_payload = direct_payload is not None

        if not use_direct_payload and (not isinstance(message, str) or not message.strip()):
            return jsonify({"response": "Please provide study session data to process.", "isStub": False})

        if use_direct_payload and direct_tracker is None and direct_enhanced is None and isinstance(direct_payload, dict):
            if _classify_json_payload(direct_payload) == "enhanced":
                direct_enhanced = direct_payload
            else:
                direct_tracker = direct_payload

        parsed_data = None
        if use_direct_payload:
            topic_hint = direct_payload.get("topic") if isinstance(direct_payload, dict) else None
            parsed_data = {
                "summary": "Direct JSON intake",
                "course": topic_hint or "General",
                "anki_cards": [],
            }
        else:
            system_prompt = """You are a study assistant for a PT (Physical Therapy) student using the PERRIO Protocol. You help with TWO things:
1. CONVERSATION: Answer questions, respond to greetings, chat casually
2. STUDY INGESTION: Parse detailed study notes into comprehensive structured data

FIRST, determine the intent:
- Short messages, greetings, questions, or casual chat = CONVERSATION
- Detailed notes with concepts, topics, or learning content = STUDY INGESTION

For CONVERSATION (greetings, questions, short messages, tests like "you working"):
{
    "is_conversation": true,
    "response": "Your friendly, helpful response here",
    "anki_cards": []
}

For STUDY INGESTION (actual study notes with substantial content):
{
    "is_conversation": false,

    // Core Metadata
    "summary": "2-3 sentence overview of what was studied",
    "course": "Evidence Based Practice | Exercise Physiology | Movement Science 1 | Neuroscience | Therapeutic Intervention | General",
    "study_mode": "Prime | Encode | Retrieve | Reinforce | Review | Exam Prep",

    // Content
    "topics_covered": ["list of main topics"],
    "key_concepts": ["important concepts to remember"],

    // Performance Assessment
    "strengths": ["things understood well"],
    "weaknesses": ["areas needing more work"],
    "confidence_level": 1-5,  // Self-assessed understanding
    "retention_estimate": 1-5,  // How well will this stick?

    // Anki Cards
    "anki_cards": [
        {
            "front": "Question for flashcard",
            "back": "Answer",
            "tags": "course,topic,difficulty",
            "card_type": "basic | cloze | reverse"
        }
    ],

    // CustomGPT Tutor Feedback (if mentioned in notes)
    "tutor_mistakes": ["any errors the CustomGPT tutor made"],
    "tutor_helpful": ["what the tutor did well"],
    "tutor_corrections_needed": ["facts/concepts the tutor got wrong"],

    // Learning Style Insights
    "what_worked": ["techniques that helped learning"],
    "what_didnt_work": ["approaches that weren't effective"],
    "inferred_learning_style": "visual | auditory | reading | kinesthetic | mixed",
    "optimal_session_length": "short (<30min) | medium (30-60min) | long (>60min)",
    "style_confidence": "low | medium | high",

    // Next Steps
    "follow_up_topics": ["topics to revisit"],
    "questions_remaining": ["unanswered questions"],
    "next_session_focus": "recommended focus for next session",

    // Legacy fields (for backward compatibility)
    "concepts": ["key concepts - same as key_concepts"],
    "what_went_well": ["same as what_worked"],
    "notes": "Additional observations"
}

STUDY MODES EXPLAINED:
- Prime: Initial exposure, overview (15-30 min)
- Encode: Deep learning, note-taking (45-90 min)
- Retrieve: Active recall, practice questions (20-40 min)
- Reinforce: Spaced review, Anki (15-30 min)
- Review: Pre-exam review (30-60 min)
- Exam Prep: Focused exam preparation (60-120 min)

IMPORTANT:
- Do NOT create study sessions for greetings, tests, or short messages
- Only create anki_cards when there's actual educational content
- Be conversational and friendly for casual messages
- For study notes, extract as much structure as possible
- Infer study_mode from context (e.g., "reviewing notes" = Review, "first time seeing" = Prime)
- Always try to identify confidence_level and retention_estimate even if not explicit
- Capture any tutor feedback mentioned (errors, corrections, helpful moments)
- Look for patterns in what learning techniques worked or didn't work
"""

            # Call LLM via OpenRouter
            result = call_llm(
                system_prompt=system_prompt,
                user_prompt=f"Process this study session data:\n\n{message}",
                provider="openrouter",
                model="google/gemini-2.0-flash-001",
                timeout=45
            )
            
            if not result.get("success"):
                return jsonify({
                    "response": f"LLM error: {result.get('error', 'Unknown error')}",
                    "isStub": True
                })
            
            # Parse LLM response
            llm_content = result.get("content", "")
            
            # Try to extract JSON from response
            try:
                # Try direct JSON parse
                parsed_data = json.loads(llm_content)
            except json.JSONDecodeError:
                # Try to find JSON in the response
                json_match = re.search(r'\{[\s\S]*\}', llm_content)
                if json_match:
                    try:
                        parsed_data = json.loads(json_match.group())
                    except:
                        parsed_data = None
            
            if not parsed_data:
                return jsonify({
                    "response": llm_content,
                    "isStub": False,
                    "parsed": False
                })
        
        def _as_list(value):
            if isinstance(value, list):
                return [str(v).strip() for v in value if str(v).strip()]
            if isinstance(value, str) and value.strip():
                return [value.strip()]
            return []

        def _join_items(items):
            return "; ".join(items) if items else ""

        def _normalize_payload(payload):
            normalized = {}
            for key, value in payload.items():
                if isinstance(value, list):
                    normalized[key] = _join_items(_as_list(value))
                elif value is None:
                    normalized[key] = ""
                else:
                    normalized[key] = value
            return normalized

        def _merge_defaults(payload, defaults):
            merged = dict(defaults)
            for key, value in payload.items():
                if value not in (None, ""):
                    merged[key] = value
            return merged

        now = datetime.now()
        session_date = now.strftime("%Y-%m-%d")
        session_time = now.strftime("%H:%M:%S")

        summary = parsed_data.get("summary", "")
        course = parsed_data.get("course", "General")
        concepts = _as_list(parsed_data.get("concepts"))
        strengths = _as_list(parsed_data.get("strengths"))
        weaknesses = _as_list(parsed_data.get("weaknesses"))
        what_went_well = _as_list(parsed_data.get("what_went_well"))
        what_didnt_work = _as_list(parsed_data.get("what_didnt_work"))
        notes = parsed_data.get("notes", "")

        topic = course if course and course.lower() != "general" else (concepts[0] if concepts else "General")
        study_mode = "Core"

        duration_minutes = 0
        duration_match = re.search(r"(\\d+)\\s*(min|mins|minutes|hr|hrs|hours)", message, re.IGNORECASE)
        if duration_match:
            raw_val = int(duration_match.group(1))
            unit = duration_match.group(2).lower()
            duration_minutes = raw_val * 60 if unit.startswith("h") else raw_val

        what_worked = _join_items(strengths + what_went_well)
        what_needs_fixing = _join_items(weaknesses + what_didnt_work)
        notes_parts = [p for p in [summary, notes] if isinstance(p, str) and p.strip()]
        notes_value = _join_items(notes_parts)

        anki_cards = parsed_data.get("anki_cards", [])
        anki_card_texts = []
        for card in anki_cards:
            front = str(card.get("front", "")).strip() if isinstance(card, dict) else ""
            back = str(card.get("back", "")).strip() if isinstance(card, dict) else ""
            if front and back:
                anki_card_texts.append(f"{front} :: {back}")
            elif front:
                anki_card_texts.append(front)

        tracker_defaults = {
            "schema_version": V93_SCHEMA_VERSION,
            "date": session_date,
            "topic": topic,
            "mode": study_mode,
            "duration_min": duration_minutes,
            "understanding": "N/A",
            "retention": "N/A",
            "calibration_gap": "N/A",
            "rsr_percent": "N/A",
            "cognitive_load": "N/A",
            "transfer_check": "N/A",
            "anchors": "N/A",
            "what_worked": what_worked or "N/A",
            "what_needs_fixing": what_needs_fixing or "N/A",
            "notes": notes_value or "N/A",
        }

        enhanced_defaults = {
            "schema_version": V93_SCHEMA_VERSION,
            "date": session_date,
            "topic": topic,
            "mode": study_mode,
            "duration_min": duration_minutes,
            "understanding": "N/A",
            "retention": "N/A",
            "calibration_gap": "N/A",
            "rsr_percent": "N/A",
            "cognitive_load": "N/A",
            "transfer_check": "N/A",
            "source_lock": "N/A",
            "plan_of_attack": "N/A",
            "frameworks_used": "N/A",
            "buckets": "N/A",
            "confusables_interleaved": "N/A",
            "anchors": "N/A",
            "anki_cards": _join_items([str(card.get("front", "")).strip() for card in anki_cards if isinstance(card, dict)]) or "N/A",
            "glossary": _join_items(concepts) or "N/A",
            "exit_ticket_blurt": "N/A",
            "exit_ticket_muddiest": "N/A",
            "exit_ticket_next_action": "N/A",
            "retrospective_status": "N/A",
            "spaced_reviews": "N/A",
            "what_worked": what_worked or "N/A",
            "what_needs_fixing": what_needs_fixing or "N/A",
            "next_session": "N/A",
            "notes": notes_value or "N/A",
        }

        tracker_payload = direct_tracker if use_direct_payload else parsed_data.get("tracker", {})
        enhanced_payload = direct_enhanced if use_direct_payload else parsed_data.get("enhanced", {})
        tracker_payload = _merge_defaults(_normalize_payload(tracker_payload if isinstance(tracker_payload, dict) else {}), tracker_defaults)
        enhanced_payload = _merge_defaults(_normalize_payload(enhanced_payload if isinstance(enhanced_payload, dict) else {}), enhanced_defaults)

        merged_payload = {}
        merged_payload.update(tracker_payload)
        merged_payload.update(enhanced_payload)

        session_data = _map_json_payload_to_session(merged_payload)
        session_data.setdefault("session_date", session_date)
        session_data.setdefault("session_time", session_time)
        session_data.setdefault("study_mode", study_mode)
        session_data.setdefault("main_topic", topic)
        session_data.setdefault("topic", topic)
        session_data.setdefault("duration_minutes", duration_minutes)
        session_data.setdefault("time_spent_minutes", duration_minutes)
        session_data.setdefault("subtopics", _join_items(concepts))
        session_data.setdefault("what_worked", what_worked)
        session_data.setdefault("what_needs_fixing", what_needs_fixing)
        session_data.setdefault("notes_insights", notes_value)
        session_data.setdefault("anki_cards_text", _join_items(anki_card_texts) or None)
        session_data.setdefault("anki_cards_count", len(anki_card_texts))
        session_data["tracker_json"] = json.dumps(tracker_payload, ensure_ascii=True)
        session_data["enhanced_json"] = json.dumps(enhanced_payload, ensure_ascii=True)
        raw_input_value = message
        if not (isinstance(message, str) and message.strip()) and use_direct_payload:
            raw_input_value = json.dumps(direct_payload, ensure_ascii=True)
        session_data["raw_input"] = raw_input_value
        session_data["created_at"] = now.isoformat()
        session_data["schema_version"] = V93_SCHEMA_VERSION
        session_data.setdefault("source_path", "api/brain/chat")

        session_saved = False
        session_id = None
        session_error = None
        is_conversation = parsed_data.get("is_conversation", False)
        session_signals = any([
            anki_cards,
            parsed_data.get("concepts"),
            parsed_data.get("strengths"),
            parsed_data.get("weaknesses"),
            parsed_data.get("what_went_well"),
            parsed_data.get("what_didnt_work"),
            parsed_data.get("notes"),
        ])
        skip_session_logging = is_conversation or ((not use_direct_payload) and parsed_data.get("response") and not session_signals)

        if skip_session_logging:
            session_error = "Skipped logging (question response)."
        else:
            try:
                is_valid, error = validate_session_data(session_data)
                if is_valid:
                    success, msg = insert_session(session_data)
                    session_saved = success
                    if success:
                        match = re.search(r"ID:\\s*(\\d+)", msg or "")
                        if match:
                            session_id = int(match.group(1))
                    else:
                        session_error = msg
                else:
                    session_error = error
            except Exception as e:
                session_error = str(e)

        # Insert Anki cards into card_drafts if present
        cards_created = 0
        if anki_cards:
            conn = get_connection()
            cur = conn.cursor()

            session_ref = str(session_id) if session_id else f"chat_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            course = parsed_data.get("course", "General")

            for card in anki_cards:
                if isinstance(card, dict) and card.get("front") and card.get("back"):
                    cur.execute("""
                        INSERT INTO card_drafts 
                        (session_id, course_id, topic_id, deck_name, card_type, front, back, tags, source_citation, status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        session_ref,
                        None,  # course_id
                        None,  # topic_id
                        f"PT::{course}",
                        "basic",
                        card.get("front", ""),
                        card.get("back", ""),
                        card.get("tags", ""),
                        None,  # source_citation
                        "pending",
                        datetime.now().isoformat()
                    ))
                    cards_created += 1

            conn.commit()
            conn.close()
        
        # Build response message
        response_parts = []

        if is_conversation:
            # For conversations, just return the response
            response_parts.append(parsed_data.get("response", "Hello! How can I help you with your studies today?"))
        else:
            # For study sessions, show full structured output
            if parsed_data.get("summary"):
                response_parts.append(f"📝 **Summary:** {parsed_data['summary']}")

            if parsed_data.get("response"):
                response_parts.append(parsed_data["response"])

            if parsed_data.get("course") and parsed_data["course"] != "General":
                response_parts.append(f"📚 **Course:** {parsed_data['course']}")

            if parsed_data.get("strengths"):
                response_parts.append(f"💪 **Strengths:** {', '.join(parsed_data['strengths'])}")

            if parsed_data.get("weaknesses"):
                response_parts.append(f"⚠️ **Weaknesses:** {', '.join(parsed_data['weaknesses'])}")

            if parsed_data.get("what_went_well"):
                response_parts.append(f"✅ **What went well:** {', '.join(parsed_data['what_went_well'])}")

            if parsed_data.get("what_didnt_work"):
                response_parts.append(f"❌ **What didn't work:** {', '.join(parsed_data['what_didnt_work'])}")

            if parsed_data.get("concepts"):
                response_parts.append(f"🧠 **Concepts:** {', '.join(parsed_data['concepts'])}")

            if cards_created > 0:
                response_parts.append(f"\n🃏 **Created {cards_created} Anki card(s)** - Check the Anki Integration panel to review and sync them!")

            if parsed_data.get("notes"):
                response_parts.append(f"\n📌 **Notes:** {parsed_data['notes']}")

            if session_saved:
                if session_id:
                    response_parts.append(f"\nSession logged (ID: {session_id}).")
                else:
                    response_parts.append("\nSession logged.")
            elif session_error and "Skipped" not in session_error:
                response_parts.append(f"\nSession log failed: {session_error}")

        # Sync to Obsidian if requested (skip for conversations)
        obsidian_synced = False
        obsidian_error = None
        sync_to_obsidian = data.get("syncToObsidian", False)

        if sync_to_obsidian and parsed_data and not is_conversation:
            # Build Obsidian note content
            today = datetime.now().strftime("%Y-%m-%d")
            time_now = datetime.now().strftime("%H:%M")
            course = parsed_data.get("course", "General")

            # Determine course for routing: parsed data > study wheel > fallback
            route_course = course if course and course.lower() != "general" else None
            if not route_course:
                wheel_course = get_current_course_name()
                if wheel_course:
                    route_course = wheel_course

            # Get course-specific folder path
            course_folder = get_course_obsidian_folder(route_course) if route_course else None

            obsidian_content = f"\n\n---\n## Study Session - {time_now}\n"
            obsidian_content += f"**Course:** {course}\n\n"

            if parsed_data.get("summary"):
                obsidian_content += f"### Summary\n{parsed_data['summary']}\n\n"

            if parsed_data.get("concepts"):
                obsidian_content += f"### Concepts Covered\n"
                for concept in parsed_data["concepts"]:
                    obsidian_content += f"- {concept}\n"
                obsidian_content += "\n"

            if parsed_data.get("strengths"):
                obsidian_content += f"### Strengths\n"
                for s in parsed_data["strengths"]:
                    obsidian_content += f"- ✅ {s}\n"
                obsidian_content += "\n"

            if parsed_data.get("weaknesses"):
                obsidian_content += f"### Areas to Review\n"
                for w in parsed_data["weaknesses"]:
                    obsidian_content += f"- ⚠️ {w}\n"
                obsidian_content += "\n"

            if cards_created > 0:
                obsidian_content += f"### Anki Cards Created: {cards_created}\n"
                for card in anki_cards[:5]:  # Show first 5
                    obsidian_content += f"- **Q:** {card.get('front', '')[:80]}...\n"
                obsidian_content += "\n"

            if parsed_data.get("notes"):
                obsidian_content += f"### Notes\n{parsed_data['notes']}\n"

            # Route to course-specific folder or fall back to Inbox
            if course_folder:
                obsidian_path = f"{course_folder}/Session-{today}.md"
            else:
                obsidian_path = f"Inbox/Study-Log-{today}.md"

            result = obsidian_append(obsidian_path, obsidian_content)

            if result.get("success"):
                obsidian_synced = True
                response_parts.append(f"\n📓 **Synced to Obsidian:** {obsidian_path}")
            else:
                obsidian_error = result.get("error")
                response_parts.append(f"\n⚠️ **Obsidian sync failed:** {obsidian_error}")
        
        return jsonify({
            "response": "\n\n".join(response_parts),
            "isStub": False,
            "parsed": True,
            "cardsCreated": cards_created,
            "obsidianSynced": obsidian_synced,
            "obsidianError": obsidian_error,
            "sessionSaved": session_saved,
            "sessionId": session_id,
            "sessionError": session_error,
            "data": parsed_data
        })
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[BRAIN CHAT ERROR] {str(e)}")
        print(error_trace)
        # Return 200 with error message so frontend can display it
        return jsonify({
            "response": f"Error: {str(e)}\n\nDetails: {error_trace[:500]}",
            "isStub": True
        })


@adapter_bp.route("/brain/ingest", methods=["POST"])
def brain_ingest():
    """Ingest content into brain (stub)."""
    try:
        data = request.get_json()
        content = data.get("content", "")
        filename = data.get("filename", "unknown")

        # Stub response
        return jsonify({
            "message": f"Received content from '{filename}' ({len(content)} chars). Ingestion pending integration.",
            "parsed": False,
            "isStub": True
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/tutor-issues", methods=["GET"])
def get_tutor_issues():
    """List tutor issues with optional filters."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        filters = []
        values = []

        session_id = request.args.get("session_id")
        if session_id:
            filters.append("session_id = ?")
            values.append(session_id)

        issue_type = request.args.get("issue_type")
        if issue_type:
            filters.append("issue_type = ?")
            values.append(issue_type)

        severity = request.args.get("severity")
        if severity:
            filters.append("severity = ?")
            values.append(severity)

        resolved = request.args.get("resolved")
        if resolved is not None:
            resolved_val = 1 if str(resolved).lower() in {"1", "true", "yes"} else 0
            filters.append("resolved = ?")
            values.append(resolved_val)

        query = "SELECT id, session_id, issue_type, description, severity, resolved, created_at FROM tutor_issues"
        if filters:
            query += " WHERE " + " AND ".join(filters)
        query += " ORDER BY created_at DESC"

        limit = request.args.get("limit")
        if limit and str(limit).isdigit():
            query += " LIMIT ?"
            values.append(int(limit))
        offset = request.args.get("offset")
        if offset and str(offset).isdigit():
            query += " OFFSET ?"
            values.append(int(offset))

        cur.execute(query, values)
        rows = cur.fetchall()
        conn.close()

        return jsonify([{
            "id": row["id"],
            "sessionId": row["session_id"],
            "issueType": row["issue_type"],
            "description": row["description"],
            "severity": row["severity"],
            "resolved": bool(row["resolved"]),
            "createdAt": row["created_at"],
        } for row in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/tutor-issues", methods=["POST"])
def create_tutor_issue():
    """Log new tutor issue."""
    try:
        data = request.get_json() or {}
        description = data.get("description", "").strip()
        issue_type = data.get("issue_type", "").strip()
        severity = data.get("severity", "").strip() or "medium"
        session_id = data.get("session_id")

        if not description or not issue_type:
            return jsonify({"error": "description and issue_type are required"}), 400

        conn = get_connection()
        cur = conn.cursor()
        now = datetime.now().isoformat()
        cur.execute(
            """
            INSERT INTO tutor_issues (session_id, issue_type, description, severity, resolved, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (session_id, issue_type, description, severity, 0, now),
        )
        issue_id = cur.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            "id": issue_id,
            "sessionId": session_id,
            "issueType": issue_type,
            "description": description,
            "severity": severity,
            "resolved": False,
            "createdAt": now,
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/tutor-issues/<int:issue_id>", methods=["PATCH"])
def update_tutor_issue(issue_id):
    """Update tutor issue fields or mark resolved."""
    try:
        data = request.get_json() or {}
        fields = []
        values = []

        if "description" in data:
            fields.append("description = ?")
            values.append(data.get("description"))
        if "issue_type" in data:
            fields.append("issue_type = ?")
            values.append(data.get("issue_type"))
        if "severity" in data:
            fields.append("severity = ?")
            values.append(data.get("severity"))
        if "resolved" in data:
            resolved_val = 1 if data.get("resolved") else 0
            fields.append("resolved = ?")
            values.append(resolved_val)

        if not fields:
            return jsonify({"error": "No fields to update"}), 400

        values.append(issue_id)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE tutor_issues SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        conn.commit()
        conn.close()

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/tutor-issues/stats", methods=["GET"])
def get_tutor_issue_stats():
    """Get frequency by type and severity for Scholar."""
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.execute("SELECT issue_type, COUNT(*) as count FROM tutor_issues GROUP BY issue_type")
        by_type = [{"issueType": row["issue_type"], "count": row["count"]} for row in cur.fetchall()]

        cur.execute("SELECT severity, COUNT(*) as count FROM tutor_issues GROUP BY severity")
        by_severity = [{"severity": row["severity"], "count": row["count"]} for row in cur.fetchall()]

        cur.execute("SELECT resolved, COUNT(*) as count FROM tutor_issues GROUP BY resolved")
        resolved_counts = {row["resolved"]: row["count"] for row in cur.fetchall()}

        conn.close()

        return jsonify({
            "byType": by_type,
            "bySeverity": by_severity,
            "resolved": {
                "resolved": resolved_counts.get(1, 0),
                "unresolved": resolved_counts.get(0, 0),
                "total": sum(resolved_counts.values()),
            },
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# GOOGLE TASKS - Individual List
# ==============================================================================


@adapter_bp.route("/google-tasks/<list_id>", methods=["GET"])
def get_tasks_for_list(list_id):
    """Get tasks for a specific Google Tasks list."""
    try:
        from dashboard.gcal import get_google_service

        service = get_google_service("tasks")
        if not service:
            return jsonify([])

        result = service.tasks().list(tasklist=list_id, showCompleted=True, maxResults=100).execute()
        tasks = result.get("items", [])

        return jsonify([{
            "id": t.get("id"),
            "title": t.get("title", ""),
            "notes": t.get("notes", ""),
            "status": t.get("status", "needsAction"),
            "due": t.get("due"),
            "position": t.get("position"),
            "listId": list_id,
        } for t in tasks])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/google-tasks/<list_id>", methods=["POST"])
def create_task_in_list(list_id):
    """Create a task in a specific Google Tasks list."""
    try:
        from dashboard.gcal import get_google_service

        service = get_google_service("tasks")
        if not service:
            return jsonify({"error": "Not connected to Google"}), 401

        data = request.json
        body = {
            "title": data.get("title", ""),
            "notes": data.get("notes", ""),
            "status": data.get("status", "needsAction"),
        }
        if data.get("due"):
            body["due"] = data["due"]

        result = service.tasks().insert(tasklist=list_id, body=body).execute()
        
        return jsonify({
            "id": result.get("id"),
            "title": result.get("title", ""),
            "notes": result.get("notes", ""),
            "status": result.get("status", "needsAction"),
            "due": result.get("due"),
            "position": result.get("position"),
            "listId": list_id,
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/google-tasks/<list_id>/<task_id>", methods=["PATCH"])
def update_task_in_list(list_id, task_id):
    """Update a task in a specific Google Tasks list."""
    try:
        from dashboard.gcal import get_google_service

        service = get_google_service("tasks")
        if not service:
            return jsonify({"error": "Not connected to Google"}), 401

        data = request.json
        
        # Get current task
        current = service.tasks().get(tasklist=list_id, task=task_id).execute()
        
        # Update fields
        if "title" in data:
            current["title"] = data["title"]
        if "notes" in data:
            current["notes"] = data["notes"]
        if "status" in data:
            current["status"] = data["status"]
        if "due" in data:
            current["due"] = data["due"]

        result = service.tasks().update(tasklist=list_id, task=task_id, body=current).execute()
        
        return jsonify({
            "id": result.get("id"),
            "title": result.get("title", ""),
            "notes": result.get("notes", ""),
            "status": result.get("status", "needsAction"),
            "due": result.get("due"),
            "position": result.get("position"),
            "listId": list_id,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/google-tasks/<list_id>/<task_id>/toggle", methods=["PATCH"])
def toggle_task_in_list(list_id, task_id):
    """Toggle a task's completion status in a specific Google Tasks list."""
    try:
        from dashboard.gcal import get_google_service

        service = get_google_service("tasks")
        if not service:
            return jsonify({"error": "Not connected to Google"}), 401

        data = request.json or {}
        completed = data.get("completed", True)
        
        # Get current task
        current = service.tasks().get(tasklist=list_id, task=task_id).execute()
        
        # Toggle status
        current["status"] = "completed" if completed else "needsAction"

        result = service.tasks().update(tasklist=list_id, task=task_id, body=current).execute()
        
        return jsonify({
            "id": result.get("id"),
            "title": result.get("title", ""),
            "notes": result.get("notes", ""),
            "status": result.get("status", "needsAction"),
            "due": result.get("due"),
            "position": result.get("position"),
            "listId": list_id,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/google-tasks/<list_id>/<task_id>", methods=["DELETE"])
def delete_task_in_list(list_id, task_id):
    """Delete a task from a specific Google Tasks list."""
    try:
        from dashboard.gcal import get_google_service

        service = get_google_service("tasks")
        if not service:
            return jsonify({"error": "Not connected to Google"}), 401

        service.tasks().delete(tasklist=list_id, task=task_id).execute()
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/google-tasks/<list_id>/<task_id>/move", methods=["POST"])
def move_task_in_list(list_id, task_id):
    """Move a task within or between Google Tasks lists."""
    try:
        from dashboard.gcal import get_google_service

        service = get_google_service("tasks")
        if not service:
            return jsonify({"error": "Not connected to Google"}), 401

        data = request.json
        dest_list_id = data.get("destListId", list_id)
        previous = data.get("previous")
        parent = data.get("parent")

        # If moving to a different list, need to copy then delete
        if dest_list_id != list_id:
            # Get current task
            current = service.tasks().get(tasklist=list_id, task=task_id).execute()
            
            # Create in new list
            body = {
                "title": current.get("title", ""),
                "notes": current.get("notes", ""),
                "status": current.get("status", "needsAction"),
            }
            if current.get("due"):
                body["due"] = current["due"]
            
            result = service.tasks().insert(tasklist=dest_list_id, body=body, previous=previous, parent=parent).execute()
            
            # Delete from old list
            service.tasks().delete(tasklist=list_id, task=task_id).execute()
        else:
            # Just move within same list
            result = service.tasks().move(tasklist=list_id, task=task_id, previous=previous, parent=parent).execute()
        
        return jsonify({
            "id": result.get("id"),
            "title": result.get("title", ""),
            "notes": result.get("notes", ""),
            "status": result.get("status", "needsAction"),
            "due": result.get("due"),
            "position": result.get("position"),
            "listId": dest_list_id,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# ACADEMIC DEADLINES (Assignments, Quizzes, Exams)
# ==============================================================================

@adapter_bp.route("/academic-deadlines", methods=["GET"])
def get_academic_deadlines():
    """Get all academic deadlines."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Ensure table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS academic_deadlines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                course TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('assignment', 'quiz', 'exam', 'project')),
                due_date TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        
        cur.execute("""
            SELECT id, title, course, type, due_date, completed, notes, created_at
            FROM academic_deadlines
            ORDER BY due_date ASC
        """)
        rows = cur.fetchall()
        conn.close()
        
        deadlines = []
        for r in rows:
            deadlines.append({
                "id": r[0],
                "title": r[1],
                "course": r[2],
                "type": r[3],
                "dueDate": r[4],
                "completed": bool(r[5]),
                "notes": r[6],
                "createdAt": r[7],
            })
        
        return jsonify(deadlines)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/academic-deadlines", methods=["POST"])
def create_academic_deadline():
    """Create a new academic deadline."""
    try:
        data = request.get_json()
        title = data.get("title")
        course = data.get("course")
        deadline_type = data.get("type")
        due_date = data.get("dueDate")
        notes = data.get("notes", "")
        
        if not all([title, course, deadline_type, due_date]):
            return jsonify({"error": "Missing required fields"}), 400
        
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO academic_deadlines (title, course, type, due_date, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (title, course, deadline_type, due_date, notes, datetime.now().isoformat()))
        
        deadline_id = cur.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "id": deadline_id,
            "title": title,
            "course": course,
            "type": deadline_type,
            "dueDate": due_date,
            "completed": False,
            "notes": notes,
            "createdAt": datetime.now().isoformat(),
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/academic-deadlines/<int:deadline_id>", methods=["PATCH"])
def update_academic_deadline(deadline_id):
    """Update an academic deadline."""
    try:
        data = request.get_json()
        conn = get_connection()
        cur = conn.cursor()
        
        updates = []
        params = []
        
        if "title" in data:
            updates.append("title = ?")
            params.append(data["title"])
        if "course" in data:
            updates.append("course = ?")
            params.append(data["course"])
        if "type" in data:
            updates.append("type = ?")
            params.append(data["type"])
        if "dueDate" in data:
            updates.append("due_date = ?")
            params.append(data["dueDate"])
        if "completed" in data:
            updates.append("completed = ?")
            params.append(1 if data["completed"] else 0)
        if "notes" in data:
            updates.append("notes = ?")
            params.append(data["notes"])
        
        if updates:
            params.append(deadline_id)
            cur.execute(f"UPDATE academic_deadlines SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()
        
        cur.execute("""
            SELECT id, title, course, type, due_date, completed, notes, created_at
            FROM academic_deadlines WHERE id = ?
        """, (deadline_id,))
        r = cur.fetchone()
        conn.close()
        
        if r:
            return jsonify({
                "id": r[0],
                "title": r[1],
                "course": r[2],
                "type": r[3],
                "dueDate": r[4],
                "completed": bool(r[5]),
                "notes": r[6],
                "createdAt": r[7],
            })
        return jsonify({"error": "Deadline not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/academic-deadlines/<int:deadline_id>", methods=["DELETE"])
def delete_academic_deadline(deadline_id):
    """Delete an academic deadline."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM academic_deadlines WHERE id = ?", (deadline_id,))
        conn.commit()
        conn.close()
        return "", 204
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/academic-deadlines/<int:deadline_id>/toggle", methods=["POST"])
def toggle_academic_deadline(deadline_id):
    """Toggle completion status of an academic deadline."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT completed FROM academic_deadlines WHERE id = ?", (deadline_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return jsonify({"error": "Deadline not found"}), 404
        
        new_status = 0 if row[0] else 1
        cur.execute("UPDATE academic_deadlines SET completed = ? WHERE id = ?", (new_status, deadline_id))
        conn.commit()
        
        cur.execute("""
            SELECT id, title, course, type, due_date, completed, notes, created_at
            FROM academic_deadlines WHERE id = ?
        """, (deadline_id,))
        r = cur.fetchone()
        conn.close()
        
        return jsonify({
            "id": r[0],
            "title": r[1],
            "course": r[2],
            "type": r[3],
            "dueDate": r[4],
            "completed": bool(r[5]),
            "notes": r[6],
            "createdAt": r[7],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# SCHOLAR ENDPOINTS
# =============================================================================

@adapter_bp.route("/scholar/questions", methods=["GET"])
def get_scholar_questions():
    """Get open questions from Scholar outputs."""
    from pathlib import Path
    
    questions = []
    scholar_outputs = Path(__file__).parent.parent.parent / "scholar" / "outputs"
    
    # Check questions_dashboard.md
    questions_file = scholar_outputs / "questions_dashboard.md"
    if questions_file.exists():
        content = questions_file.read_text(encoding="utf-8", errors="ignore")
        for line in content.splitlines():
            stripped = line.strip()
            if stripped.startswith("- ") or stripped.startswith("* "):
                question_text = stripped[2:].strip()
                if question_text and len(question_text) > 5:
                    questions.append({
                        "id": len(questions) + 1,
                        "question": question_text,
                        "context": "",
                        "dataInsufficient": "",
                        "researchAttempted": "",
                        "source": "questions_dashboard.md"
                    })
    
    # Also check orchestrator runs for questions_needed files
    orchestrator_dir = scholar_outputs / "orchestrator_runs"
    if orchestrator_dir.exists():
        for qfile in orchestrator_dir.glob("questions_needed_*.md"):
            content = qfile.read_text(encoding="utf-8", errors="ignore")
            for line in content.splitlines():
                stripped = line.strip()
                if stripped.startswith("- ") or stripped.startswith("* "):
                    question_text = stripped[2:].strip()
                    if question_text:
                        questions.append({
                            "id": len(questions) + 1,
                            "question": question_text,
                            "context": "",
                            "dataInsufficient": "",
                            "researchAttempted": "",
                            "source": qfile.name
                        })
    
    return jsonify(questions[:20])


@adapter_bp.route("/scholar/chat", methods=["POST"])
def scholar_chat():
    """Chat with Scholar about study data."""
    from scholar.brain_reader import get_all_sessions, get_session_count
    
    data = request.json
    message = data.get("message", "").lower()
    
    # Get study data for context
    session_count = get_session_count()
    sessions = get_all_sessions()
    
    # Build contextual response
    if "session" in message or "study" in message:
        if sessions:
            recent = sessions[:5]
            topics = [s.main_topic for s in recent if s.main_topic]
            response = f"You have {session_count} sessions logged. Recent topics: {', '.join(topics[:3]) if topics else 'None recorded'}."
        else:
            response = "No sessions found in the database. Start logging study sessions to track your progress."
    elif "progress" in message or "how" in message:
        response = f"Based on {session_count} logged sessions, you're building a study habit. Keep logging sessions to see detailed analytics."
    elif "help" in message:
        response = "I can help you analyze your study patterns. Ask about: sessions, progress, topics, or study time."
    else:
        response = f"I found {session_count} sessions in your study database. Ask me about your sessions, topics, or study patterns for insights."
    
    return jsonify({
        "response": response,
        "sessionCount": session_count,
        "isStub": False
    })


@adapter_bp.route("/scholar/findings", methods=["GET"])
def get_scholar_findings():
    """Get research findings from Scholar outputs."""
    from pathlib import Path
    
    findings = []
    scholar_outputs = Path(__file__).parent.parent.parent / "scholar" / "outputs"
    
    # Check STATUS.md
    status_file = scholar_outputs / "STATUS.md"
    if status_file.exists():
        content = status_file.read_text(encoding="utf-8", errors="ignore")
        findings.append({
            "id": 1,
            "title": "System Status",
            "source": "STATUS.md",
            "content": content[:500] if len(content) > 500 else content
        })
    
    # Check for review outputs
    review_dir = scholar_outputs / "review"
    if review_dir.exists():
        for rfile in list(review_dir.glob("*.md"))[:5]:
            content = rfile.read_text(encoding="utf-8", errors="ignore")
            findings.append({
                "id": len(findings) + 1,
                "title": rfile.stem.replace("_", " ").title(),
                "source": f"review/{rfile.name}",
                "content": content[:300] if len(content) > 300 else content
            })
    
    return jsonify(findings)


@adapter_bp.route("/scholar/tutor-audit", methods=["GET"])
def get_tutor_audit():
    """Get tutor session audit data."""
    # For now, derive from chat messages in database
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Get recent chat sessions
        cur.execute("""
            SELECT DISTINCT session_id, created_at 
            FROM chat_messages 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        sessions = cur.fetchall()
        
        audit_items = []
        for sess_id, created_at in sessions:
            cur.execute("""
                SELECT COUNT(*), role 
                FROM chat_messages 
                WHERE session_id = ? 
                GROUP BY role
            """, (sess_id,))
            counts = {r[1]: r[0] for r in cur.fetchall()}
            
            audit_items.append({
                "id": len(audit_items) + 1,
                "sessionId": sess_id,
                "date": created_at,
                "userMessages": counts.get("user", 0),
                "assistantMessages": counts.get("assistant", 0),
                "status": "reviewed" if counts.get("user", 0) > 0 else "pending"
            })
        
        conn.close()
        return jsonify(audit_items)
    except Exception as e:
        return jsonify([])


# =========================================================================
# OBSIDIAN INTEGRATION ENDPOINTS
# =========================================================================

@adapter_bp.route("/obsidian/status", methods=["GET"])
def get_obsidian_status():
    """Check Obsidian gateway status."""
    status = obsidian_health_check()
    return jsonify(status)

@adapter_bp.route("/obsidian/append", methods=["POST"])
def post_obsidian_append():
    """Append content to Obsidian vault."""
    data = request.get_json() or {}
    path = data.get("path", "")
    content = data.get("content", "")
    
    if not path or not content:
        return jsonify({"success": False, "error": "path and content are required"}), 400
    
    result = obsidian_append(path, content)
    if result.get("success"):
        return jsonify(result)
    return jsonify(result), 500

@adapter_bp.route("/obsidian/files", methods=["GET"])
def get_obsidian_files():
    """List files in Obsidian vault."""
    folder = request.args.get("folder", "")
    result = obsidian_list_files(folder)
    if result.get("success"):
        return jsonify(result)
    return jsonify(result), 500

@adapter_bp.route("/obsidian/file", methods=["GET"])
def get_obsidian_file():
    """Get content of a file from Obsidian vault."""
    path = request.args.get("path", "")
    if not path:
        return jsonify({"success": False, "error": "path is required"}), 400
    result = obsidian_get_file(path)
    if result.get("success"):
        return jsonify(result)
    return jsonify(result), 500

@adapter_bp.route("/obsidian/file", methods=["PUT"])
def put_obsidian_file():
    """Save/overwrite a file in Obsidian vault."""
    data = request.get_json() or {}
    path = data.get("path", "")
    content = data.get("content", "")
    
    if not path:
        return jsonify({"success": False, "error": "path is required"}), 400
    
    result = obsidian_save_file(path, content)
    if result.get("success"):
        return jsonify(result)
    return jsonify(result), 500


# =========================================================================
# ANKI INTEGRATION ENDPOINTS
# =========================================================================

@adapter_bp.route("/anki/status", methods=["GET"])
def get_anki_status():
    """Check Anki Connect status and get basic stats."""
    import json
    from urllib.request import Request, urlopen
    from urllib.error import URLError
    
    try:
        # Check AnkiConnect
        payload = json.dumps({"action": "version", "version": 6}).encode("utf-8")
        req = Request("http://localhost:8765", data=payload, headers={"Content-Type": "application/json"})
        response = urlopen(req, timeout=2)
        result = json.loads(response.read().decode("utf-8"))
        
        connected = result.get("result") is not None
        
        if connected:
            # Get deck names
            deck_payload = json.dumps({"action": "deckNames", "version": 6}).encode("utf-8")
            deck_req = Request("http://localhost:8765", data=deck_payload, headers={"Content-Type": "application/json"})
            deck_response = urlopen(deck_req, timeout=2)
            deck_result = json.loads(deck_response.read().decode("utf-8"))
            decks = deck_result.get("result", [])
            
            # Get review stats
            stats_payload = json.dumps({
                "action": "getNumCardsReviewedToday",
                "version": 6
            }).encode("utf-8")
            stats_req = Request("http://localhost:8765", data=stats_payload, headers={"Content-Type": "application/json"})
            stats_response = urlopen(stats_req, timeout=2)
            stats_result = json.loads(stats_response.read().decode("utf-8"))
            reviewed_today = stats_result.get("result", 0)
            
            return jsonify({
                "connected": True,
                "version": result.get("result"),
                "decks": decks,
                "reviewedToday": reviewed_today
            })
        else:
            return jsonify({"connected": False, "error": "AnkiConnect not responding"})
            
    except URLError:
        return jsonify({"connected": False, "error": "Anki not running"})
    except Exception as e:
        return jsonify({"connected": False, "error": str(e)})


@adapter_bp.route("/anki/decks", methods=["GET"])
def get_anki_decks():
    """Get all Anki decks with card counts."""
    import json
    from urllib.request import Request, urlopen
    from urllib.error import URLError
    
    try:
        # Get deck names
        payload = json.dumps({"action": "deckNamesAndIds", "version": 6}).encode("utf-8")
        req = Request("http://localhost:8765", data=payload, headers={"Content-Type": "application/json"})
        response = urlopen(req, timeout=2)
        result = json.loads(response.read().decode("utf-8"))
        
        decks_raw = result.get("result", {})
        decks = []
        
        for name, deck_id in decks_raw.items():
            # Get card count for each deck
            count_payload = json.dumps({
                "action": "findCards",
                "version": 6,
                "params": {"query": f"deck:\"{name}\""}
            }).encode("utf-8")
            count_req = Request("http://localhost:8765", data=count_payload, headers={"Content-Type": "application/json"})
            count_response = urlopen(count_req, timeout=2)
            count_result = json.loads(count_response.read().decode("utf-8"))
            card_ids = count_result.get("result", [])
            
            decks.append({
                "id": deck_id,
                "name": name,
                "cardCount": len(card_ids)
            })
        
        return jsonify(decks)
        
    except URLError:
        return jsonify({"error": "Anki not running"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/anki/due", methods=["GET"])
def get_anki_due():
    """Get due cards count."""
    import json
    from urllib.request import Request, urlopen
    from urllib.error import URLError
    
    try:
        payload = json.dumps({
            "action": "findCards",
            "version": 6,
            "params": {"query": "is:due"}
        }).encode("utf-8")
        req = Request("http://localhost:8765", data=payload, headers={"Content-Type": "application/json"})
        response = urlopen(req, timeout=2)
        result = json.loads(response.read().decode("utf-8"))
        
        due_cards = result.get("result", [])
        
        return jsonify({
            "dueCount": len(due_cards),
            "cardIds": due_cards[:100]  # Limit to first 100
        })
        
    except URLError:
        return jsonify({"error": "Anki not running"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/anki/sync", methods=["POST"])
def trigger_anki_sync():
    """Trigger sync of approved card drafts to Anki."""
    try:
        import subprocess
        import sys
        
        # Run the anki_sync.py script
        script_path = Path(__file__).parent.parent / "anki_sync.py"
        result = subprocess.run(
            [sys.executable, str(script_path), "--sync"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        return jsonify({
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({"success": False, "error": "Sync timed out"}), 504
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@adapter_bp.route("/anki/drafts", methods=["GET"])
def get_card_drafts():
    """Get card drafts from the database."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, session_id, deck_name, card_type, front, back, tags, status, created_at
            FROM card_drafts
            ORDER BY created_at DESC
            LIMIT 50
        """)
        
        drafts = []
        for row in cur.fetchall():
            drafts.append({
                "id": row[0],
                "sessionId": row[1],
                "deckName": row[2],
                "cardType": row[3],
                "front": row[4],
                "back": row[5],
                "tags": row[6],
                "status": row[7],
                "createdAt": row[8]
            })
        
        conn.close()
        return jsonify(drafts)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@adapter_bp.route("/anki/drafts/<int:draft_id>/approve", methods=["POST"])
def approve_card_draft(draft_id):
    """Approve a card draft for syncing to Anki."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("UPDATE card_drafts SET status = 'approved' WHERE id = ?", (draft_id,))
        conn.commit()
        conn.close()
        
        return jsonify({"success": True, "id": draft_id, "status": "approved"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
