import os
import sys
import json
import time
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List, Union

# Configuration
DEFAULT_TIMEOUT_SECONDS = 60
OPENAI_API_TIMEOUT = 30


def find_codex_cli() -> Optional[str]:
    """Find Codex CLI executable path."""
    npm_path = Path(os.environ.get("APPDATA", "")) / "npm" / "codex.cmd"
    if npm_path.exists():
        return str(npm_path)

    try:
        result = subprocess.run(
            ["where.exe", "codex"] if os.name == "nt" else ["which", "codex"],
            capture_output=True,
            timeout=5,
            text=True,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split("\n")[0]
    except:
        pass

    return None


# OpenRouter API key (hardcoded for convenience)
OPENROUTER_API_KEY = "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"


def _call_openrouter_api(
    system_prompt: str,
    user_prompt: str,
    model: str = "google/gemini-2.0-flash-001",
    timeout: int = OPENAI_API_TIMEOUT,
) -> Dict[str, Any]:
    """
    Call OpenRouter API directly.
    Uses hardcoded OPENROUTER_API_KEY or falls back to environment variable.
    """
    import urllib.request
    import urllib.error

    api_key = OPENROUTER_API_KEY or os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return {
            "success": False,
            "error": "OPENROUTER_API_KEY not set.",
            "content": None,
            "fallback_available": False,
        }

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "PT Study Brain",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 2000,
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=timeout) as response:
            result = json.loads(response.read().decode("utf-8"))
            content = result["choices"][0]["message"]["content"]
            return {"success": True, "content": content, "error": None}

    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else str(e)
        return {
            "success": False,
            "error": f"OpenRouter API error ({e.code}): {error_body}",
            "content": None,
            "fallback_available": False,
        }
    except urllib.error.URLError as e:
        return {
            "success": False,
            "error": f"Network error: {e.reason}",
            "content": None,
            "fallback_available": False,
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Exception calling OpenRouter API: {str(e)}",
            "content": None,
            "fallback_available": False,
        }


def _call_openai_api(
    system_prompt: str,
    user_prompt: str,
    model: str = "gpt-4o-mini",
    timeout: int = OPENAI_API_TIMEOUT,
) -> Dict[str, Any]:
    """
    Call OpenAI API directly using requests (no SDK dependency).
    Requires OPENAI_API_KEY environment variable.
    """
    import urllib.request
    import urllib.error

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {
            "success": False,
            "error": "OPENAI_API_KEY not set. Add it to your environment variables.",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["codex"],
        }

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 1000,
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=timeout) as response:
            result = json.loads(response.read().decode("utf-8"))
            content = result["choices"][0]["message"]["content"]
            return {"success": True, "content": content, "error": None}

    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else str(e)
        return {
            "success": False,
            "error": f"OpenAI API error ({e.code}): {error_body}",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["codex"],
        }
    except urllib.error.URLError as e:
        return {
            "success": False,
            "error": f"Network error: {e.reason}",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["codex"],
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Exception calling OpenAI API: {str(e)}",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["codex"],
        }


def call_llm(
    system_prompt: str,
    user_prompt: str,
    provider: str = "openrouter",
    model: str = "default",
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    isolated: bool = False,
) -> Dict[str, Any]:
    """
    Centralized LLM Caller.

    Providers:
        - "openrouter": OpenRouter API (recommended, uses google/gemini-flash-1.5)
        - "openai": Direct OpenAI API (requires OPENAI_API_KEY)
        - "codex": Codex CLI (slower, uses ChatGPT account)

    Args:
        isolated: If True and using codex, run in empty temp directory.
                  If True and provider not specified, prefer openrouter for speed.

    Returns a dictionary:
    {
        "success": bool,
        "content": str (if success),
        "error": str (if failed),
        "fallback_available": bool,
        "fallback_models": List[str]
    }
    """

    # For isolated mode, prefer OpenRouter
    if isolated and provider == "codex":
        provider = "openrouter"
        model = "google/gemini-2.0-flash-001" if model == "default" else model

    if provider == "openrouter":
        actual_model = "google/gemini-2.0-flash-001" if model == "default" else model
        return _call_openrouter_api(
            system_prompt, user_prompt, model=actual_model, timeout=timeout
        )

    if provider == "openai":
        actual_model = "gpt-4o-mini" if model == "default" else model
        return _call_openai_api(
            system_prompt, user_prompt, model=actual_model, timeout=timeout
        )

    if provider == "codex":
        return _call_codex(system_prompt, user_prompt, timeout, isolated=isolated)

    return {
        "success": False,
        "error": f"Provider '{provider}' not implemented.",
        "content": None,
        "fallback_available": False,
        "fallback_models": [],
    }


def _call_codex(
    system_prompt: str, user_prompt: str, timeout: int, isolated: bool = False
) -> Dict[str, Any]:
    codex_cmd = find_codex_cli()
    if not codex_cmd:
        return {
            "success": False,
            "error": "Codex CLI not found. Please install: npm install -g @openai/codex",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["gpt-4o-mini", "gpt-4.1-mini", "openrouter/auto"],
        }

    # If isolated, run in empty temp directory (no file access)
    # Otherwise, run in repo root for full context
    if isolated:
        work_dir = tempfile.mkdtemp(prefix="codex_isolated_")
    else:
        work_dir = str(Path(__file__).parent.parent.resolve())

    full_prompt = f"""System: {system_prompt}

Human: {user_prompt}
"""

    try:
        # Create temp file for output
        fd, output_path = tempfile.mkstemp(suffix=".md", prefix="codex_resp_")
        os.close(fd)
        output_file = Path(output_path)

        # Build command args
        cmd_args = [
            codex_cmd,
            "exec",
            "--cd",
            work_dir,
            "--dangerously-bypass-approvals-and-sandbox",
            "--output-last-message",
            str(output_file),
        ]

        # Add skip-git-repo-check for isolated mode (temp directories are not git repos)
        if isolated:
            cmd_args.append("--skip-git-repo-check")

        cmd_args.append("-")  # stdin

        # subprocess.run with timeout
        process = subprocess.Popen(
            cmd_args,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        try:
            stdout, stderr = process.communicate(input=full_prompt, timeout=timeout)
        except subprocess.TimeoutExpired:
            process.kill()
            return {
                "success": False,
                "error": f"Codex timed out after {timeout} seconds.",
                "content": None,
                "fallback_available": True,
                "fallback_models": ["gpt-4o-mini", "gpt-4.1-mini", "openrouter/auto"],
            }

        if process.returncode != 0:
            return {
                "success": False,
                "error": f"Codex process failed: {stderr}",
                "content": None,
                "fallback_available": True,
                "fallback_models": ["gpt-4o-mini", "gpt-4.1-mini", "openrouter/auto"],
            }

        # Read output
        if output_file.exists():
            content = output_file.read_text(encoding="utf-8")
            try:
                os.remove(output_path)
            except:
                pass
            return {"success": True, "content": content, "error": None}
        else:
            return {
                "success": False,
                "error": "No output file created by Codex.",
                "content": None,
                "fallback_available": True,
                "fallback_models": ["gpt-4o-mini", "gpt-4.1-mini", "openrouter/auto"],
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Exception calling Codex: {str(e)}",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["gpt-4o-mini", "gpt-4.1-mini", "openrouter/auto"],
        }
