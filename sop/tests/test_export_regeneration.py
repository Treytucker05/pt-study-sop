#!/usr/bin/env python3
"""Regression tests for canonical export generation and drift detection."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = ROOT / "scripts"
EXPORTS_DIR = ROOT / "exports"


def _load_module(path: Path):
    spec = importlib.util.spec_from_file_location(path.stem, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to import module from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[attr-defined]
    return module


def test_markdown_table_parser_round_trip(tmp_path: Path) -> None:
    drift = _load_module(SCRIPTS_DIR / "check_exports_drift.py")
    sample = (
        "| id | name |\n"
        "| --- | --- |\n"
        "| M-AAA-001 | Example |\n"
    )
    table = tmp_path / "sample.md"
    table.write_text(sample, encoding="utf-8")

    headers, rows = drift.parse_markdown_table(table)
    assert headers == ["id", "name"]
    assert rows == [{"id": "M-AAA-001", "name": "Example"}]


def test_exports_drift_check_passes() -> None:
    completed = subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / "check_exports_drift.py")],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr


def test_export_regeneration_is_deterministic() -> None:
    targets = [
        EXPORTS_DIR / "methods_inventory.csv",
        EXPORTS_DIR / "methods_inventory.md",
        EXPORTS_DIR / "chains_inventory.md",
        EXPORTS_DIR / "inventory_summary.json",
        EXPORTS_DIR / "research_packet.md",
    ]

    subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / "export_library_inventories.py")],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    first = {p: p.read_text(encoding="utf-8") for p in targets}

    subprocess.run(
        [sys.executable, str(SCRIPTS_DIR / "export_library_inventories.py")],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    second = {p: p.read_text(encoding="utf-8") for p in targets}

    assert first == second
