import os
import sys
import json
import time
import subprocess
import tempfile
import shutil
import http.client
import ssl
import uuid as _uuid
from pathlib import Path
from typing import Dict, Any, Optional, List, Union

# Load .env into environment (no-op if not present)
from config import load_env

load_env()

# Configuration
DEFAULT_TIMEOUT_SECONDS = 60
OPENAI_API_TIMEOUT = 30


def _llm_blocked_in_test_mode() -> bool:
    """
    Prevent external LLM/Codex subprocess calls during pytest runs unless explicitly allowed.
    """
    allow_in_tests = os.environ.get("PT_ALLOW_LLM_IN_TESTS", "").strip().lower()
    if allow_in_tests in {"1", "true", "yes", "on"}:
        return False
    return bool(os.environ.get("PYTEST_CURRENT_TEST"))


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


def call_llm(
    system_prompt: str,
    user_prompt: str,
    provider: str = "codex",
    model: str = "default",
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    isolated: bool = False,
) -> Dict[str, Any]:
    """Centralized LLM caller. All calls route through Codex CLI."""
    if _llm_blocked_in_test_mode():
        return {
            "success": False,
            "error": "LLM calls are disabled in pytest test mode.",
            "content": None,
            "fallback_available": False,
            "fallback_models": [],
        }

    return _call_codex(system_prompt, user_prompt, timeout, isolated=isolated)


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
            "fallback_models": ["codex"],
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
        cmd_prefix: list[str]
        if os.name == "nt" and Path(codex_cmd).suffix.lower() in (".cmd", ".bat"):
            cmd_prefix = ["cmd.exe", "/c", codex_cmd]
        else:
            cmd_prefix = [codex_cmd]

        cmd_args = cmd_prefix + [
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

        print("MODEL_PROVIDER=CODEX_CLI")
        print("MODEL_COMMAND=" + " ".join(cmd_args))

        result = subprocess.run(
            cmd_args,
            input=full_prompt,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )

        stdout = result.stdout or ""
        stderr = result.stderr or ""

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Codex process failed: {stderr}",
                "content": None,
                "fallback_available": True,
                "fallback_models": ["codex"],
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
                "fallback_models": ["codex"],
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": f"Codex timed out after {timeout} seconds.",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["codex"],
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Exception calling Codex: {str(e)}",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["codex"],
        }


def model_call(
    system_prompt: str,
    user_prompt: str,
    provider: str = "codex",
    model: str = "default",
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    isolated: bool = False,
) -> Dict[str, Any]:
    """Shared model call alias used by runtime paths."""
    return call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        provider=provider,
        model=model,
        timeout=timeout,
        isolated=isolated,
    )


def _codex_exec_json(
    prompt: str,
    *,
    model: Optional[str] = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    isolated: bool = True,
) -> Dict[str, Any]:
    """
    Run `codex exec` in JSON event mode and return the final agent message.

    This is intended for "chat"-style usage inside the dashboard where we want:
      - No API key management (uses `codex login` state, e.g. ChatGPT login)
      - Safety defaults (no writes; no untrusted shell commands)
      - A simple string response for downstream SSE formatting

    Notes:
      - Uses `-a untrusted` + `--sandbox read-only`.
      - Uses `--ephemeral` to avoid persisting sessions to disk.
    """
    codex_cmd = find_codex_cli()
    if not codex_cmd:
        return {
            "success": False,
            "error": "Codex CLI not found. Install: npm install -g @openai/codex",
            "content": None,
        }

    # If isolated, run in an empty temp directory (avoid repo file reads by default).
    # Otherwise, run in repo root for full context.
    work_dir = (
        tempfile.mkdtemp(prefix="codex_isolated_")
        if isolated
        else str(Path(__file__).parent.parent.resolve())
    )

    # Windows: if `codex_cmd` is a .cmd/.bat shim, execute via cmd.exe explicitly.
    cmd_prefix: list[str]
    if os.name == "nt" and Path(codex_cmd).suffix.lower() in (".cmd", ".bat"):
        cmd_prefix = ["cmd.exe", "/c", codex_cmd]
    else:
        cmd_prefix = [codex_cmd]

    cmd_args: list[str] = [
        "-a",
        "untrusted",
        "exec",
        "--sandbox",
        "read-only",
        "--json",
        "--ephemeral",
        "--cd",
        work_dir,
    ]

    cmd_args = cmd_prefix + cmd_args

    if isolated:
        cmd_args.append("--skip-git-repo-check")

    if model and isinstance(model, str) and model.strip():
        cmd_args.extend(["--model", model.strip()])

    cmd_args.append("-")  # stdin prompt

    # Write prompt to temp file to avoid Windows cmd.exe encoding issues
    prompt_file = tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", encoding="utf-8", delete=False
    )
    prompt_file.write(prompt)
    prompt_file.close()

    try:
        with open(prompt_file.name, "rb") as prompt_stdin:
            result = subprocess.run(
                cmd_args,
                stdin=prompt_stdin,
                capture_output=True,
                timeout=timeout,
            )
        stdout_text = (
            result.stdout.decode("utf-8", errors="replace") if result.stdout else ""
        )
        stderr_text = (
            result.stderr.decode("utf-8", errors="replace") if result.stderr else ""
        )
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": f"Codex timed out after {timeout} seconds.",
            "content": None,
        }
    finally:
        if isolated:
            shutil.rmtree(work_dir, ignore_errors=True)
        try:
            os.remove(prompt_file.name)
        except OSError:
            pass

    if result.returncode != 0:
        err = stderr_text.strip() or stdout_text.strip()
        return {
            "success": False,
            "error": f"Codex process failed: {err}" if err else "Codex process failed.",
            "content": None,
        }

    agent_messages: list[str] = []
    usage: Optional[dict] = None

    for raw in stdout_text.splitlines():
        raw = raw.strip()
        if not raw:
            continue
        try:
            evt = json.loads(raw)
        except json.JSONDecodeError:
            continue

        if evt.get("type") == "item.completed":
            item = evt.get("item") or {}
            if item.get("type") == "agent_message":
                text = (item.get("text") or "").strip()
                if text:
                    agent_messages.append(text)

        if evt.get("type") == "turn.completed":
            usage = evt.get("usage")

    content = "\n\n".join(agent_messages).strip()
    if not content:
        return {
            "success": False,
            "error": "Codex returned no agent_message in JSON output.",
            "content": None,
            "usage": usage,
        }

    return {"success": True, "content": content, "error": None, "usage": usage}


