
from flask import Blueprint, jsonify, request
from datetime import datetime
import sqlite3
from typing import List, Dict, Any

# Import internal modules from the "Brain"
from db_setup import get_connection
from scholar.brain_reader import (
    get_all_sessions, 
    get_session_by_id, 
    get_session_count,
    calculate_session_metrics
)
from scholar.friction_alerts import generate_alerts
from dashboard.syllabus import fetch_all_courses_and_events

# Define the Blueprint that mimics the Node.js API
adapter_bp = Blueprint("api_adapter", __name__, url_prefix="/api")

# ==============================================================================
# SESSIONS
# ==============================================================================

@adapter_bp.route("/sessions", methods=["GET"])
def get_sessions():
    """
    Mimics: app.get("/api/sessions")
    Returns a list of study sessions.
    """
    raw_sessions = get_all_sessions()
    
    serialized = []
    for s in raw_sessions:
        # SessionRecord is a dataclass, convert to dict
        s_dict = s.__dict__ if hasattr(s, "__dict__") else s
        
        # safely get values
        understanding = s_dict.get("understanding_level")
        if understanding is None:
            understanding = 0
            
        # Robust date construction
        raw_date = s_dict.get('session_date')
        if raw_date and s_dict.get('session_time'):
            date_str = f"{raw_date}T{s_dict.get('session_time')}"
        else:
            date_str = raw_date
            
        final_date = safe_iso_date(date_str) or datetime.now().isoformat()
            
        mapped = {
            "id": s_dict.get("id"),
            "type": "study", # hardcoded for now or map from study_mode
            "topic": s_dict.get("main_topic") or s_dict.get("topic") or "Untitled Session",
            "date": final_date,
            "durationMinutes": s_dict.get("duration_minutes", 0),
            "understanding": understanding,
            "cards": s_dict.get("anki_cards_count", 0) or 0,
            "errors": 0 
        }
        serialized.append(mapped)
        
    return jsonify(serialized)

@adapter_bp.route("/sessions/stats", methods=["GET"])
def get_session_stats():
    """
    Mimics: app.get("/api/sessions/stats")
    """
    from scholar.brain_reader import get_session_count, get_average_metrics
    
    count = get_session_count()
    avgs = get_average_metrics()
    
    return jsonify({
        "total": count,
        "avgErrors": 0, # Placeholder
        "totalCards": int(avgs.get("avg_duration_minutes", 0) * count * 0.5) # Estimate for now
    })

@adapter_bp.route("/sessions/<int:session_id>", methods=["GET"])
def get_single_session(session_id):
    session = get_session_by_id(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
        
    s_dict = session.__dict__ if hasattr(session, "__dict__") else session
    return jsonify(s_dict)

@adapter_bp.route("/sessions", methods=["POST"])
def create_session():
    """
    Mimics: app.post("/api/sessions")
    Creates a real session in the SQLite DB.
    """
    data = request.json
    
    topic = data.get("topic", "Untitled")
    date_str = datetime.now().strftime("%Y-%m-%d")
    time_str = datetime.now().strftime("%H:%M:%S")
    
    # Manual insertion since brain_reader is read-only
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO sessions (
                session_date, session_time, main_topic, study_mode, 
                created_at, duration_minutes, understanding_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            date_str, 
            time_str, 
            topic, 
            "Core", # Default mode
            datetime.now().isoformat(),
            60, # Default duration target
            3   # Default neutral understanding
        ))
        conn.commit()
        new_id = cursor.lastrowid
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

    return jsonify({
        "id": new_id,
        "topic": topic,
        "date": f"{date_str}T{time_str}",
        "type": "study"
    }), 201

# ==============================================================================
# EVENTS (Calendar)
# ==============================================================================

