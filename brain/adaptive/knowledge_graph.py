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
            edge_id = cur.lastrowid
            edges_created += 1
            # Record provenance for seeded edge
            cur.execute(
                """INSERT INTO kg_provenance (entity_type, entity_id, source_type, source_ref)
                   VALUES ('edge', ?, 'obsidian_link', ?)""",
                (edge_id, src_path),
            )
        except sqlite3.IntegrityError:
            skipped += 1

    conn.commit()
    return {"nodes_created": nodes_created, "edges_created": edges_created, "skipped": skipped}


# ---------------------------------------------------------------------------
# Typed relation extraction (Task 7.3)
# ---------------------------------------------------------------------------

# Pattern-based extraction: looks for "X requires Y", "X causes Y", etc.
_TYPED_RELATION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("requires", re.compile(r"(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\s+(?:requires?|depends?\s+on|needs?)\s+(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\b", re.IGNORECASE)),
    ("causes", re.compile(r"(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\s+(?:causes?|leads?\s+to|produces?|results?\s+in)\s+(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\b", re.IGNORECASE)),
    ("inhibits", re.compile(r"(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\s+(?:inhibits?|blocks?|prevents?|suppresses?)\s+(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\b", re.IGNORECASE)),
    ("increases", re.compile(r"(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\s+(?:increases?|raises?|elevates?|enhances?)\s+(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\b", re.IGNORECASE)),
    ("decreases", re.compile(r"(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\s+(?:decreases?|reduces?|lowers?|diminishes?)\s+(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\b", re.IGNORECASE)),
    ("part_of", re.compile(r"(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\s+(?:is\s+(?:a\s+)?(?:part|component|subset)\s+of)\s+(\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})\b", re.IGNORECASE)),
]


def extract_typed_relations(
    conn: sqlite3.Connection,
    doc_path: str,
    doc_content: str,
) -> dict[str, int]:
    """Extract typed relations from document content using regex patterns.

    Creates edges with higher confidence (0.7) and provenance tracking.
    Returns counts: {edges_created, skipped}.
    """
    from adaptive.vault_ingest import resolve_alias

    cur = conn.cursor()
    edges_created = 0
    skipped = 0

    for relation, pattern in _TYPED_RELATION_PATTERNS:
        for match in pattern.finditer(doc_content):
            src_raw = match.group(1).strip()
            tgt_raw = match.group(2).strip()

            # Skip very short matches (likely noise)
            if len(src_raw) < 3 or len(tgt_raw) < 3:
                continue

            src_name = resolve_alias(conn, src_raw) or src_raw
            tgt_name = resolve_alias(conn, tgt_raw) or tgt_raw

            src_id = _get_or_create_node(cur, src_name, source_path=doc_path, link_only=0)
            tgt_id = _get_or_create_node(cur, tgt_name, link_only=0)

            try:
                cur.execute(
                    """INSERT INTO kg_edges (source_node_id, target_node_id, relation, confidence, link_only)
                       VALUES (?, ?, ?, 0.7, 0)""",
                    (src_id, tgt_id, relation),
                )
                edge_id = cur.lastrowid
                edges_created += 1

                # Record provenance with excerpt
                excerpt_start = max(0, match.start() - 40)
                excerpt_end = min(len(doc_content), match.end() + 40)
                excerpt = doc_content[excerpt_start:excerpt_end].replace("\n", " ").strip()
                cur.execute(
                    """INSERT INTO kg_provenance (entity_type, entity_id, source_type, source_ref)
                       VALUES ('edge', ?, 'typed_extraction', ?)""",
                    (edge_id, f"{doc_path}||{excerpt}"),
                )
            except sqlite3.IntegrityError:
                skipped += 1

    conn.commit()
    return {"edges_created": edges_created, "skipped": skipped}


# ---------------------------------------------------------------------------
# Incremental KG updates (Task 7.8)
# ---------------------------------------------------------------------------

