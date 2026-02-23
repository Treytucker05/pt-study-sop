#!/usr/bin/env python
"""
Run local MP4 ingestion and emit transcript + visual-note artifacts.

Usage:
  python scripts/video_ingest_local.py --video "C:\\path\\lecture.mp4"
  python scripts/video_ingest_local.py --video "..." --model-size small --language en
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT / "brain") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "brain"))

from video_ingest_local import VideoIngestError, process_video


def main() -> int:
    parser = argparse.ArgumentParser(description="Local MP4 ingest for Tutor materials")
    parser.add_argument("--video", required=True, help="Path to .mp4 file")
    parser.add_argument("--model-size", default="base", help="faster-whisper model size")
    parser.add_argument("--language", default=None, help="optional language code (e.g., en)")
    parser.add_argument(
        "--keyframe-interval-sec",
        type=int,
        default=20,
        help="keyframe extraction interval in seconds (default: 20)",
    )
    parser.add_argument(
        "--output-root",
        default=None,
        help="optional output root directory",
    )
    args = parser.parse_args()

    try:
        result = process_video(
            args.video,
            output_root=args.output_root,
            language=args.language,
            model_size=args.model_size,
            keyframe_interval_sec=args.keyframe_interval_sec,
        )
    except VideoIngestError as exc:
        print(f"[ERROR] {exc}")
        return 1

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
