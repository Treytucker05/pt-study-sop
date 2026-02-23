"""Tests for video enrichment API — flagging, caching, budget caps."""
import json
import os
import sqlite3
import sys
import tempfile
from datetime import datetime
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup


@pytest.fixture(autouse=True)
def _isolated_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Create an isolated DB for each test."""
    db_path = str(tmp_path / "test.db")
    monkeypatch.setattr(config, "DB_PATH", db_path)
    monkeypatch.setattr(db_setup, "DB_PATH", db_path)
    monkeypatch.setattr("video_enrich_api.DB_PATH", db_path)
    db_setup.init_database()
    yield


def _make_segments(count: int = 3) -> list[dict]:
    """Generate test segments with varying confidence."""
    segments = []
    for i in range(count):
        segments.append({
            "start_sec": float(i * 10),
            "end_sec": float((i + 1) * 10),
            "start_ts": f"00:00:{i * 10:02d}",
            "end_ts": f"00:00:{(i + 1) * 10:02d}",
            "text": f"Segment {i}",
            "avg_logprob": -0.3 if i % 2 == 0 else -0.9,
            "no_speech_prob": 0.02 if i % 2 == 0 else 0.7,
        })
    return segments


class TestFlagSegments:
    def test_flags_low_confidence_segments(self) -> None:
        from video_enrich_api import flag_segments

        segments = _make_segments(4)
        flagged = flag_segments(segments)

        # Segments 1, 3 have avg_logprob=-0.9 and no_speech_prob=0.7
        assert len(flagged) == 2
        for f in flagged:
            assert "flag_reasons" in f
            assert len(f["flag_reasons"]) > 0

    def test_no_flags_when_all_confident(self) -> None:
        from video_enrich_api import flag_segments

        segments = [
            {"avg_logprob": -0.2, "no_speech_prob": 0.01, "text": "Good"},
        ]
        assert flag_segments(segments) == []

    def test_custom_thresholds(self) -> None:
        from video_enrich_api import flag_segments

        segments = [{"avg_logprob": -0.5, "no_speech_prob": 0.3, "text": "mid"}]
        config = {"flagging": {"avg_logprob_threshold": -0.4, "no_speech_prob_threshold": 0.2}}
        flagged = flag_segments(segments, config=config)
        assert len(flagged) == 1
        assert len(flagged[0]["flag_reasons"]) == 2


class TestCache:
    def test_cache_miss_then_hit(self) -> None:
        from video_enrich_api import get_cached, set_cached

        assert get_cached("abc123", 10.0, 20.0) is None

        set_cached("abc123", 10.0, 20.0, {"text": "cached result"})
        result = get_cached("abc123", 10.0, 20.0)
        assert result is not None
        assert result["text"] == "cached result"

    def test_different_ranges_dont_collide(self) -> None:
        from video_enrich_api import get_cached, set_cached

        set_cached("hash1", 0.0, 10.0, {"text": "first"})
        set_cached("hash1", 10.0, 20.0, {"text": "second"})

        assert get_cached("hash1", 0.0, 10.0)["text"] == "first"
        assert get_cached("hash1", 10.0, 20.0)["text"] == "second"


class TestBudgetCaps:
    def test_allows_when_under_budget(self) -> None:
        from video_enrich_api import check_budget

        result = check_budget("newvideo")
        assert result["allowed"] is True

    def test_blocks_when_monthly_cap_exceeded(self) -> None:
        from video_enrich_api import check_budget, record_usage

        # Record enough usage to exceed $5 monthly cap
        for _ in range(6):
            record_usage("somevid", "flash", 100000, 5000, 1.00)

        result = check_budget("anothervid")
        assert result["allowed"] is False
        assert result["reason"] == "monthly_cap_exceeded"

    def test_blocks_when_per_video_cap_exceeded(self) -> None:
        from video_enrich_api import check_budget, record_usage

        record_usage("myvideo", "flash", 50000, 2000, 0.60)

        result = check_budget("myvideo")
        assert result["allowed"] is False
        assert result["reason"] == "per_video_cap_exceeded"

    def test_record_usage_persists(self) -> None:
        from video_enrich_api import get_monthly_spend, get_video_spend, record_usage

        record_usage("vid1", "flash", 10000, 500, 0.10, material_id=42)
        record_usage("vid1", "flash", 20000, 1000, 0.20)

        assert get_video_spend("vid1") == pytest.approx(0.30, abs=0.01)
        assert get_monthly_spend() >= 0.30


class TestEnrichmentMode:
    def test_off_mode_returns_skipped(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from video_enrich_api import enrich_video

        result = enrich_video(
            video_path="/fake.mp4",
            segments=_make_segments(),
            mode="off",
        )
        assert result["status"] == "skipped"
        assert result["enriched"] == 0


class TestEmitEnrichmentMarkdown:
    def test_writes_markdown_file(self, tmp_path: Path) -> None:
        from video_enrich_api import emit_enrichment_markdown

        results = [
            {
                "start_ts": "00:01:00",
                "end_ts": "00:01:30",
                "original_text": "unclear speech",
                "enrichment": "The lecturer describes the glenohumeral joint.",
                "status": "ok",
            },
            {
                "start_ts": "00:05:00",
                "end_ts": "00:05:20",
                "original_text": "noise",
                "enrichment": "",
                "error": "API timeout",
                "status": "failed",
            },
        ]

        path = emit_enrichment_markdown("lecture", results, str(tmp_path))
        assert Path(path).exists()

        content = Path(path).read_text(encoding="utf-8")
        assert "glenohumeral joint" in content
        assert "API timeout" in content
        assert "lecture" in Path(path).name
