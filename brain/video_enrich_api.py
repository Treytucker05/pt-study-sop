"""
Video Enrichment API — orchestrates flagging, Gemini enrichment, budget caps,
caching, and markdown artifact emission.
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Literal, Optional

from config import DB_PATH

_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "video_enrichment.json"


def _load_config() -> dict[str, Any]:
    if _CONFIG_PATH.exists():
        return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
    return {"mode": "off", "flagging": {}, "budget": {}, "cache": {"enabled": False}}


def get_enrichment_mode() -> str:
    return str(_load_config().get("mode") or "off")


def flag_segments(
    segments: list[dict[str, Any]],
    *,
    config: Optional[dict[str, Any]] = None,
) -> list[dict[str, Any]]:
    """Flag segments that need API enrichment based on confidence thresholds.

    Flagging criteria (from config):
    - avg_logprob < threshold (low transcription confidence)
    - no_speech_prob > threshold (possible non-speech audio)
    """
    cfg = config or _load_config()
    flagging = cfg.get("flagging") or {}
    logprob_thresh = float(flagging.get("avg_logprob_threshold", -0.7))
    nospeech_thresh = float(flagging.get("no_speech_prob_threshold", 0.5))

    flagged: list[dict[str, Any]] = []
    for seg in segments:
        reasons: list[str] = []
        avg_logprob = float(seg.get("avg_logprob", 0.0))
        no_speech = float(seg.get("no_speech_prob", 0.0))

        if avg_logprob < logprob_thresh:
            reasons.append(f"low_confidence(avg_logprob={avg_logprob:.2f})")
        if no_speech > nospeech_thresh:
            reasons.append(f"possible_noise(no_speech_prob={no_speech:.2f})")

        if reasons:
            flagged.append({**seg, "flag_reasons": reasons})
    return flagged


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

_cache: dict[str, dict[str, Any]] = {}


def _cache_key(video_hash: str, start_sec: float, end_sec: float, prompt_version: str) -> str:
    return f"{video_hash}:{start_sec:.1f}-{end_sec:.1f}:{prompt_version}"


def get_cached(video_hash: str, start_sec: float, end_sec: float, prompt_version: str = "v1") -> Optional[dict]:
    key = _cache_key(video_hash, start_sec, end_sec, prompt_version)
    return _cache.get(key)


def set_cached(
    video_hash: str,
    start_sec: float,
    end_sec: float,
    result: dict[str, Any],
    prompt_version: str = "v1",
) -> None:
    key = _cache_key(video_hash, start_sec, end_sec, prompt_version)
    _cache[key] = result


# ---------------------------------------------------------------------------
# Budget / Cap Enforcement
# ---------------------------------------------------------------------------

def get_monthly_spend() -> float:
    """Sum estimated costs from video_api_usage this calendar month."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT COALESCE(SUM(estimated_cost_usd), 0.0) FROM video_api_usage
               WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"""
        )
        return float(cur.fetchone()[0])
    except sqlite3.OperationalError:
        return 0.0
    finally:
        conn.close()


def get_video_spend(video_hash: str) -> float:
    """Sum estimated costs for a specific video."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT COALESCE(SUM(estimated_cost_usd), 0.0) FROM video_api_usage WHERE video_hash = ?",
            (video_hash,),
        )
        return float(cur.fetchone()[0])
    except sqlite3.OperationalError:
        return 0.0
    finally:
        conn.close()


