#!/usr/bin/env python3
"""CLI utilities for artifact validation (Anki + Mermaid)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "brain"))

from artifact_validators import (  # noqa: E402
    validate_anki_cards as validate_anki,
    validate_mermaid,
)


def _read_text(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"File not found: {path}")
    return path.read_text(encoding="utf-8")


def _print_result(label: str, result, expected_valid: bool | None = None) -> bool:
    actual_valid = bool(result.valid)
    ok = actual_valid if expected_valid is None else actual_valid == expected_valid
    status = "PASS" if ok else "FAIL"
    expected_text = (
        f" (expected valid={str(expected_valid).lower()}, got={str(actual_valid).lower()})"
        if expected_valid is not None
        else ""
    )
    print(f"[{status}] {label}{expected_text}")
    if result.errors:
        for err in result.errors:
            print(f"  error: {err}")
    if result.warnings:
        for warn in result.warnings:
            print(f"  warning: {warn}")
    return ok


def run_smoke() -> int:
    anki_pass = (
        "CARD 1:\n"
        "TYPE: basic\n"
        "FRONT: What is the GH joint?\n"
        "BACK: Ball and socket joint.\n"
        "TAGS: anatomy\n"
    )
    anki_fail = (
        "CARD 1:\n"
        "TYPE: basic\n"
        "FRONT: Missing back should fail.\n"
    )

    mermaid_pass = (
        "```mermaid\n"
        "graph TD\n"
        '    A["Topic"]\n'
        '    B["Detail"]\n'
        "    A --> B\n"
        "```"
    )
    mermaid_fail = (
        "```mermaid\n"
        "graph TD\n"
        "```"
    )

    checks = [
        ("Anki passing sample", validate_anki(anki_pass), True),
        ("Anki failing sample", validate_anki(anki_fail), False),
        ("Mermaid passing sample", validate_mermaid(mermaid_pass), True),
        ("Mermaid failing sample", validate_mermaid(mermaid_fail), False),
    ]

    all_ok = True
    for label, result, expected in checks:
        all_ok = _print_result(label, result, expected_valid=expected) and all_ok

    return 0 if all_ok else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate artifact payloads.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--smoke", action="store_true", help="Run smoke checks.")
    group.add_argument("--anki", type=Path, help="Validate Anki cards file.")
    group.add_argument("--mermaid", type=Path, help="Validate Mermaid file.")
    args = parser.parse_args()

    if args.smoke:
        return run_smoke()

    if args.anki:
        result = validate_anki(_read_text(args.anki))
        return 0 if _print_result(str(args.anki), result) else 1

    result = validate_mermaid(_read_text(args.mermaid))
    return 0 if _print_result(str(args.mermaid), result) else 1


if __name__ == "__main__":
    raise SystemExit(main())
