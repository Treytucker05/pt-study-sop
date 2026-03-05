"""
Gemini File API provider for video enrichment.

Uploads full MP4 via client.files.upload(), polls until ACTIVE,
then queries by timestamp ranges in the prompt. No video slicing needed.
"""

from __future__ import annotations

import hashlib
import os
import time
from pathlib import Path
from typing import Any, Optional


class GeminiProviderError(RuntimeError):
    """Raised when Gemini enrichment fails."""


def _build_client(api_key: str):
    """Lazily import and return a google.genai client for a specific key."""
    try:
        from google import genai
    except ImportError as exc:
        raise GeminiProviderError(
            "google-genai is not installed. Install it before using Gemini enrichment."
        ) from exc
    return genai.Client(api_key=api_key)


def _configured_api_keys() -> list[tuple[str, str]]:
    """Return API keys in failover order: A -> B -> GOOGLE_API_KEY fallback."""
    ordered_sources = (
        "GEMINI_API_KEY",
        "GEMINI_API_KEY_BUSINESS",
        "GOOGLE_API_KEY",
    )
    seen: set[str] = set()
    keys: list[tuple[str, str]] = []
    for source in ordered_sources:
        value = (os.environ.get(source) or "").strip()
        if not value or value in seen:
            continue
        seen.add(value)
        keys.append((source, value))
    if not keys:
        raise GeminiProviderError(
            "GEMINI_API_KEY (primary) or GEMINI_API_KEY_BUSINESS (secondary) or GOOGLE_API_KEY must be set in environment."
        )
    return keys


def _is_quota_or_rate_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    markers = (
        "429",
        "resource_exhausted",
        "quota",
        "rate limit",
        "too many requests",
        "insufficient_quota",
        "daily limit",
    )
    return any(marker in msg for marker in markers)


def _run_with_key_failover(operation_name: str, runner):
    """Run a Gemini operation with key failover (A -> B -> fallback).

    `runner` receives `(client, key_source)` and returns operation result.
    Failover only occurs for quota/rate-limit style failures.
    """
    last_exc: Optional[Exception] = None
    keys = _configured_api_keys()
    for idx, (key_source, key_value) in enumerate(keys):
        client = _build_client(key_value)
        try:
            return runner(client, key_source)
        except Exception as exc:
            last_exc = exc
            has_next = idx < len(keys) - 1
            if has_next and _is_quota_or_rate_error(exc):
                continue
            raise
    if last_exc:
        raise GeminiProviderError(
            f"{operation_name} failed after trying all configured Gemini API keys"
        ) from last_exc
    raise GeminiProviderError(
        f"{operation_name} failed before Gemini request could be attempted"
    )


def upload_video(
    video_path: str,
    *,
    poll_interval: float = 5.0,
    max_wait_sec: float = 600.0,
) -> dict[str, Any]:
    """Upload MP4 via Gemini File API and poll until ACTIVE.

    Returns the File object once processing completes.
    """
    source = Path(video_path)
    if not source.exists():
        raise GeminiProviderError(f"Video file not found: {video_path}")

    def _upload_with_client(client, key_source: str):
        video_file = client.files.upload(file=str(source))

        elapsed = 0.0
        while getattr(video_file, "state", None) != "ACTIVE":
            state = getattr(video_file, "state", "UNKNOWN")
            if state == "FAILED":
                raise GeminiProviderError(
                    f"Gemini file processing failed for {source.name} using {key_source}"
                )
            if elapsed >= max_wait_sec:
                raise GeminiProviderError(
                    f"Timed out waiting for Gemini to process {source.name} "
                    f"(waited {elapsed:.0f}s, state={state}, key={key_source})"
                )
            time.sleep(poll_interval)
            elapsed += poll_interval
            file_name = str(getattr(video_file, "name", "") or "")
            if not file_name:
                raise GeminiProviderError(
                    f"Gemini upload returned a file without a name for {source.name}"
                )
            video_file = client.files.get(name=file_name)

        return {
            "video_file": video_file,
            "client": client,
            "key_source": key_source,
        }

    return _run_with_key_failover("upload_video", _upload_with_client)


def query_timestamp_range(
    video_file: Any,
    start_ts: str,
    end_ts: str,
    prompt: str,
    *,
    model: str = "gemini-3-flash-preview",
    client: Any = None,
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
    full_prompt = (
        f"Regarding the video content between {start_ts} and {end_ts}: {prompt}"
    )
    if client is not None:
        response = client.models.generate_content(
            model=model,
            contents=[video_file, full_prompt],
        )
    else:
        response = _run_with_key_failover(
            "query_timestamp_range",
            lambda active_client, _key_source: active_client.models.generate_content(
                model=model,
                contents=[video_file, full_prompt],
            ),
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
    model: str = "gemini-3-flash-preview",
    base_prompt: str = "Describe the content shown in this section of the lecture.",
    client: Any = None,
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
                video_file, start, end, base_prompt, model=model, client=client
            )
            results.append(
                {
                    "start_ts": start,
                    "end_ts": end,
                    "original_text": seg.get("text", ""),
                    "enrichment": result["text"],
                    "usage": result.get("usage", {}),
                    "status": "ok",
                }
            )
        except Exception as exc:
            results.append(
                {
                    "start_ts": start,
                    "end_ts": end,
                    "original_text": seg.get("text", ""),
                    "enrichment": "",
                    "error": str(exc),
                    "status": "failed",
                }
            )
    return results


def compute_video_hash(video_path: str) -> str:
    """Compute SHA-256 hash of the first 10MB of a video for cache keying."""
    h = hashlib.sha256()
    with open(video_path, "rb") as f:
        chunk = f.read(10 * 1024 * 1024)
        h.update(chunk)
    return h.hexdigest()[:16]
