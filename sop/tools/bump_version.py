#!/usr/bin/env python3
"""Version bump tool for the SOP Method Library.

Usage:
  python sop/tools/bump_version.py patch                      # 1.0.0 → 1.0.1
  python sop/tools/bump_version.py minor                      # 1.0.0 → 1.1.0
  python sop/tools/bump_version.py major                      # 1.0.0 → 2.0.0
  python sop/tools/bump_version.py patch --message "Fix evidence citations"
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

import yaml

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[2]
VERSION_PATH = ROOT / "sop" / "library" / "meta" / "version.yaml"
RELEASELOG_PATH = ROOT / "sop" / "RELEASELOG.md"


# ---------------------------------------------------------------------------
# Version helpers
# ---------------------------------------------------------------------------

def _read_version() -> str:
    data = yaml.safe_load(VERSION_PATH.read_text(encoding="utf-8"))
    return data.get("version", "0.0.0")


def _bump(current: str, part: str) -> str:
    parts = current.split(".")
    if len(parts) != 3:
        parts = ["0", "0", "0"]
    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
    if part == "major":
        return f"{major + 1}.0.0"
    elif part == "minor":
        return f"{major}.{minor + 1}.0"
    else:
        return f"{major}.{minor}.{patch + 1}"


def _write_version(version: str) -> None:
    data = {
        "version": version,
        "last_updated": date.today().isoformat(),
    }
    VERSION_PATH.write_text(
        yaml.dump(data, default_flow_style=False, sort_keys=False),
        encoding="utf-8",
    )


def _append_releaselog(version: str, message: str) -> None:
    """Append entry to RELEASELOG.md. Creates file if missing."""
    today = date.today().isoformat()
    entry = f"\n## v{version} ({today})\n\n- {message}\n"

    if RELEASELOG_PATH.exists():
        content = RELEASELOG_PATH.read_text(encoding="utf-8")
        # Insert after the header line
        if content.startswith("# "):
            header_end = content.index("\n") + 1
            content = content[:header_end] + entry + content[header_end:]
        else:
            content = content + entry
    else:
        content = "# SOP Method Library — Release Log\n" + entry

    RELEASELOG_PATH.write_text(content, encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Bump the SOP Method Library version.")
    parser.add_argument(
        "part", choices=["major", "minor", "patch"],
        help="Version part to bump",
    )
    parser.add_argument(
        "--message", "-m", default="Version bump",
        help="Release note message",
    )
    args = parser.parse_args()

    current = _read_version()
    new_version = _bump(current, args.part)

    _write_version(new_version)
    _append_releaselog(new_version, args.message)

    print(f"{current} -> {new_version}")
    print(f"Updated: {VERSION_PATH.relative_to(ROOT)}")
    print(f"Updated: {RELEASELOG_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
