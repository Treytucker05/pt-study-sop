"""Mock Obsidian vault I/O for tutor tests.

Provides an in-memory dict-backed file system that mirrors the
``ObsidianVault`` read/write/delete/list interface without touching
the real vault or requiring Obsidian to be running.
"""

from __future__ import annotations

from typing import Any


class MockVaultIO:
    """In-memory vault simulator.

    Notes are stored in ``self.files: dict[str, str]`` keyed by path.

    Usage::

        vault = MockVaultIO({
            "Courses/Neuro/Week 1/notes.md": "# Neurons\\nContent here.",
        })
        assert vault.read_note("Courses/Neuro/Week 1/notes.md") == "# Neurons\\nContent here."
    """

    def __init__(self, initial_files: dict[str, str] | None = None) -> None:
        self.files: dict[str, str] = dict(initial_files or {})
        self.call_history: list[dict[str, Any]] = []

    # -- Internal helpers ----------------------------------------------------

    def _record(self, method: str, **kwargs: Any) -> None:
        self.call_history.append({"method": method, **kwargs})

    @staticmethod
    def _normalise(path: str) -> str:
        """Strip leading/trailing slashes for consistent key lookup."""
        return path.strip("/").strip("\\")

    # -- Core I/O (matches ObsidianVault signatures) -------------------------

    def read_note(self, path: str = "", *, file: str = "") -> str:
        """Read a note's content by path.

        Accepts both positional ``path`` and keyword ``file`` to match
        the varying calling conventions in the tutor codebase.

        Returns the note content string, or raises ``FileNotFoundError``
        for missing notes (matching the real vault CLI behaviour).
        """
        key = self._normalise(file or path)
        self._record("read_note", path=key)
        if key not in self.files:
            raise FileNotFoundError(f'Error: File "{key}" not found.')
        return self.files[key]

    def write_note(self, path: str, content: str) -> bool:
        """Write (create or overwrite) a note at the given path."""
        key = self._normalise(path)
        self._record("write_note", path=key, content=content)
        self.files[key] = content
        return True

    def delete_note(self, path: str, *, permanent: bool = False) -> bool:
        """Remove a note from the mock vault."""
        key = self._normalise(path)
        self._record("delete_note", path=key, permanent=permanent)
        if key in self.files:
            del self.files[key]
            return True
        return False

    def list_notes(self, folder: str = "") -> list[str]:
        """List note paths under *folder* (non-recursive prefix match)."""
        prefix = self._normalise(folder)
        self._record("list_notes", folder=prefix)
        if not prefix:
            return sorted(self.files.keys())
        return sorted(k for k in self.files if k.startswith(prefix))

    # -- Extended methods matching ObsidianVault -----------------------------

    def create_note(
        self,
        *,
        name: str,
        folder: str = "",
        content: str = "",
        template: str = "",
        silent: bool = True,
    ) -> str:
        """Create a new note (mirrors ``ObsidianVault.create_note``)."""
        path = f"{folder}/{name}" if folder else name
        key = self._normalise(path)
        self._record("create_note", name=name, folder=folder, content=content)
        self.files[key] = content
        return ""

    def replace_content(self, *, file: str, new_content: str) -> str:
        """Replace entire note content (mirrors ``ObsidianVault.replace_content``)."""
        key = self._normalise(file)
        self._record("replace_content", file=key, new_content=new_content)
        self.files[key] = new_content
        return ""

    def append_note(self, file: str, content: str) -> str:
        """Append to a note (mirrors ``ObsidianVault.append_note``)."""
        key = self._normalise(file)
        self._record("append_note", file=key, content=content)
        self.files.setdefault(key, "")
        self.files[key] += content
        return ""

    def get_file_info(self, *, file: str) -> dict[str, str]:
        """Return minimal file info dict."""
        key = self._normalise(file)
        self._record("get_file_info", file=key)
        if key in self.files:
            return {"path": key, "size": str(len(self.files[key]))}
        return {}

    def list_files(self, folder: str = "", *, format: str = "json") -> list[dict]:
        """List files as dicts matching ``ObsidianVault.list_files``."""
        prefix = self._normalise(folder)
        self._record("list_files", folder=prefix)
        results = []
        for path in sorted(self.files):
            if not prefix or path.startswith(prefix):
                results.append({"path": path, "name": path.rsplit("/", 1)[-1]})
        return results

    def search(self, query: str, *, limit: int = 10) -> list[dict]:
        """Simple substring search across note contents."""
        self._record("search", query=query, limit=limit)
        results = []
        for path, content in self.files.items():
            if query.lower() in content.lower() or query.lower() in path.lower():
                results.append({"path": path, "matches": 1})
                if len(results) >= limit:
                    break
        return results

    # -- Convenience ----------------------------------------------------------

    def reset(self) -> None:
        """Clear all files and call history."""
        self.files.clear()
        self.call_history.clear()
