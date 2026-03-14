import importlib
import json
from pathlib import Path

import pytest

import config
import dashboard_web


def test_config_prefers_harness_env_over_repo_state(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    data_dir = tmp_path / "isolated-data"
    session_logs_dir = tmp_path / "isolated-session-logs"
    output_dir = tmp_path / "isolated-output"
    db_path = data_dir / "isolated.db"
    api_config_path = tmp_path / "isolated-config" / "api_config.json"
    env_study_rag_dir = tmp_path / "env-study-rag"

    api_config_path.parent.mkdir(parents=True, exist_ok=True)
    api_config_path.write_text(
        json.dumps({"study_rag_path": str(tmp_path / "api-config-rag")}),
        encoding="utf-8",
    )

    with monkeypatch.context() as context:
        context.setenv("PT_BRAIN_DOTENV_OVERRIDE", "0")
        context.setenv("PT_BRAIN_PREFER_ENV_PATHS", "1")
        context.setenv("PT_BRAIN_DATA_DIR", str(data_dir))
        context.setenv("PT_BRAIN_SESSION_LOGS_DIR", str(session_logs_dir))
        context.setenv("PT_BRAIN_OUTPUT_DIR", str(output_dir))
        context.setenv("PT_BRAIN_DB_PATH", str(db_path))
        context.setenv("PT_BRAIN_API_CONFIG_PATH", str(api_config_path))
        context.setenv("PT_STUDY_RAG_DIR", str(env_study_rag_dir))

        reloaded = importlib.reload(config)

        assert Path(reloaded.DATA_DIR) == data_dir.resolve()
        assert Path(reloaded.SESSION_LOGS_DIR) == session_logs_dir.resolve()
        assert Path(reloaded.OUTPUT_DIR) == output_dir.resolve()
        assert Path(reloaded.DB_PATH) == db_path.resolve()
        assert Path(reloaded.API_CONFIG_PATH) == api_config_path.resolve()
        assert Path(reloaded.STUDY_RAG_DIR) == env_study_rag_dir.resolve()

    importlib.reload(config)


def test_dashboard_web_defaults_to_harness_host_and_port(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with monkeypatch.context() as context:
        context.setenv("PT_BRAIN_HOST", "127.0.0.2")
        context.setenv("PT_BRAIN_PORT", "5015")

        args = dashboard_web._parse_args([])

        assert args.host == "127.0.0.2"
        assert args.port == 5015


def test_dashboard_web_cli_overrides_harness_env_defaults(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with monkeypatch.context() as context:
        context.setenv("PT_BRAIN_HOST", "127.0.0.2")
        context.setenv("PT_BRAIN_PORT", "5015")

        args = dashboard_web._parse_args(["--host", "127.0.0.1", "--port", "6001"])

        assert args.host == "127.0.0.1"
        assert args.port == 6001
