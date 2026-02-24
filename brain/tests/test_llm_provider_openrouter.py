"""Tests for the direct OpenRouter API provider in llm_provider."""

import json
import llm_provider


class FakeResponse:
    """Mimics requests.Response for mocking."""

    def __init__(self, status_code: int, body: dict):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body


def test_call_openrouter_returns_content_on_success(monkeypatch):
    """Direct HTTP call returns LLM content without subprocess overhead."""
    monkeypatch.setenv("PT_ALLOW_LLM_IN_TESTS", "1")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")

    def fake_post(url, headers=None, json=None, timeout=None):
        assert "openrouter.ai" in url
        assert headers["Authorization"] == "Bearer sk-test-key-123"
        assert json["stream"] is False
        return FakeResponse(200, {
            "choices": [{"message": {"content": "The rotator cuff consists of four muscles."}}]
        })

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    result = llm_provider.call_llm("You are a tutor.", "What is the rotator cuff?", provider="openrouter")

    assert result["success"] is True
    assert "rotator cuff" in result["content"]
    assert result["error"] is None


def test_call_openrouter_returns_error_on_missing_api_key(monkeypatch):
    """Returns structured error when API key is not configured."""
    monkeypatch.setenv("PT_ALLOW_LLM_IN_TESTS", "1")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = llm_provider.call_llm("sys", "user", provider="openrouter")

    assert result["success"] is False
    assert "API key" in result["error"] or "api key" in result["error"].lower()


def test_call_openrouter_returns_error_on_api_failure(monkeypatch):
    """Returns structured error on non-200 API response."""
    monkeypatch.setenv("PT_ALLOW_LLM_IN_TESTS", "1")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")

    def fake_post(url, **kwargs):
        return FakeResponse(429, {"error": {"message": "Rate limited"}})

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    result = llm_provider.call_llm("sys", "user", provider="openrouter")

    assert result["success"] is False
    assert "Rate limited" in result["error"] or "429" in result["error"]


def test_call_openrouter_handles_timeout(monkeypatch):
    """Returns structured error on request timeout."""
    import requests as req_lib
    monkeypatch.setenv("PT_ALLOW_LLM_IN_TESTS", "1")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")

    def fake_post(url, **kwargs):
        raise req_lib.exceptions.Timeout("Connection timed out")

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    result = llm_provider.call_llm("sys", "user", provider="openrouter")

    assert result["success"] is False
    assert "timed out" in result["error"].lower()


def test_call_openrouter_uses_model_from_env(monkeypatch):
    """Uses model from OPENROUTER_MODEL env var when provided."""
    monkeypatch.setenv("PT_ALLOW_LLM_IN_TESTS", "1")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")
    monkeypatch.setenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")

    captured = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["model"] = json["model"]
        return FakeResponse(200, {
            "choices": [{"message": {"content": "Answer."}}]
        })

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    llm_provider.call_llm("sys", "user", provider="openrouter")

    assert captured["model"] == "google/gemini-2.5-flash"


def test_call_openrouter_stream_yields_chunks(monkeypatch):
    """Streaming mode yields content chunks then a done sentinel."""
    monkeypatch.setenv("PT_ALLOW_LLM_IN_TESTS", "1")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")

    class FakeStreamResponse:
        status_code = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def iter_lines(self, decode_unicode=True):
            yield 'data: {"choices":[{"delta":{"content":"The "}}]}'
            yield 'data: {"choices":[{"delta":{"content":"rotator cuff"}}]}'
            yield 'data: {"choices":[{"delta":{"content":" has four muscles."}}]}'
            yield "data: [DONE]"

    def fake_post(url, headers=None, json=None, timeout=None, stream=None):
        assert json["stream"] is True
        assert stream is True
        return FakeStreamResponse()

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    chunks = list(llm_provider.call_llm_stream("You are a tutor.", "What is the rotator cuff?"))

    texts = [c["content"] for c in chunks if c["type"] == "delta"]
    assert "".join(texts) == "The rotator cuff has four muscles."
    assert chunks[-1]["type"] == "done"


def test_call_openrouter_stream_handles_error(monkeypatch):
    """Streaming yields error on API failure."""
    monkeypatch.setenv("PT_ALLOW_LLM_IN_TESTS", "1")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")

    class FakeErrorResponse:
        status_code = 500

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def json(self):
            return {"error": {"message": "Internal error"}}

    def fake_post(url, **kwargs):
        return FakeErrorResponse()

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    chunks = list(llm_provider.call_llm_stream("sys", "user"))
    assert chunks[0]["type"] == "error"
