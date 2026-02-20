#!/usr/bin/env python3
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _tracked_readmes() -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "-C", str(ROOT), "ls-files", "*README*.md"],
            capture_output=True,
            text=True,
            check=True,
        )
    except Exception:
        return []
    paths: list[Path] = []
    for line in result.stdout.splitlines():
        rel = line.strip()
        if not rel:
            continue
        paths.append(ROOT / rel)
    return paths


def main() -> None:
    failures: list[str] = []

    runtime_prompt_path = ROOT / "sop" / "runtime" / "runtime_prompt.md"
    runtime_prompt = _read_text(runtime_prompt_path)
    runtime_version_match = re.search(r"^Version:\s*(v[0-9.]+)\s*$", runtime_prompt, flags=re.M)
    if not runtime_version_match:
        failures.append(f"{runtime_prompt_path}: missing 'Version: vX.Y.Z' line")
        runtime_version = None
    else:
        runtime_version = runtime_version_match.group(1)

    readme_path = ROOT / "README.md"
    readme = _read_text(readme_path)

    claude_path = ROOT / "CLAUDE.md"
    claude = _read_text(claude_path)

    guide_path = ROOT / "docs" / "root" / "GUIDE_DEV.md"
    guide = _read_text(guide_path)

    validator_path = ROOT / "sop" / "tools" / "validate_log_v9_4.py"

    if runtime_version and runtime_version not in readme:
        failures.append(f"{readme_path}: must mention runtime prompt version {runtime_version}")

    if "Exit Ticket + Session Ledger" not in readme:
        failures.append(f"{readme_path}: must state Wrap output is 'Exit Ticket + Session Ledger'")

    # README used to claim JSON is produced at Wrap; v9.4+ moved JSON to post-session Brain ingestion.
    if "Tracker JSON" in readme:
        failures.append(f"{readme_path}: must not mention 'Tracker JSON' (JSON is post-session via Brain ingestion)")

    if not validator_path.exists():
        failures.append(f"Missing validator script: {validator_path}")

    required_guide_phrases = [
        "Start_Dashboard.bat",
        "http://127.0.0.1:5000",
        "npm run build",
        "brain/static/dist",
        "dashboard_rebuild/dist/public",
        "npm run dev",
    ]
    for phrase in required_guide_phrases:
        if phrase not in guide:
            failures.append(f"{guide_path}: missing required phrase: {phrase}")

    if "docs/root/GUIDE_DEV.md" not in claude:
        failures.append(f"{claude_path}: must point to docs/root/GUIDE_DEV.md as the canonical command reference")

    # Enforce README terminology hygiene so CP-MSS stays first-class across entrypoints.
    strict_legacy_patterns = (
        r"learning loop \(V2\)",
        r"\bdist/public\b",
        r"\brobocopy\b",
    )
    contextual_legacy_patterns = (
        r"\bPEIRRO\b",
        r"\bPERRIO\b",
        r"\bPEIR-RO\b",
        r"\binterrogate\b",
    )
    contextual_allow_hints = ("legacy", "compatib")

    for readme_file in _tracked_readmes():
        text = _read_text(readme_file)

        if not re.search(r"(CP-MSS|Control Plane)", text, flags=re.I):
            failures.append(f"{readme_file}: must mention CP-MSS/Control Plane so current system is surfaced first")

        for i, line in enumerate(text.splitlines(), start=1):
            line_lower = line.lower()

            for pat in strict_legacy_patterns:
                if re.search(pat, line, flags=re.I):
                    failures.append(
                        f"{readme_file}:{i}: contains deprecated term '{pat}'. Use current CP-MSS wording."
                    )

            for pat in contextual_legacy_patterns:
                if re.search(pat, line, flags=re.I):
                    if not any(h in line_lower for h in contextual_allow_hints):
                        failures.append(
                            f"{readme_file}:{i}: legacy term '{pat}' must be explicitly marked as legacy/compatibility."
                        )

    if failures:
        print("Docs sync check failed:")
        for item in failures:
            print(f"- {item}")
        raise SystemExit(1)

    print("Docs sync check passed.")


if __name__ == "__main__":
    main()

