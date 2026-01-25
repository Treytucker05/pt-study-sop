from __future__ import annotations

from pathlib import Path

SOP_ROOT = Path(__file__).resolve().parents[1]
SRC = SOP_ROOT / "src"
DEST = SOP_ROOT / "runtime" / "knowledge_upload"

VERSION = "v9.2"

BUNDLES = [
    (
        "00_INDEX_AND_RULES.md",
        "Runtime rules and bundle map",
        [
            "runtime_rules.md",
            "evidence/notebooklm_bridge.md",
        ],
    ),
    (
        "01_MODULES_M0-M6.md",
        "Execution flow (M0-M6)",
        [
            "modules/M0-planning.md",
            "modules/M1-entry.md",
            "modules/M2-prime.md",
            "modules/M3-encode.md",
            "modules/M4-build.md",
            "modules/M5-modes.md",
            "modules/M6-wrap.md",
        ],
    ),
    (
        "02_FRAMEWORKS.md",
        "Frameworks (H/M/Y/Levels + PEIRRO + KWIK)",
        [
            "frameworks/H-series.md",
            "frameworks/M-series.md",
            "frameworks/Y-series.md",
            "frameworks/levels.md",
            "frameworks/PEIRRO.md",
            "frameworks/KWIK.md",
        ],
    ),
    (
        "03_ENGINES.md",
        "Engines (Anatomy + Concept)",
        [
            "engines/anatomy-engine.md",
            "engines/concept-engine.md",
        ],
    ),
    (
        "04_LOGGING_AND_TEMPLATES.md",
        "Logging schema and templates",
        [
            "ROOT:logging_schema_v9.3.md",
            "templates/exit_ticket.md",
            "templates/retrospective_timetable.md",
            "templates/study_metrics_log.md",
            "templates/weekly_plan_template.md",
            "templates/weekly_review_template.md",
            "templates/post_lecture_elaboration_prompts.md",
            "templates/intake_template.md",
            "templates/session_log_template.md",
            "templates/progress_tracker_template.md",
        ],
    ),
    (
        "05_EXAMPLES_MINI.md",
        "Mini examples",
        [
            "examples_mini.md",
        ],
    ),
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def resolve_source(rel_path: str) -> Path:
    if rel_path.startswith("ROOT:"):
        return SOP_ROOT / rel_path.replace("ROOT:", "", 1)
    return SRC / rel_path


def write_bundle(filename: str, scope: str, rel_sources: list[str]) -> Path:
    sources = [resolve_source(rel) for rel in rel_sources]
    missing = [str(path) for path in sources if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing source files: {missing}")

    header_lines = [
        f"# Runtime Bundle: {filename}",
        f"Version: {VERSION}",
        f"Scope: {scope}",
        "This is runtime; canonical source is:",
    ]
    header_lines.extend([f"- {path.relative_to(SOP_ROOT)}" for path in sources])
    header = "\n".join(header_lines) + "\n\n---\n"

    sections: list[str] = [header]
    for path in sources:
        content = read_text(path)
        sections.append(f"\n\n## Source: {path.relative_to(SOP_ROOT)}\n\n{content}\n")

    output_path = DEST / filename
    output_path.write_text("".join(sections).strip() + "\n", encoding="utf-8")
    return output_path


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    generated = []
    for filename, scope, sources in BUNDLES:
        generated.append(write_bundle(filename, scope, sources))

    print("Generated runtime bundle files:")
    for path in generated:
        size = path.stat().st_size
        print(f"- {path.relative_to(SOP_ROOT)} ({size} bytes)")


if __name__ == "__main__":
    main()
