"""
Shared helpers, constants, and validators extracted from api_tutor.py.

This module holds everything that does NOT depend on Flask request/response
handling so that future sub-blueprints can import freely without pulling in
the entire monolith.
"""

from __future__ import annotations

import json
import re
import sqlite3
import uuid
import logging
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Optional

from jsonschema import Draft202012Validator

from db_setup import get_connection, log_tutor_delete_telemetry

# ---------------------------------------------------------------------------
# Constants & module-level state
# ---------------------------------------------------------------------------

UPLOADS_DIR = Path(__file__).parent.parent / "data" / "uploads"
SYNC_JOBS: dict[str, dict[str, Any]] = {}
SYNC_JOBS_LOCK = Lock()
SYNC_JOB_RETENTION = 30
PREFLIGHT_CACHE: dict[str, dict[str, Any]] = {}
PREFLIGHT_CACHE_LOCK = Lock()
PREFLIGHT_CACHE_RETENTION = 50
VIDEO_JOBS: dict[str, dict[str, Any]] = {}
VIDEO_JOBS_LOCK = Lock()
VIDEO_JOB_RETENTION = 30
_LOG = logging.getLogger(__name__)
_OBSIDIAN_VAULT = None
EXTRACTED_IMAGES_ROOT = (
    Path(__file__).resolve().parents[1] / "data" / "extracted_images"
)
_IMAGE_PLACEHOLDER_PATTERN = re.compile(r"<!--\s*image\s*-->", re.IGNORECASE)

_SELECTOR_COLS_ENSURED = False
_WIKILINK_PATTERN = re.compile(r"\[\[([^\]]+)\]\]")
_MAP_OF_CONTENTS_OBJECTIVE_PATTERN_OLD = re.compile(
    r"\[\[(OBJ-[^\]]+)\]\].*status:\s*([a-z_]+)",
    re.IGNORECASE,
)
_MAP_OF_CONTENTS_OBJECTIVE_PATTERN_NEW = re.compile(
    r"^\s*\d+\.\s+\[\[(?:Learning Objectives & To Do#)?(OBJ-[^|\]#]+)(?:\|[^\]]+)?\]\]\s+(.+)$",
)
_TUTOR_NOTE_SCHEMA_PATH = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "schemas"
    / "tutor_note_schema_v1_1.json"
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
_DEFAULT_OBSIDIAN_VAULT_ROOT = Path(r"C:\Users\treyt\Desktop\Treys School")


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------


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


def _store_preflight_bundle(bundle: dict[str, Any]) -> str:
    preflight_id = f"preflight-{uuid.uuid4().hex[:12]}"
    payload = dict(bundle)
    payload["preflight_id"] = preflight_id
    payload["created_at"] = datetime.now().isoformat()
    with PREFLIGHT_CACHE_LOCK:
        PREFLIGHT_CACHE[preflight_id] = payload
        if len(PREFLIGHT_CACHE) > PREFLIGHT_CACHE_RETENTION:
            ordered = sorted(
                PREFLIGHT_CACHE.items(),
                key=lambda item: item[1].get("created_at", ""),
            )
            for stale_id, _ in ordered[: len(PREFLIGHT_CACHE) - PREFLIGHT_CACHE_RETENTION]:
                PREFLIGHT_CACHE.pop(stale_id, None)
    return preflight_id


def _get_preflight_bundle(preflight_id: str) -> Optional[dict[str, Any]]:
    with PREFLIGHT_CACHE_LOCK:
        cached = PREFLIGHT_CACHE.get(preflight_id)
        return dict(cached) if isinstance(cached, dict) else None


