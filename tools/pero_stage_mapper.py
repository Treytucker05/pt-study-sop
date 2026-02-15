from __future__ import annotations

REFERENCE_ARTIFACT_TYPES = {
    "concept-map",
    "mindmap",
    "decision-tree",
    "comparison-table",
    "flowchart",
    "illness-script",
    "outline",
}

REFERENCE_OUTPUT_MARKERS = (
    "mermaid",
    "concept map",
    "concept-map",
    "mind map",
    "mindmap",
    "decision tree",
    "flowchart",
    "comparison table",
    "illness script",
    "outline",
    "one-page anchor",
    "question bank",
    "coverage check",
)

OVERLEARN_OVERRIDES = {"M-OVR-002", "M-OVR-001"}
CALIBRATE_OVERRIDES = {"M-CAL-001", "M-CAL-002", "M-CAL-003"}
INTERROGATE_RETRIEVAL_OVERRIDES = {"M-INT-005", "M-INT-002"}

CATEGORY_TO_STAGE = {
    "prepare": "priming",
    "encode": "encoding",
    "retrieve": "retrieval",
    "refine": "retrieval",
    "overlearn": "overlearning",
    "reference": "reference",
}


def is_reference_artifact(artifact_type: str | None, outputs: list[str] | None) -> bool:
    if artifact_type and artifact_type in REFERENCE_ARTIFACT_TYPES:
        return True
    if not outputs:
        return False
    for output in outputs:
        normalized = output.lower()
        if any(marker in normalized for marker in REFERENCE_OUTPUT_MARKERS):
            return True
    return False


def get_display_stage(
    *,
    method_id: str | None,
    category: str,
    artifact_type: str | None,
    outputs: list[str] | None,
) -> str:
    if method_id and method_id in OVERLEARN_OVERRIDES:
        return "overlearning"

    if method_id and method_id in CALIBRATE_OVERRIDES:
        return "calibrate"

    derived_reference = is_reference_artifact(artifact_type, outputs)

    if category == "interrogate":
        if derived_reference:
            return "reference"
        if method_id and method_id in INTERROGATE_RETRIEVAL_OVERRIDES:
            return "retrieval"
        return "encoding"

    if category == "refine":
        return "retrieval"

    if derived_reference:
        return "reference"

    return CATEGORY_TO_STAGE.get(category, "encoding")
