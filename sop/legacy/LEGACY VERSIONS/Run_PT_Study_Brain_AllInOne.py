#!/usr/bin/env python3
"""
All-in-one launcher for PT Study Brain (modern web dashboard).

- Works from any folder; it locates the bundled app directory automatically.
- Installs Python dependencies on first run (uses requirements.txt).
- Starts the Flask server and opens your browser when the port is live.
- Stops cleanly on Ctrl+C.
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def find_app_dir() -> Path:
    """
    Return the absolute path to pt_study_brain relative to this launcher.
    The launcher is expected to live beside the pt_study_brain folder.
    """
    base = Path(__file__).resolve().parent
    app_dir = base / "pt_study_brain"
    if not app_dir.is_dir():
        sys.exit("ERROR: Could not find 'pt_study_brain' next to this file.")
    return app_dir


def ensure_python_version() -> None:
    if sys.version_info < (3, 9):
        sys.exit("ERROR: Python 3.9+ is required. Please run with a newer Python.")


def ensure_dependencies(app_dir: Path) -> None:
    """
    Install Flask (and any future deps) from requirements.txt if missing.
    We avoid a noisy reinstall by checking import first.
    """
    try:
        import flask  # noqa: F401
        return
    except ImportError:
        pass

    req_file = app_dir / "requirements.txt"
    if not req_file.is_file():
        sys.exit("ERROR: requirements.txt not found in pt_study_brain.")

    print("[setup] Installing dependencies (one-time)...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(req_file)],
        text=True,
    )
    if result.returncode != 0:
        sys.exit("ERROR: Dependency installation failed. See output above.")


def wait_for_port(host: str, port: int, timeout: int = 20) -> bool:
    """
    Poll for a TCP port to become available.
    Returns True if ready, False on timeout.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.5)
    return False


def open_browser_when_ready(url: str, host: str, port: int) -> None:
    """
    Background thread target: wait for server then open browser.
    """
    if wait_for_port(host, port):
        try:
            webbrowser.open(url)
            print(f"[info] Opened browser at {url}")
        except Exception as exc:  # pragma: no cover - best-effort only
            print(f"[warn] Could not open browser automatically: {exc}")
    else:
        print(f"[warn] Server not reachable after timeout. Open {url} manually.")


# --------------------------------------------------------------------------- #
# Main flow
# --------------------------------------------------------------------------- #

def main() -> None:
    ensure_python_version()
    app_dir = find_app_dir()

    # Ensure imports resolve regardless of where we launched from.
    os.chdir(app_dir)
    sys.path.insert(0, str(app_dir))

    print("[info] Working directory:", app_dir)
    ensure_dependencies(app_dir)

    url = "http://127.0.0.1:5000"
    host, port = "127.0.0.1", 5000

    # Launch browser watcher thread.
    threading.Thread(
        target=open_browser_when_ready, args=(url, host, port), daemon=True
    ).start()

    print("[info] Starting dashboard server (Ctrl+C to stop)...")
    try:
        from dashboard_web_new import app

        app.run(debug=False, host=host, port=port)
    except KeyboardInterrupt:
        print("\n[info] Server stopped by user.")
    except Exception as exc:  # pragma: no cover
        sys.exit(f"ERROR: Failed to start dashboard: {exc}")


if __name__ == "__main__":
    main()
