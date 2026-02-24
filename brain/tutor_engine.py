#!/usr/bin/env python3
"""
Tutor Engine - OpenRouter-powered conversational tutor for PT Study Brain.

This module provides the core Tutor functionality:
- OpenRouter API integration for LLM responses
- RAG search with source-lock filtering
- Mode-specific behavior (Core/Sprint/Drill)
- Session context management
- Citation extraction and verification
"""

from __future__ import annotations

import os
import re
import json
import sqlite3
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Literal, Optional, cast

# Check if requests library is available
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# Import our types
import sys
sys.path.insert(0, str(Path(__file__).parent))
from tutor_api_types import (
    TutorSourceSelector, TutorQueryV1, 
    TutorCitation, TutorTurnResponse
)
from db_setup import DB_PATH, init_database

# API config path (same as used by dashboard.utils)
API_CONFIG_PATH = Path(__file__).parent / "data" / "api_config.json"


def load_api_config() -> dict:
    """Load API configuration from file (local copy to avoid circular imports)."""
    if API_CONFIG_PATH.exists():
        try:
            with open(API_CONFIG_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {
        "openai_api_key": "",
        "openrouter_api_key": "",
        "api_provider": "openrouter",
        "model": "openrouter/auto"
    }


# Doc type literal for type safety
DocType = Literal[
    "note",
    "textbook",
    "transcript",
    "slide",
    "other",
    "powerpoint",
    "pdf",
    "txt",
    "mp4",
    "youtube",
]


# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

MAX_RAG_RESULTS = 4  # Reduced for faster responses
MAX_CONTEXT_CHARS = 8000  # Aggressive limit for faster API responses
MAX_HISTORY_TURNS = 10
MAX_HISTORY_CHARS_PER_TURN = 500

# Mode-specific prompts based on M5-modes.md
MODE_PROMPTS = {
    "Core": """You are a PT Study Tutor in CORE MODE (First Exposure — Teach First).
Session flow: M0 Planning → M1 Entry → M2 Prime → M3 Encode → M4 Build → M6 Wrap.
- The student is learning NEW material they have NOT seen before.
- TEACH FIRST: deliver content using Three-Layer Chunks (Source Facts → Interpretation → Application) BEFORE any retrieval.
- Do NOT quiz or Socratic-question the student on material they haven't been taught yet.
- After teaching a chunk, THEN ask one recall question to confirm understanding.
- Wrong: "What do you know about X?" when X is new. Right: teach X, then "In your own words, what does X do?"
- M3 Encode: use KWIK protocol (Sound → Function → Image → Resonance → Lock) for memory hooks on new terms.
  KWIK is for M3 encoding only — NOT for post-study notes or Wrap.
- Seed-Lock: student attempts their own hook first. AI suggests only if student asks.
- Abbreviation rule: on first use of any abbreviation, spell out the full term. E.g., "ischial tuberosity (IT)".
- Function before structure: explain WHY before WHAT.""",

    "Sprint": """You are a PT Study Tutor in SPRINT MODE (Test-First / Fail-First).
Session flow: M0 Planning → M1 Entry → M2 Prime → M3 Encode → M4 Build → M6 Wrap.
- The student has PRIOR knowledge — test first, teach only on miss.
- Rapid-fire questioning to find gaps.
- Keep answers concise — don't over-explain unless they miss.
- When they miss: provide a hook (KWIK if needed) and retry.
- When they get it: move to next topic quickly.
- Abbreviation rule: on first use, spell out full term. E.g., "anterior cruciate ligament (ACL)".""",

    "Drill": """You are a PT Study Tutor in DRILL MODE (Deep Practice).
Session flow: M0 Planning → M1 Entry → M2 Prime → M3 Encode → M4 Build → M6 Wrap.
- The student has identified a weak spot — go deep.
- Have them reconstruct their understanding step by step.
- Flag gaps and demand multiple hooks/mnemonics (KWIK protocol).
- Test from multiple angles and variations.
- Slower pace, thorough coverage.
- Don't move on until the concept is locked.
- Abbreviation rule: on first use, spell out full term.""",

    "Diagnostic Sprint": """You are a PT Study Tutor in DIAGNOSTIC SPRINT MODE.
- Quickly assess what the student knows and doesn't know.
- Ask probing questions across the topic.
- Build a mental map of their understanding gaps.
- No teaching yet — just assessment.
- Summarize findings and recommend next mode (Core for gaps, Sprint for review).
- Abbreviation rule: on first use, spell out full term.""",

    "Teaching Sprint": """You are a PT Study Tutor in TEACHING SPRINT MODE.
- Quick, focused teaching session (10-15 min).
- TEACH FIRST: deliver content before testing. Same teach-first rule as Core mode.
- Cover one concept thoroughly but efficiently using Three-Layer Chunks.
- Build one strong hook/mnemonic using KWIK protocol.
- Test understanding at the end, not at the start.
- Abbreviation rule: on first use, spell out full term."""
}

BASE_SYSTEM_PROMPT = """You are the PT Study Tutor, an expert AI tutor for physical therapy education.

Your knowledge sources are from the student's course materials. When answering:
1. Ground your answers in the provided context (course materials, notes, textbook content)
2. If information is NOT found in the provided context, clearly state:
   [UNVERIFIED - not backed by your course materials]
3. Cite sources when possible using [Source: filename] format
4. Apply learning science principles (spacing, retrieval practice, elaborative encoding)

Current session context:
- Course ID: {course_id}
- Topic ID: {topic_id}
- Mode: {mode}

{mode_prompt}
"""


# -----------------------------------------------------------------------------
# RAG Search with Source-Lock
# -----------------------------------------------------------------------------

@dataclass
class RAGDocument:
    """Retrieved document from rag_docs table."""
    id: int
    source_path: str
    doc_type: str
    content: str
    topic_tags: str
    course_id: Optional[int]
    
    @property
    def title(self) -> str:
        """Extract title from first heading or filename."""
        for line in self.content.splitlines():
            line = line.strip()
            if line.startswith("#"):
                return re.sub(r"^#+\s*", "", line)
        return Path(self.source_path).stem
    
    @property
    def filename(self) -> str:
        return Path(self.source_path).name


def search_rag_documents(
    query: str,
    sources: TutorSourceSelector,
    course_id: Optional[int] = None,
    limit: int = MAX_RAG_RESULTS,
    *,
    corpus: Optional[str] = None,
    corpuses: Optional[list[str]] = None,
    enabled_only: bool = True,
) -> list[RAGDocument]:
    """
    Search rag_docs with source-lock filtering.
    
    Source-Lock rules (from TutorSourceSelector):
    - If allowed_doc_ids is non-empty, only return those IDs
    - If allowed_kinds is specified, filter by doc_type
    - Exclude any disallowed_doc_ids
    
    Corpus filtering:
    - If corpuses is specified, search across those corpuses (e.g., ['study', 'repo', 'runtime'])
    - If corpus is specified (legacy), search only that corpus
    - If neither is specified, search ALL enabled documents (no corpus filter)
    """
    init_database()
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Build query with filters
    conditions: list[str] = []
    params: list[Any] = []

    # Corpus isolation - support multiple corpuses or single corpus
    if corpuses:
        placeholders = ",".join("?" * len(corpuses))
        conditions.append(f"COALESCE(corpus, 'runtime') IN ({placeholders})")
        params.extend(corpuses)
    elif corpus:
        conditions.append("COALESCE(corpus, 'runtime') = ?")
        params.append(corpus)
    # If neither specified, search all corpuses (no filter added)

    # Enabled filter
    if enabled_only:
        conditions.append("COALESCE(enabled, 1) = 1")
    
    # Source-lock: allowed doc IDs
    if sources.allowed_doc_ids:
        placeholders = ",".join("?" * len(sources.allowed_doc_ids))
        conditions.append(f"id IN ({placeholders})")
        params.extend(sources.allowed_doc_ids)
    
    # Source-lock: allowed kinds
    if sources.allowed_kinds:
        placeholders = ",".join("?" * len(sources.allowed_kinds))
        conditions.append(f"doc_type IN ({placeholders})")
        params.extend(sources.allowed_kinds)
    
    # Source-lock: disallowed doc IDs
    if sources.disallowed_doc_ids:
        placeholders = ",".join("?" * len(sources.disallowed_doc_ids))
        conditions.append(f"id NOT IN ({placeholders})")
        params.extend(sources.disallowed_doc_ids)
    
    # Course filter
    if course_id is not None:
        conditions.append("(course_id = ? OR course_id IS NULL)")
        params.append(course_id)
    
    # Text search - tokenize query into keywords for better matching
    # Extract significant words (3+ chars) and search for each
    if query:
        # Extract keywords from query (words 3+ characters, skip common stop words)
        stop_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 
                      'has', 'her', 'was', 'one', 'our', 'out', 'his', 'had', 'this',
                      'that', 'with', 'from', 'they', 'what', 'when', 'how', 'who'}
        keywords = [w for w in re.findall(r'\b\w{3,}\b', query.lower()) 
                   if w not in stop_words]
        
        if keywords:
            # Search for documents containing ANY of the keywords
            keyword_conditions = []
            for kw in keywords[:5]:  # Limit to 5 keywords to avoid huge queries
                like_pattern = f"%{kw}%"
                keyword_conditions.append(
                    "(content LIKE ? COLLATE NOCASE OR topic_tags LIKE ? COLLATE NOCASE OR source_path LIKE ? COLLATE NOCASE)"
                )
                params.extend([like_pattern, like_pattern, like_pattern])
            
            if keyword_conditions:
                conditions.append(f"({' OR '.join(keyword_conditions)})")
        else:
            # Fall back to full query search
            like_pattern = f"%{query}%"
            conditions.append("(content LIKE ? COLLATE NOCASE OR topic_tags LIKE ? COLLATE NOCASE OR source_path LIKE ? COLLATE NOCASE)")
            params.extend([like_pattern, like_pattern, like_pattern])
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    sql = f"""
        SELECT id, source_path, doc_type, content, topic_tags, course_id
        FROM rag_docs
        WHERE {where_clause}
        ORDER BY id DESC
        LIMIT ?
    """
    params.append(limit)
    
    cur.execute(sql, params)
    rows = cur.fetchall()
    conn.close()
    
    return [
        RAGDocument(
            id=row["id"],
            source_path=row["source_path"],
            doc_type=row["doc_type"],
            content=row["content"] or "",
            topic_tags=row["topic_tags"] or "",
            course_id=row["course_id"]
        )
        for row in rows
    ]


