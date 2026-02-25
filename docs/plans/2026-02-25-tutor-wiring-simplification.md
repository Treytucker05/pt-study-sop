# Tutor Wiring Simplification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the tutor's scattered, partially-broken retrieval pipeline with a unified `build_context()` function that is faster, simpler, and actually works for all three context sources (materials, instructions, notes).

**Architecture:** Single entry point `build_context(query, depth)` in a new `brain/tutor_context.py` module. Materials stay on ChromaDB (14,583 vectors, working). Instructions switch to direct YAML file read (no embedding). Notes switch to Obsidian REST `/search/` API (real-time, no stale collection). Reranker and escalation logic are deleted. Course map is always-on context (~3KB YAML injected into every prompt).

**Tech Stack:** Python 3.14, Flask, ChromaDB, OpenAI embeddings (text-embedding-3-small), Obsidian Local REST API, PyYAML

**Worktree:** `inspiring-shannon` (branch from main)

---

## Phase 1: Foundation — `build_context()` Module

### Task 1: Create `brain/tutor_context.py` with stub + test

**Files:**
- Create: `brain/tutor_context.py`
- Create: `brain/tests/test_tutor_context.py`

**Step 1: Write the failing test**

```python
# brain/tests/test_tutor_context.py
"""Tests for unified tutor context builder."""
import pytest

def test_build_context_returns_dict_with_required_keys():
    from tutor_context import build_context
    result = build_context("What is the brachial plexus?", depth="auto")
    assert isinstance(result, dict)
    assert "materials" in result
    assert "instructions" in result
    assert "notes" in result
    assert "course_map" in result
    assert "debug" in result

def test_build_context_depth_none_skips_all_retrieval():
    from tutor_context import build_context
    result = build_context("Hello", depth="none")
    assert result["materials"] == ""
    assert result["notes"] == ""
    # course_map is always-on even with depth=none
    assert result["course_map"] != ""
```

