"""Tests for adaptive mastery vault ingestion (Phase 1)."""
from __future__ import annotations

import os
import sqlite3
import tempfile
import pytest


# ---------------------------------------------------------------------------
# Task 1.1 — Vault ingest scanner
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_vault(tmp_path):
    """Create a minimal Obsidian vault structure on disk."""
    # Root-level notes
    (tmp_path / "Welcome.md").write_text("# Welcome\nIntro note.", encoding="utf-8")
    (tmp_path / "Index.md").write_text("# Index\nMain index.", encoding="utf-8")

    # Subfolder with notes
    neuro = tmp_path / "Neuroscience"
    neuro.mkdir()
    (neuro / "UMN.md").write_text("# Upper Motor Neuron\nContent.", encoding="utf-8")
    (neuro / "LMN.md").write_text("# Lower Motor Neuron\nContent.", encoding="utf-8")

    # Nested subfolder
    deep = neuro / "Week1"
    deep.mkdir()
    (deep / "Cortex.md").write_text("# Cortex\nDeep note.", encoding="utf-8")

    # Non-markdown files (should be ignored)
    (tmp_path / "image.png").write_bytes(b"\x89PNG")
    (tmp_path / ".obsidian").mkdir()
    (tmp_path / ".obsidian" / "workspace.json").write_text("{}", encoding="utf-8")

    return tmp_path


class TestVaultIngestScanner:
    def test_discovers_all_md_files(self, sample_vault):
        from brain.adaptive.vault_ingest import scan_vault

        files = scan_vault(str(sample_vault))
        md_count = sum(1 for f in files if f.endswith(".md"))
        assert md_count == 5

    def test_ignores_non_md_files(self, sample_vault):
        from brain.adaptive.vault_ingest import scan_vault

        files = scan_vault(str(sample_vault))
        for f in files:
            assert f.endswith(".md"), f"Non-md file found: {f}"

    def test_ignores_dotfolders(self, sample_vault):
        from brain.adaptive.vault_ingest import scan_vault

        files = scan_vault(str(sample_vault))
        for f in files:
            assert ".obsidian" not in f, f"Dotfolder file found: {f}"

    def test_returns_absolute_paths(self, sample_vault):
        from brain.adaptive.vault_ingest import scan_vault

        files = scan_vault(str(sample_vault))
        for f in files:
            assert os.path.isabs(f), f"Not absolute: {f}"

    def test_returns_list(self, sample_vault):
        from brain.adaptive.vault_ingest import scan_vault

        files = scan_vault(str(sample_vault))
        assert isinstance(files, list)

    def test_empty_vault(self, tmp_path):
        from brain.adaptive.vault_ingest import scan_vault

        files = scan_vault(str(tmp_path))
        assert files == []

    def test_nonexistent_path_raises(self):
        from brain.adaptive.vault_ingest import scan_vault

        with pytest.raises((FileNotFoundError, ValueError)):
            scan_vault("/nonexistent/path/to/vault")


# ---------------------------------------------------------------------------
# Task 1.2 — YAML frontmatter parsing
# ---------------------------------------------------------------------------

class TestFrontmatterParsing:
    def test_parses_yaml_fields(self, tmp_path):
        from brain.adaptive.vault_ingest import parse_note

        note = tmp_path / "test.md"
        note.write_text(
            "---\n"
            "type: concept\n"
            "system: cardiovascular\n"
            "prereqs:\n"
            "  - cardio_heart_anatomy\n"
            "tags:\n"
            "  - hemodynamics\n"
            "sources:\n"
            "  - Guyton Ch. 9\n"
            "aliases:\n"
            "  - CO\n"
            "  - cardiac output\n"
            "---\n"
            "# Cardiac Output\n"
            "CO = HR x SV\n",
            encoding="utf-8",
        )

        parsed = parse_note(str(note))
        assert parsed.frontmatter["type"] == "concept"
        assert parsed.frontmatter["system"] == "cardiovascular"
        assert "cardio_heart_anatomy" in parsed.frontmatter["prereqs"]
        assert "CO" in parsed.frontmatter["aliases"]
        assert parsed.body.startswith("# Cardiac Output")

    def test_note_without_yaml_still_parses(self, tmp_path):
        from brain.adaptive.vault_ingest import parse_note

        note = tmp_path / "plain.md"
        note.write_text("# Just a heading\nSome content.\n", encoding="utf-8")

        parsed = parse_note(str(note))
        assert parsed.frontmatter == {}
        assert "Just a heading" in parsed.body

    def test_aliases_extracted(self, tmp_path):
        from brain.adaptive.vault_ingest import parse_note

        note = tmp_path / "aliased.md"
        note.write_text(
            "---\naliases:\n  - SV\n  - stroke volume\n---\n# Stroke Volume\n",
            encoding="utf-8",
        )
        parsed = parse_note(str(note))
        assert parsed.frontmatter["aliases"] == ["SV", "stroke volume"]


