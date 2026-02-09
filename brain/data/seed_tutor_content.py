#!/usr/bin/env python3
"""
Seed tutor RAG content: SOP runtime bundle, SOP library, method blocks, and chains.

Run: python brain/data/seed_tutor_content.py
     python brain/data/seed_tutor_content.py --embed   # also run embeddings
     python brain/data/seed_tutor_content.py --force   # clear existing SOP docs first

Ingests ~60+ documents into rag_docs for the Adaptive Tutor's retrieval pipeline.
"""

import json
import sys
import os
from pathlib import Path

# Allow running from repo root or brain/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pydantic_v1_patch  # noqa: F401  — fixes PEP 649 on Python 3.14

from db_setup import DB_PATH, get_connection, init_database
from rag_notes import ingest_document, _upsert_rag_doc, _checksum


_ROOT = Path(__file__).resolve().parents[2]
_SOP_LIBRARY = _ROOT / "sop" / "library"


def seed_sop_runtime(verbose: bool = True) -> int:
    """Ingest the SOP runtime knowledge bundle (7 files)."""
    runtime_dir = _ROOT / "sop" / "runtime" / "knowledge_upload"
    if not runtime_dir.exists():
        print(f"[WARN] Runtime bundle not found: {runtime_dir}")
        return 0

    md_files = sorted(runtime_dir.glob("*.md"))
    count = 0
    for md_file in md_files:
        try:
            doc_id = ingest_document(
                path=str(md_file),
                doc_type="transcript",
                course_id=None,
                topic_tags=["sop", "runtime-canon", md_file.stem.lower()],
                corpus="runtime",
                folder_path="runtime-bundle",
                enabled=1,
            )
            if verbose:
                print(f"  [OK] {md_file.name} (id={doc_id})")
            count += 1
        except Exception as e:
            print(f"  [ERROR] {md_file.name}: {e}")

    if verbose:
        print(f"\n[RUNTIME] {count} runtime files ingested")
    return count


def seed_sop_library(verbose: bool = True) -> int:
    """Ingest SOP library files (00-15 + README)."""
    if not _SOP_LIBRARY.exists():
        print(f"[WARN] SOP library not found: {_SOP_LIBRARY}")
        return 0

    md_files = sorted(_SOP_LIBRARY.glob("*.md"))
    count = 0

    for md_file in md_files:
        try:
            doc_id = ingest_document(
                path=str(md_file),
                doc_type="note",
                course_id=None,
                topic_tags=["sop", "library", md_file.stem],
                corpus="runtime",
                folder_path="sop-library",
                enabled=1,
            )
            if verbose:
                print(f"  [OK] {md_file.name} (id={doc_id})")
            count += 1
        except Exception as e:
            print(f"  [ERROR] {md_file.name}: {e}")

    if verbose:
        print(f"\n[LIBRARY] {count} SOP library files ingested")
    return count


def seed_method_blocks(verbose: bool = True) -> int:
    """Ingest method block descriptions as individual RAG docs."""
    conn = get_connection()
    conn.row_factory = __import__("sqlite3").Row
    cur = conn.cursor()
    cur.execute("SELECT id, name, category, description, evidence, tags FROM method_blocks")
    blocks = cur.fetchall()
    conn.close()

    if not blocks:
        print("[WARN] No method_blocks found — run seed_methods.py first")
        return 0

    count = 0
    for block in blocks:
        tags_raw = block["tags"] or "[]"
        try:
            tag_list = json.loads(tags_raw)
        except (json.JSONDecodeError, TypeError):
            tag_list = []

        content = (
            f"# Study Method: {block['name']}\n\n"
            f"**Category**: {block['category'].upper()} (PEIRRO phase)\n\n"
            f"**Description**: {block['description']}\n\n"
        )
        if block["evidence"]:
            content += f"**Evidence**: {block['evidence']}\n\n"
        if tag_list:
            content += f"**Tags**: {', '.join(tag_list)}\n"

        source_path = f"method-block://{block['name'].lower().replace(' ', '-')}"
        checksum = _checksum(content)

        _upsert_rag_doc(
            source_path=source_path,
            doc_type="note",
            course_id=None,
            topic_tags=f"method, {block['category']}, peirro",
            content=content,
            checksum=checksum,
            metadata={"kind": "method_block", "block_id": block["id"]},
            corpus="runtime",
            folder_path="methods",
            enabled=1,
        )
        count += 1
        if verbose:
            print(f"  [OK] Method: {block['name']}")

    if verbose:
        print(f"\n[METHODS] {count} method blocks ingested")
    return count


