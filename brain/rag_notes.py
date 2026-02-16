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
from typing import Any, Callable, Iterable, List, Optional

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


def _checksum_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _infer_file_type(source_path: str, fallback: str = "other") -> str:
    path_suffix = Path(source_path).suffix.lower()
    if path_suffix in {".md", ".markdown"}:
        return "md"
    if path_suffix == ".txt":
        return "txt"
    if path_suffix == ".docx":
        return "docx"
    if path_suffix in {".ppt", ".pptx"}:
        return "pptx"
    if path_suffix == ".pdf":
        return "pdf"
    if path_suffix == ".mp4":
        return "mp4"
    if path_suffix == ".py":
        return "py"
    if path_suffix == ".json":
        return "json"
    return fallback or "other"


def _upsert_rag_doc(
    *,
    source_path: str,
    doc_type: str,
    course_id: Optional[int],
    topic_tags: str,
    content: str,
    checksum: str,
    metadata: dict,
    corpus: str = "runtime",
    folder_path: str = "",
    enabled: int = 1,
    file_type: Optional[str] = None,
    file_size: Optional[int] = None,
) -> int:
    now = datetime.now().isoformat(timespec="seconds")
    conn = _connect()
    cur = conn.cursor()
    normalized_file_type = (file_type or "").strip().lower()
    if not normalized_file_type:
        normalized_file_type = _infer_file_type(source_path, fallback=doc_type)
    normalized_file_size = int(file_size) if file_size is not None else None

    cur.execute(
        "SELECT id, checksum FROM rag_docs WHERE source_path = ? AND COALESCE(corpus, 'runtime') = ?",
        (source_path, corpus),
    )
    row = cur.fetchone()

    if row:
        existing_id = int(row["id"])
        if (row["checksum"] or "") == checksum:
            cur.execute(
                """
                UPDATE rag_docs
                SET file_type = COALESCE(?, file_type),
                    file_size = COALESCE(?, file_size),
                    metadata_json = COALESCE(?, metadata_json),
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    normalized_file_type,
                    normalized_file_size,
                    str(metadata),
                    now,
                    existing_id,
                ),
            )
            conn.commit()
            conn.close()
            return existing_id

        cur.execute(
            """
            UPDATE rag_docs
            SET course_id = ?,
                topic_tags = ?,
                content = ?,
                doc_type = ?,
                file_type = ?,
                file_size = COALESCE(?, file_size),
                checksum = ?,
                metadata_json = ?,
                corpus = ?,
                folder_path = ?,
                enabled = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                course_id,
                topic_tags,
                content,
                doc_type,
                normalized_file_type,
                normalized_file_size,
                checksum,
                str(metadata),
                corpus,
                folder_path,
                enabled,
                now,
                existing_id,
            ),
        )
        conn.commit()
        conn.close()
        return existing_id

    cur.execute(
        """
        INSERT INTO rag_docs (
            source_path,
            course_id,
            topic_tags,
            doc_type,
            file_type,
            file_size,
            content,
            checksum,
            metadata_json,
            corpus,
            folder_path,
            enabled,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            source_path,
            course_id,
            topic_tags,
            doc_type,
            normalized_file_type,
            normalized_file_size,
            content,
            checksum,
            str(metadata),
            corpus,
            folder_path,
            enabled,
            now,
        ),
    )
    doc_id = cur.lastrowid
    conn.commit()
    conn.close()
    return doc_id


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
    file_size = file_path.stat().st_size if file_path.exists() else None

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
            cur.execute(
                """
                UPDATE rag_docs
                SET file_size = COALESCE(?, file_size),
                    metadata_json = COALESCE(?, metadata_json),
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    file_size,
                    str(metadata),
                    now,
                    existing_id,
                ),
            )
            conn.commit()
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
                file_size = COALESCE(?, file_size),
                updated_at = ?
            WHERE id = ?
            """,
            (
                course_val,
                tags,
                content,
                checksum,
                str(metadata),
                file_size,
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
            file_type,
            file_size,
            content,
            checksum,
            metadata_json,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            str(file_path),
            course_val,
            tags,
            doc_type,
            _infer_file_type(str(file_path), fallback=doc_type),
            file_size,
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


def ingest_document(
    path: str,
    doc_type: str,
    course_id: Optional[int] = None,
    topic_tags: Optional[Iterable[str]] = None,
    *,
    corpus: str = "runtime",
    folder_path: str = "",
    enabled: int = 1,
) -> int:
    """Public ingestion API for any RAG document.

    - For text-backed docs, stores full content for retrieval.
    - For media/docs that may need extraction (pdf/powerpoint/mp4), tries to extract text first.
    """
    binary_types = {"pdf", "powerpoint", "mp4", "docx"}
    if doc_type in binary_types:
        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Try text extraction for binary docs, but keep a metadata-only fallback.
        content = ""
        extraction_error = None
        if doc_type in {"pdf", "powerpoint", "docx"}:
            try:
                from text_extractor import extract_text

                extracted = extract_text(str(file_path))
                content = extracted.get("content", "") or ""
                extraction_error = extracted.get("error")
            except Exception as exc:
                extraction_error = str(exc)
                content = ""

        # Use content hash when content is available for stable updates; otherwise file bytes.
        if content:
            checksum = _checksum(content)
        else:
            checksum = _checksum_bytes(file_path.read_bytes())
        file_size = file_path.stat().st_size
        tags = ", ".join(t.strip() for t in (topic_tags or []) if t.strip())
        metadata = {
            "binary": True,
            "ingest_source": "rag_notes.py",
            "ingested_at": datetime.now().isoformat(timespec="seconds"),
            "note": "Binary file processed with extractor when available; content may be empty when extraction fails.",
        }
        if extraction_error:
            metadata["extraction_error"] = extraction_error
        return _upsert_rag_doc(
            source_path=str(file_path),
            doc_type=doc_type,
            course_id=course_id,
            topic_tags=tags,
            content=content,
            checksum=checksum,
            metadata=metadata,
            corpus=corpus,
            folder_path=folder_path,
            enabled=enabled,
            file_size=file_size,
        )

    # Text-backed docs
    doc_id = _ingest_document(path, doc_type, course_id=course_id, topic_tags=topic_tags)
    # Ensure corpus/folder/enabled are set for this doc_id
    try:
        now = datetime.now().isoformat(timespec="seconds")
        conn = _connect()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE rag_docs
            SET corpus = ?, folder_path = ?, enabled = ?, updated_at = ?
            WHERE id = ?
            """,
            (corpus, folder_path, enabled, now, doc_id),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass
    return doc_id


