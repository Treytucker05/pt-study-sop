from pathlib import Path

import pytest

from video_ingest_bridge import ingest_video_artifacts


def test_ingest_video_artifacts_ingests_docs_and_embeds(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    transcript_md = tmp_path / "lecture_transcript.md"
    visual_md = tmp_path / "lecture_visual_notes.md"
    transcript_md.write_text("# transcript", encoding="utf-8")
    visual_md.write_text("# visual", encoding="utf-8")

    ingest_calls = []

    def fake_ingest_document(
        file_path: str,
        doc_type: str,
        *,
        course_id=None,
        topic_tags=None,
        corpus="materials",
        folder_path=None,
        enabled=1,
    ) -> int:
        ingest_calls.append(
            {
                "file_path": file_path,
                "doc_type": doc_type,
                "course_id": course_id,
                "topic_tags": topic_tags,
                "corpus": corpus,
                "folder_path": folder_path,
                "enabled": enabled,
            }
        )
        return 101 if doc_type == "transcript" else 202

    monkeypatch.setattr("video_ingest_bridge.ingest_document", fake_ingest_document)
    monkeypatch.setattr(
        "video_ingest_bridge.embed_rag_docs",
        lambda corpus="materials": {"embedded": 2, "corpus": corpus},
    )

    result = ingest_video_artifacts(
        material_id=77,
        source_video_path=str(tmp_path / "lecture.mp4"),
        transcript_md_path=str(transcript_md),
        visual_notes_md_path=str(visual_md),
        course_id=5,
        corpus="materials",
    )

    assert result["material_id"] == 77
    assert result["transcript_doc_id"] == 101
    assert result["visual_doc_id"] == 202
    assert result["embed_result"]["embedded"] == 2
    assert len(ingest_calls) == 2
    assert ingest_calls[0]["doc_type"] == "transcript"
    assert ingest_calls[1]["doc_type"] == "note"
