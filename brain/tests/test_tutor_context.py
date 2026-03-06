"""Tests for unified tutor context builder."""
from __future__ import annotations

from unittest.mock import patch

import pytest


def test_build_context_returns_dict_with_required_keys():
    """depth='auto' returns all required keys; retrieval is mocked."""
    with (
        patch("tutor_context._fetch_materials", return_value="mocked materials"),
        patch("tutor_context._fetch_notes", return_value="mocked notes"),
        patch("tutor_context._fetch_vault_state", return_value=""),
    ):
        from tutor_context import build_context

        result = build_context("What is the brachial plexus?", depth="auto")

    assert isinstance(result, dict)
    assert "materials" in result
    assert "notes" in result
    assert "course_map" in result
    assert "debug" in result
    # Mocked retrieval values should come through
    assert result["materials"] == "mocked materials"
    assert result["notes"] == "mocked notes"


def test_build_context_depth_none_skips_all_retrieval():
    """depth='none' short-circuits retrieval; course_map still loads."""
    from tutor_context import build_context

    result = build_context("Hello", depth="none")

    assert result["materials"] == ""
    assert result["notes"] == ""
    # course_map is always-on even with depth=none
    assert isinstance(result["course_map"], str)
    assert result["course_map"] != ""


def test_build_context_depth_materials_only():
    """depth='materials' fetches materials but not notes."""
    with (
        patch("tutor_context._fetch_materials", return_value="mat only") as mock_mat,
        patch("tutor_context._fetch_notes", return_value="should not appear") as mock_notes,
    ):
        from tutor_context import build_context

        result = build_context("test query", depth="materials")

    mock_mat.assert_called_once()
    mock_notes.assert_not_called()
    assert result["materials"] == "mat only"
    assert result["notes"] == ""


def test_build_context_depth_notes_only():
    """depth='notes' fetches notes but not materials."""
    with (
        patch("tutor_context._fetch_materials", return_value="should not appear") as mock_mat,
        patch("tutor_context._fetch_notes", return_value="notes only") as mock_notes,
        patch("tutor_context._fetch_vault_state", return_value=""),
    ):
        from tutor_context import build_context

        result = build_context("test query", depth="notes")

    mock_mat.assert_not_called()
    mock_notes.assert_called_once()
    assert result["materials"] == ""
    assert result["notes"] == "notes only"


def test_build_context_debug_records_depth():
    """debug dict records the depth setting."""
    from tutor_context import build_context

    result = build_context("Hello", depth="none")
    assert result["debug"]["depth"] == "none"


def test_load_tutor_instructions_returns_content():
    from pathlib import Path
    instructions_path = Path(__file__).parent.parent / "tutor_instructions.md"
    assert instructions_path.exists(), "tutor_instructions.md must exist"
    content = instructions_path.read_text(encoding="utf-8")
    assert "Available Tools" in content
    assert ":::vault:create" in content


def test_fetch_notes_uses_obsidian_vault():
    """Verify _fetch_notes imports ObsidianVault, not ObsidianClient."""
    import ast
    from pathlib import Path
    source = (Path(__file__).parent.parent / "tutor_context.py").read_text()
    tree = ast.parse(source)
    imports = [
        node for node in ast.walk(tree)
        if isinstance(node, (ast.Import, ast.ImportFrom))
    ]
    import_names = []
    for imp in imports:
        if isinstance(imp, ast.ImportFrom) and imp.module:
            import_names.append(imp.module)
    assert "obsidian_vault" in import_names or any(
        "ObsidianVault" in source for _ in [1]
    ), "tutor_context.py should import from obsidian_vault"
    assert "obsidian_client" not in source.lower().replace("# ", ""), \
        "tutor_context.py should not reference obsidian_client"


def test_build_context_includes_vault_state():
    from unittest.mock import patch
    with patch("tutor_context._fetch_materials", return_value="materials"):
        with patch("tutor_context._fetch_notes", return_value="notes"):
            with patch("tutor_context._fetch_vault_state", return_value="vault state"):
                from tutor_context import build_context
                result = build_context("test", depth="auto", course_id=1)
                assert "vault_state" in result
