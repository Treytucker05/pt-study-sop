
import re
from collections import Counter
from datetime import datetime, timedelta
from config import (
    WEAK_THRESHOLD,
    STRONG_THRESHOLD,
)
from dashboard.cli import get_all_sessions

def analyze_sessions(sessions):
    """
    Lightweight analytics for dashboard cards (v9.1 schema).
    """
    if not sessions:
        return {}

    def average(key):
        vals = [s[key] for s in sessions if s.get(key) is not None]
        return sum(vals) / len(vals) if vals else 0

    avg_understanding = average("understanding_level")
    avg_retention = average("retention_confidence")
    avg_performance = average("system_performance")

    # Study modes
    mode_counts = Counter(s["study_mode"] for s in sessions if s.get("study_mode"))

    # Frameworks
    frameworks = Counter()
    for s in sessions:
        fw = s.get("frameworks_used") or ""
        for token in re.split(r"[;,/]", fw):
            token = token.strip()
            if token:
                frameworks[token] += 1

    # Topics with recency
    topics = {}
    for s in sessions:
        topic = s.get("topic") or s.get("main_topic")
        if not topic:
            continue
        date = s.get("session_date") or ""
        if topic not in topics or date > topics[topic]:
            topics[topic] = date
    topics_covered = sorted(
        ({"topic": t, "date": d} for t, d in topics.items()),
        key=lambda x: x["date"],
        reverse=True,
    )

    # Weak / strong topics
    weak = []
    strong = []
    for topic in topics:
        t_sessions = [
            s for s in sessions
            if (s.get("topic") or s.get("main_topic")) == topic
            and s.get("understanding_level") is not None
        ]
        if not t_sessions:
            continue
        avg_u = sum(s["understanding_level"] for s in t_sessions) / len(t_sessions)
        last_date = max(s.get("session_date") or "" for s in t_sessions)
        entry = {"topic": topic, "understanding": round(avg_u, 2), "date": last_date}
        if avg_u < WEAK_THRESHOLD:
            weak.append(entry)
        if avg_u >= STRONG_THRESHOLD:
            strong.append(entry)

    weak = sorted(weak, key=lambda x: x["understanding"])
    strong = sorted(strong, key=lambda x: x["understanding"], reverse=True)

    what_worked_list = [s["what_worked"] for s in sessions if s.get("what_worked")]
    common_issues = [s["what_needs_fixing"] for s in sessions if s.get("what_needs_fixing")]

    return {
        "avg_understanding": avg_understanding,
        "avg_retention": avg_retention,
        "avg_performance": avg_performance,
        "study_modes": mode_counts,
        "frameworks_used": frameworks,
        "topics_covered": topics_covered,
        "weak_areas": weak,
        "strong_areas": strong,
        "what_worked_list": what_worked_list,
        "common_issues": common_issues,
    }


def build_stats():
    raw_sessions = get_all_sessions()

    # Normalize field names to UI expectations
    sessions = []
    for s in raw_sessions:
        d = dict(s)
        d["topic"] = d.get("main_topic") or d.get("topic") or ""
        d["time_spent_minutes"] = d.get("duration_minutes") or d.get("time_spent_minutes") or 0
        sessions.append(d)

    analysis = analyze_sessions(sessions) if sessions else None

    def avg(val):
        return round(val, 2) if val else 0

    # Calculate 30-day stats
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    recent_sessions = [s for s in sessions if s.get("session_date", "") >= thirty_days_ago] if sessions else []

    total_minutes = sum(s.get("time_spent_minutes", 0) for s in sessions)
    recent_minutes = sum(s.get("time_spent_minutes", 0) for s in recent_sessions)

    unique_days = len(set(s.get("session_date") for s in recent_sessions if s.get("session_date")))
    avg_daily_minutes = recent_minutes // unique_days if unique_days else 0

    mode_counts = analysis["study_modes"] if analysis else {}
    total_mode_count = sum(mode_counts.values()) if mode_counts else 0
    mode_percentages = (
        {k: round((v / total_mode_count) * 100) for k, v in mode_counts.items()} if total_mode_count else {}
    )

    avg_u = avg(analysis["avg_understanding"]) if analysis else 0
    avg_r = avg(analysis["avg_retention"]) if analysis else 0
    avg_p = avg(analysis["avg_performance"]) if analysis else 0
    overall_pct = round(((avg_u + avg_r + avg_p) / 15) * 100, 1) if analysis else 0

    return {
        "counts": {
            "sessions": len(sessions),
            "sessions_30d": len(recent_sessions),
            "topics": len(set(s["topic"] for s in sessions)) if sessions else 0,
            "anki_cards": sum(s.get("anki_cards_count") or 0 for s in sessions),
            "total_minutes": total_minutes,
            "avg_daily_minutes": avg_daily_minutes,
        },
        "range": {
            "first_date": min((s.get("session_date") for s in sessions), default=None),
            "last_date": max((s.get("session_date") for s in sessions), default=None),
        },
        "averages": {
            "understanding": avg_u,
            "retention": avg_r,
            "performance": avg_p,
            "overall": overall_pct,
        },
        "modes": mode_counts,
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
