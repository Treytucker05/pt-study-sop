#!/usr/bin/env python3
"""CLI: Pilot harness for end-to-end chain execution testing.

Usage:
    python tools/pilot_run.py                        # run both default chains
    python tools/pilot_run.py --chain "First Exposure (Core)"
    python tools/pilot_run.py --chain "Review Sprint"
    python tools/pilot_run.py --dry-run              # load + validate only, no LLM
    python tools/pilot_run.py --print-prompts        # dry-run + show built prompts
"""

import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "brain"))

from db_setup import get_connection
from chain_prompts import get_step_prompt
from chain_logger import load_run_logs, grade_chain_run
from pero_mapping import get_pero_sequence, get_stage_coverage, PERO_LABELS

# Default pilot chains: one first-exposure, one review
DEFAULT_CHAINS = ["First Exposure (Core)", "Review Sprint"]
DEFAULT_TOPIC = "Pilot Test — Shoulder Impingement Syndrome"


def _find_chain_by_name(name: str) -> dict | None:
    """Look up a chain by name, return dict with id, name, block_ids."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, block_ids, context_tags FROM method_chains WHERE name = ?",
        (name,),
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    chain_id, chain_name, block_ids_raw, ctx_raw = row
    block_ids = json.loads(block_ids_raw) if block_ids_raw else []

    # Load blocks in order
    if block_ids:
        placeholders = ",".join("?" * len(block_ids))
        cursor.execute(
            f"SELECT id, name, category, facilitation_prompt, artifact_type "
            f"FROM method_blocks WHERE id IN ({placeholders})",
            block_ids,
        )
        blocks_map = {}
        for b in cursor.fetchall():
            blocks_map[b[0]] = {
                "id": b[0],
                "name": b[1],
                "category": b[2],
                "facilitation_prompt": b[3] or "",
                "artifact_type": b[4] or "",
            }
        blocks = [blocks_map[bid] for bid in block_ids if bid in blocks_map]
    else:
        blocks = []

    conn.close()
    return {
        "id": chain_id,
        "name": chain_name,
        "block_ids": block_ids,
        "context_tags": json.loads(ctx_raw) if ctx_raw else {},
        "blocks": blocks,
    }


def dry_run(chain: dict, topic: str, print_prompts: bool = False) -> bool:
    """Validate chain can load and build prompts without calling LLM."""
    print(f"\n{'=' * 60}")
    print(f"DRY RUN: {chain['name']} (id={chain['id']})")
    print(f"Topic: {topic}")
    print(f"{'=' * 60}")

    blocks = chain["blocks"]
    if not blocks:
        print("  ERROR: Chain has no blocks!")
        return False

    # PERO sequence check
    sequence = get_pero_sequence(blocks)
    coverage = get_stage_coverage(blocks)

    print(f"\nBlocks ({len(blocks)}):")
    for i, entry in enumerate(sequence):
        prompt_len = len(blocks[i].get("facilitation_prompt", ""))
        art = blocks[i].get("artifact_type", "") or "none"
        print(
            f"  {i + 1}. {entry['name']} [{entry['pero']}:{entry['label']}] "
            f"prompt={prompt_len}ch artifact={art}"
        )

    print(f"\nPERO Coverage:")
    for stage, covered in coverage.items():
        mark = "Y" if covered else "-"
        print(f"  [{mark}] {stage} ({PERO_LABELS[stage]})")

    missing = [s for s, c in coverage.items() if not c]
    if missing:
        print(f"\n  WARNING: Missing stages: {', '.join(missing)}")

    # Build prompts for each block
    if print_prompts:
        print(f"\n{'~' * 60}")
        print("PROMPTS:")
        accumulated = ""
        for i, block in enumerate(blocks):
            prompt = get_step_prompt(block, topic, "", accumulated)
            print(f"\n--- Step {i + 1}: {block['name']} ---")
            print(f"SYSTEM ({len(prompt['system'])} chars):")
            print(prompt["system"][:500])
            if len(prompt["system"]) > 500:
                print(f"  ... ({len(prompt['system'])} total chars)")
            print(f"\nUSER ({len(prompt['user'])} chars):")
            print(prompt["user"][:300])
            if len(prompt["user"]) > 300:
                print(f"  ... ({len(prompt['user'])} total chars)")
            accumulated += f"\n\n--- Step {i + 1}: {block['name']} ---\n[dry-run placeholder]"

    # Check for issues
    issues = []
    for block in blocks:
        if not block.get("facilitation_prompt"):
            issues.append(f"  {block['name']}: missing facilitation_prompt")
    if issues:
        print(f"\nISSUES ({len(issues)}):")
        for issue in issues:
            print(issue)
        return False

    print("\n  [OK] Dry run passed.")
    return True


def live_run(chain_name: str, topic: str) -> dict | None:
    """Execute a chain via chain_runner and return the result."""
    chain = _find_chain_by_name(chain_name)
    if not chain:
        print(f"ERROR: Chain '{chain_name}' not found in DB.")
        return None

    from chain_runner import run_chain

    print(f"\n{'=' * 60}")
    print(f"LIVE RUN: {chain['name']} (id={chain['id']})")
    print(f"Topic: {topic}")
    print(f"{'=' * 60}")

    start = time.time()
    result = run_chain(chain["id"], topic)
    elapsed = time.time() - start

    print(f"\nStatus: {result['status']}")
    print(f"Run ID: {result.get('run_id')}")
    print(f"Elapsed: {elapsed:.1f}s")

    if result["status"] == "completed":
        print(f"Steps completed: {len(result.get('steps', []))}")
        for step in result.get("steps", []):
            v = step.get("validation")
            v_str = ""
            if v and v.get("valid") is True:
                v_str = " [artifact OK]"
            elif v and v.get("valid") is False:
                v_str = f" [artifact FAIL: {v.get('errors', [])}]"
            print(f"  {step['step']}. {step['method_name']} — {step['duration_ms']}ms{v_str}")

        # Grade from logs
        logs = load_run_logs(result["run_id"])
        if logs:
            grade = grade_chain_run(logs)
            print(f"\nGrade: {grade['overall_score']}/100")
            if grade["flags"]:
                print(f"Flags: {', '.join(grade['flags'])}")
    else:
        print(f"Error: {result.get('error', 'unknown')}")

    return result


def main() -> int:
    dry = "--dry-run" in sys.argv
    print_prompts = "--print-prompts" in sys.argv
    json_mode = "--json" in sys.argv

    # Parse --chain argument
    chain_names = []
    if "--chain" in sys.argv:
        idx = sys.argv.index("--chain")
        if idx + 1 < len(sys.argv):
            chain_names = [sys.argv[idx + 1]]
    if not chain_names:
        chain_names = DEFAULT_CHAINS

    topic = DEFAULT_TOPIC

    if dry or print_prompts:
        all_ok = True
        for name in chain_names:
            chain = _find_chain_by_name(name)
            if not chain:
                print(f"ERROR: Chain '{name}' not found in DB.")
                all_ok = False
                continue
            ok = dry_run(chain, topic, print_prompts=print_prompts)
            if not ok:
                all_ok = False
        return 0 if all_ok else 1

    # Live run
    results = []
    for name in chain_names:
        result = live_run(name, topic)
        if result:
            results.append(result)

    if json_mode:
        # Serialize without full output text for readability
        summary = []
        for r in results:
            summary.append({
                "run_id": r.get("run_id"),
                "chain_name": r.get("chain_name"),
                "status": r.get("status"),
                "steps": len(r.get("steps", [])),
                "error": r.get("error"),
            })
        print(json.dumps(summary, indent=2))

    failed = sum(1 for r in results if r.get("status") != "completed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
