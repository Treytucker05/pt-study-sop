import json
from pathlib import Path

import pytest

from video_ingest_local import _format_timestamp, process_video


def test_format_timestamp_basic() -> None:
    assert _format_timestamp(0) == "00:00:00"
    assert _format_timestamp(5.2) == "00:00:05"
    assert _format_timestamp(65.0) == "00:01:05"
    assert _format_timestamp(3661) == "01:01:01"


def test_process_video_writes_expected_artifacts(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    video_path = tmp_path / "lecture.mp4"
    video_path.write_bytes(b"fake video bytes")

    def fake_transcribe(
        _media: Path,
        *,
        model_size: str,
        language: str | None,
        initial_prompt: str | None,
    ):
        assert model_size == "base"
        assert language == "en"
        assert initial_prompt is not None
        return [
            {
                "start_sec": 0.0,
                "end_sec": 9.5,
                "start_ts": "00:00:00",
                "end_ts": "00:00:10",
                "text": "Welcome to gait analysis.",
                "avg_logprob": -0.3,
                "no_speech_prob": 0.05,
            },
            {
                "start_sec": 10.0,
                "end_sec": 20.0,
                "start_ts": "00:00:10",
                "end_ts": "00:00:20",
                "text": "We will cover stance and swing phases.",
                "avg_logprob": -0.8,
                "no_speech_prob": 0.6,
            },
        ]

    def fake_keyframes(_video: Path, frames_dir: Path, *, interval_sec: int):
        assert interval_sec == 15
        frames_dir.mkdir(parents=True, exist_ok=True)
        frame = frames_dir / "frame_00001.jpg"
        frame.write_bytes(b"fake jpg")
        return [frame]

    def fake_ocr(_frames, *, backend="pytesseract"):
        return {"frame_00001.jpg": "Stance vs Swing timeline"}

    monkeypatch.setattr("video_ingest_local.transcribe_audio", fake_transcribe)
    monkeypatch.setattr("video_ingest_local.extract_keyframes", fake_keyframes)
    monkeypatch.setattr("video_ingest_local.run_ocr", fake_ocr)

    result = process_video(
        str(video_path),
        output_root=str(tmp_path / "out"),
        language="en",
        model_size="base",
        keyframe_interval_sec=15,
    )

    artifacts = result["artifacts"]
    transcript_md = Path(artifacts["transcript_md_path"])
    visual_md = Path(artifacts["visual_notes_md_path"])
    manifest_path = Path(artifacts["manifest_path"])
    transcript_json = Path(artifacts["transcript_json_path"])
    segments_json = Path(artifacts["segments_json_path"])

    assert transcript_md.exists()
    assert visual_md.exists()
    assert manifest_path.exists()
    assert transcript_json.exists()
    assert segments_json.exists()

    transcript_text = transcript_md.read_text(encoding="utf-8")
    assert "[00:00:00 -> 00:00:10] Welcome to gait analysis." in transcript_text

    visual_text = visual_md.read_text(encoding="utf-8")
    assert "[00:00:00] `frame_00001.jpg`" in visual_text
    assert "Stance vs Swing timeline" in visual_text

    saved_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert saved_manifest["segments_count"] == 2
    assert saved_manifest["keyframes_count"] == 1
    assert saved_manifest["initial_prompt"] is not None

    # Verify confidence metadata in segments
    segments = json.loads(segments_json.read_text(encoding="utf-8"))
    assert len(segments) == 2
    assert "avg_logprob" in segments[0]
    assert "no_speech_prob" in segments[0]
    assert segments[0]["avg_logprob"] == -0.3
    assert segments[1]["avg_logprob"] == -0.8
    assert segments[1]["no_speech_prob"] == 0.6


def test_process_video_no_audio_extraction(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify process_video passes MP4 path directly to transcribe_audio."""
    video_path = tmp_path / "lecture.mp4"
    video_path.write_bytes(b"fake video bytes")

    transcribe_calls: list[Path] = []

    def fake_transcribe(
        media_path: Path, *, model_size: str, language: str | None, initial_prompt: str | None
    ):
        transcribe_calls.append(media_path)
        return [
            {
                "start_sec": 0.0,
                "end_sec": 5.0,
                "start_ts": "00:00:00",
                "end_ts": "00:00:05",
                "text": "Test.",
                "avg_logprob": -0.2,
                "no_speech_prob": 0.01,
            },
        ]

    extract_audio_called = []

    def fake_extract_audio(_video: Path, _audio: Path) -> None:
        extract_audio_called.append(True)

    monkeypatch.setattr("video_ingest_local.transcribe_audio", fake_transcribe)
    monkeypatch.setattr("video_ingest_local.extract_audio", fake_extract_audio)
    monkeypatch.setattr(
        "video_ingest_local.extract_keyframes",
        lambda _v, _d, *, interval_sec: [],
    )
    monkeypatch.setattr("video_ingest_local.run_ocr", lambda _f, *, backend="pytesseract": {})

    process_video(str(video_path), output_root=str(tmp_path / "out"))

    # MP4 path should be passed directly — no audio extraction
    assert len(transcribe_calls) == 1
    assert transcribe_calls[0].suffix == ".mp4"
    assert len(extract_audio_called) == 0
