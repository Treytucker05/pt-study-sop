"""
Method Library Analysis Module

Pure analysis functions for the Composable Method Library.
Provides stats, recommendations, and anomaly detection for Scholar integration.
No Flask dependencies - all functions are database-only.
"""

import json
import sqlite3
from typing import Dict, List, Optional, Any
from statistics import stdev
from db_setup import get_connection


def _parse_json(value: Optional[str], default: Any = None) -> Any:
    """Parse JSON string safely, return default on failure."""
    if not value:
        return default if default is not None else []
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default if default is not None else []


def get_method_stats(method_id: int) -> Dict[str, Any]:
    """
    Get stats for a single method block.

    Args:
        method_id: ID of the method block

    Returns:
        Dict with: avg_effectiveness, avg_engagement, usage_count,
                   best_contexts (top 3 contexts where effectiveness was highest)
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get basic stats
    cursor.execute("""
        SELECT
            AVG(effectiveness) as avg_eff,
            AVG(engagement) as avg_eng,
            COUNT(*) as usage_count
        FROM method_ratings
        WHERE method_block_id = ?
    """, (method_id,))

    row = cursor.fetchone()
    if not row or row['usage_count'] == 0:
        return {
            'avg_effectiveness': None,
            'avg_engagement': None,
            'usage_count': 0,
            'best_contexts': []
        }

    avg_eff = round(row['avg_eff'], 2) if row['avg_eff'] else None
    avg_eng = round(row['avg_eng'], 2) if row['avg_eng'] else None
    usage_count = row['usage_count']

    # Get top 3 contexts by effectiveness
    cursor.execute("""
        SELECT context, effectiveness
        FROM method_ratings
        WHERE method_block_id = ?
          AND context IS NOT NULL
          AND effectiveness >= 4
        ORDER BY effectiveness DESC, rated_at DESC
        LIMIT 3
    """, (method_id,))

    best_contexts = []
    for ctx_row in cursor.fetchall():
        context_data = _parse_json(ctx_row['context'], {})
        if context_data:
            best_contexts.append({
                'context': context_data,
                'effectiveness': ctx_row['effectiveness']
            })

    conn.close()

    return {
        'avg_effectiveness': avg_eff,
        'avg_engagement': avg_eng,
        'usage_count': usage_count,
        'best_contexts': best_contexts
    }


def get_chain_stats(chain_id: int) -> Dict[str, Any]:
    """
    Get stats for a single chain.

    Args:
        chain_id: ID of the method chain

    Returns:
        Dict with: avg_effectiveness, avg_engagement, usage_count, best_contexts
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get basic stats
    cursor.execute("""
        SELECT
            AVG(effectiveness) as avg_eff,
            AVG(engagement) as avg_eng,
            COUNT(*) as usage_count
        FROM method_ratings
        WHERE chain_id = ?
    """, (chain_id,))

    row = cursor.fetchone()
    if not row or row['usage_count'] == 0:
        return {
            'avg_effectiveness': None,
            'avg_engagement': None,
            'usage_count': 0,
            'best_contexts': []
        }

    avg_eff = round(row['avg_eff'], 2) if row['avg_eff'] else None
    avg_eng = round(row['avg_eng'], 2) if row['avg_eng'] else None
    usage_count = row['usage_count']

    # Get top 3 contexts by effectiveness
    cursor.execute("""
        SELECT context, effectiveness
        FROM method_ratings
        WHERE chain_id = ?
          AND context IS NOT NULL
          AND effectiveness >= 4
        ORDER BY effectiveness DESC, rated_at DESC
        LIMIT 3
    """, (chain_id,))

    best_contexts = []
    for ctx_row in cursor.fetchall():
        context_data = _parse_json(ctx_row['context'], {})
        if context_data:
            best_contexts.append({
                'context': context_data,
                'effectiveness': ctx_row['effectiveness']
            })

    conn.close()

    return {
        'avg_effectiveness': avg_eff,
        'avg_engagement': avg_eng,
        'usage_count': usage_count,
        'best_contexts': best_contexts
    }


