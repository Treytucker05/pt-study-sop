"""
Scholar health/coverage check.
Writes a report under scholar/outputs/reports/.
"""
from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any
from brain.config import FRESH_DAYS

REPO_ROOT = Path(__file__).resolve().parent.parent


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _list_files(path: Path, pattern: str) -> list[Path]:
    return sorted(path.glob(pattern)) if path.exists() else []


def _list_output_lanes(outputs_dir: Path) -> list[str]:
    if not outputs_dir.exists():
        return []
    return sorted([p.name for p in outputs_dir.iterdir() if p.is_dir()])


def _count_files(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for p in path.rglob("*") if p.is_file())


def _latest_file(paths: list[Path]) -> Path | None:
    if not paths:
        return None
    return max(paths, key=lambda p: p.stat().st_mtime)


def main() -> None:
    today = datetime.now().strftime("%Y-%m-%d")
    outputs_dir = REPO_ROOT / "scholar" / "outputs"
    reports_dir = outputs_dir / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    audit_manifest_path = REPO_ROOT / "scholar" / "inputs" / "audit_manifest.json"
    ai_manifest_path = REPO_ROOT / "scholar" / "inputs" / "ai_artifacts_manifest.json"
    audit_manifest = _read_json(audit_manifest_path)
    ai_manifest = _read_json(ai_manifest_path)

    safe_mode = audit_manifest.get("safe_mode", None)
    codex_available = shutil.which("codex") is not None

    session_logs_dir = REPO_ROOT / "brain" / "session_logs"
    brain_db = REPO_ROOT / "brain" / "data" / "pt_study.db"
    latest_session = _latest_file(_list_files(session_logs_dir, "*.md"))

    lanes_from_manifest: list[str] = []
    for group in ("summaries", "questions", "recommendations"):
        for item in ai_manifest.get(group, []):
            lane = item.get("lane")
            if lane and lane not in lanes_from_manifest:
                lanes_from_manifest.append(lane)

    output_lanes = _list_output_lanes(outputs_dir)
    missing_lanes = [lane for lane in lanes_from_manifest if lane not in output_lanes]

    orchestrator_dir = outputs_dir / "orchestrator_runs"
    latest_orchestrator = _latest_file(_list_files(orchestrator_dir, "*.md"))

    lines: list[str] = []
    lines.append(f"# Scholar Health Check ({today})")
    lines.append("")
    lines.append("## Summary")
    lines.append(f"- Codex CLI available: {'yes' if codex_available else 'no'}")
    lines.append(f"- Outputs directory exists: {'yes' if outputs_dir.exists() else 'no'}")
    lines.append(f"- Output lane count: {len(output_lanes)}")
    lines.append("")
    lines.append("## Preconditions")
    lines.append(f"- audit_manifest.json present: {'yes' if audit_manifest_path.exists() else 'no'}")
    lines.append(f"- ai_artifacts_manifest.json present: {'yes' if ai_manifest_path.exists() else 'no'}")
    lines.append(f"- brain/session_logs/ present: {'yes' if session_logs_dir.exists() else 'no'}")
    lines.append(f"- brain/data/pt_study.db present: {'yes' if brain_db.exists() else 'no'}")
    lines.append("")
    lines.append("## Data Freshness")
    if latest_session:
        last_dt = datetime.fromtimestamp(latest_session.stat().st_mtime)
        days_since = (datetime.now() - last_dt).days
        status = "fresh" if days_since <= FRESH_DAYS else "stale"
        lines.append(
            f"- Latest session log: {latest_session.as_posix()} "
            f"(updated {last_dt.strftime('%Y-%m-%d')}, {days_since} days ago)"
        )
        lines.append(f"- Freshness status: {status} (threshold: {FRESH_DAYS} days)")
        if status == "stale":
            lines.append("- Warning: session log data older than freshness threshold.")
    else:
        lines.append("- No session logs found; freshness cannot be assessed.")
    lines.append("")
    lines.append("## Write Toggle (safe_mode)")
    if safe_mode is None:
        lines.append("- safe_mode not set in audit_manifest.json. Default behavior is assumed (confirm in run docs).")
    else:
        lines.append(f"- safe_mode: {safe_mode}")
        lines.append("- safe_mode=false: Scholar documents/researches only; no promotion queue outputs.")
        lines.append("- safe_mode=true: Scholar may draft a change package (RFC + experiment + patch draft) for approval.")
    lines.append("")
    lines.append("## Output Lanes Coverage")
    if lanes_from_manifest:
        lines.append("- Lanes in ai_artifacts_manifest.json:")
        for lane in lanes_from_manifest:
            lines.append(f"  - {lane}")
    else:
        lines.append("- No lanes listed in ai_artifacts_manifest.json.")
    lines.append("- Lanes present under scholar/outputs:")
    for lane in output_lanes:
        lines.append(f"  - {lane}")
    if missing_lanes:
        lines.append("- Missing lanes (present in manifest but not in outputs):")
        for lane in missing_lanes:
            lines.append(f"  - {lane}")
    else:
        lines.append("- Missing lanes: none detected based on lane names.")
    lines.append("")
    lines.append("## Latest Orchestrator Evidence")
    if latest_orchestrator:
        lines.append(f"- Latest orchestrator artifact: {latest_orchestrator.as_posix()} (updated {datetime.fromtimestamp(latest_orchestrator.stat().st_mtime).strftime('%Y-%m-%d')})")
    else:
        lines.append("- No orchestrator run artifacts found.")
    lines.append("")
    lines.append("## Gaps")
    if not codex_available:
        lines.append("- Codex CLI not found in PATH; orchestrator cannot run.")
    if not session_logs_dir.exists():
        lines.append("- brain/session_logs/ missing; telemetry audits may be empty.")
    if not brain_db.exists():
        lines.append("- brain/data/pt_study.db missing; DB-derived metrics unavailable.")
    if not missing_lanes:
        lines.append("- No lane-name gaps detected; check freshness of files per lane.")
    lines.append("")
    lines.append("## Recommended Actions")
    lines.append("- Run scripts/run_scholar.bat to confirm a fresh orchestrator run.")
    lines.append("- Keep audit_manifest.json safe_mode aligned with intended output behavior.")
    lines.append("- Add an automated freshness check per output lane.")

    report_path = reports_dir / f"scholar_health_check_{today}.md"
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