def load_runtime_catalog_context(max_chars: int = 6000) -> str:
    """Load enabled runtime catalog items into a compact context block."""
    init_database()
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """
        SELECT source_path, folder_path, content
        FROM rag_docs
        WHERE COALESCE(corpus, 'runtime') = 'runtime'
          AND COALESCE(enabled, 1) = 1
          AND source_path LIKE 'runtime://%'
        ORDER BY COALESCE(folder_path, ''), source_path
        """
    )
    rows = cur.fetchall()
    conn.close()

    if not rows:
        # Attempt a one-time sync from the runtime bundle (v9.3) and retry
        try:
            from rag_notes import sync_runtime_catalog

            repo_root = Path(__file__).resolve().parent.parent
            sync_runtime_catalog(str(repo_root))
            conn = sqlite3.connect(DB_PATH, timeout=30)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute(
                """
                SELECT source_path, folder_path, content
                FROM rag_docs
                WHERE COALESCE(corpus, 'runtime') = 'runtime'
                  AND COALESCE(enabled, 1) = 1
                  AND source_path LIKE 'runtime://%'
                ORDER BY COALESCE(folder_path, ''), source_path
                """
            )
            rows = cur.fetchall()
            conn.close()
        except Exception:
            return ""
        if not rows:
            return ""

    parts: list[str] = []
    total = 0
    for r in rows:
        key = (r["source_path"] or "").replace("runtime://", "", 1)
        group = (r["folder_path"] or "Runtime").strip() or "Runtime"
        content = (r["content"] or "").strip()
        # Keep each item short in the system prompt
        snippet = content
        if len(snippet) > 400:
            snippet = snippet[:397].rstrip() + "..."
        block = f"- [{group}] {key}: {snippet}"
        if total + len(block) + 1 > max_chars:
            break
        parts.append(block)
        total += len(block) + 1

    return "\n".join(parts)


