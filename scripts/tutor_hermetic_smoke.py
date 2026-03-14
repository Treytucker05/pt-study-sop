"""
Hermetic Tutor Smoke Test

Seeds an isolated Tutor course/material set into a harness-managed SQLite DB,
then exercises a provider-free Tutor session against a running isolated server.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FIXTURE_ROOT = REPO_ROOT / "brain" / "tests" / "fixtures" / "harness"
MANIFEST_NAME = "manifest.json"


def _load_manifest(fixture_root: Path) -> dict[str, Any]:
    manifest_path = fixture_root / MANIFEST_NAME
    if not manifest_path.exists():
        raise FileNotFoundError(f"Fixture manifest not found at {manifest_path}")
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def _resolve_scenario_entry(fixture_root: Path, scenario_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    manifest = _load_manifest(fixture_root)
    scenarios = manifest.get("scenarios") or []
    for scenario in scenarios:
        if isinstance(scenario, str):
            if scenario != scenario_id:
                continue
            fixture_file = f"{scenario_id}.json"
            scenario_entry: dict[str, Any] = {
                "id": scenario_id,
                "fixture_file": fixture_file,
                "classification": "hermetic",
                "description": None,
            }
        elif isinstance(scenario, dict) and str(scenario.get("id") or "").strip() == scenario_id:
            fixture_file = str(scenario.get("fixture_file") or "").strip()
            scenario_entry = {
                "id": scenario_id,
                "fixture_file": fixture_file,
                "classification": str(scenario.get("classification") or "hermetic"),
                "description": scenario.get("description"),
            }
        else:
            continue

        if not fixture_file:
            raise ValueError(f"Scenario {scenario_id!r} is missing fixture_file in {fixture_root / MANIFEST_NAME}")

        fixture_path = fixture_root / fixture_file
        if not fixture_path.exists():
            raise FileNotFoundError(f"Scenario fixture not found at {fixture_path}")
        return scenario_entry, json.loads(fixture_path.read_text(encoding="utf-8"))

    raise ValueError(f"Scenario {scenario_id!r} is not declared in {fixture_root / MANIFEST_NAME}")


def _seed_course(conn: sqlite3.Connection, course: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT OR REPLACE INTO courses (id, name, code, term, created_at)
        VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM courses WHERE id = ?), datetime('now')))
        """,
        (
            int(course["id"]),
            str(course["name"]),
            str(course["code"]),
            str(course["term"]),
            int(course["id"]),
        ),
    )


def _seed_material(conn: sqlite3.Connection, course_id: int, material: dict[str, Any]) -> None:
    conn.execute("DELETE FROM rag_docs WHERE id = ?", (int(material["id"]),))
    conn.execute(
        """
        INSERT INTO rag_docs (
            id,
            title,
            source_path,
            file_path,
            file_type,
            content,
            course_id,
            corpus,
            enabled,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'materials', 1, datetime('now'), datetime('now'))
        """,
        (
            int(material["id"]),
            str(material["title"]),
            str(material["source_path"]),
            material.get("file_path"),
            str(material.get("file_type") or "md"),
            str(material.get("content") or ""),
            course_id,
        ),
    )


def seed_fixture(db_path: Path, scenario: dict[str, Any]) -> dict[str, Any]:
    if not db_path.exists():
        raise FileNotFoundError(f"Harness DB path does not exist: {db_path}")

    course = scenario.get("course")
    materials = scenario.get("materials") or []
    if not isinstance(course, dict) or not materials:
        raise ValueError("Scenario must define course and materials")

    conn = sqlite3.connect(str(db_path))
    try:
        _seed_course(conn, course)
        for material in materials:
            _seed_material(conn, int(course["id"]), material)
        conn.commit()
    finally:
        conn.close()

    return {
        "course_id": int(course["id"]),
        "material_ids": [int(material["id"]) for material in materials],
        "material_titles": [str(material["title"]) for material in materials],
    }


def _extract_done_payload(raw_text: str) -> dict[str, Any]:
    for line in raw_text.splitlines():
        if not line.startswith("data: "):
            continue
        payload = line[6:]
        if payload == "[DONE]":
            continue
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            continue
        if parsed.get("type") == "done":
            return parsed
    return {}


