#!/usr/bin/env python3
"""
Analytics Dashboard for PT Study Brain.
Display statistics and insights about study sessions.
"""

import sqlite3
from datetime import datetime, timedelta
from collections import Counter
from db_setup import get_connection
from config import WEAK_THRESHOLD, STRONG_THRESHOLD


def get_all_sessions():
    """
    Get all sessions from the database.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM sessions ORDER BY session_date DESC, session_time DESC')
    
    columns = [description[0] for description in cursor.description]
    sessions = []
    for row in cursor.fetchall():
        sessions.append(dict(zip(columns, row)))
    
    conn.close()
    return sessions


def get_sessions_by_date_range(days=30):
    """
    Get sessions from the last N days.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    date_threshold = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    
    cursor.execute('''
        SELECT * FROM sessions 
        WHERE session_date >= ?
        ORDER BY session_date DESC, session_time DESC
    ''', (date_threshold,))
    
    columns = [description[0] for description in cursor.description]
    sessions = []
    for row in cursor.fetchall():
        sessions.append(dict(zip(columns, row)))
    
    conn.close()
    return sessions


def print_header(title):
    """
    Print a formatted header.
    """
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)


def print_section(title):
    """
    Print a section header.
    """
    print(f"\n{title}")
    print("-" * len(title))


def print_progress_bar(value, max_value=5, width=20, label=""):
    """
    Print a text-based progress bar.
    """
    if max_value == 0:
        percentage = 0
    else:
        percentage = value / max_value
    
    filled = int(width * percentage)
    bar = '#' * filled + '.' * (width - filled)
    
    print(f"{label:<25} {bar} {value:.1f}/{max_value}")


def display_overview(sessions):
    """
    Display overall statistics.
    """
    print_section("OVERVIEW")
    
    if not sessions:
        print("No sessions recorded yet.")
        return
    
    total_sessions = len(sessions)
    total_time = sum(s['time_spent_minutes'] for s in sessions)
    total_cards = sum(s['anki_cards_count'] or 0 for s in sessions)
    
    # Unique topics
    unique_topics = len(set(s['topic'] for s in sessions))
    
    # Date range
    dates = sorted([s['session_date'] for s in sessions])
    first_date = dates[0] if dates else "N/A"
    last_date = dates[-1] if dates else "N/A"
    
    print(f"  Total Sessions:        {total_sessions}")
    print(f"  Unique Topics:         {unique_topics}")
    print(f"  Total Study Time:      {total_time} minutes ({total_time//60}h {total_time%60}m)")
    print(f"  Total Anki Cards:      {total_cards}")
    print(f"  First Session:         {first_date}")
    print(f"  Latest Session:        {last_date}")
    
    # Average session time
    if total_sessions > 0:
        avg_time = total_time / total_sessions
        print(f"  Avg Session Time:      {avg_time:.1f} minutes")


def display_performance_metrics(sessions):
    """
    Display performance metrics with visual bars.
    """
    print_section("PERFORMANCE METRICS")
    
    understanding_scores = [s['understanding_level'] for s in sessions if s['understanding_level']]
    retention_scores = [s['retention_confidence'] for s in sessions if s['retention_confidence']]
    performance_scores = [s['system_performance'] for s in sessions if s['system_performance']]
    
    if understanding_scores:
        avg_understanding = sum(understanding_scores) / len(understanding_scores)
        print_progress_bar(avg_understanding, 5, 20, "Understanding Level")
    else:
        print("  Understanding Level:   No data")
    
    if retention_scores:
        avg_retention = sum(retention_scores) / len(retention_scores)
        print_progress_bar(avg_retention, 5, 20, "Retention Confidence")
    else:
        print("  Retention Confidence:  No data")
    
    if performance_scores:
        avg_performance = sum(performance_scores) / len(performance_scores)
        print_progress_bar(avg_performance, 5, 20, "System Performance")
    else:
        print("  System Performance:    No data")
    
    # Score distribution
    if understanding_scores:
        print("\n  Understanding Score Distribution:")
        score_dist = Counter(understanding_scores)
        for score in range(5, 0, -1):
            count = score_dist.get(score, 0)
            bar = '#' * count
            print(f"    {score}/5: {bar} ({count})")


