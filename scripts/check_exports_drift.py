#!/usr/bin/env python3
"""Detect drift between YAML source-of-truth and generated export inventories.

This script regenerates inventories in memory from:
  - sop/library/methods/*.yaml
  - sop/library/chains/*.yaml

Then compares expected outputs to:
  - exports/methods_inventory.md
  - exports/chains_inventory.md
  - exports/inventory_summary.json

Exit code:
  0 -> no drift
  1 -> drift detected
"""

from __future__ import annotations

import csv
import difflib
import io
import json
import sys
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
METHODS_DIR = ROOT / "sop" / "library" / "methods"
CHAINS_DIR = ROOT / "sop" / "library" / "chains"
EXPORTS_DIR = ROOT / "exports"

METHODS_MD = EXPORTS_DIR / "methods_inventory.md"
METHODS_CSV = EXPORTS_DIR / "methods_inventory.csv"
CHAINS_MD = EXPORTS_DIR / "chains_inventory.md"
SUMMARY_JSON = EXPORTS_DIR / "inventory_summary.json"


def read_yaml(path: Path) -> tuple[dict[str, Any], str]:
    text = path.read_text(encoding="utf-8")
    data = yaml.safe_load(text) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path}: YAML root must be a mapping")
    return data, text


def rel_path(path: Path) -> str:
    return str(path.relative_to(ROOT))


def find_line_number(text: str, predicate) -> int | None:
    for idx, line in enumerate(text.splitlines(), start=1):
        if predicate(line):
            return idx
    return None


def line_for_block_id(text: str, block_id: str) -> int | None:
    target = f"- {block_id}"
    return find_line_number(text, lambda ln: ln.strip() == target)


def flag_value(has_key: bool, value: Any) -> str:
    if not has_key:
        return "MISSING"
    if isinstance(value, list):
        return "Y" if len(value) > 0 else "N"
    if isinstance(value, dict):
        return "Y" if len(value.keys()) > 0 else "N"
    if isinstance(value, str):
        return "Y" if value.strip() else "N"
    return "Y" if value is not None else "N"


def outputs_summary(outputs: Any, has_key: bool) -> str:
    if not has_key:
        return "MISSING"
    if not outputs:
        return ""
    if isinstance(outputs, list):
        parts: list[str] = []
        for item in outputs:
            if isinstance(item, str):
                parts.append(item.strip())
            elif isinstance(item, dict):
                parts.append("machine-readable: " + ",".join(sorted(item.keys())))
            else:
                parts.append(str(item))
        joined = "; ".join(p for p in parts if p)
    elif isinstance(outputs, dict):
        joined = "machine-readable: " + ",".join(sorted(outputs.keys()))
    else:
        joined = str(outputs)
    if len(joined) > 120:
        return joined[:117] + "..."
    return joined