def ingest_url_document(
    url: str,
    doc_type: str,
    course_id: Optional[int] = None,
    topic_tags: Optional[Iterable[str]] = None,
    content: str = "",
    *,
    corpus: str = "study",
    folder_path: str = "links",
    enabled: int = 1,
) -> int:
    """Ingest a URL as a RAG doc (metadata-first).

    Used for things like YouTube links. Content can be added later (e.g., transcript).
    """
    tags = ", ".join(t.strip() for t in (topic_tags or []) if t.strip())
    checksum = _checksum(url + "\n" + content + "\n" + tags)
    metadata = {
        "url": True,
        "ingest_source": "rag_notes.py",
        "ingested_at": datetime.now().isoformat(timespec="seconds"),
        "note": "URL record stored; content may be empty until transcript/notes are added.",
    }
    return _upsert_rag_doc(
        source_path=url,
        doc_type=doc_type,
        course_id=course_id,
        topic_tags=tags,
        content=content,
        checksum=checksum,
        metadata=metadata,
        corpus=corpus,
        folder_path=folder_path,
        enabled=enabled,
    )


def _infer_doc_type_from_suffix(suffix: str) -> str:
    s = suffix.lower()
    if s in {".md", ".markdown"}:
        return "transcript"
    if s == ".txt":
        return "txt"
    if s in {".doc", ".docx"}:
        return "docx"
    if s in {".ppt", ".pptx"}:
        return "powerpoint"
    if s == ".pdf":
        return "pdf"
    if s == ".mp4":
        return "mp4"
    return "other"


