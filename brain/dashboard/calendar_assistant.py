"""
Calendar Assistant - Simple stateless implementation using direct OpenAI API.

This module provides a calendar assistant that can:
- List events
- Create events (single or batch)
- Delete events by title
- Parse class schedules (MWF, TTh, etc.)
"""

import json
from datetime import datetime, timedelta
from typing import List, Optional, cast


from pathlib import Path

try:
    from openai import OpenAI

    OPENAI_AVAILABLE = True
except Exception:
    OpenAI = None
    OPENAI_AVAILABLE = False


# Import Google Calendar functions
from dashboard import gcal


# =============================================================================
# LOAD API CONFIG
# =============================================================================


def _load_api_config():
    """Load API configuration from api_config.json."""
    config_path = Path(__file__).parent.parent / "data" / "api_config.json"

    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                config = json.load(f)

            # Prefer OpenAI if set
            openai_key = config.get("openai_api_key", "").strip()
            if openai_key:
                return {"provider": "openai", "api_key": openai_key}

            # Fall back to OpenRouter
            openrouter_key = config.get("openrouter_api_key", "").strip()
            if openrouter_key:
                return {"provider": "openrouter", "api_key": openrouter_key}

        except Exception as e:
            print(f"[Calendar Assistant] Error loading config: {e}")

    return None


def _get_client():
    """Get configured OpenAI client."""
    api_config = _load_api_config()
    if not api_config:
        raise ValueError("No API key configured")
    if not OPENAI_AVAILABLE:
        raise ValueError("openai package not installed. Run: pip install openai")

    openai_client = cast(object, OpenAI)
    if api_config["provider"] == "openrouter":
        return openai_client(  # type: ignore[call-arg]
            api_key=api_config["api_key"],
            base_url="https://openrouter.ai/api/v1",
        )
    return openai_client(api_key=api_config["api_key"])  # type: ignore[call-arg]


def _normalize_datetime(value: str) -> str:
    normalized = value.replace(" ", "T")
    if len(normalized) == 16:
        normalized += ":00"
    return normalized


def _resolve_calendar_id(calendar_id: Optional[str]) -> tuple[str, str]:
    if calendar_id:
        return calendar_id, ""
    return "primary", " (defaulted to primary calendar)"


def _resolve_calendar_ids(
    calendar_id: Optional[str] = None,
    calendar_ids: Optional[List[str]] = None,
) -> tuple[List[str], str, str]:
    if calendar_id:
        return [calendar_id], calendar_id, ""
    if calendar_ids:
        return calendar_ids, calendar_ids[0], ""
    return ["primary"], "primary", " (defaulted to primary calendar)"


def _resolve_all_calendar_ids(
    calendar_id: Optional[str] = None,
    calendar_ids: Optional[List[str]] = None,
) -> tuple[List[str], str, str]:
    if calendar_id or calendar_ids:
        calendars_to_use, primary_calendar, calendar_note = _resolve_calendar_ids(
            calendar_id,
            calendar_ids,
        )
        return calendars_to_use, primary_calendar, calendar_note

    calendars, error = gcal.fetch_calendar_list()
    if error:
        raise ValueError(error)

    calendars_to_use = [cal.get("id") for cal in calendars if cal.get("id")]
    primary_calendar = next(
        (cal.get("id") for cal in calendars if cal.get("primary")),
        "primary",
    )
    calendar_note = " (searched all accessible calendars)"
    return calendars_to_use, primary_calendar, calendar_note


def _default_calendar_note(note: str) -> str:
    if "defaulted to primary" in note:
        return note
    return ""


def _format_gcal_error(error: str, prefix: str = "Error") -> str:
    if not error:
        return f"{prefix}: Unknown error"
    lower_error = error.lower()
    if "not authenticated" in lower_error or "unauthorized" in lower_error:
        return f"{prefix}: Not authenticated. Please connect Google Calendar."
    if "invalid_grant" in lower_error or "expired" in lower_error:
        return f"{prefix}: Token expired or revoked. Please reconnect Google Calendar."
    if (
        "insufficient" in lower_error
        or "permission" in lower_error
        or "forbidden" in lower_error
        or "403" in lower_error
    ):
        return f"{prefix}: Permission denied for that calendar."
    return f"{prefix}: {error}"


# =============================================================================
# TOOL IMPLEMENTATIONS
# =============================================================================


