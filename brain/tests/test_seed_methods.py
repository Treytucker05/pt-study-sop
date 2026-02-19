"""Regression tests for template-chain seeding behavior."""

from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
from pathlib import Path

import pytest

# Add brain/ to import path for shared imports
brain_dir = Path(__file__).parent.parent
if str(brain_dir) not in sys.path:
    sys.path.insert(0, str(brain_dir))


def _load_seed_methods_module():
    module_path = Path(__file__).resolve().parents[1] / "data" / "seed_methods.py"
    spec = importlib.util.spec_from_file_location("seed_methods_test", module_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _init_seed_db(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS method_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            method_id TEXT,
            name TEXT NOT NULL,
            control_stage TEXT,
            description TEXT,
            default_duration_min INTEGER,
            energy_cost TEXT,
            best_stage TEXT,
            tags TEXT,
            evidence TEXT,
            artifact_type TEXT
        );

        CREATE TABLE IF NOT EXISTS method_chains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            block_ids TEXT,
            context_tags TEXT,
            created_at TEXT,
            is_template INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS method_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            method_block_id INTEGER,
            chain_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS library_meta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            library_version TEXT NOT NULL,
            source_sha TEXT,
            seeded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            method_count INTEGER,
            chain_count INTEGER
        );
        """
    )
    conn.commit()
    conn.close()


def test_seed_methods_upgrades_existing_chain_to_template(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    db_path = tmp_path / "seed_methods.db"
    _init_seed_db(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO method_blocks
            (method_id, name, control_stage, description, default_duration_min, energy_cost, best_stage, tags, evidence, artifact_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("blk_a", "Block A", "PRIME", "Block A desc", 5, "low", "first_exposure", "[]", "", ""),
    )
    block_a_id = cur.lastrowid
    cur.execute(
        """
        INSERT INTO method_blocks
            (method_id, name, control_stage, description, default_duration_min, energy_cost, best_stage, tags, evidence, artifact_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("blk_b", "Block B", "ENCODE", "Block B desc", 7, "medium", "first_exposure", "[]", "", ""),
    )
    block_b_id = cur.lastrowid

    # Existing row with same chain name but not marked as template.
    cur.execute(
        """
        INSERT INTO method_chains (name, description, block_ids, context_tags, is_template, created_at)
        VALUES (?, ?, ?, ?, 0, datetime('now'))
        """,
        ("SWEEP", "Old description", json.dumps([block_a_id]), json.dumps({"old": True})),
    )
    conn.commit()
    conn.close()

    module = _load_seed_methods_module()

    def _get_conn():
        return sqlite3.connect(db_path)

    monkeypatch.setattr(module, "get_connection", _get_conn)
    monkeypatch.setattr(module, "regenerate_prompts", lambda: None)
    monkeypatch.setattr(module, "_insert_library_meta", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        module,
        "load_from_yaml",
        lambda: {
            "version": "test",
            "methods": [
                {
                    "method_id": "blk_a",
                    "name": "Block A",
                    "control_stage": "PRIME",
                    "description": "Block A desc",
                    "default_duration_min": 5,
                    "energy_cost": "low",
                    "best_stage": "first_exposure",
                    "tags": [],
                    "evidence": "",
                    "artifact_type": "",
                },
                {
                    "method_id": "blk_b",
                    "name": "Block B",
                    "control_stage": "ENCODE",
                    "description": "Block B desc",
                    "default_duration_min": 7,
                    "energy_cost": "medium",
                    "best_stage": "first_exposure",
                    "tags": [],
                    "evidence": "",
                    "artifact_type": "",
                },
            ],
            "chains": [
                {
                    "name": "SWEEP",
                    "description": "Updated template description",
                    "blocks": ["Block A", "Block B"],
                    "context_tags": {"mode": "core"},
                    "is_template": 1,
                }
            ],
        },
    )

    module.seed_methods(force=False)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "SELECT description, block_ids, context_tags, is_template FROM method_chains WHERE name = ?",
        ("SWEEP",),
    )
    row = cur.fetchone()
    conn.close()

    assert row is not None
    assert row[0] == "Updated template description"
    assert json.loads(row[1]) == [block_a_id, block_b_id]
    assert json.loads(row[2]) == {"mode": "core"}
    assert int(row[3]) == 1
