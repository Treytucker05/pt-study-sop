import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import text_extractor


def _write_binary(tmp_path: Path, name: str, payload: bytes = b"data") -> Path:
    path = tmp_path / name
    path.write_bytes(payload)
    return path


def test_extract_text_prefers_docling_for_pdf(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    pdf_path = _write_binary(tmp_path, "sample.pdf", b"%PDF-1.4")

    monkeypatch.setattr(text_extractor, "_check_docling", lambda: True)
    monkeypatch.setattr(text_extractor, "_extract_with_docling", lambda _: "docling pdf text")

    def _unexpected_fallback(_: Path) -> tuple[str, str]:
        raise AssertionError("fallback extractor should not run when docling succeeds")

    monkeypatch.setattr(text_extractor, "_extract_pdf", _unexpected_fallback)

    result = text_extractor.extract_text(str(pdf_path))

    assert result["error"] is None
    assert result["content"] == "docling pdf text"
    assert result["metadata"]["extraction_method"] == "docling"
    assert result["metadata"]["extractor_name"] == "docling"
    assert result["metadata"]["extractor_source"] == "docling"
    assert "extraction_errors" not in result["metadata"]


def test_extract_text_falls_back_when_docling_unavailable(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    pdf_path = _write_binary(tmp_path, "fallback.pdf", b"%PDF-1.4")

    monkeypatch.setattr(text_extractor, "_check_docling", lambda: False)
    monkeypatch.setattr(text_extractor, "_extract_pdf", lambda _: ("fallback pdf text", "pdfplumber"))

    result = text_extractor.extract_text(str(pdf_path))

    assert result["error"] is None
    assert result["content"] == "fallback pdf text"
    assert result["metadata"]["extraction_method"] == "pdfplumber"
    assert result["metadata"]["extractor_name"] == "pdfplumber"
    assert result["metadata"]["extractor_source"] == "fallback"
    assert "extraction_errors" not in result["metadata"]


def test_extract_text_falls_back_when_docling_raises(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    docx_path = _write_binary(tmp_path, "fallback.docx", b"PK")

    monkeypatch.setattr(text_extractor, "_check_docling", lambda: True)

    def _docling_raises(_: Path) -> str:
        raise RuntimeError("docling failed")

    monkeypatch.setattr(text_extractor, "_extract_with_docling", _docling_raises)
    monkeypatch.setattr(text_extractor, "_extract_docx", lambda _: "fallback docx text")

    result = text_extractor.extract_text(str(docx_path))

    assert result["error"] is None
    assert result["content"] == "fallback docx text"
    assert result["metadata"]["extraction_method"] == "python-docx"
    assert result["metadata"]["extractor_name"] == "python-docx"
    assert result["metadata"]["extractor_source"] == "fallback"
    assert result["metadata"]["extraction_errors"] == ["docling: docling failed"]


def test_extract_text_contract_for_plain_text_stays_stable(tmp_path: Path) -> None:
    path = tmp_path / "notes.md"
    path.write_text("# Header\n\nBody", encoding="utf-8")

    result = text_extractor.extract_text(str(path))

    assert set(result.keys()) == {"content", "error", "metadata"}
    assert result["error"] is None
    assert result["content"] == "# Header\n\nBody"
    assert result["metadata"]["file_type"] == "md"
    assert result["metadata"]["char_count"] == len(result["content"])


def test_extract_text_uses_resolved_filesystem_path(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    real_path = tmp_path / "resolved.md"
    real_path.write_text("resolved content", encoding="utf-8")
    fake_long_path = (
        r"C:\Users\treyt\OneDrive\Desktop\PT School\very\long\path\resolved.md"
    )

    monkeypatch.setattr(
        text_extractor,
        "resolve_existing_path",
        lambda _: real_path,
    )

    result = text_extractor.extract_text(fake_long_path)

    assert result["error"] is None
    assert result["content"] == "resolved content"
    assert result["metadata"]["file_name"] == "resolved.md"


# ---------------------------------------------------------------------------
# Garbled content detection
# ---------------------------------------------------------------------------


class TestGarbledContentDetection:
    """Verify the 3-signal garbled detection logic."""

    def test_clean_content_not_garbled(self) -> None:
        assert not text_extractor._has_garbled_content("Normal text with no issues")

    def test_empty_content_not_garbled(self) -> None:
        assert not text_extractor._has_garbled_content("")

    def test_high_ufffd_is_garbled(self) -> None:
        content = "\ufffd" * 10 + "x" * 90
        assert text_extractor._has_garbled_content(content)

    def test_glyph_tags_are_garbled(self) -> None:
        # Each GLYPH<0041> is 11 chars matched by regex → sum(len(m.group())) = 110
        tags = "GLYPH<0041>" * 10  # 110 chars of tag text
        padding = "x" * 800  # total = 910, bad_ratio = 110/910 ≈ 12%
        content = tags + padding
        assert text_extractor._has_garbled_content(content)

    def test_latin_extended_chars_are_garbled(self) -> None:
        bad_chars = "\u0100\u0150\u0200" * 10
        content = bad_chars + "x" * (len(bad_chars) * 15)
        assert text_extractor._has_garbled_content(content)

    def test_below_threshold_not_garbled(self) -> None:
        content = "\ufffd" + "x" * 100  # 1% — under 5% threshold
        assert not text_extractor._has_garbled_content(content)


# ---------------------------------------------------------------------------
# Subprocess OCR isolation
# ---------------------------------------------------------------------------


class TestSubprocessOcrConvert:
    """Verify _subprocess_ocr_convert handles crashes gracefully."""

    def test_returns_empty_on_segfault(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A subprocess crash (segfault) returns empty string, not exception."""
        import subprocess as sp

        fake_result = sp.CompletedProcess(
            args=[], returncode=-11, stdout="", stderr="segfault"
        )
        monkeypatch.setattr(sp, "run", lambda *a, **kw: fake_result)

        result = text_extractor._subprocess_ocr_convert("/fake/path.pdf")
        assert result == ""

    def test_returns_empty_on_timeout(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A timed-out subprocess returns empty string."""
        import subprocess as sp

        def _timeout(*args: object, **kwargs: object) -> None:
            raise sp.TimeoutExpired(cmd="ocr", timeout=10)

        monkeypatch.setattr(sp, "run", _timeout)

        result = text_extractor._subprocess_ocr_convert("/fake/path.pdf", timeout=10)
        assert result == ""

    def test_returns_text_on_success(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Successful subprocess returns extracted text."""
        import json
        import subprocess as sp

        fake_result = sp.CompletedProcess(
            args=[], returncode=0,
            stdout=json.dumps({"text": "extracted content"}),
            stderr="",
        )
        monkeypatch.setattr(sp, "run", lambda *a, **kw: fake_result)

        result = text_extractor._subprocess_ocr_convert("/fake/path.pdf")
        assert result == "extracted content"

    def test_returns_empty_on_bad_json(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Malformed JSON from subprocess returns empty string."""
        import subprocess as sp

        fake_result = sp.CompletedProcess(
            args=[], returncode=0, stdout="not json", stderr=""
        )
        monkeypatch.setattr(sp, "run", lambda *a, **kw: fake_result)

        result = text_extractor._subprocess_ocr_convert("/fake/path.pdf")
        assert result == ""
