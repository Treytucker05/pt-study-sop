"""Focused tests for the family-aware vault janitor."""

from __future__ import annotations

import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from vault_janitor import (
    JanitorIssue,
    _check_broken_links,
    _check_frontmatter,
    _parse_frontmatter_fields,
    apply_fix,
    scan_vault,
)


CONCEPT_NOTE = """---
note_type: concept
aliases:
  - Basal Nuclei
tags:
  - anatomy
courses:
  - Neuroscience
---
# Basal Ganglia
Related to [[Striatum]].
"""

CONCEPT_NOTE_NO_ALIASES = """---
note_type: concept
tags:
  - anatomy
courses:
  - Neuroscience
---
# Thalamus
Related to [[Basal Ganglia]].
"""

GLOSSARY_NOTE = """---
note_type: reference
scope: vault-wide
---
# Glossary
"""

COURSE_LO_NOTE_MISSING_FIELDS = """---
note_type: learning_objectives_todo
course_name: Neuroscience
---
# Week 9
"""

COURSE_LO_NOTE = """---
note_type: learning_objectives_todo
course_name: Neuroscience
module_name: Week 9
updated_at: 2026-03-10 12:00
---
# Week 9
See [[Basal Nuclei]] and [[Learning Objectives & To Do#OBJ-4|OBJ-4]].
"""

SYSTEM_TEMPLATE_NOTE = """# Weekly Module Template

Example link [[Fake Template Link]].
"""


def test_parse_frontmatter_supports_yaml_lists() -> None:
    frontmatter = _parse_frontmatter_fields(CONCEPT_NOTE)
    assert frontmatter["note_type"] == "concept"
    assert frontmatter["aliases"] == ["Basal Nuclei"]
    assert frontmatter["tags"] == ["anatomy"]
    assert frontmatter["courses"] == ["Neuroscience"]


def test_concept_notes_do_not_require_old_course_code_contract() -> None:
    issues = _check_frontmatter({"Concepts/Anatomy/Basal Ganglia.md": CONCEPT_NOTE})
    missing_fields = {issue.field for issue in issues}
    assert missing_fields == set()


def test_concept_aliases_are_advisory_only() -> None:
    issues = _check_frontmatter({"Concepts/Anatomy/Thalamus.md": CONCEPT_NOTE_NO_ALIASES})
    assert len(issues) == 1
    assert issues[0].field == "aliases"
    assert issues[0].issue_class == "advisory/system"
    assert issues[0].counts_toward_health is False


def test_glossary_index_note_is_exempt_from_concept_contract() -> None:
    issues = _check_frontmatter({"Concepts/_Glossary.md": GLOSSARY_NOTE})
    assert issues == []


def test_course_learning_objectives_require_course_family_fields() -> None:
    issues = _check_frontmatter(
        {
            "Courses/Neuroscience/Week 9/Learning Objectives & To Do.md": COURSE_LO_NOTE_MISSING_FIELDS,
        }
    )
    missing_fields = {issue.field for issue in issues}
    assert "module_name" in missing_fields
    assert "updated_at" in missing_fields
    assert "course_code" not in missing_fields
    assert "unit_type" not in missing_fields


def test_heading_style_wikilinks_are_not_flagged_as_missing_notes() -> None:
    issues = _check_broken_links(
        ["Courses/Neuroscience/Week 9/_Map of Contents.md"],
        {
            "Courses/Neuroscience/Week 9/_Map of Contents.md": (
                "See [[Learning Objectives & To Do#OBJ-4|OBJ-4]]."
            )
        },
        {"Learning Objectives & To Do"},
    )
    assert issues == []


@patch("obsidian_index._get_note_content")
@patch("obsidian_index.get_vault_index")
def test_scan_vault_reconciles_markdown_counts_and_excludes_system_files(mock_index, mock_content) -> None:
    files = [
        {"name": "Learning Objectives & To Do", "path": "Courses/Neuroscience/Week 9/Learning Objectives & To Do.md"},
        {"name": "Basal Ganglia", "path": "Concepts/Anatomy/Basal Ganglia.md"},
        {"name": "Weekly Module - Map of Contents", "path": "Study System/Templates/Weekly Module - Map of Contents.md"},
    ]
    mock_index.return_value = {
        "success": True,
        "files": files,
        "paths": {item["name"]: item["path"] for item in files},
    }
    contents = {
        files[0]["path"]: COURSE_LO_NOTE,
        files[1]["path"]: CONCEPT_NOTE,
        files[2]["path"]: SYSTEM_TEMPLATE_NOTE,
    }
    mock_content.side_effect = lambda path: contents.get(path, "")

    result = scan_vault()

    assert result.total_markdown_files == 3
    assert result.excluded_system_files == 1
    assert result.notes_scanned == 2


