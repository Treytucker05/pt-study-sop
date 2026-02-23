"""
Gemini File API provider for video enrichment.

Uploads full MP4 via client.files.upload(), polls until ACTIVE,
then queries by timestamp ranges in the prompt. No video slicing needed.
"""
from __future__ import annotations

import hashlib
import time
from pathlib import Path
from typing import Any, Optional


class GeminiProviderError(RuntimeError):
    """Raised when Gemini enrichment fails."""


def _get_client():
    """Lazily import and return a google.genai client."""
    try:
        from google import genai
    except ImportError as exc:
        raise GeminiProviderError(
            "google-genai is not installed. Install it before using Gemini enrichment."
        ) from exc

    import os

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
    if not api_key:
        raise GeminiProviderError(
            "GEMINI_API_KEY or GOOGLE_API_KEY must be set in environment."
        )
    return genai.Client(api_key=api_key)


def upload_video(
    video_path: str,
    *,
    poll_interval: float = 5.0,
    max_wait_sec: float = 600.0,
) -> Any:
    """Upload MP4 via Gemini File API and poll until ACTIVE.

    Returns the File object once processing completes.
    """
    client = _get_client()
    source = Path(video_path)
    if not source.exists():
        raise GeminiProviderError(f"Video file not found: {video_path}")

    video_file = client.files.upload(file=str(source))

    elapsed = 0.0
    while getattr(video_file, "state", None) != "ACTIVE":
        state = getattr(video_file, "state", "UNKNOWN")
        if state == "FAILED":
            raise GeminiProviderError(f"Gemini file processing failed for {source.name}")
        if elapsed >= max_wait_sec:
            raise GeminiProviderError(
                f"Timed out waiting for Gemini to process {source.name} "
                f"(waited {elapsed:.0f}s, state={state})"
            )
        time.sleep(poll_interval)
        elapsed += poll_interval
        video_file = client.files.get(name=video_file.name)

    return video_file


def query_timestamp_range(
    video_file: Any,
    start_ts: str,
    end_ts: str,
    prompt: str,
    *,
    model: str = "gemini-2.5-flash",
) -> dict[str, Any]:
    """Query a specific timestamp range of an uploaded video.

    Args:
        video_file: The Gemini File object (must be ACTIVE).
        start_ts: Start timestamp like "14:30".
        end_ts: End timestamp like "15:45".
        prompt: What to ask about that range.
        model: Gemini model to use.

    Returns:
        Dict with response text and usage metadata.
    """
    client = _get_client()
    full_prompt = (
        f"Regarding the video content between {start_ts} and {end_ts}: {prompt}"
    )
    response = client.models.generate_content(
        model=model,
        contents=[video_file, full_prompt],
    )
    text = ""
    if response and hasattr(response, "text"):
        text = response.text or ""

    usage = {}
    if hasattr(response, "usage_metadata"):
        meta = response.usage_metadata
        usage = {
            "prompt_tokens": getattr(meta, "prompt_token_count", 0),
            "completion_tokens": getattr(meta, "candidates_token_count", 0),
            "total_tokens": getattr(meta, "total_token_count", 0),
        }

    return {"text": text, "model": model, "usage": usage}


def enrich_segments(
    video_file: Any,
    flagged_segments: list[dict[str, Any]],
    *,
    model: str = "gemini-2.5-flash",
    base_prompt: str = "Describe the content shown in this section of the lecture.",
) -> list[dict[str, Any]]:
    """Enrich a batch of flagged segments via Gemini.

    Each segment dict must have start_ts and end_ts keys.
    Returns enrichment results paired with original segment info.
    """
    results: list[dict[str, Any]] = []
    for seg in flagged_segments:
        start = str(seg.get("start_ts") or "00:00:00")
        end = str(seg.get("end_ts") or start)
        try:
            result = query_timestamp_range(
                video_file, start, end, base_prompt, model=model
            )
            results.append({
                "start_ts": start,
                "end_ts": end,
                "original_text": seg.get("text", ""),
                "enrichment": result["text"],
                "usage": result.get("usage", {}),
                "status": "ok",
            })
        except Exception as exc:
            results.append({
                "start_ts": start,
                "end_ts": end,
                "original_text": seg.get("text", ""),
                "enrichment": "",
                "error": str(exc),
                "status": "failed",
            })
    return results


def compute_video_hash(video_path: str) -> str:
    """Compute SHA-256 hash of the first 10MB of a video for cache keying."""
    h = hashlib.sha256()
    with open(video_path, "rb") as f:
        chunk = f.read(10 * 1024 * 1024)
        h.update(chunk)
    return h.hexdigest()[:16]
