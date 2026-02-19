"""Tests for tutor accuracy profile tuning helpers and eval fixture shape."""

from __future__ import annotations

import json
from pathlib import Path

from tutor_accuracy_profiles import (
    DEFAULT_ACCURACY_PROFILE,
    normalize_accuracy_profile,
    resolve_instruction_retrieval_k,
    resolve_material_retrieval_k,
)


def test_normalize_accuracy_profile_defaults_to_balanced():
    assert normalize_accuracy_profile("unknown") == DEFAULT_ACCURACY_PROFILE
    assert normalize_accuracy_profile(None) == DEFAULT_ACCURACY_PROFILE


def test_resolve_material_retrieval_k_varies_by_profile():
    material_ids = list(range(1, 31))
    assert resolve_material_retrieval_k(material_ids, "balanced") == 30
    assert resolve_material_retrieval_k(material_ids, "strict") == 34
    assert resolve_material_retrieval_k(material_ids, "coverage") == 42


def test_resolve_instruction_retrieval_k_varies_by_profile():
    assert resolve_instruction_retrieval_k("balanced") == 2
    assert resolve_instruction_retrieval_k("strict") == 3
    assert resolve_instruction_retrieval_k("coverage") == 4


def test_eval_fixture_contains_50_questions():
    repo_root = Path(__file__).resolve().parents[2]
    dataset_path = repo_root / "brain" / "evals" / "tutor_eval_questions_50.json"
    payload = json.loads(dataset_path.read_text(encoding="utf-8"))
    questions = payload.get("questions")
    assert isinstance(questions, list)
    assert len(questions) == 50
    assert all(isinstance(item.get("question"), str) and item["question"].strip() for item in questions)
