"""
One-time setup script for MinerU PDF extraction (Tier 1).

Creates an isolated Python 3.12 venv at .venv-mineru/ and installs MinerU.
MinerU requires Python <=3.12 (incompatible with 3.14), hence the separate venv.

Usage:
    python brain/setup_mineru.py

Prerequisites:
    - uv (https://docs.astral.sh/uv/) must be installed
    - Python 3.12 must be available (uv will download it if needed)
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VENV_DIR = REPO_ROOT / ".venv-mineru"


def _run(cmd: list[str], description: str) -> None:
    """Run a command, printing status and raising on failure."""
    print(f"  {description}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  FAILED: {result.stderr[:1000]}")
        sys.exit(1)
    print(f"  Done.")


def main() -> None:
    print("=" * 60)
    print("MinerU Setup — Tiered PDF Extraction (Tier 1)")
    print("=" * 60)

    # Check for uv
    try:
        subprocess.run(["uv", "--version"], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("ERROR: 'uv' is not installed. Install it from https://docs.astral.sh/uv/")
        sys.exit(1)

    # Step 1: Create venv
    if VENV_DIR.exists():
        print(f"\nVenv already exists at {VENV_DIR}")
        print("To recreate, delete it first and re-run this script.")
    else:
        print(f"\nStep 1: Creating Python 3.12 venv at {VENV_DIR}")
        _run(
            ["uv", "venv", "--python", "3.12", str(VENV_DIR)],
            "Creating venv with Python 3.12",
        )

    # Step 2: Install MinerU
    # Determine the python executable inside the venv
    python_exe = VENV_DIR / "Scripts" / "python.exe"
    if not python_exe.exists():
        python_exe = VENV_DIR / "bin" / "python"

    print("\nStep 2: Installing MinerU")
    _run(
        ["uv", "pip", "install", "-U", "mineru[all]", "--python", str(python_exe)],
        "Installing mineru[all]",
    )

    # Step 3: Verify
    mineru_exe = VENV_DIR / "Scripts" / "mineru.exe"
    if not mineru_exe.exists():
        mineru_exe = VENV_DIR / "bin" / "mineru"

    if mineru_exe.exists():
        print(f"\nVerification: mineru found at {mineru_exe}")
        result = subprocess.run(
            [str(mineru_exe), "--version"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print(f"  Version: {result.stdout.strip()}")
        print("\nMinerU setup complete! Tier 1 PDF extraction is now available.")
    else:
        print(f"\nWARNING: mineru executable not found at expected path.")
        print("MinerU may not have installed correctly.")
        sys.exit(1)


if __name__ == "__main__":
    main()
