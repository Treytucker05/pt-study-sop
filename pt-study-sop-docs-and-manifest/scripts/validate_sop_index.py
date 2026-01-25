#!/usr/bin/env python3
"""Validate sop/sop_index.v1.json.

Run from the repo root:

    python scripts/validate_sop_index.py

Checks:
- manifest is valid JSON
- no duplicate item paths
- all non-dir items exist on disk
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List, Set, Tuple


MANIFEST_PATH = os.path.join("sop", "sop_index.v1.json")


def iter_items(manifest: Dict[str, Any]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for group in manifest.get("groups", []):
        for section in group.get("sections", []):
            for item in section.get("items", []):
                items.append(item)
    return items


def main() -> int:
    if not os.path.exists(MANIFEST_PATH):
        print(f"[FAIL] Missing manifest: {MANIFEST_PATH}")
        return 2

    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except Exception as e:
        print(f"[FAIL] Could not parse JSON: {MANIFEST_PATH}\n{e}")
        return 2

    items = iter_items(manifest)
    if not items:
        print("[FAIL] Manifest has no items.")
        return 2

    paths: List[str] = []
    bad_paths: List[Tuple[str, str]] = []

    for it in items:
        path = it.get("path", "")
        it_id = it.get("id", "(missing id)")
        it_type = it.get("type", "")

        if not isinstance(path, str) or not path:
            bad_paths.append((it_id, "missing path"))
            continue

        if "\\\" in path or "\" in path:
            bad_paths.append((it_id, f"backslash found in path: {path}"))

        if path.startswith("/") or path.startswith("~"):
            bad_paths.append((it_id, f"absolute-like path not allowed: {path}"))

        if ".." in path.split("/"):
            bad_paths.append((it_id, f"path traversal not allowed: {path}"))

        # Only require existence for non-dir items
        if it_type != "dir":
            full_path = os.path.join(os.getcwd(), path.replace("/", os.sep))
            if not os.path.exists(full_path):
                bad_paths.append((it_id, f"missing file: {path}"))

        paths.append(path)

    duplicates = sorted({p for p in paths if paths.count(p) > 1})

    if duplicates:
        print("[FAIL] Duplicate paths found:")
        for p in duplicates:
            print(f"  - {p}")
        return 2

    if bad_paths:
        print("[FAIL] Path issues found:")
        for it_id, msg in bad_paths:
            print(f"  - {it_id}: {msg}")
        return 2

    print("[OK] sop_index validated.")
    print(f"     Items: {len(items)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
