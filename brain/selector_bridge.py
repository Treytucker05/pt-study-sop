"""
Selector Bridge for CP-MSS v1.0

This module bridges the new Control Plane selector (brain.selector)
with the existing tutor API (api_tutor.py).

It adapts the new selector's output to the format expected by the API.
"""

from typing import Optional
from brain.selector import select_chain


def run_selector(
    assessment_mode: str,
    stage: str = "first_exposure",
    energy: str = "medium",
    time_available: int = 40,
    class_type: Optional[str] = None,
    prior_exposure_band: str = "new",
    recent_errors: Optional[list] = None,
) -> dict:
    """
    Run the Control Plane selector and return results in the format
    expected by api_tutor.py.
    
    Args:
        assessment_mode: The type of assessment (procedure, classification, etc.)
        stage: The study stage (first_exposure, review, exam_prep, consolidation)
        energy: User energy level (low, medium, high)
        time_available: Time available in minutes
        class_type: Optional class type context
        prior_exposure_band: Exposure level (new, familiar, mastered)
        recent_errors: List of recent error types
    
    Returns:
        dict with keys:
            - chain_id: The selected chain ID
            - score_tuple: Selector scoring metadata
            - selector_policy_version: Version string
            - dependency_fix_applied: Boolean
            - knob_overrides: Dict of knob overrides
    """
    
    # Determine dominant error from recent errors
    dominant_error = None
    if recent_errors:
        dominant_error = recent_errors[0]
    
    # Call the core selector
    chain_id, knob_overrides = select_chain(
        assessment_mode=assessment_mode,
        time_available_min=time_available,
        energy=energy,
        dominant_error=dominant_error,
    )
    
    # Build score tuple for telemetry (matches legacy format)
    score_tuple = [
        chain_id,
        assessment_mode,
        energy,
        time_available,
        stage,
        prior_exposure_band,
    ]
    
    # Check if we applied the Dependency Law fix
    # (All v1.0 chains have REF before RET)
    dependency_fix_applied = True
    
    return {
        "chain_id": chain_id,
        "score_tuple": score_tuple,
        "selector_policy_version": "CP-MSS-v1.0",
        "dependency_fix_applied": dependency_fix_applied,
        "knob_overrides": knob_overrides,
    }
