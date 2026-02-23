from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Callable


_REPO_ROOT = Path(__file__).resolve().parents[1]
_TEMPLATE_DIR = _REPO_ROOT / "sop" / "templates" / "notes"


class _SafeFormatDict(dict[str, Any]):
    def __missing__(self, key: str) -> str:
        return ""


def _read_template(filename: str, *, fallback: str) -> str:
    path = _TEMPLATE_DIR / filename
    if path.exists():
        return path.read_text(encoding="utf-8")
    return fallback


def _wikilink(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if text.startswith("[[") and text.endswith("]]"):
        return text
    return f"[[{text}]]"


def _bullets(values: list[Any]) -> str:
    clean = [str(v).strip() for v in values if str(v or "").strip()]
    if not clean:
        return "- (none)"
    return "\n".join(f"- {v}" for v in clean)


def _relationship_bullets(values: list[Any]) -> str:
    rows: list[str] = []
    for item in values:
        if not isinstance(item, dict):
            continue
        target = str(item.get("target_concept") or "").strip() or "[[Unknown]]"
        rel_type = str(item.get("relationship_type") or "").strip() or "related_to"
        rows.append(f"- {target} ({rel_type})")
    if not rows:
        return "- (none)"
    return "\n".join(rows)


def render_session_note_markdown(
    *,
    artifact: dict[str, Any],
    session_id: str,
    topic: str,
    module_name: str,
) -> str:
    metadata = artifact.get("metadata") if isinstance(artifact.get("metadata"), dict) else {}
    session = artifact.get("session") if isinstance(artifact.get("session"), dict) else {}
    concepts = artifact.get("concepts") if isinstance(artifact.get("concepts"), list) else []
    concept_links = [
        _wikilink(str(c.get("file_name") or "").strip())
        for c in concepts
        if isinstance(c, dict) and str(c.get("file_name") or "").strip()
    ]
    fallback = """---
note_type: tutor_session
session_id: {session_id}
topic: {topic}
module_name: {module_name}
control_stage: {control_stage}
method_id: {method_id}
session_mode: {session_mode}
updated_at: {updated_at}
---

# Tutor Session - {topic}

## Stage Flow
{stage_flow}

## Concepts Covered
{concepts_covered}

## Unknowns
{unknowns}

## Follow Up Targets
{follow_up_targets}

## Source IDs
{source_ids}
"""
    template = _read_template("session_note.md.tmpl", fallback=fallback)
    rendered = template.format_map(
        _SafeFormatDict(
            {
                "session_id": session_id,
                "topic": topic or module_name,
                "module_name": module_name,
                "control_stage": str(metadata.get("control_stage") or "UNKNOWN"),
                "method_id": str(metadata.get("method_id") or "UNKNOWN"),
                "session_mode": str(metadata.get("session_mode") or "focused_batch"),
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "stage_flow": _bullets(list(session.get("stage_flow") or [])),
                "concepts_covered": _bullets(concept_links),
                "unknowns": _bullets(list(session.get("unknowns") or [])),
                "follow_up_targets": _bullets(
                    list(session.get("follow_up_targets") or [])
                ),
                "source_ids": _bullets(list(session.get("source_ids") or [])),
            }
        )
    )
    return rendered.rstrip() + "\n"


def render_concept_note_markdown(*, concept: dict[str, Any], module_name: str) -> str:
    file_name = str(concept.get("file_name") or "").strip() or "Untitled Concept"
    fallback = """---
note_type: tutor_concept
module_name: {module_name}
updated_at: {updated_at}
---

# {file_name}

## Why It Matters
{why_it_matters}

## Prerequisites
{prerequisites}

## Retrieval Targets
{retrieval_targets}

## Common Errors
{common_errors}

## Relationships
{relationships}

## Next Review Date
{next_review_date}
"""
    template = _read_template("concept_note.md.tmpl", fallback=fallback)
    rendered = template.format_map(
        _SafeFormatDict(
            {
                "module_name": module_name,
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "file_name": file_name,
                "why_it_matters": str(concept.get("why_it_matters") or "").strip(),
                "prerequisites": _bullets(list(concept.get("prerequisites") or [])),
                "retrieval_targets": _bullets(
                    list(concept.get("retrieval_targets") or [])
                ),
                "common_errors": _bullets(list(concept.get("common_errors") or [])),
                "relationships": _relationship_bullets(
                    list(concept.get("relationships") or [])
                ),
                "next_review_date": str(concept.get("next_review_date") or "unscheduled"),
            }
        )
    )
    return rendered.rstrip() + "\n"


def _render_north_star_markdown(payload: dict[str, Any]) -> str:
    fallback = """---
note_type: north_star
updated_at: {updated_at}
---

# {title}

## Objectives
{objectives}

## Scope
{scope}
"""
    template = _read_template("north_star.md.tmpl", fallback=fallback)
    rendered = template.format_map(
        _SafeFormatDict(
            {
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "title": str(payload.get("title") or "North Star"),
                "objectives": _bullets(list(payload.get("objectives") or [])),
                "scope": str(payload.get("scope") or "").strip(),
            }
        )
    )
    return rendered.rstrip() + "\n"


def _render_reference_targets_markdown(payload: dict[str, Any]) -> str:
    fallback = """---
note_type: reference_targets
updated_at: {updated_at}
---

# {title}

## Targets
{targets}
"""
    template = _read_template("reference_targets.md.tmpl", fallback=fallback)
    rendered = template.format_map(
        _SafeFormatDict(
            {
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "title": str(payload.get("title") or "Reference Targets"),
                "targets": _bullets(list(payload.get("targets") or [])),
            }
        )
    )
    return rendered.rstrip() + "\n"


def render_template_artifact(template_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    template = str(template_id or "").strip().lower()

    if template == "session_note":
        artifact = payload.get("artifact")
        if not isinstance(artifact, dict):
            return {"success": False, "error": "payload.artifact must be an object"}
        session_id = str(payload.get("session_id") or "").strip()
        topic = str(payload.get("topic") or "").strip()
        module_name = str(payload.get("module_name") or "").strip()
        if not session_id or not module_name:
            return {
                "success": False,
                "error": "payload.session_id and payload.module_name are required",
            }
        content = render_session_note_markdown(
            artifact=artifact,
            session_id=session_id,
            topic=topic,
            module_name=module_name,
        )
        return {"success": True, "template_id": "session_note", "content": content}

    if template == "concept_note":
        concept = payload.get("concept")
        module_name = str(payload.get("module_name") or "").strip()
        if not isinstance(concept, dict):
            return {"success": False, "error": "payload.concept must be an object"}
        if not module_name:
            return {"success": False, "error": "payload.module_name is required"}
        content = render_concept_note_markdown(concept=concept, module_name=module_name)
        return {"success": True, "template_id": "concept_note", "content": content}

    renderers: dict[str, Callable[[dict[str, Any]], str]] = {
        "north_star": _render_north_star_markdown,
        "reference_targets": _render_reference_targets_markdown,
    }
    if template in renderers:
        content = renderers[template](payload)
        return {"success": True, "template_id": template, "content": content}

    return {
        "success": False,
        "error": "Unsupported template_id. Use session_note, concept_note, north_star, or reference_targets.",
    }
