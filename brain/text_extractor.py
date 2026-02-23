"""
Text Extractor — Extract text from PDF, DOCX, PPTX, MD, and TXT files.

PDF extraction uses a tiered approach:
  Tier 1: MinerU  (subprocess, Py 3.12 venv) — best quality, OCR, tables, columns
  Tier 2: PyMuPDF4LLM (direct import) — fast, markdown output, OCR via Tesseract
  Tier 3: pdfplumber (always available) — plain text fallback

Returns: { content: str, error: str | None, metadata: dict }
"""

from __future__ import annotations

import hashlib
import logging
import inspect
import re
import subprocess
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import Optional

from path_utils import resolve_existing_path

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tier availability checks (cached — only run once per process)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _check_pymupdf4llm() -> bool:
    """Return True if pymupdf4llm is importable."""
    try:
        import pymupdf4llm  # noqa: F401
        return True
    except ImportError:
        return False


@lru_cache(maxsize=1)
def _check_docling() -> bool:
    """Return True if Docling is importable."""
    try:
        from docling.document_converter import DocumentConverter  # noqa: F401

        return True
    except Exception:
        return False


@lru_cache(maxsize=1)
def _check_mineru() -> bool:
    """Return True if the MinerU venv exists with a working mineru executable."""
    repo_root = Path(__file__).resolve().parent.parent
    exe = repo_root / ".venv-mineru" / "Scripts" / "mineru.exe"
    if not exe.exists():
        # Also check Unix-style path
        exe = repo_root / ".venv-mineru" / "bin" / "mineru"
    return exe.exists()


def _mineru_exe() -> Path:
    """Return the path to the MinerU executable."""
    repo_root = Path(__file__).resolve().parent.parent
    exe = repo_root / ".venv-mineru" / "Scripts" / "mineru.exe"
    if exe.exists():
        return exe
    return repo_root / ".venv-mineru" / "bin" / "mineru"


# ---------------------------------------------------------------------------
# Tier 1: MinerU (subprocess to isolated Python 3.12 venv)
# ---------------------------------------------------------------------------

def _extract_pdf_mineru(path: Path) -> str:
    """Extract PDF via MinerU subprocess. Returns markdown string."""
    exe = _mineru_exe()
    with tempfile.TemporaryDirectory() as tmpdir:
        source_arg = str(path)
        if not source_arg.startswith("\\\\?\\"):
            source_arg = source_arg.replace("\\", "/")
        # Use forward slashes for MSYS2 safety
        cmd = [
            str(exe),
            source_arg,
            "-o", tmpdir.replace("\\", "/"),
            "-m", "auto",
        ]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minutes
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"MinerU failed (exit {result.returncode}): {result.stderr[:500]}"
            )

        # MinerU outputs markdown files — find and read them
        md_files = list(Path(tmpdir).rglob("*.md"))
        if not md_files:
            raise RuntimeError("MinerU produced no markdown output")

        parts = []
        for md_file in sorted(md_files):
            parts.append(md_file.read_text(encoding="utf-8", errors="replace"))
        return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Tier 2: PyMuPDF4LLM (direct import — works on Python 3.14)
# ---------------------------------------------------------------------------

def _extract_pdf_pymupdf4llm(path: Path) -> str:
    """Extract PDF via pymupdf4llm. Returns markdown string."""
    import pymupdf4llm

    return pymupdf4llm.to_markdown(str(path))


# ---------------------------------------------------------------------------
# Tier 3: pdfplumber (always available fallback)
# ---------------------------------------------------------------------------

def _extract_pdf_pdfplumber(path: Path) -> str:
    """Extract text from PDF using pdfplumber."""
    import pdfplumber

    pages: list[str] = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            # Also extract table text
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if row:
                        cells = [str(c) if c else "" for c in row]
                        text += "\n" + " | ".join(cells)
            pages.append(text)
    return "\n\n".join(pages)


# ---------------------------------------------------------------------------
# Dispatcher — tries tiers in order, falls through gracefully
# ---------------------------------------------------------------------------

