"""Vault Janitor — scan, detect, and fix Obsidian vault health issues.

Reuses obsidian_index for vault scanning, course_map for path resolution,
and obsidian_merge for wikilink enrichment.
"""
from __future__ import annotations

import hashlib
import logging
import re
import time
from dataclasses import dataclass, field as dc_field
from typing import Optional

_LOG = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

ISSUE_TYPES = frozenset({
    "missing_frontmatter",
    "orphan",
    "broken_link",
    "casing_mismatch",
    "duplicate",
})

ALL_CHECKS = list(ISSUE_TYPES)


@dataclass
class JanitorIssue:
    issue_type: str
    path: str
    field: str = ""
    detail: str = ""
    fixable: bool = False
    fix_data: dict = dc_field(default_factory=dict)


@dataclass
class ScanResult:
    issues: list[JanitorIssue]
    notes_scanned: int
    scan_time_ms: float
    api_available: bool


# ---------------------------------------------------------------------------
# Frontmatter parsing
# ---------------------------------------------------------------------------

_FM_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
_FM_FIELD_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)", re.MULTILINE)

REQUIRED_FM_FIELDS = ("course", "course_code", "unit_type", "note_type")


def _parse_frontmatter_fields(content: str) -> dict[str, str]:
    """Extract YAML frontmatter key-values from note content."""
    m = _FM_RE.match(content)
    if not m:
        return {}
    raw = m.group(1)
    fields: dict[str, str] = {}
    for fm in _FM_FIELD_RE.finditer(raw):
        key = fm.group(1).strip()
        val = fm.group(2).strip().strip('"').strip("'")
        if val:
            fields[key] = val
    return fields


_NOTE_TYPE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"(?:^|/)concept[_\s-]", re.IGNORECASE), "concept"),
    (re.compile(r"(?:^|/)session[_\s-]", re.IGNORECASE), "session"),
    (re.compile(r"(?:^|/)summary[_\s-]", re.IGNORECASE), "summary"),
    (re.compile(r"(?:^|/)review[_\s-]", re.IGNORECASE), "review"),
    (re.compile(r"(?:^|/)north[_\s-]?star", re.IGNORECASE), "north_star"),
    (re.compile(r"learning[_\s-]?objectives?", re.IGNORECASE), "reference"),
    (re.compile(r"(?:^|/)evidence[_\s-]", re.IGNORECASE), "reference"),
    (re.compile(r"(?:^|/)research[/\\]", re.IGNORECASE), "reference"),
    (re.compile(r"(?:^|/)categories[/\\]", re.IGNORECASE), "reference"),
]


def _resolve_frontmatter_from_path(path: str) -> dict[str, str]:
    """Infer frontmatter fields from a vault path via course_map.

    Example path: Study Notes/Neuroscience/Week 5/concept_motor_cortex.md
    Returns: {course: "Neuroscience", course_code: "PHYT_6313", unit_type: "week", note_type: "concept"}
    """
    try:
        from course_map import load_course_map
    except ImportError:
        return {}

    cmap = load_course_map()
    norm = path.replace("\\", "/")
    parts = norm.split("/")

    resolved: dict[str, str] = {}

    # Try to match a course label from path segments
    for part in parts:
        course = cmap.resolve_course(part)
        if course:
            resolved["course"] = course.label
            resolved["course_code"] = course.code
            resolved["unit_type"] = course.unit_type
            break

    # Infer note_type from filename/path patterns
    for pattern, note_type in _NOTE_TYPE_PATTERNS:
        if pattern.search(norm):
            resolved["note_type"] = note_type
            break

    return resolved


# ---------------------------------------------------------------------------
# Individual checkers
# ---------------------------------------------------------------------------

def _check_frontmatter(
    paths: list[str],
    contents: dict[str, str],
) -> list[JanitorIssue]:
    """Detect notes with missing required frontmatter fields."""
    issues: list[JanitorIssue] = []
    for path in paths:
        content = contents.get(path)
        if content is None:
            continue
        fm = _parse_frontmatter_fields(content)
        for req in REQUIRED_FM_FIELDS:
            if req not in fm:
                fix = _resolve_frontmatter_from_path(path)
                issues.append(JanitorIssue(
                    issue_type="missing_frontmatter",
                    path=path,
                    field=req,
                    detail=f"Missing '{req}' in frontmatter",
                    fixable=bool(fix.get(req)),
                    fix_data=fix if fix.get(req) else {},
                ))
    return issues


