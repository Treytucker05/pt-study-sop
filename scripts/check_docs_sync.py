#!/usr/bin/env python3
from __future__ import annotations

import re
import subprocess
from pathlib import Path


def _resolve_root() -> Path:
    """Return the working-tree root, handling git worktrees correctly."""
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
        if out:
            return Path(out).resolve()
    except Exception:
        pass
    return Path(__file__).resolve().parent.parent


ROOT = _resolve_root()
MASTER_CANON = ROOT / "README.md"
DUPLICATE_TUTOR_TRACK = ROOT / "conductor" / "tracks" / "tutor_launch_shell_realignment_20260313"
DELETED_ACTIVE_DOCS = [
    ROOT / "docs" / "root" / "TUTOR_STUDY_BUDDY_CANON.md",
    ROOT / "docs" / "root" / "GUIDE_TUTOR_FLOW.md",
    ROOT / "docs" / "root" / "GUIDE_ARCHITECTURE.md",
    ROOT / "docs" / "root" / "GUIDE_USER.md",
    ROOT / "docs" / "root" / "TUTOR_OWNER_INTENT.md",
    ROOT / "docs" / "root" / "TUTOR_CATEGORY_DEFINITIONS.md",
    ROOT / "docs" / "root" / "TUTOR_METHOD_SELECTION_RULES.md",
    ROOT / "docs" / "root" / "TUTOR_CONTROL_PLANE_CANON.md",
]

SECONDARY_DOCS_REQUIRING_MASTER_POINTER = [
    ROOT / "AGENTS.md",
    ROOT / "docs" / "README.md",
    ROOT / "docs" / "root" / "README.md",
    ROOT / "docs" / "root" / "TUTOR_TODO.md",
    ROOT / "docs" / "root" / "PROJECT_ARCHITECTURE.md",
    ROOT / "docs" / "root" / "GUIDE_DEV.md",
    ROOT / "docs" / "root" / "AGENT_SETUP.md",
    ROOT / "docs" / "root" / "AGENT_GUARDRAILS.md",
    ROOT / "dashboard_rebuild" / "README.md",
    ROOT / "dashboard_rebuild" / "client" / "src" / "pages" / "README.md",
    ROOT / "conductor" / "index.md",
    ROOT / "conductor" / "product.md",
    ROOT / "conductor" / "workflow.md",
    ROOT / "conductor" / "tracks.md",
]

ACTIVE_DOCS_NO_DELETED_PATHS = [
    ROOT / "README.md",
    ROOT / "AGENTS.md",
    ROOT / "docs" / "README.md",
    ROOT / "docs" / "root" / "README.md",
    ROOT / "docs" / "root" / "TUTOR_TODO.md",
    ROOT / "docs" / "root" / "PROJECT_ARCHITECTURE.md",
    ROOT / "docs" / "root" / "GUIDE_DEV.md",
    ROOT / "docs" / "root" / "AGENT_SETUP.md",
    ROOT / "docs" / "root" / "AGENT_GUARDRAILS.md",
    ROOT / "docs" / "root" / "TUTOR_OBSIDIAN_NOTE_RULES.md",
    ROOT / "conductor" / "index.md",
    ROOT / "conductor" / "product.md",
    ROOT / "conductor" / "workflow.md",
    ROOT / "conductor" / "tracks.md",
    ROOT / "dashboard_rebuild" / "README.md",
    ROOT / "dashboard_rebuild" / "client" / "src" / "pages" / "README.md",
    ROOT / "conductor" / "tracks" / "tutor-launch-shell-realignment_20260313" / "index.md",
    ROOT / "conductor" / "tracks" / "tutor-launch-shell-realignment_20260313" / "spec.md",
    ROOT / "conductor" / "tracks" / "tutor-launch-shell-realignment_20260313" / "plan.md",
    ROOT / "conductor" / "tracks" / "course-keyed-tutor-shell_20260313" / "index.md",
    ROOT / "conductor" / "tracks" / "course-keyed-tutor-shell_20260313" / "spec.md",
    ROOT / "conductor" / "tracks" / "tutor-10-certification_20260307" / "index.md",
    ROOT / "conductor" / "tracks" / "trey-agent-repo-readiness_20260313" / "spec.md",
    ROOT / "conductor" / "tracks" / "trey-agent-repo-readiness_20260313" / "findings.md",
]

