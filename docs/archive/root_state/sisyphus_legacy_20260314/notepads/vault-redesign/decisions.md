# vault-redesign: Decisions

## [2026-03-02] Session Start — All Confirmed by User

1. "Map of Contents" (written out) — NOT "MOC", NOT "North Star"
2. File name: `_Map of Contents.md`
3. LO extraction during PRIME block — auto via LLM tool call
4. Per-block auto-write: fire-and-forget on block completion
5. CLI migration: full — drop REST API dependency for Obsidian ops
6. vault_courses.yaml: Spring 2026 courses only (PHYT_6216, 6220, 6313, 6314, 6443)
7. Templates use str.format_map() + _SafeFormatDict (NOT Jinja2)
8. No pre-created vault folders — create on first session output
9. Frontend course dropdown: flat dropdown via API (no tree picker)
10. Tests after implementation (pytest)
