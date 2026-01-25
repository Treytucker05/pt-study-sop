#!/usr/bin/env python3
"""
Generate a session resume for pasting into GPT at the start of a new session.
Provides context on recent sessions, progress, and recommended focus areas.
"""

import sqlite3
import os
from datetime import datetime, timedelta
from collections import Counter, defaultdict

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'pt_study.db')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'output', 'session_resume.md')

def get_connection():
    return sqlite3.connect(DB_PATH)

def get_recent_sessions(limit=10):
    """Get the most recent sessions."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM sessions 
        ORDER BY session_date DESC, session_time DESC 
        LIMIT ?
    ''', (limit,))
    
    sessions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return sessions

def get_topic_coverage():
    """Get topic coverage with recency."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT main_topic, 
               MAX(session_date) as last_studied,
               COUNT(*) as session_count,
               AVG(understanding_level) as avg_understanding,
               AVG(retention_confidence) as avg_confidence
        FROM sessions
        GROUP BY main_topic
        ORDER BY last_studied DESC
    ''')
    
    topics = cursor.fetchall()
    conn.close()
    return topics

def get_anatomy_coverage():
    """Get anatomy-specific coverage."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT region_covered,
               MAX(session_date) as last_studied,
               COUNT(*) as session_count,
               GROUP_CONCAT(DISTINCT landmarks_mastered) as all_landmarks,
               GROUP_CONCAT(DISTINCT muscles_attached) as all_muscles
        FROM sessions
        WHERE region_covered IS NOT NULL AND region_covered != ''
        GROUP BY region_covered
        ORDER BY last_studied DESC
    ''')
    
    regions = cursor.fetchall()
    conn.close()
    return regions

