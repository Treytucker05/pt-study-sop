#!/usr/bin/env python3
"""
Remove duplicate syllabus events (course_events) that may be introduced by
importing the same syllabus JSON more than once. Dry-run by default.
"""

import argparse
import sys
from pathlib import Path

# Ensure this script can be run from repo root or brain/ by adding script dir to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from import_syllabus import dedupe_course_events


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Deduplicate syllabus course_events (dry-run by default).",
    )
    parser.add_argument(
        "--course-id",
        type=int,
        help="Optional course_id to limit dedupe scope (default: all courses)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually delete duplicates instead of running a dry-run.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print detailed ids kept/deleted.",
    )
    args = parser.parse_args()

    summary = dedupe_course_events(
        course_id=args.course_id,
        apply=args.apply,
        verbose=args.verbose,
    )

    course_scope = f"course_id={args.course_id}" if args.course_id else "all courses"
    print(f"[INFO] Dedupe scope: {course_scope}")
    print(
        f"[INFO] Events scanned: {summary['total_events']} | "
        f"unique keys: {summary['unique_events']} | duplicates found: {summary['duplicates_found']}"
    )

    if args.apply:
        print(f"[OK] Deleted {summary['deleted']} duplicate row(s): {summary['deleted_ids']}")
    else:
        print("[DRY-RUN] No rows deleted. Re-run with --apply to delete duplicates.")


if __name__ == "__main__":
    main()
