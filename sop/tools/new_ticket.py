#!/usr/bin/env python3
"""Evidence Ticket Scaffolder — creates research ticket YAML files.

Usage:
  python sop/tools/new_ticket.py --target-type METHOD --target-id M-PRE-001
  python sop/tools/new_ticket.py --target-type METHOD --target-id M-PRE-001 --question "What is optimal duration?"
  python sop/tools/new_ticket.py --target-type CHAIN --target-id C-FE-001

Creates: sop/library/research/tickets/ET-{next_seq}.yaml
"""

from __future__ import annotations

import argparse
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _next_ticket_id() -> str:
    """Determine next ET-NNN sequence number."""
    existing = sorted(TICKETS_DIR.glob("ET-*.yaml"))
    if not existing:
        return "ET-001"
    last = existing[-1].stem  # e.g. "ET-003"
    try:
        num = int(last.split("-")[1])
        return f"ET-{num + 1:03d}"
    except (IndexError, ValueError):
        return f"ET-{len(existing) + 1:03d}"


def _load_yaml(path: Path) -> dict | None:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _load_target(target_type: str, target_id: str) -> dict | None:
    """Load the target method or chain YAML."""
    if target_type == "METHOD":
        path = METHODS_DIR / f"{target_id}.yaml"
    elif target_type == "CHAIN":
        path = CHAINS_DIR / f"{target_id}.yaml"
    else:
        return None
    return _load_yaml(path) if path.exists() else None


def _load_taxonomy_mechanisms() -> list[str]:
    path = META_DIR / "taxonomy.yaml"
    if not path.exists():
        return []
    data = _load_yaml(path)
    if data and "mechanisms" in data:
        return data["mechanisms"]
    return []


def _auto_keywords(target: dict | None, mechanisms: list[str]) -> dict:
    """Generate keyword suggestions from target tags and taxonomy."""
    primary = []
    synonyms = []
    exclusions: list[str] = []

    if target:
        primary.append(target.get("name", ""))
        primary.extend(target.get("tags", []))
        cat = target.get("category", "")
        if cat:
            primary.append(cat)

    # Add relevant mechanisms as synonyms
    if target and mechanisms:
        tags = set(target.get("tags", []))
        for mech in mechanisms:
            if mech in tags:
                synonyms.append(mech)

    return {
        "primary": [k for k in primary if k],
        "synonyms": synonyms,
        "exclusions": exclusions,
    }


# ---------------------------------------------------------------------------
# Scaffold
# ---------------------------------------------------------------------------

def create_ticket(
    target_type: str,
    target_id: str,
    question: str | None = None,
) -> Path:
    """Create an evidence ticket YAML file. Returns the created path."""
    TICKETS_DIR.mkdir(parents=True, exist_ok=True)

    ticket_id = _next_ticket_id()
    target = _load_target(target_type, target_id)
    mechanisms = _load_taxonomy_mechanisms()
    keywords = _auto_keywords(target, mechanisms)

    target_name = target.get("name", target_id) if target else target_id
    default_question = f"What evidence supports the design of {target_name}?"

    ticket = {
        "id": ticket_id,
        "target_type": target_type,
        "target_id": target_id,
        "question": question or default_question,
        "keywords": keywords,
        "evidence_summary": None,
        "operational_rules": None,
        "proposed_patch": None,
        "validation_plan": None,
        "status": "draft",
        "citations": None,
        "notes": None,
    }

    path = TICKETS_DIR / f"{ticket_id}.yaml"
    path.write_text(
        yaml.dump(ticket, default_flow_style=False, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )
    return path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Create an evidence research ticket.")
    parser.add_argument(
        "--target-type", required=True, choices=["METHOD", "CHAIN", "ENGINE"],
        help="Type of target (METHOD, CHAIN, ENGINE)",
    )
    parser.add_argument(
        "--target-id", required=True,
        help="ID of the target (e.g. M-PRE-001, C-FE-001)",
    )
    parser.add_argument(
        "--question", default=None,
        help="Research question (auto-generated if omitted)",
    )
    args = parser.parse_args()

    path = create_ticket(args.target_type, args.target_id, args.question)
    print(f"Created: {path.relative_to(ROOT)}")

    # Show the created ticket
    print()
    print(path.read_text(encoding="utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
