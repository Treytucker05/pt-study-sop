"""
Tutor API Blueprint — Flask endpoints for the Adaptive Tutor system.

Endpoints:
  POST   /api/tutor/session              — Create tutor session
  GET    /api/tutor/session/<id>          — Get session with history
  POST   /api/tutor/session/<id>/turn     — Send message, SSE stream response
  POST   /api/tutor/session/<id>/end      — End session, create Brain record
  POST   /api/tutor/session/<id>/artifact — Create note/card/map mid-session
  POST   /api/tutor/session/<id>/advance-block — Advance to next block in chain
  GET    /api/tutor/sessions              — List sessions
  GET    /api/tutor/content-sources       — Get available courses + materials
  GET    /api/tutor/chains/templates      — Get template chains with resolved blocks
  POST   /api/tutor/chain                 — Create/extend session chain
  GET    /api/tutor/chain/<id>            — Get chain with linked sessions
  POST   /api/tutor/embed                 — Trigger embedding for rag_docs
  POST   /api/tutor/materials/sync         — Sync local materials folder to rag_docs
  POST   /api/tutor/materials/upload      — Upload study material
  GET    /api/tutor/materials             — List materials library
  PUT    /api/tutor/materials/<id>        — Update material metadata
  DELETE /api/tutor/materials/<id>        — Delete material + file + embeddings
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import uuid
import logging
from datetime import datetime
from pathlib import Path
from threading import Lock, Thread
from typing import Any, Optional

from flask import Blueprint, Response, current_app, has_app_context, jsonify, request

from db_setup import DB_PATH, get_connection, ensure_method_library_seeded
from course_wheel_sync import ensure_course_in_wheel
from tutor_behavior_directives import get_directive
from tutor_verdict import (
    CONCEPT_MAP_PROMPT_SUFFIX,
    VERDICT_PROMPT_SUFFIX,
    parse_concept_map,
    parse_verdict,
    strip_verdict_marker,
    validate_verdict,
)
from tutor_teach_back import (
    TEACH_BACK_PROMPT_SUFFIX,
    parse_teach_back_rubric,
    validate_teach_back_rubric,
    rubric_blocks_mastery,
)
from tutor_accuracy_profiles import (
    DEFAULT_ACCURACY_PROFILE,
    accuracy_profile_config,
    normalize_accuracy_profile,
    resolve_instruction_retrieval_k as _resolve_instruction_k_for_profile,
    resolve_material_retrieval_k as _resolve_material_k_for_profile,
)

tutor_bp = Blueprint("tutor", __name__, url_prefix="/api/tutor")

UPLOADS_DIR = Path(__file__).parent.parent / "data" / "uploads"
SYNC_JOBS: dict[str, dict[str, Any]] = {}
SYNC_JOBS_LOCK = Lock()
SYNC_JOB_RETENTION = 30
_LOG = logging.getLogger(__name__)

_SELECTOR_COLS_ENSURED = False
_WIKILINK_PATTERN = re.compile(r"\[\[([^\]]+)\]\]")
_NORTH_STAR_OBJECTIVE_PATTERN = re.compile(
    r"\[\[(OBJ-[^\]]+)\]\].*status:\s*([a-z_]+)",
    re.IGNORECASE,
)
_TUTOR_NOTE_SCHEMA_PATH = (
    Path(__file__).resolve().parents[2] / "docs" / "schemas" / "tutor_note_schema_v1_1.json"
)


def _ensure_selector_columns(conn: sqlite3.Connection) -> None:
    """
    Idempotently add selector + continuity columns to tutor tables.

    This keeps API behavior stable across older local DBs without requiring a
    manual migration step before first request.
    """
    global _SELECTOR_COLS_ENSURED
    if _SELECTOR_COLS_ENSURED:
        return
    try:
        cur = conn.cursor()
        # tutor_sessions columns
        cur.execute("PRAGMA table_info(tutor_sessions)")
        ts_cols = {row[1] for row in cur.fetchall()}
        for col, typedef in (
            ("selector_chain_id", "TEXT"),
            ("selector_score_json", "TEXT"),
            ("selector_policy_version", "TEXT"),
            ("selector_dependency_fix", "INTEGER DEFAULT 0"),
            ("codex_thread_id", "TEXT"),
            ("last_response_id", "TEXT"),
        ):
            if col not in ts_cols:
                cur.execute(f"ALTER TABLE tutor_sessions ADD COLUMN {col} {typedef}")

        # tutor_turns continuity columns
        cur.execute("PRAGMA table_info(tutor_turns)")
        tt_cols = {row[1] for row in cur.fetchall()}
        for col, typedef in (
            ("response_id", "TEXT"),
            ("model_id", "TEXT"),
        ):
            if col not in tt_cols:
                cur.execute(f"ALTER TABLE tutor_turns ADD COLUMN {col} {typedef}")

        # sessions columns
        cur.execute("PRAGMA table_info(sessions)")
        s_cols = {row[1] for row in cur.fetchall()}
        for col, typedef in (
            ("selector_chain_id", "TEXT"),
            ("selector_policy_version", "TEXT"),
        ):
            if col not in s_cols:
                cur.execute(f"ALTER TABLE sessions ADD COLUMN {col} {typedef}")

        conn.commit()
        _SELECTOR_COLS_ENSURED = True
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _gen_session_id() -> str:
    """Generate a unique tutor session ID."""
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    short = uuid.uuid4().hex[:6]
    return f"tutor-{ts}-{short}"


def _sanitize_module_name(raw: Any) -> str:
    value = str(raw or "").strip()
    if not value:
        return "General Module"
    value = re.sub(r'[\\/:*?"<>|]+', " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value or "General Module"


def _canonical_north_star_path(module_name: str) -> str:
    safe_name = _sanitize_module_name(module_name)
    return f"Modules/{safe_name}/_North_Star_{safe_name}.md"


def _wikilink(label: str) -> str:
    clean = str(label or "").strip()
    return f"[[{clean}]]" if clean else ""


def _strip_wikilink(value: str) -> str:
    s = str(value or "").strip()
    if s.startswith("[[") and s.endswith("]]") and len(s) > 4:
        return s[2:-2].strip()
    return s


def _extract_wikilinks(text: str, *, max_items: int = 80) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for match in _WIKILINK_PATTERN.finditer(text or ""):
        link = _wikilink(match.group(1))
        if not link or link in seen:
            continue
        seen.add(link)
        ordered.append(link)
        if len(ordered) >= max_items:
            break
    return ordered


def _normalize_wikilinks(value: Any, *, max_items: int = 80) -> list[str]:
    if isinstance(value, str):
        return _extract_wikilinks(value, max_items=max_items)
    if not isinstance(value, list):
        return []
    seen: set[str] = set()
    out: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        label = _strip_wikilink(item)
        if not label:
            continue
        link = _wikilink(label)
        if link in seen:
            continue
        seen.add(link)
        out.append(link)
        if len(out) >= max_items:
            break
    return out


def _normalize_objective_status(raw_status: Any) -> str:
    status = str(raw_status or "").strip().lower()
    valid = {"not_started", "active", "needs_review", "mastered"}
    if status in valid:
        return status
    if status in {"in_progress", "current"}:
        return "active"
    if status in {"review", "stale"}:
        return "needs_review"
    if status in {"done", "completed"}:
        return "mastered"
    return "not_started"


def _normalize_objective_id(raw_id: Any, index: int) -> str:
    candidate = str(raw_id or "").strip()
    candidate = re.sub(r"\s+", "-", candidate)
    candidate = re.sub(r"[^A-Za-z0-9_-]", "", candidate)
    if not candidate:
        candidate = f"{index:03d}"
    candidate = candidate.upper()
    if not candidate.startswith("OBJ-"):
        candidate = f"OBJ-{candidate}"
    return candidate


def _normalize_objective_scope(raw_scope: Any) -> str:
    scope = str(raw_scope or "").strip().lower()
    if scope in {"module_all", "single_focus"}:
        return scope
    return "module_all"


def _collect_objectives_from_payload(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    items: list[dict[str, str]] = []
    for idx, item in enumerate(raw, start=1):
        if isinstance(item, str):
            title = item.strip()
            if not title:
                continue
            items.append(
                {
                    "objective_id": _normalize_objective_id(None, idx),
                    "title": title,
                    "status": "not_started",
                }
            )
            continue
        if isinstance(item, dict):
            title = str(item.get("title") or item.get("objective") or "").strip()
            if not title:
                continue
            raw_obj_id = item.get("objective_id") or item.get("lo_code") or item.get("id")
            items.append(
                {
                    "objective_id": _normalize_objective_id(raw_obj_id, idx),
                    "title": title,
                    "status": _normalize_objective_status(item.get("status")),
                }
            )
    return items


def _collect_objectives_from_db(
    course_id: Optional[int],
    module_id: Optional[int] = None,
    *,
    max_items: int = 40,
) -> list[dict[str, str]]:
    if not course_id:
        return []
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    if module_id:
        cur.execute(
            """
            SELECT lo_code, title, status
            FROM learning_objectives
            WHERE course_id = ? AND module_id = ?
            ORDER BY id ASC
            LIMIT ?
            """,
            (course_id, module_id, max_items),
        )
    else:
        cur.execute(
            """
            SELECT lo_code, title, status
            FROM learning_objectives
            WHERE course_id = ?
            ORDER BY id ASC
            LIMIT ?
            """,
            (course_id, max_items),
        )
    rows = cur.fetchall()
    conn.close()

    items: list[dict[str, str]] = []
    for idx, row in enumerate(rows, start=1):
        title = str(row["title"] or "").strip()
        if not title:
            continue
        items.append(
            {
                "objective_id": _normalize_objective_id(row["lo_code"], idx),
                "title": title,
                "status": _normalize_objective_status(row["status"]),
            }
        )
    return items


def _parse_existing_north_star_objectives(content: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for line in (content or "").splitlines():
        m = _NORTH_STAR_OBJECTIVE_PATTERN.search(line)
        if not m:
            continue
        parsed[m.group(1).strip()] = _normalize_objective_status(m.group(2))
    return parsed


def _build_north_star_markdown(
    *,
    module_name: str,
    topic: str,
    objectives: list[dict[str, str]],
    source_ids: list[int],
) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines: list[str] = [
        "---",
        "note_type: north_star",
        f"module_name: {module_name}",
        f"updated_at: {now}",
        "---",
        "",
        f"# North Star - {module_name}",
        "",
        "## Topic",
        topic or module_name,
        "",
        "## Objective Status Board",
    ]

    for obj in objectives:
        objective_link = _wikilink(obj["objective_id"])
        concept_link = _wikilink(obj["title"])
        lines.append(
            f"- {objective_link} — {concept_link} | status: {obj['status']}"
        )

    lines.extend(
        [
            "",
            "## Active Objectives",
        ]
    )
    active = [o for o in objectives if o["status"] in {"active", "needs_review"}]
    if not active:
        active = objectives[: min(3, len(objectives))]
    for obj in active:
        lines.append(f"- {_wikilink(obj['objective_id'])}")

    lines.extend(
        [
            "",
            "## Follow Up Targets",
            "- [[OBJ-UNMAPPED]]",
            "",
            "## Source IDs",
            "- " + (", ".join(str(x) for x in source_ids) if source_ids else "none"),
            "",
            "## Session Links",
            "- (auto-filled by tutor sessions)",
            "",
        ]
    )
    return "\n".join(lines)


def _north_star_io_disabled() -> bool:
    """Disable Obsidian North Star I/O for tests/safety guard contexts."""
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return True

    raw_guard = str(os.environ.get("PT_DISABLE_OBSIDIAN_WRITES") or "").strip().lower()
    if raw_guard in {"1", "true", "yes", "on"}:
        return True

    try:
        if has_app_context() and bool(getattr(current_app, "testing", False)):
            return True
    except Exception:
        pass

    return False


def _ensure_north_star_context(
    *,
    course_id: Optional[int],
    module_id: Optional[int],
    module_name: Optional[str],
    topic: str,
    learning_objectives: Any,
    source_ids: list[int],
) -> tuple[Optional[dict[str, Any]], Optional[str]]:
    """
    Hard-gate North Star flow:
    - If exists: review and update only on detected objective changes.
    - If missing: build before planning.
    """
    # Local import prevents blueprint import cycles at module import time.
    from dashboard.api_adapter import obsidian_get_file, obsidian_save_file

    derived_module_name = _sanitize_module_name(module_name or topic or f"Course-{course_id or 'General'}")
    north_star_path = _canonical_north_star_path(derived_module_name)

    objectives = _collect_objectives_from_payload(learning_objectives)
    if not objectives:
        objectives = _collect_objectives_from_db(course_id, module_id)
    if not objectives:
        fallback_title = topic.strip() or derived_module_name
        objectives = [
            {
                "objective_id": "OBJ-UNMAPPED",
                "title": fallback_title,
                "status": "active",
            }
        ]

    desired_statuses = {o["objective_id"]: o["status"] for o in objectives}
    current_content = ""
    status = "built"

    if _north_star_io_disabled():
        current_content = _build_north_star_markdown(
            module_name=derived_module_name,
            topic=topic,
            objectives=objectives,
            source_ids=source_ids,
        )
        status = "test_mode_no_write"
    else:
        existing = obsidian_get_file(north_star_path)
        if existing.get("success"):
            current_content = str(existing.get("content") or "")
            current_statuses = _parse_existing_north_star_objectives(current_content)
            needs_update = False
            for oid, st in desired_statuses.items():
                if current_statuses.get(oid) != st:
                    needs_update = True
                    break
            if needs_update:
                new_content = _build_north_star_markdown(
                    module_name=derived_module_name,
                    topic=topic,
                    objectives=objectives,
                    source_ids=source_ids,
                )
                save_res = obsidian_save_file(north_star_path, new_content)
                if not save_res.get("success"):
                    return None, f"North Star update failed: {save_res.get('error', 'unknown error')}"
                current_content = new_content
                status = "updated"
            else:
                status = "reviewed"
        else:
            new_content = _build_north_star_markdown(
                module_name=derived_module_name,
                topic=topic,
                objectives=objectives,
                source_ids=source_ids,
            )
            save_res = obsidian_save_file(north_star_path, new_content)
            if not save_res.get("success"):
                return None, f"North Star build failed: {save_res.get('error', 'unknown error')}"
            current_content = new_content
            status = "built"

    objective_links = [_wikilink(o["objective_id"]) for o in objectives]
    title_links = [_wikilink(o["title"]) for o in objectives if o.get("title")]
    reference_targets = _normalize_wikilinks(
        _extract_wikilinks(current_content) + objective_links + title_links,
        max_items=80,
    )
    if not reference_targets:
        reference_targets = ["[[OBJ-UNMAPPED]]"]

    return (
        {
            "path": north_star_path,
            "module_name": derived_module_name,
            "status": status,
            "reference_targets": reference_targets,
            "follow_up_targets": ["[[OBJ-UNMAPPED]]"],
            "objective_ids": [o["objective_id"] for o in objectives],
        },
        None,
    )


def _question_within_reference_targets(question: str, reference_targets: list[str]) -> bool:
    q = re.sub(r"[^a-z0-9\s]", " ", (question or "").lower())
    q = re.sub(r"\s+", " ", q).strip()
    if not q:
        return False
    # Allow broad planning/overview prompts without forcing concept-name matches.
    if any(token in q for token in ("overview", "big picture", "north star", "plan")):
        return True

    labels = [_strip_wikilink(t).lower() for t in reference_targets if t]
    for label in labels:
        if not label:
            continue
        if label in q:
            return True
        tokens = [tok for tok in re.split(r"[^a-z0-9]+", label) if len(tok) >= 4]
        if any(tok in q for tok in tokens):
            return True
    return False


def _format_notes_context(note_hits: list[dict[str, Any]], *, max_items: int = 8) -> str:
    if not note_hits:
        return ""
    parts: list[str] = []
    for idx, hit in enumerate(note_hits[:max_items], start=1):
        metadata = hit.get("metadata") or {}
        source = metadata.get("source_path") or metadata.get("source") or "vault-note"
        content = str(hit.get("content") or "").strip()
        if len(content) > 600:
            content = content[:600] + "..."
        parts.append(f"[{idx}] {source}\n{content}")
    return "\n\n---\n\n".join(parts)


def _get_tutor_session(conn, session_id: str) -> Optional[dict]:
    """Fetch a tutor_sessions row as dict."""
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM tutor_sessions WHERE session_id = ?", (session_id,))
    row = cur.fetchone()
    return dict(row) if row else None


def _get_session_turns(conn, session_id: str, limit: int = 50) -> list[dict]:
    """Fetch recent tutor_turns for a session."""
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """SELECT id, turn_number, question, answer, citations_json,
                  phase, artifacts_json, response_id, model_id, created_at
           FROM tutor_turns
           WHERE tutor_session_id = ?
           ORDER BY turn_number ASC
           LIMIT ?""",
        (session_id, limit),
    )
    return [dict(r) for r in cur.fetchall()]


def _resolve_chain_blocks(conn, chain_id: int) -> list[dict]:
    """Resolve a method_chain's block_ids JSON into block detail dicts."""
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT block_ids FROM method_chains WHERE id = ?", (chain_id,))
    row = cur.fetchone()
    if not row or not row["block_ids"]:
        return []

    try:
        block_ids = json.loads(row["block_ids"])
    except (json.JSONDecodeError, TypeError):
        return []

    if not block_ids:
        return []

    placeholders = ",".join("?" * len(block_ids))
    cur.execute(
        f"""SELECT id, name, control_stage, description, default_duration_min, evidence, facilitation_prompt
            FROM method_blocks WHERE id IN ({placeholders})""",
        block_ids,
    )
    block_map = {r["id"]: dict(r) for r in cur.fetchall()}

    # Preserve chain order and normalise duration field for frontend
    ordered = []
    for bid in block_ids:
        if bid in block_map:
            b = block_map[bid]
            b["duration"] = b.pop("default_duration_min", None)
            ordered.append(b)
    return ordered


