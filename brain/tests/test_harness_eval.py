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


def _write_run_metadata(
    artifact_root: Path,
    *,
    host: str,
    port: int,
    db_path: Path,
    run_id: str,
) -> dict[str, object]:
    run_metadata = {
        "mode": "Run",
        "run_id": run_id,
        "profile": "Hermetic",
        "port": port,
        "repo_root": str(REPO_ROOT),
        "artifact_root": str(artifact_root),
        "db_path": str(db_path),
        "base_url": f"http://{host}:{port}",
        "dashboard_url": f"http://{host}:{port}/brain",
        "started_at": "2026-03-14T00:00:00Z",
    }
    (artifact_root / "run.json").write_text(
        json.dumps(run_metadata, indent=2),
        encoding="utf-8",
    )
    return run_metadata


def _bundle_shape(value: object) -> object:
    if isinstance(value, dict):
        return {key: _bundle_shape(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        if not value:
            return []
        return [_bundle_shape(value[0])]
    return type(value).__name__


def _read_jsonl(path: Path) -> list[dict[str, object]]:
    lines = [
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    return [json.loads(line) for line in lines]


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

    _write_run_metadata(
        artifact_root,
        host=host,
        port=port,
        db_path=db_path,
        run_id="harness-eval-smoke",
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


def test_harness_eval_runs_live_golden_path_from_registry(tmp_path: Path) -> None:
    db_path = tmp_path / "harness-live.db"
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

    _write_run_metadata(
        artifact_root,
        host=host,
        port=port,
        db_path=db_path,
        run_id="harness-live-golden-path",
    )

    try:
        eval_result = _run_harness(
            "-Mode",
            "Eval",
            "-Scenario",
            "app-live-golden-path",
            "-ArtifactRoot",
            str(artifact_root),
            "-Json",
        )

        assert eval_result.returncode == 0, (
            f"eval failed\nstdout:\n{eval_result.stdout}\nstderr:\n{eval_result.stderr}"
        )

        payload = json.loads(eval_result.stdout)
        assert payload["ok"] is True
        assert payload["scenario"] == "app-live-golden-path"
        assert payload["scenario_type"] == "live/operator"
        assert payload["exit_code"] == 0
        assert payload["summary"]["pass_count"] >= 1
        assert payload["summary"]["fail_count"] == 0

        result_path = artifact_root / "scenarios" / "app-live-golden-path" / "result.json"
        assert result_path.exists()
        result_payload = json.loads(result_path.read_text(encoding="utf-8"))
        assert result_payload["ok"] is True
        assert result_payload["scenario"] == "app-live-golden-path"
        assert result_payload["artifacts"]["stdout_log"] == "script.stdout.log"
        assert result_payload["artifacts"]["stderr_log"] == "script.stderr.log"
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


def test_harness_report_emits_redacted_bundle_for_multiple_scenarios(
    tmp_path: Path,
) -> None:
    db_path = tmp_path / "harness-report.db"
    artifact_root = tmp_path / "artifacts"
    artifact_root.mkdir(parents=True, exist_ok=True)
    port = _find_free_port()
    host = "127.0.0.1"
    run_id = "harness-report-multi"

    original_db_env = os.environ.get("PT_STUDY_DB")
    original_vault_context_env = os.environ.get("PT_HARNESS_DISABLE_VAULT_CONTEXT")
    original_secret_env = os.environ.get("GEMINI_API_KEY")
    original_config_db = config.DB_PATH
    original_db_setup_db = db_setup.DB_PATH

    os.environ["PT_STUDY_DB"] = str(db_path)
    os.environ["PT_HARNESS_DISABLE_VAULT_CONTEXT"] = "1"
    os.environ["GEMINI_API_KEY"] = "top-secret-harness-value"
    config.DB_PATH = str(db_path)
    db_setup.DB_PATH = str(db_path)
    db_setup.init_database()

    app = create_app()
    app.config["TESTING"] = True
    server = _ServerThread(app, host, port)
    server.start()
    _wait_for_server(host, port)
    _write_run_metadata(
        artifact_root,
        host=host,
        port=port,
        db_path=db_path,
        run_id=run_id,
    )

    try:
        for scenario_id in ("tutor-hermetic-smoke", "tutor-hermetic-coverage-scope"):
            eval_result = _run_harness(
                "-Mode",
                "Eval",
                "-Scenario",
                scenario_id,
                "-ArtifactRoot",
                str(artifact_root),
                "-Json",
            )
            assert eval_result.returncode == 0, (
                f"eval failed for {scenario_id}\nstdout:\n{eval_result.stdout}\nstderr:\n{eval_result.stderr}"
            )

        report_result = _run_harness(
            "-Mode",
            "Report",
            "-RunId",
            run_id,
            "-ArtifactRoot",
            str(artifact_root),
            "-Json",
        )
        assert report_result.returncode == 0, (
            f"report failed\nstdout:\n{report_result.stdout}\nstderr:\n{report_result.stderr}"
        )

        payload = json.loads(report_result.stdout)
        assert payload["schema_version"] == 1
        assert payload["run_id"] == run_id
        assert payload["repo"]["git"]["sha"]
        assert payload["artifacts"]["bundle"] == "bundle.json"
        assert payload["artifacts"]["events"] == "events.jsonl"
        assert payload["environment"]["summary"]["GEMINI_API_KEY"]["present"] is True
        assert payload["environment"]["summary"]["GEMINI_API_KEY"]["value"] == "<redacted:secret>"
        assert "top-secret-harness-value" not in report_result.stdout

        scenario_ids = set(payload["scenarios"].keys())
        assert scenario_ids == {"tutor-hermetic-smoke", "tutor-hermetic-coverage-scope"}

        bundle_path = artifact_root / "bundle.json"
        assert bundle_path.exists()

        bundle_payload = json.loads(bundle_path.read_text(encoding="utf-8"))
        command_modes = [entry["mode"] for entry in bundle_payload["commands"]]
        assert command_modes.count("Eval") == 2
        assert command_modes[-1] == "Report"

        events_path = artifact_root / "events.jsonl"
        assert events_path.exists()
        events = _read_jsonl(events_path)
        assert any(event["event"] == "command_started" and event["mode"] == "Eval" for event in events)
        assert any(event["event"] == "command_completed" and event["mode"] == "Report" for event in events)
    finally:
        server.shutdown()
        server.join(timeout=5)
        config.DB_PATH = original_config_db
        db_setup.DB_PATH = original_db_setup_db
        if original_db_env is None:
            os.environ.pop("PT_STUDY_DB", None)
        else:
            os.environ["PT_STUDY_DB"] = original_db_env
        if original_vault_context_env is None:
            os.environ.pop("PT_HARNESS_DISABLE_VAULT_CONTEXT", None)
        else:
            os.environ["PT_HARNESS_DISABLE_VAULT_CONTEXT"] = original_vault_context_env
        if original_secret_env is None:
            os.environ.pop("GEMINI_API_KEY", None)
        else:
            os.environ["GEMINI_API_KEY"] = original_secret_env


def test_harness_eval_unknown_scenario_writes_failure_diagnostics(
    tmp_path: Path,
) -> None:
    artifact_root = tmp_path / "artifacts"
    artifact_root.mkdir(parents=True, exist_ok=True)
    os.environ["GEMINI_API_KEY"] = "failure-secret-value"

    try:
        eval_result = _run_harness(
            "-Mode",
            "Eval",
            "-Scenario",
            "missing-scenario",
            "-ArtifactRoot",
            str(artifact_root),
            "-Json",
        )
        assert eval_result.returncode != 0

        payload = json.loads(eval_result.stdout)
        assert payload["ok"] is False
        assert payload["code"] == "eval.unknown_scenario"
        assert "failure-secret-value" not in eval_result.stdout

        events_path = artifact_root / "events.jsonl"
        assert events_path.exists()
        events = _read_jsonl(events_path)
        failed_events = [event for event in events if event["event"] == "command_failed"]
        assert failed_events
        assert failed_events[-1]["mode"] == "Eval"
        assert failed_events[-1]["scenario_id"] == "missing-scenario"
        assert "failure-secret-value" not in json.dumps(failed_events)
    finally:
        os.environ.pop("GEMINI_API_KEY", None)


def test_harness_eval_failed_live_scenario_writes_failure_artifacts(
    tmp_path: Path,
) -> None:
    artifact_root = tmp_path / "artifacts"
    artifact_root.mkdir(parents=True, exist_ok=True)
    db_path = tmp_path / "failure-live.db"
    os.environ["GEMINI_API_KEY"] = "live-failure-secret"

    try:
        _write_run_metadata(
            artifact_root,
            host="127.0.0.1",
            port=_find_free_port(),
            db_path=db_path,
            run_id="harness-live-failure",
        )

        eval_result = _run_harness(
            "-Mode",
            "Eval",
            "-Scenario",
            "app-live-golden-path",
            "-ArtifactRoot",
            str(artifact_root),
            "-Json",
        )
        assert eval_result.returncode != 0

        payload = json.loads(eval_result.stdout)
        assert payload["ok"] is False
        assert payload["code"] == "eval.command_failed"
        assert payload["artifacts"]["events"].lstrip("/") == "events.jsonl"
        assert payload["artifacts"]["result"].lstrip("/") == "scenarios/app-live-golden-path/result.json"
        assert (
            payload["artifacts"]["stdout_log"].lstrip("/")
            == "scenarios/app-live-golden-path/script.stdout.log"
        )
        assert (
            payload["artifacts"]["stderr_log"].lstrip("/")
            == "scenarios/app-live-golden-path/script.stderr.log"
        )
        assert "live-failure-secret" not in eval_result.stdout

        result_path = artifact_root / "scenarios" / "app-live-golden-path" / "result.json"
        assert result_path.exists()
        result_payload = json.loads(result_path.read_text(encoding="utf-8"))
        assert result_payload["ok"] is False
        assert result_payload["summary"]["fail_count"] >= 1

        events_path = artifact_root / "events.jsonl"
        assert events_path.exists()
        events = _read_jsonl(events_path)
        failed_events = [event for event in events if event["event"] == "command_failed"]
        assert failed_events
        assert failed_events[-1]["details"]["failure_artifacts"]["result"].lstrip("/") == (
            "scenarios/app-live-golden-path/result.json"
        )
        assert failed_events[-1]["details"]["failure_summary"]["fail_count"] >= 1
        assert "live-failure-secret" not in json.dumps(failed_events)
    finally:
        os.environ.pop("GEMINI_API_KEY", None)


def test_harness_report_bundle_shape_is_stable_for_repeated_smoke_runs(
    tmp_path: Path,
) -> None:
    original_db_env = os.environ.get("PT_STUDY_DB")
    original_vault_context_env = os.environ.get("PT_HARNESS_DISABLE_VAULT_CONTEXT")
    original_secret_env = os.environ.get("GEMINI_API_KEY")
    original_config_db = config.DB_PATH
    original_db_setup_db = db_setup.DB_PATH
    secret_value = "stable-shape-secret"

    def _run_once(run_suffix: str) -> dict[str, object]:
        db_path = tmp_path / f"harness-shape-{run_suffix}.db"
        artifact_root = tmp_path / f"artifacts-{run_suffix}"
        artifact_root.mkdir(parents=True, exist_ok=True)
        port = _find_free_port()
        host = "127.0.0.1"
        run_id = f"harness-shape-{run_suffix}"

        os.environ["PT_STUDY_DB"] = str(db_path)
        os.environ["PT_HARNESS_DISABLE_VAULT_CONTEXT"] = "1"
        os.environ["GEMINI_API_KEY"] = secret_value
        config.DB_PATH = str(db_path)
        db_setup.DB_PATH = str(db_path)
        db_setup.init_database()

        app = create_app()
        app.config["TESTING"] = True
        server = _ServerThread(app, host, port)
        server.start()
        _wait_for_server(host, port)
        _write_run_metadata(
            artifact_root,
            host=host,
            port=port,
            db_path=db_path,
            run_id=run_id,
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
                f"eval failed for {run_suffix}\nstdout:\n{eval_result.stdout}\nstderr:\n{eval_result.stderr}"
            )

            report_result = _run_harness(
                "-Mode",
                "Report",
                "-RunId",
                run_id,
                "-ArtifactRoot",
                str(artifact_root),
                "-Json",
            )
            assert report_result.returncode == 0, (
                f"report failed for {run_suffix}\nstdout:\n{report_result.stdout}\nstderr:\n{report_result.stderr}"
            )
            assert secret_value not in report_result.stdout

            bundle_path = artifact_root / "bundle.json"
            bundle_text = bundle_path.read_text(encoding="utf-8")
            assert secret_value not in bundle_text

            bundle_payload = json.loads(bundle_text)
            assert bundle_payload["environment"]["summary"]["GEMINI_API_KEY"]["value"] == "<redacted:secret>"
            return bundle_payload
        finally:
            server.shutdown()
            server.join(timeout=5)

    try:
        first_bundle = _run_once("one")
        second_bundle = _run_once("two")
        assert _bundle_shape(first_bundle) == _bundle_shape(second_bundle)
    finally:
        config.DB_PATH = original_config_db
        db_setup.DB_PATH = original_db_setup_db
        if original_db_env is None:
            os.environ.pop("PT_STUDY_DB", None)
        else:
            os.environ["PT_STUDY_DB"] = original_db_env
        if original_vault_context_env is None:
            os.environ.pop("PT_HARNESS_DISABLE_VAULT_CONTEXT", None)
        else:
            os.environ["PT_HARNESS_DISABLE_VAULT_CONTEXT"] = original_vault_context_env
        if original_secret_env is None:
            os.environ.pop("GEMINI_API_KEY", None)
        else:
            os.environ["GEMINI_API_KEY"] = original_secret_env
