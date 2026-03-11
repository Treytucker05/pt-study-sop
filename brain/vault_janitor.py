"""Vault janitor: family-aware Obsidian vault diagnostics and fixes."""

from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from dataclasses import dataclass, field as dc_field
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import yaml

from obsidian_vault import ObsidianVault

_LOG = logging.getLogger(__name__)

ISSUE_TYPES = frozenset(
    {
        "missing_frontmatter",
        "orphan",
        "broken_link",
        "casing_mismatch",
        "duplicate",
        "routing_drift",
    }
)
ALL_CHECKS = list(ISSUE_TYPES)

_SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2}
_FM_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
_LEGACY_REQUIRED_FM_FIELDS = ("course", "course_code", "unit_type", "note_type")

_NOTE_TYPE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"(?:^|/)concepts?/", re.IGNORECASE), "concept"),
    (re.compile(r"learning objectives", re.IGNORECASE), "learning_objectives_todo"),
    (re.compile(r"_map of contents", re.IGNORECASE), "map_of_contents"),
    (re.compile(r"(?:^|/)study sessions?/", re.IGNORECASE), "study_session"),
    (re.compile(r"(?:^|/)sessions?/", re.IGNORECASE), "study_session"),
    (re.compile(r"(?:^|/)study system/", re.IGNORECASE), "system_note"),
]

_SYSTEM_PREFIXES = ("Study System/", "Excalidraw/")
_SYSTEM_TEMPLATE_MARKERS = ("/Templates/", "/Scripts/")
_INTENTIONAL_ORPHAN_NAMES = {
    "_Glossary.md",
    "_Map of Contents.md",
    "Learning Objectives & To Do.md",
}


@dataclass
class JanitorIssue:
    issue_type: str
    path: str
    field: str = ""
    detail: str = ""
    fixable: bool = False
    fix_data: dict[str, Any] = dc_field(default_factory=dict)
    family: str = "other"
    issue_class: str = "real_breakage"
    severity: str = "medium"
    confidence: str = "medium"
    explanation: str = ""
    fix_preview: str = ""
    counts_toward_health: bool = True


@dataclass
class ScanNoteSummary:
    path: str
    family: str
    issue_count: int
    issue_classes: list[str]
    severity: str
    counts_toward_health: bool


@dataclass
class ScanResult:
    issues: list[JanitorIssue]
    note_summaries: list[ScanNoteSummary] = dc_field(default_factory=list)
    notes_scanned: int = 0
    total_markdown_files: int = 0
    affected_notes: int = 0
    issue_instances: int = 0
    excluded_system_files: int = 0
    advisory_only_files: int = 0
    scan_time_ms: float = 0.0
    api_available: bool = False
    counts: dict[str, int] = dc_field(default_factory=dict)
    issue_class_counts: dict[str, int] = dc_field(default_factory=dict)
    family_counts: dict[str, int] = dc_field(default_factory=dict)


@dataclass
class _FileContext:
    path: str
    name: str
    content: str
    frontmatter: dict[str, Any]
    family: str
    counts_toward_health: bool


def _normalize_path(path: str) -> str:
    return str(path or "").replace("\\", "/").strip("/")


def _basename(path: str) -> str:
    norm = _normalize_path(path)
    return norm.rsplit("/", 1)[-1] if norm else ""


def _top_level(path: str) -> str:
    norm = _normalize_path(path)
    return norm.split("/", 1)[0] if norm else ""


def _parse_frontmatter_fields(content: str) -> dict[str, Any]:
    match = _FM_RE.match(content or "")
    if not match:
        return {}
    try:
        raw = yaml.safe_load(match.group(1))
    except yaml.YAMLError:
        return {}
    return raw if isinstance(raw, dict) else {}


def _split_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    match = _FM_RE.match(content or "")
    if not match:
        return {}, content
    return _parse_frontmatter_fields(content), content[match.end() :].lstrip("\n")


def _classify_note_family(path: str) -> str:
    norm = _normalize_path(path)
    top = _top_level(norm)
    base = _basename(norm).lower()

    if norm.startswith("Study Notes/"):
        return "deprecated_study_notes"
    if top == "Concepts" and base == "_glossary.md":
        return "concept_index"
    if top == "Concepts":
        return "concept"
    if top == "Study Sessions":
        return "study_session"
    if top == "Study System":
        return "study_system"
    if top == "Excalidraw":
        return "system_support"
    if top != "Courses":
        return "other"
    if base == "learning objectives & to do.md":
        return "course_learning_objectives"
    if base == "_map of contents.md":
        return "course_map_of_contents"
    if "/sessions/" in norm.lower():
        return "course_session"
    return "course_note"


def _counts_toward_health(path: str, family: str) -> bool:
    norm = _normalize_path(path)
    if family in {"study_system", "system_support", "concept_index"}:
        return False
    if norm.startswith(_SYSTEM_PREFIXES):
        return False
    return not any(marker.lower() in norm.lower() for marker in _SYSTEM_TEMPLATE_MARKERS)


