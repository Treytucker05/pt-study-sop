"""
Google Calendar Integration for PT Study Brain
OAuth2 authentication + manual sync of calendar events
"""

import os
import json
import sqlite3
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple


from db_setup import get_connection, init_database
from config import load_env


# Google API imports (install: pip install google-auth google-auth-oauthlib google-api-python-client)
try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build

    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False
    print(
        "[WARN] Google API libraries not installed. Run: pip install google-auth google-auth-oauthlib google-api-python-client"
    )


# Strict scope validation causes errors when Google returns implicit scopes
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

# Paths
DATA_DIR = Path(__file__).parent.parent / "data"
TOKEN_PATH = DATA_DIR / "gcal_token.json"
CONFIG_PATH = DATA_DIR / "api_config.json"
DB_PATH = DATA_DIR / "pt_study.db"

# OAuth scopes - read-only access to calendar and tasks
SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/tasks",
]


def load_gcal_config():
    """Load Google Calendar config from api_config.json"""
    load_env()
    if not CONFIG_PATH.exists():
        config = {}
    else:
        try:
            with open(CONFIG_PATH, "r") as f:
                config = json.load(f)
        except Exception as exc:
            # returns dict so get() works on it
            return {"_error": f"Config Error: {exc}"}

    gcal_config = config.get("google_calendar", {}) if isinstance(config, dict) else {}
    if not isinstance(gcal_config, dict):
        gcal_config = {}

    env_client_id = os.environ.get("GOOGLE_CLIENT_ID")
    env_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    env_redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI")

    if env_client_id:
        gcal_config["client_id"] = env_client_id
    if env_client_secret:
        gcal_config["client_secret"] = env_client_secret
    if env_redirect_uri:
        gcal_config["redirect_uri"] = env_redirect_uri

    return gcal_config


def normalize_gcal_config(config: Optional[Dict]) -> Dict:
    normalized = dict(config or {})
    normalized.setdefault("calendar_ids", [])
    normalized.setdefault("default_calendar_id", "primary")
    normalized.setdefault("sync_all_calendars", False)
    normalized.setdefault("timezone", None)
    return normalized


def save_token(creds):
    """Save OAuth token to file"""
    try:
        token_data = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": list(creds.scopes) if creds.scopes else [],
            "expiry": creds.expiry.isoformat() if creds.expiry else None,
        }
        with open(TOKEN_PATH, "w") as f:
            json.dump(token_data, f)
    except Exception as e:
        print(f"[ERROR] Failed to save token: {e}")


def load_token():
    """Load OAuth token from file"""
    if not TOKEN_PATH.exists():
        return None

    try:
        with open(TOKEN_PATH, "r") as f:
            token_data = json.load(f)

        return Credentials(
            token=token_data.get("token"),
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data.get("token_uri"),
            client_id=token_data.get("client_id"),
            client_secret=token_data.get("client_secret"),
            scopes=token_data.get("scopes"),
        )
    except Exception:
        return None


def get_auth_url():
    """Generate OAuth2 authorization URL"""
    if not GOOGLE_API_AVAILABLE:
        return None, "Google API libraries not installed"

    config = load_gcal_config()
    if not config or not config.get("client_id"):
        return None, "Google Calendar not configured in api_config.json"

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [
                    config.get(
                        "redirect_uri", "http://localhost:5000/api/gcal/oauth/callback"
                    )
                ],
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = config.get(
        "redirect_uri", "http://localhost:5000/api/gcal/oauth/callback"
    )

    auth_url, state = flow.authorization_url(
        access_type="offline", include_granted_scopes="true", prompt="consent"
    )

    return auth_url, state


def complete_oauth(code):
    """Complete OAuth flow with authorization code"""
    if not GOOGLE_API_AVAILABLE:
        return False, "Google API libraries not installed"

    config = load_gcal_config()
    if not config:
        return False, "Google Calendar not configured"

    try:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [
                        config.get(
                            "redirect_uri",
                            "http://localhost:5000/api/gcal/oauth/callback",
                        )
                    ],
                }
            },
            scopes=SCOPES,
        )
        flow.redirect_uri = config.get(
            "redirect_uri", "http://localhost:5000/api/gcal/oauth/callback"
        )

        flow.fetch_token(code=code)
        creds = flow.credentials
        save_token(creds)

        return True, "Successfully connected to Google Calendar"
    except Exception as e:
        return False, f"OAuth error: {str(e)}"


