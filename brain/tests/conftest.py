"""Ensure test imports work for both ``brain.*`` and top-level module styles.

Also provides shared pytest fixtures for the tutor mock infrastructure:
- ``mock_llm``   — patches ``llm_provider`` functions with ``MockLLMClient``
- ``mock_vault``  — provides an in-memory ``MockVaultIO`` instance
- ``mock_chroma`` — provides an in-memory ``MockChromaCollection`` instance
- ``test_db``     — creates a temporary SQLite DB with the full schema
"""
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

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


# ---------------------------------------------------------------------------
# Shared tutor mock fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def mock_llm(monkeypatch):
    """Patch ``llm_provider`` with a ``MockLLMClient``.

    Returns the mock instance so tests can call ``set_response`` /
    ``set_streaming_response`` and inspect ``call_count`` / ``last_args``.

    Patches: ``call_llm``, ``call_llm_stream``, ``call_codex_json``,
    ``model_call``, ``stream_chatgpt_responses``.
    """
    from brain.tests.mocks.llm_mock import MockLLMClient

    import llm_provider

    mock = MockLLMClient()
    monkeypatch.setattr(llm_provider, "call_llm", mock.call_llm)
    monkeypatch.setattr(llm_provider, "call_llm_stream", mock.call_llm_stream)
    monkeypatch.setattr(llm_provider, "model_call", mock.call_llm)
    monkeypatch.setattr(llm_provider, "stream_chatgpt_responses", mock.stream_chatgpt_responses)
    if hasattr(llm_provider, "call_codex_json"):
        monkeypatch.setattr(llm_provider, "call_codex_json", mock.call_codex_json)
    return mock


@pytest.fixture()
def mock_vault():
    """Provide a fresh ``MockVaultIO`` instance.

    Does NOT patch anything automatically — tests should monkeypatch
    the specific vault reference they need (e.g. ``api_tutor._get_obsidian_vault``).
    This keeps the fixture composable and avoids side effects on tests
    that don't use the vault.
    """
    from brain.tests.mocks.vault_mock import MockVaultIO

    return MockVaultIO()


@pytest.fixture()
def mock_chroma():
    """Provide a fresh ``MockChromaCollection`` instance.

    Does NOT patch anything automatically — tests should monkeypatch
    ``tutor_rag.init_vectorstore`` or the specific collection reference.
    """
    from brain.tests.mocks.chroma_mock import MockChromaCollection

    return MockChromaCollection()


@pytest.fixture()
def test_db(tmp_path):
    """Create a temporary SQLite DB with the full schema from ``db_setup``.

    Yields the path to the temp database file.  ``config.DB_PATH`` is
    overridden for the duration of the test and restored afterwards.

    This fixture is safe to use alongside tests that set ``config.DB_PATH``
    themselves — the restoration happens in the fixture teardown.
    """
    import config
    from db_setup import init_database

    db_file = tmp_path / "test_study.db"
    original_db_path = config.DB_PATH
    config.DB_PATH = str(db_file)

    try:
        init_database()
        yield str(db_file)
    finally:
        config.DB_PATH = original_db_path
