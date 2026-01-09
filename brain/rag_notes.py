#!/usr/bin/env python3
"""
Minimal local-first RAG helper for markdown notes.

Responsibilities (RAG MVP for notes):
- Ingest markdown note files into the shared Brain database (`rag_docs` table).
- Treat notes as first-class RAG documents (doc_type='note').
- Provide a simple search API that returns matching notes with short snippets.

This module deliberately stays dependency-light (sqlite3 + stdlib only).
Embeddings/vector search can be layered on later; for now we use basic
full-text search over the `content` column and keep the schema stable.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Optional

from db_setup import DB_PATH, init_database


@dataclass
class RagNote:
    """Lightweight view over a note stored in rag_docs."""

    id: int
    source_path: str
    course_id: Optional[int]
    topic_tags: str
    content: str

    @property
    def title(self) -> str:
        # Best-effort title: first markdown heading or filename.
        for line in self.content.splitlines():
            line = line.strip()
            if line.startswith("#"):
                return re.sub(r"^#+\s*", "", line)
        return Path(self.source_path).stem


def _connect() -> sqlite3.Connection:
    """Ensure DB and rag_docs table exist, then return a connection."""
    init_database()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _checksum(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _extract_front_matter(text: str) -> dict:
    """
    Parse a very simple YAML-style front matter block at the top of the file:

    ---
    course_id: DPT101
    topic_tags: hip, gait
    ---

    Returns a dict with string keys; values are raw strings.
    If no front matter is present, returns {}.
    """
    lines = text.splitlines()
    if not lines or not lines[0].strip().startswith("---"):
        return {}

    meta: dict[str, str] = {}
    for idx in range(1, len(lines)):
        line = lines[idx].strip()
        if line.startswith("---"):
            # End of front matter
            break
        if not line or ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    return meta


def _ingest_document(
    path: str,
    doc_type: str,
    course_id: Optional[int] = None,
    topic_tags: Optional[Iterable[str]] = None,
) -> int:
    """
    Shared ingestion implementation for any text-backed document type.
    """
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Note file not found: {file_path}")

    raw_text = file_path.read_text(encoding="utf-8")

    # For markdown we support optional front matter; for .txt we just keep all content.
    if file_path.suffix.lower() in {".md", ".markdown"}:
        meta = _extract_front_matter(raw_text)
        if raw_text.lstrip().startswith("---"):
            content = re.sub(
                r"^---[\s\S]*?---\s*",
                "",
                raw_text,
                count=1,
                flags=re.MULTILINE,
            )
        else:
            content = raw_text
    else:
        meta = {}
        content = raw_text

    # Topic tags: CLI arg wins > front matter > empty.
    if topic_tags is not None:
        tags = ", ".join(t.strip() for t in topic_tags if t.strip())
    else:
        tags = meta.get("topic_tags", "")

    # Course association: explicit int id if provided; otherwise keep NULL.
    course_val: Optional[int] = course_id
    try:
        if course_val is None and "course_id" in meta:
            # Allow numeric IDs only; string codes can be handled later by a mapping table.
            maybe_int = int(meta["course_id"])
            course_val = maybe_int
    except (TypeError, ValueError):
        course_val = None

    checksum = _checksum(content)
    now = datetime.now().isoformat(timespec="seconds")

    conn = _connect()
    cur = conn.cursor()

    # See if this path already exists for this doc_type.
    cur.execute(
        "SELECT id, checksum FROM rag_docs WHERE source_path = ? AND doc_type = ?",
        (str(file_path), doc_type),
    )
    row = cur.fetchone()

    metadata = {
        "front_matter": meta,
                "ingest_source": "rag_notes.py",
        "ingested_at": now,
    }

    if row:
        existing_id = row["id"]
        if row["checksum"] == checksum:
            conn.close()
            return existing_id

        cur.execute(
            """
            UPDATE rag_docs
            SET course_id = ?,
                topic_tags = ?,
                content = ?,
                checksum = ?,
                metadata_json = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                course_val,
                tags,
                content,
                checksum,
                str(metadata),
                now,
                existing_id,
            ),
        )
        conn.commit()
        conn.close()
        return existing_id

    # Insert new row.
    cur.execute(
        """
        INSERT INTO rag_docs (
            source_path,
            course_id,
            topic_tags,
            doc_type,
            content,
            checksum,
            metadata_json,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            str(file_path),
            course_val,
            tags,
            doc_type,
            content,
            checksum,
            str(metadata),
            now,
        ),
    )
    note_id = cur.lastrowid
    conn.commit()
    conn.close()
    return note_id


def ingest_markdown_note(
    path: str,
    course_id: Optional[int] = None,
    topic_tags: Optional[Iterable[str]] = None,
) -> int:
    """
    Ingest or update a single markdown note file into rag_docs.

    - `path` is stored as-is in `source_path`.
    - `doc_type` is fixed to 'note'.
    - If a row with the same `source_path` exists and the checksum is unchanged,
      it is left untouched.
    - If checksum changed, content and metadata are updated.

    Returns the rag_docs.id for this note.
    """
    return _ingest_document(path, "note", course_id=course_id, topic_tags=topic_tags)


def ingest_textbook_text(
    path: str,
    course_id: Optional[int] = None,
    topic_tags: Optional[Iterable[str]] = None,
) -> int:
    """
    Ingest a textbook or reading that has already been converted to plain text
    or markdown.

    This function does not perform PDF parsing itself; you are expected to
    export chapters/sections to `.md` or `.txt` first, then point this
    function at those files.
    """
    return _ingest_document(path, "textbook", course_id=course_id, topic_tags=topic_tags)


def ingest_transcript_text(
    path: str,
    course_id: Optional[int] = None,
    topic_tags: Optional[Iterable[str]] = None,
) -> int:
    """
    Ingest a class transcript that is stored as `.md` or `.txt`.

    Front matter keys like `lecture_date` or `instructor` will be preserved
    in the `metadata_json` blob for downstream tools to use.
    """
    return _ingest_document(
        path,
        "transcript",
        course_id=course_id,
        topic_tags=topic_tags,
    )


def search_notes(query: str, limit: int = 5) -> List[RagNote]:
    """
    Simple text search over note content and topic tags.

    This uses LIKE-based search for now; it is enough for a first-pass
    \"search my notes\" flow and can be upgraded to embeddings later
    without changing the external API.
    """
    if not query:
        return []

    conn = _connect()
    cur = conn.cursor()
    like = f"%{query}%"
    cur.execute(
        """
        SELECT id, source_path, course_id, topic_tags, content
        FROM rag_docs
        WHERE doc_type = 'note'
          AND (content LIKE ? OR topic_tags LIKE ?)
        ORDER BY id DESC
        LIMIT ?
        """,
        (like, like, limit),
    )
    rows = cur.fetchall()
    conn.close()

    return [
        RagNote(
            id=row[0],
            source_path=row[1],
            course_id=row[2],
            topic_tags=row[3] or "",
            content=row[4] or "",
        )
        for row in rows
    ]


def format_search_results(results: List[RagNote], query: str) -> str:
    """Render human-readable search results with short snippets."""
    if not results:
        return f"No notes found matching: {query!r}"

    lines: List[str] = []
    lines.append(f"Top {len(results)} note match(es) for: {query!r}")
    lines.append("")

    for note in results:
        rel_path = os.path.relpath(note.source_path, os.getcwd())
        tags = note.topic_tags or "-"

        # Build a tiny snippet around the first occurrence of the query.
        content_lower = note.content.lower()
        idx = content_lower.find(query.lower())
        if idx == -1:
            preview = note.content.strip().splitlines()[0:3]
            snippet = " ".join(preview)[:200]
        else:
            start = max(0, idx - 80)
            end = min(len(note.content), idx + 80)
            snippet = note.content[start:end].replace("\n", " ")

        lines.append(f"- [{note.id}] {note.title}")
        lines.append(f"  File: {rel_path}")
        lines.append(f"  Tags: {tags}")
        lines.append(f"  Snippet: {snippet.strip()}…")
        lines.append("")

    return "\n".join(lines)


def _cli_ingest(args: argparse.Namespace) -> None:
    count = 0
    for path_str in args.paths:
        try:
            note_id = ingest_markdown_note(
                path_str,
                course_id=args.course_id,
                topic_tags=args.topic_tags,
            )
            print(f"[OK] Ingested note {path_str} (id={note_id})")
            count += 1
        except Exception as exc:
            print(f"[ERROR] Failed to ingest {path_str}: {exc}")
    print(f"\nIngest complete. Files processed: {count}")


def _cli_search(args: argparse.Namespace) -> None:
    results = search_notes(args.query, limit=args.limit)
    print(format_search_results(results, args.query))


def main(argv: Optional[List[str]] = None) -> None:
    parser = argparse.ArgumentParser(
        description="Minimal RAG helper for markdown notes (Brain/pt-study)."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    ingest_p = subparsers.add_parser(
        "ingest", help="Ingest one or more markdown note files into rag_docs"
    )
    ingest_p.add_argument("paths", nargs="+", help="Paths to markdown note files")
    ingest_p.add_argument(
        "--course-id",
        type=int,
        help="Optional numeric course_id to associate with all ingested notes",
    )
    ingest_p.add_argument(
        "--topic-tags",
        nargs="*",
        help="Optional topic tags to associate (space-separated; e.g. hip gait anatomy)",
    )
    ingest_p.set_defaults(func=_cli_ingest)

    search_p = subparsers.add_parser(
        "search", help="Search ingested notes for a query string"
    )
    search_p.add_argument("query", help="Search query text")
    search_p.add_argument(
        "--limit", type=int, default=5, help="Maximum number of notes to return"
    )
    search_p.set_defaults(func=_cli_search)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()

