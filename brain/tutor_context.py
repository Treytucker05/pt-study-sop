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
        dict with keys: materials, instructions, notes, course_map, debug
    """
    debug: dict[str, Any] = {"depth": depth}
    result: dict[str, Any] = {
        "materials": "",
        "instructions": "",
        "notes": "",
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

    return result


def _fetch_materials(
    query: str,
    *,
    course_id: Optional[int] = None,
    material_ids: Optional[list[int]] = None,
    k: int = 6,
    debug: dict[str, Any],
) -> str:
    """Search ChromaDB materials collection."""
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
    """Search Obsidian vault via REST API /search/ endpoint."""
    try:
        from obsidian_client import ObsidianClient

        client = ObsidianClient()
        hits = client.search(query, max_results=5)
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
