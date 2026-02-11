#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable, List

SCHEMA_VERSION = "9.3"

TRACKER_NUMBER_FIELDS = {
    "duration_min",
    "understanding",
    "retention",
    "calibration_gap",
    "rsr_percent",
}

TRACKER_STRING_FIELDS = {
    "schema_version",
    "date",
    "topic",
    "mode",
    "cognitive_load",
    "transfer_check",
    "anchors",
    "what_worked",
    "what_needs_fixing",
    "error_classification",
    "error_severity",
    "error_recurrence",
    "notes",
}

ENHANCED_STRING_FIELDS = {
    "source_lock",
    "plan_of_attack",
    "frameworks_used",
    "buckets",
    "confusables_interleaved",
    "anki_cards",
    "glossary",
    "exit_ticket_blurt",
    "exit_ticket_muddiest",
    "exit_ticket_next_action",
    "retrospective_status",
    "spaced_reviews",
    "next_session",
    "errors_by_type",
    "errors_by_severity",
    "error_patterns",
    "spacing_algorithm",
    "rsr_adaptive_adjustment",
    "adaptive_multipliers",
}

SEMICOLON_STRING_FIELDS = {
    "anchors",
    "what_worked",
    "what_needs_fixing",
    "error_classification",
    "error_severity",
    "error_recurrence",
    "notes",
    "source_lock",
    "plan_of_attack",
    "frameworks_used",
    "buckets",
    "confusables_interleaved",
    "anki_cards",
    "glossary",
    "exit_ticket_blurt",
    "exit_ticket_muddiest",
    "exit_ticket_next_action",
    "retrospective_status",
    "next_session",
    "error_patterns",
    "adaptive_multipliers",
}

SPACED_REVIEWS_RE = re.compile(
    r"^R1=\d{4}-\d{2}-\d{2};\s*R2=\d{4}-\d{2}-\d{2};\s*R3=\d{4}-\d{2}-\d{2};\s*R4=\d{4}-\d{2}-\d{2}$"
)
ERRORS_BY_TYPE_RE = re.compile(
    r"^careless=\d+;\s*misunderstanding=\d+;\s*spacing=\d+;\s*transfer=\d+$"
)
ERRORS_BY_SEVERITY_RE = re.compile(r"^minor=\d+;\s*moderate=\d+;\s*critical=\d+$")


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def add_error(errors: List[str], prefix: str, message: str) -> None:
    errors.append(f"{prefix}{message}")


def validate_required_fields(
    obj: dict[str, Any], required: Iterable[str], errors: List[str], prefix: str
) -> None:
    for field in required:
        if field not in obj:
            add_error(errors, prefix, f"Missing required field: {field}")


def validate_tracker(obj: dict[str, Any], errors: List[str], prefix: str) -> None:
    required = TRACKER_NUMBER_FIELDS | TRACKER_STRING_FIELDS
    validate_required_fields(obj, required, errors, prefix)

    for field in TRACKER_NUMBER_FIELDS:
        if field in obj and not is_number(obj[field]):
            add_error(errors, prefix, f"Field '{field}' must be a number")

    for field in TRACKER_STRING_FIELDS:
        if field in obj and not isinstance(obj[field], str):
            add_error(errors, prefix, f"Field '{field}' must be a string")

    if obj.get("schema_version") != SCHEMA_VERSION:
        add_error(errors, prefix, f"schema_version must be '{SCHEMA_VERSION}'")

    if "cognitive_load" in obj and obj.get("cognitive_load") not in {
        "intrinsic",
        "extraneous",
        "germane",
    }:
        add_error(errors, prefix, "cognitive_load must be intrinsic/extraneous/germane")

    if "transfer_check" in obj and obj.get("transfer_check") not in {"yes", "no"}:
        add_error(errors, prefix, "transfer_check must be yes/no")

    if "rsr_percent" in obj and is_number(obj.get("rsr_percent")):
        rsr = float(obj["rsr_percent"])
        if rsr < 0 or rsr > 100:
            add_error(errors, prefix, "rsr_percent must be between 0 and 100")

    for field in SEMICOLON_STRING_FIELDS:
        if field in obj and not isinstance(obj[field], str):
            add_error(errors, prefix, f"Field '{field}' must be a semicolon-separated string")


