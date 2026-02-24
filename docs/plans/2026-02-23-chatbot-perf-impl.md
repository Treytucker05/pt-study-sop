# Chatbot Performance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce tutor chatbot response time from 4.5-9s to 1-2s actual, with streaming making it feel like <200ms to first token.

**Architecture:** Replace Codex CLI subprocess calls with direct OpenRouter HTTP API calls (saves 2-4s per turn). Add SSE streaming endpoint so tokens arrive immediately. Preload cross-encoder model at startup to eliminate 500ms cold start.

**Tech Stack:** Python `requests` (already in requirements.txt), Flask SSE `Response`, OpenRouter API v1, `sentence-transformers` CrossEncoder

---

## Current Flow (4.5-9s)

```
User question → Flask POST /chat/<id>
  → process_tutor_turn()
    → RAG search (0.5-1s)
    → call_llm(provider="codex")
      → _call_codex() — spawns Windows subprocess!
        → cmd.exe /c codex.cmd exec ... (~500ms spawn)
        → Node.js boot (~500ms-1s)
        → Codex CLI makes API call (~1-3s)
        → Write temp file, exit (~50ms)
      → Read temp file, return
    → Build response
  → log_tutor_turn() — SQLite INSERT (~5ms)
  → Return JSON
```

## Target Flow (1-2s, feels instant with streaming)

```
User question → Flask GET /chat/<id>/stream (SSE)
  → process_tutor_turn_stream()
    → RAG search (0.5-1s)
    → call_llm_stream(provider="openrouter")
      → _call_openrouter_stream() — direct HTTP with stream=True
        → First token arrives (~200ms after API call starts)
        → Yield SSE chunks as they arrive
    → log_tutor_turn() after stream completes
```

---

### Task 1: Add Direct OpenRouter API Provider to llm_provider.py

**Files:**
- Modify: `brain/llm_provider.py:78-100` (add new provider route + `_call_openrouter()` function)
- Test: `brain/tests/test_llm_provider_openrouter.py` (new)

**Step 1: Write the failing test**

Create `brain/tests/test_llm_provider_openrouter.py`:

```python
"""Tests for the direct OpenRouter API provider in llm_provider."""

import json
import llm_provider


class FakeResponse:
    """Mimics requests.Response for mocking."""

    def __init__(self, status_code: int, body: dict):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body


def test_call_openrouter_returns_content_on_success(monkeypatch):
    """Direct HTTP call returns LLM content without subprocess overhead."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")

    def fake_post(url, headers=None, json=None, timeout=None):
        assert "openrouter.ai" in url
        assert headers["Authorization"] == "Bearer sk-test-key-123"
        assert json["stream"] is False
        return FakeResponse(200, {
            "choices": [{"message": {"content": "The rotator cuff consists of four muscles."}}]
        })

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    result = llm_provider.call_llm("You are a tutor.", "What is the rotator cuff?", provider="openrouter")

    assert result["success"] is True
    assert "rotator cuff" in result["content"]
    assert result["error"] is None


def test_call_openrouter_returns_error_on_missing_api_key(monkeypatch):
    """Returns structured error when API key is not configured."""
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = llm_provider.call_llm("sys", "user", provider="openrouter")

    assert result["success"] is False
    assert "API key" in result["error"]


def test_call_openrouter_returns_error_on_api_failure(monkeypatch):
    """Returns structured error on non-200 API response."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")

    def fake_post(url, **kwargs):
        return FakeResponse(429, {"error": {"message": "Rate limited"}})

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    result = llm_provider.call_llm("sys", "user", provider="openrouter")

    assert result["success"] is False
    assert "Rate limited" in result["error"] or "429" in result["error"]


def test_call_openrouter_handles_timeout(monkeypatch):
    """Returns structured error on request timeout."""
    import requests as req_lib
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")

    def fake_post(url, **kwargs):
        raise req_lib.exceptions.Timeout("Connection timed out")

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    result = llm_provider.call_llm("sys", "user", provider="openrouter")

    assert result["success"] is False
    assert "timed out" in result["error"].lower()


def test_call_openrouter_uses_model_from_env(monkeypatch):
    """Uses model from OPENROUTER_MODEL env var when provided."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")
    monkeypatch.setenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")

    captured = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["model"] = json["model"]
        return FakeResponse(200, {
            "choices": [{"message": {"content": "Answer."}}]
        })

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    llm_provider.call_llm("sys", "user", provider="openrouter")

    assert captured["model"] == "google/gemini-2.5-flash"
```

