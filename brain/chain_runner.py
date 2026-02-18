"""Chain runner — orchestrates sequential LLM calls per method block.

Executes a method chain end-to-end: loads the chain definition, runs each
block through an LLM with accumulated context, and writes artifacts
(Obsidian notes, card drafts, session records).
"""

from __future__ import annotations

import json
import sqlite3
import time
import re
from datetime import datetime
from typing import Any

from config import DB_PATH
from db_setup import get_connection
from llm_provider import model_call
from chain_prompts import get_step_prompt
from artifact_validators import normalize_anki_output, validate_step_output
from chain_logger import log_block_run

# Cap RAG context to avoid prompt overflow
MAX_RAG_CHARS = 2000
# Per-step LLM timeout (seconds)
STEP_TIMEOUT = 90


def run_chain(
    chain_id: int,
    topic: str,
    course_id: int | None = None,
    source_doc_ids: list[int] | None = None,
    options: dict | None = None,
) -> dict[str, Any]:
    """Execute a method chain end-to-end. Returns structured result."""
    options = options or {}
    write_obsidian = options.get("write_obsidian", True)
    draft_cards = options.get("draft_cards", True)
    force_invalid_artifact = options.get("force_invalid_artifact", False)

    # 1. Load chain + blocks from DB
    chain = _load_chain(chain_id)
    if not chain:
        return {
            "run_id": None,
            "status": "failed",
            "error": f"Chain {chain_id} not found",
        }

    blocks = chain["blocks"]
    total_steps = len(blocks)

    # 2. Create chain_runs row
    run_id = _create_run(chain_id, topic, course_id, total_steps)

    # 3. Load RAG context
    rag_context = (
        _load_rag_context(source_doc_ids, topic, course_id) if source_doc_ids else ""
    )

    # 4. Execute each block
    accumulated = ""
    steps: list[dict] = []
    force_invalid_targets = {
        "M-OVR-002": "cards",
        "M-ENC-009": "concept-map",
        "M-ENC-011": "flowchart",
        "M-ENC-012": "decision-tree",
    }
    validator_artifact_types = {
        "cards",
        "concept-map",
        "flowchart",
        "decision-tree",
        "comparison-table",
    }
    force_invalid_index = None
    force_invalid_override_type = None
    if force_invalid_artifact:
        for idx, block in enumerate(blocks):
            method_id = block.get("method_id")
            artifact_type = block.get("artifact_type")
            if method_id in force_invalid_targets:
                force_invalid_index = idx
                force_invalid_override_type = force_invalid_targets[method_id]
                break
            if artifact_type in validator_artifact_types:
                force_invalid_index = idx
                force_invalid_override_type = artifact_type
                break
        if force_invalid_index is None and blocks:
            force_invalid_index = len(blocks) - 1
            force_invalid_override_type = "cards"

    for i, block in enumerate(blocks):
        step_start = time.time()
        prompt = get_step_prompt(block, topic, rag_context, accumulated)
        result = model_call(
            prompt["system"],
            prompt["user"],
            provider="codex",
            timeout=STEP_TIMEOUT,
        )

        duration_ms = int((time.time() - step_start) * 1000)

        if result["success"]:
            step_output = result["content"]
            if block.get("method_id") == "M-OVR-002":
                step_output = normalize_anki_output(step_output)
            validation_block = block
            if not block.get("artifact_type"):
                method_id = block.get("method_id")
                if method_id in force_invalid_targets:
                    validation_block = {
                        **block,
                        "artifact_type": force_invalid_targets[method_id],
                    }
            if force_invalid_artifact and force_invalid_index == i:
                if force_invalid_override_type == "cards":
                    step_output = "CARD 1:\nFRONT: missing type/back/tags"
                else:
                    step_output = "```mermaid\ninvalid\n```"
                validation_block = {
                    **block,
                    "artifact_type": force_invalid_override_type,
                }
            accumulated += f"\n\n--- Step {i + 1}: {block['name']} ---\n{step_output}"

            # Validate artifact format if block declares a machine-readable type
            validation = validate_step_output(validation_block, step_output)
            validation_info = None
            if validation and not validation.valid:
                validation_info = {
                    "valid": False,
                    "errors": validation.errors,
                    "warnings": validation.warnings,
                }
            elif validation:
                validation_info = {"valid": True, "warnings": validation.warnings}

            if validation_info and validation_info.get("valid") is False:
                error_msg = "Artifact validation failed: " + "; ".join(
                    validation_info.get("errors", [])
                )
                steps.append(
                    {
                        "step": i + 1,
                        "method_name": block["name"],
                        "category": block["category"],
                        "output": step_output,
                        "duration_ms": duration_ms,
                        "validation": validation_info,
                        "success": False,
                        "error": error_msg,
                    }
                )
                log_block_run(
                    chain_id=chain_id,
                    chain_name=chain["name"],
                    run_id=run_id,
                    block_id=block["id"],
                    block_name=block["name"],
                    category=block["category"],
                    duration_seconds=duration_ms / 1000,
                    success=False,
                    artifact_validation_pass=False,
                )
                _fail_run(run_id, error_msg)
                return {
                    "run_id": run_id,
                    "chain_name": chain["name"],
                    "status": "failed",
                    "steps": steps,
                    "error": error_msg,
                    "artifacts": None,
                }

            steps.append(
                {
                    "step": i + 1,
                    "method_name": block["name"],
                    "category": block["category"],
                    "output": step_output,
                    "duration_ms": duration_ms,
                    "validation": validation_info,
                    "success": True,
                    "error": None,
                }
            )

            # Log block run
            log_block_run(
                chain_id=chain_id,
                chain_name=chain["name"],
                run_id=run_id,
                block_id=block["id"],
                block_name=block["name"],
                category=block["category"],
                duration_seconds=duration_ms / 1000,
                success=True,
                artifact_validation_pass=(
                    validation_info["valid"] if validation_info else None
                ),
            )
        else:
            error_msg = result.get("error", "LLM call failed")
            duration_seconds = time.time() - step_start
            log_block_run(
                chain_id=chain_id,
                chain_name=chain["name"],
                run_id=run_id,
                block_id=block["id"],
                block_name=block["name"],
                category=block["category"],
                duration_seconds=duration_seconds,
                success=False,
            )
            _fail_run(run_id, f"Step {i + 1} ({block['name']}): {error_msg}")
            return {
                "run_id": run_id,
                "chain_name": chain["name"],
                "status": "failed",
                "steps": steps,
                "error": error_msg,
                "artifacts": None,
            }

        _update_step(run_id, i + 1)

    # 5. Write artifacts
    artifacts = _write_artifacts(
        chain,
        topic,
        course_id,
        steps,
        run_id,
        write_obsidian=write_obsidian,
        draft_cards=draft_cards,
    )

    # 6. Complete
    _complete_run(run_id, artifacts)
    return {
        "run_id": run_id,
        "chain_name": chain["name"],
        "status": "completed",
        "steps": steps,
        "artifacts": artifacts,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _load_chain(chain_id: int) -> dict | None:
    """Load a chain and its expanded method blocks from the DB."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, name, description, block_ids, context_tags, is_template, ruleset_id "
        "FROM method_chains WHERE id = ?",
        (chain_id,),
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    chain = {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "block_ids_raw": row[3],
        "context_tags": _safe_json(row[4]),
        "is_template": row[5],
        "ruleset_id": row[6],
    }

    if chain["ruleset_id"]:
        cursor.execute(
            "SELECT rules_json FROM rulesets WHERE id = ?", (chain["ruleset_id"],)
        )
        rs_row = cursor.fetchone()
        if rs_row:
            chain["ruleset"] = _safe_json(rs_row[0]) or []
        else:
            chain["ruleset"] = []
    else:
        chain["ruleset"] = []

    block_ids = _safe_json(chain["block_ids_raw"]) or []
    if not block_ids:
        conn.close()
        return {**chain, "blocks": []}

    placeholders = ",".join("?" * len(block_ids))
    cursor.execute(
        f"SELECT id, method_id, name, category, description, default_duration_min, energy_cost, facilitation_prompt, artifact_type "
        f"FROM method_blocks WHERE id IN ({placeholders})",
        block_ids,
    )
    blocks_map = {}
    for b in cursor.fetchall():
        blocks_map[b[0]] = {
            "id": b[0],
            "method_id": b[1],
            "name": b[2],
            "category": b[3],
            "description": b[4],
            "default_duration_min": b[5],
            "energy_cost": b[6],
            "facilitation_prompt": b[7] or "",
            "artifact_type": b[8] or "",
        }
    conn.close()

    # Preserve chain ordering
    ordered_blocks = [blocks_map[bid] for bid in block_ids if bid in blocks_map]
    return {**chain, "blocks": ordered_blocks}


def _load_rag_context(doc_ids: list[int], topic: str, course_id: int | None) -> str:
    """Load RAG document content by ID, capped at MAX_RAG_CHARS."""
    conn = sqlite3.connect(DB_PATH, timeout=30)
    cursor = conn.cursor()
    placeholders = ",".join("?" * len(doc_ids))
    cursor.execute(
        f"SELECT source_path, content FROM rag_docs WHERE id IN ({placeholders})",
        doc_ids,
    )
    rows = cursor.fetchall()
    conn.close()

    chunks = []
    total = 0
    for path, content in rows:
        if not content:
            continue
        remaining = MAX_RAG_CHARS - total
        if remaining <= 0:
            break
        snippet = content[:remaining]
        chunks.append(f"[Source: {path}]\n{snippet}")
        total += len(snippet)

    return "\n\n".join(chunks)


def _create_run(
    chain_id: int, topic: str, course_id: int | None, total_steps: int
) -> int:
    """Insert a new chain_runs row with status=running."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO chain_runs (chain_id, topic, course_id, total_steps, status, started_at)
           VALUES (?, ?, ?, ?, 'running', datetime('now'))""",
        (chain_id, topic, course_id, total_steps),
    )
    run_id = cursor.lastrowid
    if run_id is None:
        conn.close()
        raise RuntimeError("Failed to create chain run")
    conn.commit()
    conn.close()
    return int(run_id)


def _update_step(run_id: int, step: int) -> None:
    """Update the current_step for a running chain."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE chain_runs SET current_step = ? WHERE id = ?",
        (step, run_id),
    )
    conn.commit()
    conn.close()


