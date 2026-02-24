"""Flask blueprint for Vault Janitor endpoints."""
from __future__ import annotations

import logging
from flask import Blueprint, jsonify, request

from vault_janitor import (
    JanitorIssue,
    scan_vault,
    apply_fix,
    apply_fixes,
    batch_fix,
    enrich_links,
    ai_resolve,
    ai_apply,
)

_LOG = logging.getLogger(__name__)

janitor_bp = Blueprint("janitor", __name__, url_prefix="/api/janitor")


@janitor_bp.route("/health", methods=["GET"])
def janitor_health():
    """Quick health check — run a full scan and return issue counts."""
    try:
        result = scan_vault()
    except Exception as exc:
        _LOG.warning("janitor health scan failed: %s", exc)
        return jsonify({"available": False, "error": str(exc)}), 500

    counts: dict[str, int] = {}
    for issue in result.issues:
        counts[issue.issue_type] = counts.get(issue.issue_type, 0) + 1

    return jsonify({
        "available": result.api_available,
        "notes_scanned": result.notes_scanned,
        "total_issues": len(result.issues),
        "counts": counts,
        "scan_time_ms": result.scan_time_ms,
    })


@janitor_bp.route("/scan", methods=["POST"])
def janitor_scan():
    """Full scan with optional folder + check filters."""
    body = request.get_json(silent=True) or {}
    folder = body.get("folder")
    checks = body.get("checks")

    try:
        result = scan_vault(folder=folder, checks=checks)
    except Exception as exc:
        _LOG.warning("janitor scan failed: %s", exc)
        return jsonify({"available": False, "error": str(exc)}), 500

    return jsonify({
        "available": result.api_available,
        "notes_scanned": result.notes_scanned,
        "scan_time_ms": result.scan_time_ms,
        "issues": [
            {
                "issue_type": i.issue_type,
                "path": i.path,
                "field": i.field,
                "detail": i.detail,
                "fixable": i.fixable,
                "fix_data": i.fix_data,
            }
            for i in result.issues
        ],
    })


@janitor_bp.route("/fix", methods=["POST"])
def janitor_fix():
    """Apply fixes for the provided issues."""
    body = request.get_json(silent=True) or {}
    raw_issues = body.get("issues") or []

    issues = [
        JanitorIssue(
            issue_type=item.get("issue_type", ""),
            path=item.get("path", ""),
            field=item.get("field", ""),
            detail=item.get("detail", ""),
            fixable=item.get("fixable", False),
            fix_data=item.get("fix_data") or {},
        )
        for item in raw_issues
        if isinstance(item, dict)
    ]

    results = apply_fixes(issues)
    return jsonify({"results": results})


@janitor_bp.route("/options", methods=["GET"])
def janitor_options():
    """Return valid dropdown values for manual frontmatter fix."""
    import config
    from course_map import load_course_map
    from vault_janitor import _NOTE_TYPE_PATTERNS

    course_list: list[str] = config.SESSION_SCHEMA.get("course", {}).get("options", [])

    cmap = load_course_map()
    course_code_map: dict[str, str] = {}
    unit_types: set[str] = set()
    for c in cmap.courses:
        course_code_map[c.label] = c.code
        unit_types.add(c.unit_type)

    note_types: list[str] = sorted({nt for _, nt in _NOTE_TYPE_PATTERNS})

    return jsonify({
        "course": course_list,
        "course_code": course_code_map,
        "unit_type": sorted(unit_types),
        "note_type": note_types,
    })


@janitor_bp.route("/batch-fix", methods=["POST"])
def janitor_batch_fix():
    """Scan and auto-fix all fixable issues in one pass."""
    body = request.get_json(silent=True) or {}
    folder = body.get("folder")
    checks = body.get("checks")
    max_batch = min(body.get("max_batch", 50), 200)

    try:
        result = batch_fix(folder=folder, checks=checks, max_batch=max_batch)
    except Exception as exc:
        _LOG.warning("janitor batch-fix failed: %s", exc)
        return jsonify({"error": str(exc)}), 500

    return jsonify(result)


@janitor_bp.route("/enrich", methods=["POST"])
def janitor_enrich():
    """Add wikilinks to a note via LLM concept linking."""
    body = request.get_json(silent=True) or {}
    path = body.get("path", "")
    if not path:
        return jsonify({"success": False, "error": "path is required"}), 400

    try:
        result = enrich_links(path)
    except Exception as exc:
        _LOG.warning("janitor enrich failed: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500

    return jsonify(result)


@janitor_bp.route("/ai-resolve", methods=["POST"])
def janitor_ai_resolve():
    """AI-powered issue resolution — returns a suggestion for user review."""
    body = request.get_json(silent=True) or {}
    path = body.get("path", "")
    issue_type = body.get("issue_type", "")
    context = body.get("context")

    if not path:
        return jsonify({"success": False, "error": "path is required"}), 400
    if not issue_type:
        return jsonify({"success": False, "error": "issue_type is required"}), 400

    try:
        result = ai_resolve(path, issue_type, context)
    except Exception as exc:
        _LOG.warning("janitor ai-resolve failed: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500

    return jsonify(result)


@janitor_bp.route("/ai-apply", methods=["POST"])
def janitor_ai_apply():
    """Apply a confirmed AI suggestion."""
    body = request.get_json(silent=True) or {}
    path = body.get("path", "")
    apply_action = body.get("apply_action", "")
    suggestion = body.get("suggestion") or {}

    if not path:
        return jsonify({"success": False, "detail": "path is required"}), 400
    if not apply_action:
        return jsonify({"success": False, "detail": "apply_action is required"}), 400

    try:
        result = ai_apply(path, apply_action, suggestion)
    except Exception as exc:
        _LOG.warning("janitor ai-apply failed: %s", exc)
        return jsonify({"success": False, "detail": str(exc)}), 500

    return jsonify(result)


@janitor_bp.route("/batch-enrich", methods=["POST"])
def janitor_batch_enrich():
    """Batch-enrich wikilinks across multiple notes."""
    body = request.get_json(silent=True) or {}
    paths = body.get("paths") or []
    folder = body.get("folder")
    max_batch = min(body.get("max_batch", 20), 50)

    # If no explicit paths, resolve from folder or full vault
    if not paths:
        from obsidian_index import get_vault_index, _get_note_content, _parse_wikilinks

        index = get_vault_index()
        all_paths = index.get("paths") or {}

        if folder:
            folder_norm = folder.replace("\\", "/").rstrip("/")
            candidates = [
                p for p in all_paths.values()
                if p.replace("\\", "/").startswith(folder_norm)
            ]
        else:
            candidates = list(all_paths.values())

        # Skip notes with 5+ existing wikilinks
        for cpath in candidates:
            if len(paths) >= max_batch:
                break
            content = _get_note_content(cpath)
            if content is None:
                continue
            links = _parse_wikilinks(content)
            if len(links) < 5:
                paths.append(cpath)

    paths = paths[:max_batch]
    results: list[dict] = []
    total_added = 0

    for note_path in paths:
        try:
            r = enrich_links(note_path)
            added = r.get("links_added", 0)
            total_added += added
            results.append({"path": note_path, "links_added": added})
        except Exception as exc:
            _LOG.warning("batch-enrich failed for %s: %s", note_path, exc)
            results.append({"path": note_path, "links_added": 0, "error": str(exc)})

    return jsonify({
        "total_processed": len(results),
        "total_links_added": total_added,
        "results": results,
    })
