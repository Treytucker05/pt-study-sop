
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

    # WRAP v9.2 metrics
    wrap_fields = ["anki_cards_text", "glossary_entries", "wrap_watchlist", "clinical_links", "spaced_reviews"]
    
    # Count sessions with errors logged
    sessions_with_errors = sum(
        1 for s in sessions
        if any(s.get(f) for f in ["errors_conceptual", "errors_discrimination", "errors_recall"])
    )
    
    # Count glossary entries (semicolon or newline separated)
    total_glossary_terms = 0
    for s in sessions:
        glossary = s.get("glossary_entries") or ""
        if glossary.strip():
            # Count entries separated by semicolons, newlines, or bullet points
            entries = re.split(r"[;\n]", glossary)
            total_glossary_terms += sum(1 for e in entries if e.strip() and not e.strip().startswith("#"))
    
    # Count sessions with spaced reviews scheduled
    sessions_with_spaced_reviews = sum(
        1 for s in sessions if s.get("spaced_reviews") and s.get("spaced_reviews").strip()
    )
    
    # Calculate average WRAP completeness percentage
    wrap_completeness_scores = []
    for s in sessions:
        filled = sum(1 for f in wrap_fields if s.get(f) and str(s.get(f)).strip())
        wrap_completeness_scores.append((filled / len(wrap_fields)) * 100)
    avg_wrap_completeness = round(sum(wrap_completeness_scores) / len(wrap_completeness_scores), 1) if wrap_completeness_scores else 0

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
            "glossary_terms": total_glossary_terms,
            "sessions_with_errors": sessions_with_errors,
            "sessions_with_spaced_reviews": sessions_with_spaced_reviews,
        },
        "wrap_metrics": {
            "avg_completeness": avg_wrap_completeness,
            "spaced_review_compliance": round((sessions_with_spaced_reviews / len(sessions)) * 100, 1) if sessions else 0,
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


def get_mastery_stats():
    """
    Get topic mastery statistics for identifying weak areas and relearning needs.
    
    Returns:
        dict with:
        - repeatedly_studied: Topics with highest study_count (potential weak areas)
        - lowest_understanding: Topics with lowest avg_understanding
        - stale_topics: Topics not studied in 14+ days
    """
    import sqlite3
    from db_setup import DB_PATH
    
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    results = {
        "repeatedly_studied": [],
        "lowest_understanding": [],
        "stale_topics": [],
    }
    
    try:
        # Topics with highest study_count (repeatedly relearned - potential weak areas)
        cursor.execute(
            """
            SELECT topic, study_count, last_studied, first_studied, avg_understanding, avg_retention
            FROM topic_mastery
            WHERE study_count > 1
            ORDER BY study_count DESC
            LIMIT 10
            """
        )
        results["repeatedly_studied"] = [
            {
                "topic": row["topic"],
                "study_count": row["study_count"],
                "last_studied": row["last_studied"],
                "first_studied": row["first_studied"],
                "avg_understanding": round(row["avg_understanding"], 2) if row["avg_understanding"] else None,
                "avg_retention": round(row["avg_retention"], 2) if row["avg_retention"] else None,
            }
            for row in cursor.fetchall()
        ]
        
        # Topics with lowest avg_understanding
        cursor.execute(
            """
            SELECT topic, study_count, last_studied, avg_understanding, avg_retention
            FROM topic_mastery
            WHERE avg_understanding IS NOT NULL
            ORDER BY avg_understanding ASC
            LIMIT 10
            """
        )
        results["lowest_understanding"] = [
            {
                "topic": row["topic"],
                "study_count": row["study_count"],
                "last_studied": row["last_studied"],
                "avg_understanding": round(row["avg_understanding"], 2),
                "avg_retention": round(row["avg_retention"], 2) if row["avg_retention"] else None,
            }
            for row in cursor.fetchall()
        ]
        
        # Topics not studied in 14+ days (getting stale)
        stale_cutoff = (datetime.now() - timedelta(days=14)).strftime("%Y-%m-%d")
        cursor.execute(
            """
            SELECT topic, study_count, last_studied, avg_understanding, avg_retention
            FROM topic_mastery
            WHERE last_studied < ?
            ORDER BY last_studied ASC
            LIMIT 10
            """,
            (stale_cutoff,)
        )
        results["stale_topics"] = [
            {
                "topic": row["topic"],
                "study_count": row["study_count"],
                "last_studied": row["last_studied"],
                "days_since": (datetime.now() - datetime.strptime(row["last_studied"], "%Y-%m-%d")).days if row["last_studied"] else None,
                "avg_understanding": round(row["avg_understanding"], 2) if row["avg_understanding"] else None,
                "avg_retention": round(row["avg_retention"], 2) if row["avg_retention"] else None,
            }
            for row in cursor.fetchall()
        ]
        
    except Exception as e:
        print(f"[WARN] Error fetching mastery stats: {e}")
    finally:
        conn.close()
    
    return results


def get_trend_data(days=30):
    """
    Build daily trend data for the last `days` from the sessions table.

    Returns a dict keyed by:
    - dates: ordered list of YYYY-MM-DD for the window
    - sessions_per_day: daily session counts
    - avg_understanding_per_day: daily avg understanding (null when no sessions)
    - avg_retention_per_day: daily avg retention (null when no sessions)
    - avg_duration_per_day: daily avg duration minutes (0 when no sessions)
    Legacy aliases are kept for the chart helper: understanding, retention, session_count, duration_avg.
    """
    import sqlite3
    from db_setup import DB_PATH

    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    start_date = (datetime.now() - timedelta(days=days - 1)).date()
    cutoff_date = start_date.strftime("%Y-%m-%d")

    # Pre-fill the window so days with zero sessions are present in the chart
    results = {
        "dates": [],
        "sessions_per_day": [],
        "avg_understanding_per_day": [],
        "avg_retention_per_day": [],
        "avg_duration_per_day": [],
    }

    try:
        cursor.execute(
            """
            SELECT 
                session_date,
                COUNT(*) AS session_count,
                AVG(understanding_level) AS avg_understanding,
                AVG(retention_confidence) AS avg_retention,
                AVG(COALESCE(duration_minutes, time_spent_minutes, 0)) AS avg_duration
            FROM sessions
            WHERE session_date >= ?
            GROUP BY session_date
            ORDER BY session_date ASC
            """,
            (cutoff_date,)
        )

        rows = cursor.fetchall()
        daily_map = {
            row["session_date"]: {
                "session_count": row["session_count"] or 0,
                "avg_understanding": row["avg_understanding"],
                "avg_retention": row["avg_retention"],
                "avg_duration": row["avg_duration"],
            }
            for row in rows
        }

        for i in range(days):
            current_date = start_date + timedelta(days=i)
            date_str = current_date.strftime("%Y-%m-%d")
            day_data = daily_map.get(date_str, {})

            results["dates"].append(date_str)
            results["sessions_per_day"].append(day_data.get("session_count", 0))
            results["avg_understanding_per_day"].append(
                round(day_data["avg_understanding"], 2)
                if day_data.get("avg_understanding") is not None
                else None
            )
            results["avg_retention_per_day"].append(
                round(day_data["avg_retention"], 2)
                if day_data.get("avg_retention") is not None
                else None
            )
            results["avg_duration_per_day"].append(
                round(day_data["avg_duration"])
                if day_data.get("avg_duration") is not None
                else 0
            )

    except Exception as e:
        print(f"[WARN] Error fetching trend data: {e}")
    finally:
        conn.close()

    # Backwards-compatible aliases for the existing chart helper
    results["understanding"] = results["avg_understanding_per_day"]
    results["retention"] = results["avg_retention_per_day"]
    results["session_count"] = results["sessions_per_day"]
    results["duration_avg"] = results["avg_duration_per_day"]

    return results


def get_wrap_analytics():
    """
    Get comprehensive WRAP v9.2 analytics including error patterns,
    completeness scoring, glossary counts, and spaced review compliance.
    
    Returns:
        dict with:
        - error_tracking: Sessions with errors and recurring error terms
        - wrap_completeness: Breakdown of completeness by session
        - glossary_stats: Total terms and top entries
        - spaced_review_stats: Compliance metrics
    """
    import sqlite3
    from db_setup import DB_PATH
    
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    results = {
        "error_tracking": {
            "sessions_with_errors": 0,
            "total_sessions": 0,
            "error_rate": 0,
            "conceptual_errors": [],
            "discrimination_errors": [],
            "recall_errors": [],
            "recurring_terms": [],
        },
        "wrap_completeness": {
            "avg_completeness": 0,
            "fully_complete": 0,
            "partially_complete": 0,
            "empty": 0,
            "field_fill_rates": {},
        },
        "glossary_stats": {
            "total_terms": 0,
            "sessions_with_glossary": 0,
            "avg_terms_per_session": 0,
        },
        "spaced_review_stats": {
            "sessions_scheduled": 0,
            "sessions_not_scheduled": 0,
            "compliance_rate": 0,
        },
    }
    
    wrap_fields = ["anki_cards_text", "glossary_entries", "wrap_watchlist", "clinical_links", "spaced_reviews"]
    
    try:
        # Fetch all sessions with WRAP fields
        cursor.execute(
            """
            SELECT id, session_date, main_topic,
                   anki_cards_text, glossary_entries, wrap_watchlist,
                   clinical_links, spaced_reviews,
                   errors_conceptual, errors_discrimination, errors_recall
            FROM sessions
            ORDER BY session_date DESC
            """
        )
        rows = cursor.fetchall()
        total_sessions = len(rows)
        results["error_tracking"]["total_sessions"] = total_sessions
        
        if not rows:
            return results
        
        # Error tracking
        sessions_with_errors = 0
        all_error_terms = Counter()
        conceptual_list = []
        discrimination_list = []
        recall_list = []
        
        for row in rows:
            has_error = False
            for error_field, error_list in [
                ("errors_conceptual", conceptual_list),
                ("errors_discrimination", discrimination_list),
                ("errors_recall", recall_list),
            ]:
                error_text = row[error_field] or ""
                if error_text.strip():
                    has_error = True
                    error_list.append({
                        "session_date": row["session_date"],
                        "topic": row["main_topic"],
                        "error": error_text.strip()[:200],  # Truncate for display
                    })
                    # Extract terms for frequency analysis
                    for term in re.split(r"[;,\n]", error_text):
                        term = term.strip().lower()
                        if term and len(term) > 3:
                            all_error_terms[term] += 1
            
            if has_error:
                sessions_with_errors += 1
        
        results["error_tracking"]["sessions_with_errors"] = sessions_with_errors
        results["error_tracking"]["error_rate"] = round((sessions_with_errors / total_sessions) * 100, 1) if total_sessions else 0
        results["error_tracking"]["conceptual_errors"] = conceptual_list[:10]
        results["error_tracking"]["discrimination_errors"] = discrimination_list[:10]
        results["error_tracking"]["recall_errors"] = recall_list[:10]
        results["error_tracking"]["recurring_terms"] = all_error_terms.most_common(10)
        
        # WRAP completeness scoring
        completeness_scores = []
        field_fill_counts = {f: 0 for f in wrap_fields}
        fully_complete = 0
        partially_complete = 0
        empty = 0
        
        for row in rows:
            filled = 0
            for field in wrap_fields:
                if row[field] and str(row[field]).strip():
                    filled += 1
                    field_fill_counts[field] += 1
            
            score = (filled / len(wrap_fields)) * 100
            completeness_scores.append(score)
            
            if filled == len(wrap_fields):
                fully_complete += 1
            elif filled > 0:
                partially_complete += 1
            else:
                empty += 1
        
        results["wrap_completeness"]["avg_completeness"] = round(sum(completeness_scores) / len(completeness_scores), 1) if completeness_scores else 0
        results["wrap_completeness"]["fully_complete"] = fully_complete
        results["wrap_completeness"]["partially_complete"] = partially_complete
        results["wrap_completeness"]["empty"] = empty
        results["wrap_completeness"]["field_fill_rates"] = {
            field: round((count / total_sessions) * 100, 1) if total_sessions else 0
            for field, count in field_fill_counts.items()
        }
        
        # Glossary stats
        total_glossary_terms = 0
        sessions_with_glossary = 0
        
        for row in rows:
            glossary = row["glossary_entries"] or ""
            if glossary.strip():
                sessions_with_glossary += 1
                entries = re.split(r"[;\n]", glossary)
                term_count = sum(1 for e in entries if e.strip() and not e.strip().startswith("#"))
                total_glossary_terms += term_count
        
        results["glossary_stats"]["total_terms"] = total_glossary_terms
        results["glossary_stats"]["sessions_with_glossary"] = sessions_with_glossary
        results["glossary_stats"]["avg_terms_per_session"] = round(total_glossary_terms / sessions_with_glossary, 1) if sessions_with_glossary else 0
        
        # Spaced review compliance
        sessions_scheduled = sum(1 for row in rows if row["spaced_reviews"] and row["spaced_reviews"].strip())
        sessions_not_scheduled = total_sessions - sessions_scheduled
        
        results["spaced_review_stats"]["sessions_scheduled"] = sessions_scheduled
        results["spaced_review_stats"]["sessions_not_scheduled"] = sessions_not_scheduled
        results["spaced_review_stats"]["compliance_rate"] = round((sessions_scheduled / total_sessions) * 100, 1) if total_sessions else 0
        
    except Exception as e:
        print(f"[WARN] Error fetching WRAP analytics: {e}")
    finally:
        conn.close()
    
    return results
