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
import ast
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

from flask import (
    Blueprint,
    Response,
    current_app,
    has_app_context,
    jsonify,
    request,
    send_file,
)
from jsonschema import Draft202012Validator

from dashboard.utils import load_api_config, save_api_config

from db_setup import (
    DB_PATH,
    get_connection,
    ensure_method_library_seeded,
    log_tutor_delete_telemetry,
)
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
    resolve_material_retrieval_k as _resolve_material_k_for_profile,
)
from tutor_prompt_builder import DEFAULT_RULES as _PROMPT_BUILDER_DEFAULT_RULES
import llm_provider as _llm_provider

tutor_bp = Blueprint("tutor", __name__, url_prefix="/api/tutor")

import dashboard.api_tutor_utils as _utils_mod  # noqa: E402

from dashboard.api_tutor_utils import (  # noqa: E402
    UPLOADS_DIR,
    SYNC_JOBS,
    SYNC_JOBS_LOCK,
    SYNC_JOB_RETENTION,
    PREFLIGHT_CACHE,
    PREFLIGHT_CACHE_LOCK,
    PREFLIGHT_CACHE_RETENTION,
    VIDEO_JOBS,
    VIDEO_JOBS_LOCK,
    VIDEO_JOB_RETENTION,
    EXTRACTED_IMAGES_ROOT,
    _OBSIDIAN_VAULT,
    _IMAGE_PLACEHOLDER_PATTERN,
    _WIKILINK_PATTERN,
    _MAP_OF_CONTENTS_OBJECTIVE_PATTERN_OLD,
    _MAP_OF_CONTENTS_OBJECTIVE_PATTERN_NEW,
    _DEFAULT_OBSIDIAN_VAULT_ROOT,
    _safe_json_dict,
    _store_preflight_bundle,
    _get_preflight_bundle,
    _record_tutor_delete_telemetry,
    _extract_knob_defaults,
    _load_method_contracts,
    _validate_chain_launch_blocks,
    _ensure_selector_columns as _ensure_selector_columns_impl,
    _gen_session_id,
    _sanitize_module_name,
    _sanitize_path_segment,
    _resolve_class_label,
    _study_notes_base_path,
    _canonical_moc_path,
    _canonical_learning_objectives_page_path,
    _wikilink,
    _strip_wikilink,
    _extract_wikilinks,
    _normalize_wikilinks,
    _normalize_objective_status,
    _normalize_objective_id,
    _objective_parent_code,
    _objective_has_child_suffix,
    _derive_follow_up_targets_from_objectives,
    _row_value,
    _delete_orphaned_tutor_managed_objectives,
    _unlink_all_tutor_session_learning_objectives,
    _normalize_objective_scope,
    _normalize_session_rules,
    _normalize_session_mode,
    _default_session_mode_from_scope,
    _load_tutor_note_schema_validator,
    _normalize_tutor_artifact_payload,
    _validate_tutor_artifact_payload,
    _walk_payload_keys,
    _prime_assessment_violations,
    _PRIME_DISALLOWED_ASSESSMENT_KEYS,
    _collect_objectives_from_payload,
)


from dashboard.api_tutor_vault import (  # noqa: E402
    _collect_objectives_from_db,
    _resolve_learning_objectives_for_scope,
    _try_import_objectives_from_vault,
    _parse_existing_map_of_contents_objectives,
    _FRONTMATTER_RE,
    _slugify_section_key,
    _parse_frontmatter_keys,
    _parse_frontmatter_dict,
    _frontmatter_line,
    _merge_frontmatter_preserving_existing,
    _section_markers,
    _replace_or_insert_managed_section,
    _parse_metadata_json,
    _strip_internal_sync_artifacts,
    _vault_error_is_missing_file,
    _sync_week_page,
    _build_page_sync_payload,
    _build_map_of_contents_markdown,
    _session_has_real_objectives,
    _extract_objectives_from_text,
    _objective_slug,
    _map_of_contents_io_disabled,
    _obsidian_vault_root_path,
    _resolve_vault_fs_path,
    _get_obsidian_vault,
    _looks_like_obsidian_cli_error,
    _vault_read_note,
    _vault_save_note,
    _vault_delete_note,
    _ensure_moc_context,
    _resolve_tutor_preflight,
    _question_within_reference_targets,
    _sanitize_note_fragment,
    _render_tutor_session_markdown,
    _render_tutor_concept_markdown,
    _merge_and_save_obsidian_note,
    _sync_graph_for_paths,
    save_tool_note_to_obsidian,
    save_learning_objectives_from_tool,
    _finalize_structured_notes_for_session,
    _reconcile_obsidian_state,
    _delete_artifact_obsidian_files,
    _cascade_delete_obsidian_files,
    _expected_obsidian_paths_for_session,
)


_LOG = logging.getLogger(__name__)

# Backward-compat: tests reset _SELECTOR_COLS_ENSURED on *this* module.
# Wrap the utils implementation so the flag stays in sync.
_SELECTOR_COLS_ENSURED = False


def _ensure_selector_columns(conn: sqlite3.Connection) -> None:
    """Thin wrapper: propagate the local reset flag to the utils module."""
    global _SELECTOR_COLS_ENSURED
    if not _SELECTOR_COLS_ENSURED:
        _utils_mod._SELECTOR_COLS_ENSURED = False
    _ensure_selector_columns_impl(conn)
    _SELECTOR_COLS_ENSURED = _utils_mod._SELECTOR_COLS_ENSURED


# ---------------------------------------------------------------------------
# Material helpers & routes  (extracted to api_tutor_materials.py)
# ---------------------------------------------------------------------------
# Explicit imports of every material helper used in session / turn / chain
# handlers that remain in this file.  The module-level ``import`` at the end
# triggers route registration on ``tutor_bp``.
#
# Test monkeypatches target ``dashboard.api_tutor._launch_materials_sync_job``
# (etc.); the ``_mp()`` bridge inside api_tutor_materials looks them up HERE.

from dashboard.api_tutor_materials import (  # noqa: E402
    _accuracy_profile_prompt_guidance,
    _build_gemini_vision_context,
    _build_insufficient_evidence_response,
    _build_material_count_response,
    _build_retrieval_debug_payload,
    _build_selected_scope_listing_response,
    _is_material_count_question,
    _is_selected_scope_listing_question,
    _launch_materials_sync_job,
    _launch_video_process_job,
    _load_selected_materials,
    _material_scope_labels,
    _normalize_default_mode,
    _normalize_force_full_docs,
    _normalize_material_ids,
    _recommended_mode_flags,
    _resolve_material_retrieval_k,
)
import dashboard.api_tutor_materials  # noqa: E402,F401 — registers routes on tutor_bp


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


def _is_first_session_for_course(conn, course_id) -> bool:
    """Return True if no previous tutor sessions exist for this course."""
    if course_id is None:
        return True
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) as cnt FROM tutor_sessions WHERE course_id = ? AND status IN ('active', 'ended')",
        (int(course_id),),
    )
    row = cur.fetchone()
    return (row["cnt"] if row else 0) <= 1


def _should_skip_block(conn, block: dict, session: dict) -> bool:
    """Evaluate gate: calibrate_skip_if_first_session for M-CAL-001."""
    method_id = str(block.get("method_id") or "").strip()
    if method_id == "M-CAL-001":
        return _is_first_session_for_course(conn, session.get("course_id"))
    return False


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