**Step 2: Run test to verify it fails**

Run: `cd C:\pt-study-sop\brain && python -m pytest tests/test_llm_provider_openrouter.py -v`
Expected: FAIL — `_call_openrouter` not defined, `requests` not an attribute of `llm_provider`

**Step 3: Implement `_call_openrouter()` in llm_provider.py**

Add `import requests` at the top of `brain/llm_provider.py` (after existing imports, around line 13).

Add the new function after `_call_codex()` (after line 295):

```python
OPENROUTER_DEFAULT_MODEL = "openrouter/auto"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


def _resolve_api_config() -> tuple[str, str, str]:
    """Resolve API URL, key, and model from env vars.

    Returns: (api_url, api_key, model)
    """
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    model = os.environ.get("OPENROUTER_MODEL", "").strip() or OPENROUTER_DEFAULT_MODEL
    api_url = OPENROUTER_API_URL

    # Fallback to OpenAI direct if no OpenRouter key
    if not api_key:
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        api_url = OPENAI_API_URL
        if not model or model == OPENROUTER_DEFAULT_MODEL:
            model = "gpt-4o-mini"

    return api_url, api_key, model


def _call_openrouter(
    system_prompt: str,
    user_prompt: str,
    timeout: int = OPENAI_API_TIMEOUT,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """Direct HTTP API call to OpenRouter/OpenAI. No subprocess overhead."""
    api_url, api_key, default_model = _resolve_api_config()

    if not api_key:
        return {
            "success": False,
            "error": "API key not configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY.",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["codex"],
        }

    use_model = model if model and model != "default" else default_model

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if "openrouter" in api_url:
        headers["HTTP-Referer"] = "https://github.com/pt-study-brain"
        headers["X-Title"] = "PT Study Tutor"

    payload = {
        "model": use_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 1200,
        "stream": False,
    }

    try:
        t0 = time.time()
        resp = requests.post(api_url, headers=headers, json=payload, timeout=timeout)
        elapsed = time.time() - t0
        logger.info("OpenRouter API call took %.2fs (model=%s)", elapsed, use_model)

        if resp.status_code == 200:
            data = resp.json()
            content = data["choices"][0]["message"]["content"].strip()
            return {"success": True, "content": content, "error": None}
        else:
            try:
                err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
            except Exception:
                err_msg = f"HTTP {resp.status_code}"
            return {
                "success": False,
                "error": f"API error: {err_msg}",
                "content": None,
                "fallback_available": True,
                "fallback_models": ["codex"],
            }

    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": f"Request timed out after {timeout}s.",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["codex"],
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Network error: {e}",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["codex"],
        }
```

Then modify `call_llm()` (line 78-100) to add the new provider route:

```python
def call_llm(
    system_prompt: str,
    user_prompt: str,
    provider: str = "openrouter",  # Changed default from "codex"
    model: str = "default",
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    isolated: bool = False,
) -> Dict[str, Any]:
    """Centralized LLM caller. Routes to OpenRouter (default), Codex CLI, or Gemini CLI."""
    if _llm_blocked_in_test_mode():
        return {
            "success": False,
            "error": "LLM calls are disabled in pytest test mode.",
            "content": None,
            "fallback_available": False,
            "fallback_models": [],
        }

    if provider == "openrouter":
        or_model = None if model == "default" else model
        return _call_openrouter(system_prompt, user_prompt, timeout=timeout, model=or_model)

    if provider == "gemini":
        gem_model = None if model == "default" else model
        return _call_gemini(system_prompt, user_prompt, timeout=timeout, model=gem_model, isolated=isolated)

    return _call_codex(system_prompt, user_prompt, timeout, isolated=isolated)
```

**Step 4: Run tests to verify they pass**

Run: `cd C:\pt-study-sop\brain && python -m pytest tests/test_llm_provider_openrouter.py -v`
Expected: All 5 PASS

**Step 5: Update tutor_engine.py to use new provider**

In `brain/tutor_engine.py` line 644, change:
```python
# OLD:
llm_result = call_llm(system_prompt, full_user_prompt, provider="codex")
# NEW:
llm_result = call_llm(system_prompt, full_user_prompt, provider="openrouter")
```

