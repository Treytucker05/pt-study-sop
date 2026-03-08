"""Runtime-contract guardrails for certified template chains."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data.seed_methods import load_from_yaml


def test_strict_certification_chains_keep_runtime_contract_shape() -> None:
    loaded = load_from_yaml()
    assert loaded is not None

    strict_chains = [
        chain
        for chain in loaded.get("chains", [])
        if chain.get("context_tags", {}).get("certification", {}).get("disposition")
        == "strict-certification"
    ]
    assert strict_chains, "Expected strict-certification chains in the template library"

    for chain in strict_chains:
        tags = chain.get("context_tags", {})
        runtime_profile = tags.get("runtime_profile")
        gates = tags.get("gates")
        failure_actions = tags.get("failure_actions")

        assert isinstance(runtime_profile, dict) and runtime_profile, (
            f"{chain['name']}: strict-certification chain must define runtime_profile"
        )
        assert isinstance(gates, list) and gates, (
            f"{chain['name']}: strict-certification chain must define non-empty gates"
        )
        assert isinstance(failure_actions, list) and failure_actions, (
            f"{chain['name']}: strict-certification chain must define recovery routes"
        )
        assert tags.get("requires_reference_targets") is True, (
            f"{chain['name']}: strict-certification chain must keep reference-target discipline"
        )
