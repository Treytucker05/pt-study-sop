"""Adaptive mastery system schemas and validators.

Phase 0 contracts — frozen data shapes that downstream phases depend on.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional


# ---------------------------------------------------------------------------
# Shared validation result
# ---------------------------------------------------------------------------

@dataclass
class ValidationResult:
    valid: bool
    errors: list[str] = field(default_factory=list)

    def summary(self) -> str:
        if self.valid:
            return "OK"
        return "; ".join(self.errors)


# slug pattern: lowercase letters, digits, underscores — no spaces, no dashes
_SLUG_RE = re.compile(r"^[a-z][a-z0-9_]*$")


# ---------------------------------------------------------------------------
# Task 0.1 — Skill (unit of mastery)
# ---------------------------------------------------------------------------

@dataclass
class Skill:
    """Atomic unit of mastery. skill_id matches the concept-map node id."""

    skill_id: str
    name: str
    description: str = ""
    prereqs: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    system: Optional[str] = None
    epitome_id: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


def validate_skill(skill: Skill) -> ValidationResult:
    """Validate a Skill instance. Returns ValidationResult with errors if invalid."""
    errors: list[str] = []

    if not skill.skill_id:
        errors.append("skill_id is required and cannot be empty")
    elif not _SLUG_RE.match(skill.skill_id):
        errors.append(
            f"skill_id must be snake_case (lowercase, digits, underscores): "
            f"got '{skill.skill_id}'"
        )

    if not skill.name or not skill.name.strip():
        errors.append("name is required and cannot be empty")

    return ValidationResult(valid=len(errors) == 0, errors=errors)


def skill_from_dict(d: dict) -> Skill:
    """Reconstruct a Skill from a plain dict. Raises on missing skill_id."""
    if "skill_id" not in d or not d["skill_id"]:
        raise ValueError("skill_id is required")
    return Skill(
        skill_id=d["skill_id"],
        name=d.get("name", ""),
        description=d.get("description", ""),
        prereqs=d.get("prereqs", []),
        tags=d.get("tags", []),
        system=d.get("system"),
        epitome_id=d.get("epitome_id"),
    )


# ---------------------------------------------------------------------------
# Task 0.2 — Typed relation vocabulary
# ---------------------------------------------------------------------------

class EdgeType(Enum):
    """Frozen vocabulary of relation types between concept-map nodes."""

    REQUIRES = "requires"         # A requires B (prerequisite)
    PART_OF = "part_of"           # A is a sub-concept of B
    CAUSES = "causes"             # A physiologically causes B
    INHIBITS = "inhibits"         # A suppresses/blocks B
    INCREASES = "increases"       # A raises value/activity of B
    DECREASES = "decreases"       # A lowers value/activity of B
    COMPARES_TO = "compares_to"   # A and B are contrasted
    DEFINES = "defines"           # A gives the formal definition of B


# Direction rules: directed = source→target matters; undirected = symmetric
EDGE_DIRECTION: Dict[str, str] = {
    "requires": "directed",
    "part_of": "directed",
    "causes": "directed",
    "inhibits": "directed",
    "increases": "directed",
    "decreases": "directed",
    "compares_to": "undirected",
    "defines": "directed",
}


@dataclass
class Edge:
    """A typed, directed (or undirected) relation between two concept nodes."""

    source: str
    relation: str
    target: str
    confidence: float = 1.0
    provenance: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


def validate_edge(edge: Edge) -> ValidationResult:
    """Validate an Edge instance against the frozen vocabulary."""
    errors: list[str] = []
    valid_types = {e.value for e in EdgeType}

    if not edge.source:
        errors.append("source is required")
    if not edge.target:
        errors.append("target is required")
    if edge.relation not in valid_types:
        errors.append(
            f"relation must be one of {sorted(valid_types)}: got '{edge.relation}'"
        )

    return ValidationResult(valid=len(errors) == 0, errors=errors)


# ---------------------------------------------------------------------------
# Task 0.3 — Epitome (Elaboration Theory artifact)
# ---------------------------------------------------------------------------

@dataclass
class Epitome:
    """Summary artifact for a topic cluster (Elaboration Theory).

    Links to 3-7 core concept-map nodes and provides mechanism,
    simplest case, boundaries, and example.
    """

    epitome_id: str
    topic: str
    mechanism: str
    simplest_case: str
    boundaries: str
    example: str
    core_node_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def validate_epitome(ep: Epitome) -> ValidationResult:
    """Validate an Epitome artifact."""
    errors: list[str] = []

    if not ep.mechanism or not ep.mechanism.strip():
        errors.append("mechanism is required and cannot be empty")
    if not ep.example or not ep.example.strip():
        errors.append("example is required and cannot be empty")

    n = len(ep.core_node_ids)
    if n < 3 or n > 7:
        errors.append(
            f"core_node_ids must have 3-7 entries, got {n}"
        )

    return ValidationResult(valid=len(errors) == 0, errors=errors)


# ---------------------------------------------------------------------------
# Task 0.4 — Advance Organizer
# ---------------------------------------------------------------------------

@dataclass
class AdvanceOrganizer:
    """Big-picture map skeleton for a topic cluster.

    Anchors the learner with 5-10 key concepts and a minimal edge list
    showing "what changes what".
    """

    organizer_id: str
    topic: str
    anchor_concepts: List[str] = field(default_factory=list)
    edges: List[tuple] = field(default_factory=list)
    what_changes_what: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


def validate_advance_organizer(ao: AdvanceOrganizer) -> ValidationResult:
    """Validate an AdvanceOrganizer artifact."""
    errors: list[str] = []

    if len(ao.anchor_concepts) < 5:
        errors.append(
            f"anchor_concepts must have at least 5 entries, got {len(ao.anchor_concepts)}"
        )
    if len(ao.edges) < 1:
        errors.append("edges must have at least 1 edge")

    return ValidationResult(valid=len(errors) == 0, errors=errors)


# ---------------------------------------------------------------------------
# Task 0.5 — Pedagogical move library
# ---------------------------------------------------------------------------

class MoveType(Enum):
    """Allowable tutor moves during a learning session."""

    HINT = "hint"
    ANALOGY = "analogy"
    METACOGNITIVE_PROMPT = "metacognitive_prompt"
    EVALUATE_WORK = "evaluate_work"
    TEACH_BACK = "teach_back"
    SYNTHESIS = "synthesis"


# Which moves are allowed in each PERO phase
PHASE_ALLOWED_MOVES: Dict[str, set[str]] = {
    "prime": {"hint", "analogy"},
    "encode": {"hint", "analogy", "metacognitive_prompt", "evaluate_work"},
    "retrieve": {"hint", "metacognitive_prompt", "evaluate_work", "teach_back", "synthesis"},
    "overlearn": {"metacognitive_prompt", "evaluate_work", "teach_back", "synthesis"},
}


def validate_move(phase: str, move: str) -> ValidationResult:
    """Check whether a move is allowed in the given learning phase."""
    errors: list[str] = []

    if phase not in PHASE_ALLOWED_MOVES:
        errors.append(f"Unknown phase: '{phase}'")
        return ValidationResult(valid=False, errors=errors)

    allowed = PHASE_ALLOWED_MOVES[phase]
    if move not in allowed:
        errors.append(
            f"Move '{move}' is not allowed in phase '{phase}'. "
            f"Allowed: {sorted(allowed)}"
        )

    return ValidationResult(valid=len(errors) == 0, errors=errors)


# ---------------------------------------------------------------------------
# Task 0.6 — Mastery thresholds policy
# ---------------------------------------------------------------------------

@dataclass
class MasteryConfig:
    """Configurable mastery thresholds for unlock and mastered decisions."""

    unlock_threshold: float = 0.95
    mastered_threshold: float = 0.98
    prior_mastery: float = 0.1
    p_learn: float = 0.2
    p_guess: float = 0.25
    p_slip: float = 0.1
    decay_lambda: float = 0.05


def default_mastery_config() -> MasteryConfig:
    """Return default mastery configuration."""
    return MasteryConfig()


def is_unlocked(effective_mastery: float, config: MasteryConfig) -> bool:
    """Check if a skill is unlocked (available for downstream)."""
    return effective_mastery >= config.unlock_threshold


def validate_mastery_config(cfg: MasteryConfig) -> ValidationResult:
    """Validate mastery config values are in valid ranges."""
    errors: list[str] = []

    for name, val in [
        ("unlock_threshold", cfg.unlock_threshold),
        ("mastered_threshold", cfg.mastered_threshold),
        ("prior_mastery", cfg.prior_mastery),
        ("p_learn", cfg.p_learn),
        ("p_guess", cfg.p_guess),
        ("p_slip", cfg.p_slip),
    ]:
        if not (0.0 <= val <= 1.0):
            errors.append(f"{name} must be in [0, 1], got {val}")

    if cfg.decay_lambda < 0:
        errors.append(f"decay_lambda must be >= 0, got {cfg.decay_lambda}")

    return ValidationResult(valid=len(errors) == 0, errors=errors)
