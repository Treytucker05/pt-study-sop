"""
Tutor Chains — LangChain chain definitions for Adaptive Tutor phases.

Phase 1 MVP: First Pass only.
Handles: chain building, LO extraction, concept maps, confusables, artifact detection.
"""

from __future__ import annotations

import os
import re
import json
from typing import Optional

from config import load_env

load_env()

# Reuse mode prompts from tutor_engine
from tutor_engine import MODE_PROMPTS, BASE_SYSTEM_PROMPT


def get_mode_prompt(mode: str) -> str:
    """Get the mode-specific prompt text. Exported for reuse."""
    return MODE_PROMPTS.get(mode, MODE_PROMPTS["Core"])


def get_system_prompt(
    course_id: Optional[int] = None,
    topic_id: Optional[str] = None,
    mode: str = "Core",
) -> str:
    """Build the full system prompt for a tutor session."""
    mode_prompt = get_mode_prompt(mode)
    return BASE_SYSTEM_PROMPT.format(
        course_id=course_id or "N/A",
        topic_id=topic_id or "N/A",
        mode=mode,
        mode_prompt=mode_prompt,
    )


# First Pass phase-specific additions
FIRST_PASS_ADDENDUM = """
## First Pass Phase Rules
You are in FIRST PASS mode — the student is seeing this material for the first time.

Additional behaviors:
1. **Learning Objectives**: At session start, identify 3-5 key learning objectives from the content.
2. **Three-Layer Chunks**: Always present information as Source Facts → Interpretation → Application.
3. **Concept Maps**: When asked, generate Mermaid-syntax concept maps showing relationships.
4. **Confusables**: Proactively identify easily confused terms/concepts and clarify differences.
5. **Light Recall**: After each major concept, ask ONE recall question before moving on.
6. **Citations**: Always cite source documents using [Source: filename] format.
7. **Artifact Commands**: The student may say "put that in my notes", "make a flashcard", or "draw a map".
   Acknowledge the command and continue teaching — the system will handle artifact creation.
"""