def display_study_patterns(sessions):
    """
    Display study patterns and habits.
    """
    print_section("STUDY PATTERNS")
    
    # Study modes
    modes = Counter(s['study_mode'] for s in sessions)
    print("\n  Study Modes:")
    for mode, count in modes.most_common():
        percentage = (count / len(sessions)) * 100
        print(f"    {mode:<12} {count:>3} sessions ({percentage:.1f}%)")
    
    # Frameworks
    frameworks = Counter()
    for s in sessions:
        if s['frameworks_used']:
            for fw in s['frameworks_used'].split(','):
                fw = fw.strip()
                if fw:
                    frameworks[fw] += 1
    
    if frameworks:
        print("\n  Most Used Frameworks:")
        for fw, count in frameworks.most_common(5):
            print(f"    {fw:<20} {count:>3} times")
    
    # Gated platter usage
    gated_yes = sum(1 for s in sessions if s['gated_platter_triggered'] == 'Yes')
    if gated_yes > 0:
        gated_pct = (gated_yes / len(sessions)) * 100
        print(f"\n  Gated Platter Triggered: {gated_yes}/{len(sessions)} sessions ({gated_pct:.1f}%)")
    
    # WRAP phase reached
    wrap_yes = sum(1 for s in sessions if s['wrap_phase_reached'] == 'Yes')
    if wrap_yes > 0:
        wrap_pct = (wrap_yes / len(sessions)) * 100
        print(f"  WRAP Phase Reached:      {wrap_yes}/{len(sessions)} sessions ({wrap_pct:.1f}%)")


def display_topic_analysis(sessions):
    """
    Display topic-based analysis.
    """
    print_section("TOPIC ANALYSIS")
    
    # Topics by understanding level
    weak_topics = []
    strong_topics = []
    
    for s in sessions:
        if s['understanding_level']:
            if s['understanding_level'] <= WEAK_THRESHOLD:
                weak_topics.append((s['topic'], s['understanding_level'], s['session_date']))
            elif s['understanding_level'] >= STRONG_THRESHOLD:
                strong_topics.append((s['topic'], s['understanding_level'], s['session_date']))
    
    if weak_topics:
        print("\n  Topics Needing Review (Score <= 3):")
        for topic, score, date in sorted(weak_topics, key=lambda x: x[1])[:5]:
            print(f"    - {topic:<40} {score}/5  ({date})")
    
    if strong_topics:
        print("\n  Well-Understood Topics (Score >= 4):")
        for topic, score, date in sorted(strong_topics, key=lambda x: x[1], reverse=True)[:5]:
            print(f"    - {topic:<40} {score}/5  ({date})")
    
    # Most studied topics
    topic_counts = Counter(s['topic'] for s in sessions)
    if len(topic_counts) > 1:
        print("\n  Most Studied Topics:")
        for topic, count in topic_counts.most_common(5):
            print(f"    - {topic:<40} {count} sessions")


def display_time_breakdown(sessions):
    """
    Display time-based breakdown.
    """
    print_section("TIME BREAKDOWN")
    
    # Time by study mode
    time_by_mode = {}
    for s in sessions:
        mode = s['study_mode']
        time_by_mode[mode] = time_by_mode.get(mode, 0) + s['time_spent_minutes']
    
    print("\n  Time Spent by Study Mode:")
    total_time = sum(time_by_mode.values())
    for mode, minutes in sorted(time_by_mode.items(), key=lambda x: x[1], reverse=True):
        hours = minutes // 60
        mins = minutes % 60
        percentage = (minutes / total_time) * 100 if total_time > 0 else 0
        print(f"    {mode:<12} {hours:>2}h {mins:>2}m  ({percentage:.1f}%)")
    
    # Recent activity
    recent_7_days = get_sessions_by_date_range(7)
    recent_30_days = get_sessions_by_date_range(30)
    
    print(f"\n  Recent Activity:")
    print(f"    Last 7 days:   {len(recent_7_days)} sessions")
    print(f"    Last 30 days:  {len(recent_30_days)} sessions")


