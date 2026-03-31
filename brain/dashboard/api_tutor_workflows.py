"""
Tutor workflow routes for the staged Tutor redesign scaffold.
"""

from __future__ import annotations

import json
import re
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from flask import jsonify, request

from db_setup import get_connection

from dashboard.api_tutor import tutor_bp  # noqa: E402

VALID_WORKFLOW_STAGES = {"launch", "priming", "tutor", "polish", "final_sync"}
VALID_WORKFLOW_STATUSES = {
    "launch_ready",
    "priming_in_progress",
    "priming_complete",
    "tutor_in_progress",
    "tutor_complete",
    "polish_in_progress",
    "polish_complete",
    "stored",
    "abandoned",
    "error",
}
VALID_NOTE_MODES = {"exact", "editable"}
VALID_FEEDBACK_SENTIMENTS = {"liked", "disliked"}
_UNSET = object()
_ROOT = Path(__file__).resolve().parents[2]
_METHODS_DIR = _ROOT / "sop" / "library" / "methods"
_PRIME_METHODS_CACHE: dict[str, Any] = {"stamp": None, "cards": {}}

PRIME_LEGACY_METHOD_MAP = {
    "summary_first": "M-PRE-013",
    "learning_objectives": "M-PRE-010",
    "concept_mapping": "M-PRE-005",
    "weak_point_surfacing": "M-PRE-014",
    "terminology_extraction": "M-PRE-012",
}
PRIME_TEACH_REDIRECT_SLUGS = {"root_understanding"}
DEFAULT_PRIMING_METHOD_IDS = ["M-PRE-010", "M-PRE-008"]
PRIMING_CONTENT_CHUNK_CHARS = 12000
PRIMING_CONTENT_CHUNK_OVERLAP = 1000
PRIME_OBJECTIVE_METHOD_IDS = {"M-PRE-010"}
PRIME_STRUCTURAL_METHOD_IDS = {"M-PRE-004", "M-PRE-005", "M-PRE-006", "M-PRE-008", "M-PRE-009"}
PRIME_METHOD_OUTPUT_FAMILY = {
    "M-PRE-002": "prequestions",
    "M-PRE-004": "structural_overview",
    "M-PRE-005": "structural_overview",
    "M-PRE-006": "structural_overview",
    "M-PRE-008": "structural_overview",
    "M-PRE-009": "structural_overview",
    "M-PRE-010": "objectives",
    "M-PRE-012": "terminology",
    "M-PRE-013": "orientation_summary",
    "M-PRE-014": "ambiguity_scan",
}
PRIME_METHOD_OUTPUT_KEYS = {
    "M-PRE-002": {"questions"},
    "M-PRE-004": {"concepts", "map", "follow_up_targets"},
    "M-PRE-005": {"concepts", "map", "follow_up_targets"},
    "M-PRE-006": {"concepts", "map", "follow_up_targets"},
    "M-PRE-008": {"concepts", "map", "follow_up_targets"},
    "M-PRE-009": {"concepts", "map", "follow_up_targets"},
    "M-PRE-010": {"learning_objectives"},
    "M-PRE-012": {"terminology"},
    "M-PRE-013": {"summary", "major_sections"},
    "M-PRE-014": {"gaps", "unsupported_jumps"},
}
PRIMING_RESULT_BLOCK_KINDS = {"objectives", "concept_map", "summary", "terms", "generic"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _json_loads(value: Any, default: Any) -> Any:
    if not value:
        return default
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError, json.JSONDecodeError):
        return default
    return parsed if isinstance(parsed, type(default)) else default


def _normalize_stage(value: Any, *, default: str) -> str:
    stage = str(value or "").strip().lower()
    return stage if stage in VALID_WORKFLOW_STAGES else default


def _normalize_status(value: Any, *, default: str) -> str:
    status = str(value or "").strip().lower()
    return status if status in VALID_WORKFLOW_STATUSES else default


def _normalize_list(value: Any, *, field_name: str) -> list[Any]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list")
    return value


def _normalize_dict(value: Any, *, field_name: str) -> dict[str, Any] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")
    return value


def _normalize_text(value: Any) -> str | None:
    text = str(value or "").strip()
    return text or None


def _normalize_int(value: Any, *, field_name: str) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be an integer") from exc


def _normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        text = _normalize_text(item)
        if text:
            items.append(text)
    return items


def _dedupe_string_list(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        key = value.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(value.strip())
    return result


def _normalize_priming_method_id(value: Any) -> str | None:
    text = _normalize_text(value)
    if not text:
        return None
    upper = text.upper()
    if upper in PRIME_METHOD_OUTPUT_FAMILY:
        return upper
    lower = text.lower()
    if lower in PRIME_TEACH_REDIRECT_SLUGS:
        return None
    return PRIME_LEGACY_METHOD_MAP.get(lower)


def _normalize_priming_methods(value: Any, legacy_value: Any = None) -> list[str]:
    raw_methods = _normalize_string_list(value)
    if not raw_methods:
        legacy = _normalize_text(legacy_value)
        if legacy:
            raw_methods = [legacy]
    deduped: list[str] = []
    seen: set[str] = set()
    for method in raw_methods:
        normalized = _normalize_priming_method_id(method)
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(normalized)
    return deduped


def _normalize_objective_list(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    items: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in value:
        if not isinstance(item, dict):
            continue
        title = _normalize_text(item.get("title"))
        if not title:
            continue
        lo_code = _normalize_text(item.get("lo_code"))
        key = (title.casefold(), lo_code.casefold() if lo_code else "")
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "title": title,
                "lo_code": lo_code,
            }
        )
    return items


