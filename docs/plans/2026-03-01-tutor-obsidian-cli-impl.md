# Tutor Obsidian CLI Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the REST API Obsidian client with a CLI-only vault module, add artifact commands so the tutor LLM can write to Obsidian, and wire scaffolding + instructions into the session flow.

**Architecture:** New `ObsidianVault` class wraps the official Obsidian CLI (v1.12+) via `subprocess.run`. The tutor LLM emits `:::vault:*:::` artifact commands in its responses. The backend parses these and routes them to `ObsidianVault` methods. A tutor instruction file is injected into the system prompt so the LLM knows what tools it has.

**Tech Stack:** Python 3.14, subprocess (stdlib), Obsidian CLI v1.12+, existing Flask/LangChain tutor stack.

**Design doc:** `docs/plans/2026-03-01-tutor-obsidian-cli-design.md`

---

## Task 1: ObsidianVault — Core Wrapper (`_run` and `_eval`)

**Files:**
- Create: `brain/obsidian_vault.py`
- Create: `brain/tests/test_obsidian_vault.py`

**Step 1: Write the failing tests**

```python
# brain/tests/test_obsidian_vault.py
"""Tests for ObsidianVault CLI wrapper."""
from unittest.mock import patch, MagicMock
import subprocess
import json


def test_run_calls_subprocess_with_correct_args():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout="output", stderr=""
        )
        result = vault._run(["search", 'query="test"'])
        args = mock_run.call_args[0][0]
        assert args[0] == "obsidian"
        assert 'vault="Test Vault"' in args
        assert "search" in args


def test_run_returns_empty_string_on_nonzero_exit():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=1, stdout="", stderr="error"
        )
        result = vault._run(["read", 'file="Missing"'])
        assert result == ""


def test_run_returns_empty_string_on_timeout():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="obsidian", timeout=10)
        result = vault._run(["search", 'query="test"'])
        assert result == ""


def test_run_json_parses_when_requested():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    payload = [{"path": "note.md", "name": "note"}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(payload), stderr=""
        )
        result = vault._run(["files"], parse_json=True)
        assert result == payload


def test_eval_wraps_code_in_obsidian_eval():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout="42", stderr=""
        )
        result = vault._eval("app.vault.getFiles().length")
        args = mock_run.call_args[0][0]
        assert "eval" in args
        assert any("app.vault.getFiles().length" in str(a) for a in args)


def test_is_available_returns_true_on_success():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="1.12.4", stderr="")
        assert vault.is_available() is True


def test_is_available_returns_false_on_failure():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.side_effect = FileNotFoundError("obsidian not found")
        assert vault.is_available() is False
```

**Step 2: Run tests to verify they fail**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_obsidian_vault.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'obsidian_vault'`

**Step 3: Write minimal implementation**

```python
# brain/obsidian_vault.py
"""Obsidian vault operations via official CLI (v1.12+).

Requires:
- Obsidian Desktop v1.12+ with CLI enabled
- Obsidian running (CLI uses IPC)
- `obsidian` command on PATH
"""
from __future__ import annotations

import json
import logging
import subprocess
from typing import Any

log = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = 10
_EVAL_TIMEOUT = 15


