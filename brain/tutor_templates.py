from __future__ import annotations

from datetime import datetime
from pathlib import Path
import re
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


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return [item for item in value]
    return []


def render_session_note_markdown(
    *,
    artifact: dict[str, Any],
    session_id: str,
    topic: str,
    module_name: str,
    course_label: str = "",
    course_code: str = "",
    unit_type: str = "",
) -> str:
    raw_metadata = artifact.get("metadata")
    metadata: dict[str, Any] = {}
    if isinstance(raw_metadata, dict):
        metadata = raw_metadata
    raw_session = artifact.get("session")
    session: dict[str, Any] = {}
    if isinstance(raw_session, dict):
        session = raw_session
    concepts: list[dict[str, Any]] = []
    raw_concepts = artifact.get("concepts")
    if isinstance(raw_concepts, list):
        concepts = [c for c in raw_concepts if isinstance(c, dict)]
    stage_flow = _as_list(session.get("stage_flow"))
    unknowns = _as_list(session.get("unknowns"))
    follow_up_targets = _as_list(session.get("follow_up_targets"))
    source_ids = _as_list(session.get("source_ids"))
    concept_links = [
        _wikilink(str(c.get("file_name") or "").strip())
        for c in concepts
        if str(c.get("file_name") or "").strip()
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
course: {course_label}
course_code: {course_code}
unit_type: {unit_type}
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
                "stage_flow": _bullets(stage_flow),
                "concepts_covered": _bullets(concept_links),
                "unknowns": _bullets(unknowns),
                "follow_up_targets": _bullets(follow_up_targets),
                "source_ids": _bullets(source_ids),
                "course_label": course_label,
                "course_code": course_code,
                "unit_type": unit_type,
            }
        )
    )
    return rendered.rstrip() + "\n"


