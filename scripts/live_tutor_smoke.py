"""
Live Tutor Smoke Test

Exercises the modern Tutor lifecycle:
  course discovery -> material/objective discovery -> preflight ->
  create -> turn (SSE) -> restore -> summary -> end -> delete

Prerequisites:
  - Flask dashboard running on port 5000 (Start_Dashboard.bat)
  - At least one course with linked Tutor materials
  - At least one learning objective with a non-empty study-unit group
  - LLM provider credentials configured for Tutor turns

Usage:
  python scripts/live_tutor_smoke.py [--base-url http://127.0.0.1:5000]
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import sys
from urllib.parse import urlparse

import requests

DEFAULT_BASE = "http://127.0.0.1:5000"


def check_port(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=3):
            return True
    except (ConnectionRefusedError, OSError):
        return False


def _extract_done_payload(raw_text: str) -> dict:
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


def _extract_error_payload(raw_text: str) -> dict:
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


def _run_turn(session: requests.Session, base_url: str, session_id: str) -> str:
    with session.post(
        f"{base_url}/api/tutor/session/{session_id}/turn",
        json={"message": "Give me the big picture overview of this unit."},
        timeout=(30, 120),
        stream=True,
    ) as resp:
        resp.raise_for_status()
        return _read_sse_response(resp)


def smoke(base_url: str) -> None:
    session = requests.Session()
    failures: list[str] = []
    created_session_id: str | None = None

    def step(name: str, fn):
        print(f"  [{name}] ", end="", flush=True)
        try:
            result = fn()
            print("OK")
            return result
        except Exception as exc:
            print(f"FAIL - {exc}")
            failures.append(f"{name}: {exc}")
            return None

    print("\n=== Live Tutor Smoke Test ===\n")

    parsed = urlparse(base_url)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 5000
    if not check_port(host, port):
        print(f"FATAL: Nothing listening on {host}:{port}")
        print("Start the dashboard first: cmd /c Start_Dashboard.bat")
        sys.exit(1)

    courses = step(
        "Brain: list courses",
        lambda: (
            resp := session.get(f"{base_url}/api/courses", timeout=15),
            resp.raise_for_status(),
            resp.json(),
        )[-1],
    )
    if not courses:
        print("FATAL: No courses found.")
        sys.exit(1)

    course_candidates = courses.get("courses", []) if isinstance(courses, dict) else courses
    selected_course = None
    materials = []
    learning_objectives = []
    grouped_objectives = []
    for course in course_candidates:
        candidate_id = course.get("id")
        if not candidate_id:
            continue
        candidate_materials_resp = session.get(
            f"{base_url}/api/tutor/materials",
            params={"course_id": candidate_id, "enabled": 1},
            timeout=20,
        )
        candidate_materials_resp.raise_for_status()
        candidate_materials = candidate_materials_resp.json()

        candidate_objectives_resp = session.get(
            f"{base_url}/api/learning-objectives",
            params={"courseId": candidate_id},
            timeout=20,
        )
        candidate_objectives_resp.raise_for_status()
        candidate_objectives = candidate_objectives_resp.json()

        candidate_grouped_objectives = [
            lo
            for lo in candidate_objectives
            if str(lo.get("groupName") or lo.get("group_name") or "").strip()
            and str(lo.get("title") or "").strip()
        ]
        if candidate_materials and candidate_grouped_objectives:
            selected_course = course
            materials = candidate_materials
            learning_objectives = candidate_objectives
            grouped_objectives = candidate_grouped_objectives
            break

    if selected_course is None:
        print("FATAL: No course has both enabled Tutor materials and grouped learning objectives.")
        sys.exit(1)

    course_id = selected_course.get("id")
    course_name = selected_course.get("name") or "Unknown Course"
    print(
        f"  Using course: {course_name} (id={course_id}, materials={len(materials)}, grouped_objectives={len(grouped_objectives)})"
    )

    print("  [Tutor: list materials] OK")
    print("  [Tutor: list objectives] OK")

    study_unit = str(
        grouped_objectives[0].get("groupName") or grouped_objectives[0].get("group_name") or ""
    ).strip()
    unit_objectives = [
        lo
        for lo in grouped_objectives
        if str(lo.get("groupName") or lo.get("group_name") or "").strip() == study_unit
    ]
    selected_material_ids = [
        int(material["id"])
        for material in materials[:3]
        if isinstance(material.get("id"), int)
    ]
    if not selected_material_ids:
        print("FATAL: Could not derive selected material IDs for preflight.")
        sys.exit(1)

    preflight_payload = {
        "course_id": course_id,
        "study_unit": study_unit,
        "topic": study_unit,
        "objective_scope": "module_all",
        "learning_objectives": [
            {
                "lo_code": lo.get("loCode") or lo.get("lo_code") or f"OBJ-{idx + 1}",
                "title": lo.get("title") or "",
                "group": study_unit,
            }
            for idx, lo in enumerate(unit_objectives[:8])
            if str(lo.get("title") or "").strip()
        ],
        "content_filter": {
            "material_ids": selected_material_ids,
            "accuracy_profile": "strict",
        },
    }

    preflight = step(
        "Tutor: preflight",
        lambda: (
            resp := session.post(
                f"{base_url}/api/tutor/session/preflight",
                json=preflight_payload,
                timeout=30,
            ),
            resp.raise_for_status(),
            resp.json(),
        )[-1],
    )
    if not preflight or not preflight.get("ok"):
        print("FATAL: Tutor preflight did not return ok=true.")
        if preflight:
            print(json.dumps(preflight, indent=2))
        sys.exit(1)

    created = step(
        "Tutor: create session",
        lambda: (
            resp := session.post(
                f"{base_url}/api/tutor/session",
                json={"preflight_id": preflight["preflight_id"], "mode": "Core"},
                timeout=30,
            ),
            resp.raise_for_status(),
            resp.json(),
        )[-1],
    )
    if not created or not created.get("session_id"):
        print("FATAL: Tutor session creation failed.")
        sys.exit(1)
    created_session_id = created["session_id"]

    turn_body = step(
        "Tutor: send turn",
        lambda: _run_turn(session, base_url, created_session_id),
    )
    if not turn_body:
        print("FATAL: Tutor turn failed before response body was returned.")
        sys.exit(1)

    turn_error = _extract_error_payload(turn_body)
    if turn_error:
        print("FATAL: Tutor turn returned an SSE error payload.")
        print(json.dumps(turn_error, indent=2))
        sys.exit(1)

    turn_done = _extract_done_payload(turn_body)
    if not turn_done:
        print("FATAL: Tutor turn did not emit a done payload.")
        sys.exit(1)

    restored = step(
        "Tutor: restore session",
        lambda: (
            resp := session.get(
                f"{base_url}/api/tutor/session/{created_session_id}",
                timeout=30,
            ),
            resp.raise_for_status(),
            resp.json(),
        )[-1],
    )
    if not restored or restored.get("session_id") != created_session_id:
        print("FATAL: Tutor restore returned invalid session data.")
        sys.exit(1)

    summary = step(
        "Tutor: summary",
        lambda: (
            resp := session.get(
                f"{base_url}/api/tutor/session/{created_session_id}/summary",
                timeout=30,
            ),
            resp.raise_for_status(),
            resp.json(),
        )[-1],
    )
    if not summary or "turn_count" not in summary:
        print("FATAL: Tutor summary returned an invalid payload.")
        sys.exit(1)

    step(
        "Tutor: end session",
        lambda: (
            resp := session.post(
                f"{base_url}/api/tutor/session/{created_session_id}/end",
                timeout=30,
            ),
            resp.raise_for_status(),
            resp.json(),
        )[-1],
    )

    step(
        "Tutor: delete session",
        lambda: (
            resp := session.delete(
                f"{base_url}/api/tutor/session/{created_session_id}",
                timeout=30,
            ),
            resp.raise_for_status(),
            resp.json(),
        )[-1],
    )
    created_session_id = None

    print("\n=== Results ===")
    if failures:
        print(f"\n{len(failures)} failure(s):")
        for failure in failures:
            print(f"  - {failure}")
        sys.exit(1)

    print("\nAll live Tutor smoke checks passed.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Live Tutor Smoke Test")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("SMOKE_BASE_URL", DEFAULT_BASE),
        help=f"Dashboard base URL (default: {DEFAULT_BASE})",
    )
    args = parser.parse_args()
    smoke(args.base_url)


if __name__ == "__main__":
    main()