@patch("obsidian_index._get_note_content")
@patch("obsidian_index.get_vault_index")
def test_scan_vault_resolves_alias_links(mock_index, mock_content) -> None:
    files = [
        {"name": "Learning Objectives & To Do", "path": "Courses/Neuroscience/Week 9/Learning Objectives & To Do.md"},
        {"name": "Basal Ganglia", "path": "Concepts/Anatomy/Basal Ganglia.md"},
    ]
    mock_index.return_value = {
        "success": True,
        "files": files,
        "paths": {item["name"]: item["path"] for item in files},
    }
    contents = {
        files[0]["path"]: COURSE_LO_NOTE,
        files[1]["path"]: CONCEPT_NOTE,
    }
    mock_content.side_effect = lambda path: contents.get(path, "")

    result = scan_vault(checks=["broken_link"])

    broken_targets = {issue.field for issue in result.issues if issue.issue_type == "broken_link"}
    assert "Basal Nuclei" not in broken_targets


@patch("vault_janitor._build_attachment_lookup")
@patch("obsidian_index._get_note_content")
@patch("obsidian_index.get_vault_index")
def test_scan_vault_resolves_existing_attachment_links(mock_index, mock_content, mock_attachments) -> None:
    files = [
        {"name": "Week 7 Notes", "path": "Courses/Neuroscience/Week 7/Embryology Concepts.md"},
    ]
    mock_index.return_value = {
        "success": True,
        "files": files,
        "paths": {item["name"]: item["path"] for item in files},
    }
    mock_content.return_value = "See [[Gastrulation_Diagram.jpeg]] and [[Learning Objectives & To Do#OBJ-4|OBJ-4]]."
    mock_attachments.return_value = {
        "exact": {"assets/neuroscience/gastrulation_diagram.jpeg"},
        "by_name": {"gastrulation_diagram.jpeg": ["Assets/Neuroscience/Gastrulation_Diagram.jpeg"]},
    }

    result = scan_vault(checks=["broken_link"])

    broken_targets = {issue.field for issue in result.issues if issue.issue_type == "broken_link"}
    assert "Gastrulation_Diagram.jpeg" not in broken_targets


@patch("obsidian_index._get_note_content")
@patch("obsidian_index.get_vault_index")
def test_scan_vault_flags_deprecated_study_notes_root_as_routing_drift(mock_index, mock_content) -> None:
    file_path = "Study Notes/Neuroscience/Week 1/Spinal Cord.md"
    mock_index.return_value = {
        "success": True,
        "files": [{"name": "Spinal Cord", "path": file_path}],
        "paths": {"Spinal Cord": file_path},
    }
    mock_content.return_value = """---
course: Neuroscience
course_code: PHYT_6313
unit_type: week
note_type: concept
---
# Spinal Cord
"""

    result = scan_vault(checks=["routing_drift"])

    routing_issues = [issue for issue in result.issues if issue.issue_type == "routing_drift"]
    assert len(routing_issues) == 1
    assert "Deprecated root" in routing_issues[0].detail


@patch("vault_janitor.ObsidianVault")
def test_apply_fix_updates_yaml_frontmatter(mock_vault_cls) -> None:
    mock_vault = mock_vault_cls.return_value
    mock_vault.read_note.return_value = COURSE_LO_NOTE_MISSING_FIELDS

    issue = JanitorIssue(
        issue_type="missing_frontmatter",
        path="Courses/Neuroscience/Week 9/Learning Objectives & To Do.md",
        field="module_name",
        fixable=True,
        fix_data={"module_name": "Week 9"},
    )

    result = apply_fix(issue)

    assert result["success"] is True
    saved_content = mock_vault.replace_content.call_args.kwargs["new_content"]
    assert "module_name: Week 9" in saved_content
