"""Regression tests for template-chain seeding behavior."""

from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
from pathlib import Path

import pytest
import yaml

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


def test_seed_methods_strict_sync_updates_stale_artifact_type(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db_path = tmp_path / "seed_methods_strict.db"
    _init_seed_db(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    # Simulate a non-placeholder existing row with stale artifact_type.
    cur.execute(
        """
        INSERT INTO method_blocks
            (method_id, name, control_stage, description, default_duration_min, energy_cost, best_stage, tags, evidence, artifact_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "M-ENC-001",
            "KWIK Hook",
            "ENCODE",
            "Old but non-placeholder description",
            3,
            "medium",
            "first_exposure",
            json.dumps(["mnemonic"]),
            "old evidence",
            "cards",
        ),
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
                    "method_id": "M-ENC-001",
                    "name": "KWIK Hook",
                    "control_stage": "ENCODE",
                    "description": "Canonical description",
                    "default_duration_min": 3,
                    "energy_cost": "medium",
                    "best_stage": "first_exposure",
                    "tags": ["mnemonic", "kwik"],
                    "evidence": "canonical evidence",
                    "artifact_type": "notes",
                }
            ],
            "chains": [],
        },
    )

    module.seed_methods(force=False, strict_sync=True)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "SELECT method_id, name, description, artifact_type FROM method_blocks WHERE method_id = ?",
        ("M-ENC-001",),
    )
    row = cur.fetchone()
    conn.close()

    assert row is not None
    assert row[0] == "M-ENC-001"
    assert row[1] == "KWIK Hook"
    assert row[2] == "Canonical description"
    assert row[3] == "notes"


def test_load_from_yaml_includes_new_prime_method_cards() -> None:
    module = _load_seed_methods_module()
    data = module.load_from_yaml()

    assert data is not None
    method_ids = {method["method_id"] for method in data["methods"]}

    assert "M-PRE-012" in method_ids
    assert "M-PRE-013" in method_ids
    assert "M-PRE-014" in method_ids


def test_seed_methods_repairs_control_stage_drift_without_strict_sync(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db_path = tmp_path / "seed_methods_stage_repair.db"
    _init_seed_db(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO method_blocks
            (method_id, name, control_stage, description, default_duration_min, energy_cost, best_stage, tags, evidence, artifact_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "M-INT-001",
            "Analogy Bridge",
            "ENCODE",
            "Canonical description already present",
            3,
            "medium",
            "review",
            json.dumps(["analogy", "transfer", "creative"]),
            "canonical evidence",
            "",
        ),
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
                    "method_id": "M-INT-001",
                    "name": "Analogy Bridge",
                    "control_stage": "TEACH",
                    "description": "Canonical description already present",
                    "default_duration_min": 3,
                    "energy_cost": "medium",
                    "best_stage": "review",
                    "tags": ["analogy", "transfer", "creative"],
                    "evidence": "canonical evidence",
                    "artifact_type": "",
                }
            ],
            "chains": [],
        },
    )

    module.seed_methods(force=False)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "SELECT method_id, name, control_stage FROM method_blocks WHERE method_id = ?",
        ("M-INT-001",),
    )
    row = cur.fetchone()
    conn.close()

    assert row is not None
    assert row[0] == "M-INT-001"
    assert row[1] == "Analogy Bridge"
    assert row[2] == "TEACH"


def test_load_from_yaml_includes_visible_teach_doctrine_cards() -> None:
    module = _load_seed_methods_module()
    data = module.load_from_yaml()
    assert data is not None

    method_ids = {method.get("method_id") for method in data["methods"]}

    assert "M-TEA-006" in method_ids
    assert "M-TEA-007" in method_ids
    assert "M-TEA-008" in method_ids
    assert "M-ENC-016" in method_ids


def test_depth_ladder_yaml_uses_literal_4_10_hs_pt_progression() -> None:
    method_path = Path(__file__).resolve().parents[2] / "sop" / "library" / "methods" / "M-TEA-006.yaml"
    data = yaml.safe_load(method_path.read_text(encoding="utf-8"))

    assert data["id"] == "M-TEA-006"

    step_actions = [str(step.get("action", "")) for step in data.get("steps", [])]
    assert any("4-year-old" in action for action in step_actions)
    assert any("10-year-old" in action for action in step_actions)
    assert any("high-school" in action for action in step_actions)
    assert any("PT/DPT" in action for action in step_actions)

    prompt = str(data.get("facilitation_prompt", ""))
    assert "4-year-old -> 10-year-old -> high-school -> PT/DPT" in prompt
    assert "Do not skip a rung." in prompt


def test_kwik_hook_yaml_uses_word_sound_meaning_link_flow() -> None:
    method_path = Path(__file__).resolve().parents[2] / "sop" / "library" / "methods" / "M-ENC-001.yaml"
    data = yaml.safe_load(method_path.read_text(encoding="utf-8"))

    assert data["id"] == "M-ENC-001"

    step_actions = [str(step.get("action", "")) for step in data.get("steps", [])]
    assert any("Word Sound" in action for action in step_actions)
    assert any("Real Meaning" in action for action in step_actions)
    assert any("Meaning Picture" in action for action in step_actions)
    assert any("Link:" in action for action in step_actions)
    assert any("Personalize" in action for action in step_actions)
    assert any("Lock:" in action for action in step_actions)

    prompt = str(data.get("facilitation_prompt", ""))
    assert "word sound -> real meaning -> meaning picture -> linked scene -> personalize -> lock" in prompt
    assert "sound cue + meaning link scene" in prompt


def test_worked_example_fade_yaml_models_once_before_fading() -> None:
    method_path = Path(__file__).resolve().parents[2] / "sop" / "library" / "methods" / "M-TEA-008.yaml"
    data = yaml.safe_load(method_path.read_text(encoding="utf-8"))

    assert data["id"] == "M-TEA-008"

    step_actions = [str(step.get("action", "")) for step in data.get("steps", [])]
    assert any("Present one fully worked example" in action for action in step_actions)
    assert any("Fade 1-2 steps" in action for action in step_actions)
    assert any("fill the missing steps" in action for action in step_actions)

    prompt = str(data.get("facilitation_prompt", ""))
    assert "Model once before you fade." in prompt
    assert "Show one fully worked example before asking the learner to fill anything in." in prompt
    assert "Do not turn the fade pass into a scored quiz." in prompt


def test_embodied_walkthrough_yaml_requires_safe_movement_and_map_back() -> None:
    method_path = Path(__file__).resolve().parents[2] / "sop" / "library" / "methods" / "M-ENC-016.yaml"
    data = yaml.safe_load(method_path.read_text(encoding="utf-8"))

    assert data["id"] == "M-ENC-016"

    step_actions = [str(step.get("action", "")) for step in data.get("steps", [])]
    assert any("Assign one safe movement or gesture" in action for action in step_actions)
    assert any("Run the walkthrough slowly with live narration" in action for action in step_actions)
    assert any("translate back into words or a sketch" in action for action in step_actions)

    prompt = str(data.get("facilitation_prompt", ""))
    assert "The learner must do the movement or gesture, not just watch it described." in prompt
    assert "Every movement must be translated back into the real structure, mechanism, or sequence." in prompt
    assert "End with a map-back explanation, list, or sketch rather than movement alone." in prompt


def test_load_from_yaml_merges_chain_certification_registry(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    module = _load_seed_methods_module()
    methods_dir = tmp_path / "methods"
    chains_dir = tmp_path / "chains"
    meta_dir = tmp_path / "meta"
    methods_dir.mkdir()
    chains_dir.mkdir()
    meta_dir.mkdir()

    (methods_dir / "M-PRE-001.yaml").write_text(
        "\n".join(
            [
                "id: M-PRE-001",
                "name: Brain Dump",
                "control_stage: PRIME",
                "description: Test block",
                "default_duration_min: 3",
                "energy_cost: low",
                "knobs: {}",
                "constraints: {}",
                "inputs: []",
                "steps: []",
                "outputs: []",
                "stop_criteria: []",
                "facilitation_prompt: Test prompt",
                "gating_rules: []",
                "failure_modes: []",
                "artifact_type: notes",
            ]
        ),
        encoding="utf-8",
    )
    (chains_dir / "C-TEST-001.yaml").write_text(
        "\n".join(
            [
                "id: C-TEST-001",
                "name: Test Chain",
                "description: Chain for registry merge",
                "blocks:",
                "  - M-PRE-001",
                "is_template: true",
            ]
        ),
        encoding="utf-8",
    )
    (chains_dir / "certification_registry.yaml").write_text(
        "\n".join(
            [
                "version: 1",
                "chains:",
                "  C-TEST-001:",
                "    disposition: baseline-certification",
                "    bar: baseline",
                "    selectable: true",
                "    rationale: Test chain must pass baseline certification.",
            ]
        ),
        encoding="utf-8",
    )
    (meta_dir / "version.yaml").write_text("version: test\n", encoding="utf-8")

    monkeypatch.setattr(module, "_METHODS_DIR", methods_dir)
    monkeypatch.setattr(module, "_CHAINS_DIR", chains_dir)
    monkeypatch.setattr(module, "_VERSION_PATH", meta_dir / "version.yaml")
    monkeypatch.setattr(
        module,
        "_CHAIN_CERTIFICATION_REGISTRY_PATH",
        chains_dir / "certification_registry.yaml",
    )

    loaded = module.load_from_yaml()

    assert loaded is not None
    assert loaded["chains"]
    chain = loaded["chains"][0]
    assert chain["context_tags"]["template_id"] == "C-TEST-001"
    assert chain["context_tags"]["certification"]["disposition"] == "baseline-certification"
    assert chain["context_tags"]["certification"]["bar"] == "baseline"