def get_weak_areas():
    """Identify weak areas based on ratings and patterns."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Topics with low understanding or confidence
    cursor.execute('''
        SELECT main_topic,
               AVG(understanding_level) as avg_understanding,
               AVG(retention_confidence) as avg_confidence,
               MAX(session_date) as last_studied
        FROM sessions
        WHERE understanding_level IS NOT NULL
        GROUP BY main_topic
        HAVING avg_understanding < 4 OR avg_confidence < 4
        ORDER BY avg_understanding ASC
    ''')
    
    weak = cursor.fetchall()
    conn.close()
    return weak

def get_rollback_patterns():
    """Get topics/regions where rollbacks occurred."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT main_topic, region_covered, session_date, rollback_events
        FROM sessions
        WHERE rollback_events LIKE '%Yes%'
        ORDER BY session_date DESC
        LIMIT 5
    ''')
    
    rollbacks = cursor.fetchall()
    conn.close()
    return rollbacks

def get_drift_and_usage_stats():
    """Summarize prompt drift and SOP usage for the last 30 days."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    cursor.execute(
        '''
        SELECT prompt_drift, off_source_drift, sop_modules_used, engines_used, core_learning_modules_used
        FROM sessions
        WHERE session_date >= ?
        ''',
        (thirty_days_ago,),
    )

    rows = cursor.fetchall()
    conn.close()

    prompt_drift_yes = sum(1 for r in rows if (r['prompt_drift'] or '').strip().lower().startswith('y'))
    off_source_yes = sum(1 for r in rows if (r['off_source_drift'] or '').strip().lower().startswith('y'))

    module_counter = Counter()
    engine_counter = Counter()
    core_counter = Counter()

    def update_counter(value, counter):
        if not value:
            return
        parts = [p.strip() for p in value.replace(';', ',').split(',')]
        for part in parts:
            if part:
                counter[part] += 1

    for row in rows:
        update_counter(row['sop_modules_used'], module_counter)
        update_counter(row['engines_used'], engine_counter)
        update_counter(row['core_learning_modules_used'], core_counter)

    return {
        'prompt_drift_yes': prompt_drift_yes,
        'off_source_yes': off_source_yes,
        'sop_modules': module_counter,
        'engines': engine_counter,
        'core_modules': core_counter,
    }

def calculate_readiness_score(exam_topics=None):
    """
    Calculate an overall readiness score (0-100).
    Based on coverage, recency, and confidence.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get all sessions from last 30 days
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    
    cursor.execute('''
        SELECT COUNT(DISTINCT main_topic) as topics_covered,
               AVG(understanding_level) as avg_understanding,
               AVG(retention_confidence) as avg_confidence,
               COUNT(*) as total_sessions
        FROM sessions
        WHERE session_date >= ?
    ''', (thirty_days_ago,))
    
    result = cursor.fetchone()
    conn.close()
    
    if not result or result[3] == 0:
        return 0, "No recent sessions"
    
    topics, understanding, confidence, sessions = result
    
    # Simple scoring formula
    # - Topics covered: up to 40 points
    # - Understanding: up to 30 points
    # - Confidence: up to 30 points
    
    topic_score = min(topics * 4, 40)  # 10 topics = 40 points
    understanding_score = (understanding / 5) * 30 if understanding else 0
    confidence_score = (confidence / 5) * 30 if confidence else 0
    
    total = topic_score + understanding_score + confidence_score
    
    return round(total), f"{topics} topics, {sessions} sessions in 30 days"

def days_since(date_str):
    """Calculate days since a date string."""
    if not date_str:
        return None
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d')
        return (datetime.now() - date).days
    except:
        return None

def generate_resume():
    """Generate the full resume document."""
    lines = []

    def fmt_score(val):
        return "n/a" if val is None else str(val)

    def format_top(counter):
        if not counter:
            return "n/a"
        items = counter.most_common()
        formatted = [f"{name} ({count})" for name, count in items[:3]]
        return ', '.join(formatted)
    
    lines.append("# Session Resume")
    lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("")
    
    # Readiness Score
    score, details = calculate_readiness_score()
    lines.append("## Readiness Score")
    lines.append(f"**{score}/100** ({details})")
    lines.append("")

    # Drift and SOP usage
    stats = get_drift_and_usage_stats()
    lines.append("## Drift + SOP Usage (last 30d)")
    lines.append(f"- Prompt Drift flagged: {stats['prompt_drift_yes']}")
    lines.append(f"- Off-source drift flagged: {stats['off_source_yes']}")
    lines.append(f"- Common SOP Modules: {format_top(stats['sop_modules'])}")
    lines.append(f"- Common Engines: {format_top(stats['engines'])}")
    lines.append(f"- Common Core Learning Modules: {format_top(stats['core_modules'])}")
    lines.append("")

    # Recent Sessions
    lines.append("## Recent Sessions")
    sessions = get_recent_sessions(5)
    if sessions:
        for s in sessions:
            days = days_since(s['session_date'])
            days_str = f"{days}d ago" if days is not None else ""
            mode = s.get('study_mode', '?')
            understanding = fmt_score(s.get('understanding_level'))
            confidence = fmt_score(s.get('retention_confidence'))
            
            lines.append(f"- **{s['main_topic']}** ({s['session_date']}, {days_str})")
            lines.append(f"  - Mode: {mode} | Understanding: {understanding}/5 | Confidence: {confidence}/5")
            
            if s.get('region_covered'):
                lines.append(f"  - Region: {s['region_covered']}")
            if s.get('landmarks_mastered'):
                landmarks = s['landmarks_mastered'][:80] + "..." if len(s.get('landmarks_mastered', '')) > 80 else s['landmarks_mastered']
                lines.append(f"  - Landmarks: {landmarks}")
    else:
        lines.append("No sessions logged yet.")
    lines.append("")
    
    # Topic Coverage
    lines.append("## Topic Coverage")
    topics = get_topic_coverage()
    if topics:
        for t in topics:
            topic, last_date, count, understanding, confidence = t
            days = days_since(last_date)
            
            # Freshness indicator
            if days is None:
                freshness = "?"
            elif days <= 7:
                freshness = "FRESH"
            elif days <= 14:
                freshness = "FADING"
            else:
                freshness = "STALE"
            
            understanding_str = f"{understanding:.1f}" if understanding else "n/a"
            confidence_str = f"{confidence:.1f}" if confidence else "n/a"
            
            lines.append(f"- **{topic}**: {count} sessions, last {days}d ago [{freshness}]")
            lines.append(f"  - Avg Understanding: {understanding_str}/5 | Avg Confidence: {confidence_str}/5")
    else:
        lines.append("No topics covered yet.")
    lines.append("")
    
    # Anatomy Coverage
    regions = get_anatomy_coverage()
    if regions:
        lines.append("## Anatomy Coverage")
        for r in regions:
            region, last_date, count, landmarks, muscles = r
            days = days_since(last_date)
            
            lines.append(f"- **{region}**: {count} sessions, last {days}d ago")
            if landmarks:
                # Deduplicate and limit
                unique_landmarks = list(set([l.strip() for l in landmarks.split(',') if l.strip()]))[:5]
                lines.append(f"  - Landmarks: {', '.join(unique_landmarks)}")
            if muscles:
                unique_muscles = list(set([m.strip() for m in muscles.split(',') if m.strip()]))[:5]
                lines.append(f"  - Muscles: {', '.join(unique_muscles)}")
        lines.append("")
    
    # Weak Areas
    lines.append("## Areas Needing Attention")
    weak = get_weak_areas()
    if weak:
        for w in weak:
            topic, understanding, confidence, last_date = w
            days = days_since(last_date)
            lines.append(f"- **{topic}**: Understanding {understanding:.1f}/5, Confidence {confidence:.1f}/5 (last: {days}d ago)")
    else:
        lines.append("No weak areas identified. Keep it up!")
    lines.append("")
    
    # Rollback Events
    rollbacks = get_rollback_patterns()
    if rollbacks:
        lines.append("## Recent Rollbacks")
        lines.append("*(Topics where OIAN failed and returned to landmarks)*")
        for r in rollbacks:
            topic, region, date, details = r
            lines.append(f"- {date}: {topic}" + (f" ({region})" if region else ""))
        lines.append("")
    
    # Recommendations
    lines.append("## Recommended Focus")
    
    # Stale topics
    stale_topics = [t for t in topics if days_since(t[1]) and days_since(t[1]) > 7]
    if stale_topics:
        lines.append("**Due for review:**")
        for t in stale_topics[:3]:
            lines.append(f"- {t[0]} (last studied {days_since(t[1])}d ago)")
    
    # Low confidence areas
    if weak:
        lines.append("**Needs strengthening:**")
        for w in weak[:3]:
            lines.append(f"- {w[0]} (confidence: {w[2]:.1f}/5)")
    
    lines.append("")
    lines.append("---")
    lines.append("*Paste this at the start of your session for context.*")
    
    return '\n'.join(lines)

def save_resume(content):
    """Save resume to output file."""
    output_dir = os.path.dirname(OUTPUT_PATH)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return OUTPUT_PATH

if __name__ == '__main__':
    print("Generating session resume...")
    
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database not found at: {DB_PATH}")
        print("Run db_setup.py first to initialize the database.")
        exit(1)
    
    resume = generate_resume()
    
    # Print to console
    print("\n" + "=" * 60)
    print(resume)
    print("=" * 60 + "\n")
    
    # Save to file
    filepath = save_resume(resume)
    print(f"[OK] Resume saved to: {filepath}")
