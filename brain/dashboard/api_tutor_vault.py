"""
Vault / Obsidian helpers extracted from api_tutor.py.

This module holds every function that reads, writes, or syncs Obsidian vault
files — frontmatter parsing, Map-of-Contents I/O, structured-note rendering,
graph sync, and artifact lifecycle management.

Functions here may depend on:
  - ``dashboard.api_tutor_utils`` (constants, normalizers, validators)
  - ``dashboard.api_tutor`` (late imports for ``_get_tutor_session``,
    ``_active_control_stage_for_session``, ``_normalize_material_ids``,
    ``_load_selected_materials``, ``_recommended_mode_flags``,
    ``_normalize_default_mode``, ``_normalize_force_full_docs``)
"""

from __future__ import annotations

import ast
import json
import logging
import os
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from flask import current_app, has_app_context

from db_setup import get_connection

from dashboard.api_tutor_utils import (
    _OBSIDIAN_VAULT,
    _DEFAULT_OBSIDIAN_VAULT_ROOT,
    _MAP_OF_CONTENTS_OBJECTIVE_PATTERN_OLD,
    _MAP_OF_CONTENTS_OBJECTIVE_PATTERN_NEW,
    _collect_objectives_from_payload,
    _default_session_mode_from_scope,
    _derive_follow_up_targets_from_objectives,
    _normalize_objective_id,
    _normalize_objective_scope,
    _normalize_objective_status,
    _normalize_session_mode,
    _normalize_session_rules,
    _normalize_wikilinks,
    _prime_assessment_violations,
    _resolve_class_label,
    _row_value,
    _sanitize_module_name,
    _sanitize_path_segment,
    _strip_wikilink,
    _study_notes_base_path,
    _canonical_moc_path,
    _canonical_learning_objectives_page_path,
    _unlink_all_tutor_session_learning_objectives,
    _validate_tutor_artifact_payload,
    _wikilink,
)

import sys

import dashboard.api_tutor_utils as _utils_mod

_LOG = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Test-monkeypatch bridge
# ---------------------------------------------------------------------------
# Tests patch ``dashboard.api_tutor._vault_read_note`` (etc.) to inject fakes.
# Since those functions now live HERE, internal callers must look them up from
# the *parent* module so patches take effect.  The ``_mp(name)`` helper returns
# the version sitting on ``dashboard.api_tutor`` (the patched one, if any),
# falling back to this module's own definition when the parent module is not
# yet imported (e.g. during early module load).
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
# Objective collection and resolution
# ---------------------------------------------------------------------------