def _normalize_priming_method_outputs(method_id: str, value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    if method_id == "M-PRE-012":
        terminology = _normalize_terminology_output(value)
        return {"terminology": terminology} if terminology else {}
    if method_id == "M-PRE-013":
        normalized_summary = _normalize_orientation_summary_output(value)
        return normalized_summary if normalized_summary else {}
    allowed = PRIME_METHOD_OUTPUT_KEYS.get(method_id) or set()
    normalized: dict[str, Any] = {}
    for key in allowed:
        if key == "learning_objectives":
            objectives = _normalize_objective_list(value.get(key))
            if objectives:
                normalized[key] = objectives
        elif key in {"concepts", "terminology", "gaps", "unsupported_jumps", "questions", "major_sections", "follow_up_targets"}:
            items = _dedupe_string_list(_normalize_string_list(value.get(key)))
            if items:
                normalized[key] = items
        else:
            text = _normalize_text(value.get(key))
            if text:
                normalized[key] = text
    return normalized


def _normalize_terminology_output(value: dict[str, Any]) -> list[str]:
    entries: list[str] = []
    entries.extend(_normalize_terminology_entries(value.get("terminology")))
    entries.extend(_normalize_terminology_entries(value.get("TerminologySet")))
    entries.extend(_normalize_terminology_entries(value.get("terminology_set")))
    entries.extend(_normalize_terminology_entries(value.get("AbbreviationMap")))
    entries.extend(_normalize_terminology_entries(value.get("abbreviation_map")))
    entries.extend(_normalize_terminology_entries(value.get("ComponentDefinitionList")))
    entries.extend(_normalize_terminology_entries(value.get("component_definition_list")))
    return _dedupe_string_list(entries)


def _normalize_terminology_entries(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, dict):
        normalized: list[str] = []
        for raw_term, raw_definition in value.items():
            term = _normalize_text(raw_term)
            definition = _normalize_text(raw_definition)
            if term and definition:
                normalized.append(f"{term} :: {definition}")
            elif term:
                normalized.append(term)
        return normalized
    if isinstance(value, str):
        text = value.strip()
        return [text] if text else []
    if not isinstance(value, list):
        return []

    normalized: list[str] = []
    for item in value:
        if isinstance(item, dict):
            term = _normalize_text(
                item.get("term")
                or item.get("name")
                or item.get("abbreviation")
                or item.get("component")
                or item.get("label")
            )
            definition = _normalize_text(
                item.get("definition")
                or item.get("meaning")
                or item.get("description")
                or item.get("expansion")
            )
            raw = _normalize_text(item.get("raw"))
            if term and definition:
                normalized.append(f"{term} :: {definition}")
            elif raw:
                normalized.append(raw)
            elif term:
                normalized.append(term)
            continue
        text = _normalize_text(item)
        if text:
            normalized.append(text)
    return normalized


def _normalize_orientation_summary_output(value: dict[str, Any]) -> dict[str, Any]:
    north_star = _normalize_text(
        value.get("north_star_sentence")
        or value.get("NorthStarSentence")
        or value.get("northStarSentence")
    )
    summary = _normalize_text(
        value.get("summary")
        or value.get("OrientationSummary")
        or value.get("orientation_summary")
    )
    combined_summary = _combine_summary_parts(north_star, summary)
    major_sections = _dedupe_string_list(
        _normalize_string_list(value.get("major_sections"))
        + _normalize_string_list(value.get("MajorSectionList"))
        + _normalize_string_list(value.get("majorSectionList"))
    )
    normalized: dict[str, Any] = {}
    if combined_summary:
        normalized["summary"] = combined_summary
    if major_sections:
        normalized["major_sections"] = major_sections
    return normalized


def _combine_summary_parts(north_star: str | None, summary: str | None) -> str | None:
    parts: list[str] = []
    for candidate in (north_star, summary):
        text = _normalize_text(candidate)
        if not text:
            continue
        if text in parts:
            continue
        parts.append(text)
    if not parts:
        return None
    return "\n\n".join(parts)


def _normalize_priming_method_run(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    method_id = _normalize_priming_method_id(value.get("method_id"))
    if not method_id:
        return None
    outputs = _normalize_priming_method_outputs(method_id, value.get("outputs"))
    return {
        "method_id": method_id,
        "method_name": _normalize_text(value.get("method_name")) or method_id,
        "output_family": _normalize_text(value.get("output_family")) or PRIME_METHOD_OUTPUT_FAMILY.get(method_id) or "notes",
        "outputs": outputs,
        "source_ids": [
            source_id
            for source_id in (
                _normalize_int(item, field_name="priming_method_run.source_ids[]")
                for item in _normalize_list(value.get("source_ids"), field_name="priming_method_run.source_ids")
            )
            if source_id is not None
        ],
        "status": _normalize_text(value.get("status")) or "complete",
        "updated_at": _normalize_text(value.get("updated_at")),
    }


def _normalize_priming_method_runs(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    runs: list[dict[str, Any]] = []
    seen: set[tuple[str, tuple[int, ...]]] = set()
    for item in value:
        normalized = _normalize_priming_method_run(item)
        if not normalized:
            continue
        key = (normalized["method_id"], tuple(normalized.get("source_ids") or ()))
        if key in seen:
            continue
        seen.add(key)
        runs.append(normalized)
    return runs


def _normalize_priming_result_terms(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    terms: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        term = _normalize_text(item.get("term"))
        raw = _normalize_text(item.get("raw"))
        definition = _normalize_text(item.get("definition"))
        if not term and not raw:
            continue
        resolved_term = term or raw or "Term"
        resolved_raw = raw or (
            f"{resolved_term} :: {definition}" if definition else resolved_term
        )
        terms.append(
            {
                "term": resolved_term,
                "definition": definition,
                "raw": resolved_raw,
            }
        )
    return terms


def _normalize_priming_result_block(value: Any, *, field_name: str) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    block_id = _normalize_text(value.get("id"))
    title = _normalize_text(value.get("title"))
    badge = _normalize_text(value.get("badge"))
    content = _normalize_text(value.get("content"))
    source_label = _normalize_text(value.get("sourceLabel") or value.get("source_label"))
    kind = _normalize_text(value.get("kind")) or "generic"

    if not block_id or not title or not badge or not content or not source_label:
        return None
    if kind not in PRIMING_RESULT_BLOCK_KINDS:
        kind = "generic"

    block: dict[str, Any] = {
        "id": block_id,
        "title": title,
        "badge": badge,
        "kind": kind,
        "sourceLabel": source_label,
        "content": content,
    }
    material_id = _normalize_int(
        value.get("materialId") if "materialId" in value else value.get("material_id"),
        field_name=f"{field_name}.materialId",
    )
    if material_id is not None:
        block["materialId"] = material_id
    objectives = _normalize_objective_list(value.get("objectives"))
    if objectives:
        block["objectives"] = objectives
    terms = _normalize_priming_result_terms(value.get("terms"))
    if terms:
        block["terms"] = terms
    return block


def _normalize_priming_displayed_run(
    value: Any,
    *,
    field_name: str,
) -> dict[str, Any] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")

    run_kind = _normalize_text(value.get("kind")) or "method"
    if run_kind not in {"method", "chain"}:
        raise ValueError(f"{field_name}.kind must be 'method' or 'chain'")

    blocks = [
        normalized
        for normalized in (
            _normalize_priming_result_block(item, field_name=f"{field_name}.blocks[]")
            for item in _normalize_list(value.get("blocks"), field_name=f"{field_name}.blocks")
        )
        if normalized is not None
    ]
    if not blocks:
        raise ValueError(f"{field_name}.blocks must include at least one block")

    normalized_run: dict[str, Any] = {
        "key": _normalize_text(value.get("key")) or f"priming-run-{uuid.uuid4().hex[:8]}",
        "label": _normalize_text(value.get("label")) or "Priming Results",
        "kind": run_kind,
        "blocks": blocks,
    }
    method_id = _normalize_priming_method_id(
        value.get("methodId") if "methodId" in value else value.get("method_id")
    )
    if method_id:
        normalized_run["methodId"] = method_id
    chain_id = _normalize_int(
        value.get("chainId") if "chainId" in value else value.get("chain_id"),
        field_name=f"{field_name}.chainId",
    )
    if chain_id is not None:
        normalized_run["chainId"] = chain_id
    return normalized_run


def _normalize_priming_conversation_turn(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    role = _normalize_text(value.get("role")) or "user"
    if role not in {"user", "assistant"}:
        return None
    message = _normalize_text(value.get("message"))
    if not message:
        return None
    turn: dict[str, Any] = {
        "role": role,
        "message": message,
    }
    updated_results_value = (
        value.get("updatedResults")
        if "updatedResults" in value
        else value.get("updated_results")
    )
    if updated_results_value is not None:
        updated_results = _normalize_priming_displayed_run(
            updated_results_value,
            field_name="conversation_history.updatedResults",
        )
        if updated_results:
            turn["updatedResults"] = updated_results
    return turn


def _load_prime_method_cards() -> dict[str, dict[str, Any]]:
    if not _METHODS_DIR.exists():
        return {}
    try:
        import yaml
    except ImportError:
        return {}

    files = sorted(_METHODS_DIR.glob("M-PRE-*.yaml"))
    stamp = tuple((file.name, file.stat().st_mtime_ns) for file in files)
    if _PRIME_METHODS_CACHE.get("stamp") == stamp:
        return _PRIME_METHODS_CACHE.get("cards") or {}

    cards: dict[str, dict[str, Any]] = {}
    for path in files:
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, dict):
            continue
        method_id = _normalize_text(data.get("id"))
        if not method_id:
            continue
        cards[method_id] = {
            "method_id": method_id,
            "name": _normalize_text(data.get("name")) or method_id,
            "description": _normalize_text(data.get("description")) or "",
            "outputs_summary": _normalize_text(data.get("outputs_summary")) or "",
            "artifact_type": _normalize_text(data.get("artifact_type")) or "notes",
            "inputs": _normalize_string_list(data.get("inputs")),
            "required_outputs": _normalize_string_list(data.get("required_outputs")),
            "allowed_moves": _normalize_string_list(data.get("allowed_moves")),
            "forbidden_moves": _normalize_string_list(data.get("forbidden_moves")),
            "when_to_use": _normalize_string_list(data.get("when_to_use")),
            "when_not_to_use": _normalize_string_list(data.get("when_not_to_use")),
            "primary_citations": _normalize_string_list(data.get("primary_citations")),
            "mechanisms": _normalize_string_list(data.get("mechanisms")),
            "constraints": dict(data.get("constraints") or {}) if isinstance(data.get("constraints"), dict) else {},
            "knobs": dict(data.get("knobs") or {}) if isinstance(data.get("knobs"), dict) else {},
            "facilitation_prompt": _normalize_text(data.get("facilitation_prompt")) or "",
        }

    _PRIME_METHODS_CACHE["stamp"] = stamp
    _PRIME_METHODS_CACHE["cards"] = cards
    return cards


def _derive_legacy_priming_output(method_outputs: list[dict[str, Any]], material_id: int, title: str, source_path: str | None) -> dict[str, Any]:
    summary = None
    root_explanation = None
    concepts: list[str] = []
    terminology: list[str] = []
    gaps: list[str] = []
    learning_objectives: list[dict[str, Any]] = []

    for run in method_outputs:
        method_id = run.get("method_id")
        outputs = run.get("outputs") if isinstance(run.get("outputs"), dict) else {}
        if method_id == "M-PRE-013":
            summary = summary or _normalize_text(outputs.get("summary"))
        if method_id in PRIME_STRUCTURAL_METHOD_IDS:
            concepts.extend(_normalize_string_list(outputs.get("concepts")))
            root_explanation = root_explanation or _normalize_text(outputs.get("map"))
            gaps.extend(_normalize_string_list(outputs.get("follow_up_targets")))
        if method_id == "M-PRE-012":
            terminology.extend(_normalize_string_list(outputs.get("terminology")))
        if method_id == "M-PRE-014":
            gaps.extend(_normalize_string_list(outputs.get("gaps")))
            gaps.extend(_normalize_string_list(outputs.get("unsupported_jumps")))
        if method_id == "M-PRE-010":
            learning_objectives.extend(_normalize_objective_list(outputs.get("learning_objectives")))

    return {
        "material_id": material_id,
        "title": title,
        "source_path": source_path,
        "summary": summary,
        "concepts": _dedupe_string_list(concepts),
        "terminology": _dedupe_string_list(terminology),
        "root_explanation": root_explanation,
        "gaps": _dedupe_string_list(gaps),
        "learning_objectives": learning_objectives,
        "extraction_lossy": False,
        "updated_at": _now_iso(),
    }


def _build_priming_method_runs(source_inventory: list[dict[str, Any]], selected_method_ids: list[str]) -> list[dict[str, Any]]:
    cards = _load_prime_method_cards()
    grouped: dict[str, list[dict[str, Any]]] = {}
    discovered_ids: list[str] = []
    for item in source_inventory:
        if not isinstance(item, dict):
            continue
        material_id = _normalize_int(item.get("id"), field_name="source_inventory.id")
        if material_id is None:
            continue
        method_outputs = item.get("method_outputs")
        if not isinstance(method_outputs, list):
            continue
        for run in method_outputs:
            normalized = _normalize_priming_method_run(run)
            if not normalized:
                continue
            method_id = normalized["method_id"]
            entry = {
                "material_id": material_id,
                "title": _normalize_text(item.get("title")) or f"Material {material_id}",
                "source_path": _normalize_text(item.get("source_path")),
                **normalized["outputs"],
            }
            grouped.setdefault(method_id, []).append(entry)
            if method_id not in discovered_ids:
                discovered_ids.append(method_id)

    runs: list[dict[str, Any]] = []
    ordered_method_ids = list(selected_method_ids)
    for method_id in discovered_ids:
        if method_id not in ordered_method_ids:
            ordered_method_ids.append(method_id)
    for method_id in ordered_method_ids:
        card = cards.get(method_id) or {}
        entries = grouped.get(method_id, [])
        runs.append(
            {
                "method_id": method_id,
                "method_name": card.get("name") or method_id,
                "output_family": PRIME_METHOD_OUTPUT_FAMILY.get(method_id) or "notes",
                "outputs": {"entries": entries},
                "source_ids": [int(entry["material_id"]) for entry in entries if entry.get("material_id") is not None],
                "status": "complete" if entries else "pending",
                "updated_at": _now_iso() if entries else None,
            }
        )
    return runs


def _merge_method_outputs(
    existing_runs: Any,
    new_runs: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged_by_id: dict[str, dict[str, Any]] = {}
    ordered_ids: list[str] = []

    for candidate in _normalize_priming_method_runs(existing_runs):
        method_id = candidate["method_id"]
        merged_by_id[method_id] = candidate
        if method_id not in ordered_ids:
            ordered_ids.append(method_id)

    for candidate in new_runs:
        normalized = _normalize_priming_method_run(candidate)
        if not normalized:
            continue
        method_id = normalized["method_id"]
        merged_by_id[method_id] = normalized
        if method_id not in ordered_ids:
            ordered_ids.append(method_id)

    return [merged_by_id[method_id] for method_id in ordered_ids if method_id in merged_by_id]


def _format_method_reasoning_block(card: dict[str, Any]) -> str:
    method_id = _normalize_text(card.get("method_id")) or "UNKNOWN"
    name = _normalize_text(card.get("name")) or method_id
    lines = [f"{method_id} - {name}"]

    description = _normalize_text(card.get("description"))
    if description:
        lines.append(f"Description: {description}")

    facilitation_prompt = _normalize_text(card.get("facilitation_prompt"))
    if facilitation_prompt:
        lines.append("Facilitation logic:")
        lines.append(facilitation_prompt)

    outputs_summary = _normalize_text(card.get("outputs_summary"))
    if outputs_summary:
        lines.append(f"Outputs summary: {outputs_summary}")

    required_outputs = _normalize_string_list(card.get("required_outputs"))
    if required_outputs:
        lines.append("Required outputs:")
        lines.extend(f"- {item}" for item in required_outputs)

    inputs = _normalize_string_list(card.get("inputs"))
    if inputs:
        lines.append("Expected inputs:")
        lines.extend(f"- {item}" for item in inputs)

    allowed_moves = _normalize_string_list(card.get("allowed_moves"))
    if allowed_moves:
        lines.append("Allowed moves:")
        lines.extend(f"- {item}" for item in allowed_moves)

    forbidden_moves = _normalize_string_list(card.get("forbidden_moves"))
    if forbidden_moves:
        lines.append("Forbidden moves:")
        lines.extend(f"- {item}" for item in forbidden_moves)

    when_to_use = _normalize_string_list(card.get("when_to_use"))
    if when_to_use:
        lines.append("When to use:")
        lines.extend(f"- {item}" for item in when_to_use)

    when_not_to_use = _normalize_string_list(card.get("when_not_to_use"))
    if when_not_to_use:
        lines.append("When not to use:")
        lines.extend(f"- {item}" for item in when_not_to_use)

    mechanisms = _normalize_string_list(card.get("mechanisms"))
    if mechanisms:
        lines.append("Mechanisms:")
        lines.extend(f"- {item}" for item in mechanisms)

    citations = _normalize_string_list(card.get("primary_citations"))
    if citations:
        lines.append("Primary citations:")
        lines.extend(f"- {item}" for item in citations)

    constraints = card.get("constraints")
    if isinstance(constraints, dict) and constraints:
        lines.append(f"Constraints: {_json_dumps(constraints)}")

    knobs = card.get("knobs")
    if isinstance(knobs, dict) and knobs:
        lines.append(f"Default knobs: {_json_dumps(knobs)}")

    return "\n".join(lines)


def _select_existing_method_outputs(
    method_outputs: Any,
    selected_method_ids: list[str],
) -> list[dict[str, Any]]:
    if not selected_method_ids:
        return []
    selected_set = {method_id.casefold() for method_id in selected_method_ids}
    existing_runs = _normalize_priming_method_runs(method_outputs)
    return [
        run
        for run in existing_runs
        if _normalize_text(run.get("method_id")).casefold() in selected_set
    ]


def _split_priming_content_windows(
    content: str,
    *,
    chunk_chars: int = PRIMING_CONTENT_CHUNK_CHARS,
    overlap_chars: int = PRIMING_CONTENT_CHUNK_OVERLAP,
) -> list[str]:
    text = str(content or "")
    if not text:
        return []
    if len(text) <= chunk_chars:
        return [text]
    windows: list[str] = []
    step = max(chunk_chars - max(overlap_chars, 0), 1)
    start = 0
    text_length = len(text)
    while start < text_length:
        end = min(start + chunk_chars, text_length)
        windows.append(text[start:end])
        if end >= text_length:
            break
        start += step
    return windows


def _extract_explicit_learning_objectives(content: str) -> list[dict[str, Any]]:
    lines = [str(line or "").strip() for line in str(content or "").splitlines()]
    explicit_titles: list[str] = []
    inside_objectives = False

    for line in lines:
        if not line:
            continue
        lower = line.casefold()
        if lower.startswith("## "):
            inside_objectives = lower == "## learning objectives"
            continue
        if not inside_objectives:
            continue
        if line.startswith("!["):
            continue
        candidate = re.sub(r"^(?:[-*]\s+|\d+[.)]\s+)", "", line).strip()
        if candidate:
            explicit_titles.append(candidate)

    return _normalize_objective_list(
        [{"title": title, "lo_code": None} for title in explicit_titles]
    )


def _apply_explicit_objective_anchor(
    method_runs: list[dict[str, Any]],
    explicit_objectives: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not explicit_objectives:
        return method_runs

    updated_runs: list[dict[str, Any]] = []
    found_objective_run = False
    llm_objective_codes: dict[str, str | None] = {}

    for run in method_runs:
        if run.get("method_id") != "M-PRE-010":
            updated_runs.append(run)
            continue

        found_objective_run = True
        outputs = run.get("outputs") if isinstance(run.get("outputs"), dict) else {}
        for objective in _normalize_objective_list(outputs.get("learning_objectives")):
            llm_objective_codes[objective["title"].casefold()] = objective.get("lo_code")

        anchored_objectives = [
            {
                "title": objective["title"],
                "lo_code": llm_objective_codes.get(objective["title"].casefold()) or objective.get("lo_code"),
            }
            for objective in explicit_objectives
        ]
        updated_runs.append(
            {
                **run,
                "outputs": {
                    **outputs,
                    "learning_objectives": anchored_objectives,
                },
            }
        )

    if found_objective_run:
        return updated_runs
    return method_runs


def _build_method_outputs_payload(method_runs: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    payload: dict[str, dict[str, Any]] = {}
    for run in method_runs:
        method_id = _normalize_text(run.get("method_id"))
        outputs = run.get("outputs")
        if not method_id or not isinstance(outputs, dict):
            continue
        payload[method_id] = outputs
    return payload


def _method_prompt_contract(method_id: str) -> str:
    return {
        "M-PRE-002": '- M-PRE-002 => {"questions":["bounded non-scored umbrella prequestions that jointly cover the selected scope"]}',
        "M-PRE-004": '- M-PRE-004 => {"concepts":["major umbrella pillars that collectively cover the selected scope"], "map":"hierarchical outline or mermaid map", "follow_up_targets":["unclear transitions to revisit later"]}',
        "M-PRE-005": '- M-PRE-005 => {"concepts":["skeleton umbrella categories covering the selected scope"], "map":"hierarchical outline or mermaid map", "follow_up_targets":["missing links to revisit later"]}',
        "M-PRE-006": '- M-PRE-006 => {"concepts":["pillar map umbrella groups covering the full selected structural scope"], "map":"structural scan map", "follow_up_targets":["compressed sections to revisit later"]}',
        "M-PRE-008": '- M-PRE-008 => {"concepts":["high-signal structure nodes that jointly cover the selected objective scope"], "map":"hierarchical outline or mermaid map", "follow_up_targets":["gaps or unsupported jumps"]}',
        "M-PRE-009": '- M-PRE-009 => {"concepts":["cross-source big-picture pillars covering the full included source scope"], "map":"integrated structure map", "follow_up_targets":["cross-source ambiguities or conflicts"]}',
        "M-PRE-010": '- M-PRE-010 => {"learning_objectives":[{"title":"string","lo_code":"string or null"}]}',
        "M-PRE-012": '- M-PRE-012 => {"terminology":["Term :: concise source-grounded definition"]}',
        "M-PRE-013": '- M-PRE-013 => {"summary":"short orientation summary", "major_sections":["major sections or pillars covering the whole source at orientation level"]}',
        "M-PRE-014": '- M-PRE-014 => {"gaps":["explicit ambiguities"], "unsupported_jumps":["places the source skips reasoning"]}',
    }.get(method_id, f'- {method_id} => {{}}')


def _run_priming_llm_pass(
    *,
    call_llm_fn: Any,
    system_prompt: str,
    user_prompt: str,
    priming_methods: list[str],
    cards: dict[str, dict[str, Any]],
    timeout: int = 60,
) -> tuple[list[dict[str, Any]] | None, str | None]:
    result = call_llm_fn(system_prompt=system_prompt, user_prompt=user_prompt, timeout=timeout)
    if not result.get("success"):
        return None, result.get("error") or "Priming assist failed"
    content_raw = str(result.get("content") or "")
    parsed = _extract_json_payload(content_raw)
    if not parsed:
        return None, "Priming assist returned invalid JSON"
    method_runs = _normalize_selected_method_outputs(priming_methods, parsed, cards)
    if not method_runs:
        return None, "Priming assist returned no selected method outputs"
    return method_runs, None


def _normalize_selected_method_outputs(
    selected_method_ids: list[str],
    payload: Any,
    cards: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    method_outputs = payload.get("method_outputs") if isinstance(payload, dict) else None
    if not isinstance(method_outputs, dict):
        return []
    runs: list[dict[str, Any]] = []
    for method_id in selected_method_ids:
        outputs = _normalize_priming_method_outputs(method_id, method_outputs.get(method_id))
        if not outputs:
            continue
        card = cards.get(method_id) or {}
        runs.append(
            {
                "method_id": method_id,
                "method_name": card.get("name") or method_id,
                "output_family": PRIME_METHOD_OUTPUT_FAMILY.get(method_id) or "notes",
                "outputs": outputs,
                "status": "complete",
                "updated_at": _now_iso(),
            }
        )
    return runs


def _fetch_material_rows(conn: sqlite3.Connection, material_ids: list[int]) -> list[sqlite3.Row]:
    if not material_ids:
        return []
    placeholders = ",".join("?" for _ in material_ids)
    cur = conn.cursor()
    cur.execute(
        f"""
        SELECT id, title, source_path, folder_path, course_id, file_type, content
        FROM rag_docs
        WHERE id IN ({placeholders}) AND COALESCE(corpus, 'materials') = 'materials'
        ORDER BY title COLLATE NOCASE, id
        """,
        tuple(material_ids),
    )
    return list(cur.fetchall())


def _build_source_inventory_item(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "title": row["title"] or f"Material {row['id']}",
        "source_path": row["source_path"],
        "folder_path": row["folder_path"],
        "course_id": row["course_id"],
        "content_type": row["file_type"],
    }


def _merge_source_inventory(
    source_inventory: list[dict[str, Any]], material_rows: list[sqlite3.Row]
) -> list[dict[str, Any]]:
    inventory_by_id: dict[int, dict[str, Any]] = {}
    ordered_ids: list[int] = []
    for item in source_inventory:
        if not isinstance(item, dict):
            continue
        material_id = _normalize_int(item.get("id"), field_name="source_inventory.id")
        if material_id is None:
            continue
        normalized = dict(item)
        if not _normalize_text(normalized.get("title")):
            normalized["title"] = f"Material {material_id}"
        inventory_by_id[material_id] = normalized
        if material_id not in ordered_ids:
            ordered_ids.append(material_id)
    for row in material_rows:
        material_id = int(row["id"])
        existing = inventory_by_id.get(material_id) or {}
        merged = {
            **_build_source_inventory_item(row),
            **existing,
        }
        if "priming_output" in existing:
            merged["priming_output"] = existing["priming_output"]
        if "method_outputs" in existing:
            merged["method_outputs"] = existing["method_outputs"]
        inventory_by_id[material_id] = merged
        if material_id not in ordered_ids:
            ordered_ids.append(material_id)
    return [inventory_by_id[material_id] for material_id in ordered_ids if material_id in inventory_by_id]


def _build_priming_aggregate(source_inventory: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    summaries: list[dict[str, Any]] = []
    concepts: list[dict[str, Any]] = []
    terminology: list[dict[str, Any]] = []
    root_explanations: list[dict[str, Any]] = []
    identified_gaps: list[dict[str, Any]] = []
    learning_objectives: list[dict[str, Any]] = []
    for item in source_inventory:
        if not isinstance(item, dict):
            continue
        material_id = _normalize_int(item.get("id"), field_name="source_inventory.id")
        if material_id is None:
            continue
        title = _normalize_text(item.get("title")) or f"Material {material_id}"
        priming_output = item.get("priming_output")
        if not isinstance(priming_output, dict):
            method_outputs = item.get("method_outputs")
            if isinstance(method_outputs, list):
                priming_output = _derive_legacy_priming_output(
                    method_outputs,
                    material_id,
                    title,
                    _normalize_text(item.get("source_path")),
                )
                item["priming_output"] = priming_output
        if not isinstance(priming_output, dict):
            continue
        summary = _normalize_text(priming_output.get("summary"))
        if summary:
            summaries.append({"material_id": material_id, "title": title, "summary": summary})
        for concept in _normalize_string_list(priming_output.get("concepts")):
            concepts.append({"material_id": material_id, "title": title, "concept": concept})
        for term in _normalize_string_list(priming_output.get("terminology")):
            terminology.append({"material_id": material_id, "title": title, "term": term})
        root_explanation = _normalize_text(priming_output.get("root_explanation"))
        if root_explanation:
            root_explanations.append(
                {"material_id": material_id, "title": title, "text": root_explanation}
            )
        for gap in _normalize_string_list(priming_output.get("gaps")):
            identified_gaps.append({"material_id": material_id, "title": title, "gap": gap})
        for objective in _normalize_objective_list(priming_output.get("learning_objectives")):
            learning_objectives.append({"material_id": material_id, **objective})
    return {
        "summaries": summaries,
        "concepts": concepts,
        "terminology": terminology,
        "root_explanations": root_explanations,
        "identified_gaps": identified_gaps,
        "learning_objectives": learning_objectives,
    }


def _get_workflow_row(conn: sqlite3.Connection, workflow_id: str) -> sqlite3.Row | None:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            tw.workflow_id,
            COALESCE(tw.course_id, tpb.course_id) AS course_id,
            tw.course_event_id,
            tw.assignment_title,
            COALESCE(tw.study_unit, tpb.study_unit) AS study_unit,
            COALESCE(tw.topic, tpb.topic) AS topic,
            tw.due_date,
            tw.current_stage,
            tw.status,
            tw.active_tutor_session_id,
            tw.created_at,
            tw.updated_at,
            c.name AS course_name,
            c.code AS course_code
        FROM tutor_workflows tw
        LEFT JOIN tutor_priming_bundles tpb ON tpb.workflow_id = tw.workflow_id
        LEFT JOIN courses c ON c.id = COALESCE(tw.course_id, tpb.course_id)
        WHERE tw.workflow_id = ?
        """,
        (workflow_id,),
    )
    return cur.fetchone()


def _serialize_workflow(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "workflow_id": row["workflow_id"],
        "course_id": row["course_id"],
        "course_name": row["course_name"],
        "course_code": row["course_code"],
        "course_event_id": row["course_event_id"],
        "assignment_title": row["assignment_title"],
        "study_unit": row["study_unit"],
        "topic": row["topic"],
        "due_date": row["due_date"],
        "current_stage": row["current_stage"],
        "status": row["status"],
        "active_tutor_session_id": row["active_tutor_session_id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_priming_bundle(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "course_id": row["course_id"],
        "study_unit": row["study_unit"],
        "topic": row["topic"],
        "selected_material_ids": _json_loads(row["selected_material_ids_json"], []),
        "selected_paths": _json_loads(row["selected_paths_json"], []),
        "source_inventory": _json_loads(row["source_inventory_json"], []),
        "priming_methods": _normalize_priming_methods(
            _json_loads(row["priming_methods_json"], []),
            row["priming_method"],
        ),
        "priming_method_runs": _normalize_priming_method_runs(
            _json_loads(row["priming_method_runs_json"], [])
        ),
        "priming_method": row["priming_method"],
        "priming_chain_id": row["priming_chain_id"],
        "learning_objectives": _json_loads(row["learning_objectives_json"], []),
        "concepts": _json_loads(row["concepts_json"], []),
        "concept_graph": _json_loads(row["concept_graph_json"], {}),
        "terminology": _json_loads(row["terminology_json"], []),
        "root_explanations": _json_loads(row["root_explanations_json"], []),
        "summaries": _json_loads(row["summaries_json"], []),
        "identified_gaps": _json_loads(row["identified_gaps_json"], []),
        "confidence_flags": _json_loads(row["confidence_flags_json"], {}),
        "readiness_status": row["readiness_status"],
        "readiness_blockers": _json_loads(row["readiness_blockers_json"], []),
        "recommended_tutor_strategy": _json_loads(row["recommended_tutor_strategy_json"], {}),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_captured_note(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "tutor_session_id": row["tutor_session_id"],
        "stage": row["stage"],
        "note_mode": row["note_mode"],
        "title": row["title"],
        "content": row["content"],
        "source_turn_id": row["source_turn_id"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_feedback_event(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "tutor_session_id": row["tutor_session_id"],
        "stage": row["stage"],
        "source_type": row["source_type"],
        "source_id": row["source_id"],
        "sentiment": row["sentiment"],
        "issue_type": row["issue_type"],
        "message": row["message"],
        "handoff_to_polish": bool(row["handoff_to_polish"]),
        "created_at": row["created_at"],
    }


def _serialize_stage_time_log(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "stage": row["stage"],
        "start_ts": row["start_ts"],
        "end_ts": row["end_ts"],
        "seconds_active": int(row["seconds_active"] or 0),
        "pause_count": int(row["pause_count"] or 0),
        "notes": _json_loads(row["notes_json"], []),
        "trigger_source": row["trigger_source"],
        "created_at": row["created_at"],
    }


def _serialize_memory_capsule(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "tutor_session_id": row["tutor_session_id"],
        "stage": row["stage"],
        "capsule_version": int(row["capsule_version"] or 0),
        "summary_text": row["summary_text"],
        "rule_snapshot_text": row["rule_snapshot_text"],
        "current_objective": row["current_objective"],
        "study_unit": row["study_unit"],
        "concept_focus": _json_loads(row["concept_focus_json"], []),
        "weak_points": _json_loads(row["weak_points_json"], []),
        "unresolved_questions": _json_loads(row["unresolved_questions_json"], []),
        "exact_notes": _json_loads(row["exact_notes_json"], []),
        "editable_notes": _json_loads(row["editable_notes_json"], []),
        "feedback": _json_loads(row["feedback_json"], []),
        "card_requests": _json_loads(row["card_requests_json"], []),
        "artifact_refs": _json_loads(row["artifact_refs_json"], []),
        "source_turn_ids": _json_loads(row["source_turn_ids_json"], []),
        "created_at": row["created_at"],
    }


def _serialize_card_draft_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "sessionId": row["session_id"],
        "deckName": row["deck_name"],
        "cardType": row["card_type"],
        "front": row["front"],
        "back": row["back"],
        "tags": row["tags"],
        "status": row["status"],
        "createdAt": row["created_at"],
    }


def _extract_json_payload(raw_text: str) -> dict[str, Any]:
    content = (raw_text or "").strip()
    if not content:
        return {}
    try:
        parsed = json.loads(content)
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, ValueError, json.JSONDecodeError):
        pass

    match = re.search(r"\{[\s\S]*\}", content)
    if not match:
        return {}
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}


def _serialize_polish_bundle(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "tutor_session_id": row["tutor_session_id"],
        "priming_bundle_id": row["priming_bundle_id"],
        "exact_notes": _json_loads(row["exact_notes_json"], []),
        "editable_notes": _json_loads(row["editable_notes_json"], []),
        "summaries": _json_loads(row["summaries_json"], []),
        "feedback_queue": _json_loads(row["feedback_queue_json"], []),
        "card_requests": _json_loads(row["card_requests_json"], []),
        "reprime_requests": _json_loads(row["reprime_requests_json"], []),
        "studio_payload": _json_loads(row["studio_payload_json"], {}),
        "publish_targets": _json_loads(row["publish_targets_json"], {}),
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_publish_result(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "workflow_id": row["workflow_id"],
        "polish_bundle_id": row["polish_bundle_id"],
        "obsidian_results": _json_loads(row["obsidian_results_json"], []),
        "anki_results": _json_loads(row["anki_results_json"], []),
        "brain_index_payload": _json_loads(row["brain_index_payload_json"], {}),
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _update_workflow_state(
    conn: sqlite3.Connection,
    workflow_id: str,
    *,
    current_stage: str | None = None,
    status: str | None = None,
    active_tutor_session_id: Any = _UNSET,
    course_id: Any = _UNSET,
    assignment_title: Any = _UNSET,
    study_unit: Any = _UNSET,
    topic: Any = _UNSET,
) -> None:
    updates = ["updated_at = ?"]
    values: list[Any] = [_now_iso()]
    if current_stage is not None:
        updates.append("current_stage = ?")
        values.append(current_stage)
    if status is not None:
        updates.append("status = ?")
        values.append(status)
    if active_tutor_session_id is not _UNSET:
        updates.append("active_tutor_session_id = ?")
        values.append(active_tutor_session_id)
    if course_id is not _UNSET:
        updates.append("course_id = ?")
        values.append(course_id)
    if assignment_title is not _UNSET:
        updates.append("assignment_title = ?")
        values.append(assignment_title)
    if study_unit is not _UNSET:
        updates.append("study_unit = ?")
        values.append(study_unit)
    if topic is not _UNSET:
        updates.append("topic = ?")
        values.append(topic)
    values.append(workflow_id)
    conn.execute(f"UPDATE tutor_workflows SET {', '.join(updates)} WHERE workflow_id = ?", values)


def _load_workflow_detail(conn: sqlite3.Connection, workflow_id: str) -> dict[str, Any] | None:
    workflow_row = _get_workflow_row(conn, workflow_id)
    if workflow_row is None:
        return None
    cur = conn.cursor()
    cur.execute("SELECT * FROM tutor_priming_bundles WHERE workflow_id = ?", (workflow_id,))
    priming_row = cur.fetchone()
    cur.execute("SELECT * FROM tutor_captured_notes WHERE workflow_id = ? ORDER BY id ASC", (workflow_id,))
    notes = [_serialize_captured_note(row) for row in cur.fetchall()]
    cur.execute("SELECT * FROM tutor_feedback_events WHERE workflow_id = ? ORDER BY id ASC", (workflow_id,))
    feedback = [_serialize_feedback_event(row) for row in cur.fetchall()]
    cur.execute("SELECT * FROM tutor_stage_time_logs WHERE workflow_id = ? ORDER BY id ASC", (workflow_id,))
    time_logs = [_serialize_stage_time_log(row) for row in cur.fetchall()]
    cur.execute("SELECT * FROM tutor_memory_capsules WHERE workflow_id = ? ORDER BY capsule_version ASC", (workflow_id,))
    capsules = [_serialize_memory_capsule(row) for row in cur.fetchall()]
    cur.execute("SELECT * FROM tutor_polish_bundles WHERE workflow_id = ?", (workflow_id,))
    polish_row = cur.fetchone()
    cur.execute("SELECT * FROM tutor_publish_results WHERE workflow_id = ? ORDER BY id ASC", (workflow_id,))
    publish_results = [_serialize_publish_result(row) for row in cur.fetchall()]
    return {
        "workflow": _serialize_workflow(workflow_row),
        "priming_bundle": _serialize_priming_bundle(priming_row),
        "captured_notes": notes,
        "feedback_events": feedback,
        "stage_time_logs": time_logs,
        "memory_capsules": capsules,
        "polish_bundle": _serialize_polish_bundle(polish_row),
        "publish_results": publish_results,
    }


def _delete_workflow_related_rows(
    conn: sqlite3.Connection, workflow_id: str
) -> dict[str, int]:
    cur = conn.cursor()
    deleted_counts: dict[str, int] = {}
    delete_order = [
        ("publish_results", "DELETE FROM tutor_publish_results WHERE workflow_id = ?"),
        ("polish_bundles", "DELETE FROM tutor_polish_bundles WHERE workflow_id = ?"),
        ("memory_capsules", "DELETE FROM tutor_memory_capsules WHERE workflow_id = ?"),
        ("stage_time_logs", "DELETE FROM tutor_stage_time_logs WHERE workflow_id = ?"),
        ("feedback_events", "DELETE FROM tutor_feedback_events WHERE workflow_id = ?"),
        ("captured_notes", "DELETE FROM tutor_captured_notes WHERE workflow_id = ?"),
        ("priming_bundles", "DELETE FROM tutor_priming_bundles WHERE workflow_id = ?"),
    ]
    for label, sql in delete_order:
        cur.execute(sql, (workflow_id,))
        deleted_counts[label] = int(cur.rowcount or 0)
    return deleted_counts


@tutor_bp.route("/workflows", methods=["GET"])
def list_tutor_workflows():
    course_id = request.args.get("course_id")
    status = request.args.get("status")
    stage = request.args.get("stage")
    include_drafts = request.args.get("include_drafts", "false").lower() == "true"
    try:
        parsed_limit = max(1, min(int(request.args.get("limit", "20")), 100))
        parsed_course_id = int(course_id) if course_id else None
    except ValueError:
        return jsonify({"error": "Invalid workflow list filters"}), 400
    where_parts: list[str] = []
    values: list[Any] = []
    if parsed_course_id is not None:
        where_parts.append("tw.course_id = ?")
        values.append(parsed_course_id)
    if status:
        where_parts.append("tw.status = ?")
        values.append(status)
    if stage:
        where_parts.append("tw.current_stage = ?")
        values.append(stage)
    if not include_drafts:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        where_parts.append(
            "NOT (tw.course_id IS NULL AND tw.topic IS NULL"
            " AND tw.status = 'priming_in_progress'"
            " AND tw.created_at < ?)"
        )
        values.append(cutoff)
    where_sql = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
    values.append(parsed_limit)
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT
                tw.workflow_id,
                COALESCE(tw.course_id, tpb.course_id) AS course_id,
                tw.course_event_id,
                tw.assignment_title,
                COALESCE(tw.study_unit, tpb.study_unit) AS study_unit,
                COALESCE(tw.topic, tpb.topic) AS topic,
                tw.due_date,
                tw.current_stage,
                tw.status,
                tw.active_tutor_session_id,
                tw.created_at,
                tw.updated_at,
                c.name AS course_name,
                c.code AS course_code
            FROM tutor_workflows tw
            LEFT JOIN tutor_priming_bundles tpb ON tpb.workflow_id = tw.workflow_id
            LEFT JOIN courses c ON c.id = COALESCE(tw.course_id, tpb.course_id)
            {where_sql}
            ORDER BY datetime(tw.updated_at) DESC, tw.id DESC
            LIMIT ?
            """,
            values,
        )
        items = [_serialize_workflow(row) for row in cur.fetchall()]
    finally:
        conn.close()
    return jsonify({"items": items, "count": len(items)})


@tutor_bp.route("/workflows", methods=["POST"])
def create_tutor_workflow():
    data = request.get_json(silent=True) or {}
    workflow_id = str(uuid.uuid4())
    now = _now_iso()
    try:
        course_id = _normalize_int(data.get("course_id"), field_name="course_id")
        course_event_id = _normalize_int(data.get("course_event_id"), field_name="course_event_id")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        conn.execute(
            """
            INSERT INTO tutor_workflows (
                workflow_id, course_id, course_event_id, assignment_title, study_unit,
                topic, due_date, current_stage, status, active_tutor_session_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                course_id,
                course_event_id,
                _normalize_text(data.get("assignment_title")),
                _normalize_text(data.get("study_unit")),
                _normalize_text(data.get("topic")),
                _normalize_text(data.get("due_date")),
                _normalize_stage(data.get("current_stage"), default="launch"),
                _normalize_status(data.get("status"), default="launch_ready"),
                _normalize_text(data.get("active_tutor_session_id")),
                now,
                now,
            ),
        )
        conn.commit()
        workflow_row = _get_workflow_row(conn, workflow_id)
    finally:
        conn.close()
    return jsonify({"workflow": _serialize_workflow(workflow_row)})


@tutor_bp.route("/workflows/<workflow_id>", methods=["GET"])
def get_tutor_workflow(workflow_id: str):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        payload = _load_workflow_detail(conn, workflow_id)
    finally:
        conn.close()
    if payload is None:
        return jsonify({"error": "Workflow not found"}), 404
    return jsonify(payload)


@tutor_bp.route("/workflows/<workflow_id>", methods=["DELETE"])
def delete_tutor_workflow(workflow_id: str):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404

        deleted_related = _delete_workflow_related_rows(conn, workflow_id)
        cur = conn.cursor()
        cur.execute("DELETE FROM tutor_workflows WHERE workflow_id = ?", (workflow_id,))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return jsonify(
        {
            "deleted": True,
            "workflow_id": workflow_id,
            "related_records_deleted": deleted_related,
        }
    )


@tutor_bp.route("/workflows/<workflow_id>/stage", methods=["PATCH"])
def update_tutor_workflow_stage(workflow_id: str):
    data = request.get_json(silent=True) or {}
    active_tutor_session_id: Any = _UNSET
    if "active_tutor_session_id" in data:
        active_tutor_session_id = _normalize_text(data.get("active_tutor_session_id"))
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        _update_workflow_state(
            conn,
            workflow_id,
            current_stage=_normalize_stage(data.get("current_stage"), default="launch"),
            status=_normalize_status(data.get("status"), default="launch_ready"),
            active_tutor_session_id=active_tutor_session_id,
        )
        conn.commit()
        workflow_row = _get_workflow_row(conn, workflow_id)
    finally:
        conn.close()
    return jsonify({"workflow": _serialize_workflow(workflow_row)})


@tutor_bp.route("/workflows/<workflow_id>/priming-bundle", methods=["PUT"])
def upsert_tutor_priming_bundle(workflow_id: str):
    data = request.get_json(silent=True) or {}
    now = _now_iso()
    try:
        course_id = _normalize_int(data.get("course_id"), field_name="course_id")
        selected_material_ids = _normalize_list(data.get("selected_material_ids"), field_name="selected_material_ids")
        selected_paths = _normalize_list(data.get("selected_paths"), field_name="selected_paths")
        source_inventory = _normalize_list(data.get("source_inventory"), field_name="source_inventory")
        priming_method_runs = _normalize_priming_method_runs(data.get("priming_method_runs"))
        learning_objectives = _normalize_list(data.get("learning_objectives"), field_name="learning_objectives")
        concepts = _normalize_list(data.get("concepts"), field_name="concepts")
        terminology = _normalize_list(data.get("terminology"), field_name="terminology")
        root_explanations = _normalize_list(data.get("root_explanations"), field_name="root_explanations")
        summaries = _normalize_list(data.get("summaries"), field_name="summaries")
        identified_gaps = _normalize_list(data.get("identified_gaps"), field_name="identified_gaps")
        readiness_blockers = _normalize_list(data.get("readiness_blockers"), field_name="readiness_blockers")
        concept_graph = _normalize_dict(data.get("concept_graph"), field_name="concept_graph") or {}
        confidence_flags = _normalize_dict(data.get("confidence_flags"), field_name="confidence_flags") or {}
        recommended_tutor_strategy = _normalize_dict(
            data.get("recommended_tutor_strategy"),
            field_name="recommended_tutor_strategy",
        ) or {}
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    readiness_status = str(data.get("readiness_status") or "draft").strip().lower() or "draft"
    workflow_status = "priming_complete" if readiness_status == "ready" else "priming_in_progress"
    priming_methods = _normalize_priming_methods(
        data.get("priming_methods"),
        data.get("priming_method"),
    )
    primary_priming_method = priming_methods[0] if priming_methods else _normalize_text(data.get("priming_method"))
    incoming_priming_chain = _normalize_text(data.get("priming_chain_id")) if "priming_chain_id" in data else None
    if not priming_method_runs and isinstance(source_inventory, list):
        priming_method_runs = _build_priming_method_runs(source_inventory, priming_methods)
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute("SELECT id, priming_chain_id FROM tutor_priming_bundles WHERE workflow_id = ?", (workflow_id,))
        existing = cur.fetchone()
        priming_chain_id = (
            incoming_priming_chain
            if "priming_chain_id" in data
            else (_normalize_text(existing["priming_chain_id"]) if existing else None)
        )
        params = (
            course_id,
            _normalize_text(data.get("study_unit")),
            _normalize_text(data.get("topic")),
            _json_dumps(selected_material_ids),
            _json_dumps(selected_paths),
            _json_dumps(source_inventory),
            _json_dumps(priming_methods),
            _json_dumps(priming_method_runs),
            primary_priming_method,
            priming_chain_id,
            _json_dumps(learning_objectives),
            _json_dumps(concepts),
            _json_dumps(concept_graph),
            _json_dumps(terminology),
            _json_dumps(root_explanations),
            _json_dumps(summaries),
            _json_dumps(identified_gaps),
            _json_dumps(confidence_flags),
            readiness_status,
            _json_dumps(readiness_blockers),
            _json_dumps(recommended_tutor_strategy),
            now,
        )
        if existing is None:
            conn.execute(
                """
                INSERT INTO tutor_priming_bundles (
                    workflow_id, course_id, study_unit, topic, selected_material_ids_json,
                    selected_paths_json, source_inventory_json, priming_methods_json, priming_method_runs_json, priming_method, priming_chain_id,
                    learning_objectives_json, concepts_json, concept_graph_json, terminology_json,
                    root_explanations_json, summaries_json, identified_gaps_json,
                    confidence_flags_json, readiness_status, readiness_blockers_json,
                    recommended_tutor_strategy_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (workflow_id, *params, now),
            )
        else:
            conn.execute(
                """
                UPDATE tutor_priming_bundles
                SET
                    course_id = ?,
                    study_unit = ?,
                    topic = ?,
                    selected_material_ids_json = ?,
                    selected_paths_json = ?,
                    source_inventory_json = ?,
                    priming_methods_json = ?,
                    priming_method_runs_json = ?,
                    priming_method = ?,
                    priming_chain_id = ?,
                    learning_objectives_json = ?,
                    concepts_json = ?,
                    concept_graph_json = ?,
                    terminology_json = ?,
                    root_explanations_json = ?,
                    summaries_json = ?,
                    identified_gaps_json = ?,
                    confidence_flags_json = ?,
                    readiness_status = ?,
                    readiness_blockers_json = ?,
                    recommended_tutor_strategy_json = ?,
                    updated_at = ?
                WHERE workflow_id = ?
                """,
                (*params, workflow_id),
            )
        _update_workflow_state(
            conn,
            workflow_id,
            current_stage="priming",
            status=workflow_status,
            course_id=course_id,
            study_unit=_normalize_text(data.get("study_unit")),
            topic=_normalize_text(data.get("topic")),
        )
        conn.commit()
        cur.execute("SELECT * FROM tutor_priming_bundles WHERE workflow_id = ?", (workflow_id,))
        bundle_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"priming_bundle": _serialize_priming_bundle(bundle_row)})


@tutor_bp.route("/workflows/<workflow_id>/notes", methods=["POST"])
def capture_tutor_workflow_note(workflow_id: str):
    data = request.get_json(silent=True) or {}
    note_mode = str(data.get("note_mode") or "").strip().lower()
    if note_mode not in VALID_NOTE_MODES:
        return jsonify({"error": "note_mode must be 'exact' or 'editable'"}), 400
    content = _normalize_text(data.get("content"))
    if not content:
        return jsonify({"error": "content is required"}), 400
    try:
        source_turn_id = _normalize_int(data.get("source_turn_id"), field_name="source_turn_id")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    now = _now_iso()
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO tutor_captured_notes (
                workflow_id, tutor_session_id, stage, note_mode, title, content,
                source_turn_id, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                _normalize_text(data.get("tutor_session_id")),
                _normalize_stage(data.get("stage"), default="tutor"),
                note_mode,
                _normalize_text(data.get("title")),
                content,
                source_turn_id,
                str(data.get("status") or "captured").strip() or "captured",
                now,
                now,
            ),
        )
        note_id = cur.lastrowid
        conn.commit()
        cur.execute("SELECT * FROM tutor_captured_notes WHERE id = ?", (note_id,))
        note_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"note": _serialize_captured_note(note_row)})


@tutor_bp.route("/workflows/<workflow_id>/feedback", methods=["POST"])
def capture_tutor_workflow_feedback(workflow_id: str):
    data = request.get_json(silent=True) or {}
    sentiment = str(data.get("sentiment") or "").strip().lower()
    if sentiment not in VALID_FEEDBACK_SENTIMENTS:
        return jsonify({"error": "sentiment must be 'liked' or 'disliked'"}), 400
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO tutor_feedback_events (
                workflow_id, tutor_session_id, stage, source_type, source_id, sentiment,
                issue_type, message, handoff_to_polish, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                _normalize_text(data.get("tutor_session_id")),
                _normalize_stage(data.get("stage"), default="tutor"),
                _normalize_text(data.get("source_type")) or "turn",
                _normalize_text(data.get("source_id")),
                sentiment,
                _normalize_text(data.get("issue_type")),
                _normalize_text(data.get("message")),
                1 if bool(data.get("handoff_to_polish", True)) else 0,
                _now_iso(),
            ),
        )
        feedback_id = cur.lastrowid
        conn.commit()
        cur.execute("SELECT * FROM tutor_feedback_events WHERE id = ?", (feedback_id,))
        feedback_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"feedback": _serialize_feedback_event(feedback_row)})


@tutor_bp.route("/workflows/<workflow_id>/stage-time", methods=["POST"])
def log_tutor_workflow_stage_time(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        notes = _normalize_list(data.get("notes"), field_name="notes")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO tutor_stage_time_logs (
                workflow_id, stage, start_ts, end_ts, seconds_active, pause_count,
                notes_json, trigger_source, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                _normalize_stage(data.get("stage"), default="tutor"),
                _normalize_text(data.get("start_ts")) or _now_iso(),
                _normalize_text(data.get("end_ts")),
                int(data.get("seconds_active") or 0),
                int(data.get("pause_count") or 0),
                _json_dumps(notes),
                _normalize_text(data.get("trigger_source")),
                _now_iso(),
            ),
        )
        log_id = cur.lastrowid
        conn.commit()
        cur.execute("SELECT * FROM tutor_stage_time_logs WHERE id = ?", (log_id,))
        log_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"stage_time_log": _serialize_stage_time_log(log_row)})