def render_concept_note_markdown(
    *,
    concept: dict[str, Any],
    module_name: str,
    course_label: str = "",
    course_code: str = "",
    unit_type: str = "",
) -> str:
    file_name = str(concept.get("file_name") or "").strip() or "Untitled Concept"
    fallback = """---
note_type: tutor_concept
module_name: {module_name}
updated_at: {updated_at}
course: {course_label}
course_code: {course_code}
unit_type: {unit_type}
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
                "next_review_date": str(
                    concept.get("next_review_date") or "unscheduled"
                ),
                "course_label": course_label,
                "course_code": course_code,
                "unit_type": unit_type,
            }
        )
    )
    return rendered.rstrip() + "\n"


_ROMAN = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
    "XIII",
    "XIV",
    "XV",
    "XVI",
    "XVII",
    "XVIII",
    "XIX",
    "XX",
]

_OBJECTIVE_PARENT_RE = re.compile(r"^(OBJ-\d+)([A-Z]+)?$", re.IGNORECASE)
_TEXTBOOK_LINE_RE = re.compile(
    r"\b(?:lundy(?:-ekmark)?|textbook|chapter|chap\.?|ch\.)\b", re.IGNORECASE
)

LEARNING_OBJECTIVES_TODO_SECTIONS = [
    "Learning Objectives",
    "Parent Objectives",
    "Child Objectives / Atomic Targets",
    "Hierarchical ASCII Chapter Map",
    "To Do",
    "Practice Questions",
    "Tutor Session Targets",
    "Source Materials",
    "Assigned Chapters / Reading",
    "Schedule Context",
]

MAP_OF_CONTENTS_SECTIONS = [
    "Module Spine",
    "Objective Index",
    "Hierarchical ASCII Chapter Map",
    "Session Notes",
    "Concept Notes",
    "Schedule Context",
]


def _safe_literal(value: Any) -> str:
    return str(value or "").strip()


def _objective_parent_code(code: str) -> str:
    clean = _safe_literal(code).upper()
    match = _OBJECTIVE_PARENT_RE.match(clean)
    if not match:
        return clean
    return match.group(1)


def _objective_suffix(code: str) -> str:
    clean = _safe_literal(code).upper()
    match = _OBJECTIVE_PARENT_RE.match(clean)
    if not match:
        return ""
    return match.group(2) or ""


def _objective_tree(
    objectives: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    parents: list[dict[str, Any]] = []
    children_by_parent: dict[str, list[dict[str, Any]]] = {}
    parent_map: dict[str, dict[str, Any]] = {}

    for index, objective in enumerate(objectives, start=1):
        code = _safe_literal(
            objective.get("objective_id") or objective.get("id") or f"OBJ-{index}"
        ).upper()
        title = _safe_literal(
            objective.get("title") or objective.get("description") or code
        )
        status = _safe_literal(objective.get("status") or "active").lower() or "active"
        item = {
            "objective_id": code,
            "title": title,
            "status": status,
        }
        parent_code = _objective_parent_code(code)
        suffix = _objective_suffix(code)
        if suffix:
            children_by_parent.setdefault(parent_code, []).append(item)
            continue
        parent_map[parent_code] = item
        parents.append(item)

    for parent_code, children in children_by_parent.items():
        if parent_code not in parent_map:
            synthetic = {
                "objective_id": parent_code,
                "title": f"{parent_code} (parent objective not separately approved)",
                "status": "active",
            }
            parent_map[parent_code] = synthetic
            parents.append(synthetic)
        children.sort(key=lambda item: item["objective_id"])

    parents.sort(key=lambda item: item["objective_id"])
    return parents, children_by_parent


def _material_label(material: dict[str, Any], index: int) -> str:
    title = _safe_literal(material.get("title"))
    source_path = _safe_literal(material.get("source_path") or material.get("file_path"))
    if not title and source_path:
        title = Path(source_path).name
    if not title:
        title = f"Source Material {index}"
    file_type = _safe_literal(material.get("file_type"))
    material_id = material.get("id")
    suffix = []
    if material_id is not None:
        suffix.append(f"#{material_id}")
    if file_type:
        suffix.append(file_type.upper())
    if suffix:
        title = f"{title} ({', '.join(suffix)})"
    return title


def _material_stem(material: dict[str, Any], index: int) -> str:
    title = _safe_literal(material.get("title"))
    if title:
        return Path(title).stem.lower()
    source_path = _safe_literal(material.get("source_path") or material.get("file_path"))
    if source_path:
        return Path(source_path).stem.lower()
    return f"material-{index}"


def _dedupe_materials(materials: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for index, material in enumerate(materials, start=1):
        key = re.sub(r"[^a-z0-9]+", " ", _material_stem(material, index)).strip()
        if not key:
            key = f"material-{index}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append(material)
    return deduped


def _material_location(material: dict[str, Any]) -> str:
    folder_path = _safe_literal(material.get("folder_path"))
    if folder_path:
        return folder_path.replace("\\", "/")
    source_path = _safe_literal(material.get("source_path") or material.get("file_path"))
    if source_path:
        parent = Path(source_path).parent.name
        if parent:
            return parent
    return "--"


def _material_type_label(material: dict[str, Any]) -> str:
    doc_type = _safe_literal(material.get("doc_type")).lower()
    if doc_type == "textbook":
        return "textbook"
    if doc_type:
        return doc_type
    file_type = _safe_literal(material.get("file_type")).lower()
    if file_type == "pptx":
        return "lecture slides"
    if file_type in {"txt", "md", "markdown"}:
        return "objective/to-do"
    if file_type == "pdf":
        return "handout/pdf"
    if file_type == "mp4":
        return "lecture video"
    if file_type:
        return file_type
    return "resource"


def _material_content_lines(materials: list[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    for material in materials:
        text = str(material.get("content_text") or "")
        if not text.strip():
            continue
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if line:
                lines.append(line)
    return lines


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        clean = _safe_literal(value)
        if not clean:
            continue
        key = clean.casefold()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(clean)
    return ordered


def _extract_reading_lines(
    materials: list[dict[str, Any]],
    frontmatter: dict[str, Any] | None = None,
) -> list[str]:
    readings: list[str] = []
    extra_frontmatter = frontmatter or {}
    for key in ("reading", "assigned_reading", "textbook", "chapters"):
        value = extra_frontmatter.get(key)
        if isinstance(value, list):
            readings.extend(_safe_literal(item) for item in value)
        else:
            readings.append(_safe_literal(value))
    for line in _material_content_lines(materials):
        if not _TEXTBOOK_LINE_RE.search(line):
            continue
        clean = line.lstrip("-*• ").strip()
        readings.append(clean)
    return _dedupe_preserve_order(readings)


def _extract_todo_lines(materials: list[dict[str, Any]]) -> list[str]:
    todo_lines: list[str] = []
    in_todo_block = False
    for line in _material_content_lines(materials):
        lowered = line.lower()
        if lowered in {"to-do list", "todo list", "to do list", "to-do", "todo"}:
            in_todo_block = True
            continue
        if in_todo_block and not line.startswith(("•", "-", "*", "✔", "[ ]", "[x]")):
            break
        if not in_todo_block:
            continue
        clean = re.sub(r"^[\-\*\u2022\u2714\[\]xX\s]+", "", line).strip()
        if clean:
            todo_lines.append(clean)
    return _dedupe_preserve_order(todo_lines)


def _format_source_material_table(materials: list[dict[str, Any]]) -> str:
    if not materials:
        return "| Resource | Type | Location |\n|----------|------|----------|\n| (none selected) | -- | -- |"
    rows = [
        "| Resource | Type | Location |",
        "|----------|------|----------|",
    ]
    for index, material in enumerate(materials, start=1):
        rows.append(
            f"| {_material_label(material, index)} | {_material_type_label(material)} | {_material_location(material)} |"
        )
    return "\n".join(rows)


def _build_ascii_chapter_map(
    *,
    module_name: str,
    objectives: list[dict[str, Any]],
    materials: list[dict[str, Any]],
    reading_lines: list[str] | None = None,
) -> str:
    parents, children_by_parent = _objective_tree(objectives)
    material_list = _dedupe_materials(materials)
    reading_list = _dedupe_preserve_order(list(reading_lines or []))
    lines: list[str] = [module_name or "Study Unit"]
    if parents:
        lines.append("|-- Parent Objectives")
        for parent_index, parent in enumerate(parents):
            is_last_parent = parent_index == len(parents) - 1
            branch = "`--" if is_last_parent else "|--"
            parent_code = parent["objective_id"]
            lines.append(f"|   {branch} {parent_code} {parent['title']}")
            children = children_by_parent.get(parent_code) or []
            if children:
                for child_index, child in enumerate(children):
                    is_last_child = child_index == len(children) - 1
                    child_branch = "`--" if is_last_child else "|--"
                    indent = "    " if is_last_parent else "|   "
                    lines.append(
                        f"|   {indent}{child_branch} {child['objective_id']} {child['title']}"
                    )
        if material_list:
            lines.append("|-- Source Materials")
            for material_index, material in enumerate(material_list, start=1):
                leaf = "`--" if material_index == len(material_list) else "|--"
                lines.append(f"|   {leaf} {_material_label(material, material_index)}")
        if reading_list:
            lines.append("`-- Assigned Reading")
            for reading_index, reading in enumerate(reading_list, start=1):
                leaf = "`--" if reading_index == len(reading_list) else "|--"
                lines.append(f"    {leaf} {reading}")
        elif not material_list:
            lines.append("`-- (no source materials selected)")
    elif material_list:
        for material_index, material in enumerate(material_list, start=1):
            leaf = "`--" if material_index == len(material_list) else "|--"
            lines.append(f"{leaf} {_material_label(material, material_index)}")
    else:
        lines.append("`-- (no approved objectives or source materials)")
    return "\n".join(lines)


def render_learning_objectives_todo_sections(
    payload: dict[str, Any],
) -> dict[str, str]:
    module_name = _safe_literal(payload.get("module_name") or "Module")
    objectives = list(payload.get("objectives") or [])
    materials = _dedupe_materials(list(payload.get("materials") or []))
    existing_frontmatter = payload.get("existing_frontmatter") or {}
    parents, children_by_parent = _objective_tree(objectives)
    all_children = [
        child
        for parent_code in sorted(children_by_parent)
        for child in children_by_parent[parent_code]
    ]
    reading_lines = _extract_reading_lines(materials, existing_frontmatter)
    ascii_map = _build_ascii_chapter_map(
        module_name=module_name,
        objectives=objectives,
        materials=materials,
        reading_lines=reading_lines,
    )

    emphasis = _safe_literal(existing_frontmatter.get("emphasis"))
    if not emphasis:
        emphasis = "; ".join(parent["title"] for parent in parents[:3])
    reading_summary = ", ".join(reading_lines) if reading_lines else "Not captured yet"

    learning_objectives = (
        "\n".join(
            [
                f"# {module_name}",
                "",
                "> [!important] Study Context",
                f"> **Course:** {_safe_literal(payload.get('course_name') or 'Unknown Course')}",
                f"> **Assigned Reading:** {reading_summary}",
                f"> **Primary Emphasis:** {emphasis or 'Approved objectives and selected materials'}",
                f"> **Selected Source Materials:** {len(materials)}",
                "",
                f"**{len(objectives)} objectives** across **{len(parents)} parent objectives** and **{len(all_children)} child objectives**.",
                "",
            ]
            + [
                f"- **{item['objective_id']} -- {item['title']}**"
                for item in (parents or objectives)
            ]
        )
        if (parents or objectives)
        else "- (no approved objectives yet)"
    )

    parent_lines: list[str] = []
    for item in parents:
        child_count = len(children_by_parent.get(item["objective_id"]) or [])
        parent_lines.append(f"- [ ] **{item['objective_id']} -- {item['title']}**")
        if child_count:
            parent_lines.append(
                f"      Parent objective for {child_count} atomic target{'s' if child_count != 1 else ''}."
            )
        parent_lines.append("")
    parent_objectives = (
        "\n".join(parent_lines).strip() or "- (no parent objectives inferred yet)"
    )

    child_objectives = (
        "\n".join(
            f"- [ ] **{child['objective_id']} -- {child['title']}**"
            for child in all_children
        )
        or "- (no child objectives inferred yet)"
    )

    extracted_todos = _extract_todo_lines(materials)
    todo_lines = ["> [!todo] Week Study Tasks", ""]
    if extracted_todos:
        todo_lines.extend(f"- [ ] {line}" for line in extracted_todos)
    else:
        todo_lines.extend(
            f"- [ ] Review **{parent['objective_id']}** before session start"
            for parent in parents
        )
    if len(todo_lines) == 2:
        todo_lines.append("- [ ] Add or approve learning objectives")

    practice_lines = [
        f"- What is the clean explanation for **{item['objective_id']} -- {item['title']}**?"
        for item in objectives[:8]
    ] or ["- Draft practice questions from the approved objectives"]

    focus_candidates = all_children or parents or objectives
    session_target_lines: list[str] = []
    if focus_candidates:
        session_target_lines.append(
            f"**Recommended first live Tutor target:** `{focus_candidates[0]['objective_id']}`"
        )
        session_target_lines.append("")
    session_target_lines.extend(
        f"- Start with **{item['objective_id']} -- {item['title']}**"
        for item in focus_candidates[:6]
    )
    if not session_target_lines:
        session_target_lines.append("- Resolve approved Tutor targets before session start")

    source_material_lines = _format_source_material_table(materials)
    assigned_reading_lines = reading_lines or [
        "- Textbook chapter/reading not captured in selected materials yet."
    ]
    schedule_context_lines = [
        f"- Course: {_safe_literal(payload.get('course_name') or 'Unknown Course')}",
        f"- Study Unit: {module_name}",
        f"- Topic: {_safe_literal(payload.get('topic') or module_name)}",
        f"- Objective Scope: {_safe_literal(payload.get('objective_scope') or 'module_all')}",
        f"- Focus Objective: {_safe_literal(payload.get('focus_objective_id') or 'None selected')}",
        f"- Selected Materials: {len(materials)}",
    ]

    return {
        "Learning Objectives": learning_objectives,
        "Parent Objectives": parent_objectives,
        "Child Objectives / Atomic Targets": child_objectives,
        "Hierarchical ASCII Chapter Map": f"```text\n{ascii_map}\n```",
        "To Do": "\n".join(todo_lines),
        "Practice Questions": "\n".join(practice_lines),
        "Tutor Session Targets": "\n".join(session_target_lines),
        "Source Materials": source_material_lines,
        "Assigned Chapters / Reading": "\n".join(assigned_reading_lines),
        "Schedule Context": "\n".join(schedule_context_lines),
    }


def render_map_of_contents_sections(payload: dict[str, Any]) -> dict[str, str]:
    module_name = _safe_literal(payload.get("module_name") or "Module")
    objectives = list(payload.get("objectives") or [])
    materials = _dedupe_materials(list(payload.get("materials") or []))
    existing_frontmatter = payload.get("existing_frontmatter") or {}
    parents, children_by_parent = _objective_tree(objectives)
    reading_lines = _extract_reading_lines(materials, existing_frontmatter)
    ascii_map = _build_ascii_chapter_map(
        module_name=module_name,
        objectives=objectives,
        materials=materials,
        reading_lines=reading_lines,
    )
    lo_page_name = _safe_literal(
        payload.get("learning_objectives_page_name") or "Learning Objectives & To Do"
    )

    focus_candidates = [
        child
        for parent_code in sorted(children_by_parent)
        for child in children_by_parent[parent_code]
    ] or parents or objectives

    module_spine_lines = [
        f"- [[{lo_page_name}]]",
        f"- {_safe_literal(payload.get('topic') or module_name)}",
    ]
    if focus_candidates:
        module_spine_lines.append(
            f"- Tutor First Objective: [[{focus_candidates[0]['objective_id']}]]"
        )

    objective_index_lines: list[str] = []
    for index, parent in enumerate(parents, start=1):
        objective_index_lines.append(
            f"{index}. [[{parent['objective_id']}]] {parent['title']}"
        )
        for child in children_by_parent.get(parent["objective_id"]) or []:
            objective_index_lines.append(
                f"   - [[{child['objective_id']}]] {child['title']}"
            )
    if not objective_index_lines:
        objective_index_lines.append("- (no approved objectives yet)")

    follow_up_links = ", ".join(
        f"[[{item['objective_id']}]]" for item in focus_candidates[:5]
    ) if focus_candidates else "(none yet)"
    session_notes_lines = [
        f"- Sessions folder: `{_safe_literal(payload.get('sessions_folder') or 'Sessions/')}`",
        "- Session notes link back to this navigation page.",
        f"- Follow-up targets: {follow_up_links}",
    ]
    concept_notes_lines = [
        f"- Concepts folder: `{_safe_literal(payload.get('concepts_folder') or 'Concepts/')}`",
        "- Concept notes should stay atomic and link back to the objectives page.",
    ]
    schedule_context_lines = [
        f"- Course: {_safe_literal(payload.get('course_name') or 'Unknown Course')}",
        f"- Study Unit: {module_name}",
        f"- Selected Materials: {len(materials)}",
    ]
    if reading_lines:
        schedule_context_lines.extend(f"- Reading: {line}" for line in reading_lines)

    return {
        "Module Spine": "\n".join(module_spine_lines),
        "Objective Index": "\n".join(objective_index_lines),
        "Hierarchical ASCII Chapter Map": f"```text\n{ascii_map}\n```",
        "Session Notes": "\n".join(session_notes_lines),
        "Concept Notes": "\n".join(concept_notes_lines),
        "Schedule Context": "\n".join(schedule_context_lines),
    }


def _render_moc_markdown(payload: dict[str, Any]) -> str:
    module_name = str(payload.get("module_name") or "Module")
    course_name = str(payload.get("course_name") or "")

    groups: list[dict[str, Any]] = list(payload.get("objective_groups") or [])
    if not groups:
        # Flat-list fallback: wrap all objectives in a single group
        flat_objs = list(payload.get("objectives") or [])
        if flat_objs:
            groups = [
                {
                    "name": module_name,
                    "objectives": [
                        {"id": str(o), "description": str(o), "status": "active"}
                        if not isinstance(o, dict)
                        else o
                        for o in flat_objs
                    ],
                }
            ]

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
        "note_type: map_of_contents",
        f"module_name: {module_name}",
    ]
    if course_name:
        fm_lines.append(f"course_name: {course_name}")
    fm_lines.extend(
        [
            f"updated_at: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            f"objective_count: {total}",
            f"mastered_count: {mastered}",
        ]
    )
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
            header = (
                f"## {numeral}. {group_name} ({group_mastered}/{len(objs)} mastered)"
            )
            lines.extend([header, ""])
        for i, obj in enumerate(objs, 1):
            obj_id = str(obj.get("id") or obj.get("objective_id") or f"OBJ-{i}")
            desc = str(obj.get("description") or obj.get("title") or obj_id)
            lines.append(f"{i}. [[{obj_id}]] {desc}")
        sections.append("\n".join(lines))

    objective_sections = "\n\n".join(sections) if sections else "(no objectives yet)"

    follow_up_items = list(payload.get("follow_up_targets") or [])
    follow_up_targets = (
        "\n".join(f"- {t}" for t in follow_up_items)
        if follow_up_items
        else "- (auto-filled after tutor sessions)"
    )

    fallback = """---
{frontmatter}
---

