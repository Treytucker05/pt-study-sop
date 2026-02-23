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

    def fake_extract_audio(_video: Path, audio_path: Path) -> None:
        audio_path.write_bytes(b"fake wav")

    def fake_transcribe(_audio: Path, *, model_size: str, language: str | None):
        assert model_size == "base"
        assert language == "en"
        return [
            {
                "start_sec": 0.0,
                "end_sec": 9.5,
                "start_ts": "00:00:00",
                "end_ts": "00:00:10",
                "text": "Welcome to gait analysis.",
            },
            {
                "start_sec": 10.0,
                "end_sec": 20.0,
                "start_ts": "00:00:10",
                "end_ts": "00:00:20",
                "text": "We will cover stance and swing phases.",
            },
        ]

    def fake_keyframes(_video: Path, frames_dir: Path, *, interval_sec: int):
        assert interval_sec == 15
        frames_dir.mkdir(parents=True, exist_ok=True)
        frame = frames_dir / "frame_00001.jpg"
        frame.write_bytes(b"fake jpg")
        return [frame]

    def fake_ocr(_frames):
        return {"frame_00001.jpg": "Stance vs Swing timeline"}

    monkeypatch.setattr("video_ingest_local.extract_audio", fake_extract_audio)
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

    assert transcript_md.exists()
    assert visual_md.exists()
    assert manifest_path.exists()
    assert transcript_json.exists()

    transcript_text = transcript_md.read_text(encoding="utf-8")
    assert "[00:00:00 -> 00:00:10] Welcome to gait analysis." in transcript_text

    visual_text = visual_md.read_text(encoding="utf-8")
    assert "[00:00:00] `frame_00001.jpg`" in visual_text
    assert "Stance vs Swing timeline" in visual_text

    saved_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert saved_manifest["segments_count"] == 2
    assert saved_manifest["keyframes_count"] == 1
