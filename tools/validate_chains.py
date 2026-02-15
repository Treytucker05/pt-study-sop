from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError as exc:
    raise SystemExit("PyYAML is required. Install with: pip install pyyaml") from exc

from pero_stage_mapper import get_display_stage

ROOT = Path(__file__).resolve().parents[1]
CHAINS_DIR = ROOT / "sop" / "library" / "chains"
METHODS_DIR = ROOT / "sop" / "library" / "methods"
EXPORTS_DIR = ROOT / "exports"
REPORT_FILE = EXPORTS_DIR / "chain_validation_report.md"


def load_methods() -> dict[str, dict]:
    methods: dict[str, dict] = {}
    for path in sorted(METHODS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not data:
            continue
        method_id = data.get("id")
        if not method_id:
            continue
        outputs = data.get("outputs")
        if outputs and not isinstance(outputs, list):
            outputs = [str(outputs)]
        methods[method_id] = {
            "method_id": method_id,
            "name": data.get("name", ""),
            "category": data.get("category", ""),
            "artifact_type": data.get("artifact_type"),
            "outputs": outputs or [],
        }
    return methods


def load_chains() -> list[dict]:
    chains: list[dict] = []
    for path in sorted(CHAINS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not data:
            continue
        data["_path"] = str(path)
        chains.append(data)
    return chains


def validate_chain(chain: dict, methods: dict[str, dict]) -> dict:
    chain_id = chain.get("id", "")
    chain_name = chain.get("name", "")
    method_ids = chain.get("blocks", [])
    stage_sequence: list[str] = []
    missing_methods: list[str] = []

    for mid in method_ids:
        method = methods.get(mid)
        if not method:
            missing_methods.append(mid)
            stage_sequence.append("unknown")
            continue
        stage_sequence.append(
            get_display_stage(
                method_id=method.get("method_id"),
                category=method.get("category", ""),
                artifact_type=method.get("artifact_type"),
                outputs=method.get("outputs", []),
            )
        )

    issues: list[str] = []
    if missing_methods:
        issues.append("missing_methods")

    retrieval_indices = [i for i, stage in enumerate(stage_sequence) if stage == "retrieval"]
    encoding_indices = [i for i, stage in enumerate(stage_sequence) if stage == "encoding"]

    if not retrieval_indices:
        issues.append("missing_retrieval")
    elif encoding_indices:
        first_retrieval = retrieval_indices[0]
        first_encoding = encoding_indices[0]
        if first_retrieval < first_encoding:
            allow_pretest = method_ids[first_retrieval] == "M-PRE-007"
            has_repair_loop = any(
                methods.get(mid, {}).get("category") == "refine"
                and index > first_retrieval
                for index, mid in enumerate(method_ids)
            )
            if not (allow_pretest or has_repair_loop):
                issues.append("retrieval_before_encoding")

    return {
        "chain_id": chain_id,
        "chain_name": chain_name,
        "stages": stage_sequence,
        "issues": issues,
        "missing_methods": missing_methods,
    }


def render_table(rows: list[dict]) -> None:
    headers = ["chain_id", "name", "stages", "issues"]
    table_rows = []
    for row in rows:
        stages = " -> ".join(row["stages"]) if row["stages"] else ""
        issues = ", ".join(row["issues"]) if row["issues"] else "ok"
        table_rows.append([row["chain_id"], row["chain_name"], stages, issues])

    widths = [len(h) for h in headers]
    for row in table_rows:
        widths = [max(widths[i], len(str(row[i]))) for i in range(len(headers))]

    header_line = " | ".join(h.ljust(widths[i]) for i, h in enumerate(headers))
    divider = "-+-".join("-" * widths[i] for i in range(len(headers)))
    print(header_line)
    print(divider)
    for row in table_rows:
        print(" | ".join(str(row[i]).ljust(widths[i]) for i in range(len(headers))))


def write_report(rows: list[dict], summary: dict) -> None:
    EXPORTS_DIR.mkdir(exist_ok=True)
    lines = [
        "# Chain Validation Report (PERO)",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "## Summary",
        f"- total_chains: {summary['total_chains']}",
        f"- chains_with_issues: {summary['chains_with_issues']}",
        f"- missing_retrieval: {summary['missing_retrieval']}",
        f"- retrieval_before_encoding: {summary['retrieval_before_encoding']}",
        f"- missing_methods: {summary['missing_methods']}",
        "",
        "## Details",
        "| chain_id | name | stages | issues |",
        "| --- | --- | --- | --- |",
    ]

    for row in rows:
        stages = " -> ".join(row["stages"]) if row["stages"] else ""
        issues = ", ".join(row["issues"]) if row["issues"] else "ok"
        lines.append(f"| {row['chain_id']} | {row['chain_name']} | {stages} | {issues} |")

    REPORT_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.parse_args()

    methods = load_methods()
    chains = load_chains()

    rows = [validate_chain(chain, methods) for chain in chains]

    summary = {
        "total_chains": len(rows),
        "chains_with_issues": sum(1 for row in rows if row["issues"]),
        "missing_retrieval": sum(
            1 for row in rows if "missing_retrieval" in row["issues"]
        ),
        "retrieval_before_encoding": sum(
            1 for row in rows if "retrieval_before_encoding" in row["issues"]
        ),
        "missing_methods": sum(1 for row in rows if row["missing_methods"]),
    }

    print("[Chain Validation Summary]")
    for key, value in summary.items():
        print(f"{key}: {value}")
    print("")

    render_table(rows)
    write_report(rows, summary)
    print(f"\nReport written to {REPORT_FILE}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