def _record_tutor_delete_telemetry(
    *,
    request_id: str,
    route: str,
    session_id: str,
    status: str,
    requested_count: int,
    deleted_count: int,
    skipped_count: int,
    failed_count: int,
    details: Optional[dict[str, Any]] = None,
) -> None:
    try:
        log_tutor_delete_telemetry(
            request_id=request_id,
            route=route,
            session_id=session_id,
            status=status,
            requested_count=requested_count,
            deleted_count=deleted_count,
            skipped_count=skipped_count,
            failed_count=failed_count,
            details=details,
        )
    except Exception:
        _LOG.exception(
            "tutor_delete_telemetry_failed request_id=%s route=%s session_id=%s status=%s",
            request_id,
            route,
            session_id,
            status,
        )


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
    required_tutor_session_cols = {
        "selector_chain_id",
        "selector_score_json",
        "selector_policy_version",
        "selector_dependency_fix",
        "codex_thread_id",
        "last_response_id",
    }
    required_tutor_turn_cols = {"response_id", "model_id"}
    required_session_cols = {"selector_chain_id", "selector_policy_version"}
    try:
        cur = conn.cursor()
        # tutor_sessions columns
        cur.execute("PRAGMA table_info(tutor_sessions)")
        ts_cols = {row[1] for row in cur.fetchall()}
        # tutor_turns continuity columns
        cur.execute("PRAGMA table_info(tutor_turns)")
        tt_cols = {row[1] for row in cur.fetchall()}
        # sessions columns
        cur.execute("PRAGMA table_info(sessions)")
        s_cols = {row[1] for row in cur.fetchall()}

        if (
            _SELECTOR_COLS_ENSURED
            and required_tutor_session_cols.issubset(ts_cols)
            and required_tutor_turn_cols.issubset(tt_cols)
            and required_session_cols.issubset(s_cols)
        ):
            return

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

        for col, typedef in (
            ("response_id", "TEXT"),
            ("model_id", "TEXT"),
        ):
            if col not in tt_cols:
                cur.execute(f"ALTER TABLE tutor_turns ADD COLUMN {col} {typedef}")

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
            clean_name = _sanitize_path_segment(raw_name, fallback=f"Class {course_id}")
            try:
                from course_map import load_course_map

                course = load_course_map().resolve_course(clean_name)
                if course is not None:
                    return course.label
            except Exception:
                pass
            return clean_name
    except Exception:
        pass
    finally:
        if conn is not None:
            conn.close()

    return _sanitize_path_segment(f"Class {course_id}", fallback="General Class")


def _study_notes_base_path(
    *,
    course_label: str = "",
    module_or_week: str = "",
    subtopic: str = "",
    strict: bool = False,
) -> str:
    from course_map import load_course_map

    course_map = load_course_map()
    if not any([course_label, module_or_week, subtopic]):
        return course_map.vault_root

    course = course_map.resolve_course(course_label)

    if course is None:
        if strict:
            raise ValueError(
                f"Unmapped vault course '{course_label}' for module '{module_or_week}'."
            )
        safe_course = _sanitize_path_segment(course_label, fallback="General Class")
        safe_module = _sanitize_path_segment(module_or_week, fallback="General Module")
        safe_subtopic = _sanitize_path_segment(subtopic, fallback="General Topic")
        # Skip redundant subfolder when subtopic == module (e.g. both "Week 8")
        if safe_subtopic.lower() == safe_module.lower():
            return f"{course_map.vault_root}/{safe_course}/{safe_module}"
        return f"{course_map.vault_root}/{safe_course}/{safe_module}/{safe_subtopic}"

    unit = course.resolve_unit(module_or_week)
    if strict and unit is None and module_or_week:
        raise ValueError(
            f"Unmapped vault unit '{module_or_week}' for course '{course.label}'."
        )
    unit_folder = (
        unit.name
        if unit
        else _sanitize_path_segment(module_or_week, fallback="General Module")
    )
    topic_folder = _sanitize_path_segment(subtopic, fallback="General Topic")

    # Skip redundant subfolder when subtopic == unit folder (e.g. both "Week 8")
    if topic_folder.lower() == unit_folder.lower():
        return f"{course_map.vault_root}/{course.label}/{unit_folder}"

    return f"{course_map.vault_root}/{course.label}/{unit_folder}/{topic_folder}"


def _canonical_moc_path(
    *,
    course_label: str,
    module_or_week: str,
    subtopic: str,
    strict: bool = False,
) -> str:
    return (
        f"{_study_notes_base_path(course_label=course_label, module_or_week=module_or_week, subtopic=subtopic, strict=strict)}/"
        "_Map of Contents.md"
    )


def _canonical_learning_objectives_page_path(
    *,
    course_label: str,
    module_or_week: str,
    subtopic: str,
    strict: bool = False,
) -> str:
    return (
        f"{_study_notes_base_path(course_label=course_label, module_or_week=module_or_week, subtopic=subtopic, strict=strict)}/"
        "Learning Objectives & To Do.md"
    )


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


