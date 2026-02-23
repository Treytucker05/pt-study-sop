"""
Tutor Chains — Artifact command detection for Adaptive Tutor.
"""

from __future__ import annotations

import re
from typing import Optional


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