def _has_frontmatter_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return any(_has_frontmatter_value(item) for item in value)
    return True


def _iso_timestamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def _required_frontmatter_for_family(path: str, family: str) -> dict[str, Any]:
    if family == "deprecated_study_notes":
        return {field_name: str for field_name in _LEGACY_REQUIRED_FM_FIELDS}
    if family == "concept":
        return {
            "note_type": "concept",
            "tags": list,
            "courses": list,
        }
    if family == "course_learning_objectives":
        return {
            "note_type": "learning_objectives_todo",
            "course_name": str,
            "module_name": str,
            "updated_at": str,
        }
    if family == "course_map_of_contents":
        return {
            "note_type": "map_of_contents",
            "course_name": str,
            "module_name": str,
            "updated_at": str,
        }
    if family in {"study_session", "course_session"}:
        return {"note_type": "study_session"}
    return {}


def _resolve_frontmatter_from_path(path: str) -> dict[str, Any]:
    try:
        from course_map import load_course_map
    except ImportError:
        return {}

    norm = _normalize_path(path)
    family = _classify_note_family(norm)
    if family in {"concept", "concept_index"}:
        return {"note_type": "concept"}
    if family == "deprecated_study_notes":
        try:
            from course_map import load_course_map
        except ImportError:
            return {}

        cmap = load_course_map()
        parts = norm.split("/")
        inferred: dict[str, Any] = {}
        for part in parts:
            course = cmap.resolve_course(part)
            if course:
                inferred["course"] = course.label
                inferred["course_code"] = course.code
                inferred["unit_type"] = course.unit_type
                break
        if "learning objectives" in norm.lower():
            inferred["note_type"] = "reference"
        else:
            inferred["note_type"] = "concept"
        return inferred
    if family not in {
        "course_learning_objectives",
        "course_map_of_contents",
        "study_session",
        "course_session",
    }:
        return {}

    cmap = load_course_map()
    parts = norm.split("/")
    course_name = ""
    module_name = ""
    if len(parts) >= 3 and parts[0] == "Courses":
        course = cmap.resolve_course(parts[1])
        course_name = course.label if course else parts[1]
        if course and len(parts) >= 3:
            unit = course.resolve_unit(parts[2])
            module_name = unit.name if unit else parts[2]
        elif len(parts) >= 3:
            module_name = parts[2]

    inferred: dict[str, Any] = {"updated_at": _iso_timestamp()}
    if course_name:
        inferred["course_name"] = course_name
    if module_name:
        inferred["module_name"] = module_name
    if family == "course_learning_objectives":
        inferred["note_type"] = "learning_objectives_todo"
    elif family == "course_map_of_contents":
        inferred["note_type"] = "map_of_contents"
    else:
        inferred["note_type"] = "study_session"
    return inferred


def _build_file_context(path: str, content: str) -> _FileContext:
    family = _classify_note_family(path)
    return _FileContext(
        path=path,
        name=_basename(path).removesuffix(".md"),
        content=content,
        frontmatter=_parse_frontmatter_fields(content),
        family=family,
        counts_toward_health=_counts_toward_health(path, family),
    )


def _make_issue(
    *,
    issue_type: str,
    path: str,
    family: str,
    detail: str,
    field: str = "",
    fixable: bool = False,
    fix_data: Optional[dict[str, Any]] = None,
    issue_class: str = "real_breakage",
    severity: str = "medium",
    confidence: str = "medium",
    explanation: str = "",
    counts_toward_health: bool = True,
) -> JanitorIssue:
    preview = ""
    if fix_data and field and field in fix_data:
        preview = f"Set {field} to {json.dumps(fix_data[field], ensure_ascii=True)}"
    return JanitorIssue(
        issue_type=issue_type,
        path=path,
        field=field,
        detail=detail,
        fixable=fixable,
        fix_data=fix_data or {},
        family=family,
        issue_class=issue_class,
        severity=severity,
        confidence=confidence,
        explanation=explanation or detail,
        fix_preview=preview,
        counts_toward_health=counts_toward_health,
    )


def _coerce_file_contexts(
    paths_or_contexts: list[str] | dict[str, Any],
    contents: Optional[dict[str, str]] = None,
) -> dict[str, _FileContext]:
    if isinstance(paths_or_contexts, dict):
        sample = next(iter(paths_or_contexts.values()), None)
        if isinstance(sample, _FileContext):
            return dict(paths_or_contexts)
        if isinstance(sample, str):
            return {
                _normalize_path(path): _build_file_context(_normalize_path(path), text)
                for path, text in paths_or_contexts.items()
            }
        return {}

    content_map = contents or {}
    return {
        _normalize_path(path): _build_file_context(_normalize_path(path), content_map.get(path, ""))
        for path in paths_or_contexts
        if path in content_map
    }