def sync_folder_to_rag(
    root_dir: str,
    *,
    corpus: str = "study",
    allowed_exts: Optional[set[str]] = None,
    exclude_dir_names: Optional[set[str]] = None,
    progress_callback: Optional[Callable[[dict[str, Any]], None]] = None,
) -> dict:
    """Sync a folder tree into rag_docs.

    Intended for the Study RAG drop-folder: add files to the folder, then
    call sync to ingest/update. (Deletes are not removed from DB in v1.)
    """
    root = Path(root_dir)
    if not root.exists() or not root.is_dir():
        raise FileNotFoundError(f"Folder not found: {root}")

    if allowed_exts is None:
        allowed_exts = {
            ".md",
            ".markdown",
            ".txt",
            ".pdf",
            ".docx",
            ".ppt",
            ".pptx",
            ".mp4",
        }
    else:
        allowed_exts = {
            (ext.lower() if ext.startswith(".") else f".{ext.lower()}")
            for ext in allowed_exts
        }
    if exclude_dir_names is None:
        exclude_dir_names = {".git", ".venv", "__pycache__"}

    def _emit_progress(payload: dict[str, Any]) -> None:
        if not progress_callback:
            return
        try:
            progress_callback(payload)
        except Exception:
            # Progress reporting is best-effort and should never block sync.
            pass

    candidate_files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(str(root)):
        dirnames[:] = [d for d in dirnames if d not in exclude_dir_names]
        for filename in filenames:
            file_path = Path(dirpath) / filename
            if file_path.suffix.lower() not in allowed_exts:
                continue
            candidate_files.append(file_path)

    total_files = len(candidate_files)
    processed = 0
    errors: list[str] = []
    ingested_ids: list[int] = []

    _emit_progress(
        {
            "phase": "syncing",
            "processed": processed,
            "total": total_files,
            "index": 0,
            "current_file": None,
            "errors": len(errors),
        }
    )

    for index, file_path in enumerate(candidate_files, start=1):
        rel_file = os.path.relpath(str(file_path), str(root)).replace("\\", "/")
        rel_folder = os.path.relpath(str(file_path.parent), str(root)).replace("\\", "/")
        if rel_folder == ".":
            rel_folder = ""

        _emit_progress(
            {
                "phase": "syncing",
                "processed": processed,
                "total": total_files,
                "index": index,
                "current_file": rel_file,
                "errors": len(errors),
            }
        )

        doc_type = _infer_doc_type_from_suffix(file_path.suffix)
        try:
            doc_id = ingest_document(
                path=str(file_path),
                doc_type=doc_type,
                course_id=None,
                topic_tags=["study-folder"],
                corpus=corpus,
                folder_path=rel_folder,
                enabled=1,
            )
            ingested_ids.append(int(doc_id))
            processed += 1
        except Exception as exc:
            errors.append(f"{file_path}: {exc}")

        _emit_progress(
            {
                "phase": "syncing",
                "processed": processed,
                "total": total_files,
                "index": index,
                "current_file": rel_file,
                "errors": len(errors),
            }
        )

    _emit_progress(
        {
            "phase": "completed",
            "processed": processed,
            "total": total_files,
            "index": total_files,
            "current_file": None,
            "errors": len(errors),
        }
    )

    return {
        "ok": len(errors) == 0,
        "root": str(root),
        "total": total_files,
        "processed": processed,
        "failed": len(errors),
        "errors": errors,
        "doc_ids": ingested_ids,
    }


