from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGS_DIR = ROOT / "logs"
SUMMARY_FILE = LOGS_DIR / "last_chain_run_summary.json"
LOGS_FILE = LOGS_DIR / "block_runs.jsonl"


def load_summary() -> dict:
    if not SUMMARY_FILE.exists():
        raise SystemExit("No last_chain_run_summary.json found")
    return json.loads(SUMMARY_FILE.read_text(encoding="utf-8"))


def load_block_logs(run_id: str) -> list[dict]:
    if not LOGS_FILE.exists():
        return []
    records = []
    for line in LOGS_FILE.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        if str(record.get("run_id")) == run_id:
            records.append(record)
    return records


def render_table(records: list[dict]) -> None:
    headers = [
        "method_id",
        "name",
        "stage",
        "duration",
        "success",
        "artifact",
        "error",
    ]
    rows = []
    for record in records:
        error = record.get("error_message") or ""
        if len(error) > 60:
            error = error[:57] + "..."
        artifact_valid = record.get("artifact_valid")
        if artifact_valid is True:
            artifact_status = "pass"
        elif artifact_valid is False:
            artifact_status = "fail"
        else:
            artifact_status = "na"
        rows.append(
            [
                record.get("method_id") or "",
                record.get("method_name") or "",
                record.get("display_stage") or "",
                str(record.get("duration_seconds", "")),
                "yes" if record.get("success") else "no",
                artifact_status,
                error,
            ]
        )

    widths = [len(h) for h in headers]
    for row in rows:
        widths = [max(widths[i], len(str(row[i]))) for i in range(len(headers))]

    header_line = " | ".join(h.ljust(widths[i]) for i, h in enumerate(headers))
    divider = "-+-".join("-" * widths[i] for i in range(len(headers)))
    print(header_line)
    print(divider)
    for row in rows:
        print(" | ".join(str(row[i]).ljust(widths[i]) for i in range(len(headers))))


def main() -> int:
    summary = load_summary()
    run_id = str(summary.get("run_id", ""))
    chain_id = summary.get("chain_id")
    chain_name = summary.get("chain_name")
    success_rate = summary.get("success_rate")
    stage_coverage = summary.get("stage_coverage") or []
    grade = summary.get("grade") or {}
    facilitation_checked = bool(summary.get("facilitation_prompt_checked"))
    facilitation_present = bool(summary.get("facilitation_prompt_present"))
    force_invalid_artifact = bool(summary.get("force_invalid_artifact"))
    artifact_validation_ran = summary.get("artifact_validation_ran")

    print(f"Chain: {chain_id} - {chain_name}")
    print(f"Run ID: {run_id}")
    print(f"Success rate: {success_rate}")
    print(f"Stage coverage: {', '.join(stage_coverage) if stage_coverage else 'none'}")
    print(
        f"Grade: {grade.get('overall_score')} (flags: {', '.join(grade.get('flags', [])) or 'none'})"
    )
    print(
        "Facilitation prompt present: "
        f"{str(facilitation_present).lower()}"
        + ("" if facilitation_checked else " (unchecked)")
    )
    print("")

    records = load_block_logs(run_id)
    if not records:
        print("No block logs found for run")
        return 1

    if artifact_validation_ran is None:
        artifact_validation_ran = any(
            record.get("artifact_valid") in (True, False) for record in records
        )

    forced_failure_logged = False
    if force_invalid_artifact:
        forced_failure_logged = any(
            (record.get("success") is False) and (record.get("artifact_valid") is False)
            for record in records
        )

    ready_for_testing = (
        facilitation_checked
        and facilitation_present
        and bool(artifact_validation_ran)
        and (forced_failure_logged if force_invalid_artifact else False)
    )

    render_table(records)
    print("")
    print("[Testing Readiness]")
    print(f"artifact_validation_ran: {str(bool(artifact_validation_ran)).lower()}")
    print(
        "forced_failure_logged: "
        f"{str(forced_failure_logged).lower()}"
        + ("" if force_invalid_artifact else " (force-invalid not run)")
    )
    print("overall: " + ("READY FOR TESTING" if ready_for_testing else "NOT READY"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