def build_first_pass_chain(
    retriever,
    mode: str = "Core",
    course_id: Optional[int] = None,
    topic: Optional[str] = None,
):
    """
    Build a LangChain RunnableSequence for First Pass phase.
    Returns a chain that accepts {"question": str, "chat_history": list} and streams.
    """
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.runnables import RunnablePassthrough, RunnableLambda
    from langchain_openai import ChatOpenAI

    system_prompt = get_system_prompt(course_id, topic, mode) + FIRST_PASS_ADDENDUM

    # Context formatting
    def format_docs(docs):
        if not docs:
            return "No relevant documents found in the knowledge base."
        formatted = []
        for doc in docs:
            source = doc.metadata.get("source", "Unknown")
            formatted.append(f"[Source: {source}]\n{doc.page_content}")
        return "\n\n---\n\n".join(formatted)

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt + "\n\n## Retrieved Context:\n{context}"),
        MessagesPlaceholder("chat_history"),
        ("human", "{question}"),
    ])

    # LLM setup — use OpenRouter or OpenAI
    api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY", "")
    base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

    # If we have an OpenRouter key, use their base URL
    if os.environ.get("OPENROUTER_API_KEY"):
        llm = ChatOpenAI(
            model=os.environ.get("TUTOR_MODEL", "google/gemini-2.0-flash-001"),
            api_key=api_key,
            base_url=base_url,
            temperature=0.3,
            max_tokens=1500,
            streaming=True,
        )
    else:
        llm = ChatOpenAI(
            model=os.environ.get("TUTOR_MODEL", "gpt-4o-mini"),
            api_key=api_key,
            temperature=0.3,
            max_tokens=1500,
            streaming=True,
        )

    # Build the chain
    chain = (
        RunnablePassthrough.assign(
            context=lambda x: format_docs(
                retriever.invoke(x["question"])
            )
        )
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain


def extract_learning_objectives(content: str) -> list[dict]:
    """
    Extract learning objectives from document content.
    Returns list of {id, objective, bloom_level} dicts.
    """
    # Pattern: lines starting with "LO", numbered items after "Learning Objectives" heading
    objectives = []
    lines = content.split("\n")
    in_lo_section = False

    for line in lines:
        stripped = line.strip()
        if re.match(r"(?i)^#+\s*learning\s+objectives?", stripped):
            in_lo_section = True
            continue

        if in_lo_section:
            if stripped.startswith("#"):
                in_lo_section = False
                continue
            # Match numbered or bulleted items
            match = re.match(r"^[\d\-\*\•]+[.\)]\s*(.+)", stripped)
            if match:
                obj_text = match.group(1).strip()
                bloom = _classify_bloom(obj_text)
                objectives.append({
                    "id": len(objectives) + 1,
                    "objective": obj_text,
                    "bloom_level": bloom,
                })

    return objectives


def _classify_bloom(text: str) -> str:
    """Classify a learning objective by Bloom's taxonomy level."""
    text_lower = text.lower()
    if any(w in text_lower for w in ["create", "design", "develop", "construct", "produce"]):
        return "create"
    if any(w in text_lower for w in ["evaluate", "judge", "assess", "critique", "justify"]):
        return "evaluate"
    if any(w in text_lower for w in ["analyze", "compare", "contrast", "differentiate", "examine"]):
        return "analyze"
    if any(w in text_lower for w in ["apply", "demonstrate", "use", "implement", "perform"]):
        return "apply"
    if any(w in text_lower for w in ["explain", "describe", "summarize", "interpret", "classify"]):
        return "understand"
    return "remember"


def generate_concept_map(content: str, topic: str) -> str:
    """Generate a Mermaid-syntax concept map from content."""
    # This returns a template; the LLM chain handles actual generation
    return f"""```mermaid
graph TD
    A[{topic}] --> B[Key Concept 1]
    A --> C[Key Concept 2]
    B --> D[Detail]
    C --> E[Detail]
```"""


def identify_confusables(content: str) -> list[dict]:
    """
    Identify easily confused term pairs from content.
    Returns list of {term_a, term_b, distinction} dicts.
    """
    confusables = []
    lines = content.split("\n")

    # Look for "vs" or "versus" patterns
    for line in lines:
        match = re.search(r"(\b\w[\w\s]{2,30})\s+(?:vs\.?|versus)\s+(\b\w[\w\s]{2,30})", line, re.IGNORECASE)
        if match:
            confusables.append({
                "term_a": match.group(1).strip(),
                "term_b": match.group(2).strip(),
                "distinction": line.strip(),
            })

    return confusables


def generate_recall_questions(content: str, topic: str) -> list[dict]:
    """
    Generate simple recall questions from content.
    Returns list of {question, expected_answer, difficulty} dicts.
    """
    # Stub: actual generation done by LLM chain at runtime
    return []


# ---------------------------------------------------------------------------
# Artifact command detection
# ---------------------------------------------------------------------------

_NOTE_PATTERNS = [
    r"put\s+(?:that|this)\s+in\s+(?:my\s+)?notes?",
    r"save\s+(?:that|this)\s+(?:as\s+a\s+)?note",
    r"add\s+(?:that|this)\s+to\s+(?:my\s+)?(?:obsidian|notes?)",
    r"/note\b",
]

_CARD_PATTERNS = [
    r"make\s+(?:a\s+)?(?:flash)?card",
    r"create\s+(?:a\s+)?(?:flash)?card",
    r"add\s+(?:that|this)\s+(?:as\s+)?(?:a\s+)?(?:flash)?card",
    r"/card\b",
]

_MAP_PATTERNS = [
    r"draw\s+(?:a\s+)?(?:concept\s+)?map",
    r"make\s+(?:a\s+)?(?:concept\s+)?map",
    r"show\s+(?:me\s+)?(?:a\s+)?(?:concept\s+)?map",
    r"/map\b",
]


def detect_artifact_command(message: str) -> Optional[dict]:
    """
    Detect if a user message contains an artifact creation command.
    Returns {type: 'note'|'card'|'map', raw: str} or None.
    """
    msg_lower = message.lower().strip()

    for pattern in _NOTE_PATTERNS:
        if re.search(pattern, msg_lower):
            return {"type": "note", "raw": message}

    for pattern in _CARD_PATTERNS:
        if re.search(pattern, msg_lower):
            return {"type": "card", "raw": message}

    for pattern in _MAP_PATTERNS:
        if re.search(pattern, msg_lower):
            return {"type": "map", "raw": message}

    return None
