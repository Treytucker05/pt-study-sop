"""GraphRAG-lite: knowledge graph tables, seeding, hybrid retrieval, and pruning.

Tables:
  kg_nodes  — concepts extracted from Obsidian vault
  kg_edges  — relationships (links, prerequisites, etc.)
  kg_provenance — source tracking for nodes/edges

Retrieval:
  hybrid_retrieve() — vector seeds → entity extraction → BFS expansion → prune
  prune_subgraph() — greedy heuristic to stay within token budget
  build_context_pack() — format pruned graph as prompt section
"""

from __future__ import annotations

import json
import logging
import re
import sqlite3
from collections import deque
from typing import Any, Optional

_LOG = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Table creation (idempotent)
# ---------------------------------------------------------------------------

def create_kg_tables(conn: sqlite3.Connection) -> None:
    """Create knowledge graph tables. Safe to call multiple times."""
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS kg_nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            definition TEXT,
            node_type TEXT DEFAULT 'concept',
            source_path TEXT,
            link_only INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS kg_edges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_node_id INTEGER NOT NULL,
            target_node_id INTEGER NOT NULL,
            relation TEXT DEFAULT 'links_to',
            confidence REAL DEFAULT 0.5,
            link_only INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(source_node_id) REFERENCES kg_nodes(id),
            FOREIGN KEY(target_node_id) REFERENCES kg_nodes(id),
            UNIQUE(source_node_id, target_node_id, relation)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS kg_provenance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL,
            entity_id INTEGER NOT NULL,
            source_type TEXT NOT NULL,
            source_ref TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON kg_edges(source_node_id)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON kg_edges(target_node_id)"
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Seeding from Obsidian
# ---------------------------------------------------------------------------

def _get_or_create_node(
    cur: sqlite3.Cursor, name: str, *, source_path: str | None = None, link_only: int = 0
) -> int:
    """Get or insert a kg_node by name. Returns node ID."""
    cur.execute("SELECT id, link_only FROM kg_nodes WHERE name = ?", (name,))
    row = cur.fetchone()
    if row:
        node_id = row[0]
        if row[1] == 1 and link_only == 0:
            cur.execute(
                "UPDATE kg_nodes SET link_only = 0, source_path = ? WHERE id = ?",
                (source_path, node_id),
            )
        return node_id
    cur.execute(
        "INSERT INTO kg_nodes (name, source_path, link_only) VALUES (?, ?, ?)",
        (name, source_path, link_only),
    )
    return cur.lastrowid  # type: ignore[return-value]


def seed_from_obsidian(conn: sqlite3.Connection) -> dict[str, int]:
    """Convert obsidian_links rows → kg_nodes + kg_edges.

    Uses resolve_alias() for canonical node names when available.
    Returns counts: {nodes_created, edges_created, skipped}.
    """
    from adaptive.vault_ingest import resolve_alias

    cur = conn.cursor()
    cur.execute("SELECT source_path, target FROM obsidian_links")
    links = cur.fetchall()

    nodes_created = 0
    edges_created = 0
    skipped = 0

    seen_sources: set[str] = set()

    for link in links:
        src_path = link[0]
        target_raw = link[1]

        # Source node = filename stem
        src_name_raw = src_path.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
        if src_name_raw.endswith(".md"):
            src_name_raw = src_name_raw[:-3]

        src_name = resolve_alias(conn, src_name_raw) or src_name_raw
        tgt_name = resolve_alias(conn, target_raw) or target_raw

        is_new_source = src_name not in seen_sources
        seen_sources.add(src_name)

        src_id = _get_or_create_node(cur, src_name, source_path=src_path, link_only=0)
        if is_new_source:
            nodes_created += 1

        tgt_id = _get_or_create_node(cur, tgt_name, link_only=1)

        # Create edge (skip duplicates via UNIQUE constraint)
        try:
            cur.execute(
                """INSERT INTO kg_edges (source_node_id, target_node_id, relation, confidence, link_only)
                   VALUES (?, ?, 'links_to', 0.5, 1)""",
                (src_id, tgt_id),
            )
            edges_created += 1
        except sqlite3.IntegrityError:
            skipped += 1

    conn.commit()
    return {"nodes_created": nodes_created, "edges_created": edges_created, "skipped": skipped}


