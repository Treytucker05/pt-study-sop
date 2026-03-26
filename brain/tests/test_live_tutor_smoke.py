from __future__ import annotations

import requests

from scripts.live_tutor_smoke import select_preflight_ready_scope


class _FakeResponse:
    def __init__(self, payload, status_code: int = 200):
        self._payload = payload
        self.status_code = status_code
        self.text = "" if isinstance(payload, str) else str(payload)

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code} error")

    def json(self):
        return self._payload


class _FakeSession:
    def __init__(self) -> None:
        self.preflight_payloads: list[dict] = []
        self._materials = {
            1: [{"id": 11, "title": "Cardio deck"}],
        }
        self._objectives = {
            1: [
                {"groupName": "Cardiovascular", "title": "Explain stroke volume.", "loCode": "OBJ-1"},
                {"groupName": "Respiratory", "title": "Explain ventilation.", "loCode": "OBJ-2"},
            ],
        }
        self._preflight_responses = [
            _FakeResponse({"error": "Unmapped vault unit 'Cardiovascular'."}, status_code=500),
            _FakeResponse({"ok": True, "preflight_id": "pf-1"}, status_code=200),
        ]

    def get(self, url: str, params=None, timeout=None):  # noqa: ARG002
        if url.endswith("/api/tutor/materials"):
            return _FakeResponse(self._materials[params["course_id"]])
        if url.endswith("/api/learning-objectives"):
            return _FakeResponse(self._objectives[params["courseId"]])
        raise AssertionError(f"unexpected GET {url}")

    def post(self, url: str, json=None, timeout=None):  # noqa: ARG002
        if url.endswith("/api/tutor/session/preflight"):
            self.preflight_payloads.append(json)
            if not self._preflight_responses:
                raise AssertionError("unexpected extra preflight call")
            return self._preflight_responses.pop(0)
        raise AssertionError(f"unexpected POST {url}")


def test_select_preflight_ready_scope_skips_failing_group_and_uses_next_group() -> None:
    session = _FakeSession()
    course = {"id": 1, "name": "Exercise Physiology"}

    selection = select_preflight_ready_scope(
        session=session,
        base_url="http://127.0.0.1:5000",
        course_candidates=[course],
    )

    assert selection["course"]["id"] == 1
    assert selection["study_unit"] == "Respiratory"
    assert selection["preflight"]["preflight_id"] == "pf-1"
    attempted_units = [payload["study_unit"] for payload in session.preflight_payloads]
    assert attempted_units == ["Cardiovascular", "Respiratory"]