def list_events(
    start_date: str,
    end_date: str,
    calendar_id: Optional[str] = None,
    calendar_ids: Optional[List[str]] = None,
) -> str:
    """
    List all calendar events in a date range.

    Args:
        start_date: Start date in "YYYY-MM-DD" format
        end_date: End date in "YYYY-MM-DD" format

    Returns:
        Formatted list of events
    """
    service = gcal.get_calendar_service()
    if not service:
        return "Error: Not authenticated with Google Calendar"

    time_min = f"{start_date}T00:00:00Z"
    time_max = f"{end_date}T23:59:59Z"

    try:
        calendars_to_use, primary_calendar, calendar_note = _resolve_all_calendar_ids(
            calendar_id,
            calendar_ids,
        )
    except ValueError as exc:
        return _format_gcal_error(str(exc), prefix="Error listing events")

    try:
        events = []
        for cal_id in calendars_to_use:
            events_result = (
                service.events()
                .list(
                    calendarId=cal_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    maxResults=50,  # Limit to avoid token overflow
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )
            for item in events_result.get("items", []):
                item["_calendar_id"] = cal_id
                events.append(item)

        if not events:
            calendar_label = ", ".join(calendars_to_use)
            return (
                f"No events found between {start_date} and {end_date}"
                f" on calendars {calendar_label}{calendar_note}"
            )

        lines = []
        for i, ev in enumerate(events, 1):
            title = ev.get("summary", "Untitled")
            start = ev.get("start", {}).get(
                "dateTime", ev.get("start", {}).get("date", "")
            )
            calendar_label = ev.get("_calendar_id") or primary_calendar
            if "T" in start:
                date_part = start[:10]
                time_part = start[11:16]
                lines.append(
                    f"{i}. {title} - {date_part} {time_part} (calendar {calendar_label})"
                )
            else:
                lines.append(
                    f"{i}. {title} - {start} (all day, calendar {calendar_label})"
                )

        calendar_label = ", ".join(calendars_to_use)
        return (
            f"Found {len(events)} event(s) across calendars {calendar_label}"
            f"{calendar_note}:\n" + "\n".join(lines)
        )

    except Exception as e:
        return _format_gcal_error(str(e))


def create_event(
    title: str,
    start_time: str,
    end_time: str,
    description: str = "",
    calendar_id: Optional[str] = None,
    calendar_ids: Optional[List[str]] = None,
) -> str:
    """
    Create a single calendar event.

    Args:
        title: Event title
        start_time: Start time in "YYYY-MM-DD HH:MM" format
        end_time: End time in "YYYY-MM-DD HH:MM" format
        description: Optional description

    Returns:
        Success message or error
    """
    start_dt = _normalize_datetime(start_time)
    end_dt = _normalize_datetime(end_time)

    body = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start_dt, "timeZone": "America/Chicago"},
        "end": {"dateTime": end_dt, "timeZone": "America/Chicago"},
    }

    calendars_to_use, primary_calendar, calendar_note = _resolve_calendar_ids(
        calendar_id,
        calendar_ids,
    )
    calendar_to_use = primary_calendar
    calendar_note = _default_calendar_note(calendar_note)

    res, err = gcal.create_event(calendar_to_use, body)

    if err:
        return _format_gcal_error(err, prefix="Error creating event")
    if res and res.get("id"):
        _log_calendar_action(
            action_type="create_event",
            target_id=res.get("id"),
            pre_state=None,
            post_state=res,
            description=title,
        )
    event_id = res.get("id") if res else ""
    return (
        f"Created '{title}' on {start_time[:10]} at {start_time[11:16]}"
        f" in calendar '{calendar_to_use}'{calendar_note}."
        f" Calendar ID: {calendar_to_use}. Event ID: {event_id}"
    )


def batch_create_events(
    events: List[dict],
    calendar_id: Optional[str] = None,
    calendar_ids: Optional[List[str]] = None,
) -> str:
    """
    Create multiple calendar events at once.

    Args:
        events: List of event dicts with: title, start_time, end_time, description

    Returns:
        Summary of created events
    """
    created = []
    failed = []

    for ev in events:
        result = create_event(
            title=ev.get("title", ""),
            start_time=ev.get("start_time", ""),
            end_time=ev.get("end_time", ""),
            description=ev.get("description", ""),
            calendar_id=calendar_id or ev.get("calendar_id"),
            calendar_ids=calendar_ids or ev.get("calendar_ids"),
        )

        if result.startswith("Created"):
            created.append(ev.get("title", ""))
        else:
            failed.append(f"{ev.get('title', 'Unknown')}: {result}")

    result = f"Created {len(created)} event(s): {', '.join(created)}"
    if failed:
        result += f"\nFailed: {'; '.join(failed)}"
    return result