def _check_orphans(graph: dict) -> list[JanitorIssue]:
    """Identify notes with zero incoming links."""
    if not graph.get("success"):
        return []

    nodes = graph.get("nodes") or []
    links = graph.get("links") or []

    # Build set of targets (notes that are linked TO)
    targets: set[str] = set()
    for link in links:
        targets.add(link.get("target", ""))

    issues: list[JanitorIssue] = []
    for node in nodes:
        name = node.get("id", "")
        folder = node.get("folder", "")
        if name and name not in targets:
            path = f"{folder}/{name}.md" if folder else f"{name}.md"
            issues.append(JanitorIssue(
                issue_type="orphan",
                path=path,
                detail=f"No incoming links to '{name}'",
            ))
    return issues


def _check_broken_links(
    paths: list[str],
    contents: dict[str, str],
    note_names: set[str],
) -> list[JanitorIssue]:
    """Detect [[wikilinks]] pointing to non-existent notes."""
    from obsidian_index import _parse_wikilinks

    note_names_lower = {n.lower() for n in note_names}
    issues: list[JanitorIssue] = []

    for path in paths:
        content = contents.get(path)
        if content is None:
            continue
        targets = _parse_wikilinks(content)
        for target in targets:
            if target.lower() not in note_names_lower:
                issues.append(JanitorIssue(
                    issue_type="broken_link",
                    path=path,
                    field=target,
                    detail=f"Link [[{target}]] points to non-existent note",
                ))
    return issues


def _check_casing(paths: list[str]) -> list[JanitorIssue]:
    """Detect folders with inconsistent casing (e.g. 'Study notes/' vs 'Study Notes/')."""
    folder_map: dict[str, list[str]] = {}
    for path in paths:
        parts = path.replace("\\", "/").split("/")
        for part in parts[:-1]:  # skip filename
            key = part.lower()
            if key not in folder_map:
                folder_map[key] = []
            if part not in folder_map[key]:
                folder_map[key].append(part)

    issues: list[JanitorIssue] = []
    for key, variants in folder_map.items():
        if len(variants) > 1:
            issues.append(JanitorIssue(
                issue_type="casing_mismatch",
                path=variants[0],
                detail=f"Folder casing conflict: {', '.join(sorted(variants))}",
            ))
    return issues


def _check_duplicates(contents: dict[str, str]) -> list[JanitorIssue]:
    """Detect notes with identical body content (by hash)."""
    hash_map: dict[str, list[str]] = {}
    for path, content in contents.items():
        # Strip frontmatter before hashing
        body = _FM_RE.sub("", content).strip()
        if not body:
            continue
        h = hashlib.md5(body.encode("utf-8")).hexdigest()
        if h not in hash_map:
            hash_map[h] = []
        hash_map[h].append(path)

    issues: list[JanitorIssue] = []
    for h, dupe_paths in hash_map.items():
        if len(dupe_paths) > 1:
            for p in dupe_paths[1:]:
                issues.append(JanitorIssue(
                    issue_type="duplicate",
                    path=p,
                    detail=f"Duplicate content with {dupe_paths[0]}",
                ))
    return issues


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scan_vault(
    folder: Optional[str] = None,
    checks: Optional[list[str]] = None,
) -> ScanResult:
    """Run selected checks on the vault, optionally scoped to a folder.

    Args:
        folder: Only scan notes under this folder prefix.
        checks: List of check names to run. Defaults to all.
    """
    from obsidian_index import get_vault_index, get_vault_graph, _get_note_content

    t0 = time.time()
    if checks:
        # Accept short names (e.g. "frontmatter" -> "missing_frontmatter")
        _ALIASES = {"frontmatter": "missing_frontmatter", "casing": "casing_mismatch"}
        checks_to_run = {_ALIASES.get(c, c) for c in checks}
    else:
        checks_to_run = set(ALL_CHECKS)

    index = get_vault_index(force_refresh=True)
    if not index.get("success"):
        return ScanResult(
            issues=[],
            notes_scanned=0,
            scan_time_ms=round((time.time() - t0) * 1000, 1),
            api_available=False,
        )

    all_paths: dict[str, str] = index.get("paths") or {}
    note_names: set[str] = set(all_paths.keys())

    # Filter by folder
    if folder:
        folder_norm = folder.replace("\\", "/").rstrip("/")
        filtered_paths = {
            name: path for name, path in all_paths.items()
            if path.replace("\\", "/").startswith(folder_norm)
        }
    else:
        filtered_paths = dict(all_paths)

    # Fetch contents for checks that need them
    needs_content = checks_to_run & {"missing_frontmatter", "broken_link", "duplicate"}
    contents: dict[str, str] = {}
    if needs_content:
        for name, path in filtered_paths.items():
            content = _get_note_content(path)
            if content is not None:
                contents[path] = content

    path_list = list(filtered_paths.values())
    issues: list[JanitorIssue] = []

    if "missing_frontmatter" in checks_to_run:
        issues.extend(_check_frontmatter(path_list, contents))

    if "orphan" in checks_to_run:
        graph = get_vault_graph(force_refresh=True)
        issues.extend(_check_orphans(graph))

    if "broken_link" in checks_to_run:
        issues.extend(_check_broken_links(path_list, contents, note_names))

    if "casing_mismatch" in checks_to_run:
        issues.extend(_check_casing(path_list))

    if "duplicate" in checks_to_run:
        issues.extend(_check_duplicates(contents))

    elapsed = round((time.time() - t0) * 1000, 1)
    return ScanResult(
        issues=issues,
        notes_scanned=len(filtered_paths),
        scan_time_ms=elapsed,
        api_available=True,
    )


