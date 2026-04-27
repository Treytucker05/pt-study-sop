"""Method card hardening guardrails.

These tests enforce the minimum contract for every method YAML card so future
edits cannot silently remove required fields or stage-boundary semantics.
"""

from __future__ import annotations

from pathlib import Path

import yaml


METHODS_DIR = Path(__file__).resolve().parents[2] / "sop" / "library" / "methods"
# 2026-04-21 vault hardening expanded the operational stage taxonomy:
#   PLAN          forethought / scope decisions before execution
#   ORIENT        quick orientation pass for terms / objectives / big picture
#   EXPLAIN       narrative or layered first-contact teaching
#   INTERROGATE   active questioning and self-testing (split out of ENCODE)
#   CONSOLIDATE   stabilize and link reference artifacts before retrieval
ALLOWED_STAGES = {
    "PLAN",
    "ORIENT",
    "PRIME",
    "TEACH",
    "EXPLAIN",
    "CALIBRATE",
    "ENCODE",
    "INTERROGATE",
    "REFERENCE",
    "RETRIEVE",
    "OVERLEARN",
    "CONSOLIDATE",
}
# Aspirational fields (stop_criteria, gating_rules, artifact_type) live on
# zero of the 62 YAMLs today; they surface inside knobs/success_criteria.
# Keep the contract honest about what actually exists.
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
    "facilitation_prompt",
    "failure_modes",
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
        # Legacy list-of-{rule, why}; newer mapping shape. Accept both.
        assert isinstance(card["constraints"], (dict, list)), f"{path.name}: constraints must be mapping or list"
        assert isinstance(card["inputs"], list), f"{path.name}: inputs must be a list"
        assert isinstance(card["steps"], list), f"{path.name}: steps must be a list"
        assert isinstance(card["outputs"], list), f"{path.name}: outputs must be a list"
        assert isinstance(card["failure_modes"], list), f"{path.name}: failure_modes must be a list"
        assert card["facilitation_prompt"], f"{path.name}: facilitation_prompt must not be empty"


def test_method_cards_stage_boundary_semantics() -> None:
    cards = _load_method_cards()
    for path, card in cards:
        stage = str(card["control_stage"]).upper()
        prompt = str(card["facilitation_prompt"])

        if stage == "PRIME":
            cons = card["constraints"]
            # Accept dict (new shape) or list of {rule, why} (legacy shape).
            # Vault-hardened wording uses several variants: "non-assessive",
            # "do not score/grade/quiz", "summative grade", "orientation
            # only", "avoid full solution reveal", etc. Accept any of them.
            non_assessment_kw = (
                "non_assessment", "non-assessment", "non-assessive",
                "non assessive", "do not assess", "do not score",
                "do not grade", "do not quiz", "do not teach",
                "do not correct", "no scored", "summative grade",
                "orientation level", "orientation only", "orientation-only",
                "avoid full solution",
            )
            if isinstance(cons, dict):
                non_assessment_set = bool(cons.get("non_assessment")) or any(
                    kw in str(value).lower()
                    for value in cons.values()
                    for kw in non_assessment_kw
                )
            else:
                non_assessment_set = any(
                    any(kw in str(item.get("rule", "")).lower() for kw in non_assessment_kw)
                    for item in cons
                    if isinstance(item, dict)
                )
            assert non_assessment_set, (
                f"{path.name}: PRIME must declare non-assessment in constraints"
            )
            assert _contains_any(
                prompt,
                {
                    "non-assessment", "non-assessive", "non assessive",
                    "non-summative", "non summative", "low-stakes",
                    "do not quiz", "do not score", "do not teach",
                    "do not correct", "do not reveal", "do not drift",
                    "no scored", "no scoring",
                    "orientation only", "orientation-only",
                    "priming-focused", "priming focused",
                },
            ), (
                f"{path.name}: PRIME prompt must explicitly enforce non-assessment behavior"
            )

        if stage == "CALIBRATE":
            assert _contains_any(prompt, {"confidence", "calibration", "mismatch", "miscalibration"}), (
                f"{path.name}: CALIBRATE prompt must reference confidence/calibration"
            )

        if stage in ("TEACH", "EXPLAIN"):
            assert _contains_any(
                prompt,
                {
                    "teach", "explain", "explanation", "plain interpretation",
                    "bridge", "application", "anchor", "story", "depth",
                    "ladder", "mechanism",
                },
            ), (
                f"{path.name}: {stage} prompt must enforce the teach chunk contract"
            )

        if stage == "ENCODE":
            assert _contains_any(prompt, {"active", "explain", "transform", "map", "encode", "elaborate"}), (
                f"{path.name}: ENCODE prompt must require active processing"
            )

        if stage == "INTERROGATE":
            assert _contains_any(
                prompt,
                {"interrogate", "question", "self-test", "probe", "challenge"},
            ), (
                f"{path.name}: INTERROGATE prompt must reference active questioning / self-testing"
            )

        if stage in ("REFERENCE", "CONSOLIDATE"):
            assert _contains_any(
                prompt,
                {"target", "artifact", "reference", "anchor", "consolidate", "stabilize"},
            ), (
                f"{path.name}: {stage} prompt must enforce artifact/target production"
            )

        if stage == "RETRIEVE":
            assert _contains_any(prompt, {"attempt", "closed-note", "recall", "retrieve"}), (
                f"{path.name}: RETRIEVE prompt must enforce attempt-first recall behavior"
            )

        if stage == "OVERLEARN":
            # Overlearning covers fluency drills (speed/streak/rounds) and
            # session-level closure brain dumps (closure/dump/comprehensive).
            assert _contains_any(
                prompt,
                {
                    "fluency", "speed", "streak", "round",
                    "closure", "dump", "comprehensive", "overlearn",
                },
            ), (
                f"{path.name}: OVERLEARN prompt must enforce fluency or session-closure behavior"
            )

        if stage == "PLAN":
            assert _contains_any(prompt, {"plan", "schedule", "scope", "horizon"}), (
                f"{path.name}: PLAN prompt must reference plan/scope/schedule"
            )

        if stage == "ORIENT":
            assert _contains_any(prompt, {"orient", "orientation", "preview", "scope"}), (
                f"{path.name}: ORIENT prompt must reference orientation/preview"
            )
