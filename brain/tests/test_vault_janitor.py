"""Tests for vault_janitor — scan, detect, and fix vault health issues."""
from __future__ import annotations

import sys
import os
from unittest.mock import patch, MagicMock

import pytest

# Ensure brain/ is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from vault_janitor import (
    JanitorIssue,
    ScanResult,
    _parse_frontmatter_fields,
    _resolve_frontmatter_from_path,
    _check_frontmatter,
    _check_orphans,
    _check_broken_links,
    _check_casing,
    _check_duplicates,
    apply_fix,
    scan_vault,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

COMPLETE_NOTE = """---
course: Neuroscience
course_code: PHYT_6313
unit_type: week
note_type: concept
---
# Motor Cortex

The motor cortex controls voluntary movement.
"""

MISSING_FM_NOTE = """---
course: Neuroscience
---
# Spinal Cord

Content about spinal cord.
"""

NO_FM_NOTE = """# Bare Note

This note has no frontmatter at all.
"""

NOTE_WITH_LINKS = """---
course: Neuroscience
course_code: PHYT_6313
unit_type: week
note_type: concept
---
# Motor Cortex

Related to [[Spinal Cord]] and [[Basal Ganglia]].
Also links to [[Nonexistent Note]].
"""


# ---------------------------------------------------------------------------
# TestParseFrontmatter
# ---------------------------------------------------------------------------

class TestParseFrontmatter:
    def test_extracts_all_fields(self):
        fm = _parse_frontmatter_fields(COMPLETE_NOTE)
        assert fm["course"] == "Neuroscience"
        assert fm["course_code"] == "PHYT_6313"
        assert fm["unit_type"] == "week"
        assert fm["note_type"] == "concept"

    def test_partial_frontmatter(self):
        fm = _parse_frontmatter_fields(MISSING_FM_NOTE)
        assert fm["course"] == "Neuroscience"
        assert "course_code" not in fm
        assert "unit_type" not in fm

    def test_no_frontmatter(self):
        fm = _parse_frontmatter_fields(NO_FM_NOTE)
        assert fm == {}

    def test_empty_content(self):
        fm = _parse_frontmatter_fields("")
        assert fm == {}

    def test_quoted_values(self):
        content = '---\ncourse: "Movement Science"\n---\nBody.'
        fm = _parse_frontmatter_fields(content)
        assert fm["course"] == "Movement Science"


# ---------------------------------------------------------------------------
# TestCheckFrontmatter
# ---------------------------------------------------------------------------

class TestCheckFrontmatter:
    def test_detects_missing_fields(self):
        paths = ["Study Notes/Neuroscience/Week 1/spinal.md"]
        contents = {paths[0]: MISSING_FM_NOTE}
        issues = _check_frontmatter(paths, contents)
        missing = {i.field for i in issues}
        assert "course_code" in missing
        assert "unit_type" in missing
        assert "note_type" in missing

    def test_no_false_positives_on_complete(self):
        paths = ["Study Notes/Neuroscience/Week 1/motor.md"]
        contents = {paths[0]: COMPLETE_NOTE}
        issues = _check_frontmatter(paths, contents)
        assert issues == []

    def test_skips_missing_content(self):
        paths = ["missing.md"]
        contents = {}
        issues = _check_frontmatter(paths, contents)
        assert issues == []


# ---------------------------------------------------------------------------
# TestCheckOrphans
# ---------------------------------------------------------------------------

class TestCheckOrphans:
    def test_identifies_orphans(self):
        graph = {
            "success": True,
            "nodes": [
                {"id": "A", "name": "A", "folder": "Notes"},
                {"id": "B", "name": "B", "folder": "Notes"},
                {"id": "C", "name": "C", "folder": "Notes"},
            ],
            "links": [
                {"source": "A", "target": "B"},
            ],
        }
        issues = _check_orphans(graph)
        orphan_names = {i.path for i in issues}
        assert "Notes/A.md" in orphan_names
        assert "Notes/C.md" in orphan_names
        assert "Notes/B.md" not in orphan_names

    def test_no_orphans_when_all_linked(self):
        graph = {
            "success": True,
            "nodes": [
                {"id": "A", "folder": ""},
                {"id": "B", "folder": ""},
            ],
            "links": [
                {"source": "A", "target": "B"},
                {"source": "B", "target": "A"},
            ],
        }
        issues = _check_orphans(graph)
        assert issues == []

    def test_returns_empty_on_failed_graph(self):
        issues = _check_orphans({"success": False})
        assert issues == []


# ---------------------------------------------------------------------------
# TestCheckBrokenLinks
# ---------------------------------------------------------------------------

class TestCheckBrokenLinks:
    def test_detects_broken_links(self):
        paths = ["note.md"]
        contents = {
            "note.md": NOTE_WITH_LINKS,
        }
        note_names = {"Spinal Cord", "Basal Ganglia", "Motor Cortex"}
        issues = _check_broken_links(paths, contents, note_names)
        broken = {i.field for i in issues}
        assert "Nonexistent Note" in broken

    def test_validates_good_links(self):
        paths = ["note.md"]
        contents = {"note.md": "See [[Alpha]] and [[Beta]]."}
        note_names = {"Alpha", "Beta"}
        issues = _check_broken_links(paths, contents, note_names)
        assert issues == []

    def test_case_insensitive(self):
        paths = ["note.md"]
        contents = {"note.md": "See [[motor cortex]]."}
        note_names = {"Motor Cortex"}
        issues = _check_broken_links(paths, contents, note_names)
        assert issues == []


