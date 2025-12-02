#!/usr/bin/env python3
"""
Local web dashboard for PT Study Brain.

Features:
- View key stats and recent sessions in a browser.
- Drag-and-drop (or select) markdown session logs for ingestion.
- Generate and download the latest AI resume.

Run:
    python dashboard_web.py
Then open http://127.0.0.1:5000 in your browser.
"""

import os
from pathlib import Path
from datetime import datetime
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
    except Exception as exc:  # sqlite3.IntegrityError and others
        return False, f"Failed to insert session: {exc}"
    finally:
        conn.close()


def build_stats():
    sessions = get_all_sessions()
    analysis = analyze_sessions(sessions) if sessions else None

    def avg(val):
        return round(val, 2) if val else 0

    stats = {
        "counts": {
            "sessions": len(sessions),
            "topics": len(set(s["topic"] for s in sessions)) if sessions else 0,
            "anki_cards": sum(s.get("anki_cards_count") or 0 for s in sessions),
            "total_minutes": sum(s["time_spent_minutes"] for s in sessions)
            if sessions
            else 0,
        },
        "range": {
            "first_date": min((s["session_date"] for s in sessions), default=None),
            "last_date": max((s["session_date"] for s in sessions), default=None),
        },
        "averages": {
            "understanding": avg(analysis["avg_understanding"]) if analysis else 0,
            "retention": avg(analysis["avg_retention"]) if analysis else 0,
            "performance": avg(analysis["avg_performance"]) if analysis else 0,
        },
        "modes": analysis["study_modes"] if analysis else {},
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
    return Response(_INDEX_HTML, mimetype="text/html")


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
    # Generate resume and serve as a file download
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
# Front-end HTML (inline for simplicity)
# -----------------------------------------------------------------------------

_INDEX_HTML = r"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>PT Study Brain Dashboard</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0a0e27;
      --panel: #0d1117;
      --card: #161b22;
      --accent: #1f6feb;
      --accent-2: #58a6ff;
      --text: #c9d1d9;
      --muted: #6e7681;
      --success: #3fb950;
      --error: #f85149;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0a0e27 0%, #0d1117 50%, #0f1419 100%);
      color: var(--text);
      min-height: 100vh;
    }
    header {
      padding: 24px 24px 8px;
    }
    h1 { margin: 0; font-size: 28px; letter-spacing: 0.3px; }
    .subtitle { color: var(--muted); margin-top: 6px; }
    main { padding: 0 24px 32px; }
    .grid { display: grid; gap: 16px; }
    .cards { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .card {
      background: var(--card);
      border: 1px solid #21262d;
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 3px 12px rgba(0,0,0,0.4);
      backdrop-filter: blur(10px);
    }
    .card h3 { margin: 0 0 6px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--muted);}
    .card .big { font-size: 28px; font-weight: 700; }
    .pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(31,111,235,0.15);
      color: var(--accent-2);
      font-size: 12px;
      margin-left: 6px;
    }
    .section {
      margin-top: 22px;
      background: var(--panel);
      border-radius: 14px;
      border: 1px solid #21262d;
      padding: 16px 18px;
      box-shadow: 0 3px 12px rgba(0,0,0,0.4);
      backdrop-filter: blur(10px);
    }
    .section h2 { margin: 0 0 10px; font-size: 18px; display: flex; align-items: center; gap: 8px;}
    .muted { color: var(--muted); font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 8px 6px; font-size: 14px; }
    th { color: var(--muted); font-weight: 600; }
    tr:nth-child(odd) td { background: rgba(255,255,255,0.02); }
    .pill-small { padding: 2px 8px; border-radius: 10px; font-size: 12px; }
    .mode { background: rgba(168,85,247,0.12); color: var(--accent-2); }
    .weak { color: var(--error); }
    .strong { color: var(--success); }
    .bar {
      background: #0d1117;
      border-radius: 999px;
      height: 10px;
      position: relative;
      overflow: hidden;
    }
    .bar span {
      position: absolute; top: 0; left: 0; bottom: 0;
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
      border-radius: 999px;
    }
    .flex { display: flex; gap: 12px; flex-wrap: wrap; }
    .chip { padding: 6px 10px; border-radius: 12px; background: rgba(31,111,235,0.1); font-size: 13px; }
    .upload {
      border: 2px dashed #30363d;
      border-radius: 12px;
      padding: 18px;
      text-align: center;
      background: rgba(31,111,235,0.05);
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .upload:hover { border-color: var(--accent-2); background: rgba(31,111,235,0.1); }
    button {
      background: linear-gradient(120deg, var(--accent), var(--accent-2));
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 10px 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(31,111,235,0.3);
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }
    button:hover { transform: translateY(-1px); }
    pre {
      background: #0d1117;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #21262d;
      overflow-x: auto;
      font-size: 13px;
      max-height: 360px;
    }
    .status { margin-top: 8px; font-size: 13px; }
    .status.ok { color: var(--success); }
    .status.err { color: var(--error); }
    @media (max-width: 700px) {
      .cards { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
      header, main { padding: 16px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>PT Study Brain Dashboard</h1>
    <div class="subtitle">View stats, ingest new session logs, and generate AI-ready resumes.</div>
  </header>
  <main>
    <div class="grid cards" id="cards"></div>

    <div class="section">
      <h2>Session Feed</h2>
      <div class="muted">Latest 5 sessions with mode, duration, and scores.</div>
      <table id="recent-table">
        <thead>
          <tr><th>Date</th><th>Topic</th><th>Mode</th><th>Time</th><th>Scores (U/R/S)</th></tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>

    <div class="section">
      <h2>Patterns & Focus</h2>
      <div class="grid cards" id="pattern-cards"></div>
    </div>

    <div class="section">
      <h2>Upload Session Log</h2>
      <div class="upload" id="dropzone">
        <div><strong>Drag & drop</strong> a markdown session log here, or click to choose a file.</div>
        <div class="muted" style="margin-top:6px;">Accepted: .md / .markdown / .txt — follows the provided template.</div>
        <input type="file" id="file-input" style="display:none;" accept=".md,.markdown,.txt" />
      </div>
      <div class="status" id="upload-status"></div>
    </div>

    <div class="section">
      <h2>AI Resume</h2>
      <div class="flex" style="align-items:center; margin-bottom:10px;">
        <button id="btn-resume">Generate / Refresh</button>
        <a href="/api/resume/download"><button type="button">Download MD</button></a>
      </div>
      <pre id="resume-box">Run "Generate / Refresh" to view the latest resume.</pre>
    </div>
  </main>

  <script>
    const cardsEl = document.getElementById('cards');
    const recentBody = document.querySelector('#recent-table tbody');
    const patternCards = document.getElementById('pattern-cards');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const resumeBox = document.getElementById('resume-box');
    const btnResume = document.getElementById('btn-resume');

    const formatMinutes = (m) => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      return h > 0 ? `${h}h ${min}m` : `${min}m`;
    };

    async function loadStats() {
      const res = await fetch('/api/stats');
      const data = await res.json();
      renderCards(data);
      renderRecent(data);
      renderPatterns(data);
    }

    function renderCards(data) {
      const total = data.counts.sessions;
      const avgU = data.averages.understanding;
      const avgR = data.averages.retention;
      const avgS = data.averages.performance;
      const cards = [
        { title: 'Sessions', value: total },
        { title: 'Study Time', value: formatMinutes(data.counts.total_minutes) },
        { title: 'Avg Understanding', value: `${avgU}/5` },
        { title: 'Avg Retention', value: `${avgR}/5` },
        { title: 'Avg System', value: `${avgS}/5` },
        { title: 'Anki Cards', value: data.counts.anki_cards },
      ];
      cardsEl.innerHTML = cards.map(c => `
        <div class="card">
          <h3>${c.title}</h3>
          <div class="big">${c.value}</div>
        </div>
      `).join('');
    }

    function renderRecent(data) {
      recentBody.innerHTML = (data.recent_sessions || []).map(s => `
        <tr>
          <td>${s.session_date} ${s.session_time}</td>
          <td>${s.topic}</td>
          <td><span class="pill-small mode">${s.study_mode}</span></td>
          <td>${formatMinutes(s.time_spent_minutes)}</td>
          <td>${s.understanding_level || '-'} / ${s.retention_confidence || '-'} / ${s.system_performance || '-'}</td>
        </tr>
      `).join('');
    }

    function renderList(title, items, emptyLabel, mapFn) {
      if (!items || items.length === 0) return `
        <div class="card">
          <h3>${title}</h3>
          <div class="muted">${emptyLabel}</div>
        </div>`;
      return `
        <div class="card">
          <h3>${title}</h3>
          ${items.map(mapFn).join('<br/>')}
        </div>`;
    }

    function renderPatterns(data) {
      const modes = Object.entries(data.modes || {}).sort((a,b)=>b[1]-a[1]);
      const frameworks = data.frameworks || [];
      const weak = data.weak_areas || [];
      const strong = data.strong_areas || [];
      const worked = data.what_worked || [];
      const issues = data.common_issues || [];

      patternCards.innerHTML = `
        <div class="card">
          <h3>Modes</h3>
          ${modes.map(([m,c]) => `<div class="flex" style="justify-content:space-between;"><div>${m}</div><div class="pill-small">${c}</div></div>`).join('') || '<div class="muted">No data</div>'}
        </div>
        <div class="card">
          <h3>Frameworks</h3>
          ${frameworks.map(([f,c]) => `<div class="flex" style="justify-content:space-between;"><div>${f}</div><div class="pill-small">${c}</div></div>`).join('') || '<div class="muted">No data</div>'}
        </div>
        ${renderList('Weak Topics (≤ '+data.thresholds.weak+')', weak, 'None flagged', w => `<span class="weak">• ${w.topic}</span> (${w.understanding}/5, ${w.date})`)}
        ${renderList('Strong Topics (≥ '+data.thresholds.strong+')', strong, 'None yet', w => `<span class="strong">• ${w.topic}</span> (${w.understanding}/5, ${w.date})`)}
        ${renderList('What Worked', worked, 'No notes yet', t => `• ${t.split('\\n')[0]}`)}
        ${renderList('Issues', issues, 'No issues logged', t => `• ${t.split('\\n')[0]}`)}
      `;
    }

    // Upload handling
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent)'; });
    dropzone.addEventListener('dragleave', e => { dropzone.style.borderColor = '#1e293b'; });
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.style.borderColor = '#1e293b';
      if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', e => {
      if (e.target.files.length) uploadFile(e.target.files[0]);
    });

    async function uploadFile(file) {
      uploadStatus.textContent = 'Uploading...';
      uploadStatus.className = 'status';
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.ok) {
        uploadStatus.textContent = `✓ ${data.message} (${data.filename})`;
        uploadStatus.className = 'status ok';
        loadStats();
      } else {
        uploadStatus.textContent = `✕ ${data.message}`;
        uploadStatus.className = 'status err';
      }
    }

    // Resume handling
    btnResume.addEventListener('click', async () => {
      resumeBox.textContent = 'Generating...';
      const res = await fetch('/api/resume');
      const txt = await res.text();
      resumeBox.textContent = txt;
    });

    // Init
    loadStats();
  </script>
</body>
</html>
"""


if __name__ == "__main__":
    app.run(debug=False, host="127.0.0.1", port=5000)

