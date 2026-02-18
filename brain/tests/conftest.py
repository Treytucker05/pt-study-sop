"""Ensure brain/ is on sys.path so tests can import brain packages."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def pytest_collection_modifyitems(items):
    """Add a 30-second timeout to every test to prevent hangs."""
    import pytest

    for item in items:
        if not any(m.name == "timeout" for m in item.iter_markers()):
            item.add_marker(pytest.mark.timeout(30))