def check_budget(video_hash: str, config: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Check whether enrichment is within budget.

    Returns dict with 'allowed' bool and details.
    """
    cfg = config or _load_config()
    budget = cfg.get("budget") or {}
    monthly_cap = float(budget.get("monthly_cap_usd", 5.0))
    per_video_cap = float(budget.get("per_video_cap_usd", 0.50))

    monthly_spend = get_monthly_spend()
    video_spend = get_video_spend(video_hash)

    result: dict[str, Any] = {
        "monthly_spend": monthly_spend,
        "monthly_cap": monthly_cap,
        "video_spend": video_spend,
        "per_video_cap": per_video_cap,
    }

    if monthly_spend >= monthly_cap:
        result["allowed"] = False
        result["reason"] = "monthly_cap_exceeded"
    elif video_spend >= per_video_cap:
        result["allowed"] = False
        result["reason"] = "per_video_cap_exceeded"
    else:
        result["allowed"] = True
        result["reason"] = None

    return result


def record_usage(
    video_hash: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    estimated_cost_usd: float,
    *,
    segment_range: str = "",
    material_id: Optional[int] = None,
) -> None:
    """Record an API usage event in the video_api_usage table."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO video_api_usage
               (video_hash, model, prompt_tokens, completion_tokens,
                estimated_cost_usd, segment_range, material_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                video_hash,
                model,
                prompt_tokens,
                completion_tokens,
                estimated_cost_usd,
                segment_range,
                material_id,
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Enrichment orchestrator
# ---------------------------------------------------------------------------

def enrich_video(
    *,
    video_path: str,
    segments: list[dict[str, Any]],
    material_id: Optional[int] = None,
    mode: Optional[Literal["off", "auto", "manual"]] = None,
) -> dict[str, Any]:
    """Main entry point: flag segments, check budget, enrich via Gemini, emit artifacts.

    Returns summary dict with results and any errors.
    """
    cfg = _load_config()
    active_mode = mode or str(cfg.get("mode") or "off")

    if active_mode == "off":
        return {"status": "skipped", "reason": "enrichment_mode_off", "enriched": 0}

    from video_enrich_providers.gemini_provider import (
        compute_video_hash,
        enrich_segments as gemini_enrich,
        upload_video,
    )

    video_hash = compute_video_hash(video_path)

    # Budget check
    budget_check = check_budget(video_hash, cfg)
    if not budget_check["allowed"]:
        local_fallback = bool((cfg.get("budget") or {}).get("local_only_fallback", True))
        return {
            "status": "budget_exceeded",
            "reason": budget_check["reason"],
            "budget": budget_check,
            "local_only_fallback": local_fallback,
            "enriched": 0,
        }

    # Flag segments
    flagged = flag_segments(segments, config=cfg)
    if not flagged:
        return {"status": "ok", "reason": "no_segments_flagged", "enriched": 0}

    # Filter out cached results
    uncached: list[dict[str, Any]] = []
    cached_results: list[dict[str, Any]] = []
    for seg in flagged:
        cached = get_cached(video_hash, seg["start_sec"], seg["end_sec"])
        if cached:
            cached_results.append(cached)
        else:
            uncached.append(seg)

    enrichment_results: list[dict[str, Any]] = list(cached_results)

    if uncached:
        model_pref = str(cfg.get("model_preference") or "flash")
        models = cfg.get("models") or {}
        model_cfg = models.get(model_pref) or models.get("flash") or {}
        model_name = str(model_cfg.get("name") or "gemini-2.5-flash")
        cost_per_1m = float(model_cfg.get("input_cost_per_1m_tokens", 0.10))

        # Upload video once
        video_file = upload_video(video_path)

        results = gemini_enrich(video_file, uncached, model=model_name)

        for res in results:
            usage = res.get("usage") or {}
            total_tokens = int(usage.get("total_tokens", 0))
            est_cost = (total_tokens / 1_000_000) * cost_per_1m

            record_usage(
                video_hash,
                model_name,
                int(usage.get("prompt_tokens", 0)),
                int(usage.get("completion_tokens", 0)),
                est_cost,
                segment_range=f"{res.get('start_ts', '')}-{res.get('end_ts', '')}",
                material_id=material_id,
            )

            # Cache successful results
            if res.get("status") == "ok":
                seg_match = next(
                    (s for s in uncached if s.get("start_ts") == res.get("start_ts")),
                    None,
                )
                if seg_match:
                    set_cached(
                        video_hash,
                        seg_match["start_sec"],
                        seg_match["end_sec"],
                        res,
                    )

            enrichment_results.append(res)

    return {
        "status": "ok",
        "enriched": len(enrichment_results),
        "flagged_count": len(flagged),
        "cached_count": len(cached_results),
        "results": enrichment_results,
    }


def emit_enrichment_markdown(
    slug: str,
    enrichment_results: list[dict[str, Any]],
    output_dir: str,
) -> str:
    """Write enrichment results to a markdown file and return its path."""
    lines = [f"# Enrichment Notes — {slug}", "", "## Enriched Segments", ""]
    for res in enrichment_results:
        start = res.get("start_ts", "?")
        end = res.get("end_ts", "?")
        original = res.get("original_text", "").strip()
        enrichment = res.get("enrichment", "").strip()
        status = res.get("status", "unknown")

        lines.append(f"### [{start} -> {end}]")
        if original:
            lines.append(f"**Original transcript:** {original}")
        if status == "ok" and enrichment:
            lines.append(f"**Enrichment:** {enrichment}")
        elif status == "failed":
            lines.append(f"**Status:** Failed — {res.get('error', 'unknown error')}")
        lines.append("")

    out_path = Path(output_dir) / f"{slug}_enrichment.md"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")
    return str(out_path)