def _fail_run(run_id: int, error: str) -> None:
    """Mark a chain run as failed."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE chain_runs SET status = 'failed', error_message = ?, completed_at = datetime('now') WHERE id = ?",
        (error, run_id),
    )
    conn.commit()
    conn.close()


def _complete_run(run_id: int, artifacts: dict) -> None:
    """Mark a chain run as completed with artifacts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE chain_runs SET status = 'completed', artifacts_json = ?, completed_at = datetime('now') WHERE id = ?",
        (json.dumps(artifacts), run_id),
    )
    conn.commit()
    conn.close()


def _write_artifacts(
    chain: dict,
    topic: str,
    course_id: int | None,
    steps: list[dict],
    run_id: int,
    *,
    write_obsidian: bool = True,
    draft_cards: bool = True,
) -> dict:
    """Write Obsidian note, card drafts, and session record. Returns artifact summary."""
    total_duration = sum(s["duration_ms"] for s in steps)
    minutes = max(1, total_duration // 60000)
    chain_name = chain["name"]
    slug = re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")
    date_str = datetime.now().strftime("%Y%m%d")

    artifacts: dict[str, Any] = {
        "metrics": {
            "total_duration_ms": total_duration,
            "steps_completed": len(steps),
            "cards_drafted": 0,
        }
    }

    # Create session record
    session_id = _create_session(chain, topic, course_id, minutes)
    artifacts["session_id"] = session_id

    # Link chain run to session
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE chain_runs SET session_id = ? WHERE id = ?",
        (session_id, run_id),
    )
    conn.commit()
    conn.close()

    # Write Obsidian note
    if write_obsidian:
        obsidian_path = (
            f"Study Notes/{chain_name}/{slug}-{chain_name.lower()}-{date_str}.md"
        )
        note_content = _build_obsidian_note(chain_name, topic, steps)
        try:
            from dashboard.api_adapter import obsidian_append

            result = obsidian_append(obsidian_path, note_content)
            if result.get("success"):
                artifacts["obsidian_path"] = obsidian_path
        except Exception:
            artifacts["obsidian_path"] = None

    # Draft Anki cards
    if draft_cards:
        card_ids = _extract_and_save_cards(steps, session_id, course_id, topic)
        artifacts["card_draft_ids"] = card_ids
        artifacts["metrics"]["cards_drafted"] = len(card_ids)

    return artifacts