def _extract_calendar_default_note(message: str) -> str:
    if "defaulted to primary" in message:
        return " (defaulted to primary calendar)"
    return ""


def delete_event_by_title(
    title_query: str,
    date: str = "",
    calendar_id: Optional[str] = None,
    calendar_ids: Optional[List[str]] = None,
) -> str:
    """
    Delete a calendar event by searching for its title.

    Args:
        title_query: Text to search for in event titles
        date: Optional date filter in "YYYY-MM-DD" format

    Returns:
        Confirmation or error message
    """
    service = gcal.get_calendar_service()
    if not service:
        return "Error: Not authenticated with Google Calendar"

    now = datetime.utcnow()
    time_min = (now - timedelta(days=30)).isoformat() + "Z"
    time_max = (now + timedelta(days=90)).isoformat() + "Z"

    if date:
        time_min = f"{date}T00:00:00Z"
        time_max = f"{date}T23:59:59Z"

    try:
        calendars_to_use, primary_calendar, calendar_note = _resolve_all_calendar_ids(
            calendar_id,
            calendar_ids,
        )
    except ValueError as exc:
        return _format_gcal_error(str(exc), prefix="Error deleting event")

    try:
        events = []
        for cal_id in calendars_to_use:
            events_result = (
                service.events()
                .list(
                    calendarId=cal_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    maxResults=20,
                    singleEvents=True,
                    orderBy="startTime",
                    q=title_query,
                )
                .execute()
            )
            for item in events_result.get("items", []):
                item["_calendar_id"] = cal_id
                events.append(item)

        if not events:
            calendar_label = ", ".join(calendars_to_use)
            return (
                f"No events found matching '{title_query}'"
                f" on calendars {calendar_label}{calendar_note}"
            )

        event = events[0]
        eid = event.get("id")
        event_calendar_id = event.get("_calendar_id") or primary_calendar
        title = event.get("summary", "Untitled")

        success, err = gcal.delete_event(event_calendar_id, eid)
        if not success:
            return _format_gcal_error(err or "", prefix="Error deleting event")
        if eid:
            _log_calendar_action(
                action_type="delete_event",
                target_id=eid,
                pre_state=event,
                post_state=None,
                description=title,
            )
        return (
            f"Deleted '{title}' from calendar '{event_calendar_id}'"
            f"{calendar_note}. Calendar ID: {event_calendar_id}. Event ID: {eid}"
        )

    except Exception as e:
        return _format_gcal_error(str(e))


def update_event(
    event_id: str,
    title: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    description: Optional[str] = None,
    calendar_id: Optional[str] = None,
    calendar_ids: Optional[List[str]] = None,
) -> str:
    """
    Update a calendar event by event id.

    Args:
        event_id: Google event id
        title: Updated title
        start_time: Updated start time in "YYYY-MM-DD HH:MM" format
        end_time: Updated end time in "YYYY-MM-DD HH:MM" format
        description: Updated description

    Returns:
        Confirmation or error message
    """
    service = gcal.get_calendar_service()
    if not service:
        return "Error: Not authenticated with Google Calendar"

    try:
        calendars_to_use, primary_calendar, calendar_note = _resolve_all_calendar_ids(
            calendar_id,
            calendar_ids,
        )
    except ValueError as exc:
        return _format_gcal_error(str(exc), prefix="Error updating event")

    for cal_id in calendars_to_use:
        try:
            event = service.events().get(calendarId=cal_id, eventId=event_id).execute()
        except Exception:
            event = None

        if not event:
            continue

        body = dict(event)
        if title is not None:
            body["summary"] = title
        if description is not None:
            body["description"] = description
        if start_time:
            body["start"] = {
                "dateTime": _normalize_datetime(start_time),
                "timeZone": "America/Chicago",
            }
        if end_time:
            body["end"] = {
                "dateTime": _normalize_datetime(end_time),
                "timeZone": "America/Chicago",
            }

        res, err = gcal.patch_event(cal_id, event_id, body, service=service)
        if err:
            return _format_gcal_error(err, prefix="Error updating event")
        if res and res.get("id"):
            _log_calendar_action(
                action_type="update_event",
                target_id=res.get("id"),
                pre_state=event,
                post_state=res,
                description=title or event.get("summary", "Untitled"),
            )
        updated_title = res.get("summary") if res else title or "Untitled"
        calendar_hint = cal_id or primary_calendar
        calendar_hint_note = _extract_calendar_default_note(calendar_note)
        return (
            f"Updated '{updated_title}' in calendar '{calendar_hint}'"
            f"{calendar_hint_note}. Calendar ID: {calendar_hint}. Event ID: {event_id}"
        )

    calendar_label = ", ".join(calendars_to_use)
    return (
        f"Error updating event: Event ID '{event_id}' not found on calendars"
        f" {calendar_label}{calendar_note}"
    )


