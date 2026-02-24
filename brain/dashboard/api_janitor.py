"""Flask blueprint for Vault Janitor endpoints."""
from __future__ import annotations

import logging
from flask import Blueprint, jsonify, request

from vault_janitor import (
    JanitorIssue,
    scan_vault,
    apply_fix,
    apply_fixes,
    enrich_links,
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