def incremental_kg_update(
    conn: sqlite3.Connection,
    doc_path: str,
    doc_content: str,
) -> dict[str, int]:
    """Re-extract edges for a changed document.

    Deletes existing typed edges (not link_only) sourced from this doc,
    then re-extracts. Link-only edges from obsidian_links are NOT touched.
    Returns counts: {deleted, edges_created, skipped}.
    """
    cur = conn.cursor()

    # Find nodes sourced from this doc
    cur.execute("SELECT id FROM kg_nodes WHERE source_path = ?", (doc_path,))
    node_ids = [row[0] for row in cur.fetchall()]

    deleted = 0
    if node_ids:
        placeholders = ",".join("?" * len(node_ids))
        # Delete typed (non link_only) edges where source is from this doc
        cur.execute(
            f"""DELETE FROM kg_edges
                WHERE link_only = 0
                AND source_node_id IN ({placeholders})""",
            node_ids,
        )
        deleted = cur.rowcount

        # Clean up orphaned provenance for deleted edges
        cur.execute(
            """DELETE FROM kg_provenance
               WHERE entity_type = 'edge'
               AND source_type = 'typed_extraction'
               AND source_ref LIKE ?""",
            (f"{doc_path}||%",),
        )

    conn.commit()

    # Re-extract
    result = extract_typed_relations(conn, doc_path, doc_content)
    result["deleted"] = deleted
    return result


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
    prizes: Optional[dict[int, float]] = None,
    costs: Optional[dict[tuple[int, int], float]] = None,
    budget_tokens: int = 1500,
) -> tuple[list[dict], list[dict]]:
    """Prize-Collecting Steiner Tree approximation.

    Greedy approximation that maximizes (node_prize - edge_cost) within
    a token budget. Node prizes combine seed similarity and optional
    curriculum mastery value. Edge costs penalize low-confidence and
    link-only edges.

    Args:
        nodes: list of node dicts with 'id', 'is_seed', 'name'
        edges: list of edge dicts with 'source', 'target', 'confidence', 'link_only'
        prizes: optional {node_id: prize_value} — defaults to seed-based scoring
        costs: optional {(src_id, tgt_id): cost} — defaults to confidence-based
        budget_tokens: max tokens for pruned context

    Returns (kept_nodes, kept_edges).
    """
    NODE_COST = 20
    EDGE_COST = 15

    # Default prizes: seeds get 1.0, others get 0.3
    if prizes is None:
        prizes = {}
        for n in nodes:
            prizes[n["id"]] = 1.0 if n.get("is_seed") else 0.3

    # Default costs: inverse confidence, link_only penalty
    if costs is None:
        costs = {}
        for e in edges:
            base_cost = 1.0 - e.get("confidence", 0.5)
            penalty = 0.3 if e.get("link_only") else 0.0
            costs[(e["source"], e["target"])] = base_cost + penalty

    # Build adjacency for connectivity check
    adj: dict[int, list[tuple[int, dict]]] = {n["id"]: [] for n in nodes}
    for e in edges:
        if e["source"] in adj and e["target"] in adj:
            adj[e["source"]].append((e["target"], e))
            adj[e["target"]].append((e["source"], e))

    # Score each node: prize - avg incident edge cost
    node_scores: dict[int, float] = {}
    for n in nodes:
        nid = n["id"]
        prize = prizes.get(nid, 0.0)
        incident_costs = [
            costs.get((e["source"], e["target"]), 0.5)
            for e in edges
            if e["source"] == nid or e["target"] == nid
        ]
        avg_cost = sum(incident_costs) / max(len(incident_costs), 1)
        node_scores[nid] = prize - avg_cost * 0.5

    # Sort by score descending, seeds always first
    sorted_nodes = sorted(
        nodes,
        key=lambda n: (n.get("is_seed", False), node_scores.get(n["id"], 0)),
        reverse=True,
    )

    # Greedily add nodes within budget
    kept_ids: set[int] = set()
    kept_nodes: list[dict] = []
    used = 0
    for n in sorted_nodes:
        if used + NODE_COST > budget_tokens:
            break
        kept_ids.add(n["id"])
        kept_nodes.append(n)
        used += NODE_COST

    # Keep edges where both endpoints kept, sorted by lowest cost
    candidate_edges = [
        e for e in edges
        if e["source"] in kept_ids and e["target"] in kept_ids
    ]
    candidate_edges.sort(key=lambda e: costs.get((e["source"], e["target"]), 0.5))

    kept_edges: list[dict] = []
    for e in candidate_edges:
        if used + EDGE_COST > budget_tokens:
            break
        kept_edges.append(e)
        used += EDGE_COST

    return kept_nodes, kept_edges


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

    # Edge list with provenance excerpts
    if edges:
        lines.append("\n### Relationships")
        id_to_name = {n["id"]: n["name"] for n in nodes}

        # Load provenance excerpts for typed edges
        edge_excerpts: dict[int, str] = {}
        edge_ids = [e["id"] for e in edges if e.get("id")]
        if edge_ids:
            placeholders = ",".join("?" * len(edge_ids))
            cur = conn.execute(
                f"""SELECT entity_id, source_ref FROM kg_provenance
                    WHERE entity_type = 'edge' AND source_type = 'typed_extraction'
                    AND entity_id IN ({placeholders})""",
                edge_ids,
            )
            for row in cur.fetchall():
                ref = row[1] or ""
                if "||" in ref:
                    edge_excerpts[row[0]] = ref.split("||", 1)[1][:80]

        for e in edges:
            src = id_to_name.get(e["source"], f"#{e['source']}")
            tgt = id_to_name.get(e["target"], f"#{e['target']}")
            rel = e.get("relation", "links_to")
            line = f"- {src} --[{rel}]--> {tgt}"
            excerpt = edge_excerpts.get(e.get("id", -1))
            if excerpt:
                line += f' (source: "{excerpt}")'
            lines.append(line)

    return "\n".join(lines)
