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


_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
          "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"]


def _render_north_star_markdown(payload: dict[str, Any]) -> str:
    module_name = str(payload.get("module_name") or "Module")
    course_name = str(payload.get("course_name") or "")

    groups: list[dict[str, Any]] = list(payload.get("objective_groups") or [])
    if not groups:
        # Flat-list fallback: wrap all objectives in a single group
        flat_objs = list(payload.get("objectives") or [])
        if flat_objs:
            groups = [{"name": module_name, "objectives": [
                {"id": str(o), "description": str(o), "status": "active"}
                if not isinstance(o, dict) else o
                for o in flat_objs
            ]}]

    # Count totals
    total = 0
    mastered = 0
    for g in groups:
        for o in g.get("objectives") or []:
            total += 1
            if str(o.get("status") or "").lower() == "mastered":
                mastered += 1

    # Build YAML frontmatter
    fm_lines = [
        "note_type: north_star",
        f"module_name: {module_name}",
    ]
    if course_name:
        fm_lines.append(f"course_name: {course_name}")
    fm_lines.extend([
        f"updated_at: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"objective_count: {total}",
        f"mastered_count: {mastered}",
    ])
    frontmatter = "\n".join(fm_lines)

    title = f"{module_name} \u2014 Learning Objectives"
    intro = f"**{total} objectives** \u2014 {mastered} mastered"

    # Build objective sections
    single_group = len(groups) == 1
    sections: list[str] = []
    for idx, group in enumerate(groups):
        group_name = str(group.get("name") or f"Group {idx + 1}")
        objs = list(group.get("objectives") or [])
        group_mastered = sum(
            1 for o in objs if str(o.get("status") or "").lower() == "mastered"
        )
        lines: list[str] = []
        if not single_group:
            numeral = _ROMAN[idx] if idx < len(_ROMAN) else str(idx + 1)
            header = f"## {numeral}. {group_name} ({group_mastered}/{len(objs)} mastered)"
            lines.extend([header, ""])
        for i, obj in enumerate(objs, 1):
            obj_id = str(obj.get("id") or obj.get("objective_id") or f"OBJ-{i}")
            desc = str(obj.get("description") or obj.get("title") or obj_id)
            lines.append(f"{i}. [[{obj_id}]] {desc}")
        sections.append("\n".join(lines))

    objective_sections = "\n\n".join(sections) if sections else "(no objectives yet)"

    follow_up_items = list(payload.get("follow_up_targets") or [])
    follow_up_targets = "\n".join(f"- {t}" for t in follow_up_items) if follow_up_items else "- (auto-filled after tutor sessions)"

    fallback = """---
{frontmatter}
---

# {title}

{intro}

{objective_sections}

## Follow-Up Targets

{follow_up_targets}
"""
    template = _read_template("north_star.md.tmpl", fallback=fallback)
    rendered = template.format_map(
        _SafeFormatDict(
            {
                "frontmatter": frontmatter,
                "title": title,
                "intro": intro,
                "objective_sections": objective_sections,
                "follow_up_targets": follow_up_targets,
            }
        )
    )
    return rendered.rstrip() + "\n"


def _render_session_wrap_markdown(payload: dict[str, Any]) -> str:
    topic = str(payload.get("topic") or "Session")
    session_id = str(payload.get("session_id") or "")
    module_name = str(payload.get("module_name") or "")
    duration = payload.get("duration_minutes") or 0
    turn_count = payload.get("turn_count") or 0
    session_mode = str(payload.get("session_mode") or "focused_batch")
    chain_name = str(payload.get("chain_name") or "")
    chain_progress = str(payload.get("chain_progress") or "")

    # Objectives — numbered list with status emoji
    objectives: list[dict[str, Any]] = list(payload.get("objectives") or [])
    obj_lines: list[str] = []
    for i, obj in enumerate(objectives, 1):
        desc = str(obj.get("description") or obj.get("id") or f"Objective {i}")
        status = str(obj.get("status") or "active").lower()
        emoji = "\u2705" if status == "mastered" else "\u2b55"
        obj_lines.append(f"{i}. {emoji} {desc}")
    objectives_section = "\n".join(obj_lines) if obj_lines else "- (none covered)"

    # Artifacts — bullet counts by type
    artifacts: list[dict[str, Any]] = list(payload.get("artifacts") or [])
    artifact_lines: list[str] = []
    for a in artifacts:
        a_type = str(a.get("type") or "unknown")
        a_count = a.get("count") or 0
        artifact_lines.append(f"- {a_type}: {a_count}")
    artifacts_section = "\n".join(artifact_lines) if artifact_lines else "- (none)"

    # Chain progress
    blocks_completed: list[str] = list(payload.get("blocks_completed") or [])
    chain_lines: list[str] = []
    if chain_name:
        chain_lines.append(f"**Chain**: {chain_name}")
    if chain_progress:
        chain_lines.append(f"**Progress**: {chain_progress}")
    if blocks_completed:
        chain_lines.append(f"**Blocks completed**: {', '.join(blocks_completed)}")
    chain_section = "\n".join(chain_lines) if chain_lines else "- (no chain used)"

    fallback = """---
note_type: session_wrap
session_id: {session_id}
topic: {topic}
module_name: {module_name}
duration_minutes: {duration_minutes}
updated_at: {updated_at}
---

# Session Wrap \u2014 {topic}

## Summary

| Turns | Duration | Mode |
|-------|----------|------|
| {turn_count} | {duration_minutes} min | {session_mode} |

## Objectives Covered

{objectives_section}

## Artifacts Created

{artifacts_section}

## Chain Progress

{chain_section}

## Follow-Up Targets

{follow_up_targets}

## Key Takeaways

{key_takeaways}
"""
    template = _read_template("session_wrap.md.tmpl", fallback=fallback)
    rendered = template.format_map(
        _SafeFormatDict(
            {
                "session_id": session_id,
                "topic": topic,
                "module_name": module_name,
                "duration_minutes": duration,
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "turn_count": turn_count,
                "session_mode": session_mode,
                "objectives_section": objectives_section,
                "artifacts_section": artifacts_section,
                "chain_section": chain_section,
                "follow_up_targets": _bullets(
                    list(payload.get("follow_up_targets") or [])
                ),
                "key_takeaways": _bullets(
                    list(payload.get("key_takeaways") or [])
                ) if payload.get("key_takeaways") else "- (to be filled after reflection)",
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
        "session_wrap": _render_session_wrap_markdown,
    }
    if template in renderers:
        content = renderers[template](payload)
        return {"success": True, "template_id": template, "content": content}

    return {
        "success": False,
        "error": "Unsupported template_id. Use session_note, concept_note, north_star, reference_targets, or session_wrap.",
    }
