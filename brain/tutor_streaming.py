"""
Tutor SSE Streaming — Adapts LangChain chain streaming to SSE format.

Matches the existing SSE pattern from api_adapter.py brain_quick_chat.
"""

from __future__ import annotations

import json
from typing import Generator, Optional


def format_sse_chunk(content: str, chunk_type: str = "token") -> str:
    """Format a single SSE data line."""
    payload = {"content": content, "type": chunk_type}
    return f"data: {json.dumps(payload)}\n\n"


def format_sse_done(
    citations: Optional[list[dict]] = None,
    artifacts: Optional[list[dict]] = None,
    summary: Optional[str] = None,
    model: Optional[str] = None,
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
    return f"data: {json.dumps(payload)}\n\ndata: [DONE]\n\n"


def format_sse_error(error: str) -> str:
    """Format an SSE error event."""
    payload = {"type": "error", "content": error}
    return f"data: {json.dumps(payload)}\n\ndata: [DONE]\n\n"


def stream_tutor_response(
    chain,
    input_dict: dict,
    session_id: str,
    artifact_cmd: Optional[dict] = None,
) -> Generator[str, None, dict]:
    """
    Stream a LangChain chain response as SSE events.

    Yields SSE-formatted strings. Returns metadata dict via generator return value.
    The caller can capture the full response by collecting yielded chunks.

    Usage:
        gen = stream_tutor_response(chain, inputs, sid)
        full_text = ""
        for chunk in gen:
            yield chunk  # to Flask Response
            # parse content from chunk if needed
    """
    full_response = ""
    citations = []

    try:
        # Stream from LangChain chain
        for chunk in chain.stream(input_dict):
            if isinstance(chunk, str) and chunk:
                full_response += chunk
                yield format_sse_chunk(chunk)
            elif hasattr(chunk, "content") and chunk.content:
                full_response += chunk.content
                yield format_sse_chunk(chunk.content)
    except Exception as e:
        yield format_sse_error(str(e))
        return {"error": str(e), "full_response": full_response}

    # Extract citations from the response
    citations = extract_citations(full_response)

    # Send done event
    artifacts = [artifact_cmd] if artifact_cmd else None
    yield format_sse_done(citations=citations, artifacts=artifacts)

    return {
        "full_response": full_response,
        "citations": citations,
    }


def extract_citations(text: str) -> list[dict]:
    """Extract [Source: filename] citations from response text."""
    import re

    citations = []
    seen = set()
    for match in re.finditer(r"\[Source:\s*([^\]]+)\]", text):
        source = match.group(1).strip()
        if source not in seen:
            seen.add(source)
            citations.append({"source": source, "index": len(citations) + 1})
    return citations


def collect_stream(generator) -> tuple[str, list[dict]]:
    """
    Consume a stream generator and return (full_text, citations).
    Useful for non-streaming contexts (tests, session end summary).
    """
    full_text = ""
    citations = []

    for chunk_str in generator:
        if not chunk_str.startswith("data: "):
            continue
        data_part = chunk_str.split("data: ", 1)[1].split("\n")[0]
        if data_part == "[DONE]":
            break
        try:
            parsed = json.loads(data_part)
            if parsed.get("type") == "token":
                full_text += parsed.get("content", "")
            elif parsed.get("type") == "done":
                citations = parsed.get("citations", [])
        except (json.JSONDecodeError, KeyError):
            pass

    return full_text, citations