def _has_garbled_content(content: str, threshold: float = 0.05) -> bool:
    """Return True if content is garbled.

    Combines three signals — U+FFFD replacements, Docling GLYPH tags, and
    Latin Extended A/B chars (U+0100-U+024F) — because garbled PDFs often
    spread damage across all three.  Uses 5% threshold on the combined count.
    """
    if not content:
        return False
    n = len(content)
    bad = content.count("\ufffd")
    bad += sum(len(m.group()) for m in re.finditer(r"GLYPH<[^>]*>", content))
    bad += sum(1 for c in content if "\u0100" <= c <= "\u024f")
    return bad / n > threshold


def _build_pdf_pipeline_options(*, ocr_mode: bool = False) -> "PdfPipelineOptions":
    """Build Docling PDF pipeline options for normal or OCR extraction."""
    from docling.datamodel.pipeline_options import PdfPipelineOptions, TableStructureOptions

    try:
        from docling.datamodel.pipeline_options import OcrAutoOptions
    except ImportError:
        from docling.datamodel.pipeline_options import OcrOptions as OcrAutoOptions

    table_opts = TableStructureOptions(
        do_cell_matching=not ocr_mode,
        mode="accurate",
    )
    opts = PdfPipelineOptions(
        do_table_structure=True,
        table_structure_options=table_opts,
        generate_picture_images=True,
        images_scale=1.5 if not ocr_mode else 1.0,
    )
    if ocr_mode:
        opts.ocr_options = OcrAutoOptions(force_full_page_ocr=True)
        opts.do_ocr = True
        opts.ocr_batch_size = 1
    else:
        # Keep default extraction lightweight; OCR fallback is handled separately.
        try:
            opts.do_ocr = False
        except Exception:
            pass
    return opts


def _export_docling_markdown(doc: object, source_path: Path) -> str:
    """Export Docling document to markdown, saving images to disk."""
    try:
        from docling_core.types.doc.base import ImageRefMode
    except ImportError:
        ImageRefMode = None

    save_as_markdown = getattr(doc, "save_as_markdown", None)
    if callable(save_as_markdown):
        source_hash = hashlib.md5(str(source_path).encode()).hexdigest()[:12]
        image_dir = Path(__file__).parent / "data" / "extracted_images" / source_hash
        image_dir.mkdir(parents=True, exist_ok=True)

        def _replace_image_placeholders(markdown: str) -> str:
            if "<!-- image -->" not in markdown.lower():
                return markdown
            image_files = sorted(
                [
                    p.name
                    for p in image_dir.iterdir()
                    if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
                ],
                key=str.lower,
            )
            if not image_files:
                return markdown
            idx = {"value": 0}

            def _replace(_match: re.Match[str]) -> str:
                current = idx["value"]
                idx["value"] += 1
                if current >= len(image_files):
                    return ""
                return f"\n![Extracted image {current + 1}]({image_files[current]})\n"

            return re.sub(r"<!--\s*image\s*-->", _replace, markdown, flags=re.IGNORECASE)

        tmp_md: Optional[Path] = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as tmp:
                tmp_md = Path(tmp.name)

            try:
                signature = inspect.signature(save_as_markdown)
                params = set(signature.parameters.keys())
            except Exception:
                params = set()

            kwargs: dict[str, object] = {}
            if "artifacts_dir" in params:
                kwargs["artifacts_dir"] = image_dir
            elif "image_dir" in params:
                kwargs["image_dir"] = image_dir
            elif "assets_dir" in params:
                kwargs["assets_dir"] = image_dir
            if "image_mode" in params and ImageRefMode is not None:
                kwargs["image_mode"] = ImageRefMode.REFERENCED

            attempts: list[dict[str, object]] = [kwargs] if kwargs else []
            if kwargs and "image_mode" in kwargs:
                fallback = dict(kwargs)
                fallback.pop("image_mode", None)
                if fallback not in attempts:
                    attempts.append(fallback)
            if {} not in attempts:
                attempts.append({})

            content = ""
            for attempt in attempts:
                try:
                    save_as_markdown(tmp_md, **attempt)
                    content = tmp_md.read_text(encoding="utf-8")
                    if content.strip():
                        content = _replace_image_placeholders(content)
                        break
                except TypeError:
                    continue

            if content.strip():
                return content
        except Exception as exc:
            logger.debug("save_as_markdown failed, falling back: %s", exc)
        finally:
            if tmp_md is not None:
                tmp_md.unlink(missing_ok=True)
            try:
                if image_dir.exists() and not any(image_dir.iterdir()):
                    image_dir.rmdir()
            except Exception:
                pass

    # Fallback: standard export methods
    for attr in ("export_to_markdown", "export_to_text"):
        exporter = getattr(doc, attr, None)
        if callable(exporter):
            text = exporter()
            if text:
                return str(text)
    for attr in ("text", "raw_text"):
        text = getattr(doc, attr, None)
        if text:
            return str(text)
    raise RuntimeError("Docling conversion produced no content")


