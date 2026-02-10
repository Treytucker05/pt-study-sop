"""LangGraph ReAct agent for Scholar pipeline.

Uses the same OpenRouter/ChatOpenAI pattern as brain/tutor_chains.py.
Produces the same output format as the multi-agent Codex flow.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Ensure pydantic v1 patch is loaded before any langchain import
# (handles Python 3.14 PEP 649 deferred annotations)
_REPO_ROOT = Path(__file__).parent.parent.parent.resolve()
_BRAIN_DIR = str(_REPO_ROOT / "brain")
if _BRAIN_DIR not in sys.path:
    sys.path.insert(0, _BRAIN_DIR)

try:
    import pydantic_v1_patch  # noqa: F401
except ImportError:
    pass


def _build_llm(model: str, max_tokens: int = 4000):
    """Create ChatOpenAI instance via OpenRouter (same pattern as tutor_chains)."""
    from langchain_openai import ChatOpenAI

    api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY", "")
    base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

    if os.environ.get("OPENROUTER_API_KEY"):
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=0.3,
            max_tokens=max_tokens,
        )

    return ChatOpenAI(
        model=model,
        api_key=api_key,
        temperature=0.3,
        max_tokens=max_tokens,
    )


def _build_agent(llm, tools: list, system_prompt: str):
    """Create a LangGraph ReAct agent."""
    from langgraph.prebuilt import create_react_agent

    return create_react_agent(
        model=llm,
        tools=tools,
        prompt=system_prompt,
    )


def _strip_code_fences(text: str) -> str:
    """Remove wrapping code fences if the LLM emits them around the report."""
    stripped = text.strip()
    if stripped.startswith("```") and stripped.endswith("```"):
        # Remove opening fence (with optional language tag) and closing fence
        lines = stripped.split("\n")
        lines = lines[1:]  # drop opening ```
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return stripped


def _extract_final_text(result: dict) -> str:
    """Pull the final assistant text from LangGraph result messages."""
    messages = result.get("messages", [])
    for msg in reversed(messages):
        if hasattr(msg, "content") and isinstance(msg.content, str) and msg.content.strip():
            return _strip_code_fences(msg.content.strip())
        if isinstance(msg, dict) and msg.get("content"):
            return _strip_code_fences(str(msg["content"]).strip())
    return ""


def _extract_questions(text: str) -> list[str]:
    """Extract questions from the '## Questions Needed' section."""
    questions: list[str] = []
    in_section = False

    for line in text.split("\n"):
        stripped = line.strip()

        if stripped.startswith("## Questions Needed"):
            in_section = True
            continue
        if in_section and stripped.startswith("## "):
            break
        if in_section and stripped.startswith("- "):
            q = stripped.lstrip("- ").strip()
            if q and q != "(none)":
                questions.append(q)

    return questions


def run_deep_agent(
    run_id: str,
    mode: str = "brain",
    manifest: Optional[dict[str, Any]] = None,
    unanswered_questions: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Run the Scholar deep agent synchronously.

    Args:
        run_id: Timestamp-based run identifier.
        mode: "brain" (default) or "tutor".
        manifest: Audit manifest dict (for model/iteration config).
        unanswered_questions: Questions carried from previous runs.

    Returns:
        {"raw_markdown": str, "questions": list[str]}
    """
    from .tools import ALL_TOOLS
    from .prompts import build_system_prompt

    manifest = manifest or {}
    deep_cfg = manifest.get("deep_agent", {})
    model = deep_cfg.get("model", "google/gemini-2.0-flash-001")
    max_iterations = deep_cfg.get("max_iterations", 15)

    system_prompt = build_system_prompt(
        unanswered_questions=unanswered_questions,
        mode=mode,
    )

    llm = _build_llm(model=model, max_tokens=4000)
    graph = _build_agent(llm=llm, tools=ALL_TOOLS, system_prompt=system_prompt)

    logger.info(
        "Scholar deep agent starting: run_id=%s model=%s max_iter=%s mode=%s",
        run_id, model, max_iterations, mode,
    )

    result = graph.invoke(
        {"messages": [("human", f"Run Scholar analysis. Run ID: {run_id}. Mode: {mode}.")]},
        config={"recursion_limit": max_iterations + 5},
    )

    raw_markdown = _extract_final_text(result)
    questions = _extract_questions(raw_markdown)

    logger.info(
        "Scholar deep agent finished: run_id=%s output_len=%d questions=%d",
        run_id, len(raw_markdown), len(questions),
    )

    return {
        "raw_markdown": raw_markdown,
        "questions": questions,
    }