Also update the error message at line 660:
```python
# OLD:
answer=f"**Codex Error**: {error_msg}\n\nPlease select a fallback model.",
# NEW:
answer=f"**LLM Error**: {error_msg}\n\nPlease check API key in Settings.",
```

**Step 6: Run existing tests to verify no regressions**

Run: `cd C:\pt-study-sop\brain && python -m pytest tests/ -v --timeout=30`
Expected: All existing tests PASS

**Step 7: Commit**

```bash
git add brain/llm_provider.py brain/tutor_engine.py brain/tests/test_llm_provider_openrouter.py
git commit -m "perf(tutor): replace Codex CLI subprocess with direct OpenRouter HTTP API

Eliminates 2-4s subprocess overhead per tutor turn by calling OpenRouter
API directly via requests.post instead of spawning codex.cmd subprocess.
Keeps _call_codex() as fallback provider."
```

---

### Task 2: Add SSE Streaming to Tutor Endpoint

**Files:**
- Modify: `brain/llm_provider.py` (add `_call_openrouter_stream()` generator)
- Modify: `brain/dashboard/api_adapter.py:3388` (add streaming endpoint)
- Test: `brain/tests/test_llm_provider_openrouter.py` (add streaming tests)

**Step 1: Write the failing test for streaming**

Append to `brain/tests/test_llm_provider_openrouter.py`:

```python
def test_call_openrouter_stream_yields_chunks(monkeypatch):
    """Streaming mode yields content chunks then a done sentinel."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")

    class FakeStreamResponse:
        status_code = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def iter_lines(self, decode_unicode=True):
            yield 'data: {"choices":[{"delta":{"content":"The "}}]}'
            yield 'data: {"choices":[{"delta":{"content":"rotator cuff"}}]}'
            yield 'data: {"choices":[{"delta":{"content":" has four muscles."}}]}'
            yield "data: [DONE]"

    def fake_post(url, headers=None, json=None, timeout=None, stream=None):
        assert json["stream"] is True
        assert stream is True
        return FakeStreamResponse()

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    chunks = list(llm_provider.call_llm_stream("You are a tutor.", "What is the rotator cuff?"))

    texts = [c["content"] for c in chunks if c["type"] == "delta"]
    assert "".join(texts) == "The rotator cuff has four muscles."
    assert chunks[-1]["type"] == "done"


def test_call_openrouter_stream_handles_error(monkeypatch):
    """Streaming yields error on API failure."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-key-123")

    class FakeErrorResponse:
        status_code = 500

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def json(self):
            return {"error": {"message": "Internal error"}}

    def fake_post(url, **kwargs):
        return FakeErrorResponse()

    monkeypatch.setattr(llm_provider.requests, "post", fake_post)

    chunks = list(llm_provider.call_llm_stream("sys", "user"))
    assert chunks[0]["type"] == "error"
```

**Step 2: Run test to verify it fails**

Run: `cd C:\pt-study-sop\brain && python -m pytest tests/test_llm_provider_openrouter.py::test_call_openrouter_stream_yields_chunks -v`
Expected: FAIL — `call_llm_stream` not defined

**Step 3: Implement streaming in llm_provider.py**

Add after `_call_openrouter()`:

```python
def _call_openrouter_stream(
    system_prompt: str,
    user_prompt: str,
    timeout: int = OPENAI_API_TIMEOUT,
    model: Optional[str] = None,
):
    """Stream OpenRouter API response. Yields dicts: {"type": "delta", "content": "..."} or {"type": "done"} or {"type": "error", "error": "..."}."""
    api_url, api_key, default_model = _resolve_api_config()

    if not api_key:
        yield {"type": "error", "error": "API key not configured."}
        return

    use_model = model if model and model != "default" else default_model

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if "openrouter" in api_url:
        headers["HTTP-Referer"] = "https://github.com/pt-study-brain"
        headers["X-Title"] = "PT Study Tutor"

    payload = {
        "model": use_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 1200,
        "stream": True,
    }

    try:
        resp = requests.post(
            api_url, headers=headers, json=payload, timeout=timeout, stream=True
        )

        if resp.status_code != 200:
            try:
                err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
            except Exception:
                err_msg = f"HTTP {resp.status_code}"
            yield {"type": "error", "error": err_msg}
            return

        for line in resp.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            chunk = line[6:]  # strip "data: " prefix
            if chunk == "[DONE]":
                yield {"type": "done"}
                return
            try:
                parsed = json.loads(chunk)
                delta = parsed.get("choices", [{}])[0].get("delta", {})
                content = delta.get("content", "")
                if content:
                    yield {"type": "delta", "content": content}
            except json.JSONDecodeError:
                continue

        yield {"type": "done"}

    except requests.exceptions.Timeout:
        yield {"type": "error", "error": f"Request timed out after {timeout}s."}
    except requests.exceptions.RequestException as e:
        yield {"type": "error", "error": f"Network error: {e}"}


def call_llm_stream(
    system_prompt: str,
    user_prompt: str,
    provider: str = "openrouter",
    model: str = "default",
    timeout: int = OPENAI_API_TIMEOUT,
):
    """Stream LLM response. Yields dicts with type: delta/done/error."""
    if _llm_blocked_in_test_mode():
        yield {"type": "error", "error": "LLM calls disabled in test mode."}
        return

    or_model = None if model == "default" else model
    yield from _call_openrouter_stream(system_prompt, user_prompt, timeout=timeout, model=or_model)
```