def _check_frontmatter(
    paths_or_contexts: list[str] | dict[str, Any],
    contents: Optional[dict[str, str]] = None,
) -> list[JanitorIssue]:
    file_contexts = _coerce_file_contexts(paths_or_contexts, contents)
    issues: list[JanitorIssue] = []
    for path, ctx in file_contexts.items():
        required = _required_frontmatter_for_family(path, ctx.family)
        if not required:
            continue

        inferred = _resolve_frontmatter_from_path(path)
        for field_name, expected in required.items():
            existing = ctx.frontmatter.get(field_name)

            if expected is list:
                if _has_frontmatter_value(existing):
                    continue
                issues.append(
                    _make_issue(
                        issue_type="missing_frontmatter",
                        path=path,
                        family=ctx.family,
                        field=field_name,
                        detail=f"Missing '{field_name}' in frontmatter",
                        fixable=field_name in inferred,
                        fix_data={field_name: inferred[field_name]} if field_name in inferred else {},
                        issue_class="real_breakage" if ctx.counts_toward_health else "advisory/system",
                        severity="medium" if ctx.counts_toward_health else "low",
                        confidence="medium",
                        explanation="This note family expects a populated YAML list for the field.",
                        counts_toward_health=ctx.counts_toward_health,
                    )
                )
                continue

            if isinstance(expected, str):
                if not _has_frontmatter_value(existing):
                    issues.append(
                        _make_issue(
                            issue_type="missing_frontmatter",
                            path=path,
                            family=ctx.family,
                            field=field_name,
                            detail=f"Missing '{field_name}' in frontmatter",
                            fixable=field_name in inferred,
                            fix_data={field_name: inferred[field_name]} if field_name in inferred else {},
                            issue_class="real_breakage" if ctx.counts_toward_health else "advisory/system",
                            severity="high" if field_name == "note_type" else "medium",
                            confidence="high" if field_name in inferred else "medium",
                            explanation=f"The {ctx.family.replace('_', ' ')} family requires '{field_name}'.",
                            counts_toward_health=ctx.counts_toward_health,
                        )
                    )
                    continue
                if str(existing).strip() != expected:
                    issues.append(
                        _make_issue(
                            issue_type="missing_frontmatter",
                            path=path,
                            family=ctx.family,
                            field=field_name,
                            detail=f"Expected '{field_name}' to be '{expected}', found '{existing}'.",
                            fixable=True,
                            fix_data={field_name: expected},
                            issue_class="real_breakage" if ctx.counts_toward_health else "advisory/system",
                            severity="medium",
                            confidence="high",
                            explanation="The note property does not match the canonical family schema.",
                            counts_toward_health=ctx.counts_toward_health,
                        )
                    )
                    continue

            if expected is str:
                if _has_frontmatter_value(existing):
                    continue
                issues.append(
                    _make_issue(
                        issue_type="missing_frontmatter",
                        path=path,
                        family=ctx.family,
                        field=field_name,
                        detail=f"Missing '{field_name}' in frontmatter",
                        fixable=field_name in inferred,
                        fix_data={field_name: inferred[field_name]} if field_name in inferred else {},
                        issue_class="real_breakage" if ctx.counts_toward_health else "advisory/system",
                        severity="medium",
                        confidence="high" if field_name in inferred else "medium",
                        explanation=f"The {ctx.family.replace('_', ' ')} family requires '{field_name}'.",
                        counts_toward_health=ctx.counts_toward_health,
                    )
                )

        if ctx.family == "concept" and not _has_frontmatter_value(ctx.frontmatter.get("aliases")):
            issues.append(
                _make_issue(
                    issue_type="missing_frontmatter",
                    path=path,
                    family=ctx.family,
                    field="aliases",
                    detail="Missing 'aliases' in frontmatter",
                    fixable=False,
                    issue_class="advisory/system",
                    severity="low",
                    confidence="medium",
                    explanation="Aliases are recommended for concept discovery and Virtual Linker matching, but they are not health-scored required metadata.",
                    counts_toward_health=False,
                )
            )

    return issues


def _obsidian_vault_root_path() -> Optional[Path]:
    try:
        from dashboard.api_tutor_vault import _obsidian_vault_root_path as _resolve_root

        return _resolve_root()
    except Exception:
        pass

    default_root = Path(r"C:\Users\treyt\Desktop\Treys School")
    return default_root if default_root.exists() and default_root.is_dir() else None


def _build_attachment_lookup() -> dict[str, Any]:
    root = _obsidian_vault_root_path()
    exact: set[str] = set()
    by_name: dict[str, list[str]] = {}
    if root is None:
        return {"exact": exact, "by_name": by_name}

    for file_path in root.rglob("*"):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() == ".md":
            continue
        try:
            rel_path = file_path.relative_to(root).as_posix()
        except ValueError:
            continue
        exact.add(rel_path.lower())
        by_name.setdefault(file_path.name.lower(), []).append(rel_path)
    return {"exact": exact, "by_name": by_name}


