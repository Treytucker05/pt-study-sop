"""
Bridge local video artifacts into Tutor RAG.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from rag_notes import ingest_document
from tutor_rag import embed_rag_docs


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

    embed_result = embed_rag_docs(corpus=corpus)
    return {
        "material_id": int(material_id),
        "source_video_path": source_video_path,
        "transcript_doc_id": int(transcript_doc_id),
        "visual_doc_id": int(visual_doc_id),
        "embed_result": embed_result,
    }