def _collect_objectives_from_db(
    course_id: Optional[int],
    module_id: Optional[int] = None,
    *,
    group_name: Optional[str] = None,
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
    elif group_name:
        cur.execute(
            """
            SELECT lo_code, title, status, group_name
            FROM learning_objectives
            WHERE course_id = ? AND COALESCE(group_name, '') = ?
            ORDER BY id ASC
            LIMIT ?
            """,
            (course_id, str(group_name).strip(), max_items),
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


def _resolve_learning_objectives_for_scope(
    *,
    course_id: Optional[int],
    module_id: Optional[int],
    module_name: Optional[str],
    learning_objectives: Any,
    max_items: int = 40,
) -> list[dict[str, str]]:
    payload_objectives = _collect_objectives_from_payload(learning_objectives)
    if payload_objectives:
        return payload_objectives
    return _collect_objectives_from_db(
        course_id,
        module_id,
        group_name=str(module_name or "").strip() or None,
        max_items=max_items,
    )


# ---------------------------------------------------------------------------
# Vault → DB auto-import: parse objectives from Obsidian vault file
# ---------------------------------------------------------------------------

_VAULT_OBJ_BOLD_RE = re.compile(
    r"^\s*[-*]\s+\*\*\s*(OBJ-\S+)\s*(?:--|—|-)\s*(.+?)\*\*\s*$"
)


def _try_import_objectives_from_vault(
    *,
    course_id: int,
    module_id: Optional[int],
    module_name: str,
    vault_folder: Optional[str],
) -> list[dict[str, str]]:
    """Try to auto-import objectives from the Obsidian vault ``Learning
    Objectives & To Do.md`` file into the DB.

    Called during preflight when the DB has zero objectives for a study unit
    but the vault file may already contain them (e.g. from a prior session
    whose DB rows were lost).

    Returns a list of objective dicts compatible with
    ``_collect_objectives_from_db`` output, or an empty list if the vault
    file is missing / unparseable.
    """
    if _map_of_contents_io_disabled():
        return []

    # --- 1. Determine vault path to the Learning Objectives file ---
    if not vault_folder:
        return []
    lo_rel_path = (
        f"{vault_folder.strip().rstrip('/').rstrip('\\')}"
        "/Learning Objectives & To Do.md"
    )

    # --- 2. Read the file ---
    result = _mp("_vault_read_note")(lo_rel_path)
    if not result.get("success") or not result.get("content"):
        return []
    content: str = result["content"]

    # --- 3. Parse objectives from two formats ---
    parsed: list[tuple[str, str]] = []  # (lo_code, title)

    for line in content.splitlines():
        # Format A: - **OBJ-1 -- Description text.**
        m = _VAULT_OBJ_BOLD_RE.match(line)
        if m:
            parsed.append((m.group(1).strip(), m.group(2).strip().rstrip(".")))
            continue
        # Format B: 1. [[OBJ-1]] Description text (TUTOR_PAGE_SYNC block)
        m2 = _MAP_OF_CONTENTS_OBJECTIVE_PATTERN_NEW.match(line)
        if m2:
            parsed.append((m2.group(1).strip(), m2.group(2).strip()))

    if not parsed:
        return []

    # --- 4. Upsert into learning_objectives table ---
    group_name = str(module_name or "").strip() or None
    now = datetime.now().isoformat()
    conn = get_connection()
    imported: list[dict[str, str]] = []
    try:
        cur = conn.cursor()
        for idx, (raw_code, title) in enumerate(parsed, start=1):
            lo_code = _normalize_objective_id(raw_code, idx)
            if not title:
                title = lo_code

            cur.execute(
                "SELECT id FROM learning_objectives WHERE course_id = ? AND lo_code = ?",
                (course_id, lo_code),
            )
            existing = cur.fetchone()
            if existing:
                lo_id = int(existing[0] if isinstance(existing, (tuple, list)) else existing["id"])
                cur.execute(
                    "UPDATE learning_objectives SET title = ?, group_name = COALESCE(?, group_name), managed_by_tutor = 1, updated_at = ? WHERE id = ?",
                    (title, group_name, now, lo_id),
                )
            else:
                cur.execute(
                    """INSERT INTO learning_objectives
                       (course_id, module_id, lo_code, title, status, group_name, managed_by_tutor, created_at, updated_at)
                       VALUES (?, ?, ?, ?, 'active', ?, 1, ?, ?)""",
                    (course_id, module_id, lo_code, title, group_name, now, now),
                )

            imported.append({
                "objective_id": lo_code,
                "title": title,
                "status": "active",
                **({"group": group_name} if group_name else {}),
            })
        conn.commit()
        _LOG.info(
            "Auto-imported %d objectives from vault for '%s' (course_id=%s)",
            len(imported), module_name, course_id,
        )
    except Exception:
        _LOG.exception("_try_import_objectives_from_vault failed")
        imported = []
    finally:
        conn.close()

    return imported


# ---------------------------------------------------------------------------
# Frontmatter and section parsing
# ---------------------------------------------------------------------------

_FRONTMATTER_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n?", re.DOTALL)


def _parse_existing_map_of_contents_objectives(content: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for line in (content or "").splitlines():
        # Old format: [[OBJ-ID]] ... status: active
        m = _MAP_OF_CONTENTS_OBJECTIVE_PATTERN_OLD.search(line)
        if m:
            parsed[m.group(1).strip()] = _normalize_objective_status(m.group(2))
            continue
        # New format: 1. [[OBJ-ID]] Description text
        m2 = _MAP_OF_CONTENTS_OBJECTIVE_PATTERN_NEW.match(line)
        if m2:
            parsed[m2.group(1).strip()] = "active"
    return parsed


def _slugify_section_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-") or "section"


def _parse_frontmatter_keys(content: str) -> set[str]:
    match = _FRONTMATTER_RE.match(content or "")
    if not match:
        return set()
    keys: set[str] = set()
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key = line.split(":", 1)[0].strip()
        if key:
            keys.add(key)
    return keys


def _parse_frontmatter_dict(content: str) -> dict[str, Any]:
    match = _FRONTMATTER_RE.match(content or "")
    if not match:
        return {}
    raw = (match.group(1) or "").splitlines()
    parsed: dict[str, Any] = {}
    active_list_key: Optional[str] = None
    for line in raw:
        if not line.strip():
            continue
        if active_list_key and line.lstrip().startswith("- "):
            parsed.setdefault(active_list_key, []).append(
                line.split("- ", 1)[1].strip().strip('"').strip("'")
            )
            continue
        active_list_key = None
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        clean_key = key.strip()
        clean_value = value.strip()
        if not clean_key:
            continue
        if clean_value == "":
            parsed[clean_key] = []
            active_list_key = clean_key
            continue
        parsed[clean_key] = clean_value.strip('"').strip("'")
    return parsed


def _frontmatter_line(key: str, value: Any) -> str:
    text = str(value or "").replace("\n", " ").strip()
    return f"{key}: {text}"


def _merge_frontmatter_preserving_existing(
    content: str,
    *,
    canonical_fields: dict[str, Any],
) -> str:
    filtered_fields = {
        str(key): value
        for key, value in canonical_fields.items()
        if str(key).strip() and str(value or "").strip()
    }
    if not filtered_fields:
        return content

    match = _FRONTMATTER_RE.match(content or "")
    if not match:
        frontmatter_body = "\n".join(
            _frontmatter_line(key, value) for key, value in filtered_fields.items()
        )
        if content.strip():
            return f"---\n{frontmatter_body}\n---\n\n{content.strip()}\n"
        return f"---\n{frontmatter_body}\n---\n"

    existing_body = match.group(1)
    existing_keys = _parse_frontmatter_keys(content)
    missing_lines = [
        _frontmatter_line(key, value)
        for key, value in filtered_fields.items()
        if key not in existing_keys
    ]
    if not missing_lines:
        return content

    new_frontmatter = f"---\n{existing_body.rstrip()}\n" + "\n".join(missing_lines) + "\n---"
    remainder = (content[match.end() :] or "").lstrip("\r\n")
    if remainder:
        return f"{new_frontmatter}\n\n{remainder}"
    return f"{new_frontmatter}\n"


def _section_markers(page_key: str, section_title: str) -> tuple[str, str]:
    slug = _slugify_section_key(section_title)
    token = f"TUTOR_PAGE_SYNC:{page_key}:{slug}"
    return f"<!-- {token} START -->", f"<!-- {token} END -->"


def _replace_or_insert_managed_section(
    content: str,
    *,
    page_key: str,
    section_title: str,
    body: str,
) -> str:
    start_marker, end_marker = _section_markers(page_key, section_title)
    managed_block = f"{start_marker}\n{(body or '- (none)').strip()}\n{end_marker}"
    marker_pattern = re.compile(
        rf"{re.escape(start_marker)}.*?{re.escape(end_marker)}",
        re.DOTALL,
    )
    if marker_pattern.search(content):
        return marker_pattern.sub(managed_block, content, count=1)

    heading_pattern = re.compile(
        rf"(?mi)^(##\s+{re.escape(section_title)}\s*)$"
    )
    heading_match = heading_pattern.search(content)
    if heading_match:
        insert_at = heading_match.end()
        return (
            content[:insert_at]
            + f"\n\n{managed_block}"
            + content[insert_at:]
        )

    suffix = "" if not content.strip() else "\n\n"
    return f"{content.rstrip()}{suffix}## {section_title}\n\n{managed_block}\n"


def _parse_metadata_json(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    text = str(value or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    try:
        parsed = ast.literal_eval(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return {}


def _strip_internal_sync_artifacts(content: str) -> str:
    text = str(content or "")
    text = re.sub(
        r"^(---\r?\n.*?\r?\n---\s*\r?\n\r?\n)# patched\s*(?:\r?\n){1,2}",
        r"\1",
        text,
        count=1,
        flags=re.DOTALL,
    )
    return re.sub(r"^\s*# patched\s*(?:\r?\n){1,2}", "", text, count=1)


# ---------------------------------------------------------------------------
# Vault I/O
# ---------------------------------------------------------------------------


def _vault_error_is_missing_file(error: Any) -> bool:
    text = str(error or "").strip().lower()
    if not text:
        return False
    if _looks_like_obsidian_cli_error(text):
        return False
    return "file not found" in text or "not found" in text


def _map_of_contents_io_disabled() -> bool:
    """Disable Obsidian Map of Contents I/O for tests/safety guard contexts."""
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


def _obsidian_vault_root_path() -> Optional[Path]:
    candidates = [
        os.environ.get("OBSIDIAN_VAULT_FS_PATH"),
        os.environ.get("PT_OBSIDIAN_VAULT_PATH"),
        os.environ.get("TREYS_SCHOOL_VAULT_PATH"),
        str(_DEFAULT_OBSIDIAN_VAULT_ROOT),
    ]
    for candidate in candidates:
        text = str(candidate or "").strip()
        if not text:
            continue
        root = Path(text).expanduser()
        if root.exists() and root.is_dir():
            return root.resolve()
    return None


def _resolve_vault_fs_path(rel_path: str) -> Path:
    root = _mp("_obsidian_vault_root_path")()
    if root is None:
        raise FileNotFoundError(
            "Obsidian vault path is not configured. Set OBSIDIAN_VAULT_FS_PATH."
        )
    target = (root / rel_path).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise ValueError("path is outside configured Obsidian vault") from exc
    return target


def _get_obsidian_vault():
    # Use the shared mutable reference on the utils module
    if _utils_mod._OBSIDIAN_VAULT is None:
        from obsidian_vault import ObsidianVault

        _utils_mod._OBSIDIAN_VAULT = ObsidianVault()
    return _utils_mod._OBSIDIAN_VAULT


def _looks_like_obsidian_cli_error(content: Any) -> bool:
    text = str(content or "").strip()
    if not text:
        return False
    lowered = text.lower()
    return (
        "your obsidian installer is out of date" in lowered
        or re.search(r'error:\s*file\s+".+?"\s+not\s+found', lowered) is not None
    )


def _vault_read_note(path: str) -> dict[str, Any]:
    rel_path = str(path or "").replace("\\", "/").strip().lstrip("/")
    if not rel_path:
        return {"success": False, "error": "path is required"}
    try:
        fs_path = _resolve_vault_fs_path(rel_path)
        if fs_path.exists() and fs_path.is_file():
            return {
                "success": True,
                "content": fs_path.read_text(encoding="utf-8", errors="ignore"),
                "path": rel_path,
            }
        if _mp("_obsidian_vault_root_path")() is not None:
            return {"success": False, "error": "file not found", "path": rel_path}
    except (FileNotFoundError, ValueError):
        pass
    try:
        vault = _mp("_get_obsidian_vault")()
        content = vault.read_note(file=rel_path)
        if _looks_like_obsidian_cli_error(content):
            return {"success": False, "error": str(content).strip(), "path": rel_path}
        if content:
            return {"success": True, "content": content, "path": rel_path}
        file_info = vault.get_file_info(file=rel_path)
        if isinstance(file_info, dict) and file_info:
            return {"success": True, "content": content or "", "path": rel_path}
        return {"success": False, "error": "file not found", "path": rel_path}
    except Exception as exc:
        return {"success": False, "error": str(exc), "path": rel_path}


def _vault_save_note(path: str, content: str) -> dict[str, Any]:
    rel_path = str(path or "").replace("\\", "/").strip().lstrip("/")
    if not rel_path:
        return {"success": False, "error": "path is required"}
    try:
        fs_path = _resolve_vault_fs_path(rel_path)
        fs_path.parent.mkdir(parents=True, exist_ok=True)
        fs_path.write_text(content, encoding="utf-8")
        return {"success": True, "path": rel_path}
    except (FileNotFoundError, ValueError):
        pass
    try:
        vault = _mp("_get_obsidian_vault")()
        name = rel_path.rsplit("/", 1)[-1]
        folder = rel_path.rsplit("/", 1)[0] if "/" in rel_path else ""
        note_name = name[:-3] if name.lower().endswith(".md") else name

        existing = _mp("_vault_read_note")(rel_path)
        if existing.get("success"):
            vault.replace_content(file=rel_path, new_content=content)
        elif not _vault_error_is_missing_file(existing.get("error")):
            return {
                "success": False,
                "error": existing.get("error") or "failed_to_read_existing_note",
                "path": rel_path,
            }
        else:
            vault.create_note(name=note_name, folder=folder, content=content)

        verify = _mp("_vault_read_note")(rel_path)
        if verify.get("success"):
            return {"success": True, "path": rel_path}
        return {
            "success": False,
            "error": verify.get("error") or "failed to verify note write",
            "path": rel_path,
        }
    except Exception as exc:
        return {"success": False, "error": str(exc), "path": rel_path}


def _vault_delete_note(path: str) -> dict[str, Any]:
    rel_path = str(path or "").replace("\\", "/").strip().lstrip("/")
    if not rel_path:
        return {"success": False, "error": "path is required"}
    try:
        fs_path = _resolve_vault_fs_path(rel_path)
        if fs_path.exists():
            fs_path.unlink()
        return {"success": True, "path": rel_path}
    except (FileNotFoundError, ValueError):
        pass
    try:
        vault = _mp("_get_obsidian_vault")()
        result = vault.delete_note(path=rel_path)
        verify = _mp("_vault_read_note")(rel_path)
        if verify.get("success"):
            return {
                "success": False,
                "error": result or "failed to delete note",
                "path": rel_path,
            }
        return {"success": True, "path": rel_path}
    except Exception as exc:
        return {"success": False, "error": str(exc), "path": rel_path}


# ---------------------------------------------------------------------------
# Sync week page
# ---------------------------------------------------------------------------


def _sync_week_page(
    *,
    path: str,
    page_key: str,
    section_order: list[str],
    section_content: dict[str, str],
    canonical_frontmatter: dict[str, Any],
) -> tuple[dict[str, Any], Optional[str]]:
    existing = _mp("_vault_read_note")(path)
    raw_existing_content = (
        str(existing.get("content") or "") if existing.get("success") else ""
    )
    existing_content = _strip_internal_sync_artifacts(raw_existing_content)
    content = _merge_frontmatter_preserving_existing(
        existing_content,
        canonical_fields=canonical_frontmatter,
    )
    for section_title in section_order:
        content = _replace_or_insert_managed_section(
            content,
            page_key=page_key,
            section_title=section_title,
            body=section_content.get(section_title, "- (none)"),
        )
    content = content.rstrip() + "\n"

    if _map_of_contents_io_disabled():
        status = "test_mode_no_write"
    elif existing.get("success"):
        if content == raw_existing_content:
            status = "reviewed"
        else:
            save_result = _mp("_vault_save_note")(path, content)
            if not save_result.get("success"):
                return (
                    {"path": path, "status": "update_failed"},
                    str(save_result.get("error") or "failed_to_patch_page"),
                )
            status = "patched"
    else:
        save_result = _mp("_vault_save_note")(path, content)
        if not save_result.get("success"):
            return (
                {"path": path, "status": "build_failed"},
                str(save_result.get("error") or "failed_to_create_page"),
            )
        status = "created"

    return (
        {
            "path": path,
            "status": status,
            "sections": list(section_order),
        },
        None,
    )


def _build_page_sync_payload(
    *,
    module_name: str,
    course_name: str,
    topic: str,
    objectives: list[dict[str, str]],
    source_ids: list[int],
    objective_scope: str = "module_all",
    focus_objective_id: Optional[str] = None,
    existing_frontmatter: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    from tutor_templates import (
        LEARNING_OBJECTIVES_TODO_SECTIONS,
        MAP_OF_CONTENTS_SECTIONS,
        render_learning_objectives_todo_sections,
        render_map_of_contents_sections,
    )

    # Late import to avoid circular dependency
    from dashboard.api_tutor import _load_selected_materials

    materials = _load_selected_materials(source_ids)
    shared_payload = {
        "module_name": module_name,
        "course_name": course_name,
        "topic": topic,
        "objectives": objectives,
        "materials": materials,
        "objective_scope": objective_scope,
        "focus_objective_id": focus_objective_id or "",
        "existing_frontmatter": existing_frontmatter or {},
        "learning_objectives_page_name": "Learning Objectives & To Do",
        "sessions_folder": "Sessions/",
        "concepts_folder": "Concepts/",
    }
    return {
        "materials": materials,
        "learning_objectives_sections": render_learning_objectives_todo_sections(
            shared_payload
        ),
        "learning_objectives_section_order": list(LEARNING_OBJECTIVES_TODO_SECTIONS),
        "map_of_contents_sections": render_map_of_contents_sections(shared_payload),
        "map_of_contents_section_order": list(MAP_OF_CONTENTS_SECTIONS),
    }


def _build_map_of_contents_markdown(
    *,
    module_name: str,
    course_name: str = "",
    topic: str,
    objectives: list[dict[str, str]],
    source_ids: list[int],
) -> str:
    from tutor_templates import _render_moc_markdown

    # Group objectives by their 'group' field (or single flat group)
    groups_map: dict[str, list[dict[str, str]]] = {}
    group_order: list[str] = []
    for obj in objectives:
        group_name = str(obj.get("group") or module_name)
        if group_name not in groups_map:
            groups_map[group_name] = []
            group_order.append(group_name)
        groups_map[group_name].append(
            {
                "id": obj.get("objective_id", ""),
                "description": obj.get("title", ""),
                "status": obj.get("status", "active"),
            }
        )

    objective_groups = [
        {"name": name, "objectives": groups_map[name]} for name in group_order
    ]

    payload: dict[str, Any] = {
        "module_name": module_name,
        "course_name": course_name,
        "objective_groups": objective_groups,
        "follow_up_targets": _derive_follow_up_targets_from_objectives(objectives),
    }
    return _render_moc_markdown(payload)


def _session_has_real_objectives(map_of_contents: Optional[dict]) -> bool:
    """Return True if the map of contents has at least one real (non-UNMAPPED) objective."""
    if not map_of_contents:
        return False
    objective_ids = map_of_contents.get("objective_ids") or []
    return any(
        str(oid or "").strip() and str(oid).strip() != "OBJ-UNMAPPED"
        for oid in objective_ids
    )


_LO_LIST_RE = re.compile(r"^\s*(?:\d+[.)]\s+|[-*]\s+)(.+)$")

_GROUP_HEADER_RE = re.compile(r"^(?:\*\*|##?\s+)(?:[IVXLC]+\.\s+)?(.+?)(?:\*\*)?$")


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


# ---------------------------------------------------------------------------
# MoC and preflight
# ---------------------------------------------------------------------------


def _ensure_moc_context(
    *,
    course_id: Optional[int],
    module_id: Optional[int],
    module_name: Optional[str],
    topic: str,
    learning_objectives: Any,
    source_ids: list[int],
    objective_scope: str = "module_all",
    focus_objective_id: Optional[str] = None,
    force_refresh: bool = False,
    path_override: Optional[str] = None,
) -> tuple[Optional[dict[str, Any]], Optional[str]]:
    """
    Sync the Tutor week pages before session launch.

    This patches managed sections inside:
    - ``_Map of Contents.md``
    - ``Learning Objectives & To Do.md``

    Existing learner content outside managed sections is preserved.
    """
    derived_module_name = _sanitize_module_name(
        module_name or topic or f"Module-{course_id or 'General'}"
    )
    derived_subtopic = _sanitize_path_segment(
        topic or derived_module_name, fallback=derived_module_name
    )
    derived_course = _resolve_class_label(course_id)

    if path_override:
        clean = path_override.strip().rstrip("/").rstrip("\\")
        map_of_contents_path = f"{clean}/_Map of Contents.md"
        learning_objectives_path = f"{clean}/Learning Objectives & To Do.md"
    else:
        map_of_contents_path = _canonical_moc_path(
            course_label=derived_course,
            module_or_week=derived_module_name,
            subtopic=derived_subtopic,
        )
        learning_objectives_path = _canonical_learning_objectives_page_path(
            course_label=derived_course,
            module_or_week=derived_module_name,
            subtopic=derived_subtopic,
        )

    objectives = _resolve_learning_objectives_for_scope(
        course_id=course_id,
        module_id=module_id,
        module_name=derived_module_name,
        learning_objectives=learning_objectives,
    )

    if not objectives:
        fallback_title = derived_module_name or topic.strip()
        objectives = [
            {
                "objective_id": "OBJ-UNMAPPED",
                "title": fallback_title,
                "status": "active",
            }
        ]

    existing_lo = _mp("_vault_read_note")(learning_objectives_path)
    existing_lo_frontmatter = _parse_frontmatter_dict(
        str(existing_lo.get("content") or "") if existing_lo.get("success") else ""
    )

    page_payload = _build_page_sync_payload(
        module_name=derived_module_name,
        course_name=derived_course,
        topic=topic,
        objectives=objectives,
        source_ids=source_ids,
        objective_scope=objective_scope,
        focus_objective_id=focus_objective_id,
        existing_frontmatter=existing_lo_frontmatter,
    )
    canonical_frontmatter_base = {
        "module_name": derived_module_name,
        "course_name": derived_course,
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    moc_ctx, moc_error = _sync_week_page(
        path=map_of_contents_path,
        page_key="map-of-contents",
        section_order=page_payload["map_of_contents_section_order"],
        section_content=page_payload["map_of_contents_sections"],
        canonical_frontmatter={
            "note_type": "map_of_contents",
            **canonical_frontmatter_base,
        },
    )
    lo_ctx, lo_error = _sync_week_page(
        path=learning_objectives_path,
        page_key="learning-objectives-and-to-do",
        section_order=page_payload["learning_objectives_section_order"],
        section_content=page_payload["learning_objectives_sections"],
        canonical_frontmatter={
            "note_type": "learning_objectives_todo",
            **canonical_frontmatter_base,
        },
    )
    sync_errors = [err for err in (moc_error, lo_error) if err]
    moc_status = str(moc_ctx.get("status") or "unknown")
    lo_status = str(lo_ctx.get("status") or "unknown")
    sync_ok_statuses = {"reviewed", "patched", "created", "test_mode_no_write"}
    page_sync_ok = moc_status in sync_ok_statuses and lo_status in sync_ok_statuses

    objective_links = [_wikilink(o["objective_id"]) for o in objectives]
    title_links = [_wikilink(o["title"]) for o in objectives if o.get("title")]
    material_links = [
        _wikilink(str(material.get("title") or Path(str(material.get("source_path") or "")).stem))
        for material in page_payload.get("materials", [])
        if str(material.get("title") or material.get("source_path") or "").strip()
    ]
    reference_targets = _normalize_wikilinks(
        objective_links + title_links + material_links,
        max_items=80,
    )
    if not reference_targets:
        reference_targets = ["[[OBJ-UNMAPPED]]"]
    follow_up_targets = _derive_follow_up_targets_from_objectives(
        objectives,
        focus_objective_id=focus_objective_id,
    )

    return (
        {
            "path": map_of_contents_path,
            "module_name": derived_module_name,
            "course_name": derived_course,
            "subtopic_name": derived_subtopic,
            "status": moc_status,
            "reference_targets": reference_targets,
            "follow_up_targets": follow_up_targets,
            "objective_ids": [o["objective_id"] for o in objectives],
            "learning_objectives_page": {
                "path": learning_objectives_path,
                "status": lo_status,
                "module_name": derived_module_name,
                "course_name": derived_course,
                "subtopic_name": derived_subtopic,
                "objective_ids": [o["objective_id"] for o in objectives],
            },
            "page_sync_result": {
                "ok": page_sync_ok,
                "map_of_contents": {
                    "path": map_of_contents_path,
                    "status": moc_status,
                    "error": moc_error,
                },
                "learning_objectives_todo": {
                    "path": learning_objectives_path,
                    "status": lo_status,
                    "error": lo_error,
                },
                "errors": sync_errors,
                "synced_at": datetime.now().isoformat(),
            },
        },
        None,
    )


def _resolve_tutor_preflight(
    data: dict[str, Any]
) -> tuple[Optional[dict[str, Any]], Optional[tuple[dict[str, Any], int]]]:
    # Late imports to avoid circular dependency
    from dashboard.api_tutor import (
        _normalize_material_ids,
        _normalize_default_mode,
        _normalize_force_full_docs,
        _recommended_mode_flags,
    )
    from tutor_accuracy_profiles import normalize_accuracy_profile

    course_id = data.get("course_id")
    if course_id is None:
        return None, ({"error": "course_id is required"}, 400)
    try:
        course_id_int = int(course_id)
    except (TypeError, ValueError):
        return None, ({"error": "course_id must be an integer"}, 400)

    module_name = str(data.get("study_unit") or data.get("module_name") or "").strip()
    topic = str(data.get("topic") or module_name or "").strip()
    objective_scope = _normalize_objective_scope(data.get("objective_scope"))
    focus_objective_id = str(data.get("focus_objective_id") or "").strip()
    learning_objectives = data.get("learning_objectives")
    content_filter = data.get("content_filter")
    if not isinstance(content_filter, dict):
        content_filter = {}
    normalized_filter = dict(content_filter)
    normalized_filter["accuracy_profile"] = normalize_accuracy_profile(
        normalized_filter.get("accuracy_profile")
    )
    material_ids = _normalize_material_ids(normalized_filter.get("material_ids")) or []
    normalized_filter["material_ids"] = material_ids
    default_mode = _normalize_default_mode(
        normalized_filter.get("default_mode"), material_ids=material_ids
    )
    if default_mode:
        normalized_filter["default_mode"] = default_mode
    normalized_filter["force_full_docs"] = _normalize_force_full_docs(
        normalized_filter.get("force_full_docs"),
        material_ids=material_ids,
    )
    source_ids = _normalize_material_ids(data.get("source_ids")) or material_ids
    if source_ids:
        normalized_filter["source_ids"] = source_ids
    normalized_filter["objective_scope"] = objective_scope
    if focus_objective_id:
        normalized_filter["focus_objective_id"] = focus_objective_id
    normalized_filter["session_rules"] = _normalize_session_rules(
        normalized_filter.get("session_rules")
    )
    vault_folder = str(normalized_filter.get("vault_folder") or "").strip() or None

    module_id: Optional[int] = None
    if data.get("module_id") is not None:
        try:
            module_id = int(data.get("module_id"))
        except (TypeError, ValueError):
            return None, ({"error": "module_id must be an integer"}, 400)

    resolved_objectives = _resolve_learning_objectives_for_scope(
        course_id=course_id_int,
        module_id=module_id,
        module_name=module_name or topic or None,
        learning_objectives=learning_objectives,
    )
    map_of_contents_ctx: Optional[dict[str, Any]] = None
    map_of_contents_error: Optional[str] = None
    if resolved_objectives:
        map_of_contents_ctx, map_of_contents_error = _mp("_ensure_moc_context")(
            course_id=course_id_int,
            module_id=module_id,
            module_name=module_name or topic or None,
            topic=topic,
            learning_objectives=learning_objectives,
            source_ids=source_ids,
            objective_scope=objective_scope,
            focus_objective_id=focus_objective_id or None,
            force_refresh=bool(data.get("map_of_contents_refresh")),
            path_override=vault_folder,
        )
        if map_of_contents_error:
            return None, ({"error": map_of_contents_error}, 500)
    blockers: list[dict[str, str]] = []
    if not module_name:
        blockers.append(
            {
                "code": "STUDY_UNIT_REQUIRED",
                "message": "Choose a study unit before starting the Tutor session.",
            }
        )
    if not material_ids:
        blockers.append(
            {
                "code": "MATERIALS_REQUIRED",
                "message": "Select one or more study materials before starting a Tutor session.",
            }
        )
    if objective_scope == "single_focus" and not focus_objective_id:
        blockers.append(
            {
                "code": "FOCUS_OBJECTIVE_REQUIRED",
                "message": "Choose a focus objective before starting a single-focus Tutor session.",
            }
        )
    if module_name and not resolved_objectives:
        # --- Auto-import from Obsidian vault before blocking ---
        vault_imported = _try_import_objectives_from_vault(
            course_id=course_id_int,
            module_id=module_id,
            module_name=module_name,
            vault_folder=vault_folder,
        )
        if vault_imported:
            resolved_objectives = vault_imported
            # Now that objectives are in the DB, build MoC context
            # (the earlier _ensure_moc_context call was skipped)
            map_of_contents_ctx, map_of_contents_error = _mp("_ensure_moc_context")(
                course_id=course_id_int,
                module_id=module_id,
                module_name=module_name or topic or None,
                topic=topic,
                learning_objectives=None,  # read from DB
                source_ids=source_ids,
                objective_scope=objective_scope,
                focus_objective_id=focus_objective_id or None,
                force_refresh=True,
                path_override=vault_folder,
            )
            if map_of_contents_error:
                _LOG.warning("MoC rebuild after vault import: %s", map_of_contents_error)
        else:
            blockers.append(
                {
                    "code": "APPROVED_OBJECTIVES_REQUIRED",
                    "message": "Save approved objectives for this study unit before running Tutor preflight.",
                }
            )
    if map_of_contents_ctx:
        module_prefix = str(Path(str(map_of_contents_ctx["path"])).parent).replace(
            "\\", "/"
        )
        normalized_filter["module_name"] = map_of_contents_ctx.get("module_name")
        normalized_filter["module_prefix"] = module_prefix
        normalized_filter["map_of_contents"] = {
            "path": map_of_contents_ctx.get("path"),
            "status": map_of_contents_ctx.get("status"),
            "module_name": map_of_contents_ctx.get("module_name"),
            "course_name": map_of_contents_ctx.get("course_name"),
            "subtopic_name": map_of_contents_ctx.get("subtopic_name"),
            "objective_ids": map_of_contents_ctx.get("objective_ids") or [],
        }
        normalized_filter["reference_targets"] = (
            map_of_contents_ctx.get("reference_targets") or []
        )
        normalized_filter["follow_up_targets"] = (
            map_of_contents_ctx.get("follow_up_targets") or []
        )
        normalized_filter["learning_objectives_page"] = (
            map_of_contents_ctx.get("learning_objectives_page") or {}
        )
        normalized_filter["page_sync_result"] = (
            map_of_contents_ctx.get("page_sync_result") or {}
        )
        normalized_filter["enforce_reference_bounds"] = bool(
            normalized_filter.get("enforce_reference_bounds")
            if normalized_filter.get("enforce_reference_bounds") is not None
            else objective_scope == "single_focus"
        )
        if not bool((map_of_contents_ctx.get("page_sync_result") or {}).get("ok")):
            blockers.append(
                {
                    "code": "PAGE_SYNC_FAILED",
                    "message": "Tutor could not patch the required Obsidian week pages. Resolve page sync before starting the session.",
                }
            )
    elif module_name and not resolved_objectives:
        normalized_filter["page_sync_result"] = {
            "ok": False,
            "map_of_contents": {
                "path": (
                    f"{vault_folder.strip().rstrip('/').rstrip('\\')}/_Map of Contents.md"
                    if vault_folder
                    else ""
                ),
                "status": "skipped_missing_objectives",
                "error": "approved_objectives_required",
            },
            "learning_objectives_todo": {
                "path": (
                    f"{vault_folder.strip().rstrip('/').rstrip('\\')}/Learning Objectives & To Do.md"
                    if vault_folder
                    else ""
                ),
                "status": "skipped_missing_objectives",
                "error": "approved_objectives_required",
            },
            "errors": ["approved_objectives_required"],
        }

    bundle = {
        "course_id": course_id_int,
        "module_id": module_id,
        "module_name": normalized_filter.get("module_name") or module_name or topic,
        "topic": topic or normalized_filter.get("module_name") or module_name,
        "objective_scope": objective_scope,
        "focus_objective_id": focus_objective_id or None,
        "material_ids": material_ids,
        "source_ids": source_ids,
        "vault_folder": vault_folder,
        "content_filter": normalized_filter,
        "resolved_learning_objectives": resolved_objectives,
        "map_of_contents": map_of_contents_ctx,
        "learning_objectives_page": (
            map_of_contents_ctx.get("learning_objectives_page")
            if isinstance(map_of_contents_ctx, dict)
            else (
                normalized_filter.get("learning_objectives_page")
                if isinstance(normalized_filter.get("learning_objectives_page"), dict)
                else None
            )
        ),
        "page_sync_result": (
            map_of_contents_ctx.get("page_sync_result")
            if isinstance(map_of_contents_ctx, dict)
            else normalized_filter.get("page_sync_result")
        ),
        "recommended_mode_flags": _recommended_mode_flags(material_ids),
        "blockers": blockers,
        "ok": len(blockers) == 0,
    }
    return bundle, None


def _question_within_reference_targets(
    question: str, reference_targets: list[str]
) -> bool:
    q = re.sub(r"[^a-z0-9\s]", " ", (question or "").lower())
    q = re.sub(r"\s+", " ", q).strip()
    if not q:
        return False

    # Allow scoped planning/continuation prompts without requiring literal concept
    # names, but keep the patterns narrow enough to avoid obvious scope drift.
    if any(
        phrase in q
        for phrase in (
            "overview",
            "big picture",
            "map of contents",
            "derivative map",
            "make it explicit",
            "does this click",
        )
    ):
        return True

    if any(
        re.search(pattern, q)
        for pattern in (
            r"\bchunk\s+\d+\b",
            r"\bnext chunk\b",
            r"\bgo to chunk\b",
            r"\bcontinue with chunk\b",
            r"\bcontinue with the derivative map\b",
            r"\bcontinue the same objective\b",
        )
    ):
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


# ---------------------------------------------------------------------------
# Note rendering and sync
# ---------------------------------------------------------------------------


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
    from obsidian_index import get_vault_index
    from obsidian_merge import merge_sections

    existing_resp = _mp("_vault_read_note")(path)
    existing_content = (
        str(existing_resp.get("content") or "") if existing_resp.get("success") else ""
    )
    vault_result = get_vault_index()
    vault_notes = (
        vault_result.get("notes", [])
        if isinstance(vault_result, dict) and vault_result.get("success")
        else []
    )
    merged_content = merge_sections(
        existing_content,
        content,
        session_id=session_id,
        vault_index=vault_notes,
    )
    save_result = _mp("_vault_save_note")(path, merged_content)
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
        graph_sync = _mp("_sync_graph_for_paths")(
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
    """Persist approved learning objectives and rebuild the Map of Contents note.

    Called by the ``save_learning_objectives`` tutor tool.  Steps:
      1. Read the tutor session to get ``course_id`` and ``content_filter_json``.
      2. INSERT each objective into ``learning_objectives`` (upsert on lo_code+course_id).
      3. Rebuild the Map of Contents note via ``_ensure_moc_context(force_refresh=True)``.
      4. Update ``content_filter_json`` so ``_session_has_real_objectives()`` returns True.

    If *save_folder* is provided (vault-relative path), the Map of Contents and future
    notes are saved there instead of the auto-generated path.
    """
    # Late import to avoid circular dependency
    from dashboard.api_tutor import _get_tutor_session

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

        map_of_contents = content_filter.get("map_of_contents") or {}
        module_id = content_filter.get("module_id")
        module_name = map_of_contents.get("module_name") or content_filter.get(
            "module_name"
        )
        topic = session_row.get("topic") or module_name or ""
        source_ids = content_filter.get("source_ids") or []

        # --- 2. INSERT into learning_objectives (upsert by course_id+lo_code) ---
        # group_name = session topic so objectives are grouped by topic in Map of Contents
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
                """
                SELECT id, managed_by_tutor
                FROM learning_objectives
                WHERE course_id = ? AND lo_code = ?
                """,
                (course_id, lo_code),
            )
            existing = cur.fetchone()
            if existing:
                lo_id = int(_row_value(existing, "id", 0))
                cur.execute(
                    "UPDATE learning_objectives SET title = ?, group_name = COALESCE(?, group_name), updated_at = ? WHERE id = ?",
                    (
                        title,
                        group_name,
                        now,
                        lo_id,
                    ),
                )
            else:
                cur.execute(
                    """INSERT INTO learning_objectives
                       (course_id, module_id, lo_code, title, status, group_name, managed_by_tutor, created_at, updated_at)
                       VALUES (?, ?, ?, ?, 'active', ?, 1, ?, ?)""",
                    (course_id, module_id, lo_code, title, group_name, now, now),
                )
                lo_id = int(cur.lastrowid)
            cur.execute(
                """
                INSERT OR IGNORE INTO tutor_session_learning_objectives
                    (tutor_session_id, lo_id, created_at)
                VALUES (?, ?, ?)
                """,
                (session_id, lo_id, now),
            )
            inserted_codes.append(lo_code)
        conn.commit()

        # --- 3. Rebuild Map of Contents from ALL objectives in DB (not just this batch) ---
        # Pass learning_objectives=None so _ensure_moc_context merges from DB,
        # picking up objectives from previous sessions (e.g., Hip + Knee).
        ns_ctx, ns_err = _mp("_ensure_moc_context")(
            course_id=course_id,
            module_id=module_id,
            module_name=module_name,
            topic=topic,
            learning_objectives=None,
            source_ids=source_ids,
            objective_scope=_normalize_objective_scope(
                content_filter.get("objective_scope")
            ),
            focus_objective_id=str(content_filter.get("focus_objective_id") or "").strip()
            or None,
            force_refresh=True,
            path_override=save_folder,
        )
        if ns_err:
            _LOG.warning("Week-page rebuild warning: %s", ns_err)

        # --- 4. Update session content_filter_json ---
        if ns_ctx:
            module_prefix = str(Path(str(ns_ctx["path"])).parent).replace("\\", "/")
            content_filter["module_name"] = ns_ctx.get("module_name")
            content_filter["module_prefix"] = module_prefix
            content_filter["map_of_contents"] = {
                "path": ns_ctx.get("path"),
                "status": ns_ctx.get("status"),
                "module_name": ns_ctx.get("module_name"),
                "course_name": ns_ctx.get("course_name"),
                "subtopic_name": ns_ctx.get("subtopic_name"),
                "objective_ids": ns_ctx.get("objective_ids") or [],
            }
            content_filter["reference_targets"] = ns_ctx.get("reference_targets") or []
            content_filter["follow_up_targets"] = ns_ctx.get("follow_up_targets") or []
            content_filter["learning_objectives_page"] = (
                ns_ctx.get("learning_objectives_page") or {}
            )
            content_filter["page_sync_result"] = ns_ctx.get("page_sync_result") or {}

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


# ---------------------------------------------------------------------------
# Artifact Obsidian operations
# ---------------------------------------------------------------------------


def _finalize_structured_notes_for_session(
    *,
    conn: sqlite3.Connection,
    session_id: str,
    session_row: dict[str, Any],
    artifact_payload: dict[str, Any],
) -> tuple[Optional[dict[str, Any]], list[str]]:
    # Late import to avoid circular dependency
    from dashboard.api_tutor import _active_control_stage_for_session

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
        content_filter.get("module_name")
        or session_row.get("topic")
        or "General Module"
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
        rendered_notes[concept_path] = str(
            save_concept.get("content") or concept_markdown
        )
        saved_paths.append(concept_path)
        concept_paths.append(concept_path)

    graph_sync = _mp("_sync_graph_for_paths")(conn=conn, notes_by_path=rendered_notes)

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


def _reconcile_obsidian_state(
    session: dict,
    *,
    persist: bool = True,
    prune_learning_objectives: bool = True,
) -> None:
    """Check whether Obsidian files referenced by a session still exist.

    Called on GET /session/<id> (reconcile-on-load). Mutates *session* dict
    in place so the response reflects the current vault state.

    - Map of Contents: if the file is missing, sets ``map_of_contents.status`` to
      ``"needs_path"`` and persists the change to SQLite when ``persist=True``.
    - Artifacts: flags each artifact entry with ``"missing": True`` if its
      ``session_path`` or any of its ``concept_paths`` no longer exist.
    """
    session_id = session.get("session_id")
    if not session_id:
        return

    # --- Map of Contents reconciliation ---
    cf_raw = session.get("content_filter_json")
    content_filter: Optional[dict] = None
    if cf_raw:
        try:
            content_filter = json.loads(cf_raw) if isinstance(cf_raw, str) else cf_raw
        except (json.JSONDecodeError, TypeError):
            content_filter = None

    ns_changed = False
    if content_filter and isinstance(content_filter.get("map_of_contents"), dict):
        ns = content_filter["map_of_contents"]
        ns_path = ns.get("path")
        ns_status = ns.get("status")
        # Only check if there's a path and the status isn't already needs_path
        if ns_path and ns_status not in ("needs_path", "test_mode_no_write"):
            result = _mp("_vault_read_note")(ns_path)
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
            res = _mp("_vault_read_note")(sp)
            if not res.get("success"):
                missing_paths.append(sp)

        for cp in art.get("concept_paths") or []:
            res = _mp("_vault_read_note")(cp)
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

    # --- Learning-objective cleanup when Map of Contents is gone ---
    # If the user deleted the Map of Contents from Obsidian, unlink the tutor
    # session from its objectives and only garbage-collect tutor-managed rows
    # that are now orphaned.
    lo_deleted = 0
    if (
        persist
        and prune_learning_objectives
        and ns_changed
        and content_filter is not None
    ):
        try:
            conn_lo = get_connection()
            lo_deleted = _unlink_all_tutor_session_learning_objectives(
                conn_lo, str(session_id)
            )
            conn_lo.commit()
            conn_lo.close()
        except Exception:
            logging.getLogger(__name__).warning(
                "reconcile_obsidian_state: failed to unlink LOs for %s",
                session_id,
                exc_info=True,
            )
        if lo_deleted:
            logging.getLogger(__name__).info(
                "reconcile_obsidian_state: deleted %d orphaned tutor-managed LO(s) for session %s",
                lo_deleted,
                session_id,
            )

    # Persist changes to SQLite if anything was updated
    if persist and (ns_changed or art_changed):
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
    deleted: list[str] = []
    sp = artifact.get("session_path")
    if sp:
        res = _mp("_vault_delete_note")(sp)
        if res.get("success"):
            deleted.append(sp)

    for cp in artifact.get("concept_paths") or []:
        res = _mp("_vault_delete_note")(cp)
        if res.get("success"):
            deleted.append(cp)

    return deleted


def _cascade_delete_obsidian_files(session: dict) -> list[str]:
    """Delete all Obsidian files owned by a session (Map of Contents + artifacts).

    Called from ``delete_session`` using a pre-delete session snapshot.
    Returns a list of vault-relative paths that were successfully deleted.
    """
    log = logging.getLogger(__name__)
    deleted: list[str] = []

    # 1. Map of Contents file
    cf_raw = session.get("content_filter_json")
    if cf_raw:
        try:
            cf = json.loads(cf_raw) if isinstance(cf_raw, str) else cf_raw
        except (json.JSONDecodeError, TypeError):
            cf = None
        if isinstance(cf, dict):
            ns = cf.get("map_of_contents") or {}
            ns_path = ns.get("path")
            if ns_path:
                res = _mp("_vault_delete_note")(ns_path)
                if res.get("success"):
                    deleted.append(ns_path)
                else:
                    log.debug(
                        "cascade_delete: Map of Contents not found at %s", ns_path
                    )

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


def _expected_obsidian_paths_for_session(session: dict) -> list[str]:
    """Return the set of Obsidian note paths we expect to own for this session."""
    expected: set[str] = set()

    cf_raw = session.get("content_filter_json")
    if cf_raw:
        try:
            cf = json.loads(cf_raw) if isinstance(cf_raw, str) else cf_raw
        except (json.JSONDecodeError, TypeError):
            cf = None
        if isinstance(cf, dict):
            ns = cf.get("map_of_contents") or {}
            ns_path = str(ns.get("path") or "").strip()
            if ns_path:
                expected.add(ns_path)

    art_raw = session.get("artifacts_json")
    if art_raw:
        try:
            artifacts = json.loads(art_raw) if isinstance(art_raw, str) else art_raw
        except (json.JSONDecodeError, TypeError):
            artifacts = []
        if isinstance(artifacts, list):
            for art in artifacts:
                if not isinstance(art, dict):
                    continue
                session_path = str(art.get("session_path") or "").strip()
                if session_path:
                    expected.add(session_path)
                concept_paths = art.get("concept_paths") or []
                if isinstance(concept_paths, list):
                    for cp in concept_paths:
                        cp_str = str(cp or "").strip()
                        if cp_str:
                            expected.add(cp_str)

    return sorted(expected)


# ---------------------------------------------------------------------------
# Vault janitor helpers — detect broken wikilinks, orphaned files, stale
# objectives.  Called by the ``GET /api/tutor/vault/health`` endpoint.
# ---------------------------------------------------------------------------

_WIKILINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]")


def _detect_broken_wikilinks(conn: sqlite3.Connection) -> list[dict[str, str]]:
    """Scan tutor-managed vault notes for ``[[Target]]`` where target is missing.

    Only inspects notes whose paths are associated with active (non-ended)
    tutor sessions.  Returns a list of
    ``{"source": "<note path>", "target": "<missing link target>"}``.
    """
    vault_root = _obsidian_vault_root_path()
    if vault_root is None:
        return []

    cur = conn.cursor()
    cur.execute(
        """SELECT session_id, content_filter_json, artifacts_json
           FROM tutor_sessions
           WHERE status != 'ended'""",
    )
    rows = cur.fetchall()

    # Collect all note paths we manage
    managed_paths: set[str] = set()
    for row in rows:
        session = dict(row)
        managed_paths.update(_expected_obsidian_paths_for_session(session))

    broken: list[dict[str, str]] = []
    for rel_path in sorted(managed_paths):
        abs_path = vault_root / rel_path
        if not abs_path.exists():
            continue
        try:
            content = abs_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for match in _WIKILINK_RE.finditer(content):
            target = match.group(1).strip()
            if not target:
                continue
            # Obsidian resolves wikilinks relative to vault root (shortest
            # match), so we check both with and without ``.md`` extension.
            candidates = [
                vault_root / f"{target}.md",
                vault_root / target,
            ]
            if not any(c.exists() for c in candidates):
                broken.append({"source": rel_path, "target": target})

    return broken


def _detect_orphaned_files(conn: sqlite3.Connection) -> list[str]:
    """Find tutor-managed files on disk not referenced by any active session.

    Compares the set of vault notes *owned* by active sessions (via
    ``_expected_obsidian_paths_for_session``) against the Study Notes
    directory tree on disk.  Files that exist on disk but are not claimed
    by any active session are considered orphaned.

    Returns a sorted list of vault-relative paths.
    """
    vault_root = _obsidian_vault_root_path()
    if vault_root is None:
        return []

    study_notes_root = vault_root / _study_notes_base_path()
    if not study_notes_root.exists():
        return []

    cur = conn.cursor()
    cur.execute(
        """SELECT session_id, content_filter_json, artifacts_json
           FROM tutor_sessions
           WHERE status != 'ended'""",
    )
    rows = cur.fetchall()

    active_paths: set[str] = set()
    for row in rows:
        session = dict(row)
        active_paths.update(_expected_obsidian_paths_for_session(session))

    # Normalise to forward-slash for comparison
    active_paths_normalised = {p.replace("\\", "/") for p in active_paths}

    orphaned: list[str] = []
    for md_file in study_notes_root.rglob("*.md"):
        try:
            rel = md_file.relative_to(vault_root).as_posix()
        except ValueError:
            continue
        if rel not in active_paths_normalised:
            orphaned.append(rel)

    return sorted(orphaned)


def _detect_stale_objectives(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Find objectives with status='active' but no session activity in 30+ days.

    An objective is stale when its ``last_session_date`` is either NULL or
    older than 30 days and its ``status`` is still ``'active'``.

    Returns a list of dicts with ``id``, ``title``, ``status``,
    ``last_session_date``, and ``days_inactive``.
    """
    cur = conn.cursor()
    cur.execute(
        """SELECT id, title, status, last_session_date
           FROM learning_objectives
           WHERE status = 'active'
             AND managed_by_tutor = 1
             AND (
               last_session_date IS NULL
               OR julianday('now') - julianday(last_session_date) >= 30
             )
           ORDER BY last_session_date ASC""",
    )
    results: list[dict[str, Any]] = []
    for row in cur.fetchall():
        r = dict(row)
        lsd = r.get("last_session_date")
        if lsd:
            try:
                from datetime import datetime as _dt

                delta = _dt.utcnow() - _dt.fromisoformat(lsd)
                r["days_inactive"] = delta.days
            except (ValueError, TypeError):
                r["days_inactive"] = None
        else:
            r["days_inactive"] = None
        results.append(r)
    return results
