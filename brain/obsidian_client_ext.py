"""Advanced Obsidian REST API methods (PATCH, typed reads, search, commands).

Implementation module — callers import from obsidian_client, not here.
ObsidianClient delegates to these functions via lazy imports.
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from obsidian_client import ObsidianClient

PatchOperation = Literal["append", "prepend", "replace"]
PatchTargetType = Literal["heading", "block", "frontmatter"]


# -- PATCH support -----------------------------------------------------------

def _patch_note(
    client: ObsidianClient,
    path: str,
    content: str,
    *,
    operation: PatchOperation = "replace",
    target_type: PatchTargetType = "heading",
    target: str,
    target_delimiter: str = "::",
) -> bool:
    """PATCH /vault/{path} with surgical edit headers."""
    encoded = urllib.request.pathname2url(path)
    try:
        client._request(
            "PATCH",
            f"/vault/{encoded}",
            data=content,
            content_type="text/markdown",
            extra_headers={
                "Operation": operation,
                "Target-Type": target_type,
                "Target": target,
                "Target-Delimiter": target_delimiter,
            },
        )
        return True
    except Exception:
        return False


# -- Typed reads -------------------------------------------------------------

def _read_note_rich(client: ObsidianClient, path: str) -> dict[str, Any]:
    """GET /vault/{path} with Accept: application/vnd.olrapi.note+json.

    Returns {content, frontmatter, tags, stat} or empty dict on error.
    """
    encoded = urllib.request.pathname2url(path)
    try:
        result = client._request(
            "GET", f"/vault/{encoded}",
            accept="application/vnd.olrapi.note+json",
        )
        return result if isinstance(result, dict) else {}
    except Exception:
        return {}


def _read_document_map(client: ObsidianClient, path: str) -> dict[str, Any]:
    """GET /vault/{path} with Accept: application/vnd.olrapi.document-map+json.

    Returns {headings, blocks, frontmatter_keys} or empty dict on error.
    """
    encoded = urllib.request.pathname2url(path)
    try:
        result = client._request(
            "GET", f"/vault/{encoded}",
            accept="application/vnd.olrapi.document-map+json",
        )
        return result if isinstance(result, dict) else {}
    except Exception:
        return {}


# -- Advanced search ---------------------------------------------------------

def _search_dql(
    client: ObsidianClient, dql: str, *, max_results: int = 10,
) -> list[dict]:
    """POST /search/ with Dataview DQL query. Returns results or [] on error."""
    try:
        result = client._request(
            "POST", "/search/",
            data=dql,
            content_type="application/vnd.olrapi.dataview.dql+txt",
        )
        if isinstance(result, list):
            return result[:max_results]
        return []
    except Exception:
        return []


def _search_jsonlogic(
    client: ObsidianClient, logic: dict, *, max_results: int = 10,
) -> list[dict]:
    """POST /search/ with JsonLogic query. Returns results or [] on error."""
    try:
        result = client._request(
            "POST", "/search/",
            data=logic,
            content_type="application/vnd.olrapi.jsonlogic+json",
        )
        if isinstance(result, list):
            return result[:max_results]
        return []
    except Exception:
        return []


# -- Periodic notes ----------------------------------------------------------

def _get_periodic_note(client: ObsidianClient, period: str) -> str:
    """GET /periodic/{period}/ — returns markdown content or "" on error."""
    try:
        return client._request(
            "GET", f"/periodic/{urllib.parse.quote(period, safe='')}/",
            accept="text/markdown",
        )
    except Exception:
        return ""


def _save_periodic_note(client: ObsidianClient, period: str, content: str) -> bool:
    """PUT /periodic/{period}/ — returns True on success."""
    try:
        client._request(
            "PUT", f"/periodic/{urllib.parse.quote(period, safe='')}/",
            data=content, content_type="text/markdown",
        )
        return True
    except Exception:
        return False


# -- Commands + Open ---------------------------------------------------------

def _list_commands(client: ObsidianClient) -> list[dict]:
    """GET /commands/ — returns [{id, name}] or [] on error."""
    try:
        result = client._request("GET", "/commands/")
        if isinstance(result, list):
            return result
        return []
    except Exception:
        return []


def _execute_command(client: ObsidianClient, command_id: str) -> bool:
    """POST /commands/{id}/ — returns True on success."""
    encoded = urllib.parse.quote(command_id, safe="")
    try:
        client._request("POST", f"/commands/{encoded}/")
        return True
    except Exception:
        return False


def _open_in_obsidian(
    client: ObsidianClient, path: str, *, new_leaf: bool = False,
) -> bool:
    """POST /open/{path} — opens the note in Obsidian. Returns True on success."""
    encoded = urllib.request.pathname2url(path)
    try:
        client._request(
            "POST", f"/open/{encoded}",
            extra_headers={"X-New-Leaf": "true"} if new_leaf else None,
        )
        return True
    except Exception:
        return False


# -- Active file -------------------------------------------------------------

def _get_active_file(client: ObsidianClient) -> str:
    """GET /active/ — returns markdown content of the active file or ""."""
    try:
        return client._request("GET", "/active/", accept="text/markdown")
    except Exception:
        return ""


def _get_active_file_rich(client: ObsidianClient) -> dict[str, Any]:
    """GET /active/ with note+json Accept. Returns rich dict or {} on error."""
    try:
        result = client._request(
            "GET", "/active/", accept="application/vnd.olrapi.note+json",
        )
        return result if isinstance(result, dict) else {}
    except Exception:
        return {}