# ---------------------------------------------------------------------------
# Task 1.3 — Link extraction
# ---------------------------------------------------------------------------

class TestLinkExtraction:
    def test_wikilinks_extracted(self, tmp_path):
        from brain.adaptive.vault_ingest import extract_links

        note = tmp_path / "linked.md"
        note.write_text(
            "See [[Cardiac Output]] and [[Heart Anatomy|heart]].\n"
            "Also [[UMN]] and [[LMN]].\n"
            "Plus a standard [link](https://example.com).\n",
            encoding="utf-8",
        )

        links = extract_links(str(note))
        targets = [lnk.target for lnk in links]
        assert "Cardiac Output" in targets
        assert "Heart Anatomy" in targets
        assert "UMN" in targets
        assert "LMN" in targets

    def test_link_count_matches(self, tmp_path):
        from brain.adaptive.vault_ingest import extract_links

        note = tmp_path / "five_links.md"
        note.write_text(
            "[[A]] and [[B]] and [[C]] and [[D]] and [[E]]\n",
            encoding="utf-8",
        )
        links = extract_links(str(note))
        assert len(links) == 5

    def test_link_has_source_path(self, tmp_path):
        from brain.adaptive.vault_ingest import extract_links

        note = tmp_path / "src.md"
        note.write_text("[[Target]]\n", encoding="utf-8")
        links = extract_links(str(note))
        assert len(links) == 1
        assert links[0].source_path == str(note)

    def test_markdown_links_extracted(self, tmp_path):
        from brain.adaptive.vault_ingest import extract_links

        note = tmp_path / "mdlinks.md"
        note.write_text(
            "See [cardiac output](Cardiac%20Output.md) and [[UMN]].\n",
            encoding="utf-8",
        )
        links = extract_links(str(note))
        # Should find both the internal md link and the wikilink
        assert len(links) >= 2


# ---------------------------------------------------------------------------
# DB fixture for Tasks 1.4, 1.5, 1.7
# ---------------------------------------------------------------------------

