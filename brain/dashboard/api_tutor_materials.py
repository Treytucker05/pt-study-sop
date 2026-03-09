"""
Material / content helpers and routes extracted from api_tutor.py.

This module holds every function related to study-material management:
file uploads, sync/preview, video processing, extracted-image serving,
retrieval-confidence diagnostics, and material-scope utilities.

Functions here may depend on:
  - ``dashboard.api_tutor_utils`` (constants, normalizers, validators)
  - ``dashboard.api_tutor_vault`` (``_parse_metadata_json``)
  - ``dashboard.api_tutor`` (late imports for ``tutor_bp``, session helpers)
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import sys
import uuid
import logging
from datetime import datetime
from pathlib import Path
from threading import Thread
from typing import Any, Optional
from urllib.parse import quote

from flask import jsonify, request, send_file

from db_setup import get_connection
from tutor_accuracy_profiles import (
    DEFAULT_ACCURACY_PROFILE,
    accuracy_profile_config,
    normalize_accuracy_profile,
    resolve_material_retrieval_k as _resolve_material_k_for_profile,
)

from dashboard.api_tutor_utils import (
    UPLOADS_DIR,
    SYNC_JOBS,
    SYNC_JOBS_LOCK,
    SYNC_JOB_RETENTION,
    VIDEO_JOBS,
    VIDEO_JOBS_LOCK,
    VIDEO_JOB_RETENTION,
    EXTRACTED_IMAGES_ROOT,
    _IMAGE_PLACEHOLDER_PATTERN,
)

_LOG = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Test-monkeypatch bridge
# ---------------------------------------------------------------------------
# Tests patch ``dashboard.api_tutor._launch_materials_sync_job`` (etc.) to
# inject fakes.  Since those functions now live HERE, internal callers must
# look them up from the *parent* module so patches take effect.
# ---------------------------------------------------------------------------

def _mp(name: str):
    """Return the possibly-monkeypatched version of *name* from api_tutor."""
    parent = sys.modules.get("dashboard.api_tutor")
    if parent is not None:
        fn = getattr(parent, name, None)
        if fn is not None:
            return fn
    return globals()[name]


# ---------------------------------------------------------------------------
# Material helpers
# ---------------------------------------------------------------------------


def _materials_include_mp4(material_ids: list[int]) -> bool:
    if not material_ids:
        return False
    conn = get_connection()
    try:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        placeholders = ",".join("?" * len(material_ids))
        row = cur.execute(
            f"""
            SELECT 1
            FROM rag_docs
            WHERE id IN ({placeholders})
              AND LOWER(COALESCE(file_type, '')) = 'mp4'
            LIMIT 1
            """,
            list(material_ids),
        ).fetchone()
        return bool(row)
    finally:
        conn.close()


def _recommended_mode_flags(material_ids: list[int]) -> dict[str, bool]:
    return {
        "materials": bool(material_ids),
        "obsidian": True,
        "gemini_vision": _materials_include_mp4(material_ids),
        "web_search": False,
        "deep_think": False,
    }


def _normalize_default_mode(raw_mode: Any, *, material_ids: Optional[list[int]] = None) -> dict[str, bool]:
    normalized: dict[str, bool] = {}
    if isinstance(raw_mode, dict):
        for key in ("materials", "obsidian", "web_search", "deep_think", "gemini_vision"):
            if key in raw_mode:
                normalized[key] = bool(raw_mode.get(key))
    if material_ids and "materials" not in normalized:
        normalized["materials"] = True
    return normalized


def _normalize_force_full_docs(
    raw_flag: Any,
    *,
    material_ids: Optional[list[int]] = None,
) -> bool:
    count = len(material_ids or [])
    if count > 0:
        return count <= 2
    return bool(raw_flag) if isinstance(raw_flag, bool) else False


def _load_selected_materials(material_ids: list[int]) -> list[dict[str, Any]]:
    if not material_ids:
        return []

    from dashboard.api_tutor_vault import _parse_metadata_json

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    try:
        placeholders = ",".join("?" * len(material_ids))
        rows = conn.execute(
            f"""
            SELECT id, title, doc_type, file_type, source_path, file_path, folder_path, metadata_json
            FROM rag_docs
            WHERE id IN ({placeholders})
            ORDER BY id ASC
            """,
            material_ids,
        ).fetchall()
    finally:
        conn.close()

    by_id: dict[int, dict[str, Any]] = {}
    for row in rows:
        metadata = _parse_metadata_json(row["metadata_json"])
        source_path = str(row["source_path"] or row["file_path"] or "").strip()
        title = str(row["title"] or "").strip()
        if not title and source_path:
            title = Path(source_path).name
        content_text = ""
        source_suffix = Path(source_path).suffix.lower()
        if source_path and source_suffix in {".txt", ".md", ".markdown"}:
            try:
                source_file = Path(source_path)
                if source_file.exists() and source_file.stat().st_size <= 250_000:
                    content_text = source_file.read_text(
                        encoding="utf-8", errors="ignore"
                    )
            except Exception:
                content_text = ""
        by_id[int(row["id"])] = {
            "id": int(row["id"]),
            "title": title,
            "doc_type": str(row["doc_type"] or "").strip(),
            "file_type": str(row["file_type"] or "").strip(),
            "source_path": source_path,
            "folder_path": str(row["folder_path"] or "").strip(),
            "metadata": metadata,
            "content_text": content_text,
        }

    return [by_id[mid] for mid in material_ids if mid in by_id]


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

    target_scope = (
        selected_material_count if selected_material_count > 0 else material_k
    )
    scope_denom = max(1, min(material_k, target_scope))
    coverage = min(1.0, retrieved_unique_sources / scope_denom)
    citation_alignment = min(
        1.0,
        citations_unique_sources / max(1, retrieved_unique_sources),
    )
    diversity = max(0.0, 1.0 - max(0.0, min(1.0, top_source_share)))
    cap_penalty = min(1.0, dropped_by_cap / max(1, merged_candidates))

    score = (
        (0.50 * coverage)
        + (0.30 * citation_alignment)
        + (0.20 * diversity)
        - (0.10 * cap_penalty)
    )
    return round(max(0.0, min(1.0, score)), 4)


def _citation_sources(
    citations: list[dict], *, max_items: Optional[int] = None
) -> list[str]:
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
    citations: list[dict],
    rag_debug: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Build compact retrieval telemetry attached to SSE done events."""
    citation_sources_all = _citation_sources(citations)

    rag_material = {}
    if isinstance(rag_debug, dict):
        rag_material = rag_debug.get("materials") or {}

    material_sources_all = list(rag_material.get("sources") or [])
    retrieved_material_chunks = int(rag_material.get("retrieved_chunks") or 0)
    retrieved_material_unique_sources = int(
        rag_material.get("retrieved_unique_sources") or len(material_sources_all)
    )
    top_source = rag_material.get("top_source")
    if top_source is None and material_sources_all:
        top_source = material_sources_all[0]
    top_share = float(rag_material.get("top_source_share") or 0.0)

    merged_candidates = int(rag_material.get("candidate_pool_merged") or 0)
    dropped_by_cap = int(rag_material.get("candidate_pool_dropped_by_cap") or 0)
    confidence = _compute_retrieval_confidence(
        selected_material_count=selected_material_count,
        material_k=material_k,
        retrieved_unique_sources=retrieved_material_unique_sources,
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
        "material_retrieval_mode": rag_material.get("mode"),
        "retrieved_material_chunks": retrieved_material_chunks,
        "retrieved_material_unique_sources": retrieved_material_unique_sources,
        "retrieved_material_sources": material_sources_all[:20],
        "material_top_source": top_source,
        "material_top_source_share": round(top_share, 4),
        "citations_total": len(citations),
        "citations_unique_sources": len(citation_sources_all),
        "citation_sources": citation_sources_all[:20],
        "material_candidates_similarity": int(
            rag_material.get("candidate_pool_similarity") or 0
        ),
        "material_candidates_mmr": int(rag_material.get("candidate_pool_mmr") or 0),
        "material_candidates_merged": merged_candidates,
        "material_candidates_after_cap": int(
            rag_material.get("candidate_pool_after_cap") or 0
        ),
        "material_dropped_by_cap": dropped_by_cap,
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


# ---------------------------------------------------------------------------
# Sync / filename helpers
# ---------------------------------------------------------------------------


def _sanitize_filename(name: str) -> str:
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


_DEFAULT_MATERIAL_SYNC_EXTS: set[str] = {
    ".md",
    ".markdown",
    ".txt",
    ".pdf",
    ".docx",
    ".ppt",
    ".pptx",
    ".mp4",
}
_DEFAULT_SYNC_EXCLUDE_DIR_NAMES: set[str] = {".git", ".venv", "__pycache__"}
_MAX_SYNC_PREVIEW_FILES = 5000


def _resolve_sync_allowed_exts(allowed_exts: Optional[set[str]]) -> set[str]:
    return set(allowed_exts) if allowed_exts else set(_DEFAULT_MATERIAL_SYNC_EXTS)


def _normalize_sync_relative_path(raw_path: object) -> str:
    raw = str(raw_path or "").strip()
    if not raw:
        raise ValueError("Path is empty.")
    normalized = raw.replace("\\", "/")
    if normalized.startswith("/") or re.match(r"^[a-zA-Z]:", normalized):
        raise ValueError("Absolute file paths are not allowed in selected_files.")

    parts: list[str] = []
    for part in normalized.split("/"):
        token = part.strip()
        if not token or token == ".":
            continue
        if token == "..":
            raise ValueError("Parent directory traversal (..) is not allowed.")
        parts.append(token)

    if not parts:
        raise ValueError("Path is empty after normalization.")

    return "/".join(parts)


def _parse_sync_folder_root_and_exts(
    data: dict[str, Any]
) -> tuple[Path, Optional[set[str]]]:
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


def _parse_sync_course_id(raw_value: object) -> Optional[int]:
    if raw_value in (None, ""):
        return None
    try:
        course_id = int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValueError("course_id must be a valid integer") from exc
    if course_id <= 0:
        raise ValueError("course_id must be a positive integer")

    conn = get_connection()
    try:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM courses WHERE id = ? LIMIT 1", (course_id,))
        if not cur.fetchone():
            raise ValueError(f"course_id not found: {course_id}")
    finally:
        conn.close()

    return course_id


def _normalize_selected_sync_files(
    raw_value: object,
    *,
    root: Path,
    allowed_exts: Optional[set[str]],
) -> Optional[set[str]]:
    if raw_value is None:
        return None
    if not isinstance(raw_value, list):
        raise ValueError("selected_files must be an array of relative file paths.")

    effective_exts = _resolve_sync_allowed_exts(allowed_exts)
    root_resolved = root.resolve()
    selected_files: set[str] = set()

    for item in raw_value:
        rel_path = _normalize_sync_relative_path(item)
        abs_path = (root_resolved / Path(rel_path)).resolve()
        try:
            abs_path.relative_to(root_resolved)
        except ValueError as exc:
            raise ValueError(f"Selected file is outside the chosen folder: {rel_path}") from exc

        if not abs_path.exists() or not abs_path.is_file():
            raise FileNotFoundError(f"Selected file not found: {rel_path}")
        if abs_path.suffix.lower() not in effective_exts:
            raise ValueError(f"Unsupported file type selected: {rel_path}")
        selected_files.add(rel_path.replace("\\", "/"))

    return selected_files


def _parse_sync_folder_payload(
    data: dict[str, Any]
) -> tuple[Path, Optional[set[str]], Optional[set[str]], Optional[int]]:
    root, allowed_exts = _parse_sync_folder_root_and_exts(data)
    selected_files = _normalize_selected_sync_files(
        data.get("selected_files"),
        root=root,
        allowed_exts=allowed_exts,
    )
    if data.get("selected_files") is not None and not selected_files:
        raise ValueError("selected_files is empty. Choose at least one file.")
    course_id = _parse_sync_course_id(data.get("course_id"))
    return root, allowed_exts, selected_files, course_id


def _build_sync_folder_preview(
    root: Path,
    *,
    allowed_exts: Optional[set[str]],
    max_files: int = _MAX_SYNC_PREVIEW_FILES,
) -> dict[str, Any]:
    root_resolved = root.resolve()
    effective_exts = _resolve_sync_allowed_exts(allowed_exts)
    tree: dict[str, Any] = {
        "type": "folder",
        "name": root_resolved.name or str(root_resolved),
        "path": "",
        "children": [],
    }
    folder_nodes: dict[str, dict[str, Any]] = {"": tree}
    folder_count = 0
    file_count = 0
    truncated = False

    def _ensure_folder_node(rel_path: str) -> dict[str, Any]:
        nonlocal folder_count
        normalized = rel_path.strip("/")
        if normalized in folder_nodes:
            return folder_nodes[normalized]

        parent_path, _, name = normalized.rpartition("/")
        parent_node = _ensure_folder_node(parent_path)
        node = {"type": "folder", "name": name, "path": normalized, "children": []}
        parent_node["children"].append(node)
        folder_nodes[normalized] = node
        folder_count += 1
        return node

    for dirpath, dirnames, filenames in os.walk(str(root_resolved)):
        dirnames[:] = sorted(
            [d for d in dirnames if d not in _DEFAULT_SYNC_EXCLUDE_DIR_NAMES],
            key=str.lower,
        )
        rel_dir = os.path.relpath(dirpath, str(root_resolved)).replace("\\", "/")
        if rel_dir == ".":
            rel_dir = ""
        node = _ensure_folder_node(rel_dir)

        for filename in sorted(filenames, key=str.lower):
            file_path = Path(dirpath) / filename
            if file_path.suffix.lower() not in effective_exts:
                continue
            if file_count >= max_files:
                truncated = True
                break
            rel_file = os.path.relpath(str(file_path), str(root_resolved)).replace(
                "\\", "/"
            )
            try:
                stat = file_path.stat()
                file_size = int(stat.st_size)
                modified_at = datetime.fromtimestamp(stat.st_mtime).isoformat()
            except OSError:
                file_size = 0
                modified_at = None
            node["children"].append(
                {
                    "type": "file",
                    "name": filename,
                    "path": rel_file,
                    "size": file_size,
                    "modified_at": modified_at,
                }
            )
            file_count += 1

        if truncated:
            break

    def _sort_tree(node: dict[str, Any]) -> None:
        children = node.get("children")
        if not isinstance(children, list):
            return
        for child in children:
            if isinstance(child, dict) and child.get("type") == "folder":
                _sort_tree(child)
        children.sort(
            key=lambda item: (
                0 if str(item.get("type")) == "folder" else 1,
                str(item.get("name") or "").lower(),
            )
        )

    _sort_tree(tree)
    return {
        "folder": str(root_resolved),
        "tree": tree,
        "counts": {"folders": folder_count, "files": file_count},
        "allowed_exts": sorted(effective_exts),
        "truncated": truncated,
        "max_files": max_files,
    }


# ---------------------------------------------------------------------------
# Job management helpers
# ---------------------------------------------------------------------------


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
                raise RuntimeError(
                    "Video processing did not return markdown artifact paths."
                )

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


def _tokenize_for_relevance(text: str) -> set[str]:
    """Extract lowercase word tokens for relevance scoring.

    Strips very short tokens (< 3 chars) and common stop words to
    produce a set suitable for keyword-overlap comparisons.
    """
    _STOP_WORDS = frozenset({
        "the", "and", "for", "are", "but", "not", "you", "all",
        "can", "had", "her", "was", "one", "our", "out", "has",
        "his", "how", "its", "may", "new", "now", "old", "see",
        "way", "who", "did", "get", "let", "say", "she", "too",
        "use", "this", "that", "with", "have", "from", "they",
        "been", "said", "each", "which", "their", "will", "what",
        "there", "when", "make", "like", "than", "into", "just",
        "over", "such", "take", "also", "them", "some", "about",
    })
    words = set(re.findall(r"[a-z]{3,}", text.lower()))
    return words - _STOP_WORDS


def _score_segment_relevance(
    segment_text: str,
    topic_tokens: set[str],
) -> float:
    """Score a transcript/visual segment against topic keywords.

    Returns a 0.0-1.0 relevance score based on keyword overlap ratio.
    """
    if not topic_tokens:
        return 1.0  # No topic filter -- everything is relevant
    seg_tokens = _tokenize_for_relevance(segment_text)
    if not seg_tokens:
        return 0.0
    overlap = seg_tokens & topic_tokens
    return len(overlap) / len(topic_tokens)


_MIN_RELEVANCE_SCORE = 0.10  # Skip segments below 10% keyword overlap


def _load_transcript_segments(latest_dir: Path) -> list[dict[str, Any]]:
    """Load transcript segments from a video ingest output directory."""
    segments_path = latest_dir / "segments.json"
    if not segments_path.exists():
        return []
    try:
        data = json.loads(segments_path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
    except Exception:
        pass
    return []


def _load_visual_notes(latest_dir: Path, slug: str) -> str:
    """Load visual notes markdown from a video ingest output directory."""
    visual_path = latest_dir / f"{slug}_visual_notes.md"
    if not visual_path.exists():
        return ""
    try:
        return visual_path.read_text(encoding="utf-8").strip()
    except Exception:
        return ""


def _load_ocr_data(latest_dir: Path) -> dict[str, str]:
    """Load OCR data keyed by frame filename."""
    ocr_path = latest_dir / "ocr.json"
    if not ocr_path.exists():
        return {}
    try:
        data = json.loads(ocr_path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _filter_segments_by_topic(
    segments: list[dict[str, Any]],
    topic: str,
    *,
    min_score: float = _MIN_RELEVANCE_SCORE,
) -> list[dict[str, Any]]:
    """Filter and rank transcript segments by topic relevance.

    Returns segments with score >= min_score, sorted by relevance descending.
    When no topic is provided, returns all segments (unfiltered).
    """
    topic_tokens = _tokenize_for_relevance(topic)
    if not topic_tokens:
        return segments  # No filtering when topic is empty

    scored: list[tuple[float, dict[str, Any]]] = []
    for seg in segments:
        text = str(seg.get("text", ""))
        score = _score_segment_relevance(text, topic_tokens)
        if score >= min_score:
            scored.append((score, {**seg, "_relevance": round(score, 3)}))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored]


def _merge_video_contexts(
    title: str,
    relevant_segments: list[dict[str, Any]],
    enrichment_text: str,
    ocr_data: dict[str, str],
    *,
    max_segments: int = 30,
    max_chars: int = 5000,
) -> str:
    """Merge transcript, visual/OCR, and enrichment into a single context block.

    Structure:
    1. Relevant transcript segments (timestamped)
    2. OCR visual context from keyframes (if available)
    3. Enrichment notes (Gemini analysis of flagged segments)
    """
    parts: list[str] = []

    # --- Transcript segments (filtered by relevance) ---
    if relevant_segments:
        transcript_lines = [f"#### {title} -- Relevant Transcript Segments\n"]
        for seg in relevant_segments[:max_segments]:
            start_ts = seg.get("start_ts", "?")
            end_ts = seg.get("end_ts", "?")
            text = str(seg.get("text", "")).strip()
            relevance = seg.get("_relevance")
            label = f"[{start_ts} -> {end_ts}]"
            if relevance is not None:
                label += f" (relevance: {relevance})"
            transcript_lines.append(f"- {label} {text}")
        parts.append("\n".join(transcript_lines))

    # --- OCR / Visual context ---
    if ocr_data:
        ocr_lines = [f"#### {title} -- Visual/OCR from Keyframes\n"]
        for frame_name, ocr_text in list(ocr_data.items())[:15]:
            short_text = ocr_text.replace("\n", " ").strip()[:300]
            if short_text:
                ocr_lines.append(f"- `{frame_name}`: {short_text}")
        if len(ocr_lines) > 1:  # Has actual entries beyond header
            parts.append("\n".join(ocr_lines))

    # --- Enrichment (Gemini analysis of flagged segments) ---
    if enrichment_text:
        parts.append(
            f"#### {title} -- Gemini Enrichment Notes\n\n{enrichment_text}"
        )

    merged = "\n\n".join(parts)
    # Enforce character budget
    if len(merged) > max_chars:
        merged = merged[:max_chars] + "\n\n[... context truncated ...]"
    return merged


def _build_gemini_vision_context(
    material_ids: list[int],
    *,
    topic: str = "",
    max_materials: int = 2,
) -> tuple[str, str]:
    """Best-effort Gemini video enrichment context for selected MP4 materials.

    When a topic (student question) is provided, transcript segments are
    filtered by keyword-overlap relevance (>= 10% overlap) so the LLM
    receives only the most pertinent video context.  Visual OCR data and
    enrichment notes are merged into a single structured block.

    Args:
        material_ids: rag_doc IDs to search for MP4 materials.
        topic: The student's current question / session topic for
            relevance filtering.  Empty string disables filtering.
        max_materials: Cap on how many MP4 files to process.

    Returns:
        (context_text, diagnostic) -- context_text is the merged context
        for the LLM; diagnostic is a user-facing reason when context is empty.
    """
    scoped_ids = [
        int(mid) for mid in material_ids[:max_materials] if isinstance(mid, int)
    ]
    if not scoped_ids:
        return "", "No material IDs selected."

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    placeholders = ",".join("?" * len(scoped_ids))
    cur.execute(
        f"""
        SELECT id, title, source_path, file_path, file_type
        FROM rag_docs
        WHERE id IN ({placeholders})
          AND COALESCE(corpus, 'materials') = 'materials'
          AND COALESCE(enabled, 1) = 1
        """,
        scoped_ids,
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    if not rows:
        return "", "Selected materials not found in library."

    try:
        from video_ingest_local import VIDEO_INGEST_ROOT, _slugify
        from video_enrich_api import enrich_video, emit_enrichment_markdown
    except Exception:
        return "", "Video enrichment modules not available."

    mp4_found = False
    blocks: list[str] = []
    for row in rows:
        source_path = str(row.get("file_path") or row.get("source_path") or "").strip()
        file_type = str(row.get("file_type") or "").strip().lower()
        if not source_path:
            continue
        if file_type != "mp4" and not source_path.lower().endswith(".mp4"):
            continue
        mp4_found = True
        if not Path(source_path).exists():
            continue

        slug = _slugify(Path(source_path).stem)
        matching_dirs = (
            sorted(
                VIDEO_INGEST_ROOT.glob(f"{slug}_*"),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )
            if VIDEO_INGEST_ROOT.exists()
            else []
        )
        if not matching_dirs:
            continue

        latest_dir = matching_dirs[0]

        # --- Load transcript segments and filter by topic relevance ---
        raw_segments = _load_transcript_segments(latest_dir)
        if not raw_segments:
            continue

        relevant_segments = _filter_segments_by_topic(raw_segments, topic)

        # --- Load visual/OCR data ---
        ocr_data = _load_ocr_data(latest_dir)

        # --- Load or generate enrichment markdown ---
        enrichment_text = ""
        enrichment_md = latest_dir / f"{slug}_enrichment.md"
        if not enrichment_md.exists():
            try:
                result = enrich_video(
                    video_path=source_path,
                    segments=raw_segments,
                    material_id=int(row.get("id") or 0),
                    mode="auto",
                )
                if result.get("status") == "ok" and result.get("results"):
                    md_path = emit_enrichment_markdown(
                        slug, result["results"], str(latest_dir)
                    )
                    enrichment_md = Path(md_path)
            except Exception:
                pass  # Enrichment is best-effort

        if enrichment_md.exists():
            try:
                enrichment_text = enrichment_md.read_text(encoding="utf-8")[:3000].strip()
            except Exception:
                pass

        # --- Merge all video contexts ---
        title = str(row.get("title") or f"Material {row.get('id')}")
        merged = _merge_video_contexts(
            title,
            relevant_segments,
            enrichment_text,
            ocr_data,
        )
        if merged.strip():
            blocks.append(merged)

    if not blocks:
        if not mp4_found:
            return (
                "",
                "No MP4 videos in selected materials. Gemini Vision requires video files.",
            )
        return (
            "",
            "No processed video segments found. Run 'Process Video' on your MP4 materials first.",
        )
    return "\n\n".join(blocks), ""


def _auto_link_materials_to_courses(conn: sqlite3.Connection) -> dict:
    """Match unlinked rag_docs materials to courses by folder_path -> course name."""
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

    # Build lookup: lowered course name -> course id
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


def _launch_materials_sync_job(
    root: Path,
    allowed_exts: Optional[set[str]],
    *,
    selected_files: Optional[set[str]] = None,
    course_id: Optional[int] = None,
) -> str:
    job_id = uuid.uuid4().hex
    _update_sync_job(
        job_id,
        status="pending",
        phase="pending",
        folder=str(root),
        selected_count=len(selected_files) if selected_files is not None else None,
        course_id=course_id,
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
                include_paths=selected_files,
                course_id=course_id,
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
                from concurrent.futures import (
                    ThreadPoolExecutor as _TPE,
                    TimeoutError as _TETimeout,
                )
                from tutor_rag import embed_rag_docs
                import os as _os

                _EMBED_PHASE_TIMEOUT = 600  # 10-minute overall safety net

                def _embed_progress(
                    current_idx: int, total_count: int, doc_path: str
                ) -> None:
                    _update_sync_job(
                        job_id,
                        embedding_progress={
                            "current": current_idx + 1,
                            "total": total_count,
                            "current_file": _os.path.basename(doc_path),
                        },
                    )

                def _run_embed() -> dict:
                    return embed_rag_docs(
                        corpus="materials", progress_callback=_embed_progress
                    )

                with _TPE(max_workers=1) as _phase_executor:
                    _phase_future = _phase_executor.submit(_run_embed)
                    try:
                        embed_result = _phase_future.result(
                            timeout=_EMBED_PHASE_TIMEOUT
                        )
                    except _TETimeout:
                        _phase_future.cancel()
                        raise RuntimeError(
                            f"Embedding phase timed out after {_EMBED_PHASE_TIMEOUT}s"
                        )
                _update_sync_job(job_id, embed_result=embed_result)
            except Exception as embed_exc:
                _update_sync_job(
                    job_id,
                    embed_result={"error": str(embed_exc)},
                    last_error=str(embed_exc),
                )

            # Auto-link materials to courses by folder_path only for unassigned syncs.
            if course_id is None:
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


# ---------------------------------------------------------------------------
# Extracted-image helpers
# ---------------------------------------------------------------------------


def _material_asset_hash_candidates(
    source_path: Optional[str], file_path: Optional[str]
) -> list[str]:
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


def _find_extracted_asset_dir(
    source_path: Optional[str], file_path: Optional[str]
) -> Optional[Path]:
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
            if path.is_file()
            and path.suffix.lower()
            in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
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
        if path.is_file()
        and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
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
        if (
            lowered.startswith("http://")
            or lowered.startswith("https://")
            or lowered.startswith("/api/tutor/materials/")
        ):
            return match.group(0)

        normalized = raw_url.replace("\\", "/")
        filename = Path(normalized).name
        if not filename or filename.lower() not in valid_files:
            return match.group(0)
        encoded = quote(filename)
        return f"![{alt}](/api/tutor/materials/{material_id}/asset/{encoded})"

    return pattern.sub(_replace, content)


# ---------------------------------------------------------------------------
# Route handlers — registered on tutor_bp from the main api_tutor module.
# ---------------------------------------------------------------------------

# Late import: tutor_bp lives in api_tutor; importing it here registers routes
# on it when api_tutor imports this module.
from dashboard.api_tutor import tutor_bp  # noqa: E402


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
# POST /api/tutor/materials/upload -- Upload study material
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
        return jsonify(
            {"error": f"Could not infer file type from extension: {ext}"}
        ), 400
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
            if isinstance(existing, sqlite3.Row):
                duplicate_of = {"id": existing["id"], "title": existing["title"]}
            else:
                duplicate_of = {"id": existing[0], "title": existing[1]}

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

    # Attempt embedding (non-blocking -- don't fail the upload if embedding fails)
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
# GET /api/tutor/materials -- List materials library
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
                        and p.suffix.lower()
                        in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
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
# GET /api/tutor/materials/<id> -- Get single material metadata
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/<int:material_id>", methods=["GET"])
def get_material(material_id: int):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """SELECT id,
                   COALESCE(NULLIF(TRIM(title), ''), source_path, 'Material ' || id) as title,
                   source_path,
                   file_path,
                   COALESCE(folder_path, '') as folder_path,
                   COALESCE(file_type, 'FILE') as file_type,
                   COALESCE(file_size, 0) as file_size,
                   course_id, topic_tags,
                   COALESCE(corpus, 'materials') as corpus,
                   COALESCE(enabled, 1) as enabled,
                   extraction_error,
                   COALESCE(checksum, '') as checksum,
                   created_at, updated_at
            FROM rag_docs
            WHERE id = ? AND COALESCE(corpus, 'materials') = 'materials'""",
        (material_id,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Material not found"}), 404

    material = dict(row)
    material.pop("file_path", None)
    return jsonify(material), 200


# ---------------------------------------------------------------------------
# PUT /api/tutor/materials/<id> -- Update material metadata
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
        return jsonify(
            {"error": f"Source file not found: {source_path or '(empty)'}"}
        ), 400

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
        return jsonify(
            {"error": "Re-extract is supported for PDF, DOCX, and PPTX materials only"}
        ), 400

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
                    and p.suffix.lower()
                    in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
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
# DELETE /api/tutor/materials/<id> -- Delete material + file + ChromaDB chunks
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
# GET /api/tutor/materials/<id>/content -- Return extracted text content
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
    content = _inject_extracted_images(
        content, material_id=row["id"], asset_dir=asset_dir
    )
    content = _rewrite_extracted_image_links(
        content, material_id=row["id"], asset_dir=asset_dir
    )

    return jsonify(
        {
            "id": row["id"],
            "title": row["title"] or "",
            "source_path": row["source_path"],
            "file_type": row["file_type"],
            "content": content,
            "char_count": len(content),
            "extraction_lossy": ratio > 0.1,
            "replacement_ratio": round(ratio, 3),
        }
    )


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

    normalized = (
        str(asset_path or "")
        .replace("\\", "/")
        .split("?", 1)[0]
        .split("#", 1)[0]
        .strip("/")
    )
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
# POST /api/tutor/materials/auto-link -- Link unlinked materials to courses
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
# POST /api/tutor/materials/sync -- Sync local materials folder to rag_docs
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/sync/preview", methods=["POST"])
def preview_materials_sync_folder():
    data = request.get_json(silent=True) or {}

    try:
        root, allowed_exts = _parse_sync_folder_root_and_exts(data)
        preview = _build_sync_folder_preview(root, allowed_exts=allowed_exts)
    except (ValueError, FileNotFoundError) as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    return jsonify({"ok": True, **preview}), 200


@tutor_bp.route("/materials/sync", methods=["POST"])
def sync_materials_folder():
    data = request.get_json(silent=True) or {}

    try:
        root, allowed_exts, selected_files, course_id = _parse_sync_folder_payload(data)
    except (ValueError, FileNotFoundError) as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    job_id = _mp("_launch_materials_sync_job")(
        root,
        allowed_exts,
        selected_files=selected_files,
        course_id=course_id,
    )
    return (
        jsonify(
            {
                "ok": True,
                "job_id": job_id,
                "folder": str(root),
                "selected_count": (
                    len(selected_files) if selected_files is not None else None
                ),
                "course_id": course_id,
            }
        ),
        202,
    )


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
# POST /api/tutor/materials/video/process -- Process uploaded MP4 to study docs
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
        return jsonify(
            {"error": f"Material file not found on disk: {source_path}"}
        ), 400

    job_id = _mp("_launch_video_process_job")(
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
# GET /api/tutor/materials/video/enrich/status -- Enrichment budget/key status
# ---------------------------------------------------------------------------


@tutor_bp.route("/materials/video/enrich/status", methods=["GET"])
def get_video_enrichment_status():
    material_id = request.args.get("material_id")
    material_id_int: Optional[int] = None
    source_path: Optional[str] = None

    if material_id is not None:
        try:
            material_id_int = int(material_id)
        except (TypeError, ValueError):
            return jsonify({"error": "material_id must be an integer"}), 400

        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, source_path, file_path, file_type FROM rag_docs WHERE id = ?",
            (material_id_int,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return jsonify({"error": "Material not found"}), 404

        source_path = str(row["file_path"] or row["source_path"] or "").strip()
        file_type = str(row["file_type"] or "").strip().lower()
        if file_type != "mp4" and not source_path.lower().endswith(".mp4"):
            return jsonify({"error": "Material is not an mp4 video"}), 400

    try:
        from video_enrich_api import get_enrichment_status

        payload = get_enrichment_status(video_path=source_path or None)
        payload["material_id"] = material_id_int
        return jsonify({"ok": True, **payload}), 200
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/tutor/materials/video/enrich -- Enrich processed video via API
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

    conn = get_connection()
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
    matching_dirs = (
        sorted(
            VIDEO_INGEST_ROOT.glob(f"{slug}_*"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if VIDEO_INGEST_ROOT.exists()
        else []
    )

    segments: list[dict] = []
    segments_path = None
    for d in matching_dirs:
        sp = d / "segments.json"
        if sp.exists():
            segments_path = sp
            segments = json.loads(sp.read_text(encoding="utf-8"))
            break

    if not segments:
        return jsonify(
            {"error": "No processed segments found. Run video/process first."}
        ), 400

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
            output_dir = (
                str(segments_path.parent) if segments_path else str(VIDEO_INGEST_ROOT)
            )
            md_path = emit_enrichment_markdown(slug, result["results"], output_dir)
            result["enrichment_md_path"] = md_path

        return jsonify({"ok": True, "material_id": material_id_int, **result}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