# {title}

{intro}

{objective_sections}

## Follow-Up Targets

{follow_up_targets}
"""
    template = _read_template("map_of_contents.md.tmpl", fallback=fallback)
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
                "key_takeaways": _bullets(list(payload.get("key_takeaways") or []))
                if payload.get("key_takeaways")
                else "- (to be filled after reflection)",
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


def render_template_artifact(
    template_id: str, payload: dict[str, Any]
) -> dict[str, Any]:
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
        "map_of_contents": _render_moc_markdown,
        "reference_targets": _render_reference_targets_markdown,
        "session_wrap": _render_session_wrap_markdown,
    }
    if template in renderers:
        content = renderers[template](payload)
        return {"success": True, "template_id": template, "content": content}

    return {
        "success": False,
        "error": "Unsupported template_id. Use session_note, concept_note, map_of_contents, reference_targets, or session_wrap.",
    }


def _render_block_notes_markdown(payload: dict[str, Any]) -> str:
    """Render a free-form notes block artifact (``artifact_type = "notes"``)."""
    fallback = """---
note_type: block_notes
block_id: {block_id}
block_name: {block_name}
control_stage: {control_stage}
session_id: {session_id}
course: {course}
module: {module}
topic: {topic}
started_at: {started_at}
ended_at: {ended_at}
artifact_type: {artifact_type}
---