def get_calendar_service():
    """Get authenticated Google Calendar service"""
    if not GOOGLE_API_AVAILABLE:
        return None

    creds = load_token()
    if not creds or not creds.valid:
        return None

    return build("calendar", "v3", credentials=creds)


def get_tasks_service():
    """Get authenticated Google Tasks service"""
    if not GOOGLE_API_AVAILABLE:
        return None

    creds = load_token()
    if not creds or not creds.valid:
        return None

    return build("tasks", "v1", credentials=creds)


def check_auth_status():
    """Check if user is authenticated with Google Calendar"""
    if not GOOGLE_API_AVAILABLE:
        return {"connected": False, "error": "Google API not installed"}

    config = load_gcal_config()
    if not config:
        return {
            "connected": False,
            "error": "Google Calendar not configured. Update brain/data/api_config.json.",
        }
    if config.get("_error"):
        return {"connected": False, "error": config.get("_error")}
    if not config.get("client_id") or not config.get("client_secret"):
        return {
            "connected": False,
            "error": "Google Calendar not configured. Update brain/data/api_config.json.",
        }

    if not TOKEN_PATH.exists():
        return {"connected": False}

    try:
        creds = load_token()
        if creds and creds.valid:
            # Get user email
            service = build("calendar", "v3", credentials=creds)
            calendar = service.calendars().get(calendarId="primary").execute()
            return {
                "connected": True,
                "email": calendar.get("summary", "Unknown"),
                "id": calendar.get("id"),
            }
        else:
            return {"connected": False, "error": "Token expired"}
    except Exception as e:
        return {"connected": False, "error": str(e)}


def revoke_auth():
    """Revoke Google Calendar authentication"""
    try:
        if TOKEN_PATH.exists():
            TOKEN_PATH.unlink()
        return True
    except Exception as e:
        print(f"[ERROR] Failed to revoke auth: {e}")
        return False


