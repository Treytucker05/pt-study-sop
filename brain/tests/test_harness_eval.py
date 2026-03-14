from __future__ import annotations

import json
import os
import shutil
import socket
import sqlite3
import subprocess
import threading
import time
from pathlib import Path

from werkzeug.serving import make_server

import config
import db_setup
from dashboard.app import create_app


REPO_ROOT = Path(__file__).resolve().parents[2]
HARNESS_SCRIPT = REPO_ROOT / "scripts" / "harness.ps1"
PWSH = shutil.which("pwsh") or shutil.which("powershell")


class _ServerThread(threading.Thread):
    def __init__(self, app, host: str, port: int) -> None:
        super().__init__(daemon=True)
        self._server = make_server(host, port, app)

    def run(self) -> None:
        self._server.serve_forever()

    def shutdown(self) -> None:
        self._server.shutdown()


def _run_harness(*args: str) -> subprocess.CompletedProcess[str]:
    assert PWSH, "PowerShell executable is required for harness tests"
    return subprocess.run(
        [
            PWSH,
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(HARNESS_SCRIPT),
            *args,
        ],
        capture_output=True,
        text=True,
        check=False,
    )


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        sock.listen(1)
        return int(sock.getsockname()[1])


def _wait_for_server(host: str, port: int, timeout_seconds: float = 10.0) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            if sock.connect_ex((host, port)) == 0:
                return
        time.sleep(0.1)
    raise AssertionError(f"Server did not start on {host}:{port}")


def test_harness_eval_runs_tutor_hermetic_smoke(tmp_path: Path) -> None:
    db_path = tmp_path / "harness-eval.db"
    artifact_root = tmp_path / "artifacts"
    artifact_root.mkdir(parents=True, exist_ok=True)
    port = _find_free_port()
    host = "127.0.0.1"

    original_env = os.environ.get("PT_STUDY_DB")
    original_vault_context_env = os.environ.get("PT_HARNESS_DISABLE_VAULT_CONTEXT")
    original_config_db = config.DB_PATH
    original_db_setup_db = db_setup.DB_PATH

    os.environ["PT_STUDY_DB"] = str(db_path)
    os.environ["PT_HARNESS_DISABLE_VAULT_CONTEXT"] = "1"
    config.DB_PATH = str(db_path)
    db_setup.DB_PATH = str(db_path)
    db_setup.init_database()

    app = create_app()
    app.config["TESTING"] = True
    server = _ServerThread(app, host, port)
    server.start()
    _wait_for_server(host, port)

    run_metadata = {
        "mode": "Run",
        "profile": "Hermetic",
        "port": port,
        "repo_root": str(REPO_ROOT),
        "artifact_root": str(artifact_root),
        "db_path": str(db_path),
        "base_url": f"http://{host}:{port}",
        "dashboard_url": f"http://{host}:{port}/brain",
    }
    (artifact_root / "run.json").write_text(
        json.dumps(run_metadata, indent=2),
        encoding="utf-8",
    )

    try:
        eval_result = _run_harness(
            "-Mode",
            "Eval",
            "-Scenario",
            "tutor-hermetic-smoke",
            "-ArtifactRoot",
            str(artifact_root),
            "-Json",
        )

        assert eval_result.returncode == 0, (
            f"eval failed\nstdout:\n{eval_result.stdout}\nstderr:\n{eval_result.stderr}"
        )

        payload = json.loads(eval_result.stdout)
        assert payload["ok"] is True
        assert payload["scenario"] == "tutor-hermetic-smoke"

        result_path = (
            artifact_root / "scenarios" / "tutor-hermetic-smoke" / "result.json"
        )
        assert result_path.exists()

        result_payload = json.loads(result_path.read_text(encoding="utf-8"))
        assert result_payload["ok"] is True
        assert result_payload["scenario"] == "tutor-hermetic-smoke"
        assert result_payload["summary"]["turn_count"] == 2

        conn = sqlite3.connect(str(db_path))
        try:
            row = conn.execute("SELECT COUNT(*) FROM tutor_sessions").fetchone()
        finally:
            conn.close()

        assert row is not None
        assert int(row[0]) == 0
    finally:
        server.shutdown()
        server.join(timeout=5)
        config.DB_PATH = original_config_db
        db_setup.DB_PATH = original_db_setup_db
        if original_env is None:
            os.environ.pop("PT_STUDY_DB", None)
        else:
            os.environ["PT_STUDY_DB"] = original_env
        if original_vault_context_env is None:
            os.environ.pop("PT_HARNESS_DISABLE_VAULT_CONTEXT", None)
        else:
            os.environ["PT_HARNESS_DISABLE_VAULT_CONTEXT"] = original_vault_context_env