def _normalize_doc_type(doc_type: str) -> DocType:
    if doc_type in {"note", "textbook", "transcript", "slide", "other", "powerpoint", "pdf", "txt", "mp4", "youtube"}:
        return cast(DocType, doc_type)
    return "other"


def build_rag_context(docs: list[RAGDocument], max_chars: int = MAX_CONTEXT_CHARS) -> tuple[str, list[TutorCitation]]:
    """
    Build context string from RAG documents and prepare citations.
    Truncates to fit within context limits.
    """
    if not docs:
        return "", []
    
    context_parts: list[str] = []
    citations: list[TutorCitation] = []
    total_chars = 0
    
    for doc in docs:
        # Prepare snippet for context (reduced for faster responses)
        snippet = doc.content[:400]  # First 400 chars per doc (optimized)
        if len(doc.content) > 400:
            snippet += "\n[... content truncated ...]"
        
        doc_context = f"""
--- Source: {doc.filename} (ID: {doc.id}, Type: {doc.doc_type}) ---
{snippet}
"""
        
        if total_chars + len(doc_context) > max_chars:
            break
        
        context_parts.append(doc_context)
        total_chars += len(doc_context)
        
        # Prepare citation
        citations.append(TutorCitation(
            doc_id=doc.id,
            source_path=doc.source_path,
            doc_type=_normalize_doc_type(doc.doc_type),
            snippet=doc.content[:150] + "..." if len(doc.content) > 150 else doc.content
        ))
    
    return "\n".join(context_parts), citations