def _parse_chain_context_tags(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return dict(raw)
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


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
        "SELECT id, name, description, context_tags FROM method_chains WHERE id = ?",
        (chain_id,),
    )
    chain_row = cur.fetchone()
    if not chain_row:
        return None, None

    blocks = _resolve_chain_blocks(conn, chain_id)
    if not blocks:
        return None, None
    context_tags = _parse_chain_context_tags(chain_row["context_tags"])
    runtime_profile = (
        context_tags.get("runtime_profile")
        if isinstance(context_tags.get("runtime_profile"), dict)
        else {}
    )
    block_overrides = (
        context_tags.get("block_overrides")
        if isinstance(context_tags.get("block_overrides"), dict)
        else {}
    )

    # Current block info
    block_info = None
    if 0 <= current_index < len(blocks):
        b = blocks[current_index]
        method_id = b.get("method_id", "")
        chain_override = (
            block_overrides.get(method_id)
            if isinstance(block_overrides.get(method_id), dict)
            else {}
        )
        block_info = {
            "name": b["name"],
            "method_id": method_id,
            "description": b.get("description", ""),
            "category": b.get("control_stage", ""),
            "control_stage": b.get("control_stage", ""),
            "evidence": b.get("evidence", ""),
            "duration": b.get("duration", 5),
            "facilitation_prompt": b.get("facilitation_prompt", ""),
            "artifact_type": b.get("artifact_type", ""),
            "knob_overrides_json": b.get("knob_overrides_json", {}),
            "chain_override": chain_override,
        }

    # Chain overview
    chain_info = {
        "name": chain_row["name"],
        "blocks": [b["name"] for b in blocks],
        "current_index": current_index,
        "total": len(blocks),
        "runtime_profile": runtime_profile,
        "allowed_modes": context_tags.get("allowed_modes") if isinstance(context_tags.get("allowed_modes"), list) else [],
        "gates": context_tags.get("gates") if isinstance(context_tags.get("gates"), list) else [],
        "failure_actions": context_tags.get("failure_actions") if isinstance(context_tags.get("failure_actions"), list) else [],
        "tier_exits": context_tags.get("tier_exits") if isinstance(context_tags.get("tier_exits"), dict) else {},
        "requires_reference_targets": bool(context_tags.get("requires_reference_targets")),
    }

    return block_info, chain_info


def _chain_requires_prime_launch(context_tags: dict[str, Any]) -> bool:
    stage = str(context_tags.get("stage") or "").strip().lower()
    if stage in {"review", "consolidation"}:
        return False
    return True


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
    next_block = (
        _block_summary(blocks[current_pos + 1]) if current_pos + 1 < total else None
    )
    completed = [b["name"] for b in blocks[:current_pos]]
    remaining = [b["name"] for b in blocks[current_pos + 1 :]]
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


# ---------------------------------------------------------------------------
# POST /api/tutor/session/preflight — Resolve scope before session creation
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/preflight", methods=["POST"])
def preflight_session():
    data = request.get_json(silent=True) or {}
    bundle, error = _resolve_tutor_preflight(data)
    if error:
        payload, status = error
        return jsonify(payload), status
    assert bundle is not None
    preflight_id = _store_preflight_bundle(bundle)
    response = {
        "ok": bundle["ok"],
        "preflight_id": preflight_id,
        "course_id": bundle["course_id"],
        "module_name": bundle["module_name"],
        "topic": bundle["topic"],
        "objective_scope": bundle["objective_scope"],
        "focus_objective_id": bundle["focus_objective_id"],
        "material_ids": bundle["material_ids"],
        "resolved_learning_objectives": bundle["resolved_learning_objectives"],
        "map_of_contents": bundle["map_of_contents"],
        "learning_objectives_page": bundle.get("learning_objectives_page"),
        "page_sync_result": bundle.get("page_sync_result"),
        "vault_ready": bool((bundle.get("page_sync_result") or {}).get("ok")),
        "recommended_mode_flags": bundle["recommended_mode_flags"],
        "blockers": bundle["blockers"],
    }
    response["north_star"] = response["map_of_contents"]
    return jsonify(response), 200


# ---------------------------------------------------------------------------
# POST /api/tutor/session — Create a new tutor session
# ---------------------------------------------------------------------------