def _extract_with_docling(path: Path) -> str:
    """Extract text/markdown using Docling."""
    from docling.document_converter import DocumentConverter

    if path.suffix.lower() == ".pdf":
        from docling.datamodel.base_models import InputFormat
        from docling.document_converter import PdfFormatOption

        pipeline_opts = _build_pdf_pipeline_options(ocr_mode=False)
        converter = DocumentConverter(
            format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_opts)}
        )
    else:
        converter = DocumentConverter()

    result = converter.convert(str(path))
    doc = getattr(result, "document", result)
    return _export_docling_markdown(doc, path)


def _docling_ocr_convert(pdf_path: str) -> str:
    """Run Docling OCR on a single PDF file, return markdown."""
    from docling.datamodel.base_models import InputFormat
    from docling.document_converter import DocumentConverter, PdfFormatOption

    pipeline_opts = _build_pdf_pipeline_options(ocr_mode=True)
    converter = DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_opts)}
    )
    result = converter.convert(pdf_path)
    doc = getattr(result, "document", result)
    return _export_docling_markdown(doc, Path(pdf_path))


def _subprocess_ocr_convert(pdf_path: str, timeout: int = 300) -> str:
    """Run Docling OCR in a separate subprocess for crash isolation.

    Docling's C++ layer can segfault on certain garbled PDFs, killing the
    host process.  By running OCR in a child process, a segfault (exit 139)
    only kills that child — the parent continues with the next chunk.
    """
    import json
    import sys

    script = (
        "import json, sys; "
        "from pathlib import Path; "
        "sys.path.insert(0, str(Path(__file__).parent) if '__file__' in dir() else '.')\n"
        "from docling.datamodel.base_models import InputFormat; "
        "from docling.document_converter import DocumentConverter, PdfFormatOption; "
        "from docling.datamodel.pipeline_options import PdfPipelineOptions, TableStructureOptions; "
        "try:\n"
        "    from docling.datamodel.pipeline_options import OcrAutoOptions\n"
        "except ImportError:\n"
        "    from docling.datamodel.pipeline_options import OcrOptions as OcrAutoOptions\n"
        "table_opts = TableStructureOptions(do_cell_matching=False, mode='accurate'); "
        "opts = PdfPipelineOptions("
        "do_table_structure=True, table_structure_options=table_opts, "
        "generate_picture_images=False, images_scale=1.0); "
        "opts.ocr_options = OcrAutoOptions(force_full_page_ocr=True); "
        "opts.do_ocr = True; opts.ocr_batch_size = 1; "
        "conv = DocumentConverter("
        "format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=opts)}); "
        "r = conv.convert(sys.argv[1]); "
        "doc = getattr(r, 'document', r); "
        "text = ''; "
        "[text := str(f()) for a in ('export_to_markdown','export_to_text') "
        "if (f := getattr(doc, a, None)) and callable(f) and not text]; "
        "json.dump({'text': text or ''}, sys.stdout)"
    )
    try:
        result = subprocess.run(
            [sys.executable, "-c", script, pdf_path],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            logger.warning(
                "OCR subprocess exited %d for %s: %s",
                result.returncode, pdf_path, result.stderr[:500],
            )
            return ""
        payload = json.loads(result.stdout)
        return payload.get("text", "")
    except subprocess.TimeoutExpired:
        logger.warning("OCR subprocess timed out after %ds for %s", timeout, pdf_path)
        return ""
    except (json.JSONDecodeError, Exception) as exc:
        logger.warning("OCR subprocess result error for %s: %s", pdf_path, exc)
        return ""


def _extract_with_docling_ocr(path: Path, chunk_pages: int = 10) -> str:
    """Extract PDF via Docling with forced full-page OCR.

    Splits large PDFs into chunks and runs each chunk's OCR in a
    separate subprocess for crash isolation (segfault-safe).
    """
    import gc
    import os

    import pymupdf

    src = pymupdf.open(str(path))
    try:
        total = len(src)

        if total <= chunk_pages:
            text = _subprocess_ocr_convert(str(path))
            if not text:
                # Fall back to in-process if subprocess fails
                text = _docling_ocr_convert(str(path))
            if not text:
                raise RuntimeError("Docling OCR conversion produced no content")
            return text

        logger.info("Splitting %d-page PDF into %d-page chunks for OCR (subprocess-isolated)", total, chunk_pages)
        parts: list[str] = []
        for start in range(0, total, chunk_pages):
            end = min(start + chunk_pages, total)
            chunk = pymupdf.open()
            tmp_path = ""
            try:
                chunk.insert_pdf(src, from_page=start, to_page=end - 1)
                with tempfile.NamedTemporaryFile(
                    prefix=f"_ocr_chunk_{start}_", suffix=".pdf", delete=False
                ) as tmp_file:
                    tmp_path = tmp_file.name
                chunk.save(tmp_path)
                chunk.close()
                chunk = None
                text = _subprocess_ocr_convert(tmp_path)
                if not text.strip():
                    # Fall back to in-process for this chunk
                    logger.info("Subprocess empty for pages %d-%d, trying in-process", start, end - 1)
                    text = _docling_ocr_convert(tmp_path)
                if text.strip():
                    parts.append(text)
                    logger.info("OCR chunk pages %d-%d: %d chars", start, end - 1, len(text))
                else:
                    logger.warning("OCR chunk pages %d-%d: empty", start, end - 1)
            except Exception as exc:
                logger.warning("OCR chunk pages %d-%d failed: %s", start, end - 1, exc)
            finally:
                if chunk is not None:
                    try:
                        chunk.close()
                    except Exception:
                        pass
                if tmp_path:
                    try:
                        os.unlink(tmp_path)
                    except OSError:
                        pass
                gc.collect()

        if not parts:
            raise RuntimeError("Docling OCR conversion produced no content")
        return "\n\n".join(parts)
    finally:
        src.close()


def _try_docling(path: Path) -> tuple[Optional[str], list[str]]:
    """Try Docling, retrying with forced OCR if content is mostly garbled."""
    if not _check_docling():
        return None, []
    errors: list[str] = []
    try:
        content = _extract_with_docling(path)
        if not content.strip():
            return None, ["docling: empty content"]

        if _has_garbled_content(content) and path.suffix.lower() == ".pdf":
            logger.warning(
                "Docling text is garbled (broken font mapping) — retrying with forced OCR",
            )
            errors.append("docling: garbled content detected, retried with OCR")
            try:
                ocr_content = _extract_with_docling_ocr(path)
                if ocr_content.strip() and not _has_garbled_content(ocr_content):
                    return ocr_content, errors
                errors.append("docling-ocr: still garbled or empty, using original")
            except Exception as ocr_exc:
                errors.append(f"docling-ocr: {ocr_exc}")

        return content, errors
    except Exception as exc:
        return None, [f"docling: {exc}"]


def _extract_pdf(path: Path) -> tuple[str, str]:
    """
    Try MinerU → PyMuPDF4LLM → pdfplumber.

    Returns (content, extraction_method).
    """
    # Tier 1: MinerU
    if _check_mineru():
        try:
            content = _extract_pdf_mineru(path)
            if content.strip():
                logger.info("PDF extracted via MinerU (Tier 1)")
                return content, "mineru"
            logger.warning("MinerU returned empty content, falling through")
        except Exception as e:
            logger.warning("MinerU extraction failed: %s — falling through", e)

    # Tier 2: PyMuPDF4LLM
    if _check_pymupdf4llm():
        try:
            content = _extract_pdf_pymupdf4llm(path)
            if content.strip():
                logger.info("PDF extracted via PyMuPDF4LLM (Tier 2)")
                return content, "pymupdf4llm"
            logger.warning("PyMuPDF4LLM returned empty content, falling through")
        except Exception as e:
            logger.warning("PyMuPDF4LLM extraction failed: %s — falling through", e)

    # Tier 3: pdfplumber (always available)
    content = _extract_pdf_pdfplumber(path)
    logger.info("PDF extracted via pdfplumber (Tier 3)")
    return content, "pdfplumber"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_text(file_path: str) -> dict:
    """
    Extract text from a file based on its extension.

    Returns dict with keys: content, error, metadata.
    """
    display_path = Path(file_path)
    path = resolve_existing_path(display_path)
    if not path.exists():
        return {"content": "", "error": f"File not found: {file_path}", "metadata": {}}

    ext = display_path.suffix.lower()
    size = path.stat().st_size

    metadata = {
        "file_name": display_path.name,
        "file_size": size,
        "file_type": ext.lstrip("."),
    }

    try:
        extraction_errors: list[str] = []
        extractor_name = ""
        extractor_source = ""

        if ext == ".pdf":
            docling_content, extraction_errors = _try_docling(path)
            if docling_content is not None:
                content = docling_content
                extractor_name = "docling"
                extractor_source = "docling"
            else:
                content, extractor_name = _extract_pdf(path)
                extractor_source = "fallback"
        elif ext == ".docx":
            docling_content, extraction_errors = _try_docling(path)
            if docling_content is not None:
                content = docling_content
                extractor_name = "docling"
                extractor_source = "docling"
            else:
                content = _extract_docx(path)
                extractor_name = "python-docx"
                extractor_source = "fallback"
        elif ext == ".pptx":
            docling_content, extraction_errors = _try_docling(path)
            if docling_content is not None:
                content = docling_content
                extractor_name = "docling"
                extractor_source = "docling"
            else:
                content = _extract_pptx(path)
                extractor_name = "python-pptx"
                extractor_source = "fallback"
        elif ext in (".md", ".txt", ".text", ".markdown"):
            content = path.read_text(encoding="utf-8", errors="replace")
        else:
            return {
                "content": "",
                "error": f"Unsupported file type: {ext}",
                "metadata": metadata,
            }

        if extractor_name:
            metadata["extraction_method"] = extractor_name
            metadata["extractor_name"] = extractor_name
            metadata["extractor_source"] = extractor_source
        if extraction_errors:
            metadata["extraction_errors"] = extraction_errors
        metadata["char_count"] = len(content)
        return {"content": content, "error": None, "metadata": metadata}

    except Exception as e:
        return {"content": "", "error": str(e), "metadata": metadata}


def get_pdf_capabilities() -> dict:
    """Return which PDF extraction tiers are available."""
    return {
        "docling": _check_docling(),
        "mineru": _check_mineru(),
        "pymupdf4llm": _check_pymupdf4llm(),
        "pdfplumber": True,  # always available
    }


def _extract_docx(path: Path) -> str:
    """Extract text from DOCX using python-docx."""
    import docx

    doc = docx.Document(str(path))
    parts: list[str] = []

    for para in doc.paragraphs:
        if para.text.strip():
            parts.append(para.text)

    for table in doc.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                parts.append(" | ".join(cells))

    return "\n\n".join(parts)


def _extract_pptx(path: Path) -> str:
    """Extract text from PPTX using python-pptx."""
    from pptx import Presentation

    prs = Presentation(str(path))
    parts: list[str] = []

    for i, slide in enumerate(prs.slides):
        slide_text = [f"--- Slide {i + 1} ---"]
        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    text = paragraph.text.strip()
                    if text:
                        slide_text.append(text)
        if hasattr(slide, "notes_slide") and slide.notes_slide:
            notes = slide.notes_slide.notes_text_frame.text.strip()
            if notes:
                slide_text.append(f"[Notes: {notes}]")
        parts.append("\n".join(slide_text))

    return "\n\n".join(parts)


def get_file_type(filename: str) -> Optional[str]:
    """Return normalized file type from filename, or None if unsupported."""
    ext = Path(filename).suffix.lower().lstrip(".")
    mapping = {
        "pdf": "pdf",
        "docx": "docx",
        "pptx": "pptx",
        "md": "md",
        "markdown": "md",
        "txt": "txt",
        "text": "txt",
    }
    return mapping.get(ext)


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".md", ".txt", ".text", ".markdown"}