def _resolve_attachment_target(target: str, attachment_lookup: Optional[dict[str, Any]]) -> tuple[str, Any]:
    if not attachment_lookup:
        return "missing", None

    clean = _normalize_path(target)
    if not clean:
        return "missing", None

    exact_paths: set[str] = attachment_lookup.get("exact") or set()
    by_name: dict[str, list[str]] = attachment_lookup.get("by_name") or {}

    exact_match = clean.lower()
    if exact_match in exact_paths:
        return "resolved", clean

    basename = _basename(clean).lower()
    if not basename:
        return "missing", None

    matches = by_name.get(basename) or []
    if len(matches) == 1:
        return "resolved", matches[0]
    if len(matches) > 1:
        return "ambiguous", matches
    return "missing", None


def _check_routing(file_contexts: dict[str, _FileContext]) -> list[JanitorIssue]:
    from course_map import load_course_map

    cmap = load_course_map()
    issues: list[JanitorIssue] = []
    for path, ctx in file_contexts.items():
        norm = _normalize_path(path)
        parts = norm.split("/")
        top = parts[0] if parts else ""

        if top in cmap.deprecated_roots:
            issues.append(
                _make_issue(
                    issue_type="routing_drift",
                    path=path,
                    family=ctx.family,
                    detail=f"Deprecated root '{top}' is no longer canonical.",
                    issue_class="routing_drift",
                    severity="high",
                    confidence="high",
                    explanation="This note still lives under a deprecated vault root.",
                )
            )
            continue

        if top != cmap.vault_root or len(parts) < 2:
            continue

        course_segment = parts[1]
        course = cmap.resolve_course(course_segment)
        if course is None:
            issues.append(
                _make_issue(
                    issue_type="routing_drift",
                    path=path,
                    family=ctx.family,
                    detail=f"Course folder '{course_segment}' is not mapped in vault_courses.yaml.",
                    issue_class="routing_drift",
                    severity="high",
                    confidence="high",
                    explanation="Tutor routing cannot safely write into an unmapped course folder.",
                )
            )
            continue

        if course.label != course_segment:
            issues.append(
                _make_issue(
                    issue_type="routing_drift",
                    path=path,
                    family=ctx.family,
                    detail=f"Course folder '{course_segment}' should use canonical name '{course.label}'.",
                    issue_class="routing_drift",
                    severity="medium",
                    confidence="high",
                    explanation="The course resolves through an alias instead of the canonical live folder name.",
                )
            )

        if len(parts) < 3:
            continue

        unit_segment = parts[2]
        unit = course.resolve_unit(unit_segment)
        if unit is None:
            issues.append(
                _make_issue(
                    issue_type="routing_drift",
                    path=path,
                    family=ctx.family,
                    detail=f"Unit folder '{unit_segment}' is not mapped for course '{course.label}'.",
                    issue_class="routing_drift",
                    severity="medium",
                    confidence="high",
                    explanation="Tutor routing cannot safely patch or create notes in an unmapped unit folder.",
                )
            )
            continue

        if unit.name != unit_segment:
            issues.append(
                _make_issue(
                    issue_type="routing_drift",
                    path=path,
                    family=ctx.family,
                    detail=f"Unit folder '{unit_segment}' should use canonical name '{unit.name}'.",
                    issue_class="routing_drift",
                    severity="low",
                    confidence="high",
                    explanation="This unit resolves through an alias instead of the canonical live folder name.",
                )
            )
    return issues


def _check_orphans(
    file_contexts: dict[str, _FileContext] | dict[str, Any],
    incoming_targets: Optional[dict[str, int]] = None,
) -> list[JanitorIssue]:
    if incoming_targets is None and isinstance(file_contexts, dict) and "nodes" in file_contexts:
        graph = file_contexts
        if not graph.get("success"):
            return []
        incoming_targets = {}
        scoped_contexts: dict[str, _FileContext] = {}
        for link in graph.get("links") or []:
            target = str(link.get("target") or "")
            incoming_targets[target] = incoming_targets.get(target, 0) + 1
        for node in graph.get("nodes") or []:
            name = str(node.get("id") or node.get("name") or "")
            folder = str(node.get("folder") or "").strip("/")
            path = f"{folder}/{name}.md" if folder else f"{name}.md"
            scoped_contexts[path] = _build_file_context(path, "")
        file_contexts = scoped_contexts

    incoming_targets = incoming_targets or {}
    issues: list[JanitorIssue] = []
    for path, ctx in file_contexts.items():
        ctx = ctx if isinstance(ctx, _FileContext) else _build_file_context(path, "")
        if ctx.family not in {"concept", "other", "deprecated_study_notes"}:
            continue
        if _basename(path) in _INTENTIONAL_ORPHAN_NAMES:
            continue
        if incoming_targets.get(path, 0) > 0 or incoming_targets.get(ctx.name, 0) > 0:
            continue
        issues.append(
            _make_issue(
                issue_type="orphan",
                path=path,
                family=ctx.family,
                detail=f"No incoming links to '{ctx.name}'.",
                issue_class="content_gap",
                severity="low",
                confidence="medium",
                explanation="The concept note exists but is not connected from other notes in the vault graph.",
                counts_toward_health=ctx.counts_toward_health,
            )
        )
    return issues


