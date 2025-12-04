#!/usr/bin/env python3
"""
Session Resume Generator for PT Study Brain.
Generates a formatted summary of recent sessions for AI context.
"""

import sys
import sqlite3
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from db_setup import get_connection
from config import RECENT_SESSIONS_COUNT, WEAK_THRESHOLD, STRONG_THRESHOLD


def get_recent_sessions(limit=RECENT_SESSIONS_COUNT):
    """
    Get recent sessions from the database.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM sessions
        ORDER BY session_date DESC, session_time DESC
        LIMIT ?
    ''', (limit,))
    
    columns = [description[0] for description in cursor.description]
    sessions = []
    for row in cursor.fetchall():
        sessions.append(dict(zip(columns, row)))
    
    conn.close()
    return sessions


def analyze_sessions(sessions):
    """
    Analyze sessions and extract insights.
    """
    if not sessions:
        return None
    
    analysis = {
        'total_sessions': len(sessions),
        'topics_covered': [],
        'study_modes': Counter(),
        'frameworks_used': Counter(),
        'total_time': 0,
        'total_anki_cards': 0,
        'avg_understanding': 0,
        'avg_retention': 0,
        'avg_performance': 0,
        'weak_areas': [],
        'strong_areas': [],
        'common_issues': [],
        'what_worked_list': [],
    }
    
    understanding_scores = []
    retention_scores = []
    performance_scores = []
    
    for session in sessions:
        # Topics
        analysis['topics_covered'].append({
            'topic': session['topic'],
            'date': session['session_date'],
            'mode': session['study_mode']
        })
        
        # Study modes
        analysis['study_modes'][session['study_mode']] += 1
        
        # Frameworks
        if session['frameworks_used']:
            frameworks = [f.strip() for f in session['frameworks_used'].split(',')]
            for fw in frameworks:
                if fw:
                    analysis['frameworks_used'][fw] += 1
        
        # Time and cards
        analysis['total_time'] += session['time_spent_minutes']
        analysis['total_anki_cards'] += session['anki_cards_count'] or 0
        
        # Scores
        if session['understanding_level']:
            understanding_scores.append(session['understanding_level'])
        if session['retention_confidence']:
            retention_scores.append(session['retention_confidence'])
        if session['system_performance']:
            performance_scores.append(session['system_performance'])
        
        # Weak areas (low understanding or retention)
        if session['understanding_level'] and session['understanding_level'] <= WEAK_THRESHOLD:
            analysis['weak_areas'].append({
                'topic': session['topic'],
                'understanding': session['understanding_level'],
                'date': session['session_date']
            })
        
        # Strong areas
        if session['understanding_level'] and session['understanding_level'] >= STRONG_THRESHOLD:
            analysis['strong_areas'].append({
                'topic': session['topic'],
                'understanding': session['understanding_level'],
                'date': session['session_date']
            })
        
        # Issues
        if session['what_needs_fixing']:
            analysis['common_issues'].append(session['what_needs_fixing'])
        
        # What worked
        if session['what_worked']:
            analysis['what_worked_list'].append(session['what_worked'])
    
    # Calculate averages
    if understanding_scores:
        analysis['avg_understanding'] = sum(understanding_scores) / len(understanding_scores)
    if retention_scores:
        analysis['avg_retention'] = sum(retention_scores) / len(retention_scores)
    if performance_scores:
        analysis['avg_performance'] = sum(performance_scores) / len(performance_scores)
    
    return analysis


def generate_resume_markdown(sessions, analysis):
    """
    Generate a markdown-formatted resume for AI context.
    """
    if not sessions:
        return "# PT Study SOP - Session Resume\n\nNo sessions found in the database.\n"
    
    md = []
    md.append("# PT Study SOP - Session Resume")
    md.append(f"*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n")
    
    # Overview
    md.append("## Overview")
    md.append(f"- **Total Sessions Analyzed:** {analysis['total_sessions']}")
    md.append(f"- **Total Study Time:** {analysis['total_time']} minutes ({analysis['total_time']//60}h {analysis['total_time']%60}m)")
    md.append(f"- **Total Anki Cards Created:** {analysis['total_anki_cards']}")
    md.append("")
    
    # Performance Metrics
    md.append("## Performance Metrics")
    md.append(f"- **Average Understanding Level:** {analysis['avg_understanding']:.1f}/5")
    md.append(f"- **Average Retention Confidence:** {analysis['avg_retention']:.1f}/5")
    md.append(f"- **Average System Performance:** {analysis['avg_performance']:.1f}/5")
    md.append("")
    
    # Study patterns
    md.append("## Study Patterns")
    md.append("### Study Modes Used")
    for mode, count in analysis['study_modes'].most_common():
        md.append(f"- **{mode}:** {count} sessions")
    md.append("")
    
    if analysis['frameworks_used']:
        md.append("### Frameworks Used")
        for framework, count in analysis['frameworks_used'].most_common(5):
            md.append(f"- **{framework}:** {count} times")
        md.append("")
    
    # Recent topics
    md.append("## Recent Topics Covered")
    for i, topic_info in enumerate(analysis['topics_covered'][:10], 1):
        md.append(f"{i}. **{topic_info['topic']}** ({topic_info['date']}) - *{topic_info['mode']} mode*")
    md.append("")
    
    # Weak areas
    if analysis['weak_areas']:
        md.append("## Areas Needing Review (Understanding <= 3)")
        for area in analysis['weak_areas'][:5]:
            md.append(f"- **{area['topic']}** (Score: {area['understanding']}/5, Date: {area['date']})")
        md.append("")
    
    # Strong areas
    if analysis['strong_areas']:
        md.append("## Strong Areas (Understanding >= 4)")
        for area in analysis['strong_areas'][:5]:
            md.append(f"- **{area['topic']}** (Score: {area['understanding']}/5, Date: {area['date']})")
        md.append("")
    
    # What's working
    if analysis['what_worked_list']:
        md.append("## What's Working Well")
        # Get the most recent insights
        for insight in analysis['what_worked_list'][:3]:
            if insight.strip():
                # Take first line or sentence
                first_line = insight.split('\n')[0].strip('- ').strip()
                if first_line:
                    md.append(f"- {first_line}")
        md.append("")
    
    # Common issues
    if analysis['common_issues']:
        md.append("## Common Issues to Address")
        # Get the most recent issues
        for issue in analysis['common_issues'][:3]:
            if issue.strip():
                first_line = issue.split('\n')[0].strip('- ').strip()
                if first_line:
                    md.append(f"- {first_line}")
        md.append("")
    
    # Recent session details
    md.append("## Last 3 Session Details")
    for i, session in enumerate(sessions[:3], 1):
        md.append(f"\n### Session {i}: {session['topic']}")
        md.append(f"- **Date:** {session['session_date']} {session['session_time']}")
        md.append(f"- **Mode:** {session['study_mode']}")
        md.append(f"- **Time:** {session['time_spent_minutes']} minutes")
        md.append(f"- **Scores:** Understanding {session['understanding_level']}/5, "
                 f"Retention {session['retention_confidence']}/5, "
                 f"System {session['system_performance']}/5")
        if session['frameworks_used']:
            md.append(f"- **Frameworks:** {session['frameworks_used']}")
        if session['anki_cards_count']:
            md.append(f"- **Anki Cards:** {session['anki_cards_count']}")
        if session['notes_insights']:
            # Show first sentence of notes
            first_note = session['notes_insights'].split('\n')[0].strip('- ').strip()
            if first_note:
                md.append(f"- **Key Insight:** {first_note}")
    
    md.append("\n---")
    md.append("*Use this context to help guide the next study session and address weak areas.*")
    
    return '\n'.join(md)


def main():
    # Check for optional limit argument
    limit = RECENT_SESSIONS_COUNT
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
        except ValueError:
            print(f"Invalid limit value. Using default: {RECENT_SESSIONS_COUNT}")
    
    print(f"[INFO] Generating session resume (analyzing last {limit} sessions)...\n")
    
    # Get recent sessions
    sessions = get_recent_sessions(limit)
    
    if not sessions:
        print("No sessions found in the database.")
        print("Run 'python ingest_session.py <session_log.md>' to add sessions first.")
        sys.exit(0)
    
    # Analyze sessions
    analysis = analyze_sessions(sessions)
    
    # Generate resume
    resume = generate_resume_markdown(sessions, analysis)
    
    # Print to console
    print(resume)
    print("\n" + "="*60)
    
    # Optionally save to file
    output_file = 'session_resume.md'
    with open(output_file, 'w') as f:
        f.write(resume)
    
    print(f"\n[OK] Resume saved to: {output_file}")
    print(f"\nYou can now copy this resume and paste it into your AI chat!")


if __name__ == '__main__':
    main()
