"""
Tutor Tool Calling — tool schemas and execution functions.

Provides function-tool definitions for the OpenAI Responses API and
server-side execution handlers that call existing Brain endpoints.

Tools:
  1. save_to_obsidian  — append a study note to Obsidian vault
  2. create_note       — create a quick note on the dashboard Notes page
  3. create_anki_card  — draft an Anki flashcard for spaced repetition
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tool schemas (OpenAI Responses API function-tool format)
# ---------------------------------------------------------------------------

SAVE_TO_OBSIDIAN_SCHEMA: dict[str, Any] = {
    "type": "function",
    "name": "save_to_obsidian",
    "description": (
        "Save a study note to the user's Obsidian vault. "
        "Use when the student asks to save, export, or store notes, "
        "summaries, or key concepts to Obsidian."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": (
                    "Vault-relative markdown path, e.g. "
                    "'Study Notes/Anatomy/Hip Joint.md'"
                ),
            },
            "content": {
                "type": "string",
                "description": "Markdown content to append to the file",
            },
        },
        "required": ["path", "content"],
    },
}

CREATE_NOTE_SCHEMA: dict[str, Any] = {
    "type": "function",
    "name": "create_note",
    "description": (
        "Create a quick note on the student's dashboard Notes page. "
        "Use for action items, reminders, or brief observations during the session."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Short title for the note",
            },
            "content": {
                "type": "string",
                "description": "Note body text (markdown supported)",
            },
        },
        "required": ["title", "content"],
    },
}

CREATE_ANKI_CARD_SCHEMA: dict[str, Any] = {
    "type": "function",
    "name": "create_anki_card",
    "description": (
        "Create an Anki flashcard draft for spaced repetition review. "
        "Use when a key fact, definition, or concept should be memorized."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "front": {
                "type": "string",
                "description": "Question or prompt side of the card",
            },
            "back": {
                "type": "string",
                "description": "Answer side of the card",
            },
            "tags": {
                "type": "string",
                "description": "Space-separated tags, e.g. 'anatomy hip-joint muscles'",
            },
        },
        "required": ["front", "back"],
    },
}

# All tool schemas in a single list for passing to the API
TUTOR_TOOL_SCHEMAS: list[dict[str, Any]] = [
    SAVE_TO_OBSIDIAN_SCHEMA,
    CREATE_NOTE_SCHEMA,
    CREATE_ANKI_CARD_SCHEMA,
]


# ---------------------------------------------------------------------------
# Execution handlers
# ---------------------------------------------------------------------------


def execute_save_to_obsidian(arguments: dict[str, Any]) -> dict[str, Any]:
    """Save/append content to a file in the Obsidian vault."""
    path = arguments.get("path", "")
    content = arguments.get("content", "")

    if not path or not content:
        return {"success": False, "error": "Missing required fields: path and content"}

    try:
        from brain.dashboard.api_adapter import obsidian_append

        result = obsidian_append(path, content)
        if result.get("success"):
            log.info(
                "Tutor tool: saved to Obsidian — %s (%d bytes)", path, len(content)
            )
            return {
                "success": True,
                "message": f"Saved to Obsidian: {path}",
                "path": path,
                "bytes": len(content),
            }
        return {
            "success": False,
            "error": result.get("error", "Unknown Obsidian error"),
        }
    except Exception as e:
        log.exception("Tutor tool save_to_obsidian failed")
        return {"success": False, "error": str(e)}


def execute_create_note(arguments: dict[str, Any]) -> dict[str, Any]:
    """Create a quick note in the dashboard Notes page."""
    title = arguments.get("title", "")
    content = arguments.get("content", "")

    if not title:
        return {"success": False, "error": "Missing required field: title"}

    try:
        from brain.dashboard.api_adapter import get_connection

        conn = get_connection()
        cur = conn.cursor()
        now = datetime.now().isoformat()

        cur.execute(
            "SELECT MAX(position) FROM quick_notes WHERE note_type = ?", ("notes",)
        )
        max_pos = cur.fetchone()[0] or 0

        cur.execute(
            """
            INSERT INTO quick_notes (title, content, note_type, position, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (title, content, "notes", max_pos + 1, now, now),
        )
        note_id = cur.lastrowid
        conn.commit()
        conn.close()

        log.info("Tutor tool: created note #%d — %s", note_id, title)
        return {
            "success": True,
            "message": f"Created note: {title}",
            "note_id": note_id,
        }
    except Exception as e:
        log.exception("Tutor tool create_note failed")
        return {"success": False, "error": str(e)}


def execute_create_anki_card(
    arguments: dict[str, Any],
    *,
    session_id: str | int | None = None,
) -> dict[str, Any]:
    """Draft an Anki card in the card_drafts table."""
    front = arguments.get("front", "")
    back = arguments.get("back", "")
    tags = arguments.get("tags", "")

    if not front or not back:
        return {"success": False, "error": "Missing required fields: front and back"}

    try:
        from brain.dashboard.api_adapter import get_connection

        conn = get_connection()
        cur = conn.cursor()
        now = datetime.now().isoformat()

        cur.execute(
            """
            INSERT INTO card_drafts
            (session_id, course_id, topic_id, deck_name, card_type, front, back, tags, source_citation, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                None,
                None,
                "PT::Tutor",
                "basic",
                front,
                back,
                tags,
                "Tutor session",
                "draft",
                now,
            ),
        )
        card_id = cur.lastrowid
        conn.commit()
        conn.close()

        log.info("Tutor tool: created Anki card #%d", card_id)
        return {
            "success": True,
            "message": f"Created Anki card: {front[:60]}...",
            "card_id": card_id,
        }
    except Exception as e:
        log.exception("Tutor tool create_anki_card failed")
        return {"success": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Tool registry — maps tool names to execution functions
# ---------------------------------------------------------------------------

TOOL_REGISTRY: dict[str, Any] = {
    "save_to_obsidian": execute_save_to_obsidian,
    "create_note": execute_create_note,
    "create_anki_card": execute_create_anki_card,
}


def execute_tool(
    tool_name: str,
    arguments: dict[str, Any],
    *,
    session_id: str | int | None = None,
) -> dict[str, Any]:
    """Look up and execute a tool by name. Returns a result dict."""
    handler = TOOL_REGISTRY.get(tool_name)
    if not handler:
        return {"success": False, "error": f"Unknown tool: {tool_name}"}

    # Pass session_id for tools that need it
    if tool_name == "create_anki_card":
        return handler(arguments, session_id=session_id)
    return handler(arguments)


def get_tool_schemas() -> list[dict[str, Any]]:
    """Return all tool schemas for passing to the API."""
    return list(TUTOR_TOOL_SCHEMAS)
