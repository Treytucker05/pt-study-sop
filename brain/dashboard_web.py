#!/usr/bin/env python3
"""
Entry point for the Dashboard v2.0.
Refactored to use brain.dashboard package.
"""

import argparse
import sys
import os
from pathlib import Path

# Add project root to path so we can import 'scholar' package
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from dashboard import create_app


def _default_host() -> str:
    return os.environ.get("PT_BRAIN_HOST", "127.0.0.1")


def _default_port() -> int:
    raw_port = os.environ.get("PT_BRAIN_PORT", "5000")
    try:
        return int(raw_port)
    except ValueError as exc:
        raise ValueError(f"Invalid PT_BRAIN_PORT value: {raw_port}") from exc


def _parse_args(argv=None):
    parser = argparse.ArgumentParser(description="Run the PT Study dashboard server.")
    parser.add_argument("--host", default=_default_host(), help="Host interface to bind.")
    parser.add_argument(
        "--port",
        type=int,
        default=_default_port(),
        help="Port to bind.",
    )
    return parser.parse_args(argv)


def run_dashboard(host: str, port: int) -> None:
    app = create_app()
    # Disable reloader to avoid connection resets during API calls
    app.run(debug=False, use_reloader=False, host=host, port=port)


if __name__ == "__main__":
    args = _parse_args()
    run_dashboard(host=args.host, port=args.port)
