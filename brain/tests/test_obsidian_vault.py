"""Tests for ObsidianVault CLI wrapper."""
from unittest.mock import patch, MagicMock
import subprocess
import json


def test_run_calls_subprocess_with_correct_args():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout="output", stderr=""
        )
        result = vault._run(["search", 'query="test"'])
        args = mock_run.call_args[0][0]
        assert args[0] == "obsidian"
        assert 'vault="Test Vault"' in args
        assert "search" in args


def test_run_returns_empty_string_on_nonzero_exit():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=1, stdout="", stderr="error"
        )
        result = vault._run(["read", 'file="Missing"'])
        assert result == ""


def test_run_returns_empty_string_on_timeout():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="obsidian", timeout=10)
        result = vault._run(["search", 'query="test"'])
        assert result == ""


def test_run_json_parses_when_requested():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    payload = [{"path": "note.md", "name": "note"}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(payload), stderr=""
        )
        result = vault._run(["files"], parse_json=True)
        assert result == payload


def test_eval_wraps_code_in_obsidian_eval():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout="42", stderr=""
        )
        result = vault._eval("app.vault.getFiles().length")
        args = mock_run.call_args[0][0]
        assert "eval" in args
        assert any("app.vault.getFiles().length" in str(a) for a in args)


def test_is_available_returns_true_on_success():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="1.12.4", stderr="")
        assert vault.is_available() is True


def test_is_available_returns_false_on_failure():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.side_effect = FileNotFoundError("obsidian not found")
        assert vault.is_available() is False


def test_create_note_calls_cli_with_correct_args():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.create_note(name="Test Note", folder="Course/Module", template="Study Session")
        args = mock_run.call_args[0][0]
        assert "create" in args
        assert 'name="Test Note"' in args
        assert 'template="Study Session"' in args
        assert "silent" in args


def test_create_note_with_content():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.create_note(name="Test", content="# Hello")
        args = mock_run.call_args[0][0]
        assert any("# Hello" in str(a) for a in args)


def test_read_note_returns_content():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="# Note\nContent here", stderr="")
        result = vault.read_note("My Note")
        assert "Content here" in result


def test_read_note_returns_empty_on_missing():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="not found")
        result = vault.read_note("Missing")
        assert result == ""


def test_append_note_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.append_note("My Note", "New content")
        args = mock_run.call_args[0][0]
        assert "append" in args
        assert 'file="My Note"' in args


def test_prepend_note_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.prepend_note("My Note", "Top content")
        args = mock_run.call_args[0][0]
        assert "prepend" in args


def test_delete_note_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.delete_note("old/note.md")
        args = mock_run.call_args[0][0]
        assert "delete" in args
        assert 'path="old/note.md"' in args


def test_delete_note_permanent_flag():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.delete_note("old/note.md", permanent=True)
        args = mock_run.call_args[0][0]
        assert "permanent" in args