**Step 4: Run tests to verify they pass**

Run: `cd C:\pt-study-sop\brain && python -m pytest tests/test_llm_provider_openrouter.py -v`
Expected: All 7 tests PASS

**Step 5: Add SSE streaming endpoint to api_adapter.py**

After the existing `chat_message()` route (around line 3449), add:

```python
@adapter_bp.route("/chat/<session_id>/stream", methods=["POST"])
def chat_message_stream(session_id):
    """
    SSE streaming version of /chat/<session_id>.
    Returns text/event-stream with chunks as they arrive from the LLM.
    """
    from flask import Response

    try:
        import sys as _sys
        from pathlib import Path as _Path

        brain_dir = _Path(__file__).resolve().parent.parent
        if str(brain_dir) not in _sys.path:
            _sys.path.append(str(brain_dir))

        from brain.tutor_engine import (
            process_tutor_turn_preamble,
            log_tutor_turn,
        )
        from brain.tutor_api_types import TutorQueryV1, TutorSourceSelector
        from brain.llm_provider import call_llm_stream

        data = request.json
        user_message = data.get("content")

        if not user_message:
            return jsonify({"error": "Message content required"}), 400

        query = TutorQueryV1(
            user_id="user",
            session_id=str(session_id),
            course_id=None,
            topic_id=None,
            mode="Core",
            question=user_message,
            plan_snapshot_json="{}",
            sources=TutorSourceSelector(),
        )

        # Preamble: RAG search + prompt building (non-streaming)
        preamble = process_tutor_turn_preamble(query)
        if preamble.get("error"):
            return jsonify({"error": preamble["error"]}), 500

        system_prompt = preamble["system_prompt"]
        user_prompt = preamble["user_prompt"]
        rag_docs = preamble["rag_docs"]
        session = preamble["session"]

        def generate():
            full_answer = []
            for chunk in call_llm_stream(system_prompt, user_prompt):
                if chunk["type"] == "delta":
                    full_answer.append(chunk["content"])
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk["type"] == "error":
                    yield f"data: {json.dumps(chunk)}\n\n"
                    return
                elif chunk["type"] == "done":
                    # Log the complete turn
                    answer_text = "".join(full_answer)
                    unverified = len(rag_docs) == 0
                    if unverified and "[UNVERIFIED" not in answer_text:
                        answer_text = f"[UNVERIFIED - not backed by your course materials]\n\n{answer_text}"

                    session.add_turn("assistant", answer_text)
                    # Fire-and-forget log (don't block stream end)
                    try:
                        from brain.tutor_engine import log_tutor_turn
                        from brain.tutor_api_types import TutorTurnResponse
                        resp = TutorTurnResponse(
                            session_id=str(session_id),
                            answer=answer_text,
                            citations=[],
                            unverified=unverified,
                            summary_json="{}",
                        )
                        log_tutor_turn(query, resp)
                    except Exception:
                        pass  # Don't fail stream for logging errors

                    yield f"data: {json.dumps({'type': 'done', 'unverified': unverified})}\n\n"

        return Response(
            generate(),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    except Exception as e:
        print(f"Tutor Stream Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
```

**Step 6: Add `process_tutor_turn_preamble()` to tutor_engine.py**

This extracts the RAG + prompt-building steps from `process_tutor_turn()` so the streaming endpoint can reuse them. Add after `process_tutor_turn()` (after line 697):

