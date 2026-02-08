#!/usr/bin/env python3
"""One-time conversion: reads seed_methods.py data and writes YAML spec files.

Generates:
  sop/library/methods/M-{PREFIX}-{NNN}.yaml  (34 files)
  sop/library/chains/C-{PREFIX}-{NNN}.yaml   (13 files)

Evidence conversion is conservative:
  - Attempts to parse "Author (Year); finding" format
  - Always preserves original text in evidence_raw
  - Sets evidence: null if parsing fails
  - Never invents citations

Usage:
  python sop/tools/convert_seed_to_yaml.py
  python sop/tools/convert_seed_to_yaml.py --dry-run   # show what would be written
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[2]
METHODS_DIR = ROOT / "sop" / "library" / "methods"
CHAINS_DIR = ROOT / "sop" / "library" / "chains"

# ---------------------------------------------------------------------------
# Category → prefix mapping (must match taxonomy.yaml)
# ---------------------------------------------------------------------------
CATEGORY_PREFIX = {
    "prepare": "PRE",
    "encode": "ENC",
    "interrogate": "INT",
    "retrieve": "RET",
    "refine": "REF",
    "overlearn": "OVR",
}

# ---------------------------------------------------------------------------
# Chain prefix mapping (by primary context or name heuristic)
# ---------------------------------------------------------------------------
CHAIN_PREFIXES = {
    "First Exposure (Core)": "FE",
    "Review Sprint": "RS",
    "Quick Drill": "QD",
    "Anatomy Deep Dive": "AD",
    "Low Energy": "LE",
    "Exam Prep": "EP",
    "Clinical Reasoning": "CR",
    "Mastery Review": "MR",
    "Dense Anatomy Intake": "DA",
    "Pathophysiology Intake": "PI",
    "Clinical Reasoning Intake": "CI",
    "Quick First Exposure": "QF",
    "Visual Encoding": "VE",
}


def parse_evidence(raw: str | None) -> tuple[dict | None, str | None]:
    """Parse evidence string into structured Evidence dict.

    Returns (evidence_dict, evidence_raw).
    evidence_dict is None if parsing fails.
    evidence_raw is always the original string (None if no evidence).
    """
    if not raw:
        return None, None

    evidence_raw = raw

    # Try to parse "Author(s) (Year); finding" pattern
    # Handles: "Brod et al. (2013); prior knowledge activation..."
    # Handles: "Miller (1956); Gobet et al. (2001); chunking..."
    # Handles: "Nesbit & Adesope (2006) d=0.82; self-constructed..."
    match = re.match(r"^(.+?\(\d{4}\)(?:\s*d=[0-9.]+)?)\s*;\s*(.+)$", raw, re.DOTALL)
    if match:
        citation = match.group(1).strip()
        finding = match.group(2).strip()
        return {
            "citation": citation,
            "finding": finding,
            "source": "seed_methods.py",
        }, evidence_raw

    # If pattern doesn't match, preserve raw but don't force structure
    return None, evidence_raw


def block_to_yaml_dict(block: dict, method_id: str) -> dict:
    """Convert a seed_methods.py block dict to a YAML-ready dict."""
    evidence_struct, evidence_raw = parse_evidence(block.get("evidence"))

    result: dict = {
        "id": method_id,
        "name": block["name"],
        "category": block["category"],
        "description": block["description"],
        "default_duration_min": block["default_duration_min"],
        "energy_cost": block["energy_cost"],
        "best_stage": block.get("best_stage"),
        "status": "draft",
        "tags": block.get("tags", []),
    }

    # Evidence fields — always include both for transparency
    if evidence_struct:
        result["evidence"] = evidence_struct
    else:
        result["evidence"] = None

    result["evidence_raw"] = evidence_raw

    return result


def chain_to_yaml_dict(
    chain: dict, chain_id: str, name_to_method_id: dict[str, str]
) -> dict:
    """Convert a seed_methods.py chain dict to a YAML-ready dict."""
    # Resolve block names to method IDs
    block_ids = []
    for block_name in chain["blocks"]:
        mid = name_to_method_id.get(block_name)
        if mid:
            block_ids.append(mid)
        else:
            print(f"  WARNING: Chain '{chain['name']}' references unknown block '{block_name}'")
            block_ids.append(f"UNKNOWN:{block_name}")

    return {
        "id": chain_id,
        "name": chain["name"],
        "description": chain["description"],
        "blocks": block_ids,
        "context_tags": chain.get("context_tags", {}),
        "is_template": bool(chain.get("is_template", False)),
        "status": "draft",
    }


def yaml_dump(data: dict) -> str:
    """Dump dict to YAML with readable formatting."""
    return yaml.dump(
        data,
        default_flow_style=False,
        allow_unicode=True,
        sort_keys=False,
        width=120,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert seed_methods.py → YAML specs")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be written")
    args = parser.parse_args()

    # Import seed data
    sys.path.insert(0, str(ROOT / "brain" / "data"))
    # We only need the data constants, not the seeding functions
    from seed_methods import METHOD_BLOCKS, TEMPLATE_CHAINS

    # --- Methods ---
    METHODS_DIR.mkdir(parents=True, exist_ok=True)
    CHAINS_DIR.mkdir(parents=True, exist_ok=True)

    # Track category counters for sequential IDs
    cat_counter: dict[str, int] = {}
    name_to_method_id: dict[str, str] = {}

    print(f"Converting {len(METHOD_BLOCKS)} method blocks...")
    for block in METHOD_BLOCKS:
        cat = block["category"]
        prefix = CATEGORY_PREFIX[cat]
        cat_counter[cat] = cat_counter.get(cat, 0) + 1
        method_id = f"M-{prefix}-{cat_counter[cat]:03d}"

        name_to_method_id[block["name"]] = method_id
        data = block_to_yaml_dict(block, method_id)
        out_path = METHODS_DIR / f"{method_id}.yaml"

        if args.dry_run:
            print(f"  [DRY] {out_path.name}: {block['name']}")
        else:
            out_path.write_text(yaml_dump(data), encoding="utf-8")
            print(f"  [OK] {out_path.name}: {block['name']}")

    # --- Chains ---
    chain_counter: dict[str, int] = {}
    print(f"\nConverting {len(TEMPLATE_CHAINS)} template chains...")
    for chain in TEMPLATE_CHAINS:
        prefix = CHAIN_PREFIXES.get(chain["name"], "XX")
        chain_counter[prefix] = chain_counter.get(prefix, 0) + 1
        chain_id = f"C-{prefix}-{chain_counter[prefix]:03d}"

        data = chain_to_yaml_dict(chain, chain_id, name_to_method_id)
        out_path = CHAINS_DIR / f"{chain_id}.yaml"

        if args.dry_run:
            print(f"  [DRY] {out_path.name}: {chain['name']}")
        else:
            out_path.write_text(yaml_dump(data), encoding="utf-8")
            print(f"  [OK] {out_path.name}: {chain['name']}")

    # --- Summary ---
    method_count = len(METHOD_BLOCKS)
    chain_count = len(TEMPLATE_CHAINS)
    evidence_parsed = sum(
        1 for b in METHOD_BLOCKS if parse_evidence(b.get("evidence"))[0] is not None
    )
    evidence_null = sum(
        1 for b in METHOD_BLOCKS if b.get("evidence") and parse_evidence(b.get("evidence"))[0] is None
    )
    evidence_missing = sum(1 for b in METHOD_BLOCKS if not b.get("evidence"))

    print(f"\n--- Summary ---")
    print(f"Methods:  {method_count} files")
    print(f"Chains:   {chain_count} files")
    print(f"Evidence: {evidence_parsed} parsed, {evidence_null} unparsed (raw preserved), {evidence_missing} missing")


if __name__ == "__main__":
    main()
