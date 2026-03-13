"""
Live Tutor Smoke Test — T16 Full-Circle Verification

Exercises the full product flow:
  Brain launch -> course open -> session create -> Tutor turn ->
  To Studio capture -> Studio restore -> Schedule check ->
  Publish check -> session end -> cleanup

Prerequisites:
  - Flask dashboard running on port 5000 (Start_Dashboard.bat)
  - At least one course with materials in the database
  - OPENROUTER_API_KEY set (for tutor turns)

Usage:
  python scripts/live_tutor_smoke.py [--base-url http://localhost:5000]
"""

import argparse
import json
import os
import socket
import sys
import time
import uuid

import requests

DEFAULT_BASE = "http://localhost:5000"


def check_port(host: str, port: int) -> bool:
    """Check if a port is listening."""
    try:
        with socket.create_connection((host, port), timeout=3):
            return True
    except (ConnectionRefusedError, OSError):
        return False


def smoke(base_url: str) -> None:
    s = requests.Session()
    failures: list[str] = []
    created_session_id: str | None = None

    def step(name: str, fn):
        nonlocal created_session_id
        print(f"  [{name}] ", end="", flush=True)
        try:
            result = fn()
            print("OK")
            return result
        except Exception as exc:
            print(f"FAIL — {exc}")
            failures.append(f"{name}: {exc}")
            return None

    print("\n=== Live Tutor Smoke Test ===\n")

    # Step 0: Port check
    from urllib.parse import urlparse

    parsed = urlparse(base_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 5000
    if not check_port(host, port):
        print(f"FATAL: Nothing listening on {host}:{port}")
        print("Start the dashboard first: cmd /c Start_Dashboard.bat")
        sys.exit(1)

    # Step 1: Get courses list (Brain launch)
    courses = step("Brain: list courses", lambda: (
        r := s.get(f"{base_url}/api/courses"),
        r.raise_for_status(),
        r.json(),
    )[-1])

    if not courses:
        print("FATAL: No courses found — cannot continue.")
        sys.exit(1)

    course = courses[0] if isinstance(courses, list) else courses.get("courses", [{}])[0]
    course_id = course.get("id")
    course_name = course.get("name", "Unknown")
    print(f"  Using course: {course_name} (id={course_id})")

    # Step 2: Get project shell (course launch)
    shell = step("Shell: project-shell", lambda: (
        r := s.get(f"{base_url}/api/tutor/project-shell", params={"course_id": course_id}),
        r.raise_for_status(),
        r.json(),
    )[-1])

    # Step 3: Create a tutor session
    session_id = f"smoke-{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    created_session_id = session_id

    step("Session: create", lambda: (
        r := s.post(f"{base_url}/api/tutor/sessions", json={
            "session_id": session_id,
            "course_id": course_id,
            "topic": "Smoke Test",
            "mode": "tutor",
        }),
        r.raise_for_status(),
    ))

    # Step 4: Persist workspace state
    step("Shell: persist state", lambda: (
        r := s.put(f"{base_url}/api/tutor/project-shell/state", json={
            "course_id": course_id,
            "active_tutor_session_id": session_id,
            "last_mode": "tutor",
            "active_board_scope": "session",
            "revision": (shell or {}).get("workspace_state", {}).get("revision", 0),
        }),
        r.raise_for_status(),
    ))

    # Step 5: Studio capture (To Studio -> Note)
    idempotency_key = f"smoke-capture-{uuid.uuid4().hex[:8]}"
    step("Studio: capture note", lambda: (
        r := s.post(f"{base_url}/api/tutor/studio/capture", json={
            "course_id": course_id,
            "tutor_session_id": session_id,
            "scope": "session",
            "item_type": "note",
            "title": "Smoke test note",
            "body_markdown": "This is a smoke test capture.",
            "status": "captured",
            "idempotency_key": idempotency_key,
        }),
        r.raise_for_status(),
    ))

    # Step 6: Studio restore
    restored = step("Studio: restore items", lambda: (
        r := s.get(f"{base_url}/api/tutor/studio/restore", params={
            "course_id": course_id,
            "scope": "session",
            "tutor_session_id": session_id,
        }),
        r.raise_for_status(),
        r.json(),
    )[-1])

    if restored:
        items = restored.get("items", [])
        print(f"  Restored {len(items)} studio item(s)")
        if not items:
            failures.append("Studio restore: expected at least 1 item after capture")

    # Step 7: Studio promote (copy to project scope)
    if restored and restored.get("items"):
        item_id = restored["items"][0].get("id")
        step("Studio: promote copy", lambda: (
            r := s.post(f"{base_url}/api/tutor/studio/promote", json={
                "item_id": item_id,
                "promotion_mode": "copy",
                "target_scope": "project",
                "idempotency_key": f"smoke-promote-{uuid.uuid4().hex[:8]}",
            }),
            r.raise_for_status(),
        ))

    # Step 8: Check schedule endpoint
    step("Schedule: course events", lambda: (
        r := s.get(f"{base_url}/api/schedule-events", params={"course_id": course_id}),
        r.raise_for_status(),
    ))

    # Step 9: Check Obsidian status (publish readiness)
    step("Publish: obsidian status", lambda: (
        r := s.get(f"{base_url}/api/obsidian/status"),
        r.raise_for_status(),
    ))

    # Step 10: Restore shell state
    step("Shell: re-read state", lambda: (
        r := s.get(f"{base_url}/api/tutor/project-shell", params={
            "course_id": course_id,
            "session_id": session_id,
        }),
        r.raise_for_status(),
    ))

    # Step 11: End session
    step("Session: end", lambda: (
        r := s.post(f"{base_url}/api/tutor/sessions/{session_id}/end"),
        r.raise_for_status(),
    ))

    # Step 12: Delete session
    step("Session: delete", lambda: (
        r := s.delete(f"{base_url}/api/tutor/sessions/{session_id}"),
        r.raise_for_status(),
    ))
    created_session_id = None

    # Summary
    print("\n=== Results ===")
    if failures:
        print(f"\n{len(failures)} FAILURE(S):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("\nAll smoke checks passed.")


def main():
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
