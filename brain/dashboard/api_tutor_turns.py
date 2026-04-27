"""
Turn, chain, and streaming helpers extracted from api_tutor.py.

This module holds:
  - Session/turn DB helpers (_get_tutor_session, _get_session_turns, etc.)
  - Chain resolution and status helpers
  - Route handlers for send_turn (SSE streaming), chain-status,
    advance-block, template-chains, chain CRUD, and method blocks.

Functions here may depend on:
  - ``dashboard.api_tutor_utils`` (constants, normalizers, validators)
  - ``dashboard.api_tutor_materials`` (material helpers — late imports)
  - ``dashboard.api_tutor_vault`` (vault helpers — late imports)
  - ``dashboard.api_tutor`` (late imports for ``tutor_bp``, ``_ensure_selector_columns``)
"""

from __future__ import annotations

import json
import logging
import queue
import sqlite3
import time
from datetime import datetime
from threading import Thread
from typing import Any, Optional

from flask import Response, current_app, jsonify, request

from db_setup import get_connection, ensure_method_library_seeded
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
    normalize_accuracy_profile,
)
from scholar_strategy import render_strategy_prompt

from dashboard.api_tutor_utils import (
    _safe_json_dict,
    _extract_knob_defaults,
    _load_method_contracts,
    _runtime_stage,
    _validate_chain_launch_blocks,
    _normalize_wikilinks,
    _normalize_objective_scope,
    _normalize_session_rules,
    _strip_wikilink,
    _wikilink,
    _resolve_class_label,
    _study_notes_base_path,
    _PRIME_DISALLOWED_ASSESSMENT_KEYS,
)

import llm_provider as _llm_provider
from chain_validator import summarize_stage_truth

_LOG = logging.getLogger(__name__)

# Audit B4: ceiling on tool-call iterations per turn. Exposed at module
# scope so integration tests can monkeypatch it without forking the route.
MAX_TOOL_ROUNDS = 5
_NON_ASSESSMENT_STAGES = {"PRIME", "TEACH"}
_DEFAULT_COMPACTION_CONTEXT_WINDOW = 24_000


def _build_compaction_telemetry(usage: Any) -> dict[str, Any] | None:
    if not isinstance(usage, dict):
        return None

    raw_input_tokens = usage.get("input_tokens")
    raw_output_tokens = usage.get("output_tokens")
    if not isinstance(raw_input_tokens, (int, float)) or not isinstance(
        raw_output_tokens, (int, float)
    ):
        return None

    input_tokens = max(0, int(raw_input_tokens))
    output_tokens = max(0, int(raw_output_tokens))
    token_count = input_tokens + output_tokens
    context_window = _DEFAULT_COMPACTION_CONTEXT_WINDOW
    utilization = token_count / context_window if context_window > 0 else 0

    if utilization >= 0.6:
        pressure_level = "high"
    elif utilization >= 0.35:
        pressure_level = "medium"
    else:
        pressure_level = "low"

    return {
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "tokenCount": token_count,
        "contextWindow": context_window,
        "pressureLevel": pressure_level,
    }


def _coerce_string_list(value: Any, *, limit: int | None = None) -> list[str]:
    if not isinstance(value, list):
        return []
    items = [str(item).strip() for item in value if str(item or "").strip()]
    if limit is not None:
        return items[:limit]
    return items


