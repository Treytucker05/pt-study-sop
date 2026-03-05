"""Ensure test imports work for both ``brain.*`` and top-level module styles."""
import sys
from pathlib import Path

_THIS_FILE = Path(__file__).resolve()
_BRAIN_DIR = _THIS_FILE.parent.parent
_REPO_ROOT = _BRAIN_DIR.parent

# Many legacy tests import modules as top-level (e.g. ``import db_setup``) and
# newer tests import as package modules (e.g. ``from brain.selector_bridge ...``).
# Keep both roots on sys.path so collection is stable in both styles.
# Keep repo root first for stable ``brain.*`` package imports, then brain dir
# for legacy top-level imports.
for _path in (str(_BRAIN_DIR), str(_REPO_ROOT)):
    if _path not in sys.path:
        sys.path.insert(0, _path)


def pytest_collection_modifyitems(items):
    """Add a 30-second timeout to every test to prevent hangs."""
    import pytest

    for item in items:
        has_timeout = any(m.name == "timeout" for m in item.iter_markers())
        if has_timeout:
            continue

        # Integration tests get a higher default timeout to avoid false hangs.
        if any(m.name == "integration" for m in item.iter_markers()):
            item.add_marker(pytest.mark.timeout(180))
            continue

        if not has_timeout:
            item.add_marker(pytest.mark.timeout(30))
