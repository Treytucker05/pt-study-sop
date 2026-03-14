#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "brain") not in sys.path:
    sys.path.insert(0, str(ROOT / "brain"))

from data.seed_methods import load_from_yaml  # type: ignore

TRACK_DIR = ROOT / "conductor" / "tracks" / "tutor-10-certification_20260307"
JSON_REPORT = TRACK_DIR / "latest-certification-report.json"
MD_REPORT = TRACK_DIR / "latest-certification-report.md"
LIVE_SIGNOFF_JSON = TRACK_DIR / "live-signoff.json"


def _run_command(cmd: list[str], *, cwd: Path | None = None) -> dict[str, Any]:
    effective_cmd = list(cmd)
    if os.name == "nt" and effective_cmd and effective_cmd[0] in {"npm", "npx"}:
        effective_cmd = ["cmd", "/c", *effective_cmd]
    result = subprocess.run(
        effective_cmd,
        cwd=str(cwd or ROOT),
        capture_output=True,
        text=True,
    )
    return {
        "cmd": cmd,
        "cwd": str(cwd or ROOT),
        "returncode": int(result.returncode),
        "stdout": result.stdout,
        "stderr": result.stderr,
        "ok": result.returncode == 0,
    }


def _load_chain_summary() -> dict[str, Any]:
    loaded = load_from_yaml() or {"chains": []}
    chains = loaded.get("chains", [])
    summary: dict[str, Any] = {
        "total": len(chains),
        "strict": 0,
        "baseline": 0,
        "legacy_or_admin": 0,
        "uncategorized": [],
    }
    for chain in chains:
        name = chain.get("name")
        certification = chain.get("context_tags", {}).get("certification", {})
        disposition = certification.get("disposition")
        if disposition == "strict-certification":
            summary["strict"] += 1
        elif disposition == "baseline-certification":
            summary["baseline"] += 1
        elif disposition in {"legacy/deferred", "admin-only/non-user path"}:
            summary["legacy_or_admin"] += 1
        else:
            summary["uncategorized"].append(name)
    return summary


def _render_markdown(report: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append("# Tutor Certification Report")
    lines.append("")
    lines.append(f"- Generated: `{report['generated_at']}`")
    lines.append(f"- Overall status: `{report['overall_status']}`")
    lines.append("")

    chain_summary = report["chain_summary"]
    lines.append("## Chain Summary")
    lines.append("")
    lines.append(f"- Total template chains: `{chain_summary['total']}`")
    lines.append(f"- Strict-certification: `{chain_summary['strict']}`")
    lines.append(f"- Baseline-certification: `{chain_summary['baseline']}`")
    lines.append(f"- Legacy/Admin-only: `{chain_summary['legacy_or_admin']}`")
    if chain_summary["uncategorized"]:
        lines.append(f"- Uncategorized: `{', '.join(chain_summary['uncategorized'])}`")
    else:
        lines.append("- Uncategorized: `none`")
    lines.append("")

    lines.append("## Checks")
    lines.append("")
    for check in report["checks"]:
        status = "PASS" if check["ok"] else "FAIL"
        lines.append(f"- `{status}` `{check['name']}`")
        lines.append(f"  - Command: `{' '.join(check['cmd'])}`")
    lines.append("")

    lines.append("## Pending Manual Gates")
    lines.append("")
    for item in report["pending_manual_gates"]:
        lines.append(f"- {item}")
    lines.append("")

    return "\n".join(lines)


def _load_live_signoff() -> dict[str, Any]:
    if not LIVE_SIGNOFF_JSON.exists():
        return {}
    try:
        return json.loads(LIVE_SIGNOFF_JSON.read_text(encoding="utf-8"))
    except Exception:
        return {}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Tutor 10/10 certification checks.")
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Skip frontend build step",
    )
    args = parser.parse_args()

    checks: list[dict[str, Any]] = []

    checks.append(
        {
            "name": "Chain registry and runtime contract",
            **_run_command(
                [
                    "pytest",
                    "-q",
                    "brain/tests/test_seed_methods.py",
                    "brain/tests/test_template_chain_certification.py",
                    "brain/tests/test_template_chain_runtime_contract.py",
                ]
            ),
        }
    )
    checks.append(
        {
            "name": "Template-chain smoke coverage",
            **_run_command(
                [
                    "pytest",
                    "-q",
                    "brain/tests/test_template_chain_smoke.py",
                ]
            ),
        }
    )
    checks.append(
        {
            "name": "Material pipeline certification",
            **_run_command(
                [
                    "pytest",
                    "-q",
                    "brain/tests/test_tutor_material_pipeline_certification.py",
                ]
            ),
        }
    )
    checks.append(
        {
            "name": "Artifact reliability certification",
            **_run_command(
                [
                    "pytest",
                    "-q",
                    "brain/tests/test_tutor_artifact_certification.py",
                    "brain/tests/test_tutor_templates.py",
                ]
            ),
        }
    )
    checks.append(
        {
            "name": "Session authority and selected-material scope",
            **_run_command(
                [
                    "pytest",
                    "-q",
                    "brain/tests/test_tutor_session_linking.py",
                ]
            ),
        }
    )
    checks.append(
        {
            "name": "Session restore matrix",
            **_run_command(
                [
                    "pytest",
                    "-q",
                    "brain/tests/test_tutor_session_linking.py",
                    "-k",
                    "session_restore_matrix",
                ]
            ),
        }
    )
    checks.append(
        {
            "name": "Trust and restore UI",
            **_run_command(
                [
                    "npx",
                    "vitest",
                    "run",
                    "client/src/pages/__tests__/tutor.test.tsx",
                    "client/src/components/__tests__/TutorChat.test.tsx",
                ],
                cwd=ROOT / "dashboard_rebuild",
            ),
        }
    )
    if not args.skip_build:
        checks.append(
            {
                "name": "Frontend build",
                **_run_command(["npm", "run", "build"], cwd=ROOT / "dashboard_rebuild"),
            }
        )

    chain_summary = _load_chain_summary()
    live_signoff = _load_live_signoff()
    live_signoff_ok = all(
        str((live_signoff.get(key) or {}).get("status") or "").strip().lower() == "passed"
        for key in (
            "week7_topdown_compare",
            "week8_first_exposure",
            "basal_ganglia_review",
            "live_artifact_persistence",
        )
    )
    automated_green = all(check["ok"] for check in checks) and not chain_summary["uncategorized"]
    pending_manual_gates = []
    if not live_signoff_ok:
        pending_manual_gates = [
            "Week 7 / Week 8 / Basal Ganglia live golden-path signoff still pending",
            "Live top-down teaching quality signoff on C-TRY-001 and C-TRY-002 is still pending",
        ]
    overall_status = "not_ready"
    if automated_green and not pending_manual_gates:
        overall_status = "ready"

    report = {
        "generated_at": datetime.now().isoformat(),
        "overall_status": overall_status,
        "chain_summary": chain_summary,
        "checks": checks,
        "live_signoff_ok": live_signoff_ok,
        "pending_manual_gates": pending_manual_gates,
    }

    TRACK_DIR.mkdir(parents=True, exist_ok=True)
    JSON_REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    MD_REPORT.write_text(_render_markdown(report), encoding="utf-8")

    print(f"[OK] Wrote {JSON_REPORT}")
    print(f"[OK] Wrote {MD_REPORT}")
    print(f"[INFO] overall_status={overall_status}")

    return 0 if automated_green else 1


if __name__ == "__main__":
    raise SystemExit(main())
