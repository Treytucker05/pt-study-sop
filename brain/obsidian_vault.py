"""Obsidian vault operations via official CLI (v1.12+).

Requires:
- Obsidian Desktop v1.12+ with CLI enabled
- Obsidian running (CLI uses IPC)
- ``obsidian`` command on PATH
"""

from __future__ import annotations

import json
import logging
import subprocess
import time
from typing import Any

log = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = 10
_EVAL_TIMEOUT = 15
_RETRY_MAX_ATTEMPTS = 3
_RETRY_BACKOFF_DELAYS = [1, 2]  # seconds between retries
_AVAILABILITY_CACHE_TTL = 30  # seconds


class ObsidianVault:
    """CLI-first interface to an Obsidian vault."""

    def __init__(self, vault_name: str = "Treys School") -> None:
        self.vault_name = vault_name
        self._available_cached: bool | None = None
        self._available_at: float = 0

    # -- Internal ---------------------------------------------------------

    @staticmethod
    def _kv_arg(name: str, value: str) -> str:
        """Build a CLI key/value arg without shell-style quoting."""
        return f"{name}={value}"

    def _run(
        self,
        args: list[str],
        *,
        timeout: int = _DEFAULT_TIMEOUT,
        parse_json: bool = False,
    ) -> Any:
        """Execute an obsidian CLI command and return stdout.

        Retries up to 3 times total on TimeoutExpired or non-zero exit code,
        with backoff delays of 1s and 2s between retries.
        """
        cmd = ["obsidian", self._kv_arg("vault", self.vault_name)] + args

        for attempt in range(_RETRY_MAX_ATTEMPTS):
            try:
                proc = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                )
                if proc.returncode != 0:
                    if attempt < _RETRY_MAX_ATTEMPTS - 1:
                        delay = _RETRY_BACKOFF_DELAYS[attempt]
                        log.debug(
                            "obsidian CLI error (exit %d), retrying in %ds: %s",
                            proc.returncode,
                            delay,
                            proc.stderr.strip(),
                        )
                        time.sleep(delay)
                        continue
                    log.warning(
                        "obsidian CLI error (exit %d) after %d attempts: %s",
                        proc.returncode,
                        _RETRY_MAX_ATTEMPTS,
                        proc.stderr.strip(),
                    )
                    return [] if parse_json else ""
                output = proc.stdout.strip()
                if parse_json:
                    return json.loads(output) if output else []
                return output
            except subprocess.TimeoutExpired:
                if attempt < _RETRY_MAX_ATTEMPTS - 1:
                    delay = _RETRY_BACKOFF_DELAYS[attempt]
                    log.debug(
                        "obsidian CLI timed out, retrying in %ds: %s",
                        delay,
                        " ".join(args[:2]),
                    )
                    time.sleep(delay)
                    continue
                log.warning(
                    "obsidian CLI timed out after %d attempts (timeout=%ds): %s",
                    _RETRY_MAX_ATTEMPTS,
                    timeout,
                    " ".join(args[:2]),
                )
                return [] if parse_json else ""
            except FileNotFoundError:
                log.warning("obsidian CLI not found on PATH")
                return [] if parse_json else ""
            except json.JSONDecodeError as exc:
                log.warning("obsidian CLI JSON parse error: %s", exc)
                return [] if parse_json else ""

        return [] if parse_json else ""

    def _eval(self, code: str, *, timeout: int = _EVAL_TIMEOUT) -> str:
        """Execute JavaScript in the Obsidian app context via ``obsidian eval``."""
        return self._run(["eval", self._kv_arg("code", code)], timeout=timeout)

    # -- Health -----------------------------------------------------------

    def is_available(self) -> bool:
        """Check if Obsidian CLI is reachable.

        Result is cached for 30 seconds to avoid repeated subprocess calls.
        """
        now = time.time()
        if (
            self._available_cached is not None
            and (now - self._available_at) < _AVAILABILITY_CACHE_TTL
        ):
            return self._available_cached

        try:
            proc = subprocess.run(
                ["obsidian", "version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            result = proc.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            result = False

        self._available_cached = result
        self._available_at = now
        return result

    def get_version(self) -> str:
        """Return Obsidian version string."""
        return self._run(["version"], timeout=5)

    # ── CRUD ────────────────────────────────────────────────

    def create_note(
        self,
        name: str,
        *,
        content: str = "",
        folder: str = "",
        template: str = "",
        silent: bool = True,
    ) -> str:
        """Create a new note. Returns CLI output."""
        args = ["create", self._kv_arg("name", name)]
        if content:
            args.append(self._kv_arg("content", content))
        if folder:
            args.append(self._kv_arg("path", f"{folder}/{name}.md"))
        if template:
            args.append(self._kv_arg("template", template))
        if silent:
            args.append("silent")
        return self._run(args)

    def read_note(self, file: str) -> str:
        """Read a note's content. Resolves like a wikilink."""
        return self._run(["read", self._kv_arg("file", file)])

    def append_note(self, file: str, content: str) -> str:
        """Append content to end of a note."""
        return self._run(
            ["append", self._kv_arg("file", file), self._kv_arg("content", content)]
        )

    def prepend_note(self, file: str, content: str) -> str:
        """Prepend content after frontmatter."""
        return self._run(
            ["prepend", self._kv_arg("file", file), self._kv_arg("content", content)]
        )

    def replace_content(self, file: str, new_content: str) -> str:
        """Replace entire file content via eval."""
        escaped = (
            new_content.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        )
        code = (
            f'const f = app.vault.getAbstractFileByPath("{file}");'
            f'if (f) await app.vault.modify(f, "{escaped}");'
        )
        return self._eval(code)

    def delete_note(self, path: str, *, permanent: bool = False) -> str:
        """Delete a note. Uses trash unless permanent=True."""
        args = ["delete", self._kv_arg("path", path)]
        if permanent:
            args.append("permanent")
        return self._run(args)

    # ── Search & Discovery ──────────────────────────────────

    def search(self, query: str, *, limit: int = 10) -> list[dict]:
        """Full-text search via Obsidian's index."""
        return self._run(
            ["search", self._kv_arg("query", query), f"limit={limit}", "format=json"],
            parse_json=True,
        )

    def list_files(self, folder: str = "", *, format: str = "json") -> list[dict]:
        """List files in the vault or a specific folder."""
        args = ["files", f"format={format}"]
        if folder:
            args.append(self._kv_arg("path", folder))
        return self._run(args, parse_json=True)

    def list_folders(self) -> list[dict]:
        """List all folders in the vault."""
        return self._run(["folders", "format=json"], parse_json=True)

    def get_file_info(self, file: str) -> dict:
        """Get metadata for a single file."""
        result = self._run(
            ["file", self._kv_arg("file", file), "format=json"],
            parse_json=True,
        )
        return result if isinstance(result, dict) else {}

    def get_backlinks(self, file: str) -> list[dict]:
        """Get files that link to this note."""
        return self._run(
            ["backlinks", self._kv_arg("file", file), "format=json"],
            parse_json=True,
        )

    def get_links(self, file: str) -> list[dict]:
        """Get outgoing links from this note."""
        return self._run(
            ["links", self._kv_arg("file", file), "format=json"],
            parse_json=True,
        )

    def get_orphans(self) -> list[dict]:
        """Find notes with no incoming links."""
        return self._run(["orphans", "format=json"], parse_json=True)

    def get_unresolved(self) -> list[dict]:
        """Find broken/unresolved links."""
        return self._run(["unresolved", "format=json"], parse_json=True)

    def get_tags(self, *, sort: str = "count") -> list[dict]:
        """List all tags in the vault."""
        return self._run(
            ["tags", f"sort={sort}", "counts", "format=json"], parse_json=True
        )

    # ── Surgical Edit ───────────────────────────────────────

    def set_property(self, file: str, key: str, value: str) -> str:
        """Set a frontmatter property on a note."""
        return self._run(
            [
                "property:set",
                self._kv_arg("name", key),
                self._kv_arg("value", value),
                self._kv_arg("file", file),
            ]
        )

    def remove_property(self, file: str, key: str) -> str:
        """Remove a frontmatter property from a note."""
        return self._run(
            ["property:remove", self._kv_arg("name", key), self._kv_arg("file", file)]
        )

    def replace_section(self, file: str, heading: str, content: str) -> str:
        """Replace content under a heading using vault.process() via eval."""
        escaped_content = (
            content.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        )
        escaped_heading = heading.replace('"', '\\"')
        level = heading.count("#")
        heading_text = heading.lstrip("# ").strip()
        code = (
            f'const f = app.vault.getFileByPath("{file}");'
            f'if (!f) throw new Error("File not found: {file}");'
            f"const cache = app.metadataCache.getFileCache(f);"
            f"const headings = cache?.headings || [];"
            f"let startIdx = -1; let endIdx = -1;"
            f"for (let i = 0; i < headings.length; i++) {{"
            f'  if (headings[i].heading === "{heading_text}" && headings[i].level === {level}) {{'
            f"    startIdx = headings[i].position.end.offset + 1;"
            f"    for (let j = i + 1; j < headings.length; j++) {{"
            f"      if (headings[j].level <= {level}) {{ endIdx = headings[j].position.start.offset; break; }}"
            f"    }}"
            f"    break;"
            f"  }}"
            f"}}"
            f'if (startIdx === -1) throw new Error("Heading not found");'
            f"await app.vault.process(f, (data) => {{"
            f"  const before = data.substring(0, startIdx);"
            f'  const after = endIdx === -1 ? "" : data.substring(endIdx);'
            f'  return before + "\\n{escaped_content}\\n" + after;'
            f"}});"
        )
        return self._eval(code)

    # ── Organize ────────────────────────────────────────────

    def move_note(self, path: str, *, new_name: str = "", new_folder: str = "") -> str:
        """Move or rename a note."""
        args = ["move", self._kv_arg("path", path)]
        if new_name:
            args.append(self._kv_arg("name", new_name))
        if new_folder:
            args.append(self._kv_arg("folder", new_folder))
        return self._run(args)

    def create_folder(self, path: str) -> str:
        """Create a folder in the vault via eval."""
        return self._eval(f'await app.vault.createFolder("{path}")')

    def copy_note(self, file: str, new_path: str) -> str:
        """Copy a note to a new path via eval."""
        code = (
            f'const f = app.vault.getFileByPath("{file}");'
            f'if (f) await app.vault.copy(f, "{new_path}");'
        )
        return self._eval(code)

    # ── Metadata ────────────────────────────────────────────

    def get_headings(self, file: str) -> list[dict]:
        """Get the heading structure of a file via metadataCache."""
        code = (
            f'const f = app.vault.getFileByPath("{file}");'
            f"const cache = f ? app.metadataCache.getFileCache(f) : null;"
            f"JSON.stringify(cache?.headings || []);"
        )
        result = self._eval(code)
        try:
            return json.loads(result) if result else []
        except json.JSONDecodeError:
            return []

    def get_tasks(self, *, filter: str = "") -> list[dict]:
        """List tasks in the vault."""
        args = ["tasks", "format=json"]
        if filter:
            args.append(filter)
        return self._run(args, parse_json=True)

    # ── Daily Note ──────────────────────────────────────────

    def daily_read(self) -> dict:
        """Read today's daily note. Returns parsed JSON dict."""
        result = self._run(["daily:read", "format=json"], parse_json=True)
        return result if isinstance(result, dict) else {}

    def daily_append(self, content: str) -> str:
        """Append content to today's daily note."""
        return self._run(["daily:append", self._kv_arg("content", content)])

    # ── Templates ───────────────────────────────────────────

    def insert_template(self, file: str, template: str) -> str:
        """Insert a template into a file."""
        return self._run(
            [
                "template:insert",
                self._kv_arg("file", file),
                self._kv_arg("template", template),
            ]
        )

    # ── Outline ─────────────────────────────────────────────

    def get_outline(self, file: str) -> list[dict]:
        """Return the outline (headings) of a file as JSON."""
        return self._run(
            ["outline", self._kv_arg("file", file), "format=json"],
            parse_json=True,
        )

    # ── Property Read ────────────────────────────────────────

    def read_property(self, file: str, name: str) -> str:
        """Read a frontmatter property from a file."""
        return self._run(
            ["property:read", self._kv_arg("name", name), self._kv_arg("file", file)]
        )
