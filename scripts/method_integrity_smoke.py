#!/usr/bin/env python3
"""
Method integrity smoke report.

Checks canonical parity between YAML method cards and DB runtime cache for:
- control_stage
- artifact_type
- best_stage
- required knobs presence
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
METHODS_DIR = ROOT / "sop" / "library" / "methods"
DEFAULT_DB = ROOT / "brain" / "data" / "pt_study.db"


@dataclass
class MethodParityRow:
    method_id: str
    stage: str
    artifact_type: str
    required_knobs: list[str]
    status: str
    notes: str


def _norm(value: Any) -> str:
    return str(value or "").strip()


def _load_yaml_methods() -> dict[str, dict[str, Any]]:
    methods: dict[str, dict[str, Any]] = {}
    for path in sorted(METHODS_DIR.glob("*.yaml")):
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            continue
        method_id = _norm(raw.get("id"))
        if not method_id:
            continue
        knobs_raw = raw.get("knobs")
        knobs = knobs_raw if isinstance(knobs_raw, dict) else {}
        methods[method_id] = {
            "method_id": method_id,
            "control_stage": _norm(raw.get("control_stage")).upper(),
            "artifact_type": _norm(raw.get("artifact_type")),
            "best_stage": _norm(raw.get("best_stage")),
            "required_knobs": sorted([k for k in knobs.keys() if isinstance(k, str)]),
        }
    return methods


def _parse_json_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


def _load_db_methods(db_path: Path) -> dict[str, dict[str, Any]]:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(method_blocks)")
    cols = {str(r[1]) for r in cur.fetchall()}
    select_cols = ["method_id", "control_stage", "artifact_type", "best_stage"]
    has_prompt = "facilitation_prompt" in cols
    has_knobs = "knob_overrides_json" in cols
    if has_prompt:
        select_cols.append("facilitation_prompt")
    if has_knobs:
        select_cols.append("knob_overrides_json")
    cur.execute(
        f"""
        SELECT {', '.join(select_cols)}
        FROM method_blocks
        WHERE method_id IS NOT NULL AND TRIM(method_id) != ''
        """
    )
    out: dict[str, dict[str, Any]] = {}
    for row in cur.fetchall():
        method_id = _norm(row["method_id"])
        if not method_id:
            continue
        out[method_id] = {
            "method_id": method_id,
            "control_stage": _norm(row["control_stage"]).upper(),
            "artifact_type": _norm(row["artifact_type"]),
            "best_stage": _norm(row["best_stage"]),
            "facilitation_prompt": _norm(row["facilitation_prompt"]) if has_prompt else "",
            "knobs": _parse_json_dict(row["knob_overrides_json"]) if has_knobs else {},
        }
    conn.close()
    return out


def build_report(yaml_methods: dict[str, dict[str, Any]], db_methods: dict[str, dict[str, Any]]) -> tuple[str, int]:
    rows: list[MethodParityRow] = []
    failures = 0

    for method_id in sorted(yaml_methods.keys()):
        y = yaml_methods[method_id]
        db = db_methods.get(method_id)
        notes: list[str] = []
        status = "PASS"

        if not db:
            status = "FAIL"
            notes.append("missing_in_db")
            rows.append(
                MethodParityRow(
                    method_id=method_id,
                    stage=f"{y['control_stage']}",
                    artifact_type=y["artifact_type"] or "-",
                    required_knobs=y["required_knobs"],
                    status=status,
                    notes=", ".join(notes),
                )
            )
            failures += 1
            continue

        has_critical_failure = False
        if y["control_stage"] != db["control_stage"]:
            status = "FAIL"
            has_critical_failure = True
            notes.append(f"stage:{db['control_stage']}!=yaml:{y['control_stage']}")
        if y["artifact_type"] != db["artifact_type"]:
            status = "FAIL"
            has_critical_failure = True
            notes.append(f"artifact:{db['artifact_type']}!=yaml:{y['artifact_type']}")
        if y["best_stage"] != db["best_stage"]:
            status = "FAIL"
            has_critical_failure = True
            notes.append(f"best_stage:{db['best_stage']}!=yaml:{y['best_stage']}")
        if not db["facilitation_prompt"]:
            status = "FAIL"
            has_critical_failure = True
            notes.append("missing_prompt")

        required_knobs = y["required_knobs"]
        db_knob_keys = sorted([k for k in (db.get("knobs") or {}).keys() if isinstance(k, str)])
        missing_knobs = [k for k in required_knobs if k not in db_knob_keys]
        if missing_knobs:
            if not has_critical_failure:
                status = "WARN"
            notes.append("missing_knobs:" + ",".join(missing_knobs))

        rows.append(
            MethodParityRow(
                method_id=method_id,
                stage=db["control_stage"] or y["control_stage"],
                artifact_type=db["artifact_type"] or y["artifact_type"] or "-",
                required_knobs=required_knobs,
                status=status,
                notes=", ".join(notes) if notes else "ok",
            )
        )
        if status == "FAIL":
            failures += 1

    for extra_id in sorted(set(db_methods.keys()) - set(yaml_methods.keys())):
        db = db_methods[extra_id]
        rows.append(
            MethodParityRow(
                method_id=extra_id,
                stage=db["control_stage"],
                artifact_type=db["artifact_type"] or "-",
                required_knobs=sorted([k for k in (db.get("knobs") or {}).keys() if isinstance(k, str)]),
                status="WARN",
                notes="db_only_method_id",
            )
        )

    header = [
        "# Method Integrity Smoke Report",
        "",
        f"- YAML methods: {len(yaml_methods)}",
        f"- DB methods: {len(db_methods)}",
        f"- Failures: {failures}",
        "",
        "| method_id | stage | artifact_type | required_knobs | status | notes |",
        "|---|---|---|---|---|---|",
    ]
    table = [
        f"| {r.method_id} | {r.stage or '-'} | {r.artifact_type or '-'} | {', '.join(r.required_knobs) if r.required_knobs else '-'} | {r.status} | {r.notes} |"
        for r in rows
    ]
    return "\n".join([*header, *table, ""]) + "\n", failures


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate method integrity smoke report")
    parser.add_argument("--db", default=os.environ.get("PT_STUDY_DB", str(DEFAULT_DB)))
    parser.add_argument(
        "--report",
        default=str(ROOT / "docs" / "root" / "TUTOR_METHOD_INTEGRITY_SMOKE.md"),
        help="Write markdown report to this path",
    )
    args = parser.parse_args()

    db_path = Path(args.db).resolve()
    if not db_path.exists():
        print(f"[ERROR] DB not found: {db_path}")
        return 2
    if not METHODS_DIR.exists():
        print(f"[ERROR] Methods dir not found: {METHODS_DIR}")
        return 2

    yaml_methods = _load_yaml_methods()
    db_methods = _load_db_methods(db_path)
    report, failures = build_report(yaml_methods, db_methods)

    report_path = Path(args.report).resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")

    print(report)
    print(f"[INFO] report_path={report_path}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