def display_trends(sessions):
    """
    Display trends over time.
    """
    print_section("TRENDS")
    
    if len(sessions) < 2:
        print("  Not enough data to show trends (need at least 2 sessions).")
        return
    
    # Split into first half and second half
    mid = len(sessions) // 2
    recent_half = sessions[:mid]
    older_half = sessions[mid:]
    
    def avg_score(session_list, key):
        scores = [s[key] for s in session_list if s[key]]
        return sum(scores) / len(scores) if scores else 0
    
    # Understanding trend
    recent_understanding = avg_score(recent_half, 'understanding_level')
    older_understanding = avg_score(older_half, 'understanding_level')
    
    if recent_understanding and older_understanding:
        diff = recent_understanding - older_understanding
        trend = "Improving" if diff > 0.3 else "Declining" if diff < -0.3 else "Stable"
        print(f"\n  Understanding Level:  {trend}")
        print(f"    Earlier avg: {older_understanding:.1f}/5")
        print(f"    Recent avg:  {recent_understanding:.1f}/5")
    
    # Retention trend
    recent_retention = avg_score(recent_half, 'retention_confidence')
    older_retention = avg_score(older_half, 'retention_confidence')
    
    if recent_retention and older_retention:
        diff = recent_retention - older_retention
        trend = "Improving" if diff > 0.3 else "Declining" if diff < -0.3 else "Stable"
        print(f"\n  Retention Confidence: {trend}")
        print(f"    Earlier avg: {older_retention:.1f}/5")
        print(f"    Recent avg:  {recent_retention:.1f}/5")
    
    # System performance trend
    recent_performance = avg_score(recent_half, 'system_performance')
    older_performance = avg_score(older_half, 'system_performance')
    
    if recent_performance and older_performance:
        diff = recent_performance - older_performance
        trend = "Improving" if diff > 0.3 else "Declining" if diff < -0.3 else "Stable"
        print(f"\n  System Performance:   {trend}")
        print(f"    Earlier avg: {older_performance:.1f}/5")
        print(f"    Recent avg:  {recent_performance:.1f}/5")


def display_insights(sessions):
    """
    Display actionable insights.
    """
    print_section("INSIGHTS & RECOMMENDATIONS")
    
    if not sessions:
        return
    
    insights = []
    
    # Check average scores
    understanding_scores = [s['understanding_level'] for s in sessions if s['understanding_level']]
    if understanding_scores:
        avg_understanding = sum(understanding_scores) / len(understanding_scores)
        if avg_understanding < 3.5:
            insights.append("Average understanding is below 3.5/5. Consider reviewing difficult topics more frequently.")
    
    # Check for weak topics
    weak_count = sum(1 for s in sessions if s['understanding_level'] and s['understanding_level'] <= WEAK_THRESHOLD)
    if weak_count > len(sessions) * 0.3:
        insights.append(f"{weak_count} sessions had low understanding scores. Focus on addressing weak areas.")
    
    # Check WRAP completion rate
    wrap_yes = sum(1 for s in sessions if s['wrap_phase_reached'] == 'Yes')
    wrap_rate = (wrap_yes / len(sessions)) * 100 if sessions else 0
    if wrap_rate < 50:
        insights.append(f"Only {wrap_rate:.0f}% of sessions reached WRAP phase. Try to complete the full workflow.")
    
    # Check session frequency
    if len(sessions) >= 2:
        dates = sorted([datetime.strptime(s['session_date'], '%Y-%m-%d') for s in sessions])
        days_span = (dates[-1] - dates[0]).days
        if days_span > 0:
            sessions_per_week = (len(sessions) / days_span) * 7
            if sessions_per_week < 3:
                insights.append(f"Current pace: {sessions_per_week:.1f} sessions/week. Consider increasing frequency for better retention.")
    
    # Check for Anki card creation
    cards_per_session = sum(s['anki_cards_count'] or 0 for s in sessions) / len(sessions) if sessions else 0
    if cards_per_session < 5:
        insights.append(f"Average {cards_per_session:.1f} Anki cards per session. Creating more cards can improve retention.")
    
    if insights:
        for insight in insights:
            print(f"\n  {insight}")
    else:
        print("\n  Great job! Your study patterns look solid. Keep up the good work!")


def main():
    print_header("PT STUDY BRAIN - ANALYTICS DASHBOARD")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Get all sessions
    sessions = get_all_sessions()
    
    if not sessions:
        print("\nNo sessions found in the database.")
        print("\nTo get started:")
        print("  1. Create a session log following the markdown template")
        print("  2. Run: python ingest_session.py session_logs/your_session.md")
        print("  3. Run this dashboard again to see your stats!")
        return
    
    # Display all sections
    display_overview(sessions)
    display_performance_metrics(sessions)
    display_study_patterns(sessions)
    display_topic_analysis(sessions)
    display_time_breakdown(sessions)
    display_trends(sessions)
    display_insights(sessions)
    
    print("\n" + "="*70)
    print(f"\nDashboard generated successfully!")
    print(f"  Total sessions analyzed: {len(sessions)}")


if __name__ == '__main__':
    main()
