"""Ensure brain/ is on sys.path so tests can import brain packages."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
