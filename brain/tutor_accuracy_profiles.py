"""
Tutor retrieval accuracy profile helpers.

These profiles tune retrieval depth for live tutor turns and eval runs.
"""

from __future__ import annotations

from typing import Any, Literal

TutorAccuracyProfile = Literal["balanced", "strict", "coverage"]

DEFAULT_ACCURACY_PROFILE: TutorAccuracyProfile = "balanced"

ACCURACY_PROFILE_CONFIG: dict[TutorAccuracyProfile, dict[str, Any]] = {
    "balanced": {
        "label": "Balanced",
        "description": "Default mix of precision and breadth for routine tutoring.",
        "material_k_bonus": 0,
        "material_k_min": 6,
        "material_k_max": 60,
        "instruction_k": 2,
    },
    "strict": {
        "label": "Strict",
        "description": "Higher evidence threshold and denser retrieval before answering.",
        "material_k_bonus": 4,
        "material_k_min": 8,
        "material_k_max": 72,
        "instruction_k": 3,
    },
    "coverage": {
        "label": "Coverage",
        "description": "Maximize source breadth across selected files.",
        "material_k_bonus": 12,
        "material_k_min": 12,
        "material_k_max": 84,
        "instruction_k": 4,
    },
}


def normalize_accuracy_profile(value: Any) -> TutorAccuracyProfile:
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ACCURACY_PROFILE_CONFIG:
            return normalized  # type: ignore[return-value]
    return DEFAULT_ACCURACY_PROFILE


def accuracy_profile_config(profile: Any) -> dict[str, Any]:
    normalized = normalize_accuracy_profile(profile)
    return dict(ACCURACY_PROFILE_CONFIG[normalized])


def resolve_material_retrieval_k(
    material_ids: list[int] | None,
    profile: Any = DEFAULT_ACCURACY_PROFILE,
) -> int:
    """
    Resolve material retrieval depth from selected scope + profile tuning.

    Balanced keeps legacy behavior, while strict/coverage raise retrieval depth.
    """
    config = accuracy_profile_config(profile)
    base_k = 6 if not material_ids else min(max(6, len(material_ids)), 60)
    tuned_k = base_k + int(config["material_k_bonus"])
    tuned_k = max(int(config["material_k_min"]), tuned_k)
    tuned_k = min(int(config["material_k_max"]), tuned_k)
    return tuned_k


def resolve_instruction_retrieval_k(profile: Any = DEFAULT_ACCURACY_PROFILE) -> int:
    config = accuracy_profile_config(profile)
    return int(config["instruction_k"])