def _create_session(
    chain: dict, topic: str, course_id: int | None, minutes: int
) -> int:
    """Create a session record for the chain run."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now()
    cursor.execute(
        """INSERT INTO sessions (
            session_date, session_time, main_topic, study_mode,
            created_at, time_spent_minutes, duration_minutes,
            method_chain_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            now.strftime("%Y-%m-%d"),
            now.strftime("%H:%M:%S"),
            topic,
            chain["name"],  # SWEEP or DEPTH as study_mode
            now.isoformat(),
            minutes,
            minutes,
            chain["id"],
        ),
    )
    session_id = cursor.lastrowid
    if session_id is None:
        conn.close()
        raise RuntimeError("Failed to create session")
    conn.commit()
    conn.close()
    return int(session_id)


def _build_obsidian_note(chain_name: str, topic: str, steps: list[dict]) -> str:
    """Build markdown content for the Obsidian note."""
    date = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        f"# {chain_name}: {topic}",
        f"*Generated {date}*\n",
    ]
    for step in steps:
        lines.append(f"## {step['step']}. {step['method_name']} ({step['category']})")
        lines.append(step["output"])
        lines.append("")
    total_ms = sum(s["duration_ms"] for s in steps)
    lines.append(f"---\n*{len(steps)} steps completed in {total_ms / 1000:.1f}s*")
    return "\n".join(lines)


