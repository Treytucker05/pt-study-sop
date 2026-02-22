"""Method card hardening guardrails.

These tests enforce the minimum contract for every method YAML card so future
edits cannot silently remove required fields or stage-boundary semantics.
"""

from __future__ import annotations

from pathlib import Path

import yaml


METHODS_DIR = Path(__file__).resolve().parents[2] / "sop" / "library" / "methods"
ALLOWED_STAGES = {"PRIME", "CALIBRATE", "ENCODE", "REFERENCE", "RETRIEVE", "OVERLEARN"}
REQUIRED_FIELDS = {
    "id",
    "name",
    "description",
    "control_stage",
    "knobs",
    "constraints",
    "inputs",
    "steps",
    "outputs",
    "stop_criteria",
    "facilitation_prompt",
    "gating_rules",
    "failure_modes",
    "artifact_type",
}


def _load_method_cards() -> list[tuple[Path, dict]]:
    cards: list[tuple[Path, dict]] = []
    for path in sorted(METHODS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert isinstance(data, dict), f"{path.name}: YAML root must be a mapping"
        cards.append((path, data))
    assert cards, "No method YAML files found"
    return cards


def _contains_any(text: str, needles: set[str]) -> bool:
    lowered = text.lower()
    return any(n in lowered for n in needles)


def test_method_cards_have_required_contract_fields() -> None:
    cards = _load_method_cards()
    for path, card in cards:
        missing = [field for field in sorted(REQUIRED_FIELDS) if field not in card]
        assert not missing, f"{path.name}: missing required fields: {', '.join(missing)}"

        stage = str(card.get("control_stage", "")).upper()
        assert stage in ALLOWED_STAGES, f"{path.name}: invalid control_stage '{stage}'"

        assert isinstance(card["knobs"], dict), f"{path.name}: knobs must be a mapping"
        assert isinstance(card["constraints"], dict), f"{path.name}: constraints must be a mapping"
        assert isinstance(card["inputs"], list), f"{path.name}: inputs must be a list"
        assert isinstance(card["steps"], list), f"{path.name}: steps must be a list"
        assert isinstance(card["outputs"], list), f"{path.name}: outputs must be a list"
        assert isinstance(card["gating_rules"], list), f"{path.name}: gating_rules must be a list"
        assert isinstance(card["failure_modes"], list), f"{path.name}: failure_modes must be a list"
        assert card["facilitation_prompt"], f"{path.name}: facilitation_prompt must not be empty"


def test_method_cards_stage_boundary_semantics() -> None:
    cards = _load_method_cards()
    for path, card in cards:
        stage = str(card["control_stage"]).upper()
        prompt = str(card["facilitation_prompt"])

        if stage == "PRIME":
            assert bool(card["constraints"].get("non_assessment")) is True, (
                f"{path.name}: PRIME must set constraints.non_assessment=true"
            )
            assert _contains_any(prompt, {"non-assessment", "do not quiz", "no scored", "no scoring"}), (
                f"{path.name}: PRIME prompt must explicitly enforce non-assessment behavior"
            )

        if stage == "CALIBRATE":
            assert _contains_any(prompt, {"confidence", "calibration", "mismatch", "miscalibration"}), (
                f"{path.name}: CALIBRATE prompt must reference confidence/calibration"
            )

        if stage == "ENCODE":
            assert _contains_any(prompt, {"active", "explain", "transform", "map"}), (
                f"{path.name}: ENCODE prompt must require active processing"
            )

        if stage == "REFERENCE":
            assert _contains_any(prompt, {"target", "artifact", "reference"}), (
                f"{path.name}: REFERENCE prompt must enforce artifact/target production"
            )

        if stage == "RETRIEVE":
            assert _contains_any(prompt, {"attempt", "closed-note", "recall"}), (
                f"{path.name}: RETRIEVE prompt must enforce attempt-first recall behavior"
            )

        if stage == "OVERLEARN":
            assert _contains_any(prompt, {"fluency", "speed", "streak", "round"}), (
                f"{path.name}: OVERLEARN prompt must enforce fluency/overlearning behavior"
            )