# -----------------------------------------------------------------------------
# Session Context Management
# -----------------------------------------------------------------------------

@dataclass
class SessionContext:
    """Manages conversation history for a session."""
    session_id: str
    turns: list[dict[str, str]] = field(default_factory=lambda: [])  # [{"role": "user"|"assistant", "content": "..."}]
    
    def add_turn(self, role: str, content: str):
        """Add a turn, maintaining size limits."""
        # Truncate content if too long
        if len(content) > MAX_HISTORY_CHARS_PER_TURN:
            content = content[:MAX_HISTORY_CHARS_PER_TURN] + "..."
        
        self.turns.append({"role": role, "content": content})
        
        # Keep only recent turns
        if len(self.turns) > MAX_HISTORY_TURNS * 2:  # *2 for user+assistant pairs
            self.turns = self.turns[-MAX_HISTORY_TURNS * 2:]
    
    def get_history_prompt(self) -> str:
        """Format history for inclusion in prompt."""
        if not self.turns:
            return ""
        
        history_lines = ["Previous conversation:"]
        for turn in self.turns[-MAX_HISTORY_TURNS * 2:]:
            role = "Student" if turn["role"] == "user" else "Tutor"
            history_lines.append(f"{role}: {turn['content']}")
        
        return "\n".join(history_lines)


# In-memory session store (TODO: persist to DB for long sessions)
_sessions: dict[str, SessionContext] = {}


def get_or_create_session(session_id: str) -> SessionContext:
    """Get existing session or create new one."""
    if session_id not in _sessions:
        _sessions[session_id] = SessionContext(session_id=session_id)
    return _sessions[session_id]


# -----------------------------------------------------------------------------
# OpenRouter API Integration
# -----------------------------------------------------------------------------

# Maximum context size to send to API (approx 12k tokens = ~50k chars)
MAX_API_CONTEXT_CHARS = 50000