**Step 2: Run test to verify it fails**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_tutor_context.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'tutor_context'`

**Step 3: Write minimal implementation**

```python
# brain/tutor_context.py
"""Unified context builder for the Adaptive Tutor.

Single entry point replacing scattered retrieval logic in api_tutor.py.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Literal, Optional

import yaml

logger = logging.getLogger(__name__)

_COURSE_MAP_PATH = Path(__file__).parent / "data" / "vault_courses.yaml"
_course_map_cache: str = ""


def _load_course_map() -> str:
    """Load vault_courses.yaml once, cache in module."""
    global _course_map_cache
    if _course_map_cache:
        return _course_map_cache
    try:
        with open(_COURSE_MAP_PATH, "r", encoding="utf-8") as f:
            _course_map_cache = f.read()
    except Exception as e:
        logger.warning("Failed to load course map: %s", e)
        _course_map_cache = ""
    return _course_map_cache


ContextDepth = Literal["auto", "none", "notes", "materials"]


def build_context(
    query: str,
    *,
    depth: ContextDepth = "auto",
    course_id: Optional[int] = None,
    material_ids: Optional[list[int]] = None,
    module_prefix: Optional[str] = None,
    k_materials: int = 6,
) -> dict[str, Any]:
    """Build all context for a tutor turn in one call.

    Args:
        query: The student's question.
        depth: Controls which retrieval sources fire.
            - "auto": materials + notes (default)
            - "none": skip all retrieval (simple follow-ups)
            - "notes": only Obsidian notes
            - "materials": only ChromaDB materials
        course_id: Filter materials to a specific course.
        material_ids: Explicit material selection (overrides course_id).
        module_prefix: Obsidian folder prefix for note scoping.
        k_materials: Number of material chunks to retrieve.

    Returns:
        dict with keys: materials, instructions, notes, course_map, debug
    """
    debug: dict[str, Any] = {"depth": depth}
    result: dict[str, Any] = {
        "materials": "",
        "instructions": "",
        "notes": "",
        "course_map": _load_course_map(),
        "debug": debug,
    }

    if depth == "none":
        return result

    # Materials (ChromaDB vector search)
    if depth in ("auto", "materials"):
        result["materials"] = _fetch_materials(
            query,
            course_id=course_id,
            material_ids=material_ids,
            k=k_materials,
            debug=debug,
        )

    # Notes (Obsidian REST API /search/)
    if depth in ("auto", "notes"):
        result["notes"] = _fetch_notes(
            query,
            module_prefix=module_prefix,
            debug=debug,
        )

    # Instructions: always loaded from active method YAML (no retrieval)
    # Populated by caller from block_info — this module doesn't own it.

    return result


def _fetch_materials(
    query: str,
    *,
    course_id: Optional[int] = None,
    material_ids: Optional[list[int]] = None,
    k: int = 6,
    debug: dict[str, Any],
) -> str:
    """Search ChromaDB materials collection."""
    try:
        from tutor_rag import search_with_embeddings, COLLECTION_MATERIALS
        docs = search_with_embeddings(
            query,
            course_id=course_id,
            material_ids=material_ids,
            collection_name=COLLECTION_MATERIALS,
            k=k,
            debug=debug.setdefault("materials_debug", {}),
        )
        if not docs:
            return ""
        return "\n\n---\n\n".join(
            getattr(d, "page_content", str(d)) for d in docs
        )
    except Exception as e:
        logger.warning("Material retrieval failed: %s", e)
        debug["materials_error"] = str(e)
        return ""


def _fetch_notes(
    query: str,
    *,
    module_prefix: Optional[str] = None,
    debug: dict[str, Any],
) -> str:
    """Search Obsidian vault via REST API /search/ endpoint."""
    try:
        from obsidian_client import ObsidianClient
        client = ObsidianClient()
        hits = client.search(query, max_results=5)
        debug["notes_hits"] = len(hits)

        if module_prefix:
            prefix = module_prefix.replace("\\", "/").lower()
            prioritized = sorted(
                hits,
                key=lambda h: (0 if h.get("path", "").lower().startswith(prefix) else 1),
            )
            hits = prioritized

        parts = []
        for hit in hits[:5]:
            path = hit.get("path", "unknown")
            content = hit.get("content", "")
            if content:
                parts.append(f"### {path}\n{content[:2000]}")
        return "\n\n".join(parts)
    except Exception as e:
        logger.warning("Notes retrieval failed: %s", e)
        debug["notes_error"] = str(e)
        return ""
```

**Step 4: Run test to verify it passes**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_tutor_context.py -v`
Expected: PASS (both tests)

**Step 5: Commit**

```bash
git add brain/tutor_context.py brain/tests/test_tutor_context.py
git commit -m "feat(tutor): add unified build_context() module with tests"
```

---

### Task 2: Create `brain/obsidian_client.py` — unified Obsidian HTTP client

**Files:**
- Create: `brain/obsidian_client.py`
- Create: `brain/tests/test_obsidian_client.py`

**Step 1: Write the failing test**

```python
# brain/tests/test_obsidian_client.py
"""Tests for unified ObsidianClient."""
import pytest
from unittest.mock import patch, MagicMock

def test_obsidian_client_search_returns_list():
    from obsidian_client import ObsidianClient
    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    # Mock the HTTP call
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = [
            {"filename": "note.md", "score": 0.9, "matches": [{"match": {"content": "test content"}}]}
        ]
        results = client.search("brachial plexus", max_results=5)
    assert isinstance(results, list)
    assert len(results) == 1
    assert results[0]["path"] == "note.md"

def test_obsidian_client_read_note_returns_content():
    from obsidian_client import ObsidianClient
    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = "# My Note\nSome content here."
        content = client.read_note("folder/note.md")
    assert "Some content here" in content

def test_obsidian_client_list_folder_returns_files():
    from obsidian_client import ObsidianClient
    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = {"files": ["a.md", "b.md"]}
        files = client.list_folder("/")
    assert isinstance(files, list)
```

**Step 2: Run test to verify it fails**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_obsidian_client.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'obsidian_client'`

**Step 3: Write minimal implementation**

```python
# brain/obsidian_client.py
"""Unified Obsidian Local REST API client.

