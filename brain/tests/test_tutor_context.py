"""Tests for unified tutor context builder."""
from __future__ import annotations

from unittest.mock import patch

import pytest


def test_build_context_returns_dict_with_required_keys():
    """depth='auto' returns all required keys; retrieval is mocked."""
    with (
        patch("tutor_context._fetch_materials", return_value="mocked materials"),
        patch("tutor_context._fetch_notes", return_value="mocked notes"),
    ):
        from tutor_context import build_context

        result = build_context("What is the brachial plexus?", depth="auto")

    assert isinstance(result, dict)
    assert "materials" in result
    assert "instructions" in result
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
    assert result["instructions"] == ""
    # course_map is always-on even with depth=none (may be empty on CI without vault_courses.yaml)
    assert isinstance(result["course_map"], str)


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
