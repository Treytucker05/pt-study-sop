# Learnings — embedding-sync-fix

## 2026-03-02 Session: ses_350a36e79ffe3cXlYXvoWEQR3K

### Key Conventions
- `brain/tutor_rag.py` uses `logger = logging.getLogger(__name__)` at module top — use `logger.warning()` not `print()`
- Constants follow ALL_CAPS pattern: `SMALL_DOC_CHAR_LIMIT = 8_000`, `MIN_CHUNK_CHARS = 50`
- `embed_rag_docs()` returns a plain dict — extend with `timed_out` key
- `concurrent.futures.ThreadPoolExecutor` is stdlib — no new deps needed
- Worktree: `C:/pt-study-sop-worktrees/brain` (branch: wt/brain)
- Tests: `pytest brain/tests/` from repo root

### Root Cause
- Doc 445 (`spine mobilization lab handout.docx`) = 15.5M chars from Docling table extraction
- Bloat is NOT image refs — it's table cell artifacts (lines 29-35 each ~2.2M chars)
- `strip_image_refs_for_rag()` already exists at line 38-46 — do NOT modify
- Cap must go BEFORE `MarkdownHeaderTextSplitter` (line 108 area) to prevent regex hang

### Critical Ordering
strip image refs → cap to MAX_CONTENT_CHARS → strip whitespace → split
