"""One-shot migration: split INTERROGATE -> ELABORATE + INTERLEAVE.

Phase 1 (--phase=1): Rename + retag the six M-INT-* method files (12 files total).
Phase 2 (--phase=2): Bulk-update M-INT-XXX references across all source files
                     (chains, sibling methods, runtime, tests, docs).

Usage:
  python scripts/migrate_split_interrogate.py --phase=1
  python scripts/migrate_split_interrogate.py --phase=2
"""
from __future__ import annotations
import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ID_MAP = {
    "M-INT-001": "M-ELB-001",  # Analogy Bridge -> ELABORATE
    "M-INT-002": "M-ELB-002",  # Clinical Application -> ELABORATE
    "M-INT-003": "M-ILV-001",  # Cross-Topic Link -> INTERLEAVE
    "M-INT-004": "M-ILV-002",  # Side-by-Side Comparison -> INTERLEAVE
    "M-INT-005": "M-ELB-003",  # Case Walkthrough -> ELABORATE
    "M-INT-006": "M-ELB-004",  # Illness Script Builder -> ELABORATE
}
CATEGORY_OF = {
    "M-ELB-001": "ELABORATE",
    "M-ELB-002": "ELABORATE",
    "M-ELB-003": "ELABORATE",
    "M-ELB-004": "ELABORATE",
    "M-ILV-001": "INTERLEAVE",
    "M-ILV-002": "INTERLEAVE",
}
TAG_OF = {"ELABORATE": "elaborate", "INTERLEAVE": "interleave"}
VERB_OF = {"ELABORATE": "elaborate on", "INTERLEAVE": "interleave"}


def run_git(*args: str) -> None:
    res = subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8"
    )
    if res.returncode != 0:
        print(f"git {' '.join(args)} failed:\n{res.stderr}", file=sys.stderr)
        sys.exit(2)


def phase1_rename_and_retag() -> None:
    methods_dir = ROOT / "sop/library/methods"

    for old_id, new_id in ID_MAP.items():
        for ext in ("yaml", "md"):
            old = methods_dir / f"{old_id}.{ext}"
            if not old.exists():
                print(f"skip (missing): {old.name}")
                continue
            new_rel = (methods_dir / f"{new_id}.{ext}").relative_to(ROOT)
            old_rel = old.relative_to(ROOT)
            run_git("mv", str(old_rel), str(new_rel))
            print(f"renamed: {old.name} -> {new_id}.{ext}")

    for old_id, new_id in ID_MAP.items():
        cat = CATEGORY_OF[new_id]
        tag = TAG_OF[cat]
        verb = VERB_OF[cat]
        for ext in ("yaml", "md"):
            f = methods_dir / f"{new_id}.{ext}"
            if not f.exists():
                continue
            text = f.read_text(encoding="utf-8")
            original = text

            text = text.replace(old_id, new_id)
            text = re.sub(r"\bINTERROGATE\b", cat, text)
            text = re.sub(r"(?m)^- interrogate\b", f"- {tag}", text)
            text = re.sub(r"(?<![\w-])interrogate(?![\w-])", tag, text)
            text = text.replace(
                "interrogate already-encoded material",
                f"{verb} already-encoded material",
            )
            text = text.replace("retrieval or interrogation", f"retrieval or {tag}")

            if text != original:
                f.write_text(text, encoding="utf-8")
                print(f"retagged: {f.name}")


def phase2_bulk_refs() -> None:
    SKIP_PREFIXES = (
        "exports/",
        "conductor/tracks/_archive/",
        "docs/archive/",
        "sop/tests/golden/",
        "sop/runtime/knowledge_upload/",
        "docs/audit/",
    )
    SKIP_FILES = {"sop/library/15-method-library.md"}
    KEEP_EXTS = {".yaml", ".yml", ".md", ".py", ".json", ".ts", ".tsx", ".csv", ".mmd", ".txt"}

    res = subprocess.run(
        ["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8"
    )
    files = [Path(p) for p in res.stdout.splitlines() if p.strip()]

    changed = 0
    for rel in files:
        rel_str = str(rel).replace("\\", "/")
        if any(rel_str.startswith(p) for p in SKIP_PREFIXES):
            continue
        if rel_str in SKIP_FILES:
            continue
        if rel.suffix.lower() not in KEEP_EXTS:
            continue
        f = ROOT / rel
        if not f.exists():
            continue
        try:
            text = f.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if not any(old in text for old in ID_MAP):
            continue
        new_text = text
        for old, new in ID_MAP.items():
            new_text = new_text.replace(old, new)
        if new_text != text:
            f.write_text(new_text, encoding="utf-8")
            print(f"bulk-updated: {rel_str}")
            changed += 1
    print(f"--- {changed} files updated ---")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--phase", type=int, required=True, choices=[1, 2])
    args = ap.parse_args()
    if args.phase == 1:
        phase1_rename_and_retag()
    elif args.phase == 2:
        phase2_bulk_refs()


if __name__ == "__main__":
    main()
