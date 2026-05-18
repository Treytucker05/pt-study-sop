"""Unit tests for _auto_link_materials_to_courses (default vs force).

Regression: a Source-Shelf "Sync Root Folder" that pinned the open
course force-assigned every file in the whole Root Folder to that one
course. The whole-root reconcile now passes course_id=None and the
backend force-rederives course_id from folder_path — which must also
REPAIR rows a prior pinned sync mis-assigned (the default NULL-only
link can't, since those rows are no longer NULL).
"""

from __future__ import annotations

import os
import sqlite3
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dashboard.api_tutor_materials import _auto_link_materials_to_courses


def _build_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT, archived_at TEXT)"
    )
    conn.execute(
        """CREATE TABLE rag_docs (
               id INTEGER PRIMARY KEY,
               folder_path TEXT,
               course_id INTEGER,
               corpus TEXT
           )"""
    )
    conn.executemany(
        "INSERT INTO courses (id, name, archived_at) VALUES (?, ?, NULL)",
        [(11, "Movement Science II"), (13, "Professionalism")],
    )
    conn.executemany(
        "INSERT INTO rag_docs (id, folder_path, course_id, corpus) VALUES (?, ?, ?, ?)",
        [
            (1, "11_Movement Science II/wk1.pdf", None, "materials"),
            (2, "13_Professionalism/ethics.pdf", 2, "materials"),  # force-mispinned
            (3, "90_Misc/random.pdf", 2, "materials"),  # no course matches
            (4, "11_Movement Science II/wk2.pdf", 11, "materials"),  # already correct
        ],
    )
    conn.commit()
    return conn


def _course_ids(conn: sqlite3.Connection) -> dict[int, int | None]:
    return {
        row[0]: row[1]
        for row in conn.execute("SELECT id, course_id FROM rag_docs").fetchall()
    }


def test_default_links_only_null_rows():
    conn = _build_db()
    _auto_link_materials_to_courses(conn)
    ids = _course_ids(conn)
    assert ids[1] == 11  # NULL row linked by folder
    assert ids[2] == 2  # mispinned row left untouched (not NULL)
    assert ids[3] == 2  # mispinned, no match, left untouched
    assert ids[4] == 11  # already correct


def test_force_rederives_and_repairs_all_materials_rows():
    conn = _build_db()
    _auto_link_materials_to_courses(conn, force=True)
    ids = _course_ids(conn)
    assert ids[1] == 11  # NULL -> linked
    assert ids[2] == 13  # mispinned course 2 -> repaired to Professionalism
    assert ids[3] is None  # no course matches 90_Misc -> reset to NULL
    assert ids[4] == 11  # already correct, unchanged
