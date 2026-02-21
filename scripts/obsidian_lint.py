#!/usr/bin/env python3
"""CLI wrapper for Obsidian vault hygiene checks.

Usage:
    python scripts/obsidian_lint.py lint <vault_path>
    python scripts/obsidian_lint.py aliases <vault_path>
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

# Ensure brain/ is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "brain"))

from adaptive.vault_ingest import build_alias_index, lint_vault, scan_vault
from config import DB_PATH


def cmd_lint(vault_path: str) -> None:
    """Run lint checks and output JSON + human summary."""
    report = lint_vault(vault_path)
    print(json.dumps(report, indent=2))

    count = len(report["issues"])
    checked = report["files_checked"]
    print(f"\n--- Summary ---")
    print(f"Files checked: {checked}")
    print(f"Issues found:  {count}")

    if count > 0:
        by_severity: dict[str, int] = {}
        for issue in report["issues"]:
            sev = issue.get("severity", "warning")
            by_severity[sev] = by_severity.get(sev, 0) + 1
        for sev, n in sorted(by_severity.items()):
            print(f"  {sev}: {n}")


def cmd_aliases(vault_path: str) -> None:
    """Show alias registry from frontmatter via the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    idx = build_alias_index(conn)
    conn.close()

    if not idx:
        print("No aliases found in database. Run vault ingestion first.")
        print(f"  Vault path: {vault_path}")
        print(f"  Files found: {len(scan_vault(vault_path))}")
        return

    print(f"Alias registry ({len(idx)} entries):")
    for alias, canonical in sorted(idx.items()):
        print(f"  {alias} -> {canonical}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Obsidian vault hygiene tools")
    sub = parser.add_subparsers(dest="command", required=True)

    lint_p = sub.add_parser("lint", help="Run lint checks on vault")
    lint_p.add_argument("vault_path", help="Path to Obsidian vault")

    alias_p = sub.add_parser("aliases", help="Show alias registry")
    alias_p.add_argument("vault_path", help="Path to Obsidian vault")

    args = parser.parse_args()

    vault = args.vault_path
    if not Path(vault).is_dir():
        print(f"Error: {vault} is not a directory", file=sys.stderr)
        sys.exit(1)

    if args.command == "lint":
        cmd_lint(vault)
    elif args.command == "aliases":
        cmd_aliases(vault)


if __name__ == "__main__":
    main()
