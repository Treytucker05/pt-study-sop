"""
Local MP4 ingestion pipeline for Tutor study materials.

Pipeline:
1) extract mono 16k audio with ffmpeg
2) transcribe with faster-whisper (timestamped segments)
3) extract keyframes on a fixed interval with ffmpeg
4) OCR keyframes (optional; pytesseract + Pillow)
5) emit markdown + JSON artifacts
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

VIDEO_INGEST_ROOT = Path(__file__).resolve().parent / "data" / "video_ingest"


class VideoIngestError(RuntimeError):
    """Raised when local video ingestion cannot complete."""


@dataclass(frozen=True)
class VideoArtifactPaths:
    output_dir: str
    transcript_json_path: str
    segments_json_path: str
    ocr_json_path: str
    transcript_md_path: str
    visual_notes_md_path: str
    manifest_path: str


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", str(value or "").strip().lower())
    cleaned = re.sub(r"[\s_-]+", "-", cleaned).strip("-")
    return cleaned or "video"


def _format_timestamp(seconds: float) -> str:
    total = max(int(round(float(seconds))), 0)
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def _run_command(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        stderr = (proc.stderr or "").strip()
        raise VideoIngestError(
            f"Command failed ({proc.returncode}): {' '.join(cmd)}"
            + (f" | {stderr[:300]}" if stderr else "")
        )


def _require_tool(binary: str) -> None:
    if shutil.which(binary):
        return
    raise VideoIngestError(
        f"Required binary not found: {binary}. Install and ensure it is in PATH."
    )


def extract_audio(video_path: Path, audio_path: Path) -> None:
    _require_tool("ffmpeg")
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    _run_command(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            str(audio_path),
        ]
    )


def transcribe_audio(
    audio_path: Path,
    *,
    model_size: str = "base",
    language: Optional[str] = None,
) -> list[dict[str, Any]]:
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise VideoIngestError(
            "faster-whisper is not installed. Install it before processing videos."
        ) from exc

    model = WhisperModel(model_size, device="auto", compute_type="int8")
    segments_iter, _info = model.transcribe(
        str(audio_path),
        language=language,
        vad_filter=True,
    )
    segments: list[dict[str, Any]] = []
    for seg in segments_iter:
        text = str(getattr(seg, "text", "") or "").strip()
        if not text:
            continue
        start = float(getattr(seg, "start", 0.0) or 0.0)
        end = float(getattr(seg, "end", start) or start)
        segments.append(
            {
                "start_sec": start,
                "end_sec": end,
                "start_ts": _format_timestamp(start),
                "end_ts": _format_timestamp(end),
                "text": text,
            }
        )
    if not segments:
        raise VideoIngestError("No transcript segments produced from audio.")
    return segments


def extract_keyframes(
    video_path: Path,
    frames_dir: Path,
    *,
    interval_sec: int = 20,
) -> list[Path]:
    _require_tool("ffmpeg")
    interval = max(int(interval_sec), 1)
    frames_dir.mkdir(parents=True, exist_ok=True)
    pattern = frames_dir / "frame_%05d.jpg"
    _run_command(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vf",
            f"fps=1/{interval}",
            str(pattern),
        ]
    )
    frames = sorted(frames_dir.glob("frame_*.jpg"))
    return frames


def run_ocr(frame_paths: list[Path]) -> dict[str, str]:
    if not frame_paths:
        return {}
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return {}

    ocr_map: dict[str, str] = {}
    for frame in frame_paths:
        try:
            text = pytesseract.image_to_string(Image.open(frame)).strip()
        except Exception:
            text = ""
        if text:
            ocr_map[frame.name] = text
    return ocr_map


def _build_transcript_markdown(title: str, segments: list[dict[str, Any]]) -> str:
    lines = [f"# Transcript — {title}", "", "## Segments", ""]
    for seg in segments:
        start_ts = str(seg.get("start_ts") or "00:00:00")
        end_ts = str(seg.get("end_ts") or start_ts)
        text = str(seg.get("text") or "").strip()
        if not text:
            continue
        lines.append(f"- [{start_ts} -> {end_ts}] {text}")
    lines.append("")
    return "\n".join(lines)


def _build_visual_notes_markdown(
    title: str,
    frame_paths: list[Path],
    ocr_map: dict[str, str],
    *,
    interval_sec: int,
) -> str:
    lines = [f"# Visual Notes — {title}", "", "## Keyframes", ""]
    interval = max(int(interval_sec), 1)
    for idx, frame in enumerate(frame_paths):
        ts = _format_timestamp(idx * interval)
        ocr_text = (ocr_map.get(frame.name) or "").strip()
        lines.append(f"- [{ts}] `{frame.name}`")
        if ocr_text:
            short_text = ocr_text.replace("\n", " ").strip()
            lines.append(f"  - OCR: {short_text[:500]}")
    lines.append("")
    return "\n".join(lines)


def process_video(
    video_path: str,
    *,
    output_root: Optional[str] = None,
    language: Optional[str] = None,
    model_size: str = "base",
    keyframe_interval_sec: int = 20,
    use_ocr: bool = True,
) -> dict[str, Any]:
    source = Path(video_path)
    if not source.exists() or not source.is_file():
        raise VideoIngestError(f"Video file not found: {video_path}")
    if source.suffix.lower() != ".mp4":
        raise VideoIngestError("Only .mp4 files are currently supported.")

    root = Path(output_root) if output_root else VIDEO_INGEST_ROOT
    root.mkdir(parents=True, exist_ok=True)

    slug = _slugify(source.stem)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = root / f"{slug}_{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    audio_path = out_dir / "audio.wav"
    frames_dir = out_dir / "keyframes"
    transcript_json_path = out_dir / "transcript.json"
    segments_json_path = out_dir / "segments.json"
    ocr_json_path = out_dir / "ocr.json"
    transcript_md_path = out_dir / f"{slug}_transcript.md"
    visual_notes_md_path = out_dir / f"{slug}_visual_notes.md"
    manifest_path = out_dir / "manifest.json"

    extract_audio(source, audio_path)
    segments = transcribe_audio(audio_path, model_size=model_size, language=language)
    frame_paths = extract_keyframes(
        source,
        frames_dir,
        interval_sec=keyframe_interval_sec,
    )
    ocr_map = run_ocr(frame_paths) if use_ocr else {}

    transcript_json_path.write_text(
        json.dumps({"segments": segments}, indent=2),
        encoding="utf-8",
    )
    segments_json_path.write_text(json.dumps(segments, indent=2), encoding="utf-8")
    ocr_json_path.write_text(json.dumps(ocr_map, indent=2), encoding="utf-8")

    transcript_md = _build_transcript_markdown(source.stem, segments)
    visual_notes_md = _build_visual_notes_markdown(
        source.stem,
        frame_paths,
        ocr_map,
        interval_sec=keyframe_interval_sec,
    )
    transcript_md_path.write_text(transcript_md, encoding="utf-8")
    visual_notes_md_path.write_text(visual_notes_md, encoding="utf-8")

    artifact_paths = VideoArtifactPaths(
        output_dir=str(out_dir),
        transcript_json_path=str(transcript_json_path),
        segments_json_path=str(segments_json_path),
        ocr_json_path=str(ocr_json_path),
        transcript_md_path=str(transcript_md_path),
        visual_notes_md_path=str(visual_notes_md_path),
        manifest_path=str(manifest_path),
    )

    manifest: dict[str, Any] = {
        "video_path": str(source),
        "video_name": source.name,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "model_size": model_size,
        "language": language,
        "keyframe_interval_sec": max(int(keyframe_interval_sec), 1),
        "segments_count": len(segments),
        "keyframes_count": len(frame_paths),
        "ocr_entries_count": len(ocr_map),
        "artifacts": artifact_paths.__dict__,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest
