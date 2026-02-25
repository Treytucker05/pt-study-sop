"""
Tutor API Blueprint — Flask endpoints for the Adaptive Tutor system.

Endpoints:
  POST   /api/tutor/session              — Create tutor session
  GET    /api/tutor/session/<id>          — Get session with history
  POST   /api/tutor/session/<id>/turn     — Send message, SSE stream response
  POST   /api/tutor/session/<id>/end      — End session, create Brain record
  POST   /api/tutor/session/<id>/artifact — Create note/card/map mid-session
  POST   /api/tutor/session/<id>/finalize — Write structured tutor artifacts to Obsidian
  POST   /api/tutor/session/<id>/sync-graph — Re-sync graph for session note paths
  GET    /api/tutor/session/<id>/chain-status — Full chain progress for session
  POST   /api/tutor/session/<id>/advance-block — Advance to next block in chain
  GET    /api/tutor/sessions              — List sessions
  GET    /api/tutor/content-sources       — Get available courses + materials
  GET    /api/tutor/chains/templates      — Get template chains with resolved blocks
  POST   /api/tutor/chain                 — Create/extend session chain
  GET    /api/tutor/chain/<id>            — Get chain with linked sessions
  POST   /api/tutor/embed                 — Trigger embedding for rag_docs
  POST   /api/tutor/materials/sync         — Sync local materials folder to rag_docs
  POST   /api/tutor/materials/upload      — Upload study material
  POST   /api/tutor/materials/video/process — Process uploaded MP4 into study artifacts
  GET    /api/tutor/materials/video/status/<job_id> — Get MP4 processing status
  GET    /api/tutor/materials             — List materials library
  PUT    /api/tutor/materials/<id>        — Update material metadata
  DELETE /api/tutor/materials/<id>        — Delete material + file + embeddings
"""

from __future__ import annotations

import json
import os
import re
import hashlib
import sqlite3
import uuid
import logging
from datetime import datetime
from pathlib import Path
from threading import Lock, Thread
from typing import Any, Optional
from urllib.parse import quote

from flask import Blueprint, Response, current_app, has_app_context, jsonify, request, send_file
from jsonschema import Draft202012Validator

from dashboard.utils import load_api_config, save_api_config

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
import tutor_rag as _tutor_rag
import llm_provider as _llm_provider

tutor_bp = Blueprint("tutor", __name__, url_prefix="/api/tutor")

UPLOADS_DIR = Path(__file__).parent.parent / "data" / "uploads"
SYNC_JOBS: dict[str, dict[str, Any]] = {}
SYNC_JOBS_LOCK = Lock()
SYNC_JOB_RETENTION = 30
VIDEO_JOBS: dict[str, dict[str, Any]] = {}
VIDEO_JOBS_LOCK = Lock()
VIDEO_JOB_RETENTION = 30
_LOG = logging.getLogger(__name__)
EXTRACTED_IMAGES_ROOT = Path(__file__).resolve().parents[1] / "data" / "extracted_images"
_IMAGE_PLACEHOLDER_PATTERN = re.compile(r"<!--\s*image\s*-->", re.IGNORECASE)

_SELECTOR_COLS_ENSURED = False
_WIKILINK_PATTERN = re.compile(r"\[\[([^\]]+)\]\]")
_NORTH_STAR_OBJECTIVE_PATTERN_OLD = re.compile(
    r"\[\[(OBJ-[^\]]+)\]\].*status:\s*([a-z_]+)",
    re.IGNORECASE,
)
_NORTH_STAR_OBJECTIVE_PATTERN_NEW = re.compile(
    r"^\s*\d+\.\s+\[\[(OBJ-[^\]]+)\]\]\s+(.+)$",
)
_TUTOR_NOTE_SCHEMA_PATH = (
    Path(__file__).resolve().parents[2] / "docs" / "schemas" / "tutor_note_schema_v1_1.json"
)
_TUTOR_NOTE_SCHEMA_DOC: Optional[dict[str, Any]] = None
_TUTOR_NOTE_SCHEMA_VALIDATOR: Optional[Draft202012Validator] = None
_TUTOR_SESSION_MODE_LIMITS: dict[str, tuple[int, int]] = {
    "module_all": (0, 200),
    "single_focus": (1, 1),
    "focused_batch": (3, 5),
}
_METHODS_YAML_DIR = Path(__file__).resolve().parents[2] / "sop" / "library" / "methods"
_METHOD_CONTRACT_CACHE: dict[str, Any] = {"stamp": None, "by_id": {}}


def _safe_json_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


def _extract_knob_defaults(knobs_payload: Any) -> dict[str, Any]:
    if not isinstance(knobs_payload, dict):
        return {}
    defaults: dict[str, Any] = {}
    for knob_name, knob_spec in knobs_payload.items():
        if not isinstance(knob_name, str):
            continue
        if isinstance(knob_spec, dict) and "default" in knob_spec:
            defaults[knob_name] = knob_spec.get("default")
    return defaults


def _load_method_contracts() -> dict[str, dict[str, Any]]:
    files = sorted(_METHODS_YAML_DIR.glob("*.yaml"))
    if not files:
        return {}

    stamp = tuple((p.name, p.stat().st_mtime_ns, p.stat().st_size) for p in files)
    if _METHOD_CONTRACT_CACHE.get("stamp") == stamp:
        cached = _METHOD_CONTRACT_CACHE.get("by_id")
        if isinstance(cached, dict):
            return cached

    try:
        import yaml  # type: ignore
    except Exception:
        _METHOD_CONTRACT_CACHE["stamp"] = stamp
        _METHOD_CONTRACT_CACHE["by_id"] = {}
        return {}

    by_id: dict[str, dict[str, Any]] = {}
    for path in files:
        try:
            raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(raw, dict):
            continue
        method_id = str(raw.get("id") or "").strip()
        if not method_id:
            continue
        knobs_raw = raw.get("knobs")
        knobs = knobs_raw if isinstance(knobs_raw, dict) else {}
        by_id[method_id] = {
            "method_id": method_id,
            "control_stage": str(raw.get("control_stage") or "").strip().upper(),
            "artifact_type": str(raw.get("artifact_type") or "").strip(),
            "best_stage": str(raw.get("best_stage") or "").strip(),
            "facilitation_prompt": str(raw.get("facilitation_prompt") or "").strip(),
            "knob_defaults": _extract_knob_defaults(knobs),
        }

    _METHOD_CONTRACT_CACHE["stamp"] = stamp
    _METHOD_CONTRACT_CACHE["by_id"] = by_id
    return by_id