def _check_broken_links(
    file_contexts: dict[str, _FileContext] | list[str],
    resolver: dict[str, str] | dict[str, str],
    note_names: Optional[set[str]] = None,
    attachment_lookup: Optional[dict[str, Any]] = None,
) -> Any:
    from obsidian_index import _parse_wikilinks, _split_wikilink_target

    if note_names is not None:
        content_map = resolver if isinstance(resolver, dict) else {}
        scoped_contexts = _coerce_file_contexts(file_contexts, content_map)  # type: ignore[arg-type]
        resolver_map = {name.lower(): name for name in note_names}
        legacy_issues: list[JanitorIssue] = []
        for path, ctx in scoped_contexts.items():
            for raw_target in _parse_wikilinks(ctx.content):
                note_target, _anchor = _split_wikilink_target(raw_target)
                attachment_state, _attachment_match = _resolve_attachment_target(
                    note_target,
                    attachment_lookup,
                )
                if attachment_state == "resolved":
                    continue
                if note_target and note_target.lower() not in resolver_map:
                    legacy_issues.append(
                        _make_issue(
                            issue_type="broken_link",
                            path=path,
                            family=ctx.family,
                            field=raw_target,
                            detail=f"Link [[{raw_target}]] points to non-existent note",
                        )
                    )
        return legacy_issues

    issues: list[JanitorIssue] = []
    incoming_targets: dict[str, int] = {}
    for path, ctx in file_contexts.items():
        for raw_target in _parse_wikilinks(ctx.content):
            note_target, _anchor = _split_wikilink_target(raw_target)
            if not note_target:
                continue
            resolved = resolver.get(note_target.lower())
            if resolved:
                if resolved != path:
                    incoming_targets[resolved] = incoming_targets.get(resolved, 0) + 1
                continue

            attachment_state, attachment_match = _resolve_attachment_target(
                note_target,
                attachment_lookup,
            )
            if attachment_state == "resolved":
                continue
            if attachment_state == "ambiguous":
                issues.append(
                    _make_issue(
                        issue_type="broken_link",
                        path=path,
                        family=ctx.family,
                        field=raw_target,
                        detail=(
                            f"Link [[{raw_target}]] matches multiple vault attachments: "
                            + ", ".join(str(item) for item in attachment_match)
                        ),
                        issue_class="advisory/system",
                        severity="low",
                        confidence="medium",
                        explanation="The link target matches multiple non-markdown vault files by basename, so it needs a more specific path to resolve safely.",
                        counts_toward_health=False,
                    )
                )
                continue

            issues.append(
                _make_issue(
                    issue_type="broken_link",
                    path=path,
                    family=ctx.family,
                    field=raw_target,
                    detail=f"Link [[{raw_target}]] does not resolve to any note or alias.",
                    issue_class="content_gap" if ctx.counts_toward_health else "advisory/system",
                    severity="medium" if ctx.counts_toward_health else "low",
                    confidence="high",
                    explanation="The wikilink target is missing from the vault index after stripping any heading or block anchor.",
                    counts_toward_health=ctx.counts_toward_health,
                )
            )
    return issues, incoming_targets


def _check_casing(paths: list[str]) -> list[JanitorIssue]:
    folder_map: dict[str, list[str]] = {}
    for path in paths:
        for part in _normalize_path(path).split("/")[:-1]:
            key = part.lower()
            folder_map.setdefault(key, [])
            if part not in folder_map[key]:
                folder_map[key].append(part)

    issues: list[JanitorIssue] = []
    for variants in folder_map.values():
        if len(variants) <= 1:
            continue
        issues.append(
            _make_issue(
                issue_type="casing_mismatch",
                path=variants[0],
                family="vault",
                detail=f"Folder casing conflict: {', '.join(sorted(variants))}",
                issue_class="routing_drift",
                severity="low",
                confidence="high",
                explanation="Two differently cased folder names will drift on case-sensitive tooling and links.",
            )
        )
    return issues


def _check_duplicates(file_contexts: dict[str, _FileContext]) -> list[JanitorIssue]:
    file_contexts = _coerce_file_contexts(file_contexts)
    hash_map: dict[str, list[str]] = {}
    for path, ctx in file_contexts.items():
        _frontmatter, body = _split_frontmatter(ctx.content)
        stripped = body.strip()
        if not stripped:
            continue
        digest = hashlib.md5(stripped.encode("utf-8")).hexdigest()
        hash_map.setdefault(digest, []).append(path)

    issues: list[JanitorIssue] = []
    for paths in hash_map.values():
        if len(paths) <= 1:
            continue
        for dupe_path in paths[1:]:
            issues.append(
                _make_issue(
                    issue_type="duplicate",
                    path=dupe_path,
                    family=_classify_note_family(dupe_path),
                    detail=f"Duplicate content with {paths[0]}",
                    issue_class="advisory/system",
                    severity="low",
                    confidence="high",
                    explanation="The note body matches another note after removing frontmatter.",
                    counts_toward_health=False,
                )
            )
    return issues