def apply_fix(issue: JanitorIssue) -> dict:
    """Apply a single fix. Currently supports frontmatter fixes only."""
    if issue.issue_type != "missing_frontmatter":
        return {"success": False, "path": issue.path, "detail": "Not fixable"}
    if not issue.fix_data.get(issue.field):
        return {"success": False, "path": issue.path, "detail": f"No value for '{issue.field}'"}

    from dashboard.api_adapter import obsidian_get_file, obsidian_save_file

    note = obsidian_get_file(issue.path)
    if not note.get("success"):
        return {
            "success": False,
            "path": issue.path,
            "detail": f"Cannot read note: {note.get('error', 'unknown')}",
        }

    content = note.get("content", "")
    fm = _parse_frontmatter_fields(content)

    # Check if the field was already added (idempotent)
    if issue.field in fm:
        return {"success": True, "path": issue.path, "detail": "Already present"}

    fix_val = issue.fix_data.get(issue.field, "")
    if not fix_val:
        return {"success": False, "path": issue.path, "detail": "No fix value available"}

    new_line = f"{issue.field}: {fix_val}"

    fm_match = _FM_RE.match(content)
    if fm_match:
        # Insert new field before closing ---
        old_fm = fm_match.group(0)
        insertion = f"{new_line}\n---"
        updated_fm = old_fm[:-3] + insertion  # replace trailing ---
        updated = content.replace(old_fm, updated_fm, 1)
    else:
        # No frontmatter exists — prepend one
        updated = f"---\n{new_line}\n---\n{content}"

    save_result = obsidian_save_file(issue.path, updated)
    if save_result.get("success"):
        return {"success": True, "path": issue.path, "detail": f"Added {issue.field}={fix_val}"}
    return {
        "success": False,
        "path": issue.path,
        "detail": f"Save failed: {save_result.get('error', 'unknown')}",
    }


def apply_fixes(issues: list[JanitorIssue]) -> list[dict]:
    """Batch apply fixes."""
    return [apply_fix(issue) for issue in issues]


def enrich_links(path: str) -> dict:
    """Add wikilinks to a note via LLM-powered concept linking."""
    from dashboard.api_adapter import obsidian_get_file, obsidian_save_file
    from obsidian_merge import add_concept_links
    from obsidian_index import get_vault_index

    note = obsidian_get_file(path)
    if not note.get("success"):
        return {"success": False, "links_added": 0, "error": note.get("error")}

    content = note.get("content", "")
    index = get_vault_index()
    vault_notes = index.get("notes") or []

    enriched = add_concept_links(content, vault_index=vault_notes)
    if enriched == content:
        return {"success": True, "links_added": 0}

    # Count new links
    from obsidian_index import _parse_wikilinks
    old_links = set(_parse_wikilinks(content))
    new_links = set(_parse_wikilinks(enriched))
    added = len(new_links - old_links)

    save_result = obsidian_save_file(path, enriched)
    if save_result.get("success"):
        return {"success": True, "links_added": added}
    return {"success": False, "links_added": 0, "error": save_result.get("error")}