Replaces transport duplication across obsidian_index.py, api_adapter.py,
and obsidian_merge.py with a single, testable HTTP client.
"""
from __future__ import annotations

import json
import logging
import os
import ssl
import urllib.error
import urllib.request
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _read_env_key(key: str) -> str:
    """Read from os.environ, fallback to brain/.env."""
    value = os.environ.get(key, "").strip()
    if value:
        return value
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return ""
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if k.strip() == key:
                    return v.strip().strip('"').strip("'")
    except Exception:
        pass
    return ""


class ObsidianClient:
    """HTTP client for the Obsidian Local REST API plugin."""

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 10,
    ):
        self.api_key = api_key or _read_env_key("OBSIDIAN_API_KEY")
        self.base_url = (base_url or _read_env_key("OBSIDIAN_API_URL") or "https://127.0.0.1:27124").rstrip("/")
        self.timeout = timeout
        self._ssl_ctx = ssl.create_default_context()
        self._ssl_ctx.check_hostname = False
        self._ssl_ctx.verify_mode = ssl.CERT_NONE

    def _request(
        self,
        method: str,
        path: str,
        *,
        data: Optional[dict | str] = None,
        accept: str = "application/json",
    ) -> Any:
        """Make an HTTP request to Obsidian REST API."""
        url = f"{self.base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": accept,
        }

        body = None
        if data is not None:
            if isinstance(data, dict):
                body = json.dumps(data).encode("utf-8")
                headers["Content-Type"] = "application/json"
            else:
                body = data.encode("utf-8")
                headers["Content-Type"] = "text/plain"

        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout, context=self._ssl_ctx) as resp:
                raw = resp.read().decode("utf-8")
                content_type = resp.headers.get("Content-Type", "")
                if "application/json" in content_type:
                    return json.loads(raw)
                return raw
        except urllib.error.HTTPError as e:
            logger.warning("Obsidian API %s %s → %d", method, path, e.code)
            raise
        except urllib.error.URLError as e:
            logger.warning("Obsidian API unreachable: %s", e.reason)
            raise

    def search(self, query: str, *, max_results: int = 10) -> list[dict]:
        """Search vault using POST /search/simple/."""
        try:
            raw = self._request("POST", "/search/simple/", data=query, accept="application/json")
            if not isinstance(raw, list):
                return []
            results = []
            for item in raw[:max_results]:
                filename = item.get("filename", "")
                matches = item.get("matches", [])
                content_parts = []
                for m in matches:
                    match_data = m.get("match", m.get("matches", {}))
                    if isinstance(match_data, dict):
                        content_parts.append(match_data.get("content", ""))
                    elif isinstance(match_data, str):
                        content_parts.append(match_data)
                results.append({
                    "path": filename,
                    "content": "\n".join(p for p in content_parts if p),
                    "score": item.get("score", 0),
                })
            return results
        except Exception as e:
            logger.warning("Obsidian search failed: %s", e)
            return []

    def read_note(self, path: str) -> str:
        """Read a single note's content via GET /vault/{path}."""
        encoded = urllib.request.pathname2url(path)
        try:
            return self._request("GET", f"/vault/{encoded}", accept="text/markdown")
        except Exception:
            return ""

    def list_folder(self, folder: str = "/") -> list[str]:
        """List files in a vault folder via GET /vault/{folder}/."""
        encoded = urllib.request.pathname2url(folder.rstrip("/"))
        try:
            result = self._request("GET", f"/vault/{encoded}/")
            if isinstance(result, dict):
                return result.get("files", [])
            return []
        except Exception:
            return []
```

**Step 4: Run test to verify it passes**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_obsidian_client.py -v`
Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add brain/obsidian_client.py brain/tests/test_obsidian_client.py
git commit -m "feat(tutor): add unified ObsidianClient replacing transport duplication"
```

---

## Phase 2: Wire `build_context()` into `send_turn()`

### Task 3: Replace retrieval logic in `send_turn()` with `build_context()`

**Files:**
- Modify: `brain/dashboard/api_tutor.py:3459-3592` (inside `generate()`)
- Modify: `brain/tutor_context.py` (if adjustments needed)

**Step 1: Write a regression test for the wiring**

```python
# brain/tests/test_tutor_context_wiring.py
"""Verify send_turn uses build_context under the hood."""
import pytest
from unittest.mock import patch, MagicMock

def test_send_turn_calls_build_context(client_fixture):
    """When mode.materials=True, build_context should be called with depth='auto'."""
    # This test validates the wiring, not the retrieval itself.
    # Use the existing test_api_tutor_mode_flags.py pattern as reference.
    pass  # Implemented during wiring step — placeholder for plan clarity