# {block_name}

**Stage**: `{control_stage}` | **Time**: {started_at} → {ended_at}

## Notes

{content}

---

[[{moc_path}|Map of Contents]] | [[{session_note_path}|Session Note]]
"""
    template = _read_template("block_notes.md.tmpl", fallback=fallback)
    return template.format_map(_SafeFormatDict(payload)).rstrip() + "\n"


def _render_block_diagram_markdown(payload: dict[str, Any]) -> str:
    """Render a concept-map / diagram block artifact (``artifact_type = "concept-map"``)."""
    fallback = """---
note_type: block_diagram
block_id: {block_id}
block_name: {block_name}
control_stage: {control_stage}
session_id: {session_id}
course: {course}
module: {module}
topic: {topic}
started_at: {started_at}
ended_at: {ended_at}
artifact_type: {artifact_type}
---

# {block_name}

**Stage**: `{control_stage}` | **Time**: {started_at} → {ended_at}

## Concept Diagram

```mermaid
{diagram_content}
```

---

[[{moc_path}|Map of Contents]] | [[{session_note_path}|Session Note]]
"""
    template = _read_template("block_diagram.md.tmpl", fallback=fallback)
    return template.format_map(_SafeFormatDict(payload)).rstrip() + "\n"


def _render_block_comparison_markdown(payload: dict[str, Any]) -> str:
    """Render a comparison-table block artifact (``artifact_type = "comparison-table"``)."""
    fallback = """---
