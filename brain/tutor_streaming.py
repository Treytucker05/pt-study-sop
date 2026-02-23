"""
Tutor SSE Streaming — Formats tutor responses as Server-Sent Events.

Matches the existing SSE pattern from api_adapter.py brain_quick_chat.
"""

from __future__ import annotations

import json
import re
from typing import Optional


def format_sse_chunk(content: str, chunk_type: str = "token") -> str:
    """Format a single SSE data line."""
    payload = {"content": content, "type": chunk_type}
    return f"data: {json.dumps(payload)}\n\n"


def format_sse_done(
    citations: Optional[list[dict]] = None,
    artifacts: Optional[list[dict]] = None,
    summary: Optional[str] = None,
    model: Optional[str] = None,
    retrieval_debug: Optional[dict] = None,
    behavior_override: Optional[str] = None,
    verdict: Optional[dict] = None,
    concept_map: Optional[dict] = None,
    teach_back_rubric: Optional[dict] = None,
    mastery_update: Optional[dict] = None,
) -> str:
    """Format the final SSE done event with metadata."""
    payload: dict = {"type": "done"}
    if citations:
        payload["citations"] = citations
    if artifacts:
        payload["artifacts"] = artifacts
    if summary:
        payload["summary"] = summary
    if model:
        payload["model"] = model
    if retrieval_debug:
        payload["retrieval_debug"] = retrieval_debug
    if behavior_override:
        payload["behavior_override"] = behavior_override
    if verdict:
        payload["verdict"] = verdict
    if concept_map:
        payload["concept_map"] = concept_map
    if teach_back_rubric:
        payload["teach_back_rubric"] = teach_back_rubric
    if mastery_update:
        payload["mastery_update"] = mastery_update
    return f"data: {json.dumps(payload)}\n\ndata: [DONE]\n\n"


def format_sse_error(error: str) -> str:
    """Format an SSE error event with actionable guidance."""
    msg = _map_error_to_actionable(error)
    payload = {"type": "error", "content": msg}
    return f"data: {json.dumps(payload)}\n\ndata: [DONE]\n\n"


def _map_error_to_actionable(error: str) -> str:
    """Map raw errors to user-facing messages with recovery guidance."""
    low = error.lower()
    if "codex" in low and ("auth" in low or "token" in low or "401" in low):
        return (
            "Codex authentication is missing or expired. "
            "Run `codex login` to re-authenticate and restart the dashboard."
        )
    if "codex" in low and ("not found" in low or "enoent" in low):
        return (
            "Codex CLI not found. Install it with `npm i -g @anthropic-ai/codex` "
            "and run `codex login` to authenticate."
        )
    if "timeout" in low or "timed out" in low:
        return (
            "Response timed out. Try a shorter question, "
            "or switch to a faster model in settings."
        )
    if "rate limit" in low or "429" in low:
        return "Rate limited by the provider. Wait a moment and try again."
    if "context length" in low or "too long" in low or "token" in low:
        return (
            "Message exceeded context limit. Try shortening your question "
            "or start a new session to reset chat history."
        )
    if "connection" in low or "network" in low or "fetch" in low:
        return "Network error. Check your internet connection and try again."
    return error


def extract_citations(text: str) -> list[dict]:
    """Extract [Source: filename] citations from response text."""
    citations = []
    seen = set()
    for match in re.finditer(r"\[Source:\s*([^\]]+)\]", text):
        source = match.group(1).strip()
        if source not in seen:
            seen.add(source)
            citations.append({"source": source, "index": len(citations) + 1})
    return citations
