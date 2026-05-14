from __future__ import annotations

import requests

from scripts.live_tutor_smoke import select_workspace_context_ready_scope


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
        self._materials = {
            1: [{"id": 11, "title": "Cardio deck"}],
        }
        self._objectives = {
            1: [
                {"groupName": "Cardiovascular", "title": "Explain stroke volume.", "loCode": "OBJ-1"},
                {"groupName": "Respiratory", "title": "Explain ventilation.", "loCode": "OBJ-2"},
            ],
        }

    def get(self, url: str, params=None, timeout=None):  # noqa: ARG002
        if url.endswith("/api/tutor/materials"):
            return _FakeResponse(self._materials[params["course_id"]])
        if url.endswith("/api/learning-objectives"):
            return _FakeResponse(self._objectives[params["courseId"]])
        raise AssertionError(f"unexpected GET {url}")

    def post(self, url: str, json=None, timeout=None):  # noqa: ARG002
        raise AssertionError(f"unexpected POST {url}")


def test_select_workspace_context_ready_scope_builds_direct_session_payload() -> None:
    session = _FakeSession()
    course = {"id": 1, "name": "Exercise Physiology"}

    selection = select_workspace_context_ready_scope(
        session=session,
        base_url="http://127.0.0.1:5000",
        course_candidates=[course],
    )

    assert selection["course"]["id"] == 1
    assert selection["study_unit"] == "Cardiovascular"
    payload = selection["workspace_context_payload"]
    assert payload["course_id"] == 1
    assert payload["topic"] == "Cardiovascular"
    assert payload["module_name"] == "Cardiovascular"
    assert payload["content_filter"]["material_ids"] == [11]
