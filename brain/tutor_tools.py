"""
Tutor Tool Calling — tool schemas and execution functions.

Provides function-tool definitions for the OpenAI Responses API and
server-side execution handlers that call existing Brain endpoints.

Tools:
  1. save_to_obsidian           — append a study note to Obsidian vault
  2. list_obsidian_paths        — list files/folders in the Obsidian vault
  3. read_obsidian_note         — read markdown note content from the vault
  4. search_obsidian_notes      — search notes in the vault by query
  5. create_note                — create a quick note on the dashboard Notes page
  6. create_anki_card           — draft an Anki flashcard for spaced repetition
  7. create_figma_diagram       — create a visual diagram in Figma (requires Figma MCP)
  8. save_learning_objectives   — persist approved LOs to DB and rebuild North Star
  9. rate_method_block          — record student feedback on a study method block
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

LIST_OBSIDIAN_PATHS_SCHEMA: dict[str, Any] = {
    "type": "function",
    "name": "list_obsidian_paths",
    "description": (
        "List files and folders in the user's Obsidian vault. "
        "Use when the student asks what you can see, browse a folder, or inspect structure."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "folder": {
                "type": "string",
                "description": (
                    "Vault-relative folder path to list. "
                    "Use empty string to list the vault root."
                ),
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of paths to return (default 100, max 500).",
                "minimum": 1,
                "maximum": 500,
            },
        },
        "required": [],
    },
}

READ_OBSIDIAN_NOTE_SCHEMA: dict[str, Any] = {
    "type": "function",
    "name": "read_obsidian_note",
    "description": (
        "Read a markdown note from the user's Obsidian vault. "
        "Use when the student asks to open, inspect, or summarize a specific note."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Vault-relative markdown path, e.g. 'Study Notes/Movement Science/Hip.md'.",
            },
            "max_chars": {
                "type": "integer",
                "description": "Maximum characters to return from note content (default 4000, max 20000).",
                "minimum": 200,
                "maximum": 20000,
            },
        },
        "required": ["path"],
    },
}

SEARCH_OBSIDIAN_NOTES_SCHEMA: dict[str, Any] = {
    "type": "function",
    "name": "search_obsidian_notes",
    "description": (
        "Search notes in the user's Obsidian vault by query. "
        "Use when the student asks to find where a concept appears across notes."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query text.",
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of matches to return (default 8, max 20).",
                "minimum": 1,
                "maximum": 20,
            },
        },
        "required": ["query"],
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

CREATE_FIGMA_DIAGRAM_SCHEMA: dict[str, Any] = {
    "type": "function",
    "name": "create_figma_diagram",
    "description": (
        "Create a visual diagram (flowchart, concept map, or hierarchy) in Figma. "
        "Use when the student asks to visualize relationships, processes, or "
        "hierarchies. Requires Figma Desktop with plugin running."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Diagram title, e.g. 'PEIRRO Learning Cycle'",
            },
            "diagram_type": {
                "type": "string",
                "enum": ["flowchart", "concept_map", "hierarchy", "process"],
                "description": "Type of diagram layout to use",
            },
            "nodes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "Unique node identifier",
                        },
                        "label": {
                            "type": "string",
                            "description": "Display text for the node",
                        },
                        "type": {
                            "type": "string",
                            "enum": [
                                "start",
                                "end",
                                "process",
                                "decision",
                                "concept",
                            ],
                            "description": "Node type (affects shape/color)",
                        },
                    },
                    "required": ["id", "label"],
                },
                "description": "Nodes/boxes in the diagram",
            },
            "edges": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "from": {
                            "type": "string",
                            "description": "Source node id",
                        },
                        "to": {
                            "type": "string",
                            "description": "Target node id",
                        },
                        "label": {
                            "type": "string",
                            "description": "Optional edge label",
                        },
                    },
                    "required": ["from", "to"],
                },
                "description": "Connections between nodes",
            },
        },
        "required": ["title", "diagram_type", "nodes"],
    },
}

SAVE_LEARNING_OBJECTIVES_SCHEMA: dict[str, Any] = {
    "type": "function",
    "name": "save_learning_objectives",
    "description": (
        "Save learning objectives to the database and rebuild the North Star note. "
        "You MUST call this tool when the student approves learning objectives. "
        "This persists them so future turns have real objective IDs instead of OBJ-UNMAPPED. "
        "Do not tell the student you cannot save — use this tool."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "objectives": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": 'Objective code, e.g. "OBJ-1", "OBJ-2"',
                        },
                        "description": {
                            "type": "string",
                            "description": "Full objective text",
                        },
                    },
                    "required": ["id", "description"],
                },
                "description": "List of learning objectives to save",
            },
            "save_folder": {
                "type": "string",
                "description": (
                    "Obsidian vault-relative folder path where the North Star and "
                    "study notes should be saved. Ask the student for this before "
                    "calling. Example: 'Study Notes/Movement Science/Construct 2/Hip and Pelvis'"
                ),
            },
        },
        "required": ["objectives"],
    },
}

RATE_METHOD_BLOCK_SCHEMA: dict[str, Any] = {
    "type": "function",
    "name": "rate_method_block",
    "description": (
        "Record the student's feedback on a study method block. "
        "Use when the student says a method worked well, didn't help, "
        "was too easy/hard, or gives any opinion on a study technique."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "block_name": {
                "type": "string",
                "description": "Name of the method block (e.g. 'Free Recall Quiz', 'Concept Mapping')",
            },
            "effectiveness": {
                "type": "integer",
                "description": "How effective the method was (1=not helpful, 3=neutral, 5=very helpful)",
                "minimum": 1,
                "maximum": 5,
            },
            "engagement": {
                "type": "integer",
                "description": "How engaged the student was (1=bored, 3=neutral, 5=very engaged)",
                "minimum": 1,
                "maximum": 5,
            },
            "notes": {
                "type": "string",
                "description": "Optional: specific feedback from the student",
            },
        },
        "required": ["block_name", "effectiveness", "engagement"],
    },
}

# All tool schemas in a single list for passing to the API
TUTOR_TOOL_SCHEMAS: list[dict[str, Any]] = [
    SAVE_TO_OBSIDIAN_SCHEMA,
    LIST_OBSIDIAN_PATHS_SCHEMA,
    READ_OBSIDIAN_NOTE_SCHEMA,
    SEARCH_OBSIDIAN_NOTES_SCHEMA,
    CREATE_NOTE_SCHEMA,
    CREATE_ANKI_CARD_SCHEMA,
    CREATE_FIGMA_DIAGRAM_SCHEMA,
    SAVE_LEARNING_OBJECTIVES_SCHEMA,
    RATE_METHOD_BLOCK_SCHEMA,
]


# ---------------------------------------------------------------------------
# Execution handlers
# ---------------------------------------------------------------------------


def execute_save_to_obsidian(
    arguments: dict[str, Any],
    *,
    session_id: str | int | None = None,
) -> dict[str, Any]:
    """Save/merge content to a file in the Obsidian vault and sync graph."""
    path = arguments.get("path", "")
    content = arguments.get("content", "")

    if not path or not content:
        return {"success": False, "error": "Missing required fields: path and content"}

    try:
        from brain.dashboard.api_tutor import save_tool_note_to_obsidian

        result = save_tool_note_to_obsidian(
            path=path,
            content=content,
            session_id=str(session_id) if session_id is not None else None,
        )
        if result.get("success"):
            log.info("Tutor tool: merged/saved to Obsidian — %s (%d bytes)", path, len(content))
        return result
    except Exception as e:
        log.exception("Tutor tool save_to_obsidian failed")
        return {"success": False, "error": str(e)}


def execute_list_obsidian_paths(arguments: dict[str, Any]) -> dict[str, Any]:
    """List files/folders from a vault folder path."""
    folder = str(arguments.get("folder") or "").strip()
    try:
        limit = int(arguments.get("limit", 100))
    except (TypeError, ValueError):
        limit = 100
    limit = max(1, min(500, limit))

    try:
        from brain.dashboard.api_adapter import obsidian_list_files

        result = obsidian_list_files(folder)
        if not result.get("success"):
            return {"success": False, "error": result.get("error", "list failed")}

        files = [str(p) for p in (result.get("files") or []) if str(p).strip()]
        files.sort(key=lambda v: (0 if v.endswith("/") else 1, v.lower()))
        return {
            "success": True,
            "message": f"Listed {min(len(files), limit)} path(s) from {folder or '/'}",
            "folder": folder or "/",
            "count": len(files),
            "paths": files[:limit],
            "truncated": len(files) > limit,
        }
    except Exception as e:
        log.exception("Tutor tool list_obsidian_paths failed")
        return {"success": False, "error": str(e)}


def execute_read_obsidian_note(arguments: dict[str, Any]) -> dict[str, Any]:
    """Read note content from Obsidian by vault-relative path."""
    path = str(arguments.get("path") or "").strip()
    if not path:
        return {"success": False, "error": "Missing required field: path"}

    try:
        max_chars = int(arguments.get("max_chars", 4000))
    except (TypeError, ValueError):
        max_chars = 4000
    max_chars = max(200, min(20000, max_chars))

    try:
        from brain.dashboard.api_adapter import obsidian_get_file

        result = obsidian_get_file(path)
        if not result.get("success"):
            return {"success": False, "error": result.get("error", "read failed")}

        content = str(result.get("content") or "")
        return {
            "success": True,
            "message": f"Read note: {path}",
            "path": result.get("path") or path,
            "content": content[:max_chars],
            "total_chars": len(content),
            "truncated": len(content) > max_chars,
        }
    except Exception as e:
        log.exception("Tutor tool read_obsidian_note failed")
        return {"success": False, "error": str(e)}


def execute_search_obsidian_notes(arguments: dict[str, Any]) -> dict[str, Any]:
    """Search Obsidian notes and return compact matches."""
    query = str(arguments.get("query") or "").strip()
    if not query:
        return {"success": False, "error": "Missing required field: query"}

    try:
        max_results = int(arguments.get("max_results", 8))
    except (TypeError, ValueError):
        max_results = 8
    max_results = max(1, min(20, max_results))

    try:
        from brain.dashboard.api_adapter import obsidian_health_check
        from obsidian_client import ObsidianClient

        health = obsidian_health_check()
        if not health.get("connected"):
            return {
                "success": False,
                "error": f"Obsidian unavailable: {health.get('error') or health.get('status') or 'offline'}",
            }

        client = ObsidianClient()
        hits = client.search(query, max_results=max_results)
        matches = []
        for item in hits[:max_results]:
            snippet = str(item.get("content") or "").strip()
            matches.append(
                {
                    "path": str(item.get("path") or ""),
                    "score": item.get("score", 0),
                    "snippet": snippet[:500],
                }
            )
        return {
            "success": True,
            "message": f"Found {len(matches)} note match(es) for query: {query}",
            "query": query,
            "matches": matches,
        }
    except Exception as e:
        log.exception("Tutor tool search_obsidian_notes failed")
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


def execute_create_figma_diagram(
    arguments: dict[str, Any],
    *,
    session_id: str | int | None = None,
) -> dict[str, Any]:
    """Create a visual diagram in Figma via MCP.

    Gracefully degrades when Figma MCP is not available.
    """
    title = arguments.get("title", "")
    diagram_type = arguments.get("diagram_type", "flowchart")
    nodes = arguments.get("nodes", [])
    edges = arguments.get("edges")

    if not title or not nodes:
        return {
            "success": False,
            "error": "Missing required fields: title and nodes",
        }

    try:
        from brain.figma_mcp_client import is_figma_available, create_diagram_sync

        status = is_figma_available()
        if not status["available"]:
            log.warning(
                "Tutor tool: Figma not available — %s",
                "; ".join(status["issues"]),
            )
            return {
                "success": False,
                "error": (
                    "Figma integration is not set up. " + "; ".join(status["issues"])
                ),
            }

        result = create_diagram_sync(title, diagram_type, nodes, edges)
        if result.get("success"):
            log.info(
                "Tutor tool: created Figma diagram — %s (%d nodes)",
                title,
                result.get("node_count", 0),
            )
        return result

    except ImportError:
        log.warning("Tutor tool: mcp package not installed")
        return {
            "success": False,
            "error": "Figma MCP not available: pip install mcp",
        }
    except Exception as e:
        log.exception("Tutor tool create_figma_diagram failed")
        return {"success": False, "error": str(e)}


def execute_save_learning_objectives(
    arguments: dict[str, Any],
    *,
    session_id: str | int | None = None,
) -> dict[str, Any]:
    """Persist approved learning objectives to DB and rebuild the North Star note."""
    objectives = arguments.get("objectives")
    if not objectives or not isinstance(objectives, list):
        return {"success": False, "error": "Missing required field: objectives (array)"}

    if session_id is None:
        return {"success": False, "error": "session_id is required"}

    save_folder = str(arguments.get("save_folder") or "").strip() or None

    try:
        from brain.dashboard.api_tutor import save_learning_objectives_from_tool

        result = save_learning_objectives_from_tool(
            session_id=str(session_id),
            objectives=objectives,
            save_folder=save_folder,
        )
        if result.get("success"):
            log.info(
                "Tutor tool: saved %d learning objectives for session %s",
                len(objectives),
                session_id,
            )
        return result
    except Exception as e:
        log.exception("Tutor tool save_learning_objectives failed")
        return {"success": False, "error": str(e)}


def execute_rate_method_block(
    arguments: dict[str, Any],
    *,
    session_id: str | int | None = None,
) -> dict[str, Any]:
    """Record student feedback on a method block."""
    block_name = arguments.get("block_name", "")
    effectiveness = arguments.get("effectiveness", 3)
    engagement = arguments.get("engagement", 3)
    notes = arguments.get("notes", "")

    if not block_name:
        return {"success": False, "error": "Missing required field: block_name"}

    try:
        from brain.dashboard.api_adapter import get_connection

        conn = get_connection()
        cur = conn.cursor()

        # Look up block by name (case-insensitive)
        cur.execute(
            "SELECT id FROM method_blocks WHERE LOWER(name) = LOWER(?)",
            (block_name,),
        )
        row = cur.fetchone()
        block_id = row[0] if row else None

        if not block_id:
            # Try slug match
            slug = block_name.lower().replace(" ", "-").replace("_", "-")
            cur.execute(
                "SELECT id FROM method_blocks WHERE slug = ?",
                (slug,),
            )
            row = cur.fetchone()
            block_id = row[0] if row else None

        # Get chain_id and brain_session_id from tutor session
        chain_id = None
        brain_session_id = None
        if session_id:
            cur.execute(
                "SELECT method_chain_id, brain_session_id FROM tutor_sessions WHERE session_id = ?",
                (str(session_id),),
            )
            sess_row = cur.fetchone()
            if sess_row:
                chain_id = sess_row[0]
                brain_session_id = sess_row[1]

        now = datetime.now().isoformat()
        cur.execute(
            """INSERT INTO method_ratings
            (method_block_id, chain_id, session_id, effectiveness, engagement, notes, context, rated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                block_id,
                chain_id,
                brain_session_id,
                effectiveness,
                engagement,
                notes,
                json.dumps({"source": "tutor_tool", "tutor_session_id": str(session_id)}),
                now,
            ),
        )
        rating_id = cur.lastrowid
        conn.commit()
        conn.close()

        log.info("Tutor tool: rated method block %s — eff=%d eng=%d", block_name, effectiveness, engagement)
        return {
            "success": True,
            "message": f"Recorded feedback for {block_name}: effectiveness={effectiveness}, engagement={engagement}",
            "rating_id": rating_id,
            "block_id": block_id,
        }
    except Exception as e:
        log.exception("Tutor tool rate_method_block failed")
        return {"success": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Tool registry — maps tool names to execution functions
# ---------------------------------------------------------------------------

TOOL_REGISTRY: dict[str, Any] = {
    "save_to_obsidian": execute_save_to_obsidian,
    "list_obsidian_paths": execute_list_obsidian_paths,
    "read_obsidian_note": execute_read_obsidian_note,
    "search_obsidian_notes": execute_search_obsidian_notes,
    "create_note": execute_create_note,
    "create_anki_card": execute_create_anki_card,
    "create_figma_diagram": execute_create_figma_diagram,
    "save_learning_objectives": execute_save_learning_objectives,
    "rate_method_block": execute_rate_method_block,
}

_OBSIDIAN_READ_TOOLS = {
    "list_obsidian_paths",
    "read_obsidian_note",
    "search_obsidian_notes",
}


def execute_tool(
    tool_name: str,
    arguments: dict[str, Any],
    *,
    session_id: str | int | None = None,
    allow_obsidian_read: bool = False,
) -> dict[str, Any]:
    """Look up and execute a tool by name. Returns a result dict."""
    handler = TOOL_REGISTRY.get(tool_name)
    if not handler:
        return {"success": False, "error": f"Unknown tool: {tool_name}"}

    if tool_name in _OBSIDIAN_READ_TOOLS and not allow_obsidian_read:
        return {
            "success": False,
            "error": "Obsidian browse tools are disabled for this turn. Enable Obsidian mode to use them.",
        }

    # Pass session_id for tools that need it
    if tool_name in (
        "save_to_obsidian",
        "create_anki_card",
        "create_figma_diagram",
        "save_learning_objectives",
        "rate_method_block",
    ):
        return handler(arguments, session_id=session_id)
    return handler(arguments)


def get_tool_schemas() -> list[dict[str, Any]]:
    """Return all tool schemas for passing to the API."""
    return list(TUTOR_TOOL_SCHEMAS)