# Helper for date safety
def safe_iso_date(date_val):
    if not date_val:
        return None
    try:
        if isinstance(date_val, str):
            if "T" in date_val: return date_val
            return f"{date_val}T00:00:00"
        if hasattr(date_val, "isoformat"):
            return date_val.isoformat()
    except:
        pass
    return None

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
            
            serialized.append({
                "id": ev["id"],
                "title": title,
                "date": start_date, 
                "endDate": ev.get("due_date"),
                "allDay": True,
                "eventType": (ev.get("type") or "event").lower(),
                "course": c_info.get("code") or c_info.get("name"),
                "color": c_info.get("color") or "#ef4444",
                "status": ev.get("status", "pending")
            })
            
        return jsonify(serialized)
    except Exception as e:
        print(f"Calendar Error: {e}")
        return jsonify([]), 500

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
            
            tasks.append({
                "id": r[0],
                "title": r[1],
                "status": "pending", 
                "createdAt": created_at
            })
            
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
    from brain.db_setup import get_connection
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
            
            proposals.append({
                "id": r[0],
                "proposalId": r[5] or str(r[0]), 
                "summary": r[1] or "Untitled Proposal",
                "status": (r[3] or "DRAFT").upper(),
                "priority": "MED",
                "targetSystem": r[2],
                "createdAt": created_at
            })
        conn.close()
    except Exception as e:
        print(f"Proposal Fetch Error: {e}")
        return jsonify([]), 500
        
    return jsonify(proposals)

@adapter_bp.route("/tasks", methods=["POST"])
def create_task():
    """
    Mimics: app.post("/api/tasks")
    """
    # TODO: Implement manual task creation if needed
    return jsonify({"id": 999, "status": "mocked"}), 201


# ==============================================================================
# AI CHAT (The Connector)
# ==============================================================================

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
            sources=TutorSourceSelector()
        )
        
        # Process with Tutor Engine
        response = process_tutor_turn(query)
        
        # Log the turn
        log_tutor_turn(query, response)
        
        # Return in format expected by React frontend
        return jsonify({
            "id": int(datetime.now().timestamp()),
            "sender": "ai",
            "content": response.answer,
            "timestamp": datetime.now().isoformat(),
            "unverified": response.unverified,
            "citations": [asdict(c) for c in response.citations] if response.citations else []
        })

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
    from brain.dashboard import gcal
    
    status = gcal.check_auth_status()
    # status = { connected: bool, email: str, error: str }
    
    # Frontend expects: configured, connected, hasClientId...
    is_connected = status.get("connected", False)
    error_msg = status.get("error", "")
    
    # Simple heuristic: if specific config error, then not configured
    is_configured = "configured" not in error_msg.lower()
    
    return jsonify({
        "configured": is_configured,
        "connected": is_connected,
        "hasClientId": is_configured, 
        "hasClientSecret": is_configured,
        "email": status.get("email")
    })

@adapter_bp.route("/google/auth", methods=["GET"])
def google_auth_url():
    """
    Mimics: app.get("/api/google/auth")
    Returns the OAuth URL to start the flow.
    """
    from brain.dashboard import gcal
    
    url, state_or_msg = gcal.get_auth_url()
    if not url:
        return jsonify({"error": state_or_msg}), 500
        
    return jsonify({"authUrl": url})

@adapter_bp.route("/gcal/oauth/callback", methods=["GET"])
def google_callback():
    """
    The redirect target for Google OAuth.
    Exchanges code for token, then redirects user back to dashboard.
    """
    from flask import redirect
    from brain.dashboard import gcal
    
    code = request.args.get("code")
    if not code:
        return "Missing code", 400
        
    success, msg = gcal.complete_oauth(code)
    
    if success:
        # Trigger an initial sync in background?
        # For now, just redirect home
        return redirect("/")
    
    return f"Google Auth Failed: {msg}", 400

@adapter_bp.route("/google/disconnect", methods=["POST"])
def google_disconnect():
    """
    Mimics: app.post("/api/google/disconnect")
    """
    from brain.dashboard import gcal
    gcal.revoke_auth()
    return jsonify({"success": True})


# ==============================================================================
# GOOGLE DATA PROXIES (Direct Fetch)
# ==============================================================================

@adapter_bp.route("/google-calendar/calendars", methods=["GET"])
def get_google_calendars():
    from brain.dashboard import gcal
    calendars, error = gcal.fetch_calendar_list()
    if error:
        return jsonify({"error": error}), 500
        
    # Inject backgroundColor if missing (gcal.py doesn't always expose it raw)
    # But usually 'backgroundColor' is in the calendar resource
    # Frontend expects: id, summary, backgroundColor
    return jsonify(calendars)

