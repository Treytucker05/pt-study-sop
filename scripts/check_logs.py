#!/usr/bin/env python3
"""
Quick validator for session logs.
- Checks required fields are filled (not placeholder).
- Verifies What Worked / Needs Fixing have at least two bullets each.
- Reports per-file status and a summary exit code (0 = all good, 1 = issues).
Usage: python check_logs.py [logs_dir]
Defaults to ../logs relative to this script.
"""

from __future__ import annotations

import sys
from pathlib import Path

PLACEHOLDERS = {
    "YYYY-MM-DD",
    "HH:MM",
    "[Your topic here]",
    "[Sprint/Core/Drill]",
    "[X]",
    "[Yes/No]",
    "[X] minutes",
}

REQUIRED_FIELDS = [
    "Date",
    "Time",
    "Topic",
    "Study Mode",
    "Time Spent (minutes)",
    "Off-source drift? (Y/N)",
    "Cards drafted this session",
    "Confidence for next exam (1-5)",
    "Frameworks Used",
    "Gated Platter Triggered",
    "WRAP Phase Reached",
    "Source snippets used? (Y/N)",
]

SECTION_MIN_BULLETS = {
    "### What Worked": 2,
    "### What Needs Fixing": 2,
}


def field_value(lines, label):
    prefix = f"- {label}:"
    for line in lines:
        if line.strip().lower().startswith(prefix.lower()):
            return line.split(":", 1)[1].strip()
    return None


def bullets_after(lines, header):
    bullets = []
    try:
        start = lines.index(header)
    except ValueError:
        return bullets
    for line in lines[start + 1 :]:
        if line.startswith("### ") and line != header:
            break
        if line.strip().startswith("-") and line.strip() != "-":
            bullets.append(line.strip())
    return bullets


def validate_file(path: Path):
    issues = []
    lines = path.read_text(encoding="utf-8").splitlines()

    # Required fields
    for label in REQUIRED_FIELDS:
        val = field_value(lines, label)
        if val is None:
            issues.append(f"missing field: {label}")
            continue
        if not val or val in PLACEHOLDERS:
            issues.append(f"empty/placeholder: {label}")

    # Bullet sections
    for header, min_count in SECTION_MIN_BULLETS.items():
        bullets = bullets_after(lines, header)
        if len(bullets) < min_count:
            issues.append(f"{header} needs >= {min_count} bullets (found {len(bullets)})")

    return issues


def main():
    base = Path(__file__).resolve().parent
    logs_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else (base.parent / "logs")

    if not logs_dir.exists():
        print(f"No logs directory found at: {logs_dir}")
        sys.exit(1)

    files = sorted(logs_dir.glob("*.md"))
    if not files:
        print(f"No .md logs found in {logs_dir}")
        sys.exit(1)

    any_issues = False
    for path in files:
        issues = validate_file(path)
        if issues:
            any_issues = True
            print(f"[WARN] {path.name}")
            for msg in issues:
                print(f"  - {msg}")
        else:
            print(f"[OK]   {path.name}")

    sys.exit(1 if any_issues else 0)


if __name__ == "__main__":
    main()
