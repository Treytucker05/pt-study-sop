"""Tests for scholar.proposal_applier (SCHOLAR-006).

Covers happy-path apply + every documented failure mode. Uses an
in-memory SQLite DB with the minimum schema the applier touches
(method_blocks + scholar_proposals).

Run: ``uv run pytest brain/tests/test_proposal_applier.py -v``
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))


_TEST_SCHEMA = """
CREATE TABLE IF NOT EXISTS scholar_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    proposal_type TEXT,
    status TEXT,
    created_at TEXT,
    reviewed_at TEXT,
    reviewer_notes TEXT,
    content TEXT,
    cluster_id TEXT,
    proposal_kind TEXT,
    structured_changes TEXT,
    apply_status TEXT,
    applied_at TEXT,
    apply_error TEXT
);
CREATE TABLE IF NOT EXISTS method_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method_id TEXT,
    name TEXT,
    category TEXT,
    facilitation_prompt TEXT,
    created_at TEXT
);
"""


@pytest.fixture
def conn():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.executescript(_TEST_SCHEMA)
    c.commit()
    yield c
    c.close()


@pytest.fixture
def applier_module():
    import importlib

    if "scholar.proposal_applier" in sys.modules:
        importlib.reload(sys.modules["scholar.proposal_applier"])
    from scholar import proposal_applier

    return proposal_applier


def _seed_method_block(
    conn: sqlite3.Connection,
    *,
    name: str = "Cardio Drill",
    facilitation_prompt: str = "old prompt",
) -> int:
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO method_blocks (method_id, name, category, facilitation_prompt) "
        "VALUES (?, ?, ?, ?)",
        ("M-CARDIO-001", name, "drills", facilitation_prompt),
    )
    conn.commit()
    return int(cur.lastrowid or 0)


def _seed_proposal(
    conn: sqlite3.Connection,
    *,
    target_id: int,
    field_changes: dict,
    proposal_kind: str = "structured",
    target_table: str = "method_blocks",
) -> dict:
    structured = json.dumps(
        {
            "target_table": target_table,
            "target_id": target_id,
            "field_changes": field_changes,
        }
    )
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO scholar_proposals
              (title, proposal_type, status, created_at, content, cluster_id,
               proposal_kind, structured_changes,
               apply_status, applied_at, apply_error)
           VALUES (?, ?, 'approved', ?, ?, ?, ?, ?, NULL, NULL, NULL)""",
        (
            "test proposal",
            "method_block_edit",
            "2026-05-07T00:00:00",
            "rationale",
            "test_cluster",
            proposal_kind,
            structured,
        ),
    )
    conn.commit()
    pid = cur.lastrowid
    cur.execute("SELECT * FROM scholar_proposals WHERE id = ?", (pid,))
    return dict(cur.fetchone())


# ────────────────────────────────────────────────────────────────────────


class TestHappyPath:
    def test_facilitation_prompt_change_applied(self, conn, applier_module):
        block_id = _seed_method_block(
            conn, facilitation_prompt="old prompt"
        )
        proposal = _seed_proposal(
            conn,
            target_id=block_id,
            field_changes={"facilitation_prompt": "new prompt"},
        )
        result = applier_module.apply(proposal, conn=conn)
        assert result["applied"] is True
        assert result["error"] is None

        # method_blocks updated
        row = conn.execute(
            "SELECT facilitation_prompt FROM method_blocks WHERE id = ?",
            (block_id,),
        ).fetchone()
        assert row["facilitation_prompt"] == "new prompt"

        # proposal stamped
        proposal_row = conn.execute(
            "SELECT apply_status, applied_at, apply_error "
            "FROM scholar_proposals WHERE id = ?",
            (proposal["id"],),
        ).fetchone()
        assert proposal_row["apply_status"] == "applied"
        assert proposal_row["applied_at"] is not None
        assert proposal_row["apply_error"] is None


class TestForbiddenFields:
    def test_id_field_rejected(self, conn, applier_module):
        block_id = _seed_method_block(conn)
        proposal = _seed_proposal(
            conn,
            target_id=block_id,
            field_changes={"id": 999},
        )
        result = applier_module.apply(proposal, conn=conn)
        assert result["applied"] is False
        assert "forbidden" in (result["error"] or "").lower()
        # Proposal marked failed; status stays 'approved'
        proposal_row = conn.execute(
            "SELECT status, apply_status, apply_error "
            "FROM scholar_proposals WHERE id = ?",
            (proposal["id"],),
        ).fetchone()
        assert proposal_row["status"] == "approved"
        assert proposal_row["apply_status"] == "failed"

    def test_method_id_rejected(self, conn, applier_module):
        block_id = _seed_method_block(conn)
        proposal = _seed_proposal(
            conn,
            target_id=block_id,
            field_changes={"method_id": "M-OTHER"},
        )
        result = applier_module.apply(proposal, conn=conn)
        assert result["applied"] is False
        assert "method_id" in (result["error"] or "")

    def test_category_rejected(self, conn, applier_module):
        block_id = _seed_method_block(conn)
        proposal = _seed_proposal(
            conn,
            target_id=block_id,
            field_changes={"category": "encode"},
        )
        result = applier_module.apply(proposal, conn=conn)
        assert result["applied"] is False
        assert "category" in (result["error"] or "")


class TestMissingTarget:
    def test_target_id_not_in_table_fails(self, conn, applier_module):
        proposal = _seed_proposal(
            conn,
            target_id=99999,  # nothing seeded
            field_changes={"facilitation_prompt": "x"},
        )
        result = applier_module.apply(proposal, conn=conn)
        assert result["applied"] is False
        assert "does not exist" in (result["error"] or "")


class TestUnsupportedKinds:
    def test_markdown_kind_skipped(self, conn, applier_module):
        block_id = _seed_method_block(conn)
        proposal = _seed_proposal(
            conn,
            target_id=block_id,
            field_changes={"facilitation_prompt": "ignored"},
            proposal_kind="markdown",
        )
        result = applier_module.apply(proposal, conn=conn)
        assert result["applied"] is False
        assert result["skipped"] is True
        # method_blocks NOT changed
        row = conn.execute(
            "SELECT facilitation_prompt FROM method_blocks WHERE id = ?",
            (block_id,),
        ).fetchone()
        assert row["facilitation_prompt"] == "old prompt"
        # apply_status stays NULL for skipped (not failed)
        proposal_row = conn.execute(
            "SELECT apply_status FROM scholar_proposals WHERE id = ?",
            (proposal["id"],),
        ).fetchone()
        assert proposal_row["apply_status"] is None

    def test_unsupported_target_table_fails(self, conn, applier_module):
        block_id = _seed_method_block(conn)
        proposal = _seed_proposal(
            conn,
            target_id=block_id,
            field_changes={"name": "x"},
            target_table="some_other_table",
        )
        result = applier_module.apply(proposal, conn=conn)
        assert result["applied"] is False
        assert "unsupported target_table" in (result["error"] or "")


class TestUnknownColumn:
    def test_unknown_column_rejected(self, conn, applier_module):
        block_id = _seed_method_block(conn)
        proposal = _seed_proposal(
            conn,
            target_id=block_id,
            field_changes={"made_up_column": "x"},
        )
        result = applier_module.apply(proposal, conn=conn)
        assert result["applied"] is False
        assert "unknown columns" in (result["error"] or "")
