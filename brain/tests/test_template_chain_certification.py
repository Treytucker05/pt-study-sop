"""Regression coverage for template-chain certification metadata."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data.seed_methods import load_from_yaml


ALLOWED_DISPOSITIONS = {
    "strict-certification",
    "baseline-certification",
    "legacy/deferred",
    "admin-only/non-user path",
}


def test_every_template_chain_has_template_id_and_certification() -> None:
    loaded = load_from_yaml()
    assert loaded is not None

    chains = loaded.get("chains", [])
    assert chains, "No template chains loaded from YAML"

    for chain in chains:
        template_id = chain.get("context_tags", {}).get("template_id")
        certification = chain.get("context_tags", {}).get("certification")

        assert template_id, f"{chain['name']}: missing template_id"
        assert isinstance(certification, dict), f"{chain['name']}: missing certification metadata"
        assert certification.get("disposition") in ALLOWED_DISPOSITIONS, (
            f"{chain['name']}: invalid disposition {certification.get('disposition')!r}"
        )


def test_strict_certification_chains_are_marked_gold_standard() -> None:
    loaded = load_from_yaml()
    assert loaded is not None

    strict = [
        chain for chain in loaded.get("chains", [])
        if chain.get("context_tags", {}).get("certification", {}).get("disposition")
        == "strict-certification"
    ]
    assert strict, "Expected at least one strict-certification chain"

    for chain in strict:
        certification = chain["context_tags"]["certification"]
        assert certification.get("gold_standard") is True, (
            f"{chain['name']}: strict-certification chains must be marked gold_standard"
        )