def _build_note_summaries(
    issues: list[JanitorIssue],
    file_contexts: dict[str, _FileContext],
) -> list[ScanNoteSummary]:
    grouped: dict[str, list[JanitorIssue]] = {}
    for issue in issues:
        grouped.setdefault(issue.path, []).append(issue)

    summaries: list[ScanNoteSummary] = []
    for path, note_issues in grouped.items():
        classes = sorted({issue.issue_class for issue in note_issues})
        severity = max(note_issues, key=lambda issue: _SEVERITY_RANK.get(issue.severity, 0)).severity
        summaries.append(
            ScanNoteSummary(
                path=path,
                family=file_contexts.get(path, _build_file_context(path, "")).family,
                issue_count=len(note_issues),
                issue_classes=classes,
                severity=severity,
                counts_toward_health=any(issue.counts_toward_health for issue in note_issues),
            )
        )
    return sorted(summaries, key=lambda item: (item.counts_toward_health is False, item.path.lower()))


def _dump_frontmatter(frontmatter: dict[str, Any]) -> str:
    dumped = yaml.safe_dump(frontmatter, sort_keys=False, allow_unicode=False).strip()
    return f"---\n{dumped}\n---"


def scan_vault(
    folder: Optional[str] = None,
    checks: Optional[list[str]] = None,
) -> ScanResult:
    from obsidian_index import _extract_aliases, _get_note_content, get_vault_index

    t0 = time.time()
    aliases = {
        "frontmatter": "missing_frontmatter",
        "casing": "casing_mismatch",
        "routing": "routing_drift",
        "links": "broken_link",
    }
    checks_to_run = {aliases.get(item, item) for item in checks} if checks else set(ALL_CHECKS)

    index = get_vault_index(force_refresh=True)
    if not index.get("success"):
        return ScanResult(
            issues=[],
            note_summaries=[],
            notes_scanned=0,
            total_markdown_files=0,
            affected_notes=0,
            issue_instances=0,
            excluded_system_files=0,
            advisory_only_files=0,
            scan_time_ms=round((time.time() - t0) * 1000, 1),
            api_available=False,
        )

    all_files = list(index.get("files") or [])
    folder_norm = _normalize_path(folder or "")
    scoped_files = [
        item for item in all_files
        if not folder_norm or _normalize_path(str(item.get("path") or "")).startswith(folder_norm)
    ]

    file_contexts: dict[str, _FileContext] = {}
    resolver: dict[str, str] = {}
    attachment_lookup = _build_attachment_lookup()
    for item in all_files:
        path = _normalize_path(str(item.get("path") or ""))
        name = str(item.get("name") or "")
        if not path or not name:
            continue
        content = _get_note_content(path) or ""
        resolver.setdefault(name.lower(), path)
        for alias in _extract_aliases(content):
            resolver.setdefault(alias.lower(), path)
        if folder_norm and not path.startswith(folder_norm):
            continue
        file_contexts[path] = _build_file_context(path, content)

    issues: list[JanitorIssue] = []
    scoped_paths = list(file_contexts.keys())
    if "missing_frontmatter" in checks_to_run:
        issues.extend(_check_frontmatter(file_contexts))
    if "routing_drift" in checks_to_run:
        issues.extend(_check_routing(file_contexts))

    incoming_targets: dict[str, int] = {}
    if "broken_link" in checks_to_run or "orphan" in checks_to_run:
        broken_link_issues, incoming_targets = _check_broken_links(
            file_contexts,
            resolver,
            attachment_lookup=attachment_lookup,
        )
        if "broken_link" in checks_to_run:
            issues.extend(broken_link_issues)

    if "orphan" in checks_to_run:
        issues.extend(_check_orphans(file_contexts, incoming_targets))
    if "casing_mismatch" in checks_to_run:
        issues.extend(_check_casing(scoped_paths))
    if "duplicate" in checks_to_run:
        issues.extend(_check_duplicates(file_contexts))

    note_summaries = _build_note_summaries(issues, file_contexts)
    counts: dict[str, int] = {}
    issue_class_counts: dict[str, int] = {}
    for issue in issues:
        if issue.counts_toward_health:
            counts[issue.issue_type] = counts.get(issue.issue_type, 0) + 1
        issue_class_counts[issue.issue_class] = issue_class_counts.get(issue.issue_class, 0) + 1

    family_counts: dict[str, int] = {}
    excluded_system_files = 0
    for ctx in file_contexts.values():
        family_counts[ctx.family] = family_counts.get(ctx.family, 0) + 1
        if not ctx.counts_toward_health:
            excluded_system_files += 1

    advisory_only_files = sum(1 for summary in note_summaries if not summary.counts_toward_health)
    return ScanResult(
        issues=issues,
        note_summaries=note_summaries,
        notes_scanned=max(len(file_contexts) - excluded_system_files, 0),
        total_markdown_files=len(scoped_files),
        affected_notes=len(note_summaries),
        issue_instances=len(issues),
        excluded_system_files=excluded_system_files,
        advisory_only_files=advisory_only_files,
        scan_time_ms=round((time.time() - t0) * 1000, 1),
        api_available=True,
        counts=counts,
        issue_class_counts=issue_class_counts,
        family_counts=family_counts,
    )


