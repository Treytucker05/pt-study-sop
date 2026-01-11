
"""
Google Calendar Integration for PT Study Brain
OAuth2 authentication + manual sync of calendar events
"""

import os
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

# Google API imports (install: pip install google-auth google-auth-oauthlib google-api-python-client)
try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False
    print("[WARN] Google API libraries not installed. Run: pip install google-auth google-auth-oauthlib google-api-python-client")

# Paths
DATA_DIR = Path(__file__).parent.parent / "data"
TOKEN_PATH = DATA_DIR / "gcal_token.json"
CONFIG_PATH = DATA_DIR / "api_config.json"
DB_PATH = DATA_DIR / "pt_study.db"

# OAuth scopes - read-only access to calendar
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']


def load_gcal_config():
    """Load Google Calendar config from api_config.json"""
    if not CONFIG_PATH.exists():
        return None
    
    with open(CONFIG_PATH, 'r') as f:
        config = json.load(f)
    
    return config.get('google_calendar', {})


def save_token(creds):
    """Save OAuth token to file"""
    token_data = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': list(creds.scopes) if creds.scopes else [],
        'expiry': creds.expiry.isoformat() if creds.expiry else None
    }
    with open(TOKEN_PATH, 'w') as f:
        json.dump(token_data, f)


def load_token():
    """Load OAuth token from file"""
    if not TOKEN_PATH.exists():
        return None
    
    with open(TOKEN_PATH, 'r') as f:
        token_data = json.load(f)
    
    return Credentials(
        token=token_data.get('token'),
        refresh_token=token_data.get('refresh_token'),
        token_uri=token_data.get('token_uri'),
        client_id=token_data.get('client_id'),
        client_secret=token_data.get('client_secret'),
        scopes=token_data.get('scopes')
    )


def get_auth_url():
    """Generate OAuth2 authorization URL"""
    if not GOOGLE_API_AVAILABLE:
        return None, "Google API libraries not installed"
    
    config = load_gcal_config()
    if not config or not config.get('client_id'):
        return None, "Google Calendar not configured in api_config.json"
    
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": config['client_id'],
                "client_secret": config['client_secret'],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [config.get('redirect_uri', 'http://localhost:5000/api/gcal/oauth/callback')]
            }
        },
        scopes=SCOPES
    )
    flow.redirect_uri = config.get('redirect_uri', 'http://localhost:5000/api/gcal/oauth/callback')
    
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
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
                    "client_id": config['client_id'],
                    "client_secret": config['client_secret'],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [config.get('redirect_uri', 'http://localhost:5000/api/gcal/oauth/callback')]
                }
            },
            scopes=SCOPES
        )
        flow.redirect_uri = config.get('redirect_uri', 'http://localhost:5000/api/gcal/oauth/callback')
        
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
    
    return build('calendar', 'v3', credentials=creds)


def check_auth_status():
    """Check if user is authenticated with Google Calendar"""
    if not GOOGLE_API_AVAILABLE:
        return {'connected': False, 'error': 'Google API not installed'}
    
    if not TOKEN_PATH.exists():
        return {'connected': False}
    
    try:
        creds = load_token()
        if creds and creds.valid:
            # Get user email
            service = build('calendar', 'v3', credentials=creds)
            calendar = service.calendars().get(calendarId='primary').execute()
            return {
                'connected': True,
                'email': calendar.get('summary', 'Unknown'),
                'id': calendar.get('id')
            }
        else:
            return {'connected': False, 'error': 'Token expired'}
    except Exception as e:
        return {'connected': False, 'error': str(e)}


def revoke_auth():
    """Revoke Google Calendar authentication"""
    if TOKEN_PATH.exists():
        TOKEN_PATH.unlink()
    return True


def fetch_calendar_events(days_ahead=90):
    """Fetch upcoming events from Google Calendar"""
    service = get_calendar_service()
    if not service:
        return [], "Not authenticated"
    
    config = load_gcal_config()
    calendar_id = config.get('calendar_id', 'primary')
    
    now = datetime.utcnow()
    time_min = now.isoformat() + 'Z'
    time_max = (now + timedelta(days=days_ahead)).isoformat() + 'Z'
    
    try:
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            maxResults=500,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        return events_result.get('items', []), None
    except Exception as e:
        return [], str(e)


def parse_gcal_event(gcal_event):
    """Parse Google Calendar event to Brain format"""
    start = gcal_event.get('start', {})
    end = gcal_event.get('end', {})
    
    # Handle all-day vs timed events
    if 'date' in start:
        date = start['date']
        time_str = None
    else:
        dt = start.get('dateTime', '')
        date = dt[:10] if dt else None
        time_str = dt[11:16] if len(dt) > 16 else None
    
    # Determine event type from title/description
    title = gcal_event.get('summary', 'Untitled')
    title_lower = title.lower()
    
    if any(x in title_lower for x in ['exam', 'midterm', 'final']):
        event_type = 'exam'
    elif any(x in title_lower for x in ['quiz', 'irat', 'trat']):
        event_type = 'quiz'
    elif any(x in title_lower for x in ['lab', 'practical']):
        event_type = 'lab'
    elif any(x in title_lower for x in ['lecture', 'class', 'vs class']):
        event_type = 'lecture'
    elif any(x in title_lower for x in ['due', 'assignment', 'submit']):
        event_type = 'assignment'
    else:
        event_type = 'other'
    
    return {
        'google_event_id': gcal_event.get('id'),
        'title': title,
        'date': date,
        'type': event_type,
        'raw_text': f"Time: {time_str or 'All day'} | Location: {gcal_event.get('location', 'Not specified')}",
        'status': 'pending'
    }


def sync_to_database(course_id=None):
    """Sync Google Calendar events to database"""
    events, error = fetch_calendar_events()
    if error:
        return {'success': False, 'error': error, 'imported': 0, 'skipped': 0}
    
    imported = 0
    skipped = 0
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for gcal_event in events:
        parsed = parse_gcal_event(gcal_event)
        
        # Check for duplicate
        cursor.execute(
            "SELECT id FROM course_events WHERE google_event_id = ?",
            (parsed['google_event_id'],)
        )
        if cursor.fetchone():
            skipped += 1
            continue
        
        # Insert new event
        cursor.execute("""
            INSERT INTO course_events (course_id, type, title, date, raw_text, status, google_event_id, google_synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            course_id,
            parsed['type'],
            parsed['title'],
            parsed['date'],
            parsed['raw_text'],
            parsed['status'],
            parsed['google_event_id'],
            datetime.now().isoformat()
        ))
        imported += 1
    
    conn.commit()
    conn.close()
    
    return {'success': True, 'imported': imported, 'skipped': skipped}
