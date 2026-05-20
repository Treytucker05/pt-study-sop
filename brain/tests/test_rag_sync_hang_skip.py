"""Regression: a hung ingest must not stall the whole folder sync.

The per-file timeout previously used ThreadPoolExecutor as a context
manager, whose __exit__ does shutdown(wait=True) — so a pathological
file (e.g. a huge textbook PDF) blocked the entire sync forever despite
the timeout. The executor is now managed manually with a non-blocking
shutdown so the sync skips the bad file and keeps going.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

brain_dir = Path(__file__).parent.parent
if str(brain_dir) not in sys.path:
    sys.path.insert(0, str(brain_dir))

import rag_notes


def test_hung_file_times_out_without_blocking_the_sync(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    (tmp_path / "good.md").write_text("# Good\nfine", encoding="utf-8")
    (tmp_path / "bad.md").write_text("# Bad\nhangs", encoding="utf-8")

    HANG_SECONDS = 8

    def fake_ingest(*, path: str, **_kwargs):
        if path.endswith("bad.md"):
            time.sleep(HANG_SECONDS)  # simulate a pathological extraction
            return 999
        return 1

    monkeypatch.setattr(rag_notes, "ingest_document", fake_ingest)
    # Shrink the per-file timeout so the test doesn't wait the 120s default.
    monkeypatch.setenv("RAG_SYNC_PER_FILE_TIMEOUT", "2")

    started = time.monotonic()
    result = rag_notes.sync_folder_to_rag(
        str(tmp_path),
        corpus="materials",
        allowed_exts={".md"},
        include_paths={"good.md", "bad.md"},
    )
    elapsed = time.monotonic() - started

    # Buggy behavior (shutdown wait=True) would block the full HANG_SECONDS
    # on the hung file. Fixed behavior bails at the 2s timeout and moves on.
    assert elapsed < HANG_SECONDS - 1, (
        f"sync blocked on the hung file ({elapsed:.1f}s) — timeout not honored"
    )
    # The good file still got processed; the bad file recorded a timeout.
    assert result["processed"] >= 1
    assert any("timed out" in e for e in result["errors"]), result["errors"]