def batch_delete_events(
    title_queries: List[str],
    calendar_id: Optional[str] = None,
    calendar_ids: Optional[List[str]] = None,
) -> str:
    """Delete multiple events by title."""
    deleted = []
    failed = []

    for query in title_queries:
        result = delete_event_by_title(
            query,
            calendar_id=calendar_id,
            calendar_ids=calendar_ids,
        )

        if result.startswith("Deleted"):
            deleted.append(query)
        else:
            failed.append(f"{query}: {result}")

    result = f"Deleted {len(deleted)} event(s): {', '.join(deleted)}"
    if failed:
        result += f"\nFailed: {'; '.join(failed)}"
    return result


# =============================================================================
# TOOL DEFINITIONS FOR OPENAI API
# =============================================================================


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_events",
            "description": "List all calendar events in a date range",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Start date in YYYY-MM-DD format",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date in YYYY-MM-DD format",
                    },
                    "calendar_id": {
                        "type": "string",
                        "description": "Optional calendar ID (defaults to primary)",
                    },
                    "calendar_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of calendar IDs",
                    },
                },
                "required": ["start_date", "end_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_event",
            "description": "Create a single calendar event",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Event title"},
                    "start_time": {
                        "type": "string",
                        "description": "Start time in 'YYYY-MM-DD HH:MM' format",
                    },
                    "end_time": {
                        "type": "string",
                        "description": "End time in 'YYYY-MM-DD HH:MM' format",
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional event description",
                    },
                    "calendar_id": {
                        "type": "string",
                        "description": "Optional calendar ID (defaults to primary)",
                    },
                    "calendar_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of calendar IDs",
                    },
                },
                "required": ["title", "start_time", "end_time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_event",
            "description": "Update a calendar event by event id",
            "parameters": {
                "type": "object",
                "properties": {
                    "event_id": {
                        "type": "string",
                        "description": "Google event ID",
                    },
                    "title": {"type": "string", "description": "Updated title"},
                    "start_time": {
                        "type": "string",
                        "description": "Updated start time in 'YYYY-MM-DD HH:MM' format",
                    },
                    "end_time": {
                        "type": "string",
                        "description": "Updated end time in 'YYYY-MM-DD HH:MM' format",
                    },
                    "description": {
                        "type": "string",
                        "description": "Updated description",
                    },
                    "calendar_id": {
                        "type": "string",
                        "description": "Optional calendar ID (defaults to primary)",
                    },
                    "calendar_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of calendar IDs",
                    },
                },
                "required": ["event_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "batch_create_events",
            "description": "Create multiple calendar events at once",
            "parameters": {
                "type": "object",
                "properties": {
                    "calendar_id": {
                        "type": "string",
                        "description": "Optional calendar ID (defaults to primary)",
                    },
                    "calendar_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of calendar IDs",
                    },
                    "events": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "start_time": {"type": "string"},
                                "end_time": {"type": "string"},
                                "description": {"type": "string"},
                                "calendar_id": {"type": "string"},
                                "calendar_ids": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                            },
                            "required": ["title", "start_time", "end_time"],
                        },
                        "description": "List of events to create",
                    },
                },
                "required": ["events"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_event_by_title",
            "description": "Delete a calendar event by searching for its title",
            "parameters": {
                "type": "object",
                "properties": {
                    "title_query": {
                        "type": "string",
                        "description": "Text to search for in event titles",
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional date filter in YYYY-MM-DD format",
                    },
                    "calendar_id": {
                        "type": "string",
                        "description": "Optional calendar ID (defaults to primary)",
                    },
                    "calendar_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of calendar IDs",
                    },
                },
                "required": ["title_query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "batch_delete_events",
            "description": "Delete multiple events by title search",
            "parameters": {
                "type": "object",
                "properties": {
                    "calendar_id": {
                        "type": "string",
                        "description": "Optional calendar ID (defaults to primary)",
                    },
                    "calendar_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of calendar IDs",
                    },
                    "title_queries": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of title search strings",
                    },
                },
                "required": ["title_queries"],
            },
        },
    },
]