_OBJECTIVE_PARENT_CODE_RE = re.compile(r"^(OBJ-\d+)([A-Z]+)?$")


def _objective_parent_code(code: Any) -> str:
    clean = _normalize_objective_id(code, 1)
    match = _OBJECTIVE_PARENT_CODE_RE.match(clean)
    if not match:
        return clean
    return match.group(1)


def _objective_has_child_suffix(code: Any) -> bool:
    clean = _normalize_objective_id(code, 1)
    match = _OBJECTIVE_PARENT_CODE_RE.match(clean)
    return bool(match and match.group(2))


def _derive_follow_up_targets_from_objectives(
    objectives: list[dict[str, Any]],
    *,
    focus_objective_id: Optional[str] = None,
    max_items: int = 6,
) -> list[str]:
    ordered_ids: list[str] = []
    seen: set[str] = set()

    def add(obj_id: Any) -> None:
        clean = str(obj_id or "").strip()
        if not clean or clean == "OBJ-UNMAPPED" or clean in seen:
            return
        seen.add(clean)
        ordered_ids.append(clean)

    focus_clean = str(focus_objective_id or "").strip().upper()
    add(focus_clean)

    normalized_objectives = [
        {
            "objective_id": _normalize_objective_id(
                item.get("objective_id") or item.get("id"), index
            )
        }
        for index, item in enumerate(objectives or [], start=1)
        if isinstance(item, dict)
    ]

    for item in normalized_objectives:
        obj_id = item["objective_id"]
        if _objective_has_child_suffix(obj_id):
            add(obj_id)

    for item in normalized_objectives:
        obj_id = item["objective_id"]
        if not _objective_has_child_suffix(obj_id):
            add(obj_id)

    if not ordered_ids:
        return []
    return [f"[[{obj_id}]]" for obj_id in ordered_ids[:max_items]]


def _row_value(row: Any, key: str, index: int) -> Any:
    if isinstance(row, sqlite3.Row):
        return row[key]
    return row[index]


def _delete_orphaned_tutor_managed_objectives(
    conn: sqlite3.Connection, lo_ids: list[int]
) -> int:
    if not lo_ids:
        return 0
    cur = conn.cursor()
    placeholders = ",".join("?" for _ in lo_ids)
    cur.execute(
        f"""
        DELETE FROM learning_objectives
        WHERE id IN ({placeholders})
          AND managed_by_tutor = 1
          AND NOT EXISTS (
              SELECT 1
              FROM tutor_session_learning_objectives tso
              WHERE tso.lo_id = learning_objectives.id
          )
        """,
        lo_ids,
    )
    return int(cur.rowcount or 0)


def _unlink_all_tutor_session_learning_objectives(
    conn: sqlite3.Connection, session_id: str
) -> int:
    cur = conn.cursor()
    cur.execute(
        "SELECT DISTINCT lo_id FROM tutor_session_learning_objectives WHERE tutor_session_id = ?",
        (session_id,),
    )
    lo_ids = [
        int(_row_value(row, "lo_id", 0))
        for row in cur.fetchall()
        if _row_value(row, "lo_id", 0) is not None
    ]
    cur.execute(
        "DELETE FROM tutor_session_learning_objectives WHERE tutor_session_id = ?",
        (session_id,),
    )
    return _delete_orphaned_tutor_managed_objectives(conn, lo_ids)


def _normalize_objective_scope(raw_scope: Any) -> str:
    scope = str(raw_scope or "").strip().lower()
    if scope in {"module_all", "single_focus"}:
        return scope
    return "module_all"


def _normalize_session_rules(raw_rules: Any, *, max_chars: int = 4000) -> str:
    """Normalize per-session instruction overrides and cap prompt bloat."""
    if raw_rules is None:
        return ""
    text = str(raw_rules).strip()
    if len(text) > max_chars:
        text = text[:max_chars].rstrip()
    return text


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


# ---------------------------------------------------------------------------
# Artifact validation helpers
# ---------------------------------------------------------------------------


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
            raw_obj_id = (
                item.get("objective_id") or item.get("lo_code") or item.get("id")
            )
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
