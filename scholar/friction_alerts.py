#!/usr/bin/env python3
"""
Friction Alerts - Detect patterns indicating friction in study sessions.

Reads from Brain (via brain_reader.py) and generates alerts for Scholar
workflows to review. Scholar can flag these for user attention.

Alert types:
- HIGH_UNVERIFIED_RATIO: >30% of answers not grounded in sources
- SHORT_SESSION: Session under 15 minutes (may indicate frustration/abandon)
- LONG_SESSION: Session over 90 minutes without WRAP (burnout risk)
- LOW_CITATIONS: Session with minimal source citations
- LOW_UNDERSTANDING: Understanding score <= 2
- NO_WRAP_PHASE: Session ended without reaching WRAP
- SOURCE_DRIFT: Off-source drift flagged in session log
- REPEATED_TOPIC_STRUGGLE: Same topic has multiple low-score sessions

Usage:
    python friction_alerts.py           # Generate alerts for last 7 days
    python friction_alerts.py --days 30 # Generate alerts for last 30 days
    python friction_alerts.py --json    # Output as JSON
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional

# Import brain_reader from same directory
try:
    from . import brain_reader
except ImportError:
    import brain_reader


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertType(Enum):
    """Types of friction alerts."""
    HIGH_UNVERIFIED_RATIO = "high_unverified_ratio"
    SHORT_SESSION = "short_session"
    LONG_SESSION = "long_session"
    LOW_CITATIONS = "low_citations"
    LOW_UNDERSTANDING = "low_understanding"
    NO_WRAP_PHASE = "no_wrap_phase"
    SOURCE_DRIFT = "source_drift"
    REPEATED_TOPIC_STRUGGLE = "repeated_topic_struggle"
    DB_UNAVAILABLE = "db_unavailable"


@dataclass
class FrictionAlert:
    """A friction alert detected from session data."""
    alert_type: str
    severity: str
    message: str
    session_id: Optional[int] = None
    session_date: Optional[str] = None
    topic: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: str = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Threshold Configuration
# ---------------------------------------------------------------------------

THRESHOLDS = {
    "unverified_ratio": 0.30,        # >30% unverified -> alert
    "short_session_minutes": 15,      # <15 min -> short session
    "long_session_minutes": 90,       # >90 min without WRAP -> burnout risk
    "low_citations_per_turn": 0.5,    # <0.5 citations/turn on average -> low
    "low_understanding_score": 2,     # <=2 -> flag
    "repeated_struggle_count": 3,     # Same topic with >=3 low scores
}


# ---------------------------------------------------------------------------
# Alert Detection Functions
# ---------------------------------------------------------------------------

def check_unverified_ratio(session_id: str) -> Optional[FrictionAlert]:
    """
    Check if a session has high ratio of unverified answers.
    
    Unverified answers aren't grounded in RAG sources - this can
    indicate hallucination risk or missing course materials.
    """
    metrics = brain_reader.calculate_session_metrics(session_id)
    
    if metrics["turns_count"] == 0:
        return None
    
    ratio = metrics["unverified_ratio"]
    threshold = THRESHOLDS["unverified_ratio"]
    
    if ratio > threshold:
        return FrictionAlert(
            alert_type=AlertType.HIGH_UNVERIFIED_RATIO.value,
            severity=AlertSeverity.WARNING.value,
            message=f"High unverified answer ratio: {ratio:.0%} (>{threshold:.0%})",
            details={
                "unverified_ratio": ratio,
                "turns_count": metrics["turns_count"],
                "threshold": threshold
            }
        )
    
    return None


def check_low_citations(session_id: str) -> Optional[FrictionAlert]:
    """
    Check if session has low citation usage.
    
    Low citations may indicate:
    - Missing RAG content for topic
    - Student asking off-topic questions
    - System not finding relevant sources
    """
    metrics = brain_reader.calculate_session_metrics(session_id)
    
    if metrics["turns_count"] == 0:
        return None
    
    citations_per_turn = metrics["citations_count"] / metrics["turns_count"]
    threshold = THRESHOLDS["low_citations_per_turn"]
    
    if citations_per_turn < threshold:
        return FrictionAlert(
            alert_type=AlertType.LOW_CITATIONS.value,
            severity=AlertSeverity.INFO.value,
            message=f"Low citation usage: {citations_per_turn:.2f}/turn (<{threshold}/turn)",
            details={
                "citations_per_turn": round(citations_per_turn, 2),
                "total_citations": metrics["citations_count"],
                "turns_count": metrics["turns_count"],
                "threshold": threshold
            }
        )
    
    return None


def check_session_duration(session: brain_reader.SessionRecord) -> List[FrictionAlert]:
    """
    Check for problematic session durations.
    
    Short sessions may indicate frustration or abandonment.
    Long sessions without WRAP may indicate burnout.
    """
    alerts = []
    duration = session.duration_minutes or 0
    
    # Short session check
    if duration < THRESHOLDS["short_session_minutes"] and duration > 0:
        alerts.append(FrictionAlert(
            alert_type=AlertType.SHORT_SESSION.value,
            severity=AlertSeverity.INFO.value,
            message=f"Short session: {duration} min (<{THRESHOLDS['short_session_minutes']} min)",
            session_id=session.id,
            session_date=session.session_date,
            topic=session.main_topic,
            details={
                "duration_minutes": duration,
                "threshold": THRESHOLDS["short_session_minutes"]
            }
        ))
    
    # Long session without WRAP check
    if duration > THRESHOLDS["long_session_minutes"]:
        wrap_reached = session.wrap_phase_reached
        if wrap_reached and wrap_reached.lower() in ("no", "n", "false", "0", ""):
            alerts.append(FrictionAlert(
                alert_type=AlertType.LONG_SESSION.value,
                severity=AlertSeverity.WARNING.value,
                message=f"Long session without WRAP: {duration} min (>{THRESHOLDS['long_session_minutes']} min)",
                session_id=session.id,
                session_date=session.session_date,
                topic=session.main_topic,
                details={
                    "duration_minutes": duration,
                    "wrap_reached": wrap_reached,
                    "threshold": THRESHOLDS["long_session_minutes"]
                }
            ))
    
    return alerts


def check_understanding_level(session: brain_reader.SessionRecord) -> Optional[FrictionAlert]:
    """
    Check for low understanding scores.
    
    Low understanding indicates struggle - topic may need
    additional resources or different approach.
    """
    level = session.understanding_level
    threshold = THRESHOLDS["low_understanding_score"]
    
    if level is not None and level <= threshold:
        return FrictionAlert(
            alert_type=AlertType.LOW_UNDERSTANDING.value,
            severity=AlertSeverity.WARNING.value,
            message=f"Low understanding: {level}/5 (≤{threshold})",
            session_id=session.id,
            session_date=session.session_date,
            topic=session.main_topic,
            details={
                "understanding_level": level,
                "threshold": threshold
            }
        )
    
    return None


def check_no_wrap_phase(session: brain_reader.SessionRecord) -> Optional[FrictionAlert]:
    """
    Check if session completed without reaching WRAP phase.
    
    WRAP is critical for consolidation - missing it may indicate
    time pressure or disengagement.
    """
    wrap_reached = session.wrap_phase_reached
    
    if wrap_reached and wrap_reached.lower() in ("no", "n", "false", "0"):
        return FrictionAlert(
            alert_type=AlertType.NO_WRAP_PHASE.value,
            severity=AlertSeverity.INFO.value,
            message="Session ended without WRAP phase",
            session_id=session.id,
            session_date=session.session_date,
            topic=session.main_topic,
            details={
                "wrap_phase_reached": wrap_reached,
                "study_mode": session.study_mode
            }
        )
    
    return None


def check_source_drift(session: brain_reader.SessionRecord) -> Optional[FrictionAlert]:
    """
    Check if session had off-source drift flagged.
    
    Drift indicates student went outside approved sources -
    may need source lock reinforcement or additional materials.
    """
    drift = session.off_source_drift
    
    if drift and drift.strip().lower() not in ("", "none", "no", "n/a"):
        return FrictionAlert(
            alert_type=AlertType.SOURCE_DRIFT.value,
            severity=AlertSeverity.INFO.value,
            message=f"Off-source drift detected: {drift[:100]}...",
            session_id=session.id,
            session_date=session.session_date,
            topic=session.main_topic,
            details={
                "off_source_drift": drift
            }
        )
    
    return None


def check_repeated_topic_struggle(sessions: List[brain_reader.SessionRecord]) -> List[FrictionAlert]:
    """
    Check for topics with repeated low understanding scores.
    
    Multiple struggles with same topic indicates need for
    different approach, additional resources, or tutor intervention.
    """
    alerts = []
    
    # Group sessions by topic
    topic_scores: Dict[str, List[tuple]] = {}
    
    for s in sessions:
        topic = s.main_topic
        if not topic:
            continue
        
        topic_normalized = topic.lower().strip()
        level = s.understanding_level
        
        if level is not None and level <= THRESHOLDS["low_understanding_score"]:
            if topic_normalized not in topic_scores:
                topic_scores[topic_normalized] = []
            topic_scores[topic_normalized].append((s.session_date, s.id, level))
    
    # Flag topics with repeated struggles
    threshold = THRESHOLDS["repeated_struggle_count"]
    
    for topic, struggles in topic_scores.items():
        if len(struggles) >= threshold:
            alerts.append(FrictionAlert(
                alert_type=AlertType.REPEATED_TOPIC_STRUGGLE.value,
                severity=AlertSeverity.CRITICAL.value,
                message=f"Repeated struggle with '{topic}': {len(struggles)} low-score sessions",
                topic=topic,
                details={
                    "struggle_count": len(struggles),
                    "sessions": [
                        {"date": d, "id": sid, "level": lvl}
                        for d, sid, lvl in struggles
                    ],
                    "threshold": threshold
                }
            ))
    
    return alerts


# ---------------------------------------------------------------------------
# Main Alert Generation
# ---------------------------------------------------------------------------

def generate_alerts(days: int = 7) -> List[FrictionAlert]:
    """
    Generate all friction alerts for the specified time period.
    
    Args:
        days: Number of days to look back (default 7)
        
    Returns:
        List of FrictionAlert objects, sorted by severity and date
    """
    alerts = []
    
    # Check database availability
    db_path = brain_reader.get_db_path()
    if not db_path.exists():
        alerts.append(FrictionAlert(
            alert_type=AlertType.DB_UNAVAILABLE.value,
            severity=AlertSeverity.CRITICAL.value,
            message=f"Brain database not found at {db_path}",
            details={"db_path": str(db_path)}
        ))
        return alerts
    
    # Get recent sessions
    sessions = brain_reader.get_recent_sessions(days)
    session_records = [brain_reader.SessionRecord.from_row(type('Row', (), s)()) 
                       if isinstance(s, dict) else s 
                       for s in sessions]
    
    # Actually, get_recent_sessions returns dicts, so we need to fetch SessionRecords
    session_records = []
    for s_dict in sessions:
        s_id = s_dict.get("id")
        if s_id:
            record = brain_reader.get_session_by_id(s_id)
            if record:
                session_records.append(record)
    
    # Check each session for individual alerts
    for session in session_records:
        # Duration checks
        alerts.extend(check_session_duration(session))
        
        # Understanding check
        alert = check_understanding_level(session)
        if alert:
            alerts.append(alert)
        
        # WRAP phase check
        alert = check_no_wrap_phase(session)
        if alert:
            alerts.append(alert)
        
        # Source drift check
        alert = check_source_drift(session)
        if alert:
            alerts.append(alert)
    
    # Check for repeated topic struggles across all sessions
    all_sessions = brain_reader.get_all_sessions()
    alerts.extend(check_repeated_topic_struggle(all_sessions))
    
    # Check tutor turns for unverified ratio and citations
    turns = brain_reader.get_recent_tutor_turns(days)
    session_ids_with_turns = set(t.get("session_id") for t in turns if t.get("session_id"))
    
    for session_id in session_ids_with_turns:
        # Unverified ratio check
        alert = check_unverified_ratio(session_id)
        if alert:
            alerts.append(alert)
        
        # Low citations check
        alert = check_low_citations(session_id)
        if alert:
            alerts.append(alert)
    
    # Sort by severity (critical first) then by date
    severity_order = {
        AlertSeverity.CRITICAL.value: 0,
        AlertSeverity.WARNING.value: 1,
        AlertSeverity.INFO.value: 2
    }
    
    alerts.sort(key=lambda a: (severity_order.get(a.severity, 99), a.created_at or ""))
    
    return alerts


def get_alert_summary(days: int = 7) -> Dict[str, Any]:
    """
    Generate a summary of all alerts for the time period.
    
    Returns:
        Dict with counts by severity and type, plus the alert list.
    """
    alerts = generate_alerts(days)
    
    summary = {
        "period_days": days,
        "generated_at": datetime.now().isoformat(),
        "total_alerts": len(alerts),
        "by_severity": {
            "critical": 0,
            "warning": 0,
            "info": 0
        },
        "by_type": {},
        "alerts": [a.to_dict() for a in alerts]
    }
    
    for alert in alerts:
        # Count by severity
        if alert.severity in summary["by_severity"]:
            summary["by_severity"][alert.severity] += 1
        
        # Count by type
        atype = alert.alert_type
        if atype not in summary["by_type"]:
            summary["by_type"][atype] = 0
        summary["by_type"][atype] += 1
    
    return summary


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def print_alerts(alerts: List[FrictionAlert]) -> None:
    """Pretty-print alerts to console."""
    if not alerts:
        print("[OK] No friction alerts detected.")
        return
    
    severity_icons = {
        "critical": "🔴",
        "warning": "🟡",
        "info": "🔵"
    }
    
    print(f"\n{'=' * 60}")
    print(f"FRICTION ALERTS ({len(alerts)} found)")
    print(f"{'=' * 60}\n")
    
    for i, alert in enumerate(alerts, 1):
        icon = severity_icons.get(alert.severity, "⚪")
        print(f"{i}. {icon} [{alert.severity.upper()}] {alert.alert_type}")
        print(f"   {alert.message}")
        
        if alert.session_date:
            print(f"   Session: {alert.session_date}", end="")
            if alert.topic:
                print(f" | Topic: {alert.topic}")
            else:
                print()
        
        if alert.details:
            details_str = json.dumps(alert.details, indent=6)
            # Only show first few lines of details
            lines = details_str.split("\n")[:5]
            if len(lines) < len(details_str.split("\n")):
                lines.append("      ...")
            print("   Details:", "\n".join(lines[:1]))
        
        print()


def main():
    """CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate friction alerts from Brain study data"
    )
    parser.add_argument(
        "--days", "-d",
        type=int,
        default=7,
        help="Number of days to analyze (default: 7)"
    )
    parser.add_argument(
        "--json", "-j",
        action="store_true",
        help="Output as JSON instead of formatted text"
    )
    parser.add_argument(
        "--summary", "-s",
        action="store_true",
        help="Include summary statistics"
    )
    
    args = parser.parse_args()
    
    print(f"Analyzing last {args.days} days for friction patterns...\n")
    
    if args.json or args.summary:
        summary = get_alert_summary(args.days)
        if args.json:
            print(json.dumps(summary, indent=2))
        else:
            print(f"Summary: {summary['total_alerts']} alerts")
            print(f"  Critical: {summary['by_severity']['critical']}")
            print(f"  Warning: {summary['by_severity']['warning']}")
            print(f"  Info: {summary['by_severity']['info']}")
            print()
            alerts = [FrictionAlert(**a) for a in summary["alerts"]]
            print_alerts(alerts)
    else:
        alerts = generate_alerts(args.days)
        print_alerts(alerts)


if __name__ == "__main__":
    main()
