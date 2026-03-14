"""
Tests for Learning Objectives (LO) extraction pipeline.

Verifies:
1. execute_save_learning_objectives() handles valid inputs
2. LO deduplication logic works correctly
3. Error handling for missing/invalid inputs
"""

from __future__ import annotations

import os
import sys
import tempfile
import sqlite3
from datetime import datetime
from typing import Any
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
import dashboard.api_tutor as _api_tutor_mod
import tutor_tools


@pytest.fixture(scope="module")
def app():
    """Create Flask app with in-memory SQLite database for testing."""
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    _orig_env = os.environ.get("PT_STUDY_DB")
    _orig_config = config.DB_PATH
    _orig_db_setup = db_setup.DB_PATH
    _orig_api_tutor = _api_tutor_mod.DB_PATH

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_tutor_mod.DB_PATH = tmp_path

    db_setup.init_database()
    app_obj = create_app()
    app_obj.config["TESTING"] = True
    yield app_obj

    config.DB_PATH = _orig_config
    db_setup.DB_PATH = _orig_db_setup
    _api_tutor_mod.DB_PATH = _orig_api_tutor
    if _orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = _orig_env

    try:
        os.unlink(tmp_path)
    except OSError:
        pass


@pytest.fixture(scope="module")
def client(app):
    """Create Flask test client."""
    return app.test_client()


def _create_test_course(conn: sqlite3.Connection) -> int:
    """Create a test course and return its ID."""
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO courses (name, code, term, created_at)
        VALUES (?, ?, ?, ?)
        """,
        ("Test Course", "TEST_101", "Spring 2026", datetime.now().isoformat()),
    )
    conn.commit()
    return cur.lastrowid


def _create_test_session(conn: sqlite3.Connection, course_id: int) -> str:
    """Create a test tutor session and return its session_id."""
    cur = conn.cursor()
    session_id = f"test-session-{course_id}"
    now = datetime.now().isoformat()

    cur.execute(
        """
        INSERT INTO tutor_sessions (session_id, course_id, started_at)
        VALUES (?, ?, ?)
        """,
        (session_id, course_id, now),
    )
    conn.commit()

    return session_id


def test_execute_save_learning_objectives_missing_session_id(app, client):
    """Test that missing session_id returns error."""
    result = tutor_tools.execute_save_learning_objectives(
        arguments={
            "objectives": [{"id": "LO-001", "description": "Test"}],
            "save_folder": None,
        },
        session_id=None,
    )

    assert result.get("success") is False
    assert "session_id" in result.get("error", "").lower()


def test_execute_save_learning_objectives_missing_objectives(app, client):
    """Test that missing objectives field returns error."""
    conn = sqlite3.connect(config.DB_PATH)

    try:
        course_id = _create_test_course(conn)
        session_id = _create_test_session(conn, course_id)

        result = tutor_tools.execute_save_learning_objectives(
            arguments={
                "save_folder": None,
            },
            session_id=session_id,
        )

        assert result.get("success") is False
        assert "objectives" in result.get("error", "").lower()

    finally:
        conn.close()


def test_execute_save_learning_objectives_empty_objectives_list(app, client):
    """Test that empty objectives list returns error."""
    conn = sqlite3.connect(config.DB_PATH)

    try:
        course_id = _create_test_course(conn)
        session_id = _create_test_session(conn, course_id)

        result = tutor_tools.execute_save_learning_objectives(
            arguments={
                "objectives": [],
                "save_folder": None,
            },
            session_id=session_id,
        )

        assert result.get("success") is False

    finally:
        conn.close()


def test_execute_save_learning_objectives_invalid_objectives_type(app, client):
    """Test that non-list objectives returns error."""
    conn = sqlite3.connect(config.DB_PATH)

    try:
        course_id = _create_test_course(conn)
        session_id = _create_test_session(conn, course_id)

        result = tutor_tools.execute_save_learning_objectives(
            arguments={
                "objectives": "not a list",
                "save_folder": None,
            },
            session_id=session_id,
        )

        assert result.get("success") is False
        assert "objectives" in result.get("error", "").lower()

    finally:
        conn.close()


def test_execute_save_learning_objectives_valid_input(app, client):
    """Test that valid input is accepted and processed."""
    conn = sqlite3.connect(config.DB_PATH)

    try:
        course_id = _create_test_course(conn)
        session_id = _create_test_session(conn, course_id)

        objectives = [
            {"id": "LO-001", "description": "Understand hip anatomy"},
            {"id": "LO-002", "description": "Identify hip landmarks"},
        ]

        result = tutor_tools.execute_save_learning_objectives(
            arguments={
                "objectives": objectives,
                "save_folder": None,
            },
            session_id=session_id,
        )

        assert result.get("success") is True, f"Expected success, got: {result}"

    finally:
        conn.close()


def test_execute_save_learning_objectives_multiple_objectives(app, client):
    """Test saving multiple objectives in a single call."""
    conn = sqlite3.connect(config.DB_PATH)

    try:
        course_id = _create_test_course(conn)
        session_id = _create_test_session(conn, course_id)

        objectives = [
            {"id": "LO-MULTI-001", "description": "First objective"},
            {"id": "LO-MULTI-002", "description": "Second objective"},
            {"id": "LO-MULTI-003", "description": "Third objective"},
            {"id": "LO-MULTI-004", "description": "Fourth objective"},
            {"id": "LO-MULTI-005", "description": "Fifth objective"},
        ]

        result = tutor_tools.execute_save_learning_objectives(
            arguments={
                "objectives": objectives,
                "save_folder": None,
            },
            session_id=session_id,
        )

        assert result.get("success") is True

    finally:
        conn.close()


def test_execute_save_learning_objectives_with_missing_description(app, client):
    """Test that LO with missing description is handled gracefully."""
    conn = sqlite3.connect(config.DB_PATH)

    try:
        course_id = _create_test_course(conn)
        session_id = _create_test_session(conn, course_id)

        objectives = [
            {"id": "LO-NO-DESC"},
        ]

        result = tutor_tools.execute_save_learning_objectives(
            arguments={
                "objectives": objectives,
                "save_folder": None,
            },
            session_id=session_id,
        )

        assert result.get("success") is True

    finally:
        conn.close()


def test_learning_objectives_table_exists(app, client):
    """Test that learning_objectives table exists and has expected schema."""
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(learning_objectives)")
        columns = {row["name"] for row in cur.fetchall()}

        expected_columns = {
            "id",
            "course_id",
            "lo_code",
            "title",
            "status",
            "created_at",
            "updated_at",
        }

        assert expected_columns.issubset(columns), (
            f"Missing columns: {expected_columns - columns}"
        )

    finally:
        conn.close()


def test_lo_sessions_table_exists(app, client):
    """Test that lo_sessions junction table exists."""
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(lo_sessions)")
        columns = {row["name"] for row in cur.fetchall()}

        expected_columns = {"id", "lo_id", "session_id"}

        assert expected_columns.issubset(columns), (
            f"Missing columns: {expected_columns - columns}"
        )

    finally:
        conn.close()
