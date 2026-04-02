#!/usr/bin/env python3
"""Export the canonical SOP method and chain inventory for live study testing.

This reads directly from the YAML library under ``sop/library/`` and writes:

- ``exports/sop_inventory/method_chain_inventory.md``
- ``exports/sop_inventory/method_chain_inventory.json``
- ``exports/sop_inventory/methods.csv``
- ``exports/sop_inventory/chains.csv``

The goal is to give Trey a stable, testing-ready snapshot of the current
method cards and template chains without relying on older summary docs.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[2]
LIBRARY_DIR = ROOT / "sop" / "library"
METHODS_DIR = LIBRARY_DIR / "methods"
CHAINS_DIR = LIBRARY_DIR / "chains"
VERSION_PATH = LIBRARY_DIR / "meta" / "version.yaml"
CERTIFICATION_REGISTRY_PATH = CHAINS_DIR / "certification_registry.yaml"
DEFAULT_OUTPUT_DIR = ROOT / "exports" / "sop_inventory"
STAGE_ORDER = [
    "PRIME",
    "TEACH",
    "CALIBRATE",
    "ENCODE",
    "REFERENCE",
    "RETRIEVE",
    "OVERLEARN",
]
METHOD_FAMILY_LABELS = {
    "PRE": "Prime",
    "CAL": "Calibrate",
    "TEA": "Teach",
    "ENC": "Encode",
    "INT": "Integration / Interrogation",
    "REF": "Reference",
    "RET": "Retrieve",
    "OVR": "Overlearn",
}
METHOD_PREFIX_STAGE_HINTS = {
    "PRE": "PRIME",
    "CAL": "CALIBRATE",
    "TEA": "TEACH",
    "ENC": "ENCODE",
    "REF": "REFERENCE",
    "RET": "RETRIEVE",
    "OVR": "OVERLEARN",
}
CHAIN_FAMILY_LABELS = {
    "AD": "Anatomy Deep Dive",
    "CI": "Clinical Reasoning Intake",
    "CR": "Clinical Reasoning",
    "DA": "Dense Anatomy Intake",
    "DP": "DEPTH",
    "EP": "Exam Prep",
    "FE": "First Exposure",
    "LE": "Low Energy",
    "MR": "Mastery Review",
    "PI": "Pathophysiology Intake",
    "QD": "Quick Drill",
    "QF": "Quick First Exposure",
    "RS": "Review Sprint",
    "SW": "SWEEP",
    "TRY": "Top-Down",
    "VE": "Visual Encoding",
}
CHAIN_VARIANT_LABELS = {
    "MIN": "Minimal",
    "STD": "Standard",
    "PRO": "Procedure",
}
CHAIN_SPECIAL_VARIANTS = {
    ("FE", "001"): "Core",
    ("TRY", "001"): "Narrative Mastery",
    ("TRY", "002"): "Forward Progress",
}

sys.path.insert(0, str(ROOT / "brain"))

try:
    from chain_validator import validate_chain as validate_control_plane_chain
except Exception:  # pragma: no cover - export should still work without validator import
    validate_control_plane_chain = None


def _load_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"{path} did not contain a YAML mapping")
    return data


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).split())


def _listify(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _join_list(items: list[Any], sep: str = " | ") -> str:
    return sep.join(_clean_text(item) for item in items if _clean_text(item))


def _relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def decode_method_id(method_id: str, control_stage: str) -> dict[str, str]:
    parts = method_id.split("-")
    family_code = parts[1] if len(parts) >= 2 else ""
    sequence = parts[2] if len(parts) >= 3 else ""
    family_label = METHOD_FAMILY_LABELS.get(family_code, family_code or "Unknown")
    prefix_stage = METHOD_PREFIX_STAGE_HINTS.get(family_code, "")
    runtime_note = ""
    if family_code == "INT":
        runtime_note = (
            "INT is an integration/interrogation family; use control_stage for runtime truth."
        )
    elif prefix_stage and control_stage and prefix_stage != control_stage:
        runtime_note = (
            f"Historical ID prefix suggests {prefix_stage}, but runtime control_stage is "
            f"{control_stage}."
        )

    plain_english = f"Method / {family_label}"
    if sequence:
        plain_english = f"{plain_english} / item {sequence}"

    return {
        "kind": "Method",
        "family_code": family_code,
        "family_label": family_label,
        "sequence": sequence,
        "plain_english": plain_english,
        "runtime_note": runtime_note,
    }


def decode_chain_id(chain_id: str, chain_name: str) -> dict[str, str]:
    parts = chain_id.split("-")
    family_code = parts[1] if len(parts) >= 2 else ""
    variant_code = parts[2] if len(parts) >= 3 else ""
    family_label = CHAIN_FAMILY_LABELS.get(family_code, family_code or "Unknown")
    variant_label = CHAIN_SPECIAL_VARIANTS.get((family_code, variant_code), "")
    if not variant_label:
        variant_label = CHAIN_VARIANT_LABELS.get(variant_code, "")
    if not variant_label and variant_code.isdigit() and family_label != chain_name:
        variant_label = f"numbered variant {variant_code}"
    if not variant_label and not variant_code.isdigit():
        variant_label = variant_code

    plain_english = f"Chain / {family_label}"
    if variant_label:
        plain_english = f"{plain_english} / {variant_label}"

    return {
        "kind": "Chain",
        "family_code": family_code,
        "family_label": family_label,
        "variant_code": variant_code,
        "variant_label": variant_label,
        "plain_english": plain_english,
    }


def load_version() -> str:
    if not VERSION_PATH.exists():
        return "unknown"
    data = _load_yaml(VERSION_PATH)
    return str(data.get("version", "unknown"))


def load_certification_registry() -> dict[str, dict[str, Any]]:
    if not CERTIFICATION_REGISTRY_PATH.exists():
        return {}
    raw = _load_yaml(CERTIFICATION_REGISTRY_PATH)
    chains = raw.get("chains", raw)
    if not isinstance(chains, dict):
        return {}
    return {
        str(chain_id): value
        for chain_id, value in chains.items()
        if isinstance(value, dict)
    }


def load_methods() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    methods: list[dict[str, Any]] = []
    methods_by_id: dict[str, dict[str, Any]] = {}

    for path in sorted(METHODS_DIR.glob("*.yaml")):
        data = _load_yaml(path)
        method = {
            "id": str(data["id"]),
            "name": str(data["name"]),
            "category": _clean_text(data.get("category")),
            "control_stage": _clean_text(data.get("control_stage")).upper(),
            "status": _clean_text(data.get("status")) or "draft",
            "description": _clean_text(data.get("description")),
            "default_duration_min": int(data.get("default_duration_min", 0) or 0),
            "energy_cost": _clean_text(data.get("energy_cost")),
            "best_stage": _clean_text(data.get("best_stage")),
            "outputs_summary": _clean_text(data.get("outputs_summary")),
            "artifact_type": _clean_text(data.get("artifact_type")),
            "when_to_use": [_clean_text(item) for item in _listify(data.get("when_to_use"))],
            "when_not_to_use": [
                _clean_text(item) for item in _listify(data.get("when_not_to_use"))
            ],
            "required_outputs": [
                _clean_text(item)
                for item in _listify(data.get("required_outputs") or data.get("outputs"))
            ],
            "tags": [_clean_text(item) for item in _listify(data.get("tags"))],
            "primary_citations": [
                _clean_text(item) for item in _listify(data.get("primary_citations"))
            ],
            "source_file": _relative(path),
        }
        method["id_decode"] = decode_method_id(
            method["id"],
            method["control_stage"],
        )
        methods.append(method)
        methods_by_id[method["id"]] = method

    return methods, methods_by_id


def load_chains(
    methods_by_id: dict[str, dict[str, Any]],
    certification_registry: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    chains: list[dict[str, Any]] = []

    for path in sorted(CHAINS_DIR.glob("*.yaml")):
        if path.name == CERTIFICATION_REGISTRY_PATH.name:
            continue
        data = _load_yaml(path)

        blocks: list[dict[str, Any]] = []
        stage_sequence: list[str] = []
        unique_stage_sequence: list[str] = []
        for block_id in _listify(data.get("blocks")):
            method = methods_by_id.get(str(block_id), {})
            control_stage = _clean_text(method.get("control_stage")).upper()
            if control_stage:
                stage_sequence.append(control_stage)
                if control_stage not in unique_stage_sequence:
                    unique_stage_sequence.append(control_stage)
            blocks.append(
                {
                    "id": str(block_id),
                    "name": method.get("name", str(block_id)),
                    "control_stage": control_stage,
                    "artifact_type": method.get("artifact_type", ""),
                    "status": method.get("status", ""),
                }
            )

        chain_id = str(data["id"])
        certification = certification_registry.get(chain_id)
        validation_blocks = [
            {
                "name": block["name"],
                "control_stage": block["control_stage"],
            }
            for block in blocks
        ]
        validation_report = (
            validate_control_plane_chain(str(data["name"]), validation_blocks)
            if validate_control_plane_chain is not None
            else None
        )
        chain = {
            "id": chain_id,
            "name": str(data["name"]),
            "status": _clean_text(data.get("status")) or "draft",
            "description": _clean_text(data.get("description")),
            "is_template": bool(data.get("is_template", False)),
            "block_count": len(blocks),
            "blocks": blocks,
            "block_ids": [block["id"] for block in blocks],
            "block_names": [block["name"] for block in blocks],
            "stage_sequence": stage_sequence,
            "unique_stage_sequence": unique_stage_sequence,
            "stage_coverage": {
                stage: stage in stage_sequence for stage in STAGE_ORDER
            },
            "allowed_modes": [
                _clean_text(item) for item in _listify(data.get("allowed_modes"))
            ],
            "gates": [_clean_text(item) for item in _listify(data.get("gates"))],
            "failure_actions": [
                _clean_text(item) for item in _listify(data.get("failure_actions"))
            ],
            "requires_reference_targets": bool(
                data.get("requires_reference_targets", False)
            ),
            "context_tags": data.get("context_tags") or {},
            "default_knobs": data.get("default_knobs") or {},
            "runtime_profile": data.get("runtime_profile") or {},
            "block_overrides": data.get("block_overrides") or {},
            "certification": certification or {},
            "control_plane_valid": (
                bool(validation_report.valid)
                if validation_report is not None
                else None
            ),
            "control_plane_violations": (
                list(validation_report.violations)
                if validation_report is not None
                else []
            ),
            "control_plane_warnings": (
                list(validation_report.warnings)
                if validation_report is not None
                else []
            ),
            "source_file": _relative(path),
        }
        chain["id_decode"] = decode_chain_id(chain["id"], chain["name"])
        chains.append(chain)

    return chains


def build_inventory() -> dict[str, Any]:
    version = load_version()
    certification_registry = load_certification_registry()
    methods, methods_by_id = load_methods()
    chains = load_chains(methods_by_id, certification_registry)
    stage_counts = Counter(method["control_stage"] for method in methods)
    control_plane_valid_count = sum(
        1 for chain in chains if chain.get("control_plane_valid") is True
    )
    control_plane_invalid_count = sum(
        1 for chain in chains if chain.get("control_plane_valid") is False
    )

    return {
        "meta": {
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "library_version": version,
            "method_count": len(methods),
            "chain_count": len(chains),
            "sources": {
                "methods_dir": _relative(METHODS_DIR),
                "chains_dir": _relative(CHAINS_DIR),
                "version_file": _relative(VERSION_PATH),
            },
        },
        "summaries": {
            "methods_by_stage": {
                stage: stage_counts.get(stage, 0) for stage in STAGE_ORDER
            },
            "chains_by_control_plane_validity": {
                "valid": control_plane_valid_count,
                "invalid": control_plane_invalid_count,
            },
        },
        "methods": methods,
        "chains": chains,
    }


def write_json(inventory: dict[str, Any], output_dir: Path) -> Path:
    path = output_dir / "method_chain_inventory.json"
    path.write_text(json.dumps(inventory, indent=2), encoding="utf-8")
    return path


def write_methods_csv(inventory: dict[str, Any], output_dir: Path) -> Path:
    path = output_dir / "methods.csv"
    fieldnames = [
        "id",
        "id_family_code",
        "id_family_label",
        "id_sequence",
        "id_plain_english",
        "id_runtime_note",
        "name",
        "control_stage",
        "category",
        "status",
        "default_duration_min",
        "energy_cost",
        "best_stage",
        "artifact_type",
        "outputs_summary",
        "when_to_use",
        "when_not_to_use",
        "required_outputs",
        "tags",
        "primary_citations",
        "source_file",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for method in inventory["methods"]:
            id_decode = method["id_decode"]
            writer.writerow(
                {
                    "id": method["id"],
                    "id_family_code": id_decode["family_code"],
                    "id_family_label": id_decode["family_label"],
                    "id_sequence": id_decode["sequence"],
                    "id_plain_english": id_decode["plain_english"],
                    "id_runtime_note": id_decode["runtime_note"],
                    "name": method["name"],
                    "control_stage": method["control_stage"],
                    "category": method["category"],
                    "status": method["status"],
                    "default_duration_min": method["default_duration_min"],
                    "energy_cost": method["energy_cost"],
                    "best_stage": method["best_stage"],
                    "artifact_type": method["artifact_type"],
                    "outputs_summary": method["outputs_summary"],
                    "when_to_use": _join_list(method["when_to_use"]),
                    "when_not_to_use": _join_list(method["when_not_to_use"]),
                    "required_outputs": _join_list(method["required_outputs"]),
                    "tags": _join_list(method["tags"]),
                    "primary_citations": _join_list(method["primary_citations"]),
                    "source_file": method["source_file"],
                }
            )
    return path


def write_chains_csv(inventory: dict[str, Any], output_dir: Path) -> Path:
    path = output_dir / "chains.csv"
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "id",
                "family_code",
                "family_label",
                "variant_code",
                "variant_label",
                "id_plain_english",
                "name",
                "status",
                "is_template",
                "block_count",
                "allowed_modes",
                "requires_reference_targets",
                "energy",
                "time_available",
                "stage_sequence",
                "block_ids",
                "block_names",
                "description",
                "gates",
                "failure_actions",
                "certification_disposition",
                "control_plane_valid",
                "control_plane_violations",
                "source_file",
            ],
        )
        writer.writeheader()
        for chain in inventory["chains"]:
            context_tags = chain.get("context_tags", {})
            certification = chain.get("certification", {})
            id_decode = chain["id_decode"]
            writer.writerow(
                {
                    "id": chain["id"],
                    "family_code": id_decode["family_code"],
                    "family_label": id_decode["family_label"],
                    "variant_code": id_decode["variant_code"],
                    "variant_label": id_decode["variant_label"],
                    "id_plain_english": id_decode["plain_english"],
                    "name": chain["name"],
                    "status": chain["status"],
                    "is_template": chain["is_template"],
                    "block_count": chain["block_count"],
                    "allowed_modes": _join_list(chain["allowed_modes"]),
                    "requires_reference_targets": chain[
                        "requires_reference_targets"
                    ],
                    "energy": _clean_text(context_tags.get("energy")),
                    "time_available": _clean_text(context_tags.get("time_available")),
                    "stage_sequence": " -> ".join(chain["stage_sequence"]),
                    "block_ids": _join_list(chain["block_ids"]),
                    "block_names": _join_list(chain["block_names"]),
                    "description": chain["description"],
                    "gates": _join_list(chain["gates"]),
                    "failure_actions": _join_list(chain["failure_actions"]),
                    "certification_disposition": _clean_text(
                        certification.get("disposition")
                    ),
                    "control_plane_valid": chain["control_plane_valid"],
                    "control_plane_violations": _join_list(
                        chain["control_plane_violations"]
                    ),
                    "source_file": chain["source_file"],
                }
            )
    return path


def _render_method_table(methods: list[dict[str, Any]]) -> list[str]:
    lines = [
        "| ID | Name | Status | Min | Energy | Artifact | Outputs |",
        "|---|---|---|---:|---|---|---|",
    ]
    for method in methods:
        lines.append(
            "| {id} | {name} | {status} | {mins} | {energy} | {artifact} | {outputs} |".format(
                id=method["id"],
                name=method["name"],
                status=method["status"],
                mins=method["default_duration_min"],
                energy=method["energy_cost"] or "-",
                artifact=method["artifact_type"] or "-",
                outputs=method["outputs_summary"] or "-",
            )
        )
    return lines


def write_markdown(inventory: dict[str, Any], output_dir: Path) -> Path:
    path = output_dir / "method_chain_inventory.md"
    meta = inventory["meta"]
    methods = inventory["methods"]
    chains = inventory["chains"]

    methods_by_stage = {
        stage: [method for method in methods if method["control_stage"] == stage]
        for stage in STAGE_ORDER
    }
    method_family_rows: list[tuple[str, str]] = []
    seen_method_families: set[str] = set()
    for method in methods:
        id_decode = method["id_decode"]
        code = id_decode["family_code"]
        if code and code not in seen_method_families:
            seen_method_families.add(code)
            method_family_rows.append((code, id_decode["family_label"]))

    chain_family_rows: list[tuple[str, str]] = []
    seen_chain_families: set[str] = set()
    for chain in chains:
        id_decode = chain["id_decode"]
        code = id_decode["family_code"]
        if code and code not in seen_chain_families:
            seen_chain_families.add(code)
            chain_family_rows.append((code, id_decode["family_label"]))

    lines: list[str] = [
        "# SOP Method and Chain Inventory",
        "",
        f"Generated: `{meta['generated_at']}`",
        f"Library version: `{meta['library_version']}`",
        f"Canonical source: `{meta['sources']['methods_dir']}` + `{meta['sources']['chains_dir']}`",
        "",
        "## Counts",
        "",
        f"- Methods: **{meta['method_count']}**",
        f"- Chains: **{meta['chain_count']}**",
        "",
        "## How To Read IDs",
        "",
        "- Chain pattern: `C-<family>-<variant>`",
        "- Example: `C-FE-STD` = `Chain / First Exposure / Standard`",
        "- Example: `C-QD-001` = `Chain / Quick Drill` (`001` is the first numbered variant in that family).",
        "- Method pattern: `M-<family>-<sequence>`",
        "- Example: `M-PRE-010` = `Method / Prime / item 010`",
        "- Example: `M-CAL-001` = `Method / Calibrate / item 001`",
        "- Runtime rule: trust the live `control_stage` when an older ID prefix and the current stage differ.",
        "- Example: `M-ENC-008 Mechanism Trace` currently runs in `TEACH`.",
        "",
        "### Chain Family Codes",
        "",
        "| Code | Meaning |",
        "|---|---|",
    ]

    for code, label in chain_family_rows:
        lines.append(f"| `{code}` | {label} |")

    lines.extend(
        [
            "",
            "### Method Family Codes",
            "",
            "| Code | Meaning |",
            "|---|---|",
        ]
    )

    for code, label in method_family_rows:
        lines.append(f"| `{code}` | {label} |")

    lines.extend(
        [
            "",
        "## Methods By Control Stage",
        "",
        "| Stage | Count |",
        "|---|---:|",
        ]
    )

    for stage in STAGE_ORDER:
        lines.append(
            f"| {stage} | {inventory['summaries']['methods_by_stage'].get(stage, 0)} |"
        )

    lines.extend(
        [
            "",
            "## Chain Summary",
            "",
            "| ID | Name | Status | CP | Blocks | Modes | Energy | Time | Stages |",
            "|---|---|---|---|---:|---|---|---:|---|",
        ]
    )

    for chain in chains:
        context_tags = chain.get("context_tags", {})
        cp_status = (
            "pass"
            if chain["control_plane_valid"] is True
            else "fail"
            if chain["control_plane_valid"] is False
            else "-"
        )
        lines.append(
            "| {id} | {name} | {status} | {cp} | {blocks} | {modes} | {energy} | {time} | {stages} |".format(
                id=chain["id"],
                name=chain["name"],
                status=chain["status"],
                cp=cp_status,
                blocks=chain["block_count"],
                modes=", ".join(chain["allowed_modes"]) or "-",
                energy=_clean_text(context_tags.get("energy")) or "-",
                time=_clean_text(context_tags.get("time_available")) or "-",
                stages=" -> ".join(chain["unique_stage_sequence"]) or "-",
            )
        )

    lines.extend(["", "## Method Inventory", ""])

    for stage in STAGE_ORDER:
        stage_methods = methods_by_stage.get(stage, [])
        if not stage_methods:
            continue
        lines.append(f"### {stage} ({len(stage_methods)})")
        lines.append("")
        lines.extend(_render_method_table(stage_methods))
        lines.append("")

    lines.extend(["## Chain Details", ""])
    for chain in chains:
        context_tags = chain.get("context_tags", {})
        certification = chain.get("certification", {})
        lines.append(f"### {chain['id']} — {chain['name']}")
        lines.append("")
        lines.append(f"- ID meaning: `{chain['id_decode']['plain_english']}`")
        lines.append(f"- Status: `{chain['status']}`")
        lines.append(f"- Description: {chain['description']}")
        lines.append(
            f"- Allowed modes: {_join_list(chain['allowed_modes'], ', ') or 'None listed'}"
        )
        lines.append(
            f"- Context: energy={_clean_text(context_tags.get('energy')) or '-'}; "
            f"time_available={_clean_text(context_tags.get('time_available')) or '-'}"
        )
        lines.append(
            f"- Requires reference targets: `{chain['requires_reference_targets']}`"
        )
        lines.append(
            f"- Stage sequence: {' -> '.join(chain['stage_sequence']) or 'None'}"
        )
        if chain["control_plane_valid"] is not None:
            lines.append(
                f"- Control-plane validation: "
                f"`{'pass' if chain['control_plane_valid'] else 'fail'}`"
            )
        if chain["control_plane_violations"]:
            lines.append(
                f"- Control-plane violations: "
                f"{_join_list(chain['control_plane_violations'], '; ')}"
            )
        if chain["control_plane_warnings"]:
            lines.append(
                f"- Control-plane warnings: "
                f"{_join_list(chain['control_plane_warnings'], '; ')}"
            )
        if certification:
            lines.append(
                f"- Certification: `{_clean_text(certification.get('disposition')) or 'present'}`"
            )
        lines.append("- Blocks:")
        for index, block in enumerate(chain["blocks"], start=1):
            lines.append(
                f"  {index}. `{block['id']}` — {block['name']} [{block['control_stage'] or 'UNKNOWN'}]"
            )
        if chain["gates"]:
            lines.append(f"- Gates: {_join_list(chain['gates'], ', ')}")
        if chain["failure_actions"]:
            lines.append(
                f"- Failure actions: {_join_list(chain['failure_actions'], ', ')}"
            )
        lines.append("")

    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return path


def export_inventory(output_dir: Path) -> dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    inventory = build_inventory()
    return {
        "json": write_json(inventory, output_dir),
        "markdown": write_markdown(inventory, output_dir),
        "methods_csv": write_methods_csv(inventory, output_dir),
        "chains_csv": write_chains_csv(inventory, output_dir),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export the canonical SOP method and chain inventory."
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help="Directory for generated inventory files.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output_dir)
    outputs = export_inventory(output_dir)
    for label, path in outputs.items():
        print(f"[OK] {label}: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