@adapter_bp.route("/google-calendar/events", methods=["GET"])
def get_google_events():
    from brain.dashboard import gcal
    from datetime import datetime
    
    # Frontend sends timeMin, timeMax
    # gcal.fetch_calendar_events currently uses hardcoded logic or list of IDs
    # We need to fetch all selected calendars. 
    # For now, let's fetch 'primary' or all configured.
    
    config = gcal.load_gcal_config() or {}
    # Force visibility of ALL calendars for the frontend
    config["sync_all_calendars"] = True 
    
    calendars, _ = gcal.fetch_calendar_list()
    selected_ids, _, _, calendar_meta = gcal.resolve_calendar_selection(config, calendars)
    
    # Build a color map
    calendar_colors = {c['id']: c.get('backgroundColor', '#ef4444') for c in calendars}
    
    # Calculate days ahead based on timeMax if possible, else default 90
    days = 90
    time_max = request.args.get("timeMax")
    if time_max:
        try:
            dt_max = datetime.fromisoformat(time_max.replace("Z", "+00:00"))
            dt_now = datetime.now(dt_max.tzinfo)
            days = max(1, (dt_max - dt_now).days)
        except:
            pass
            
    events, error = gcal.fetch_calendar_events(selected_ids, calendar_meta, days_ahead=days)
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
    from brain.dashboard import gcal
    
    data = request.json
    calendar_id = data.get("calendarId")
    if not calendar_id:
        return jsonify({"error": "Missing calendarId"}), 400
        
    # Construct "local_event" format expected by gcal.upsert_gcal_event
    local_event = {
        "title": data.get("title"),
        "date": data.get("date"), # ISO string
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
             end_dt = datetime.fromisoformat(data.get("endDate").replace("Z", "+00:00")) if data.get("endDate") else start_dt + timedelta(days=1)
             start = {"date": start_dt.date().isoformat()}
             end = {"date": end_dt.date().isoformat()}
        else:
             end_dt = datetime.fromisoformat(data.get("endDate").replace("Z", "+00:00")) if data.get("endDate") else start_dt + timedelta(hours=1)
             start = {"dateTime": start_dt.isoformat(), "timeZone": timezone}
             end = {"dateTime": end_dt.isoformat(), "timeZone": timezone}
             
        body = {
            "summary": data.get("title", "Untitled"),
            "start": start,
            "end": end,
            "description": data.get("description", "")
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
    from brain.dashboard import gcal
    
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
                 return jsonify({"error": f"Permission denied: You have '{role}' access to this calendar."}), 403

        # 2. Fetch existing event (Crucial for patches to minimal fields)
        try:
             existing_event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
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
        updated_event = service.events().patch(calendarId=calendar_id, eventId=event_id, body=body).execute()
        
        return jsonify(updated_event)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@adapter_bp.route("/google-calendar/events/<event_id>", methods=["DELETE"])
def delete_google_event(event_id):
    from brain.dashboard import gcal
    
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
    from brain.dashboard import gcal
    
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
                 events_res = service.events().list(calendarId=cal_id, pageToken=pageToken).execute()
                 items = events_res.get("items", [])
                 
                 for item in items:
                     try:
                         service.events().delete(calendarId=cal_id, eventId=item["id"]).execute()
                         deleted_count += 1
                     except Exception as ex:
                         pass # Best effort
                         
                 pageToken = events_res.get("nextPageToken")
                 if not pageToken:
                     break
        except Exception as e:
            errors.append(f"{cal_id}: {str(e)}")
            
    return jsonify({
        "success": True, 
        "deletedEvents": deleted_count,
        "errors": errors
    })
@adapter_bp.route("/google-tasks", methods=["GET"])
def get_google_tasks():
    from brain.dashboard import gcal
    
    # Target lists
    target_names = {"Reclaim", "Workouts", "To Do"}
    
    task_lists, error = gcal.fetch_task_lists()
    if error:
        return jsonify({"error": error}), 500
        
    all_tasks = []
    
    # Filter for target lists
    relevant_lists = [tl for tl in task_lists if tl.get("title") in target_names]
    
    # If no target lists found, maybe return all? Or just empty?
    # User requirement: "Sync lists: Reclaim, Workouts, To Do".
    # If they don't exist, we return empty (frontend can handle creation or showing nothing).
    
    for tl in relevant_lists:
        t_list, err = gcal.fetch_tasks_from_list(tl["id"])
        if err:
            continue # specific list fail shouldn't crash all
            
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
    from brain.dashboard import gcal
    task_lists, error = gcal.fetch_task_lists()
    if error:
        return jsonify({"error": error}), 500
    
    return jsonify(task_lists)

@adapter_bp.route("/google-tasks", methods=["POST"])
def create_google_task_endpoint():
    from brain.dashboard import gcal
    data = request.json
    list_id = data.get("listId")
    if not list_id:
        return jsonify({"error": "Missing listId"}), 400
        
    # Construct body
    body = {
        "title": data.get("title"),
        "notes": data.get("notes"),
        "status": "completed" if data.get("completed") else "needsAction"
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
    from brain.dashboard import gcal
    data = request.json
    list_id = data.get("listId")
    if not list_id:
        return jsonify({"error": "Missing listId"}), 400
        
    body = {}
    if "title" in data: body["title"] = data["title"]
    if "notes" in data: body["notes"] = data["notes"]
    if "status" in data: body["status"] = data["status"]
    if "due" in data: body["due"] = data["due"]
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
    from brain.dashboard import gcal
    list_id = request.args.get("listId")
    if not list_id:
        return jsonify({"error": "Missing listId"}), 400
        
    success, error = gcal.delete_google_task(list_id, task_id)
    if not success:
        return jsonify({"error": error}), 500
    return jsonify({"success": True})

@adapter_bp.route("/google-tasks/<task_id>/move", methods=["POST"])
def move_google_task_endpoint(task_id):
    from brain.dashboard import gcal
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
        if not service: return jsonify({"error": "Auth"}), 401
        
        try:
            task = service.tasks().get(tasklist=list_id, task=task_id).execute()
        except:
            return jsonify({"error": "Task not found"}), 404
            
        # 2. Insert into dest
        new_body = {
            "title": task.get("title"),
            "notes": task.get("notes"),
            "status": task.get("status"),
            "due": task.get("due")
        }
        # Insert with previous/parent if supported? Insert supports 'previous' and 'parent' params!
        # insert(..., previous=previous, parent=parent)
        insert_kwargs = {"tasklist": dest_list_id, "body": new_body}
        if previous: insert_kwargs["previous"] = previous
        if parent: insert_kwargs["parent"] = parent
        
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
# QUICK NOTES
# ==============================================================================

@adapter_bp.route("/notes", methods=["GET"])
def get_notes():
    """Get all quick notes ordered by position."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, title, content, position, created_at FROM quick_notes ORDER BY position ASC")
        rows = cur.fetchall()
        conn.close()
        
        notes = []
        for r in rows:
            notes.append({
                "id": r[0],
                "title": r[1],
                "content": r[2],
                "position": r[3],
                "createdAt": r[4]
            })
        return jsonify(notes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@adapter_bp.route("/notes", methods=["POST"])
def create_note():
    """Create a new note."""
    data = request.json
    content = data.get("content", "")
    title = data.get("title", "")
    
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Get max position
        cur.execute("SELECT MAX(position) FROM quick_notes")
        max_pos = cur.fetchone()[0]
        new_pos = (max_pos + 1) if max_pos is not None else 0
        
        now_ts = datetime.now().isoformat()
        cur.execute(
            "INSERT INTO quick_notes (title, content, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (title, content, new_pos, now_ts, now_ts)
        )
        new_id = cur.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "id": new_id,
            "title": title,
            "content": content,
            "position": new_pos,
            "createdAt": now_ts
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@adapter_bp.route("/notes/<int:note_id>", methods=["PATCH"])
def update_note(note_id):
    """Update a note's title or content."""
    data = request.json
    
    fields = []
    values = []
    if "title" in data:
        fields.append("title = ?")
        values.append(data["title"])
    if "content" in data:
        fields.append("content = ?")
        values.append(data["content"])
        
    if not fields:
        return jsonify({"error": "No fields to update"}), 400
        
    fields.append("updated_at = ?")
    values.append(datetime.now().isoformat())
    values.append(note_id)
    
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(f"UPDATE quick_notes SET {', '.join(fields)} WHERE id = ?", tuple(values))
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
    """Reorder notes based on list of {id, position}."""
    updates = request.json.get("updates", [])
    if not updates:
        return jsonify({"error": "No updates provided"}), 400
        
    try:
        conn = get_connection()
        cur = conn.cursor()
        # Batch update
        for item in updates:
            # item = {id: 1, position: 2}
            cur.execute("UPDATE quick_notes SET position = ? WHERE id = ?", (item["position"], item["id"]))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
