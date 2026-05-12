import os
import sqlite3
import sys


sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import db_setup


def test_get_schema_version_uses_default_for_empty_current_db(tmp_path, monkeypatch):
    db_path = tmp_path / "fresh.db"
    monkeypatch.setattr(db_setup, "DB_PATH", str(db_path))

    db_setup.init_database()

    assert db_setup.get_schema_version() == "9.4"


def test_get_schema_version_reports_legacy_when_column_is_missing(
    tmp_path, monkeypatch
):
    db_path = tmp_path / "legacy.db"
    monkeypatch.setattr(db_setup, "DB_PATH", str(db_path))
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE sessions (id INTEGER PRIMARY KEY)")
    conn.commit()
    conn.close()

    assert db_setup.get_schema_version() == "pre-9.1"
