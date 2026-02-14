"""
Text Extractor — Extract text from PDF, DOCX, PPTX, MD, and TXT files.

PDF extraction uses a tiered approach:
  Tier 1: MinerU  (subprocess, Py 3.12 venv) — best quality, OCR, tables, columns
  Tier 2: PyMuPDF4LLM (direct import) — fast, markdown output, OCR via Tesseract
  Tier 3: pdfplumber (always available) — plain text fallback

Returns: { content: str, error: str | None, metadata: dict }
"""

from __future__ import annotations

import logging
import subprocess
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import Optional

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
        # Use forward slashes for MSYS2 safety
        cmd = [
            str(exe),
            str(path).replace("\\", "/"),
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
    path = Path(file_path)
    if not path.exists():
        return {"content": "", "error": f"File not found: {file_path}", "metadata": {}}

    ext = path.suffix.lower()
    size = path.stat().st_size

    metadata = {
        "file_name": path.name,
        "file_size": size,
        "file_type": ext.lstrip("."),
    }

    try:
        if ext == ".pdf":
            content, method = _extract_pdf(path)
            metadata["extraction_method"] = method
        elif ext == ".docx":
            content = _extract_docx(path)
        elif ext == ".pptx":
            content = _extract_pptx(path)
        elif ext in (".md", ".txt", ".text", ".markdown"):
            content = path.read_text(encoding="utf-8", errors="replace")
        else:
            return {
                "content": "",
                "error": f"Unsupported file type: {ext}",
                "metadata": metadata,
            }

        metadata["char_count"] = len(content)
        return {"content": content, "error": None, "metadata": metadata}

    except Exception as e:
        return {"content": "", "error": str(e), "metadata": metadata}


def get_pdf_capabilities() -> dict:
    """Return which PDF extraction tiers are available."""
    return {
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
