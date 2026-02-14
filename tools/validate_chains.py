#!/usr/bin/env python3
"""CLI: Validate all method chains against PERO ordering rules.

Usage:
    python tools/validate_chains.py           # human-readable report
    python tools/validate_chains.py --json    # machine-readable JSON
    python tools/validate_chains.py --strict  # exit code 1 if any chain fails
"""

import os
import sys

# Add brain/ to path so imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "brain"))

from chain_validator import validate_all_chains, format_report, json_report


def main() -> int:
    json_mode = "--json" in sys.argv
    strict = "--strict" in sys.argv

    reports = validate_all_chains()

    if json_mode:
        print(json_report(reports))
    else:
        print(format_report(reports))

    failing = sum(1 for r in reports if not r.valid)
    if strict and failing > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
