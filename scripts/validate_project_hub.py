from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PROJECT_DIR = ROOT / "docs" / "project"
INDEX_PATH = PROJECT_DIR / "INDEX.md"

REQUIRED_FILES = [
    "INDEX.md",
    "ROADMAP.md",
    "CURRENT_MILESTONE.md",
    "DECISIONS.md",
    "STATUS.md",
    "REFERENCES.md",
    "README.md",
]

missing_files: list[str] = []
for name in REQUIRED_FILES:
    path = PROJECT_DIR / name
    if not path.exists():
        missing_files.append(str(path.relative_to(ROOT)))

broken_links: list[str] = []
if INDEX_PATH.exists():
    index_text = INDEX_PATH.read_text(encoding="utf-8")
    link_targets = re.findall(r"\[[^\]]+\]\(([^)]+)\)", index_text)

    for target in link_targets:
        target = target.strip()
        if not target:
            continue
        if target.startswith("#"):
            continue
        if re.match(r"^[a-zA-Z]+:", target):
            # Skip absolute paths or external schemes.
            continue

        target_path = target.split("#", 1)[0].strip()
        if not target_path:
            continue

        candidate = (INDEX_PATH.parent / target_path)
        if not candidate.exists():
            broken_links.append(f"{target_path} (from docs/project/INDEX.md)")
else:
    missing_files.append(str(INDEX_PATH.relative_to(ROOT)))

if missing_files or broken_links:
    print("Project Hub validation failed.")
    if missing_files:
        print("Missing files:")
        for item in missing_files:
            print(f"- {item}")
    if broken_links:
        print("Broken links in docs/project/INDEX.md:")
        for item in broken_links:
            print(f"- {item}")
    sys.exit(1)

print("Project Hub validation passed.")