```

**Step 2: In `api_tutor.py:generate()`, replace the retrieval block**

Find the block at lines 3492-3592 (from `_run_dual_retrieval` definition through `notes_context_text` assembly) and replace with:

```python
            # --- Unified context retrieval ---
            from tutor_context import build_context

            _depth = "none"
            if _materials_on and _obsidian_on:
                _depth = "auto"
            elif _materials_on:
                _depth = "materials"
            elif _obsidian_on:
                _depth = "notes"

            ctx = build_context(
                question,
                depth=_depth,
                course_id=retrieval_course_id,
                material_ids=material_ids,
                module_prefix=module_prefix or None,
                k_materials=effective_material_k,
            )
            rag_debug = ctx["debug"]

            material_text = ctx["materials"]
            notes_context_text = ctx["notes"]
```

**Step 3: Remove the old `_run_dual_retrieval` function and escalation block**

Delete lines 3492-3592 (the `_run_dual_retrieval` def, the escalation logic, the notes search block).

**Step 4: Keep the graceful fallback for empty materials**

The existing block at lines 3564-3570 (`if not material_text: ...`) stays — just verify it's still present after the replacement.

**Step 5: Run existing tutor tests to verify no regressions**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_api_tutor_mode_flags.py -v`
Expected: PASS

**Step 6: Commit**

```bash
git add brain/dashboard/api_tutor.py
git commit -m "refactor(tutor): wire build_context() into send_turn, remove dual retrieval"
```

---

## Phase 3: Delete Dead Code

### Task 4: Remove reranker infrastructure

**Files:**
- Modify: `brain/tutor_rag.py:460-540` (delete `_RERANKER`, `_get_reranker`, `preload_reranker`, `_keyword_score`, `rerank_results`)
- Modify: `brain/dashboard/app.py:41-55` (delete preload thread)
- Modify: `brain/tests/test_tutor_rag_preload.py` (delete or update)

**Step 1: Check if `rerank_results` is called anywhere besides the deleted code**

Run: `cd /c/pt-study-sop && grep -rn "rerank_results\|_get_reranker\|preload_reranker" brain/ --include="*.py" | grep -v __pycache__ | grep -v "test_tutor_rag_preload"`

If it's only called from `search_with_embeddings` in `tutor_rag.py`, we need to update that function to skip reranking. If `search_with_embeddings` is still used by `build_context` → materials path, then replace reranking with a simple truncation.

**Step 2: In `tutor_rag.py`, replace `rerank_results` call in `search_with_embeddings` with simple truncation**

Find where `rerank_results` is called (likely around line 580-620) and replace:
```python
# Before:
return rerank_results(query, raw_docs, k, max_chunks_per_doc=max_chunks_per_doc)

# After:
return raw_docs[:k]
```

**Step 3: Delete the reranker functions**

Delete these blocks from `brain/tutor_rag.py`:
- Lines 460-469: `_RERANKER` global and `_get_reranker()`
- Lines 472-484: `preload_reranker()`
- Lines 487-506: `_keyword_score()`
- Lines 509-539+: `rerank_results()`

**Step 4: Delete preload thread from `brain/dashboard/app.py`**

Delete lines 41-55 (the `_preload_models` function and `threading.Thread` call).

**Step 5: Delete or gut `brain/tests/test_tutor_rag_preload.py`**

If it only tests preloading, delete the file. If it tests other things, keep those.

**Step 6: Remove `sentence-transformers` from requirements if no other usage**

Run: `grep -rn "sentence_transformers\|from sentence" brain/ --include="*.py" | grep -v __pycache__`

If only used by reranker → remove from `requirements.txt`.

**Step 7: Run tests**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/ -v -x --timeout=30`
Expected: PASS (all remaining tests)

**Step 8: Commit**

```bash
git add brain/tutor_rag.py brain/dashboard/app.py brain/tests/
git commit -m "refactor(tutor): delete reranker infrastructure (TinyBERT + preload thread)"
```

---

### Task 5: Remove escalation logic from `api_tutor.py`

**Files:**
- Modify: `brain/dashboard/api_tutor.py` (remove `_should_escalate_to_coverage`, `_extract_material_retrieval_signals`)

**Step 1: Find and delete escalation helper functions**

Run: `grep -n "_should_escalate_to_coverage\|_extract_material_retrieval_signals" /c/pt-study-sop/brain/dashboard/api_tutor.py`

Delete both function definitions and any remaining references.

**Step 2: Run tests**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_tutor_accuracy_profiles.py -v`
Expected: PASS (profiles still work, just no escalation)