def _extract_brief_description(markdown_text: str, max_chars: int = 240) -> str:
    lines = [ln.rstrip() for ln in markdown_text.splitlines()]
    # find first heading
    start = 0
    for i, ln in enumerate(lines):
        if ln.strip().startswith("#"):
            start = i + 1
            break
    # first non-empty paragraph-ish
    buf: list[str] = []
    for ln in lines[start:]:
        s = ln.strip()
        if not s:
            if buf:
                break
            continue
        if s.startswith("#"):
            if buf:
                break
            continue
        buf.append(s)
        if sum(len(x) for x in buf) > max_chars:
            break
    desc = " ".join(buf).strip()
    if len(desc) > max_chars:
        desc = desc[: max_chars - 3].rstrip() + "..."
    return desc


def sync_runtime_catalog(repo_root: str) -> dict:
    """Generate a compact Runtime catalog (systems/engines) into rag_docs.

    Prefer the v9.3 runtime bundle under sop/runtime/knowledge_upload.
    Fall back to sop/gpt-knowledge for legacy layouts.
    """
    root = Path(repo_root)
    runtime_candidates = [
        root / "sop" / "runtime" / "knowledge_upload",
        root / "sop" / "gpt-knowledge",
    ]
    runtime_dir = None
    for candidate in runtime_candidates:
        if candidate.exists():
            runtime_dir = candidate
            break

    if not runtime_dir:
        raise FileNotFoundError(
            "Missing runtime canon folder: expected sop/runtime/knowledge_upload or sop/gpt-knowledge"
        )

    md_files = sorted(runtime_dir.glob("*.md"))
    processed = 0
    errors: list[str] = []

    for f in md_files:
        try:
            text = f.read_text(encoding="utf-8")
            title = f.stem
            desc = _extract_brief_description(text)

            name = f.name.lower()
            if "engine" in name:
                group = "Engines"
            elif "module" in name or name.startswith("01_"):
                group = "Modules"
            elif "framework" in name or "series" in name:
                group = "Frameworks"
            elif "logging" in name or "template" in name:
                group = "Logging"
            else:
                group = "Runtime"

            content = f"{title}\n\n{desc}\n\nSource file: {f.as_posix()}"
            _upsert_rag_doc(
                source_path=f"runtime://{f.stem}",
                doc_type="other",
                course_id=None,
                topic_tags=f"runtime, {group.lower()}, sop",
                content=content,
                checksum=_checksum(content),
                metadata={
                    "source_file": str(f),
                    "kind": "runtime_catalog",
                    "runtime_root": str(runtime_dir),
                },
                corpus="runtime",
                folder_path=group,
                enabled=1,
            )
            processed += 1
        except Exception as exc:
            errors.append(f"{f}: {exc}")

    return {"ok": len(errors) == 0, "processed": processed, "errors": errors}


