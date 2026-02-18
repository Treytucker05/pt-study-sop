# brain/selector.py

"""
Control Plane Modular Study System (CP-MSS v1.0)
Chain Selector - Deterministic Router

Takes the 7 Knobs as input and returns the exact Chain ID to run.
Implements the routing rules defined in sop/library/17-control-plane.md
"""


def select_chain(assessment_mode, time_available_min, energy, dominant_error=None):
    """
    Deterministic Router for CP-MSS v1.0.
    
    Inputs:
        - assessment_mode: str - Learning goal (procedure, classification, mechanism, etc.)
        - time_available_min: int - Time budget in minutes
        - energy: str - User energy level (low, medium, high)
        - dominant_error: str|None - Recent error pattern (Confusion, Speed, Rule, Procedure, Recall)
    
    Output:
        - tuple: (chain_id, knob_overrides)
    """
    
    # Defaults
    chain_id = "C-FE-STD"
    overrides = {}

    # --- RULE 1: The "Low Battery" Safety Net ---
    # If energy is low or time is short, strictly forbid heavy encoding chains.
    if energy == "low" or time_available_min < 25:
        return "C-FE-MIN", {"retrieval_support": "minimal", "timed": "off"}

    # --- RULE 2: Assessment Mode Routing ---
    # Map the learning goal to the best-fit chain
    if assessment_mode == "procedure":
        chain_id = "C-FE-PRO"
    elif assessment_mode in ["definition", "recognition"]:
        chain_id = "C-FE-MIN"
    elif assessment_mode in ["computation", "spatial"]:
        # If you had C-FE-COM or C-FE-SPA, you'd route here. 
        # For now, default to Standard with overrides.
        chain_id = "C-FE-STD"
        overrides["retrieval_support"] = "guided"  # Scaffolding for math/spatial
    else:
        # classification, mechanism, synthesis -> Standard Chain
        chain_id = "C-FE-STD"

    # --- RULE 3: Error Injection Overrides ---
    # Specific past failures trigger knob tweaks to repair that specific fault.
    if dominant_error == "Confusion":
        # Force "Contrast Matrix" intensity to high
        overrides["near_miss_intensity"] = "high"
    
    elif dominant_error == "Speed":
        # Force strict timing
        overrides["timed"] = "hard"
    
    elif dominant_error == "Rule":
        # Force adversarial lures
        overrides["near_miss_intensity"] = "high"
    
    elif dominant_error == "Procedure":
        # Force procedure chain regardless of original mode
        chain_id = "C-FE-PRO"

    return chain_id, overrides


# Convenience function for direct API integration
def select_chain_from_request(data: dict) -> tuple:
    """
    Convenience wrapper that extracts knobs from a request dict.
    
    Expected keys in data:
        - assessment_mode: str (default: 'mechanism')
        - time_available_min: int (default: 45)
        - energy: str (default: 'medium')
        - recent_errors: list (default: [])
    """
    mode = data.get('assessment_mode', 'mechanism')
    time_min = data.get('time_available_min', 45)
    energy = data.get('energy', 'medium')
    error_history = data.get('recent_errors', [])
    dominant_error = error_history[0] if error_history else None
    
    return select_chain(mode, time_min, energy, dominant_error)