note_type: block_comparison
block_id: {block_id}
block_name: {block_name}
control_stage: {control_stage}
session_id: {session_id}
course: {course}
module: {module}
topic: {topic}
started_at: {started_at}
ended_at: {ended_at}
artifact_type: {artifact_type}
---

# {block_name}

**Stage**: `{control_stage}` | **Time**: {started_at} → {ended_at}

## Comparison Table

{table_content}

---

[[{moc_path}|Map of Contents]] | [[{session_note_path}|Session Note]]
"""
    template = _read_template("block_comparison.md.tmpl", fallback=fallback)
    return template.format_map(_SafeFormatDict(payload)).rstrip() + "\n"


def _render_block_recall_markdown(payload: dict[str, Any]) -> str:
    """Render a recall-output block artifact (``artifact_type = "recall"``)."""
    fallback = """---
note_type: block_recall
block_id: {block_id}
block_name: {block_name}
control_stage: {control_stage}
session_id: {session_id}
course: {course}
module: {module}
topic: {topic}
started_at: {started_at}
ended_at: {ended_at}
artifact_type: {artifact_type}
---

# {block_name}

**Stage**: `{control_stage}` | **Time**: {started_at} → {ended_at}

## Recall Output

{recall_content}

---

[[{moc_path}|Map of Contents]] | [[{session_note_path}|Session Note]]
"""
    template = _read_template("block_recall.md.tmpl", fallback=fallback)
    return template.format_map(_SafeFormatDict(payload)).rstrip() + "\n"


def _render_block_cards_markdown(payload: dict[str, Any]) -> str:
    """Render an Anki card-drafts block artifact (``artifact_type = "cards"``)."""
    fallback = """---
