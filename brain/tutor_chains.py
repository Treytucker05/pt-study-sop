"""
Tutor Chains — LangChain chain definitions for Adaptive Tutor phases.

Handles: chain building, LO extraction, concept maps, confusables, artifact detection.
Uses tutor_prompt_builder for 3-layer system prompt assembly.
"""

from __future__ import annotations

import pydantic_v1_patch  # noqa: F401  — fixes PEP 649 on Python 3.14

import os
import re
import json
from typing import Optional

from config import load_env

load_env()

from tutor_prompt_builder import build_tutor_system_prompt


# First Pass phase-specific additions (appended when no chain provides block context)
FIRST_PASS_ADDENDUM = """
## First Pass Phase Rules
You are in FIRST PASS mode — the student is seeing this material for the first time.

Additional behaviors:
1. **Learning Objectives**: At session start, identify 3-5 key learning objectives from the content.
2. **Three-Layer Chunks**: Always present information as Source Facts -> Interpretation -> Application.
3. **Concept Maps**: When asked, generate Mermaid-syntax concept maps showing relationships.
4. **Confusables**: Proactively identify easily confused terms/concepts and clarify differences.
5. **Light Recall**: After each major concept, ask ONE recall question before moving on.
6. **Artifact Commands**: The student may say "put that in my notes", "make a flashcard", or "draw a map".
   Generate the content, then confirm it's saved — the system captures your output automatically.
   Slash commands also work: `/note`, `/card`, `/map`.
7. **Brain Page Integration**: You ARE connected to the student's Brain dashboard. When you generate
   an artifact (note, card, or concept map), the system automatically saves it:
   - Notes → Quick Notes on the Brain page
   - Cards → Card Drafts for Anki review
   - Concept maps (Mermaid) → Brain canvas (student clicks "Send to Brain" in the artifact panel)
   When the student asks to "send this to the brain page" or "save this to brain", generate the
   content as a note or map. Do NOT say you lack this ability — you have it. Do NOT apologize or
   hedge about limitations. Just produce the artifact and confirm it's been saved.

## Study Method Awareness
You have access to a library of study methods (PEIRRO framework) that may appear in retrieved context.
When suggesting study techniques, reference specific method blocks by name.
"""


def build_tutor_chain(
    retriever,
    mode: str = "Core",
    course_id: Optional[int] = None,
    topic: Optional[str] = None,
    model: Optional[str] = None,
    chain_id: Optional[int] = None,
    current_block_index: int = 0,
    block_info: Optional[dict] = None,
    chain_info: Optional[dict] = None,
):
    """
    Build a LangChain RunnableSequence for a tutor session.
    Returns a chain that accepts {"question": str, "chat_history": list} and streams.

    Args:
        retriever: LangChain retriever for RAG documents.
        mode: Behavioral mode (Core, Sprint, Drill, etc.).
        course_id: Active course ID.
        topic: Session topic.
        model: LLM model override.
        chain_id: method_chains.id if a chain is active.
        current_block_index: Current position in the chain.
        block_info: Dict with current block details (name, description, category, evidence, duration).
        chain_info: Dict with chain overview (name, blocks list, current_index, total).
    """
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.runnables import RunnablePassthrough
    from langchain_openai import ChatOpenAI

    # Build system prompt using 3-layer architecture
    system_prompt = build_tutor_system_prompt(
        mode=mode,
        current_block=block_info,
        chain_info=chain_info,
        course_id=course_id,
        topic=topic,
    )

    # Append First Pass addendum when no chain provides block-level context
    if not block_info:
        system_prompt += "\n\n" + FIRST_PASS_ADDENDUM

    # Context formatting
    def format_docs(docs):
        if not docs:
            return (
                "No course-specific materials were retrieved for this topic. "
                "Teach from your medical/PT training knowledge. "
                "Mark such content as [From training knowledge — verify with your textbooks] "
                "so the student knows to cross-reference."
            )
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

    # Model priority: explicit param > env var > default
    if os.environ.get("OPENROUTER_API_KEY"):
        selected_model = model or os.environ.get("TUTOR_MODEL", "google/gemini-2.5-flash-lite")
        llm = ChatOpenAI(
            model=selected_model,
            api_key=api_key,
            base_url=base_url,
            temperature=0.3,
            max_tokens=1500,
            streaming=True,
        )
    else:
        selected_model = model or os.environ.get("TUTOR_MODEL", "gpt-4o-mini")
        llm = ChatOpenAI(
            model=selected_model,
            api_key=api_key,
            temperature=0.3,
            max_tokens=1500,
            streaming=True,
        )

    # Build the chain
    chain = (
        RunnablePassthrough.assign(
            context=lambda x: format_docs(
                retriever.invoke(x.get("retrieval_query", x["question"]))
            )
        )
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain


# Backwards-compatible alias
build_first_pass_chain = build_tutor_chain


def extract_learning_objectives(content: str) -> list[dict]:
    """
    Extract learning objectives from document content.
    Returns list of {id, objective, bloom_level} dicts.
    """
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
    return []


# ---------------------------------------------------------------------------
# Artifact command detection
# ---------------------------------------------------------------------------

_NOTE_PATTERNS = [
    r"put\s+(?:that|this)\s+in\s+(?:my\s+)?notes?",
    r"save\s+(?:that|this)\s+(?:as\s+a\s+)?note",
    r"add\s+(?:that|this)\s+to\s+(?:my\s+)?(?:obsidian|notes?)",
    r"send\s+(?:that|this|it)\s+to\s+(?:the\s+)?(?:brain|notes?)(?:\s+page)?",
    r"save\s+(?:that|this|it)\s+to\s+(?:the\s+)?brain(?:\s+page)?",
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
