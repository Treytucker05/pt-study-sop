from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

IGNORE_DIRS = {
    ".git",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
    "node_modules",
    "dist",
    "build",
}

PLANNING_IGNORE_PREFIXES = [
    ROOT / ".agent",
    ROOT / "JANUARY_26_PLAN",
    ROOT / "scripts" / "ralph",
    ROOT / "scripts" / "_ai_config_backups",
    ROOT / "brain" / "static",
    ROOT / "scholar" / "outputs",
    ROOT / "scholar" / "knowledge",
    ROOT / "gpt_bundle_v9.3",
    ROOT / "sop" / "runtime",
    ROOT / "sop" / "runtime" / "knowledge_upload",
    ROOT / "docs" / "logs",
]

DASHBOARD_REBUILD_ROOT = ROOT / "dashboard_rebuild"
DASHBOARD_REBUILD_SRC = DASHBOARD_REBUILD_ROOT / "client" / "src"

FATAL_DISALLOWED_AREAS = [
    ROOT / "docs" / "project",
    ROOT / "docs" / "prd",
    ROOT / "workstreams",
]

DISALLOWED_NAME_RE = re.compile(r"(moved|old|backup|copy|final_final|deprecated)", re.I)
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")

PLANNING_KEYWORDS = {
    "PRD": re.compile(r"\bPRD\b", re.I),
    "milestone": re.compile(r"\bmilestone\b", re.I),
    "execplan": re.compile(r"\bexec\s*plan\b|\bexecplan\b", re.I),
    "implementation plan": re.compile(r"\bimplementation plan\b", re.I),
}


def is_ignored(path: Path) -> bool:
    return any(part in IGNORE_DIRS for part in path.parts)


def is_under(path: Path, base: Path) -> bool:
    try:
        path.resolve().relative_to(base.resolve())
        return True
    except ValueError:
        return False


def rel(path: Path) -> str:
    return str(path.resolve().relative_to(ROOT))


def is_planning_scan_ignored(path: Path) -> bool:
    if is_ignored(path):
        return True
    for prefix in PLANNING_IGNORE_PREFIXES:
        if is_under(path, prefix):
            return True
    if is_under(path, DASHBOARD_REBUILD_ROOT) and not is_under(path, DASHBOARD_REBUILD_SRC):
        return True
    return False


def is_fatal_disallowed(path: Path) -> bool:
    return any(is_under(path, base) for base in FATAL_DISALLOWED_AREAS)


def collect_linked_paths(index_path: Path) -> set[Path]:
    text = index_path.read_text(encoding="utf-8", errors="ignore")
    targets = LINK_RE.findall(text)
    linked: set[Path] = set()
    for target in targets:
        target = target.strip()
        if not target or target.startswith("#"):
            continue
        if re.match(r"^[a-zA-Z]+:", target):
            continue
        target = target.split("#", 1)[0].strip()
        if not target or target.startswith("/"):
            continue
        candidate = (index_path.parent / target).resolve()
        if candidate.exists():
            linked.add(candidate)
    return linked


def print_warning_list(title: str, items: list[str]) -> None:
    print(title)
    if not items:
        print("- none")
        print("")
        return
    if len(items) > 20:
        print(f"- count: {len(items)} (showing 10)")
        for item in items[:10]:
            print(f"- {item}")
        print("")
        return
    for item in items:
        print(f"- {item}")
    print("")


def print_planning_hits(title: str, items: list[str]) -> None:
    print(title)
    if not items:
        print("- none")
        print("")
        return
    print(f"- count: {len(items)} (showing 10)")
    for item in items[:10]:
        print(f"- {item}")
    print("")


def main() -> None:
    disallowed_fatal: list[Path] = []
    disallowed_warn: list[Path] = []
    for path in ROOT.rglob("*"):
        if is_ignored(path):
            continue
        if DISALLOWED_NAME_RE.search(path.name):
            if is_fatal_disallowed(path):
                disallowed_fatal.append(path)
            else:
                disallowed_warn.append(path)

    planning_hits: list[str] = []
    for path in ROOT.rglob("*.md"):
        if is_planning_scan_ignored(path):
            continue
        if is_under(path, ROOT / "docs") or is_under(path, ROOT / "workstreams"):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        hits = [name for name, regex in PLANNING_KEYWORDS.items() if regex.search(text)]
        if hits:
            planning_hits.append(f"{rel(path)}: {', '.join(sorted(hits))}")

    missing_index: list[Path] = []
    unlinked_files: list[tuple[Path, Path]] = []
    workstreams_dir = ROOT / "workstreams"
    if workstreams_dir.exists():
        for workstream in sorted(p for p in workstreams_dir.iterdir() if p.is_dir()):
            index_path = workstream / "INDEX.md"
            if not index_path.exists():
                missing_index.append(workstream)
                continue
            linked = collect_linked_paths(index_path)
            for file_path in workstream.rglob("*"):
                if file_path.is_dir():
                    continue
                if is_ignored(file_path):
                    continue
                if file_path.name == "INDEX.md" or file_path.name.startswith("."):
                    continue
                if file_path.resolve() not in linked:
                    unlinked_files.append((workstream, file_path))

    print("Repo Hygiene Audit")
    print("")

    print("FAIL")
    if not disallowed_fatal:
        print("- none")
    else:
        for path in sorted(disallowed_fatal):
            print(f"- {rel(path)}")
    print("")

    print_warning_list(
        "WARN: disallowed-name files (non-critical)",
        [rel(path) for path in sorted(disallowed_warn)],
    )

    print_planning_hits(
        "WARN: planning-keyword docs outside docs/workstreams (unexpected)",
        sorted(planning_hits),
    )

    print("Workstreams missing INDEX.md")
    if not missing_index:
        print("- none")
    else:
        for path in sorted(missing_index):
            print(f"- {rel(path)}")
    print("")

    print("Workstreams unlinked files (warn)")
    if not unlinked_files:
        print("- none")
    else:
        grouped: dict[Path, list[Path]] = {}
        for workstream, file_path in unlinked_files:
            grouped.setdefault(workstream, []).append(file_path)
        for workstream in sorted(grouped):
            print(f"- {rel(workstream)}")
            for file_path in sorted(grouped[workstream]):
                print(f"  - {rel(file_path)}")
    print("")

    if disallowed_fatal:
        print("FAIL: disallowed name patterns found in protected areas.")
        sys.exit(1)

    print("Audit complete.")


if __name__ == "__main__":
    main()