def _validate_chain_launch_blocks(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    contracts = _load_method_contracts()
    for index, block in enumerate(blocks):
        method_id = str(block.get("method_id") or "").strip()
        if not method_id:
            continue
        contract = contracts.get(method_id) or {}
        expected_stage = str(contract.get("control_stage") or "").strip().upper()
        actual_stage = str(block.get("control_stage") or "").strip().upper()
        if expected_stage and actual_stage and expected_stage != actual_stage:
            issues.append(
                {
                    "code": "METHOD_STAGE_MISMATCH",
                    "index": index,
                    "method_id": method_id,
                    "block_id": block.get("id"),
                    "block_name": block.get("name"),
                    "expected_stage": expected_stage,
                    "actual_stage": actual_stage,
                }
            )
    return issues


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


def _sanitize_path_segment(raw: Any, *, fallback: str) -> str:
    value = str(raw or "").strip()
    value = re.sub(r'[\\/:*?"<>|]+', " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value or fallback


def _resolve_class_label(course_id: Optional[int]) -> str:
    if course_id is None:
        return "General Class"

    conn: Optional[sqlite3.Connection] = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT name FROM courses WHERE id = ?", (int(course_id),))
        row = cur.fetchone()
        if row:
            try:
                raw_name = row["name"]  # sqlite3.Row path
            except Exception:
                raw_name = row[0] if isinstance(row, tuple) and row else None
            return _sanitize_path_segment(raw_name, fallback=f"Class {course_id}")
    except Exception:
        pass
    finally:
        if conn is not None:
            conn.close()

    return _sanitize_path_segment(f"Class {course_id}", fallback="General Class")


def _study_notes_base_path(*, course_label: str, module_or_week: str, subtopic: str) -> str:
    from course_map import load_course_map

    course_map = load_course_map()
    course = course_map.resolve_course(course_label)

    if course is None:
        safe_course = _sanitize_path_segment(course_label, fallback="General Class")
        safe_module = _sanitize_path_segment(module_or_week, fallback="General Module")
        safe_subtopic = _sanitize_path_segment(subtopic, fallback="General Topic")
        return f"{course_map.vault_root}/{safe_course}/{safe_module}/{safe_subtopic}"

    unit = course.resolve_unit(module_or_week)
    unit_folder = unit.name if unit else _sanitize_path_segment(module_or_week, fallback="General Module")
    topic_folder = _sanitize_path_segment(subtopic, fallback="General Topic")

    return f"{course_map.vault_root}/{course.label}/{unit_folder}/{topic_folder}"


def _canonical_north_star_path(*, course_label: str, module_or_week: str, subtopic: str) -> str:
    return f"{_study_notes_base_path(course_label=course_label, module_or_week=module_or_week, subtopic=subtopic)}/_North_Star.md"


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


def _normalize_session_mode(raw_mode: Any) -> str:
    mode = str(raw_mode or "").strip().lower()
    if mode in _TUTOR_SESSION_MODE_LIMITS:
        return mode
    return "focused_batch"


def _default_session_mode_from_scope(scope: str) -> str:
    normalized_scope = _normalize_objective_scope(scope)
    if normalized_scope == "single_focus":
        return "single_focus"
    return "module_all"


def _load_tutor_note_schema_validator() -> Draft202012Validator:
    global _TUTOR_NOTE_SCHEMA_DOC
    global _TUTOR_NOTE_SCHEMA_VALIDATOR

    if _TUTOR_NOTE_SCHEMA_VALIDATOR is not None:
        return _TUTOR_NOTE_SCHEMA_VALIDATOR

    with _TUTOR_NOTE_SCHEMA_PATH.open("r", encoding="utf-8") as fh:
        schema_doc = json.load(fh)

    schema = schema_doc.get("schema") if isinstance(schema_doc, dict) else None
    if not isinstance(schema, dict):
        raise ValueError("Invalid tutor note schema: missing 'schema' object")

    _TUTOR_NOTE_SCHEMA_DOC = schema_doc
    _TUTOR_NOTE_SCHEMA_VALIDATOR = Draft202012Validator(schema)
    return _TUTOR_NOTE_SCHEMA_VALIDATOR


def _normalize_tutor_artifact_payload(
    payload: dict[str, Any],
    *,
    default_session_mode: str,
) -> dict[str, Any]:
    normalized = json.loads(json.dumps(payload))

    metadata = normalized.get("metadata")
    if not isinstance(metadata, dict):
        metadata = {}
        normalized["metadata"] = metadata
    metadata["session_mode"] = _normalize_session_mode(
        metadata.get("session_mode") or default_session_mode
    )

    session = normalized.get("session")
    if not isinstance(session, dict):
        session = {}
        normalized["session"] = session
    session["unknowns"] = _normalize_wikilinks(session.get("unknowns"), max_items=80)
    session["follow_up_targets"] = _normalize_wikilinks(
        session.get("follow_up_targets"), max_items=80
    )

    concepts = normalized.get("concepts")
    if not isinstance(concepts, list):
        concepts = []
        normalized["concepts"] = concepts
    for concept in concepts:
        if not isinstance(concept, dict):
            continue
        concept["prerequisites"] = _normalize_wikilinks(
            concept.get("prerequisites"), max_items=80
        )
        relationships = concept.get("relationships")
        if not isinstance(relationships, list):
            concept["relationships"] = []
            continue
        norm_relationships: list[dict[str, Any]] = []
        for rel in relationships:
            if not isinstance(rel, dict):
                continue
            link = _normalize_wikilinks([rel.get("target_concept")], max_items=1)
            norm_relationships.append(
                {
                    "target_concept": link[0] if link else "",
                    "relationship_type": rel.get("relationship_type"),
                }
            )
        concept["relationships"] = norm_relationships

    return normalized


def _validate_tutor_artifact_payload(
    payload: dict[str, Any],
    *,
    default_session_mode: str,
) -> tuple[Optional[dict[str, Any]], list[str]]:
    validator = _load_tutor_note_schema_validator()
    normalized = _normalize_tutor_artifact_payload(
        payload, default_session_mode=default_session_mode
    )

    errors: list[str] = []
    for err in sorted(validator.iter_errors(normalized), key=lambda e: list(e.path)):
        path = ".".join(str(p) for p in err.path) or "(root)"
        errors.append(f"{path}: {err.message}")

    metadata = normalized.get("metadata") or {}
    session_mode = _normalize_session_mode(metadata.get("session_mode"))
    concept_count = len(normalized.get("concepts") or [])
    min_items, max_items = _TUTOR_SESSION_MODE_LIMITS[session_mode]
    if not (min_items <= concept_count <= max_items):
        errors.append(
            f"concepts: session_mode '{session_mode}' requires between {min_items} and {max_items} concepts (got {concept_count})"
        )

    if errors:
        return None, errors
    return normalized, []


_PRIME_DISALLOWED_ASSESSMENT_KEYS = (
    "score",
    "grade",
    "confidence",
    "accuracy",
    "calibration",
    "mastery",
    "verdict",
    "rubric",
)


def _walk_payload_keys(payload: Any, path: str = "") -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    if isinstance(payload, dict):
        for key, value in payload.items():
            key_str = str(key)
            key_path = f"{path}.{key_str}" if path else key_str
            found.append((key_path, key_str.lower()))
            found.extend(_walk_payload_keys(value, key_path))
    elif isinstance(payload, list):
        for idx, item in enumerate(payload):
            item_path = f"{path}[{idx}]" if path else f"[{idx}]"
            found.extend(_walk_payload_keys(item, item_path))
    return found


def _prime_assessment_violations(payload: dict[str, Any]) -> list[str]:
    violations: list[str] = []
    for key_path, key_lower in _walk_payload_keys(payload):
        if any(token in key_lower for token in _PRIME_DISALLOWED_ASSESSMENT_KEYS):
            violations.append(f"{key_path}: assessment fields are not allowed in PRIME")

    session = payload.get("session")
    if isinstance(session, dict):
        stage_flow = session.get("stage_flow")
        if isinstance(stage_flow, list):
            disallowed = [
                str(stage).upper()
                for stage in stage_flow
                if str(stage).upper() in {"RETRIEVE", "OVERLEARN"}
            ]
            if disallowed:
                violations.append(
                    "session.stage_flow: RETRIEVE/OVERLEARN cannot be emitted from PRIME artifacts"
                )
    return violations


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
            obj: dict[str, str] = {
                "objective_id": _normalize_objective_id(raw_obj_id, idx),
                "title": title,
                "status": _normalize_objective_status(item.get("status")),
            }
            group = str(item.get("group") or "").strip()
            if group:
                obj["group"] = group
            items.append(obj)
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
            SELECT lo_code, title, status, group_name
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
            SELECT lo_code, title, status, group_name
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
        obj: dict[str, str] = {
            "objective_id": _normalize_objective_id(row["lo_code"], idx),
            "title": title,
            "status": _normalize_objective_status(row["status"]),
        }
        group = str(row["group_name"] or "").strip()
        if group:
            obj["group"] = group
        items.append(obj)
    return items


def _parse_existing_north_star_objectives(content: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for line in (content or "").splitlines():
        # Old format: [[OBJ-ID]] ... status: active
        m = _NORTH_STAR_OBJECTIVE_PATTERN_OLD.search(line)
        if m:
            parsed[m.group(1).strip()] = _normalize_objective_status(m.group(2))
            continue
        # New format: 1. [[OBJ-ID]] Description text
        m2 = _NORTH_STAR_OBJECTIVE_PATTERN_NEW.match(line)
        if m2:
            parsed[m2.group(1).strip()] = "active"
    return parsed


def _build_north_star_markdown(
    *,
    module_name: str,
    course_name: str = "",
    topic: str,
    objectives: list[dict[str, str]],
    source_ids: list[int],
) -> str:
    from tutor_templates import _render_north_star_markdown

    # Group objectives by their 'group' field (or single flat group)
    groups_map: dict[str, list[dict[str, str]]] = {}
    group_order: list[str] = []
    for obj in objectives:
        group_name = str(obj.get("group") or module_name)
        if group_name not in groups_map:
            groups_map[group_name] = []
            group_order.append(group_name)
        groups_map[group_name].append({
            "id": obj.get("objective_id", ""),
            "description": obj.get("title", ""),
            "status": obj.get("status", "active"),
        })

    objective_groups = [
        {"name": name, "objectives": groups_map[name]}
        for name in group_order
    ]

    payload: dict[str, Any] = {
        "module_name": module_name,
        "course_name": course_name,
        "objective_groups": objective_groups,
        "follow_up_targets": ["[[OBJ-UNMAPPED]]"],
    }
    return _render_north_star_markdown(payload)


def _session_has_real_objectives(north_star: Optional[dict]) -> bool:
    """Return True if the north star has at least one real (non-UNMAPPED) objective."""
    if not north_star:
        return False
    objective_ids = north_star.get("objective_ids") or []
    return any(
        str(oid or "").strip() and str(oid).strip() != "OBJ-UNMAPPED"
        for oid in objective_ids
    )


_LO_LIST_RE = re.compile(r"^\s*(?:\d+[.)]\s+|[-*]\s+)(.+)$")


_GROUP_HEADER_RE = re.compile(
    r"^(?:\*\*|##?\s+)(?:[IVXLC]+\.\s+)?(.+?)(?:\*\*)?$"
)


def _extract_objectives_from_text(text: str) -> list[dict] | None:
    """Parse learning objectives from the model's free-text response.

    Returns a list of ``{"id": "OBJ-...", "description": "...", "group": "..."}`` dicts,
    or *None* if no confident extraction is possible (avoids false positives).

    Detects bold section headers like ``**I. Hip and Pelvis**`` or
    ``## Hip and Pelvis`` and tags extracted objectives with their group name.
    """
    if not text:
        return None

    header_re = re.compile(
        r"(?:learning\s+objectives?|objectives?|here\s+are\s+the)",
        re.IGNORECASE,
    )
    lines = text.splitlines()
    collecting = False
    current_group = ""
    items: list[tuple[str, str]] = []  # (text, group)

    for line in lines:
        stripped = line.strip()
        if not collecting and header_re.search(stripped):
            collecting = True
            m = _LO_LIST_RE.match(stripped)
            if m:
                items.append((m.group(1).strip(), current_group))
            continue
        if collecting:
            # Detect group headers (bold or markdown heading with optional roman numeral)
            gm = _GROUP_HEADER_RE.match(stripped)
            if gm and not _LO_LIST_RE.match(stripped):
                current_group = gm.group(1).strip()
                continue
            m = _LO_LIST_RE.match(stripped)
            if m:
                items.append((m.group(1).strip(), current_group))
            elif stripped == "":
                continue
            else:
                break

    if len(items) < 2:
        return None

    objectives: list[dict] = []
    for idx, (item_text, group) in enumerate(items, 1):
        desc = re.sub(r"^OBJ-\S+\s*[\u2014\-\u2013:]\s*", "", item_text).strip()
        if not desc:
            desc = item_text
        obj: dict[str, str] = {"id": f"OBJ-{idx}", "description": desc}
        if group:
            obj["group"] = group
        objectives.append(obj)

    return objectives


def _objective_slug(description: str) -> str:
    """Generate an OBJ-KEYWORD ID from a description string."""
    # Take first few meaningful words, uppercase, join with hyphens.
    words = re.sub(r"[^a-zA-Z0-9\s]", "", description).split()
    # Pick up to 3 words, skip tiny words.
    chosen = [w.upper() for w in words if len(w) > 2][:3]
    slug = "-".join(chosen) if chosen else "GENERAL"
    return f"OBJ-{slug}"


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
    force_refresh: bool = False,
    path_override: Optional[str] = None,
) -> tuple[Optional[dict[str, Any]], Optional[str]]:
    """
    Hard-gate North Star flow:
    - If exists: review and update only on detected objective changes.
    - If missing: build before planning.

    If *path_override* is a vault-relative folder path, the North Star file
    is saved there instead of the auto-generated location.
    """
    # Local import prevents blueprint import cycles at module import time.
    from dashboard.api_adapter import obsidian_get_file, obsidian_save_file

    derived_module_name = _sanitize_module_name(module_name or topic or f"Module-{course_id or 'General'}")
    derived_subtopic = _sanitize_path_segment(topic or derived_module_name, fallback=derived_module_name)
    derived_course = _resolve_class_label(course_id)

    if path_override:
        # User-provided vault folder — use directly
        clean = path_override.strip().rstrip("/").rstrip("\\")
        north_star_path = f"{clean}/_North_Star.md"
    else:
        north_star_path = _canonical_north_star_path(
            course_label=derived_course,
            module_or_week=derived_module_name,
            subtopic=derived_subtopic,
        )

    # Always merge payload objectives with DB objectives so the North Star
    # accumulates across topics (e.g., Hip + Knee in the same construct).
    payload_objectives = _collect_objectives_from_payload(learning_objectives)
    db_objectives = _collect_objectives_from_db(course_id, module_id)

    # Merge: DB provides the base, payload overrides matching IDs
    seen_ids: set[str] = set()
    objectives: list[dict[str, str]] = []
    for obj in payload_objectives:
        oid = obj["objective_id"]
        seen_ids.add(oid)
        objectives.append(obj)
    for obj in db_objectives:
        if obj["objective_id"] not in seen_ids:
            objectives.append(obj)

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
            course_name=derived_course,
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
            needs_update = bool(force_refresh)
            for oid, st in desired_statuses.items():
                if current_statuses.get(oid) != st:
                    needs_update = True
                    break
            if needs_update:
                new_content = _build_north_star_markdown(
                    module_name=derived_module_name,
                    course_name=derived_course,
                    topic=topic,
                    objectives=objectives,
                    source_ids=source_ids,
                )
                save_res = obsidian_save_file(north_star_path, new_content)
                if not save_res.get("success"):
                    return None, f"North Star update failed: {save_res.get('error', 'unknown error')}"
                current_content = new_content
                status = "refreshed" if force_refresh else "updated"
            else:
                status = "reviewed"
        else:
            # File missing. If real objectives exist but no path_override was
            # given, the user may have deleted the file intentionally (e.g. to
            # relocate it).  Signal "needs_path" so the turn handler re-asks.
            has_real = any(
                o["objective_id"] != "OBJ-UNMAPPED" for o in objectives
            )
            if has_real and not path_override:
                current_content = _build_north_star_markdown(
                    module_name=derived_module_name,
                    course_name=derived_course,
                    topic=topic,
                    objectives=objectives,
                    source_ids=source_ids,
                )
                status = "needs_path"
            else:
                new_content = _build_north_star_markdown(
                    module_name=derived_module_name,
                    course_name=derived_course,
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
            "course_name": derived_course,
            "subtopic_name": derived_subtopic,
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


def _sanitize_note_fragment(raw: Any, *, fallback: str) -> str:
    value = str(raw or "").strip()
    value = re.sub(r'[\\/:*?"<>|]+', " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    if not value:
        value = fallback
    return value.replace(" ", "_")


def _render_tutor_session_markdown(
    artifact: dict[str, Any],
    *,
    session_id: str,
    topic: str,
    module_name: str,
    course_label: str = "",
    course_code: str = "",
    unit_type: str = "",
) -> str:
    from tutor_templates import render_session_note_markdown

    return render_session_note_markdown(
        artifact=artifact,
        session_id=session_id,
        topic=topic,
        module_name=module_name,
        course_label=course_label,
        course_code=course_code,
        unit_type=unit_type,
    )


def _render_tutor_concept_markdown(
    concept: dict[str, Any],
    *,
    module_name: str,
    course_label: str = "",
    course_code: str = "",
    unit_type: str = "",
) -> str:
    from tutor_templates import render_concept_note_markdown

    return render_concept_note_markdown(
        concept=concept,
        module_name=module_name,
        course_label=course_label,
        course_code=course_code,
        unit_type=unit_type,
    )


def _merge_and_save_obsidian_note(
    *,
    path: str,
    content: str,
    session_id: Optional[str],
) -> dict[str, Any]:
    from dashboard.api_adapter import obsidian_get_file, obsidian_save_file
    from obsidian_index import get_vault_index
    from obsidian_merge import merge_sections

    existing_resp = obsidian_get_file(path)
    existing_content = (
        str(existing_resp.get("content") or "") if existing_resp.get("success") else ""
    )
    vault_result = get_vault_index()
    vault_notes = (
        vault_result.get("notes", []) if isinstance(vault_result, dict) and vault_result.get("success") else []
    )
    merged_content = merge_sections(
        existing_content,
        content,
        session_id=session_id,
        vault_index=vault_notes,
    )
    save_result = obsidian_save_file(path, merged_content)
    if not save_result.get("success"):
        return {
            "success": False,
            "path": path,
            "error": save_result.get("error", "failed_to_save_obsidian_note"),
        }
    return {"success": True, "path": path, "content": merged_content}


def _sync_graph_for_paths(
    *,
    conn: sqlite3.Connection,
    notes_by_path: dict[str, str],
) -> dict[str, Any]:
    from adaptive.knowledge_graph import create_kg_tables, incremental_kg_update

    create_kg_tables(conn)
    total_deleted = 0
    total_edges_created = 0
    total_skipped = 0
    per_path: dict[str, dict[str, int]] = {}

    for path, content in notes_by_path.items():
        if not path or not isinstance(content, str):
            continue
        try:
            result = incremental_kg_update(conn, path, content)
            deleted = int(result.get("deleted", 0))
            edges_created = int(result.get("edges_created", 0))
            skipped = int(result.get("skipped", 0))
            total_deleted += deleted
            total_edges_created += edges_created
            total_skipped += skipped
            per_path[path] = {
                "deleted": deleted,
                "edges_created": edges_created,
                "skipped": skipped,
            }
        except Exception as exc:
            per_path[path] = {
                "deleted": 0,
                "edges_created": 0,
                "skipped": 0,
                "error": str(exc),
            }

    return {
        "status": "ok",
        "notes_synced": len(per_path),
        "deleted": total_deleted,
        "edges_created": total_edges_created,
        "skipped": total_skipped,
        "paths": per_path,
    }


def save_tool_note_to_obsidian(
    *,
    path: str,
    content: str,
    session_id: Optional[str] = None,
) -> dict[str, Any]:
    if not path or not content:
        return {"success": False, "error": "path and content are required"}

    save_result = _merge_and_save_obsidian_note(
        path=path,
        content=content,
        session_id=session_id,
    )
    if not save_result.get("success"):
        return save_result

    conn = get_connection()
    try:
        graph_sync = _sync_graph_for_paths(
            conn=conn,
            notes_by_path={path: str(save_result.get("content") or "")},
        )
    finally:
        conn.close()

    return {
        "success": True,
        "message": f"Saved to Obsidian: {path}",
        "path": path,
        "bytes": len(content),
        "graph_sync": graph_sync,
    }


def save_learning_objectives_from_tool(
    *,
    session_id: str,
    objectives: list[dict[str, str]],
    save_folder: Optional[str] = None,
) -> dict[str, Any]:
    """Persist approved learning objectives and rebuild the North Star note.

    Called by the ``save_learning_objectives`` tutor tool.  Steps:
      1. Read the tutor session to get ``course_id`` and ``content_filter_json``.
      2. INSERT each objective into ``learning_objectives`` (upsert on lo_code+course_id).
      3. Rebuild the North Star note via ``_ensure_north_star_context(force_refresh=True)``.
      4. Update ``content_filter_json`` so ``_session_has_real_objectives()`` returns True.

    If *save_folder* is provided (vault-relative path), the North Star and future
    notes are saved there instead of the auto-generated path.
    """
    conn = get_connection()
    try:
        session_row = _get_tutor_session(conn, session_id)
        if not session_row:
            return {"success": False, "error": "Session not found"}

        course_id = session_row.get("course_id")
        if not course_id:
            return {"success": False, "error": "Session has no course_id"}

        # --- 1. Parse existing content_filter ---
        content_filter: dict[str, Any] = {}
        raw_cf = session_row.get("content_filter_json")
        if raw_cf:
            try:
                parsed = json.loads(raw_cf)
                if isinstance(parsed, dict):
                    content_filter = parsed
            except (json.JSONDecodeError, TypeError):
                pass

        north_star = content_filter.get("north_star") or {}
        module_id = content_filter.get("module_id")
        module_name = north_star.get("module_name") or content_filter.get("module_name")
        topic = session_row.get("topic") or module_name or ""
        source_ids = content_filter.get("source_ids") or []

        # --- 2. INSERT into learning_objectives (upsert by course_id+lo_code) ---
        # group_name = session topic so objectives are grouped by topic in North Star
        group_name = str(topic or "").strip() or None
        now = datetime.now().isoformat()
        inserted_codes: list[str] = []
        cur = conn.cursor()
        for idx, obj in enumerate(objectives):
            lo_code = _normalize_objective_id(obj.get("id", ""), idx)
            title = str(obj.get("description", "")).strip()
            if not title:
                title = lo_code

            cur.execute(
                "SELECT id FROM learning_objectives WHERE course_id = ? AND lo_code = ?",
                (course_id, lo_code),
            )
            existing = cur.fetchone()
            if existing:
                cur.execute(
                    "UPDATE learning_objectives SET title = ?, group_name = COALESCE(?, group_name), updated_at = ? WHERE id = ?",
                    (title, group_name, now, existing[0] if isinstance(existing, tuple) else existing["id"]),
                )
            else:
                cur.execute(
                    """INSERT INTO learning_objectives
                       (course_id, module_id, lo_code, title, status, group_name, created_at, updated_at)
                       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)""",
                    (course_id, module_id, lo_code, title, group_name, now, now),
                )
            inserted_codes.append(lo_code)
        conn.commit()

        # --- 3. Rebuild North Star from ALL objectives in DB (not just this batch) ---
        # Pass learning_objectives=None so _ensure_north_star_context merges from DB,
        # picking up objectives from previous sessions (e.g., Hip + Knee).
        ns_ctx, ns_err = _ensure_north_star_context(
            course_id=course_id,
            module_id=module_id,
            module_name=module_name,
            topic=topic,
            learning_objectives=None,
            source_ids=source_ids,
            force_refresh=True,
            path_override=save_folder,
        )
        if ns_err:
            _LOG.warning("North Star rebuild warning: %s", ns_err)

        # --- 4. Update session content_filter_json ---
        if ns_ctx:
            module_prefix = str(Path(str(ns_ctx["path"])).parent).replace("\\", "/")
            content_filter["module_name"] = ns_ctx.get("module_name")
            content_filter["module_prefix"] = module_prefix
            content_filter["north_star"] = {
                "path": ns_ctx.get("path"),
                "status": ns_ctx.get("status"),
                "module_name": ns_ctx.get("module_name"),
                "course_name": ns_ctx.get("course_name"),
                "subtopic_name": ns_ctx.get("subtopic_name"),
                "objective_ids": ns_ctx.get("objective_ids") or [],
            }
            content_filter["reference_targets"] = (
                ns_ctx.get("reference_targets") or []
            )
            content_filter["follow_up_targets"] = (
                ns_ctx.get("follow_up_targets") or []
            )

        cur.execute(
            "UPDATE tutor_sessions SET content_filter_json = ? WHERE session_id = ?",
            (json.dumps(content_filter), session_id),
        )
        conn.commit()

        return {
            "success": True,
            "message": f"Saved {len(inserted_codes)} learning objectives",
            "objective_ids": inserted_codes,
        }
    except Exception as e:
        _LOG.exception("save_learning_objectives_from_tool failed")
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


def _finalize_structured_notes_for_session(
    *,
    conn: sqlite3.Connection,
    session_id: str,
    session_row: dict[str, Any],
    artifact_payload: dict[str, Any],
) -> tuple[Optional[dict[str, Any]], list[str]]:
    content_filter: dict[str, Any] = {}
    if session_row.get("content_filter_json"):
        try:
            parsed_filter = json.loads(session_row["content_filter_json"])
            if isinstance(parsed_filter, dict):
                content_filter = dict(parsed_filter)
        except (json.JSONDecodeError, TypeError):
            content_filter = {}

    default_mode = _default_session_mode_from_scope(
        content_filter.get("objective_scope")
    )
    normalized_payload, validation_errors = _validate_tutor_artifact_payload(
        artifact_payload, default_session_mode=default_mode
    )
    if validation_errors:
        return None, validation_errors
    assert normalized_payload is not None

    metadata = normalized_payload.get("metadata") or {}
    active_stage = _active_control_stage_for_session(conn, session_row)
    payload_stage = str(metadata.get("control_stage") or "").upper()
    if payload_stage == "PRIME" or active_stage == "PRIME":
        prime_violations = _prime_assessment_violations(normalized_payload)
        if prime_violations:
            return None, [f"prime_guardrail: {msg}" for msg in prime_violations]
    session_data = normalized_payload.get("session") or {}
    concepts = normalized_payload.get("concepts") or []
    module_name = _sanitize_module_name(
        content_filter.get("module_name") or session_row.get("topic") or "General Module"
    )
    topic = str(session_row.get("topic") or module_name).strip()
    subtopic = _sanitize_path_segment(topic or module_name, fallback=module_name)
    course_label = _resolve_class_label(session_row.get("course_id"))

    # Resolve course map metadata for frontmatter
    from course_map import load_course_map as _load_cm
    _cm = _load_cm()
    _mapped_course = _cm.resolve_course(course_label)
    _course_code = _mapped_course.code.replace("_", " ") if _mapped_course else ""
    _unit_type = _mapped_course.unit_type if _mapped_course else ""

    study_base = _study_notes_base_path(
        course_label=course_label,
        module_or_week=module_name,
        subtopic=subtopic,
    )
    now = datetime.now()
    date_key = now.strftime("%Y-%m-%d")
    topic_fragment = _sanitize_note_fragment(topic, fallback="Tutor_Session")
    session_path = f"{study_base}/Sessions/{date_key}_Session_{topic_fragment}.md"

    rendered_notes: dict[str, str] = {}
    saved_paths: list[str] = []
    concept_paths: list[str] = []

    session_markdown = _render_tutor_session_markdown(
        normalized_payload,
        session_id=session_id,
        topic=topic,
        module_name=module_name,
        course_label=course_label,
        course_code=_course_code,
        unit_type=_unit_type,
    )
    save_session = _merge_and_save_obsidian_note(
        path=session_path,
        content=session_markdown,
        session_id=session_id,
    )
    if not save_session.get("success"):
        return None, [str(save_session.get("error") or "failed_to_save_session_note")]
    rendered_notes[session_path] = str(save_session.get("content") or session_markdown)
    saved_paths.append(session_path)

    for concept in concepts:
        if not isinstance(concept, dict):
            continue
        name = str(concept.get("file_name") or "").strip()
        if not name:
            continue
        concept_fragment = _sanitize_note_fragment(name, fallback="Concept")
        concept_path = f"{study_base}/Concepts/{concept_fragment}.md"
        concept_markdown = _render_tutor_concept_markdown(
            concept,
            module_name=module_name,
            course_label=course_label,
            course_code=_course_code,
            unit_type=_unit_type,
        )
        save_concept = _merge_and_save_obsidian_note(
            path=concept_path,
            content=concept_markdown,
            session_id=session_id,
        )
        if not save_concept.get("success"):
            return None, [str(save_concept.get("error") or f"failed_to_save_{name}")]
        rendered_notes[concept_path] = str(save_concept.get("content") or concept_markdown)
        saved_paths.append(concept_path)
        concept_paths.append(concept_path)

    graph_sync = _sync_graph_for_paths(conn=conn, notes_by_path=rendered_notes)

    existing_artifacts = session_row.get("artifacts_json")
    artifacts = []
    if existing_artifacts:
        try:
            parsed_artifacts = json.loads(existing_artifacts)
            if isinstance(parsed_artifacts, list):
                artifacts = parsed_artifacts
        except (json.JSONDecodeError, TypeError):
            artifacts = []

    artifact_entry = {
        "type": "structured_notes",
        "created_at": now.isoformat(),
        "session_mode": metadata.get("session_mode"),
        "control_stage": metadata.get("control_stage"),
        "method_id": metadata.get("method_id"),
        "session_path": session_path,
        "concept_paths": concept_paths,
        "graph_sync": {
            "notes_synced": graph_sync.get("notes_synced", 0),
            "edges_created": graph_sync.get("edges_created", 0),
            "deleted": graph_sync.get("deleted", 0),
            "skipped": graph_sync.get("skipped", 0),
        },
    }
    artifacts.append(artifact_entry)

    content_filter["follow_up_targets"] = _normalize_wikilinks(
        session_data.get("follow_up_targets"), max_items=80
    )
    content_filter["reference_targets"] = _normalize_wikilinks(
        (content_filter.get("reference_targets") or [])
        + list(content_filter["follow_up_targets"]),
        max_items=80,
    )

    cur = conn.cursor()
    cur.execute(
        """UPDATE tutor_sessions
           SET artifacts_json = ?, content_filter_json = ?
           WHERE session_id = ?""",
        (
            json.dumps(artifacts),
            json.dumps(content_filter),
            session_id,
        ),
    )
    conn.commit()

    return (
        {
            "session_id": session_id,
            "type": "structured_notes",
            "session_path": session_path,
            "concept_paths": concept_paths,
            "saved_paths": saved_paths,
            "graph_sync": graph_sync,
            "artifact": artifact_entry,
        },
        [],
    )


def _reconcile_obsidian_state(session: dict) -> None:
    """Check whether Obsidian files referenced by a session still exist.

    Called on GET /session/<id> (reconcile-on-load).  Mutates *session* dict
    in place so the response reflects the current vault state.

    - North Star: if the file is missing, sets ``north_star.status`` to
      ``"needs_path"`` and persists the change to SQLite.
    - Artifacts: flags each artifact entry with ``"missing": True`` if its
      ``session_path`` or any of its ``concept_paths`` no longer exist.
    """
    from dashboard.api_adapter import obsidian_get_file

    session_id = session.get("session_id")
    if not session_id:
        return

    # --- North Star reconciliation ---
    cf_raw = session.get("content_filter_json")
    content_filter: Optional[dict] = None
    if cf_raw:
        try:
            content_filter = json.loads(cf_raw) if isinstance(cf_raw, str) else cf_raw
        except (json.JSONDecodeError, TypeError):
            content_filter = None

    ns_changed = False
    if content_filter and isinstance(content_filter.get("north_star"), dict):
        ns = content_filter["north_star"]
        ns_path = ns.get("path")
        ns_status = ns.get("status")
        # Only check if there's a path and the status isn't already needs_path
        if ns_path and ns_status not in ("needs_path", "test_mode_no_write"):
            result = obsidian_get_file(ns_path)
            if not result.get("success"):
                ns["status"] = "needs_path"
                ns_changed = True

    # --- Artifact reconciliation ---
    art_raw = session.get("artifacts_json")
    artifacts: list = []
    if art_raw:
        try:
            artifacts = json.loads(art_raw) if isinstance(art_raw, str) else art_raw
        except (json.JSONDecodeError, TypeError):
            artifacts = []
    if not isinstance(artifacts, list):
        artifacts = []

    art_changed = False
    for art in artifacts:
        if not isinstance(art, dict):
            continue
        missing_paths: list[str] = []

        sp = art.get("session_path")
        if sp:
            res = obsidian_get_file(sp)
            if not res.get("success"):
                missing_paths.append(sp)

        for cp in art.get("concept_paths") or []:
            res = obsidian_get_file(cp)
            if not res.get("success"):
                missing_paths.append(cp)

        if missing_paths:
            art["missing"] = True
            art["missing_paths"] = missing_paths
            art_changed = True
        else:
            # Clear stale flags from previous reconcile
            art.pop("missing", None)
            art.pop("missing_paths", None)

    # --- Learning-objective cleanup when North Star is gone ---
    # If the user deleted the North Star from Obsidian, the objectives that
    # lived inside it should also be removed from the dashboard (SQLite).
    lo_deleted = 0
    if ns_changed and content_filter is not None:
        ns = content_filter.get("north_star") or {}
        obj_ids: list[str] = ns.get("objective_ids") or []
        course_id = session.get("course_id")
        if obj_ids and course_id:
            try:
                conn_lo = get_connection()
                cur_lo = conn_lo.cursor()
                placeholders = ",".join("?" for _ in obj_ids)
                cur_lo.execute(
                    f"DELETE FROM learning_objectives WHERE course_id = ? AND lo_code IN ({placeholders})",
                    [course_id] + obj_ids,
                )
                lo_deleted = cur_lo.rowcount
                conn_lo.commit()
                conn_lo.close()
            except Exception:
                logging.getLogger(__name__).warning(
                    "reconcile_obsidian_state: failed to delete LOs for %s",
                    session_id,
                    exc_info=True,
                )
        if lo_deleted:
            logging.getLogger(__name__).info(
                "reconcile_obsidian_state: deleted %d orphaned LO(s) for session %s",
                lo_deleted,
                session_id,
            )

    # Persist changes to SQLite if anything was updated
    if ns_changed or art_changed:
        try:
            conn = get_connection()
            cur = conn.cursor()
            if ns_changed and content_filter is not None:
                cur.execute(
                    "UPDATE tutor_sessions SET content_filter_json = ? WHERE session_id = ?",
                    (json.dumps(content_filter), session_id),
                )
            if art_changed:
                cur.execute(
                    "UPDATE tutor_sessions SET artifacts_json = ? WHERE session_id = ?",
                    (json.dumps(artifacts), session_id),
                )
            conn.commit()
            conn.close()
        except Exception:
            logging.getLogger(__name__).warning(
                "reconcile_obsidian_state: failed to persist changes for %s",
                session_id,
                exc_info=True,
            )

    # Update the in-memory session dict so the response reflects reality
    if ns_changed and content_filter is not None:
        session["content_filter_json"] = json.dumps(content_filter)
        session["content_filter"] = content_filter
    if art_changed:
        session["artifacts_json"] = json.dumps(artifacts)


def _delete_artifact_obsidian_files(artifact: dict) -> list[str]:
    """Delete Obsidian files referenced by a single artifact entry.

    Returns a list of paths that were successfully deleted.
    """
    from dashboard.api_adapter import obsidian_delete_file

    deleted: list[str] = []
    sp = artifact.get("session_path")
    if sp:
        res = obsidian_delete_file(sp)
        if res.get("success"):
            deleted.append(sp)

    for cp in artifact.get("concept_paths") or []:
        res = obsidian_delete_file(cp)
        if res.get("success"):
            deleted.append(cp)

    return deleted


def _cascade_delete_obsidian_files(session: dict) -> list[str]:
    """Delete all Obsidian files owned by a session (North Star + artifacts).

    Called from ``delete_session`` before the DB rows are removed.
    Returns a list of vault-relative paths that were successfully deleted.
    """
    from dashboard.api_adapter import obsidian_delete_file

    log = logging.getLogger(__name__)
    deleted: list[str] = []

    # 1. North Star file
    cf_raw = session.get("content_filter_json")
    if cf_raw:
        try:
            cf = json.loads(cf_raw) if isinstance(cf_raw, str) else cf_raw
        except (json.JSONDecodeError, TypeError):
            cf = None
        if isinstance(cf, dict):
            ns = cf.get("north_star") or {}
            ns_path = ns.get("path")
            if ns_path:
                res = obsidian_delete_file(ns_path)
                if res.get("success"):
                    deleted.append(ns_path)
                else:
                    log.debug("cascade_delete: North Star not found at %s", ns_path)

    # 2. Artifact files (session notes + concept notes)
    art_raw = session.get("artifacts_json")
    if art_raw:
        try:
            artifacts = json.loads(art_raw) if isinstance(art_raw, str) else art_raw
        except (json.JSONDecodeError, TypeError):
            artifacts = []
        if isinstance(artifacts, list):
            for art in artifacts:
                if isinstance(art, dict):
                    deleted.extend(_delete_artifact_obsidian_files(art))

    if deleted:
        log.info(
            "cascade_delete: removed %d Obsidian file(s) for session %s",
            len(deleted),
            session.get("session_id"),
        )

    return deleted


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
        f"""SELECT id, method_id, name, control_stage, best_stage, description,
                   default_duration_min, evidence, facilitation_prompt, artifact_type, knob_overrides_json
            FROM method_blocks WHERE id IN ({placeholders})""",
        block_ids,
    )
    block_map = {r["id"]: dict(r) for r in cur.fetchall()}

    # Preserve chain order and normalise duration field for frontend
    ordered = []
    for bid in block_ids:
        if bid in block_map:
            b = block_map[bid]
            b["method_id"] = str(b.get("method_id") or "").strip()
            b["control_stage"] = str(b.get("control_stage") or "").strip().upper()
            b["knob_overrides_json"] = _safe_json_dict(b.get("knob_overrides_json"))
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
            "method_id": b.get("method_id", ""),
            "description": b.get("description", ""),
            "category": b.get("control_stage", ""),
            "control_stage": b.get("control_stage", ""),
            "evidence": b.get("evidence", ""),
            "duration": b.get("duration", 5),
            "facilitation_prompt": b.get("facilitation_prompt", ""),
            "artifact_type": b.get("artifact_type", ""),
            "knob_overrides_json": b.get("knob_overrides_json", {}),
        }

    # Chain overview
    chain_info = {
        "name": chain_row["name"],
        "blocks": [b["name"] for b in blocks],
        "current_index": current_index,
        "total": len(blocks),
    }

    return block_info, chain_info


def _get_chain_status(conn, session_id: str) -> Optional[dict]:
    """Build a chain-status dict for a tutor session.

    Returns None if session not found or has no chain assigned.
    Used by GET chain-status endpoint and POST advance-block.
    """
    session = _get_tutor_session(conn, session_id)
    if not session:
        return None

    chain_id = session.get("method_chain_id")
    if not chain_id:
        return None

    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, description FROM method_chains WHERE id = ?",
        (int(chain_id),),
    )
    chain_row = cur.fetchone()
    if not chain_row:
        return None

    blocks = _resolve_chain_blocks(conn, int(chain_id))
    if not blocks:
        return None

    current_pos = session.get("current_block_index", 0) or 0
    try:
        current_pos = int(current_pos)
    except (TypeError, ValueError):
        current_pos = 0
    current_pos = max(0, min(current_pos, len(blocks) - 1))

    def _block_summary(b: dict) -> dict:
        return {
            "id": b.get("id"),
            "name": b.get("name", ""),
            "method_id": b.get("method_id", ""),
            "description": b.get("description", ""),
            "category": b.get("control_stage", ""),
            "knobs": b.get("knob_overrides_json") or {},
            "duration": b.get("duration") or b.get("default_duration_min", 5),
            "facilitation_prompt": b.get("facilitation_prompt", ""),
            "artifact_type": b.get("artifact_type", ""),
        }

    total = len(blocks)
    current_block = _block_summary(blocks[current_pos])
    next_block = _block_summary(blocks[current_pos + 1]) if current_pos + 1 < total else None
    completed = [b["name"] for b in blocks[:current_pos]]
    remaining = [b["name"] for b in blocks[current_pos + 1:]]
    progress_pct = int(round(current_pos / total * 100)) if total else 0

    return {
        "chain_name": chain_row["name"],
        "chain_id": chain_row["id"],
        "total_blocks": total,
        "current_position": current_pos,
        "current_block": current_block,
        "next_block": next_block,
        "completed_blocks": completed,
        "remaining_blocks": remaining,
        "progress_pct": progress_pct,
        "is_complete": current_pos >= total - 1 and total > 0,
    }


def _active_control_stage_for_session(
    conn: sqlite3.Connection,
    session_row: dict[str, Any],
) -> str:
    chain_id = session_row.get("method_chain_id")
    if not chain_id:
        return ""
    blocks = _resolve_chain_blocks(conn, int(chain_id))
    if not blocks:
        return ""
    idx = session_row.get("current_block_index", 0) or 0
    try:
        idx = int(idx)
    except (TypeError, ValueError):
        idx = 0
    if idx < 0 or idx >= len(blocks):
        return ""
    return str(blocks[idx].get("control_stage") or "").upper()


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


def _update_video_job(job_id: str, **payload: Any) -> None:
    with VIDEO_JOBS_LOCK:
        job = VIDEO_JOBS.setdefault(job_id, {"job_id": job_id})
        job.update(payload)


def _trim_video_jobs() -> None:
    with VIDEO_JOBS_LOCK:
        if len(VIDEO_JOBS) <= VIDEO_JOB_RETENTION:
            return
        ordered_jobs = sorted(
            VIDEO_JOBS.items(),
            key=lambda item: str(item[1].get("started_at") or ""),
        )
        for old_job_id, _ in ordered_jobs[: len(VIDEO_JOBS) - VIDEO_JOB_RETENTION]:
            VIDEO_JOBS.pop(old_job_id, None)


def _launch_video_process_job(
    *,
    material_id: int,
    source_path: str,
    title: str,
    course_id: Optional[int],
    model_size: str = "base",
    language: Optional[str] = None,
    keyframe_interval_sec: int = 20,
) -> str:
    job_id = uuid.uuid4().hex
    _update_video_job(
        job_id,
        status="pending",
        phase="pending",
        material_id=material_id,
        source_path=source_path,
        title=title,
        model_size=model_size,
        language=language,
        keyframe_interval_sec=keyframe_interval_sec,
        started_at=datetime.now().isoformat(),
        finished_at=None,
        last_error=None,
        manifest=None,
        ingest_result=None,
    )
    _trim_video_jobs()

    def _runner() -> None:
        try:
            from video_ingest_bridge import ingest_video_artifacts
            from video_ingest_local import process_video

            _update_video_job(job_id, status="running", phase="processing")
            manifest = process_video(
                source_path,
                model_size=model_size,
                language=language,
                keyframe_interval_sec=keyframe_interval_sec,
            )
            _update_video_job(job_id, phase="ingesting", manifest=manifest)

            artifacts = (manifest or {}).get("artifacts") or {}
            transcript_md_path = str(artifacts.get("transcript_md_path") or "")
            visual_notes_md_path = str(artifacts.get("visual_notes_md_path") or "")
            if not transcript_md_path or not visual_notes_md_path:
                raise RuntimeError("Video processing did not return markdown artifact paths.")

            ingest_result = ingest_video_artifacts(
                material_id=material_id,
                source_video_path=source_path,
                transcript_md_path=transcript_md_path,
                visual_notes_md_path=visual_notes_md_path,
                course_id=course_id,
                corpus="materials",
            )
            _update_video_job(
                job_id,
                status="completed",
                phase="completed",
                ingest_result=ingest_result,
            )
        except Exception as exc:
            _update_video_job(
                job_id,
                status="failed",
                phase="failed",
                last_error=str(exc),
            )
        finally:
            _update_video_job(job_id, finished_at=datetime.now().isoformat())

    Thread(target=_runner, daemon=True).start()
    return job_id


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


def _compact_sync_result_for_status(sync_result: Any) -> Any:
    """Trim large sync payloads so status polling stays lightweight."""
    if not isinstance(sync_result, dict):
        return sync_result

    raw_errors = sync_result.get("errors")
    errors = [str(item) for item in raw_errors] if isinstance(raw_errors, list) else []
    error_preview_limit = 20
    preview_errors = errors[:error_preview_limit]

    raw_doc_ids = sync_result.get("doc_ids")
    doc_ids_count = len(raw_doc_ids) if isinstance(raw_doc_ids, list) else 0

    return {
        "ok": bool(sync_result.get("ok")),
        "total": int(sync_result.get("total") or 0),
        "processed": int(sync_result.get("processed") or 0),
        "failed": int(sync_result.get("failed") or len(errors)),
        "errors": preview_errors,
        "errors_total": len(errors),
        "errors_truncated": len(errors) > error_preview_limit,
        "doc_ids_count": doc_ids_count,
    }


def _compact_embed_result_for_status(embed_result: Any) -> Any:
    if not isinstance(embed_result, dict):
        return embed_result

    if "error" in embed_result and embed_result.get("error"):
        return {"error": str(embed_result.get("error"))}

    return {
        "embedded": int(embed_result.get("embedded") or 0),
        "skipped": int(embed_result.get("skipped") or 0),
        "total_chunks": int(embed_result.get("total_chunks") or 0),
    }


def _material_asset_hash_candidates(source_path: Optional[str], file_path: Optional[str]) -> list[str]:
    """Build hash candidates that match text_extractor's extracted_images folder naming."""
    raw_candidates: list[str] = []
    for raw in (file_path, source_path):
        value = str(raw or "").strip()
        if not value:
            continue
        raw_candidates.append(value)
        raw_candidates.append(value.replace("/", "\\"))
        raw_candidates.append(value.replace("\\", "/"))
        try:
            resolved = str(Path(value).expanduser().resolve())
            raw_candidates.append(resolved)
            raw_candidates.append(resolved.replace("/", "\\"))
            raw_candidates.append(resolved.replace("\\", "/"))
        except Exception:
            pass

    seen: set[str] = set()
    hashes: list[str] = []
    for candidate in raw_candidates:
        normalized = candidate.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        digest = hashlib.md5(normalized.encode("utf-8")).hexdigest()[:12]
        if digest not in hashes:
            hashes.append(digest)
    return hashes


def _find_extracted_asset_dir(source_path: Optional[str], file_path: Optional[str]) -> Optional[Path]:
    if not EXTRACTED_IMAGES_ROOT.exists():
        return None
    for digest in _material_asset_hash_candidates(source_path, file_path):
        candidate = EXTRACTED_IMAGES_ROOT / digest
        if candidate.exists() and candidate.is_dir():
            return candidate
    return None


def _inject_extracted_images(
    content: str,
    *,
    material_id: int,
    asset_dir: Optional[Path],
) -> str:
    """Replace Docling <!-- image --> placeholders with served markdown image links."""
    if not content or not _IMAGE_PLACEHOLDER_PATTERN.search(content):
        return content
    if not asset_dir or not asset_dir.exists():
        return _IMAGE_PLACEHOLDER_PATTERN.sub("", content)

    image_files = sorted(
        [
            path
            for path in asset_dir.iterdir()
            if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
        ],
        key=lambda path: path.name.lower(),
    )
    if not image_files:
        return _IMAGE_PLACEHOLDER_PATTERN.sub("", content)

    index = {"value": 0}

    def _replace(_match: re.Match[str]) -> str:
        current = index["value"]
        index["value"] += 1
        if current >= len(image_files):
            return ""
        filename = quote(image_files[current].name.replace("\\", "/"))
        return f"\n![Extracted image {current + 1}](/api/tutor/materials/{material_id}/asset/{filename})\n"

    return _IMAGE_PLACEHOLDER_PATTERN.sub(_replace, content)


def _rewrite_extracted_image_links(
    content: str,
    *,
    material_id: int,
    asset_dir: Optional[Path],
) -> str:
    """Rewrite markdown image links to tutor asset URLs when they reference local files."""
    if not content or "![" not in content:
        return content
    if not asset_dir or not asset_dir.exists():
        return content

    valid_files = {
        path.name.lower()
        for path in asset_dir.iterdir()
        if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
    }
    if not valid_files:
        return content

    pattern = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")

    def _replace(match: re.Match[str]) -> str:
        alt = match.group(1)
        raw_url = match.group(2).strip().strip("<>").strip("'\"")
        if not raw_url:
            return match.group(0)
        lowered = raw_url.lower()
        if lowered.startswith("http://") or lowered.startswith("https://") or lowered.startswith("/api/tutor/materials/"):
            return match.group(0)

        normalized = raw_url.replace("\\", "/")
        filename = Path(normalized).name
        if not filename or filename.lower() not in valid_files:
            return match.group(0)
        encoded = quote(filename)
        return f"![{alt}](/api/tutor/materials/{material_id}/asset/{encoded})"

    return pattern.sub(_replace, content)


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
    north_star_refresh = bool(
        data.get(
            "north_star_refresh",
            (content_filter.get("north_star_refresh") if isinstance(content_filter, dict) else False),
        )
    )

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

    vault_folder = str((content_filter or {}).get("vault_folder") or "").strip() or None
    north_star_ctx, north_star_error = _ensure_north_star_context(
        course_id=int(course_id) if course_id is not None else None,
        module_id=module_id,
        module_name=module_name,
        topic=topic,
        learning_objectives=learning_objectives,
        source_ids=source_ids,
        force_refresh=north_star_refresh,
        path_override=vault_folder,
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
    if north_star_refresh:
        content_filter["north_star_refresh"] = True

    if north_star_ctx:
        module_prefix = str(Path(str(north_star_ctx["path"])).parent).replace("\\", "/")
        content_filter["module_name"] = north_star_ctx.get("module_name")
        content_filter["module_prefix"] = module_prefix
        content_filter["north_star"] = {
            "path": north_star_ctx.get("path"),
            "status": north_star_ctx.get("status"),
            "module_name": north_star_ctx.get("module_name"),
            "course_name": north_star_ctx.get("course_name"),
            "subtopic_name": north_star_ctx.get("subtopic_name"),
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
        if not blocks:
            conn.close()
            return jsonify(
                {
                    "error": "Method chain has no blocks.",
                    "code": "CHAIN_EMPTY",
                    "method_chain_id": method_chain_id,
                }
            ), 400
        first_block = blocks[0]
        first_stage = str(first_block.get("control_stage") or "").upper()
        if first_stage != "PRIME":
            conn.close()
            return jsonify(
                {
                    "error": "Method chain must start with PRIME.",
                    "code": "CHAIN_PRIME_REQUIRED",
                    "method_chain_id": method_chain_id,
                    "first_block_name": first_block.get("name"),
                    "first_block_stage": first_stage or "UNKNOWN",
                }
            ), 400
        launch_issues = _validate_chain_launch_blocks(blocks)
        if launch_issues:
            conn.close()
            return jsonify(
                {
                    "error": "Method chain contains stage mismatches versus canonical method contracts.",
                    "code": "METHOD_STAGE_MISMATCH",
                    "method_chain_id": method_chain_id,
                    "details": launch_issues,
                }
            ), 400
        first_block_name = first_block["name"]
        cur.execute(
            """INSERT INTO tutor_block_transitions
               (tutor_session_id, block_id, block_index, started_at)
               VALUES (?, ?, 0, ?)""",
            (session_id, first_block["id"], now),
        )

        # Populate session_chains for this chain+topic combo
        try:
            chain_row = cur.execute(
                "SELECT name FROM method_chains WHERE id = ?",
                (method_chain_id,),
            ).fetchone()
            if chain_row:
                chain_name = chain_row[0]
                existing = cur.execute(
                    "SELECT id, session_ids_json FROM session_chains WHERE chain_name = ? AND topic = ?",
                    (chain_name, topic),
                ).fetchone()
                if existing:
                    ids = json.loads(existing[1] or "[]")
                    ids.append(session_id)
                    cur.execute(
                        "UPDATE session_chains SET session_ids_json = ?, updated_at = ? WHERE id = ?",
                        (json.dumps(ids), now, existing[0]),
                    )
                else:
                    cur.execute(
                        """INSERT INTO session_chains (chain_name, topic, session_ids_json, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?)""",
                        (chain_name, topic, json.dumps([session_id]), now, now),
                    )
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                "Failed to populate session_chains", exc_info=True
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
            "course_name": north_star_ctx.get("course_name"),
            "subtopic_name": north_star_ctx.get("subtopic_name"),
            "objective_ids": north_star_ctx.get("objective_ids") or [],
        }
        response["objective_scope"] = content_filter.get("objective_scope") or "module_all"
        response["focus_objective_id"] = content_filter.get("focus_objective_id")
        response["reference_targets_count"] = len(
            north_star_ctx.get("reference_targets") or []
        )

    # --- Method recommendations from Scholar data ---
    try:
        from dashboard.method_analysis import get_context_recommendations

        rec_context: dict[str, Any] = {}
        if isinstance(content_filter, dict):
            rec_context["stage"] = content_filter.get("stage")
            rec_context["energy"] = content_filter.get("energy")
            rec_context["class_type"] = content_filter.get("class_type")
        recs = get_context_recommendations(**{k: v for k, v in rec_context.items() if v})
        if recs:
            response["recommended_chains"] = recs
    except Exception:
        pass  # Best-effort — don't block session creation

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

    # --- Reconcile-on-load: verify Obsidian files still exist ---
    _reconcile_obsidian_state(session)

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
    active_stage = str((block_info or {}).get("category") or "").upper()
    active_method_id = str((block_info or {}).get("method_id") or "").strip()
    method_contract = _load_method_contracts().get(active_method_id, {}) if active_method_id else {}
    runtime_drift_events: list[dict[str, Any]] = []
    if block_info and active_method_id:
        expected_stage = str(method_contract.get("control_stage") or "").strip().upper()
        if expected_stage and active_stage and expected_stage != active_stage:
            conn.close()
            return (
                jsonify(
                    {
                        "error": "Active block stage does not match canonical method contract.",
                        "code": "METHOD_STAGE_MISMATCH_RUNTIME",
                        "active_stage": active_stage,
                        "method_id": active_method_id,
                        "expected_stage": expected_stage,
                    }
                ),
                409,
            )

        prompt_db = str(block_info.get("facilitation_prompt") or "").strip()
        prompt_contract = str(method_contract.get("facilitation_prompt") or "").strip()
        if not prompt_db and prompt_contract:
            block_info["facilitation_prompt"] = prompt_contract
            runtime_drift_events.append(
                {
                    "severity": "warning",
                    "code": "MISSING_METHOD_PROMPT_FILLED",
                    "method_id": active_method_id,
                    "source": "yaml_contract",
                }
            )
            prompt_db = prompt_contract

        artifact_db = str(block_info.get("artifact_type") or "").strip()
        artifact_contract = str(method_contract.get("artifact_type") or "").strip()
        if not artifact_db and artifact_contract:
            block_info["artifact_type"] = artifact_contract
            runtime_drift_events.append(
                {
                    "severity": "warning",
                    "code": "MISSING_ARTIFACT_CONTRACT_FILLED",
                    "method_id": active_method_id,
                    "source": "yaml_contract",
                }
            )
            artifact_db = artifact_contract

        critical_issues: list[str] = []
        if not prompt_db:
            critical_issues.append("missing_method_prompt")
        if not artifact_db:
            critical_issues.append("missing_artifact_contract")
        if critical_issues:
            conn.close()
            return (
                jsonify(
                    {
                        "error": "Critical method contract drift detected for active block.",
                        "code": "METHOD_CONTRACT_DRIFT",
                        "active_stage": active_stage,
                        "method_id": active_method_id,
                        "critical_issues": critical_issues,
                    }
                ),
                409,
            )

    behavior_override_norm = str(behavior_override or "").strip().lower()
    if active_stage == "PRIME" and behavior_override_norm in {"evaluate", "teach_back"}:
        conn.close()
        return (
            jsonify(
                {
                    "error": "Assessment behavior is blocked in PRIME. Move to CALIBRATE for scored checks.",
                    "code": "PRIME_ASSESSMENT_BLOCKED",
                    "active_stage": "PRIME",
                }
            ),
            400,
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
    if active_method_id:
        snapshot = content_filter.get("knob_snapshot")
        if not isinstance(snapshot, dict) or not snapshot:
            fallback_snapshot = {}
            contract_defaults = method_contract.get("knob_defaults")
            if isinstance(contract_defaults, dict):
                fallback_snapshot.update(contract_defaults)
            if not fallback_snapshot:
                fallback_snapshot = _extract_knob_defaults(
                    (block_info or {}).get("knob_overrides_json")
                )
            content_filter["knob_snapshot"] = fallback_snapshot
            runtime_drift_events.append(
                {
                    "severity": "warning",
                    "code": "MISSING_KNOB_SNAPSHOT_FILLED",
                    "method_id": active_method_id,
                    "filled": bool(fallback_snapshot),
                }
            )

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

    # --- Mode flags (controls pipeline stages and model tier) ---
    # When mode is absent, preserve legacy behavior (all pipeline stages on,
    # full model, web search on, reasoning high). Only when the frontend
    # explicitly sends the mode object are the flags respected.
    _mode_provided = "mode" in data
    _mode = data.get("mode", {})
    _materials_on = bool(_mode.get("materials", not _mode_provided))
    _obsidian_on  = bool(_mode.get("obsidian",  not _mode_provided))
    _web_search_on = bool(_mode.get("web_search", not _mode_provided))
    _deep_think_on = bool(_mode.get("deep_think", False))

    # Note: codex_model (from content_filter.model) takes full precedence over the
    # mode-based tier selection. An explicit model override beats the toggle logic.
    _model = "gpt-5.3-codex" if (_deep_think_on or not _mode_provided) else "gpt-5.3-codex-spark"
    _reasoning_effort = "high" if (_deep_think_on or not _mode_provided) else None

    turn_number = session["turn_count"] + 1

    def generate():
        _LOG.debug(
            "generate() entered for session=%s turn=%d",
            session_id,
            session["turn_count"] + 1,
        )
        full_response = ""
        citations = []
        parsed_verdict = None
        api_model = codex_model or _model
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
            from llm_provider import call_codex_json
            from tutor_prompt_builder import build_prompt_with_contexts

            requested_accuracy_profile = accuracy_profile
            effective_accuracy_profile = requested_accuracy_profile
            effective_material_k = material_k
            effective_instruction_k = instruction_k
            rag_debug: dict[str, Any] = {}
            profile_escalated = False
            profile_escalation_reasons: list[str] = []

            # --- Unified context retrieval ---
            from tutor_context import build_context

            _depth = "none"
            if _materials_on and _obsidian_on:
                _depth = "auto"
            elif _materials_on:
                _depth = "materials"
            elif _obsidian_on:
                _depth = "notes"

            ctx = build_context(
                question,
                depth=_depth,
                course_id=retrieval_course_id,
                material_ids=material_ids,
                module_prefix=module_prefix or None,
                k_materials=effective_material_k,
            )
            rag_debug = ctx["debug"]

            material_text = ctx["materials"]
            instruction_text = ctx["instructions"]
            notes_context_text = ctx["notes"]

            # Graceful mode when no materials
            if not material_text:
                material_text = (
                    "No course-specific materials were retrieved for this topic. "
                    "Teach from your medical/PT training knowledge. "
                    "Mark such content as [From training knowledge — verify with your textbooks] "
                    "so the student knows to cross-reference."
                )

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
            _needs_lo_save = False
            _lo_save_called = False
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
                _needs_lo_save = (
                    not _session_has_real_objectives(north_star) and turn_number <= 5
                ) or (
                    north_star.get("status") == "needs_path" and turn_number <= 8
                )
                _is_needs_path = north_star.get("status") == "needs_path"
                if _needs_lo_save and _is_needs_path:
                    # Objectives exist in DB but North Star file was deleted
                    system_prompt += (
                        "\n\n## North Star File Missing\n"
                        "The North Star note was deleted from Obsidian but learning objectives "
                        "are still saved in the database. Before continuing, ask the student "
                        "where to re-save the North Star.\n"
                        '1. Ask: "Your North Star file was removed. '
                        'Where should I save your learning objectives? '
                        'Example: Study Notes/Movement Science/Construct 2/Hip and Pelvis"\n'
                        "2. Once the student provides a folder, call `save_learning_objectives` "
                        "with the existing objectives and the new `save_folder`.\n"
                        "3. If the student says skip or default, call `save_learning_objectives` "
                        "without `save_folder` to use the auto-generated path."
                    )
                elif _needs_lo_save:
                    system_prompt += (
                        "\n\n## Missing Learning Objectives\n"
                        "No learning objectives are set for this module yet. "
                        "You MUST resolve this before teaching content.\n"
                        '1. Ask the student: "I don\'t have learning objectives for this module yet. '
                        'Are they in your loaded study materials, or would you like to type them in?"\n'
                        "2. If in materials: scan the Retrieved Study Materials for ALL explicit learning objectives, "
                        "chapter goals, or key competencies. List EVERY objective found — do not summarize, combine, or truncate. "
                        "Number them sequentially: OBJ-1, OBJ-2, OBJ-3, etc. Format: OBJ-N \u2014 Full objective text\n"
                        "3. If student types them: acknowledge and number them the same way\n"
                        "4. If student says skip: proceed without objectives (use general teaching mode)\n"
                        '5. Ask for confirmation: "Are these objectives correct? [Approve / Edit / Skip]"\n'
                        "6. After approval, ask where to save in Obsidian: "
                        '"What folder should I save these to? Example: '
                        'Study Notes/Movement Science/Construct 2/Hip and Pelvis"\n'
                        "7. **IMPORTANT**: Once approved AND folder confirmed, call `save_learning_objectives`. "
                        "Pass `objectives` (array with `id` like \"OBJ-1\" and `description`) "
                        "and `save_folder` (the vault path the student provided). "
                        "If the student says 'default' or doesn't care, omit save_folder. "
                        "Do NOT skip this step or say you cannot save them."
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

            effective_model = codex_model or _model
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

            # Scholar method recommendations for this context
            try:
                from dashboard.method_analysis import get_context_recommendations as _get_recs

                rec_kw: dict[str, Any] = {}
                if isinstance(content_filter, dict):
                    for _rk in ("stage", "energy", "class_type"):
                        if content_filter.get(_rk):
                            rec_kw[_rk] = content_filter[_rk]
                if rec_kw:
                    recs = _get_recs(**rec_kw)
                    if recs:
                        rec_lines = [f"- {r['name']}" for r in recs[:3]]
                        system_prompt += (
                            "\n\n## Scholar-Recommended Methods\n"
                            "Based on past session ratings, these chains work well "
                            "for this context:\n" + "\n".join(rec_lines) + "\n"
                            "Mention these if the student asks which method to try next."
                        )
            except Exception:
                pass  # Best-effort

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

            api_model = codex_model or _model
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
                payload["active_stage"] = active_stage
                payload["active_method_id"] = active_method_id
                if runtime_drift_events:
                    payload["runtime_drift_events"] = runtime_drift_events
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
                _LOG.info(
                    "Tutor tools: %d schemas loaded — %s | needs_lo_save=%s turn=%d",
                    len(tool_schemas),
                    [s.get("name") for s in tool_schemas],
                    _needs_lo_save,
                    turn_number,
                )
                max_tool_rounds = 5
                tool_round = 0
                pending_tool_results: list[dict] = []

                try:
                    stream_kwargs: dict = {
                        "model": codex_model or _model,
                        "timeout": 120,
                        "web_search": _web_search_on,
                        "tools": tool_schemas,
                        "reasoning_effort": _reasoning_effort,
                    }
                    # Hint the model to call save_learning_objectives when
                    # the missing-LO directive is active and the student has
                    # had at least one turn to approve (turn >= 2).
                    if _needs_lo_save and turn_number >= 2:
                        stream_kwargs["tool_choice"] = "required"
                    _LOG.info(
                        "Tutor stream_kwargs: model=%s tool_choice=%s tools_count=%d",
                        stream_kwargs.get("model"),
                        stream_kwargs.get("tool_choice", "auto(default)"),
                        len(stream_kwargs.get("tools", [])),
                    )
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

                        for chunk in _llm_provider.stream_chatgpt_responses(
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

                            # Re-merge content_filter after LO save to prevent
                            # the turn-end UPDATE from clobbering the tool's DB write.
                            if (
                                tool_name == "save_learning_objectives"
                                and tool_result.get("success")
                            ):
                                _lo_save_called = True
                                try:
                                    _cf_conn = get_connection()
                                    _cf_row = _get_tutor_session(_cf_conn, session_id)
                                    _cf_conn.close()
                                    if _cf_row and _cf_row.get("content_filter_json"):
                                        _fresh = _json.loads(_cf_row["content_filter_json"])
                                        if isinstance(_fresh, dict):
                                            content_filter.update(_fresh)
                                except Exception:
                                    pass

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

                # --- Auto-invocation fallback ---
                # If the LO-save directive was active but the model never
                # called save_learning_objectives, try to extract objectives
                # from the model's text response and invoke the tool ourselves.
                if _needs_lo_save and not _lo_save_called and full_response:
                    extracted = _extract_objectives_from_text(full_response)
                    if extracted:
                        _LOG.info(
                            "Auto-invoking save_learning_objectives "
                            "(model failed to call tool): %d objectives",
                            len(extracted),
                        )
                        from tutor_tools import execute_save_learning_objectives

                        tool_result = execute_save_learning_objectives(
                            {"objectives": extracted},
                            session_id=session_id,
                        )
                        if tool_result.get("success"):
                            _lo_save_called = True
                            try:
                                _cf_conn = get_connection()
                                _cf_row = _get_tutor_session(
                                    _cf_conn, session_id
                                )
                                _cf_conn.close()
                                if _cf_row and _cf_row.get(
                                    "content_filter_json"
                                ):
                                    _fresh = json.loads(
                                        _cf_row["content_filter_json"]
                                    )
                                    if isinstance(_fresh, dict):
                                        content_filter.update(_fresh)
                            except Exception:
                                pass
                            yield format_sse_chunk(
                                "\n\n---\n"
                                "*Learning objectives saved automatically.*\n",
                            )
                        else:
                            _LOG.warning(
                                "Auto-invoke save_learning_objectives "
                                "failed: %s",
                                tool_result.get("error"),
                            )

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
# GET /api/tutor/session/<id>/chain-status — Full chain progress for session
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/chain-status", methods=["GET"])
def get_chain_status(session_id: str):
    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    status = _get_chain_status(conn, session_id)
    conn.close()
    if not status:
        return jsonify({"error": "Session has no method chain"}), 400

    return jsonify(status)


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
        # Already at last block — return current chain status
        status = _get_chain_status(conn, session_id)
        conn.close()
        return jsonify(status or {"error": "Chain status unavailable"})

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

    data = request.get_json(silent=True) or {}
    block_notes = str(data.get("block_notes") or "").strip()
    if block_notes:
        cur.execute(
            """UPDATE tutor_block_transitions
               SET notes = ?
               WHERE tutor_session_id = ? AND block_index = ? AND ended_at = ?""",
            (block_notes, session_id, current_idx, now),
        )

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

    status = _get_chain_status(conn, session_id)
    conn.close()

    return jsonify(status or {"error": "Chain status unavailable"})


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

    # --- Compute summary data ---
    conn.row_factory = sqlite3.Row
    cur2 = conn.cursor()

    # Turn count
    cur2.execute(
        "SELECT COUNT(*) AS cnt FROM tutor_turns WHERE tutor_session_id = ?",
        (session_id,),
    )
    turn_count = cur2.fetchone()["cnt"]

    # Duration in minutes (from created_at to now)
    created_at_str = session.get("created_at") or now.isoformat()
    try:
        created_at = datetime.fromisoformat(created_at_str)
        duration_minutes = round((now - created_at).total_seconds() / 60, 1)
    except (ValueError, TypeError):
        duration_minutes = 0

    # Parse artifacts_json and group by type
    artifacts_json_raw = session.get("artifacts_json")
    artifacts_list: list[dict[str, Any]] = []
    if artifacts_json_raw:
        try:
            parsed = json.loads(artifacts_json_raw)
            if isinstance(parsed, list):
                artifacts_list = parsed
        except (json.JSONDecodeError, TypeError):
            pass

    artifact_summary: dict[str, int] = {}
    for art in artifacts_list:
        if isinstance(art, dict):
            art_type = art.get("type") or art.get("artifact_type") or "unknown"
            artifact_summary[art_type] = artifact_summary.get(art_type, 0) + 1

    # Parse content_filter_json for objective_ids and chain_name
    content_filter_raw = session.get("content_filter_json")
    content_filter: dict[str, Any] = {}
    if content_filter_raw:
        try:
            content_filter = json.loads(content_filter_raw)
            if not isinstance(content_filter, dict):
                content_filter = {}
        except (json.JSONDecodeError, TypeError):
            pass

    north_star = content_filter.get("north_star") or {}
    objective_ids = north_star.get("objective_ids") or []
    chain_name = content_filter.get("chain_name") or None
    vault_folder = content_filter.get("vault_folder") or None

    # --- Auto-sync vault graph ---
    graph_sync_result: Optional[dict[str, Any]] = None
    try:
        note_paths: list[str] = []
        for art in artifacts_list:
            if not isinstance(art, dict):
                continue
            for key in ("path", "session_path"):
                val = art.get(key)
                if isinstance(val, str) and val.strip():
                    note_paths.append(val.strip())
            concept_paths = art.get("concept_paths")
            if isinstance(concept_paths, list):
                note_paths.extend(
                    str(cp).strip()
                    for cp in concept_paths
                    if isinstance(cp, str) and cp.strip()
                )

        # Deduplicate
        seen: set[str] = set()
        dedup_paths: list[str] = []
        for p in note_paths:
            if p not in seen:
                seen.add(p)
                dedup_paths.append(p)

        if dedup_paths:
            from dashboard.api_adapter import obsidian_get_file

            notes_by_path: dict[str, str] = {}
            for path in dedup_paths:
                note_res = obsidian_get_file(path)
                if note_res.get("success"):
                    notes_by_path[path] = str(note_res.get("content") or "")

            if notes_by_path:
                graph_sync_result = _sync_graph_for_paths(
                    conn=conn, notes_by_path=notes_by_path,
                )
                _LOG.info(
                    "end_session graph sync: %d notes, %d edges created",
                    graph_sync_result.get("notes_synced", 0),
                    graph_sync_result.get("edges_created", 0),
                )
    except Exception as exc:
        _LOG.warning("end_session graph sync failed: %s", exc)

    # --- Refresh North Star if objectives exist ---
    north_star_refresh: Optional[dict[str, Any]] = None
    if objective_ids:
        try:
            ns_result, ns_err = _ensure_north_star_context(
                course_id=content_filter.get("course_id"),
                module_id=content_filter.get("module_id"),
                module_name=content_filter.get("module_name"),
                topic=session.get("topic") or "",
                learning_objectives=north_star.get("objectives") or objective_ids,
                source_ids=content_filter.get("source_ids") or [],
                force_refresh=True,
                path_override=vault_folder,
            )
            if ns_result:
                north_star_refresh = {"path": ns_result.get("path"), "updated": True}
            elif ns_err:
                _LOG.warning("end_session North Star refresh error: %s", ns_err)
        except Exception as exc:
            _LOG.warning("end_session North Star refresh failed: %s", exc)

    # --- Auto-capture method_ratings for completed blocks ---
    ratings_captured = 0
    try:
        cur_rt = conn.cursor()
        cur_rt.execute(
            """SELECT block_slug, block_index, notes, started_at, ended_at
               FROM tutor_block_transitions
               WHERE tutor_session_id = ? AND ended_at IS NOT NULL""",
            (session_id,),
        )
        completed_blocks = cur_rt.fetchall()

        method_chain_id = session.get("method_chain_id")
        rating_context = json.dumps({
            "course_id": content_filter.get("course_id"),
            "module_id": content_filter.get("module_id"),
            "topic": session.get("topic"),
            "session_mode": content_filter.get("session_mode"),
        })

        for block_row in completed_blocks:
            slug = block_row["block_slug"]
            notes = block_row["notes"]

            cur_rt.execute(
                "SELECT id FROM method_blocks WHERE slug = ?",
                (slug,),
            )
            mb_row = cur_rt.fetchone()
            if not mb_row:
                continue
            mb_id = mb_row["id"]

            cur_rt.execute(
                """INSERT INTO method_ratings
                   (method_block_id, chain_id, session_id,
                    effectiveness, engagement, notes, context)
                   VALUES (?, ?, ?, 3, 3, ?, ?)""",
                (mb_id, method_chain_id, brain_session_id, notes, rating_context),
            )
            ratings_captured += 1

        if ratings_captured:
            conn.commit()
    except Exception as exc:
        _LOG.warning("end_session auto-capture method_ratings failed: %s", exc)

    # --- Lightweight janitor pass on touched folder ---
    janitor_result: Optional[dict[str, Any]] = None
    if vault_folder:
        try:
            from vault_janitor import scan_vault
            scan = scan_vault(folder=vault_folder, checks=["missing_frontmatter"])
            janitor_result = {
                "folder": vault_folder,
                "issues_found": len(scan.issues),
                "fixable": sum(1 for i in scan.issues if i.fixable),
            }
        except Exception as exc:
            _LOG.warning("end_session janitor pass failed: %s", exc)

    conn.close()

    return jsonify(
        {
            "session_id": session_id,
            "status": "completed",
            "brain_session_id": brain_session_id,
            "ended_at": now.isoformat(),
            "summary": {
                "turn_count": turn_count,
                "duration_minutes": duration_minutes,
                "artifacts": artifact_summary,
                "objective_ids": objective_ids,
                "chain_name": chain_name,
                "ratings_captured": ratings_captured,
            },
            "graph_sync": graph_sync_result,
            "north_star_refresh": north_star_refresh,
            "janitor": janitor_result,
        }
    )


# ---------------------------------------------------------------------------
# GET /api/tutor/session/<id>/summary — Full session summary + optional Obsidian save
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/summary", methods=["GET"])
def get_session_summary(session_id: str):
    """Return full session summary and optionally save wrap note to Obsidian.

    Query params:
      ?save=true  — also render and save session wrap note to Obsidian
    """
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    now = datetime.now()

    # --- Turn count ---
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) AS cnt FROM tutor_turns WHERE tutor_session_id = ?",
        (session_id,),
    )
    turn_count = cur.fetchone()["cnt"]

    # --- Duration ---
    created_at_str = session.get("created_at") or now.isoformat()
    try:
        created_at = datetime.fromisoformat(created_at_str)
        duration_minutes = round((now - created_at).total_seconds() / 60, 1)
    except (ValueError, TypeError):
        duration_minutes = 0

    # --- Artifacts ---
    artifacts_json_raw = session.get("artifacts_json")
    artifacts_list: list[dict[str, Any]] = []
    if artifacts_json_raw:
        try:
            parsed = json.loads(artifacts_json_raw)
            if isinstance(parsed, list):
                artifacts_list = parsed
        except (json.JSONDecodeError, TypeError):
            pass

    artifact_counts: dict[str, int] = {}
    for art in artifacts_list:
        if isinstance(art, dict):
            art_type = art.get("type") or art.get("artifact_type") or "unknown"
            artifact_counts[art_type] = artifact_counts.get(art_type, 0) + 1

    # --- Content filter (objectives, chain, vault_folder) ---
    content_filter: dict[str, Any] = {}
    raw_cf = session.get("content_filter_json")
    if raw_cf:
        try:
            cf = json.loads(raw_cf)
            if isinstance(cf, dict):
                content_filter = cf
        except (json.JSONDecodeError, TypeError):
            pass

    north_star = content_filter.get("north_star") or {}
    objective_ids = north_star.get("objective_ids") or []
    chain_name = content_filter.get("chain_name") or None
    vault_folder = str(content_filter.get("vault_folder") or "").strip() or None
    module_name = north_star.get("module_name") or content_filter.get("module_name") or ""
    topic = session.get("topic") or module_name or "Session"
    session_mode = content_filter.get("session_mode") or "focused_batch"

    # --- Resolve objectives from DB for descriptions ---
    objectives_detail: list[dict[str, str]] = []
    if objective_ids:
        course_id = content_filter.get("course_id")
        if course_id:
            db_objs = _collect_objectives_from_db(course_id, content_filter.get("module_id"))
            obj_map = {o["objective_id"]: o for o in db_objs}
            for oid in objective_ids:
                obj = obj_map.get(oid, {})
                objectives_detail.append({
                    "id": oid,
                    "description": obj.get("title", oid),
                    "status": obj.get("status", "active"),
                })

    # --- Chain progress ---
    chain_status = None
    if chain_name:
        try:
            chain_status = _get_chain_status(conn, session_id)
        except Exception:
            pass

    chain_progress = ""
    blocks_completed: list[str] = []
    if chain_status:
        total = chain_status.get("total_blocks", 0)
        pos = chain_status.get("current_position", 0)
        chain_progress = f"{pos}/{total} blocks"
        blocks_completed = chain_status.get("completed_blocks") or []

    # --- Follow-up targets ---
    follow_up_targets = content_filter.get("follow_up_targets") or []

    conn.close()

    # --- Build summary response ---
    summary = {
        "session_id": session_id,
        "topic": topic,
        "module_name": module_name,
        "session_mode": session_mode,
        "turn_count": turn_count,
        "duration_minutes": duration_minutes,
        "artifacts": [
            {"type": t, "count": c} for t, c in artifact_counts.items()
        ],
        "objectives": objectives_detail,
        "chain_name": chain_name,
        "chain_progress": chain_progress,
        "blocks_completed": blocks_completed,
        "follow_up_targets": follow_up_targets,
    }

    # --- Optional: save wrap note to Obsidian ---
    wrap_saved = None
    if request.args.get("save", "").lower() == "true":
        try:
            from tutor_templates import render_template_artifact

            wrap_result = render_template_artifact("session_wrap", summary)
            if wrap_result.get("success"):
                from dashboard.api_adapter import obsidian_save_file

                if vault_folder:
                    wrap_path = f"{vault_folder}/_Session_Wrap_{now.strftime('%Y-%m-%d')}.md"
                else:
                    wrap_path = f"Study Notes/_Session_Wrap_{now.strftime('%Y-%m-%d')}.md"

                save_res = obsidian_save_file(wrap_path, wrap_result["content"])
                if save_res.get("success"):
                    wrap_saved = {"path": wrap_path, "saved": True}
                    _LOG.info("Session wrap saved to %s", wrap_path)
                else:
                    wrap_saved = {"path": wrap_path, "saved": False, "error": save_res.get("error")}
        except Exception as exc:
            _LOG.warning("Session wrap save failed: %s", exc)
            wrap_saved = {"saved": False, "error": str(exc)}

    response = dict(summary)
    if wrap_saved is not None:
        response["wrap_saved"] = wrap_saved

    return jsonify(response)


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
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    # --- Delete cascade: remove Obsidian files before deleting DB rows ---
    deleted_paths = _cascade_delete_obsidian_files(session)

    # --- Delete learning objectives linked to this session's North Star ---
    lo_deleted = 0
    cf_raw = session.get("content_filter_json")
    if cf_raw:
        try:
            cf = json.loads(cf_raw) if isinstance(cf_raw, str) else cf_raw
        except (json.JSONDecodeError, TypeError):
            cf = None
        if isinstance(cf, dict):
            ns = cf.get("north_star") or {}
            obj_ids: list[str] = ns.get("objective_ids") or []
            course_id = session.get("course_id")
            if obj_ids and course_id:
                cur_lo = conn.cursor()
                placeholders = ",".join("?" for _ in obj_ids)
                cur_lo.execute(
                    f"DELETE FROM learning_objectives WHERE course_id = ? AND lo_code IN ({placeholders})",
                    [course_id] + obj_ids,
                )
                lo_deleted = cur_lo.rowcount

    cur = conn.cursor()
    cur.execute("DELETE FROM tutor_turns WHERE tutor_session_id = ?", (session_id,))
    cur.execute(
        "DELETE FROM tutor_block_transitions WHERE tutor_session_id = ?", (session_id,)
    )
    cur.execute("DELETE FROM tutor_sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()

    return jsonify({
        "deleted": True,
        "session_id": session_id,
        "obsidian_deleted": deleted_paths,
        "objectives_deleted": lo_deleted,
    })


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/artifact — Create artifact mid-session
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/artifact", methods=["POST"])
def create_artifact(session_id: str):
    data = request.get_json(silent=True) or {}
    artifact_type = data.get("type")
    content = data.get("content", "")
    title = data.get("title", "")

    if artifact_type not in ("note", "card", "map", "structured_notes"):
        return jsonify({"error": "type must be 'note', 'card', 'map', or 'structured_notes'"}), 400

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    active_stage = _active_control_stage_for_session(conn, session)
    if active_stage == "PRIME":
        prime_violations = _prime_assessment_violations(data)
        if prime_violations:
            conn.close()
            return (
                jsonify(
                    {
                        "error": "validation_failed",
                        "code": "PRIME_ASSESSMENT_BLOCKED",
                        "details": [f"prime_guardrail: {msg}" for msg in prime_violations],
                    }
                ),
                400,
            )

    if artifact_type == "structured_notes":
        payload = data.get("artifact")
        if not isinstance(payload, dict):
            payload = data.get("payload")
        if not isinstance(payload, dict):
            payload = data
        result, errors = _finalize_structured_notes_for_session(
            conn=conn,
            session_id=session_id,
            session_row=session,
            artifact_payload=payload,
        )
        conn.close()
        if errors:
            return jsonify({"error": "validation_failed", "details": errors}), 400
        return jsonify(result), 201

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
# POST /api/tutor/session/<id>/finalize — Write structured tutor artifacts
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/finalize", methods=["POST"])
def finalize_session_artifacts(session_id: str):
    data = request.get_json(silent=True) or {}
    payload = data.get("artifact")
    if not isinstance(payload, dict):
        payload = data.get("payload")
    if not isinstance(payload, dict):
        return jsonify({"error": "artifact payload is required"}), 400

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    result, errors = _finalize_structured_notes_for_session(
        conn=conn,
        session_id=session_id,
        session_row=session,
        artifact_payload=payload,
    )
    conn.close()
    if errors:
        return jsonify({"error": "validation_failed", "details": errors}), 400
    return jsonify(result), 201


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/sync-graph — Re-sync graph for session notes
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/sync-graph", methods=["POST"])
def sync_session_graph(session_id: str):
    data = request.get_json(silent=True) or {}
    raw_paths = data.get("paths")

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    paths: list[str] = []
    if isinstance(raw_paths, list):
        paths = [str(p).strip() for p in raw_paths if str(p or "").strip()]
    else:
        artifacts_json = session.get("artifacts_json")
        if artifacts_json:
            try:
                artifacts = json.loads(artifacts_json)
            except (json.JSONDecodeError, TypeError):
                artifacts = []
            if isinstance(artifacts, list):
                for artifact in artifacts:
                    if not isinstance(artifact, dict):
                        continue
                    path = artifact.get("path")
                    if isinstance(path, str) and path.strip():
                        paths.append(path.strip())
                    session_path = artifact.get("session_path")
                    if isinstance(session_path, str) and session_path.strip():
                        paths.append(session_path.strip())
                    concept_paths = artifact.get("concept_paths")
                    if isinstance(concept_paths, list):
                        paths.extend(
                            str(cp).strip()
                            for cp in concept_paths
                            if isinstance(cp, str) and cp.strip()
                        )

    dedup_paths: list[str] = []
    seen_paths: set[str] = set()
    for path in paths:
        if path in seen_paths:
            continue
        seen_paths.add(path)
        dedup_paths.append(path)

    if not dedup_paths:
        conn.close()
        return jsonify({"error": "No note paths available for graph sync"}), 400

    from dashboard.api_adapter import obsidian_get_file

    notes_by_path: dict[str, str] = {}
    for path in dedup_paths:
        note_res = obsidian_get_file(path)
        if note_res.get("success"):
            notes_by_path[path] = str(note_res.get("content") or "")

    if not notes_by_path:
        conn.close()
        return jsonify({"error": "No readable notes found for graph sync"}), 400

    graph_sync = _sync_graph_for_paths(conn=conn, notes_by_path=notes_by_path)
    conn.close()
    return jsonify(
        {
            "session_id": session_id,
            "requested_paths": dedup_paths,
            "synced_paths": list(notes_by_path.keys()),
            "graph_sync": graph_sync,
        }
    )


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

    # Collect Obsidian paths from artifacts being removed, then delete
    deleted_paths: list[str] = []
    for i in sorted(set(indexes)):
        if 0 <= i < len(artifacts):
            art = artifacts[i]
            if isinstance(art, dict):
                deleted_paths.extend(
                    _delete_artifact_obsidian_files(art)
                )

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

    return jsonify({
        "deleted": len(indexes),
        "session_id": session_id,
        "obsidian_deleted": deleted_paths,
    })


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
    allowed_extensions = set(SUPPORTED_EXTENSIONS) | {".mp4"}
    if ext not in allowed_extensions:
        return jsonify(
            {
                "error": f"Unsupported file type: {ext}. Supported: {', '.join(sorted(allowed_extensions))}"
            }
        ), 400

    file_type = "mp4" if ext == ".mp4" else get_file_type(file.filename)
    if not file_type:
        return jsonify({"error": f"Could not infer file type from extension: {ext}"}), 400
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

    # Extract text (mp4 is processed in dedicated video pipeline, so keep upload fast).
    if ext == ".mp4":
        content = ""
        extraction_error = None
    else:
        extraction = extract_text(str(disk_path))
        content = extraction["content"]
        extraction_error = extraction["error"]

    # Insert into rag_docs
    import hashlib

    if content:
        checksum = hashlib.sha256(content.encode("utf-8")).hexdigest()
    else:
        hasher = hashlib.sha256()
        with disk_path.open("rb") as f:
            while True:
                chunk = f.read(1024 * 1024)
                if not chunk:
                    break
                hasher.update(chunk)
        checksum = hasher.hexdigest()

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
    # Skip for mp4 upload rows because they have no text until video processing runs.
    embedded = False
    if ext != ".mp4" and content and not extraction_error:
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
                   file_path,
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
        source_path = (material.get("source_path") or "").strip()
        file_path = (material.get("file_path") or "").strip()
        asset_dir = _find_extracted_asset_dir(source_path, file_path)
        asset_count = 0
        if asset_dir and asset_dir.exists():
            try:
                asset_count = len(
                    [
                        p
                        for p in asset_dir.iterdir()
                        if p.is_file()
                        and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
                    ]
                )
            except Exception:
                asset_count = 0
        material["has_docling_assets"] = asset_count > 0
        material["docling_asset_count"] = int(asset_count)

        try:
            if int(material.get("file_size") or 0) <= 0:
                if source_path and os.path.isfile(source_path):
                    material["file_size"] = os.path.getsize(source_path)
                    file_size_updates.append((material["file_size"], material["id"]))
        except Exception:
            # Keep safe zero fallback on any filesystem issue.
            material["file_size"] = int(material.get("file_size") or 0)
        material.pop("file_path", None)

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


@tutor_bp.route("/materials/<int:material_id>/reextract", methods=["POST"])
def reextract_material(material_id: int):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, source_path, file_path, doc_type, file_type, course_id, topic_tags,
               COALESCE(corpus, 'materials') AS corpus,
               COALESCE(folder_path, '') AS folder_path,
               COALESCE(enabled, 1) AS enabled
        FROM rag_docs
        WHERE id = ? AND COALESCE(corpus, 'materials') = 'materials'
        """,
        (material_id,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Material not found"}), 404

    source_path = str(row["file_path"] or row["source_path"] or "").strip()
    if not source_path or not Path(source_path).exists():
        return jsonify({"error": f"Source file not found: {source_path or '(empty)'}"}), 400

    doc_type = str(row["doc_type"] or row["file_type"] or "").strip().lower()
    if doc_type in {"ppt", "pptx"}:
        doc_type = "powerpoint"
    if doc_type == "upload":
        file_type = str(row["file_type"] or "").strip().lower()
        if file_type in {"ppt", "pptx"}:
            doc_type = "powerpoint"
        else:
            doc_type = file_type or doc_type

    if doc_type not in {"pdf", "docx", "powerpoint"}:
        return jsonify({"error": "Re-extract is supported for PDF, DOCX, and PPTX materials only"}), 400

    tags = [t.strip() for t in str(row["topic_tags"] or "").split(",") if t.strip()]

    try:
        from rag_notes import ingest_document

        ingest_document(
            path=source_path,
            doc_type=doc_type,
            course_id=row["course_id"],
            topic_tags=tags,
            corpus=str(row["corpus"] or "materials"),
            folder_path=str(row["folder_path"] or ""),
            enabled=int(row["enabled"] or 1),
        )
    except Exception as exc:
        return jsonify({"error": f"Re-extract failed: {exc}"}), 500

    asset_dir = _find_extracted_asset_dir(row["source_path"], row["file_path"])
    asset_count = 0
    if asset_dir and asset_dir.exists():
        try:
            asset_count = len(
                [
                    p
                    for p in asset_dir.iterdir()
                    if p.is_file()
                    and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
                ]
            )
        except Exception:
            asset_count = 0

    return jsonify(
        {
            "ok": True,
            "id": material_id,
            "has_docling_assets": asset_count > 0,
            "docling_asset_count": int(asset_count),
        }
    ), 200


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
        "SELECT id, title, source_path, file_path, file_type, content, course_id "
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
    asset_dir = _find_extracted_asset_dir(row["source_path"], row["file_path"])
    content = _inject_extracted_images(content, material_id=row["id"], asset_dir=asset_dir)
    content = _rewrite_extracted_image_links(content, material_id=row["id"], asset_dir=asset_dir)

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


@tutor_bp.route("/materials/<int:material_id>/asset/<path:asset_path>", methods=["GET"])
def get_material_asset(material_id: int, asset_path: str):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT id, source_path, file_path FROM rag_docs "
        "WHERE id = ? AND COALESCE(corpus, 'materials') = 'materials'",
        (material_id,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Material not found"}), 404

    normalized = str(asset_path or "").replace("\\", "/").split("?", 1)[0].split("#", 1)[0].strip("/")
    if not normalized:
        return jsonify({"error": "Invalid asset path"}), 400

    requested = Path(normalized)
    if requested.is_absolute() or ".." in requested.parts:
        return jsonify({"error": "Invalid asset path"}), 400

    asset_dir = _find_extracted_asset_dir(row["source_path"], row["file_path"])
    if not asset_dir:
        return jsonify({"error": "No extracted assets for this material"}), 404

    root = asset_dir.resolve()
    candidate = (asset_dir / requested).resolve()
    try:
        candidate.relative_to(root)
    except Exception:
        return jsonify({"error": "Invalid asset path"}), 400

    if not candidate.exists() or not candidate.is_file():
        return jsonify({"error": "Asset not found"}), 404

    return send_file(candidate)


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

    job["sync_result"] = _compact_sync_result_for_status(job.get("sync_result"))
    job["embed_result"] = _compact_embed_result_for_status(job.get("embed_result"))
    return jsonify(job), 200


# ---------------------------------------------------------------------------
# POST /api/tutor/materials/video/process — Process uploaded MP4 to study docs
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/video/process", methods=["POST"])
def process_video_material():
    data = request.get_json(silent=True) or {}
    material_id = data.get("material_id")
    if material_id is None:
        return jsonify({"error": "material_id is required"}), 400

    try:
        material_id_int = int(material_id)
    except (TypeError, ValueError):
        return jsonify({"error": "material_id must be an integer"}), 400

    model_size = str(data.get("model_size") or "base").strip() or "base"
    language = data.get("language")
    if language is not None:
        language = str(language).strip() or None
    try:
        keyframe_interval_sec = int(data.get("keyframe_interval_sec") or 20)
    except (TypeError, ValueError):
        return jsonify({"error": "keyframe_interval_sec must be an integer"}), 400
    keyframe_interval_sec = max(keyframe_interval_sec, 1)

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, source_path, file_path, title, course_id, file_type
        FROM rag_docs
        WHERE id = ?
          AND COALESCE(corpus, 'materials') = 'materials'
        """,
        (material_id_int,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Material not found"}), 404

    file_type = str(row["file_type"] or "").strip().lower()
    source_path = str(row["file_path"] or row["source_path"] or "").strip()
    if not source_path:
        return jsonify({"error": "Material file path is missing"}), 400
    if file_type != "mp4" and not source_path.lower().endswith(".mp4"):
        return jsonify({"error": "Material is not an mp4 video"}), 400
    if not Path(source_path).exists():
        return jsonify({"error": f"Material file not found on disk: {source_path}"}), 400

    job_id = _launch_video_process_job(
        material_id=material_id_int,
        source_path=source_path,
        title=str(row["title"] or ""),
        course_id=row["course_id"],
        model_size=model_size,
        language=language,
        keyframe_interval_sec=keyframe_interval_sec,
    )
    return jsonify(
        {
            "ok": True,
            "job_id": job_id,
            "material_id": material_id_int,
            "source_path": source_path,
        }
    ), 202


@tutor_bp.route("/materials/video/status/<job_id>", methods=["GET"])
def get_video_process_status(job_id: str):
    with VIDEO_JOBS_LOCK:
        job = dict(VIDEO_JOBS.get(job_id) or {})
    if not job:
        return jsonify({"error": "Video job not found"}), 404
    return jsonify(job), 200


# ---------------------------------------------------------------------------
# POST /api/tutor/materials/video/enrich — Enrich processed video via API
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/video/enrich", methods=["POST"])
def enrich_video_material():
    data = request.get_json(silent=True) or {}
    material_id = data.get("material_id")
    if material_id is None:
        return jsonify({"error": "material_id is required"}), 400

    try:
        material_id_int = int(material_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid material_id"}), 400

    mode = data.get("mode")

    conn = db_setup.get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, source_path, file_path, file_type, title FROM rag_docs WHERE id = ?",
        (material_id_int,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Material not found"}), 404

    source_path = str(row["file_path"] or row["source_path"] or "")
    file_type = str(row["file_type"] or "").lower()
    if file_type != "mp4" and not source_path.lower().endswith(".mp4"):
        return jsonify({"error": "Material is not an mp4 video"}), 400

    if not Path(source_path).exists():
        return jsonify({"error": f"Video file not found on disk: {source_path}"}), 400

    # Find the most recent segments.json for this video
    from video_ingest_local import VIDEO_INGEST_ROOT, _slugify
    slug = _slugify(Path(source_path).stem)
    matching_dirs = sorted(
        VIDEO_INGEST_ROOT.glob(f"{slug}_*"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    ) if VIDEO_INGEST_ROOT.exists() else []

    segments: list[dict] = []
    segments_path = None
    for d in matching_dirs:
        sp = d / "segments.json"
        if sp.exists():
            segments_path = sp
            import json as _json
            segments = _json.loads(sp.read_text(encoding="utf-8"))
            break

    if not segments:
        return jsonify({"error": "No processed segments found. Run video/process first."}), 400

    try:
        from video_enrich_api import enrich_video, emit_enrichment_markdown
        result = enrich_video(
            video_path=source_path,
            segments=segments,
            material_id=material_id_int,
            mode=mode,
        )

        # If enrichment produced results, emit markdown and ingest via RAG bridge
        if result.get("status") == "ok" and result.get("results"):
            output_dir = str(segments_path.parent) if segments_path else str(VIDEO_INGEST_ROOT)
            md_path = emit_enrichment_markdown(slug, result["results"], output_dir)
            result["enrichment_md_path"] = md_path

        return jsonify({"ok": True, "material_id": material_id_int, **result}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ── Tutor Settings (custom instructions) ─────────────────────────────────

_DEFAULT_CUSTOM_INSTRUCTIONS = (
    '1. **Source-Lock**: Always check Retrieved Study Materials first. '
    'If you answer from training knowledge instead, mark it as '
    '[From training knowledge — verify with your textbooks]. '
    'Cite materials using [Source: filename].\n'
    '2. **Define Abbreviations**: On first use of any abbreviation, '
    'spell it out — e.g., ACL (Anterior Cruciate Ligament), BP (Blood Pressure).\n'
    '3. **Be Interactive**: Keep replies short (≤2 paragraphs or ≤6 bullets). '
    'Work through ONE small step at a time. Always end with a question or '
    'next action for the student.'
)


@tutor_bp.route("/settings", methods=["GET"])
def get_tutor_settings():
    cfg = load_api_config()
    value = (cfg.get("tutor_custom_instructions") or "").strip()
    return jsonify({
        "custom_instructions": value if value else _DEFAULT_CUSTOM_INSTRUCTIONS,
    })


@tutor_bp.route("/settings", methods=["PUT"])
def put_tutor_settings():
    data = request.get_json(silent=True) or {}
    custom = data.get("custom_instructions")
    if custom is None:
        return jsonify({"error": "custom_instructions is required"}), 400
    if not isinstance(custom, str):
        return jsonify({"error": "custom_instructions must be a string"}), 400

    cfg = load_api_config()
    cfg["tutor_custom_instructions"] = custom.strip()
    save_api_config(cfg)
    return jsonify({
        "custom_instructions": cfg["tutor_custom_instructions"],
    })