def _extract_and_save_cards(
    steps: list[dict],
    session_id: int,
    course_id: int | None,
    topic: str,
) -> list[int]:
    """Parse Anki card drafts from step outputs and insert into card_drafts table."""
    card_ids: list[int] = []

    # Find Anki Card Draft step(s)
    for step in steps:
        if step["method_name"] != "Anki Card Draft":
            continue
        cards = _parse_card_output(step["output"])
        if not cards:
            continue

        conn = get_connection()
        cursor = conn.cursor()
        for card in cards:
            cursor.execute(
                """INSERT INTO card_drafts
                   (session_id, course_id, deck_name, card_type, front, back, tags, status, created_at)
                   VALUES (?, ?, 'PT_Study', ?, ?, ?, ?, 'draft', datetime('now'))""",
                (
                    str(session_id),
                    course_id,
                    card.get("type", "basic"),
                    card["front"],
                    card["back"],
                    card.get("tags", topic),
                ),
            )
            card_id = cursor.lastrowid
            if card_id is not None:
                card_ids.append(int(card_id))
        conn.commit()
        conn.close()

    return card_ids


def _parse_card_output(output: str) -> list[dict]:
    """Parse structured card output from LLM response.

    Expected format per card:
        CARD N:
        TYPE: basic | cloze
        FRONT: ...
        BACK: ...
        TAGS: ...
    """
    cards: list[dict] = []
    current: dict[str, str] = {}

    for line in output.split("\n"):
        stripped = line.strip()
        if stripped.upper().startswith("CARD ") and stripped.endswith(":"):
            if current.get("front") and current.get("back"):
                cards.append(current)
            current = {}
        elif stripped.upper().startswith("TYPE:"):
            current["type"] = stripped.split(":", 1)[1].strip().lower()
        elif stripped.upper().startswith("FRONT:"):
            current["front"] = stripped.split(":", 1)[1].strip()
        elif stripped.upper().startswith("BACK:"):
            current["back"] = stripped.split(":", 1)[1].strip()
        elif stripped.upper().startswith("TAGS:"):
            current["tags"] = stripped.split(":", 1)[1].strip()

    # Don't forget the last card
    if current.get("front") and current.get("back"):
        cards.append(current)

    return cards


def _safe_json(value: Any) -> Any:
    """Safely parse a JSON string."""
    if isinstance(value, (list, dict)):
        return value
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value