def _build_chain_info(
    conn, chain_id: int, current_index: int
) -> tuple[Optional[dict], Optional[dict]]:
    """
    Build block_info and chain_info dicts for prompt builder.
    Returns (block_info, chain_info) — either may be None.
    """
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        "SELECT id, name, description FROM method_chains WHERE id = ?", (chain_id,)
    )
    chain_row = cur.fetchone()
    if not chain_row:
        return None, None

    blocks = _resolve_chain_blocks(conn, chain_id)
    if not blocks:
        return None, None

    # Current block info
    block_info = None
    if 0 <= current_index < len(blocks):
        b = blocks[current_index]
        block_info = {
            "name": b["name"],
            "description": b.get("description", ""),
            "category": b.get("control_stage", ""),
            "evidence": b.get("evidence", ""),
            "duration": b.get("default_duration_min", 5),
            "facilitation_prompt": b.get("facilitation_prompt", ""),
        }

    # Chain overview
    chain_info = {
        "name": chain_row["name"],
        "blocks": [b["name"] for b in blocks],
        "current_index": current_index,
        "total": len(blocks),
    }

    return block_info, chain_info


def _format_dual_context(dual: dict) -> tuple[str, str]:
    """
    Format dual context dicts into (material_context_text, instruction_context_text).
    """
    material_parts = []
    for d in dual.get("materials") or []:
        source = (d.metadata or {}).get("source", "Unknown")
        material_parts.append(f"[Source: {source}]\n{d.page_content}")
    material_text = "\n\n---\n\n".join(material_parts) if material_parts else ""

    instruction_parts = []
    for d in dual.get("instructions") or []:
        source = (d.metadata or {}).get("source", "Unknown")
        instruction_parts.append(f"[SOP: {source}]\n{d.page_content}")
    instruction_text = (
        "\n\n---\n\n".join(instruction_parts) if instruction_parts else ""
    )

    return material_text, instruction_text


def _resolve_material_retrieval_k(
    material_ids: Optional[list[int]],
    accuracy_profile: str = DEFAULT_ACCURACY_PROFILE,
) -> int:
    """
    Determine material retrieval depth for dual-context search.

    Balanced profile preserves existing behavior; strict/coverage profiles tune
    retrieval depth for higher confidence or broader source coverage.
    """
    return _resolve_material_k_for_profile(material_ids, accuracy_profile)


def _resolve_instruction_retrieval_k(
    accuracy_profile: str = DEFAULT_ACCURACY_PROFILE,
) -> int:
    return _resolve_instruction_k_for_profile(accuracy_profile)


def _normalize_material_ids(value: Any) -> Optional[list[int]]:
    """Best-effort parse of material IDs from payload/session filter."""
    if not isinstance(value, list):
        return None
    normalized: list[int] = []
    seen: set[int] = set()
    for raw in value:
        try:
            mid = int(raw)
        except (TypeError, ValueError):
            continue
        if mid <= 0 or mid in seen:
            continue
        normalized.append(mid)
        seen.add(mid)
    return normalized


def _material_scope_labels(
    material_ids: Optional[list[int]], *, max_items: int = 20
) -> tuple[int, list[str]]:
    """
    Resolve selected material IDs into user-readable labels for prompt context.

    Returns (total_selected_count, label_list). Labels preserve the original order
    of material_ids and are truncated to max_items to keep prompts compact.
    """
    if not material_ids:
        return 0, []

    placeholders = ",".join("?" * len(material_ids))
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        f"""SELECT id,
                   COALESCE(NULLIF(TRIM(title), ''), NULLIF(TRIM(source_path), ''), 'Material #' || id) AS label
            FROM rag_docs
            WHERE id IN ({placeholders})
              AND COALESCE(corpus, 'materials') = 'materials'""",
        material_ids,
    )
    rows = cur.fetchall()
    conn.close()
    label_by_id = {int(r["id"]): str(r["label"]) for r in rows}

    ordered_labels: list[str] = []
    for mid in material_ids:
        label = label_by_id.get(mid, f"Material #{mid}")
        ordered_labels.append(label)

    total = len(ordered_labels)
    if total <= max_items:
        return total, ordered_labels

    visible = ordered_labels[:max_items]
    visible.append(f"... and {total - max_items} more selected files")
    return total, visible


def _material_sources_from_docs(
    docs: list[Any], *, max_items: Optional[int] = None
) -> list[str]:
    """Collect ordered unique source labels from retrieved LangChain documents."""
    seen: set[str] = set()
    ordered: list[str] = []
    for doc in docs:
        source = str((getattr(doc, "metadata", None) or {}).get("source") or "").strip()
        if not source or source in seen:
            continue
        seen.add(source)
        ordered.append(source)
        if max_items is not None and len(ordered) >= max_items:
            break
    return ordered


def _source_concentration_stats(docs: list[Any]) -> tuple[Optional[str], float]:
    """Return top source and its chunk share from a retrieved-doc list."""
    if not docs:
        return None, 0.0

    counts: dict[str, int] = {}
    for doc in docs:
        source = str((getattr(doc, "metadata", None) or {}).get("source") or "").strip()
        key = source or "Unknown"
        counts[key] = counts.get(key, 0) + 1

    top_source, top_count = max(counts.items(), key=lambda kv: kv[1])
    share = float(top_count / len(docs))
    return top_source, share


