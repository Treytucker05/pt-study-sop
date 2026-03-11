"""Obsidian vault indexing and graph helpers."""

from __future__ import annotations

import json
import os
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

import yaml

_VAULT_INDEX_CACHE: Dict[str, Any] = {
    "data": None,
    "timestamp": None,
    "ttl_seconds": 300,
}

_GRAPH_CACHE: Dict[str, Any] = {
    "data": None,
    "timestamp": None,
    "ttl_seconds": 300,
}

OBSIDIAN_API_URL = os.environ.get("OBSIDIAN_API_URL", "https://127.0.0.1:27124")
_OBSIDIAN_FALLBACK_URLS = [
    "https://127.0.0.1:27124",
    "https://localhost:27124",
    "https://host.docker.internal:27124",
]

WIKILINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]")
_FM_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)


def _read_env_value(key: str) -> str:
    value = os.environ.get(key, "").strip()
    if value:
        return value
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return ""
    try:
        with open(env_path, "r", encoding="utf-8") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                env_key, env_value = line.split("=", 1)
                if env_key.strip() == key:
                    return env_value.strip().strip('"').strip("'")
    except Exception:
        return ""
    return ""


def _obsidian_api_urls() -> List[str]:
    urls: list[str] = []
    seen: set[str] = set()

    explicit_url = _read_env_value("OBSIDIAN_API_URL")
    extra_urls = _read_env_value("OBSIDIAN_API_URLS")
    candidates = [explicit_url, OBSIDIAN_API_URL, *_OBSIDIAN_FALLBACK_URLS]
    if extra_urls:
        candidates.extend([url.strip() for url in extra_urls.split(",") if url.strip()])

    for candidate in candidates:
        if not candidate:
            continue
        url = candidate.rstrip("/")
        if url not in seen:
            urls.append(url)
            seen.add(url)
    return urls


def _get_api_key() -> str:
    return _read_env_value("OBSIDIAN_API_KEY")


def _http_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _list_folder(folder: str) -> List[dict]:
    """List files/folders in a single Obsidian vault directory."""
    api_key = _get_api_key()
    if not api_key:
        return []

    folder_path = "/vault/"
    if folder:
        encoded_folder = urllib.parse.quote(str(folder).strip("/"), safe="/")
        folder_path = f"/vault/{encoded_folder}/"

    for base_url in _obsidian_api_urls():
        url = f"{base_url}{folder_path}"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, context=_http_context(), timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if isinstance(data, dict) and "files" in data:
                    return data["files"]
                if isinstance(data, list):
                    return data
                return []
        except Exception:
            continue
    return []


def _recursive_scan(
    folder: str,
    notes: Set[str],
    primary_paths: Dict[str, str],
    files: list[dict[str, str]],
    name_paths: Dict[str, list[str]],
) -> None:
    """Recursively scan vault folders and collect markdown notes."""
    items = _list_folder(folder)

    for item in items:
        if isinstance(item, str):
            path = item
        elif isinstance(item, dict):
            path = item.get("path", item.get("name", ""))
        else:
            continue

        if path.endswith("/"):
            folder_path = path.rstrip("/")
            full_path = f"{folder}/{folder_path}" if folder else folder_path
            _recursive_scan(full_path, notes, primary_paths, files, name_paths)
            continue

        if not path.endswith(".md"):
            continue

        full_path = f"{folder}/{path}" if folder else path
        note_name = path.rsplit("/", 1)[-1].replace(".md", "")
        notes.add(note_name)
        primary_paths.setdefault(note_name, full_path)
        files.append({"name": note_name, "path": full_path})
        name_paths.setdefault(note_name, []).append(full_path)


def _is_cache_valid(cache: Dict[str, Any]) -> bool:
    if not cache["data"] or not cache["timestamp"]:
        return False
    elapsed = (datetime.now() - cache["timestamp"]).total_seconds()
    return elapsed < cache["ttl_seconds"]


def get_vault_index(force_refresh: bool = False) -> dict:
    """
    Get complete vault index with file-level accounting.

    Returns:
        {
            "success": bool,
            "notes": list[str],            # unique note names
            "paths": dict[str, str],       # first path for each note name
            "files": [{"name": str, "path": str}],
            "count": int,                  # markdown file count
            "uniqueCount": int,            # unique note-name count
            "duplicateNames": {name: [paths...]},
            "cached": bool,
            "timestamp": str,
        }
    """
    if not force_refresh and _is_cache_valid(_VAULT_INDEX_CACHE):
        result = dict(_VAULT_INDEX_CACHE["data"])
        result["cached"] = True
        return result

    try:
        notes: Set[str] = set()
        primary_paths: Dict[str, str] = {}
        files: list[dict[str, str]] = []
        name_paths: Dict[str, list[str]] = {}
        _recursive_scan("", notes, primary_paths, files, name_paths)

        duplicate_names = {
            name: paths
            for name, paths in name_paths.items()
            if len(paths) > 1
        }

        result = {
            "success": True,
            "notes": sorted(notes),
            "paths": primary_paths,
            "files": files,
            "count": len(files),
            "uniqueCount": len(notes),
            "duplicateNames": duplicate_names,
            "cached": False,
            "timestamp": datetime.now().isoformat(),
        }

        _VAULT_INDEX_CACHE["data"] = result
        _VAULT_INDEX_CACHE["timestamp"] = datetime.now()
        return result

    except Exception as exc:
        return {
            "success": False,
            "notes": [],
            "paths": {},
            "files": [],
            "count": 0,
            "uniqueCount": 0,
            "duplicateNames": {},
            "cached": False,
            "timestamp": datetime.now().isoformat(),
            "error": str(exc),
        }


