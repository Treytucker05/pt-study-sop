from __future__ import annotations

import argparse
import json
from pathlib import Path

TRACKER_KEYS = {
    "schema_version",
    "date",
    "topic",
    "mode",
    "duration_min",
    "understanding",
    "retention",
    "calibration_gap",
    "rsr_percent",
    "cognitive_load",
    "transfer_check",
    "what_worked",
    "what_needs_fixing",
    "anchors",
    "notes",
}

ENHANCED_KEYS = {
    "schema_version",
    "date",
    "topic",
    "mode",
    "duration_min",
    "understanding",
    "retention",
    "calibration_gap",
    "rsr_percent",
    "cognitive_load",
    "transfer_check",
    "source_lock",
    "plan_of_attack",
    "frameworks_used",
    "buckets",
    "confusables_interleaved",
    "anchors",
    "anki_cards",
    "glossary",
    "exit_ticket_blurt",
    "exit_ticket_muddiest",
    "exit_ticket_next_action",
    "retrospective_status",
    "spaced_reviews",
    "what_worked",
    "what_needs_fixing",
    "next_session",
    "notes",
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate(payload: dict, required: set[str]) -> list[str]:
    missing = sorted(required - payload.keys())
    extra = sorted(payload.keys() - required)
    errors = []
    if missing:
        errors.append(f"Missing keys: {', '.join(missing)}")
    if extra:
        errors.append(f"Unexpected keys: {', '.join(extra)}")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate session log JSON keys.")
    parser.add_argument("path", type=Path, help="Path to JSON file")
    parser.add_argument("--schema", choices=["tracker", "enhanced"], required=True)
    args = parser.parse_args()

    payload = load_json(args.path)
    required = TRACKER_KEYS if args.schema == "tracker" else ENHANCED_KEYS
    errors = validate(payload, required)

    if errors:
        print("Validation failed:")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("Validation passed.")


if __name__ == "__main__":
    main()