TOP_LINE_ONLY = {
    ROOT / "docs" / "root" / "TUTOR_TODO.md": 120,
    ROOT / "conductor" / "tracks.md": 120,
}

ROUTE_TRUTH_DOCS = [
    ROOT / "README.md",
    ROOT / "docs" / "root" / "PROJECT_ARCHITECTURE.md",
]


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _tracked_files(pattern: str) -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "-C", str(ROOT), "ls-files", pattern],
            capture_output=True,
            text=True,
            check=True,
        )
    except Exception:
        return []
    paths: list[Path] = []
    for line in result.stdout.splitlines():
        rel = line.strip()
        if not rel:
            continue
        path = ROOT / rel
        if path.exists():
            paths.append(path)
    return paths


def _tracked_readmes() -> list[Path]:
    return _tracked_files("*README*.md")


def _tracked_markdown() -> list[Path]:
    return _tracked_files("*.md")


def _top_lines(path: Path, count: int = 40) -> str:
    return "\n".join(_read_text(path).splitlines()[:count])


def _active_slice(path: Path) -> str:
    if path in TOP_LINE_ONLY:
        return _top_lines(path, TOP_LINE_ONLY[path])
    return _read_text(path)


def _require_contains(path: Path, text: str, needle: str, failures: list[str]) -> None:
    if needle not in text:
        failures.append(f"{path}: missing required phrase: {needle}")