**Step 3: Commit**

```bash
git add brain/dashboard/api_tutor.py
git commit -m "refactor(tutor): remove retrieval escalation logic"
```

---

### Task 6: Remove notes ChromaDB collection and `embed_vault_notes`

**Files:**
- Modify: `brain/tutor_rag.py` (delete `COLLECTION_NOTES`, `embed_vault_notes`, `search_notes`, `search_notes_prioritized`)
- Optionally delete: `brain/data/chroma_tutor/notes/` directory (0 vectors, just schema)

**Step 1: Verify nothing else references these functions**

Run: `grep -rn "COLLECTION_NOTES\|embed_vault_notes\|search_notes_prioritized\|search_notes" brain/ --include="*.py" | grep -v __pycache__ | grep -v tutor_rag.py`

If only `api_tutor.py` references them (and we already replaced that in Task 3), safe to delete.

**Step 2: Delete from `tutor_rag.py`**

- Line 34: Delete `COLLECTION_NOTES = "tutor_notes"`
- Lines 1067-1121: Delete `embed_vault_notes()`
- Lines 1124-1136: Delete `search_notes()`
- Lines 1150-1223: Delete `search_notes_prioritized()`
- Lines 1139-1148: Keep `_strip_wikilink` and `_normalize_module_prefix` if used elsewhere; delete if not.

**Step 3: Run tests**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/ -v -x --timeout=30`
Expected: PASS

**Step 4: Commit**

```bash
git add brain/tutor_rag.py
git commit -m "refactor(tutor): remove notes ChromaDB collection (now uses Obsidian REST)"
```

---

### Task 7: Remove instructions ChromaDB collection

**Files:**
- Modify: `brain/tutor_rag.py` (remove `COLLECTION_INSTRUCTIONS` references)
- Modify: `brain/tutor_context.py` (instructions = always from YAML, not embeddings)

**Step 1: Verify nothing else uses `COLLECTION_INSTRUCTIONS` embedding search**

Run: `grep -rn "COLLECTION_INSTRUCTIONS\|tutor_instructions" brain/ --include="*.py" | grep -v __pycache__ | grep -v tutor_rag.py`

**Step 2: Remove `COLLECTION_INSTRUCTIONS` from `tutor_rag.py`**

- Line 33: Delete `COLLECTION_INSTRUCTIONS = "tutor_instructions"`
- In `get_dual_context()` (line 908-956): Remove the instructions search thread. Only search materials.
- In `keyword_search_dual()` (line 976-987): Same — remove instructions search.

**Step 3: Rename `get_dual_context` → `search_materials` (optional clarity refactor)**

Since it only searches one collection now, rename for clarity. Update the one caller in `tutor_context.py`.

**Step 4: Run tests**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/ -v -x --timeout=30`
Expected: PASS

**Step 5: Commit**

```bash
git add brain/tutor_rag.py brain/tutor_context.py
git commit -m "refactor(tutor): remove instructions ChromaDB collection (now from YAML)"
```

---

## Phase 4: Integration & Cleanup

### Task 8: Add course map injection to prompt builder

**Files:**
- Modify: `brain/tutor_prompt_builder.py` (add `course_map` parameter to `build_prompt_with_contexts`)
- Modify: `brain/dashboard/api_tutor.py:3609-3617` (pass `course_map=ctx["course_map"]`)

**Step 1: Add `course_map` parameter to prompt builder**

In `build_prompt_with_contexts`, add a `course_map: str = ""` parameter. Append to system prompt:

```python
if course_map:
    prompt += (
        "\n\n## Course Structure\n"
        "Use this to orient the student within their program:\n\n"
        f"{course_map}\n"
    )
```

**Step 2: Pass it from `send_turn()`**

In `api_tutor.py` where `build_prompt_with_contexts` is called (around line 3609):