@tutor_bp.route("/workflows/<workflow_id>/memory-capsules", methods=["POST"])
def create_tutor_memory_capsule(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        concept_focus = _normalize_list(data.get("concept_focus"), field_name="concept_focus")
        weak_points = _normalize_list(data.get("weak_points"), field_name="weak_points")
        unresolved_questions = _normalize_list(
            data.get("unresolved_questions"),
            field_name="unresolved_questions",
        )
        exact_notes = _normalize_list(data.get("exact_notes"), field_name="exact_notes")
        editable_notes = _normalize_list(data.get("editable_notes"), field_name="editable_notes")
        feedback = _normalize_list(data.get("feedback"), field_name="feedback")
        card_requests = _normalize_list(data.get("card_requests"), field_name="card_requests")
        artifact_refs = _normalize_list(data.get("artifact_refs"), field_name="artifact_refs")
        source_turn_ids = _normalize_list(data.get("source_turn_ids"), field_name="source_turn_ids")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute(
            "SELECT COALESCE(MAX(capsule_version), 0) AS max_version FROM tutor_memory_capsules WHERE workflow_id = ?",
            (workflow_id,),
        )
        next_version = int((cur.fetchone()["max_version"] or 0) + 1)
        cur.execute(
            """
            INSERT INTO tutor_memory_capsules (
                workflow_id, tutor_session_id, stage, capsule_version, summary_text,
                rule_snapshot_text,
                current_objective, study_unit, concept_focus_json, weak_points_json,
                unresolved_questions_json, exact_notes_json, editable_notes_json,
                feedback_json, card_requests_json, artifact_refs_json,
                source_turn_ids_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                _normalize_text(data.get("tutor_session_id")),
                _normalize_stage(data.get("stage"), default="tutor"),
                next_version,
                _normalize_text(data.get("summary_text")),
                _normalize_text(data.get("rule_snapshot_text")),
                _normalize_text(data.get("current_objective")),
                _normalize_text(data.get("study_unit")),
                _json_dumps(concept_focus),
                _json_dumps(weak_points),
                _json_dumps(unresolved_questions),
                _json_dumps(exact_notes),
                _json_dumps(editable_notes),
                _json_dumps(feedback),
                _json_dumps(card_requests),
                _json_dumps(artifact_refs),
                _json_dumps(source_turn_ids),
                _now_iso(),
            ),
        )
        capsule_id = cur.lastrowid
        conn.commit()
        cur.execute("SELECT * FROM tutor_memory_capsules WHERE id = ?", (capsule_id,))
        capsule_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"memory_capsule": _serialize_memory_capsule(capsule_row)})


@tutor_bp.route("/workflows/<workflow_id>/polish-bundle", methods=["PUT"])
def upsert_tutor_polish_bundle(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        priming_bundle_id = _normalize_int(data.get("priming_bundle_id"), field_name="priming_bundle_id")
        exact_notes = _normalize_list(data.get("exact_notes"), field_name="exact_notes")
        editable_notes = _normalize_list(data.get("editable_notes"), field_name="editable_notes")
        summaries = _normalize_list(data.get("summaries"), field_name="summaries")
        feedback_queue = _normalize_list(data.get("feedback_queue"), field_name="feedback_queue")
        card_requests = _normalize_list(data.get("card_requests"), field_name="card_requests")
        reprime_requests = _normalize_list(data.get("reprime_requests"), field_name="reprime_requests")
        studio_payload = _normalize_dict(data.get("studio_payload"), field_name="studio_payload") or {}
        publish_targets = _normalize_dict(data.get("publish_targets"), field_name="publish_targets") or {}
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    status = str(data.get("status") or "draft").strip().lower() or "draft"
    workflow_status = "polish_complete" if status in {"ready", "complete", "approved"} else "polish_in_progress"
    now = _now_iso()

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute("SELECT id FROM tutor_polish_bundles WHERE workflow_id = ?", (workflow_id,))
        existing = cur.fetchone()
        params = (
            _normalize_text(data.get("tutor_session_id")),
            priming_bundle_id,
            _json_dumps(exact_notes),
            _json_dumps(editable_notes),
            _json_dumps(summaries),
            _json_dumps(feedback_queue),
            _json_dumps(card_requests),
            _json_dumps(reprime_requests),
            _json_dumps(studio_payload),
            _json_dumps(publish_targets),
            status,
            now,
        )
        if existing is None:
            conn.execute(
                """
                INSERT INTO tutor_polish_bundles (
                    workflow_id, tutor_session_id, priming_bundle_id, exact_notes_json,
                    editable_notes_json, summaries_json, feedback_queue_json,
                    card_requests_json, reprime_requests_json, studio_payload_json,
                    publish_targets_json, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (workflow_id, *params[:-1], now, now),
            )
        else:
            conn.execute(
                """
                UPDATE tutor_polish_bundles
                SET
                    tutor_session_id = ?,
                    priming_bundle_id = ?,
                    exact_notes_json = ?,
                    editable_notes_json = ?,
                    summaries_json = ?,
                    feedback_queue_json = ?,
                    card_requests_json = ?,
                    reprime_requests_json = ?,
                    studio_payload_json = ?,
                    publish_targets_json = ?,
                    status = ?,
                    updated_at = ?
                WHERE workflow_id = ?
                """,
                (*params, workflow_id),
            )
        _update_workflow_state(conn, workflow_id, current_stage="polish", status=workflow_status)
        conn.commit()
        cur.execute("SELECT * FROM tutor_polish_bundles WHERE workflow_id = ?", (workflow_id,))
        polish_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"polish_bundle": _serialize_polish_bundle(polish_row)})


