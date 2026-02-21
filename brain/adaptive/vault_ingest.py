"""Obsidian vault filesystem ingestion for the adaptive mastery system.

Phase 1: scan files, parse YAML frontmatter, extract links, build alias table.
Operates on disk (not the Obsidian REST API) for batch processing.
"""
from __future__ import annotations

import hashlib
import os
import re
import sqlite3
import urllib.parse
from dataclasses import dataclass, field
from typing import List, Optional


# ---------------------------------------------------------------------------
# Task 1.1 — Vault scanner
# ---------------------------------------------------------------------------

# Folders to skip during scanning
_SKIP_DIRS = {".obsidian", ".trash", ".git", ".stversions"}


def scan_vault(vault_path: str) -> list[str]:
    """Discover all .md files under vault_path, skipping dot-folders.

    Returns a sorted list of absolute paths.
    """
    vault_path = os.path.abspath(vault_path)
    if not os.path.isdir(vault_path):
        raise FileNotFoundError(f"Vault path does not exist: {vault_path}")

    results: list[str] = []
    for dirpath, dirnames, filenames in os.walk(vault_path):
        # Prune dot-folders and known skip dirs in-place
        dirnames[:] = [
            d for d in dirnames
            if d not in _SKIP_DIRS and not d.startswith(".")
        ]
        for fname in filenames:
            if fname.endswith(".md"):
                results.append(os.path.join(dirpath, fname))

    results.sort()
    return results


# ---------------------------------------------------------------------------
# Task 1.2 — YAML frontmatter parsing
# ---------------------------------------------------------------------------

_FRONTMATTER_RE = re.compile(
    r"\A---\s*\n(.*?)\n---\s*\n",
    re.DOTALL,
)


@dataclass
class ParsedNote:
    """Result of parsing an Obsidian markdown note."""

    path: str
    frontmatter: dict = field(default_factory=dict)
    body: str = ""
    checksum: str = ""


def _parse_yaml_simple(raw: str) -> dict:
    """Minimal YAML parser for flat/list frontmatter (avoids PyYAML dep).

    Handles:
      key: value
      key:
        - item1
        - item2
    """
    result: dict = {}
    lines = raw.split("\n")
    current_key: Optional[str] = None
    current_list: Optional[list] = None

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        # List item (indented "- value")
        if stripped.startswith("- ") and current_key is not None:
            if current_list is None:
                current_list = []
                result[current_key] = current_list
            current_list.append(stripped[2:].strip())
            continue

        # Key-value pair
        if ":" in stripped:
            colon_idx = stripped.index(":")
            key = stripped[:colon_idx].strip()
            value = stripped[colon_idx + 1:].strip()
            current_key = key

            if value:
                # Inline value — strip quotes
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
                result[key] = value
                current_list = None
            else:
                # Value follows as list or block
                current_list = None

    return result


def parse_note(path: str) -> ParsedNote:
    """Parse a single Obsidian note: extract YAML frontmatter and body."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    checksum = hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]

    match = _FRONTMATTER_RE.match(content)
    if match:
        frontmatter = _parse_yaml_simple(match.group(1))
        body = content[match.end():]
    else:
        frontmatter = {}
        body = content

    return ParsedNote(
        path=path,
        frontmatter=frontmatter,
        body=body,
        checksum=checksum,
    )


# ---------------------------------------------------------------------------
# Task 1.3 — Link extraction
# ---------------------------------------------------------------------------

_WIKILINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]")
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+\.md)\)")


@dataclass
class NoteLink:
    """A link from one note to another."""

    source_path: str
    target: str
    link_text: str = ""


def extract_links(path: str) -> list[NoteLink]:
    """Extract wikilinks and markdown internal links from a note file."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    links: list[NoteLink] = []

    # Wikilinks: [[Target]] or [[Target|display text]]
    for match in _WIKILINK_RE.finditer(content):
        target = match.group(1).strip()
        links.append(NoteLink(source_path=path, target=target))

    # Markdown links to .md files: [text](Target.md) or [text](Target%20Name.md)
    for match in _MD_LINK_RE.finditer(content):
        link_text = match.group(1)
        raw_target = match.group(2)
        # Decode percent-encoded paths and strip .md extension
        target = urllib.parse.unquote(raw_target)
        if target.endswith(".md"):
            target = target[:-3]
        links.append(NoteLink(source_path=path, target=target, link_text=link_text))

    return links


# ---------------------------------------------------------------------------
# Task 1.4 — Alias normalization table
# Task 1.5 — Vault docs storage
# Task 1.7 — Incremental updates (checksum-based)
# ---------------------------------------------------------------------------

