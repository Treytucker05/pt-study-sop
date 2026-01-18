from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    context_arch = repo_root / "context" / "architecture"
    sop_methods = repo_root / "sop" / "library" / "methods"
    school_notes = repo_root / "PT School Semester 2"

    # 1) Ensure context/architecture exists
    context_arch.mkdir(parents=True, exist_ok=True)

    # 2) Find SOPs in old location
    if not sop_methods.exists():
        print(f"[WARN] SOP methods folder not found: {sop_methods}")
        md_files = []
    else:
        md_files = sorted(sop_methods.glob("*.md"))

    # 3) Copy SOPs into context/architecture
    moved_count = 0
    for md_file in md_files:
        dest = context_arch / md_file.name
        shutil.copy2(md_file, dest)
        print(f"Moved {md_file.name} -> {dest}")
        moved_count += 1

    print(f"Moved {moved_count} files")

    # 4) Verify School Notes folder
    if not school_notes.exists():
        school_notes.mkdir(parents=True, exist_ok=True)
        print(f"[WARN] Created missing folder: {school_notes}")

    # 5) Trigger ingestion
    cmd = ["python", str(repo_root / "src" / "graph" / "ingest.py")]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="")

    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
