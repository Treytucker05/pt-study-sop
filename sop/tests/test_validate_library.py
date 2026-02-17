#!/usr/bin/env python3
"""Tests for validate_library.py."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

# Ensure sop/tools/ is importable
TOOLS_DIR = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS_DIR))

import validate_library
from validate_library import (
    ValidationResult,
    infer_operational_stage,
    load_yaml_file,
    method_produces_reference_artifact,
    run_validation,
    validate_knobs,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def write_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.dump(data, sort_keys=False), encoding="utf-8")


VALID_METHOD = {
    "id": "M-TST-001",
    "name": "Test Method",
    "category": "prepare",
    "description": "A test method.",
    "default_duration_min": 5,
    "energy_cost": "low",
    "best_stage": "first_exposure",
    "status": "draft",
    "tags": ["test"],
    "evidence": {
        "citation": "Author (2024)",
        "finding": "Test finding",
        "source": "test",
    },
    "evidence_raw": "Author (2024); Test finding",
}

VALID_CHAIN = {
    "id": "C-TS-001",
    "name": "Test Chain",
    "description": "A test chain.",
    "blocks": ["M-TST-001"],
    "context_tags": {"stage": "first_exposure"},
    "is_template": True,
    "status": "draft",
}

VALID_TAXONOMY = {
    "categories": {
        "prepare": {
            "label": "Prepare",
            "prefix": "PRE",
            "aliases": ["prep"],
        },
        "retrieve": {
            "label": "Retrieve",
            "prefix": "RET",
            "aliases": ["recall"],
        },
    },
    "energy_levels": ["low", "medium", "high"],
    "stages": ["first_exposure", "review", "exam_prep", "consolidation"],
}

VALID_VERSION = {"version": "1.0.0", "last_updated": "2026-02-08"}
VALID_KNOB_REGISTRY = {
    "version": 1,
    "knobs": {
        "stage": {
            "type": "enum",
            "allowed_values": ["first_exposure", "review", "exam_prep", "consolidation"],
        },
        "energy": {
            "type": "enum",
            "allowed_values": ["low", "medium", "high"],
        },
        "time_available": {"type": "integer", "min": 5, "max": 180},
    },
}
VALID_SESSION_LOG_TEMPLATE = {
    "session_fields": [
        {"name": "date", "type": "string", "required": True},
    ]
}


def build_minimal_library(tmp_path: Path) -> Path:
    """Create a minimal valid library structure in tmp_path and return its root."""
    lib = tmp_path / "sop" / "library"
    write_yaml(lib / "methods" / "M-TST-001.yaml", VALID_METHOD)
    write_yaml(lib / "chains" / "C-TS-001.yaml", VALID_CHAIN)
    write_yaml(lib / "meta" / "taxonomy.yaml", VALID_TAXONOMY)
    write_yaml(lib / "meta" / "version.yaml", VALID_VERSION)
    write_yaml(lib / "meta" / "knob_registry.yaml", VALID_KNOB_REGISTRY)
    write_yaml(lib / "templates" / "session_log_template.yaml", VALID_SESSION_LOG_TEMPLATE)
    return lib


# ---------------------------------------------------------------------------
# Tests against the real library (integration)
# ---------------------------------------------------------------------------

class TestRealLibrary:
    """Run validation against the actual committed YAML library."""

    def test_real_library_passes(self) -> None:
        result = run_validation(strict=False)
        assert result.ok, f"Errors: {result.errors}"

    def test_real_library_method_count(self) -> None:
        methods_dir = Path(__file__).resolve().parents[1] / "library" / "methods"
        assert len(list(methods_dir.glob("*.yaml"))) == 46

    def test_real_library_chain_count(self) -> None:
        chains_dir = Path(__file__).resolve().parents[1] / "library" / "chains"
        assert len(list(chains_dir.glob("*.yaml"))) == 15


# ---------------------------------------------------------------------------
# Unit tests with fixtures
# ---------------------------------------------------------------------------

class TestLoadYaml:
    def test_valid_yaml(self, tmp_path: Path) -> None:
        p = tmp_path / "test.yaml"
        write_yaml(p, {"id": "test"})
        data, err = load_yaml_file(p)
        assert data is not None
        assert err is None
        assert data["id"] == "test"

    def test_invalid_yaml(self, tmp_path: Path) -> None:
        p = tmp_path / "bad.yaml"
        p.write_text("{{invalid", encoding="utf-8")
        data, err = load_yaml_file(p)
        assert data is None
        assert err is not None
        assert "parse error" in err

    def test_non_mapping_yaml(self, tmp_path: Path) -> None:
        p = tmp_path / "list.yaml"
        p.write_text("- item1\n- item2\n", encoding="utf-8")
        data, err = load_yaml_file(p)
        assert data is None
        assert "not a mapping" in err


class TestValidationResult:
    def test_empty_is_ok(self) -> None:
        r = ValidationResult()
        assert r.ok
        assert r.to_dict()["status"] == "pass"

    def test_error_makes_not_ok(self) -> None:
        r = ValidationResult()
        r.error("something broke")
        assert not r.ok
        assert r.to_dict()["status"] == "fail"

    def test_warning_still_ok(self) -> None:
        r = ValidationResult()
        r.warn("heads up")
        assert r.ok

    def test_to_dict_counts(self) -> None:
        r = ValidationResult()
        r.error("e1")
        r.error("e2")
        r.warn("w1")
        d = r.to_dict()
        assert d["error_count"] == 2
        assert d["warning_count"] == 1


class TestMethodValidation:
    """Test method-level validation via the Pydantic model."""

    def test_invalid_id_format(self) -> None:
        from models import MethodBlock
        with pytest.raises(Exception, match="Method ID must match"):
            MethodBlock(**{**VALID_METHOD, "id": "BAD-ID"})

    def test_invalid_category(self) -> None:
        from models import MethodBlock
        with pytest.raises(Exception):
            MethodBlock(**{**VALID_METHOD, "category": "nonexistent"})

    def test_invalid_energy_cost(self) -> None:
        from models import MethodBlock
        with pytest.raises(Exception):
            MethodBlock(**{**VALID_METHOD, "energy_cost": "extreme"})

    def test_invalid_stage(self) -> None:
        from models import MethodBlock
        with pytest.raises(Exception):
            MethodBlock(**{**VALID_METHOD, "best_stage": "midterm"})

    def test_valid_method_passes(self) -> None:
        from models import MethodBlock
        m = MethodBlock(**VALID_METHOD)
        assert m.id == "M-TST-001"
        assert m.name == "Test Method"


class TestChainValidation:
    """Test chain-level validation via the Pydantic model."""

    def test_invalid_chain_id(self) -> None:
        from models import Chain
        with pytest.raises(Exception, match="Chain ID must match"):
            Chain(**{**VALID_CHAIN, "id": "BAD"})

    def test_valid_chain_passes(self) -> None:
        from models import Chain
        c = Chain(**VALID_CHAIN)
        assert c.id == "C-TS-001"
        assert c.blocks == ["M-TST-001"]


class TestOperationalStageInference:
    def test_infer_operational_stage(self) -> None:
        assert infer_operational_stage("M-PRE-001") == "PRIME"
        assert infer_operational_stage("M-CAL-001") == "CALIBRATE"
        assert infer_operational_stage("M-ENC-001") == "ENCODE"
        assert infer_operational_stage("M-REF-001") == "REFERENCE"
        assert infer_operational_stage("M-RET-001") == "RETRIEVE"
        assert infer_operational_stage("M-OVR-001") == "OVERLEARN"

    def test_unknown_prefix_returns_none(self) -> None:
        assert infer_operational_stage("M-XYZ-001") is None


class TestReferenceArtifactDetection:
    def test_detects_reference_outputs(self) -> None:
        method = {"outputs": ["One-Page Anchor", "Question Bank Seed (10-20 items)"]}
        assert method_produces_reference_artifact(method)

    def test_non_reference_outputs(self) -> None:
        method = {"outputs": ["Brain dump notes", "Prior knowledge baseline"]}
        assert not method_produces_reference_artifact(method)


class TestKnobValidationHelpers:
    def test_knob_value_validation_passes(self) -> None:
        result = ValidationResult()
        validate_knobs(
            "test.yaml",
            {"stage": "review", "energy": "low", "time_available": 30},
            VALID_KNOB_REGISTRY,
            result,
        )
        assert result.ok, result.errors

    def test_knob_value_validation_fails(self) -> None:
        result = ValidationResult()
        validate_knobs(
            "test.yaml",
            {"stage": "invalid_stage", "energy": "extreme", "time_available": 1},
            VALID_KNOB_REGISTRY,
            result,
        )
        assert not result.ok
        assert any("invalid_stage" in e for e in result.errors)


class TestChainDependencyRule:
    def _write_common_meta(self, lib: Path) -> None:
        write_yaml(lib / "meta" / "taxonomy.yaml", VALID_TAXONOMY)
        write_yaml(lib / "meta" / "version.yaml", VALID_VERSION)
        write_yaml(lib / "meta" / "knob_registry.yaml", VALID_KNOB_REGISTRY)
        write_yaml(lib / "templates" / "session_log_template.yaml", VALID_SESSION_LOG_TEMPLATE)

    def _with_temp_library(self, monkeypatch: pytest.MonkeyPatch, lib: Path) -> None:
        monkeypatch.setattr(validate_library, "METHODS_DIR", lib / "methods")
        monkeypatch.setattr(validate_library, "CHAINS_DIR", lib / "chains")
        monkeypatch.setattr(validate_library, "META_DIR", lib / "meta")
        monkeypatch.setattr(validate_library, "TEMPLATES_DIR", lib / "templates")
        monkeypatch.setattr(validate_library, "KNOB_REGISTRY_PATH", lib / "meta" / "knob_registry.yaml")

    def test_validated_chain_requires_reference_artifacts_before_retrieve(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        lib = tmp_path / "sop" / "library"
        self._write_common_meta(lib)

        pre = {**VALID_METHOD, "id": "M-PRE-001", "name": "Pre", "category": "prepare"}
        ret = {**VALID_METHOD, "id": "M-RET-001", "name": "Ret", "category": "retrieve"}
        write_yaml(lib / "methods" / "M-PRE-001.yaml", pre)
        write_yaml(lib / "methods" / "M-RET-001.yaml", ret)
        write_yaml(
            lib / "chains" / "C-TS-001.yaml",
            {
                **VALID_CHAIN,
                "status": "validated",
                "blocks": ["M-PRE-001", "M-RET-001"],
                "context_tags": {"stage": "review", "energy": "low", "time_available": 20},
            },
        )

        self._with_temp_library(monkeypatch, lib)
        result = run_validation(strict=False)
        assert not result.ok
        assert any("no QuestionBankSeed/OnePageAnchor producer" in e for e in result.errors)

    def test_draft_chain_does_not_enforce_reference_dependency(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        lib = tmp_path / "sop" / "library"
        self._write_common_meta(lib)

        pre = {**VALID_METHOD, "id": "M-PRE-001", "name": "Pre", "category": "prepare"}
        ret = {**VALID_METHOD, "id": "M-RET-001", "name": "Ret", "category": "retrieve"}
        write_yaml(lib / "methods" / "M-PRE-001.yaml", pre)
        write_yaml(lib / "methods" / "M-RET-001.yaml", ret)
        write_yaml(
            lib / "chains" / "C-TS-001.yaml",
            {
                **VALID_CHAIN,
                "status": "draft",
                "blocks": ["M-PRE-001", "M-RET-001"],
                "context_tags": {"stage": "review", "energy": "low", "time_available": 20},
            },
        )

        self._with_temp_library(monkeypatch, lib)
        result = run_validation(strict=False)
        assert result.ok, result.errors
