"""Unit tests for chain_runner.py with mocked LLM calls."""

import json
import os
import sqlite3
import tempfile
import uuid
from unittest.mock import patch

import pytest

# Override DB before importing app modules
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["PT_STUDY_DB_OVERRIDE"] = _tmp.name

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
config.DB_PATH = _tmp.name

from db_setup import init_database, get_connection
from chain_runner import (
    run_chain,
    _load_chain,
    _parse_card_output,
    _safe_json,
)
from chain_prompts import get_step_prompt


def _unique_topic(base: str = "Test") -> str:
    """Generate a unique topic to avoid sessions UNIQUE constraint."""
    return f"{base}-{uuid.uuid4().hex[:8]}"


@pytest.fixture(autouse=True)
def fresh_db():
    """Ensure clean DB for each test."""
    config.DB_PATH = _tmp.name
    init_database()

    conn = get_connection()
    cursor = conn.cursor()

    # Clear test data
    cursor.execute("DELETE FROM chain_runs")
    cursor.execute("DELETE FROM method_chains")
    cursor.execute("DELETE FROM method_blocks")
    cursor.execute("DELETE FROM card_drafts")

    # Insert test blocks
    blocks = [
        ("Concept Cluster", "prepare"),
        ("Concept Map", "encode"),
        ("Sprint Quiz", "retrieve"),
        ("Anki Card Draft", "overlearn"),
    ]
    block_ids = []
    for name, category in blocks:
        cursor.execute(
            "INSERT INTO method_blocks (name, category, description) VALUES (?, ?, ?)",
            (name, category, f"Test {name}"),
        )
        block_ids.append(cursor.lastrowid)

    # Insert test chain
    cursor.execute(
        """INSERT INTO method_chains (name, description, block_ids, context_tags, is_template)
           VALUES (?, ?, ?, ?, 1)""",
        (
            "Test SWEEP",
            "Test sweep chain",
            json.dumps(block_ids),
            json.dumps({"stage": "first_exposure", "pass": "sweep"}),
        ),
    )

    conn.commit()
    conn.close()
    yield


def _mock_llm_success(system, user, **kwargs):
    """Mock call_llm that returns success with deterministic content."""
    if "Anki" in system or "Anki" in user:
        return {
            "success": True,
            "content": (
                "CARD 1:\nTYPE: basic\nFRONT: What is the GH joint?\n"
                "BACK: Ball and socket joint of the shoulder\n"
                "TAGS: anatomy, shoulder\n\n"
                "CARD 2:\nTYPE: cloze\nFRONT: The {{c1::supraspinatus}} initiates abduction\n"
                "BACK: Supraspinatus muscle\nTAGS: anatomy, rotator-cuff"
            ),
        }
    return {
        "success": True,
        "content": f"## Test output for step\nTopic coverage based on: {user[:50]}...",
    }


def _mock_llm_failure(system, user, **kwargs):
    """Mock call_llm that fails."""
    return {"success": False, "error": "API rate limited"}


class TestParseCardOutput:
    def test_parses_basic_cards(self):
        output = (
            "CARD 1:\nTYPE: basic\nFRONT: Question?\nBACK: Answer\nTAGS: tag1\n\n"
            "CARD 2:\nTYPE: cloze\nFRONT: The {{c1::answer}}\nBACK: answer\nTAGS: tag2"
        )
        cards = _parse_card_output(output)
        assert len(cards) == 2
        assert cards[0]["front"] == "Question?"
        assert cards[0]["back"] == "Answer"
        assert cards[0]["type"] == "basic"
        assert cards[1]["type"] == "cloze"

    def test_handles_empty_output(self):
        assert _parse_card_output("") == []
        assert _parse_card_output("No cards here") == []

    def test_handles_partial_cards(self):
        output = "CARD 1:\nTYPE: basic\nFRONT: Question only"
        cards = _parse_card_output(output)
        assert len(cards) == 0  # Missing BACK


class TestSafeJson:
    def test_parses_list(self):
        assert _safe_json("[1, 2, 3]") == [1, 2, 3]

    def test_parses_dict(self):
        assert _safe_json('{"a": 1}') == {"a": 1}

    def test_returns_existing_list(self):
        assert _safe_json([1, 2]) == [1, 2]

    def test_handles_none(self):
        assert _safe_json(None) is None

    def test_handles_invalid(self):
        assert _safe_json("not json") == "not json"


class TestLoadChain:
    def test_loads_existing_chain(self):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM method_chains LIMIT 1")
        chain_id = cursor.fetchone()[0]
        conn.close()

        chain = _load_chain(chain_id)
        assert chain is not None
        assert chain["name"] == "Test SWEEP"
        assert len(chain["blocks"]) == 4
        assert chain["blocks"][0]["name"] == "Concept Cluster"

    def test_returns_none_for_missing(self):
        assert _load_chain(99999) is None


class TestGetStepPrompt:
    def test_known_block_returns_structured_prompt(self):
        block = {"name": "Concept Cluster", "category": "prepare"}
        prompt = get_step_prompt(block, "Shoulder Anatomy", "source text", "")
        assert "system" in prompt
        assert "user" in prompt
        assert "Shoulder Anatomy" in prompt["user"]
        assert "clusters" in prompt["user"].lower()

    def test_unknown_block_returns_fallback(self):
        block = {"name": "Unknown Method", "category": "encode"}
        prompt = get_step_prompt(block, "Test Topic", "ctx", "acc")
        assert "Unknown Method" in prompt["user"]


