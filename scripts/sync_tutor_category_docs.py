"""Sync Tutor category pages in Obsidian from hardened method YAML cards.

Usage:
  python scripts/sync_tutor_category_docs.py
  python scripts/sync_tutor_category_docs.py --output-dir "C:\\path\\to\\Categories"
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import yaml


STAGE_META = {
    "PRIME": {
        "title": "PRIME",
        "file": "Prime.md",
        "definition": "Orient the learner to the big picture before deep study. PRIME is non-assessment and exists to provide structure.",
        "entry": "Session start, new topic, or restart after delay.",
        "exit": "Learner has objective map + structural orientation and is ready to proceed.",
        "rules": [
            "No scored checks in PRIME.",
            "Run objective alignment before deep content.",
            "Provide scaffolds; do not force recall grading.",
        ],
    },
    "CALIBRATE": {
        "title": "CALIBRATE",
        "file": "Calibrate.md",
        "definition": "Measure confidence vs actual performance quickly so routing and difficulty are accurate.",
        "entry": "After PRIME, at session start, and after major performance shifts.",
        "exit": "Calibration signals are captured and next-step routing is selected.",
        "rules": [
            "Capture confidence with each probe.",
            "Keep calibration short and focused.",
            "Route miscalibration to targeted support.",
        ],
    },
    "ENCODE": {
        "title": "ENCODE",
        "file": "Encode.md",
        "definition": "Create durable memory traces through active transformation, explanation, mapping, and structured generation.",
        "entry": "After CALIBRATE identifies what needs to be learned or rebuilt.",
        "exit": "Learner can explain the concept with minimal support.",
        "rules": [
            "Require active processing (not passive reading).",
            "Keep work scoped to mapped objectives.",
            "Convert understanding into explicit artifacts.",
        ],
    },
    "REFERENCE": {
        "title": "REFERENCE",
        "file": "Reference.md",
        "definition": "Build external anchors and targets the learner can use for retrieval and transfer.",
        "entry": "After ENCODE or when retrieval lacks clear targets.",
        "exit": "Reference artifacts and explicit targets are ready for retrieval.",
        "rules": [
            "No retrieval without targets.",
            "Produce explicit artifacts and target lists.",
            "Keep artifacts objective-linked and testable.",
        ],
    },
    "RETRIEVE": {
        "title": "RETRIEVE",
        "file": "Retrieve.md",
        "definition": "Strengthen learning through attempt-first recall and corrective feedback.",
        "entry": "After REFERENCE artifacts/targets exist.",
        "exit": "Planned prompts attempted, scored, and feedback delivered.",
        "rules": [
            "Attempt-first, then feedback.",
            "Use closed-note recall by default.",
            "Route repeated misses back to ENCODE/REFERENCE.",
        ],
    },
    "OVERLEARN": {
        "title": "OVERLEARN",
        "file": "Overlearn.md",
        "definition": "Move from competence to fluency with bounded high-success repetition and spacing.",
        "entry": "After stable retrieval performance is demonstrated.",
        "exit": "Fluency criteria met without burnout.",
        "rules": [
            "Protect accuracy while increasing speed/automaticity.",
            "Cap intensity loops to prevent fatigue.",
            "Feed future spacing/review schedules.",
        ],
    },
}


def _fmt_list(items: list[str]) -> list[str]:
    return [f"- {item}" for item in items] if items else ["- None"]


def _fmt_knobs(knobs: dict[str, Any] | None) -> list[str]:
    if not isinstance(knobs, dict) or not knobs:
        return ["- None"]
    out: list[str] = []
    for key, spec in knobs.items():
        if isinstance(spec, dict):
            typ = spec.get("type", "")
            default = spec.get("default", "")
            options = spec.get("options")
            if isinstance(options, list) and options:
                out.append(
                    f"- `{key}` ({typ}) default=`{default}` options={', '.join(map(str, options))}"
                )
            else:
                range_parts = []
                if "min" in spec:
                    range_parts.append(f"min={spec['min']}")
                if "max" in spec:
                    range_parts.append(f"max={spec['max']}")
                suffix = f" {' '.join(range_parts)}" if range_parts else ""
                out.append(f"- `{key}` ({typ}) default=`{default}`{suffix}")
        else:
            out.append(f"- `{key}`: {spec}")
    return out


def load_method_cards(methods_dir: Path) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for path in sorted(methods_dir.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if not isinstance(data, dict):
            continue
        data["_file"] = path.name
        cards.append(data)
    return cards


def render_category_doc(stage: str, methods: list[dict[str, Any]]) -> str:
    meta = STAGE_META[stage]
    lines: list[str] = []
    lines.append(f"# {meta['title']}")
    lines.append("")
    lines.append("## Definition")
    lines.append(meta["definition"])
    lines.append("")
    lines.append("## Entry Criteria")
    lines.append(meta["entry"])
    lines.append("")
    lines.append("## Exit Criteria")
    lines.append(meta["exit"])
    lines.append("")
    lines.append("## Hard Rules")
    lines.extend([f"- {rule}" for rule in meta["rules"]])
    lines.append("")
    lines.append(f"## Method Inventory ({len(methods)} methods)")
    lines.append("")
    lines.append("| ID | Name | Duration (min) | Energy | Artifact |")
    lines.append("|---|---|---:|---|---|")
    for m in methods:
        lines.append(
            f"| {m.get('id','')} | {m.get('name','')} | {m.get('default_duration_min','')} | {m.get('energy_cost','')} | {m.get('artifact_type','')} |"
        )
    lines.append("")
    for m in methods:
        lines.append(f"## {m.get('id','')} — {m.get('name','')}")
        lines.append("")
        lines.append(f"**Description:** {m.get('description','')}")
        lines.append("")
        lines.append(f"**Control Stage:** `{m.get('control_stage','')}`")
        lines.append(f"**Default Duration:** `{m.get('default_duration_min','')}` min")
        lines.append(f"**Energy Cost:** `{m.get('energy_cost','')}`")
        lines.append(f"**Artifact Type:** `{m.get('artifact_type','')}`")
        lines.append("")
        lines.append("### Knobs")
        lines.extend(_fmt_knobs(m.get("knobs")))
        lines.append("")
        lines.append("### Constraints")
        constraints = m.get("constraints") if isinstance(m.get("constraints"), dict) else {}
        if constraints:
            for key, value in constraints.items():
                lines.append(f"- `{key}`: `{value}`")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("### When to Use")
        lines.extend(
            _fmt_list(m.get("when_to_use") if isinstance(m.get("when_to_use"), list) else [])
        )
        lines.append("")
        lines.append("### When NOT to Use")
        lines.extend(
            _fmt_list(
                m.get("when_not_to_use") if isinstance(m.get("when_not_to_use"), list) else []
            )
        )
        lines.append("")
        lines.append("### Stop Criteria")
        lines.extend(
            _fmt_list(m.get("stop_criteria") if isinstance(m.get("stop_criteria"), list) else [])
        )
        lines.append("")
        lines.append("### Tutor Facilitation Prompt")
        lines.append("```text")
        lines.append(str(m.get("facilitation_prompt", "")).rstrip())
        lines.append("```")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def sync_category_docs(methods_dir: Path, output_dir: Path) -> dict[str, int]:
    output_dir.mkdir(parents=True, exist_ok=True)
    cards = load_method_cards(methods_dir)
    by_stage = {stage: [] for stage in STAGE_META}
    for card in cards:
        stage = str(card.get("control_stage", "")).upper()
        if stage in by_stage:
            by_stage[stage].append(card)
    for stage in by_stage:
        by_stage[stage].sort(key=lambda x: str(x.get("id", "")))

    for stage, meta in STAGE_META.items():
        content = render_category_doc(stage, by_stage.get(stage, []))
        (output_dir / meta["file"]).write_text(content, encoding="utf-8")

    categories_lines = [
        "# Categories",
        "",
        "Canonical control-plane categories and links to category method books.",
        "",
        "## Pipeline",
        "`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`",
        "",
        "## Category Pages",
    ]
    for stage, meta in STAGE_META.items():
        categories_lines.append(f"- [[{meta['file'].replace('.md','')}]]: {meta['definition']}")
    (output_dir / "Categories.md").write_text(
        "\n".join(categories_lines).rstrip() + "\n", encoding="utf-8"
    )

    return {stage: len(by_stage.get(stage, [])) for stage in STAGE_META}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sync tutor category docs into Obsidian.")
    parser.add_argument(
        "--methods-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "sop" / "library" / "methods",
        help="Path to method YAML cards directory.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(
            "C:/Users/treyt/Desktop/Treys School/Study System/Categories"
        ),
        help="Target Obsidian category docs folder.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    result = sync_category_docs(args.methods_dir, args.output_dir)
    print("Synced tutor category docs:")
    for stage, count in result.items():
        print(f"- {stage}: {count} methods")
    print(f"- Output: {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