```python
def process_tutor_turn_preamble(query: TutorQueryV1) -> dict:
    """
    Run the non-LLM parts of process_tutor_turn: session load, RAG search,
    prompt building. Returns dict with system_prompt, user_prompt, rag_docs,
    session, citations for the streaming endpoint to use.
    """
    try:
        session_id = query.session_id or str(uuid.uuid4())
        session = _get_or_create_session(session_id)
        session.add_turn("user", query.question)

        # 1. RAG search
        rag_docs = search_with_embeddings(
            query.question,
            corpuses=["study", "repo", "runtime"],
            k=MAX_RAG_RESULTS,
        )

        # 2. Build RAG context
        rag_context, citations = build_rag_context(rag_docs, MAX_CONTEXT_CHARS)

        # 3. Build prompts (same logic as process_tutor_turn lines 604-639)
        system_prompt = _build_system_prompt(query.mode)
        user_prompt_parts = []
        if rag_context:
            user_prompt_parts.append(f"## Relevant Context:\n{rag_context}")
        history_text = session.get_history_text(MAX_HISTORY_TURNS, MAX_HISTORY_CHARS_PER_TURN)
        if history_text:
            user_prompt_parts.append(f"## Conversation History:\n{history_text}")
        user_prompt_parts.append("")
        user_prompt_parts.append(f"## Current Question:\n{query.question}")
        full_user_prompt = "\n".join(user_prompt_parts)

        return {
            "system_prompt": system_prompt,
            "user_prompt": full_user_prompt,
            "rag_docs": rag_docs,
            "citations": citations,
            "session": session,
            "session_id": session_id,
            "error": None,
        }
    except Exception as e:
        return {"error": str(e)}
```

NOTE: This references `_build_system_prompt`, `_get_or_create_session`, `search_with_embeddings`, `build_rag_context` — all already exist in `tutor_engine.py`. If `_build_system_prompt` doesn't exist as a separate function, extract the system prompt building from `process_tutor_turn()` lines 598-603 into it.

**Step 7: Run all tests**

Run: `cd C:\pt-study-sop\brain && python -m pytest tests/ -v --timeout=30`
Expected: All PASS

**Step 8: Commit**

```bash
git add brain/llm_provider.py brain/tutor_engine.py brain/dashboard/api_adapter.py brain/tests/test_llm_provider_openrouter.py
git commit -m "feat(tutor): add SSE streaming endpoint for tutor chat

New /chat/<id>/stream endpoint returns text/event-stream with LLM
tokens as they arrive. Extracts process_tutor_turn_preamble() for
reuse between sync and streaming paths."
```

---

### Task 3: Preload Cross-Encoder Model at Startup

**Files:**
- Modify: `brain/tutor_rag.py:1168-1175` (add preload function)
- Modify: `brain/dashboard/api_adapter.py` (call preload at app startup)
- Test: `brain/tests/test_tutor_rag_preload.py` (new)

**Step 1: Write the failing test**

Create `brain/tests/test_tutor_rag_preload.py`:

```python
"""Tests for cross-encoder preloading."""

import tutor_rag


def test_preload_reranker_sets_global(monkeypatch):
    """preload_reranker() initializes the global _RERANKER so first call has no cold start."""
    # Reset global state
    monkeypatch.setattr(tutor_rag, "_RERANKER", None)

    class FakeCrossEncoder:
        def __init__(self, name):
            self.name = name

    monkeypatch.setattr(
        "tutor_rag.CrossEncoder" if hasattr(tutor_rag, "CrossEncoder") else "sentence_transformers.CrossEncoder",
        FakeCrossEncoder,
        raising=False,
    )

    # Mock the import inside _get_reranker
    import importlib
    original_import = __builtins__.__import__ if hasattr(__builtins__, '__import__') else __import__

    def mock_cross_encoder_import(name, *args, **kwargs):
        if name == "sentence_transformers":
            import types
            mod = types.ModuleType("sentence_transformers")
            mod.CrossEncoder = FakeCrossEncoder
            return mod
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr("builtins.__import__", mock_cross_encoder_import)

    tutor_rag.preload_reranker()

    assert tutor_rag._RERANKER is not None


def test_preload_reranker_is_idempotent(monkeypatch):
    """Calling preload_reranker twice doesn't reload the model."""
    class FakeCrossEncoder:
        def __init__(self, name):
            self.name = name

    sentinel = FakeCrossEncoder("already-loaded")
    monkeypatch.setattr(tutor_rag, "_RERANKER", sentinel)

    tutor_rag.preload_reranker()

    assert tutor_rag._RERANKER is sentinel  # Same object, not reloaded
```

