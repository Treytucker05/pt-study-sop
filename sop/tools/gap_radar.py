#!/usr/bin/env python3
"""Gap Radar — analyzes the YAML method library for coverage gaps.

Gap categories (ranked by severity):
  1. Missing evidence — methods with evidence: null
  2. Uncovered mechanisms — mechanisms in taxonomy not referenced by any method
  3. Uncovered stages — stages with no chains targeting them
  4. Orphan methods — methods not referenced by any chain
  5. Incomplete specs — methods missing stop_criteria, failure_modes, logging_fields
  6. Unbalanced chains — chains missing a PEIRRO phase
  7. No evidence tickets — methods/chains with no linked evidence ticket

Usage:
  python sop/tools/gap_radar.py               # markdown report
  python sop/tools/gap_radar.py --json         # structured JSON
  python sop/tools/gap_radar.py --top 5        # limit items per category

Exit: 0 always (informational report)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[2]
LIB_DIR = ROOT / "sop" / "library"
METHODS_DIR = LIB_DIR / "methods"
CHAINS_DIR = LIB_DIR / "chains"
META_DIR = LIB_DIR / "meta"
TICKETS_DIR = LIB_DIR / "research" / "tickets"

PEIRRO_PHASES = ["prepare", "encode", "retrieve", "interrogate", "refine", "overlearn"]


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def _load_yaml(path: Path) -> dict | None:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _load_all_methods() -> list[dict]:
    if not METHODS_DIR.exists():
        return []
    return [
        d for p in sorted(METHODS_DIR.glob("*.yaml"))
        if (d := _load_yaml(p)) is not None
    ]


def _load_all_chains() -> list[dict]:
    if not CHAINS_DIR.exists():
        return []
    return [
        d for p in sorted(CHAINS_DIR.glob("*.yaml"))
        if (d := _load_yaml(p)) is not None
    ]


def _load_taxonomy() -> dict | None:
    path = META_DIR / "taxonomy.yaml"
    return _load_yaml(path) if path.exists() else None


def _load_tickets() -> list[dict]:
    if not TICKETS_DIR.exists():
        return []
    return [
        d for p in sorted(TICKETS_DIR.glob("*.yaml"))
        if p.name != ".gitkeep" and (d := _load_yaml(p)) is not None
    ]


# ---------------------------------------------------------------------------
# Gap analysis
# ---------------------------------------------------------------------------

def analyze_gaps(top_n: int = 0) -> dict:
    """Run all gap checks. Returns structured report."""
    methods = _load_all_methods()
    chains = _load_all_chains()
    taxonomy = _load_taxonomy() or {}
    tickets = _load_tickets()

    report: dict = {
        "summary": {
            "method_count": len(methods),
            "chain_count": len(chains),
            "ticket_count": len(tickets),
        },
        "gaps": {},
    }

    # Build lookup maps
    method_ids = {m["id"] for m in methods}
    method_categories = {m["id"]: m.get("category", "") for m in methods}
    chain_block_ids = set()
    for c in chains:
        chain_block_ids.update(c.get("blocks", []))

    ticket_targets = {t.get("target_id") for t in tickets}

    # 1. Missing evidence
    missing_ev = [
        m["id"] for m in methods
        if m.get("evidence") is None and m.get("evidence_raw") is None
    ]
    report["gaps"]["missing_evidence"] = {
        "severity": 1,
        "count": len(missing_ev),
        "items": missing_ev[:top_n] if top_n else missing_ev,
    }

    # 2. Uncovered mechanisms
    tax_mechanisms = set(taxonomy.get("mechanisms", []))
    method_tags = set()
    for m in methods:
        method_tags.update(m.get("tags", []))
    uncovered_mechs = sorted(tax_mechanisms - method_tags)
    report["gaps"]["uncovered_mechanisms"] = {
        "severity": 2,
        "count": len(uncovered_mechs),
        "items": uncovered_mechs[:top_n] if top_n else uncovered_mechs,
    }

    # 3. Uncovered stages
    tax_stages = set(taxonomy.get("stages", []))
    chain_stages = set()
    for c in chains:
        ct = c.get("context_tags", {})
        if isinstance(ct, dict) and "stage" in ct:
            chain_stages.add(ct["stage"])
    uncovered_stages = sorted(tax_stages - chain_stages)
    report["gaps"]["uncovered_stages"] = {
        "severity": 3,
        "count": len(uncovered_stages),
        "items": uncovered_stages[:top_n] if top_n else uncovered_stages,
    }

    # 4. Orphan methods
    orphans = sorted(method_ids - chain_block_ids)
    report["gaps"]["orphan_methods"] = {
        "severity": 4,
        "count": len(orphans),
        "items": orphans[:top_n] if top_n else orphans,
    }

    # 5. Incomplete specs
    incomplete = []
    for m in methods:
        missing = []
        if not m.get("stop_criteria"):
            missing.append("stop_criteria")
        if not m.get("failure_modes"):
            missing.append("failure_modes")
        if not m.get("logging_fields"):
            missing.append("logging_fields")
        if missing:
            incomplete.append({"id": m["id"], "missing": missing})
    report["gaps"]["incomplete_specs"] = {
        "severity": 5,
        "count": len(incomplete),
        "items": incomplete[:top_n] if top_n else incomplete,
    }

    # 6. Unbalanced chains
    unbalanced = []
    for c in chains:
        block_ids = c.get("blocks", [])
        phases_present = set()
        for bid in block_ids:
            cat = method_categories.get(bid)
            if cat:
                phases_present.add(cat)
        missing_phases = [p for p in PEIRRO_PHASES if p not in phases_present]
        if missing_phases:
            unbalanced.append({
                "id": c["id"],
                "name": c.get("name", ""),
                "missing_phases": missing_phases,
            })
    report["gaps"]["unbalanced_chains"] = {
        "severity": 6,
        "count": len(unbalanced),
        "items": unbalanced[:top_n] if top_n else unbalanced,
    }

    # 7. No evidence tickets
    all_target_ids = method_ids | {c["id"] for c in chains}
    no_tickets = sorted(all_target_ids - ticket_targets)
    report["gaps"]["no_evidence_tickets"] = {
        "severity": 7,
        "count": len(no_tickets),
        "items": no_tickets[:top_n] if top_n else no_tickets,
    }

    # Next actions
    actions = []
    if missing_ev:
        actions.append(f"Add evidence citations to {len(missing_ev)} methods")
    if uncovered_mechs:
        actions.append(f"Create methods covering: {', '.join(uncovered_mechs[:3])}")
    if uncovered_stages:
        actions.append(f"Create chains for stages: {', '.join(uncovered_stages)}")
    if orphans:
        actions.append(f"Add {len(orphans)} orphan methods to chains or deprecate")
    if incomplete:
        actions.append(f"Fill stop_criteria/failure_modes/logging_fields on {len(incomplete)} methods")
    if no_tickets:
        actions.append(f"Create evidence tickets for {len(no_tickets)} items")
    report["next_actions"] = actions

    return report


# ---------------------------------------------------------------------------
# Renderers
# ---------------------------------------------------------------------------

def render_markdown(report: dict) -> str:
    """Render gap report as markdown."""
    lines = ["# Gap Radar Report", ""]
    s = report["summary"]
    lines.append(f"**Library:** {s['method_count']} methods, {s['chain_count']} chains, {s['ticket_count']} tickets")
    lines.append("")

    gaps = report["gaps"]

    for key, gap in sorted(gaps.items(), key=lambda x: x[1]["severity"]):
        label = key.replace("_", " ").title()
        lines.append(f"## {gap['severity']}. {label} ({gap['count']})")
        lines.append("")
        items = gap["items"]
        if not items:
            lines.append("None")
        elif isinstance(items[0], str):
            for item in items:
                lines.append(f"- `{item}`")
        elif isinstance(items[0], dict):
            for item in items:
                detail = ", ".join(f"{k}: {v}" for k, v in item.items())
                lines.append(f"- {detail}")
        lines.append("")

    if report.get("next_actions"):
        lines.append("## Next Actions")
        lines.append("")
        for i, action in enumerate(report["next_actions"], 1):
            lines.append(f"{i}. {action}")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze YAML method library for coverage gaps.")
    parser.add_argument("--json", action="store_true", help="Output structured JSON")
    parser.add_argument("--top", type=int, default=0, help="Limit items per category (0=unlimited)")
    args = parser.parse_args()

    report = analyze_gaps(top_n=args.top)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(render_markdown(report))

    return 0


if __name__ == "__main__":
    sys.exit(main())
