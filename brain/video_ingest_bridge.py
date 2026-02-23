"""
Bridge local video artifacts into Tutor RAG.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from rag_notes import ingest_document
from tutor_rag import embed_rag_docs


def _persist_video_linkage(
    doc_id: int,
    material_id: int,
    source_video_path: str,
    doc_role: str,
) -> None:
    """Update metadata_json on an ingested rag_doc with source MP4 linkage."""
    import db_setup

    linkage = {
        "video_source": source_video_path,
        "video_material_id": material_id,
        "video_doc_role": doc_role,
        "video_linked_at": datetime.now().isoformat(timespec="seconds"),
    }
    conn = db_setup.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT metadata_json FROM rag_docs WHERE id = ?", (doc_id,))
    row = cur.fetchone()
    existing: dict = {}
    if row and row["metadata_json"]:
        try:
            existing = json.loads(row["metadata_json"])
        except (json.JSONDecodeError, TypeError):
            pass
    existing.update(linkage)
    cur.execute(
        "UPDATE rag_docs SET metadata_json = ? WHERE id = ?",
        (json.dumps(existing), doc_id),
    )
    conn.commit()
    conn.close()


def ingest_video_artifacts(
    *,
    material_id: int,
    source_video_path: str,
    transcript_md_path: str,
    visual_notes_md_path: str,
    course_id: Optional[int] = None,
    corpus: str = "materials",
) -> dict[str, Any]:
    source_name = Path(source_video_path).stem
    common_tags = [f"material_{material_id}", "video", source_name]

    transcript_doc_id = ingest_document(
        transcript_md_path,
        "transcript",
        course_id=course_id,
        topic_tags=[*common_tags, "transcript"],
        corpus=corpus,
        folder_path="video_ingest",
        enabled=1,
    )
    visual_doc_id = ingest_document(
        visual_notes_md_path,
        "note",
        course_id=course_id,
        topic_tags=[*common_tags, "visual_notes"],
        corpus=corpus,
        folder_path="video_ingest",
        enabled=1,
    )

    # Persist source MP4 linkage in metadata_json for both docs
    _persist_video_linkage(transcript_doc_id, material_id, source_video_path, "transcript")
    _persist_video_linkage(visual_doc_id, material_id, source_video_path, "visual_notes")

    embed_result = embed_rag_docs(corpus=corpus)
    return {
        "material_id": int(material_id),
        "source_video_path": source_video_path,
        "transcript_doc_id": int(transcript_doc_id),
        "visual_doc_id": int(visual_doc_id),
        "embed_result": embed_result,
    }
