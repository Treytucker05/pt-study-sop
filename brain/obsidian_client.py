"""Unified Obsidian Local REST API client.

Replaces transport duplication across obsidian_index.py, api_adapter.py,
and obsidian_merge.py with a single, testable HTTP client.
"""
from __future__ import annotations

import json
import logging
import os
import pathlib
import ssl
import urllib.error
import urllib.parse
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
        vault_path: Optional[str] = None,
        timeout: int = 10,
    ) -> None:
        self.api_key = api_key or _read_env_key("OBSIDIAN_API_KEY")
        self.base_url = (
            base_url
            or _read_env_key("OBSIDIAN_API_URL")
            or "http://127.0.0.1:27123"
        ).rstrip("/")
        self.vault_path: Optional[str] = (
            vault_path
            or _read_env_key("OBSIDIAN_VAULT_PATH")
            or _read_env_key("OBSIDIAN_VAULT_FS_PATH")
            or r"C:\Users\treyt\Desktop\Treys School"
        )
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
        content_type: Optional[str] = None,
        extra_headers: Optional[dict[str, str]] = None,
    ) -> Any:
        """Make an HTTP request to Obsidian REST API."""
        url = f"{self.base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": accept,
        }
        if extra_headers:
            headers.update(extra_headers)

        body = None
        if data is not None:
            if content_type:
                headers["Content-Type"] = content_type
                if isinstance(data, str):
                    body = data.encode("utf-8")
                else:
                    body = json.dumps(data).encode("utf-8")
            elif isinstance(data, dict):
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
                resp_ct = resp.headers.get("Content-Type", "")
                if "application/json" in resp_ct:
                    return json.loads(raw)
                return raw
        except urllib.error.HTTPError as e:
            logger.warning("Obsidian API %s %s -> %d", method, path, e.code)
            raise
        except urllib.error.URLError as e:
            logger.warning("Obsidian API unreachable: %s", e.reason)
            raise

    def _fs_read(self, note_path: str) -> str:
        """Read a note directly from the vault filesystem. Returns "" on any error."""
        if not self.vault_path:
            return ""
        try:
            full = pathlib.Path(self.vault_path) / note_path
            return full.read_text(encoding="utf-8")
        except Exception:
            return ""

    def search(self, query: str, *, max_results: int = 10) -> list[dict]:
        """Search vault using POST /search/simple/.

        Returns a list of dicts with keys: path, content, score.
        On any error, returns an empty list (never raises).
        """
        try:
            # Local REST API v3.4+ expects ?query=... in URL, not request body.
            # Keep a legacy body fallback for older plugin behavior.
            encoded_query = urllib.parse.quote(query or "", safe="")
            try:
                raw = self._request(
                    "POST",
                    f"/search/simple/?query={encoded_query}",
                    accept="application/json",
                )
            except Exception:
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

        Falls back to direct filesystem read when the API is unreachable.
        Returns the markdown content as a string, or empty string on error.
        """
        encoded = urllib.request.pathname2url(path)
        try:
            return self._request("GET", f"/vault/{encoded}", accept="text/markdown")
        except Exception:
            return self._fs_read(path)

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

    def write_note(self, path: str, content: str) -> bool:
        """Create or overwrite a note via PUT /vault/{path}. Returns True on success."""
        encoded = urllib.request.pathname2url(path)
        try:
            self._request(
                "PUT", f"/vault/{encoded}", data=content, content_type="text/markdown",
            )
            return True
        except Exception:
            return False

    def append_note(self, path: str, content: str) -> bool:
        """Append content to a note via POST /vault/{path}. Returns True on success."""
        encoded = urllib.request.pathname2url(path)
        try:
            self._request(
                "POST", f"/vault/{encoded}", data=content, content_type="text/markdown",
            )
            return True
        except Exception:
            return False

    def delete_note(self, path: str) -> bool:
        """Delete a note via DELETE /vault/{path}. Returns True on success."""
        encoded = urllib.request.pathname2url(path)
        try:
            self._request("DELETE", f"/vault/{encoded}")
            return True
        except Exception:
            return False

    def health_check(self) -> bool:
        """Check if Obsidian API is reachable via GET /. Returns True if up."""
        try:
            self._request("GET", "/")
            return True
        except Exception:
            return False

    # -- Delegation stubs (implementations in obsidian_client_ext.py) --------

    def patch_note(
        self,
        path: str,
        content: str,
        *,
        operation: str = "replace",
        target_type: str = "heading",
        target: str,
        target_delimiter: str = "::",
    ) -> bool:
        """PATCH /vault/{path} — surgical edit by heading/block/frontmatter."""
        from obsidian_client_ext import _patch_note
        return _patch_note(
            self, path, content,
            operation=operation, target_type=target_type,
            target=target, target_delimiter=target_delimiter,
        )

    def read_note_rich(self, path: str) -> dict:
        """GET /vault/{path} as application/vnd.olrapi.note+json."""
        from obsidian_client_ext import _read_note_rich
        return _read_note_rich(self, path)

    def read_document_map(self, path: str) -> dict:
        """GET /vault/{path} as application/vnd.olrapi.document-map+json."""
        from obsidian_client_ext import _read_document_map
        return _read_document_map(self, path)

    def search_dql(self, dql: str, *, max_results: int = 10) -> list[dict]:
        """POST /search/ with Dataview DQL query."""
        from obsidian_client_ext import _search_dql
        return _search_dql(self, dql, max_results=max_results)

    def search_jsonlogic(self, logic: dict, *, max_results: int = 10) -> list[dict]:
        """POST /search/ with JsonLogic query."""
        from obsidian_client_ext import _search_jsonlogic
        return _search_jsonlogic(self, logic, max_results=max_results)

    def get_periodic_note(self, period: str) -> str:
        """GET /periodic/{period}/ — returns markdown content."""
        from obsidian_client_ext import _get_periodic_note
        return _get_periodic_note(self, period)

    def save_periodic_note(self, period: str, content: str) -> bool:
        """PUT /periodic/{period}/ — returns True on success."""
        from obsidian_client_ext import _save_periodic_note
        return _save_periodic_note(self, period, content)

    def list_commands(self) -> list[dict]:
        """GET /commands/ — returns [{id, name}]."""
        from obsidian_client_ext import _list_commands
        return _list_commands(self)

    def execute_command(self, command_id: str) -> bool:
        """POST /commands/{id}/ — returns True on success."""
        from obsidian_client_ext import _execute_command
        return _execute_command(self, command_id)

    def open_in_obsidian(self, path: str, *, new_leaf: bool = False) -> bool:
        """POST /open/{path} — opens the note in Obsidian."""
        from obsidian_client_ext import _open_in_obsidian
        return _open_in_obsidian(self, path, new_leaf=new_leaf)

    def get_active_file(self) -> str:
        """GET /active/ — returns markdown content of the active file."""
        from obsidian_client_ext import _get_active_file
        return _get_active_file(self)

    def get_active_file_rich(self) -> dict:
        """GET /active/ as application/vnd.olrapi.note+json."""
        from obsidian_client_ext import _get_active_file_rich
        return _get_active_file_rich(self)