def call_codex_json(
    system_prompt: str,
    user_prompt: str,
    *,
    model: Optional[str] = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    isolated: bool = True,
) -> Dict[str, Any]:
    """
    Convenience wrapper for `_codex_exec_json` using a system+user prompt format.

    This does not require an API key. It relies on `codex login` state.
    """
    full_prompt = f"""System: {system_prompt}

User: {user_prompt}
"""
    return _codex_exec_json(
        full_prompt,
        model=model,
        timeout=timeout,
        isolated=isolated,
    )


# ---------------------------------------------------------------------------
# ChatGPT Backend API (direct -- bypasses Codex CLI for speed)
# ---------------------------------------------------------------------------

_CHATGPT_BASE = "chatgpt.com"
_CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
_TOKEN_URL_HOST = "auth.openai.com"
_TOKEN_URL_PATH = "/oauth/token"
_AUTH_CACHE: Dict[str, Any] = {}


def _load_codex_auth() -> Optional[Dict[str, str]]:
    """Load and auto-refresh tokens from ~/.codex/auth.json."""
    if _AUTH_CACHE.get("access_token") and _AUTH_CACHE.get("account_id"):
        return {
            "access_token": _AUTH_CACHE["access_token"],
            "account_id": _AUTH_CACHE["account_id"],
        }

    auth_path = Path.home() / ".codex" / "auth.json"
    if not auth_path.exists():
        return None

    try:
        data = json.loads(auth_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None

    # Tokens may be nested under a "tokens" key (Codex CLI OAuth format)
    tokens = data.get("tokens", {})
    access_token = (
        data.get("access_token") or tokens.get("access_token") or data.get("token")
    )
    refresh_token = data.get("refresh_token") or tokens.get("refresh_token")
    account_id = data.get("account_id") or tokens.get("account_id")

    if not access_token:
        return None

    # Extract account_id from JWT if not stored
    if not account_id:
        try:
            import base64

            parts = access_token.split(".")
            if len(parts) >= 2:
                payload = parts[1] + "=" * (4 - len(parts[1]) % 4)
                claims = json.loads(base64.urlsafe_b64decode(payload))
                account_id = claims.get("https://api.openai.com/auth", {}).get(
                    "account_id"
                ) or claims.get("account_id")
        except Exception:
            pass

    # Check expiry and refresh if needed
    try:
        import base64

        parts = access_token.split(".")
        if len(parts) >= 2:
            payload = parts[1] + "=" * (4 - len(parts[1]) % 4)
            claims = json.loads(base64.urlsafe_b64decode(payload))
            exp = claims.get("exp", 0)
            if exp and time.time() > exp - 60:
                refreshed = (
                    _refresh_codex_token(refresh_token) if refresh_token else None
                )
                if refreshed:
                    access_token = refreshed["access_token"]
                    if refreshed.get("account_id"):
                        account_id = refreshed["account_id"]
    except Exception:
        pass

    _AUTH_CACHE["access_token"] = access_token
    _AUTH_CACHE["account_id"] = account_id or ""

    return {"access_token": access_token, "account_id": account_id or ""}


def _refresh_codex_token(refresh_token: str) -> Optional[Dict[str, str]]:
    """Refresh OAuth token via auth.openai.com."""
    try:
        body = json.dumps(
            {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": _CODEX_CLIENT_ID,
            }
        )
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection(_TOKEN_URL_HOST, context=ctx, timeout=10)
        conn.request(
            "POST",
            _TOKEN_URL_PATH,
            body=body,
            headers={
                "Content-Type": "application/json",
            },
        )
        resp = conn.getresponse()
        if resp.status == 200:
            data = json.loads(resp.read().decode("utf-8"))
            new_token = data.get("access_token")
            if new_token:
                _AUTH_CACHE["access_token"] = new_token
                auth_path = Path.home() / ".codex" / "auth.json"
                try:
                    stored = json.loads(auth_path.read_text(encoding="utf-8"))
                    stored["access_token"] = new_token
                    if data.get("refresh_token"):
                        stored["refresh_token"] = data["refresh_token"]
                    auth_path.write_text(json.dumps(stored, indent=2), encoding="utf-8")
                except Exception:
                    pass
                return {
                    "access_token": new_token,
                    "account_id": _AUTH_CACHE.get("account_id", ""),
                }
        conn.close()
    except Exception:
        pass
    return None


def _extract_url_citations(response_obj: dict) -> list[dict]:
    """Extract URL citations from a Responses API response.completed object."""
    citations = []
    seen_urls = set()
    for output_item in response_obj.get("output", []):
        for content_item in output_item.get("content", []):
            for ann in content_item.get("annotations", []):
                if ann.get("type") == "url_citation":
                    url = ann.get("url", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        citations.append(
                            {
                                "url": url,
                                "title": ann.get("title", ""),
                                "index": len(citations) + 1,
                            }
                        )
    return citations


def call_chatgpt_responses(
    system_prompt: str,
    user_prompt: str,
    *,
    model: str = "gpt-5.1",
    timeout: int = 120,
    web_search: bool = False,
) -> Dict[str, Any]:
    """
    Synchronous call to ChatGPT backend API (chatgpt.com/backend-api/codex/responses).
    Returns same shape as call_codex_json: {success, content, error, usage}.
    """
    auth = _load_codex_auth()
    if not auth:
        return {
            "success": False,
            "error": "No Codex auth tokens found (~/.codex/auth.json)",
            "content": None,
        }

    payload: dict = {
        "model": model,
        "instructions": system_prompt,
        "input": [{"role": "user", "content": user_prompt}],
        "store": False,
        "stream": True,
        "text": {"verbosity": "low"},
    }
    if web_search:
        payload["tools"] = [{"type": "web_search", "search_context_size": "low"}]

    body = json.dumps(payload)

    headers = {
        "Authorization": f"Bearer {auth['access_token']}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "OpenAI-Beta": "responses=experimental",
        "originator": "codex_cli_rs",
        "x-request-id": f"req-{_uuid.uuid4().hex[:12]}",
    }
    if auth.get("account_id"):
        headers["chatgpt-account-id"] = auth["account_id"]

    try:
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection(_CHATGPT_BASE, context=ctx, timeout=timeout)
        conn.request("POST", "/backend-api/codex/responses", body=body, headers=headers)
        resp = conn.getresponse()

        if resp.status != 200:
            err_body = resp.read().decode("utf-8", errors="replace")[:500]
            return {
                "success": False,
                "error": f"ChatGPT API {resp.status}: {err_body}",
                "content": None,
            }

        full_text = ""
        usage = None

        while True:
            line = resp.readline()
            if not line:
                break
            line = line.decode("utf-8", errors="replace").strip()
            if not line.startswith("data: "):
                continue
            data_str = line[6:]
            if data_str == "[DONE]":
                break
            try:
                evt = json.loads(data_str)
            except json.JSONDecodeError:
                continue

            evt_type = evt.get("type", "")
            if evt_type == "response.output_text.delta":
                full_text += evt.get("delta", "")
            elif evt_type == "response.completed":
                r = evt.get("response", {})
                usage = r.get("usage")

        conn.close()

        if not full_text.strip():
            return {
                "success": False,
                "error": "ChatGPT API returned empty response",
                "content": None,
                "usage": usage,
            }

        return {
            "success": True,
            "content": full_text.strip(),
            "error": None,
            "usage": usage,
        }

    except Exception as e:
        return {"success": False, "error": f"ChatGPT API error: {e}", "content": None}


def stream_chatgpt_responses(
    system_prompt: str,
    user_prompt: str,
    *,
    model: str = "gpt-5.3-codex-spark",
    timeout: int = 120,
    web_search: bool = False,
    tools: list[dict] | None = None,
    previous_response_id: str | None = None,
    input_override: list[dict] | None = None,
    reasoning_effort: str | None = None,
):
    """
    Streaming generator for ChatGPT backend API.
    Yields dicts: {"type": "delta", "text": "..."} or {"type": "done", "usage": {...}}
    or {"type": "error", "error": "..."}.
    When web_search=True, also yields {"type": "web_search", "status": "searching"|"completed"}.
    When tools are provided, also yields {"type": "tool_call", "name": ..., "arguments": ..., "call_id": ...}.
    URL citations are included in the "done" dict as "url_citations".
    """
    auth = _load_codex_auth()
    if not auth:
        yield {
            "type": "error",
            "error": "No Codex auth tokens found (~/.codex/auth.json)",
        }
        return

    verbosity = "medium" if "codex" in model.lower() else "low"
    payload: dict = {
        "model": model,
        "instructions": system_prompt,
        "input": input_override or [{"role": "user", "content": user_prompt}],
        "store": True,
        "stream": True,
        "text": {"verbosity": verbosity},
    }
    if reasoning_effort:
        payload["reasoning"] = {"effort": reasoning_effort}
    if previous_response_id:
        payload["previous_response_id"] = previous_response_id

    all_tools: list[dict] = []
    if web_search:
        all_tools.append({"type": "web_search", "search_context_size": "low"})
    if tools:
        all_tools.extend(tools)
    if all_tools:
        payload["tools"] = all_tools

    body = json.dumps(payload)

    headers = {
        "Authorization": f"Bearer {auth['access_token']}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "OpenAI-Beta": "responses=experimental",
        "originator": "codex_cli_rs",
        "x-request-id": f"req-{_uuid.uuid4().hex[:12]}",
    }
    if auth.get("account_id"):
        headers["chatgpt-account-id"] = auth["account_id"]

    try:
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection(_CHATGPT_BASE, context=ctx, timeout=timeout)
        conn.request("POST", "/backend-api/codex/responses", body=body, headers=headers)
        resp = conn.getresponse()

        if resp.status != 200:
            err_body = resp.read().decode("utf-8", errors="replace")[:500]
            yield {"type": "error", "error": f"ChatGPT API {resp.status}: {err_body}"}
            return

        usage = None
        model_id = None
        url_citations: list = []
        response_id = ""
        thread_id = ""

        while True:
            line = resp.readline()
            if not line:
                break
            line = line.decode("utf-8", errors="replace").strip()
            if not line.startswith("data: "):
                continue
            data_str = line[6:]
            if data_str == "[DONE]":
                break
            try:
                evt = json.loads(data_str)
            except json.JSONDecodeError:
                continue

            evt_type = evt.get("type", "")
            if evt_type == "response.output_text.delta":
                delta = evt.get("delta", "")
                if delta:
                    yield {"type": "delta", "text": delta}
            elif evt_type in (
                "response.web_search_call.in_progress",
                "response.web_search_call.searching",
            ):
                yield {"type": "web_search", "status": "searching"}
            elif evt_type == "response.web_search_call.completed":
                yield {"type": "web_search", "status": "completed"}
            elif evt_type == "response.function_call_arguments.done":
                yield {
                    "type": "tool_call",
                    "name": evt.get("name", ""),
                    "arguments": evt.get("arguments", "{}"),
                    "call_id": evt.get("call_id", evt.get("item_id", "")),
                }
            elif evt_type == "response.completed":
                r = evt.get("response", {})
                usage = r.get("usage")
                model_id = r.get("model")
                response_id = r.get("id", "")
                thread_id = (
                    r.get("thread_id")
                    or r.get("conversation_id")
                    or thread_id
                )
                url_citations = _extract_url_citations(r)

                for output_item in r.get("output", []):
                    if output_item.get("type") == "function_call":
                        yield {
                            "type": "tool_call",
                            "name": output_item.get("name", ""),
                            "arguments": output_item.get("arguments", "{}"),
                            "call_id": output_item.get(
                                "call_id", output_item.get("id", "")
                            ),
                        }

        conn.close()
        done_payload: dict = {"type": "done", "usage": usage, "model": model_id}
        if url_citations:
            done_payload["url_citations"] = url_citations
        if response_id:
            done_payload["response_id"] = response_id
        if thread_id:
            done_payload["thread_id"] = thread_id
        yield done_payload

    except Exception as e:
        yield {"type": "error", "error": f"ChatGPT API error: {e}"}
