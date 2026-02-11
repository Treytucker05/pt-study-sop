import os
import subprocess

import llm_provider


def _fake_completed_process(*, stdout: str, stderr: str = "", returncode: int = 0):
    # Mimic subprocess.CompletedProcess shape used by llm_provider._codex_exec_json
    # stdout/stderr are bytes because we removed text=True and decode manually
    return subprocess.CompletedProcess(
        args=["codex"],
        returncode=returncode,
        stdout=stdout.encode("utf-8"),
        stderr=stderr.encode("utf-8"),
    )


def test_call_codex_json_parses_agent_message_and_usage(monkeypatch):
    codex_cmd = r"C:\Users\treyt\AppData\Roaming\npm\codex.cmd"
    work_dir = r"C:\tmp\codex_isolated_test"

    monkeypatch.setattr(llm_provider, "find_codex_cli", lambda: codex_cmd)
    monkeypatch.setattr(llm_provider.tempfile, "mkdtemp", lambda prefix="": work_dir)
    monkeypatch.setattr(llm_provider.shutil, "rmtree", lambda *_args, **_kwargs: None)

    captured = {}

    def fake_run(args, **kwargs):
        captured["args"] = args
        captured["kwargs"] = kwargs
        stdout = "\n".join(
            [
                '{"type":"thread.started","thread_id":"t"}',
                '{"type":"turn.started"}',
                '{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"..."} }',
                '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Hello world."}}',
                '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":2}}',
            ]
        )
        return _fake_completed_process(stdout=stdout)

    monkeypatch.setattr(llm_provider.subprocess, "run", fake_run)

    result = llm_provider.call_codex_json("sys", "user", timeout=5, isolated=True)

    assert result["success"] is True
    assert result["content"] == "Hello world."
    assert result["usage"] == {"input_tokens": 1, "output_tokens": 2}

    expected_prefix = (
        ["cmd.exe", "/c", codex_cmd]
        if os.name == "nt" and codex_cmd.lower().endswith((".cmd", ".bat"))
        else [codex_cmd]
    )
    assert captured["args"][: len(expected_prefix)] == expected_prefix
    assert "--sandbox" in captured["args"]
    assert "read-only" in captured["args"]
    assert "--json" in captured["args"]
    assert "--ephemeral" in captured["args"]
    assert "--cd" in captured["args"]
    assert work_dir in captured["args"]
    assert "--skip-git-repo-check" in captured["args"]

    # Prompt is passed via stdin file handle, not as string input kwarg
    assert "stdin" in captured["kwargs"]


def test_call_codex_json_returns_error_on_nonzero_returncode(monkeypatch):
    codex_cmd = r"C:\Users\treyt\AppData\Roaming\npm\codex.cmd"

    monkeypatch.setattr(llm_provider, "find_codex_cli", lambda: codex_cmd)
    monkeypatch.setattr(llm_provider.tempfile, "mkdtemp", lambda prefix="": r"C:\tmp\codex_isolated_test")
    monkeypatch.setattr(llm_provider.shutil, "rmtree", lambda *_args, **_kwargs: None)

    def fake_run(_args, **_kwargs):
        return _fake_completed_process(stdout="", stderr="boom", returncode=1)

    monkeypatch.setattr(llm_provider.subprocess, "run", fake_run)

    result = llm_provider.call_codex_json("sys", "user", timeout=5, isolated=True)
    assert result["success"] is False
    assert "boom" in (result.get("error") or "")


def test_call_codex_json_requires_agent_message(monkeypatch):
    codex_cmd = r"C:\Users\treyt\AppData\Roaming\npm\codex.cmd"

    monkeypatch.setattr(llm_provider, "find_codex_cli", lambda: codex_cmd)
    monkeypatch.setattr(llm_provider.tempfile, "mkdtemp", lambda prefix="": r"C:\tmp\codex_isolated_test")
    monkeypatch.setattr(llm_provider.shutil, "rmtree", lambda *_args, **_kwargs: None)

    def fake_run(_args, **_kwargs):
        stdout = "\n".join(
            [
                '{"type":"thread.started","thread_id":"t"}',
                '{"type":"turn.started"}',
                '{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"..."} }',
                '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":2}}',
            ]
        )
        return _fake_completed_process(stdout=stdout)

    monkeypatch.setattr(llm_provider.subprocess, "run", fake_run)

    result = llm_provider.call_codex_json("sys", "user", timeout=5, isolated=True)
    assert result["success"] is False
    assert "agent_message" in (result.get("error") or "")