class ObsidianVault:
    """CLI-first interface to an Obsidian vault."""

    def __init__(self, vault_name: str = "Treys School") -> None:
        self.vault_name = vault_name

    # ── Internal ────────────────────────────────────────────

    def _run(
        self,
        args: list[str],
        *,
        timeout: int = _DEFAULT_TIMEOUT,
        parse_json: bool = False,
    ) -> Any:
        """Execute an obsidian CLI command and return stdout."""
        cmd = ["obsidian", f'vault="{self.vault_name}"'] + args
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            if proc.returncode != 0:
                log.warning("obsidian CLI error (exit %d): %s", proc.returncode, proc.stderr.strip())
                return [] if parse_json else ""
            output = proc.stdout.strip()
            if parse_json:
                return json.loads(output) if output else []
            return output
        except subprocess.TimeoutExpired:
            log.warning("obsidian CLI timed out after %ds: %s", timeout, " ".join(args[:2]))
            return [] if parse_json else ""
        except FileNotFoundError:
            log.warning("obsidian CLI not found on PATH")
            return [] if parse_json else ""
        except json.JSONDecodeError as exc:
            log.warning("obsidian CLI JSON parse error: %s", exc)
            return [] if parse_json else ""

    def _eval(self, code: str, *, timeout: int = _EVAL_TIMEOUT) -> str:
        """Execute JavaScript in the Obsidian app context via `obsidian eval`."""
        return self._run(["eval", f'code="{code}"'], timeout=timeout)

    # ── Health ──────────────────────────────────────────────

    def is_available(self) -> bool:
        """Check if Obsidian CLI is reachable."""
        try:
            proc = subprocess.run(
                ["obsidian", "version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return proc.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def get_version(self) -> str:
        """Return Obsidian version string."""
        return self._run(["version"], timeout=5)
```

**Step 4: Run tests to verify they pass**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_obsidian_vault.py -v`
Expected: 7 PASSED

**Step 5: Commit**

```bash
git add brain/obsidian_vault.py brain/tests/test_obsidian_vault.py
git commit -m "feat(vault): add ObsidianVault core wrapper with _run, _eval, health check"
```

---

## Task 2: ObsidianVault — CRUD Methods

**Files:**
- Modify: `brain/obsidian_vault.py` (append after `get_version`)
- Modify: `brain/tests/test_obsidian_vault.py` (append new tests)

**Step 1: Write the failing tests**

Append to `brain/tests/test_obsidian_vault.py`:

```python
def test_create_note_calls_cli_with_correct_args():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.create_note(name="Test Note", folder="Course/Module", template="Study Session")
        args = mock_run.call_args[0][0]
        assert "create" in args
        assert 'name="Test Note"' in args
        assert 'template="Study Session"' in args
        assert "silent" in args


def test_create_note_with_content():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.create_note(name="Test", content="# Hello")
        args = mock_run.call_args[0][0]
        assert any("# Hello" in str(a) for a in args)


def test_read_note_returns_content():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="# Note\nContent here", stderr="")
        result = vault.read_note("My Note")
        assert "Content here" in result


def test_read_note_returns_empty_on_missing():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="not found")
        result = vault.read_note("Missing")
        assert result == ""


def test_append_note_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.append_note("My Note", "New content")
        args = mock_run.call_args[0][0]
        assert "append" in args
        assert 'file="My Note"' in args


def test_prepend_note_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.prepend_note("My Note", "Top content")
        args = mock_run.call_args[0][0]
        assert "prepend" in args


def test_delete_note_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.delete_note("old/note.md")
        args = mock_run.call_args[0][0]
        assert "delete" in args
        assert 'path="old/note.md"' in args


def test_delete_note_permanent_flag():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.delete_note("old/note.md", permanent=True)
        args = mock_run.call_args[0][0]
        assert "permanent" in args
```

**Step 2: Run tests to verify they fail**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_obsidian_vault.py -v -k "create or read_note or append or prepend or delete"`
Expected: FAIL with `AttributeError: 'ObsidianVault' object has no attribute 'create_note'`

**Step 3: Write minimal implementation**

Append to `brain/obsidian_vault.py` after `get_version()`:

```python
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
        args = ["create", f'name="{name}"']
        if content:
            args.append(f'content="{content}"')
        if folder:
            args.append(f'path="{folder}/{name}.md"')
        if template:
            args.append(f'template="{template}"')
        if silent:
            args.append("silent")
        return self._run(args)

    def read_note(self, file: str) -> str:
        """Read a note's content. Resolves like a wikilink."""
        return self._run(["read", f'file="{file}"'])

    def append_note(self, file: str, content: str) -> str:
        """Append content to end of a note."""
        return self._run(["append", f'file="{file}"', f'content="{content}"'])

    def prepend_note(self, file: str, content: str) -> str:
        """Prepend content after frontmatter."""
        return self._run(["prepend", f'file="{file}"', f'content="{content}"'])

    def replace_content(self, file: str, new_content: str) -> str:
        """Replace entire file content via eval."""
        escaped = new_content.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        code = (
            f'const f = app.vault.getAbstractFileByPath("{file}");'
            f'if (f) await app.vault.modify(f, "{escaped}");'
        )
        return self._eval(code)

    def delete_note(self, path: str, *, permanent: bool = False) -> str:
        """Delete a note. Uses trash unless permanent=True."""
        args = ["delete", f'path="{path}"']
        if permanent:
            args.append("permanent")
        return self._run(args)
```

**Step 4: Run tests to verify they pass**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_obsidian_vault.py -v`
Expected: 15 PASSED

**Step 5: Commit**

```bash
git add brain/obsidian_vault.py brain/tests/test_obsidian_vault.py
git commit -m "feat(vault): add CRUD methods — create, read, append, prepend, replace, delete"
```

---

## Task 3: ObsidianVault — Search & Discovery

**Files:**
- Modify: `brain/obsidian_vault.py` (append after CRUD)
- Modify: `brain/tests/test_obsidian_vault.py` (append new tests)

**Step 1: Write the failing tests**

Append to `brain/tests/test_obsidian_vault.py`:

```python
def test_search_returns_list():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    results = [{"path": "note.md", "score": 0.9}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(results), stderr=""
        )
        result = vault.search("test query", limit=5)
        assert result == results
        args = mock_run.call_args[0][0]
        assert "search" in args
        assert 'query="test query"' in args
        assert 'limit=5' in args


def test_search_returns_empty_on_error():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="error")
        result = vault.search("test")
        assert result == []


def test_list_files_returns_json():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    files = [{"path": "a.md"}, {"path": "b.md"}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(files), stderr=""
        )
        result = vault.list_files()
        assert len(result) == 2


def test_list_folders_returns_json():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    folders = [{"path": "Course A"}, {"path": "Course B"}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(folders), stderr=""
        )
        result = vault.list_folders()
        assert len(result) == 2


def test_get_backlinks_returns_json():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    links = [{"path": "other.md"}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(links), stderr=""
        )
        result = vault.get_backlinks("My Note")
        assert result == links
        args = mock_run.call_args[0][0]
        assert "backlinks" in args


def test_get_tags_returns_json():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    tags = [{"tag": "#study", "count": 5}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(tags), stderr=""
        )
        result = vault.get_tags()
        assert result == tags
```

**Step 2: Run tests to verify they fail**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_obsidian_vault.py -v -k "search or list_files or list_folders or backlinks or tags"`
Expected: FAIL with `AttributeError`

**Step 3: Write minimal implementation**

Append to `brain/obsidian_vault.py` after CRUD section:

```python
    # ── Search & Discovery ──────────────────────────────────

    def search(self, query: str, *, limit: int = 10) -> list[dict]:
        """Full-text search via Obsidian's index. Returns list of results."""
        return self._run(
            ["search", f'query="{query}"', f"limit={limit}", "format=json"],
            parse_json=True,
        )

    def list_files(self, folder: str = "", *, format: str = "json") -> list[dict]:
        """List files in the vault or a specific folder."""
        args = ["files", f"format={format}"]
        if folder:
            args.append(f'path="{folder}"')
        return self._run(args, parse_json=True)

    def list_folders(self) -> list[dict]:
        """List all folders in the vault."""
        return self._run(["folders", "format=json"], parse_json=True)

    def get_file_info(self, file: str) -> dict:
        """Get metadata for a single file."""
        result = self._run(["file", f'file="{file}"', "format=json"], parse_json=True)
        return result if isinstance(result, dict) else {}

    def get_backlinks(self, file: str) -> list[dict]:
        """Get files that link to this note."""
        return self._run(["backlinks", f'file="{file}"', "format=json"], parse_json=True)

    def get_links(self, file: str) -> list[dict]:
        """Get outgoing links from this note."""
        return self._run(["links", f'file="{file}"', "format=json"], parse_json=True)

    def get_orphans(self) -> list[dict]:
        """Find notes with no incoming links."""
        return self._run(["orphans", "format=json"], parse_json=True)

    def get_unresolved(self) -> list[dict]:
        """Find broken/unresolved links."""
        return self._run(["unresolved", "format=json"], parse_json=True)

    def get_tags(self, *, sort: str = "count") -> list[dict]:
        """List all tags in the vault."""
        return self._run(["tags", f"sort={sort}", "counts", "format=json"], parse_json=True)
```

**Step 4: Run tests to verify they pass**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_obsidian_vault.py -v`
Expected: 21 PASSED

**Step 5: Commit**

```bash
git add brain/obsidian_vault.py brain/tests/test_obsidian_vault.py
git commit -m "feat(vault): add search, list, backlinks, tags discovery methods"
```

---

## Task 4: ObsidianVault — Surgical Edit & Organize

**Files:**
- Modify: `brain/obsidian_vault.py` (append)
- Modify: `brain/tests/test_obsidian_vault.py` (append)

**Step 1: Write the failing tests**

Append to `brain/tests/test_obsidian_vault.py`:

```python
def test_set_property_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.set_property("My Note", "status", "reviewed")
        args = mock_run.call_args[0][0]
        assert "property:set" in args
        assert 'name="status"' in args
        assert 'value="reviewed"' in args


def test_remove_property_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.remove_property("My Note", "old_key")
        args = mock_run.call_args[0][0]
        assert "property:remove" in args


def test_move_note_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.move_note("old/note.md", new_name="new-note")
        args = mock_run.call_args[0][0]
        assert "move" in args
        assert 'path="old/note.md"' in args
        assert 'name="new-note"' in args


def test_create_folder_uses_eval():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.create_folder("Course/Module/Topic")
        args = mock_run.call_args[0][0]
        assert "eval" in args
        assert any("createFolder" in str(a) for a in args)


def test_replace_section_uses_eval_with_process():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.replace_section("My Note", "## Learning Objectives", "- [ ] LO1\n- [ ] LO2")
        args = mock_run.call_args[0][0]
        assert "eval" in args
        assert any("process" in str(a) for a in args)
```

**Step 2: Run tests to verify they fail**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_obsidian_vault.py -v -k "property or move or create_folder or replace_section"`
Expected: FAIL with `AttributeError`

**Step 3: Write minimal implementation**

Append to `brain/obsidian_vault.py`:

```python
    # ── Surgical Edit ───────────────────────────────────────

    def set_property(self, file: str, key: str, value: str) -> str:
        """Set a frontmatter property on a note."""
        return self._run(["property:set", f'name="{key}"', f'value="{value}"', f'file="{file}"'])

    def remove_property(self, file: str, key: str) -> str:
        """Remove a frontmatter property from a note."""
        return self._run(["property:remove", f'name="{key}"', f'file="{file}"'])

    def replace_section(self, file: str, heading: str, content: str) -> str:
        """Replace content under a heading using vault.process() via eval.

        Uses metadataCache to find heading boundaries, then atomically
        replaces the content between the target heading and the next
        same-or-higher-level heading.
        """
        escaped_content = content.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        escaped_heading = heading.replace('"', '\\"')
        # JS: find heading in cache, calculate boundaries, replace via process
        code = (
            f'const f = app.vault.getFileByPath("{file}");'
            f'if (!f) throw new Error("File not found: {file}");'
            f'const cache = app.metadataCache.getFileCache(f);'
            f'const headings = cache?.headings || [];'
            f'const targetLevel = "{escaped_heading}".replace(/^#+\\s*/, "").length === 0 '
            f'  ? "{escaped_heading}".match(/^(#+)/)?.[1].length || 2 : '
            f'  "{escaped_heading}".match(/^(#+)/)?.[1].length || 2;'
            f'const targetText = "{escaped_heading}".replace(/^#+\\s*/, "");'
            f'let startIdx = -1; let endIdx = -1;'
            f'for (let i = 0; i < headings.length; i++) {{'
            f'  if (headings[i].heading === targetText && headings[i].level === targetLevel) {{'
            f'    startIdx = headings[i].position.end.offset + 1;'
            f'    for (let j = i + 1; j < headings.length; j++) {{'
            f'      if (headings[j].level <= targetLevel) {{ endIdx = headings[j].position.start.offset; break; }}'
            f'    }}'
            f'    break;'
            f'  }}'
            f'}}'
            f'if (startIdx === -1) throw new Error("Heading not found");'
            f'await app.vault.process(f, (data) => {{'
            f'  const before = data.substring(0, startIdx);'
            f'  const after = endIdx === -1 ? "" : data.substring(endIdx);'
            f'  return before + "\\n{escaped_content}\\n" + after;'
            f'}});'
        )
        return self._eval(code, timeout=_EVAL_TIMEOUT)

    # ── Organize ────────────────────────────────────────────

    def move_note(self, path: str, *, new_name: str = "", new_folder: str = "") -> str:
        """Move or rename a note."""
        args = ["move", f'path="{path}"']
        if new_name:
            args.append(f'name="{new_name}"')
        if new_folder:
            args.append(f'folder="{new_folder}"')
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
            f'const cache = f ? app.metadataCache.getFileCache(f) : null;'
            f'JSON.stringify(cache?.headings || []);'
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
```

**Step 4: Run tests to verify they pass**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_obsidian_vault.py -v`
Expected: 26 PASSED

**Step 5: Commit**

```bash
git add brain/obsidian_vault.py brain/tests/test_obsidian_vault.py
git commit -m "feat(vault): add surgical edit, organize, and metadata methods"
```

---

## Task 5: Artifact Command Parser

**Files:**
- Create: `brain/vault_artifact_parser.py`
- Create: `brain/tests/test_vault_artifact_parser.py`

**Step 1: Write the failing tests**

```python
# brain/tests/test_vault_artifact_parser.py
"""Tests for vault artifact command parsing from LLM output."""


def test_parse_single_create_command():
    from vault_artifact_parser import parse_vault_artifacts
    text = '''Here's your note structure:

:::vault:create
name: Lecture 1 - Gait Analysis
folder: Movement Science/Lower Body/Biomechanics
template: Study Session
:::

I've set up the first lecture note.'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 1
    assert artifacts[0]["operation"] == "create"
    assert artifacts[0]["params"]["name"] == "Lecture 1 - Gait Analysis"
    assert artifacts[0]["params"]["template"] == "Study Session"


def test_parse_multiple_commands():
    from vault_artifact_parser import parse_vault_artifacts
    text = '''Setting up your vault:

:::vault:create
name: _Index
folder: Movement Science/Lower Body
:::

:::vault:property
file: _Index
key: status
value: in-progress
:::

Done!'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 2
    assert artifacts[0]["operation"] == "create"
    assert artifacts[1]["operation"] == "property"


def test_parse_replace_section_with_multiline_content():
    from vault_artifact_parser import parse_vault_artifacts
    text = '''Updating your LOs:

:::vault:replace-section
file: _Index
heading: ## Learning Objectives
content: |
  - [ ] LO1: Describe [[gait cycle]]
  - [ ] LO2: Explain [[joint moments]]
  - [ ] LO3: Identify [[hip complex]] muscles
:::

These objectives are extracted from your slides.'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 1
    assert artifacts[0]["operation"] == "replace-section"
    assert "gait cycle" in artifacts[0]["params"]["content"]
    assert artifacts[0]["params"]["content"].count("- [ ]") == 3


def test_parse_no_artifacts():
    from vault_artifact_parser import parse_vault_artifacts
    text = "Just a regular response with no vault commands."
    artifacts = parse_vault_artifacts(text)
    assert artifacts == []


def test_parse_search_command():
    from vault_artifact_parser import parse_vault_artifacts
    text = ''':::vault:search
query: lower body biomechanics
limit: 5
:::'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 1
    assert artifacts[0]["operation"] == "search"
    assert artifacts[0]["params"]["query"] == "lower body biomechanics"
    assert artifacts[0]["params"]["limit"] == "5"


def test_strip_artifacts_from_text():
    from vault_artifact_parser import strip_vault_artifacts
    text = '''Before text.

:::vault:create
name: Test
:::

After text.'''

    clean = strip_vault_artifacts(text)
    assert ":::vault:" not in clean
    assert "Before text." in clean
    assert "After text." in clean


def test_parse_append_command():
    from vault_artifact_parser import parse_vault_artifacts
    text = ''':::vault:append
file: My Note
content: |
  ## New Section
  Content with [[wiki links]]
:::'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 1
    assert artifacts[0]["operation"] == "append"
    assert "wiki links" in artifacts[0]["params"]["content"]


def test_parse_move_command():
    from vault_artifact_parser import parse_vault_artifacts
    text = ''':::vault:move
path: Old/Path/Note.md
name: New Name
folder: New/Folder
:::'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 1
    assert artifacts[0]["operation"] == "move"
    assert artifacts[0]["params"]["path"] == "Old/Path/Note.md"
```

**Step 2: Run tests to verify they fail**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_vault_artifact_parser.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Write minimal implementation**

```python
# brain/vault_artifact_parser.py
"""Parse :::vault:*::: artifact commands from LLM output."""
from __future__ import annotations

import re
from typing import Any

# Match :::vault:<operation>\n...\n:::
_ARTIFACT_RE = re.compile(
    r":::vault:(\S+)\s*\n(.*?)\n:::",
    re.DOTALL,
)


def parse_vault_artifacts(text: str) -> list[dict[str, Any]]:
    """Extract vault artifact commands from LLM response text.

    Returns list of {"operation": str, "params": dict}.
    """
    artifacts = []
    for match in _ARTIFACT_RE.finditer(text):
        operation = match.group(1)
        body = match.group(2)
        params = _parse_yaml_body(body)
        artifacts.append({"operation": operation, "params": params})
    return artifacts


def strip_vault_artifacts(text: str) -> str:
    """Remove all :::vault:*::: blocks from text, leaving clean prose."""
    return _ARTIFACT_RE.sub("", text).strip()


def _parse_yaml_body(body: str) -> dict[str, str]:
    """Parse simple YAML-like key: value pairs from artifact body.

    Handles multiline values via `key: |` syntax.
    """
    params: dict[str, str] = {}
    lines = body.split("\n")
    current_key = ""
    current_value_lines: list[str] = []
    in_multiline = False

    for line in lines:
        if in_multiline:
            # Multiline continues while indented
            if line.startswith("  ") or line.startswith("\t"):
                current_value_lines.append(line.strip())
            elif line.strip() == "":
                current_value_lines.append("")
            else:
                # End of multiline — save and parse this line
                params[current_key] = "\n".join(current_value_lines).strip()
                in_multiline = False
                current_value_lines = []
                # Fall through to parse this line as a new key

        if not in_multiline:
            colon_idx = line.find(":")
            if colon_idx == -1:
                continue
            key = line[:colon_idx].strip()
            value = line[colon_idx + 1:].strip()
            if not key:
                continue
            if value == "|":
                current_key = key
                in_multiline = True
                current_value_lines = []
            else:
                params[key] = value

    # Flush any remaining multiline
    if in_multiline and current_key:
        params[current_key] = "\n".join(current_value_lines).strip()

    return params
```

**Step 4: Run tests to verify they pass**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_vault_artifact_parser.py -v`
Expected: 8 PASSED

**Step 5: Commit**

```bash
git add brain/vault_artifact_parser.py brain/tests/test_vault_artifact_parser.py
git commit -m "feat(vault): add artifact command parser for :::vault:*::: blocks"
```

---

## Task 6: Tutor Instructions File

**Files:**
- Create: `brain/tutor_instructions.md`

**Step 1: Write the file**

```markdown
# Tutor Instructions

You are a PT study tutor for Trey, a DPT student at UTMB. You have access to his Obsidian vault and can read, write, search, and organize his study notes.

## Communication Style

- Short, interactive, concise — not textbook paragraphs
- Big picture FIRST (ELI4), then layer in detail
- Multiple angles and analogies until "it clicks"
- Ask "does this click?" before moving on
- No quiz until the learner says "ready"

## Learning Style

- Top-down narrative: needs the story/map before details
- Jim Kwik phonetic: break terms into sounds → vivid meaning-linked stories
- Hand-drawn mind maps: own words, simple pics, spatial recall
- Brain dumps: free recall → review gaps → fill in
- Connections: cross-topic links, "this is like..."

## Available Tools

You can perform vault operations by emitting artifact commands in your responses. The backend will execute them automatically.

### Create a note

```
:::vault:create
name: Note Title
folder: Course/Module/Topic
template: Study Session
:::
```

### Append to a note

```
:::vault:append
file: Note Title
content: |
  ## New Section
  Content with [[wiki links]]
:::
```

### Prepend to a note

```
:::vault:prepend
file: Note Title
content: |
  > Quick summary added at top
:::
```

### Replace a section

```
:::vault:replace-section
file: Note Title
heading: ## Learning Objectives
content: |
  - [ ] LO1: Describe [[term]]
  - [ ] LO2: Explain [[concept]]
:::
```

### Set a property

```
:::vault:property
file: Note Title
key: status
value: reviewed
:::
```

### Search notes

```
:::vault:search
query: search terms here
limit: 5
:::
```

### Move or rename a note

```
:::vault:move
path: Old/Path/Note.md
name: New Name
folder: New/Folder
:::
```

## Output Expectations

- Use `[[wiki links]]` for terms that should cross-reference other notes
- Learning objectives as `- [ ]` checkboxes
- Hierarchical outline: H2 for sections, H3 for sub-topics, bullets for details
- When building a concept map, use wiki links to show relationships:
  `[[Term A]] → [[Term B]]` (causes/leads to)
  `[[Term A]] ↔ [[Term B]]` (related/bidirectional)

## Scaffolding

When starting a new construct/module for the first time:
1. Read the uploaded materials
2. Extract the folder structure (sub-topics, lectures)
3. Extract learning objectives
4. Create an `_Index.md` with concept map + LOs + sub-topic links
5. Create individual lecture notes from the Study Session template
6. Present the structure and ask "does this look right?"

## During Active Study

- Append key concepts to the current lecture note as they're discussed
- Update LO checkboxes when objectives are covered
- Add `[[wiki links]]` to connect concepts across notes
- Use the Recall Check section for brain dump exercises
- Log gaps in the Gaps & Questions section

## Session Wrap-up

- Append a session summary to `_Index.md` under Session Log
- Set status property on notes that were covered
- Note which LOs were addressed and which remain
```

**Step 2: Commit**

```bash
git add brain/tutor_instructions.md
git commit -m "feat(tutor): add tutor instructions file with tool awareness and pedagogy"
```

---

## Task 7: Wire Tutor Instructions into System Prompt

**Files:**
- Modify: `brain/tutor_engine.py:513-528` (system prompt assembly)

**Step 1: Write the failing test**

Append to `brain/tests/test_tutor_context.py`:

```python
def test_load_tutor_instructions_returns_content():
    from pathlib import Path
    instructions_path = Path(__file__).parent.parent / "tutor_instructions.md"
    assert instructions_path.exists(), "tutor_instructions.md must exist"
    content = instructions_path.read_text(encoding="utf-8")
    assert "Available Tools" in content
    assert ":::vault:create" in content
```

**Step 2: Run test to verify it passes** (file already exists from Task 6)

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_tutor_context.py::test_load_tutor_instructions_returns_content -v`
Expected: PASS

**Step 3: Modify tutor_engine.py**

At the top of `brain/tutor_engine.py`, add a loader (after existing imports):

```python
from pathlib import Path

_TUTOR_INSTRUCTIONS_PATH = Path(__file__).parent / "tutor_instructions.md"
_TUTOR_INSTRUCTIONS: str = ""
if _TUTOR_INSTRUCTIONS_PATH.exists():
    _TUTOR_INSTRUCTIONS = _TUTOR_INSTRUCTIONS_PATH.read_text(encoding="utf-8")
```

At line ~522 (after `system_prompt = BASE_SYSTEM_PROMPT.format(...)`) append:

```python
        if _TUTOR_INSTRUCTIONS:
            system_prompt += "\n\n" + _TUTOR_INSTRUCTIONS
```

At line ~669 (second system prompt assembly location), add the same injection.

**Step 4: Run existing tutor tests to verify nothing breaks**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_tutor_engine.py -v` (if exists)
Run: `cd /c/pt-study-sop/brain && python -m pytest tests/ -k "tutor" -v --timeout=30`
Expected: All existing tutor tests PASS

**Step 5: Commit**

```bash
git add brain/tutor_engine.py brain/tests/test_tutor_context.py
git commit -m "feat(tutor): inject tutor_instructions.md into system prompt"
```

---

## Task 8: Wire Artifact Commands into api_tutor.py

**Files:**
- Modify: `brain/dashboard/api_tutor.py:3376+` (inside `generate()` function)

**Step 1: Write the failing test**

Create `brain/tests/test_vault_artifact_routing.py`:

```python
"""Tests for artifact command routing to ObsidianVault."""
from unittest.mock import patch, MagicMock


def test_route_create_artifact():
    from vault_artifact_parser import parse_vault_artifacts
    from obsidian_vault import ObsidianVault

    text = ':::vault:create\nname: Test Note\nfolder: Course\ntemplate: Study Session\n:::'
    artifacts = parse_vault_artifacts(text)

    vault = ObsidianVault(vault_name="Test")
    with patch.object(vault, "_run", return_value="") as mock:
        _execute_vault_artifact(vault, artifacts[0])
        mock.assert_called_once()


def test_route_append_artifact():
    from vault_artifact_parser import parse_vault_artifacts
    from obsidian_vault import ObsidianVault

    text = ':::vault:append\nfile: My Note\ncontent: New stuff\n:::'
    artifacts = parse_vault_artifacts(text)

    vault = ObsidianVault(vault_name="Test")
    with patch.object(vault, "_run", return_value="") as mock:
        _execute_vault_artifact(vault, artifacts[0])
        mock.assert_called_once()


def test_route_property_artifact():
    from vault_artifact_parser import parse_vault_artifacts
    from obsidian_vault import ObsidianVault

    text = ':::vault:property\nfile: My Note\nkey: status\nvalue: done\n:::'
    artifacts = parse_vault_artifacts(text)

    vault = ObsidianVault(vault_name="Test")
    with patch.object(vault, "_run", return_value="") as mock:
        _execute_vault_artifact(vault, artifacts[0])
        mock.assert_called_once()


def _execute_vault_artifact(vault, artifact):
    """Route an artifact to the correct vault method — extracted for testability."""
    from vault_artifact_router import execute_vault_artifact
    execute_vault_artifact(vault, artifact)
```

**Step 2: Create the router module**

```python
# brain/vault_artifact_router.py
"""Route parsed vault artifact commands to ObsidianVault methods."""
from __future__ import annotations

import logging
from typing import Any

log = logging.getLogger(__name__)


def execute_vault_artifact(vault: Any, artifact: dict) -> str:
    """Execute a single vault artifact command.

    Args:
        vault: ObsidianVault instance
        artifact: {"operation": str, "params": dict}

    Returns:
        Result string from vault operation, or error message.
    """
    op = artifact["operation"]
    p = artifact["params"]

    try:
        if op == "create":
            return vault.create_note(
                name=p.get("name", ""),
                folder=p.get("folder", ""),
                template=p.get("template", ""),
                content=p.get("content", ""),
            )
        elif op == "append":
            return vault.append_note(p.get("file", ""), p.get("content", ""))
        elif op == "prepend":
            return vault.prepend_note(p.get("file", ""), p.get("content", ""))
        elif op == "replace-section":
            return vault.replace_section(
                p.get("file", ""), p.get("heading", ""), p.get("content", "")
            )
        elif op == "property":
            return vault.set_property(p.get("file", ""), p.get("key", ""), p.get("value", ""))
        elif op == "search":
            results = vault.search(p.get("query", ""), limit=int(p.get("limit", "10")))
            return str(results)
        elif op == "move":
            return vault.move_note(
                p.get("path", ""),
                new_name=p.get("name", ""),
                new_folder=p.get("folder", ""),
            )
        else:
            log.warning("Unknown vault artifact operation: %s", op)
            return f"Unknown operation: {op}"
    except Exception as exc:
        log.error("Vault artifact %s failed: %s", op, exc)
        return f"Error: {exc}"


def execute_all_artifacts(vault: Any, artifacts: list[dict]) -> list[dict]:
    """Execute all artifacts and return results.

    Returns list of {"operation": str, "result": str, "success": bool}.
    """
    results = []
    for artifact in artifacts:
        result = execute_vault_artifact(vault, artifact)
        success = not result.startswith("Error:") and not result.startswith("Unknown")
        results.append({
            "operation": artifact["operation"],
            "result": result,
            "success": success,
        })
    return results
```

**Step 3: Wire into api_tutor.py**

In `brain/dashboard/api_tutor.py` inside the `generate()` function, after the LLM response is fully assembled (after streaming completes), add artifact processing. Find the section where `full_reply` is built from streamed chunks and add:

```python
        # After full_reply is assembled from streaming
        from vault_artifact_parser import parse_vault_artifacts, strip_vault_artifacts
        from vault_artifact_router import execute_all_artifacts
        from obsidian_vault import ObsidianVault

        vault_artifacts = parse_vault_artifacts(full_reply)
        if vault_artifacts:
            vault = ObsidianVault()
            artifact_results = execute_all_artifacts(vault, vault_artifacts)
            # Store results in turn metadata for frontend visibility
            # Strip artifact blocks from the displayed response
```

**Step 4: Run tests**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_vault_artifact_routing.py tests/test_vault_artifact_parser.py -v`
Expected: All PASS

**Step 5: Commit**

```bash
git add brain/vault_artifact_router.py brain/tests/test_vault_artifact_routing.py brain/dashboard/api_tutor.py
git commit -m "feat(tutor): wire vault artifact commands into send_turn response processing"
```

---

## Task 9: Swap ObsidianClient → ObsidianVault in tutor_context.py

**Files:**
- Modify: `brain/tutor_context.py:129-150` (`_fetch_notes` function)
- Modify: `brain/tests/test_tutor_context_wiring.py` (update mocks)

**Step 1: Write the test**

Add to `brain/tests/test_tutor_context.py`:

```python
def test_fetch_notes_uses_obsidian_vault():
    """Verify _fetch_notes imports ObsidianVault, not ObsidianClient."""
    import ast
    from pathlib import Path
    source = (Path(__file__).parent.parent / "tutor_context.py").read_text()
    tree = ast.parse(source)
    imports = [
        node for node in ast.walk(tree)
        if isinstance(node, (ast.Import, ast.ImportFrom))
    ]
    import_names = []
    for imp in imports:
        if isinstance(imp, ast.ImportFrom) and imp.module:
            import_names.append(imp.module)
    assert "obsidian_vault" in import_names or any(
        "ObsidianVault" in source for _ in [1]
    ), "tutor_context.py should import from obsidian_vault"
    assert "obsidian_client" not in source.lower().replace("# ", ""), \
        "tutor_context.py should not reference obsidian_client"
```

**Step 2: Modify tutor_context.py**

Change `brain/tutor_context.py` lines 129-132:

Before:
```python
        from obsidian_client import ObsidianClient
        client = ObsidianClient()
        hits = client.search(query, max_results=5)
```

After:
```python
        from obsidian_vault import ObsidianVault
        vault = ObsidianVault()
        hits = vault.search(query, limit=5)
```

Update the hit processing (lines 135-150) to handle the CLI's JSON output format instead of REST API format. The CLI returns different fields — adjust the formatting loop accordingly.

**Step 3: Run all tutor context tests**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_tutor_context.py tests/test_tutor_context_wiring.py tests/test_tutor_context_integration.py -v`
Expected: All PASS (mocked tests don't hit the real client)

**Step 4: Commit**

```bash
git add brain/tutor_context.py brain/tests/test_tutor_context.py
git commit -m "refactor(tutor): swap ObsidianClient for ObsidianVault in tutor_context"
```

---

## Task 10: Add vault_state to build_context()

**Files:**
- Modify: `brain/tutor_context.py:33-87` (`build_context` function)

**Step 1: Write the failing test**

Add to `brain/tests/test_tutor_context.py`:

```python
def test_build_context_includes_vault_state():
    with patch("tutor_context._fetch_materials", return_value="materials"):
        with patch("tutor_context._fetch_notes", return_value="notes"):
            with patch("tutor_context._fetch_vault_state", return_value="vault state"):
                from tutor_context import build_context
                result = build_context("test", depth="auto", course_id="MVSC")
                assert "vault_state" in result
```

**Step 2: Run test to verify it fails**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_tutor_context.py::test_build_context_includes_vault_state -v`
Expected: FAIL with `AttributeError` or missing `_fetch_vault_state`

**Step 3: Implement `_fetch_vault_state`**

Add to `brain/tutor_context.py`:

```python
def _fetch_vault_state(course_id: str, topic: str = "") -> str:
    """Read the _Index.md and folder tree for the current construct."""
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault()
    if not vault.is_available():
        return ""

    # Try to find _Index.md for this topic
    index_content = ""
    if topic:
        index_content = vault.read_note(f"{topic}/_Index")
    if not index_content and course_id:
        # Search for any _Index in this course
        results = vault.search(f"_Index {course_id}", limit=1)
        if results:
            path = results[0].get("path", "")
            if path:
                index_content = vault.read_note(path)

    if not index_content:
        return ""

    return f"## Current Vault State\n\n{index_content}"
```

Update `build_context()` to call `_fetch_vault_state` and include it in the return dict.

**Step 4: Run tests**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_tutor_context.py -v`
Expected: All PASS

**Step 5: Commit**

```bash
git add brain/tutor_context.py brain/tests/test_tutor_context.py
git commit -m "feat(tutor): add vault_state to build_context for scaffold awareness"
```

---

## Task 11: Delete Old Obsidian Client

**Files:**
- Delete: `brain/obsidian_client.py`
- Delete: `brain/tests/test_obsidian_client.py`

**Step 1: Verify no remaining imports**

Run: `grep -r "obsidian_client" brain/ --include="*.py" | grep -v __pycache__ | grep -v ".pyc"`
Expected: No results (all references already swapped in Task 9)

**Step 2: Delete files**

```bash
git rm brain/obsidian_client.py brain/tests/test_obsidian_client.py
```

**Step 3: Run full test suite**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/ -v --timeout=30`
Expected: All PASS, 11 fewer tests (old client tests removed), new vault tests present

**Step 4: Commit**

```bash
git commit -m "refactor: remove obsidian_client.py (replaced by obsidian_vault.py CLI wrapper)"
```

---

## Task 12: Create Obsidian Note Template

**Files:**
- Create: `Templates/Study Session.md` in the Obsidian vault

This file goes in the actual Obsidian vault, not in the repo. The tutor can create it via CLI on first use, or you can create it manually.

**Step 1: Create a script that bootstraps the template**

```python
# brain/scripts/setup_vault_template.py
"""Create the Study Session template in the Obsidian vault."""
from obsidian_vault import ObsidianVault

TEMPLATE_CONTENT = """---
course:
construct:
topic:
status: not-started
session_date: {{date}}
chain:
tutor_session_id:
---

# {{title}}

> **Parent:** [[_Index]]

## Learning Objectives

- [ ]

## Top-Down Overview


## Key Concepts

###

-

## Connections

-

## Recall Check


## Gaps & Questions

-

## Session Notes

"""

if __name__ == "__main__":
    vault = ObsidianVault()
    if not vault.is_available():
        print("ERROR: Obsidian is not running or CLI not available")
        exit(1)
    vault.create_note(
        name="Study Session",
        folder="Templates",
        content=TEMPLATE_CONTENT,
        silent=True,
    )
    print("Created Templates/Study Session.md")
```

**Step 2: Commit**

```bash
git add brain/scripts/setup_vault_template.py
git commit -m "feat(vault): add script to bootstrap Study Session template in Obsidian"
```

---

## Task 13: Update Documentation

**Files:**
- Modify: `docs/flowcharts/07-tutor-runtime-connections.mmd` (update `obsidian_client` → `obsidian_vault`)
- Modify: `docs/flowcharts/README.md` (same reference update)
- Modify: `docs/root/GUIDE_TUTOR_FLOW.md` (update reference)

**Step 1: Find and replace references**

Search for all `obsidian_client` references in docs and update to `obsidian_vault`.

**Step 2: Commit**

```bash
git add docs/
git commit -m "docs: update obsidian_client references to obsidian_vault"
```

---

## Summary

| Task | What | Tests | Lines |
|------|------|-------|-------|
| 1 | Core wrapper (`_run`, `_eval`, health) | 7 | ~80 |
| 2 | CRUD methods | 8 | ~60 |
| 3 | Search & discovery | 6 | ~50 |
| 4 | Surgical edit & organize | 5 | ~80 |
| 5 | Artifact command parser | 8 | ~70 |
| 6 | Tutor instructions file | 0 | ~120 |
| 7 | Wire instructions into system prompt | 1 | ~10 |
| 8 | Wire artifacts into api_tutor.py | 3 | ~60 |
| 9 | Swap ObsidianClient → ObsidianVault | 1 | ~5 |
| 10 | Add vault_state to build_context | 1 | ~30 |
| 11 | Delete old obsidian_client | 0 | -280 |
| 12 | Note template bootstrap script | 0 | ~40 |
| 13 | Update docs | 0 | ~10 |

**Total: 13 tasks, ~40 new tests, ~600 lines added, ~280 deleted**
**Net: +320 lines, CLI-only Obsidian integration**
