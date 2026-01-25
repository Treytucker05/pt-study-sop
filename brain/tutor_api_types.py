#!/usr/bin/env python3
"""
Contracts and type definitions for the Tutor API.

These dataclasses define the wire format for the in-dashboard Tutor and
serve as a stable contract between:
- the web front-end,
- the Tutor backend, and
- downstream tools (Brain + RAG).

Implementation of the actual Tutor logic and endpoints will live in a
separate module (e.g. `tutor_api.py` or integrated into `dashboard_web.py`).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Literal, Optional, Sequence


TutorMode = Literal["Core", "Sprint", "Drill", "Diagnostic Sprint", "Teaching Sprint"]

TutorDocType = Literal[
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


@dataclass
class TutorSourceSelector:
    """
    Describes which RAG sources the Tutor is allowed to use for a session.

    The Tutor MUST treat these as a hard constraint (Source-Lock):
    - If `allowed_doc_ids` is non-empty, retrieval must only use those IDs.
    - If `allowed_kinds` is specified, retrieval must be limited to those doc types.
    - If no results are found under these constraints, answers must be marked
      as unverified or explicitly say that the material is missing.
    """

    allowed_doc_ids: Sequence[int] = field(default_factory=list)
    allowed_kinds: Sequence[TutorDocType] = field(
        default_factory=list
    )
    disallowed_doc_ids: Sequence[int] = field(default_factory=list)


@dataclass
class TutorQueryV1:
    """
    Single turn request from the dashboard Tutor UI.

    This object is designed to be JSON-serializable as-is and can be passed
    directly over HTTP (e.g. via `/api/tutor/session/turn`).
    """

    # Identity / session context
    user_id: str
    session_id: Optional[str]

    # Study context
    course_id: Optional[int]
    topic_id: Optional[int]
    mode: TutorMode

    # Natural language prompt from the user
    question: str

    # Snapshot from Brain (planning + readiness); free-form JSON string to
    # keep the contract stable while the internal shape evolves.
    plan_snapshot_json: str

    # Source-Lock controls for RAG
    sources: TutorSourceSelector

    # Optional: note/document context to bias retrieval
    notes_context_ids: Sequence[int] = field(default_factory=list)

    created_at: str = field(
        default_factory=lambda: datetime.now().isoformat(timespec="seconds")
    )


@dataclass
class TutorCitation:
    """Represents a single cited chunk from RAG in a Tutor response."""

    doc_id: int
    source_path: str
    doc_type: TutorDocType
    snippet: str


@dataclass
class TutorTurnResponse:
    """
    Canonical response shape for a Tutor turn.

    The dashboard should render:
    - `answer` as the main text,
    - `citations` as inline or side-panel source references,
    - `unverified` flag when the answer is not grounded in RAG.
    """

    session_id: str
    answer: str
    citations: List[TutorCitation] = field(default_factory=list)
    unverified: bool = False
    # Optional machine-readable summary for Brain / Scholar
    summary_json: Optional[str] = None

