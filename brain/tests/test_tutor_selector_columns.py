import sqlite3

from dashboard import api_tutor as api_tutor_mod
import dashboard.api_tutor_utils as api_tutor_utils_mod


def test_ensure_selector_columns_rechecks_schema_when_cache_is_stale():
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE tutor_sessions (
            session_id TEXT PRIMARY KEY,
            started_at TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE tutor_turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tutor_session_id TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT
        )
        """
    )
    conn.commit()

    api_tutor_mod._SELECTOR_COLS_ENSURED = True
    api_tutor_utils_mod._SELECTOR_COLS_ENSURED = True

    api_tutor_mod._ensure_selector_columns(conn)

    tutor_session_cols = {
        row[1] for row in conn.execute("PRAGMA table_info(tutor_sessions)").fetchall()
    }
    tutor_turn_cols = {
        row[1] for row in conn.execute("PRAGMA table_info(tutor_turns)").fetchall()
    }
    session_cols = {
        row[1] for row in conn.execute("PRAGMA table_info(sessions)").fetchall()
    }

    assert {
        "selector_chain_id",
        "selector_score_json",
        "selector_policy_version",
        "selector_dependency_fix",
        "codex_thread_id",
        "last_response_id",
    }.issubset(tutor_session_cols)
    assert {"response_id", "model_id"}.issubset(tutor_turn_cols)
    assert {"selector_chain_id", "selector_policy_version"}.issubset(session_cols)
