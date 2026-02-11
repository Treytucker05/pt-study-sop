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


def load_session_log_fields() -> set[str]:
    """Load valid logging field names from session_log_template.yaml."""
    path = TEMPLATES_DIR / "session_log_template.yaml"
    if not path.exists():
        return set()
    data, _ = load_yaml_file(path)
    if not data or "session_fields" not in data:
        return set()
    return {f["name"] for f in data["session_fields"] if isinstance(f, dict) and "name" in f}


# ---------------------------------------------------------------------------
# Validation checks
# ---------------------------------------------------------------------------

def validate_methods(result: ValidationResult, strict: bool) -> dict[str, dict]:
    """Validate all method YAML files. Returns {method_id: data} map."""
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

    methods: dict[str, dict] = {}
    seen_ids: set[str] = set()
    seen_names: set[str] = set()

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

        # Logging field alignment
        if model.logging_fields and log_fields:
            for field in model.logging_fields:
                if field not in log_fields:
                    result.warn(f"{path.name}: logging_field '{field}' not in session_log_template.yaml")

        methods[mid] = data

    return methods


def validate_chains(result: ValidationResult, method_ids: set[str]) -> dict[str, dict]:
    """Validate all chain YAML files. Returns {chain_id: data} map."""
    from models import Chain

    chains: dict[str, dict] = {}
    seen_ids: set[str] = set()
    seen_names: set[str] = set()

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

        # Referential integrity — every block ID must exist in methods
        for block_id in model.blocks:
            if block_id not in method_ids:
                result.error(f"{path.name}: references unknown method '{block_id}'")

        chains[cid] = data

    return chains


def validate_meta(result: ValidationResult) -> None:
    """Validate meta files exist and are well-formed."""
    taxonomy_path = META_DIR / "taxonomy.yaml"
    version_path = META_DIR / "version.yaml"

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


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_validation(strict: bool = False) -> ValidationResult:
    """Run all validation checks and return result."""
    result = ValidationResult()

    # Meta files
    validate_meta(result)

    # Methods
    methods = validate_methods(result, strict=strict)

    # Chains (needs method IDs for referential integrity)
    method_ids = set(methods.keys())
    validate_chains(result, method_ids)

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
