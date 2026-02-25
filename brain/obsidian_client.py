"""Unified Obsidian Local REST API client.

Replaces transport duplication across obsidian_index.py, api_adapter.py,
and obsidian_merge.py with a single, testable HTTP client.
"""
from __future__ import annotations

import json
import logging
import os
import ssl
import urllib.error
import urllib.request
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _read_env_key(key: str) -> str:
    """Read from os.environ, fallback to brain/.env."""
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
        pass
    return ""


class ObsidianClient:
    """HTTP client for the Obsidian Local REST API plugin.

    Usage::

        client = ObsidianClient()
        hits = client.search("brachial plexus", max_results=5)
        content = client.read_note("Neuro/Week5/notes.md")
        files = client.list_folder("Neuro/Week5")
    """

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 10,
    ) -> None:
        self.api_key = api_key or _read_env_key("OBSIDIAN_API_KEY")
        self.base_url = (
            base_url
            or _read_env_key("OBSIDIAN_API_URL")
            or "https://127.0.0.1:27124"
        ).rstrip("/")
        self.timeout = timeout
        self._ssl_ctx = ssl.create_default_context()
        self._ssl_ctx.check_hostname = False
        self._ssl_ctx.verify_mode = ssl.CERT_NONE

    def _request(
        self,
        method: str,
        path: str,
        *,
        data: Optional[dict | str] = None,
        accept: str = "application/json",
    ) -> Any:
        """Make an HTTP request to Obsidian REST API."""
        url = f"{self.base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": accept,
        }

        body = None
        if data is not None:
            if isinstance(data, dict):
                body = json.dumps(data).encode("utf-8")
                headers["Content-Type"] = "application/json"
            else:
                body = data.encode("utf-8")
                headers["Content-Type"] = "text/plain"

        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(
                req, timeout=self.timeout, context=self._ssl_ctx
            ) as resp:
                raw = resp.read().decode("utf-8")
                content_type = resp.headers.get("Content-Type", "")
                if "application/json" in content_type:
                    return json.loads(raw)
                return raw
        except urllib.error.HTTPError as e:
            logger.warning("Obsidian API %s %s -> %d", method, path, e.code)
            raise
        except urllib.error.URLError as e:
            logger.warning("Obsidian API unreachable: %s", e.reason)
            raise

    def search(self, query: str, *, max_results: int = 10) -> list[dict]:
        """Search vault using POST /search/simple/.

        Returns a list of dicts with keys: path, content, score.
        On any error, returns an empty list (never raises).
        """
        try:
            raw = self._request(
                "POST", "/search/simple/", data=query, accept="application/json"
            )
            if not isinstance(raw, list):
                return []
            results: list[dict] = []
            for item in raw[:max_results]:
                filename = item.get("filename", "")
                matches = item.get("matches", [])
                content_parts: list[str] = []
                for m in matches:
                    match_data = m.get("match", m.get("matches", {}))
                    if isinstance(match_data, dict):
                        content_parts.append(match_data.get("content", ""))
                    elif isinstance(match_data, str):
                        content_parts.append(match_data)
                results.append(
                    {
                        "path": filename,
                        "content": "\n".join(p for p in content_parts if p),
                        "score": item.get("score", 0),
                    }
                )
            return results
        except Exception as e:
            logger.warning("Obsidian search failed: %s", e)
            return []

    def read_note(self, path: str) -> str:
        """Read a single note's content via GET /vault/{path}.

        Returns the markdown content as a string, or empty string on error.
        """
        encoded = urllib.request.pathname2url(path)
        try:
            return self._request("GET", f"/vault/{encoded}", accept="text/markdown")
        except Exception:
            return ""

    def list_folder(self, folder: str = "/") -> list[str]:
        """List files in a vault folder via GET /vault/{folder}/.

        Returns a list of file paths, or empty list on error.
        """
        encoded = urllib.request.pathname2url(folder.rstrip("/"))
        try:
            result = self._request("GET", f"/vault/{encoded}/")
            if isinstance(result, dict):
                return result.get("files", [])
            return []
        except Exception:
            return []
