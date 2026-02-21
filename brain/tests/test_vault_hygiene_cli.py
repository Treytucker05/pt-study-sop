"""Tests for vault hygiene CLI and alias resolution."""

import json
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from adaptive.vault_ingest import (
    build_alias_index,
    create_vault_tables,
    ingest_vault,
    lint_vault,
    resolve_alias,
)


@pytest.fixture
def db_conn():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    create_vault_tables(conn)
    return conn


@pytest.fixture
def sample_vault(tmp_path):
    """Create a small vault with aliases."""
    note1 = tmp_path / "Cardiac Output.md"
    note1.write_text(
        "---\naliases:\n  - CO\n  - cardiac output\n---\n"
        "# Cardiac Output\nCO = SV x HR. See [[Stroke Volume]].\n"
    )
    note2 = tmp_path / "Stroke Volume.md"
    note2.write_text(
        "---\naliases:\n  - SV\n---\n"
        "# Stroke Volume\nVolume ejected per beat.\n"
    )
    note3 = tmp_path / "No Aliases.md"
    note3.write_text("# No Aliases\nThis note has no frontmatter.\n")
    return tmp_path


class TestLintCLI:
    def test_lint_produces_json(self, sample_vault):
        report = lint_vault(str(sample_vault))
        assert "issues" in report
        assert "files_checked" in report
        assert report["files_checked"] == 3

    def test_missing_aliases_flagged(self, sample_vault):
        report = lint_vault(str(sample_vault))
        missing = [i for i in report["issues"] if "Missing" in i["message"]]
        assert len(missing) == 1
        assert "No Aliases" in missing[0]["path"]


class TestResolveAlias:
    def test_resolve_after_ingest(self, db_conn, sample_vault):
        ingest_vault(str(sample_vault), db_conn)
        result = resolve_alias(db_conn, "co")
        assert result == "Cardiac Output"

    def test_case_insensitive(self, db_conn, sample_vault):
        ingest_vault(str(sample_vault), db_conn)
        assert resolve_alias(db_conn, "CO") == "Cardiac Output"
        assert resolve_alias(db_conn, "Co") == "Cardiac Output"

    def test_unknown_alias_returns_none(self, db_conn, sample_vault):
        ingest_vault(str(sample_vault), db_conn)
        assert resolve_alias(db_conn, "nonexistent") is None

    def test_empty_alias_returns_none(self, db_conn):
        assert resolve_alias(db_conn, "") is None

    def test_none_alias_returns_none(self, db_conn):
        assert resolve_alias(db_conn, None) is None


class TestBuildAliasIndex:
    def test_index_populated(self, db_conn, sample_vault):
        ingest_vault(str(sample_vault), db_conn)
        idx = build_alias_index(db_conn)
        assert "co" in idx
        assert idx["co"] == "Cardiac Output"
        assert "sv" in idx
        assert idx["sv"] == "Stroke Volume"

    def test_empty_db(self, db_conn):
        idx = build_alias_index(db_conn)
        assert idx == {}
