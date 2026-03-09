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

# ---------------------------------------------------------------------------
# Turn / chain / streaming helpers  (extracted to api_tutor_turns.py)
# ---------------------------------------------------------------------------
# Explicit imports of every helper used in session / artifact / finalize
# handlers that remain in this file.  The module-level ``import`` at the end
# triggers route registration on ``tutor_bp``.

from dashboard.api_tutor_turns import (  # noqa: E402
    _get_tutor_session,
    _get_session_turns,
    _is_first_session_for_course,
    _should_skip_block,
    _resolve_chain_blocks,
    _parse_chain_context_tags,
    _build_chain_info,
    _chain_requires_prime_launch,
    _get_chain_status,
    _active_control_stage_for_session,
)
import dashboard.api_tutor_turns  # noqa: E402,F401 — registers routes on tutor_bp


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