def parse_markdown_table(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    headers: list[str] | None = None
    rows: list[dict[str, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        parts = [p.strip() for p in stripped.strip("|").split("|")]
        if headers is None:
            headers = parts
            continue
        # separator row
        if all(p and all(ch in "-: " for ch in p) for p in parts):
            continue
        if len(parts) != len(headers):
            continue
        rows.append(dict(zip(headers, parts)))
    return headers or [], rows


def unified_diff(name: str, expected_text: str, actual_text: str) -> str:
    expected_lines = expected_text.splitlines(keepends=True)
    actual_lines = actual_text.splitlines(keepends=True)
    return "".join(
        difflib.unified_diff(
            actual_lines,
            expected_lines,
            fromfile=f"{name} (actual)",
            tofile=f"{name} (expected)",
        )
    )


def build_expected() -> dict[str, Any]:
    method_files = sorted(METHODS_DIR.glob("*.yaml"))
    methods: list[dict[str, Any]] = []
    method_ids: set[str] = set()
    missing_facilitation_prompt = 0

    for path in method_files:
        data, _ = read_yaml(path)
        method_id = str(data.get("id", ""))
        method_ids.add(method_id)

        def has(key: str) -> bool:
            return key in data

        steps_val = data.get("steps")
        gating_val = (
            data.get("gating_rules")
            if has("gating_rules")
            else data.get("gates")
            if has("gates")
            else data.get("gating")
            if has("gating")
            else None
        )
        failure_val = data.get("failure_modes")
        stop_val = data.get("stop_criteria")
        outputs_val = data.get("outputs")
        facilitation_val = data.get("facilitation_prompt")

        has_facilitation = flag_value(has("facilitation_prompt"), facilitation_val)
        if has_facilitation != "Y":
            missing_facilitation_prompt += 1

        methods.append(
            {
                "id": method_id,
                "name": data.get("name", ""),
                "category": data.get("category", ""),
                "default_duration_min": data.get(
                    "default_duration_min", "MISSING" if not has("default_duration_min") else ""
                ),
                "energy_cost": data.get("energy_cost", "MISSING" if not has("energy_cost") else ""),
                "has_steps": flag_value(has("steps"), steps_val),
                "has_gating_rules": flag_value(has("gating_rules") or has("gates") or has("gating"), gating_val),
                "has_failure_modes": flag_value(has("failure_modes"), failure_val),
                "has_stop_criteria": flag_value(has("stop_criteria"), stop_val),
                "has_outputs_or_artifacts": flag_value(
                    has("outputs") or has("artifact_type"), outputs_val if has("outputs") else data.get("artifact_type")
                ),
                "has_facilitation_prompt": has_facilitation,
                "outputs_summary": outputs_summary(outputs_val, has("outputs")),
                "file_path": rel_path(path),
            }
        )

    chains: list[dict[str, Any]] = []
    unknown_ids: list[dict[str, Any]] = []
    chain_files = sorted(CHAINS_DIR.glob("*.yaml"))
    for path in chain_files:
        data, text = read_yaml(path)
        chain_id = str(data.get("id", ""))
        chain_name = str(data.get("name", ""))
        blocks_raw = data.get("blocks", []) or []
        blocks = [str(b) for b in blocks_raw]
        chains.append(
            {
                "chain_id": chain_id,
                "chain_name": chain_name,
                "method_ids_in_order": ", ".join(blocks),
                "file_path": rel_path(path),
            }
        )
        for block_id in blocks:
            if block_id not in method_ids:
                unknown_ids.append(
                    {
                        "chain_id": chain_id,
                        "block_id": block_id,
                        "file_path": rel_path(path),
                        "line": line_for_block_id(text, block_id),
                    }
                )

    methods_md_lines = [
        "| id | name | category | default_duration_min | energy_cost | has_steps | has_gating_rules | has_failure_modes | has_stop_criteria | has_outputs_or_artifacts | has_facilitation_prompt | outputs_summary | file_path |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in methods:
        methods_md_lines.append(
            "| {id} | {name} | {category} | {default_duration_min} | {energy_cost} | {has_steps} | {has_gating_rules} | {has_failure_modes} | {has_stop_criteria} | {has_outputs_or_artifacts} | {has_facilitation_prompt} | {outputs_summary} | {file_path} |".format(
                **{k: str(v).replace("|", "\\|") for k, v in row.items()}
            )
        )
    methods_md_text = "\n".join(methods_md_lines) + "\n"

    csv_fieldnames = [
        "id",
        "name",
        "category",
        "default_duration_min",
        "energy_cost",
        "has_steps",
        "has_gating_rules",
        "has_failure_modes",
        "has_stop_criteria",
        "has_outputs_or_artifacts",
        "has_facilitation_prompt",
        "outputs_summary",
        "file_path",
    ]
    csv_buffer = io.StringIO()
    csv_writer = csv.DictWriter(csv_buffer, fieldnames=csv_fieldnames, lineterminator="\n")
    csv_writer.writeheader()
    for row in methods:
        csv_writer.writerow({k: row.get(k, "") for k in csv_fieldnames})
    methods_csv_text = csv_buffer.getvalue()

    chains_md_lines = [
        "| chain_id | chain_name | method_ids_in_order | file_path |",
        "| --- | --- | --- | --- |",
    ]
    for row in chains:
        chains_md_lines.append(
            "| {chain_id} | {chain_name} | {method_ids_in_order} | {file_path} |".format(
                **{k: str(v).replace("|", "\\|") for k, v in row.items()}
            )
        )
    chains_md_text = "\n".join(chains_md_lines) + "\n"

    summary_obj = {
        "total_methods": len(methods),
        "total_chains": len(chains),
        "chains_with_unknown_ids": len(unknown_ids),
        "methods_missing_facilitation_prompt": missing_facilitation_prompt,
    }

    return {
        "methods_rows": methods,
        "methods_csv_text": methods_csv_text,
        "chains_rows": chains,
        "summary_obj": summary_obj,
        "methods_md_text": methods_md_text,
        "chains_md_text": chains_md_text,
    }


def compare_methods(expected_rows: list[dict[str, Any]], expected_md_text: str) -> list[str]:
    issues: list[str] = []
    if not METHODS_MD.exists():
        return [f"Missing file: {rel_path(METHODS_MD)}"]

    actual_text = METHODS_MD.read_text(encoding="utf-8")
    _, actual_rows = parse_markdown_table(METHODS_MD)
    actual_ids = [r.get("id", "") for r in actual_rows]
    expected_ids = [r.get("id", "") for r in expected_rows]

    missing_ids = [mid for mid in expected_ids if mid not in set(actual_ids)]
    extra_ids = [mid for mid in actual_ids if mid not in set(expected_ids)]
    if missing_ids:
        issues.append("methods_inventory.md missing method IDs: " + ", ".join(missing_ids))
    if extra_ids:
        issues.append("methods_inventory.md has extra method IDs: " + ", ".join(extra_ids))
    if actual_ids != expected_ids:
        issues.append(
            "methods_inventory.md method order mismatch:\n"
            f"  actual:   {', '.join(actual_ids)}\n"
            f"  expected: {', '.join(expected_ids)}"
        )

    if actual_text != expected_md_text:
        issues.append(
            "methods_inventory.md content differs:\n"
            + unified_diff(rel_path(METHODS_MD), expected_md_text, actual_text)
        )
    return issues


def compare_chains(expected_rows: list[dict[str, Any]], expected_md_text: str) -> list[str]:
    issues: list[str] = []
    if not CHAINS_MD.exists():
        return [f"Missing file: {rel_path(CHAINS_MD)}"]

    actual_text = CHAINS_MD.read_text(encoding="utf-8")
    _, actual_rows = parse_markdown_table(CHAINS_MD)
    actual_ids = [r.get("chain_id", "") for r in actual_rows]
    expected_ids = [r.get("chain_id", "") for r in expected_rows]

    missing_ids = [cid for cid in expected_ids if cid not in set(actual_ids)]
    extra_ids = [cid for cid in actual_ids if cid not in set(expected_ids)]
    if missing_ids:
        issues.append("chains_inventory.md missing chain IDs: " + ", ".join(missing_ids))
    if extra_ids:
        issues.append("chains_inventory.md has extra chain IDs: " + ", ".join(extra_ids))
    if actual_ids != expected_ids:
        issues.append(
            "chains_inventory.md chain order mismatch:\n"
            f"  actual:   {', '.join(actual_ids)}\n"
            f"  expected: {', '.join(expected_ids)}"
        )

    # Method-order mismatches for chains that exist in both tables
    actual_map = {row.get("chain_id", ""): row.get("method_ids_in_order", "") for row in actual_rows}
    expected_map = {row.get("chain_id", ""): row.get("method_ids_in_order", "") for row in expected_rows}
    for chain_id in expected_ids:
        if chain_id in actual_map and actual_map[chain_id] != expected_map[chain_id]:
            issues.append(
                f"chains_inventory.md method_ids_in_order mismatch for {chain_id}:\n"
                f"  actual:   {actual_map[chain_id]}\n"
                f"  expected: {expected_map[chain_id]}"
            )

    if actual_text != expected_md_text:
        issues.append(
            "chains_inventory.md content differs:\n"
            + unified_diff(rel_path(CHAINS_MD), expected_md_text, actual_text)
        )
    return issues


def compare_methods_csv(expected_csv_text: str) -> list[str]:
    issues: list[str] = []
    if not METHODS_CSV.exists():
        return [f"Missing file: {rel_path(METHODS_CSV)}"]

    actual_text = METHODS_CSV.read_text(encoding="utf-8")
    if actual_text != expected_csv_text:
        issues.append(
            "methods_inventory.csv content differs:\n"
            + unified_diff(rel_path(METHODS_CSV), expected_csv_text, actual_text)
        )
    return issues


def compare_summary(expected_obj: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    if not SUMMARY_JSON.exists():
        return [f"Missing file: {rel_path(SUMMARY_JSON)}"]

    actual_text = SUMMARY_JSON.read_text(encoding="utf-8")
    actual_obj = json.loads(actual_text)
    expected_text = json.dumps(expected_obj, indent=2) + "\n"

    for key in sorted(set(expected_obj.keys()).union(actual_obj.keys())):
        if expected_obj.get(key) != actual_obj.get(key):
            issues.append(
                f"inventory_summary.json mismatch for '{key}': "
                f"actual={actual_obj.get(key)!r}, expected={expected_obj.get(key)!r}"
            )

    if actual_text != expected_text:
        issues.append(
            "inventory_summary.json content differs:\n"
            + unified_diff(rel_path(SUMMARY_JSON), expected_text, actual_text)
        )
    return issues


def main() -> int:
    expected = build_expected()
    issues: list[str] = []
    issues.extend(compare_methods(expected["methods_rows"], expected["methods_md_text"]))
    issues.extend(compare_methods_csv(expected["methods_csv_text"]))
    issues.extend(compare_chains(expected["chains_rows"], expected["chains_md_text"]))
    issues.extend(compare_summary(expected["summary_obj"]))

    if issues:
        print("EXPORT DRIFT DETECTED")
        print()
        for issue in issues:
            print(issue)
            print()
        return 1

    print("No export drift detected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
