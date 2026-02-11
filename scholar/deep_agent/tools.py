"""LangChain tool wrappers for Scholar deep agent.

Each tool wraps an existing read-only module and returns a string for the LLM.
Lazy imports avoid side effects at import time.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Optional

from langchain_core.tools import tool

# Ensure brain/ and scholar/ are importable (mirrors brain_reader.py pattern)
_REPO_ROOT = Path(__file__).parent.parent.parent.resolve()
_BRAIN_DIR = str(_REPO_ROOT / "brain")
_SCHOLAR_DIR = str(_REPO_ROOT / "scholar")

if _BRAIN_DIR not in sys.path:
    sys.path.insert(0, _BRAIN_DIR)
if _SCHOLAR_DIR not in sys.path:
    sys.path.insert(0, _SCHOLAR_DIR)


def _json_dumps(obj: object) -> str:
    """Compact JSON serialisation for tool output."""
    return json.dumps(obj, indent=2, default=str)


# ---------------------------------------------------------------------------
# Tool: Telemetry Snapshot
# ---------------------------------------------------------------------------

@tool
def get_telemetry_snapshot(days_recent: int = 30) -> str:
    """Generate a telemetry snapshot from the Brain database.

    Returns a markdown report with session counts, metrics, mode distribution,
    tutor turns, topic mastery, study tasks, RAG docs, card drafts, and events.

    Args:
        days_recent: Number of days to include (default 30).
    """
    from datetime import datetime
    from telemetry_snapshot import build_snapshot

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot_path = build_snapshot(run_id=run_id, days_recent=days_recent)
    try:
        return snapshot_path.read_text(encoding="utf-8")[:12000]
    except Exception as exc:
        return f"Error reading snapshot: {exc}"


# ---------------------------------------------------------------------------
# Tool: Friction Alerts
# ---------------------------------------------------------------------------

@tool
def get_friction_alerts(days: int = 7) -> str:
    """Generate friction alerts for recent study sessions.

    Detects 8 alert types: short/long sessions, low understanding,
    high unverified ratio, low citations, no WRAP phase, source drift,
    and repeated topic struggle.

    Args:
        days: Number of days to look back (default 7).
    """
    from friction_alerts import generate_alerts

    alerts = generate_alerts(days=days)
    if not alerts:
        return "No friction alerts found for the period."

    lines = [f"Found {len(alerts)} friction alert(s):\n"]
    for a in alerts:
        d = a.to_dict()
        lines.append(
            f"- [{d['severity'].upper()}] {d['alert_type']}: {d['message']}"
        )
        if d.get("topic"):
            lines[-1] += f" (topic: {d['topic']})"
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Tool: Weekly Digest
# ---------------------------------------------------------------------------

@tool
def get_weekly_digest(days: int = 7) -> str:
    """Generate a weekly digest of study activity.

    Returns session counts, averages (understanding, retention, duration),
    mode distribution, friction alert summary, and method effectiveness.

    Args:
        days: Number of days to cover (default 7).
    """
    from weekly_digest import generate_digest, format_digest_markdown

    digest = generate_digest(days=days)
    return format_digest_markdown(digest)[:8000]


# ---------------------------------------------------------------------------
# Tool: Read SOP File
# ---------------------------------------------------------------------------

@tool
def read_sop_file(filename: str) -> str:
    """Read a specific SOP library file by name.

    Files live in sop/library/. Pass the filename (e.g. '05-session-flow.md').
    Available files: 00-overview, 01-core-rules, 02-learning-cycle,
    03-frameworks, 04-engines, 05-session-flow, 06-modes, 07-workload,
    08-logging, 09-templates, 10-deployment, 11-examples, 12-evidence,
    13-custom-gpt-system-instructions, 14-lo-engine, 15-method-library.

    Args:
        filename: The SOP filename (e.g. '05-session-flow.md').
    """
    sop_dir = _REPO_ROOT / "sop" / "library"

    if not filename.endswith(".md"):
        filename += ".md"

    target = sop_dir / filename
    if not target.exists():
        available = sorted(f.name for f in sop_dir.glob("*.md"))
        return f"File not found: {filename}. Available: {', '.join(available)}"

    try:
        text = target.read_text(encoding="utf-8")
        if len(text) > 6000:
            return text[:6000] + "\n\n... (truncated)"
        return text
    except Exception as exc:
        return f"Error reading {filename}: {exc}"


# ---------------------------------------------------------------------------
# Tool: Session Metrics
# ---------------------------------------------------------------------------

@tool
def get_session_metrics(session_id: str) -> str:
    """Calculate detailed metrics for a single study session.

    Returns turns count, average question/answer length, unverified ratio,
    duration, and citation count.

    Args:
        session_id: The session ID to analyse.
    """
    from brain_reader import calculate_session_metrics

    metrics = calculate_session_metrics(session_id)
    return _json_dumps(metrics)


# ---------------------------------------------------------------------------
# Tool: Method Effectiveness
# ---------------------------------------------------------------------------

@tool
def get_method_effectiveness() -> str:
    """Get method library effectiveness summary.

    Returns block/chain/rating counts, average effectiveness,
    category breakdown, and top/bottom performers.
    """
    from brain_reader import get_method_effectiveness_summary

    result = get_method_effectiveness_summary()
    if result is None:
        return "Method tables not found in database."
    return _json_dumps(result)


# ---------------------------------------------------------------------------
# Tool: Recent Sessions
# ---------------------------------------------------------------------------

@tool
def get_recent_sessions(days: int = 7) -> str:
    """Fetch recent study sessions from the Brain database.

    Returns a list of sessions with dates, topics, modes, durations, and scores.

    Args:
        days: Number of days to look back (default 7).
    """
    from brain_reader import get_recent_sessions as _get_recent

    sessions = _get_recent(days=days)
    if not sessions:
        return "No sessions found in the specified period."

    lines = [f"Found {len(sessions)} session(s) in the last {days} days:\n"]
    for s in sessions[:20]:
        line = (
            f"- [{s.get('session_date', '?')}] "
            f"topic={s.get('topic', 'N/A')}, "
            f"mode={s.get('study_mode', 'N/A')}, "
            f"duration={s.get('duration_minutes', '?')}min, "
            f"understanding={s.get('understanding_rating', '?')}/10"
        )
        lines.append(line)

    if len(sessions) > 20:
        lines.append(f"... and {len(sessions) - 20} more.")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public: collect all tools
# ---------------------------------------------------------------------------

ALL_TOOLS = [
    get_telemetry_snapshot,
    get_friction_alerts,
    get_weekly_digest,
    read_sop_file,
    get_session_metrics,
    get_method_effectiveness,
    get_recent_sessions,
]
