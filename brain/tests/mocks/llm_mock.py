"""Mock LLM client for tutor tests.

Replaces ``brain.llm_provider`` functions so tests never hit external APIs.
Tracks call metadata for assertions.
"""

from __future__ import annotations

from typing import Any


class MockLLMClient:
    """Drop-in mock for ``llm_provider.call_llm`` and streaming helpers.

    Usage::

        mock = MockLLMClient()
        mock.set_response("The mitochondria is the powerhouse of the cell.")
        monkeypatch.setattr(llm_provider, "call_llm", mock.call_llm)

        # For streaming tests:
        mock.set_streaming_response(["Hello", " world", "!"])
        monkeypatch.setattr(llm_provider, "call_llm_stream", mock.call_llm_stream)
    """

    def __init__(self, default_response: str = "Mock LLM response.") -> None:
        self._response: str = default_response
        self._streaming_chunks: list[str] = []
        self._json_response: dict[str, Any] | None = None
        self.call_count: int = 0
        self.stream_call_count: int = 0
        self.json_call_count: int = 0
        self.last_args: dict[str, Any] = {}
        self.call_history: list[dict[str, Any]] = []

    # -- Configuration -------------------------------------------------------

    def set_response(self, text: str) -> None:
        """Set the canned text returned by ``call_llm``."""
        self._response = text

    def set_streaming_response(self, chunks: list[str]) -> None:
        """Set the sequence of text chunks yielded by ``call_llm_stream``."""
        self._streaming_chunks = list(chunks)

    def set_json_response(self, data: dict[str, Any]) -> None:
        """Set the parsed JSON returned by ``call_codex_json``."""
        self._json_response = data

    # -- Mock callables ------------------------------------------------------

    def call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        provider: str = "codex",
        model: str = "default",
        timeout: int = 60,
        isolated: bool = False,
    ) -> dict[str, Any]:
        """Mock replacement for ``llm_provider.call_llm``."""
        self.call_count += 1
        self.last_args = {
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "provider": provider,
            "model": model,
            "timeout": timeout,
            "isolated": isolated,
        }
        self.call_history.append(self.last_args.copy())
        return {
            "success": True,
            "content": self._response,
            "error": None,
        }

    def call_llm_stream(
        self,
        system_prompt: str = "",
        user_prompt: str = "",
        provider: str = "codex",
        model: str = "default",
        timeout: int = 30,
        messages: list | None = None,
        max_tokens: int = 1200,
    ):
        """Mock replacement for ``llm_provider.call_llm_stream``.

        Yields SSE-style dicts matching the real provider's protocol:
        ``{"type": "delta", "content": "..."}`` followed by ``{"type": "done"}``.
        """
        self.stream_call_count += 1
        self.last_args = {
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "provider": provider,
            "model": model,
            "timeout": timeout,
        }
        self.call_history.append(self.last_args.copy())
        chunks = self._streaming_chunks or [self._response]
        for chunk in chunks:
            yield {"type": "delta", "content": chunk}
        yield {"type": "done"}

    def call_codex_json(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        model: str | None = None,
        timeout: int = 60,
    ) -> dict[str, Any]:
        """Mock replacement for ``llm_provider.call_codex_json``."""
        self.json_call_count += 1
        self.last_args = {
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "model": model,
            "timeout": timeout,
        }
        self.call_history.append(self.last_args.copy())
        if self._json_response is not None:
            return {"success": True, "content": self._json_response, "error": None}
        return {"success": True, "content": self._response, "error": None}

    def stream_chatgpt_responses(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        model: str = "gpt-5.3-codex",
        timeout: int = 120,
        web_search: bool = False,
        tools: list[dict] | None = None,
        tool_choice: str | dict | None = None,
        previous_response_id: str | None = None,
        input_override: list[dict] | None = None,
    ):
        """Mock replacement for ``llm_provider.stream_chatgpt_responses``."""
        self.stream_call_count += 1
        self.last_args = {
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "model": model,
        }
        self.call_history.append(self.last_args.copy())
        chunks = self._streaming_chunks or [self._response]
        for chunk in chunks:
            yield {"type": "delta", "text": chunk}
        yield {"type": "done"}

    # -- Convenience ----------------------------------------------------------

    def reset(self) -> None:
        """Clear all tracked state (counts, history, args)."""
        self.call_count = 0
        self.stream_call_count = 0
        self.json_call_count = 0
        self.last_args = {}
        self.call_history = []