def apply_fix(issue: JanitorIssue) -> dict:
    if issue.issue_type != "missing_frontmatter":
        return {"success": False, "path": issue.path, "detail": "Not fixable"}
    if issue.field not in issue.fix_data:
        return {"success": False, "path": issue.path, "detail": f"No value for '{issue.field}'"}

    vault = ObsidianVault()
    content = vault.read_note(file=issue.path)
    if not content:
        return {"success": False, "path": issue.path, "detail": "Cannot read note"}

    frontmatter, body = _split_frontmatter(content)
    current_value = frontmatter.get(issue.field)
    new_value = issue.fix_data[issue.field]
    if current_value == new_value:
        return {"success": True, "path": issue.path, "detail": "Already present"}

    frontmatter[issue.field] = new_value
    updated = f"{_dump_frontmatter(frontmatter)}\n{body.lstrip()}" if body else f"{_dump_frontmatter(frontmatter)}\n"
    vault.replace_content(file=issue.path, new_content=updated)
    return {"success": True, "path": issue.path, "detail": f"Updated {issue.field}"}


def apply_fixes(issues: list[JanitorIssue]) -> list[dict]:
    return [apply_fix(issue) for issue in issues]


def batch_fix(
    folder: Optional[str] = None,
    checks: Optional[list[str]] = None,
    max_batch: int = 50,
) -> dict:
    result = scan_vault(folder=folder, checks=checks)
    fixable = [issue for issue in result.issues if issue.fixable][:max_batch]
    results: list[dict] = []
    fixed = 0
    failed = 0
    for issue in fixable:
        fix_result = apply_fix(issue)
        results.append(fix_result)
        if fix_result.get("success"):
            fixed += 1
        else:
            failed += 1

    return {
        "total_scanned": result.notes_scanned,
        "total_fixable": len([issue for issue in result.issues if issue.fixable]),
        "total_fixed": fixed,
        "total_failed": failed,
        "results": results,
    }


def _build_ai_system_prompt(path: str) -> str:
    from course_map import load_course_map

    cmap = load_course_map()
    courses = [course.label for course in cmap.courses]
    note_types = sorted({note_type for _, note_type in _NOTE_TYPE_PATTERNS})
    return f"""You are a metadata classifier for an Obsidian study vault.
Given a note path, existing frontmatter, note family, and content excerpt, infer only missing YAML frontmatter.

VALID COURSE NAMES:
- {json.dumps(courses)}

VALID NOTE TYPES:
- {json.dumps(note_types)}

RULES:
- Preserve the live vault contract for the note family.
- Use YAML-friendly scalar or list values only.
- Return ONLY valid JSON.

RESPONSE FORMAT:
{{"suggestions": {{"field_name": {{"value": "...", "confidence": "high|medium|low"}}}}, "reasoning": "one sentence", "uncertain_fields": ["field1"]}}"""


def ai_infer_frontmatter(path: str, content: str, existing_fm: dict[str, Any]) -> dict:
    from llm_provider import call_llm

    required = _required_frontmatter_for_family(path, _classify_note_family(path))
    missing = [field_name for field_name in required if not _has_frontmatter_value(existing_fm.get(field_name))]
    if not missing:
        return {"suggestions": {}, "reasoning": "All required fields are present", "uncertain_fields": []}

    system_prompt = _build_ai_system_prompt(path)
    user_prompt = (
        f"File path: {path}\n"
        f"Note family: {_classify_note_family(path)}\n"
        f"Existing frontmatter: {json.dumps(existing_fm, default=str)}\n"
        f"Missing fields: {json.dumps(missing)}\n\n"
        f"Content excerpt:\n{content[:2000]}"
    )
    result = call_llm(system_prompt, user_prompt)
    if not result.get("success"):
        return {
            "suggestions": {},
            "reasoning": f"LLM error: {result.get('error', 'unknown')}",
            "uncertain_fields": missing,
            "error": result.get("error"),
        }

    raw = result.get("content", "")
    try:
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        cleaned = re.sub(r"\s*```$", "", cleaned)
        parsed = json.loads(cleaned)
    except (json.JSONDecodeError, TypeError):
        _LOG.warning("AI frontmatter inference returned invalid JSON: %s", raw[:200])
        return {
            "suggestions": {},
            "reasoning": "Failed to parse LLM response",
            "uncertain_fields": missing,
            "error": "Invalid JSON from LLM",
        }

    return {
        "suggestions": parsed.get("suggestions", {}),
        "reasoning": parsed.get("reasoning", ""),
        "uncertain_fields": parsed.get("uncertain_fields", []),
    }


