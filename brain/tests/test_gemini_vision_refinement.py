"""Tests for Gemini Vision refinement — topic-based segment filtering and context merging."""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestTokenizeForRelevance:
    def test_extracts_lowercase_tokens(self) -> None:
        from dashboard.api_tutor_materials import _tokenize_for_relevance

        tokens = _tokenize_for_relevance("The Glenohumeral Joint anatomy")
        assert "glenohumeral" in tokens
        assert "joint" in tokens
        assert "anatomy" in tokens

    def test_strips_short_tokens(self) -> None:
        from dashboard.api_tutor_materials import _tokenize_for_relevance

        tokens = _tokenize_for_relevance("I am OK at PT")
        # "am", "ok", "at", "pt" are all < 3 chars, filtered out
        assert not any(len(t) < 3 for t in tokens)

    def test_strips_stop_words(self) -> None:
        from dashboard.api_tutor_materials import _tokenize_for_relevance

        tokens = _tokenize_for_relevance("the anatomy and the physiology")
        assert "the" not in tokens
        assert "and" not in tokens
        assert "anatomy" in tokens
        assert "physiology" in tokens

    def test_empty_string(self) -> None:
        from dashboard.api_tutor_materials import _tokenize_for_relevance

        assert _tokenize_for_relevance("") == set()


class TestScoreSegmentRelevance:
    def test_perfect_overlap(self) -> None:
        from dashboard.api_tutor_materials import _score_segment_relevance

        topic_tokens = {"shoulder", "anatomy"}
        score = _score_segment_relevance("shoulder anatomy lecture", topic_tokens)
        assert score == 1.0

    def test_partial_overlap(self) -> None:
        from dashboard.api_tutor_materials import _score_segment_relevance

        topic_tokens = {"shoulder", "anatomy", "biomechanics", "joint"}
        score = _score_segment_relevance("shoulder anatomy explained", topic_tokens)
        assert 0.4 <= score <= 0.6  # 2 out of 4 topic tokens

    def test_no_overlap(self) -> None:
        from dashboard.api_tutor_materials import _score_segment_relevance

        topic_tokens = {"neuroscience", "cortex", "brain"}
        score = _score_segment_relevance("shoulder joint anatomy", topic_tokens)
        assert score == 0.0

    def test_empty_topic_returns_full_relevance(self) -> None:
        from dashboard.api_tutor_materials import _score_segment_relevance

        score = _score_segment_relevance("any text here", set())
        assert score == 1.0

    def test_empty_segment_returns_zero(self) -> None:
        from dashboard.api_tutor_materials import _score_segment_relevance

        score = _score_segment_relevance("", {"anatomy"})
        assert score == 0.0


class TestFilterSegmentsByTopic:
    def _make_segments(self) -> list[dict]:
        return [
            {"start_ts": "00:00:00", "end_ts": "00:00:30", "text": "Welcome to the shoulder anatomy lecture."},
            {"start_ts": "00:00:30", "end_ts": "00:01:00", "text": "Today we discuss the glenohumeral joint and rotator cuff."},
            {"start_ts": "00:01:00", "end_ts": "00:01:30", "text": "The brain cortex processes sensory information."},
            {"start_ts": "00:01:30", "end_ts": "00:02:00", "text": "Let us move on to shoulder rehabilitation exercises."},
        ]

    def test_filters_by_topic_relevance(self) -> None:
        from dashboard.api_tutor_materials import _filter_segments_by_topic

        segments = self._make_segments()
        filtered = _filter_segments_by_topic(segments, "shoulder anatomy joint")

        # Segments about shoulder/anatomy/joint should rank highest
        assert len(filtered) >= 2
        # The brain cortex segment should be filtered out (no overlap with shoulder topic)
        texts = [s["text"] for s in filtered]
        assert not any("brain cortex" in t for t in texts)

    def test_empty_topic_returns_all(self) -> None:
        from dashboard.api_tutor_materials import _filter_segments_by_topic

        segments = self._make_segments()
        filtered = _filter_segments_by_topic(segments, "")
        assert len(filtered) == len(segments)

    def test_adds_relevance_score(self) -> None:
        from dashboard.api_tutor_materials import _filter_segments_by_topic

        segments = self._make_segments()
        filtered = _filter_segments_by_topic(segments, "shoulder anatomy")

        for seg in filtered:
            assert "_relevance" in seg
            assert isinstance(seg["_relevance"], float)
            assert seg["_relevance"] >= 0.1  # Above minimum threshold

    def test_sorted_by_relevance_descending(self) -> None:
        from dashboard.api_tutor_materials import _filter_segments_by_topic

        segments = self._make_segments()
        filtered = _filter_segments_by_topic(segments, "shoulder anatomy joint rehabilitation")

        scores = [s["_relevance"] for s in filtered]
        assert scores == sorted(scores, reverse=True)


