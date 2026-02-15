from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError as exc:
    raise SystemExit("PyYAML is required. Install with: pip install pyyaml") from exc

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
brain_path = ROOT / "brain"
if str(brain_path) not in sys.path:
    sys.path.insert(0, str(brain_path))


def load_module(module_name: str, path: Path):
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load {module_name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


METHODS_DIR = ROOT / "sop" / "library" / "methods"
CHAINS_DIR = ROOT / "sop" / "library" / "chains"
LOGS_DIR = ROOT / "logs"
LOGS_FILE = LOGS_DIR / "block_runs.jsonl"
SUMMARY_FILE = LOGS_DIR / "last_chain_run_summary.json"


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


def load_chain(chain_id: str) -> dict:
    for path in sorted(CHAINS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if data and data.get("id") == chain_id:
            data["_path"] = str(path)
            return data
    raise SystemExit(f"Chain '{chain_id}' not found in {CHAINS_DIR}")


def resolve_chain_db_id(
    chain_name: str, method_ids: list[str], db_setup
) -> tuple[int, bool]:
    conn = db_setup.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM method_chains WHERE name = ?", (chain_name,))
    row = cursor.fetchone()
    if row:
        conn.close()
        return int(row[0]), False

    cursor.execute("SELECT id, method_id FROM method_blocks")
    id_map = {row[1]: row[0] for row in cursor.fetchall() if row[1]}
    missing = [mid for mid in method_ids if mid not in id_map]
    if missing:
        conn.close()
        raise SystemExit(f"Missing method_ids in DB: {', '.join(missing)}")

    block_ids = [id_map[mid] for mid in method_ids]
    cursor.execute(
        "INSERT INTO method_chains (name, description, block_ids, context_tags, created_at, is_template) "
        "VALUES (?, ?, ?, ?, datetime('now'), 0)",
        (chain_name, "", json.dumps(block_ids), json.dumps({})),
    )
    chain_db_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return int(chain_db_id), True


def delete_chain(chain_db_id: int, db_setup) -> None:
    conn = db_setup.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM method_chains WHERE id = ?", (chain_db_id,))
    conn.commit()
    conn.close()


def has_facilitation_header(prompt: dict, block_name: str) -> bool:
    header = f"## {block_name} Facilitation Prompt"
    system_prompt = prompt.get("system", "")
    return header in system_prompt


def format_log_record(
    *,
    run_id: str,
    chain_id: str,
    chain_name: str,
    method: dict,
    duration_seconds: float,
    success: bool,
    artifact_valid: bool | None,
    error_message: str | None,
    stage_func,
) -> dict:
    display_stage = stage_func(
        method_id=method.get("method_id"),
        category=method.get("category", ""),
        artifact_type=method.get("artifact_type"),
        outputs=method.get("outputs", []),
    )
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "chain_id": chain_id,
        "chain_name": chain_name,
        "method_id": method.get("method_id"),
        "method_name": method.get("name"),
        "legacy_category": method.get("category"),
        "display_stage": display_stage,
        "duration_seconds": round(duration_seconds, 2),
        "success": success,
        "artifact_valid": artifact_valid,
        "error_message": error_message,
    }


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser()
    parser.add_argument("--chain", required=True, help="Chain ID (e.g., C-FE-001)")
    parser.add_argument("--print-prompts", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force-invalid-artifact", action="store_true")
    args = parser.parse_args()

    chain = load_chain(args.chain)
    chain_name = chain.get("name", "")
    method_ids = chain.get("blocks", [])
    if not isinstance(method_ids, list) or not method_ids:
        raise SystemExit("Chain has no blocks")

    db_setup = load_module("db_setup", ROOT / "brain" / "db_setup.py")
    chain_runner = load_module("chain_runner", ROOT / "brain" / "chain_runner.py")
    chain_prompts = load_module("chain_prompts", ROOT / "brain" / "chain_prompts.py")
    grade_run = load_module("grade_run", ROOT / "tools" / "grade_run.py")
    stage_mapper = load_module(
        "pero_stage_mapper", ROOT / "tools" / "pero_stage_mapper.py"
    )

    stage_func = stage_mapper.get_display_stage

    methods = load_methods()

    chain_db_id, created_temp = resolve_chain_db_id(chain_name, method_ids, db_setup)
    run_id = str(uuid.uuid4())
    start_time = datetime.now(timezone.utc)

    block_logs: list[dict] = []
    error_message: str | None = None
    facilitation_prompt_checked = False
    facilitation_prompt_present = False

    chain_blocks: list[dict] = []
    try:
        if args.dry_run:
            for mid in method_ids:
                method = methods.get(
                    mid, {"method_id": mid, "name": mid, "category": ""}
                )
                block_logs.append(
                    format_log_record(
                        run_id=run_id,
                        chain_id=args.chain,
                        chain_name=chain_name,
                        method=method,
                        duration_seconds=0,
                        success=True,
                        artifact_valid=None,
                        error_message=None,
                        stage_func=stage_func,
                    )
                )
        else:
            chain_blocks = (chain_runner._load_chain(chain_db_id) or {}).get(
                "blocks", []
            )
            blocks_for_prompt = chain_blocks
            if args.print_prompts and blocks_for_prompt:
                headers_present = True
                print(f"\n[Prompt Headers] {args.chain} - {chain_name}")
                for block in blocks_for_prompt:
                    print(f"\n## {block.get('name', 'Unknown')}")
                    prompt = chain_prompts.get_step_prompt(block, chain_name, "", "")
                    lines = prompt["system"].splitlines()[:40]
                    print("\n".join(lines))
                    print("---")
                    facilitation_prompt_checked = True
                    block_name = block.get("name", "")
                    if not has_facilitation_header(prompt, block_name):
                        headers_present = False
                facilitation_prompt_present = headers_present

            result = chain_runner.run_chain(
                chain_db_id,
                chain_name,
                options={"force_invalid_artifact": args.force_invalid_artifact},
            )
            steps = result.get("steps", [])

            for index, step in enumerate(steps):
                method_id = method_ids[index] if index < len(method_ids) else None
                method_name = step.get("method_name") or step.get("method") or ""
                method = methods.get(method_id) if method_id else None
                if not method:
                    method = {
                        "method_id": method_id,
                        "name": method_name,
                        "category": step.get("category", ""),
                        "artifact_type": None,
                        "outputs": [],
                    }
                elif method_name and not method.get("name"):
                    method = {**method, "name": method_name}
                validation = step.get("validation") or {}
                artifact_valid = None
                if isinstance(validation, dict) and "valid" in validation:
                    artifact_valid = bool(validation.get("valid"))
                step_success = bool(step.get("success", True))
                step_error = step.get("error")
                block_logs.append(
                    format_log_record(
                        run_id=run_id,
                        chain_id=args.chain,
                        chain_name=chain_name,
                        method=method,
                        duration_seconds=(step.get("duration_ms", 0) / 1000),
                        success=step_success,
                        artifact_valid=artifact_valid,
                        error_message=step_error,
                        stage_func=stage_func,
                    )
                )

            if result.get("status") == "failed":
                error_message = str(result.get("error") or "Chain failed")
                if not any(record.get("success") is False for record in block_logs):
                    failed_index = len(steps)
                    if failed_index < len(chain_blocks):
                        failed_block = chain_blocks[failed_index]
                        failed_method_id = method_ids[failed_index]
                        failed_method = methods.get(failed_method_id) or {
                            "method_id": failed_method_id,
                            "name": failed_block.get("name", failed_method_id),
                            "category": failed_block.get("category", ""),
                            "artifact_type": failed_block.get("artifact_type"),
                            "outputs": [],
                        }
                        artifact_valid = None
                        lowered = error_message.lower()
                        if "artifact" in lowered or "validation" in lowered:
                            artifact_valid = False
                        block_logs.append(
                            format_log_record(
                                run_id=run_id,
                                chain_id=args.chain,
                                chain_name=chain_name,
                                method=failed_method,
                                duration_seconds=0,
                                success=False,
                                artifact_valid=artifact_valid,
                                error_message=error_message,
                                stage_func=stage_func,
                            )
                        )
    except Exception as exc:
        error_message = str(exc)
    finally:
        if created_temp:
            delete_chain(chain_db_id, db_setup)

    if error_message and not block_logs:
        method = {
            "method_id": None,
            "name": "unknown",
            "category": "",
            "artifact_type": None,
            "outputs": [],
        }
        artifact_valid = None
        lowered = error_message.lower()
        if "artifact" in lowered or "validation" in lowered:
            artifact_valid = False
        block_logs.append(
            format_log_record(
                run_id=run_id,
                chain_id=args.chain,
                chain_name=chain_name,
                method=method,
                duration_seconds=0,
                success=False,
                artifact_valid=artifact_valid,
                error_message=error_message,
                stage_func=stage_func,
            )
        )

    LOGS_DIR.mkdir(exist_ok=True)
    with LOGS_FILE.open("a", encoding="utf-8") as f:
        for record in block_logs:
            f.write(json.dumps(record) + "\n")

    end_time = datetime.now(timezone.utc)
    stage_coverage = sorted(
        {r["display_stage"] for r in block_logs if r.get("display_stage")}
    )
    blocks_total = len(block_logs)
    blocks_success = sum(1 for r in block_logs if r.get("success"))
    success_rate = round((blocks_success / blocks_total) if blocks_total else 0, 3)

    grade = grade_run.grade_chain_run(
        block_logs,
        chain_meta={"chain_id": args.chain, "chain_name": chain_name},
    )

    artifact_validation_ran = any(
        record.get("artifact_valid") in (True, False) for record in block_logs
    )

    summary = {
        "run_id": run_id,
        "chain_id": args.chain,
        "chain_name": chain_name,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "stage_coverage": stage_coverage,
        "blocks_total": blocks_total,
        "blocks_success": blocks_success,
        "success_rate": success_rate,
        "grade": grade,
        "facilitation_prompt_checked": facilitation_prompt_checked,
        "facilitation_prompt_present": facilitation_prompt_present,
        "force_invalid_artifact": args.force_invalid_artifact,
        "artifact_validation_ran": artifact_validation_ran,
    }
    SUMMARY_FILE.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    print("\n[Pilot Run Summary]")
    print(f"Chain: {args.chain} - {chain_name}")
    print(f"Run ID: {run_id}")
    print(f"Success rate: {success_rate}")
    print(f"Stage coverage: {', '.join(stage_coverage) if stage_coverage else 'none'}")
    print(
        f"Grade: {grade['overall_score']} (flags: {', '.join(grade['flags']) if grade['flags'] else 'none'})"
    )

    print("\nUsage:")
    print("  python tools/pilot_run.py --chain C-FE-001 --print-prompts")
    print("  python tools/pilot_run.py --chain C-RS-001")
    print("  python tools/report_last_run.py")
    print("  python tools/validate_chains.py")

    if error_message:
        print(f"\nRun failed: {error_message}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