def parse_rfc3339(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except ValueError:
        return None


def parse_local_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except ValueError:
        return None


def fetch_calendar_list():
    """Fetch available Google Calendars for the user."""
    service = get_calendar_service()
    if not service:
        return [], "Not authenticated"

    try:
        result = service.calendarList().list(showHidden=False, maxResults=250).execute()
        return result.get("items", []), None
    except Exception as exc:
        return [], str(exc)


def resolve_calendar_selection(
    config: Optional[Dict],
    calendars: List[Dict],
) -> Tuple[List[str], str, bool, Dict[str, Dict]]:
    normalized = normalize_gcal_config(config)
    sync_all = bool(normalized.get("sync_all_calendars"))
    calendar_meta: Dict[str, Dict] = {}
    for cal in calendars:
        cal_id = cal.get("id")
        if not cal_id:
            continue
        calendar_meta[cal_id] = {
            "name": cal.get("summary") or cal_id,
            "primary": bool(cal.get("primary")),
            "time_zone": cal.get("timeZone"),
            "access_role": cal.get("accessRole"),
        }

    calendar_ids = list(normalized.get("calendar_ids") or [])
    if sync_all:
        calendar_ids = list(calendar_meta.keys())

    if not calendar_ids:
        primary_id = next(
            (cid for cid, meta in calendar_meta.items() if meta.get("primary")),
            None,
        )
        if primary_id:
            calendar_ids.append(primary_id)

        pt_school_id = next(
            (
                cid
                for cid, meta in calendar_meta.items()
                if (meta.get("name") or "").lower() == "pt school"
            ),
            None,
        )
        if pt_school_id and pt_school_id not in calendar_ids:
            calendar_ids.append(pt_school_id)

        if not calendar_ids and calendar_meta:
            calendar_ids.append(next(iter(calendar_meta.keys())))

    default_calendar_id = normalized.get("default_calendar_id") or "primary"
    if calendar_ids and default_calendar_id not in calendar_ids:
        default_calendar_id = calendar_ids[0]

    return calendar_ids, default_calendar_id, sync_all, calendar_meta


def fetch_calendar_events(
    calendar_ids: List[str],
    calendar_meta: Dict[str, Dict],
    days_ahead: int = 90,
    service=None,
    time_min: Optional[str] = None,
    time_max: Optional[str] = None,
):
    """Fetch upcoming events from Google Calendar."""
    service = service or get_calendar_service()
    if not service:
        return [], "Not authenticated"

    if not time_min:
        now = datetime.utcnow()
        time_min = now.isoformat() + "Z"
    if not time_max:
        # Default to days_ahead if not provided
        if not time_min.endswith("Z"):
            # Simple parsing if we just set it above it has Z.
            # If passed in as arg, assume formatted.
            pass
        # For simplicity, if time_max missing, calculate from now or time_min
        # Parsing time_min to add days is complex without strict format.
        # Fallback to now + days_ahead if time_max not explicit.
        now = datetime.utcnow()
        time_max = (now + timedelta(days=days_ahead)).isoformat() + "Z"

    events: List[Dict] = []
    for calendar_id in calendar_ids:
        if not calendar_id:
            continue
        try:
            events_result = (
                service.events()
                .list(
                    calendarId=calendar_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    maxResults=500,
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )
        except Exception as exc:
            return [], str(exc)

        for item in events_result.get("items", []):
            if item.get("status") == "cancelled":
                continue
            item["_calendar_id"] = calendar_id
            item["_calendar_name"] = calendar_meta.get(calendar_id, {}).get("name")
            events.append(item)

    return events, None


def parse_gcal_event(gcal_event: Dict) -> Dict:
    """Parse Google Calendar event to Brain format."""
    start = gcal_event.get("start", {})
    updated = gcal_event.get("updated")

    # Handle all-day vs timed events
    if "date" in start:
        date = start["date"]
        time_str = None
    else:
        dt = start.get("dateTime", "")
        date = dt[:10] if dt else None
        time_str = dt[11:16] if len(dt) > 16 else None

    # Determine event type from title/description
    title = gcal_event.get("summary", "Untitled")
    title_lower = title.lower()

    if any(x in title_lower for x in ["exam", "midterm", "final"]):
        event_type = "exam"
    elif any(x in title_lower for x in ["quiz", "irat", "trat"]):
        event_type = "quiz"
    elif any(x in title_lower for x in ["lab", "practical"]):
        event_type = "lab"
    elif any(x in title_lower for x in ["lecture", "class", "vs class"]):
        event_type = "lecture"
    elif any(x in title_lower for x in ["due", "assignment", "submit"]):
        event_type = "assignment"
    else:
        event_type = "other"

    raw_parts = [f"Time: {time_str or 'All day'}"]
    location = gcal_event.get("location")
    if location:
        raw_parts.append(f"Location: {location}")
    description = (gcal_event.get("description") or "").strip()
    if description:
        raw_parts.append(f"Notes: {description}")

    return {
        "google_event_id": gcal_event.get("id"),
        "google_calendar_id": gcal_event.get("_calendar_id"),
        "google_calendar_name": gcal_event.get("_calendar_name"),
        "google_updated_at": updated,
        "title": title,
        "date": date,
        "type": event_type,
        "raw_text": " | ".join(raw_parts),
        "status": "pending",
    }


def _extract_raw_text_parts(raw_text: Optional[str]) -> Dict[str, Optional[str]]:
    parts: Dict[str, Optional[str]] = {"time": None, "location": None, "notes": None}

    if not raw_text:
        return parts

    time_match = re.search(r"Time:\s*([^|]+)", raw_text, re.IGNORECASE)
    if time_match:
        value = time_match.group(1).strip()
        parts["time"] = value

    location_match = re.search(r"Location:\s*([^|]+)", raw_text, re.IGNORECASE)
    if location_match:
        parts["location"] = location_match.group(1).strip()

    notes_match = re.search(r"Notes:\s*([^|]+)", raw_text, re.IGNORECASE)
    if notes_match:
        parts["notes"] = notes_match.group(1).strip()

    return parts


def _parse_time_string(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    text = value.strip()
    if not text or text.lower() in {"all day", "allday"}:
        return None

    match = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", text, re.IGNORECASE)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        meridian = match.group(3).lower()
        hour = max(1, min(hour, 12))
        if meridian == "pm" and hour != 12:
            hour += 12
        if meridian == "am" and hour == 12:
            hour = 0
        return f"{hour:02d}:{minute:02d}"

    match = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", text)
    if match:
        return f"{int(match.group(1)):02d}:{int(match.group(2)):02d}"

    return None


def _build_event_datetime(date_str: str, time_str: Optional[str]) -> Optional[datetime]:
    if not date_str or not time_str:
        return None
    try:
        return datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    except ValueError:
        return None


def build_gcal_event_payload(
    local_event: Dict,
    calendar_timezone: Optional[str],
) -> Optional[Dict]:
    date_str = local_event.get("date") or local_event.get("due_date")
    if not date_str:
        return None

    raw_text = (local_event.get("raw_text") or "").strip()
    parts = _extract_raw_text_parts(raw_text)
    time_str = _parse_time_string(parts.get("time"))
    calendar_timezone = calendar_timezone or "UTC"

    start_dt = _build_event_datetime(date_str, time_str)
    if start_dt:
        end_dt = start_dt + timedelta(minutes=60)
        start = {"dateTime": start_dt.isoformat(), "timeZone": calendar_timezone}
        end = {"dateTime": end_dt.isoformat(), "timeZone": calendar_timezone}
    else:
        try:
            base_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return None
        start = {"date": base_date.isoformat()}
        end = {"date": (base_date + timedelta(days=1)).isoformat()}

    payload = {
        "summary": local_event.get("title") or "Untitled",
        "start": start,
        "end": end,
    }

    if parts.get("location"):
        payload["location"] = parts["location"]
    if raw_text:
        payload["description"] = raw_text

    return payload


def upsert_gcal_event(
    service,
    calendar_id: str,
    local_event: Dict,
    calendar_timezone: Optional[str],
):
    payload = build_gcal_event_payload(local_event, calendar_timezone)
    if not payload:
        return None, "Missing date"

    event_id = local_event.get("google_event_id")
    try:
        if event_id:
            updated = (
                service.events()
                .update(calendarId=calendar_id, eventId=event_id, body=payload)
                .execute()
            )
        else:
            updated = (
                service.events().insert(calendarId=calendar_id, body=payload).execute()
            )
        return updated, None
    except Exception as exc:
        return None, str(exc)


def delete_gcal_event(google_event_id: str, calendar_id: str):
    service = get_calendar_service()
    if not service:
        return False, "Not authenticated"

    try:
        service.events().delete(
            calendarId=calendar_id, eventId=google_event_id
        ).execute()
        return True, None
    except Exception as exc:
        return False, str(exc)


def ensure_calendar_course(cursor, calendar_name: Optional[str]) -> int:
    name = (calendar_name or "Google Calendar").strip() or "Google Calendar"
    cursor.execute("SELECT id FROM courses WHERE lower(name) = ?", (name.lower(),))
    row = cursor.fetchone()
    if row:
        return row[0]

    now = datetime.now().isoformat(timespec="seconds")
    cursor.execute(
        """
        INSERT INTO courses (
            name, code, term, instructor, default_study_mode,
            time_budget_per_week_minutes, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (name, name, None, None, "Core", 0, now),
    )
    return cursor.lastrowid


def sync_bidirectional(course_id=None, calendar_ids: Optional[List[str]] = None):
    """Two-way sync between Google Calendar and local course_events."""
    if not GOOGLE_API_AVAILABLE:
        return {"success": False, "error": "Google API libraries not installed"}

    config = load_gcal_config()
    if not config:
        return {"success": False, "error": "Google Calendar not configured"}
    if config.get("_error"):
        return {"success": False, "error": config.get("_error")}
    if not config.get("client_id"):
        return {"success": False, "error": "Google Calendar not configured"}

    service = get_calendar_service()
    if not service:
        return {"success": False, "error": "Not authenticated"}

    calendars, error = fetch_calendar_list()
    if error:
        return {"success": False, "error": error}

    selected_ids, default_calendar_id, sync_all, calendar_meta = (
        resolve_calendar_selection(config, calendars)
    )
    if calendar_ids:
        selected_ids = calendar_ids
        if selected_ids and default_calendar_id not in selected_ids:
            default_calendar_id = selected_ids[0]

    if not selected_ids:
        return {"success": False, "error": "No calendars selected"}

    events, error = fetch_calendar_events(selected_ids, calendar_meta, service=service)
    if error:
        return {"success": False, "error": error}

    gcal_event_keys = {
        (ev.get("_calendar_id"), ev.get("id"))
        for ev in events
        if ev.get("_calendar_id") and ev.get("id")
    }

    now = datetime.now().isoformat(timespec="seconds")
    imported = 0
    updated = 0
    pushed = 0
    deleted = 0
    skipped = 0
    errors: List[str] = []

    init_database()
    conn = get_connection()
    cursor = conn.cursor()

    course_by_calendar: Dict[str, int] = {}

    def resolve_course_id(calendar_name: Optional[str]) -> int:
        if course_id is not None:
            return course_id
        name = (calendar_name or "Google Calendar").strip() or "Google Calendar"
        if name not in course_by_calendar:
            course_by_calendar[name] = ensure_calendar_course(cursor, name)
        return course_by_calendar[name]

    local_to_push: List[Dict] = []
    local_to_push_ids: set = set()

    for event in events:
        parsed = parse_gcal_event(event)
        google_event_id = parsed.get("google_event_id")
        calendar_id = parsed.get("google_calendar_id")
        if not google_event_id or not parsed.get("date"):
            skipped += 1
            continue

        cursor.execute(
            """
            SELECT id, course_id, type, title, date, due_date, raw_text, status,
                   google_event_id, google_calendar_id, google_calendar_name,
                   google_updated_at, updated_at
            FROM course_events
            WHERE google_event_id = ? AND (google_calendar_id = ? OR google_calendar_id IS NULL)
            """,
            (google_event_id, calendar_id),
        )
        row = cursor.fetchone()
        if row:
            local_event = {
                "id": row[0],
                "course_id": row[1],
                "type": row[2],
                "title": row[3],
                "date": row[4],
                "due_date": row[5],
                "raw_text": row[6],
                "status": row[7],
                "google_event_id": row[8],
                "google_calendar_id": row[9],
                "google_calendar_name": row[10],
                "google_updated_at": row[11],
                "updated_at": row[12],
            }

            local_updated = parse_local_datetime(local_event.get("updated_at"))
            google_updated = parse_rfc3339(parsed.get("google_updated_at"))

            if local_updated and google_updated and local_updated > google_updated:
                if local_event["id"] not in local_to_push_ids:
                    local_to_push.append(local_event)
                    local_to_push_ids.add(local_event["id"])
                continue

            updated_at = parsed.get("google_updated_at") or now
            cursor.execute(
                """
                UPDATE course_events
                SET type = ?, title = ?, date = ?, due_date = ?, raw_text = ?, status = ?,
                    google_calendar_id = ?, google_calendar_name = ?, google_updated_at = ?,
                    google_synced_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    parsed["type"],
                    parsed["title"],
                    parsed["date"],
                    local_event.get("due_date"),
                    parsed["raw_text"],
                    local_event.get("status") or parsed["status"],
                    parsed.get("google_calendar_id"),
                    parsed.get("google_calendar_name"),
                    parsed.get("google_updated_at"),
                    now,
                    updated_at,
                    local_event["id"],
                ),
            )
            updated += 1
        else:
            updated_at = parsed.get("google_updated_at") or now
            course_id_to_use = resolve_course_id(parsed.get("google_calendar_name"))
            cursor.execute(
                """
                INSERT INTO course_events (
                    course_id, type, title, date, raw_text, status,
                    created_at, updated_at, google_event_id, google_calendar_id,
                    google_calendar_name, google_updated_at, google_synced_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    course_id_to_use,
                    parsed["type"],
                    parsed["title"],
                    parsed["date"],
                    parsed["raw_text"],
                    parsed["status"],
                    now,
                    updated_at,
                    google_event_id,
                    parsed.get("google_calendar_id"),
                    parsed.get("google_calendar_name"),
                    parsed.get("google_updated_at"),
                    now,
                ),
            )
            imported += 1

    cursor.execute(
        """
        SELECT id, google_event_id, google_calendar_id
        FROM course_events
        WHERE google_event_id IS NOT NULL AND google_calendar_id IS NOT NULL
        """
    )
    for row in cursor.fetchall():
        local_id, google_event_id, calendar_id = row
        if str(google_event_id).startswith("task_"):
            continue
        if calendar_id not in selected_ids:
            continue
        if (calendar_id, google_event_id) not in gcal_event_keys:
            cursor.execute("DELETE FROM course_events WHERE id = ?", (local_id,))
            deleted += 1

    cursor.execute(
        """
        SELECT id, course_id, type, title, date, due_date, raw_text, status,
               google_event_id, google_calendar_id, google_calendar_name,
               google_updated_at, updated_at
        FROM course_events
        """
    )
    for row in cursor.fetchall():
        local_event = {
            "id": row[0],
            "course_id": row[1],
            "type": row[2],
            "title": row[3],
            "date": row[4],
            "due_date": row[5],
            "raw_text": row[6],
            "status": row[7],
            "google_event_id": row[8],
            "google_calendar_id": row[9],
            "google_calendar_name": row[10],
            "google_updated_at": row[11],
            "updated_at": row[12],
        }
        if course_id and local_event.get("course_id") != course_id:
            continue
        if str(local_event.get("google_event_id") or "").startswith("task_"):
            continue
        if local_event["id"] in local_to_push_ids:
            continue

        local_updated = parse_local_datetime(local_event.get("updated_at"))
        google_updated = parse_rfc3339(local_event.get("google_updated_at"))

        if not local_event.get("google_event_id"):
            local_to_push.append(local_event)
            local_to_push_ids.add(local_event["id"])
            continue

        if local_updated and (not google_updated or local_updated > google_updated):
            local_to_push.append(local_event)
            local_to_push_ids.add(local_event["id"])

    for local_event in local_to_push:
        calendar_id = local_event.get("google_calendar_id") or default_calendar_id
        if calendar_id not in selected_ids:
            continue

        access_role = calendar_meta.get(calendar_id, {}).get("access_role")
        if access_role and access_role not in ("owner", "writer"):
            errors.append(
                f"Calendar '{calendar_meta.get(calendar_id, {}).get('name')}' is read-only"
            )
            continue

        calendar_timezone = (
            calendar_meta.get(calendar_id, {}).get("time_zone")
            or config.get("timezone")
            or "UTC"
        )
        updated_event, error = upsert_gcal_event(
            service, calendar_id, local_event, calendar_timezone
        )
        if error:
            errors.append(error)
            continue
        if not updated_event:
            skipped += 1
            continue

        cursor.execute(
            """
            UPDATE course_events
            SET google_event_id = ?, google_calendar_id = ?, google_calendar_name = ?,
                google_updated_at = ?, google_synced_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                updated_event.get("id"),
                calendar_id,
                calendar_meta.get(calendar_id, {}).get("name"),
                updated_event.get("updated"),
                now,
                local_event.get("updated_at") or now,
                local_event["id"],
            ),
        )
        pushed += 1

    conn.commit()
    conn.close()

    return {
        "success": True,
        "imported": imported,
        "updated": updated,
        "pushed": pushed,
        "deleted": deleted,
        "skipped": skipped,
        "errors": errors,
        "default_calendar_id": default_calendar_id,
        "calendars": [
            {
                "id": cal_id,
                "name": calendar_meta.get(cal_id, {}).get("name"),
                "access_role": calendar_meta.get(cal_id, {}).get("access_role"),
            }
            for cal_id in selected_ids
        ],
        "sync_all": sync_all,
    }


def sync_to_database(course_id=None):
    return sync_bidirectional(course_id=course_id)


def get_tasks_service():
    """Get authenticated Google Tasks service"""
    if not GOOGLE_API_AVAILABLE:
        return None

    creds = load_token()
    if not creds or not creds.valid:
        return None

    return build("tasks", "v1", credentials=creds)


def fetch_task_lists():
    """Fetch available Google Task lists"""
    service = get_tasks_service()
    if not service:
        return [], "Not authenticated"

    try:
        result = service.tasklists().list(maxResults=100).execute()
        return result.get("items", []), None
    except Exception as exc:
        return [], str(exc)


def resolve_task_lists(task_lists, config):
    """Resolve which task lists should be synced (default: Reclaim)."""
    if not task_lists:
        return [], "No Google Tasks lists found"

    target_id = (config or {}).get("tasks_list_id")
    target_name = (config or {}).get("tasks_list_name") or "Reclaim"

    if target_id:
        matches = [
            tasklist for tasklist in task_lists if tasklist.get("id") == target_id
        ]
        if matches:
            return matches, None
        return [], f"Google Tasks list id not found: {target_id}"

    if target_name:
        matches = [
            tasklist
            for tasklist in task_lists
            if (tasklist.get("title") or "").lower() == target_name.lower()
        ]
        if matches:
            return matches, None
        return [], f"Google Tasks list '{target_name}' not found"

    return task_lists, None


def fetch_tasks(tasklist_id):
    """Fetch tasks for a given list"""
    service = get_tasks_service()
    if not service:
        return [], "Not authenticated"

    try:
        result = (
            service.tasks()
            .list(
                tasklist=tasklist_id,
                showCompleted=True,
                showDeleted=False,
                showHidden=False,
                maxResults=200,
            )
            .execute()
        )
        return result.get("items", []), None
    except Exception as exc:
        return [], str(exc)


def parse_google_task(task, tasklist_title=None):
    """Parse Google Task to Brain event format"""
    title = task.get("title") or "Untitled Task"
    due = task.get("due") or ""
    date = due[:10] if due else None
    status = "completed" if task.get("status") == "completed" else "pending"

    raw_parts = ["Time: All day", "Location: Google Tasks"]
    if tasklist_title:
        raw_parts[1] = f"Location: {tasklist_title}"
    notes = (task.get("notes") or "").strip()
    if notes:
        raw_parts.append(f"Notes: {notes}")

    return {
        "google_task_id": task.get("id"),
        "title": title,
        "date": date,
        "type": "assignment",
        "raw_text": " | ".join(raw_parts),
        "status": status,
    }


def sync_tasks_to_database(course_id=None):
    """Sync Google Tasks into course events"""
    task_lists, error = fetch_task_lists()
    if error:
        return {"success": False, "error": error, "imported": 0, "skipped": 0}

    config = load_gcal_config() or {}
    target_lists, list_error = resolve_task_lists(task_lists, config)
    if list_error:
        return {"success": False, "error": list_error, "imported": 0, "skipped": 0}

    imported = 0
    skipped = 0

    init_database()
    conn = get_connection()
    cursor = conn.cursor()

    for tasklist in target_lists:
        tasklist_id = tasklist.get("id")
        if not tasklist_id:
            continue

        tasks, error = fetch_tasks(tasklist_id)
        if error:
            conn.close()
            return {
                "success": False,
                "error": error,
                "imported": imported,
                "skipped": skipped,
            }

        for task in tasks:
            parsed = parse_google_task(task, tasklist.get("title"))
            if not parsed.get("date") or not parsed.get("google_task_id"):
                skipped += 1
                continue

            google_event_id = f"task_{parsed['google_task_id']}"
            cursor.execute(
                "SELECT id FROM course_events WHERE google_event_id = ?",
                (google_event_id,),
            )
            if cursor.fetchone():
                skipped += 1
                continue

            course_id_to_use = course_id or ensure_calendar_course(
                cursor, tasklist.get("title") or "Google Tasks"
            )
            cursor.execute(
                """
                INSERT INTO course_events (
                    course_id, type, title, date, raw_text, status,
                    google_event_id, google_synced_at, google_updated_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    course_id_to_use,
                    parsed["type"],
                    parsed["title"],
                    parsed["date"],
                    parsed["raw_text"],
                    parsed["status"],
                    google_event_id,
                    datetime.now().isoformat(),
                    datetime.now().isoformat(),
                    datetime.now().isoformat(),
                ),
            )

            imported += 1

    conn.commit()
    conn.close()

    return {
        "success": True,
        "imported": imported,
        "skipped": skipped,
        "source": "tasks",
        "lists": [tasklist.get("title") for tasklist in target_lists],
    }


# -----------------------------------------------------------------------------
# Google Tasks API Helpers
# -----------------------------------------------------------------------------


def fetch_task_lists(service=None):
    """Fetch all task lists."""
    service = service or get_tasks_service()
    if not service:
        return [], "Not authenticated"

    try:
        results = service.tasklists().list(maxResults=100).execute()
        return results.get("items", []), None
    except Exception as e:
        return [], str(e)


def fetch_tasks_from_list(tasklist_id, service=None):
    """Fetch tasks from a specific list."""
    service = service or get_tasks_service()
    if not service:
        return [], "Not authenticated"

    try:
        results = (
            service.tasks()
            .list(tasklist=tasklist_id, showCompleted=True, showHidden=True)
            .execute()
        )
        return results.get("items", []), None
    except Exception as e:
        return [], str(e)


def create_google_task(tasklist_id, body, service=None):
    """Create a new task in the specified list."""
    service = service or get_tasks_service()
    if not service:
        return None, "Not authenticated"

    try:
        result = service.tasks().insert(tasklist=tasklist_id, body=body).execute()
        return result, None
    except Exception as e:
        return None, str(e)


def patch_google_task(tasklist_id, task_id, body, service=None):
    """Update a task's fields."""
    service = service or get_tasks_service()
    if not service:
        return None, "Not authenticated"

    try:
        result = (
            service.tasks()
            .patch(tasklist=tasklist_id, task=task_id, body=body)
            .execute()
        )
        return result, None
    except Exception as e:
        return None, str(e)


def delete_google_task(tasklist_id, task_id, service=None):
    """Delete a task."""
    service = service or get_tasks_service()
    if not service:
        return False, "Not authenticated"

    try:
        service.tasks().delete(tasklist=tasklist_id, task=task_id).execute()
        return True, None
    except Exception as e:
        return False, str(e)


def move_google_task(tasklist_id, task_id, previous=None, parent=None, service=None):
    """Move a task to a new position (parent/previous)."""
    service = service or get_tasks_service()
    if not service:
        return None, "Not authenticated"

    try:
        # tasks.move takes 'parent' and 'previous' as query parameters
        kwargs = {"tasklist": tasklist_id, "task": task_id}
        if parent:
            kwargs["parent"] = parent
        if previous:
            kwargs["previous"] = previous
        result = service.tasks().move(**kwargs).execute()
        return result, None
    except Exception as e:
        return None, str(e)


# -----------------------------------------------------------------------------
# Event Write Methods (v9.3)
# -----------------------------------------------------------------------------


def create_event(calendar_id, body, service=None):
    """Create a new event."""
    service = service or get_calendar_service()
    if not service:
        return None, "Not authenticated"
    try:
        event = service.events().insert(calendarId=calendar_id, body=body).execute()
        return event, None
    except Exception as e:
        return None, str(e)


def patch_event(calendar_id, event_id, body, service=None):
    """Update an existing event (patch)."""
    service = service or get_calendar_service()
    if not service:
        return None, "Not authenticated"
    try:
        event = (
            service.events()
            .patch(calendarId=calendar_id, eventId=event_id, body=body)
            .execute()
        )
        return event, None
    except Exception as e:
        return None, str(e)


def delete_event(calendar_id, event_id, service=None):
    """Delete an event."""
    service = service or get_calendar_service()
    if not service:
        return False, "Not authenticated"
    try:
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        return True, None
    except Exception as e:
        return False, str(e)
