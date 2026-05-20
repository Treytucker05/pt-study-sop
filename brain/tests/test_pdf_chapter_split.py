"""Oversized textbook PDFs are split by chapter and ingested per chapter.

Huge textbooks (100-300 MB) hang the heavy extractor. Instead of
skipping them (losing the content), the sync splits them by the PDF's
embedded chapter outline and ingests each chapter as its own doc, with
folder_path preserved (so the course relink still classes them) and a
stable logical source_path (so re-syncs upsert, not duplicate).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

brain_dir = Path(__file__).parent.parent
if str(brain_dir) not in sys.path:
    sys.path.insert(0, str(brain_dir))

import rag_notes
from text_extractor import split_pdf_into_chapters


def _make_pdf(path: Path, pages: int, toc: list | None) -> None:
    import fitz

    doc = fitz.open()
    for i in range(pages):
        page = doc.new_page()
        body = "\n".join(
            f"PAGE {i + 1} BODY TEXT line {j}: lorem ipsum dolor sit amet "
            f"consectetur adipiscing elit sed do eiusmod tempor"
            for j in range(25)
        )
        page.insert_textbox(fitz.Rect(50, 50, 545, 770), body, fontsize=9)
    if toc:
        doc.set_toc(toc)
    doc.save(str(path))
    doc.close()


def test_split_uses_chapter_outline(tmp_path: Path) -> None:
    pdf = tmp_path / "book.pdf"
    _make_pdf(
        pdf,
        6,
        [[1, "Front Matter", 1], [1, "Chapter One", 2], [1, "Chapter Two", 4]],
    )

    segs = split_pdf_into_chapters(str(pdf))
    titles = [s["title"] for s in segs]
    assert titles == ["Front Matter", "Chapter One", "Chapter Two"]
    # page ranges are 1-based inclusive
    assert (segs[1]["page_start"], segs[1]["page_end"]) == (2, 3)
    assert (segs[2]["page_start"], segs[2]["page_end"]) == (4, 6)
    assert "PAGE 4 BODY TEXT" in segs[2]["text"]


def test_split_falls_back_to_page_windows_without_toc(tmp_path: Path) -> None:
    pdf = tmp_path / "no_toc.pdf"
    _make_pdf(pdf, 5, None)

    segs = split_pdf_into_chapters(str(pdf), max_pages=2)
    assert [s["title"] for s in segs] == ["Pages 1-2", "Pages 3-4", "Pages 5-5"]


def test_split_subsplits_oversized_chapter(tmp_path: Path) -> None:
    pdf = tmp_path / "big_chapter.pdf"
    # "Intro" = page 1; "Mega Chapter" = pages 2-7 (6 pages). With
    # max_pages=2 the 6-page chapter sub-splits into 3 parts.
    _make_pdf(pdf, 7, [[1, "Intro", 1], [1, "Mega Chapter", 2]])

    segs = split_pdf_into_chapters(str(pdf), max_pages=2)
    assert [s["title"] for s in segs] == [
        "Intro",
        "Mega Chapter (part 1)",
        "Mega Chapter (part 2)",
        "Mega Chapter (part 3)",
    ]


def test_sync_routes_oversized_pdf_to_chapter_ingest(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    pdf = tmp_path / "book.pdf"
    _make_pdf(
        pdf, 6, [[1, "Front Matter", 1], [1, "Chapter One", 2], [1, "Chapter Two", 4]]
    )

    captured: list[dict] = []

    def fake_upsert(**kwargs):
        captured.append(kwargs)
        return len(captured)

    def fail_ingest(*a, **k):  # the heavy path must NOT be used
        raise AssertionError("ingest_document should not run for oversized PDF")

    monkeypatch.setattr(rag_notes, "_upsert_rag_doc", fake_upsert)
    monkeypatch.setattr(rag_notes, "ingest_document", fail_ingest)
    # ~100 bytes cap => the small test PDF counts as "oversized".
    monkeypatch.setenv("RAG_SYNC_MAX_FILE_MB", "0.0001")

    result = rag_notes.sync_folder_to_rag(
        str(tmp_path),
        corpus="materials",
        allowed_exts={".pdf"},
        include_paths={"book.pdf"},
    )

    # 3 chapter docs upserted; the file counts as 1 processed unit.
    assert len(captured) == 3
    assert result["processed"] == 1
    assert len(result["doc_ids"]) == 3

    src = [c["source_path"] for c in captured]
    assert src == [
        f"{pdf}#ch01",
        f"{pdf}#ch02",
        f"{pdf}#ch03",
    ]
    for c in captured:
        assert c["corpus"] == "materials"
        assert c["folder_path"] == ""  # book.pdf is at the sync root
        assert c["metadata"]["chapter_split"] is True
        assert c["checksum"]

    # Idempotent: a second sync produces identical logical paths + checksums
    # (same source_path + same checksum => _upsert_rag_doc is a no-op).
    first = {c["source_path"]: c["checksum"] for c in captured}
    captured.clear()
    rag_notes.sync_folder_to_rag(
        str(tmp_path),
        corpus="materials",
        allowed_exts={".pdf"},
        include_paths={"book.pdf"},
    )
    second = {c["source_path"]: c["checksum"] for c in captured}
    assert first == second