def _chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks for better RAG retrieval."""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
    return chunks


def index_repo_to_rag(repo_root: str) -> dict:
    """Index repository files (sop/, brain/, docs/) into rag_docs for RAG search.
    
    Files are chunked and stored with source attribution for retrieval.
    Existing entries are updated if content changes (checksum-based).
    
    Returns: dict with ok, processed, chunks_created, errors
    """
    root = Path(repo_root)
    if not root.exists():
        raise FileNotFoundError(f"Repo root not found: {repo_root}")
    
    # Folders to index
    index_folders = ["sop", "brain", "docs"]
    # File extensions to index
    allowed_exts = {".md", ".py", ".txt", ".json"}
    # Folders/patterns to skip
    exclude_patterns = {"__pycache__", ".git", "node_modules", "data", "output", ".venv", "venv"}
    
    processed = 0
    chunks_created = 0
    errors: List[str] = []
    
    for folder_name in index_folders:
        folder = root / folder_name
        if not folder.exists():
            continue
        
        for dirpath, dirnames, filenames in os.walk(str(folder)):
            # Prune excluded directories
            dirnames[:] = [d for d in dirnames if d not in exclude_patterns]
            
            for filename in filenames:
                file_path = Path(dirpath) / filename
                if file_path.suffix.lower() not in allowed_exts:
                    continue
                
                try:
                    content = file_path.read_text(encoding="utf-8")
                    rel_path = file_path.relative_to(root).as_posix()
                    file_size = file_path.stat().st_size
                    
                    # Determine doc type based on extension
                    ext = file_path.suffix.lower()
                    if ext == ".py":
                        doc_type = "code"
                    elif ext == ".md":
                        doc_type = "documentation"
                    elif ext == ".json":
                        doc_type = "config"
                    else:
                        doc_type = "text"
                    
                    # Chunk the content
                    chunks = _chunk_text(content)
                    
                    for i, chunk in enumerate(chunks):
                        chunk_id = f"{rel_path}::chunk_{i}" if len(chunks) > 1 else rel_path
                        
                        # Build chunk with source header for context
                        chunk_with_header = f"# Source: {rel_path}\n\n{chunk}"
                        
                        checksum = _checksum(chunk_with_header)
                        metadata = {
                            "source_file": rel_path,
                            "chunk_index": i,
                            "total_chunks": len(chunks),
                            "kind": "repo_index",
                            "folder": folder_name,
                        }
                        
                        _upsert_rag_doc(
                            source_path=chunk_id,
                            doc_type=doc_type,
                            course_id=None,
                            topic_tags=f"repo, {folder_name}, {doc_type}",
                            content=chunk_with_header,
                            checksum=checksum,
                            metadata=metadata,
                            corpus="repo",
                            folder_path=folder_name,
                            enabled=1,
                            file_size=file_size,
                        )
                        chunks_created += 1
                    
                    processed += 1
                except Exception as exc:
                    errors.append(f"{file_path}: {exc}")
    
    return {
        "ok": len(errors) == 0,
        "processed": processed,
        "chunks_created": chunks_created,
        "errors": errors[:20],  # Limit error list
    }


def search_rag_docs(query: str, limit: int = 5, corpus: Optional[str] = None) -> List[dict]:
    """Search RAG documents for relevant content.
    
    Returns list of dicts with id, source_path, content, doc_type, corpus, snippet.
    """
    if not query:
        return []
    
    conn = _connect()
    cur = conn.cursor()
    like = f"%{query}%"
    
    if corpus:
        cur.execute(
            """
            SELECT id, source_path, content, doc_type, corpus, topic_tags
            FROM rag_docs
            WHERE (content LIKE ? OR topic_tags LIKE ? OR source_path LIKE ?)
              AND corpus = ?
              AND enabled = 1
            ORDER BY id DESC
            LIMIT ?
            """,
            (like, like, like, corpus, limit),
        )
    else:
        cur.execute(
            """
            SELECT id, source_path, content, doc_type, corpus, topic_tags
            FROM rag_docs
            WHERE (content LIKE ? OR topic_tags LIKE ? OR source_path LIKE ?)
              AND enabled = 1
            ORDER BY id DESC
            LIMIT ?
            """,
            (like, like, like, limit),
        )
    
    rows = cur.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        content = row[2] or ""
        # Create snippet around query match
        content_lower = content.lower()
        query_lower = query.lower()
        idx = content_lower.find(query_lower)
        if idx >= 0:
            start = max(0, idx - 100)
            end = min(len(content), idx + len(query) + 100)
            snippet = content[start:end].replace("\n", " ").strip()
            if start > 0:
                snippet = "..." + snippet
            if end < len(content):
                snippet = snippet + "..."
        else:
            snippet = content[:200].replace("\n", " ").strip() + "..."
        
        results.append({
            "id": row[0],
            "source_path": row[1],
            "content": content,
            "doc_type": row[3],
            "corpus": row[4],
            "topic_tags": row[5],
            "snippet": snippet,
        })
    
    return results


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