def _retrieval_confidence_tier(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"


def _compute_retrieval_confidence(
    *,
    selected_material_count: int,
    material_k: int,
    retrieved_unique_sources: int,
    citations_unique_sources: int,
    top_source_share: float,
    dropped_by_cap: int,
    merged_candidates: int,
) -> float:
    """
    Heuristic confidence score [0, 1] used for runtime retrieval diagnostics.
    """
    if material_k <= 0:
        return 0.0

    target_scope = selected_material_count if selected_material_count > 0 else material_k
    scope_denom = max(1, min(material_k, target_scope))
    coverage = min(1.0, retrieved_unique_sources / scope_denom)
    citation_alignment = min(
        1.0,
        citations_unique_sources / max(1, retrieved_unique_sources),
    )
    diversity = max(0.0, 1.0 - max(0.0, min(1.0, top_source_share)))
    cap_penalty = min(1.0, dropped_by_cap / max(1, merged_candidates))

    score = (0.50 * coverage) + (0.30 * citation_alignment) + (0.20 * diversity) - (0.10 * cap_penalty)
    return round(max(0.0, min(1.0, score)), 4)


def _citation_sources(citations: list[dict], *, max_items: Optional[int] = None) -> list[str]:
    """Collect ordered unique source labels from citation payloads."""
    seen: set[str] = set()
    ordered: list[str] = []
    for citation in citations:
        if not isinstance(citation, dict):
            continue
        source = str(citation.get("source") or citation.get("url") or "").strip()
        if not source or source in seen:
            continue
        seen.add(source)
        ordered.append(source)
        if max_items is not None and len(ordered) >= max_items:
            break
    return ordered


def _build_retrieval_debug_payload(
    *,
    accuracy_profile: str,
    material_ids: Optional[list[int]],
    selected_material_count: int,
    material_k: int,
    retrieval_course_id: Optional[int],
    material_docs: list[Any],
    instruction_docs: list[Any],
    citations: list[dict],
    rag_debug: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Build compact retrieval telemetry attached to SSE done events."""
    material_sources_all = _material_sources_from_docs(material_docs)
    instruction_sources_all = _material_sources_from_docs(instruction_docs)
    citation_sources_all = _citation_sources(citations)
    top_source, top_share = _source_concentration_stats(material_docs)

    rag_material = {}
    rag_instruction = {}
    if isinstance(rag_debug, dict):
        rag_material = rag_debug.get("materials") or {}
        rag_instruction = rag_debug.get("instructions") or {}

    merged_candidates = int(rag_material.get("candidate_pool_merged") or 0)
    dropped_by_cap = int(rag_material.get("candidate_pool_dropped_by_cap") or 0)
    confidence = _compute_retrieval_confidence(
        selected_material_count=selected_material_count,
        material_k=material_k,
        retrieved_unique_sources=len(material_sources_all),
        citations_unique_sources=len(citation_sources_all),
        top_source_share=top_share,
        dropped_by_cap=dropped_by_cap,
        merged_candidates=merged_candidates,
    )
    profile_cfg = accuracy_profile_config(accuracy_profile)

    return {
        "accuracy_profile": normalize_accuracy_profile(accuracy_profile),
        "accuracy_profile_label": profile_cfg.get("label"),
        "material_ids_provided": bool(material_ids),
        "material_ids_count": len(material_ids or []),
        "selected_material_count": selected_material_count,
        "material_k": material_k,
        "retrieval_course_id": retrieval_course_id,
        "retrieved_material_chunks": len(material_docs),
        "retrieved_material_unique_sources": len(material_sources_all),
        "retrieved_material_sources": material_sources_all[:20],
        "material_top_source": top_source,
        "material_top_source_share": round(top_share, 4),
        "retrieved_instruction_chunks": len(instruction_docs),
        "retrieved_instruction_unique_sources": len(instruction_sources_all),
        "retrieved_instruction_sources": instruction_sources_all[:10],
        "citations_total": len(citations),
        "citations_unique_sources": len(citation_sources_all),
        "citation_sources": citation_sources_all[:20],
        "material_candidates_similarity": int(rag_material.get("candidate_pool_similarity") or 0),
        "material_candidates_mmr": int(rag_material.get("candidate_pool_mmr") or 0),
        "material_candidates_merged": merged_candidates,
        "material_candidates_after_cap": int(rag_material.get("candidate_pool_after_cap") or 0),
        "material_dropped_by_cap": dropped_by_cap,
        "instruction_candidates_similarity": int(rag_instruction.get("candidate_pool_similarity") or 0),
        "instruction_candidates_mmr": int(rag_instruction.get("candidate_pool_mmr") or 0),
        "retrieval_confidence": confidence,
        "retrieval_confidence_tier": _retrieval_confidence_tier(confidence),
    }


def _is_material_count_question(question: str) -> bool:
    """Detect user questions asking for a file/material count."""
    q = (question or "").strip().lower()
    if not q:
        return False
    patterns = (
        r"\bhow many\b.{0,80}\b(files?|materials?|sources?)\b",
        r"\bnumber of\b.{0,80}\b(files?|materials?|sources?)\b",
        r"\bcount\b.{0,80}\b(files?|materials?|sources?)\b",
    )
    return any(re.search(pattern, q) for pattern in patterns)


def _is_selected_scope_listing_question(question: str) -> bool:
    """Detect user questions asking to list/show selected files/materials."""
    q = (question or "").strip().lower()
    if not q:
        return False
    if _is_material_count_question(q):
        return False
    patterns = (
        r"\b(list|show)\b.{0,80}\b(selected )?(files?|materials?|sources?)\b",
        r"\bwhat\b.{0,80}\b(files?|materials?|sources?)\b.{0,80}\b(access|using|selected|have)\b",
        r"\bwhich\b.{0,80}\b(files?|materials?|sources?)\b.{0,80}\b(access|using|selected|have)\b",
    )
    return any(re.search(pattern, q) for pattern in patterns)


def _build_material_count_response(
    *,
    selected_count: int,
    selected_labels: list[str],
    retrieved_sources: list[str],
) -> str:
    """Build deterministic response for material-count questions."""
    lines = [f"You selected {selected_count} files for this turn."]
    retrieved_count = len(retrieved_sources)
    if retrieved_count > 0:
        lines.append(
            "Retrieval for this question returned excerpts from "
            f"{retrieved_count} unique files in that selected set."
        )
    else:
        lines.append(
            "No excerpts were retrieved for this exact question, "
            "but scope remains your selected file set."
        )
    lines.append(
        "Note: retrieval is chunk-based, so chunk count and cited file count can be smaller than selected scope."
    )

    if selected_labels:
        lines.append("")
        lines.append("Selected file scope:")
        lines.extend(f"- {label}" for label in selected_labels)

    if retrieved_sources:
        lines.append("")
        lines.append("Files retrieved for this question:")
        lines.extend(f"- {source}" for source in retrieved_sources)

    return "\n".join(lines)


def _build_selected_scope_listing_response(
    *,
    selected_count: int,
    selected_labels: list[str],
    retrieved_sources: list[str],
) -> str:
    """Build deterministic response for selected-file listing questions."""
    lines = [f"You selected {selected_count} files for this turn."]

    if retrieved_sources:
        lines.append("")
        lines.append("Files retrieved for this question:")
        lines.extend(f"- {source}" for source in retrieved_sources)
    else:
        lines.append("")
        lines.append("No chunks were retrieved for this exact question.")

    if selected_labels:
        lines.append("")
        lines.append("All selected files:")
        lines.extend(f"- {label}" for label in selected_labels)

    return "\n".join(lines)


def _accuracy_profile_prompt_guidance(accuracy_profile: str) -> str:
    profile = normalize_accuracy_profile(accuracy_profile)
    if profile == "strict":
        return (
            "- Active profile: STRICT.\n"
            "- Prefer precision over speed. If evidence is thin, say so explicitly.\n"
            "- Do not present uncertain claims as facts.\n"
            "- Ground key claims in cited source text whenever possible."
        )
    if profile == "coverage":
        return (
            "- Active profile: COVERAGE.\n"
            "- Synthesize across multiple selected files before final conclusions.\n"
            "- Call out disagreements between sources when they appear."
        )
    return (
        "- Active profile: BALANCED.\n"
        "- Optimize for clear, accurate teaching with concise evidence references."
    )


def _extract_material_retrieval_signals(
    *,
    material_docs: list[Any],
    rag_debug: dict[str, Any],
) -> dict[str, Any]:
    rag_material = rag_debug.get("materials") if isinstance(rag_debug, dict) else {}
    if not isinstance(rag_material, dict):
        rag_material = {}

    top_source, top_share = _source_concentration_stats(material_docs)
    return {
        "retrieved_chunks": len(material_docs),
        "retrieved_unique_sources": len(_material_sources_from_docs(material_docs)),
        "top_source": top_source,
        "top_source_share": float(
            rag_material.get("final_top_doc_share")
            if rag_material.get("final_top_doc_share") is not None
            else top_share
        ),
        "merged_candidates": int(rag_material.get("candidate_pool_merged") or 0),
        "dropped_by_cap": int(rag_material.get("candidate_pool_dropped_by_cap") or 0),
    }


def _should_escalate_to_coverage(
    *,
    selected_material_count: int,
    material_k: int,
    signals: dict[str, Any],
) -> tuple[bool, list[str]]:
    """
    Decide whether to retry retrieval with the coverage profile.

    Trigger logic:
    - dominant source concentration in selected scope (>=4 files), or
    - weak breadth in large selected scope, or
    - low preflight confidence in large selected scope.
    """
    reasons: list[str] = []
    unique_sources = int(signals.get("retrieved_unique_sources") or 0)
    top_source_share = float(signals.get("top_source_share") or 0.0)
    dropped_by_cap = int(signals.get("dropped_by_cap") or 0)
    merged_candidates = int(signals.get("merged_candidates") or 0)
    large_scope = selected_material_count >= 8

    preflight_confidence = _compute_retrieval_confidence(
        selected_material_count=selected_material_count,
        material_k=material_k,
        retrieved_unique_sources=unique_sources,
        citations_unique_sources=max(1, unique_sources),
        top_source_share=top_source_share,
        dropped_by_cap=dropped_by_cap,
        merged_candidates=merged_candidates,
    )

    if selected_material_count >= 4 and top_source_share > 0.45:
        reasons.append("dominant_source")
    if large_scope and unique_sources < 4:
        reasons.append("low_source_breadth")
    if large_scope and preflight_confidence < 0.50:
        reasons.append("low_preflight_confidence")

    return bool(reasons), reasons


def _build_insufficient_evidence_response(
    *,
    selected_count: int,
    selected_labels: list[str],
    retrieved_sources: list[str],
    profile_used: str,
) -> str:
    lines = [
        "I do not have enough reliable evidence in your selected files to answer that accurately yet.",
        f"Current retrieval profile: {profile_used}.",
        "Please narrow the question, select fewer files, or ask me to focus on a specific source.",
    ]

    if retrieved_sources:
        lines.append("")
        lines.append("Retrieved files for this attempt:")
        lines.extend(f"- {src}" for src in retrieved_sources)

    if selected_labels:
        lines.append("")
        lines.append(f"Selected scope ({selected_count} files):")
        lines.extend(f"- {label}" for label in selected_labels[:20])
        if selected_count > 20:
            lines.append(f"- ... and {selected_count - 20} more")

    return "\n".join(lines)


def _sanitize_filename(name: str) -> str:
    import re

    safe = re.sub(r"[^\w\s\-.]", "", name)
    safe = re.sub(r"\s+", "_", safe)
    return safe[:200]


def _normalize_allowed_exts(raw_value: object) -> Optional[set[str]]:
    if not isinstance(raw_value, list) or not raw_value:
        return None
    normalized: set[str] = set()
    for ext in raw_value:
        ext_str = str(ext).strip().lower()
        if not ext_str:
            continue
        normalized.add(ext_str if ext_str.startswith(".") else f".{ext_str}")
    return normalized or None


def _parse_sync_folder_payload(data: dict[str, Any]) -> tuple[Path, Optional[set[str]]]:
    folder_path_raw = (
        data.get("folder_path")
        or os.environ.get("TUTOR_MATERIALS_DIR")
        or os.environ.get("PT_SCHOOL_MATERIALS_DIR")
    )
    if not folder_path_raw:
        raise ValueError(
            "folder_path is required (or set TUTOR_MATERIALS_DIR/PT_SCHOOL_MATERIALS_DIR)"
        )

    folder_path = str(folder_path_raw).strip().strip('"').strip("'")
    root = Path(folder_path).expanduser()
    if not root.exists() or not root.is_dir():
        raise FileNotFoundError(f"Folder not found: {folder_path}")

    return root, _normalize_allowed_exts(data.get("allowed_exts"))


def _update_sync_job(job_id: str, **payload: Any) -> None:
    with SYNC_JOBS_LOCK:
        job = SYNC_JOBS.setdefault(job_id, {"job_id": job_id})
        job.update(payload)


def _trim_sync_jobs() -> None:
    with SYNC_JOBS_LOCK:
        if len(SYNC_JOBS) <= SYNC_JOB_RETENTION:
            return
        ordered_jobs = sorted(
            SYNC_JOBS.items(),
            key=lambda item: str(item[1].get("started_at") or ""),
        )
        for old_job_id, _ in ordered_jobs[: len(SYNC_JOBS) - SYNC_JOB_RETENTION]:
            SYNC_JOBS.pop(old_job_id, None)


def _auto_link_materials_to_courses(conn: sqlite3.Connection) -> dict:
    """Match unlinked rag_docs materials to courses by folder_path → course name."""
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """SELECT id, folder_path FROM rag_docs
           WHERE course_id IS NULL
             AND COALESCE(corpus, 'materials') = 'materials'
             AND folder_path IS NOT NULL AND TRIM(folder_path) != ''"""
    )
    unlinked = cur.fetchall()

    cur.execute("SELECT id, name FROM courses")
    courses = cur.fetchall()
    if not courses or not unlinked:
        return {"linked": 0, "unlinked": len(unlinked), "mappings": {}}

    # Build lookup: lowered course name → course id
    course_map: list[tuple[int, str]] = [(c["id"], c["name"]) for c in courses]

    def _match_course(folder_path: str) -> Optional[int]:
        top_folder = folder_path.replace("\\", "/").strip("/").split("/")[0].strip()
        if not top_folder:
            return None
        top_lower = top_folder.lower()
        # Exact match
        for cid, cname in course_map:
            if cname.lower() == top_lower:
                return cid
        # Substring match (folder is substring of course name or vice versa)
        for cid, cname in course_map:
            cname_lower = cname.lower()
            if top_lower in cname_lower or cname_lower in top_lower:
                return cid
        return None

    linked = 0
    still_unlinked = 0
    mappings: dict[str, str] = {}

    for row in unlinked:
        course_id = _match_course(row["folder_path"])
        if course_id is not None:
            cur.execute(
                "UPDATE rag_docs SET course_id = ? WHERE id = ?",
                (course_id, row["id"]),
            )
            linked += 1
            top = row["folder_path"].replace("\\", "/").strip("/").split("/")[0].strip()
            if top not in mappings:
                cname = next((n for cid, n in course_map if cid == course_id), "?")
                mappings[top] = cname
        else:
            still_unlinked += 1

    conn.commit()
    return {"linked": linked, "unlinked": still_unlinked, "mappings": mappings}


def _launch_materials_sync_job(root: Path, allowed_exts: Optional[set[str]]) -> str:
    job_id = uuid.uuid4().hex
    _update_sync_job(
        job_id,
        status="pending",
        phase="pending",
        folder=str(root),
        processed=0,
        total=0,
        index=0,
        current_file=None,
        errors=0,
        sync_result=None,
        embed_result=None,
        last_error=None,
        started_at=datetime.now().isoformat(),
        finished_at=None,
    )
    _trim_sync_jobs()

    def _runner() -> None:
        try:
            from rag_notes import sync_folder_to_rag

            _update_sync_job(job_id, status="running", phase="syncing")

            def _progress(payload: dict[str, Any]) -> None:
                _update_sync_job(
                    job_id,
                    phase=str(payload.get("phase") or "syncing"),
                    processed=int(payload.get("processed") or 0),
                    total=int(payload.get("total") or 0),
                    index=int(payload.get("index") or 0),
                    current_file=payload.get("current_file"),
                    errors=int(payload.get("errors") or 0),
                )

            sync_result = sync_folder_to_rag(
                str(root),
                corpus="materials",
                allowed_exts=allowed_exts,
                progress_callback=_progress,
            )
            sync_errors = sync_result.get("errors") or []
            _update_sync_job(
                job_id,
                phase="embedding",
                sync_result=sync_result,
                processed=int(sync_result.get("processed") or 0),
                total=int(sync_result.get("total") or 0),
                index=int(sync_result.get("total") or 0),
                errors=int(sync_result.get("failed") or len(sync_errors)),
                current_file=None,
            )

            try:
                from tutor_rag import embed_rag_docs

                embed_result = embed_rag_docs(corpus="materials")
                _update_sync_job(job_id, embed_result=embed_result)
            except Exception as embed_exc:
                _update_sync_job(
                    job_id,
                    embed_result={"error": str(embed_exc)},
                    last_error=str(embed_exc),
                )

            # Auto-link materials to courses by folder_path
            try:
                link_conn = get_connection()
                _auto_link_materials_to_courses(link_conn)
                link_conn.close()
            except Exception:
                pass

            _update_sync_job(job_id, status="completed", phase="completed")
        except Exception as exc:
            _update_sync_job(
                job_id,
                status="failed",
                phase="failed",
                last_error=str(exc),
            )
        finally:
            _update_sync_job(job_id, finished_at=datetime.now().isoformat())

    Thread(target=_runner, daemon=True).start()
    return job_id


# ---------------------------------------------------------------------------
# POST /api/tutor/session — Create a new tutor session
# ---------------------------------------------------------------------------


@tutor_bp.route("/session", methods=["POST"])
def create_session():
    data = request.get_json(silent=True) or {}

    course_id = data.get("course_id")
    if course_id is not None:
        ensure_course_in_wheel(int(course_id), active=True)
    phase = data.get("phase", "first_pass")
    topic = data.get("topic", "")
    mode = data.get("mode", "Core") or "Core"
    content_filter = data.get("content_filter")
    if isinstance(content_filter, dict):
        normalized_filter = dict(content_filter)
        normalized_filter["accuracy_profile"] = normalize_accuracy_profile(
            normalized_filter.get("accuracy_profile")
        )
        if "material_ids" in normalized_filter:
            normalized_filter["material_ids"] = (
                _normalize_material_ids(normalized_filter.get("material_ids")) or []
            )
        content_filter = normalized_filter
    else:
        content_filter = None
    method_chain_id = data.get("method_chain_id")
    brain_session_id = data.get("brain_session_id")
    module_name = data.get("module_name")
    learning_objectives = data.get("learning_objectives")
    objective_scope = _normalize_objective_scope(data.get("objective_scope"))
    focus_objective_id = str(data.get("focus_objective_id") or "").strip()
    source_ids = _normalize_material_ids(data.get("source_ids")) or []
    module_id: Optional[int] = None
    if data.get("module_id") is not None:
        try:
            module_id = int(data.get("module_id"))
        except (TypeError, ValueError):
            return jsonify({"error": "module_id must be an integer"}), 400

    if not source_ids and isinstance(content_filter, dict):
        source_ids = _normalize_material_ids(content_filter.get("material_ids")) or []
        objective_scope = _normalize_objective_scope(
            content_filter.get("objective_scope") or objective_scope
        )
        focus_objective_id = str(
            content_filter.get("focus_objective_id") or focus_objective_id
        ).strip()

    selector_meta: dict[str, Any] = {}

    if not method_chain_id and data.get("assessment_mode"):
        try:
            from brain.selector_bridge import run_selector

            sel = run_selector(
                assessment_mode=data["assessment_mode"],
                stage=data.get(
                    "stage",
                    phase
                    if phase
                    in ("first_exposure", "review", "exam_prep", "consolidation")
                    else "first_exposure",
                ),
                energy=data.get("energy", "medium"),
                time_available=int(data.get("time_available", 40)),
                class_type=data.get("class_type"),
                prior_exposure_band=data.get("prior_exposure_band", "new"),
            )
            selector_meta = {
                "selector_chain_id": sel["chain_id"],
                "selector_score_json": json.dumps(sel["score_tuple"]),
                "selector_policy_version": sel["selector_policy_version"],
                "selector_dependency_fix": 1 if sel["dependency_fix_applied"] else 0,
            }
        except Exception:
            import logging

            logging.getLogger(__name__).warning(
                "Selector policy failed, continuing without", exc_info=True
            )

    north_star_ctx, north_star_error = _ensure_north_star_context(
        course_id=int(course_id) if course_id is not None else None,
        module_id=module_id,
        module_name=module_name,
        topic=topic,
        learning_objectives=learning_objectives,
        source_ids=source_ids,
    )
    if north_star_error:
        return jsonify({"error": north_star_error}), 500

    if not isinstance(content_filter, dict):
        content_filter = {}

    content_filter["accuracy_profile"] = normalize_accuracy_profile(
        content_filter.get("accuracy_profile")
    )
    content_filter["objective_scope"] = _normalize_objective_scope(
        content_filter.get("objective_scope") or objective_scope
    )
    if "material_ids" in content_filter:
        content_filter["material_ids"] = (
            _normalize_material_ids(content_filter.get("material_ids")) or []
        )
    if source_ids:
        content_filter["source_ids"] = source_ids

    if north_star_ctx:
        module_prefix = str(Path(str(north_star_ctx["path"])).parent).replace("\\", "/")
        content_filter["module_name"] = north_star_ctx.get("module_name")
        content_filter["module_prefix"] = module_prefix
        content_filter["north_star"] = {
            "path": north_star_ctx.get("path"),
            "status": north_star_ctx.get("status"),
            "module_name": north_star_ctx.get("module_name"),
            "objective_ids": north_star_ctx.get("objective_ids") or [],
        }
        content_filter["reference_targets"] = (
            north_star_ctx.get("reference_targets") or []
        )
        content_filter["follow_up_targets"] = (
            north_star_ctx.get("follow_up_targets") or []
        )
        requested_enforce = content_filter.get("enforce_reference_bounds")
        if requested_enforce is None:
            content_filter["enforce_reference_bounds"] = (
                content_filter.get("objective_scope") == "single_focus"
            )
        else:
            content_filter["enforce_reference_bounds"] = bool(requested_enforce)
        if (
            content_filter.get("objective_scope") == "single_focus"
            and not focus_objective_id
            and north_star_ctx.get("objective_ids")
        ):
            focus_objective_id = str(north_star_ctx["objective_ids"][0] or "").strip()

        if focus_objective_id:
            focus_wikilink = _wikilink(_strip_wikilink(focus_objective_id))
            content_filter["focus_objective_id"] = _strip_wikilink(focus_wikilink)
            refs = _normalize_wikilinks(content_filter.get("reference_targets"), max_items=80)
            if focus_wikilink and focus_wikilink not in refs:
                refs = [focus_wikilink, *refs]
            content_filter["reference_targets"] = _normalize_wikilinks(refs, max_items=80)

    session_id = _gen_session_id()
    now = datetime.now().isoformat()

    conn = get_connection()
    _ensure_selector_columns(conn)
    cur = conn.cursor()
    linked_brain_session_id: Optional[int] = None
    if brain_session_id is not None:
        try:
            linked_brain_session_id = int(brain_session_id)
        except (TypeError, ValueError):
            conn.close()
            return jsonify({"error": "brain_session_id must be an integer"}), 400

        cur.execute("SELECT id FROM sessions WHERE id = ?", (linked_brain_session_id,))
        if not cur.fetchone():
            conn.close()
            return jsonify({"error": "brain_session_id not found"}), 404

    cur.execute(
        """INSERT INTO tutor_sessions
           (session_id, brain_session_id, course_id, phase, topic, content_filter_json,
            status, turn_count, method_chain_id, current_block_index, started_at,
            selector_chain_id, selector_score_json, selector_policy_version,
            selector_dependency_fix)
           VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, 0, ?, ?, ?, ?, ?)""",
        (
            session_id,
            linked_brain_session_id,
            course_id,
            phase,
            topic,
            json.dumps(content_filter) if content_filter else None,
            method_chain_id,
            now,
            selector_meta.get("selector_chain_id"),
            selector_meta.get("selector_score_json"),
            selector_meta.get("selector_policy_version"),
            selector_meta.get("selector_dependency_fix"),
        ),
    )

    first_block_name = None
    if method_chain_id:
        blocks = _resolve_chain_blocks(conn, method_chain_id)
        if blocks:
            first_block = blocks[0]
            first_block_name = first_block["name"]
            cur.execute(
                """INSERT INTO tutor_block_transitions
                   (tutor_session_id, block_id, block_index, started_at)
                   VALUES (?, ?, 0, ?)""",
                (session_id, first_block["id"], now),
            )

    conn.commit()
    conn.close()

    response: dict[str, Any] = {
        "session_id": session_id,
        "phase": phase,
        "mode": mode,
        "topic": topic,
        "status": "active",
        "brain_session_id": linked_brain_session_id,
        "codex_thread_id": None,
        "last_response_id": None,
        "method_chain_id": method_chain_id,
        "current_block_index": 0,
        "current_block_name": first_block_name,
        "started_at": now,
    }
    if selector_meta:
        response["selector"] = selector_meta
    if north_star_ctx:
        response["north_star"] = {
            "path": north_star_ctx.get("path"),
            "status": north_star_ctx.get("status"),
            "module_name": north_star_ctx.get("module_name"),
            "objective_ids": north_star_ctx.get("objective_ids") or [],
        }
        response["objective_scope"] = content_filter.get("objective_scope") or "module_all"
        response["focus_objective_id"] = content_filter.get("focus_objective_id")
        response["reference_targets_count"] = len(
            north_star_ctx.get("reference_targets") or []
        )

    return jsonify(response), 201


# ---------------------------------------------------------------------------
# GET /api/tutor/session/<id> — Get session + history
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>", methods=["GET"])
def get_session(session_id: str):
    conn = get_connection()
    _ensure_selector_columns(conn)
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    turns = _get_session_turns(conn, session_id)

    # Parse JSON fields
    for turn in turns:
        for field in ("citations_json", "artifacts_json"):
            if turn.get(field):
                try:
                    turn[field] = json.loads(turn[field])
                except (json.JSONDecodeError, TypeError):
                    pass

    session["turns"] = turns
    if not session.get("mode"):
        session["mode"] = "Core"
    if session.get("content_filter_json"):
        try:
            session["content_filter"] = json.loads(session["content_filter_json"])
        except (json.JSONDecodeError, TypeError):
            session["content_filter"] = None

    # Include chain block info if chain is active
    if session.get("method_chain_id"):
        blocks = _resolve_chain_blocks(conn, session["method_chain_id"])
        session["chain_blocks"] = blocks
        idx = session.get("current_block_index", 0) or 0
        if blocks and 0 <= idx < len(blocks):
            session["current_block_name"] = blocks[idx]["name"]

    conn.close()

    return jsonify(session)


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/turn — Send a message, SSE stream response
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/turn", methods=["POST"])
def send_turn(session_id: str):
    data = request.get_json(silent=True) or {}
    question = data.get("message", "").strip()
    behavior_override = data.get("behavior_override")
    if not question:
        return jsonify({"error": "message is required"}), 400

    conn = get_connection()
    _ensure_selector_columns(conn)
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    if session["status"] != "active":
        conn.close()
        return jsonify({"error": "Session is not active"}), 400

    # Load previous turns for chat history
    turns = _get_session_turns(conn, session_id, limit=20)

    # Build chain/block context if method chain is active
    block_info = None
    chain_info = None
    if session.get("method_chain_id"):
        current_idx = session.get("current_block_index", 0) or 0
        block_info, chain_info = _build_chain_info(
            conn, session["method_chain_id"], current_idx
        )

    conn.close()

    # Detect artifact commands
    from tutor_chains import detect_artifact_command

    artifact_cmd = detect_artifact_command(question)

    # Parse content filter for retriever
    content_filter = None
    if session.get("content_filter_json"):
        try:
            content_filter = json.loads(session["content_filter_json"])
        except (json.JSONDecodeError, TypeError):
            pass
    if not isinstance(content_filter, dict):
        content_filter = {}

    # Allow per-turn content_filter overrides from chat UI (e.g., material checkboxes).
    incoming_filter = data.get("content_filter")
    if isinstance(incoming_filter, dict):
        merged = dict(content_filter)
        merged.update(incoming_filter)
        content_filter = merged

    reference_targets = _normalize_wikilinks(
        content_filter.get("reference_targets"), max_items=80
    )
    follow_up_targets = _normalize_wikilinks(
        content_filter.get("follow_up_targets"), max_items=40
    )
    enforce_reference_bounds = bool(content_filter.get("enforce_reference_bounds"))
    objective_scope = _normalize_objective_scope(content_filter.get("objective_scope"))
    focus_objective_id = str(content_filter.get("focus_objective_id") or "").strip()
    module_prefix = str(content_filter.get("module_prefix") or "").strip().replace(
        "\\", "/"
    )
    north_star = content_filter.get("north_star")
    if not isinstance(north_star, dict):
        north_star = None

    if enforce_reference_bounds:
        if not reference_targets:
            return (
                jsonify(
                    {
                        "error": "No active reference targets. Build REFERENCE targets before retrieval.",
                        "code": "REFERENCE_TARGETS_MISSING",
                    }
                ),
                400,
            )
        if not _question_within_reference_targets(question, reference_targets):
            return (
                jsonify(
                    {
                        "error": "Concept outside current reference bounds.",
                        "code": "REFERENCE_BOUNDS_VIOLATION",
                        "reference_targets": reference_targets[:20],
                    }
                ),
                400,
            )

    content_filter["reference_targets"] = reference_targets
    content_filter["follow_up_targets"] = follow_up_targets
    content_filter["enforce_reference_bounds"] = enforce_reference_bounds
    content_filter["objective_scope"] = objective_scope
    if focus_objective_id:
        content_filter["focus_objective_id"] = _strip_wikilink(focus_objective_id)
    if module_prefix:
        content_filter["module_prefix"] = module_prefix

    accuracy_profile = normalize_accuracy_profile(content_filter.get("accuracy_profile"))
    content_filter["accuracy_profile"] = accuracy_profile

    # Extract material_ids from content filter (new dual-library approach)
    material_ids = None
    if "material_ids" in content_filter:
        material_ids = _normalize_material_ids(content_filter.get("material_ids"))
        content_filter["material_ids"] = material_ids or []
    material_k = _resolve_material_retrieval_k(material_ids, accuracy_profile)
    instruction_k = _resolve_instruction_retrieval_k(accuracy_profile)
    # Explicit material selection should override course scoping.
    retrieval_course_id = None if material_ids else session.get("course_id")
    selected_material_count, selected_material_labels = _material_scope_labels(material_ids)

    # Legacy support: folder_paths
    folder_paths = None
    if content_filter.get("folders"):
        folder_paths = content_filter["folders"]

    # Read model override from content_filter
    codex_model: Optional[str] = None
    if content_filter.get("model"):
        raw_model = str(content_filter["model"]).strip()
        if (
            raw_model
            and "/" not in raw_model
            and raw_model.lower() not in ("codex", "codex-cli", "chatgpt")
        ):
            codex_model = raw_model

    # Read web search preference
    enable_web_search = True

    turn_number = session["turn_count"] + 1

    def generate():
        full_response = ""
        citations = []
        parsed_verdict = None
        api_model = codex_model or "gpt-5.3-codex-spark"
        latest_response_id = None
        latest_thread_id = None
        used_scope_shortcut = False

        from tutor_streaming import (
            format_sse_chunk,
            format_sse_done,
            format_sse_error,
            extract_citations,
        )

        try:
            from llm_provider import stream_chatgpt_responses, call_codex_json
            from tutor_rag import (
                get_dual_context,
                keyword_search_dual,
                search_notes_prioritized,
            )
            from tutor_prompt_builder import build_prompt_with_contexts

            requested_accuracy_profile = accuracy_profile
            effective_accuracy_profile = requested_accuracy_profile
            effective_material_k = material_k
            effective_instruction_k = instruction_k
            rag_debug: dict[str, Any] = {}
            profile_escalated = False
            profile_escalation_reasons: list[str] = []

            def _run_dual_retrieval(
                profile_name: str,
                *,
                material_k_value: int,
                instruction_k_value: int,
            ) -> tuple[dict, dict[str, Any]]:
                retrieval_debug: dict[str, Any] = {}
                try:
                    result = get_dual_context(
                        question,
                        course_id=retrieval_course_id,
                        material_ids=material_ids,
                        k_materials=material_k_value,
                        k_instructions=instruction_k_value,
                        debug=retrieval_debug,
                    )
                except Exception:
                    result = keyword_search_dual(
                        question,
                        course_id=retrieval_course_id,
                        material_ids=material_ids,
                        k_materials=material_k_value,
                        k_instructions=instruction_k_value,
                        debug=retrieval_debug,
                    )
                return result, retrieval_debug

            dual, rag_debug = _run_dual_retrieval(
                effective_accuracy_profile,
                material_k_value=effective_material_k,
                instruction_k_value=effective_instruction_k,
            )

            material_docs_initial = dual.get("materials") or []
            initial_signals = _extract_material_retrieval_signals(
                material_docs=material_docs_initial,
                rag_debug=rag_debug,
            )

            should_escalate, escalation_reasons = _should_escalate_to_coverage(
                selected_material_count=selected_material_count,
                material_k=effective_material_k,
                signals=initial_signals,
            )

            if (
                selected_material_count > 0
                and effective_accuracy_profile != "coverage"
                and should_escalate
            ):
                effective_accuracy_profile = "coverage"
                effective_material_k = _resolve_material_retrieval_k(
                    material_ids, effective_accuracy_profile
                )
                effective_instruction_k = _resolve_instruction_retrieval_k(
                    effective_accuracy_profile
                )
                dual, rag_debug = _run_dual_retrieval(
                    effective_accuracy_profile,
                    material_k_value=effective_material_k,
                    instruction_k_value=effective_instruction_k,
                )
                profile_escalated = True
                profile_escalation_reasons = escalation_reasons

            material_text, instruction_text = _format_dual_context(dual)

            # Graceful mode when no materials
            if not material_text:
                material_text = (
                    "No course-specific materials were retrieved for this topic. "
                    "Teach from your medical/PT training knowledge. "
                    "Mark such content as [From training knowledge — verify with your textbooks] "
                    "so the student knows to cross-reference."
                )

            notes_context_text = ""
            try:
                if not os.environ.get("PYTEST_CURRENT_TEST"):
                    note_hits = search_notes_prioritized(
                        question,
                        module_prefix=module_prefix or None,
                        follow_up_targets=follow_up_targets,
                        k_module=4,
                        k_linked=3,
                        k_global=2,
                    )
                    notes_context_text = _format_notes_context(note_hits, max_items=8)
            except Exception:
                notes_context_text = ""

            if notes_context_text:
                material_text = (
                    f"{material_text}\n\n## Obsidian Notes Context\n"
                    "Use this prior-session context for continuity and objective alignment.\n\n"
                    f"{notes_context_text}"
                )

            # Open a dedicated connection for adaptive features inside the
            # generator — the outer `conn` was closed before generate() runs.
            adaptive_conn = get_connection()

            # Optional: GraphRAG-lite concept graph context
            graph_context_text = None
            try:
                from adaptive.knowledge_graph import hybrid_retrieve
                graph_result = hybrid_retrieve(question, adaptive_conn)
                if graph_result.get("context_text"):
                    graph_context_text = graph_result["context_text"]
            except (ImportError, Exception) as _kg_exc:
                _LOG.debug("GraphRAG skipped: %s", _kg_exc)

            # Materials go in system prompt (not user prompt)
            system_prompt = build_prompt_with_contexts(
                current_block=block_info,
                chain_info=chain_info,
                course_id=session.get("course_id"),
                topic=session.get("topic"),
                instruction_context=instruction_text,
                material_context=material_text,
                graph_context=graph_context_text,
            )
            system_prompt += (
                "\n\n## Retrieval Tuning\n"
                f"{_accuracy_profile_prompt_guidance(effective_accuracy_profile)}"
            )
            if north_star:
                objective_ids = north_star.get("objective_ids") or []
                objective_lines = "\n".join(
                    f"- {_wikilink(str(oid))}"
                    for oid in objective_ids
                    if str(oid or "").strip()
                )
                if not objective_lines:
                    objective_lines = "- [[OBJ-UNMAPPED]]"
                system_prompt += (
                    "\n\n## North Star Context\n"
                    f"- Module: {north_star.get('module_name') or 'General Module'}\n"
                    f"- File: {north_star.get('path') or '(missing)'}\n"
                    f"- Status: {north_star.get('status') or 'unknown'}\n"
                    "- Objectives in scope:\n"
                    f"{objective_lines}"
                )
            if enforce_reference_bounds and reference_targets:
                bounded_targets = "\n".join(f"- {t}" for t in reference_targets[:20])
                system_prompt += (
                    "\n\n## Active Reference Bounds\n"
                    "- Only answer inside these targets for this turn.\n"
                    "- If a question is outside bounds, ask to add it as a follow-up target first.\n"
                    "Targets:\n"
                    f"{bounded_targets}"
                )
            if block_info and str(block_info.get("control_stage") or "").upper() == "PRIME":
                system_prompt += (
                    "\n\n## PRIME Stage Guardrails (Hard)\n"
                    "- PRIME is orientation only.\n"
                    "- Do not run scored checks, retrieval grading, or confidence scoring.\n"
                    "- Use PRIME outputs to prepare downstream CALIBRATE/ENCODE work.\n"
                )
                block_name_l = str(block_info.get("name") or "").strip().lower()
                if block_name_l == "structural extraction":
                    system_prompt += (
                        "\n## M-PRE-008 Contract\n"
                        "- Build a compact structural spine of high-signal nodes.\n"
                        "- Link every node to at least one objective.\n"
                        "- Include UnknownNodeList and PriorityNodes.\n"
                        "- Exclude trivia and avoid deep content teaching in this method.\n"
                    )
            system_prompt += (
                "\n\n## PRIME Objective Scope\n"
                f"- Active scope: {objective_scope}\n"
            )
            if objective_scope == "module_all":
                system_prompt += (
                    "- Use module-level big-picture orientation first, then ask learner to choose one focus objective.\n"
                )
            else:
                focus_link = _wikilink(_strip_wikilink(focus_objective_id)) if focus_objective_id else ""
                system_prompt += (
                    "- Stay on one focus objective for this turn.\n"
                    f"- Focus objective: {focus_link or '[[OBJ-UNMAPPED]]'}\n"
                )
            if selected_material_count > 0:
                selected_list = "\n".join(
                    f"- {name}" for name in selected_material_labels
                )
                system_prompt += (
                    "\n\n## Selected Material Scope\n"
                    f"- Student selected materials for this turn: {selected_material_count}\n"
                    f"- Retrieval target depth this turn: {effective_material_k}\n"
                    f"- Instruction retrieval depth this turn: {effective_instruction_k}\n"
                    "- Retrieved excerpts can be fewer than selected files because retrieval is relevance-based.\n"
                    "- If the student asks 'how many files are you using/seeing/have', answer with the selected count above first.\n"
                    "- Only mention retrieved/cited file count if they explicitly ask for retrieved/cited count.\n"
                    "- Do not frame selected-scope questions as 'I am using N retrieved files'.\n"
                    "Selected files:\n"
                    f"{selected_list}"
                )
            if profile_escalated:
                system_prompt += (
                    "\n\n## Retrieval Escalation\n"
                    f"- Requested profile: {requested_accuracy_profile}\n"
                    f"- Escalated profile: {effective_accuracy_profile}\n"
                    f"- Escalation reason(s): {', '.join(profile_escalation_reasons) or 'weak_retrieval_signals'}\n"
                )

            effective_model = codex_model or "gpt-5.3-codex-spark"
            system_prompt += (
                "\n\n## Tooling\n"
                "Do not run shell commands or attempt to read local files.\n"
                "You have access to the following tools. Use them ONLY when the student "
                "explicitly asks or when it clearly benefits the learning session:\n"
                "- **save_to_obsidian**: Save study notes to the student's Obsidian vault. "
                "Use when they say 'save this', 'add to Obsidian', 'export notes', etc.\n"
                "- **create_note**: Create a quick note on the dashboard Notes page. "
                "Use for action items, reminders, or brief observations.\n"
                "- **create_anki_card**: Draft an Anki flashcard. "
                "Use when a key fact or definition should be memorized, "
                "or when the student says 'make a card for this'.\n"
                "- **create_figma_diagram**: Create a visual diagram (flowchart, "
                "concept map, hierarchy) in Figma. Use when the student asks to "
                "visualize a process, relationships, or structure. Provide nodes "
                "with id/label and edges with from/to. May not be available if "
                "Figma Desktop is not running.\n"
                "Do NOT use tools for casual questions or general conversation. "
                "When you use a tool, briefly confirm what you did.\n\n"
                f"## Identity\n"
                f"You are powered by OpenAI model **{effective_model}**. "
                f"If asked what model you are, state this exactly."
            )

            # Append structured output contracts for behavior overrides
            if behavior_override == "evaluate":
                system_prompt += VERDICT_PROMPT_SUFFIX
            elif behavior_override == "concept_map":
                system_prompt += CONCEPT_MAP_PROMPT_SUFFIX
            elif behavior_override == "teach_back":
                system_prompt += TEACH_BACK_PROMPT_SUFFIX

            # M8: Adaptive scaffolding based on mastery level
            try:
                from adaptive.bkt import get_effective_mastery as _get_eff_mastery
                from adaptive.schemas import MasteryConfig as _MC
                from tutor_scaffolding import get_scaffolding_directive

                topic_skill = session.get("topic")
                if topic_skill:
                    eff = _get_eff_mastery(adaptive_conn, "default", topic_skill, _MC())
                    scaffold_directive = get_scaffolding_directive(eff)
                    system_prompt += f"\n\n{scaffold_directive}"
            except (ImportError, Exception) as _sc_exc:
                _LOG.debug("Scaffolding skipped: %s", _sc_exc)

            # Build user prompt: chat history + question
            recent_turns = turns[-12:] if len(turns) > 12 else turns
            history_lines: list[str] = []
            for t in recent_turns:
                if t.get("question"):
                    history_lines.append(f"User: {t['question']}")
                if t.get("answer"):
                    ans = t["answer"]
                    if len(ans) > 800:
                        ans = ans[:800] + "..."
                    history_lines.append(f"Assistant: {ans}")
            history_text = "\n".join(history_lines).strip() or "(no prior turns)"

            directive = get_directive(behavior_override)
            user_prompt = f"""{directive + chr(10) if directive else ""}## Chat History
{history_text}

## Current Question
{question}"""

            api_model = codex_model or "gpt-5.3-codex-spark"
            prev_response_id: str | None = session.get("last_response_id")
            latest_response_id: str | None = prev_response_id
            latest_thread_id: str | None = session.get("codex_thread_id")
            url_citations: list[object] = []
            used_scope_shortcut = False
            parsed_verdict = None
            parsed_concept_map = None
            parsed_teach_back = None

            material_docs = dual.get("materials") or []
            instruction_docs = dual.get("instructions") or []
            final_signals = _extract_material_retrieval_signals(
                material_docs=material_docs,
                rag_debug=rag_debug,
            )
            retrieved_material_sources = _material_sources_from_docs(
                material_docs,
                max_items=20,
            )
            still_weak, weak_reasons = _should_escalate_to_coverage(
                selected_material_count=selected_material_count,
                material_k=effective_material_k,
                signals=final_signals,
            )

            force_insufficient_evidence = (
                selected_material_count > 0
                and effective_accuracy_profile == "coverage"
                and still_weak
                and not _is_material_count_question(question)
                and not _is_selected_scope_listing_question(question)
            )

            def _attach_profile_debug(payload: dict[str, Any]) -> dict[str, Any]:
                payload["requested_accuracy_profile"] = requested_accuracy_profile
                payload["effective_accuracy_profile"] = effective_accuracy_profile
                payload["profile_escalated"] = profile_escalated
                payload["profile_escalation_reasons"] = profile_escalation_reasons
                payload["insufficient_evidence_guard"] = force_insufficient_evidence
                payload["insufficient_evidence_reasons"] = weak_reasons if force_insufficient_evidence else []
                return payload

            if selected_material_count > 0 and _is_material_count_question(question):
                used_scope_shortcut = True
                full_response = _build_material_count_response(
                    selected_count=selected_material_count,
                    selected_labels=selected_material_labels,
                    retrieved_sources=retrieved_material_sources,
                )
                citations = [
                    {"source": src, "index": idx + 1}
                    for idx, src in enumerate(retrieved_material_sources[:12])
                ]
                artifact_payload = [artifact_cmd] if artifact_cmd else None
                retrieval_debug_payload = _attach_profile_debug(_build_retrieval_debug_payload(
                    accuracy_profile=effective_accuracy_profile,
                    material_ids=material_ids,
                    selected_material_count=selected_material_count,
                    material_k=effective_material_k,
                    retrieval_course_id=retrieval_course_id,
                    material_docs=material_docs,
                    instruction_docs=instruction_docs,
                    citations=citations,
                    rag_debug=rag_debug,
                ))
                _LOG.info(
                    "Tutor retrieval debug session=%s turn=%s payload=%s",
                    session_id,
                    turn_number,
                    json.dumps(retrieval_debug_payload, ensure_ascii=True),
                )
                yield format_sse_chunk(full_response)
                yield format_sse_done(
                    citations=citations,
                    model=api_model,
                    artifacts=artifact_payload,
                    retrieval_debug=retrieval_debug_payload,
                )
            elif selected_material_count > 0 and _is_selected_scope_listing_question(question):
                used_scope_shortcut = True
                full_response = _build_selected_scope_listing_response(
                    selected_count=selected_material_count,
                    selected_labels=selected_material_labels,
                    retrieved_sources=retrieved_material_sources,
                )
                citation_sources = retrieved_material_sources or selected_material_labels
                citations = [
                    {"source": src, "index": idx + 1}
                    for idx, src in enumerate(citation_sources[:12])
                ]
                artifact_payload = [artifact_cmd] if artifact_cmd else None
                retrieval_debug_payload = _attach_profile_debug(_build_retrieval_debug_payload(
                    accuracy_profile=effective_accuracy_profile,
                    material_ids=material_ids,
                    selected_material_count=selected_material_count,
                    material_k=effective_material_k,
                    retrieval_course_id=retrieval_course_id,
                    material_docs=material_docs,
                    instruction_docs=instruction_docs,
                    citations=citations,
                    rag_debug=rag_debug,
                ))
                _LOG.info(
                    "Tutor retrieval debug session=%s turn=%s payload=%s",
                    session_id,
                    turn_number,
                    json.dumps(retrieval_debug_payload, ensure_ascii=True),
                )
                yield format_sse_chunk(full_response)
                yield format_sse_done(
                    citations=citations,
                    model=api_model,
                    artifacts=artifact_payload,
                    retrieval_debug=retrieval_debug_payload,
                )
            elif force_insufficient_evidence:
                used_scope_shortcut = True
                full_response = _build_insufficient_evidence_response(
                    selected_count=selected_material_count,
                    selected_labels=selected_material_labels,
                    retrieved_sources=retrieved_material_sources,
                    profile_used=effective_accuracy_profile,
                )
                citation_sources = retrieved_material_sources or selected_material_labels
                citations = [
                    {"source": src, "index": idx + 1}
                    for idx, src in enumerate(citation_sources[:12])
                ]
                artifact_payload = [artifact_cmd] if artifact_cmd else None
                retrieval_debug_payload = _attach_profile_debug(_build_retrieval_debug_payload(
                    accuracy_profile=effective_accuracy_profile,
                    material_ids=material_ids,
                    selected_material_count=selected_material_count,
                    material_k=effective_material_k,
                    retrieval_course_id=retrieval_course_id,
                    material_docs=material_docs,
                    instruction_docs=instruction_docs,
                    citations=citations,
                    rag_debug=rag_debug,
                ))
                _LOG.info(
                    "Tutor retrieval debug session=%s turn=%s payload=%s",
                    session_id,
                    turn_number,
                    json.dumps(retrieval_debug_payload, ensure_ascii=True),
                )
                yield format_sse_chunk(full_response)
                yield format_sse_done(
                    citations=citations,
                    model=api_model,
                    artifacts=artifact_payload,
                    retrieval_debug=retrieval_debug_payload,
                )
            else:
                from tutor_tools import get_tool_schemas, execute_tool
                import json as _json

                tool_schemas = get_tool_schemas()
                max_tool_rounds = 5
                tool_round = 0
                pending_tool_results: list[dict] = []

                try:
                    stream_kwargs: dict = {
                        "model": codex_model or "gpt-5.3-codex-spark",
                        "timeout": 120,
                        "web_search": True,
                        "tools": tool_schemas,
                        "reasoning_effort": "high",
                    }
                    if prev_response_id:
                        stream_kwargs["previous_response_id"] = prev_response_id

                    while True:
                        tool_calls_this_round: list[dict] = []

                        if pending_tool_results and prev_response_id:
                            stream_kwargs["previous_response_id"] = prev_response_id
                            stream_kwargs["input_override"] = pending_tool_results
                            pending_tool_results = []
                        else:
                            stream_kwargs.pop("input_override", None)
                            if prev_response_id:
                                stream_kwargs["previous_response_id"] = prev_response_id
                            else:
                                stream_kwargs.pop("previous_response_id", None)

                        for chunk in stream_chatgpt_responses(
                            system_prompt,
                            user_prompt,
                            **stream_kwargs,
                        ):
                            if chunk.get("type") == "delta":
                                full_response += chunk.get("text", "")
                                yield format_sse_chunk(chunk.get("text", ""))
                            elif chunk.get("type") == "web_search":
                                yield format_sse_chunk(
                                    "", chunk_type=f"web_search_{chunk['status']}"
                                )
                            elif chunk.get("type") == "tool_call":
                                tool_calls_this_round.append(chunk)
                            elif chunk.get("type") == "error":
                                raise RuntimeError(
                                    chunk.get("error", "ChatGPT API failed")
                                )
                            elif chunk.get("type") == "done":
                                api_model = chunk.get("model") or api_model
                                prev_response_id = (
                                    chunk.get("response_id") or prev_response_id
                                )
                                latest_response_id = prev_response_id
                                latest_thread_id = (
                                    chunk.get("thread_id")
                                    or chunk.get("conversation_id")
                                    or latest_thread_id
                                )
                                url_citations_raw = chunk.get("url_citations", [])
                                if isinstance(url_citations_raw, list):
                                    url_citations = url_citations_raw

                        if not tool_calls_this_round:
                            break

                        tool_round += 1
                        if tool_round > max_tool_rounds:
                            yield format_sse_chunk("", chunk_type="tool_limit_reached")
                            break

                        for tc in tool_calls_this_round:
                            tool_name = tc.get("name", "")
                            call_id = tc.get("call_id", "")
                            try:
                                args = _json.loads(tc.get("arguments", "{}"))
                            except _json.JSONDecodeError:
                                args = {}

                            yield format_sse_chunk(
                                _json.dumps({"tool": tool_name, "arguments": args}),
                                chunk_type="tool_call",
                            )

                            tool_result = execute_tool(
                                tool_name, args, session_id=session_id
                            )

                            yield format_sse_chunk(
                                _json.dumps(
                                    {
                                        "tool": tool_name,
                                        "success": tool_result.get("success", False),
                                        "message": tool_result.get("message", ""),
                                    }
                                ),
                                chunk_type="tool_result",
                            )

                            pending_tool_results.append(
                                {
                                    "type": "function_call_output",
                                    "call_id": call_id,
                                    "output": _json.dumps(tool_result),
                                }
                            )

                except Exception as stream_err:
                    if not full_response:
                        result = call_codex_json(
                            system_prompt,
                            user_prompt,
                            model=codex_model,
                            timeout=120,
                            isolated=True,
                        )
                        if not result.get("success"):
                            raise RuntimeError(result.get("error") or "Codex failed")
                        full_response = (result.get("content") or "").strip()
                        max_chars = 220
                        for i in range(0, len(full_response), max_chars):
                            yield format_sse_chunk(full_response[i : i + max_chars])
                    else:
                        raise stream_err

                citations = extract_citations(full_response)
                all_citations = citations
                if url_citations:
                    for uc in url_citations:
                        if isinstance(uc, dict):
                            source = uc.get("title") or uc.get("url", "")
                            url = uc.get("url", "")
                        else:
                            source = str(uc)
                            url = ""
                        all_citations.append(
                            {
                                "source": source,
                                "url": url,
                                "index": len(all_citations) + 1,
                            }
                        )
                artifact_payload = [artifact_cmd] if artifact_cmd else None
                retrieval_debug_payload = _attach_profile_debug(_build_retrieval_debug_payload(
                    accuracy_profile=effective_accuracy_profile,
                    material_ids=material_ids,
                    selected_material_count=selected_material_count,
                    material_k=effective_material_k,
                    retrieval_course_id=retrieval_course_id,
                    material_docs=material_docs,
                    instruction_docs=instruction_docs,
                    citations=all_citations,
                    rag_debug=rag_debug,
                ))
                _LOG.info(
                    "Tutor retrieval debug session=%s turn=%s payload=%s",
                    session_id,
                    turn_number,
                    json.dumps(retrieval_debug_payload, ensure_ascii=True),
                )
                # Parse verdict from evaluate mode responses
                parsed_verdict = None
                mastery_update_payload = None
                if behavior_override == "evaluate" and full_response:
                    parsed_verdict = parse_verdict(full_response)
                    if parsed_verdict:
                        is_valid, v_issues = validate_verdict(parsed_verdict)
                        if not is_valid:
                            _LOG.warning("Verdict validation issues: %s", v_issues)
                            parsed_verdict["_validation_issues"] = v_issues

                        # M5: Wire verdict to BKT mastery tracking
                        try:
                            from adaptive.bkt import bkt_update
                            from adaptive.schemas import MasteryConfig
                            from adaptive.telemetry import emit_evaluate_work, record_error_flag

                            verdict_val = parsed_verdict.get("verdict")
                            error_loc = parsed_verdict.get("error_location") or {}
                            skill_id = error_loc.get("node") or session.get("topic")

                            if skill_id and verdict_val in ("pass", "fail", "partial"):
                                correct = verdict_val == "pass"
                                new_p = bkt_update(adaptive_conn, "default", skill_id, correct, MasteryConfig())
                                emit_evaluate_work(adaptive_conn, "default", skill_id, correct, session_id)
                                mastery_update_payload = {
                                    "skill_id": skill_id,
                                    "new_mastery": round(new_p, 4),
                                    "correct": correct,
                                }

                                # M6: Record error flag on failure
                                if verdict_val == "fail":
                                    record_error_flag(
                                        adaptive_conn, "default", skill_id,
                                        error_type=parsed_verdict.get("error_type", "unknown"),
                                        severity="medium",
                                        edge_id=error_loc.get("prereq_from"),
                                        evidence_ref=parsed_verdict.get("why_wrong"),
                                    )
                        except (ImportError, Exception) as _bkt_exc:
                            _LOG.debug("BKT update skipped: %s", _bkt_exc)

                # Parse concept map from concept_map mode responses
                parsed_concept_map = None
                if behavior_override == "concept_map" and full_response:
                    parsed_concept_map = parse_concept_map(full_response)

                # Parse teach-back rubric and enforce mastery gate
                parsed_teach_back = None
                if behavior_override == "teach_back" and full_response:
                    parsed_teach_back = parse_teach_back_rubric(full_response)
                    if parsed_teach_back:
                        is_valid, tb_issues = validate_teach_back_rubric(parsed_teach_back)
                        if not is_valid:
                            _LOG.warning("Teach-back rubric issues: %s", tb_issues)
                            parsed_teach_back["_validation_issues"] = tb_issues

                        # Block mastery if rubric is weak
                        try:
                            from adaptive.bkt import get_effective_mastery as _get_eff
                            from adaptive.bkt import bkt_update as _bkt_tb
                            from adaptive.schemas import MasteryConfig as _MC2
                            from adaptive.telemetry import emit_teach_back as _emit_tb

                            tb_skill = session.get("topic")
                            if tb_skill and rubric_blocks_mastery(parsed_teach_back):
                                eff = _get_eff(adaptive_conn, "default", tb_skill, _MC2())
                                if eff >= _MC2().unlock_threshold:
                                    parsed_teach_back["_mastery_blocked"] = True
                                    _LOG.info(
                                        "Teach-back gate blocking mastery for %s (eff=%.3f)",
                                        tb_skill, eff,
                                    )

                            # Record BKT event for teach-back outcome
                            tb_rating = parsed_teach_back.get("overall_rating")
                            if tb_skill and tb_rating in ("pass", "fail", "partial"):
                                tb_correct = tb_rating == "pass"
                                new_p = _bkt_tb(adaptive_conn, "default", tb_skill, tb_correct, _MC2())
                                _emit_tb(adaptive_conn, "default", tb_skill, tb_correct, session_id)
                                mastery_update_payload = {
                                    "skill_id": tb_skill,
                                    "new_mastery": round(new_p, 4),
                                    "correct": tb_correct,
                                }
                        except (ImportError, Exception) as _tb_exc:
                            _LOG.debug("Teach-back mastery gate skipped: %s", _tb_exc)

                yield format_sse_done(
                    citations=all_citations,
                    model=api_model,
                    artifacts=artifact_payload,
                    retrieval_debug=retrieval_debug_payload,
                    behavior_override=behavior_override,
                    verdict=parsed_verdict,
                    concept_map=parsed_concept_map,
                    teach_back_rubric=parsed_teach_back,
                    mastery_update=mastery_update_payload,
                )

        except Exception as e:
            yield format_sse_error(str(e))
            full_response = f"[Error: {e}]"
            citations = []
            parsed_verdict = None
        finally:
            try:
                adaptive_conn.close()
            except Exception:
                pass

        # After streaming completes, log the turn
        try:
            db_conn = get_connection()
            cur = db_conn.cursor()
            now = datetime.now().isoformat()

            cur.execute(
                """INSERT INTO tutor_turns
                   (session_id, tutor_session_id, course_id, turn_number,
                    question, answer, citations_json, response_id, model_id,
                    phase, artifacts_json, behavior_override, evaluation_json,
                    created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    session_id,
                    session_id,
                    session.get("course_id"),
                    turn_number,
                    question,
                    full_response,
                    json.dumps(citations) if citations else None,
                    None if used_scope_shortcut else latest_response_id,
                    api_model,
                    session.get("phase"),
                    json.dumps({"command": artifact_cmd}) if artifact_cmd else None,
                    behavior_override,
                    json.dumps(parsed_verdict) if parsed_verdict else None,
                    now,
                ),
            )

            cur.execute(
                """UPDATE tutor_sessions
                   SET turn_count = ?, last_response_id = ?, codex_thread_id = COALESCE(?, codex_thread_id), content_filter_json = ?
                   WHERE session_id = ?""",
                (
                    turn_number,
                    latest_response_id,
                    latest_thread_id,
                    json.dumps(content_filter) if content_filter is not None else None,
                    session_id,
                ),
            )

            if session.get("method_chain_id"):
                cur.execute(
                    """UPDATE tutor_block_transitions
                       SET turn_count = turn_count + 1
                       WHERE tutor_session_id = ? AND ended_at IS NULL""",
                    (session_id,),
                )

            db_conn.commit()
            db_conn.close()
        except Exception:
            pass

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/advance-block — Advance to next block in chain
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/advance-block", methods=["POST"])
def advance_block(session_id: str):
    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    chain_id = session.get("method_chain_id")
    if not chain_id:
        conn.close()
        return jsonify({"error": "Session has no method chain"}), 400

    blocks = _resolve_chain_blocks(conn, chain_id)
    current_idx = session.get("current_block_index", 0) or 0

    if current_idx >= len(blocks) - 1:
        conn.close()
        return jsonify(
            {
                "block_index": current_idx,
                "block_name": blocks[current_idx]["name"] if blocks else "",
                "block_description": blocks[current_idx].get("description", "")
                if blocks
                else "",
                "is_last": True,
                "complete": True,
            }
        )

    now = datetime.now().isoformat()
    cur = conn.cursor()

    cur.execute(
        """UPDATE tutor_block_transitions
           SET ended_at = ?
           WHERE tutor_session_id = ? AND ended_at IS NULL""",
        (now, session_id),
    )

    next_idx = current_idx + 1
    next_block = blocks[next_idx]

    cur.execute(
        "UPDATE tutor_sessions SET current_block_index = ? WHERE session_id = ?",
        (next_idx, session_id),
    )

    cur.execute(
        """INSERT INTO tutor_block_transitions
           (tutor_session_id, block_id, block_index, started_at)
           VALUES (?, ?, ?, ?)""",
        (session_id, next_block["id"], next_idx, now),
    )

    conn.commit()
    conn.close()

    return jsonify(
        {
            "block_index": next_idx,
            "block_name": next_block["name"],
            "block_description": next_block.get("description", ""),
            "block_category": next_block.get("control_stage", ""),
            "block_duration": next_block.get("duration")
            or next_block.get("default_duration_min", 5),
            "facilitation_prompt": next_block.get("facilitation_prompt", ""),
            "is_last": next_idx >= len(blocks) - 1,
        }
    )