def _coerce_string_dict(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    result: dict[str, str] = {}
    for raw_key, raw_value in value.items():
        key = str(raw_key or "").strip()
        text = str(raw_value or "").strip()
        if key and text:
            result[key] = text
    return result


def _canonical_teach_concept_type(raw_value: Any) -> str:
    value = str(raw_value or "").strip().lower()
    if not value:
        return ""
    mapping = {
        "classification": "compare/contrast",
        "compare": "compare/contrast",
        "compare_contrast": "compare/contrast",
        "confusable": "compare/contrast",
        "confusable pair": "compare/contrast",
        "confusable_pair": "compare/contrast",
        "recognition": "definition",
        "definition": "definition",
        "mechanism": "mechanism",
        "computation": "mechanism",
        "procedure": "procedure",
        "spatial": "spatial",
        "story": "procedure",
        "clinical": "clinical reasoning",
        "clinical_reasoning": "clinical reasoning",
        "synthesis": "clinical reasoning",
    }
    return mapping.get(value, value)


def _infer_teach_concept_type(
    *,
    block_info: Optional[dict[str, Any]],
    chain_info: Optional[dict[str, Any]],
    content_filter: dict[str, Any],
) -> str:
    runtime_profile = chain_info.get("runtime_profile") if isinstance(chain_info, dict) else {}
    if isinstance(runtime_profile, dict):
        for key in ("concept_type", "teaching_lane", "assessment_mode"):
            value = _canonical_teach_concept_type(runtime_profile.get(key))
            if value:
                return value

    for key in ("concept_type", "assessment_mode", "teaching_lane"):
        value = _canonical_teach_concept_type(content_filter.get(key))
        if value:
            return value

    method_name = str((block_info or {}).get("name") or "").strip().lower()
    if "analogy" in method_name:
        return "mechanism"
    if "mechanism" in method_name or "story" in method_name:
        return "mechanism"
    if "comparison" in method_name or "contrast" in method_name:
        return "compare/contrast"
    if "clinical" in method_name or "case" in method_name:
        return "clinical reasoning"
    if "flow" in method_name or "procedure" in method_name:
        return "procedure"
    if "draw" in method_name or "map" in method_name or "spatial" in method_name:
        return "spatial"
    return "definition"


def _default_bridge_moves_for_concept_type(concept_type: str) -> list[str]:
    normalized = _canonical_teach_concept_type(concept_type)
    if normalized == "spatial":
        return ["hand_draw_map", "concept_map"]
    if normalized == "mechanism":
        return ["analogy", "story"]
    if normalized in {"compare/contrast", "confusable", "confusable pair"}:
        return ["comparison_table", "analogy"]
    if normalized == "procedure":
        return ["story", "hand_draw_map"]
    if normalized == "clinical reasoning":
        return ["clinical_anchor_case", "comparison_table"]
    return ["analogy", "clinical_anchor_case"]


def _default_first_bridge_for_concept_type(concept_type: str) -> str:
    bridge_moves = _default_bridge_moves_for_concept_type(concept_type)
    return bridge_moves[0] if bridge_moves else "analogy"


def _default_required_artifact(
    *,
    block_info: Optional[dict[str, Any]],
    concept_type: str,
) -> str:
    method_name = str((block_info or {}).get("name") or "").strip().lower()
    if "comparison" in method_name or "contrast" in method_name:
        return "comparison_table"
    if "mechanism" in method_name or concept_type == "mechanism":
        return "mini_process_flow"
    if concept_type == "procedure":
        return "mini_process_flow"
    if concept_type == "spatial":
        return "hand_draw_map"
    if concept_type == "clinical reasoning":
        return "one_page_anchor"
    return "one_page_anchor"


def _default_function_confirmation_gate(
    concept_type: str,
    *,
    required_artifact: str,
) -> dict[str, str]:
    normalized = _canonical_teach_concept_type(concept_type)
    if normalized == "procedure":
        confirmation_prompt = (
            "Have the learner state the ordered function of the process in one short pass "
            "before moving into L4 precision."
        )
    elif normalized == "spatial":
        confirmation_prompt = (
            "Have the learner identify what the structure does in space before layering on L4 precision."
        )
    else:
        confirmation_prompt = (
            "Have the learner confirm the core function/mechanism in one low-friction check before L4 precision."
        )

    return {
        "mode": "low_friction_function_confirmation",
        "required_before_l4": "true",
        "state": "pending",
        "artifact_dependency": required_artifact or "one_page_anchor",
        "prompt": confirmation_prompt,
        "unlocks": "L4_precision",
        "teach_back_default_gate": "false",
    }


def _default_mnemonic_slot_policy(concept_type: str) -> dict[str, str]:
    normalized = _canonical_teach_concept_type(concept_type)
    if normalized == "clinical reasoning":
        return {
            "mode": "kwik_lite",
            "position": "post_artifact_pre_full_calibrate",
            "availability": "skip_by_default",
            "state": "skipped",
            "reason": "clinical_reasoning_prefers_case_and_function_over_compression",
            "full_kwik_later_stage": "ENCODE_OR_OVERLEARN",
        }
    return {
        "mode": "kwik_lite",
        "position": "post_artifact_pre_full_calibrate",
        "availability": "available_after_close_artifact",
        "state": "locked_until_artifact",
        "reason": "light_compression_after_meaning_and_anchor",
        "full_kwik_later_stage": "ENCODE_OR_OVERLEARN",
    }


def _build_teach_context(
    *,
    session: dict[str, Any],
    block_info: Optional[dict[str, Any]],
    chain_info: Optional[dict[str, Any]],
    content_filter: dict[str, Any],
    map_of_contents: Optional[dict[str, Any]],
    objective_scope: str,
    focus_objective_id: str,
    selected_material_labels: list[str],
) -> Optional[dict[str, Any]]:
    active_stage = str(
        (block_info or {}).get("control_stage")
        or (block_info or {}).get("category")
        or ""
    ).strip().upper()
    if active_stage != "TEACH":
        return None

    runtime_profile = chain_info.get("runtime_profile") if isinstance(chain_info, dict) else {}
    runtime_profile = runtime_profile if isinstance(runtime_profile, dict) else {}
    teach_profile = runtime_profile.get("teach_profile")
    teach_profile = teach_profile if isinstance(teach_profile, dict) else {}

    objective = ""
    if focus_objective_id:
        objective = focus_objective_id
    elif isinstance(map_of_contents, dict):
        objective_ids = _coerce_string_list(map_of_contents.get("objective_ids"), limit=3)
        if objective_ids:
            objective = objective_ids[0] if objective_scope == "single_focus" else ", ".join(objective_ids)
    if not objective:
        objective = str(content_filter.get("focus_objective") or session.get("topic") or "").strip()

    prime_artifacts = _coerce_string_list(content_filter.get("prime_artifacts"), limit=8)
    if not prime_artifacts and isinstance(map_of_contents, dict):
        objective_ids = _coerce_string_list(map_of_contents.get("objective_ids"), limit=6)
        if objective_ids:
            prime_artifacts.append(f"learning_objectives:{', '.join(objective_ids)}")
        map_path = str(map_of_contents.get("path") or "").strip()
        if map_path:
            prime_artifacts.append(f"map_of_contents:{map_path}")

    session_unknowns = _normalize_wikilinks(session.get("unknowns"), max_items=12)
    if session_unknowns:
        prime_artifacts.append("unknowns:" + ", ".join(session_unknowns[:6]))

    source_anchors = selected_material_labels[:8]
    if not source_anchors:
        source_anchors = _coerce_string_list(content_filter.get("source_anchors"), limit=8)

    concept_type = _infer_teach_concept_type(
        block_info=block_info,
        chain_info=chain_info,
        content_filter=content_filter,
    )
    bridge_moves_allowed = _coerce_string_list(
        teach_profile.get("bridge_moves_allowed") or runtime_profile.get("bridge_moves_allowed"),
        limit=6,
    )
    if not bridge_moves_allowed:
        bridge_moves_allowed = _default_bridge_moves_for_concept_type(concept_type)

    exemplar_refs = _coerce_string_list(
        teach_profile.get("exemplar_refs")
        or runtime_profile.get("teach_exemplar_refs")
        or content_filter.get("teach_exemplar_refs"),
        limit=2,
    )

    required_artifact = str(
        teach_profile.get("required_artifact")
        or runtime_profile.get("required_artifact")
        or content_filter.get("required_artifact")
        or _default_required_artifact(block_info=block_info, concept_type=concept_type)
        or ""
    ).strip()

    stop_conditions = _coerce_string_list(
        teach_profile.get("stop_conditions")
        or runtime_profile.get("teach_stop_conditions")
        or content_filter.get("teach_stop_conditions"),
        limit=6,
    )
    if not stop_conditions:
        stop_conditions = [
            "brief_l0_hook_delivered",
            "learner_can_confirm_function",
            "close_artifact_exists",
            "one_application_link_made",
            "tutor_judges_ready_for_full_calibrate",
        ]

    depth_start = str(
        teach_profile.get("depth_start")
        or runtime_profile.get("teach_depth_start")
        or content_filter.get("teach_depth_start")
        or "L0"
    ).strip()
    depth_ceiling = str(
        teach_profile.get("depth_ceiling")
        or runtime_profile.get("teach_depth_ceiling")
        or content_filter.get("teach_depth_ceiling")
        or "L4"
    ).strip()
    first_bridge = str(
        teach_profile.get("first_bridge")
        or runtime_profile.get("teach_first_bridge")
        or content_filter.get("teach_first_bridge")
        or _default_first_bridge_for_concept_type(concept_type)
    ).strip()

    function_confirmation_gate = (
        teach_profile.get("function_confirmation_gate")
        or runtime_profile.get("function_confirmation_gate")
        or content_filter.get("function_confirmation_gate")
    )
    function_confirmation_gate = _coerce_string_dict(function_confirmation_gate)
    if not function_confirmation_gate:
        function_confirmation_gate = _default_function_confirmation_gate(
            concept_type,
            required_artifact=required_artifact,
        )

    mnemonic_slot_policy = (
        teach_profile.get("mnemonic_slot_policy")
        or runtime_profile.get("mnemonic_slot_policy")
        or content_filter.get("mnemonic_slot_policy")
    )
    mnemonic_slot_policy = _coerce_string_dict(mnemonic_slot_policy)
    if not mnemonic_slot_policy:
        mnemonic_slot_policy = _default_mnemonic_slot_policy(concept_type)

    return {
        "objective": objective,
        "source_anchors": source_anchors,
        "prime_artifacts": prime_artifacts,
        "concept_type": concept_type,
        "depth_start": depth_start,
        "depth_ceiling": depth_ceiling,
        "depth_path": ["L0", "L3", "L4"],
        "fallback_depths": ["L1", "L2"],
        "bridge_moves_allowed": bridge_moves_allowed,
        "first_bridge": first_bridge,
        "current_bridge": first_bridge,
        "current_depth": "L3",
        "required_artifact": required_artifact,
        "required_close_artifact": required_artifact,
        "close_artifact_status": "pending",
        "function_confirmation": function_confirmation_gate.get("state") or "pending",
        "function_confirmed": False,
        "function_confirmation_gate": function_confirmation_gate,
        "l4_unlocked": False,
        "mnemonic_state": mnemonic_slot_policy.get("state") or "locked_until_artifact",
        "mnemonic_slot_policy": mnemonic_slot_policy,
        "stop_conditions": stop_conditions,
        "exemplar_refs": exemplar_refs,
        "teach_back_default_gate": False,
    }


def _stream_with_heartbeats(
    iterable,
    *,
    interval_seconds: float,
):
    """Yield SSE comment heartbeats while a blocking generator is waiting."""

    items: queue.Queue[tuple[str, Any]] = queue.Queue()

    def _worker() -> None:
        try:
            for chunk in iterable:
                items.put(("chunk", chunk))
        except Exception as exc:  # pragma: no cover - defensive wrapper
            items.put(("error", exc))
        finally:
            items.put(("done", None))

    Thread(target=_worker, daemon=True).start()

    while True:
        try:
            kind, payload = items.get(timeout=interval_seconds)
        except queue.Empty:
            yield ":\n\n"
            continue

        if kind == "chunk":
            yield payload
            continue
        if kind == "error":
            raise payload
        return


# ---------------------------------------------------------------------------
# Session / turn DB helpers
# ---------------------------------------------------------------------------


def _get_tutor_session(conn, session_id: str) -> Optional[dict]:
    """Fetch a tutor_sessions row as dict."""
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM tutor_sessions WHERE session_id = ?", (session_id,))
    row = cur.fetchone()
    return dict(row) if row else None


def _parse_content_filter_json(
    raw: Optional[str], *, session_id: Optional[str] = None
) -> dict:
    """Safely parse a ``tutor_sessions.content_filter_json`` payload.

    Audit B11: the inline parse used to be
    ``try: json.loads(...) except (JSONDecodeError, TypeError): pass`` which
    silently erased material_ids / knob_snapshots / session_rules whenever
    the row was corrupted. We now log at WARNING (with the session id, when
    available) so operators can triage bad sessions instead of discovering
    the gap days later.
    """
    if raw is None or raw == "":
        return {}
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        _LOG.warning(
            "content_filter_json parse failed for session %s: %s",
            session_id if session_id else "<unknown>",
            exc,
        )
        return {}
    if not isinstance(parsed, dict):
        _LOG.warning(
            "content_filter_json for session %s was not a dict (got %s);"
            " coercing to empty filter",
            session_id if session_id else "<unknown>",
            type(parsed).__name__,
        )
        return {}
    return parsed


def _get_session_turns(conn, session_id: str, limit: int | None = None) -> list[dict]:
    """Fetch tutor_turns for a session, ordered by turn_number ASC.

    Args:
        limit: Max rows to return.  ``None`` (default) returns all turns.
    """
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    sql = """SELECT id, turn_number, question, answer, citations_json,
                    phase, artifacts_json, response_id, model_id,
                    behavior_override, evaluation_json, created_at
             FROM tutor_turns
             WHERE tutor_session_id = ?
             ORDER BY turn_number ASC"""
    params: list = [session_id]
    if limit is not None:
        sql += " LIMIT ?"
        params.append(limit)
    cur.execute(sql, params)
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


# ---------------------------------------------------------------------------
# Chain resolution helpers
# ---------------------------------------------------------------------------


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
    stage_truth = summarize_stage_truth(blocks)

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
        "stage_sequence": stage_truth["stage_sequence"],
        "selected_blocks": stage_truth["selected_blocks"],
        "stage_coverage": stage_truth["stage_coverage"],
        "current_index": current_index,
        "total": len(blocks),
        "runtime_profile": runtime_profile,
        "context_tags": context_tags,
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
# Route handlers — registered on tutor_bp from the main api_tutor module.
# ---------------------------------------------------------------------------

from dashboard.api_tutor import tutor_bp  # noqa: E402


# ---------------------------------------------------------------------------
# POST /api/tutor/session/<id>/turn — Send a message, SSE stream response
# ---------------------------------------------------------------------------


@tutor_bp.route("/session/<session_id>/turn", methods=["POST"])
def send_turn(session_id: str):
    # Late imports for cross-module dependencies
    from dashboard.api_tutor import _ensure_selector_columns
    from dashboard.api_tutor_materials import (
        _accuracy_profile_prompt_guidance,
        _build_gemini_vision_context,
        _build_insufficient_evidence_response,
        _build_material_count_response,
        _build_retrieval_debug_payload,
        _build_selected_scope_listing_response,
        _is_material_count_question,
        _is_selected_scope_listing_question,
        _load_selected_materials,
        _material_scope_labels,
        _normalize_default_mode,
        _normalize_force_full_docs,
        _normalize_material_ids,
        _recommended_mode_flags,
        _resolve_material_retrieval_k,
    )
    from dashboard.api_tutor_vault import (
        _session_has_real_objectives,
        _extract_objectives_from_text,
        _question_within_reference_targets,
    )

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
        # Collapse vault-hardened stages (INTERROGATE/EXPLAIN/CONSOLIDATE/
        # ORIENT/PLAN) onto the legacy runtime vocabulary before
        # comparing, so a method whose YAML declares INTERROGATE matches
        # a chain block stored as TEACH (the runtime stage that
        # M-INT-001 / M-ENC-008 / M-GEN-007 are pinned to).
        if (
            expected_stage
            and active_stage
            and _runtime_stage(active_method_id, expected_stage)
            != _runtime_stage(active_method_id, active_stage)
        ):
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
    if active_stage in _NON_ASSESSMENT_STAGES and behavior_override_norm in {"evaluate", "teach_back"}:
        error_code = (
            "PRIME_ASSESSMENT_BLOCKED"
            if active_stage == "PRIME"
            else "TEACH_ASSESSMENT_BLOCKED"
        )
        conn.close()
        return (
            jsonify(
                {
                    "error": f"Assessment behavior is blocked in {active_stage}. Move to CALIBRATE for scored checks.",
                    "code": error_code,
                    "active_stage": active_stage,
                }
            ),
            400,
        )

    conn.close()

    # Detect artifact commands
    from tutor_chains import detect_artifact_command

    artifact_cmd = detect_artifact_command(question)

    # Parse content filter for retriever. Audit B11: surface parse failures
    # at WARNING so corrupted session rows (bad JSON in content_filter_json)
    # do not silently erase material_ids / knobs / session rules.
    content_filter = _parse_content_filter_json(
        session.get("content_filter_json"), session_id=session_id
    )
    scholar_strategy = None
    if session.get("scholar_strategy_json"):
        try:
            scholar_strategy = json.loads(session["scholar_strategy_json"])
        except (json.JSONDecodeError, TypeError):
            scholar_strategy = None
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
    _mode_provided = "mode" in data
    _mode = data.get("mode", {})
    _materials_on = bool(_mode.get("materials", not _mode_provided))
    _obsidian_on = bool(_mode.get("obsidian", not _mode_provided))
    _web_search_on = bool(_mode.get("web_search", not _mode_provided))
    _deep_think_on = bool(_mode.get("deep_think", False))
    _gemini_vision_on = bool(_mode.get("gemini_vision", False))

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
    teach_context = _build_teach_context(
        session=session,
        block_info=block_info,
        chain_info=chain_info,
        content_filter=content_filter,
        map_of_contents=map_of_contents,
        objective_scope=objective_scope,
        focus_objective_id=focus_objective_id,
        selected_material_labels=selected_material_labels,
    )

    def generate():
        _LOG.debug(
            "generate() entered for session=%s turn=%d",
            session_id,
            session["turn_count"] + 1,
        )
        turn_started_at = time.perf_counter()
        retrieval_completed_at: float | None = None
        first_visible_chunk_at: float | None = None
        full_response = ""
        citations = []
        parsed_verdict = None
        api_model = codex_model or _model
        latest_response_id = None
        latest_thread_id = None
        compaction_telemetry = None
        used_scope_shortcut = False

        from tutor_streaming import (
            format_sse_chunk,
            format_sse_done,
            format_sse_error,
            extract_citations,
        )

        def _mark_first_visible_chunk() -> None:
            nonlocal first_visible_chunk_at
            if first_visible_chunk_at is None:
                first_visible_chunk_at = time.perf_counter()

        def _build_timing_payload(*, tool_rounds: int = 0) -> dict[str, int]:
            payload = {
                "tool_rounds": int(tool_rounds),
                "total_ms": max(
                    0, int(round((time.perf_counter() - turn_started_at) * 1000))
                ),
            }
            if retrieval_completed_at is not None:
                payload["retrieval_ms"] = max(
                    0, int(round((retrieval_completed_at - turn_started_at) * 1000))
                )
            if first_visible_chunk_at is not None:
                payload["first_chunk_ms"] = max(
                    0,
                    int(round((first_visible_chunk_at - turn_started_at) * 1000)),
                )
            return payload

        # Pre-initialise adaptive_conn so the finally-block never hits an
        # UnboundLocalError if build_context / prompt building raises before
        # the real connection is opened (audit B3).
        adaptive_conn = None
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
            retrieval_completed_at = time.perf_counter()
            rag_debug = ctx["debug"]

            material_text = ctx["materials"]
            notes_context_text = ctx["notes"]
            vault_state_text = ctx.get("vault_state", "")

            # Graceful mode when no materials
            if not material_text:
                material_text = (
                    "No course-specific materials were retrieved for this topic. "
                    "Teach from your medical/PT training knowledge. "
                    "Mark such content as [From training knowledge \u2014 verify with your textbooks] "
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
                    material_ids, topic=question
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
                teach_context=teach_context,
            )
            session_rules = _normalize_session_rules(
                content_filter.get("session_rules")
            )
            if session_rules:
                system_prompt += (
                    f"\n\n## Session Rules (Current Session Only)\n{session_rules}"
                )
            packet_context = (content_filter.get("packet_context") or "").strip()
            if packet_context:
                system_prompt += (
                    f"\n\n## Student's Study Packet\n{packet_context}"
                )
            memory_capsule_context = (
                content_filter.get("memory_capsule_context") or ""
            ).strip()
            if memory_capsule_context:
                system_prompt += (
                    f"\n\n## Active Memory Capsule\n{memory_capsule_context}"
                )
            strategy_prompt = render_strategy_prompt(scholar_strategy)
            if strategy_prompt:
                system_prompt += f"\n\n{strategy_prompt}"
            system_prompt += (
                "\n\n## Retrieval Tuning\n"
                f"{_accuracy_profile_prompt_guidance(effective_accuracy_profile)}"
            )
            _needs_lo_save = False
            _lo_save_called = False
            if map_of_contents:
                objective_ids = map_of_contents.get("objective_ids") or []
                objective_lines = "\n".join(
                    f"- [[Learning Objectives & To Do#{str(oid).strip()}|{str(oid).strip()}]]"
                    for oid in objective_ids
                    if str(oid or "").strip()
                )
                if not objective_lines:
                    objective_lines = "- (no mapped objectives yet)"
                system_prompt += (
                    "\n\n## Map of Contents Context\n"
                    f"- Module: {map_of_contents.get('module_name') or 'General Module'}\n"
                    f"- File: {map_of_contents.get('path') or '(missing)'}\n"
                    f"- Status: {map_of_contents.get('status') or 'unknown'}\n"
                    "- Objectives in scope:\n"
                    f"{objective_lines}"
                )
                _needs_lo_save = (
                    not _session_has_real_objectives(map_of_contents)
                    and turn_number <= 5
                )
                if _needs_lo_save:
                    system_prompt += (
                        "\n\n## Missing Learning Objectives\n"
                        "No learning objectives are set for this module yet. "
                        "You MUST resolve this before teaching content.\n"
                        "1. Ask the student: \"I don't have learning objectives for this module yet. "
                        'Are they in your loaded study materials, or would you like to type them in?"\n'
                        "2. If in materials: scan the Retrieved Study Materials for ALL explicit learning objectives, "
                        "chapter goals, or key competencies. List EVERY objective found \u2014 do not summarize, combine, or truncate. "
                        "Number them sequentially: OBJ-1, OBJ-2, OBJ-3, etc. Format: OBJ-N \u2014 Full objective text\n"
                        "3. If student types them: acknowledge and number them the same way\n"
                        "4. If student says skip: proceed without objectives (use general teaching mode)\n"
                        '5. Ask for confirmation: "Are these objectives correct? [Approve / Edit / Skip]"\n'
                        "6. After approval, ask where to save in Obsidian: "
                        '"What folder should I save these to? Example: '
                        'Courses/Neuroscience/Week 9"\n'
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
            if (
                block_info
                and str(block_info.get("control_stage") or "").upper() == "TEACH"
            ):
                system_prompt += (
                    "\n\n## TEACH Stage Guardrails (Hard)\n"
                    "- TEACH is explanation-first, not assessment-first.\n"
                    "- Do not run scored checks, confidence tagging, teach-back grading, or retrieval gating inside TEACH.\n"
                    "- Teach one chunk at a time using: Source Facts -> Plain Interpretation -> Bridge Move -> Application -> Anchor Artifact.\n"
                    "- Function before structure. Meaning first, bridge second, anchor third.\n"
                    "- If you use an analogy or story, state where it breaks and return to the real concept before moving on.\n"
                    "- Hand off based on Tutor judgment when the learner has a usable L2 grasp and one anchor artifact or application link.\n"
                )
            system_prompt += (
                f"\n\n## PRIME Objective Scope\n- Active scope: {objective_scope}\n"
            )
            if objective_scope == "module_all":
                system_prompt += "- Use module-level big-picture orientation first, then ask learner to choose one focus objective.\n"
            else:
                focus_code = _strip_wikilink(focus_objective_id)
                focus_link = (
                    f"[[Learning Objectives & To Do#{focus_code}|{focus_code}]]"
                    if focus_code
                    else ""
                )
                system_prompt += (
                    "- Stay on one focus objective for this turn.\n"
                    f"- Focus objective: {focus_link or 'None selected'}\n"
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
                _mark_first_visible_chunk()
                yield format_sse_chunk(full_response)
                yield format_sse_done(
                    citations=citations,
                    model=api_model,
                    artifacts=artifact_payload,
                    retrieval_debug=retrieval_debug_payload,
                    timing=_build_timing_payload(),
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
                _mark_first_visible_chunk()
                yield format_sse_chunk(full_response)
                yield format_sse_done(
                    citations=citations,
                    model=api_model,
                    artifacts=artifact_payload,
                    retrieval_debug=retrieval_debug_payload,
                    timing=_build_timing_payload(),
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
                _mark_first_visible_chunk()
                yield format_sse_chunk(full_response)
                yield format_sse_done(
                    citations=citations,
                    model=api_model,
                    artifacts=artifact_payload,
                    retrieval_debug=retrieval_debug_payload,
                    timing=_build_timing_payload(),
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
                    "Tutor tools: %d schemas loaded \u2014 %s | needs_lo_save=%s turn=%d",
                    len(tool_schemas),
                    [s.get("name") for s in tool_schemas],
                    _needs_lo_save,
                    turn_number,
                )
                # Audit B4: exposed via module-level MAX_TOOL_ROUNDS so
                # tests (and emergency ops) can tune the ceiling without
                # redeploying.
                max_tool_rounds = MAX_TOOL_ROUNDS
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
                                _mark_first_visible_chunk()
                                yield format_sse_chunk(chunk.get("text", ""))
                            elif chunk.get("type") == "web_search":
                                _mark_first_visible_chunk()
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
                                compaction_telemetry = _build_compaction_telemetry(
                                    chunk.get("usage")
                                )
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
                            _mark_first_visible_chunk()
                            # Audit B4: emit a terminal tool_result SSE and
                            # a synthetic function_call_output for every
                            # tool_call seen in the capping round.
                            #
                            # Pre-fix we only yielded `tool_limit_reached`
                            # which left OpenAI's server-side response
                            # state with unpaired function_calls -- the
                            # next user-initiated turn would then error
                            # out because the Responses API requires each
                            # function_call to be closed by a
                            # function_call_output in the next request.
                            cap_message = (
                                "tool-round cap reached; no further tool "
                                "calls executed this turn"
                            )
                            for _tc in tool_calls_this_round:
                                _tc_name = _tc.get("name", "")
                                _tc_call_id = _tc.get("call_id", "")
                                yield format_sse_chunk(
                                    _json.dumps(
                                        {
                                            "tool": _tc_name,
                                            "call_id": _tc_call_id,
                                            "success": False,
                                            "message": cap_message,
                                            "capped": True,
                                        }
                                    ),
                                    chunk_type="tool_result",
                                )
                                pending_tool_results.append(
                                    {
                                        "type": "function_call_output",
                                        "call_id": _tc_call_id,
                                        "output": _json.dumps(
                                            {
                                                "success": False,
                                                "message": cap_message,
                                                "capped": True,
                                            }
                                        ),
                                    }
                                )
                            yield format_sse_chunk("", chunk_type="tool_limit_reached")
                            break

                        for tc in tool_calls_this_round:
                            tool_name = tc.get("name", "")
                            call_id = tc.get("call_id", "")
                            try:
                                args = _json.loads(tc.get("arguments", "{}"))
                            except _json.JSONDecodeError:
                                args = {}

                            _mark_first_visible_chunk()
                            yield format_sse_chunk(
                                _json.dumps({"tool": tool_name, "arguments": args}),
                                chunk_type="tool_call",
                            )

                            tool_result = execute_tool(
                                tool_name, args, session_id=session_id
                            )

                            _mark_first_visible_chunk()
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
                            _mark_first_visible_chunk()
                            yield format_sse_chunk(full_response[i : i + max_chars])
                    else:
                        raise stream_err

                # --- Auto-invocation fallback ---
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
                            _mark_first_visible_chunk()
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
                    compaction_telemetry=compaction_telemetry,
                    timing=_build_timing_payload(tool_rounds=tool_round),
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
            if adaptive_conn is not None:
                try:
                    adaptive_conn.close()
                except Exception:
                    pass

        # After streaming completes, log the turn
        try:
            db_conn = get_connection()
            cur = db_conn.cursor()
            now = datetime.now().isoformat()

            # Build rich artifacts payload for session restore (Gap 4).
            # Stores citations, verdict, toolActions, and retrieval_debug
            # so the frontend can fully reconstruct the turn on restore.
            _rich_artifacts: dict[str, Any] = {}
            if artifact_cmd:
                _rich_artifacts["command"] = artifact_cmd
            if citations:
                _rich_artifacts["citations"] = citations
            if parsed_verdict:
                _rich_artifacts["verdict"] = parsed_verdict
            try:
                if retrieval_debug_payload:
                    _rich_artifacts["retrieval_debug"] = retrieval_debug_payload
            except NameError:
                pass
            try:
                if parsed_teach_back:
                    _rich_artifacts["teach_back_rubric"] = parsed_teach_back
            except NameError:
                pass

            cur.execute(
                """INSERT INTO tutor_turns
                   (session_id, tutor_session_id, course_id, turn_number,
                    question, answer, citations_json, response_id, model_id,
                    phase, artifacts_json, behavior_override, evaluation_json,
                    strategy_snapshot_json, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
                    json.dumps(_rich_artifacts) if _rich_artifacts else None,
                    behavior_override,
                    json.dumps(parsed_verdict) if parsed_verdict else None,
                    json.dumps(scholar_strategy) if scholar_strategy else None,
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

            # Gap 9: Log retrieval accuracy data for feedback loop
            try:
                _acc_confidence = None
                _acc_source_count = 0
                _acc_chunk_count = 0
                try:
                    _rd = retrieval_debug_payload
                    if isinstance(_rd, dict):
                        _acc_confidence = _rd.get(
                            "retrieval_confidence_tier"
                        )
                        _acc_source_count = int(
                            _rd.get("retrieved_material_unique_sources", 0)
                        )
                        _acc_chunk_count = int(
                            _rd.get("retrieved_material_chunks", 0)
                        )
                except NameError:
                    pass

                cur.execute(
                    """INSERT INTO tutor_accuracy_log
                       (session_id, turn_number, topic,
                        retrieval_confidence, source_count,
                        chunk_count, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        session_id,
                        turn_number,
                        session.get("topic"),
                        _acc_confidence,
                        _acc_source_count,
                        _acc_chunk_count,
                        now,
                    ),
                )
            except Exception as _acc_exc:
                # Audit B6: upgrade to WARNING — accuracy-log failures were
                # invisible at DEBUG and silently eroded the feedback loop.
                _LOG.warning("Accuracy log insert failed: %s", _acc_exc)

            db_conn.commit()
            db_conn.close()
        except Exception as _persist_exc:
            # Audit B2: previously swallowed silently. Persistence failure
            # here means the turn rendered but never made it to
            # tutor_turns — surface it to the server log so operators can
            # triage instead of discovering the gap days later.
            _LOG.warning(
                "Failed to persist tutor turn for session %s: %s",
                session_id,
                _persist_exc,
                exc_info=True,
            )

    heartbeat_seconds = current_app.config.get("TUTOR_SSE_HEARTBEAT_SECONDS", 15.0)
    try:
        heartbeat_seconds = float(heartbeat_seconds)
    except (TypeError, ValueError):
        heartbeat_seconds = 15.0
    if heartbeat_seconds <= 0:
        heartbeat_seconds = 15.0

    return Response(
        _stream_with_heartbeats(
            generate(),
            interval_seconds=heartbeat_seconds,
        ),
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
            course_folder = _study_notes_base_path(
                course_label=course_label,
                module_or_week=module_name,
                subtopic=module_name,
                strict=True,
            )
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
