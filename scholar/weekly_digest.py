#!/usr/bin/env python3
"""
Weekly Digest Generator for Scholar.

Assembles a comprehensive weekly summary from Brain data including:
- Session activity and trends
- Friction alerts summary
- Method library effectiveness (optional, if method data exists)

Usage:
    python weekly_digest.py              # Generate digest for last 7 days
    python weekly_digest.py --days 14    # Generate digest for last 14 days
    python weekly_digest.py --json       # Output as JSON
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

try:
    from . import brain_reader
    from .friction_alerts import get_alert_summary
except ImportError:
    import brain_reader
    from friction_alerts import get_alert_summary


def _build_session_section(days: int) -> Dict[str, Any]:
    """Build session activity section of the digest."""
    sessions = brain_reader.get_recent_sessions(days)
    metrics = brain_reader.get_average_metrics()
    mode_dist = brain_reader.get_study_mode_distribution()

    return {
        "session_count": len(sessions),
        "avg_understanding": metrics.get("avg_understanding", 0),
        "avg_retention": metrics.get("avg_retention", 0),
        "avg_performance": metrics.get("avg_performance", 0),
        "avg_duration_minutes": metrics.get("avg_duration_minutes", 0),
        "mode_distribution": mode_dist,
    }


def _build_friction_section(days: int) -> Dict[str, Any]:
    """Build friction alerts section of the digest."""
    return get_alert_summary(days)


def _build_method_section() -> Optional[Dict[str, Any]]:
    """
    Build method effectiveness section of the digest.

    Returns None if method tables don't exist or have no data,
    allowing the caller to skip this section gracefully.
    """
    summary = brain_reader.get_method_effectiveness_summary()
    if summary is None:
        return None

    anomalies = brain_reader.get_method_anomalies()

    return {
        "summary": summary,
        "anomalies": anomalies,
    }


def generate_digest(days: int = 7) -> Dict[str, Any]:
    """
    Generate the full weekly digest context.

    Args:
        days: Number of days to cover (default 7).

    Returns:
        Dict with sections: meta, sessions, friction, methods (optional).
    """
    digest: Dict[str, Any] = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "period_days": days,
            "date_range_start": brain_reader._date_n_days_ago(days),
            "date_range_end": datetime.now().strftime("%Y-%m-%d"),
        },
        "sessions": _build_session_section(days),
        "friction": _build_friction_section(days),
    }

    method_data = _build_method_section()
    if method_data is not None:
        digest["methods"] = method_data

    return digest


def format_digest_markdown(digest: Dict[str, Any]) -> str:
    """Render digest dict as a readable markdown report."""
    meta = digest["meta"]
    sessions = digest["sessions"]
    friction = digest["friction"]

    lines: List[str] = []
    lines.append(f"# Weekly Digest ({meta['date_range_start']} to {meta['date_range_end']})")
    lines.append(f"Generated: {meta['generated_at']}")
    lines.append("")

    # Sessions section
    lines.append("## Sessions")
    lines.append(f"- **Count:** {sessions['session_count']}")
    lines.append(f"- **Avg Understanding:** {sessions['avg_understanding']}")
    lines.append(f"- **Avg Retention:** {sessions['avg_retention']}")
    lines.append(f"- **Avg Duration:** {sessions['avg_duration_minutes']} min")
    if sessions["mode_distribution"]:
        lines.append("- **Mode Distribution:**")
        for mode, count in sessions["mode_distribution"].items():
            lines.append(f"  - {mode}: {count}")
    lines.append("")

    # Friction section
    lines.append("## Friction Alerts")
    lines.append(f"- **Total:** {friction['total_alerts']}")
    sev = friction.get("by_severity", {})
    lines.append(f"- Critical: {sev.get('critical', 0)} | Warning: {sev.get('warning', 0)} | Info: {sev.get('info', 0)}")
    lines.append("")

    # Methods section (optional)
    methods = digest.get("methods")
    if methods:
        summary = methods.get("summary", {})
        anomalies = methods.get("anomalies", {})

        lines.append("## Method Effectiveness")
        lines.append(f"- **Blocks:** {summary.get('total_blocks', 0)}")
        lines.append(f"- **Chains:** {summary.get('total_chains', 0)}")
        lines.append(f"- **Total Ratings:** {summary.get('total_ratings', 0)}")
        lines.append(f"- **Avg Effectiveness:** {summary.get('avg_effectiveness', 'N/A')}")

        top = summary.get("top_performers", [])
        if top:
            lines.append("- **Top Performers:**")
            for p in top[:3]:
                lines.append(f"  - {p['name']} ({p['category']}): {p['avg_effectiveness']} avg ({p['rating_count']} ratings)")

        bottom = summary.get("bottom_performers", [])
        if bottom:
            lines.append("- **Bottom Performers:**")
            for p in bottom[:3]:
                lines.append(f"  - {p['name']} ({p['category']}): {p['avg_effectiveness']} avg ({p['rating_count']} ratings)")

        if anomalies:
            nr = anomalies.get("never_rated", [])
            underused = anomalies.get("underused", [])
            low = anomalies.get("low_performers", [])
            hv = anomalies.get("high_variance", [])

            if nr or underused or low or hv:
                lines.append("- **Anomalies:**")
                if nr:
                    lines.append(f"  - Never rated: {len(nr)} items")
                if underused:
                    lines.append(f"  - Underused (high potential): {len(underused)} items")
                if low:
                    lines.append(f"  - Low performers: {len(low)} items")
                if hv:
                    lines.append(f"  - High variance: {len(hv)} items")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Generate weekly study digest")
    parser.add_argument("--days", "-d", type=int, default=7, help="Days to cover (default 7)")
    parser.add_argument("--json", "-j", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    digest = generate_digest(args.days)

    if args.json:
        print(json.dumps(digest, indent=2))
    else:
        print(format_digest_markdown(digest))


if __name__ == "__main__":
    main()
