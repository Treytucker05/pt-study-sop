#!/usr/bin/env python3
"""CLI: Report and grade the most recent (or specified) chain run.

Usage:
    python tools/report_last_run.py              # latest run
    python tools/report_last_run.py --run-id 5   # specific run
    python tools/report_last_run.py --json        # machine-readable JSON
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "brain"))

from chain_logger import load_run_logs, grade_chain_run
from pero_mapping import PERO_LABELS


def print_report(records: list[dict], grade: dict) -> None:
    """Print human-readable run report."""
    if not records:
        print("No log records found.")
        return

    run_id = records[0].get("run_id", "?")
    chain_name = records[0].get("chain_name", "?")

    print("=" * 60)
    print(f"Chain Run Report — run #{run_id}: {chain_name}")
    print("=" * 60)

    # Stage coverage
    print("\nPERO Stage Coverage:")
    for stage, covered in grade["stage_coverage"].items():
        label = PERO_LABELS[stage]
        mark = "Y" if covered else "-"
        score = grade["stage_scores"].get(stage, 0)
        print(f"  [{mark}] {stage} ({label}): {score}/100")

    # Block-by-block summary
    print(f"\nBlocks ({grade['blocks_passed']}/{grade['blocks_total']} passed):")
    print("-" * 60)
    for rec in records:
        status = "OK" if rec.get("success") else "FAIL"
        av = ""
        if rec.get("artifact_validation_pass") is True:
            av = " [artifact OK]"
        elif rec.get("artifact_validation_pass") is False:
            av = " [artifact FAIL]"
        acc = ""
        if rec.get("accuracy") is not None:
            acc = f" acc={rec['accuracy']}%"
        print(
            f"  [{status}] {rec.get('block_name', '?')} "
            f"({rec.get('pero_stage', '?')}) "
            f"{rec.get('duration_seconds', 0):.1f}s{av}{acc}"
        )

    # Grade
    print("-" * 60)
    print(f"\nOverall Score: {grade['overall_score']}/100")
    if grade["flags"]:
        print(f"Flags: {', '.join(grade['flags'])}")
    else:
        print("Flags: none")
    print()


def main() -> int:
    json_mode = "--json" in sys.argv
    run_id = None
    if "--run-id" in sys.argv:
        idx = sys.argv.index("--run-id")
        if idx + 1 < len(sys.argv):
            try:
                run_id = int(sys.argv[idx + 1])
            except ValueError:
                print("Error: --run-id must be an integer", file=sys.stderr)
                return 1

    records = load_run_logs(run_id)
    if not records:
        print("No run logs found." if run_id is None else f"No logs for run #{run_id}.")
        return 0

    grade = grade_chain_run(records)

    if json_mode:
        print(json.dumps({"records": records, "grade": grade}, indent=2))
    else:
        print_report(records, grade)

    return 0


if __name__ == "__main__":
    sys.exit(main())