@tutor_bp.route("/workflows/<workflow_id>/publish-result", methods=["POST"])
def create_tutor_publish_result(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        polish_bundle_id = _normalize_int(data.get("polish_bundle_id"), field_name="polish_bundle_id")
        obsidian_results = _normalize_list(data.get("obsidian_results"), field_name="obsidian_results")
        anki_results = _normalize_list(data.get("anki_results"), field_name="anki_results")
        brain_index_payload = _normalize_dict(data.get("brain_index_payload"), field_name="brain_index_payload") or {}
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    status = str(data.get("status") or "pending").strip().lower() or "pending"
    now = _now_iso()
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO tutor_publish_results (
                workflow_id, polish_bundle_id, obsidian_results_json, anki_results_json,
                brain_index_payload_json, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                workflow_id,
                polish_bundle_id,
                _json_dumps(obsidian_results),
                _json_dumps(anki_results),
                _json_dumps(brain_index_payload),
                status,
                now,
                now,
            ),
        )
        publish_id = cur.lastrowid
        _update_workflow_state(
            conn,
            workflow_id,
            current_stage="final_sync",
            status="stored" if status in {"completed", "stored", "success"} else "polish_complete",
        )
        conn.commit()
        cur.execute("SELECT * FROM tutor_publish_results WHERE id = ?", (publish_id,))
        publish_row = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"publish_result": _serialize_publish_result(publish_row)})


