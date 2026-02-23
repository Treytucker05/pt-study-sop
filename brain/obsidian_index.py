"""
Obsidian vault indexing for intelligent wikilink generation.
Recursive vault scanning with 5-minute in-memory cache.
"""

import json
import os
import re
import ssl
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime
from typing import Dict, List, Optional, Set

# Cache state
_VAULT_INDEX_CACHE: Dict = {
    "data": None,
    "timestamp": None,
    "ttl_seconds": 300,  # 5 minutes
}

OBSIDIAN_API_URL = os.environ.get("OBSIDIAN_API_URL", "https://127.0.0.1:27124")
_OBSIDIAN_FALLBACK_URLS = [
    "https://127.0.0.1:27124",
    "https://localhost:27124",
    "https://host.docker.internal:27124",
]


def _read_env_value(key: str) -> str:
    value = os.environ.get(key, "").strip()
    if value:
        return value
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return ""
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if k.strip() == key:
                    return v.strip().strip('"').strip("'")
    except Exception:
        return ""
    return ""


def _obsidian_api_urls() -> List[str]:
    urls = []
    seen = set()

    explicit_url = _read_env_value("OBSIDIAN_API_URL")
    extra_urls = _read_env_value("OBSIDIAN_API_URLS")

    candidates = [explicit_url, OBSIDIAN_API_URL] + _OBSIDIAN_FALLBACK_URLS
    if extra_urls:
        candidates.extend([u.strip() for u in extra_urls.split(",") if u.strip()])

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


def _list_folder(folder: str) -> List[dict]:
    """List files/folders in a single Obsidian vault directory."""
    api_key = _get_api_key()
    if not api_key:
        return []

    folder_path = "/vault/"
    if folder:
        encoded_folder = urllib.parse.quote(str(folder).strip("/"), safe="/")
        folder_path = f"/vault/{encoded_folder}/"

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

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
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if isinstance(data, dict) and "files" in data:
                    return data["files"]
                if isinstance(data, list):
                    return data
                return []
        except Exception:
            continue
    return []


def _recursive_scan(folder: str, notes: Set[str], paths: Dict[str, str]) -> None:
    """Recursively scan vault folders and collect markdown note names."""
    items = _list_folder(folder)

    for item in items:
        # Handle both string paths and object formats
        if isinstance(item, str):
            path = item
        elif isinstance(item, dict):
            path = item.get("path", item.get("name", ""))
        else:
            continue

        if path.endswith("/"):
            # Folder — recurse
            folder_path = path.rstrip("/")
            full_path = f"{folder}/{folder_path}" if folder else folder_path
            _recursive_scan(full_path, notes, paths)
        elif path.endswith(".md"):
            # Markdown file — extract note name
            full_path = f"{folder}/{path}" if folder else path
            note_name = path.rsplit("/", 1)[-1].replace(".md", "")
            notes.add(note_name)
            paths[note_name] = full_path


def _is_cache_valid() -> bool:
    if not _VAULT_INDEX_CACHE["data"] or not _VAULT_INDEX_CACHE["timestamp"]:
        return False
    elapsed = (datetime.now() - _VAULT_INDEX_CACHE["timestamp"]).total_seconds()
    return elapsed < _VAULT_INDEX_CACHE["ttl_seconds"]


def get_vault_index(force_refresh: bool = False) -> dict:
    """
    Get complete vault index (all markdown note names).

    Returns:
        {
            "success": bool,
            "notes": list[str],       # Note names without .md
            "paths": dict[str, str],   # Note name -> full path
            "count": int,
            "cached": bool,
            "timestamp": str,
        }
    """
    if not force_refresh and _is_cache_valid():
        result = dict(_VAULT_INDEX_CACHE["data"])
        result["cached"] = True
        return result

    try:
        notes: Set[str] = set()
        paths: Dict[str, str] = {}
        _recursive_scan("", notes, paths)

        result = {
            "success": True,
            "notes": sorted(notes),
            "paths": paths,
            "count": len(notes),
            "cached": False,
            "timestamp": datetime.now().isoformat(),
        }

        _VAULT_INDEX_CACHE["data"] = result
        _VAULT_INDEX_CACHE["timestamp"] = datetime.now()
        return result

    except Exception as e:
        return {
            "success": False,
            "notes": [],
            "paths": {},
            "count": 0,
            "cached": False,
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
        }


def clear_vault_cache() -> dict:
    """Clear vault index cache."""
    _VAULT_INDEX_CACHE["data"] = None
    _VAULT_INDEX_CACHE["timestamp"] = None
    _GRAPH_CACHE["data"] = None
    _GRAPH_CACHE["timestamp"] = None
    return {"success": True, "message": "Vault index cache cleared"}


# --- Graph building ---

WIKILINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]")

_GRAPH_CACHE: Dict = {
    "data": None,
    "timestamp": None,
    "ttl_seconds": 300,
}


def _get_note_content(path: str) -> Optional[str]:
    """Fetch a single note's content via Obsidian REST API."""
    api_key = _get_api_key()
    if not api_key:
        return None

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    encoded = urllib.parse.quote(path, safe="/")
    for base_url in _obsidian_api_urls():
        url = f"{base_url}/vault/{encoded}"
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "text/markdown",
        })
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                return resp.read().decode("utf-8")
        except Exception:
            continue
    return None


def _parse_wikilinks(content: str) -> List[str]:
    """Extract wikilink targets from markdown content."""
    return WIKILINK_RE.findall(content)


def get_vault_graph(force_refresh: bool = False) -> dict:
    """
    Build a graph of vault notes and their wikilink connections.

    Returns:
        {
            "success": bool,
            "nodes": [{"id": str, "name": str, "folder": str}],
            "links": [{"source": str, "target": str}],
            "cached": bool,
        }
    """
    if not force_refresh and _GRAPH_CACHE["data"] and _GRAPH_CACHE["timestamp"]:
        elapsed = (datetime.now() - _GRAPH_CACHE["timestamp"]).total_seconds()
        if elapsed < _GRAPH_CACHE["ttl_seconds"]:
            result = dict(_GRAPH_CACHE["data"])
            result["cached"] = True
            return result

    try:
        index = get_vault_index(force_refresh=force_refresh)
        if not index.get("success"):
            return {"success": False, "nodes": [], "links": [], "cached": False, "error": "Index failed"}

        paths = index["paths"]
        note_names_lower = {n.lower(): n for n in paths}

        nodes = []
        links = []
        seen_links: Set[str] = set()

        for name, path in paths.items():
            folder = path.rsplit("/", 1)[0] if "/" in path else ""
            nodes.append({"id": name, "name": name, "folder": folder})

            content = _get_note_content(path)
            if not content:
                continue

            targets = _parse_wikilinks(content)
            for target in targets:
                resolved = note_names_lower.get(target.lower())
                if resolved and resolved != name:
                    key = f"{name}||{resolved}"
                    if key not in seen_links:
                        seen_links.add(key)
                        links.append({"source": name, "target": resolved})

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

    except Exception as e:
        return {"success": False, "nodes": [], "links": [], "cached": False, "error": str(e)}