# ---------------------------------------------------------------------------
# TestCheckCasing
# ---------------------------------------------------------------------------

class TestCheckCasing:
    def test_detects_casing_conflicts(self):
        paths = [
            "Study Notes/Neuro/file1.md",
            "Study notes/Neuro/file2.md",
        ]
        issues = _check_casing(paths)
        assert len(issues) >= 1
        assert issues[0].issue_type == "casing_mismatch"
        assert "Study Notes" in issues[0].detail or "Study notes" in issues[0].detail

    def test_no_conflicts(self):
        paths = [
            "Study Notes/Neuro/file1.md",
            "Study Notes/Neuro/file2.md",
        ]
        issues = _check_casing(paths)
        assert issues == []


# ---------------------------------------------------------------------------
# TestCheckDuplicates
# ---------------------------------------------------------------------------

class TestCheckDuplicates:
    def test_flags_identical_body(self):
        contents = {
            "a.md": "---\ncourse: A\n---\nSame body.",
            "b.md": "---\ncourse: B\n---\nSame body.",
        }
        issues = _check_duplicates(contents)
        assert len(issues) == 1
        assert issues[0].issue_type == "duplicate"

    def test_no_false_positives(self):
        contents = {
            "a.md": "---\ncourse: A\n---\nUnique body A.",
            "b.md": "---\ncourse: B\n---\nUnique body B.",
        }
        issues = _check_duplicates(contents)
        assert issues == []

    def test_ignores_empty_bodies(self):
        contents = {
            "a.md": "---\ncourse: A\n---\n",
            "b.md": "---\ncourse: B\n---\n",
        }
        issues = _check_duplicates(contents)
        assert issues == []


# ---------------------------------------------------------------------------
# TestApplyFix
# ---------------------------------------------------------------------------

class TestApplyFix:
    @patch("dashboard.api_adapter.obsidian_save_file")
    @patch("dashboard.api_adapter.obsidian_get_file")
    def test_adds_missing_field(self, mock_get, mock_save):
        mock_get.return_value = {"success": True, "content": MISSING_FM_NOTE}
        mock_save.return_value = {"success": True}

        issue = JanitorIssue(
            issue_type="missing_frontmatter",
            path="note.md",
            field="course_code",
            fixable=True,
            fix_data={"course_code": "PHYT_6313"},
        )
        result = apply_fix(issue)
        assert result["success"] is True

        saved_content = mock_save.call_args[0][1]
        assert "course_code: PHYT_6313" in saved_content

    @patch("dashboard.api_adapter.obsidian_save_file")
    @patch("dashboard.api_adapter.obsidian_get_file")
    def test_idempotent(self, mock_get, mock_save):
        mock_get.return_value = {"success": True, "content": COMPLETE_NOTE}

        issue = JanitorIssue(
            issue_type="missing_frontmatter",
            path="note.md",
            field="course",
            fixable=True,
            fix_data={"course": "Neuroscience"},
        )
        result = apply_fix(issue)
        assert result["success"] is True
        assert result["detail"] == "Already present"
        mock_save.assert_not_called()

    def test_not_fixable(self):
        issue = JanitorIssue(
            issue_type="orphan",
            path="note.md",
            fixable=False,
        )
        result = apply_fix(issue)
        assert result["success"] is False

    @patch("dashboard.api_adapter.obsidian_save_file")
    @patch("dashboard.api_adapter.obsidian_get_file")
    def test_adds_frontmatter_when_none_exists(self, mock_get, mock_save):
        mock_get.return_value = {"success": True, "content": NO_FM_NOTE}
        mock_save.return_value = {"success": True}

        issue = JanitorIssue(
            issue_type="missing_frontmatter",
            path="bare.md",
            field="course",
            fixable=True,
            fix_data={"course": "Neuroscience"},
        )
        result = apply_fix(issue)
        assert result["success"] is True

        saved = mock_save.call_args[0][1]
        assert saved.startswith("---\ncourse: Neuroscience\n---\n")


# ---------------------------------------------------------------------------
# TestScanVault
# ---------------------------------------------------------------------------

class TestScanVault:
    @patch("obsidian_index.get_vault_index")
    def test_graceful_degradation(self, mock_index):
        mock_index.return_value = {"success": False}
        result = scan_vault()
        assert result.api_available is False
        assert result.issues == []
        assert result.notes_scanned == 0

    @patch("obsidian_index._get_note_content")
    @patch("obsidian_index.get_vault_graph")
    @patch("obsidian_index.get_vault_index")
    def test_folder_filter(self, mock_index, mock_graph, mock_content):
        mock_index.return_value = {
            "success": True,
            "paths": {
                "NoteA": "Study Notes/Neuro/NoteA.md",
                "NoteB": "Study Notes/MovSci/NoteB.md",
            },
        }
        mock_graph.return_value = {"success": True, "nodes": [], "links": []}
        mock_content.return_value = COMPLETE_NOTE

        result = scan_vault(folder="Study Notes/Neuro", checks=["missing_frontmatter"])
        assert result.api_available is True
        assert result.notes_scanned == 1

    @patch("obsidian_index._get_note_content")
    @patch("obsidian_index.get_vault_index")
    def test_runs_selected_checks(self, mock_index, mock_content):
        mock_index.return_value = {
            "success": True,
            "paths": {"Note": "Note.md"},
        }
        mock_content.return_value = MISSING_FM_NOTE

        result = scan_vault(checks=["missing_frontmatter"])
        assert result.api_available is True
        fm_issues = [i for i in result.issues if i.issue_type == "missing_frontmatter"]
        assert len(fm_issues) > 0