# ---------------------------------------------------------------------------
# GET /api/tutor/chains/templates — Template chains with resolved blocks
# ---------------------------------------------------------------------------


@tutor_bp.route("/chains/templates", methods=["GET"])
def get_template_chains():
    ensure_method_library_seeded()
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    query = """
        SELECT id, name, description, block_ids, context_tags
        FROM method_chains
        WHERE COALESCE(is_template, 0) = 1
        ORDER BY name
    """
    cur.execute(query)
    chains = [dict(r) for r in cur.fetchall()]

    # If template flags were previously inconsistent, run a second seed pass and re-read.
    if not chains:
        ensure_method_library_seeded()
        cur.execute(query)
        chains = [dict(r) for r in cur.fetchall()]

    result = []
    for chain in chains:
        blocks = _resolve_chain_blocks(conn, chain["id"])
        context_tags = ""
        if chain.get("context_tags"):
            try:
                tags_obj = json.loads(chain["context_tags"])
                if isinstance(tags_obj, dict):
                    context_tags = ", ".join(f"{k}:{v}" for k, v in tags_obj.items())
                elif isinstance(tags_obj, str):
                    context_tags = tags_obj
            except (json.JSONDecodeError, TypeError):
                context_tags = chain["context_tags"] or ""

        result.append(
            {
                "id": chain["id"],
                "name": chain["name"],
                "description": chain.get("description", ""),
                "blocks": [
                    {
                        "id": b["id"],
                        "name": b["name"],
                        "category": b.get("control_stage", ""),
                        "description": b.get("description", ""),
                        "duration": b.get("duration")
                        or b.get("default_duration_min", 5),
                        "facilitation_prompt": b.get("facilitation_prompt", ""),
                    }
                    for b in blocks
                ],
                "context_tags": context_tags,
            }
        )

    conn.close()
    return jsonify(result)


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/end — End session
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/end", methods=["POST"])
def end_session(session_id: str):
    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    now = datetime.now()
    cur = conn.cursor()

    cur.execute(
        """UPDATE tutor_block_transitions
           SET ended_at = ?
           WHERE tutor_session_id = ? AND ended_at IS NULL""",
        (now.isoformat(), session_id),
    )

    _ensure_selector_columns(conn)
    brain_session_id = session.get("brain_session_id")
    if not brain_session_id:
        try:
            topic_str = session.get("topic") or "Session"
            title = f"Tutor-{topic_str}"
            cur.execute(
                """INSERT INTO sessions
                   (session_date, session_time, main_topic, study_mode,
                    created_at, time_spent_minutes, duration_minutes,
                    selector_chain_id, selector_policy_version)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    now.strftime("%Y-%m-%d"),
                    now.strftime("%H:%M:%S"),
                    title,
                    title, # study_mode
                    now.isoformat(),
                    session.get("turn_count", 0) * 2,
                    session.get("turn_count", 0) * 2,
                    session.get("selector_chain_id"),
                    session.get("selector_policy_version"),
                ),
            )
            brain_session_id = cur.lastrowid
        except Exception:
            pass

    cur.execute(
        """UPDATE tutor_sessions
           SET status = 'completed', ended_at = ?, brain_session_id = ?
           WHERE session_id = ?""",
        (now.isoformat(), brain_session_id, session_id),
    )

    if brain_session_id:
        cur.execute(
            "UPDATE card_drafts SET session_id = ? WHERE tutor_session_id = ?",
            (str(brain_session_id), session_id),
        )

    conn.commit()
    conn.close()

    return jsonify(
        {
            "session_id": session_id,
            "status": "completed",
            "brain_session_id": brain_session_id,
            "ended_at": now.isoformat(),
        }
    )


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/link-archive — Link tutor session to Brain archive row
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/link-archive", methods=["POST"])
def link_archive(session_id: str):
    data = request.get_json(silent=True) or {}
    raw_brain_session_id = data.get("brain_session_id")
    if raw_brain_session_id is None:
        return jsonify({"error": "brain_session_id is required"}), 400

    try:
        brain_session_id = int(raw_brain_session_id)
    except (TypeError, ValueError):
        return jsonify({"error": "brain_session_id must be an integer"}), 400

    conn = get_connection()
    _ensure_selector_columns(conn)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    cur.execute(
        """SELECT id, session_date, session_time, study_mode, main_topic, topic, created_at
           FROM sessions WHERE id = ?""",
        (brain_session_id,),
    )
    archive_row = cur.fetchone()
    if not archive_row:
        conn.close()
        return jsonify({"error": "brain_session_id not found"}), 404

    cur.execute(
        "UPDATE tutor_sessions SET brain_session_id = ? WHERE session_id = ?",
        (brain_session_id, session_id),
    )
    cur.execute(
        """UPDATE card_drafts
           SET session_id = ?
           WHERE tutor_session_id = ? AND (session_id IS NULL OR session_id = '')""",
        (str(brain_session_id), session_id),
    )
    conn.commit()
    conn.close()

    return jsonify(
        {
            "session_id": session_id,
            "brain_session_id": brain_session_id,
            "archive": dict(archive_row),
            "linked": True,
        }
    )


# ---------------------------------------------------------------------------
# GET /api/tutor/archive/<brain_session_id>/linked-chat — reverse lookup from archive
# ---------------------------------------------------------------------------


@tutor_bp.route("/archive/<int:brain_session_id>/linked-chat", methods=["GET"])
def get_linked_chat(brain_session_id: int):
    include_turns = request.args.get("include_turns", "1").strip() not in ("0", "false")

    conn = get_connection()
    _ensure_selector_columns(conn)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """SELECT id, session_date, session_time, study_mode, main_topic, topic, created_at
           FROM sessions WHERE id = ?""",
        (brain_session_id,),
    )
    archive_row = cur.fetchone()
    if not archive_row:
        conn.close()
        return jsonify({"error": "Archive session not found"}), 404

    cur.execute(
        """SELECT id, session_id, course_id, phase, topic, status, turn_count,
           method_chain_id, current_block_index,
           started_at, ended_at, brain_session_id, codex_thread_id, last_response_id
           FROM tutor_sessions
           WHERE brain_session_id = ?
           ORDER BY started_at DESC
           LIMIT 1""",
        (brain_session_id,),
    )
    row = cur.fetchone()
    if not row:
        cur.execute(
            """SELECT id, session_id, course_id, phase, topic, status, turn_count,
                      started_at, ended_at, brain_session_id, codex_thread_id, last_response_id
               FROM tutor_sessions
               WHERE session_id = ?""",
            (brain_session_id,),
        )
        linked_sessions = [dict(r) for r in cur.fetchall()]
    else:
        linked_sessions = [dict(row)]

    if include_turns:
        for sess in linked_sessions:
            turns = _get_session_turns(conn, sess["session_id"], limit=200)
            for turn in turns:
                for field in ("citations_json", "artifacts_json"):
                    if turn.get(field):
                        try:
                            turn[field] = json.loads(turn[field])
                        except (json.JSONDecodeError, TypeError):
                            pass
            sess["turns"] = turns

    conn.close()

    return jsonify(
        {
            "brain_session_id": brain_session_id,
            "archive": dict(archive_row),
            "linked_sessions": linked_sessions,
            "count": len(linked_sessions),
        }
    )


# ---------------------------------------------------------------------------
# DELETE /api/tutor/session/<id> — Delete a tutor session and its turns
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>", methods=["DELETE"])
def delete_session(session_id: str):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM tutor_sessions WHERE session_id = ?", (session_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    cur.execute("DELETE FROM tutor_turns WHERE tutor_session_id = ?", (session_id,))
    cur.execute(
        "DELETE FROM tutor_block_transitions WHERE tutor_session_id = ?", (session_id,)
    )
    cur.execute("DELETE FROM tutor_sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()

    return jsonify({"deleted": True, "session_id": session_id})


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/artifact — Create artifact mid-session
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/artifact", methods=["POST"])
def create_artifact(session_id: str):
    data = request.get_json(silent=True) or {}
    artifact_type = data.get("type")
    content = data.get("content", "")
    title = data.get("title", "")

    if artifact_type not in ("note", "card", "map"):
        return jsonify({"error": "type must be 'note', 'card', or 'map'"}), 400

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    result: dict[str, object] = {"type": artifact_type, "session_id": session_id}

    if artifact_type == "card":
        front = data.get("front", title)
        back = data.get("back", content)
        tags = data.get("tags", "tutor")

        cur = conn.cursor()
        cur.execute(
            """INSERT INTO card_drafts
               (session_id, tutor_session_id, course_id, front, back, tags, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)""",
            (
                session_id,
                session_id,
                session.get("course_id"),
                front,
                back,
                tags,
                datetime.now().isoformat(),
            ),
        )
        result["card_id"] = cur.lastrowid
        conn.commit()

    elif artifact_type == "note":
        result["content"] = content
        result["title"] = title
        result["status"] = "created"
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT MAX(position) FROM quick_notes WHERE note_type = 'tutor'"
            )
            max_pos = cur.fetchone()[0] or 0
            now_str = datetime.now().isoformat()
            cur.execute(
                """INSERT INTO quick_notes (title, content, note_type, position, created_at, updated_at)
                   VALUES (?, ?, 'tutor', ?, ?, ?)""",
                (title, content, max_pos + 1, now_str, now_str),
            )
            conn.commit()
        except Exception:
            pass

    elif artifact_type == "map":
        result["mermaid"] = content
        result["status"] = "created"

    cur = conn.cursor()
    existing_artifacts = session.get("artifacts_json")
    artifacts = []
    if existing_artifacts:
        try:
            artifacts = json.loads(existing_artifacts)
        except (json.JSONDecodeError, TypeError):
            pass

    artifact_entry = {
        "type": artifact_type,
        "title": title,
        "created_at": datetime.now().isoformat(),
    }
    if artifact_type in ("note", "map"):
        artifact_entry["content"] = content
    artifacts.append(artifact_entry)

    cur.execute(
        "UPDATE tutor_sessions SET artifacts_json = ? WHERE session_id = ?",
        (json.dumps(artifacts), session_id),
    )
    conn.commit()
    conn.close()

    return jsonify(result), 201


# ---------------------------------------------------------------------------
# DELETE /api/tutor/session/<id>/artifacts — Delete artifact entries by index
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/artifacts", methods=["DELETE"])
def delete_artifacts(session_id: str):
    data = request.get_json(silent=True) or {}
    indexes = data.get("indexes")
    if not isinstance(indexes, list) or not all(isinstance(i, int) for i in indexes):
        return jsonify({"error": "indexes must be a list of integers"}), 400

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    existing = session.get("artifacts_json")
    artifacts = []
    if existing:
        try:
            artifacts = json.loads(existing)
        except (json.JSONDecodeError, TypeError):
            pass
    if not isinstance(artifacts, list):
        artifacts = []

    # Remove by index (descending so indices stay valid)
    for i in sorted(set(indexes), reverse=True):
        if 0 <= i < len(artifacts):
            artifacts.pop(i)

    cur = conn.cursor()
    cur.execute(
        "UPDATE tutor_sessions SET artifacts_json = ? WHERE session_id = ?",
        (json.dumps(artifacts), session_id),
    )
    conn.commit()
    conn.close()

    return jsonify({"deleted": len(indexes), "session_id": session_id})


# ---------------------------------------------------------------------------
# GET /api/tutor/sessions — List sessions
# ---------------------------------------------------------------------------


@tutor_bp.route("/sessions", methods=["GET"])
def list_sessions():
    course_id = request.args.get("course_id", type=int)
    status = request.args.get("status")
    limit = request.args.get("limit", 20, type=int)

    conn = get_connection()
    _ensure_selector_columns(conn)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    conditions = []
    params: list = []

    if course_id is not None:
        conditions.append("course_id = ?")
        params.append(course_id)
    if status:
        conditions.append("status = ?")
        params.append(status)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    cur.execute(
        f"""SELECT id, session_id, course_id, phase, topic, status,
                   "Core" AS mode, turn_count, method_chain_id, current_block_index,
                   started_at, ended_at, brain_session_id,
                   codex_thread_id, last_response_id
            FROM tutor_sessions
            {where}
            ORDER BY started_at DESC
            LIMIT ?""",
        params + [limit],
    )

    sessions = [dict(r) for r in cur.fetchall()]
    conn.close()

    return jsonify(sessions)


# ---------------------------------------------------------------------------
# GET /api/tutor/content-sources — Available courses + materials summary
# ---------------------------------------------------------------------------


@tutor_bp.route("/content-sources", methods=["GET"])
def content_sources():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Academic courses only
    cur.execute(
        """SELECT
               c.id,
               c.name,
               c.code,
               COUNT(DISTINCT r.id) AS doc_count,
               CASE WHEN w.id IS NULL THEN 0 ELSE 1 END AS wheel_linked,
               COALESCE(w.active, 0) AS wheel_active,
               w.position AS wheel_position
           FROM courses c
           LEFT JOIN wheel_courses w ON w.course_id = c.id
           LEFT JOIN rag_docs r ON r.course_id = c.id
               AND COALESCE(r.enabled, 1) = 1
               AND COALESCE(r.corpus, 'materials') = 'materials'
           WHERE c.term IS NOT NULL
              OR c.id IN (SELECT DISTINCT course_id FROM rag_docs WHERE course_id IS NOT NULL)
              OR c.id IN (SELECT DISTINCT course_id FROM wheel_courses WHERE course_id IS NOT NULL)
           GROUP BY c.id, w.id
           ORDER BY c.name"""
    )
    courses = []
    for r in cur.fetchall():
        item = dict(r)
        item["wheel_linked"] = bool(item.get("wheel_linked"))
        item["wheel_active"] = bool(item.get("wheel_active"))
        courses.append(item)

    # Total materials (not instructions)
    cur.execute(
        """SELECT COUNT(*) FROM rag_docs
           WHERE COALESCE(enabled, 1) = 1
             AND COALESCE(corpus, 'materials') = 'materials'"""
    )
    total_materials = cur.fetchone()[0]

    # Total instructions
    cur.execute(
        """SELECT COUNT(*) FROM rag_docs
           WHERE COALESCE(enabled, 1) = 1
             AND corpus = 'instructions'"""
    )
    total_instructions = cur.fetchone()[0]

    conn.close()

    return jsonify(
        {
            "courses": courses,
            "total_materials": total_materials,
            "total_instructions": total_instructions,
            "total_docs": total_materials + total_instructions,
        }
    )


# ---------------------------------------------------------------------------
# POST /api/tutor/materials/upload — Upload study material
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/upload", methods=["POST"])
def upload_material():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No filename"}), 400

    from text_extractor import get_file_type, extract_text, SUPPORTED_EXTENSIONS

    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        return jsonify(
            {
                "error": f"Unsupported file type: {ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
            }
        ), 400

    file_type = get_file_type(file.filename)
    title = request.form.get("title", Path(file.filename).stem)
    course_id = request.form.get("course_id", type=int)
    tags = request.form.get("tags", "")

    # Save to disk
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    file_uuid = uuid.uuid4().hex[:12]
    safe_name = _sanitize_filename(file.filename)
    disk_name = f"{file_uuid}_{safe_name}"
    disk_path = UPLOADS_DIR / disk_name
    file.save(str(disk_path))

    file_size = disk_path.stat().st_size

    # Extract text
    extraction = extract_text(str(disk_path))
    content = extraction["content"]
    extraction_error = extraction["error"]

    # Insert into rag_docs
    import hashlib

    checksum = hashlib.sha256(content.encode("utf-8")).hexdigest() if content else ""

    conn = get_connection()
    cur = conn.cursor()
    now = datetime.now().isoformat()

    # Check for existing material with same checksum
    duplicate_of = None
    if checksum:
        cur.execute(
            "SELECT id, title FROM rag_docs WHERE checksum = ? AND COALESCE(corpus, 'materials') = 'materials'",
            (checksum,),
        )
        existing = cur.fetchone()
        if existing:
            duplicate_of = {"id": existing["id"], "title": existing["title"]}

    cur.execute(
        """INSERT INTO rag_docs
           (source_path, content, checksum, corpus, title, file_path, file_size,
            file_type, doc_type, topic_tags, course_id, enabled,
            extraction_error, created_at, updated_at)
           VALUES (?, ?, ?, 'materials', ?, ?, ?, ?, 'upload', ?, ?, 1, ?, ?, ?)""",
        (
            str(disk_path),
            content,
            checksum,
            title,
            str(disk_path),
            file_size,
            file_type,
            tags,
            course_id,
            extraction_error,
            now,
            now,
        ),
    )
    material_id = cur.lastrowid
    conn.commit()

    # Attempt embedding (non-blocking — don't fail the upload if embedding fails)
    embedded = False
    if content and not extraction_error:
        try:
            from tutor_rag import embed_rag_docs

            result = embed_rag_docs(corpus="materials")
            embedded = result.get("embedded", 0) > 0
        except Exception:
            pass

    conn.close()

    return jsonify(
        {
            "id": material_id,
            "title": title,
            "file_type": file_type,
            "file_size": file_size,
            "course_id": course_id,
            "extraction_error": extraction_error,
            "embedded": embedded,
            "char_count": len(content) if content else 0,
            "duplicate_of": duplicate_of,
        }
    ), 201


# ---------------------------------------------------------------------------
# GET /api/tutor/materials — List materials library
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials", methods=["GET"])
def list_materials():
    course_id = request.args.get("course_id", type=int)
    file_type = request.args.get("file_type")
    enabled = request.args.get("enabled", type=int)

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    conditions = ["COALESCE(corpus, 'materials') = 'materials'"]
    params: list = []

    if course_id is not None:
        conditions.append("course_id = ?")
        params.append(course_id)
    if file_type:
        conditions.append("file_type = ?")
        params.append(file_type)
    if enabled is not None:
        conditions.append("COALESCE(enabled, 1) = ?")
        params.append(enabled)

    where = " AND ".join(conditions)

    cur.execute(
        f"""SELECT id,
                   COALESCE(NULLIF(TRIM(title), ''), source_path, 'Material ' || id) as title,
                   source_path,
                   COALESCE(folder_path, '') as folder_path,
                   COALESCE(
                     file_type,
                     CASE
                       WHEN source_path LIKE '%.pdf' THEN 'pdf'
                       WHEN source_path LIKE '%.PDF' THEN 'pdf'
                       WHEN source_path LIKE '%.docx' THEN 'docx'
                       WHEN source_path LIKE '%.DOCX' THEN 'docx'
                       WHEN source_path LIKE '%.pptx' THEN 'pptx'
                       WHEN source_path LIKE '%.PPTX' THEN 'pptx'
                       WHEN source_path LIKE '%.ppt' THEN 'pptx'
                       WHEN source_path LIKE '%.PPT' THEN 'pptx'
                       WHEN source_path LIKE '%.md' THEN 'md'
                       WHEN source_path LIKE '%.MD' THEN 'md'
                       WHEN source_path LIKE '%.markdown' THEN 'md'
                       WHEN source_path LIKE '%.txt' THEN 'txt'
                       WHEN source_path LIKE '%.TXT' THEN 'txt'
                       WHEN source_path LIKE '%.text' THEN 'txt'
                       ELSE 'FILE'
                     END
                   ) as file_type,
                   COALESCE(file_size, 0) as file_size, course_id, topic_tags,
                   COALESCE(enabled, 1) as enabled, extraction_error,
                   COALESCE(checksum, '') as checksum,
                   created_at, updated_at
            FROM rag_docs
            WHERE {where}
            ORDER BY created_at DESC""",
        params,
    )

    materials = [dict(r) for r in cur.fetchall()]
    file_size_updates: list[tuple[int, int]] = []
    for material in materials:
        try:
            if int(material.get("file_size") or 0) <= 0:
                source_path = (material.get("source_path") or "").strip()
                if source_path and os.path.isfile(source_path):
                    material["file_size"] = os.path.getsize(source_path)
                    file_size_updates.append((material["file_size"], material["id"]))
        except Exception:
            # Keep safe zero fallback on any filesystem issue.
            material["file_size"] = int(material.get("file_size") or 0)

    if file_size_updates:
        cur.executemany(
            "UPDATE rag_docs SET file_size = ? WHERE id = ?",
            file_size_updates,
        )
        conn.commit()
    conn.close()

    return jsonify(materials)


# ---------------------------------------------------------------------------
# PUT /api/tutor/materials/<id> — Update material metadata
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/<int:material_id>", methods=["PUT"])
def update_material(material_id: int):
    data = request.get_json(silent=True) or {}

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        "SELECT id FROM rag_docs WHERE id = ? AND COALESCE(corpus, 'materials') = 'materials'",
        (material_id,),
    )
    if not cur.fetchone():
        conn.close()
        return jsonify({"error": "Material not found"}), 404

    updates = []
    params: list = []

    for field in ("title", "course_id", "topic_tags"):
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])

    if "enabled" in data:
        updates.append("enabled = ?")
        params.append(1 if data["enabled"] else 0)

    if not updates:
        conn.close()
        return jsonify({"error": "No fields to update"}), 400

    updates.append("updated_at = ?")
    params.append(datetime.now().isoformat())
    params.append(material_id)

    cur.execute(
        f"UPDATE rag_docs SET {', '.join(updates)} WHERE id = ?",
        params,
    )
    conn.commit()
    conn.close()

    return jsonify({"id": material_id, "updated": True})


# ---------------------------------------------------------------------------
# DELETE /api/tutor/materials/<id> — Delete material + file + ChromaDB chunks
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/<int:material_id>", methods=["DELETE"])
def delete_material(material_id: int):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        "SELECT id, file_path FROM rag_docs WHERE id = ? AND COALESCE(corpus, 'materials') = 'materials'",
        (material_id,),
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Material not found"}), 404

    file_path = row["file_path"]

    # Get chroma_ids for deletion
    cur.execute(
        "SELECT chroma_id FROM rag_embeddings WHERE rag_doc_id = ?", (material_id,)
    )
    chroma_ids = [r["chroma_id"] for r in cur.fetchall() if r["chroma_id"]]

    # Delete from ChromaDB
    if chroma_ids:
        try:
            from tutor_rag import init_vectorstore, COLLECTION_MATERIALS

            vs = init_vectorstore(COLLECTION_MATERIALS)
            collection = getattr(vs, "_collection", None)
            if collection:
                collection.delete(ids=chroma_ids)
        except Exception:
            pass

    # Delete embeddings from SQLite
    cur.execute("DELETE FROM rag_embeddings WHERE rag_doc_id = ?", (material_id,))

    # Delete rag_docs row
    cur.execute("DELETE FROM rag_docs WHERE id = ?", (material_id,))

    conn.commit()
    conn.close()

    # Delete file from disk
    if file_path:
        try:
            p = Path(file_path)
            if p.exists():
                p.unlink()
        except Exception:
            pass

    return jsonify({"deleted": True}), 200


# ---------------------------------------------------------------------------
# GET /api/tutor/materials/<id>/content — Return extracted text content
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/<int:material_id>/content", methods=["GET"])
def get_material_content(material_id: int):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        "SELECT id, title, source_path, file_type, content, course_id "
        "FROM rag_docs WHERE id = ? AND COALESCE(corpus, 'materials') = 'materials'",
        (material_id,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Material not found"}), 404

    raw_content = row["content"] or ""
    replacement_count = raw_content.count("\ufffd")
    total = len(raw_content) or 1
    ratio = replacement_count / total

    # Strip replacement characters so the viewer gets clean text
    content = raw_content.replace("\ufffd", "") if replacement_count else raw_content

    return jsonify({
        "id": row["id"],
        "title": row["title"] or "",
        "source_path": row["source_path"],
        "file_type": row["file_type"],
        "content": content,
        "char_count": len(content),
        "extraction_lossy": ratio > 0.1,
        "replacement_ratio": round(ratio, 3),
    })


# ---------------------------------------------------------------------------
# POST /api/tutor/chain — Create/extend session chain
# ---------------------------------------------------------------------------


@tutor_bp.route("/chain", methods=["POST"])
def create_chain():
    data = request.get_json(silent=True) or {}
    chain_name = data.get("chain_name")
    course_id = data.get("course_id")
    topic = data.get("topic", "")
    session_ids = data.get("session_ids", [])

    if not topic:
        return jsonify({"error": "topic is required"}), 400

    conn = get_connection()
    cur = conn.cursor()
    now = datetime.now().isoformat()

    cur.execute(
        """INSERT INTO session_chains
           (chain_name, course_id, topic, session_ids_json, status, created_at)
           VALUES (?, ?, ?, ?, 'active', ?)""",
        (chain_name, course_id, topic, json.dumps(session_ids), now),
    )
    chain_id = cur.lastrowid
    conn.commit()
    conn.close()

    return jsonify(
        {
            "id": chain_id,
            "chain_name": chain_name,
            "topic": topic,
            "session_ids": session_ids,
        }
    ), 201


# ---------------------------------------------------------------------------
# GET /api/tutor/chain/<id> — Get chain with linked sessions
# ---------------------------------------------------------------------------


@tutor_bp.route("/chain/<int:chain_id>", methods=["GET"])
def get_chain(chain_id: int):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM session_chains WHERE id = ?", (chain_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Chain not found"}), 404

    chain = dict(row)
    session_ids = []
    if chain.get("session_ids_json"):
        try:
            session_ids = json.loads(chain["session_ids_json"])
        except (json.JSONDecodeError, TypeError):
            pass

    sessions = []
    for sid in session_ids:
        s = _get_tutor_session(conn, sid)
        if s:
            sessions.append(s)

    chain["sessions"] = sessions
    conn.close()

    return jsonify(chain)


# ---------------------------------------------------------------------------
# GET /api/tutor/blocks — All method blocks for chain builder
# ---------------------------------------------------------------------------


@tutor_bp.route("/blocks", methods=["GET"])
def get_method_blocks():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """SELECT id, name, control_stage, description, default_duration_min,
                  energy_cost, facilitation_prompt
           FROM method_blocks
           ORDER BY control_stage, name"""
    )
    blocks = [dict(r) for r in cur.fetchall()]
    conn.close()

    return jsonify(blocks)


# ---------------------------------------------------------------------------
# POST /api/tutor/blocks/chain — Create ad-hoc chain from custom block list
# ---------------------------------------------------------------------------


@tutor_bp.route("/blocks/chain", methods=["POST"])
def create_custom_chain():
    data = request.get_json(silent=True) or {}
    block_ids = data.get("block_ids", [])
    name = data.get("name", "Custom Chain")

    if not block_ids or not isinstance(block_ids, list):
        return jsonify({"error": "block_ids is required (non-empty list)"}), 400

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """INSERT INTO method_chains (name, description, block_ids, context_tags, is_template, created_at)
           VALUES (?, 'User-built custom chain', ?, '{}', 0, datetime('now'))""",
        (name, json.dumps(block_ids)),
    )
    chain_id = cur.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"id": chain_id, "name": name, "block_ids": block_ids}), 201


# ---------------------------------------------------------------------------
# GET /api/tutor/config/check — Verify provider configuration
# ---------------------------------------------------------------------------


@tutor_bp.route("/config/check", methods=["GET"])
def config_check():
    issues: list[str] = []

    # Check Codex CLI availability
    codex_ok = False
    try:
        import shutil

        codex_ok = shutil.which("codex") is not None
    except Exception:
        pass
    if not codex_ok:
        issues.append("Codex CLI not found in PATH")

    # Check ChatGPT backend (used by Codex streaming)
    chatgpt_ok = False
    try:
        from llm_provider import stream_chatgpt_responses  # noqa: F401

        chatgpt_ok = True
    except ImportError:
        pass
    if not chatgpt_ok:
        issues.append("ChatGPT streaming provider not available")

    return jsonify(
        {
            "ok": len(issues) == 0,
            "codex_available": codex_ok,
            "chatgpt_streaming": chatgpt_ok,
            "issues": issues,
        }
    )


# ---------------------------------------------------------------------------
# GET /api/tutor/embed/status — Per-material embedding chunk counts
# ---------------------------------------------------------------------------


@tutor_bp.route("/embed/status", methods=["GET"])
def embed_status():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """SELECT r.id, r.title, r.source_path,
                  COUNT(e.id) AS chunk_count,
                  CASE WHEN COUNT(e.id) > 0 THEN 1 ELSE 0 END AS embedded
           FROM rag_docs r
           LEFT JOIN rag_embeddings e ON e.rag_doc_id = r.id
           WHERE COALESCE(r.corpus, 'materials') = 'materials'
             AND COALESCE(r.enabled, 1) = 1
           GROUP BY r.id
           ORDER BY r.title"""
    )
    materials = [dict(r) for r in cur.fetchall()]
    conn.close()

    total = len(materials)
    embedded_count = sum(1 for m in materials if m["embedded"])

    return jsonify(
        {
            "materials": materials,
            "total": total,
            "embedded": embedded_count,
            "pending": total - embedded_count,
        }
    )


# ---------------------------------------------------------------------------
# POST /api/tutor/embed — Trigger embedding for rag_docs
# ---------------------------------------------------------------------------


@tutor_bp.route("/embed", methods=["POST"])
def trigger_embed():
    data = request.get_json(silent=True) or {}
    course_id = data.get("course_id")
    folder_path = data.get("folder_path")
    corpus = data.get("corpus")

    try:
        from tutor_rag import embed_rag_docs

        result = embed_rag_docs(
            course_id=course_id, folder_path=folder_path, corpus=corpus
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST /api/tutor/materials/auto-link — Link unlinked materials to courses
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/auto-link", methods=["POST"])
def auto_link_materials():
    conn = get_connection()
    try:
        result = _auto_link_materials_to_courses(conn)
    finally:
        conn.close()
    return jsonify(result)


# ---------------------------------------------------------------------------
# POST /api/tutor/materials/sync — Sync local materials folder to rag_docs
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/sync", methods=["POST"])
def sync_materials_folder():
    data = request.get_json(silent=True) or {}

    try:
        root, allowed_exts = _parse_sync_folder_payload(data)
    except (ValueError, FileNotFoundError) as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    job_id = _launch_materials_sync_job(root, allowed_exts)
    return jsonify({"ok": True, "job_id": job_id, "folder": str(root)}), 202


@tutor_bp.route("/materials/sync/start", methods=["POST"])
def start_materials_sync():
    return sync_materials_folder()


@tutor_bp.route("/materials/sync/status/<job_id>", methods=["GET"])
def get_materials_sync_status(job_id: str):
    with SYNC_JOBS_LOCK:
        job = dict(SYNC_JOBS.get(job_id) or {})

    if not job:
        return jsonify({"error": "Sync job not found"}), 404
    return jsonify(job), 200
