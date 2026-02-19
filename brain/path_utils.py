"""Filesystem path helpers with Windows long-path support."""

from __future__ import annotations

import os
from pathlib import Path

# Use a soft threshold below MAX_PATH to leave room for internal API calls.
WINDOWS_LONG_PATH_THRESHOLD = 248


def to_windows_extended_path(path_str: str) -> str:
    """Convert a Windows path to the extended-length \\?\\ form."""
    if os.name != "nt":
        return path_str
    if not path_str:
        return path_str
    if path_str.startswith("\\\\?\\"):
        return path_str

    normalized = path_str.replace("/", "\\")
    if normalized.startswith("\\\\"):
        # UNC path: \\server\share\... -> \\?\UNC\server\share\...
        return "\\\\?\\UNC\\" + normalized.lstrip("\\")
    return "\\\\?\\" + normalized


def resolve_existing_path(path: str | Path) -> Path:
    """Return a readable path; on Windows retry long paths with \\?\\ prefix."""
    candidate = Path(path)
    if candidate.exists():
        return candidate

    if os.name != "nt":
        return candidate

    raw = str(candidate)
    if raw.startswith("\\\\?\\") or len(raw) < WINDOWS_LONG_PATH_THRESHOLD:
        return candidate

    extended = Path(to_windows_extended_path(raw))
    if extended.exists():
        return extended

    return candidate

