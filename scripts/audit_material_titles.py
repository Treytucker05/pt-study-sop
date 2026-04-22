"""Audit + backfill material titles that are empty or look like filesystem paths.

Run:
    python scripts/audit_material_titles.py           # dry-run, show candidates
    python scripts/audit_material_titles.py --apply   # write the fixes

Rule: a title needs fixing if it is NULL/empty OR contains a slash/backslash
OR ends with a known file extension. The replacement title is the basename of
the source_path with the extension stripped, a leading ingestion checksum
(e.g. "19fc3260e4a0_") removed, and underscores/hyphens converted to spaces.
"""

from __future__ import annotations

import argparse
import re
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "brain" / "data" / "pt_study.db"
EXTENSIONS = (".pdf", ".docx", ".pptx", ".mp4", ".txt", ".md", ".xlsx", ".csv")


def needs_fix(title: str) -> bool:
    """Return True when title is empty/NULL or a filesystem path."""
    if not title:
        return True
    if "\\" in title or "/" in title:
        return True
    lowered = title.lower()
    return any(lowered.endswith(ext) for ext in EXTENSIONS)


def derive_title(title: str, source_path: str | None) -> str:
    candidate = source_path or title
    basename = Path(candidate.replace("\\", "/")).name
    stem = re.sub(r"\.[^.]+$", "", basename)
    # strip common ingestion prefixes like "abc123def_" checksum stamps
    stem = re.sub(r"^[0-9a-f]{8,}_", "", stem, flags=re.IGNORECASE)
    cleaned = re.sub(r"[_\-]+", " ", stem)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        cleaned = basename
    return cleaned


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write the fixes to the database",
    )
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"[error] DB not found at {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Materials are stored in rag_docs with corpus='materials' (see
    # brain/dashboard/api_tutor_materials.py). Guard against NULL corpus for
    # legacy rows.
    rows = conn.execute(
        """
        SELECT id, title, source_path
          FROM rag_docs
         WHERE COALESCE(corpus, 'materials') = 'materials'
         ORDER BY id
        """,
    ).fetchall()

    fixes: list[tuple[int, str, str]] = []
    for row in rows:
        title = (row["title"] or "").strip()
        if not needs_fix(title):
            continue
        new_title = derive_title(title, row["source_path"])
        if new_title and new_title != title:
            fixes.append((row["id"], title, new_title))

    if not fixes:
        print("No materials need a title fix. Nothing to do.")
        conn.close()
        return 0

    print(f"Found {len(fixes)} material(s) to fix:")
    for mat_id, old, new in fixes:
        old_label = old if old else "<empty>"
        print(f"  id={mat_id:>4}  {old_label!r:<60}  ->  {new!r}")

    if not args.apply:
        print("\nDry-run only. Re-run with --apply to write changes.")
        conn.close()
        return 0

    with conn:
        conn.executemany(
            "UPDATE rag_docs SET title = ? WHERE id = ?",
            [(new, mat_id) for mat_id, _, new in fixes],
        )
    print(f"\nUpdated {len(fixes)} material title(s).")
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