def main() -> None:
    failures: list[str] = []

    for removed_path in DELETED_ACTIVE_DOCS:
        if removed_path.exists():
            failures.append(f"Deprecated doc should be removed: {removed_path}")

    if DUPLICATE_TUTOR_TRACK.exists() and any(DUPLICATE_TUTOR_TRACK.iterdir()):
        failures.append(f"Duplicate Tutor launch track should be removed: {DUPLICATE_TUTOR_TRACK}")

    for doc in SECONDARY_DOCS_REQUIRING_MASTER_POINTER:
        if not doc.exists():
            failures.append(f"Missing required secondary doc: {doc}")
            continue
        if "README.md" not in _top_lines(doc):
            failures.append(f"{doc}: must point to README.md near the top of the file")

    runtime_prompt_path = ROOT / "sop" / "runtime" / "runtime_prompt.md"
    runtime_prompt = _read_text(runtime_prompt_path)
    runtime_version_match = re.search(r"^Version:\s*(v[0-9.]+)\s*$", runtime_prompt, flags=re.M)
    runtime_version = runtime_version_match.group(1) if runtime_version_match else None
    if not runtime_version_match:
        failures.append(f"{runtime_prompt_path}: missing 'Version: vX.Y.Z' line")

    readme_path = ROOT / "README.md"
    readme = _read_text(readme_path)
    agents_path = ROOT / "AGENTS.md"
    agents = _read_text(agents_path)
    claude_path = ROOT / "CLAUDE.md"
    claude = _read_text(claude_path)
    guide_path = ROOT / "docs" / "root" / "GUIDE_DEV.md"
    guide = _read_text(guide_path)
    architecture_path = ROOT / "docs" / "root" / "PROJECT_ARCHITECTURE.md"
    architecture = _read_text(architecture_path)
    todo_path = ROOT / "docs" / "root" / "TUTOR_TODO.md"
    todo_top = _top_lines(todo_path, 80)
    docs_readme_path = ROOT / "docs" / "README.md"
    docs_readme = _read_text(docs_readme_path)
    conductor_index_path = ROOT / "conductor" / "index.md"
    conductor_index = _read_text(conductor_index_path)
    conductor_product_path = ROOT / "conductor" / "product.md"
    conductor_product = _read_text(conductor_product_path)
    conductor_workflow_path = ROOT / "conductor" / "workflow.md"
    conductor_workflow = _read_text(conductor_workflow_path)
    conductor_tracks_path = ROOT / "conductor" / "tracks.md"
    conductor_tracks = _read_text(conductor_tracks_path)
    dashboard_readme_path = ROOT / "dashboard_rebuild" / "README.md"
    dashboard_readme = _read_text(dashboard_readme_path)
    pages_readme_path = ROOT / "dashboard_rebuild" / "client" / "src" / "pages" / "README.md"
    pages_readme = _read_text(pages_readme_path)

    if runtime_version and runtime_version not in readme:
        failures.append(f"{readme_path}: must mention runtime prompt version {runtime_version}")

    _require_contains(readme_path, readme, "master repo truth", failures)
    _require_contains(readme_path, readme, "Exit Ticket + Session Ledger", failures)

    if "Tracker JSON" in readme:
        failures.append(f"{readme_path}: must not mention 'Tracker JSON' (JSON is post-session via Brain ingestion)")

    if "README.md" not in agents:
        failures.append(f"{agents_path}: must point to README.md as top-level repo truth")

    required_guide_phrases = [
        "Start_Dashboard.bat",
        "http://127.0.0.1:5000",
        "npm run build",
        "brain/static/dist",
        "npm run dev",
    ]
    for phrase in required_guide_phrases:
        if phrase not in guide:
            failures.append(f"{guide_path}: missing required phrase: {phrase}")

    if "docs/root/GUIDE_DEV.md" not in claude:
        failures.append(f"{claude_path}: must point to docs/root/GUIDE_DEV.md as the canonical command reference")

    _require_contains(architecture_path, architecture, "Master repo truth: `README.md`", failures)
    _require_contains(todo_path, todo_top, "Authority: execution-only sprint and backlog tracker. Top-level repo truth lives only in `README.md`.", failures)
    _require_contains(todo_path, todo_top, "- Top-level repo truth: `README.md`", failures)
    _require_contains(todo_path, todo_top, "Conductor execution registry: `conductor/tracks.md`", failures)

    for path, text in (
        (docs_readme_path, docs_readme),
        (conductor_index_path, conductor_index),
        (conductor_product_path, conductor_product),
        (conductor_workflow_path, conductor_workflow),
        (conductor_tracks_path, conductor_tracks),
        (dashboard_readme_path, dashboard_readme),
        (pages_readme_path, pages_readme),
    ):
        _require_contains(path, text, "README.md", failures)

    _require_contains(docs_readme_path, docs_readme, "Top-level repo truth", failures)
    _require_contains(conductor_index_path, conductor_index, "Conductor is execution-only in this repo.", failures)
    _require_contains(conductor_product_path, conductor_product, "This file is not product authority.", failures)
    _require_contains(conductor_workflow_path, conductor_workflow, "Execution-only workflow for this repo.", failures)
    _require_contains(conductor_tracks_path, conductor_tracks, "Execution registry only. Product or subsystem truth does not live here.", failures)
    _require_contains(dashboard_readme_path, dashboard_readme, "This README is implementation context only, not product authority.", failures)
    _require_contains(pages_readme_path, pages_readme, "This file is implementation context only, not product authority.", failures)

    forbidden_active_strings = [
        "docs/root/TUTOR_STUDY_BUDDY_CANON.md",
        "docs/root/GUIDE_TUTOR_FLOW.md",
        "docs/root/GUIDE_ARCHITECTURE.md",
        "docs/root/GUIDE_USER.md",
        "docs/root/TUTOR_OWNER_INTENT.md",
        "docs/root/TUTOR_CATEGORY_DEFINITIONS.md",
        "docs/root/TUTOR_METHOD_SELECTION_RULES.md",
        "docs/root/TUTOR_CONTROL_PLANE_CANON.md",
        "conductor/tracks/tutor_launch_shell_realignment_20260313/",
    ]
    for path in ACTIVE_DOCS_NO_DELETED_PATHS:
        if not path.exists():
            failures.append(f"Missing active doc expected by validator: {path}")
            continue
        text = _active_slice(path)
        for forbidden in forbidden_active_strings:
            if forbidden in text:
                failures.append(f"{path}: still references retired active path: {forbidden}")

    tutor_page = _read_text(ROOT / "dashboard_rebuild" / "client" / "src" / "pages" / "tutor.tsx")
    if "TutorWizard" in tutor_page:
        for path in ROUTE_TRUTH_DOCS:
            if "TutorStartPanel" in _read_text(path):
                failures.append(f"{path}: must not present TutorStartPanel as live while /tutor still renders TutorWizard")

    strict_legacy_patterns = (
        r"learning loop \(V2\)",
        r"\bdist/public\b",
        r"\brobocopy\b",
    )
    contextual_legacy_patterns = (
        r"\bPEIRRO\b",
        r"\bPERRIO\b",
        r"\bPEIR-RO\b",
        r"\binterrogate\b",
    )
    contextual_allow_hints = ("legacy", "compatib")

    for readme_file in _tracked_readmes():
        text = _read_text(readme_file)
        if not re.search(r"(CP-MSS|Control Plane)", text, flags=re.I):
            failures.append(f"{readme_file}: must mention CP-MSS/Control Plane so current system is surfaced first")
        for i, line in enumerate(text.splitlines(), start=1):
            line_lower = line.lower()
            for pat in strict_legacy_patterns:
                if re.search(pat, line, flags=re.I):
                    failures.append(f"{readme_file}:{i}: contains deprecated term '{pat}'. Use current CP-MSS wording.")
            for pat in contextual_legacy_patterns:
                if re.search(pat, line, flags=re.I) and not any(h in line_lower for h in contextual_allow_hints):
                    failures.append(f"{readme_file}:{i}: legacy term '{pat}' must be explicitly marked as legacy/compatibility.")

    markdown_strict_excluded_prefixes = (
        "docs/archive/",
        "docs/plans/",
        "docs/prd/",
        "docs/project/",
        "dashboard_rebuild/attached_assets/",
        "brain/README.md",
        "sop/README.md",
        "GEMINI.md",
        "sop/archive/",
        "scholar/knowledge/",
        "sop/runtime/knowledge_upload/",
        "sop/tests/golden/",
        "conductor/tracks/",
    )
    markdown_allow_hints = ("legacy", "compatib", "deprecat", "archiv", "stale", "histor")
    product_truth_patterns = (
        r"The Plan is the Source of Truth",
        r"single source of truth",
        r"canonical home route",
        r"learner-facing Scholar",
    )

    for md_file in _tracked_markdown():
        rel = md_file.relative_to(ROOT).as_posix()
        if any(rel.startswith(prefix) for prefix in markdown_strict_excluded_prefixes):
            continue
        text = _read_text(md_file)
        for i, line in enumerate(text.splitlines(), start=1):
            line_lower = line.lower()
            for pat in strict_legacy_patterns:
                if re.search(pat, line, flags=re.I) and not any(h in line_lower for h in markdown_allow_hints):
                    failures.append(f"{md_file}:{i}: contains deprecated term '{pat}'.")
            if md_file != MASTER_CANON:
                for pat in product_truth_patterns:
                    if re.search(pat, line, flags=re.I):
                        if "rg -n " in line or line.strip().startswith("`rg -n "):
                            continue
                        if not any(h in line_lower for h in markdown_allow_hints):
                            failures.append(f"{md_file}:{i}: contains unauthorized product-truth phrase '{pat}'.")

    historical_required_markers = [
        ROOT / "conductor" / "tracks" / "brain-centered-triad_20260312" / "spec.md",
        ROOT / "conductor" / "tracks" / "brain-centered-triad_20260312" / "decision-record.md",
        ROOT / "conductor" / "tracks" / "brain-centered-triad_20260312" / "index.md",
        ROOT / "conductor" / "tracks" / "brain-scholar-tutor-realignment_20260311" / "spec.md",
    ]
    historical_marker = "Historical track artifact. Product/ownership authority lives only in `README.md`."
    for path in historical_required_markers:
        _require_contains(path, _read_text(path), historical_marker, failures)

    if failures:
        print("Docs sync check failed:")
        for item in failures:
            print(f"- {item}")
        raise SystemExit(1)

    print("Docs sync check passed.")


if __name__ == "__main__":
    main()