def _truncate_for_api(text: str, max_chars: int = MAX_API_CONTEXT_CHARS) -> str:
    """
    Truncate text to fit within API token limits.
    Keeps the beginning (most important context) and truncates the end.
    """
    if not text or len(text) <= max_chars:
        return text
    
    truncated = text[:max_chars]
    # Try to cut at a natural boundary (newline or sentence)
    last_newline = truncated.rfind('\n', max_chars - 500, max_chars)
    if last_newline > max_chars - 1000:
        truncated = truncated[:last_newline]
    
    return truncated + "\n\n[... context truncated due to length ...]"


def call_openrouter(prompt: str, system_prompt: str, timeout: int = 30) -> tuple[Optional[str], Optional[str]]:
    """
    Call OpenRouter API with the given prompt.
    Uses the same api_config.json as Scholar.
    Timeout reduced to 30s for faster responses.
    
    Returns: (response_text, error_message)
    """
    if not REQUESTS_AVAILABLE:
        return None, "requests library not installed. Install with: pip install requests"
    
    config = load_api_config()
    api_provider = config.get("api_provider", "openrouter")
    
    if api_provider == "openrouter":
        api_key = config.get("openrouter_api_key", "").strip()
        model = config.get("model", "openrouter/auto")
        if not model or model == "zai-ai/glm-4.7":
            model = "openrouter/auto"
        api_url = "https://openrouter.ai/api/v1/chat/completions"
    else:
        # Fallback to OpenAI
        api_key = config.get("openai_api_key", "").strip()
        model = config.get("model", "gpt-4o-mini")
        api_url = "https://api.openai.com/v1/chat/completions"
    
    if not api_key:
        return None, f"API key not configured. Please set your {api_provider} API key in Settings."
    
    # Truncate prompt if needed
    safe_prompt = _truncate_for_api(prompt)
    
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        # Add OpenRouter-specific headers
        if api_provider == "openrouter":
            headers["HTTP-Referer"] = "https://github.com/pt-study-brain"
            headers["X-Title"] = "PT Study Tutor"
        
        response = requests.post(
            api_url,
            headers=headers,
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": safe_prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 600,  # Reduced for faster responses (was 2000)
            },
            timeout=timeout,
        )
        
        if response.status_code == 200:
            result = response.json()
            answer = result["choices"][0]["message"]["content"].strip()
            return answer, None
        else:
            try:
                error_msg = response.json().get("error", {}).get("message", "Unknown error")
            except:
                error_msg = f"HTTP {response.status_code}"
            return None, f"API error: {error_msg}"
            
    except requests.exceptions.Timeout:
        return None, "Request timed out. Please try again."
    except requests.exceptions.RequestException as e:
        return None, f"Network error: {str(e)}"
    except Exception as e:
        return None, f"Error: {str(e)}"


# Legacy alias for backwards compatibility (if any code references this)
def find_codex_cli() -> Optional[str]:
    """Deprecated: Codex CLI is no longer used. Returns None."""
    return None  # OpenRouter is now used instead
    
# Legacy alias for backwards compatibility (if any code references call_codex)
def call_codex(prompt: str, system_prompt: str, timeout: int = 60) -> tuple[Optional[str], Optional[str]]:
    """Deprecated: Now uses OpenRouter API instead of Codex CLI."""
    return call_openrouter(prompt, system_prompt, timeout)


# -----------------------------------------------------------------------------
# Main Tutor Engine
# -----------------------------------------------------------------------------

