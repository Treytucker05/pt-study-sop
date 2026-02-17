#!/usr/bin/env python3
"""Validate the YAML method library for schema correctness and referential integrity.

Checks:
  1. YAML parse — every .yaml in methods/ and chains/ must parse
  2. Pydantic schema — required fields, correct types, enum values
  3. ID format — regex M-[A-Z]{3}-\\d{3} / C-[A-Z]{2,3}-\\d{3}
  4. ID uniqueness — no duplicates across all methods or chains
  5. Taxonomy enforcement — category, energy_cost, best_stage in taxonomy.yaml
  6. Referential integrity — every chain block ID exists in methods/
  7. Evidence presence — warning if null (error in --strict)
  8. Logging field alignment — if method.logging_fields set, check against session_log_template.yaml
  9. Operational stage enforcement — required control_stage and inferred stage in
     {PRIME, CALIBRATE, ENCODE, REFERENCE, RETRIEVE, OVERLEARN}
  10. Chain artifact dependency (validated/core chains) —
      no RETRIEVE method before a method that produces OnePageAnchor/QuestionBankSeed
  11. Knob registry enforcement — knob keys and values must match
      sop/library/meta/knob_registry.yaml
 12. Chain contract enforcement — required allowed_modes, gates,
      failure_actions, and requires_reference_targets
  13. ErrorLog schema enforcement — canonical telemetry columns in
      templates/ErrorLog.csv (with legacy 7-column compatibility warning)

Usage:
  python sop/tools/validate_library.py              # default, exit 0=pass, 1=errors
  python sop/tools/validate_library.py --strict      # warnings become errors
  python sop/tools/validate_library.py --json        # structured output
  python sop/tools/validate_library.py --json --strict

Exit: 0 = all checks pass (warnings allowed)
Exit: 1 = errors found (or warnings in --strict mode)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import yaml

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[2]
LIB_DIR = ROOT / "sop" / "library"
METHODS_DIR = LIB_DIR / "methods"
CHAINS_DIR = LIB_DIR / "chains"
META_DIR = LIB_DIR / "meta"
TEMPLATES_DIR = LIB_DIR / "templates"
KNOB_REGISTRY_PATH = META_DIR / "knob_registry.yaml"

ALLOWED_OPERATIONAL_STAGES = {
    "PRIME",
    "CALIBRATE",
    "ENCODE",
    "REFERENCE",
    "RETRIEVE",
    "OVERLEARN",
}

ALLOWED_ASSESSMENT_MODES = {
    "classification",
    "mechanism",
    "computation",
    "definition",
    "procedure",
    "spatial",
    "recognition",
    "synthesis",
}

METHOD_STAGE_PREFIX_MAP = {
    "M-PRE": "PRIME",
    "M-CAL": "CALIBRATE",
    "M-ENC": "ENCODE",
    "M-INT": "ENCODE",
    "M-REF": "REFERENCE",
    "M-RET": "RETRIEVE",
    "M-OVR": "OVERLEARN",
}

REFERENCE_ARTIFACT_TOKENS = {"onepageanchor", "questionbankseed"}

LEGACY_ERROR_LOG_COLUMNS = [
    "topic_id",
    "item_id",
    "error_type",
    "stage_detected",
    "confidence",
    "time_to_answer",
    "fix_applied",
]

CANONICAL_ERROR_LOG_COLUMNS = [
    *LEGACY_ERROR_LOG_COLUMNS,
    "assessment_mode",
    "chain_id",
    "support_level",
    "prior_exposure_band",
    "selector_policy_version",
    "dependency_fix_applied",
]


# ---------------------------------------------------------------------------
# Result accumulators
# ---------------------------------------------------------------------------

class ValidationResult:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    @property
    def ok(self) -> bool:
        return len(self.errors) == 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": "pass" if self.ok else "fail",
            "errors": self.errors,
            "warnings": self.warnings,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
        }


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def load_yaml_file(path: Path) -> tuple[dict | None, str | None]:
    """Load a YAML file. Returns (data, error_message)."""
    try:
        text = path.read_text(encoding="utf-8")
        data = yaml.safe_load(text)
        if not isinstance(data, dict):
            return None, f"{path.name}: YAML root is not a mapping"
        return data, None
    except yaml.YAMLError as e:
        return None, f"{path.name}: YAML parse error: {e}"
    except OSError as e:
        return None, f"{path.name}: read error: {e}"


def load_taxonomy() -> dict | None:
    """Load taxonomy.yaml. Returns None if missing/invalid."""
    path = META_DIR / "taxonomy.yaml"
    if not path.exists():
        return None
    data, _ = load_yaml_file(path)
    return data


def load_knob_registry() -> dict | None:
    """Load canonical knob registry. Returns None if missing/invalid."""
    if not KNOB_REGISTRY_PATH.exists():
        return None
    data, _ = load_yaml_file(KNOB_REGISTRY_PATH)
    return data


def load_session_log_fields() -> set[str]:
    """Load valid logging field names from session_log_template.yaml."""
    path = TEMPLATES_DIR / "session_log_template.yaml"
    if not path.exists():
        return set()
    data, _ = load_yaml_file(path)
    if not data or "session_fields" not in data:
        return set()
    return {f["name"] for f in data["session_fields"] if isinstance(f, dict) and "name" in f}


def load_csv_header(path: Path) -> list[str]:
    """Return first non-empty CSV header row as trimmed column names."""
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            return [col.strip() for col in stripped.split(",") if col.strip()]
    except OSError:
        return []
    return []


def infer_operational_stage(method_id: str) -> str | None:
    """Infer control-plane operational stage from method ID prefix."""
    for prefix, stage in METHOD_STAGE_PREFIX_MAP.items():
        if method_id.startswith(prefix):
            return stage
    return None


def normalize_artifact_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def method_produces_reference_artifact(method_data: dict[str, Any]) -> bool:
    """Return True if method outputs include OnePageAnchor or QuestionBankSeed."""
    outputs = method_data.get("outputs")
    if not isinstance(outputs, list):
        return False
    for item in outputs:
        token = normalize_artifact_name(str(item))
        for artifact in REFERENCE_ARTIFACT_TOKENS:
            if artifact in token:
                return True
    return False


def _validate_knob_registry_shape(result: ValidationResult, knob_registry: dict[str, Any] | None) -> None:
    if knob_registry is None:
        result.error("meta/knob_registry.yaml does not exist")
        return

    knobs = knob_registry.get("knobs")
    if not isinstance(knobs, dict) or not knobs:
        result.error("meta/knob_registry.yaml: missing or invalid 'knobs' map")
        return

    for knob_name, spec in knobs.items():
        if not isinstance(spec, dict):
            result.error(f"meta/knob_registry.yaml: knob '{knob_name}' spec must be a mapping")
            continue
        knob_type = spec.get("type")
        if knob_type not in {"enum", "integer", "number", "boolean", "string"}:
            result.error(
                f"meta/knob_registry.yaml: knob '{knob_name}' has unsupported type '{knob_type}'"
            )
            continue
        if knob_type == "enum":
            allowed_values = spec.get("allowed_values")
            if not isinstance(allowed_values, list) or not allowed_values:
                result.error(
                    f"meta/knob_registry.yaml: enum knob '{knob_name}' must define non-empty allowed_values"
                )


def _validate_knob_value(
    source_name: str,
    knob_name: str,
    value: Any,
    spec: dict[str, Any],
    result: ValidationResult,
) -> None:
    knob_type = spec.get("type")

    if knob_type == "enum":
        allowed = {str(v) for v in spec.get("allowed_values", [])}
        values = value if isinstance(value, list) else [value]
        for item in values:
            if str(item) not in allowed:
                result.error(
                    f"{source_name}: knob '{knob_name}' has invalid value '{item}' "
                    f"(allowed: {sorted(allowed)})"
                )
        return

    if knob_type == "integer":
        if isinstance(value, bool) or not isinstance(value, int):
            result.error(f"{source_name}: knob '{knob_name}' must be integer, got {type(value).__name__}")
            return
        min_v = spec.get("min")
        max_v = spec.get("max")
        if isinstance(min_v, int) and value < min_v:
            result.error(f"{source_name}: knob '{knob_name}'={value} is below min {min_v}")
        if isinstance(max_v, int) and value > max_v:
            result.error(f"{source_name}: knob '{knob_name}'={value} is above max {max_v}")
        return

    if knob_type == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            result.error(f"{source_name}: knob '{knob_name}' must be number, got {type(value).__name__}")
        return

    if knob_type == "boolean":
        if not isinstance(value, bool):
            result.error(f"{source_name}: knob '{knob_name}' must be boolean, got {type(value).__name__}")
        return

    if knob_type == "string":
        if not isinstance(value, str):
            result.error(f"{source_name}: knob '{knob_name}' must be string, got {type(value).__name__}")


def validate_knobs(
    source_name: str,
    knobs: dict[str, Any] | None,
    knob_registry: dict[str, Any] | None,
    result: ValidationResult,
) -> None:
    """Validate knob key/value pairs against canonical knob registry."""
    if not knobs:
        return
    if not isinstance(knobs, dict):
        result.error(f"{source_name}: knobs/context_tags must be a mapping")
        return

    registry_knobs = (
        knob_registry.get("knobs", {}) if isinstance(knob_registry, dict) else {}
    )
    for knob_name, value in knobs.items():
        spec = registry_knobs.get(knob_name)
        if spec is None:
            result.error(
                f"{source_name}: unknown knob '{knob_name}' (not present in meta/knob_registry.yaml)"
            )
            continue
        if not isinstance(spec, dict):
            result.error(f"{source_name}: knob '{knob_name}' registry spec is invalid")
            continue
        _validate_knob_value(source_name, knob_name, value, spec, result)


# ---------------------------------------------------------------------------
# Validation checks
# ---------------------------------------------------------------------------

def validate_methods(
    result: ValidationResult,
    strict: bool,
    knob_registry: dict[str, Any] | None,
) -> dict[str, dict[str, Any]]:
    """Validate all method YAML files.

    Returns:
        Map keyed by method_id with metadata used by downstream chain checks:
        {
          "raw": original yaml dict,
          "operational_stage": inferred/declared operational stage,
          "produces_reference_artifact": bool
        }
    """
    # Lazy import — Pydantic only in sop/tools/
    from models import MethodBlock

    taxonomy = load_taxonomy()
    log_fields = load_session_log_fields()

    valid_categories = set()
    category_aliases: dict[str, str] = {}
    if taxonomy and "categories" in taxonomy:
        for cat_key, cat_val in taxonomy["categories"].items():
            valid_categories.add(cat_key)
            for alias in cat_val.get("aliases", []):
                category_aliases[alias] = cat_key

    methods: dict[str, dict[str, Any]] = {}
    seen_ids: set[str] = set()
    seen_names: set[str] = set()
    aliases: list[tuple[str, str, str]] = []  # (file, method_id, alias_of)

    if not METHODS_DIR.exists():
        result.error("methods/ directory does not exist")
        return methods

    yaml_files = sorted(METHODS_DIR.glob("*.yaml"))
    if not yaml_files:
        result.error("methods/ directory contains no YAML files")
        return methods

    for path in yaml_files:
        data, err = load_yaml_file(path)
        if err:
            result.error(err)
            continue
        if data is None:
            result.error(f"{path.name}: empty YAML file")
            continue

        # Pydantic schema validation
        try:
            model = MethodBlock(**data)
        except Exception as e:
            result.error(f"{path.name}: schema error: {e}")
            continue

        mid = model.id

        # ID uniqueness
        if mid in seen_ids:
            result.error(f"{path.name}: duplicate method ID '{mid}'")
        seen_ids.add(mid)

        # Name uniqueness
        if model.name in seen_names:
            result.error(f"{path.name}: duplicate method name '{model.name}'")
        seen_names.add(model.name)

        # Taxonomy enforcement — category
        cat = model.category.value
        if valid_categories and cat not in valid_categories:
            if cat in category_aliases:
                result.warn(f"{path.name}: category '{cat}' is an alias for '{category_aliases[cat]}' — use canonical name")
            else:
                result.error(f"{path.name}: category '{cat}' not in taxonomy")

        # Evidence presence
        if model.evidence is None and model.evidence_raw is None:
            if strict:
                result.error(f"{path.name}: missing evidence (strict mode)")
            else:
                result.warn(f"{path.name}: missing evidence")

        # Alias metadata (for non-destructive de-duplication).
        alias_of = data.get("alias_of")
        if alias_of:
            aliases.append((path.name, mid, str(alias_of)))

        # Operational stage enforcement.
        inferred_stage = infer_operational_stage(mid)
        if inferred_stage is None:
            result.error(f"{path.name}: cannot infer operational stage from method ID '{mid}'")
            inferred_stage = ""

        declared_control_stage = data.get("control_stage")
        declared_stage = data.get("stage")

        if declared_control_stage is None:
            result.error(f"{path.name}: missing required field 'control_stage'")
        elif str(declared_control_stage) not in ALLOWED_OPERATIONAL_STAGES:
            result.error(
                f"{path.name}: control_stage '{declared_control_stage}' must be one of "
                f"{sorted(ALLOWED_OPERATIONAL_STAGES)}"
            )

        if inferred_stage and inferred_stage not in ALLOWED_OPERATIONAL_STAGES:
            result.error(
                f"{path.name}: inferred stage '{inferred_stage}' is not allowed "
                f"(allowed: {sorted(ALLOWED_OPERATIONAL_STAGES)})"
            )

        if (
            declared_control_stage is not None
            and inferred_stage
            and str(declared_control_stage) != inferred_stage
        ):
            result.error(
                f"{path.name}: control_stage '{declared_control_stage}' does not match "
                f"inferred stage '{inferred_stage}'"
            )

        if declared_stage is not None and declared_control_stage is not None:
            if str(declared_stage) != str(declared_control_stage):
                result.error(
                    f"{path.name}: legacy stage '{declared_stage}' does not match "
                    f"control_stage '{declared_control_stage}'"
                )

        # Logging field alignment
        if model.logging_fields and log_fields:
            for field in model.logging_fields:
                if field not in log_fields:
                    result.warn(f"{path.name}: logging_field '{field}' not in session_log_template.yaml")

        # Knob validation (optional fields on method schema).
        validate_knobs(path.name, data.get("knobs"), knob_registry, result)

        methods[mid] = {
            "raw": data,
            "operational_stage": str(declared_control_stage or declared_stage or inferred_stage),
            "produces_reference_artifact": method_produces_reference_artifact(data),
            "status": str(data.get("status", "draft")),
        }

    # Alias targets must resolve within methods set.
    method_ids = set(methods.keys())
    for file_name, method_id, alias_of in aliases:
        if alias_of == method_id:
            result.error(f"{file_name}: alias_of cannot reference itself ('{method_id}')")
        elif alias_of not in method_ids:
            result.error(f"{file_name}: alias_of references unknown method '{alias_of}'")

    return methods


def validate_chains(
    result: ValidationResult,
    methods: dict[str, dict[str, Any]],
    knob_registry: dict[str, Any] | None,
) -> dict[str, dict]:
    """Validate all chain YAML files. Returns {chain_id: data} map."""
    from models import Chain

    chains: dict[str, dict] = {}
    seen_ids: set[str] = set()
    seen_names: set[str] = set()
    aliases: list[tuple[str, str, str]] = []  # (file, chain_id, alias_of)
    method_ids = set(methods.keys())

    if not CHAINS_DIR.exists():
        result.error("chains/ directory does not exist")
        return chains

    yaml_files = sorted(CHAINS_DIR.glob("*.yaml"))
    if not yaml_files:
        result.error("chains/ directory contains no YAML files")
        return chains

    for path in yaml_files:
        data, err = load_yaml_file(path)
        if err:
            result.error(err)
            continue
        if data is None:
            result.error(f"{path.name}: empty YAML file")
            continue

        # Pydantic schema validation
        try:
            model = Chain(**data)
        except Exception as e:
            result.error(f"{path.name}: schema error: {e}")
            continue

        cid = model.id

        # ID uniqueness
        if cid in seen_ids:
            result.error(f"{path.name}: duplicate chain ID '{cid}'")
        seen_ids.add(cid)

        # Name uniqueness
        if model.name in seen_names:
            result.error(f"{path.name}: duplicate chain name '{model.name}'")
        seen_names.add(model.name)

        # Alias metadata.
        alias_of = data.get("alias_of")
        if alias_of:
            aliases.append((path.name, cid, str(alias_of)))

        # Required chain contract fields.
        allowed_modes = data.get("allowed_modes")
        if not isinstance(allowed_modes, list) or len(allowed_modes) == 0:
            result.error(f"{path.name}: allowed_modes must be a non-empty list")
        else:
            for mode in allowed_modes:
                if str(mode) not in ALLOWED_ASSESSMENT_MODES:
                    result.error(
                        f"{path.name}: allowed_modes contains invalid mode '{mode}' "
                        f"(allowed: {sorted(ALLOWED_ASSESSMENT_MODES)})"
                    )

        gates = data.get("gates")
        if not isinstance(gates, list) or len(gates) == 0:
            result.error(f"{path.name}: gates must be a non-empty list")

        failure_actions = data.get("failure_actions")
        if not isinstance(failure_actions, list) or len(failure_actions) == 0:
            result.error(f"{path.name}: failure_actions must be a non-empty list")

        requires_reference_targets = data.get("requires_reference_targets")
        if not isinstance(requires_reference_targets, bool):
            result.error(f"{path.name}: requires_reference_targets must be boolean")

        # Knob validation (context_tags/default_knobs/knobs).
        validate_knobs(path.name, data.get("context_tags"), knob_registry, result)
        validate_knobs(path.name, data.get("default_knobs"), knob_registry, result)
        validate_knobs(path.name, data.get("knobs"), knob_registry, result)

        # Referential integrity — every block ID must exist in methods
        for block_id in model.blocks:
            if block_id not in method_ids:
                result.error(f"{path.name}: references unknown method '{block_id}'")

        has_retrieve = False
        for block_id in model.blocks:
            m = methods.get(block_id)
            if not m:
                continue
            if m.get("operational_stage") == "RETRIEVE":
                has_retrieve = True
                break

        if has_retrieve and requires_reference_targets is False:
            result.error(
                f"{path.name}: contains RETRIEVE methods so requires_reference_targets must be true"
            )

        # Chain artifact dependency.
        # Rule: when requires_reference_targets=true, no RETRIEVE method may occur
        # before a method that produces OnePageAnchor/QuestionBankSeed artifacts.
        if requires_reference_targets is True:
            first_retrieve_idx: int | None = None
            first_reference_artifact_idx: int | None = None
            for idx, block_id in enumerate(model.blocks):
                m = methods.get(block_id)
                if not m:
                    continue
                if m.get("produces_reference_artifact") and first_reference_artifact_idx is None:
                    first_reference_artifact_idx = idx
                if m.get("operational_stage") == "RETRIEVE" and first_retrieve_idx is None:
                    first_retrieve_idx = idx

            if first_retrieve_idx is not None:
                if first_reference_artifact_idx is None:
                    result.error(
                        f"{path.name}: requires_reference_targets=true but chain contains RETRIEVE methods and no "
                        "QuestionBankSeed/OnePageAnchor producer"
                    )
                elif first_reference_artifact_idx > first_retrieve_idx:
                    result.error(
                        f"{path.name}: requires_reference_targets=true but RETRIEVE appears before "
                        "reference artifact producer "
                        "(QuestionBankSeed/OnePageAnchor)"
                    )

        chains[cid] = data

    chain_ids = set(chains.keys())
    for file_name, chain_id, alias_of in aliases:
        if alias_of == chain_id:
            result.error(f"{file_name}: alias_of cannot reference itself ('{chain_id}')")
        elif alias_of not in chain_ids:
            result.error(f"{file_name}: alias_of references unknown chain '{alias_of}'")

    return chains


def validate_meta(result: ValidationResult) -> None:
    """Validate meta files exist and are well-formed."""
    taxonomy_path = META_DIR / "taxonomy.yaml"
    version_path = META_DIR / "version.yaml"
    knob_registry = load_knob_registry()

    if not taxonomy_path.exists():
        result.error("meta/taxonomy.yaml does not exist")
    else:
        data, err = load_yaml_file(taxonomy_path)
        if err:
            result.error(err)
        elif data and "categories" not in data:
            result.error("meta/taxonomy.yaml: missing 'categories' key")

    if not version_path.exists():
        result.error("meta/version.yaml does not exist")
    else:
        data, err = load_yaml_file(version_path)
        if err:
            result.error(err)
        elif data and "version" not in data:
            result.error("meta/version.yaml: missing 'version' key")

    _validate_knob_registry_shape(result, knob_registry)
    validate_error_log_schema(result)


def validate_error_log_schema(result: ValidationResult) -> None:
    """Validate canonical Control-Plane ErrorLog.csv template header."""
    path = TEMPLATES_DIR / "ErrorLog.csv"
    if not path.exists():
        result.error("templates/ErrorLog.csv does not exist")
        return

    header = load_csv_header(path)
    if not header:
        result.error("templates/ErrorLog.csv: missing CSV header row")
        return

    duplicates = sorted({col for col in header if header.count(col) > 1})
    if duplicates:
        result.error(
            "templates/ErrorLog.csv: duplicate header columns: " + ", ".join(duplicates)
        )

    if header == LEGACY_ERROR_LOG_COLUMNS:
        result.warn(
            "templates/ErrorLog.csv: legacy 7-column schema detected; "
            "canonical schema adds assessment_mode, chain_id, support_level, "
            "prior_exposure_band, selector_policy_version, dependency_fix_applied"
        )
        return

    missing_required = [col for col in CANONICAL_ERROR_LOG_COLUMNS if col not in header]
    if missing_required:
        result.error(
            "templates/ErrorLog.csv: missing required canonical columns: "
            + ", ".join(missing_required)
        )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_validation(strict: bool = False) -> ValidationResult:
    """Run all validation checks and return result."""
    result = ValidationResult()

    # Meta files
    validate_meta(result)
    knob_registry = load_knob_registry()

    # Methods
    methods = validate_methods(result, strict=strict, knob_registry=knob_registry)

    # Chains (needs method IDs for referential integrity)
    validate_chains(result, methods, knob_registry=knob_registry)

    # In strict mode, promote warnings to errors
    if strict:
        result.errors.extend(result.warnings)
        result.warnings = []

    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate the YAML method library."
    )
    parser.add_argument(
        "--strict", action="store_true",
        help="Treat warnings as errors",
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output structured JSON",
    )
    args = parser.parse_args()

    # Add sop/tools/ to path so models.py can be imported
    sys.path.insert(0, str(Path(__file__).resolve().parent))

    result = run_validation(strict=args.strict)

    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        if result.warnings:
            for w in result.warnings:
                print(f"WARN: {w}")
        if result.errors:
            for e in result.errors:
                print(f"ERROR: {e}")
        if result.ok:
            print(f"OK — 0 errors, {len(result.warnings)} warnings")
            # Print summary
            method_count = len(list(METHODS_DIR.glob("*.yaml"))) if METHODS_DIR.exists() else 0
            chain_count = len(list(CHAINS_DIR.glob("*.yaml"))) if CHAINS_DIR.exists() else 0
            print(f"  {method_count} methods, {chain_count} chains validated")

    return 0 if result.ok else 1


if __name__ == "__main__":
    sys.exit(main())