@tutor_bp.route("/session", methods=["POST"])
def create_session():
    data = request.get_json(silent=True) or {}
    preflight_id = str(data.get("preflight_id") or "").strip()

    preflight_bundle: Optional[dict[str, Any]] = None
    if preflight_id:
        preflight_bundle = _get_preflight_bundle(preflight_id)
        if not preflight_bundle:
            return jsonify({"error": "preflight_id not found", "code": "PREFLIGHT_NOT_FOUND"}), 404
        if preflight_bundle.get("blockers"):
            return (
                jsonify(
                    {
                        "error": "Resolve preflight blockers before starting the Tutor session.",
                        "code": "PREFLIGHT_BLOCKED",
                        "blockers": preflight_bundle.get("blockers") or [],
                    }
                ),
                400,
            )

    course_id = (
        preflight_bundle.get("course_id")
        if preflight_bundle is not None
        else data.get("course_id")
    )
    if course_id is not None:
        ensure_course_in_wheel(int(course_id), active=True)
    phase = data.get("phase", "first_pass")
    topic = (
        str(preflight_bundle.get("topic") or "")
        if preflight_bundle is not None
        else data.get("topic", "")
    )
    mode = data.get("mode", "Core") or "Core"
    content_filter = (
        dict(preflight_bundle.get("content_filter") or {})
        if preflight_bundle is not None
        else data.get("content_filter")
    )
    if isinstance(content_filter, dict):
        normalized_filter = dict(content_filter)
        normalized_filter["accuracy_profile"] = normalize_accuracy_profile(
            normalized_filter.get("accuracy_profile")
        )
        if "material_ids" in normalized_filter:
            normalized_filter["material_ids"] = (
                _normalize_material_ids(normalized_filter.get("material_ids")) or []
            )
        default_mode = _normalize_default_mode(
            normalized_filter.get("default_mode"),
            material_ids=normalized_filter.get("material_ids"),
        )
        if default_mode:
            normalized_filter["default_mode"] = default_mode
        normalized_filter["force_full_docs"] = _normalize_force_full_docs(
            normalized_filter.get("force_full_docs"),
            material_ids=normalized_filter.get("material_ids"),
        )
        content_filter = normalized_filter
    else:
        content_filter = None
    method_chain_id = data.get("method_chain_id")
    brain_session_id = data.get("brain_session_id")
    module_name = (
        preflight_bundle.get("module_name")
        if preflight_bundle is not None
        else data.get("module_name")
    )
    learning_objectives = (
        preflight_bundle.get("resolved_learning_objectives")
        if preflight_bundle is not None
        else data.get("learning_objectives")
    )
    objective_scope = _normalize_objective_scope(
        preflight_bundle.get("objective_scope")
        if preflight_bundle is not None
        else data.get("objective_scope")
    )
    focus_objective_id = str(
        preflight_bundle.get("focus_objective_id")
        if preflight_bundle is not None
        else data.get("focus_objective_id")
        or ""
    ).strip()
    source_ids = (
        list(preflight_bundle.get("source_ids") or [])
        if preflight_bundle is not None
        else _normalize_material_ids(data.get("source_ids")) or []
    )
    module_id: Optional[int] = None
    if preflight_bundle is not None:
        module_id = preflight_bundle.get("module_id")
    elif data.get("module_id") is not None:
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

    requires_certified_preflight = preflight_bundle is None and (
        bool(focus_objective_id)
        or bool(data.get("study_unit"))
        or (
            isinstance(data.get("learning_objectives"), list)
            and objective_scope != "single_focus"
        )
    )
    if requires_certified_preflight:
        return (
            jsonify(
                {
                    "error": "Objective-scoped certified Tutor sessions must start from preflight.",
                    "code": "PREFLIGHT_REQUIRED",
                }
            ),
            400,
        )
    map_of_contents_refresh = bool(
        data.get(
            "map_of_contents_refresh",
            (
                content_filter.get("map_of_contents_refresh")
                if isinstance(content_filter, dict)
                else False
            ),
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
    if preflight_bundle is not None:
        map_of_contents_ctx = preflight_bundle.get("map_of_contents")
        map_of_contents_error = None
    else:
        map_of_contents_ctx, map_of_contents_error = _ensure_moc_context(
            course_id=int(course_id) if course_id is not None else None,
            module_id=module_id,
            module_name=module_name,
            topic=topic,
            learning_objectives=learning_objectives,
            source_ids=source_ids,
            objective_scope=objective_scope,
            focus_objective_id=focus_objective_id or None,
            force_refresh=map_of_contents_refresh,
            path_override=vault_folder,
        )
        if map_of_contents_error:
            return jsonify({"error": map_of_contents_error}), 500
    if map_of_contents_ctx and not bool(
        (map_of_contents_ctx.get("page_sync_result") or {}).get("ok")
    ):
        return (
            jsonify(
                {
                    "error": "Tutor could not patch the required Obsidian week pages.",
                    "code": "PAGE_SYNC_FAILED",
                    "page_sync_result": map_of_contents_ctx.get("page_sync_result") or {},
                }
            ),
            400,
        )

    if not isinstance(content_filter, dict):
        content_filter = {}

    content_filter["accuracy_profile"] = normalize_accuracy_profile(
        content_filter.get("accuracy_profile")
    )
    content_filter["objective_scope"] = _normalize_objective_scope(
        content_filter.get("objective_scope") or objective_scope
    )
    content_filter["session_rules"] = _normalize_session_rules(
        content_filter.get("session_rules")
    )
    if "material_ids" in content_filter:
        content_filter["material_ids"] = (
            _normalize_material_ids(content_filter.get("material_ids")) or []
        )
    default_mode = _normalize_default_mode(
        content_filter.get("default_mode"),
        material_ids=content_filter.get("material_ids"),
    )
    if default_mode:
        content_filter["default_mode"] = default_mode
    content_filter["force_full_docs"] = _normalize_force_full_docs(
        content_filter.get("force_full_docs"),
        material_ids=content_filter.get("material_ids"),
    )
    if source_ids:
        content_filter["source_ids"] = source_ids
    if map_of_contents_refresh:
        content_filter["map_of_contents_refresh"] = True

    if map_of_contents_ctx:
        module_prefix = str(Path(str(map_of_contents_ctx["path"])).parent).replace(
            "\\", "/"
        )
        content_filter["module_name"] = map_of_contents_ctx.get("module_name")
        content_filter["module_prefix"] = module_prefix
        content_filter["map_of_contents"] = {
            "path": map_of_contents_ctx.get("path"),
            "status": map_of_contents_ctx.get("status"),
            "module_name": map_of_contents_ctx.get("module_name"),
            "course_name": map_of_contents_ctx.get("course_name"),
            "subtopic_name": map_of_contents_ctx.get("subtopic_name"),
            "objective_ids": map_of_contents_ctx.get("objective_ids") or [],
        }
        content_filter["reference_targets"] = (
            map_of_contents_ctx.get("reference_targets") or []
        )
        content_filter["follow_up_targets"] = (
            map_of_contents_ctx.get("follow_up_targets") or []
        )
        content_filter["learning_objectives_page"] = (
            map_of_contents_ctx.get("learning_objectives_page") or {}
        )
        content_filter["page_sync_result"] = (
            map_of_contents_ctx.get("page_sync_result") or {}
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
            and map_of_contents_ctx.get("objective_ids")
        ):
            return (
                jsonify(
                    {
                        "error": "focus_objective_id is required for single-focus Tutor sessions.",
                        "code": "FOCUS_OBJECTIVE_REQUIRED",
                        "objective_ids": map_of_contents_ctx.get("objective_ids") or [],
                    }
                ),
                400,
            )

        if focus_objective_id:
            focus_wikilink = _wikilink(_strip_wikilink(focus_objective_id))
            content_filter["focus_objective_id"] = _strip_wikilink(focus_wikilink)
            refs = _normalize_wikilinks(
                content_filter.get("reference_targets"), max_items=80
            )
            if focus_wikilink and focus_wikilink not in refs:
                refs = [focus_wikilink, *refs]
            content_filter["reference_targets"] = _normalize_wikilinks(
                refs, max_items=80
            )

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
    greeting = None
    if method_chain_id:
        chain_meta_cur = conn.cursor()
        chain_meta_cur.execute(
            "SELECT context_tags FROM method_chains WHERE id = ?",
            (method_chain_id,),
        )
        chain_meta_row = chain_meta_cur.fetchone()
        if isinstance(chain_meta_row, sqlite3.Row):
            chain_context_tags_raw = chain_meta_row["context_tags"]
        elif chain_meta_row:
            chain_context_tags_raw = chain_meta_row[0]
        else:
            chain_context_tags_raw = None
        chain_context_tags = _parse_chain_context_tags(
            chain_context_tags_raw
        )
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
        if _chain_requires_prime_launch(chain_context_tags) and first_stage != "PRIME":
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
        try:
            fp = str(first_block.get("facilitation_prompt") or "").strip()
            stage = first_block.get("control_stage") or ""
            if fp:
                first_sentence = fp.split(". ")[0][:200].strip()
                greeting = f"Let's begin with {first_block['name']} ({stage}). {first_sentence}"
            else:
                greeting = f"Let's begin with {first_block['name']} ({stage})."
        except Exception:
            greeting = None
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
        "greeting": greeting,
        "started_at": now,
    }
    if selector_meta:
        response["selector"] = selector_meta
    if map_of_contents_ctx:
        response["map_of_contents"] = {
            "path": map_of_contents_ctx.get("path"),
            "status": map_of_contents_ctx.get("status"),
            "module_name": map_of_contents_ctx.get("module_name"),
            "course_name": map_of_contents_ctx.get("course_name"),
            "subtopic_name": map_of_contents_ctx.get("subtopic_name"),
            "objective_ids": map_of_contents_ctx.get("objective_ids") or [],
        }
        response["north_star"] = response["map_of_contents"]
        response["objective_scope"] = (
            content_filter.get("objective_scope") or "module_all"
        )
        response["focus_objective_id"] = content_filter.get("focus_objective_id")
        response["reference_targets_count"] = len(
            map_of_contents_ctx.get("reference_targets") or []
        )
        response["learning_objectives_page"] = (
            map_of_contents_ctx.get("learning_objectives_page") or {}
        )
        response["page_sync_result"] = map_of_contents_ctx.get("page_sync_result") or {}

    # --- Method recommendations from Scholar data ---
    try:
        from dashboard.method_analysis import get_context_recommendations

        rec_context: dict[str, Any] = {}
        if isinstance(content_filter, dict):
            rec_context["stage"] = content_filter.get("stage")
            rec_context["energy"] = content_filter.get("energy")
            rec_context["class_type"] = content_filter.get("class_type")
        recs = get_context_recommendations(
            **{k: v for k, v in rec_context.items() if v}
        )
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
    # Read endpoint is side-effect-free: expose reconciled state in response
    # without mutating persistence.
    _reconcile_obsidian_state(session, persist=False, prune_learning_objectives=False)

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
    active_stage = str(
        (block_info or {}).get("control_stage")
        or (block_info or {}).get("category")
        or ""
    ).upper()
    is_first_turn_in_active_block = False
    if session.get("method_chain_id"):
        try:
            transition_row = conn.execute(
                """SELECT turn_count
                   FROM tutor_block_transitions
                   WHERE tutor_session_id = ? AND ended_at IS NULL
                   ORDER BY id DESC
                   LIMIT 1""",
                (session_id,),
            ).fetchone()
            if transition_row is not None:
                raw_turn_count = transition_row["turn_count"]
                try:
                    active_block_turn_count = (
                        int(raw_turn_count) if raw_turn_count is not None else 0
                    )
                except (TypeError, ValueError):
                    active_block_turn_count = 0
                is_first_turn_in_active_block = active_block_turn_count <= 0
        except Exception as exc:
            _LOG.debug(
                "Could not read active block turn_count for session %s: %s",
                session_id,
                exc,
            )
    active_method_id = str((block_info or {}).get("method_id") or "").strip()
    method_contract = (
        _load_method_contracts().get(active_method_id, {}) if active_method_id else {}
    )
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
    module_prefix = (
        str(content_filter.get("module_prefix") or "").strip().replace("\\", "/")
    )
    map_of_contents = content_filter.get("map_of_contents")
    if not isinstance(map_of_contents, dict):
        map_of_contents = None

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
    content_filter["session_rules"] = _normalize_session_rules(
        content_filter.get("session_rules")
    )
    if focus_objective_id:
        content_filter["focus_objective_id"] = _strip_wikilink(focus_objective_id)
    if module_prefix:
        content_filter["module_prefix"] = module_prefix

    accuracy_profile = normalize_accuracy_profile(
        content_filter.get("accuracy_profile")
    )
    content_filter["accuracy_profile"] = accuracy_profile

    # Extract material_ids from content filter (new dual-library approach)
    material_ids = None
    if "material_ids" in content_filter:
        material_ids = _normalize_material_ids(content_filter.get("material_ids"))
        content_filter["material_ids"] = material_ids or []
    force_full_docs = _normalize_force_full_docs(
        content_filter.get("force_full_docs"),
        material_ids=material_ids,
    )
    content_filter["force_full_docs"] = force_full_docs
    material_k = _resolve_material_retrieval_k(material_ids, accuracy_profile)
    # Explicit material selection should override course scoping.
    retrieval_course_id = None if material_ids else session.get("course_id")
    selected_material_count, selected_material_labels = _material_scope_labels(
        material_ids
    )

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
    _obsidian_on = bool(_mode.get("obsidian", not _mode_provided))
    _web_search_on = bool(_mode.get("web_search", not _mode_provided))
    _deep_think_on = bool(_mode.get("deep_think", False))
    _gemini_vision_on = bool(_mode.get("gemini_vision", False))

    # Note: codex_model (from content_filter.model) takes full precedence over the
    # mode-based tier selection. An explicit model override beats the toggle logic.
    _model = (
        "gpt-5.3-codex"
        if (_deep_think_on or not _mode_provided)
        else "gpt-5.3-codex-spark"
    )
    _reasoning_effort = "high" if (_deep_think_on or not _mode_provided) else None

    turn_number = session["turn_count"] + 1
    is_prime_first_block_turn = active_stage == "PRIME" and (
        is_first_turn_in_active_block or turn_number == 1
    )

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
                force_full_docs=force_full_docs,
            )
            rag_debug = ctx["debug"]

            material_text = ctx["materials"]
            notes_context_text = ctx["notes"]
            vault_state_text = ctx.get("vault_state", "")

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

            if _gemini_vision_on and not material_ids:
                material_text = (
                    f"{material_text}\n\n## Gemini Vision (Unavailable)\n"
                    "No materials selected. Select MP4 lecture videos in the content filter to use Gemini Vision.\n"
                    "Tell the student: Gemini Vision was requested but isn't available for these materials."
                )
            elif _gemini_vision_on and material_ids:
                gemini_video_context, gemini_diag = _build_gemini_vision_context(
                    material_ids
                )
                if gemini_video_context:
                    material_text = (
                        f"{material_text}\n\n## Gemini Video Vision Context\n"
                        "Use this to strengthen chart/image-heavy explanations from lecture videos.\n\n"
                        f"{gemini_video_context}"
                    )
                elif gemini_diag:
                    material_text = (
                        f"{material_text}\n\n## Gemini Vision (Unavailable)\n"
                        f"{gemini_diag}\n"
                        "Tell the student: Gemini Vision was requested but isn't available for these materials."
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
                material_context=material_text,
                graph_context=graph_context_text,
                course_map=ctx.get("course_map", ""),
                vault_state=vault_state_text,
            )
            session_rules = _normalize_session_rules(
                content_filter.get("session_rules")
            )
            if session_rules:
                system_prompt += (
                    f"\n\n## Session Rules (Current Session Only)\n{session_rules}"
                )
            system_prompt += (
                "\n\n## Retrieval Tuning\n"
                f"{_accuracy_profile_prompt_guidance(effective_accuracy_profile)}"
            )
            _needs_lo_save = False
            _lo_save_called = False
            learning_objectives_page = content_filter.get("learning_objectives_page")
            if map_of_contents:
                objective_ids = map_of_contents.get("objective_ids") or []
                objective_lines = "\n".join(
                    f"- {_wikilink(str(oid))}"
                    for oid in objective_ids
                    if str(oid or "").strip()
                )
                if not objective_lines:
                    objective_lines = "- [[OBJ-UNMAPPED]]"
                system_prompt += (
                    "\n\n## Map of Contents Context\n"
                    f"- Module: {map_of_contents.get('module_name') or 'General Module'}\n"
                    f"- File: {map_of_contents.get('path') or '(missing)'}\n"
                    f"- Status: {map_of_contents.get('status') or 'unknown'}\n"
                    "- Objectives in scope:\n"
                    f"{objective_lines}"
                )
                if isinstance(learning_objectives_page, dict):
                    system_prompt += (
                        "\n- Learning Objectives Page: "
                        f"{learning_objectives_page.get('path') or '(missing)'} "
                        f"({learning_objectives_page.get('status') or 'unknown'})"
                    )
                _needs_lo_save = (
                    not _session_has_real_objectives(map_of_contents)
                    and turn_number <= 5
                ) or (
                    map_of_contents.get("status") == "needs_path" and turn_number <= 8
                )
                _is_needs_path = map_of_contents.get("status") == "needs_path"
                if _needs_lo_save and _is_needs_path:
                    # Objectives exist in DB but Map of Contents file was deleted
                    system_prompt += (
                        "\n\n## Map of Contents File Missing\n"
                        "The Map of Contents note was deleted from Obsidian but learning objectives "
                        "are still saved in the database. Before continuing, ask the student "
                        "where to re-save the Map of Contents.\n"
                        '1. Ask: "Your Map of Contents file was removed. '
                        "Where should I save your learning objectives? "
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
                        "1. Ask the student: \"I don't have learning objectives for this module yet. "
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
                        'Pass `objectives` (array with `id` like "OBJ-1" and `description`) '
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
            if (
                block_info
                and str(block_info.get("control_stage") or "").upper() == "PRIME"
            ):
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
                if is_prime_first_block_turn:
                    system_prompt += (
                        "\n## PRIME Learning Objective Extraction\n"
                        "This is a PRIME block. As you engage with the student, identify and extract the key learning objectives from the loaded materials. "
                        "Use the save_learning_objectives tool to save them. Extract 3-7 specific, measurable learning objectives.\n"
                    )
            system_prompt += (
                f"\n\n## PRIME Objective Scope\n- Active scope: {objective_scope}\n"
            )
            if objective_scope == "module_all":
                system_prompt += "- Use module-level big-picture orientation first, then ask learner to choose one focus objective.\n"
            else:
                focus_link = (
                    _wikilink(_strip_wikilink(focus_objective_id))
                    if focus_objective_id
                    else ""
                )
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
                from dashboard.method_analysis import (
                    get_context_recommendations as _get_recs,
                )

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

            # Stub: escalation removed (Task 5 deletes helpers fully)
            retrieved_material_sources: list[str] = []
            force_insufficient_evidence = False
            weak_reasons: list[str] = []

            def _attach_profile_debug(payload: dict[str, Any]) -> dict[str, Any]:
                payload["requested_accuracy_profile"] = requested_accuracy_profile
                payload["effective_accuracy_profile"] = effective_accuracy_profile
                payload["profile_escalated"] = profile_escalated
                payload["profile_escalation_reasons"] = profile_escalation_reasons
                payload["insufficient_evidence_guard"] = force_insufficient_evidence
                payload["insufficient_evidence_reasons"] = (
                    weak_reasons if force_insufficient_evidence else []
                )
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
                retrieval_debug_payload = _attach_profile_debug(
                    _build_retrieval_debug_payload(
                        accuracy_profile=effective_accuracy_profile,
                        material_ids=material_ids,
                        selected_material_count=selected_material_count,
                        material_k=effective_material_k,
                        retrieval_course_id=retrieval_course_id,
                        citations=citations,
                        rag_debug=rag_debug,
                    )
                )
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
            elif selected_material_count > 0 and _is_selected_scope_listing_question(
                question
            ):
                used_scope_shortcut = True
                full_response = _build_selected_scope_listing_response(
                    selected_count=selected_material_count,
                    selected_labels=selected_material_labels,
                    retrieved_sources=retrieved_material_sources,
                )
                citation_sources = (
                    retrieved_material_sources or selected_material_labels
                )
                citations = [
                    {"source": src, "index": idx + 1}
                    for idx, src in enumerate(citation_sources[:12])
                ]
                artifact_payload = [artifact_cmd] if artifact_cmd else None
                retrieval_debug_payload = _attach_profile_debug(
                    _build_retrieval_debug_payload(
                        accuracy_profile=effective_accuracy_profile,
                        material_ids=material_ids,
                        selected_material_count=selected_material_count,
                        material_k=effective_material_k,
                        retrieval_course_id=retrieval_course_id,
                        citations=citations,
                        rag_debug=rag_debug,
                    )
                )
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
                citation_sources = (
                    retrieved_material_sources or selected_material_labels
                )
                citations = [
                    {"source": src, "index": idx + 1}
                    for idx, src in enumerate(citation_sources[:12])
                ]
                artifact_payload = [artifact_cmd] if artifact_cmd else None
                retrieval_debug_payload = _attach_profile_debug(
                    _build_retrieval_debug_payload(
                        accuracy_profile=effective_accuracy_profile,
                        material_ids=material_ids,
                        selected_material_count=selected_material_count,
                        material_k=effective_material_k,
                        retrieval_course_id=retrieval_course_id,
                        citations=citations,
                        rag_debug=rag_debug,
                    )
                )
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
                from tutor_tools import (
                    SAVE_LEARNING_OBJECTIVES_SCHEMA,
                    execute_tool,
                    get_tool_schemas,
                )
                import json as _json

                tool_schemas = get_tool_schemas()
                if is_prime_first_block_turn and not any(
                    schema.get("name") == "save_learning_objectives"
                    for schema in tool_schemas
                ):
                    tool_schemas.append(dict(SAVE_LEARNING_OBJECTIVES_SCHEMA))
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
                llm_timeout_seconds = 120
                if _deep_think_on:
                    llm_timeout_seconds = 300
                elif _web_search_on or _gemini_vision_on:
                    llm_timeout_seconds = 180
                if _reasoning_effort == "high":
                    llm_timeout_seconds = max(llm_timeout_seconds, 240)

                try:
                    stream_kwargs: dict = {
                        "model": codex_model or _model,
                        "timeout": llm_timeout_seconds,
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
                                        _fresh = _json.loads(
                                            _cf_row["content_filter_json"]
                                        )
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
                            timeout=llm_timeout_seconds,
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
                                _cf_row = _get_tutor_session(_cf_conn, session_id)
                                _cf_conn.close()
                                if _cf_row and _cf_row.get("content_filter_json"):
                                    _fresh = json.loads(_cf_row["content_filter_json"])
                                    if isinstance(_fresh, dict):
                                        content_filter.update(_fresh)
                            except Exception:
                                pass
                            yield format_sse_chunk(
                                "\n\n---\n*Learning objectives saved automatically.*\n",
                            )
                        else:
                            _LOG.warning(
                                "Auto-invoke save_learning_objectives failed: %s",
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

                # --- Vault artifact processing ---
                # Parse :::vault:*::: blocks from LLM output, execute against
                # Obsidian, and strip the blocks so the user sees clean prose.
                vault_artifact_results: list[dict] | None = None
                try:
                    from vault_artifact_parser import (
                        parse_vault_artifacts,
                        strip_vault_artifacts,
                    )
                    from vault_artifact_router import execute_all_artifacts
                    from obsidian_vault import ObsidianVault

                    vault_artifacts = parse_vault_artifacts(full_response)
                    if vault_artifacts:
                        vault = ObsidianVault()
                        vault_artifact_results = execute_all_artifacts(
                            vault, vault_artifacts
                        )
                        _LOG.info(
                            "Vault artifacts executed session=%s results=%s",
                            session_id,
                            json.dumps(vault_artifact_results, default=str),
                        )
                        full_response = strip_vault_artifacts(full_response)
                        if artifact_payload is None:
                            artifact_payload = []
                        artifact_payload.append(
                            {"vault_artifacts": vault_artifact_results}
                        )
                except Exception as _vault_exc:
                    _LOG.warning("Vault artifact processing failed: %s", _vault_exc)

                retrieval_debug_payload = _attach_profile_debug(
                    _build_retrieval_debug_payload(
                        accuracy_profile=effective_accuracy_profile,
                        material_ids=material_ids,
                        selected_material_count=selected_material_count,
                        material_k=effective_material_k,
                        retrieval_course_id=retrieval_course_id,
                        citations=all_citations,
                        rag_debug=rag_debug,
                    )
                )
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
                            from adaptive.telemetry import (
                                emit_evaluate_work,
                                record_error_flag,
                            )

                            verdict_val = parsed_verdict.get("verdict")
                            error_loc = parsed_verdict.get("error_location") or {}
                            skill_id = error_loc.get("node") or session.get("topic")

                            if skill_id and verdict_val in ("pass", "fail", "partial"):
                                correct = verdict_val == "pass"
                                new_p = bkt_update(
                                    adaptive_conn,
                                    "default",
                                    skill_id,
                                    correct,
                                    MasteryConfig(),
                                )
                                emit_evaluate_work(
                                    adaptive_conn,
                                    "default",
                                    skill_id,
                                    correct,
                                    session_id,
                                )
                                mastery_update_payload = {
                                    "skill_id": skill_id,
                                    "new_mastery": round(new_p, 4),
                                    "correct": correct,
                                }

                                # M6: Record error flag on failure
                                if verdict_val == "fail":
                                    record_error_flag(
                                        adaptive_conn,
                                        "default",
                                        skill_id,
                                        error_type=parsed_verdict.get(
                                            "error_type", "unknown"
                                        ),
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
                        is_valid, tb_issues = validate_teach_back_rubric(
                            parsed_teach_back
                        )
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
                                eff = _get_eff(
                                    adaptive_conn, "default", tb_skill, _MC2()
                                )
                                if eff >= _MC2().unlock_threshold:
                                    parsed_teach_back["_mastery_blocked"] = True
                                    _LOG.info(
                                        "Teach-back gate blocking mastery for %s (eff=%.3f)",
                                        tb_skill,
                                        eff,
                                    )

                            # Record BKT event for teach-back outcome
                            tb_rating = parsed_teach_back.get("overall_rating")
                            if tb_skill and tb_rating in ("pass", "fail", "partial"):
                                tb_correct = tb_rating == "pass"
                                new_p = _bkt_tb(
                                    adaptive_conn,
                                    "default",
                                    tb_skill,
                                    tb_correct,
                                    _MC2(),
                                )
                                _emit_tb(
                                    adaptive_conn,
                                    "default",
                                    tb_skill,
                                    tb_correct,
                                    session_id,
                                )
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
        if status:
            status["vault_write_status"] = "skipped"
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

    # Gate: calibrate_skip_if_first_session — skip M-CAL-001 on first course session
    if _should_skip_block(conn, next_block, session) and next_idx < len(blocks) - 1:
        next_idx += 1
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

    # --- Vault auto-write (fire-and-forget) ---
    vault_write_status = "skipped"
    try:
        completing_block = blocks[current_idx]
        artifact_type = str(completing_block.get("artifact_type") or "").strip()

        if artifact_type:
            turns_cur = conn.cursor()
            turns_cur.execute("PRAGMA table_info(tutor_turns)")
            turn_cols = {row[1] for row in turns_cur.fetchall()}

            where_clauses = ["tutor_session_id = ?"]
            params: list[Any] = [session_id]
            used_phase_scope = False

            if "block_index" in turn_cols:
                where_clauses.append("block_index = ?")
                params.append(current_idx)
            elif "phase" in turn_cols:
                phase_candidates = [
                    str(completing_block.get("name") or "").strip(),
                    str(completing_block.get("control_stage") or "").strip(),
                    str(completing_block.get("id") or "").strip(),
                ]
                phase_candidates = [p for p in phase_candidates if p]
                if phase_candidates:
                    placeholders = ",".join("?" * len(phase_candidates))
                    where_clauses.append(f"phase IN ({placeholders})")
                    params.extend(phase_candidates)
                    used_phase_scope = True

            if "role" in turn_cols and "content" in turn_cols:
                select_cols = "role, content"
                role_content_mode = True
            else:
                select_cols = "question, answer"
                role_content_mode = False

            where_sql = " AND ".join(where_clauses)
            turns_cur.execute(
                f"""SELECT {select_cols}
                    FROM tutor_turns
                    WHERE {where_sql}
                    ORDER BY created_at ASC""",
                tuple(params),
            )
            turns = turns_cur.fetchall()

            # If phase matching misses, fall back to recent turns for the session.
            if not turns and used_phase_scope:
                turns_cur.execute(
                    f"""SELECT {select_cols}
                        FROM (
                            SELECT {select_cols}, created_at
                            FROM tutor_turns
                            WHERE tutor_session_id = ?
                            ORDER BY created_at DESC
                            LIMIT 12
                        )
                        ORDER BY created_at ASC""",
                    (session_id,),
                )
                turns = turns_cur.fetchall()

            if role_content_mode:
                content_parts = [
                    row[1]
                    for row in turns
                    if row[0] == "assistant"
                    and isinstance(row[1], str)
                    and row[1].strip()
                ]
            else:
                content_parts = [
                    row[1]
                    for row in turns
                    if isinstance(row[1], str) and row[1].strip()
                ]

            content = "\n\n".join(content_parts) or "(no content)"

            content_filter = _safe_json_dict(session.get("content_filter_json"))
            map_of_contents = content_filter.get("map_of_contents") or {}
            course_label = (
                session.get("course_label")
                or session.get("course")
                or _resolve_class_label(session.get("course_id"))
                or "General Class"
            )
            module_name = (
                session.get("module_name")
                or session.get("module")
                or map_of_contents.get("module_name")
                or content_filter.get("module_name")
                or "General"
            )
            topic = session.get("topic") or module_name or "Session"

            from brain.tutor_templates import render_block_artifact

            rendered = render_block_artifact(
                block_id=str(completing_block.get("id", "")),
                block_name=str(completing_block.get("name") or "Block"),
                control_stage=str(completing_block.get("control_stage") or ""),
                artifact_type=artifact_type,
                session_id=session_id,
                course=str(course_label),
                module=str(module_name),
                topic=str(topic),
                started_at=now,
                ended_at=now,
                content=content,
            )

            from brain.obsidian_vault import ObsidianVault
            from brain.vault_artifact_router import execute_vault_artifact

            vault = ObsidianVault()
            course_folder = f"Study Notes/{course_label}/{module_name}"
            result = execute_vault_artifact(
                vault,
                {
                    "operation": "write-block-note",
                    "params": {
                        "course_folder": course_folder,
                        "block_name": str(completing_block.get("name") or "Block"),
                        "content": rendered,
                    },
                },
            )
            if isinstance(result, str) and (
                result.startswith("Error:") or result.startswith("Unknown")
            ):
                vault_write_status = "failed"
            else:
                vault_write_status = "success"
    except Exception as _vault_exc:
        import logging as _log

        _log.getLogger(__name__).warning("Vault auto-write failed: %s", _vault_exc)
        vault_write_status = "failed"
    # --- End vault auto-write ---

    status = _get_chain_status(conn, session_id)
    conn.close()

    if status:
        status["vault_write_status"] = vault_write_status

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
        runtime_profile = None
        template_id = None
        certification = None
        if chain.get("context_tags"):
            try:
                tags_obj = json.loads(chain["context_tags"])
                if isinstance(tags_obj, dict):
                    if isinstance(tags_obj.get("runtime_profile"), dict):
                        runtime_profile = tags_obj.get("runtime_profile")
                    if isinstance(tags_obj.get("template_id"), str):
                        template_id = tags_obj.get("template_id")
                    if isinstance(tags_obj.get("certification"), dict):
                        certification = tags_obj.get("certification")
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
                "template_id": template_id,
                "certification": certification,
                "runtime_profile": runtime_profile,
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
                    title,  # study_mode
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

    map_of_contents = content_filter.get("map_of_contents") or {}
    objective_ids = map_of_contents.get("objective_ids") or []
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
            notes_by_path: dict[str, str] = {}
            for path in dedup_paths:
                note_res = _vault_read_note(path)
                if note_res.get("success"):
                    notes_by_path[path] = str(note_res.get("content") or "")

            if notes_by_path:
                graph_sync_result = _sync_graph_for_paths(
                    conn=conn,
                    notes_by_path=notes_by_path,
                )
                _LOG.info(
                    "end_session graph sync: %d notes, %d edges created",
                    graph_sync_result.get("notes_synced", 0),
                    graph_sync_result.get("edges_created", 0),
                )
    except Exception as exc:
        _LOG.warning("end_session graph sync failed: %s", exc)

    # --- Refresh Map of Contents if objectives exist ---
    map_of_contents_refresh: Optional[dict[str, Any]] = None
    if objective_ids:
        try:
            ns_result, ns_err = _ensure_moc_context(
                course_id=content_filter.get("course_id"),
                module_id=content_filter.get("module_id"),
                module_name=content_filter.get("module_name"),
                topic=session.get("topic") or "",
                learning_objectives=map_of_contents.get("objectives") or objective_ids,
                source_ids=content_filter.get("source_ids") or [],
                objective_scope=_normalize_objective_scope(
                    content_filter.get("objective_scope")
                ),
                focus_objective_id=str(content_filter.get("focus_objective_id") or "").strip()
                or None,
                force_refresh=True,
                path_override=vault_folder,
            )
            if ns_result:
                map_of_contents_refresh = {
                    "path": ns_result.get("path"),
                    "updated": True,
                }
            elif ns_err:
                _LOG.warning("end_session Map of Contents refresh error: %s", ns_err)
        except Exception as exc:
            _LOG.warning("end_session Map of Contents refresh failed: %s", exc)

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
        rating_context = json.dumps(
            {
                "course_id": content_filter.get("course_id"),
                "module_id": content_filter.get("module_id"),
                "topic": session.get("topic"),
                "session_mode": content_filter.get("session_mode"),
            }
        )

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
            "map_of_contents_refresh": map_of_contents_refresh,
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

    map_of_contents = content_filter.get("map_of_contents") or {}
    objective_ids = map_of_contents.get("objective_ids") or []
    chain_name = content_filter.get("chain_name") or None
    vault_folder = str(content_filter.get("vault_folder") or "").strip() or None
    module_name = (
        map_of_contents.get("module_name") or content_filter.get("module_name") or ""
    )
    topic = session.get("topic") or module_name or "Session"
    session_mode = content_filter.get("session_mode") or "focused_batch"

    # --- Resolve objectives from DB for descriptions ---
    objectives_detail: list[dict[str, str]] = []
    if objective_ids:
        course_id = content_filter.get("course_id")
        if course_id:
            db_objs = _collect_objectives_from_db(
                course_id, content_filter.get("module_id")
            )
            obj_map = {o["objective_id"]: o for o in db_objs}
            for oid in objective_ids:
                obj = obj_map.get(oid, {})
                objectives_detail.append(
                    {
                        "id": oid,
                        "description": obj.get("title", oid),
                        "status": obj.get("status", "active"),
                    }
                )

    # --- Chain progress ---
    chain_status = None
    if chain_name:
        try:
            chain_status = _get_chain_status(conn, session_id)
        except Exception:
            pass

    chain_progress: dict[str, object] | None = None
    blocks_completed: list[str] = []
    if chain_status:
        total = chain_status.get("total_blocks", 0)
        pos = chain_status.get("current_position", 0)
        chain_progress = {
            "current_block": pos,
            "total_blocks": total,
            "chain_name": chain_name or "",
        }
        blocks_completed = chain_status.get("completed_blocks") or []

    # --- Follow-up targets ---
    follow_up_targets = content_filter.get("follow_up_targets") or []

    conn.close()

    # --- Build summary response ---
    total_artifact_count = sum(artifact_counts.values())
    objectives_covered = [
        {
            "id": o["id"],
            "name": o.get("description", o["id"]),
            "status": o.get("status", "active"),
        }
        for o in objectives_detail
    ]

    summary = {
        "session_id": session_id,
        "topic": topic,
        "module_name": module_name,
        "session_mode": session_mode,
        "turn_count": turn_count,
        "duration_minutes": duration_minutes,
        "duration_seconds": round(duration_minutes * 60),
        "artifacts": [{"type": t, "count": c} for t, c in artifact_counts.items()],
        "artifact_count": total_artifact_count,
        "objectives": objectives_detail,
        "objectives_covered": objectives_covered,
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
                if vault_folder:
                    wrap_path = (
                        f"{vault_folder}/_Session_Wrap_{now.strftime('%Y-%m-%d')}.md"
                    )
                else:
                    wrap_path = (
                        f"Study Notes/_Session_Wrap_{now.strftime('%Y-%m-%d')}.md"
                    )

                save_res = _vault_save_note(wrap_path, wrap_result["content"])
                if save_res.get("success"):
                    wrap_saved = {"path": wrap_path, "saved": True}
                    _LOG.info("Session wrap saved to %s", wrap_path)
                else:
                    wrap_saved = {
                        "path": wrap_path,
                        "saved": False,
                        "error": save_res.get("error"),
                    }
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
    route_name = "DELETE /api/tutor/session/<id>"
    request_id = str(uuid.uuid4())
    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        _LOG.info(
            "tutor_delete_session request_id=%s session_id=%s status=already_missing",
            request_id,
            session_id,
        )
        response_payload = {
            "deleted": False,
            "session_id": session_id,
            "status": "already_missing",
            "request_id": request_id,
            "requested_count": 1,
            "deleted_count": 0,
            "skipped_count": 1,
            "failed_count": 0,
            "obsidian_deleted": [],
            "objectives_deleted": 0,
        }
        _record_tutor_delete_telemetry(
            request_id=request_id,
            route=route_name,
            session_id=session_id,
            status="already_missing",
            requested_count=1,
            deleted_count=0,
            skipped_count=1,
            failed_count=0,
            details={"obsidian_deleted_count": 0, "objectives_deleted": 0},
        )
        return jsonify(response_payload)

    expected_paths = _expected_obsidian_paths_for_session(session)
    lo_deleted = 0
    try:
        lo_deleted = _unlink_all_tutor_session_learning_objectives(conn, session_id)
    except Exception:
        conn.rollback()
        conn.close()
        _LOG.exception(
            "tutor_delete_session request_id=%s session_id=%s status=objective_unlink_failed",
            request_id,
            session_id,
        )
        response_payload = {
            "error": "Learning objective cleanup failed",
            "deleted": False,
            "session_id": session_id,
            "status": "objective_unlink_failed",
            "request_id": request_id,
            "requested_count": 1,
            "deleted_count": 0,
            "skipped_count": 0,
            "failed_count": 1,
            "obsidian_deleted": [],
            "objectives_deleted": 0,
        }
        _record_tutor_delete_telemetry(
            request_id=request_id,
            route=route_name,
            session_id=session_id,
            status="objective_unlink_failed",
            requested_count=1,
            deleted_count=0,
            skipped_count=0,
            failed_count=1,
            details={
                "expected_obsidian_count": len(expected_paths),
                "obsidian_deleted_count": 0,
                "missing_obsidian_count": 0,
                "missing_paths": [],
                "obsidian_delete_attempted": False,
            },
        )
        return jsonify(response_payload), 500

    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM tutor_turns WHERE tutor_session_id = ?", (session_id,))
        cur.execute(
            "DELETE FROM tutor_block_transitions WHERE tutor_session_id = ?",
            (session_id,),
        )
        cur.execute("DELETE FROM tutor_sessions WHERE session_id = ?", (session_id,))
        conn.commit()
    except Exception:
        conn.rollback()
        conn.close()
        _LOG.exception(
            "tutor_delete_session request_id=%s session_id=%s status=db_delete_failed",
            request_id,
            session_id,
        )
        response_payload = {
            "error": "Database delete failed",
            "deleted": False,
            "session_id": session_id,
            "status": "db_delete_failed",
            "request_id": request_id,
            "requested_count": 1,
            "deleted_count": 0,
            "skipped_count": 0,
            "failed_count": 1,
            "obsidian_deleted": [],
            "objectives_deleted": lo_deleted,
        }
        _record_tutor_delete_telemetry(
            request_id=request_id,
            route=route_name,
            session_id=session_id,
            status="db_delete_failed",
            requested_count=1,
            deleted_count=0,
            skipped_count=0,
            failed_count=1,
            details={
                "expected_obsidian_count": len(expected_paths),
                "obsidian_deleted_count": 0,
                "missing_obsidian_count": 0,
                "missing_paths": [],
                "objectives_deleted": lo_deleted,
                "obsidian_delete_attempted": False,
            },
        )
        return jsonify(response_payload), 500
    conn.close()

    deleted_paths: list[str] = []
    try:
        deleted_paths = _cascade_delete_obsidian_files(session)
    except Exception:
        _LOG.exception(
            "tutor_delete_session request_id=%s session_id=%s status=obsidian_cleanup_exception",
            request_id,
            session_id,
        )
        deleted_paths = []

    deleted_set = set(deleted_paths)
    missing_paths = [p for p in expected_paths if p not in deleted_set]
    obsidian_cleanup_has_missing = bool(missing_paths)
    if obsidian_cleanup_has_missing:
        _LOG.warning(
            "tutor_delete_session request_id=%s session_id=%s status=obsidian_cleanup_partial expected=%d deleted=%d missing=%d",
            request_id,
            session_id,
            len(expected_paths),
            len(deleted_paths),
            len(missing_paths),
        )

    final_status = (
        "deleted_with_warnings" if obsidian_cleanup_has_missing else "deleted"
    )
    _LOG.info(
        "tutor_delete_session request_id=%s session_id=%s status=%s objectives_deleted=%d obsidian_deleted=%d missing=%d",
        request_id,
        session_id,
        final_status,
        lo_deleted,
        len(deleted_paths),
        len(missing_paths),
    )

    response_payload = {
        "deleted": True,
        "session_id": session_id,
        "status": final_status,
        "request_id": request_id,
        "requested_count": 1,
        "deleted_count": 1,
        "skipped_count": 0,
        "failed_count": 0,
        "obsidian_cleanup": {
            "success": not obsidian_cleanup_has_missing,
            "expected_count": len(expected_paths),
            "deleted_count": len(deleted_paths),
            "missing_paths": missing_paths,
        },
        "obsidian_deleted": deleted_paths,
        "objectives_deleted": lo_deleted,
    }
    if obsidian_cleanup_has_missing:
        response_payload["warning"] = (
            "Session deleted, but some Obsidian files could not be removed"
        )
    _record_tutor_delete_telemetry(
        request_id=request_id,
        route=route_name,
        session_id=session_id,
        status=final_status,
        requested_count=1,
        deleted_count=1,
        skipped_count=0,
        failed_count=0,
        details={
            "expected_obsidian_count": len(expected_paths),
            "deleted_obsidian_count": len(deleted_paths),
            "missing_obsidian_count": len(missing_paths),
            "missing_paths": missing_paths,
            "objectives_deleted": lo_deleted,
        },
    )
    return jsonify(response_payload)


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/artifact — Create artifact mid-session
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/artifact", methods=["POST"])
def create_artifact(session_id: str):
    data = request.get_json(silent=True) or {}
    artifact_type = data.get("type")
    content = data.get("content", "")
    title = data.get("title", "")

    # Map alias types to canonical storage types
    _ARTIFACT_TYPE_ALIASES = {"table": "note", "structured_map": "map"}
    if artifact_type in _ARTIFACT_TYPE_ALIASES:
        artifact_type = _ARTIFACT_TYPE_ALIASES[artifact_type]

    if artifact_type not in ("note", "card", "map", "structured_notes"):
        return jsonify(
            {
                "error": "type must be 'note', 'card', 'map', 'table', 'structured_map', or 'structured_notes'"
            }
        ), 400

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
                        "details": [
                            f"prime_guardrail: {msg}" for msg in prime_violations
                        ],
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

    notes_by_path: dict[str, str] = {}
    for path in dedup_paths:
        note_res = _vault_read_note(path)
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
    route_name = "DELETE /api/tutor/session/<id>/artifacts"
    request_id = str(uuid.uuid4())
    data = request.get_json(silent=True) or {}
    indexes = data.get("indexes")
    if not isinstance(indexes, list) or not all(isinstance(i, int) for i in indexes):
        requested_count = len(indexes) if isinstance(indexes, list) else 0
        _record_tutor_delete_telemetry(
            request_id=request_id,
            route=route_name,
            session_id=session_id,
            status="invalid_request",
            requested_count=requested_count,
            deleted_count=0,
            skipped_count=requested_count,
            failed_count=1,
            details={"reason": "indexes must be a list of integers"},
        )
        return jsonify({"error": "indexes must be a list of integers"}), 400

    conn = get_connection()
    session = _get_tutor_session(conn, session_id)
    if not session:
        conn.close()
        requested_count = len(indexes)
        _record_tutor_delete_telemetry(
            request_id=request_id,
            route=route_name,
            session_id=session_id,
            status="session_not_found",
            requested_count=requested_count,
            deleted_count=0,
            skipped_count=requested_count,
            failed_count=1,
            details={"reason": "session_not_found"},
        )
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

    requested_indexes = list(indexes)
    normalized_indexes = sorted(set(indexes))
    valid_indexes: list[int] = []
    skipped_indexes: list[int] = []

    # Collect Obsidian paths from artifacts being removed, then delete
    deleted_paths: list[str] = []
    for i in normalized_indexes:
        if 0 <= i < len(artifacts):
            valid_indexes.append(i)
            art = artifacts[i]
            if isinstance(art, dict):
                deleted_paths.extend(_delete_artifact_obsidian_files(art))
        else:
            skipped_indexes.append(i)

    # Remove by index (descending so indices stay valid)
    for i in sorted(valid_indexes, reverse=True):
        if 0 <= i < len(artifacts):
            artifacts.pop(i)

    cur = conn.cursor()
    cur.execute(
        "UPDATE tutor_sessions SET artifacts_json = ? WHERE session_id = ?",
        (json.dumps(artifacts), session_id),
    )
    conn.commit()
    conn.close()

    applied_count = len(valid_indexes)
    _LOG.info(
        "tutor_delete_artifacts request_id=%s session_id=%s requested=%d applied=%d skipped=%d",
        request_id,
        session_id,
        len(requested_indexes),
        applied_count,
        len(skipped_indexes),
    )

    response_payload = {
        "deleted": applied_count,
        "session_id": session_id,
        "request_id": request_id,
        "requested_count": len(requested_indexes),
        "applied_count": applied_count,
        "skipped_indexes": skipped_indexes,
        "obsidian_deleted": deleted_paths,
    }
    _record_tutor_delete_telemetry(
        request_id=request_id,
        route=route_name,
        session_id=session_id,
        status="partial_success" if skipped_indexes else "deleted",
        requested_count=len(requested_indexes),
        deleted_count=applied_count,
        skipped_count=len(skipped_indexes),
        failed_count=0,
        details={
            "skipped_indexes": skipped_indexes,
            "obsidian_deleted_count": len(deleted_paths),
        },
    )
    return jsonify(response_payload)


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

# ── Tutor Settings (custom instructions) ─────────────────────────────────

_DEFAULT_CUSTOM_INSTRUCTIONS = _PROMPT_BUILDER_DEFAULT_RULES


@tutor_bp.route("/settings", methods=["GET"])
def get_tutor_settings():
    cfg = load_api_config()
    value = (cfg.get("tutor_custom_instructions") or "").strip()
    return jsonify(
        {
            "custom_instructions": value if value else _DEFAULT_CUSTOM_INSTRUCTIONS,
        }
    )


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
    return jsonify(
        {
            "custom_instructions": cfg["tutor_custom_instructions"],
        }
    )


# ---------------------------------------------------------------------------
# GET /api/tutor/course-map — Return serialized CourseMap from vault_courses.yaml
# ---------------------------------------------------------------------------


@tutor_bp.route("/course-map", methods=["GET"])
def get_course_map():
    try:
        import dataclasses
        from course_map import load_course_map

        cm = load_course_map()
        return jsonify(dataclasses.asdict(cm)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