def seed_method_chains(verbose: bool = True) -> int:
    """Ingest method chain definitions as individual RAG docs."""
    conn = get_connection()
    conn.row_factory = __import__("sqlite3").Row
    cur = conn.cursor()
    cur.execute("SELECT id, name, description, block_ids, context_tags FROM method_chains")
    chains = cur.fetchall()

    if not chains:
        print("[WARN] No method_chains found — run seed_methods.py first")
        conn.close()
        return 0

    # Resolve block IDs to names
    cur.execute("SELECT id, name, category FROM method_blocks")
    block_lookup = {row["id"]: {"name": row["name"], "category": row["category"]} for row in cur.fetchall()}
    conn.close()

    count = 0
    for chain in chains:
        block_ids = json.loads(chain["block_ids"] or "[]")
        context_tags = json.loads(chain["context_tags"] or "{}")

        block_sequence = []
        for bid in block_ids:
            info = block_lookup.get(bid)
            if info:
                block_sequence.append(f"  {len(block_sequence)+1}. {info['name']} ({info['category'].upper()})")

        content = (
            f"# Study Chain: {chain['name']}\n\n"
            f"**Description**: {chain['description']}\n\n"
            f"**Block Sequence**:\n"
            + "\n".join(block_sequence) + "\n\n"
        )
        if context_tags:
            content += f"**Context**: {json.dumps(context_tags)}\n"

        source_path = f"method-chain://{chain['name'].lower().replace(' ', '-')}"
        checksum = _checksum(content)

        _upsert_rag_doc(
            source_path=source_path,
            doc_type="note",
            course_id=None,
            topic_tags=f"chain, method-chain, study-flow",
            content=content,
            checksum=checksum,
            metadata={"kind": "method_chain", "chain_id": chain["id"]},
            corpus="runtime",
            folder_path="chains",
            enabled=1,
        )
        count += 1
        if verbose:
            print(f"  [OK] Chain: {chain['name']}")

    if verbose:
        print(f"\n[CHAINS] {count} method chains ingested")
    return count


def clear_sop_docs(verbose: bool = True) -> int:
    """Remove existing SOP/runtime RAG docs before re-seeding."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM rag_embeddings WHERE rag_doc_id IN "
        "(SELECT id FROM rag_docs WHERE corpus = 'runtime')"
    )
    cur.execute("DELETE FROM rag_docs WHERE corpus = 'runtime'")
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    if verbose:
        print(f"[CLEAR] Removed {deleted} existing runtime rag_docs")
    return deleted


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Seed tutor RAG content")
    parser.add_argument("--embed", action="store_true", help="Run embeddings after seeding")
    parser.add_argument("--force", action="store_true", help="Clear existing runtime docs first")
    parser.add_argument("--quiet", "-q", action="store_true", help="Suppress output")
    args = parser.parse_args()

    verbose = not args.quiet
    init_database()

    print("=" * 50)
    print("Seeding Tutor RAG Content")
    print("=" * 50)

    if args.force:
        clear_sop_docs(verbose=verbose)

    total = 0

    # 1. SOP runtime bundle
    print("\n--- SOP Runtime Bundle ---")
    total += seed_sop_runtime(verbose=verbose)

    # 2. SOP library files
    print("\n--- SOP Library Files ---")
    total += seed_sop_library(verbose=verbose)

    # 3. Method blocks
    print("\n--- Method Blocks ---")
    total += seed_method_blocks(verbose=verbose)

    # 4. Method chains
    print("\n--- Method Chains ---")
    total += seed_method_chains(verbose=verbose)

    print("\n" + "=" * 50)
    print(f"Total: {total} documents seeded into rag_docs")

    # Verify
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM rag_docs")
    doc_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM rag_embeddings")
    embed_count = cur.fetchone()[0]
    conn.close()
    print(f"DB state: {doc_count} rag_docs, {embed_count} rag_embeddings")

    # 5. Run embeddings if requested
    if args.embed:
        print("\n--- Running Embeddings ---")
        try:
            from tutor_rag import embed_rag_docs
            result = embed_rag_docs()
            print(f"Embedded: {result['embedded']}, Skipped: {result['skipped']}, Chunks: {result['total_chunks']}")
        except Exception as e:
            print(f"[ERROR] Embedding failed: {e}")
            print("(You can run embeddings later via POST /api/tutor/embed)")

    print("\n" + "=" * 50)
    print("Done!")


if __name__ == "__main__":
    main()
