#!/usr/bin/env python3
"""Release readiness checks."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET_MARKDOWN = [ROOT / "README.md", ROOT / "brain" / "README.md"]


def run_cmd(cmd: list[str]) -> int:
    print(f"[cmd] {' '.join(cmd)}")
    completed = subprocess.run(cmd)
    return completed.returncode


def check_compileall() -> None:
    code = run_cmd([sys.executable, "-m", "compileall", str(ROOT)])
    if code != 0:
        sys.exit(code)


def check_pytest() -> None:
    has_tests = any(ROOT.rglob("test_*.py")) or any(ROOT.rglob("*_test.py"))
    if not has_tests:
        print("no tests found")
        return
    brain_tests = ROOT / "brain" / "tests"
    if brain_tests.exists():
        code = run_cmd([sys.executable, "-m", "pytest", str(brain_tests)])
    else:
        code = run_cmd([sys.executable, "-m", "pytest"])
    if code != 0:
        sys.exit(code)


def check_encoding() -> None:
    bad_files: list[Path] = []
    for path in TARGET_MARKDOWN:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if any(ord(ch) > 127 for ch in text):
            bad_files.append(path)
    if bad_files:
        print("Non-ASCII characters found in:")
        for path in bad_files:
            print(f" - {path.relative_to(ROOT)}")
        sys.exit(1)


def main() -> None:
    check_compileall()
    check_pytest()
    check_encoding()
    print("release checks passed")


if __name__ == "__main__":
    main()
