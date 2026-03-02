"""Unified context builder for the Adaptive Tutor.

Single entry point replacing scattered retrieval logic in api_tutor.py.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Literal, Optional

logger = logging.getLogger(__name__)

_COURSE_MAP_PATH = Path(__file__).parent / "data" / "vault_courses.yaml"
_course_map_cache: Optional[str] = None

ContextDepth = Literal["auto", "none", "notes", "materials"]

FULL_CONTENT_BUDGET = 200_000  # ~50K tokens — safe for 128K+ context models


def _load_full_materials(
    material_ids: list[int],
    budget: int = FULL_CONTENT_BUDGET,
    debug: dict[str, Any] | None = None,
) -> str:
    """Load complete content of selected materials from rag_docs.

    When students select a small number of files, we bypass vector search
    and give the LLM the full text of every file.  If total content exceeds
    the budget, each doc is truncated proportionally so every file still
    gets fair representation.
    """
    import sqlite3
    from db_setup import DB_PATH

    conn = sqlite3.connect(DB_PATH)
    placeholders = ",".join("?" * len(material_ids))
    rows = conn.execute(
        f"SELECT id, source_path, content FROM rag_docs WHERE id IN ({placeholders})",
        list(material_ids),
    ).fetchall()
    conn.close()

    if not rows:
        return ""

    total_chars = sum(len(r[2] or "") for r in rows)

    sections: list[str] = []
    for doc_id, source_path, content in rows:
        if not content:
            continue
        filename = Path(source_path).name if source_path else f"Document {doc_id}"
        if total_chars <= budget:
            text = content
        else:
            doc_budget = max(int(budget * len(content) / total_chars), 500)
            text = content[:doc_budget] + (
                f"\n\n[... truncated — {len(content) - doc_budget:,} chars remaining ...]"
            )
        sections.append(f"### {filename}\n\n{text}")

    if debug is not None:
        debug["materials_mode"] = "full_content"
        debug["materials_count"] = len(rows)
        debug["materials_total_chars"] = total_chars
        debug["materials_truncated"] = total_chars > budget

    return "\n\n---\n\n".join(sections)


def _load_course_map() -> str:
    """Load vault_courses.yaml once, cache in module."""
    global _course_map_cache
    if _course_map_cache is not None:
        return _course_map_cache
    try:
        with open(_COURSE_MAP_PATH, "r", encoding="utf-8") as f:
            _course_map_cache = f.read()
    except Exception as e:
        logger.warning("Failed to load course map: %s", e)
        _course_map_cache = ""
    return _course_map_cache


def build_context(
    query: str,
    *,
    depth: ContextDepth = "auto",
    course_id: Optional[int] = None,
    material_ids: Optional[list[int]] = None,
    module_prefix: Optional[str] = None,
    k_materials: int = 6,
) -> dict[str, Any]:
    """Build all context for a tutor turn in one call.

    Args:
        query: The student's question.
        depth: Controls which retrieval sources fire.
            - "auto": materials + notes (default)
            - "none": skip all retrieval (simple follow-ups)
            - "notes": only Obsidian notes
            - "materials": only ChromaDB materials
        course_id: Filter materials to a specific course.
        material_ids: Explicit material selection (overrides course_id).
        module_prefix: Obsidian folder prefix for note scoping.
        k_materials: Number of material chunks to retrieve.

    Returns:
        dict with keys: materials, instructions, notes, vault_state, course_map, debug
    """
    debug: dict[str, Any] = {"depth": depth}
    result: dict[str, Any] = {
        "materials": "",
        "instructions": "",
        "notes": "",
        "vault_state": "",
        "course_map": _load_course_map(),
        "debug": debug,
    }

    if depth == "none":
        return result

    if depth in ("auto", "materials"):
        result["materials"] = _fetch_materials(
            query,
            course_id=course_id,
            material_ids=material_ids,
            k=k_materials,
            debug=debug,
        )

    if depth in ("auto", "notes"):
        result["notes"] = _fetch_notes(
            query,
            module_prefix=module_prefix,
            debug=debug,
        )
        result["vault_state"] = _fetch_vault_state(
            course_id=course_id,
            topic=module_prefix or "",
        )

    return result


def _fetch_materials(
    query: str,
    *,
    course_id: Optional[int] = None,
    material_ids: Optional[list[int]] = None,
    k: int = 6,
    debug: dict[str, Any],
) -> str:
    """Retrieve study materials — full content when few files, vector search otherwise."""
    # When explicit materials selected and count is manageable, load full content
    if material_ids and len(material_ids) <= 10:
        try:
            full = _load_full_materials(
                material_ids, debug=debug.setdefault("materials_debug", {})
            )
            if full:
                return full
        except Exception as e:
            logger.warning("Full material load failed, falling back to vector search: %s", e)

    # Fall back to vector search for large selections or when full load fails
    try:
        from tutor_rag import search_with_embeddings, COLLECTION_MATERIALS

        docs = search_with_embeddings(
            query,
            course_id=course_id,
            material_ids=material_ids,
            collection_name=COLLECTION_MATERIALS,
            k=k,
            debug=debug.setdefault("materials_debug", {}),
        )
        if not docs:
            return ""
        return "\n\n---\n\n".join(
            getattr(d, "page_content", str(d)) for d in docs
        )
    except Exception as e:
        logger.warning("Material retrieval failed: %s", e)
        debug["materials_error"] = str(e)
        return ""


def _fetch_notes(
    query: str,
    *,
    module_prefix: Optional[str] = None,
    debug: dict[str, Any],
) -> str:
    """Search Obsidian vault via CLI wrapper."""
    try:
        from obsidian_vault import ObsidianVault

        vault = ObsidianVault()
        hits = vault.search(query, limit=5)
        debug["notes_hits"] = len(hits)

        if module_prefix:
            prefix = module_prefix.replace("\\", "/").lower()
            hits = sorted(
                hits,
                key=lambda h: (
                    0 if h.get("path", "").lower().startswith(prefix) else 1
                ),
            )

        parts = []
        for hit in hits[:5]:
            path = hit.get("path", "unknown")
            content = hit.get("content", "")
            if content:
                parts.append(f"### {path}\n{content[:2000]}")
        return "\n\n".join(parts)
    except Exception as e:
        logger.warning("Notes retrieval failed: %s", e)
        debug["notes_error"] = str(e)
        return ""


def _resolve_course_folder(course_id: Optional[int]) -> str:
    """Map a DB course_id to its vault folder path (e.g. 'Study Notes/Neuroscience').

    Looks up the course name from the DB, then fuzzy-matches it against
    vault_courses.yaml to get the canonical label. Returns empty string
    if resolution fails at any step.
    """
    if not course_id:
        return ""
    try:
        from db_setup import DB_PATH
        import sqlite3

        conn = sqlite3.connect(DB_PATH)
        row = conn.execute(
            "SELECT name FROM courses WHERE id = ?", (int(course_id),)
        ).fetchone()
        conn.close()
        if not row or not row[0]:
            return ""

        from course_map import load_course_map
        cmap = load_course_map()
        course = cmap.resolve_course(row[0])
        if not course:
            return ""
        return f"{cmap.vault_root}/{course.label}"
    except Exception as e:
        logger.warning("Course folder resolution failed: %s", e)
        return ""


def _fetch_vault_state(course_id: Optional[int] = None, topic: str = "") -> str:
    """List existing notes and read _Index.md for the current study folder.

    Gives the LLM awareness of what already exists in the vault so it can
    avoid re-creating notes and build on prior work.
    """
    try:
        from obsidian_vault import ObsidianVault

        vault = ObsidianVault()
        if not vault.is_available():
            return ""

        # Determine which folder to scan — prefer topic (module_prefix),
        # fall back to course-level folder from DB + course map
        scan_folder = topic or _resolve_course_folder(course_id)
        if not scan_folder:
            return ""

        # List existing notes in the folder (cap at 20)
        file_list: list[str] = []
        try:
            files = vault.list_files(scan_folder)
            if isinstance(files, list):
                for f in files[:20]:
                    name = f.get("path", "") if isinstance(f, dict) else str(f)
                    if name:
                        file_list.append(name)
        except Exception:
            logger.debug("list_files failed for %s", scan_folder)

        # Read _Index.md if it exists (cap at 2000 chars)
        index_content = ""
        try:
            raw = vault.read_note(f"{scan_folder}/_Index")
            if raw and "\ufffd" not in raw[:100]:
                index_content = raw[:2000]
        except Exception:
            logger.debug("_Index.md not found in %s", scan_folder)

        if not file_list and not index_content:
            return ""

        parts: list[str] = []
        if file_list:
            listing = "\n".join(f"  - {name}" for name in file_list)
            parts.append(
                f"Existing notes in `{scan_folder}`:\n{listing}"
            )
        if index_content:
            parts.append(f"### _Index.md\n{index_content}")

        return "\n\n".join(parts)
    except Exception as e:
        logger.warning("Vault state retrieval failed: %s", e)
        return ""