def process_tutor_turn(query: TutorQueryV1) -> TutorTurnResponse:
    """
    Process a single Tutor turn: RAG search -> build prompt -> call Codex -> return response.
    """
    session_id = query.session_id or f"adhoc-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    session = get_or_create_session(session_id)
    
    # Add user question to history
    session.add_turn("user", query.question)
    
    # 1. Search RAG documents across all relevant corpuses (study, repo, runtime)
    # This allows the Tutor to access course materials, repository knowledge, and runtime catalog
    rag_docs = search_rag_documents(
        query=query.question,
        sources=query.sources,
        course_id=query.course_id,
        corpuses=["study", "repo", "runtime"],  # Search all corpuses for comprehensive context
        enabled_only=True,
    )
    
    rag_context, citations = build_rag_context(rag_docs)
    
    # 2. Build mode-specific system prompt (+ runtime catalog guidance)
    mode_prompt = MODE_PROMPTS.get(query.mode, MODE_PROMPTS["Core"])
    system_prompt = BASE_SYSTEM_PROMPT.format(
        course_id=query.course_id or "Not specified",
        topic_id=query.topic_id or "Not specified",
        mode=query.mode,
        mode_prompt=mode_prompt
    )

    runtime_catalog = load_runtime_catalog_context()
    if runtime_catalog:
        system_prompt = (
            system_prompt
            + "\n\nRuntime Systems/Engines (user-selected):\n"
            + runtime_catalog
        )
    
    # 3. Build user prompt with context
    history_prompt = session.get_history_prompt()
    
    user_prompt_parts: list[str] = []
    
    if rag_context:
        user_prompt_parts.append("## Course Materials Context:")
        user_prompt_parts.append(rag_context)
        user_prompt_parts.append("")
    else:
        user_prompt_parts.append("[No matching course materials found for this query]")
        user_prompt_parts.append("")
    
    if history_prompt:
        user_prompt_parts.append(history_prompt)
        user_prompt_parts.append("")
    
    user_prompt_parts.append(f"## Current Question:\n{query.question}")
    
    full_user_prompt = "\n".join(user_prompt_parts)
    
    # 4. Call LLM (Codex Default) via Shared Provider
    from brain.llm_provider import call_llm
    
    llm_result = call_llm(system_prompt, full_user_prompt, provider="openrouter")
    
    if not llm_result["success"]:
        # Return error with fallback info
        error_msg = llm_result["error"]
        fallback_models = llm_result.get("fallback_models", [])
        
        err_summary = {
            "mode": query.mode,
            "error": error_msg,
            "fallback_needed": True,
            "fallback_models": fallback_models
        }
        
        return TutorTurnResponse(
            session_id=session_id,
            answer=f"**LLM Error**: {error_msg}\n\nPlease check API key in Settings.",
            citations=[],
            unverified=True,
            summary_json=json.dumps(err_summary)
        )
        
    response_text = llm_result["content"]
    
    # 5. Determine if response is verified
    # Unverified if: no RAG results, or response contains unverified marker
    unverified = (
        len(rag_docs) == 0 or 
        "[UNVERIFIED" in (response_text or "") or
        "not backed by" in (response_text or "").lower()
    )
    
    # Add unverified banner if needed and not already present
    if unverified and "[UNVERIFIED" not in (response_text or ""):
        response_text = f"[UNVERIFIED - not backed by your course materials]\n\n{response_text}"
    
    # 6. Add assistant response to history
    session.add_turn("assistant", response_text or "")
    
    # 7. Build summary for downstream tools
    summary: dict[str, Any] = {
        "mode": query.mode,
        "rag_docs_found": len(rag_docs),
        "session_turn_count": len(session.turns),
        "verified": not unverified
    }
    
    return TutorTurnResponse(
        session_id=session_id,
        answer=response_text or "",
        citations=citations,
        unverified=unverified,
        summary_json=json.dumps(summary)
    )


