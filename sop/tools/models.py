"""Pydantic v2 models for SOP Method Library.

Used ONLY by sop/tools/ scripts — never imported at runtime by brain/ or scholar/.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Category(str, Enum):
    prepare = "prepare"
    encode = "encode"
    interrogate = "interrogate"
    retrieve = "retrieve"
    refine = "refine"
    overlearn = "overlearn"


class EnergyLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Stage(str, Enum):
    first_exposure = "first_exposure"
    review = "review"
    exam_prep = "exam_prep"
    consolidation = "consolidation"


class OperationalStage(str, Enum):
    PRIME = "PRIME"
    CALIBRATE = "CALIBRATE"
    ENCODE = "ENCODE"
    REFERENCE = "REFERENCE"
    RETRIEVE = "RETRIEVE"
    OVERLEARN = "OVERLEARN"


class Status(str, Enum):
    draft = "draft"
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
    stage: Optional[OperationalStage] = None
    status: Status = Status.draft
    alias_of: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    evidence: Optional[Evidence] = None
    evidence_raw: Optional[str] = None
    # Rich fields (optional — populated incrementally via evidence tickets)
    mechanisms: Optional[list[str]] = None
    inputs: Optional[list[str]] = None
    steps: Optional[list[dict]] = None
    outputs: Optional[list[str]] = None
    stop_criteria: Optional[list[str]] = None
    failure_modes: Optional[list[dict]] = None
    logging_fields: Optional[list[str]] = None
    knobs: Optional[dict] = None

    @field_validator("id")
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        if not re.match(r"^M-[A-Z]{3}-\d{3}$", v):
            raise ValueError(f"Method ID must match M-XXX-NNN, got: {v}")
        return v


class Chain(BaseModel):
    id: str
    name: str
    description: str
    blocks: list[str] = Field(default_factory=list)  # list of MethodBlock.id refs
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
        if not re.match(r"^C-[A-Z]{2,3}-\d{3}$", v):
            raise ValueError(f"Chain ID must match C-XX(X)-NNN, got: {v}")
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
