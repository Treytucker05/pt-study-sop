import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import requests

from dashboard.utils import load_api_config


def _sha256(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def _get_llm_settings() -> Tuple[str, str, str]:
    """
    Returns (provider, api_key, model).
    Provider is "openrouter" or "openai".
    """
    cfg = load_api_config() or {}
    provider = (cfg.get("api_provider") or "openrouter").strip().lower()
    model = (cfg.get("model") or "openrouter/auto").strip()
    if provider == "openai":
        api_key = (cfg.get("openai_api_key") or "").strip()
    else:
        provider = "openrouter"
        api_key = (cfg.get("openrouter_api_key") or "").strip()
        if not model or model == "zai-ai/glm-4.7":
            model = "openrouter/auto"
    return provider, api_key, model


def _chat_completion(system_prompt: str, user_prompt: str, timeout_s: int = 45) -> Tuple[Optional[str], Optional[str]]:
    provider, api_key, model = _get_llm_settings()
    if not api_key:
        return None, "API key not configured (openrouter/openai)"

    if provider == "openrouter":
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://127.0.0.1:5000",
            "X-Title": "PT Study SOP Explainer",
        }
    else:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    try:
        resp = requests.post(
            url,
            headers=headers,
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 1100,
            },
            timeout=timeout_s,
        )
        if resp.status_code != 200:
            try:
                err = resp.json()
                msg = (
                    err.get("error", {}).get("message")
                    or err.get("message")
                    or f"HTTP {resp.status_code}"
                )
            except Exception:
                msg = f"HTTP {resp.status_code}"
            return None, f"LLM API error: {msg}"

        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        return (text or "").strip(), None
    except requests.exceptions.Timeout:
        return None, "LLM request timed out"
    except Exception as e:
        return None, f"LLM request failed: {e}"


def _cache_dir(repo_root: Path) -> Path:
    d = repo_root / "scholar" / "outputs" / "sop_explanations_cache"
    d.mkdir(parents=True, exist_ok=True)
    return d


def explain_sop_excerpt(
    *,
    repo_root: Path,
    sop_path: str,
    heading: str,
    level: int,
    excerpt: str,
    mode: str = "teach",
) -> Dict[str, Any]:
    """
    Produce a hierarchical explanation for a SOP excerpt.

    Returns JSON-like dict:
      { ok, cached, explanation }
    """
    safe_heading = (heading or "").strip()[:180]
    excerpt = (excerpt or "").strip()
    if not excerpt:
        return {"ok": False, "error": "Missing excerpt"}

    # Hard cap to avoid huge prompts
    excerpt = excerpt[:12000]

    cache_key = _sha256(json.dumps(
        {"sop_path": sop_path, "heading": safe_heading, "level": int(level or 0), "excerpt": excerpt, "mode": mode},
        sort_keys=True,
    ))
    cache_path = _cache_dir(repo_root) / f"{cache_key}.json"
    if cache_path.exists():
        try:
            return {"ok": True, "cached": True, "explanation": json.loads(cache_path.read_text(encoding="utf-8"))}
        except Exception:
            pass

    system_prompt = (
        "You are an expert tutor and system operator. Your job is to take a SOP excerpt and explain it as a "
        "hierarchical concept tree that can be expanded progressively.\n\n"
        "Rules:\n"
        "- Be faithful to the excerpt; do not invent steps that contradict it.\n"
        "- Organize into nested groups → subgroups → concepts.\n"
        "- Each node must have: name, what_it_is, how_it_works, why_it_matters, failure_modes, and a short example.\n"
        "- Keep language concrete and operational (what to do, what to check).\n"
        "- Output STRICT JSON only. No markdown.\n\n"
        "JSON schema:\n"
        "{\n"
        "  \"title\": string,\n"
        "  \"summary\": string,\n"
        "  \"groups\": [\n"
        "    {\n"
        "      \"name\": string,\n"
        "      \"what_it_is\": string,\n"
        "      \"how_it_works\": string,\n"
        "      \"why_it_matters\": string,\n"
        "      \"failure_modes\": [string],\n"
        "      \"example\": string,\n"
        "      \"children\": [ ... same shape ... ]\n"
        "    }\n"
        "  ],\n"
        "  \"next_actions\": [string]\n"
        "}\n"
    )

    user_prompt = (
        f"SOP_PATH: {sop_path}\n"
        f"HEADING_LEVEL: {level}\n"
        f"HEADING: {safe_heading}\n"
        f"MODE: {mode}\n\n"
        "EXCERPT:\n"
        "-----\n"
        f"{excerpt}\n"
        "-----\n\n"
        "Return STRICT JSON following the schema."
    )

    text, err = _chat_completion(system_prompt, user_prompt)
    if err:
        return {"ok": False, "error": err}

    # Parse JSON (best effort)
    try:
        explanation = json.loads(text)
    except Exception:
        # Try to recover if model wrapped JSON in fences
        cleaned = text.strip()
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        try:
            explanation = json.loads(cleaned)
        except Exception:
            # Last resort: extract a JSON object substring
            try:
                start = cleaned.find("{")
                end = cleaned.rfind("}")
                if start != -1 and end != -1 and end > start:
                    explanation = json.loads(cleaned[start : end + 1])
                else:
                    return {"ok": False, "error": "LLM returned non-JSON response", "raw": text[:2000]}
            except Exception:
                return {"ok": False, "error": "LLM returned non-JSON response", "raw": text[:2000]}

    try:
        cache_path.write_text(json.dumps(explanation, indent=2), encoding="utf-8")
    except Exception:
        pass

    return {"ok": True, "cached": False, "explanation": explanation}

