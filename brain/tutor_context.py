"""Unified context builder for the Adaptive Tutor.

Single entry point replacing scattered retrieval logic in api_tutor.py.
"""
from __future__ import annotations

import logging
import json
import sqlite3
from pathlib import Path
from typing import Any, Literal, Optional

logger = logging.getLogger(__name__)


def _material_source_label(source_path: Any) -> str:
    raw = str(source_path or "").strip()
    if not raw:
        return ""
    return Path(raw).name or raw


def _ordered_unique_sources(items: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        if not item or item in seen:
            continue
        seen.add(item)
        ordered.append(item)
    return ordered

_COURSE_MAP_PATH = Path(__file__).parent / "data" / "vault_courses.yaml"
_course_map_cache: Optional[str] = None

ContextDepth = Literal["auto", "none", "notes", "materials"]

FULL_CONTENT_BUDGET = 200_000  # ~50K tokens — safe for 128K+ context models


def _expand_linked_material_ids(material_ids: Optional[list[int]]) -> Optional[list[int]]:
    """Expand explicit material selection to include processed docs linked to a selected MP4."""
    if not material_ids:
        return material_ids

    try:
        from db_setup import DB_PATH

        conn = sqlite3.connect(DB_PATH, timeout=30)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, metadata_json
            FROM rag_docs
            WHERE COALESCE(corpus, 'materials') = 'materials'
            """
        )
        rows = cur.fetchall()
        conn.close()
    except Exception as exc:
        logger.warning("Linked material expansion failed: %s", exc)
        return material_ids

    selected = {int(mid) for mid in material_ids}
    expanded: list[int] = []
    seen: set[int] = set()

    for mid in material_ids:
        value = int(mid)
        if value not in seen:
            seen.add(value)
            expanded.append(value)

    for row in rows:
        doc_id = int(row["id"])
        if doc_id in seen:
            continue
        raw_meta = row["metadata_json"]
        if not raw_meta:
            continue
        try:
            meta = json.loads(raw_meta)
        except (json.JSONDecodeError, TypeError):
            continue
        if not isinstance(meta, dict):
            continue
        linked_material_id = meta.get("video_material_id")
        try:
            linked_value = int(linked_material_id)
        except (TypeError, ValueError):
            continue
        if linked_value in selected:
            seen.add(doc_id)
            expanded.append(doc_id)

    return expanded


def _load_full_materials(
    material_ids: list[int],
    budget: int = FULL_CONTENT_BUDGET,
    force_full_docs: bool = False,
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
    source_labels: list[str] = []
    for doc_id, source_path, content in rows:
        if not content:
            continue
        filename = _material_source_label(source_path) or f"Document {doc_id}"
        source_labels.append(filename)
        if total_chars <= budget:
            text = content
        else:
            doc_budget = max(int(budget * len(content) / total_chars), 500)
            text = content[:doc_budget] + (
                f"\n\n[... truncated — {len(content) - doc_budget:,} chars remaining ...]"
            )
        sections.append(f"### {filename}\n\n{text}")

    if debug is not None:
        ordered_sources = _ordered_unique_sources(source_labels)
        debug["mode"] = "forced_full_content" if force_full_docs else "full_content"
        debug["force_full_docs"] = bool(force_full_docs)
        debug["materials_count"] = len(rows)
        debug["materials_total_chars"] = total_chars
        debug["materials_truncated"] = total_chars > budget
        debug["retrieved_chunks"] = len(rows)
        debug["retrieved_unique_sources"] = len(ordered_sources)
        debug["sources"] = ordered_sources[:20]
        debug["top_source"] = ordered_sources[0] if ordered_sources else None
        debug["top_source_share"] = round(1 / len(rows), 4) if rows else 0.0

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
    force_full_docs: bool = False,
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
        force_full_docs: Force selected materials to inject as full documents.

    Returns:
        dict with keys: materials, notes, vault_state, course_map, debug
    """
    debug: dict[str, Any] = {"depth": depth}
    result: dict[str, Any] = {
        "materials": "",
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
            force_full_docs=force_full_docs,
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
    force_full_docs: bool = False,
    debug: dict[str, Any],
) -> str:
    """Retrieve study materials — full content when few files, vector search otherwise."""
    resolved_material_ids = _expand_linked_material_ids(material_ids)
    material_debug = debug.setdefault("materials", {})
    if material_ids:
        material_debug["selected_material_ids"] = list(material_ids)
    if resolved_material_ids:
        material_debug["expanded_material_ids"] = list(resolved_material_ids)
    material_debug["force_full_docs_requested"] = bool(force_full_docs)

    if force_full_docs and resolved_material_ids:
        try:
            full = _load_full_materials(
                resolved_material_ids,
                force_full_docs=True,
                debug=material_debug,
            )
            if full:
                return full
        except Exception as e:
            logger.warning("Forced full material load failed, falling back: %s", e)

    # When explicit materials selected and count is manageable, load full content
    if resolved_material_ids and len(resolved_material_ids) <= 10:
        try:
            full = _load_full_materials(
                resolved_material_ids, debug=material_debug
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
            material_ids=resolved_material_ids,
            collection_name=COLLECTION_MATERIALS,
            k=k,
            debug=material_debug,
        )
        if not docs:
            return ""
        sources = _ordered_unique_sources(
            [
                _material_source_label(
                    (
                        getattr(d, "metadata", {}) or {}
                    ).get("source")
                    or (
                        getattr(d, "metadata", {}) or {}
                    ).get("source_path")
                )
                for d in docs
            ]
        )
        material_debug.setdefault("mode", "vector_search")
        material_debug["retrieved_chunks"] = int(
            material_debug.get("final_chunks") or len(docs)
        )
        material_debug["retrieved_unique_sources"] = int(
            material_debug.get("final_unique_docs") or len(sources)
        )
        material_debug["sources"] = sources[:20]
        material_debug["top_source"] = material_debug.get("final_top_doc_source")
        material_debug["top_source_share"] = float(
            material_debug.get("final_top_doc_share") or 0.0
        )
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
