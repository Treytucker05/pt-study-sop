"""
Tutor SSE Streaming — Adapts LangChain chain streaming to SSE format.

Matches the existing SSE pattern from api_adapter.py brain_quick_chat.
"""

from __future__ import annotations

import json
import re
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
    if "openrouter" in low and ("key" in low or "api" in low or "401" in low):
        return (
            "OpenRouter API key is missing or invalid. "
            "Set OPENROUTER_API_KEY in brain/.env and restart the dashboard."
        )
    if "codex" in low and ("not found" in low or "enoent" in low):
        return (
            "Codex CLI not found. Install it with `npm i -g @anthropic-ai/codex` "
            "or switch to an OpenRouter model in session settings."
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


# ---------------------------------------------------------------------------
# Video timestamp citation formatting
# ---------------------------------------------------------------------------

_TIMESTAMP_RANGE_PATTERN = re.compile(
    r'\[(\d{1,2}:\d{2}:\d{2})\s*->\s*\d{1,2}:\d{2}:\d{2}\]'
)
_TIMESTAMP_SINGLE_PATTERN = re.compile(
    r'\[(\d{1,2}:\d{2}:\d{2})\]'
)


def extract_timestamps_from_chunk(text: str) -> list[str]:
    """Find all [HH:MM:SS] or [HH:MM:SS -> HH:MM:SS] patterns; return start timestamps."""
    timestamps: list[str] = []
    seen: set[str] = set()
    for match in _TIMESTAMP_RANGE_PATTERN.finditer(text):
        ts = match.group(1)
        if ts not in seen:
            seen.add(ts)
            timestamps.append(ts)
    for match in _TIMESTAMP_SINGLE_PATTERN.finditer(text):
        ts = match.group(1)
        if ts not in seen:
            seen.add(ts)
            timestamps.append(ts)
    return timestamps


def _is_video_origin(metadata: dict) -> bool:
    """Check if chunk metadata indicates a video source."""
    topic_tags = metadata.get("topic_tags", [])
    if isinstance(topic_tags, str):
        topic_tags = [t.strip() for t in topic_tags.split(",")]
    if {"transcript", "visual_notes", "video"} & set(topic_tags):
        return True
    folder_path = str(metadata.get("folder_path") or "")
    return "video_ingest" in folder_path


def format_video_citations(chunks: list) -> list[dict]:
    """Build timestamp-aware citations from video-origin chunks.

    Returns a list of dicts: {"source": path, "timestamp": "HH:MM:SS", "text": snippet}
    """
    citations: list[dict] = []
    for chunk in chunks:
        metadata = getattr(chunk, "metadata", None) or {}
        if not _is_video_origin(metadata):
            continue
        content = str(getattr(chunk, "page_content", ""))
        source = str(metadata.get("source") or metadata.get("source_path") or "")
        timestamps = extract_timestamps_from_chunk(content)
        if not timestamps:
            citations.append({
                "source": source,
                "timestamp": "",
                "text": content[:200],
            })
            continue
        for ts in timestamps:
            snippet_start = content.find(ts)
            snippet = content[max(0, snippet_start - 40):snippet_start + 60].strip()
            citations.append({
                "source": source,
                "timestamp": ts,
                "text": snippet,
            })
    return citations
