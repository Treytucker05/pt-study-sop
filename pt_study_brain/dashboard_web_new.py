#!/usr/bin/env python3
"""
Local web dashboard for PT Study Brain - Modern UI Version.

Features:
- View key stats and recent sessions in a browser.
- Drag-and-drop (or select) markdown session logs for ingestion.
- Generate and download the latest AI resume.

Run:
    python dashboard_web_new.py
Then open http://127.0.0.1:5000 in your browser.
"""

import os
from pathlib import Path
from datetime import datetime, timedelta
from flask import (
    Flask,
    jsonify,
    request,
    send_file,
    Response,
)
from werkzeug.utils import secure_filename

from config import (
    DATA_DIR,
    SESSION_LOGS_DIR,
    RECENT_SESSIONS_COUNT,
    WEAK_THRESHOLD,
    STRONG_THRESHOLD,
)
from db_setup import init_database, get_connection
from ingest_session import parse_markdown_session
from generate_resume import (
    get_recent_sessions,
    analyze_sessions,
    generate_resume_markdown,
)
from dashboard import get_all_sessions

# -----------------------------------------------------------------------------
# App setup
# -----------------------------------------------------------------------------

app = Flask(__name__)

# Ensure directories and DB exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SESSION_LOGS_DIR, exist_ok=True)
init_database()