# ---------------------------------------------------------------------------
# Hybrid retrieval
# ---------------------------------------------------------------------------

def _extract_entities(text: str) -> list[str]:
    """Extract potential entity names from text (simple heuristic).

    Finds capitalized phrases and terms in backticks.
    """
    entities: list[str] = []
    # Backtick-wrapped terms
    entities.extend(re.findall(r"`([^`]+)`", text))
    # Capitalized multi-word phrases (2-4 words)
    entities.extend(re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b", text))
    # Deduplicate preserving order
    seen: set[str] = set()
    result: list[str] = []
    for e in entities:
        lower = e.lower()
        if lower not in seen:
            seen.add(lower)
            result.append(e)
    return result


def _bfs_expand(
    conn: sqlite3.Connection, seed_ids: list[int], hops: int = 2
) -> tuple[set[int], list[dict]]:
    """BFS expansion from seed nodes, returning (node_ids, edges)."""
    visited: set[int] = set(seed_ids)
    edges: list[dict] = []
    frontier = deque(seed_ids)

    for _ in range(hops):
        next_frontier: list[int] = []
        while frontier:
            nid = frontier.popleft()
            cur = conn.execute(
                """SELECT id, source_node_id, target_node_id, relation, confidence
                   FROM kg_edges
                   WHERE source_node_id = ? OR target_node_id = ?""",
                (nid, nid),
            )
            for row in cur.fetchall():
                edges.append({
                    "id": row[0],
                    "source": row[1],
                    "target": row[2],
                    "relation": row[3],
                    "confidence": row[4],
                })
                neighbor = row[2] if row[1] == nid else row[1]
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_frontier.append(neighbor)
        frontier = deque(next_frontier)

    return visited, edges


def hybrid_retrieve(
    query: str,
    conn: sqlite3.Connection,
    search_fn: Any = None,
    k: int = 6,
    graph_hops: int = 2,
) -> dict:
    """Vector seeds → entity extraction → BFS expansion → prune.

    Args:
        query: user question
        conn: database connection
        search_fn: optional callable(query, k) returning list of dicts with 'content' key
        k: number of vector seeds
        graph_hops: BFS depth

    Returns dict with keys: nodes, edges, context_text, seed_entities.
    """
    # Step 1: Extract entities from query
    entities = _extract_entities(query)

    # Step 2: Also extract from vector results if search_fn provided
    if search_fn:
        try:
            docs = search_fn(query, k)
            for doc in docs:
                content = doc.get("content", "") if isinstance(doc, dict) else str(doc)
                entities.extend(_extract_entities(content))
        except Exception as exc:
            _LOG.warning("Vector search failed in hybrid_retrieve: %s", exc)

    # Step 3: Resolve entities to node IDs
    seed_ids: list[int] = []
    for entity in entities:
        cur = conn.execute(
            "SELECT id FROM kg_nodes WHERE LOWER(name) = LOWER(?)", (entity,)
        )
        row = cur.fetchone()
        if row:
            seed_ids.append(row[0])

    if not seed_ids:
        return {"nodes": [], "edges": [], "context_text": "", "seed_entities": entities}

    # Deduplicate seed IDs
    seed_ids = list(dict.fromkeys(seed_ids))

    # Step 4: BFS expand
    node_ids, edges = _bfs_expand(conn, seed_ids, graph_hops)

    # Step 5: Load node details
    nodes = []
    for nid in node_ids:
        cur = conn.execute(
            "SELECT id, name, definition, node_type FROM kg_nodes WHERE id = ?", (nid,)
        )
        row = cur.fetchone()
        if row:
            nodes.append({
                "id": row[0],
                "name": row[1],
                "definition": row[2],
                "type": row[3],
                "is_seed": row[0] in seed_ids,
            })

    # Step 6: Prune
    pruned_nodes, pruned_edges = prune_subgraph(nodes, edges)

    # Step 7: Build context
    context_text = build_context_pack(pruned_nodes, pruned_edges, conn)

    return {
        "nodes": pruned_nodes,
        "edges": pruned_edges,
        "context_text": context_text,
        "seed_entities": entities,
    }


# ---------------------------------------------------------------------------
# Pruning
# ---------------------------------------------------------------------------

def prune_subgraph(
    nodes: list[dict],
    edges: list[dict],
    budget_tokens: int = 1500,
) -> tuple[list[dict], list[dict]]:
    """Greedy heuristic: rank by seed proximity + edge weight, keep within budget.

    Each node costs ~20 tokens (name + def snippet), each edge ~15 tokens.
    """
    NODE_COST = 20
    EDGE_COST = 15

    # Score nodes: seeds get +1.0, others get max edge confidence to a seed
    seed_ids = {n["id"] for n in nodes if n.get("is_seed")}
    node_scores: dict[int, float] = {}
    for n in nodes:
        if n["id"] in seed_ids:
            node_scores[n["id"]] = 1.0
        else:
            max_conf = 0.0
            for e in edges:
                if (e["source"] == n["id"] or e["target"] == n["id"]):
                    peer = e["target"] if e["source"] == n["id"] else e["source"]
                    if peer in seed_ids:
                        max_conf = max(max_conf, e.get("confidence", 0.5))
            node_scores[n["id"]] = max_conf

    # Sort by score descending
    sorted_nodes = sorted(nodes, key=lambda n: node_scores.get(n["id"], 0), reverse=True)

    # Greedily add nodes within budget
    kept_ids: set[int] = set()
    kept_nodes: list[dict] = []
    used = 0
    for n in sorted_nodes:
        cost = NODE_COST
        if used + cost > budget_tokens:
            break
        kept_ids.add(n["id"])
        kept_nodes.append(n)
        used += cost

    # Keep edges where both endpoints are kept
    kept_edges: list[dict] = []
    for e in edges:
        if e["source"] in kept_ids and e["target"] in kept_ids:
            if used + EDGE_COST > budget_tokens:
                break
            kept_edges.append(e)
            used += EDGE_COST

    return kept_nodes, kept_edges


def prune_subgraph_pcst(
    nodes: list[dict],
    edges: list[dict],
    prizes: dict[int, float],
    costs: dict[tuple[int, int], float],
    budget: int,
) -> tuple[list[dict], list[dict]]:
    """Prize-Collecting Steiner Tree pruning (future implementation)."""
    raise NotImplementedError(
        "PCST pruning not yet implemented. Use prune_subgraph() instead."
    )


# ---------------------------------------------------------------------------
# Context pack builder
# ---------------------------------------------------------------------------

def build_context_pack(
    nodes: list[dict],
    edges: list[dict],
    conn: sqlite3.Connection,
) -> str:
    """Format pruned graph as a prompt section."""
    if not nodes:
        return ""

    lines: list[str] = ["## Concept Graph Context"]

    # Node definitions
    lines.append("\n### Concepts")
    for n in nodes:
        seed_marker = " [SEED]" if n.get("is_seed") else ""
        definition = n.get("definition") or ""
        if definition:
            definition = f" — {definition[:120]}"
        lines.append(f"- **{n['name']}**{seed_marker}{definition}")

    # Edge list
    if edges:
        lines.append("\n### Relationships")
        # Build ID→name lookup
        id_to_name = {n["id"]: n["name"] for n in nodes}
        for e in edges:
            src = id_to_name.get(e["source"], f"#{e['source']}")
            tgt = id_to_name.get(e["target"], f"#{e['target']}")
            rel = e.get("relation", "links_to")
            lines.append(f"- {src} --[{rel}]--> {tgt}")

    return "\n".join(lines)