note_type: block_cards
block_id: {block_id}
block_name: {block_name}
control_stage: {control_stage}
session_id: {session_id}
course: {course}
module: {module}
topic: {topic}
started_at: {started_at}
ended_at: {ended_at}
artifact_type: {artifact_type}
---

# {block_name}

**Stage**: `{control_stage}` | **Time**: {started_at} → {ended_at}

## Anki Card Drafts

{cards_content}

---

[[{moc_path}|Map of Contents]] | [[{session_note_path}|Session Note]]
"""
    template = _read_template("block_cards.md.tmpl", fallback=fallback)
    return template.format_map(_SafeFormatDict(payload)).rstrip() + "\n"


def render_block_artifact(
    *,
    block_id: str,
    block_name: str,
    control_stage: str,
    artifact_type: str,
    session_id: str,
    course: str,
    module: str,
    topic: str,
    started_at: str,
    ended_at: str,
    content: str,
    moc_path: str = "",
    session_note_path: str = "",
) -> str:
    """Render a block-level artifact note from one of the 5 block templates.

    Maps *artifact_type* to the correct template and renderer:

    * ``"notes"``             → ``block_notes.md.tmpl``
    * ``"concept-map"``       → ``block_diagram.md.tmpl``
    * ``"comparison-table"``  → ``block_comparison.md.tmpl``
    * ``"recall"``            → ``block_recall.md.tmpl``
    * ``"cards"``             → ``block_cards.md.tmpl``

    Unknown types fall back to the *notes* renderer.
    """
    base_payload: dict[str, Any] = {
        "block_id": block_id,
        "block_name": block_name,
        "control_stage": control_stage,
        "artifact_type": artifact_type,
        "session_id": session_id,
        "course": course,
        "module": module,
        "topic": topic,
        "started_at": started_at,
        "ended_at": ended_at,
        "moc_path": moc_path,
        "session_note_path": session_note_path,
    }

    if artifact_type == "concept-map":
        return _render_block_diagram_markdown(
            {**base_payload, "diagram_content": content}
        )

    if artifact_type == "comparison-table":
        return _render_block_comparison_markdown(
            {**base_payload, "table_content": content}
        )

    if artifact_type == "recall":
        return _render_block_recall_markdown(
            {**base_payload, "recall_content": content}
        )

    if artifact_type == "cards":
        return _render_block_cards_markdown({**base_payload, "cards_content": content})

    return _render_block_notes_markdown({**base_payload, "content": content})
