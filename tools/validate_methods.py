#!/usr/bin/env python3
"""CLI: Validate facilitation_prompt coverage for all method blocks.

Usage:
    python tools/validate_methods.py           # human-readable report
    python tools/validate_methods.py --json    # machine-readable JSON
    python tools/validate_methods.py --strict  # exit code 1 if any method fails

Checks:
  1. Every method has a non-trivial facilitation_prompt (>50 chars)
  2. Methods with machine-readable artifact_type include a format example
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "brain"))

from db_setup import get_connection

# artifact_type values that require format examples in the prompt
_ARTIFACT_TYPES_NEEDING_EXAMPLES = {
    "cards": ["CARD", "FRONT:", "BACK:"],
    "concept-map": ["```mermaid", "graph"],
    "flowchart": ["```mermaid", "graph"],
    "decision-tree": ["```mermaid", "graph"],
    "comparison-table": ["|"],
}

MIN_PROMPT_LENGTH = 50


def validate_methods() -> list[dict]:
    """Check every method_block for facilitation_prompt coverage."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, category, artifact_type, facilitation_prompt "
        "FROM method_blocks ORDER BY id"
    )
    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        block_id, name, category, artifact_type, prompt = row
        prompt = (prompt or "").strip()
        issues = []

        if not prompt:
            issues.append("missing_prompt")
        elif len(prompt) < MIN_PROMPT_LENGTH:
            issues.append("trivial_prompt")

        artifact_type = (artifact_type or "").strip()
        if artifact_type and artifact_type in _ARTIFACT_TYPES_NEEDING_EXAMPLES:
            markers = _ARTIFACT_TYPES_NEEDING_EXAMPLES[artifact_type]
            if prompt and not any(m in prompt for m in markers):
                issues.append("missing_artifact_format")

        results.append({
            "id": block_id,
            "name": name,
            "category": category,
            "artifact_type": artifact_type or None,
            "prompt_length": len(prompt),
            "issues": issues,
            "valid": len(issues) == 0,
        })

    return results


def print_report(results: list[dict]) -> None:
    """Print human-readable validation report."""
    total = len(results)
    passing = sum(1 for r in results if r["valid"])
    missing_prompt = [r for r in results if "missing_prompt" in r["issues"]]
    trivial_prompt = [r for r in results if "trivial_prompt" in r["issues"]]
    missing_format = [r for r in results if "missing_artifact_format" in r["issues"]]

    print("=" * 60)
    print("Method Prompt Coverage Report")
    print("=" * 60)
    print(f"Total methods:           {total}")
    print(f"Passing:                 {passing}/{total}")
    print(f"Missing prompt:          {len(missing_prompt)}")
    print(f"Trivial prompt (<{MIN_PROMPT_LENGTH}ch):  {len(trivial_prompt)}")
    print(f"Missing artifact format: {len(missing_format)}")
    print("-" * 60)

    if missing_prompt:
        print("\nMethods MISSING facilitation_prompt:")
        for r in missing_prompt:
            print(f"  [{r['id']}] {r['name']} ({r['category']})")

    if trivial_prompt:
        print("\nMethods with TRIVIAL prompt:")
        for r in trivial_prompt:
            print(f"  [{r['id']}] {r['name']} — {r['prompt_length']} chars")

    if missing_format:
        print("\nMethods missing ARTIFACT FORMAT example:")
        for r in missing_format:
            print(f"  [{r['id']}] {r['name']} — artifact_type={r['artifact_type']}")

    if passing == total:
        print(f"\n[OK] All {total} methods have valid facilitation prompts.")
    else:
        print(f"\n[WARN] {total - passing} method(s) need attention.")


def main() -> int:
    json_mode = "--json" in sys.argv
    strict = "--strict" in sys.argv

    results = validate_methods()

    if json_mode:
        print(json.dumps(results, indent=2))
    else:
        print_report(results)

    failing = sum(1 for r in results if not r["valid"])
    if strict and failing > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