def _build_priming_refinement_material_context(material_rows: list[sqlite3.Row]) -> str:
    sections: list[str] = []
    for row in material_rows:
        material_id = int(row["id"])
        content = str(row["content"] or "").replace("\ufffd", "").strip()
        if not content:
            continue
        windows = _split_priming_content_windows(content, chunk_chars=12000, overlap_chars=400)
        excerpt = "\n\n--- MATERIAL CHUNK BREAK ---\n\n".join(windows[:2])
        if len(windows) > 2:
            excerpt = (
                f"{excerpt}\n\n"
                f"[Content truncated for prompt size after 2 of {len(windows)} chunks. Prefer citing the source title or path when asked for support.]"
            )
        sections.append(
            "\n".join(
                [
                    f"Material ID: {material_id}",
                    f"Title: {row['title'] or f'Material {material_id}'}",
                    f"Source path: {row['source_path'] or 'Unknown'}",
                    "Content:",
                    excerpt,
                ]
            )
        )
    return "\n\n==== NEXT MATERIAL ====\n\n".join(sections)


@tutor_bp.route("/priming-assist", methods=["POST"])
def refine_tutor_priming_results():
    data = request.get_json(silent=True) or {}
    try:
        material_ids = [
            material_id
            for material_id in (
                _normalize_int(item, field_name="material_ids[]")
                for item in _normalize_list(data.get("material_ids"), field_name="material_ids")
            )
            if material_id is not None
        ]
        extraction_results = _normalize_priming_displayed_run(
            data.get("extraction_results"),
            field_name="extraction_results",
        )
        conversation_history = [
            turn
            for turn in (
                _normalize_priming_conversation_turn(item)
                for item in _normalize_list(
                    data.get("conversation_history"),
                    field_name="conversation_history",
                )
            )
            if turn is not None
        ]
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    message = _normalize_text(data.get("message"))
    if not message:
        return jsonify({"error": "message is required"}), 400
    if not material_ids:
        return jsonify({"error": "material_ids is required"}), 400
    if extraction_results is None:
        return jsonify({"error": "extraction_results is required"}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        material_rows = _fetch_material_rows(conn, material_ids)
    finally:
        conn.close()

    found_ids = {int(row["id"]) for row in material_rows}
    missing_ids = [material_id for material_id in material_ids if material_id not in found_ids]
    if missing_ids:
        return jsonify({"error": f"Materials not found: {', '.join(str(item) for item in missing_ids)}"}), 404

    material_context = _build_priming_refinement_material_context(material_rows)
    if not material_context:
        return jsonify({"error": "Loaded materials do not contain usable content"}), 400

    from llm_provider import call_llm

    system_prompt = """You are Priming refinement chat for a study workflow.
You help the learner refine the current priming extraction results without leaving the Priming panel.
Stay grounded in the loaded material content and the current extraction results. Do not invent facts beyond the provided sources.
If the learner asks to expand, clarify, cite, or explain, answer directly in assistant_message.
If the learner is explicitly asking the extraction results themselves to change, include updated_results as a FULL replacement of the current displayed result set. Otherwise updated_results must be null.
When the learner mentions an objective number, reference that exact objective number explicitly in your answer.
When the learner asks for support or citation, cite by material title and source path when possible.
Return STRICT JSON only:
{
  "assistant_message": "string",
  "updated_results": null | {
    "key": "string",
    "label": "string",
    "kind": "method" | "chain",
    "methodId": "string or null",
    "chainId": 123,
    "blocks": [
      {
        "id": "string",
        "title": "string",
        "badge": "string",
        "kind": "objectives" | "concept_map" | "summary" | "terms" | "generic",
        "sourceLabel": "string",
        "materialId": 123,
        "content": "string",
        "objectives": [{"lo_code": "string or null", "title": "string"}],
        "terms": [{"term": "string", "definition": "string or null", "raw": "string"}]
      }
    ]
  }
}
If you include updated_results, keep every unchanged block too so the payload is a full replacement, not a patch."""

    user_prompt = (
        "Loaded material content:\n"
        f"{material_context}\n\n"
        "Current extraction results JSON:\n"
        f"{_json_dumps(extraction_results)}\n\n"
        "Previous priming conversation history JSON:\n"
        f"{_json_dumps(conversation_history)}\n\n"
        "Current learner follow-up:\n"
        f"{message}"
    )

    result = call_llm(system_prompt=system_prompt, user_prompt=user_prompt, timeout=60)
    if not result.get("success"):
        return jsonify({"error": result.get("error") or "Priming refinement failed"}), 502

    parsed = _extract_json_payload(str(result.get("content") or ""))
    assistant_message = _normalize_text(
        parsed.get("assistant_message") if isinstance(parsed, dict) else None
    )
    if not assistant_message:
        return jsonify({"error": "Priming refinement returned invalid JSON"}), 502

    updated_results_value = (
        parsed.get("updated_results")
        if isinstance(parsed, dict) and "updated_results" in parsed
        else parsed.get("updatedResults") if isinstance(parsed, dict) else None
    )
    try:
        updated_results = (
            _normalize_priming_displayed_run(updated_results_value, field_name="updated_results")
            if updated_results_value is not None
            else None
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify(
        {
            "assistant_message": assistant_message,
            "updated_results": updated_results,
        }
    )


@tutor_bp.route("/workflows/<workflow_id>/priming-assist", methods=["POST"])
def run_tutor_priming_assist(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        material_ids = [
            material_id
            for material_id in (
                _normalize_int(item, field_name="material_ids[]")
                for item in _normalize_list(data.get("material_ids"), field_name="material_ids")
            )
            if material_id is not None
        ]
        source_inventory = [
            item
            for item in _normalize_list(data.get("source_inventory"), field_name="source_inventory")
            if isinstance(item, dict)
        ]
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not material_ids:
        return jsonify({"error": "material_ids is required"}), 400

    study_unit = _normalize_text(data.get("study_unit"))
    topic = _normalize_text(data.get("topic"))
    packet_context = _normalize_text(data.get("packet_context"))
    priming_methods = _normalize_priming_methods(
        data.get("priming_methods"),
        data.get("priming_method"),
    ) or DEFAULT_PRIMING_METHOD_IDS
    cards = _load_prime_method_cards()
    priming_methods_label = ", ".join(
        f"{method_id} ({(cards.get(method_id) or {}).get('name') or method_id})"
        for method_id in priming_methods
    )

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
        material_rows = _fetch_material_rows(conn, material_ids)
    finally:
        conn.close()

    found_ids = {int(row["id"]) for row in material_rows}
    missing_ids = [material_id for material_id in material_ids if material_id not in found_ids]
    if missing_ids:
        return jsonify({"error": f"Materials not found: {', '.join(str(item) for item in missing_ids)}"}), 404

    from llm_provider import call_llm

    merged_inventory = _merge_source_inventory(source_inventory, material_rows)
    inventory_by_id = {
        int(item["id"]): item for item in merged_inventory if isinstance(item, dict) and item.get("id") is not None
    }
    failures: list[dict[str, Any]] = []
    for row in material_rows:
        material_id = int(row["id"])
        content = str(row["content"] or "").replace("\ufffd", "").strip()
        if not content:
            failures.append({"material_id": material_id, "error": "Material content is empty"})
            continue
        explicit_learning_objectives = (
            _extract_explicit_learning_objectives(content)
            if "M-PRE-010" in priming_methods
            else []
        )
        content_windows = _split_priming_content_windows(content)
        system_prompt = """You are Priming Assist for a study workflow.
Run only the selected PRIME methods against the provided material.
PRIME is structural and non-instructional: do not begin core TEACH explanation,
do not quiz or score the learner, and do not invent facts beyond the source.
Return STRICT JSON only:
{
  "method_outputs": {
    "METHOD_ID": {
      "...": "selected-method-specific fields only"
    }
  }
}
Only include the selected method IDs. Do not emit outputs for unselected methods.
"""
        prompt_contract = "\n".join(_method_prompt_contract(method_id) for method_id in priming_methods)
        selected_method_notes = "\n\n".join(
            _format_method_reasoning_block(cards.get(method_id) or {"method_id": method_id})
            for method_id in priming_methods
        )
        inventory_item = inventory_by_id.get(material_id) or _build_source_inventory_item(row)
        existing_selected_runs = _select_existing_method_outputs(
            inventory_item.get("method_outputs"),
            priming_methods,
        )
        existing_selected_runs_json = _json_dumps(existing_selected_runs) if existing_selected_runs else "[]"
        explicit_objectives_json = (
            _json_dumps(explicit_learning_objectives) if explicit_learning_objectives else "[]"
        )
        packet_context_block = (
            "Prime Packet context already staged for this run:\n"
            f"{packet_context}\n\n"
            if packet_context
            else ""
        )
        chunk_outputs: list[dict[str, Any]] = []
        material_error: str | None = None

        for chunk_index, chunk_content in enumerate(content_windows, start=1):
            user_prompt = (
                f"Workflow study unit: {study_unit or workflow_row['study_unit'] or 'Unspecified'}\n"
                f"Workflow topic: {topic or workflow_row['topic'] or 'Unspecified'}\n"
                f"Selected Priming methods: {priming_methods_label}\n"
                f"Material title: {row['title'] or f'Material {material_id}'}\n"
                f"Material source path: {row['source_path'] or 'Unknown'}\n"
                f"Coverage mode: full material coverage\n"
                f"Current chunk: {chunk_index}/{len(content_windows)}\n\n"
                "Selected method logic:\n"
                f"{selected_method_notes}\n\n"
                "JSON contracts for the selected methods:\n"
                f"{prompt_contract}\n\n"
                "Existing outputs already stored for the selected methods on this material:\n"
                f"{existing_selected_runs_json}\n\n"
                "Explicit learning objectives already present in the source material:\n"
                f"{explicit_objectives_json}\n\n"
                f"{packet_context_block}"
                "Global output rules:\n"
                "- stay structural, orientation-level, and source-grounded\n"
                "- reason from the source before drafting outputs; do not guess or pad the result\n"
                "- use the actual method logic above, not just the method name, when deciding what to extract\n"
                "- if existing outputs are already stored for a selected method, treat them as an anchor and revise conservatively rather than regenerating from scratch\n"
                "- only add, remove, split, or merge items when the source clearly justifies the change\n"
                "- prefer stable counts and stable wording across reruns when the material has not changed\n"
                "- use concise strings with no numbering unless the field explicitly implies structure\n"
                "- maps should prefer mermaid or simple outline structure over loose prose\n"
                "- terminology entries should use 'Term :: concise source-grounded definition'\n"
                "- follow-up targets and gaps should name unresolved ambiguities without teaching the answer\n"
                "- learning objectives must stay concise, material-grounded, and deduplicated by meaning\n"
                "- if the source contains explicit learning-objective bullet lists, preserve the full explicit list rather than collapsing it into fewer broader items\n"
                "- for M-PRE-010, extract the full stable objective set supported by this chunk and preserve existing objective wording when still supported\n\n"
                "- when a PRIME method uses a capped output count (for example 3-5 prompts, pillars, or branches), treat that cap as the number of final umbrella groups, not as permission to ignore supported source content\n"
                "- first inventory the full supported sections and concepts in this chunk, then compress them into broad groups that still cover the whole selected material or objective scope\n"
                "- do not cherry-pick isolated examples unless each chosen item is itself a broad umbrella that represents the omitted content\n\n"
                f"Material content chunk {chunk_index}/{len(content_windows)}:\n{chunk_content}"
            )
            method_runs, material_error = _run_priming_llm_pass(
                call_llm_fn=call_llm,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                priming_methods=priming_methods,
                cards=cards,
                timeout=60,
            )
            if material_error or method_runs is None:
                failures.append(
                    {
                        "material_id": material_id,
                        "error": material_error or "Priming assist failed",
                    }
                )
                break
            chunk_outputs.append(
                {
                    "chunk_index": chunk_index,
                    "chunk_count": len(content_windows),
                    "method_outputs": _build_method_outputs_payload(method_runs),
                }
            )

        if material_error:
            continue

        if len(chunk_outputs) == 1:
            method_runs = _normalize_selected_method_outputs(
                priming_methods,
                {"method_outputs": chunk_outputs[0]["method_outputs"]},
                cards,
            )
        else:
            consolidation_system_prompt = """You are Priming Assist consolidation for a study workflow.
Combine chunk-level PRIME extraction results into one final material-level output.
Return STRICT JSON only in the same method_outputs shape.
Do not omit evidence that only appeared in later chunks.
Do not emit outputs for unselected methods.
"""
            consolidation_prompt = (
                f"Workflow study unit: {study_unit or workflow_row['study_unit'] or 'Unspecified'}\n"
                f"Workflow topic: {topic or workflow_row['topic'] or 'Unspecified'}\n"
                f"Selected Priming methods: {priming_methods_label}\n"
                f"Material title: {row['title'] or f'Material {material_id}'}\n"
                f"Material source path: {row['source_path'] or 'Unknown'}\n"
                f"Chunk count: {len(content_windows)}\n\n"
                "Selected method logic:\n"
                f"{selected_method_notes}\n\n"
                "JSON contracts for the selected methods:\n"
                f"{prompt_contract}\n\n"
                "Existing outputs already stored for the selected methods on this material:\n"
                f"{existing_selected_runs_json}\n\n"
                "Explicit learning objectives already present in the source material:\n"
                f"{explicit_objectives_json}\n\n"
                f"{packet_context_block}"
                "Chunk-level outputs covering the full material:\n"
                f"{_json_dumps(chunk_outputs)}\n\n"
                "Consolidation rules:\n"
                "- use every chunk above as evidence; do not ignore later chunks\n"
                "- combine all supported points into one final material-level output per selected method\n"
                "- preserve stable items from prior outputs when still supported\n"
                "- deduplicate repeated objectives, terms, concepts, and follow-up targets by meaning\n"
                "- only change counts when the chunk evidence clearly requires it\n"
                "- if the source contains explicit learning-objective bullet lists, preserve the full explicit list rather than collapsing it into fewer broader items\n"
                "- for capped PRIME outputs, keep the final 3-5 style counts as umbrella groups that still cover the full selected material or objective scope\n"
                "- do not cherry-pick isolated examples during consolidation; broaden or regroup until the whole selected scope is represented\n"
                "- return one final method_outputs object for the selected methods only"
            )
            method_runs, material_error = _run_priming_llm_pass(
                call_llm_fn=call_llm,
                system_prompt=consolidation_system_prompt,
                user_prompt=consolidation_prompt,
                priming_methods=priming_methods,
                cards=cards,
                timeout=60,
            )
            if material_error or method_runs is None:
                failures.append(
                    {
                        "material_id": material_id,
                        "error": material_error or "Priming consolidation failed",
                    }
                )
                continue

        method_runs = _apply_explicit_objective_anchor(method_runs, explicit_learning_objectives)
        merged_method_runs = _merge_method_outputs(inventory_item.get("method_outputs"), method_runs)
        inventory_item["method_outputs"] = merged_method_runs
        inventory_item["priming_output"] = {
            **_derive_legacy_priming_output(
                merged_method_runs,
                material_id,
                row["title"] or f"Material {material_id}",
                row["source_path"],
            ),
            "char_count": len(content),
        }
        inventory_by_id[material_id] = inventory_item

    source_inventory_response = [
        inventory_by_id[int(item["id"])]
        for item in merged_inventory
        if isinstance(item, dict) and _normalize_int(item.get("id"), field_name="source_inventory.id") is not None
    ]
    priming_method_runs = _build_priming_method_runs(source_inventory_response, priming_methods)
    aggregate = _build_priming_aggregate(source_inventory_response)
    payload: dict[str, Any] = {
        "source_inventory": source_inventory_response,
        "priming_method_runs": priming_method_runs,
        "aggregate": aggregate,
    }
    if failures:
        payload["failures"] = failures
    return jsonify(payload)


@tutor_bp.route("/workflows/<workflow_id>/polish-assist", methods=["POST"])
def run_tutor_polish_assist(workflow_id: str):
    data = request.get_json(silent=True) or {}
    action = str(data.get("action") or "").strip().lower()
    input_text = _normalize_text(data.get("input_text")) or ""
    question = _normalize_text(data.get("question"))
    max_cards = _normalize_int(data.get("max_cards"), field_name="max_cards") or 6
    if action not in {"summarize", "qa", "rewrite_note", "draft_cards"}:
        return jsonify({"error": "Unsupported polish assist action"}), 400
    if action in {"summarize", "rewrite_note", "draft_cards"} and not input_text:
        return jsonify({"error": "input_text is required"}), 400
    if action == "qa" and not question:
        return jsonify({"error": "question is required"}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
    finally:
        conn.close()

    from llm_provider import call_llm

    if action == "summarize":
        system_prompt = """You are Polish Assist for a study workflow.
Turn the provided workflow material into a tight final study summary.
Do not add new facts.
Return STRICT JSON only:
{"text":"string"}
"""
        user_prompt = f"Summarize this workflow output into a final study summary:\n\n{input_text}"
    elif action == "qa":
        system_prompt = """You are Polish Assist for a study workflow.
Answer only from the provided workflow material.
If the answer is not supported, say so directly.
Return STRICT JSON only:
{"text":"string"}
"""
        user_prompt = f"Context:\n{input_text}\n\nQuestion:\n{question}"
    elif action == "rewrite_note":
        system_prompt = """You are Polish Assist for a study workflow.
Rewrite the provided editable note for clarity and study value.
Preserve meaning. Do not add new facts.
Return STRICT JSON only:
{"text":"string"}
"""
        user_prompt = f"Rewrite this editable note:\n\n{input_text}"
    else:
        system_prompt = """You are Polish Assist for a study workflow.
Generate high-quality Anki-ready card candidates from the provided workflow material.
Return STRICT JSON only:
{
  "text": "short optional note",
  "cards": [
    {
      "front": "string",
      "back": "string",
      "deck_name": "string",
      "tags": "string",
      "card_type": "basic"
    }
  ]
}
Do not exceed the requested card count.
"""
        user_prompt = (
            f"Generate up to {max_cards} flashcard candidates from this workflow material:\n\n"
            f"{input_text}"
        )

    result = call_llm(system_prompt=system_prompt, user_prompt=user_prompt, timeout=60)
    if not result.get("success"):
        return jsonify({"error": result.get("error") or "Polish assist failed"}), 502

    content = str(result.get("content") or "")
    parsed = _extract_json_payload(content)
    text = _normalize_text(parsed.get("text")) if parsed else None
    cards = parsed.get("cards") if isinstance(parsed.get("cards"), list) else []
    normalized_cards: list[dict[str, Any]] = []
    for card in cards[:max_cards]:
        if not isinstance(card, dict):
            continue
        front = _normalize_text(card.get("front"))
        back = _normalize_text(card.get("back"))
        if not front or not back:
            continue
        normalized_cards.append(
            {
                "front": front,
                "back": back,
                "deck_name": _normalize_text(card.get("deck_name")) or "Trey::Tutor Workflow",
                "tags": _normalize_text(card.get("tags")) or "tutor workflow",
                "card_type": _normalize_text(card.get("card_type")) or "basic",
            }
        )

    if not text:
        text = content.strip()

    return jsonify(
        {
            "result": {
                "text": text,
                "cards": normalized_cards,
                "raw": parsed or {"content": content},
            }
        }
    )


@tutor_bp.route("/workflows/<workflow_id>/card-drafts", methods=["POST"])
def create_tutor_workflow_card_drafts(workflow_id: str):
    data = request.get_json(silent=True) or {}
    try:
        cards = _normalize_list(data.get("cards"), field_name="cards")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        workflow_row = _get_workflow_row(conn, workflow_id)
        if workflow_row is None:
            return jsonify({"error": "Workflow not found"}), 404
    finally:
        conn.close()

    from anki_sync import create_card_draft

    created_ids: list[int] = []
    errors: list[dict[str, Any]] = []
    for index, card in enumerate(cards):
        if not isinstance(card, dict):
            errors.append({"index": index, "error": "Card must be an object"})
            continue
        front = _normalize_text(card.get("front"))
        back = _normalize_text(card.get("back"))
        if not front or not back:
            errors.append({"index": index, "error": "Card front and back are required"})
            continue
        draft_id = create_card_draft(
            front=front,
            back=back,
            card_type=_normalize_text(card.get("card_type")) or "basic",
            deck_name=_normalize_text(card.get("deck_name")) or "Trey::Tutor Workflow",
            tags=_normalize_text(card.get("tags")) or "tutor workflow",
            session_id=workflow_row["active_tutor_session_id"],
            course_id=workflow_row["course_id"],
            status=_normalize_text(card.get("status")) or "approved",
            source_citation=f"workflow:{workflow_id}",
        )
        if draft_id is None:
            errors.append({"index": index, "error": "Card draft creation failed"})
            continue
        created_ids.append(int(draft_id))

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        drafts: list[dict[str, Any]] = []
        if created_ids:
            placeholders = ",".join("?" for _ in created_ids)
            cur = conn.cursor()
            cur.execute(
                f"""
                SELECT id, session_id, deck_name, card_type, front, back, tags, status, created_at
                FROM card_drafts
                WHERE id IN ({placeholders})
                ORDER BY id ASC
                """,
                tuple(created_ids),
            )
            drafts = [_serialize_card_draft_row(row) for row in cur.fetchall()]
    finally:
        conn.close()

    return jsonify({"drafts": drafts, "errors": errors})


@tutor_bp.route("/workflows/analytics/summary", methods=["GET"])
def get_tutor_workflow_analytics_summary():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                tw.workflow_id,
                tw.course_id,
                tw.status,
                COALESCE(c.name, tw.assignment_title, tw.study_unit, tw.topic, 'Unassigned') AS course_name
            FROM tutor_workflows tw
            LEFT JOIN courses c ON c.id = tw.course_id
            ORDER BY tw.created_at DESC
            """
        )
        workflow_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, stage, seconds_active
            FROM tutor_stage_time_logs
            ORDER BY id ASC
            """
        )
        stage_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, note_mode
            FROM tutor_captured_notes
            ORDER BY id ASC
            """
        )
        note_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, sentiment
            FROM tutor_feedback_events
            ORDER BY id ASC
            """
        )
        feedback_rows = cur.fetchall()

        cur.execute("SELECT workflow_id FROM tutor_memory_capsules ORDER BY id ASC")
        capsule_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, priming_methods_json, priming_method, priming_chain_id, source_inventory_json
            FROM tutor_priming_bundles
            ORDER BY id ASC
            """
        )
        priming_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, reprime_requests_json, studio_payload_json
            FROM tutor_polish_bundles
            ORDER BY id ASC
            """
        )
        polish_rows = cur.fetchall()

        cur.execute(
            """
            SELECT workflow_id, status, obsidian_results_json, anki_results_json, brain_index_payload_json, updated_at
            FROM tutor_publish_results
            ORDER BY updated_at DESC, id DESC
            """
        )
        publish_rows = cur.fetchall()
    finally:
        conn.close()

    totals = {
        "workflows": len(workflow_rows),
        "stored": 0,
        "active": 0,
        "exact_notes": 0,
        "editable_notes": 0,
        "feedback_liked": 0,
        "feedback_disliked": 0,
        "memory_capsules": len(capsule_rows),
        "publish_successes": 0,
        "publish_failures": 0,
        "source_linked_workflows": 0,
        "reprime_requests": 0,
        "studio_artifacts": 0,
    }
    stage_seconds: dict[str, int] = {
        "launch": 0,
        "priming": 0,
        "tutor": 0,
        "polish": 0,
        "final_sync": 0,
    }
    course_rollups: dict[str, dict[str, Any]] = {}
    workflow_seconds: dict[str, int] = {}
    method_counts: dict[str, int] = {}
    chain_counts: dict[str, int] = {}
    learner_snapshot = {
        "label": None,
        "confidence": None,
        "evidence": [],
        "source_workflow_id": None,
        "updated_at": None,
    }
    learner_snapshot_history: list[dict[str, Any]] = []

    for row in workflow_rows:
        status = str(row["status"] or "").strip().lower()
        workflow_id = str(row["workflow_id"])
        if status == "stored":
            totals["stored"] += 1
        elif status not in {"abandoned", "error"}:
            totals["active"] += 1
        course_key = f"{row['course_id'] or 'none'}::{row['course_name'] or 'Unassigned'}"
        if course_key not in course_rollups:
            course_rollups[course_key] = {
                "course_id": row["course_id"],
                "course_name": row["course_name"] or "Unassigned",
                "workflow_count": 0,
                "stored_count": 0,
                "total_stage_seconds": 0,
            }
        course_rollups[course_key]["workflow_count"] += 1
        if status == "stored":
            course_rollups[course_key]["stored_count"] += 1
        workflow_seconds[workflow_id] = 0

    for row in stage_rows:
        stage = _normalize_stage(row["stage"], default="tutor")
        seconds_active = int(row["seconds_active"] or 0)
        stage_seconds[stage] = stage_seconds.get(stage, 0) + seconds_active
        workflow_id = str(row["workflow_id"])
        workflow_seconds[workflow_id] = workflow_seconds.get(workflow_id, 0) + seconds_active

    workflow_to_course_key = {
        str(row["workflow_id"]): f"{row['course_id'] or 'none'}::{row['course_name'] or 'Unassigned'}"
        for row in workflow_rows
    }
    for workflow_id, total_seconds in workflow_seconds.items():
        course_key = workflow_to_course_key.get(workflow_id)
        if course_key and course_key in course_rollups:
            course_rollups[course_key]["total_stage_seconds"] += total_seconds

    for row in note_rows:
        note_mode = str(row["note_mode"] or "").strip().lower()
        if note_mode == "exact":
            totals["exact_notes"] += 1
        elif note_mode == "editable":
            totals["editable_notes"] += 1

    for row in feedback_rows:
        sentiment = str(row["sentiment"] or "").strip().lower()
        if sentiment == "liked":
            totals["feedback_liked"] += 1
        elif sentiment == "disliked":
            totals["feedback_disliked"] += 1

    for row in priming_rows:
        methods = _normalize_priming_methods(
            _json_loads(row["priming_methods_json"], []),
            row["priming_method"],
        )
        chain_id = _normalize_text(row["priming_chain_id"])
        for method in methods:
            method_counts[method] = method_counts.get(method, 0) + 1
        if chain_id:
            chain_counts[chain_id] = chain_counts.get(chain_id, 0) + 1
        source_inventory = _json_loads(row["source_inventory_json"], [])
        if isinstance(source_inventory, list) and any(
            isinstance(item, dict) and isinstance(item.get("priming_output"), dict)
            for item in source_inventory
        ):
            totals["source_linked_workflows"] += 1

    for row in polish_rows:
        reprime_requests = _json_loads(row["reprime_requests_json"], [])
        studio_payload = _json_loads(row["studio_payload_json"], {})
        if isinstance(reprime_requests, list):
            totals["reprime_requests"] += len(reprime_requests)
        artifacts = studio_payload.get("artifacts") if isinstance(studio_payload, dict) else []
        if isinstance(artifacts, list):
            totals["studio_artifacts"] += len(
                [item for item in artifacts if isinstance(item, dict) or isinstance(item, str)]
            )

    for row in publish_rows:
        obsidian_results = _json_loads(row["obsidian_results_json"], [])
        anki_results = _json_loads(row["anki_results_json"], [])
        for result in [*obsidian_results, *anki_results]:
            if not isinstance(result, dict):
                continue
            success = result.get("success")
            status = str(result.get("status") or "").strip().lower()
            if success is True or status in {"success", "completed", "stored", "ok", "synced"}:
                totals["publish_successes"] += 1
            elif success is False or status in {"failed", "error", "partial_failure"}:
                totals["publish_failures"] += 1

        payload = _json_loads(row["brain_index_payload_json"], {})
        snapshot = payload.get("learner_archetype_snapshot")
        if isinstance(snapshot, dict):
            evidence_value = snapshot.get("evidence")
            evidence = []
            if isinstance(evidence_value, list):
                evidence = [str(item) for item in evidence_value]
            normalized_snapshot = {
                "label": _normalize_text(snapshot.get("label")),
                "confidence": _normalize_text(snapshot.get("confidence")),
                "evidence": evidence,
                "source_workflow_id": row["workflow_id"],
                "updated_at": row["updated_at"],
            }
            learner_snapshot_history.append(normalized_snapshot)
            if learner_snapshot["label"] is None:
                learner_snapshot = normalized_snapshot

    top_courses = sorted(
        course_rollups.values(),
        key=lambda item: (int(item["total_stage_seconds"]), int(item["workflow_count"])),
        reverse=True,
    )[:5]
    priming_methods = [
        {"label": label, "count": count}
        for label, count in sorted(method_counts.items(), key=lambda item: item[1], reverse=True)
    ]
    priming_chains = [
        {"label": label, "count": count}
        for label, count in sorted(chain_counts.items(), key=lambda item: item[1], reverse=True)
    ]

    return jsonify(
        {
            "totals": totals,
            "stage_seconds": stage_seconds,
            "top_courses": top_courses,
            "methods": {
                "priming_methods": priming_methods,
                "priming_chains": priming_chains,
            },
            "learner_snapshot": learner_snapshot,
            "learner_snapshot_history": learner_snapshot_history[:5],
        }
    )