def ai_resolve(path: str, issue_type: str, context: dict | None = None) -> dict:
    if issue_type == "missing_frontmatter":
        vault = ObsidianVault()
        content = vault.read_note(file=path)
        if not content:
            return {"success": False, "error": "Cannot read note"}
        existing_fm = _parse_frontmatter_fields(content)
        result = ai_infer_frontmatter(path, content, existing_fm)
        if result.get("error"):
            return {"success": False, "error": result["error"]}
        return {
            "success": True,
            "suggestion": result["suggestions"],
            "reasoning": result["reasoning"],
            "apply_action": "update_frontmatter",
            "uncertain_fields": result.get("uncertain_fields", []),
        }

    if issue_type == "orphan":
        return {"success": True, "suggestion": {}, "reasoning": "Will add wikilinks via LLM concept linking.", "apply_action": "add_links"}

    if issue_type == "broken_link":
        from llm_provider import call_llm
        from obsidian_index import get_vault_index

        index = get_vault_index()
        note_names = sorted(index.get("notes") or [])
        broken_target = (context or {}).get("broken_target", "")
        if not broken_target:
            return {"success": False, "error": "No broken_target in context"}

        system_prompt = (
            "You fix broken wikilinks in an Obsidian vault. "
            "Given a broken link target and the list of existing note names, "
            'return ONLY valid JSON: {"suggested_target": "NoteName", "confidence": "high|medium|low"}'
        )
        user_prompt = f"Broken link: [[{broken_target}]]\nExisting notes: {json.dumps(note_names[:500])}"
        llm_result = call_llm(system_prompt, user_prompt)
        if not llm_result.get("success"):
            return {"success": False, "error": llm_result.get("error")}

        raw = llm_result.get("content", "")
        try:
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)
            parsed = json.loads(cleaned)
        except (json.JSONDecodeError, TypeError):
            return {"success": False, "error": "Invalid JSON from LLM"}

        return {
            "success": True,
            "suggestion": {
                "old_target": broken_target,
                "new_target": parsed.get("suggested_target", ""),
                "confidence": parsed.get("confidence", "low"),
            },
            "reasoning": f"Closest match for [[{broken_target}]]",
            "apply_action": "rename_link",
        }

    return {"success": False, "error": f"Unsupported issue_type: {issue_type}"}


def ai_apply(path: str, apply_action: str, suggestion: dict) -> dict:
    if apply_action == "update_frontmatter":
        results = []
        for field_name, field_data in suggestion.items():
            value = field_data.get("value") if isinstance(field_data, dict) else field_data
            if value in (None, "", []):
                continue
            issue = JanitorIssue(
                issue_type="missing_frontmatter",
                path=path,
                field=field_name,
                fixable=True,
                fix_data={field_name: value},
            )
            results.append(apply_fix(issue))

        failures = [result for result in results if not result.get("success")]
        if failures:
            return {"success": False, "detail": f"{len(failures)} field(s) failed: {failures[0].get('detail', '')}"}
        return {"success": True, "detail": f"Updated {len(results)} field(s)"}

    if apply_action == "add_links":
        return enrich_links(path)

    if apply_action == "rename_link":
        old_target = suggestion.get("old_target", "")
        new_target = suggestion.get("new_target", "")
        if not old_target or not new_target:
            return {"success": False, "detail": "Missing old_target or new_target"}

        vault = ObsidianVault()
        content = vault.read_note(file=path)
        if not content:
            return {"success": False, "detail": "Cannot read note"}

        updated = content.replace(f"[[{old_target}]]", f"[[{new_target}]]")
        if updated == content:
            return {"success": True, "detail": "Link not found (already renamed?)"}
        vault.replace_content(file=path, new_content=updated)
        return {"success": True, "detail": f"Renamed [[{old_target}]] to [[{new_target}]]"}

    return {"success": False, "detail": f"Unknown apply_action: {apply_action}"}


def enrich_links(path: str) -> dict:
    from obsidian_index import _parse_wikilinks, get_vault_index
    from obsidian_merge import add_concept_links

    vault = ObsidianVault()
    content = vault.read_note(file=path)
    if not content:
        return {"success": False, "links_added": 0, "error": "Cannot read note"}

    index = get_vault_index()
    enriched = add_concept_links(content, vault_index=index.get("notes") or [])
    if enriched == content:
        return {"success": True, "links_added": 0}

    old_links = set(_parse_wikilinks(content))
    new_links = set(_parse_wikilinks(enriched))
    vault.replace_content(file=path, new_content=enriched)
    return {"success": True, "links_added": len(new_links - old_links)}