**Step 2: Run test to verify it fails**

Run: `cd C:\pt-study-sop\brain && python -m pytest tests/test_tutor_rag_preload.py -v`
Expected: FAIL — `preload_reranker` not defined

**Step 3: Add `preload_reranker()` to tutor_rag.py**

After `_get_reranker()` (line 1175), add:

```python
def preload_reranker() -> None:
    """Pre-initialize the cross-encoder model to avoid 500ms cold start on first query.

    Safe to call multiple times — only loads once.
    Call this during app startup (e.g., in Flask app factory or gunicorn post_fork).
    """
    if _RERANKER is not None:
        return
    try:
        _get_reranker()
        logger.info("Cross-encoder reranker preloaded successfully.")
    except Exception as e:
        logger.warning("Failed to preload cross-encoder: %s", e)
```

**Step 4: Wire preload into Flask app startup**

In `brain/dashboard/api_adapter.py`, find the app initialization section and add:

```python
# Near the top of the file or in a setup function, after blueprint registration:
def _preload_models():
    """Preload ML models in background thread to avoid cold-start latency."""
    import threading

    def _load():
        try:
            from brain.tutor_rag import preload_reranker
            preload_reranker()
        except Exception:
            pass  # Non-fatal: model loads lazily on first use as fallback

    threading.Thread(target=_load, daemon=True, name="model-preload").start()
```

Call `_preload_models()` from the app factory or after the blueprint is registered.

**Step 5: Run all tests**

Run: `cd C:\pt-study-sop\brain && python -m pytest tests/ -v --timeout=30`
Expected: All PASS

**Step 6: Commit**

```bash
git add brain/tutor_rag.py brain/dashboard/api_adapter.py brain/tests/test_tutor_rag_preload.py
git commit -m "perf(rag): preload cross-encoder model at startup

Eliminates ~500ms cold start on first tutor query by loading
ms-marco-TinyBERT-L-2-v2 in a background thread during Flask startup."
```

---

### Task 4: Integration Verification

**Step 1: Manual smoke test — non-streaming path**

Start the Flask dev server and test the existing `/chat/<id>` endpoint:

```bash
cd C:\pt-study-sop\brain
python -m dashboard.app
```

Then in another terminal:
```bash
curl -X POST http://localhost:5000/chat/test-session \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"What muscles make up the rotator cuff?\"}"
```

Expected: JSON response in ~1-3s (down from 4.5-9s)

**Step 2: Manual smoke test — streaming path**

```bash
curl -N -X POST http://localhost:5000/chat/test-session/stream \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"What muscles make up the rotator cuff?\"}"
```

Expected: SSE chunks arrive within ~200ms of the request, full response in 1-3s total.

**Step 3: Run full test suite**

```bash
cd C:\pt-study-sop\brain && python -m pytest tests/ -v --timeout=30
```

Expected: All PASS

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify chatbot performance optimization end-to-end"
```

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `brain/llm_provider.py` | Add `_call_openrouter()`, `_call_openrouter_stream()`, `call_llm_stream()` | -2-4s per turn |
| `brain/llm_provider.py` | Change `call_llm()` default provider to `"openrouter"` | Route change |
| `brain/tutor_engine.py` | Change `provider="codex"` → `"openrouter"` at line 644 | Wire new provider |
| `brain/tutor_engine.py` | Add `process_tutor_turn_preamble()` | Reusable for streaming |
| `brain/dashboard/api_adapter.py` | Add `/chat/<id>/stream` SSE endpoint | Streaming support |
| `brain/dashboard/api_adapter.py` | Add `_preload_models()` at startup | -500ms cold start |
| `brain/tutor_rag.py` | Add `preload_reranker()` | Warmup function |
| `brain/tests/test_llm_provider_openrouter.py` | New: 7 tests for direct API + streaming | Test coverage |
| `brain/tests/test_tutor_rag_preload.py` | New: 2 tests for preloading | Test coverage |

**Expected Performance:**
- Non-streaming: 4.5-9s → **1-3s**
- Streaming: first token in **~200ms**, full response in 1-3s
- Cold start: -500ms on first query