def create_vault_tables(conn: sqlite3.Connection) -> None:
    """Create tables for vault ingestion (idempotent)."""
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS vault_docs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            title TEXT,
            source TEXT NOT NULL DEFAULT 'obsidian',
            checksum TEXT NOT NULL,
            content TEXT NOT NULL,
            frontmatter_json TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS entity_aliases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alias TEXT NOT NULL,
            canonical TEXT NOT NULL,
            source_path TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS obsidian_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT NOT NULL,
            target TEXT NOT NULL,
            link_text TEXT DEFAULT ''
        )
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_vault_docs_path ON vault_docs(path)
    """)
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_entity_aliases_alias ON entity_aliases(alias)
    """)
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_obsidian_links_source ON obsidian_links(source_path)
    """)
    conn.commit()


def _note_title_from_path(path: str) -> str:
    """Extract note title from file path (filename without extension)."""
    return os.path.splitext(os.path.basename(path))[0]


def ingest_vault(vault_path: str, conn: sqlite3.Connection) -> dict:
    """Ingest all vault notes into the DB. Incremental: skips unchanged files.

    Returns summary dict with inserted/updated/skipped counts.
    """
    import json

    files = scan_vault(vault_path)
    cur = conn.cursor()

    # Load existing checksums for incremental comparison
    cur.execute("SELECT path, checksum FROM vault_docs")
    existing = {r[0]: r[1] for r in cur.fetchall()}

    inserted = 0
    updated = 0
    skipped = 0

    for fpath in files:
        parsed = parse_note(fpath)
        title = _note_title_from_path(fpath)
        fm_json = json.dumps(parsed.frontmatter) if parsed.frontmatter else None

        if fpath in existing:
            if existing[fpath] == parsed.checksum:
                skipped += 1
                continue
            # Changed — update
            cur.execute(
                """UPDATE vault_docs
                   SET checksum = ?, content = ?, frontmatter_json = ?,
                       title = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE path = ?""",
                (parsed.checksum, parsed.body, fm_json, title, fpath),
            )
            # Refresh links and aliases for this file
            _refresh_links_and_aliases(cur, fpath, parsed, title)
            updated += 1
        else:
            # New file — insert
            cur.execute(
                """INSERT INTO vault_docs (path, title, source, checksum, content, frontmatter_json)
                   VALUES (?, ?, 'obsidian', ?, ?, ?)""",
                (fpath, title, parsed.checksum, parsed.body, fm_json),
            )
            _refresh_links_and_aliases(cur, fpath, parsed, title)
            inserted += 1

    conn.commit()
    return {"inserted": inserted, "updated": updated, "skipped": skipped}


def _refresh_links_and_aliases(
    cur: sqlite3.Cursor,
    fpath: str,
    parsed: ParsedNote,
    title: str,
) -> None:
    """Replace links and aliases for a single note."""
    # Clear old data for this path
    cur.execute("DELETE FROM obsidian_links WHERE source_path = ?", (fpath,))
    cur.execute("DELETE FROM entity_aliases WHERE source_path = ?", (fpath,))

    # Insert links
    links = extract_links(fpath)
    for lnk in links:
        cur.execute(
            "INSERT INTO obsidian_links (source_path, target, link_text) VALUES (?, ?, ?)",
            (lnk.source_path, lnk.target, lnk.link_text),
        )

    # Insert aliases from frontmatter
    aliases = parsed.frontmatter.get("aliases", [])
    if isinstance(aliases, list):
        for alias in aliases:
            if alias:
                cur.execute(
                    "INSERT INTO entity_aliases (alias, canonical, source_path) VALUES (?, ?, ?)",
                    (alias, title, fpath),
                )


# ---------------------------------------------------------------------------
# Task 1.6 — Vault lint
# ---------------------------------------------------------------------------

@dataclass
class LintIssue:
    """A single lint issue found in a vault note."""

    path: str
    message: str
    severity: str = "warning"


def lint_vault(vault_path: str) -> dict:
    """Lint all notes in the vault. Returns deterministic report."""
    files = scan_vault(vault_path)
    issues: list[dict] = []

    for fpath in files:
        parsed = parse_note(fpath)

        # Rule: YAML must contain 'aliases' key (can be empty list)
        if "aliases" not in parsed.frontmatter:
            issues.append({
                "path": fpath,
                "message": "Missing 'aliases' field in YAML frontmatter",
                "severity": "warning",
            })

    # Sort for determinism
    issues.sort(key=lambda i: (i["path"], i["message"]))
    return {"issues": issues, "files_checked": len(files)}


def resolve_alias(conn, alias_text: str) -> str | None:
    """Resolve an alias to its canonical name (case-insensitive)."""
    if not alias_text:
        return None
    cur = conn.execute(
        "SELECT canonical FROM entity_aliases WHERE LOWER(alias) = LOWER(?)",
        (alias_text.strip(),),
    )
    row = cur.fetchone()
    return row["canonical"] if row else None


def build_alias_index(conn) -> dict[str, str]:
    """Build an in-memory alias→canonical dict for fast lookups."""
    cur = conn.execute("SELECT alias, canonical FROM entity_aliases")
    return {row["alias"].lower(): row["canonical"] for row in cur.fetchall()}