class TestMergeVideoContexts:
    def test_includes_transcript_segments(self) -> None:
        from dashboard.api_tutor_materials import _merge_video_contexts

        segments = [
            {"start_ts": "00:00:00", "end_ts": "00:00:30", "text": "Welcome to anatomy.", "_relevance": 0.8},
        ]
        result = _merge_video_contexts("Lecture 1", segments, "", {})
        assert "Relevant Transcript Segments" in result
        assert "00:00:00" in result
        assert "Welcome to anatomy" in result

    def test_includes_ocr_data(self) -> None:
        from dashboard.api_tutor_materials import _merge_video_contexts

        ocr = {"frame_00001.jpg": "Slide: Shoulder Anatomy Overview"}
        result = _merge_video_contexts("Lecture 1", [], "", ocr)
        assert "Visual/OCR" in result
        assert "Shoulder Anatomy Overview" in result

    def test_includes_enrichment_text(self) -> None:
        from dashboard.api_tutor_materials import _merge_video_contexts

        enrichment = "The lecturer describes the glenohumeral joint capsule."
        result = _merge_video_contexts("Lecture 1", [], enrichment, {})
        assert "Gemini Enrichment" in result
        assert "glenohumeral joint" in result

    def test_merges_all_three(self) -> None:
        from dashboard.api_tutor_materials import _merge_video_contexts

        segments = [
            {"start_ts": "00:01:00", "end_ts": "00:01:30", "text": "Rotator cuff muscles.", "_relevance": 0.9},
        ]
        ocr = {"frame_00003.jpg": "Diagram: Supraspinatus"}
        enrichment = "Visual shows supraspinatus tendon insertion."
        result = _merge_video_contexts("Lecture 1", segments, enrichment, ocr)

        assert "Relevant Transcript Segments" in result
        assert "Visual/OCR" in result
        assert "Gemini Enrichment" in result

    def test_empty_inputs_return_empty(self) -> None:
        from dashboard.api_tutor_materials import _merge_video_contexts

        result = _merge_video_contexts("Lecture 1", [], "", {})
        assert result == ""

    def test_respects_max_chars(self) -> None:
        from dashboard.api_tutor_materials import _merge_video_contexts

        segments = [
            {"start_ts": f"00:{i:02d}:00", "end_ts": f"00:{i:02d}:30", "text": "x" * 200, "_relevance": 0.5}
            for i in range(50)
        ]
        result = _merge_video_contexts("Lecture 1", segments, "", {}, max_chars=500)
        assert len(result) <= 600  # max_chars + truncation notice

    def test_shows_relevance_score(self) -> None:
        from dashboard.api_tutor_materials import _merge_video_contexts

        segments = [
            {"start_ts": "00:00:00", "end_ts": "00:00:30", "text": "Test.", "_relevance": 0.75},
        ]
        result = _merge_video_contexts("Lecture 1", segments, "", {})
        assert "relevance: 0.75" in result