class TestRunChain:
    @patch("chain_runner.model_call", side_effect=_mock_llm_success)
    def test_successful_run(self, mock_llm):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM method_chains LIMIT 1")
        chain_id = cursor.fetchone()[0]
        conn.close()

        topic = _unique_topic("Shoulder-Anatomy")
        result = run_chain(chain_id, topic, options={"write_obsidian": False})

        assert result["status"] == "completed"
        assert result["chain_name"] == "Test SWEEP"
        assert len(result["steps"]) == 4
        assert result["run_id"] is not None
        assert result["artifacts"]["session_id"] is not None

        # Verify chain_runs row
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT status, total_steps, current_step FROM chain_runs WHERE id = ?", (result["run_id"],))
        row = cursor.fetchone()
        conn.close()
        assert row[0] == "completed"
        assert row[1] == 4
        assert row[2] == 4

    @patch("chain_runner.model_call", side_effect=_mock_llm_success)
    def test_card_drafts_created(self, mock_llm):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM method_chains LIMIT 1")
        chain_id = cursor.fetchone()[0]
        conn.close()

        topic = _unique_topic("Card-Draft")
        result = run_chain(chain_id, topic, options={"write_obsidian": False, "draft_cards": True})

        assert result["status"] == "completed"
        assert result["artifacts"]["metrics"]["cards_drafted"] == 2
        assert len(result["artifacts"]["card_draft_ids"]) == 2

        # Verify card_drafts rows
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT front, back, card_type FROM card_drafts")
        cards = cursor.fetchall()
        conn.close()
        assert len(cards) == 2

    @patch("chain_runner.model_call", side_effect=_mock_llm_failure)
    def test_failed_run(self, mock_llm):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM method_chains LIMIT 1")
        chain_id = cursor.fetchone()[0]
        conn.close()

        topic = _unique_topic("Fail")
        result = run_chain(chain_id, topic, options={"write_obsidian": False})

        assert result["status"] == "failed"
        assert "rate limited" in result["error"].lower()

        # Verify chain_runs status
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT status, error_message FROM chain_runs WHERE id = ?", (result["run_id"],))
        row = cursor.fetchone()
        conn.close()
        assert row[0] == "failed"

    def test_missing_chain(self):
        result = run_chain(99999, _unique_topic("Missing"))
        assert result["status"] == "failed"
        assert "not found" in result["error"].lower()

    @patch("chain_runner.model_call", side_effect=_mock_llm_success)
    def test_session_created_with_chain_mode(self, mock_llm):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM method_chains LIMIT 1")
        chain_id = cursor.fetchone()[0]
        conn.close()

        topic = _unique_topic("Session-Mode")
        result = run_chain(chain_id, topic, options={"write_obsidian": False, "draft_cards": False})

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT study_mode, method_chain_id FROM sessions WHERE id = ?",
            (result["artifacts"]["session_id"],),
        )
        row = cursor.fetchone()
        conn.close()
        assert row[0] == "Test SWEEP"  # study_mode = chain name
        assert row[1] == chain_id  # method_chain_id linked


class TestFacilitationPromptInjection:
    """Smoke tests verifying facilitation_prompt flows into assembled prompts."""

    def test_chain_prompts_uses_facilitation_prompt(self):
        """chain_prompts.get_step_prompt uses facilitation_prompt when present."""
        block = {
            "name": "Brain Dump",
            "category": "prepare",
            "facilitation_prompt": "## Current Activity Block: Brain Dump (prepare, ~3 min)\nFacilitate the **Brain Dump** protocol.",
        }
        prompt = get_step_prompt(block, "Shoulder Anatomy", "source text", "")
        assert "## Current Activity Block: Brain Dump" in prompt["system"]
        assert "Facilitate the **Brain Dump** protocol" in prompt["system"]

    def test_chain_prompts_falls_back_without_facilitation(self):
        """Without facilitation_prompt, falls back to hardcoded templates."""
        block = {"name": "Concept Cluster", "category": "prepare", "facilitation_prompt": ""}
        prompt = get_step_prompt(block, "Topic", "ctx", "acc")
        assert "clusters" in prompt["user"].lower()

    def test_tutor_prompt_builder_uses_facilitation_prompt(self):
        """tutor_prompt_builder._build_block_section returns facilitation_prompt."""
        from tutor_prompt_builder import build_tutor_system_prompt
        block_info = {
            "name": "Brain Dump",
            "category": "prepare",
            "description": "Free-write everything you know",
            "evidence": "",
            "duration": 3,
            "facilitation_prompt": "## Current Activity Block: Brain Dump (prepare, ~3 min)\n_Free-write_\n\n### Steps (follow in order)",
        }
        prompt = build_tutor_system_prompt(mode="Core", current_block=block_info)
        assert "## Current Activity Block: Brain Dump" in prompt
        assert "### Steps (follow in order)" in prompt

    def test_load_chain_includes_facilitation_prompt(self):
        """_load_chain selects facilitation_prompt from DB."""
        conn = get_connection()
        cursor = conn.cursor()

        # Update a test block with facilitation_prompt
        cursor.execute("SELECT id FROM method_blocks WHERE name = 'Concept Cluster'")
        block_id = cursor.fetchone()[0]
        cursor.execute(
            "UPDATE method_blocks SET facilitation_prompt = ? WHERE id = ?",
            ("## Current Activity Block: Concept Cluster\nTest facilitation.", block_id),
        )
        conn.commit()

        cursor.execute("SELECT id FROM method_chains LIMIT 1")
        chain_id = cursor.fetchone()[0]
        conn.close()

        chain = _load_chain(chain_id)
        first_block = chain["blocks"][0]
        assert first_block["name"] == "Concept Cluster"
        assert "## Current Activity Block: Concept Cluster" in first_block["facilitation_prompt"]


@pytest.fixture(autouse=True, scope="session")
def cleanup():
    yield
    try:
        os.unlink(_tmp.name)
    except OSError:
        pass
