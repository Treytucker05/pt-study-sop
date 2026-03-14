from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
HARNESS_SCRIPT = REPO_ROOT / "scripts" / "harness.ps1"
PWSH = shutil.which("pwsh") or shutil.which("powershell")


def _run_harness(
    script_path: Path,
    *args: str,
    env_overrides: dict[str, str | None] | None = None,
) -> subprocess.CompletedProcess[str]:
    assert PWSH, "PowerShell executable is required for harness tests"
    env = os.environ.copy()
    if env_overrides:
        for key, value in env_overrides.items():
            if value is None:
                env.pop(key, None)
            else:
                env[key] = value
    return subprocess.run(
        [
            PWSH,
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(script_path),
            *args,
        ],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )


def _load_json_output(result: subprocess.CompletedProcess[str]) -> dict[str, object]:
    stdout = result.stdout.strip()
    assert stdout, f"expected JSON stdout, got stderr={result.stderr!r}"
    return json.loads(stdout)


def _write_bootstrap_sandbox(
    tmp_path: Path,
    *,
    include_live_env: bool,
    include_fixture_manifest: bool,
) -> Path:
    repo_root = tmp_path / "repo"
    scripts_dir = repo_root / "scripts"
    brain_dir = repo_root / "brain"
    dashboard_dir = repo_root / "dashboard_rebuild"
    fixture_dir = brain_dir / "tests" / "fixtures" / "harness"

    scripts_dir.mkdir(parents=True, exist_ok=True)
    brain_dir.mkdir(parents=True, exist_ok=True)
    dashboard_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy2(HARNESS_SCRIPT, scripts_dir / "harness.ps1")
    (repo_root / "AGENTS.md").write_text("sandbox\n", encoding="utf-8")
    (brain_dir / ".env.example").write_text("GEMINI_API_KEY=\n", encoding="utf-8")
    (dashboard_dir / ".env.example").write_text("DATABASE_URL=\n", encoding="utf-8")

    if include_live_env:
        (brain_dir / ".env").write_text("GEMINI_API_KEY=test\n", encoding="utf-8")

    if include_fixture_manifest:
        fixture_dir.mkdir(parents=True, exist_ok=True)
        (fixture_dir / "manifest.json").write_text(
            json.dumps({"version": 1, "profile": "Hermetic"}),
            encoding="utf-8",
        )

    return scripts_dir / "harness.ps1"


def test_harness_bootstrap_passes_for_repo_hermetic_profile() -> None:
    result = _run_harness(HARNESS_SCRIPT, "-Mode", "Bootstrap", "-Profile", "Hermetic", "-Json")

    payload = _load_json_output(result)
    assert result.returncode == 0
    assert payload["ok"] is True
    assert payload["code"] == "ok"
    assert payload["profile"] == "Hermetic"


def test_harness_bootstrap_fails_for_live_profile_without_env(tmp_path: Path) -> None:
    sandbox_script = _write_bootstrap_sandbox(
        tmp_path,
        include_live_env=False,
        include_fixture_manifest=True,
    )

    result = _run_harness(sandbox_script, "-Mode", "Bootstrap", "-Profile", "Live", "-Json")

    payload = _load_json_output(result)
    assert result.returncode == 23
    assert payload["ok"] is False
    assert payload["code"] == "bootstrap.missing_live_env"
    assert "brain/.env" in str(payload["message"])


def test_harness_bootstrap_fails_when_python_dependency_is_missing(tmp_path: Path) -> None:
    sandbox_script = _write_bootstrap_sandbox(
        tmp_path,
        include_live_env=True,
        include_fixture_manifest=True,
    )

    result = _run_harness(
        sandbox_script,
        "-Mode",
        "Bootstrap",
        "-Profile",
        "Hermetic",
        "-Json",
        env_overrides={"PATH": ""},
    )

    payload = _load_json_output(result)
    assert result.returncode == 21
    assert payload["ok"] is False
    assert payload["code"] == "bootstrap.missing_python"
    assert "Python was not found" in str(payload["message"])


def test_harness_bootstrap_fails_when_fixture_assets_are_missing(tmp_path: Path) -> None:
    sandbox_script = _write_bootstrap_sandbox(
        tmp_path,
        include_live_env=True,
        include_fixture_manifest=False,
    )

    result = _run_harness(sandbox_script, "-Mode", "Bootstrap", "-Profile", "Hermetic", "-Json")

    payload = _load_json_output(result)
    assert result.returncode == 25
    assert payload["ok"] is False
    assert payload["code"] == "bootstrap.missing_fixture_assets"
    assert "fixture assets" in str(payload["message"]).lower()