@pytest.fixture
def vault_db(tmp_path):
    """Create an in-memory SQLite DB with vault-related tables."""
    db_path = str(tmp_path / "test_vault.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    from brain.adaptive.vault_ingest import create_vault_tables
    create_vault_tables(conn)
    yield conn
    conn.close()


@pytest.fixture
def rich_vault(tmp_path):
    """Vault with frontmatter including aliases."""
    vault = tmp_path / "vault"
    vault.mkdir()
    (vault / "Cardiac Output.md").write_text(
        "---\n"
        "type: concept\n"
        "aliases:\n"
        "  - CO\n"
        "  - cardiac output\n"
        "prereqs:\n"
        "  - Heart Anatomy\n"
        "---\n"
        "# Cardiac Output\nCO = HR x SV. See [[Heart Anatomy]] and [[Preload]].\n",
        encoding="utf-8",
    )
    (vault / "Heart Anatomy.md").write_text(
        "---\n"
        "type: concept\n"
        "aliases:\n"
        "  - cardiac anatomy\n"
        "---\n"
        "# Heart Anatomy\nFour chambers. See [[Cardiac Output]].\n",
        encoding="utf-8",
    )
    (vault / "Preload.md").write_text(
        "---\naliases: []\n---\n# Preload\nVenous return. [[Cardiac Output]]\n",
        encoding="utf-8",
    )
    return vault


# ---------------------------------------------------------------------------
# Task 1.4 — Alias normalization table
# ---------------------------------------------------------------------------

class TestAliasTable:
    def test_aliases_stored(self, vault_db, rich_vault):
        from brain.adaptive.vault_ingest import ingest_vault

        ingest_vault(str(rich_vault), vault_db)
        cur = vault_db.execute("SELECT * FROM entity_aliases")
        rows = cur.fetchall()
        aliases = {r["alias"] for r in rows}
        assert "CO" in aliases
        assert "cardiac output" in aliases
        assert "cardiac anatomy" in aliases

    def test_alias_resolves_to_canonical(self, vault_db, rich_vault):
        from brain.adaptive.vault_ingest import ingest_vault

        ingest_vault(str(rich_vault), vault_db)
        cur = vault_db.execute(
            "SELECT canonical FROM entity_aliases WHERE alias = ?",
            ("CO",),
        )
        row = cur.fetchone()
        assert row is not None
        assert row["canonical"] == "Cardiac Output"


# ---------------------------------------------------------------------------
# Task 1.5 — Store vault notes in rag_docs
# ---------------------------------------------------------------------------

class TestRagDocsStorage:
    def test_notes_stored_in_rag_docs(self, vault_db, rich_vault):
        from brain.adaptive.vault_ingest import ingest_vault

        result = ingest_vault(str(rich_vault), vault_db)
        cur = vault_db.execute(
            "SELECT * FROM vault_docs WHERE source = 'obsidian'"
        )
        rows = cur.fetchall()
        assert len(rows) == 3

    def test_stable_doc_id_on_reingest(self, vault_db, rich_vault):
        from brain.adaptive.vault_ingest import ingest_vault

        ingest_vault(str(rich_vault), vault_db)
        cur = vault_db.execute("SELECT id, path FROM vault_docs")
        first_ids = {r["path"]: r["id"] for r in cur.fetchall()}

        # Re-ingest without changes
        ingest_vault(str(rich_vault), vault_db)
        cur = vault_db.execute("SELECT id, path FROM vault_docs")
        second_ids = {r["path"]: r["id"] for r in cur.fetchall()}

        assert first_ids == second_ids

    def test_reingest_no_changes_adds_zero_rows(self, vault_db, rich_vault):
        from brain.adaptive.vault_ingest import ingest_vault

        r1 = ingest_vault(str(rich_vault), vault_db)
        r2 = ingest_vault(str(rich_vault), vault_db)
        assert r2.get("updated", 0) == 0
        assert r2.get("inserted", 0) == 0


# ---------------------------------------------------------------------------
# Task 1.6 — Vault lint
# ---------------------------------------------------------------------------

class TestVaultLint:
    def test_lint_report_deterministic(self, rich_vault):
        from brain.adaptive.vault_ingest import lint_vault

        r1 = lint_vault(str(rich_vault))
        r2 = lint_vault(str(rich_vault))
        assert r1 == r2

    def test_missing_aliases_flagged(self, tmp_path):
        from brain.adaptive.vault_ingest import lint_vault

        vault = tmp_path / "v"
        vault.mkdir()
        (vault / "NoAlias.md").write_text(
            "---\ntype: concept\n---\n# No Alias\n", encoding="utf-8"
        )

        report = lint_vault(str(vault))
        issues = report["issues"]
        assert any("aliases" in i["message"].lower() for i in issues)

    def test_valid_note_passes_lint(self, tmp_path):
        from brain.adaptive.vault_ingest import lint_vault

        vault = tmp_path / "v"
        vault.mkdir()
        (vault / "Good.md").write_text(
            "---\naliases:\n  - good note\n---\n# Good\nContent.\n",
            encoding="utf-8",
        )
        report = lint_vault(str(vault))
        assert len(report["issues"]) == 0


# ---------------------------------------------------------------------------
# Task 1.7 — Incremental updates
# ---------------------------------------------------------------------------

class TestIncrementalUpdates:
    def test_edit_one_file_only_reprocesses_that_file(self, vault_db, rich_vault):
        from brain.adaptive.vault_ingest import ingest_vault

        r1 = ingest_vault(str(rich_vault), vault_db)
        assert r1["inserted"] == 3

        # Edit one file
        (rich_vault / "Preload.md").write_text(
            "---\naliases: []\n---\n# Preload\nEDITED content.\n",
            encoding="utf-8",
        )

        r2 = ingest_vault(str(rich_vault), vault_db)
        assert r2["updated"] == 1
        assert r2["inserted"] == 0
        assert r2["skipped"] == 2