ALLOWED_EXTENSIONS = {".md", ".markdown", ".txt"}


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def insert_session_data(data):
    """
    Insert session data into the database.
    Returns (ok: bool, message: str).
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO sessions (
                session_date, session_time, topic, study_mode, time_spent_minutes,
                frameworks_used, gated_platter_triggered, wrap_phase_reached,
                anki_cards_count, understanding_level, retention_confidence,
                system_performance, what_worked, what_needs_fixing, notes_insights,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data["session_date"],
                data["session_time"],
                data["topic"],
                data["study_mode"],
                data["time_spent_minutes"],
                data.get("frameworks_used", ""),
                data.get("gated_platter_triggered", "No"),
                data.get("wrap_phase_reached", "No"),
                data.get("anki_cards_count", 0),
                data.get("understanding_level"),
                data.get("retention_confidence"),
                data.get("system_performance"),
                data.get("what_worked", ""),
                data.get("what_needs_fixing", ""),
                data.get("notes_insights", ""),
                data.get("created_at") or datetime.now().isoformat(),
            ),
        )
        conn.commit()
        return True, "Session ingested successfully."
    except Exception as exc:
        return False, f"Failed to insert session: {exc}"
    finally:
        conn.close()


def build_stats():
    sessions = get_all_sessions()
    analysis = analyze_sessions(sessions) if sessions else None

    def avg(val):
        return round(val, 2) if val else 0

    # Calculate 30-day stats
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    recent_sessions = [s for s in sessions if s["session_date"] >= thirty_days_ago] if sessions else []
    
    total_minutes = sum(s["time_spent_minutes"] for s in sessions) if sessions else 0
    recent_minutes = sum(s["time_spent_minutes"] for s in recent_sessions) if recent_sessions else 0
    
    # Calculate days with sessions for average
    unique_days = len(set(s["session_date"] for s in recent_sessions)) if recent_sessions else 1
    avg_daily_minutes = recent_minutes // unique_days if unique_days > 0 else 0

    # Calculate mode frequencies
    mode_counts = analysis["study_modes"] if analysis else {}
    total_mode_count = sum(mode_counts.values()) if mode_counts else 1
    mode_percentages = {k: round((v / total_mode_count) * 100) for k, v in mode_counts.items()} if mode_counts else {}

    stats = {
        "counts": {
            "sessions": len(sessions),
            "sessions_30d": len(recent_sessions),
            "topics": len(set(s["topic"] for s in sessions)) if sessions else 0,
            "anki_cards": sum(s.get("anki_cards_count") or 0 for s in sessions),
            "total_minutes": total_minutes,
            "avg_daily_minutes": avg_daily_minutes,
        },
        "range": {
            "first_date": min((s["session_date"] for s in sessions), default=None),
            "last_date": max((s["session_date"] for s in sessions), default=None),
        },
        "averages": {
            "understanding": avg(analysis["avg_understanding"]) if analysis else 0,
            "retention": avg(analysis["avg_retention"]) if analysis else 0,
            "performance": avg(analysis["avg_performance"]) if analysis else 0,
            "overall": round((avg(analysis["avg_understanding"] if analysis else 0) + 
                            avg(analysis["avg_retention"] if analysis else 0) + 
                            avg(analysis["avg_performance"] if analysis else 0)) / 3 * 20, 1) if analysis else 0,
        },
        "modes": analysis["study_modes"] if analysis else {},
        "mode_percentages": mode_percentages,
        "frameworks": analysis["frameworks_used"].most_common(5) if analysis else [],
        "recent_topics": analysis["topics_covered"][:10] if analysis else [],
        "weak_areas": analysis["weak_areas"][:5] if analysis else [],
        "strong_areas": analysis["strong_areas"][:5] if analysis else [],
        "what_worked": analysis["what_worked_list"][:3] if analysis else [],
        "common_issues": analysis["common_issues"][:3] if analysis else [],
        "recent_sessions": sessions[:5],
        "thresholds": {"weak": WEAK_THRESHOLD, "strong": STRONG_THRESHOLD},
    }
    return stats


# -----------------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------------


@app.route("/")
def index():
    response = Response(_INDEX_HTML, mimetype="text/html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.route("/api/stats")
def api_stats():
    return jsonify(build_stats())


@app.route("/api/resume")
def api_resume():
    try:
        limit = int(request.args.get("limit", RECENT_SESSIONS_COUNT))
    except ValueError:
        limit = RECENT_SESSIONS_COUNT

    sessions = get_recent_sessions(limit)
    if not sessions:
        return Response("No sessions found.", mimetype="text/plain")

    analysis = analyze_sessions(sessions)
    resume_md = generate_resume_markdown(sessions, analysis)
    return Response(resume_md, mimetype="text/plain")


@app.route("/api/resume/download")
def api_resume_download():
    sessions = get_recent_sessions(RECENT_SESSIONS_COUNT)
    if not sessions:
        return Response("No sessions found.", mimetype="text/plain")
    analysis = analyze_sessions(sessions)
    resume_md = generate_resume_markdown(sessions, analysis)

    temp_path = Path("session_resume.md")
    temp_path.write_text(resume_md, encoding="utf-8")
    return send_file(
        temp_path,
        as_attachment=True,
        download_name="session_resume.md",
        mimetype="text/markdown",
    )


@app.route("/api/upload", methods=["POST"])
def api_upload():
    if "file" not in request.files:
        return jsonify({"ok": False, "message": "No file part in request."}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"ok": False, "message": "No selected file."}), 400
    if not allowed_file(file.filename):
        return (
            jsonify({"ok": False, "message": "Unsupported file type. Use .md/.txt."}),
            400,
        )

    filename = secure_filename(file.filename)
    dest_path = Path(SESSION_LOGS_DIR) / filename

    try:
        file.save(dest_path)
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Failed to save file: {exc}"}), 500

    try:
        data = parse_markdown_session(dest_path)
    except Exception as exc:
        return (
            jsonify({"ok": False, "message": f"Parse error: {exc}"}),
            400,
        )

    ok, msg = insert_session_data(data)
    status = 200 if ok else 400
    return jsonify({"ok": ok, "message": msg, "filename": filename}), status


# -----------------------------------------------------------------------------
# Front-end HTML - Modern Dashboard Design
# -----------------------------------------------------------------------------

_INDEX_HTML = r"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark" />
  <title>PT Study Brain</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      color-scheme: dark;
      --bg: #0a0e27;
      --sidebar-bg: #0d1117;
      --card-bg: #161b22;
      --text-primary: #c9d1d9;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --border: #21262d;
      --accent: #1f6feb;
      --accent-light: #388bfd;
      --success: #3fb950;
      --success-light: #238636;
      --warning: #d29922;
      --warning-light: #9e6a03;
      --error: #f85149;
      --error-light: #da3633;
      --purple: #bc8ef9;
      --purple-light: #8957e5;
      --cyan: #58a6ff;
      --cyan-light: #1f6feb;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      color-scheme: dark;
    }

    html {
      color-scheme: dark !important;
      background: #0a0e27 !important;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg) !important;
      color: var(--text-primary) !important;
      min-height: 100vh;
      line-height: 1.5;
      color-scheme: dark !important;
    }

    /* Navigation */
    .navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 32px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      text-decoration: none;
    }
    
    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent), var(--purple));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
    }
    
    .nav-links {
      display: flex;
      gap: 8px;
    }
    
    .nav-link {
      padding: 10px 18px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .nav-link:hover {
      background: var(--bg);
      color: var(--text-primary);
    }
    
    .nav-link.active {
      background: var(--accent-light);
      color: var(--accent);
    }
    
    .profile-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .profile-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px 6px 6px;
      border: 1px solid var(--border);
      border-radius: 100px;
      background: var(--card-bg);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .profile-btn:hover {
      border-color: var(--accent);
    }
    
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--cyan), var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 13px;
    }

    /* Main Content */
    .main {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px;
    }
    
    .page-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 24px;
      color: var(--text-primary);
    }
    
    /* Stats Cards Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px 24px;
      position: relative;
      transition: all 0.2s;
    }
    
    .stat-card:hover {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }
    
    .stat-card .icon {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    
    .stat-card .icon.blue { background: var(--accent-light); color: var(--accent); }
    .stat-card .icon.purple { background: var(--purple-light); color: var(--purple); }
    .stat-card .icon.cyan { background: var(--cyan-light); color: var(--cyan); }
    .stat-card .icon.green { background: var(--success-light); color: var(--success); }
    
    .stat-card .label {
      font-size: 14px;
      color: var(--text-secondary);
      font-weight: 500;
      margin-bottom: 8px;
    }
    
    .stat-card .value {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }
    
    .stat-card .subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 6px;
    }

    /* Score Card with Progress Ring */
    .score-container {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 4px;
    }
    
    .progress-ring {
      width: 64px;
      height: 64px;
      position: relative;
    }
    
    .progress-ring svg {
      transform: rotate(-90deg);
    }
    
    .progress-ring .bg {
      fill: none;
      stroke: var(--border);
      stroke-width: 6;
    }
    
    .progress-ring .progress {
      fill: none;
      stroke: var(--accent);
      stroke-width: 6;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }
    
    .progress-ring .percentage {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
    }
    
    .score-breakdown {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .score-item {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .score-item span {
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Content Grid - Two Column Layout */
    .content-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 24px;
    }
    
    /* Card Base */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    /* Sessions Table */
    .sessions-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .sessions-table th {
      text-align: left;
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }
    
    .sessions-table td {
      padding: 16px;
      font-size: 14px;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    
    .sessions-table tr:last-child td {
      border-bottom: none;
    }
    
    .sessions-table tr:hover td {
      background: var(--bg);
    }

    /* Mode Badges */
    .mode-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .mode-badge.focus {
      background: var(--purple-light);
      color: var(--purple);
    }
    
    .mode-badge.pomodoro {
      background: var(--success-light);
      color: var(--success);
    }
    
    .mode-badge.review {
      background: var(--accent-light);
      color: var(--accent);
    }
    
    .mode-badge.deep-work {
      background: var(--cyan-light);
      color: var(--cyan);
    }
    
    /* Score Display */
    .score-display {
      display: flex;
      gap: 4px;
      font-size: 13px;
    }
    
    .score-display .u { color: var(--accent); }
    .score-display .r { color: var(--purple); }
    .score-display .s { color: var(--success); }
    
    /* Action Button */
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--text-primary);
    }
    
    .btn:hover {
      background: var(--bg);
      border-color: var(--accent);
      color: var(--accent);
    }
    
    .btn-primary {
      background: var(--accent);
      color: white;
      border: none;
    }
    
    .btn-primary:hover {
      background: #2563eb;
      color: white;
    }

    /* Patterns Section */
    .patterns-section {
      margin-top: 24px;
    }
    
    .patterns-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    /* Pie Chart Container */
    .chart-container {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    
    .pie-chart {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      position: relative;
    }
    
    .chart-legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    
    .legend-dot.focus { background: var(--purple); }
    .legend-dot.pomodoro { background: var(--success); }
    .legend-dot.review { background: var(--accent); }
    
    /* Frameworks List */
    .frameworks-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .framework-item {
      font-size: 14px;
      color: var(--text-primary);
      padding: 4px 0;
    }

    /* Topics Section */
    .topics-card h4 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .topics-card h4.weak { color: var(--error); }
    .topics-card h4.strong { color: var(--success); }
    
    .topics-list {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.8;
    }
    
    /* Key Learnings */
    .learnings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    
    .learnings-column h4 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-primary);
    }
    
    .learnings-column ul {
      list-style: none;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .learnings-column li {
      padding: 6px 0;
      padding-left: 16px;
      position: relative;
    }
    
    .learnings-column li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: var(--text-muted);
    }
    
    .learnings-column.issues li { color: var(--error); }
    .learnings-column.issues li::before { color: var(--error); }

    /* Upload Section */
    .upload-section {
      margin-top: 24px;
    }
    
    .upload-zone {
      border: 2px dashed var(--border);
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--bg);
    }
    
    .upload-zone:hover {
      border-color: var(--accent);
      background: var(--accent-light);
    }
    
    .upload-zone .icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    
    .upload-zone .text {
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .upload-zone .text strong {
      color: var(--accent);
    }
    
    .upload-status {
      margin-top: 12px;
      font-size: 13px;
      padding: 8px 12px;
      border-radius: 8px;
    }
    
    .upload-status.success {
      background: var(--success-light);
      color: var(--success);
    }
    
    .upload-status.error {
      background: var(--error-light);
      color: var(--error);
    }

    /* Resume Section */
    .resume-section {
      margin-top: 24px;
    }
    
    .resume-actions {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .resume-preview {
      background: var(--bg);
      border-radius: 12px;
      padding: 16px;
      font-size: 13px;
      font-family: 'Monaco', 'Menlo', monospace;
      white-space: pre-wrap;
      max-height: 300px;
      overflow-y: auto;
      color: var(--text-secondary);
    }
    
    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .content-grid {
        grid-template-columns: 1fr;
      }
      .patterns-grid {
        grid-template-columns: 1fr;
      }
    }
    
    @media (max-width: 768px) {
      .navbar {
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }
      .nav-links {
        flex-wrap: wrap;
        justify-content: center;
      }
      .stats-grid {
        grid-template-columns: 1fr;
      }
      .main {
        padding: 16px;
      }
      .learnings-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>

<body>
  <!-- Navigation -->
  <nav class="navbar">
    <a href="/" class="logo">
      <div class="logo-icon">🧠</div>
      <span>PT Study Brain</span>
    </a>
    
    <div class="nav-links">
      <a href="#" class="nav-link active">Dashboard</a>
      <a href="#sessions" class="nav-link">Study Sessions</a>
      <a href="#resume" class="nav-link">Resume Builder</a>
      <a href="#patterns" class="nav-link">Analytics</a>
    </div>
    
    <div class="profile-section">
      <button class="profile-btn">
        <div class="avatar">TT</div>
        <span style="font-size: 14px; font-weight: 500;">Profile</span>
        <span style="font-size: 12px; color: var(--text-muted);">▼</span>
      </button>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="main">
    <h1 class="page-title">Dashboard Overview</h1>
    
    <!-- Stats Cards -->
    <div class="stats-grid" id="stats-grid">
      <div class="stat-card">
        <div class="icon blue">📊</div>
        <div class="label">Total Sessions</div>
        <div class="value" id="total-sessions">-</div>
        <div class="subtitle" id="sessions-subtitle">Last 30 days</div>
      </div>
      
      <div class="stat-card">
        <div class="icon purple">⏱️</div>
        <div class="label">Total Study Time</div>
        <div class="value" id="total-time">-</div>
        <div class="subtitle" id="time-subtitle">Avg. -/day</div>
      </div>
      
      <div class="stat-card">
        <div class="icon cyan">📈</div>
        <div class="label">Average Session Score</div>
        <div class="score-container">
          <div class="progress-ring">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle class="bg" cx="32" cy="32" r="26"></circle>
              <circle class="progress" cx="32" cy="32" r="26" 
                stroke-dasharray="163.36" 
                stroke-dashoffset="163.36"
                id="progress-circle"></circle>
            </svg>
            <div class="percentage" id="avg-score">-%</div>
          </div>
          <div class="score-breakdown">
            <div class="score-item">U: <span id="avg-u">-</span></div>
            <div class="score-item">R: <span id="avg-r">-</span></div>
            <div class="score-item">S: <span id="avg-s">-</span></div>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="icon green">🃏</div>
        <div class="label">Anki Cards Reviewed</div>
        <div class="value" id="anki-cards">-</div>
        <div class="subtitle" id="anki-subtitle">Due today: -</div>
      </div>
    </div>

    <!-- Sessions Table & Patterns Grid -->
    <div class="content-grid">
      <!-- Latest Study Sessions -->
      <div class="card" id="sessions">
        <div class="card-header">
          <h2 class="card-title">Latest Study Sessions</h2>
        </div>
        <table class="sessions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Mode</th>
              <th>Topic</th>
              <th>Duration</th>
              <th>Score (U/R/S)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="sessions-tbody">
          </tbody>
        </table>
      </div>
      
      <!-- Patterns & Insights -->
      <div class="card" id="patterns">
        <div class="card-header">
          <h2 class="card-title">Patterns & Insights</h2>
        </div>
        
        <div class="patterns-grid">
          <!-- Mode Frequencies -->
          <div>
            <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Mode Frequencies</h4>
            <div class="chart-container">
              <canvas id="modeChart" width="120" height="120"></canvas>
              <div class="chart-legend" id="mode-legend"></div>
            </div>
          </div>
          
          <!-- Top Frameworks -->
          <div>
            <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Top Frameworks</h4>
            <div class="frameworks-list" id="frameworks-list">
            </div>
          </div>
        </div>
        
        <!-- Weak/Strong Topics -->
        <div class="topics-card" style="margin-top: 20px;">
          <h4 class="weak">Weak:</h4>
          <div class="topics-list" id="weak-topics">-</div>
          <h4 class="strong" style="margin-top: 12px;">Strong:</h4>
          <div class="topics-list" id="strong-topics">-</div>
        </div>
        
        <!-- Key Learnings -->
        <div style="margin-top: 20px;">
          <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Key Learnings</h4>
          <div class="learnings-grid">
            <div class="learnings-column">
              <h4>What Worked</h4>
              <ul id="what-worked"></ul>
            </div>
            <div class="learnings-column issues">
              <h4>Issues</h4>
              <ul id="issues-list"></ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Section -->
    <div class="card upload-section">
      <div class="card-header">
        <h2 class="card-title">Upload Session Log</h2>
      </div>
      <div class="upload-zone" id="dropzone">
        <div class="icon">📁</div>
        <div class="text"><strong>Drag & drop</strong> a markdown session log here, or click to choose a file.</div>
        <div class="text" style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">Accepted: .md / .markdown / .txt</div>
        <input type="file" id="file-input" style="display:none;" accept=".md,.markdown,.txt" />
      </div>
      <div id="upload-status"></div>
    </div>
    
    <!-- Resume Section -->
    <div class="card resume-section" id="resume">
      <div class="card-header">
        <h2 class="card-title">AI Resume</h2>
      </div>
      <div class="resume-actions">
        <button class="btn btn-primary" id="btn-resume">Generate / Refresh</button>
        <a href="/api/resume/download"><button class="btn">Download MD</button></a>
      </div>
      <pre class="resume-preview" id="resume-box">Click "Generate / Refresh" to view the latest resume.</pre>
    </div>
  </main>

  <script>
    // DOM Elements
    const totalSessions = document.getElementById('total-sessions');
    const sessionsSubtitle = document.getElementById('sessions-subtitle');
    const totalTime = document.getElementById('total-time');
    const timeSubtitle = document.getElementById('time-subtitle');
    const avgScore = document.getElementById('avg-score');
    const progressCircle = document.getElementById('progress-circle');
    const avgU = document.getElementById('avg-u');
    const avgR = document.getElementById('avg-r');
    const avgS = document.getElementById('avg-s');
    const ankiCards = document.getElementById('anki-cards');
    const sessionsTbody = document.getElementById('sessions-tbody');
    const modeLegend = document.getElementById('mode-legend');
    const frameworksList = document.getElementById('frameworks-list');
    const weakTopics = document.getElementById('weak-topics');
    const strongTopics = document.getElementById('strong-topics');
    const whatWorked = document.getElementById('what-worked');
    const issuesList = document.getElementById('issues-list');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const resumeBox = document.getElementById('resume-box');
    const btnResume = document.getElementById('btn-resume');

    // Helpers
    const formatMinutes = (m) => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      return h > 0 ? `${h}h ${min}m` : `${min}m`;
    };

    const formatNumber = (n) => {
      return n.toLocaleString();
    };

    const getModeClass = (mode) => {
      const m = (mode || '').toLowerCase();
      if (m.includes('focus') || m.includes('deep')) return 'focus';
      if (m.includes('pomodoro')) return 'pomodoro';
      if (m.includes('review')) return 'review';
      return 'focus';
    };

    // Load and render stats
    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        renderStats(data);
        renderSessions(data);
        renderPatterns(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }

    function renderStats(data) {
      // Total Sessions
      totalSessions.textContent = formatNumber(data.counts.sessions);
      sessionsSubtitle.textContent = `${data.counts.sessions_30d} in last 30 days`;

      // Total Time
      totalTime.textContent = formatMinutes(data.counts.total_minutes);
      timeSubtitle.textContent = `Avg. ${formatMinutes(data.counts.avg_daily_minutes)}/day`;

      // Score with progress ring
      const overallScore = Math.round(data.averages.overall) || 0;
      avgScore.textContent = `${overallScore}%`;
      
      // Update progress ring
      const circumference = 2 * Math.PI * 26;
      const offset = circumference - (overallScore / 100) * circumference;
      progressCircle.style.strokeDashoffset = offset;

      // Individual scores (convert 1-5 to percentage)
      avgU.textContent = `${Math.round(data.averages.understanding * 20)}%`;
      avgR.textContent = `${Math.round(data.averages.retention * 20)}%`;
      avgS.textContent = `${Math.round(data.averages.performance * 20)}%`;

      // Anki cards
      ankiCards.textContent = formatNumber(data.counts.anki_cards);
    }

    function renderSessions(data) {
      const sessions = data.recent_sessions || [];
      sessionsTbody.innerHTML = sessions.map(s => {
        const modeClass = getModeClass(s.study_mode);
        const u = s.understanding_level || '-';
        const r = s.retention_confidence || '-';
        const sys = s.system_performance || '-';
        
        return `
          <tr>
            <td>${s.session_date}<br><span style="font-size: 12px; color: var(--text-muted)">${s.session_time || ''}</span></td>
            <td><span class="mode-badge ${modeClass}">${s.study_mode}</span></td>
            <td>${s.topic}</td>
            <td>${formatMinutes(s.time_spent_minutes)}</td>
            <td>
              <div class="score-display">
                <span class="u">U:${u}</span>
                <span class="r">R:${r}</span>
                <span class="s">S:${sys}</span>
              </div>
            </td>
            <td><button class="btn" onclick="alert('View details coming soon!')">View</button></td>
          </tr>
        `;
      }).join('');
    }

    function renderPatterns(data) {
      // Mode frequencies legend
      const modes = data.mode_percentages || {};
      const modeColors = {
        'Focus': '#8b5cf6',
        'Deep Work': '#8b5cf6',
        'Pomodoro': '#22c55e',
        'Review': '#3b82f6'
      };
      
      modeLegend.innerHTML = Object.entries(modes).map(([mode, pct]) => `
        <div class="legend-item">
          <span class="legend-dot" style="background: ${modeColors[mode] || '#64748b'}"></span>
          <span>${mode}: ${pct}%</span>
        </div>
      `).join('') || '<div style="color: var(--text-muted);">No data yet</div>';

      // Draw pie chart
      drawPieChart(modes, modeColors);

      // Frameworks
      const frameworks = data.frameworks || [];
      frameworksList.innerHTML = frameworks.map(([name, count]) => `
        <div class="framework-item">${name}</div>
      `).join('') || '<div style="color: var(--text-muted);">No data yet</div>';

      // Weak topics
      const weak = data.weak_areas || [];
      weakTopics.textContent = weak.map(w => w.topic).join(', ') || 'None flagged';

      // Strong topics
      const strong = data.strong_areas || [];
      strongTopics.textContent = strong.map(s => s.topic).join(', ') || 'None yet';

      // What worked
      const worked = data.what_worked || [];
      whatWorked.innerHTML = worked.map(w => `<li>${w.split('\\n')[0]}</li>`).join('') 
        || '<li>No notes yet</li>';

      // Issues
      const issues = data.common_issues || [];
      issuesList.innerHTML = issues.map(i => `<li>${i.split('\\n')[0]}</li>`).join('') 
        || '<li>No issues logged</li>';
    }

    function drawPieChart(modes, colors) {
      const canvas = document.getElementById('modeChart');
      const ctx = canvas.getContext('2d');
      const centerX = 60;
      const centerY = 60;
      const radius = 50;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const entries = Object.entries(modes);
      if (entries.length === 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        return;
      }
      
      let startAngle = -Math.PI / 2;
      entries.forEach(([mode, pct]) => {
        const sliceAngle = (pct / 100) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[mode] || '#64748b';
        ctx.fill();
        startAngle += sliceAngle;
      });
    }

    // Upload handling
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => { 
      e.preventDefault(); 
      dropzone.style.borderColor = 'var(--accent)';
      dropzone.style.background = 'var(--accent-light)';
    });
    dropzone.addEventListener('dragleave', e => { 
      dropzone.style.borderColor = 'var(--border)';
      dropzone.style.background = 'var(--bg)';
    });
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--border)';
      dropzone.style.background = 'var(--bg)';
      if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', e => {
      if (e.target.files.length) uploadFile(e.target.files[0]);
    });

    async function uploadFile(file) {
      uploadStatus.innerHTML = '<div class="upload-status" style="background: var(--accent-light); color: var(--accent);">Uploading...</div>';
      const form = new FormData();
      form.append('file', file);
      
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const data = await res.json();
        
        if (data.ok) {
          uploadStatus.innerHTML = `<div class="upload-status success">✓ ${data.message} (${data.filename})</div>`;
          loadStats();
        } else {
          uploadStatus.innerHTML = `<div class="upload-status error">✕ ${data.message}</div>`;
        }
      } catch (error) {
        uploadStatus.innerHTML = `<div class="upload-status error">✕ Upload failed: ${error.message}</div>`;
      }
    }

    // Resume handling
    btnResume.addEventListener('click', async () => {
      resumeBox.textContent = 'Generating...';
      try {
        const res = await fetch('/api/resume');
        const txt = await res.text();
        resumeBox.textContent = txt;
      } catch (error) {
        resumeBox.textContent = 'Failed to generate resume: ' + error.message;
      }
    });

    // Initialize
    loadStats();
  </script>
</body>
</html>
"""


if __name__ == "__main__":
    app.run(debug=False, host="127.0.0.1", port=5000)
