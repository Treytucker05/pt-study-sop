#!/usr/bin/env python3
"""Populate missing method facilitation prompts/knobs/gates for method YAML files."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import yaml

METHODS_DIR = Path("sop/library/methods")

KNOBS_BY_CATEGORY: dict[str, dict[str, str]] = {
    "prepare": {
        "feedback_style": "supportive_synthesis",
        "cognitive_depth": "definition",
        "output_format": "bulleted_list",
    },
    "encode": {
        "cognitive_depth": "mechanism",
        "scaffolding_intensity": "heavy_hints",
        "output_format": "markdown_table",
    },
    "refine": {
        "feedback_style": "socratic_probing",
        "cognitive_depth": "mechanism",
    },
    "retrieve": {
        "scaffolding_intensity": "minimal_nudges",
        "feedback_style": "strict_gap_analysis",
        "output_format": "json_rubric",
    },
    "overlearn": {
        "scaffolding_intensity": "minimal_nudges",
        "feedback_style": "strict_gap_analysis",
        "output_format": "json_rubric",
    },
}

PROMPT_TEMPLATES: dict[str, str] = {
    "prepare": (
        "You are an expert tutor preparing the student for a new topic. "
        "Using a {feedback_style} approach, help the student map their existing knowledge "
        "to the upcoming concept. Keep the focus at a {cognitive_depth} level "
        "to serve as an advance organizer."
    ),
    "encode": (
        "You are guiding the student through the encoding phase. The student needs "
        "to structure their knowledge. Your task is to generate a structured breakdown "
        "at a {cognitive_depth} level. Provide scaffolding at the {scaffolding_intensity} "
        "level. Output your response as a {output_format}."
    ),
    "refine": (
        "You are a diagnostic tutor helping a student refine their mental model. "
        "The student has demonstrated a misconception. Using elaborative interrogation, "
        "ask targeted 'why' and 'how' questions to help them uncover the root cause. "
        "Maintain a {feedback_style} tone and do not reveal the correct answer directly."
    ),
    "retrieve": (
        "You are a strict examiner conducting a retrieval practice drill. You must "
        "operate at a {scaffolding_intensity} level. Ask the student one question at a time. "
        "Evaluate their answer strictly. Provide a hint based on the scaffolding level, "
        "but NEVER reveal the final answer. Output a hidden JSON evaluation logging "
        "'correct' or 'incorrect' for the system telemetry."
    ),
    "overlearn": (
        "You are a strict examiner conducting a retrieval practice drill. You must "
        "operate at a {scaffolding_intensity} level. Ask the student one question at a time. "
        "Evaluate their answer strictly. Provide a hint based on the scaffolding level, "
        "but NEVER reveal the final answer. Output a hidden JSON evaluation logging "
        "'correct' or 'incorrect' for the system telemetry."
    ),
}

MANDATORY_GATES = [
    {
        "rule": "requires_reference_targets",
        "threshold": 0.95,
        "fallback_action": "redirect_to_encode",
    }
]


MISSING_VALUES = {None, "", "MISSING"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--methods-dir",
        type=Path,
        default=METHODS_DIR,
        help="Directory containing method YAML files.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned changes without writing files.",
    )
    return parser.parse_args()


def needs_update(record: dict[str, Any]) -> bool:
    return record.get("has_facilitation_prompt") in MISSING_VALUES or record.get("facilitation_prompt") in MISSING_VALUES


def update_method_yaml(path: Path) -> tuple[bool, str]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return False, "skipped: non-mapping YAML"

    category = data.get("category")
    if not isinstance(category, str):
        return False, "skipped: missing category"

    if category not in KNOBS_BY_CATEGORY or category not in PROMPT_TEMPLATES:
        return False, f"skipped: unsupported category '{category}'"

    if not needs_update(data):
        return False, "skipped: facilitation prompt already present"

    knobs = KNOBS_BY_CATEGORY[category].copy()
    data["knobs"] = knobs
    data["facilitation_prompt"] = PROMPT_TEMPLATES[category].format(**knobs)
    data["has_facilitation_prompt"] = "Y"

    if category in {"retrieve", "refine", "overlearn"}:
        data["gates"] = MANDATORY_GATES

    path.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8")
    return True, "updated"


def main() -> None:
    args = parse_args()
    methods_dir = args.methods_dir
    files = sorted(methods_dir.glob("*.yaml"))

    updated = 0
    skipped = 0

    for path in files:
        if args.dry_run:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and needs_update(data) and data.get("category") in PROMPT_TEMPLATES:
                print(f"[DRY-RUN] would update {path}")
                updated += 1
            else:
                skipped += 1
            continue

        changed, reason = update_method_yaml(path)
        if changed:
            updated += 1
            print(f"[UPDATED] {path}")
        else:
            skipped += 1
            print(f"[SKIPPED] {path} ({reason})")

    print(f"Done. Updated: {updated} | Skipped: {skipped} | Total: {len(files)}")


if __name__ == "__main__":
    main()
