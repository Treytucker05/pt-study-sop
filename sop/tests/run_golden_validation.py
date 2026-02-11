#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "sop" / "tools" / "validate_log_v9_3.py"
GOLDEN_DIR = ROOT / "sop" / "tests" / "golden"


def main() -> int:
    files = [
        GOLDEN_DIR / "tracker_valid.json",
        GOLDEN_DIR / "enhanced_valid.json",
    ]
    missing = [str(path) for path in files if not path.exists()]
    if missing:
        print(f"Missing golden files: {', '.join(missing)}", file=sys.stderr)
        return 1

    for path in files:
        result = subprocess.run([sys.executable, str(VALIDATOR), str(path)], check=False)
        if result.returncode != 0:
            return result.returncode

    print("Golden validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
