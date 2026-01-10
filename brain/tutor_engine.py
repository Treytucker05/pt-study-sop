#!/usr/bin/env python3
"""
Tutor Engine - Codex-powered conversational tutor for PT Study Brain.

This module provides the core Tutor functionality:
- Codex CLI integration for LLM responses
- RAG search with source-lock filtering
- Mode-specific behavior (Core/Sprint/Drill)
- Session context management
- Citation extraction and verification
"""

from __future__ import annotations

import os
import re
import json
import subprocess
import sqlite3
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Literal, Optional, cast

# Import our types
import sys
sys.path.insert(0, str(Path(__file__).parent))
from tutor_api_types import (
    TutorSourceSelector, TutorQueryV1, 
    TutorCitation, TutorTurnResponse
)
from db_setup import DB_PATH, init_database

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

MAX_RAG_RESULTS = 5
MAX_CONTEXT_CHARS = 50000  # ~12k tokens for context, leaving room for response
MAX_HISTORY_TURNS = 10
MAX_HISTORY_CHARS_PER_TURN = 500

# Mode-specific prompts based on M5-modes.md
MODE_PROMPTS = {
    "Core": """You are a PT Study Tutor in CORE MODE (Guided Learning).
- The student is learning new material - lead with teaching
- Follow the PEIRRO cycle: Prime -> Encode -> Interleave -> Retrieve -> Reinforce -> Output
- Use the KWIK encoding protocol when building understanding
- Provide scaffolding, metaphors, and structure
- Ask the student to create their own hooks/mnemonics (Seed-Lock)
- Function before structure: explain WHY before WHAT""",

    "Sprint": """You are a PT Study Tutor in SPRINT MODE (Test-First / Fail-First).
- The student has some knowledge - test first, teach only on miss
- Rapid-fire questioning to find gaps
- Keep answers concise - don't over-explain unless they miss
- Create desirable difficulty through testing
- When they miss: provide a hook and retry
- When they get it: move to next topic quickly""",

    "Drill": """You are a PT Study Tutor in DRILL MODE (Deep Practice).
- The student has identified a weak spot - go deep
- Have them reconstruct their understanding step by step
- Flag gaps and demand multiple hooks/mnemonics
- Test from multiple angles and variations
- Slower pace, thorough coverage
- Don't move on until the concept is locked""",

    "Diagnostic Sprint": """You are a PT Study Tutor in DIAGNOSTIC SPRINT MODE.
- Quickly assess what the student knows and doesn't know
- Ask probing questions across the topic
- Build a mental map of their understanding gaps
- No teaching yet - just assessment
- Summarize findings and recommend next mode""",

    "Teaching Sprint": """You are a PT Study Tutor in TEACHING SPRINT MODE.
- Quick, focused teaching session
- Cover one concept thoroughly but efficiently
- Build one strong hook/mnemonic
- Test understanding at the end
- Time-boxed: aim for 10-15 minute coverage"""
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
    enabled_only: bool = True,
) -> list[RAGDocument]:
    """
    Search rag_docs with source-lock filtering.
    
    Source-Lock rules (from TutorSourceSelector):
    - If allowed_doc_ids is non-empty, only return those IDs
    - If allowed_kinds is specified, filter by doc_type
    - Exclude any disallowed_doc_ids
    """
    init_database()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Build query with filters
    conditions: list[str] = []
    params: list[Any] = []

    # Corpus isolation
    if corpus:
        conditions.append("COALESCE(corpus, 'runtime') = ?")
        params.append(corpus)

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
    
    # Text search (LIKE-based for now, embeddings in v2)
    if query:
        like_pattern = f"%{query}%"
        conditions.append("(content LIKE ? OR topic_tags LIKE ? OR source_path LIKE ?)")
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
    conn = sqlite3.connect(DB_PATH)
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
        # Prepare snippet for context
        snippet = doc.content[:2000]  # First 2000 chars per doc
        if len(doc.content) > 2000:
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
            snippet=doc.content[:200] + "..." if len(doc.content) > 200 else doc.content
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
# Codex CLI Integration
# -----------------------------------------------------------------------------

def find_codex_cli() -> Optional[str]:
    """Find Codex CLI executable path."""
    # Check npm global install location first (Windows)
    npm_path = Path(os.environ.get("APPDATA", "")) / "npm" / "codex.cmd"
    if npm_path.exists():
        return str(npm_path)
    
    # Try to find in PATH
    try:
        result = subprocess.run(
            ["where.exe", "codex"] if os.name == "nt" else ["which", "codex"],
            capture_output=True,
            timeout=5,
            text=True,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split('\n')[0]
    except:
        pass
    
    return None


def call_codex(prompt: str, system_prompt: str, timeout: int = 60) -> tuple[Optional[str], Optional[str]]:
    """
    Call Codex CLI with the given prompt.
    
    Returns: (response_text, error_message)
    """
    codex_cmd = find_codex_cli()
    if not codex_cmd:
        return None, "Codex CLI not found. Install with: npm install -g @openai/codex"
    
    repo_root = Path(__file__).parent.parent.resolve()
    
    # Build the full prompt
    full_prompt = f"""System Instructions:
{system_prompt}

---

User Question:
{prompt}

---

Respond as the Tutor. Follow the mode-specific behavior described above.
"""
    
    try:
        result = subprocess.run(
            [
                codex_cmd, "exec",
                "--dangerously-bypass-approvals-and-sandbox",
                "-C", str(repo_root),
                full_prompt
            ],
            capture_output=True,
            timeout=timeout,
            text=True,
            cwd=str(repo_root),
            encoding="utf-8"
        )
        
        if result.returncode == 0:
            return result.stdout.strip(), None
        else:
            error = result.stderr.strip() if result.stderr else f"Codex exited with code {result.returncode}"
            return None, error
            
    except subprocess.TimeoutExpired:
        return None, "Codex request timed out"
    except Exception as e:
        return None, f"Codex error: {str(e)}"


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
    
    # 1. Search Study RAG with source-lock
    rag_docs = search_rag_documents(
        query=query.question,
        sources=query.sources,
        course_id=query.course_id,
        corpus="study",
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
    
    # 4. Call Codex
    response_text, error = call_codex(full_user_prompt, system_prompt)
    
    if error:
        # Return error response
        return TutorTurnResponse(
            session_id=session_id,
            answer=f"I encountered an error: {error}\n\nPlease try again or check that Codex CLI is configured correctly.",
            citations=[],
            unverified=True
        )
    
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
    conn = sqlite3.connect(DB_PATH)
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
    conn = sqlite3.connect(DB_PATH)
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
