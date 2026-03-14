"""Create the Study Session template in the Obsidian vault."""
from __future__ import annotations

import sys
from pathlib import Path

# Allow imports from brain/
sys.path.insert(0, str(Path(__file__).parent.parent))

from obsidian_vault import ObsidianVault

TEMPLATE_CONTENT = """---
course:
construct:
topic:
status: not-started
session_date: {{date}}
chain:
tutor_session_id:
---

# {{title}}

> **Parent:** [[_Index]]

## Learning Objectives

- [ ]

## Top-Down Overview


## Key Concepts

###

-

## Connections

-

## Recall Check


## Gaps & Questions

-

## Session Notes

"""

if __name__ == "__main__":
    vault = ObsidianVault()
    if not vault.is_available():
        print("ERROR: Obsidian is not running or CLI not available")
        sys.exit(1)
    vault.create_note(
        name="Study Session",
        folder="Templates",
        content=TEMPLATE_CONTENT,
        silent=True,
    )
    print("Created Templates/Study Session.md")