```python
from tutor_context import build_context
# ... (already done in Task 3)

system_prompt = build_prompt_with_contexts(
    current_block=block_info,
    chain_info=chain_info,
    course_id=session.get("course_id"),
    topic=session.get("topic"),
    instruction_context=instruction_text,
    material_context=material_text,
    graph_context=graph_context_text,
    course_map=ctx.get("course_map", ""),  # NEW
)
```

**Step 3: Run tests**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/ -v -x --timeout=30`
Expected: PASS

**Step 4: Commit**

```bash
git add brain/tutor_prompt_builder.py brain/dashboard/api_tutor.py
git commit -m "feat(tutor): inject course map as always-on context in prompts"
```

---

### Task 9: Integration test — full pipeline smoke test

**Files:**
- Create: `brain/tests/test_tutor_context_integration.py`

**Step 1: Write integration test**

```python
# brain/tests/test_tutor_context_integration.py
"""Integration test: build_context with real ChromaDB (materials only)."""
import pytest

def test_build_context_auto_returns_materials_from_chroma():
    """Materials collection has 14,583 vectors — this should return content."""
    from tutor_context import build_context
    result = build_context(
        "What muscles does the brachial plexus innervate?",
        depth="materials",
        k_materials=3,
    )
    # Should have some material content from the 14k vectors
    assert len(result["materials"]) > 50, "Expected material content from ChromaDB"
    assert result["course_map"] != "", "Course map should always be present"
    assert result["notes"] == "", "Notes should be empty when depth=materials"

def test_build_context_none_is_fast():
    """depth=none should return instantly with no retrieval."""
    import time
    from tutor_context import build_context
    start = time.monotonic()
    result = build_context("hello", depth="none")
    elapsed = time.monotonic() - start
    assert elapsed < 0.1, f"depth=none took {elapsed:.3f}s — should be <100ms"
    assert result["materials"] == ""
    assert result["notes"] == ""
```

**Step 2: Run integration test**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/test_tutor_context_integration.py -v`
Expected: PASS

**Step 3: Commit**

```bash
git add brain/tests/test_tutor_context_integration.py
git commit -m "test(tutor): add integration tests for build_context pipeline"
```

---

### Task 10: Final cleanup — remove dead imports and unused functions

**Files:**
- Modify: `brain/dashboard/api_tutor.py` (remove dead imports, unused helpers)
- Modify: `brain/tutor_rag.py` (remove unused functions)

**Step 1: Run linter to find unused imports**

Run: `cd /c/pt-study-sop/brain && python -m py_compile dashboard/api_tutor.py && python -m py_compile tutor_rag.py`

If you have `ruff` or `flake8`: `ruff check brain/dashboard/api_tutor.py brain/tutor_rag.py --select F401,F811`

**Step 2: Remove dead code**

- In `api_tutor.py`: Remove `_run_dual_retrieval`, `_should_escalate_to_coverage`, `_extract_material_retrieval_signals` if not already deleted.
- In `api_tutor.py`: Remove `import tutor_rag as _tutor_rag` if no longer used directly.
- In `tutor_rag.py`: Remove `COLLECTION_NOTES`, `COLLECTION_INSTRUCTIONS` if not already deleted.
- In `tutor_rag.py`: Remove `embed_vault_notes`, `search_notes`, `search_notes_prioritized` if not already deleted.

**Step 3: Run full test suite**

Run: `cd /c/pt-study-sop/brain && python -m pytest tests/ -v --timeout=60`
Expected: PASS (all tests)

**Step 4: Commit**

```bash
git add brain/dashboard/api_tutor.py brain/tutor_rag.py
git commit -m "chore(tutor): remove dead imports and unused retrieval functions"
```

---

## Summary

| Phase | Tasks | What Changes |
|-------|-------|------|
| 1. Foundation | 1-2 | New `tutor_context.py` + `obsidian_client.py` |
| 2. Wiring | 3 | `send_turn()` calls `build_context()` |
| 3. Delete | 4-7 | Reranker, escalation, notes/instructions ChromaDB |
| 4. Integration | 8-10 | Course map injection, smoke tests, cleanup |

**Lines deleted:** ~400+ (reranker, escalation, notes search, dual retrieval)
**Lines added:** ~250 (tutor_context.py, obsidian_client.py, tests)
**Net:** ~150 lines smaller, 1 entry point instead of 5 scattered paths