def get_context_recommendations(
    class_type: Optional[str] = None,
    stage: Optional[str] = None,
    energy: Optional[str] = None,
    time_available: Optional[int] = None
) -> List[Dict]:
    """
    Recommend chains based on historical ratings for the given context.

    Match on context_tags JSON fields. Return top 3 chains ranked by avg effectiveness.
    If no ratings exist for the context, fall back to template chains matching the context.

    Args:
        class_type: Type of class (e.g. 'lecture', 'lab')
        stage: Study stage (e.g. 'pre-class', 'post-class', 'exam-prep')
        energy: Energy level (e.g. 'high', 'medium', 'low')
        time_available: Minutes available for study

    Returns:
        List of recommended chains with stats
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Build context filter with parameterized queries
    context_filters = []
    params = []
    if class_type:
        context_filters.append("mr.context LIKE ?")
        params.append(f'%"class_type":"{class_type}"%')
    if stage:
        context_filters.append("mr.context LIKE ?")
        params.append(f'%"stage":"{stage}"%')
    if energy:
        context_filters.append("mr.context LIKE ?")
        params.append(f'%"energy":"{energy}"%')

    recommendations = []

    # Try to find chains with ratings matching context
    if context_filters:
        context_where = " AND ".join(context_filters)

        cursor.execute(f"""
            SELECT
                mc.id,
                mc.name,
                mc.description,
                mc.block_ids,
                mc.context_tags,
                AVG(mr.effectiveness) as avg_eff,
                AVG(mr.engagement) as avg_eng,
                COUNT(mr.id) as rating_count
            FROM method_chains mc
            JOIN method_ratings mr ON mc.id = mr.chain_id
            WHERE {context_where}
            GROUP BY mc.id
            HAVING rating_count >= 1
            ORDER BY avg_eff DESC, rating_count DESC
            LIMIT 3
        """, params)

        for row in cursor.fetchall():
            block_ids = _parse_json(row['block_ids'], [])
            context_tags = _parse_json(row['context_tags'], {})

            recommendations.append({
                'chain_id': row['id'],
                'name': row['name'],
                'description': row['description'],
                'block_ids': block_ids,
                'context_tags': context_tags,
                'avg_effectiveness': round(row['avg_eff'], 2),
                'avg_engagement': round(row['avg_eng'], 2),
                'rating_count': row['rating_count'],
                'source': 'rated'
            })

    # If we have fewer than 3 recommendations, supplement with template chains
    if len(recommendations) < 3:
        # Build template filter with parameterized queries
        template_filters = ["is_template = 1"]
        template_params: list = []
        if class_type:
            template_filters.append("context_tags LIKE ?")
            template_params.append(f'%"class_type":"{class_type}"%')
        if stage:
            template_filters.append("context_tags LIKE ?")
            template_params.append(f'%"stage":"{stage}"%')
        if energy:
            template_filters.append("context_tags LIKE ?")
            template_params.append(f'%"energy":"{energy}"%')

        template_where = " AND ".join(template_filters)

        # Exclude already recommended chains
        exclude_ids = [r['chain_id'] for r in recommendations]
        exclude_clause = ""
        if exclude_ids:
            placeholders = ",".join("?" * len(exclude_ids))
            exclude_clause = f" AND id NOT IN ({placeholders})"
            template_params.extend(exclude_ids)

        remaining = 3 - len(recommendations)
        template_params.append(remaining)

        cursor.execute(f"""
            SELECT
                id,
                name,
                description,
                block_ids,
                context_tags
            FROM method_chains
            WHERE {template_where}{exclude_clause}
            ORDER BY created_at DESC
            LIMIT ?
        """, template_params)

        for row in cursor.fetchall():
            block_ids = _parse_json(row['block_ids'], [])
            context_tags = _parse_json(row['context_tags'], {})

            recommendations.append({
                'chain_id': row['id'],
                'name': row['name'],
                'description': row['description'],
                'block_ids': block_ids,
                'context_tags': context_tags,
                'avg_effectiveness': None,
                'avg_engagement': None,
                'rating_count': 0,
                'source': 'template'
            })

    conn.close()
    return recommendations


def flag_anomalies() -> Dict[str, List[Dict]]:
    """
    Find anomalies in the method library.

    Returns:
        Dict with lists of:
        - high_variance: methods with std dev > 1.5 in effectiveness ratings (min 3 ratings)
        - never_rated: methods/chains with 0 ratings
        - underused: methods used < 2 times but rated >= 4 avg effectiveness
        - low_performers: methods with avg effectiveness <= 2 and >= 3 ratings
    """
    conn = get_connection()
    cursor = conn.cursor()

    anomalies = {
        'high_variance': [],
        'never_rated': [],
        'underused': [],
        'low_performers': []
    }

    # High variance methods (min 3 ratings)
    cursor.execute("""
        SELECT method_block_id, GROUP_CONCAT(effectiveness) as ratings
        FROM method_ratings
        WHERE method_block_id IS NOT NULL
        GROUP BY method_block_id
        HAVING COUNT(*) >= 3
    """)

    for row in cursor.fetchall():
        ratings = [float(r) for r in row['ratings'].split(',')]
        if len(ratings) >= 3:
            std = stdev(ratings)
            if std > 1.5:
                cursor.execute("SELECT name, category FROM method_blocks WHERE id = ?",
                              (row['method_block_id'],))
                method = cursor.fetchone()
                anomalies['high_variance'].append({
                    'method_id': row['method_block_id'],
                    'name': method['name'] if method else 'Unknown',
                    'category': method['category'] if method else 'Unknown',
                    'std_dev': round(std, 2),
                    'ratings': ratings
                })

    # Never rated methods
    cursor.execute("""
        SELECT id, name, category, created_at
        FROM method_blocks
        WHERE id NOT IN (
            SELECT DISTINCT method_block_id
            FROM method_ratings
            WHERE method_block_id IS NOT NULL
        )
    """)

    for row in cursor.fetchall():
        anomalies['never_rated'].append({
            'type': 'method',
            'id': row['id'],
            'name': row['name'],
            'category': row['category'],
            'created_at': row['created_at']
        })

    # Never rated chains
    cursor.execute("""
        SELECT id, name, created_at
        FROM method_chains
        WHERE id NOT IN (
            SELECT DISTINCT chain_id
            FROM method_ratings
            WHERE chain_id IS NOT NULL
        )
    """)

    for row in cursor.fetchall():
        anomalies['never_rated'].append({
            'type': 'chain',
            'id': row['id'],
            'name': row['name'],
            'created_at': row['created_at']
        })

    # Underused high performers (methods)
    cursor.execute("""
        SELECT
            mb.id,
            mb.name,
            mb.category,
            AVG(mr.effectiveness) as avg_eff,
            COUNT(mr.id) as usage_count
        FROM method_blocks mb
        JOIN method_ratings mr ON mb.id = mr.method_block_id
        GROUP BY mb.id
        HAVING usage_count < 2 AND avg_eff >= 4
    """)

    for row in cursor.fetchall():
        anomalies['underused'].append({
            'type': 'method',
            'id': row['id'],
            'name': row['name'],
            'category': row['category'],
            'avg_effectiveness': round(row['avg_eff'], 2),
            'usage_count': row['usage_count']
        })

    # Underused high performers (chains)
    cursor.execute("""
        SELECT
            mc.id,
            mc.name,
            AVG(mr.effectiveness) as avg_eff,
            COUNT(mr.id) as usage_count
        FROM method_chains mc
        JOIN method_ratings mr ON mc.id = mr.chain_id
        GROUP BY mc.id
        HAVING usage_count < 2 AND avg_eff >= 4
    """)

    for row in cursor.fetchall():
        anomalies['underused'].append({
            'type': 'chain',
            'id': row['id'],
            'name': row['name'],
            'avg_effectiveness': round(row['avg_eff'], 2),
            'usage_count': row['usage_count']
        })

    # Low performers (methods)
    cursor.execute("""
        SELECT
            mb.id,
            mb.name,
            mb.category,
            AVG(mr.effectiveness) as avg_eff,
            COUNT(mr.id) as rating_count
        FROM method_blocks mb
        JOIN method_ratings mr ON mb.id = mr.method_block_id
        GROUP BY mb.id
        HAVING rating_count >= 3 AND avg_eff <= 2
    """)

    for row in cursor.fetchall():
        anomalies['low_performers'].append({
            'type': 'method',
            'id': row['id'],
            'name': row['name'],
            'category': row['category'],
            'avg_effectiveness': round(row['avg_eff'], 2),
            'rating_count': row['rating_count']
        })

    # Low performers (chains)
    cursor.execute("""
        SELECT
            mc.id,
            mc.name,
            AVG(mr.effectiveness) as avg_eff,
            COUNT(mr.id) as rating_count
        FROM method_chains mc
        JOIN method_ratings mr ON mc.id = mr.chain_id
        GROUP BY mc.id
        HAVING rating_count >= 3 AND avg_eff <= 2
    """)

    for row in cursor.fetchall():
        anomalies['low_performers'].append({
            'type': 'chain',
            'id': row['id'],
            'name': row['name'],
            'avg_effectiveness': round(row['avg_eff'], 2),
            'rating_count': row['rating_count']
        })

    conn.close()
    return anomalies


def get_method_library_summary() -> Dict[str, Any]:
    """
    Summary of the entire method library for Scholar consumption.

    Returns:
        Dict with: total_blocks, total_chains, total_ratings, avg_effectiveness,
                   category_breakdown (count per category), most_used_block, most_used_chain
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Total counts
    cursor.execute("SELECT COUNT(*) as count FROM method_blocks")
    total_blocks = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM method_chains")
    total_chains = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM method_ratings")
    total_ratings = cursor.fetchone()['count']

    # Average effectiveness across all ratings
    cursor.execute("SELECT AVG(effectiveness) as avg_eff FROM method_ratings")
    avg_eff_row = cursor.fetchone()
    avg_effectiveness = round(avg_eff_row['avg_eff'], 2) if avg_eff_row['avg_eff'] else None

    # Category breakdown
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM method_blocks
        GROUP BY category
        ORDER BY count DESC
    """)
    category_breakdown = {row['category']: row['count'] for row in cursor.fetchall()}

    # Most used block
    cursor.execute("""
        SELECT mb.id, mb.name, COUNT(mr.id) as usage_count
        FROM method_blocks mb
        LEFT JOIN method_ratings mr ON mb.id = mr.method_block_id
        GROUP BY mb.id
        ORDER BY usage_count DESC
        LIMIT 1
    """)
    most_used_block_row = cursor.fetchone()
    most_used_block = {
        'id': most_used_block_row['id'],
        'name': most_used_block_row['name'],
        'usage_count': most_used_block_row['usage_count']
    } if most_used_block_row else None

    # Most used chain
    cursor.execute("""
        SELECT mc.id, mc.name, COUNT(mr.id) as usage_count
        FROM method_chains mc
        LEFT JOIN method_ratings mr ON mc.id = mr.chain_id
        GROUP BY mc.id
        ORDER BY usage_count DESC
        LIMIT 1
    """)
    most_used_chain_row = cursor.fetchone()
    most_used_chain = {
        'id': most_used_chain_row['id'],
        'name': most_used_chain_row['name'],
        'usage_count': most_used_chain_row['usage_count']
    } if most_used_chain_row else None

    conn.close()

    return {
        'total_blocks': total_blocks,
        'total_chains': total_chains,
        'total_ratings': total_ratings,
        'avg_effectiveness': avg_effectiveness,
        'category_breakdown': category_breakdown,
        'most_used_block': most_used_block,
        'most_used_chain': most_used_chain
    }
