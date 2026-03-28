from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
HOOK_INSTALL_SCRIPT = REPO_ROOT / "scripts" / "install_agent_guard_hooks.ps1"
MANAGED_MARKER = "# managed-by: install_agent_guard_hooks.ps1"
FAST_LANE = "pytest brain/tests/test_harness_bootstrap.py brain/tests/test_harness_startup.py -q"
FAST_LANE_RETRY = "pytest brain/tests/test_harness_bootstrap.py brain/tests/test_harness_startup.py -q -s"
FULL_SUITE_LANE = "pytest brain/tests -q"


def _powershell_bin() -> str | None:
    return shutil.which("pwsh") or shutil.which("pwsh.exe") or shutil.which("powershell") or shutil.which("powershell.exe")


PWSH = _powershell_bin()


def _run_powershell(repo_root: Path, script_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    assert PWSH, "PowerShell executable is required for managed hook tests"
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
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    )


@pytest.mark.skipif(PWSH is None, reason="PowerShell executable is required for managed hook tests")
def test_install_writes_fast_pre_push_backend_lane(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    scripts_dir = repo_root / "scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)
    script_copy = scripts_dir / "install_agent_guard_hooks.ps1"
    shutil.copy2(HOOK_INSTALL_SCRIPT, script_copy)

    subprocess.run(
        ["git", "init"],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    )

    _run_powershell(repo_root, script_copy, "-Action", "install")

    pre_push_path = repo_root / ".git" / "hooks" / "pre-push"
    assert pre_push_path.exists()

    pre_push_body = pre_push_path.read_text(encoding="utf-8")
    assert MANAGED_MARKER in pre_push_body
    assert FAST_LANE in pre_push_body
    assert FAST_LANE_RETRY in pre_push_body
    assert FULL_SUITE_LANE not in pre_push_body

