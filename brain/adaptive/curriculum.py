"""Concept map curriculum controller (Phase 4).

Nodes carry prerequisite lists. Status (Locked / Available / Mastered)
is derived from effective mastery of prereqs. Learner control allows
out-of-sequence practice but does not unlock gated downstream nodes.
"""
from __future__ import annotations

import json
import sqlite3
from typing import List, Optional

from brain.adaptive.bkt import get_effective_mastery
from brain.adaptive.schemas import MasteryConfig


# ---------------------------------------------------------------------------
# Task 4.1 — Curriculum tables + prerequisite storage
# ---------------------------------------------------------------------------

def create_curriculum_tables(conn: sqlite3.Connection) -> None:
    """Create curriculum_nodes table (idempotent)."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS curriculum_nodes (
            skill_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            prereqs_json TEXT NOT NULL DEFAULT '[]'
        )
    """)
    conn.commit()


def upsert_node(
    conn: sqlite3.Connection,
    skill_id: str,
    name: str,
    prereqs: Optional[List[str]] = None,
) -> None:
    """Insert or update a curriculum node with its prerequisites."""
    prereqs = prereqs or []
    conn.execute(
        """INSERT INTO curriculum_nodes (skill_id, name, prereqs_json)
           VALUES (?, ?, ?)
           ON CONFLICT(skill_id) DO UPDATE
           SET name = excluded.name, prereqs_json = excluded.prereqs_json""",
        (skill_id, name, json.dumps(prereqs)),
    )
    conn.commit()


def get_node(conn: sqlite3.Connection, skill_id: str) -> Optional[dict]:
    """Return a curriculum node as a dict with deserialized prereqs list."""
    cur = conn.execute(
        "SELECT skill_id, name, prereqs_json FROM curriculum_nodes WHERE skill_id = ?",
        (skill_id,),
    )
    row = cur.fetchone()
    if row is None:
        return None
    return {
        "skill_id": row["skill_id"],
        "name": row["name"],
        "prereqs": json.loads(row["prereqs_json"]),
    }


# ---------------------------------------------------------------------------
# Task 4.2 — Status computation (Locked / Available / Mastered)
# ---------------------------------------------------------------------------

def compute_status(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    config: MasteryConfig,
) -> str:
    """Compute curriculum status for a node.

    Returns one of: "locked", "available", "mastered".

    Logic:
      - If the user's effective mastery >= mastered_threshold → "mastered"
      - If all prereqs have effective mastery >= unlock_threshold → "available"
      - Otherwise → "locked"
    """
    node = get_node(conn, skill_id)
    if node is None:
        return "locked"

    # Check own mastery first
    own_mastery = get_effective_mastery(conn, user_id, skill_id, config)
    if own_mastery >= config.mastered_threshold:
        return "mastered"

    # Check prerequisites
    prereqs = node["prereqs"]
    if not prereqs:
        return "available"

    for prereq_id in prereqs:
        prereq_mastery = get_effective_mastery(conn, user_id, prereq_id, config)
        if prereq_mastery < config.unlock_threshold:
            return "locked"

    return "available"


# ---------------------------------------------------------------------------
# Task 4.3 — Learner control with constraints
# ---------------------------------------------------------------------------

def attempt_practice(
    conn: sqlite3.Connection,
    user_id: str,
    skill_id: str,
    config: MasteryConfig,
) -> dict:
    """Allow practice on any node, but flag out-of-sequence attempts.

    Returns:
        {"allowed": True, "out_of_sequence": bool}

    Out-of-sequence practice does NOT unlock downstream nodes — only
    in-sequence mastery (where all prereqs are met) counts for gating.
    """
    status = compute_status(conn, user_id, skill_id, config)
    out_of_sequence = status == "locked"

    return {
        "allowed": True,
        "out_of_sequence": out_of_sequence,
    }


# ---------------------------------------------------------------------------
# Task 4.4 — Advance organizer view
# ---------------------------------------------------------------------------

def get_organizer_view(
    conn: sqlite3.Connection,
    user_id: str,
    config: MasteryConfig,
    anchor_ids: Optional[List[str]] = None,
) -> dict:
    """Build an advance organizer view showing only relevant nodes.

    Visibility rules:
      - Anchor nodes are always visible
      - Nodes whose status is "available" or "mastered" are visible
      - Locked non-anchor nodes are hidden

    Returns:
        {"nodes": [{"skill_id": ..., "name": ..., "status": ...}, ...]}
    """
    anchor_ids = anchor_ids or []
    anchor_set = set(anchor_ids)

    # Fetch all nodes
    cur = conn.execute("SELECT skill_id, name, prereqs_json FROM curriculum_nodes")
    all_nodes = cur.fetchall()

    visible = []
    for row in all_nodes:
        sid = row["skill_id"]
        status = compute_status(conn, user_id, sid, config)

        if sid in anchor_set or status in ("available", "mastered"):
            visible.append({
                "skill_id": sid,
                "name": row["name"],
                "status": status,
            })

    return {"nodes": visible}