def validate_anki_cards(value: str, errors: List[str], prefix: str) -> None:
    if not value.strip():
        return
    cards = [card.strip() for card in value.split(";") if card.strip()]
    for idx, card in enumerate(cards, start=1):
        parts = card.split("|||")
        if len(parts) != 4:
            add_error(
                errors,
                prefix,
                f"anki_cards entry {idx} must have 4 fields separated by '|||'",
            )


def validate_enhanced(obj: dict[str, Any], errors: List[str], prefix: str) -> None:
    validate_tracker(obj, errors, prefix)
    validate_required_fields(obj, ENHANCED_STRING_FIELDS, errors, prefix)

    for field in ENHANCED_STRING_FIELDS:
        if field in obj and not isinstance(obj[field], str):
            add_error(errors, prefix, f"Field '{field}' must be a string")

    spaced = obj.get("spaced_reviews")
    if isinstance(spaced, str) and spaced and not SPACED_REVIEWS_RE.match(spaced):
        add_error(
            errors,
            prefix,
            "spaced_reviews must be 'R1=YYYY-MM-DD; R2=YYYY-MM-DD; R3=YYYY-MM-DD; R4=YYYY-MM-DD'",
        )

    errors_by_type = obj.get("errors_by_type")
    if isinstance(errors_by_type, str) and errors_by_type and not ERRORS_BY_TYPE_RE.match(
        errors_by_type
    ):
        add_error(
            errors,
            prefix,
            "errors_by_type must be 'careless=N; misunderstanding=N; spacing=N; transfer=N'",
        )

    errors_by_severity = obj.get("errors_by_severity")
    if (
        isinstance(errors_by_severity, str)
        and errors_by_severity
        and not ERRORS_BY_SEVERITY_RE.match(errors_by_severity)
    ):
        add_error(
            errors,
            prefix,
            "errors_by_severity must be 'minor=N; moderate=N; critical=N'",
        )

    spacing_algo = obj.get("spacing_algorithm")
    if spacing_algo and spacing_algo not in {"standard", "rsr-adaptive"}:
        add_error(errors, prefix, "spacing_algorithm must be standard or rsr-adaptive")

    if isinstance(obj.get("anki_cards"), str):
        validate_anki_cards(obj.get("anki_cards", ""), errors, prefix)


def load_json(path: str | None) -> Any:
    if path in (None, "-"):
        raw = sys.stdin.read()
    else:
        raw = Path(path).read_text(encoding="utf-8-sig")
    return json.loads(raw)


def validate_object(obj: Any, mode: str, errors: List[str], prefix: str) -> None:
    if not isinstance(obj, dict):
        add_error(errors, prefix, "JSON root must be an object")
        return

    if mode == "tracker":
        validate_tracker(obj, errors, prefix)
    elif mode == "enhanced":
        validate_enhanced(obj, errors, prefix)
    else:
        enhanced_fields_present = ENHANCED_STRING_FIELDS.issubset(obj.keys())
        if enhanced_fields_present:
            validate_enhanced(obj, errors, prefix)
        else:
            validate_tracker(obj, errors, prefix)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate PT Study OS log JSON (v9.3).")
    parser.add_argument(
        "path",
        nargs="?",
        help="Path to JSON file. Use '-' or omit to read from stdin.",
    )
    parser.add_argument(
        "--type",
        choices=["tracker", "enhanced", "auto"],
        default="auto",
        help="Which schema to validate.",
    )
    args = parser.parse_args()

    try:
        data = load_json(args.path)
    except (json.JSONDecodeError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    errors: List[str] = []
    if isinstance(data, list):
        for idx, item in enumerate(data):
            validate_object(item, args.type, errors, prefix=f"[{idx}] ")
    else:
        validate_object(data, args.type, errors, prefix="")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
