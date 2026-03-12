"""
Tutor API Blueprint — Flask endpoints for the Adaptive Tutor system.

This module is the thin registration hub.  Route handlers live in sub-modules:

  api_tutor_sessions.py   — Session CRUD + preflight
  api_tutor_artifacts.py  — Artifact creation / finalize / graph-sync / delete
  api_tutor_turns.py      — Turn streaming, chain management, advance-block
  api_tutor_materials.py  — Material library, upload, video processing, sync

Routes kept here (config & utilities):
  GET    /api/tutor/config/check
  GET    /api/tutor/embed/status
  POST   /api/tutor/embed
  GET    /api/tutor/settings
  PUT    /api/tutor/settings
  GET    /api/tutor/course-map
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
from tutor_rag import (
    _collection_for_embeddings,
    _resolve_embedding_provider,
    init_vectorstore,
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
# Session CRUD routes  (extracted to api_tutor_sessions.py)
# ---------------------------------------------------------------------------
import dashboard.api_tutor_sessions  # noqa: E402,F401 — registers routes on tutor_bp

# ---------------------------------------------------------------------------
# Artifact routes  (extracted to api_tutor_artifacts.py)
# ---------------------------------------------------------------------------
import dashboard.api_tutor_artifacts  # noqa: E402,F401 — registers routes on tutor_bp

# ---------------------------------------------------------------------------
# Accuracy feedback loop  (extracted to api_tutor_accuracy.py)
# ---------------------------------------------------------------------------
from dashboard.api_tutor_accuracy import _init as _init_accuracy  # noqa: E402
_init_accuracy(tutor_bp)


# ===========================================================================
# Config & utility routes  (kept in this module)
# ===========================================================================


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
    try:
        embedding_cfg = _resolve_embedding_provider()
    except Exception:
        embedding_cfg = {
            "provider": "openai",
            "model": "text-embedding-3-small",
            "auto_selected": False,
        }
    active_provider = str(embedding_cfg["provider"]).strip().lower()
    active_model = str(embedding_cfg["model"]).strip()

    cur.execute(
        """SELECT id, title, source_path
           FROM rag_docs
           WHERE COALESCE(corpus, 'materials') = 'materials'
             AND COALESCE(enabled, 1) = 1
           ORDER BY title"""
    )
    materials = []
    material_index: dict[int, dict[str, Any]] = {}
    for row in cur.fetchall():
        item = {
            "id": int(row["id"]),
            "title": row["title"],
            "source_path": row["source_path"],
            "chunk_count": 0,
            "embedded": 0,
            "stale_chunk_count": 0,
            "missing_index_chunk_count": 0,
            "needs_reembed": False,
            "provider": None,
            "embedding_model": None,
            "embedding_dimension": None,
            "index_state": "pending",
            "last_failure": None,
        }
        materials.append(item)
        material_index[item["id"]] = item

    cur.execute("PRAGMA table_info(rag_embeddings)")
    embedding_columns = {
        row["name"] if isinstance(row, sqlite3.Row) else row[1]
        for row in cur.fetchall()
    }

    active_chroma_ids: dict[int, list[str]] = {}

    if {"provider", "embedding_model"}.issubset(embedding_columns):
        dimension_select = (
            "MAX(embedding_dimension) AS embedding_dimension,"
            if "embedding_dimension" in embedding_columns
            else "NULL AS embedding_dimension,"
        )
        cur.execute(
            f"""SELECT rag_doc_id,
                      provider,
                      embedding_model,
                      {dimension_select}
                      COUNT(*) AS chunk_count
               FROM rag_embeddings
               GROUP BY rag_doc_id, provider, embedding_model"""
        )
        for row in cur.fetchall():
            rag_doc_id = int(row["rag_doc_id"])
            item = material_index.get(rag_doc_id)
            if item is None:
                continue
            row_provider = str(row["provider"] or "").strip().lower()
            row_model = str(row["embedding_model"] or "").strip()
            chunk_count = int(row["chunk_count"] or 0)
            if row_provider == active_provider and row_model == active_model:
                item["chunk_count"] += chunk_count
                item["embedded"] = 1
                item["provider"] = row_provider
                item["embedding_model"] = row_model
                item["embedding_dimension"] = row["embedding_dimension"]
            else:
                item["stale_chunk_count"] += chunk_count
    else:
        cur.execute(
            """SELECT rag_doc_id, COUNT(*) AS chunk_count
               FROM rag_embeddings
               GROUP BY rag_doc_id"""
        )
        for row in cur.fetchall():
            rag_doc_id = int(row["rag_doc_id"])
            item = material_index.get(rag_doc_id)
            if item is None:
                continue
            item["stale_chunk_count"] = int(row["chunk_count"] or 0)

    if {"provider", "embedding_model", "chroma_id"}.issubset(embedding_columns):
        cur.execute(
            """
            SELECT rag_doc_id, chroma_id
            FROM rag_embeddings
            WHERE provider = ? AND embedding_model = ?
            """,
            (active_provider, active_model),
        )
        for row in cur.fetchall():
            rag_doc_id = int(row["rag_doc_id"])
            chroma_id = str(row["chroma_id"] or "").strip()
            if not chroma_id or rag_doc_id not in material_index:
                continue
            active_chroma_ids.setdefault(rag_doc_id, []).append(chroma_id)

    live_ids: set[str] | None = None
    active_ids = [doc_id for ids in active_chroma_ids.values() for doc_id in ids]
    if active_ids:
        try:
            vectorstore = init_vectorstore(
                "tutor_materials",
                provider_override=active_provider,
                model_override=active_model,
            )
            collection = getattr(vectorstore, "_collection", None)
            getter = getattr(collection, "get", None)
            if callable(getter):
                try:
                    probe = getter(ids=active_ids)
                except TypeError:
                    probe = getter(active_ids)
                live_ids = set()
                if isinstance(probe, dict):
                    raw_ids = probe.get("ids")
                    if isinstance(raw_ids, list):
                        for entry in raw_ids:
                            if isinstance(entry, list):
                                live_ids.update(str(v) for v in entry if v)
                            elif entry:
                                live_ids.add(str(entry))
            else:
                live_ids = None
        except Exception:
            live_ids = None

    if "rag_embedding_failures" in {
        row["name"] if isinstance(row, sqlite3.Row) else row[1]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }:
        cur.execute(
            """
            SELECT f.rag_doc_id, f.provider, f.embedding_model, f.failure_stage, f.error_type, f.error_message, f.failed_at
            FROM rag_embedding_failures f
            INNER JOIN (
                SELECT rag_doc_id, MAX(failed_at) AS failed_at
                FROM rag_embedding_failures
                GROUP BY rag_doc_id
            ) latest
                ON latest.rag_doc_id = f.rag_doc_id
               AND latest.failed_at = f.failed_at
            """
        )
        for row in cur.fetchall():
            item = material_index.get(int(row["rag_doc_id"]))
            if item is None:
                continue
            item["last_failure"] = {
                "provider": row["provider"],
                "embedding_model": row["embedding_model"],
                "failure_stage": row["failure_stage"],
                "error_type": row["error_type"],
                "error_message": row["error_message"],
                "failed_at": row["failed_at"],
            }

    for item in materials:
        if live_ids is not None and item["id"] in active_chroma_ids:
            doc_ids = active_chroma_ids[item["id"]]
            item["missing_index_chunk_count"] = len(
                [doc_id for doc_id in doc_ids if doc_id not in live_ids]
            )

        item["needs_reembed"] = bool(
            item["stale_chunk_count"] > 0
            or item["missing_index_chunk_count"] > 0
        ) and item["chunk_count"] >= 0
        if item["chunk_count"] > 0 and item["missing_index_chunk_count"] == 0:
            item["index_state"] = "ready"
            item["needs_reembed"] = bool(item["stale_chunk_count"] > 0)
        elif item["missing_index_chunk_count"] > 0:
            item["index_state"] = "index_missing"
            item["needs_reembed"] = True
        elif item["stale_chunk_count"] > 0:
            item["index_state"] = "stale"
            item["needs_reembed"] = True
        else:
            item["index_state"] = "pending"

    conn.close()

    total = len(materials)
    embedded_count = sum(1 for m in materials if m["embedded"])
    stale_count = sum(1 for m in materials if m["needs_reembed"])

    collection = _collection_for_embeddings(
        "tutor_materials",
        active_provider,
        active_model,
    )

    return jsonify(
        {
            "materials": materials,
            "total": total,
            "embedded": embedded_count,
            "pending": total - embedded_count,
            "stale": stale_count,
            "provider": active_provider,
            "model": active_model,
            "collection": collection,
            "auto_selected_provider": bool(embedding_cfg.get("auto_selected", False)),
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