def _extract_error_payload(raw_text: str) -> dict[str, Any]:
    for line in raw_text.splitlines():
        if not line.startswith("data: "):
            continue
        payload = line[6:]
        if payload == "[DONE]":
            continue
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            continue
        if parsed.get("type") == "error":
            return parsed
    return {}


def _read_sse_response(resp: requests.Response) -> str:
    lines: list[str] = []
    for line in resp.iter_lines(chunk_size=1, decode_unicode=True):
        if line is None:
            continue
        lines.append(line)
        if line == "data: [DONE]":
            break
    return "\n".join(lines)


def _record_step(steps: list[dict[str, Any]], name: str, ok: bool, **details: Any) -> None:
    step = {"name": name, "ok": ok}
    step.update(details)
    steps.append(step)


def run_smoke(
    *,
    base_url: str,
    db_path: Path,
    fixture_root: Path,
    artifact_root: Path,
    scenario_id: str,
) -> dict[str, Any]:
    scenario_entry, scenario = _resolve_scenario_entry(fixture_root, scenario_id)
    seeded = seed_fixture(db_path, scenario)
    artifact_root.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    steps: list[dict[str, Any]] = []
    turn_records: list[dict[str, Any]] = []
    created_session_id: str | None = None

    course_id = seeded["course_id"]
    material_ids = seeded["material_ids"]
    material_titles = seeded["material_titles"]

    materials_resp = session.get(
        f"{base_url}/api/tutor/materials",
        params={"course_id": course_id, "enabled": 1},
        timeout=20,
    )
    materials_resp.raise_for_status()
    materials = materials_resp.json()
    expected_material_count = int((scenario.get("expect") or {}).get("material_count") or len(material_ids))
    if len(materials) != expected_material_count:
        raise AssertionError(
            f"Expected {expected_material_count} materials, got {len(materials)}"
        )
    _record_step(
        steps,
        "tutor-materials",
        True,
        course_id=course_id,
        material_count=len(materials),
    )

    session_payload = dict(scenario.get("session") or {})
    session_payload["course_id"] = course_id
    session_payload.setdefault("content_filter", {})
    selected_material_ids = session_payload["content_filter"].get("material_ids") or material_ids
    session_payload["content_filter"]["material_ids"] = selected_material_ids
    session_payload["content_filter"].setdefault("accuracy_profile", "strict")

    create_resp = session.post(
        f"{base_url}/api/tutor/session",
        json=session_payload,
        timeout=30,
    )
    create_resp.raise_for_status()
    created = create_resp.json()
    created_session_id = str(created.get("session_id") or "")
    if not created_session_id:
        raise AssertionError("Tutor session creation did not return session_id")
    _record_step(
        steps,
        "create-session",
        True,
        session_id=created_session_id,
        topic=created.get("topic"),
    )

    for index, turn in enumerate(scenario.get("turns") or [], start=1):
        message = str(turn.get("message") or "").strip()
        if not message:
            raise AssertionError(f"Turn {index} is missing message")

        with session.post(
            f"{base_url}/api/tutor/session/{created_session_id}/turn",
            json={"message": message},
            timeout=(30, 120),
            stream=True,
        ) as resp:
            resp.raise_for_status()
            turn_body = _read_sse_response(resp)

        turn_path = artifact_root / f"turn-{index}.sse.txt"
        turn_path.write_text(turn_body, encoding="utf-8")

        error_payload = _extract_error_payload(turn_body)
        if error_payload:
            raise AssertionError(
                f"Turn {index} returned SSE error payload: {json.dumps(error_payload)}"
            )
        done_payload = _extract_done_payload(turn_body)
        if not done_payload:
            raise AssertionError(f"Turn {index} did not emit a done payload")

        for expected_substring in turn.get("expect_substrings") or []:
            if str(expected_substring) not in turn_body:
                raise AssertionError(
                    f"Turn {index} response missing expected substring: {expected_substring!r}"
                )

        retrieval_debug = done_payload.get("retrieval_debug") or {}
        for key, expected_value in (turn.get("expect_retrieval_debug") or {}).items():
            actual_value = retrieval_debug.get(key)
            if actual_value != expected_value:
                raise AssertionError(
                    f"Turn {index} retrieval_debug[{key!r}] expected {expected_value!r}, got {actual_value!r}"
                )

        turn_records.append(
            {
                "index": index,
                "message": message,
                "done": done_payload,
                "artifact_path": str(turn_path),
            }
        )
        _record_step(
            steps,
            f"turn-{index}",
            True,
            message=message,
            response_id=done_payload.get("response_id"),
            model=done_payload.get("model"),
        )

    restore_resp = session.get(
        f"{base_url}/api/tutor/session/{created_session_id}",
        timeout=30,
    )
    restore_resp.raise_for_status()
    restored = restore_resp.json()
    if restored.get("session_id") != created_session_id:
        raise AssertionError("Tutor restore returned invalid session payload")
    _record_step(
        steps,
        "restore-session",
        True,
        turn_count=restored.get("turn_count"),
    )

    summary_resp = session.get(
        f"{base_url}/api/tutor/session/{created_session_id}/summary",
        timeout=30,
    )
    summary_resp.raise_for_status()
    summary = summary_resp.json()
    expected_turn_count = int((scenario.get("expect") or {}).get("turn_count") or len(turn_records))
    if int(summary.get("turn_count") or 0) != expected_turn_count:
        raise AssertionError(
            f"Expected summary turn_count={expected_turn_count}, got {summary.get('turn_count')}"
        )
    _record_step(
        steps,
        "session-summary",
        True,
        turn_count=summary.get("turn_count"),
        artifact_count=summary.get("artifact_count"),
    )

    end_resp = session.post(
        f"{base_url}/api/tutor/session/{created_session_id}/end",
        timeout=30,
    )
    end_resp.raise_for_status()
    ended = end_resp.json()
    if str(ended.get("status") or "").strip().lower() != "completed":
        raise AssertionError("Tutor end did not return status=completed")
    _record_step(steps, "end-session", True, status=ended.get("status"))

    delete_resp = session.delete(
        f"{base_url}/api/tutor/session/{created_session_id}",
        timeout=30,
    )
    delete_resp.raise_for_status()
    deleted = delete_resp.json()
    if deleted.get("deleted") is not True:
        raise AssertionError("Tutor delete did not return deleted=true")
    _record_step(
        steps,
        "delete-session",
        True,
        status=deleted.get("status"),
        deleted=deleted.get("deleted"),
    )
    created_session_id = None

    sessions_resp = session.get(
        f"{base_url}/api/tutor/sessions",
        params={"course_id": course_id, "limit": 10},
        timeout=30,
    )
    sessions_resp.raise_for_status()
    sessions = sessions_resp.json()
    active_ids = {str(item.get("session_id") or "") for item in sessions if isinstance(item, dict)}
    if created.get("session_id") in active_ids:
        raise AssertionError("Deleted Tutor session still appears in session listing")
    _record_step(
        steps,
        "list-sessions-after-delete",
        True,
        remaining=len(sessions),
    )

    result = {
        "ok": True,
        "scenario": scenario_id,
        "scenario_type": scenario_entry.get("classification") or "hermetic",
        "scenario_description": scenario_entry.get("description"),
        "base_url": base_url,
        "db_path": str(db_path),
        "fixture_root": str(fixture_root),
        "artifact_root": str(artifact_root),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "seeded": {
            "course_id": course_id,
            "material_ids": material_ids,
            "material_titles": material_titles,
        },
        "steps": steps,
        "turns": turn_records,
        "summary": {
            "turn_count": int(summary.get("turn_count") or 0),
            "artifact_count": int(summary.get("artifact_count") or 0),
            "session_mode": summary.get("session_mode"),
            "topic": summary.get("topic"),
        },
    }
    result_path = artifact_root / "result.json"
    result_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Hermetic Tutor Smoke Test")
    parser.add_argument("--scenario", default="tutor-hermetic-smoke")
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--db-path", required=True)
    parser.add_argument("--fixture-root", default=str(DEFAULT_FIXTURE_ROOT))
    parser.add_argument("--artifact-root", required=True)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run_smoke(
        base_url=args.base_url,
        db_path=Path(args.db_path).resolve(),
        fixture_root=Path(args.fixture_root).resolve(),
        artifact_root=Path(args.artifact_root).resolve(),
        scenario_id=args.scenario,
    )

    if args.json:
        print(json.dumps(result))
    else:
        print(f"[OK] Hermetic Tutor smoke passed for {args.scenario}")
        print(f"[OK] Result artifact: {Path(args.artifact_root).resolve() / 'result.json'}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        raise
