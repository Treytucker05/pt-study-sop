"""Vercel Flask entrypoint.
Keeps ai-config canonical while exposing the dashboard app.
"""
from pathlib import Path
import sys

# Ensure brain/ is on sys.path so the dashboard package is importable
repo_root = Path(__file__).resolve().parent
sys.path.insert(0, str(repo_root / "brain"))

from dashboard import create_app

app = create_app()
