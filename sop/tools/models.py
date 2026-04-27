"""Pydantic v2 models for SOP Method Library.

Used ONLY by sop/tools/ scripts — never imported at runtime by brain/ or scholar/.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Any, Optional, Union

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Category(str, Enum):
    plan = "plan"
    orient = "orient"
    prime = "prime"
    teach = "teach"
    explain = "explain"
    calibrate = "calibrate"
    encode = "encode"
    interrogate = "interrogate"
    reference = "reference"
    retrieve = "retrieve"
    overlearn = "overlearn"
    consolidate = "consolidate"


class EnergyLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Stage(str, Enum):
    first_exposure = "first_exposure"
    review = "review"
    exam_prep = "exam_prep"
    consolidation = "consolidation"
    session_opening = "session_opening"
    weekly_reset = "weekly_reset"
    any = "any"


class AssessmentMode(str, Enum):
    classification = "classification"
    mechanism = "mechanism"
    computation = "computation"
    definition = "definition"
    procedure = "procedure"
    spatial = "spatial"
    recognition = "recognition"
    synthesis = "synthesis"


class OperationalStage(str, Enum):
    PLAN = "PLAN"
    ORIENT = "ORIENT"
    PRIME = "PRIME"
    TEACH = "TEACH"
    EXPLAIN = "EXPLAIN"
    CALIBRATE = "CALIBRATE"
    ENCODE = "ENCODE"
    INTERROGATE = "INTERROGATE"
    REFERENCE = "REFERENCE"
    RETRIEVE = "RETRIEVE"
    OVERLEARN = "OVERLEARN"
    CONSOLIDATE = "CONSOLIDATE"


class Status(str, Enum):
    draft = "draft"
    active = "active"
    core = "core"
    optional = "optional"
    validated = "validated"
    deprecated = "deprecated"


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class Evidence(BaseModel):
    citation: str
    finding: str
    source: str = ""  # "seed_methods.py" or "15-method-library.md"
    ticket: Optional[str] = None  # link to ET-xxx when ticket exists


# ---------------------------------------------------------------------------
# Core models
# ---------------------------------------------------------------------------

class MethodBlock(BaseModel):
    id: str
    name: str
    category: Category
    description: str
    default_duration_min: int = 5
    energy_cost: EnergyLevel = EnergyLevel.medium
    best_stage: Optional[Stage] = None
    control_stage: OperationalStage
    # Legacy alias retained for backward compatibility in tooling.
    stage: Optional[OperationalStage] = None
    status: Status = Status.draft

    @field_validator("category", mode="before")
    @classmethod
    def coerce_category_case(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v

    @field_validator("control_stage", "stage", mode="before")
    @classmethod
    def coerce_stage_case(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.upper()
        return v
    alias_of: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    evidence: Optional[Evidence] = None
    evidence_raw: Optional[str] = None
    # Rich fields (optional — populated incrementally via evidence tickets)
    mechanisms: Optional[list[str]] = None
    # inputs/outputs accept either a plain string or a rich dict (YAML uses
    # description/required and name/description/format respectively).
    inputs: Optional[list[Union[str, dict[str, Any]]]] = None
    steps: Optional[list[dict]] = None
    outputs: Optional[list[Union[str, dict[str, Any]]]] = None
    stop_criteria: Optional[list[str]] = None
    failure_modes: Optional[list[dict]] = None
    logging_fields: Optional[list[str]] = None
    knobs: Optional[dict] = None

    @field_validator("id")
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        if not re.match(r"^M-[A-Z]{2,5}-\d{3}$", v):
            raise ValueError(f"Method ID must match M-XXX-NNN, got: {v}")
        return v


class Chain(BaseModel):
    id: str
    name: str
    description: str
    # Blocks may be flat method-id strings (legacy) or rich dicts with
    # method_id / id / method_ref keys (new rich-block shape).
    blocks: list[Union[str, dict[str, Any]]] = Field(default_factory=list)
    # allowed_modes/requires_reference_targets aren't required in the rich
    # chain shape (per-session loop chains don't gate on assessment mode).
    allowed_modes: Optional[list[AssessmentMode]] = None
    # Gates and failure_actions accept either plain strings (legacy named
    # gates) or rich dicts (new shape with id/description/threshold/etc).
    gates: list[Union[str, dict[str, Any]]] = Field(default_factory=list)
    failure_actions: Union[list[Union[str, dict[str, Any]]], dict[str, Any]] = Field(
        default_factory=list
    )
    requires_reference_targets: Optional[bool] = None
    context_tags: dict = Field(default_factory=dict)
    default_knobs: Optional[dict] = None
    knobs: Optional[dict] = None
    is_template: bool = False
    status: Status = Status.draft
    alias_of: Optional[str] = None
    branch_rules: Optional[list[dict]] = None
    entry_conditions: Optional[list[str]] = None
    exit_conditions: Optional[list[str]] = None
    required_artifacts: Optional[list[str]] = None
    required_logging_fields: Optional[list[str]] = None

    @field_validator("id")
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        # Accept legacy short codes (C-XX-001, C-XXX-ABC) and longer
        # multi-segment names like C-FINALS-PREP, C-STUDY-LOOP.
        if not re.match(r"^C-[A-Z]{2,8}(-[A-Z0-9]{2,8})+$", v):
            raise ValueError(
                f"Chain ID must match C-<segment>(-<segment>)+, got: {v}"
            )
        return v


class EvidenceTicket(BaseModel):
    id: str
    target_type: str  # METHOD | CHAIN | ENGINE
    target_id: str
    question: str
    keywords: Optional[dict] = None
    evidence_summary: Optional[str] = None
    operational_rules: Optional[str] = None
    proposed_patch: Optional[list[str]] = None
    validation_plan: Optional[dict] = None
    status: Status = Status.draft
    citations: Optional[list[str]] = None
    notes: Optional[str] = None
