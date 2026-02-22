from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_sync_module():
    path = Path(__file__).resolve().parents[2] / "scripts" / "sync_tutor_category_docs.py"
    spec = importlib.util.spec_from_file_location("sync_tutor_category_docs", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_sync_tutor_category_docs_writes_expected_files(tmp_path: Path):
    mod = _load_sync_module()
    methods_dir = Path(__file__).resolve().parents[2] / "sop" / "library" / "methods"
    result = mod.sync_category_docs(methods_dir=methods_dir, output_dir=tmp_path)

    assert (tmp_path / "Prime.md").exists()
    assert (tmp_path / "Calibrate.md").exists()
    assert (tmp_path / "Encode.md").exists()
    assert (tmp_path / "Reference.md").exists()
    assert (tmp_path / "Retrieve.md").exists()
    assert (tmp_path / "Overlearn.md").exists()
    assert (tmp_path / "Categories.md").exists()

    prime = (tmp_path / "Prime.md").read_text(encoding="utf-8")
    assert "# PRIME" in prime
    assert "## Method Inventory" in prime
    assert "### Tutor Facilitation Prompt" in prime

    assert isinstance(result, dict)
    assert result.get("PRIME", 0) > 0
    assert result.get("CALIBRATE", 0) > 0
    assert result.get("ENCODE", 0) > 0
