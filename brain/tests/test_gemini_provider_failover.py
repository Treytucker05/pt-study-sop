import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from video_enrich_providers import gemini_provider


def test_configured_api_keys_prefers_a_then_b(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "key-a")
    monkeypatch.setenv("GEMINI_API_KEY_BUSINESS", "key-b")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    keys = gemini_provider._configured_api_keys()
    assert keys[0][0] == "GEMINI_API_KEY"
    assert keys[1][0] == "GEMINI_API_KEY_BUSINESS"


def test_failover_uses_key_b_when_key_a_quota_limited(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "key-a")
    monkeypatch.setenv("GEMINI_API_KEY_BUSINESS", "key-b")

    class FakeClient:
        def __init__(self, key: str):
            self.key = key

    def fake_build_client(api_key: str):
        return FakeClient(api_key)

    monkeypatch.setattr(gemini_provider, "_build_client", fake_build_client)

    def runner(client, key_source: str):
        if key_source == "GEMINI_API_KEY":
            raise RuntimeError("429 quota exceeded")
        return {"ok": True, "key_source": key_source, "key": client.key}

    result = gemini_provider._run_with_key_failover("test-op", runner)
    assert result["ok"] is True
    assert result["key_source"] == "GEMINI_API_KEY_BUSINESS"
    assert result["key"] == "key-b"


def test_failover_does_not_retry_non_quota_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "key-a")
    monkeypatch.setenv("GEMINI_API_KEY_BUSINESS", "key-b")

    class FakeClient:
        pass

    monkeypatch.setattr(gemini_provider, "_build_client", lambda _api_key: FakeClient())

    def runner(_client, _key_source: str):
        raise RuntimeError("permission denied")

    with pytest.raises(RuntimeError, match="permission denied"):
        gemini_provider._run_with_key_failover("test-op", runner)


def test_upload_video_reports_key_source(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    video_path = tmp_path / "clip.mp4"
    video_path.write_bytes(b"data")

    monkeypatch.setenv("GEMINI_API_KEY", "key-a")
    monkeypatch.delenv("GEMINI_API_KEY_BUSINESS", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    class FakeFile:
        def __init__(self):
            self.name = "files/123"
            self.state = "ACTIVE"

    class FakeFiles:
        def upload(self, file: str):
            assert file.endswith("clip.mp4")
            return FakeFile()

        def get(self, name: str):
            f = FakeFile()
            f.name = name
            return f

    class FakeClient:
        def __init__(self):
            self.files = FakeFiles()

    monkeypatch.setattr(gemini_provider, "_build_client", lambda _api_key: FakeClient())

    result = gemini_provider.upload_video(str(video_path))
    assert result["key_source"] == "GEMINI_API_KEY"
    assert result["video_file"].state == "ACTIVE"