# Map tool names to functions
TOOL_MAP = {
    "list_events": list_events,
    "create_event": create_event,
    "update_event": update_event,
    "batch_create_events": batch_create_events,
    "delete_event_by_title": delete_event_by_title,
    "batch_delete_events": batch_delete_events,
}


def _log_calendar_action(
    action_type: str,
    target_id: str,
    pre_state: dict | None,
    post_state: dict | None,
    description: str = "",
):
    """Write a small undo record for calendar actions (best-effort)."""
    try:
        from db_setup import get_connection

        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO calendar_action_ledger (action_type, target_id, pre_state, post_state, description)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                action_type,
                target_id or "",
                json.dumps(pre_state) if pre_state else None,
                json.dumps(post_state) if post_state else None,
                description or "",
            ),
        )
        conn.commit()
        conn.close()
    except Exception:
        # Ledger logging is optional; fail silently
        pass


# =============================================================================
# MAIN ASSISTANT FUNCTION
# =============================================================================


def get_date_context():
    """Get current date info for the system prompt."""
    now = datetime.now()
    return {
        "current_datetime": now.strftime("%Y-%m-%d %H:%M:%S"),
        "current_date": now.strftime("%Y-%m-%d"),
        "day_of_week": now.strftime("%A"),
        "next_monday": (now + timedelta(days=(7 - now.weekday()) % 7)).strftime(
            "%Y-%m-%d"
        ),
    }


def run_calendar_assistant(user_message: str) -> dict:
    """
    Run the calendar assistant with the given message.

    Args:
        user_message: The user's message

    Returns:
        dict with 'response' (str) and 'success' (bool)
    """
    try:
        client = _get_client()
        date_ctx = get_date_context()

        system_prompt = f"""You are a Calendar Assistant that manages Google Calendar events.
Current Date/Time: {date_ctx["current_datetime"]} ({date_ctx["day_of_week"]})

RULES:
1. ALWAYS use the provided tools for calendar operations. Never make up data.
2. For listing events, call list_events with specific dates.
3. For creating events, use format "YYYY-MM-DD HH:MM" for times.
4. Default event duration is 1 hour if end time not specified.
5. If the user does not specify a calendar, omit calendar_id for list/delete so tools search all calendars.
6. If the user does not specify a calendar for create/update, omit calendar_id so tools default to primary.
7. Always confirm the calendar ID used and the event ID for creates/updates/deletes.


When parsing class schedules:
- MWF = Monday, Wednesday, Friday
- TTh or TR = Tuesday, Thursday
- MW = Monday, Wednesday

Start recurring events from {date_ctx["next_monday"]} for the upcoming week.

Be concise. Confirm what was done."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

        # First API call
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",  # Works with both OpenAI and OpenRouter
            messages=cast(list, messages),
            tools=cast(list, TOOLS),
            tool_choice="auto",
        )

        assistant_message = response.choices[0].message

        # Check if tool calls are needed
        max_iterations = 5
        iteration = 0

        while assistant_message.tool_calls and iteration < max_iterations:
            iteration += 1
            messages.append(cast(dict, assistant_message))

            # Execute each tool call
            for tool_call in assistant_message.tool_calls:
                tool_call_data = cast(dict, tool_call)
                function_data = cast(dict, tool_call_data.get("function", {}))
                func_name = function_data.get("name", "")
                func_args = json.loads(function_data.get("arguments", "{}"))

                if func_name in TOOL_MAP:
                    result = TOOL_MAP[func_name](**func_args)
                else:
                    result = f"Unknown tool: {func_name}"

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call_data.get("id") or "",
                        "content": result,
                    }
                )

            # Get next response
            response = client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=cast(list, messages),
                tools=cast(list, TOOLS),
                tool_choice="auto",
            )
            assistant_message = response.choices[0].message

        # Return final response
        return {"response": assistant_message.content, "success": True}

    except Exception as e:
        import traceback

        traceback.print_exc()
        return {"response": f"Error: {str(e)}", "success": False, "error": str(e)}