def clear_vault_cache() -> dict:
    """Clear vault index and graph caches."""
    _VAULT_INDEX_CACHE["data"] = None
    _VAULT_INDEX_CACHE["timestamp"] = None
    _GRAPH_CACHE["data"] = None
    _GRAPH_CACHE["timestamp"] = None
    return {"success": True, "message": "Vault index cache cleared"}


def _get_note_content(path: str) -> Optional[str]:
    """Fetch a single note's content via the Obsidian REST API."""
    api_key = _get_api_key()
    if not api_key:
        return None

    encoded = urllib.parse.quote(path, safe="/")
    for base_url in _obsidian_api_urls():
        url = f"{base_url}/vault/{encoded}"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "text/markdown",
            },
        )
        try:
            with urllib.request.urlopen(req, context=_http_context(), timeout=10) as resp:
                return resp.read().decode("utf-8")
        except Exception:
            continue
    return None


def _parse_wikilinks(content: str) -> List[str]:
    """Extract raw wikilink targets from markdown content."""
    return WIKILINK_RE.findall(content or "")


def _split_wikilink_target(target: str) -> tuple[str, str]:
    """Split a wikilink target into note target and optional anchor portion."""
    clean = str(target or "").strip()
    if "#" not in clean:
        return clean, ""
    note_target, anchor = clean.split("#", 1)
    return note_target.strip(), anchor.strip()


def _parse_frontmatter(content: str) -> dict[str, Any]:
    match = _FM_RE.match(content or "")
    if not match:
        return {}
    try:
        raw = yaml.safe_load(match.group(1))
    except yaml.YAMLError:
        return {}
    return raw if isinstance(raw, dict) else {}


def _extract_aliases(content: str) -> list[str]:
    frontmatter = _parse_frontmatter(content)
    raw_aliases = frontmatter.get("aliases")
    if isinstance(raw_aliases, list):
        return [str(alias).strip() for alias in raw_aliases if str(alias).strip()]
    if isinstance(raw_aliases, str) and raw_aliases.strip():
        return [raw_aliases.strip()]
    return []


def get_vault_graph(force_refresh: bool = False) -> dict:
    """
    Build a graph of vault notes and their wikilink connections.

    Links resolve through note names and YAML aliases. Heading and block
    anchors are treated as links to the owning note so valid note references
    are not marked as broken when an anchor is present.
    """
    if not force_refresh and _is_cache_valid(_GRAPH_CACHE):
        result = dict(_GRAPH_CACHE["data"])
        result["cached"] = True
        return result

    try:
        index = get_vault_index(force_refresh=force_refresh)
        if not index.get("success"):
            return {
                "success": False,
                "nodes": [],
                "links": [],
                "cached": False,
                "error": "Index failed",
            }

        files = list(index.get("files") or [])
        if not files:
            return {
                "success": True,
                "nodes": [],
                "links": [],
                "nodeCount": 0,
                "linkCount": 0,
                "cached": False,
            }

        note_lookup: dict[str, str] = {}
        alias_lookup: dict[str, str] = {}
        content_cache: dict[str, str] = {}
        nodes: list[dict[str, Any]] = []

        for item in files:
            path = str(item.get("path") or "")
            name = str(item.get("name") or "")
            if not path or not name:
                continue

            folder = path.rsplit("/", 1)[0] if "/" in path else ""
            nodes.append({"id": path, "name": name, "folder": folder, "path": path})
            note_lookup.setdefault(name.lower(), path)

            content = _get_note_content(path)
            if not content:
                continue
            content_cache[path] = content
            for alias in _extract_aliases(content):
                alias_lookup.setdefault(alias.lower(), path)

        links: list[dict[str, str]] = []
        seen_links: set[str] = set()

        for item in files:
            source_path = str(item.get("path") or "")
            source_name = str(item.get("name") or "")
            content = content_cache.get(source_path)
            if not source_path or not source_name or not content:
                continue

            for raw_target in _parse_wikilinks(content):
                note_target, _anchor = _split_wikilink_target(raw_target)
                if not note_target:
                    continue
                resolved_path = note_lookup.get(note_target.lower()) or alias_lookup.get(note_target.lower())
                if resolved_path and resolved_path != source_path:
                    key = f"{source_path}||{resolved_path}"
                    if key not in seen_links:
                        seen_links.add(key)
                        links.append({"source": source_path, "target": resolved_path})

        result = {
            "success": True,
            "nodes": nodes,
            "links": links,
            "nodeCount": len(nodes),
            "linkCount": len(links),
            "cached": False,
        }
        _GRAPH_CACHE["data"] = result
        _GRAPH_CACHE["timestamp"] = datetime.now()
        return result

    except Exception as exc:
        return {
            "success": False,
            "nodes": [],
            "links": [],
            "cached": False,
            "error": str(exc),
        }
