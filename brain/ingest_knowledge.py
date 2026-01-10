#!/usr/bin/env python3
"""
Ingest SOP knowledge files into the RAG database.

This script ingests all markdown files from sop/gpt-knowledge/ 
into the rag_docs table for Tutor retrieval.
"""

import sys
from pathlib import Path
from typing import TypedDict

# Add brain directory to path
brain_dir = Path(__file__).parent
sys.path.insert(0, str(brain_dir))

from rag_notes import ingest_document
from db_setup import init_database


class IngestResult(TypedDict):
    ok: bool
    message: str
    processed: int
    errors: list[str]


def ingest_sop_knowledge(verbose: bool = True) -> IngestResult:
    """
    Ingest all SOP knowledge files.
    
    Returns dict with counts of files processed, updated, and skipped.
    """
    init_database()
    
    # SOP knowledge directory
    repo_root = brain_dir.parent
    knowledge_dir = repo_root / "sop" / "gpt-knowledge"
    
    if not knowledge_dir.exists():
        return {
            "ok": False,
            "message": f"Knowledge directory not found: {knowledge_dir}",
            "processed": 0,
            "errors": [],
        }
    
    # Find all markdown files
    md_files = list(knowledge_dir.glob("*.md"))
    
    if not md_files:
        return {
            "ok": True,
            "message": "No markdown files found in knowledge directory",
            "processed": 0,
            "errors": [],
        }
    
    processed = 0
    errors: list[str] = []
    
    for md_file in md_files:
        try:
            # Ingest as "transcript" type (treated as authoritative SOP content)
            # Using "transcript" since it's for runtime instructions
            doc_id = ingest_document(
                path=str(md_file),
                doc_type="transcript",  # SOP runtime instructions
                course_id=None,  # System-level, not course-specific
                topic_tags=["sop", "runtime-canon", md_file.stem.lower()]
            )
            
            if verbose:
                print(f"[OK] Ingested: {md_file.name} (id={doc_id})")
            
            processed += 1
            
        except Exception as e:
            error_msg = f"{md_file.name}: {str(e)}"
            errors.append(error_msg)
            if verbose:
                print(f"[ERROR] {error_msg}")
    
    return {
        "ok": len(errors) == 0,
        "message": f"Ingested {processed} files, {len(errors)} errors",
        "processed": processed,
        "errors": errors
    }


def ingest_module_examples(verbose: bool = True) -> IngestResult:
    """
    Ingest example files from sop/examples/ if they exist.
    """
    init_database()
    
    repo_root = Path(__file__).parent.parent
    examples_dir = repo_root / "sop" / "examples"
    
    if not examples_dir.exists():
        return {
            "ok": True,
            "message": "Examples directory not found (optional)",
            "processed": 0,
            "errors": [],
        }
    
    md_files = list(examples_dir.glob("**/*.md"))
    
    processed = 0
    errors: list[str] = []
    
    for md_file in md_files:
        try:
            doc_id = ingest_document(
                path=str(md_file),
                doc_type="note",  # Examples treated as notes
                course_id=None,
                topic_tags=["example", md_file.stem.lower()]
            )
            
            if verbose:
                print(f"[OK] Ingested example: {md_file.name} (id={doc_id})")
            
            processed += 1
            
        except Exception as e:
            error_msg = f"{md_file.name}: {str(e)}"
            errors.append(error_msg)
            if verbose:
                print(f"[ERROR] {error_msg}")
    
    return {
        "ok": len(errors) == 0,
        "message": f"Ingested {processed} example files, {len(errors)} errors",
        "processed": processed,
        "errors": errors
    }


def main():
    """Run all ingestion."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Ingest SOP knowledge files")
    parser.add_argument("--quiet", "-q", action="store_true", help="Suppress output")
    parser.add_argument("--examples", action="store_true", help="Also ingest examples")
    args = parser.parse_args()
    
    verbose = not args.quiet
    
    print("=" * 50)
    print("Ingesting SOP Knowledge Files")
    print("=" * 50)
    
    # Ingest main knowledge
    result = ingest_sop_knowledge(verbose=verbose)
    print(f"\nKnowledge: {result['message']}")
    
    # Optionally ingest examples
    if args.examples:
        print("\n" + "=" * 50)
        print("Ingesting Example Files")
        print("=" * 50)
        
        examples_result = ingest_module_examples(verbose=verbose)
        print(f"\nExamples: {examples_result['message']}")
    
    print("\n" + "=" * 50)
    print("Ingestion complete!")
    print("=" * 50)


if __name__ == "__main__":
    main()