def log_tutor_turn(query: TutorQueryV1, response: TutorTurnResponse) -> int:
    """
    Log a Tutor turn to the database for analytics and Scholar review.
    Returns the turn ID.
    """
    init_database()
    conn = sqlite3.connect(DB_PATH, timeout=30)
    cur = conn.cursor()
    
    now = datetime.now().isoformat(timespec="seconds")
    
    cur.execute("""
        INSERT INTO tutor_turns (
            session_id, user_id, mode, question, answer, 
            citations_json, unverified, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        response.session_id,
        query.user_id,
        query.mode,
        query.question,
        response.answer,
        json.dumps([asdict(c) for c in response.citations]),
        1 if response.unverified else 0,
        now
    ))
    
    turn_id = cur.lastrowid
    conn.commit()
    conn.close()
    if turn_id is None:
        raise RuntimeError("Failed to insert tutor_turns row")
    return int(turn_id)


def process_tutor_turn_preamble(query: TutorQueryV1) -> dict:
    """
    Run the non-LLM parts of process_tutor_turn: session load, RAG search,
    prompt building. Returns dict with system_prompt, user_prompt, rag_docs,
    session, citations for the streaming endpoint to use.
    """
    try:
        session_id = query.session_id or f"adhoc-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        session = get_or_create_session(session_id)
        session.add_turn("user", query.question)

        # 1. RAG search
        rag_docs = search_rag_documents(
            query=query.question,
            sources=query.sources,
            course_id=query.course_id,
            corpuses=["study", "repo", "runtime"],
            enabled_only=True,
        )

        rag_context, citations = build_rag_context(rag_docs)

        # 2. Build mode-specific system prompt
        mode_prompt = MODE_PROMPTS.get(query.mode, MODE_PROMPTS["Core"])
        system_prompt = BASE_SYSTEM_PROMPT.format(
            course_id=query.course_id or "Not specified",
            topic_id=query.topic_id or "Not specified",
            mode=query.mode,
            mode_prompt=mode_prompt,
        )

        runtime_catalog = load_runtime_catalog_context()
        if runtime_catalog:
            system_prompt = (
                system_prompt
                + "\n\nRuntime Systems/Engines (user-selected):\n"
                + runtime_catalog
            )

        # 3. Build user prompt with context
        history_prompt = session.get_history_prompt()
        user_prompt_parts: list[str] = []

        if rag_context:
            user_prompt_parts.append("## Course Materials Context:")
            user_prompt_parts.append(rag_context)
            user_prompt_parts.append("")
        else:
            user_prompt_parts.append("[No matching course materials found for this query]")
            user_prompt_parts.append("")

        if history_prompt:
            user_prompt_parts.append(history_prompt)
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


def create_card_draft_from_turn(
    turn_id: int,
    front: str,
    back: str,
    hook: Optional[str] = None,
    tags: Optional[str] = None
) -> int:
    """
    Create a card draft from a Tutor turn for later review.
    Returns the card_draft ID.
    """
    init_database()
    conn = sqlite3.connect(DB_PATH, timeout=30)
    cur = conn.cursor()
    
    now = datetime.now().isoformat(timespec="seconds")
    
    cur.execute("""
        INSERT INTO card_drafts (
            source_turn_id, front, back, hook, tags, 
            status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?)
    """, (turn_id, front, back, hook, tags, now))
    
    card_id = cur.lastrowid
    conn.commit()
    conn.close()
    if card_id is None:
        raise RuntimeError("Failed to insert card_drafts row")
    return int(card_id)


# -----------------------------------------------------------------------------
# CLI for Testing
# -----------------------------------------------------------------------------

def main():
    """Simple CLI for testing the Tutor engine."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test the Tutor engine")
    parser.add_argument("question", help="Question to ask the Tutor")
    parser.add_argument("--mode", default="Core", choices=["Core", "Sprint", "Drill"])
    parser.add_argument("--session-id", help="Session ID for conversation continuity")
    
    args = parser.parse_args()
    
    query = TutorQueryV1(
        user_id="cli-test",
        session_id=args.session_id,
        course_id=None,
        topic_id=None,
        mode=args.mode,
        question=args.question,
        plan_snapshot_json="{}",
        sources=TutorSourceSelector()
    )
    
    print(f"Mode: {args.mode}")
    print(f"Question: {args.question}")
    print("-" * 40)
    
    response = process_tutor_turn(query)
    
    print(f"Session: {response.session_id}")
    print(f"Unverified: {response.unverified}")
    print(f"Citations: {len(response.citations)}")
    print("-" * 40)
    print(response.answer)


if __name__ == "__main__":
    main()
