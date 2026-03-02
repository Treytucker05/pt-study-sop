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


def test_search_returns_list():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    results = [{"path": "note.md", "score": 0.9}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(results), stderr=""
        )
        result = vault.search("test query", limit=5)
        assert result == results
        args = mock_run.call_args[0][0]
        assert "search" in args
        assert 'query="test query"' in args
        assert 'limit=5' in args


def test_search_returns_empty_on_error():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="error")
        result = vault.search("test")
        assert result == []


def test_list_files_returns_json():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    files = [{"path": "a.md"}, {"path": "b.md"}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(files), stderr=""
        )
        result = vault.list_files()
        assert len(result) == 2


def test_list_folders_returns_json():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    folders = [{"path": "Course A"}, {"path": "Course B"}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(folders), stderr=""
        )
        result = vault.list_folders()
        assert len(result) == 2


def test_get_backlinks_returns_json():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    links = [{"path": "other.md"}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(links), stderr=""
        )
        result = vault.get_backlinks("My Note")
        assert result == links
        args = mock_run.call_args[0][0]
        assert "backlinks" in args


def test_get_tags_returns_json():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    tags = [{"tag": "#study", "count": 5}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(tags), stderr=""
        )
        result = vault.get_tags()
        assert result == tags


def test_set_property_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.set_property("My Note", "status", "reviewed")
        args = mock_run.call_args[0][0]
        assert "property:set" in args
        assert 'name="status"' in args
        assert 'value="reviewed"' in args


def test_remove_property_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.remove_property("My Note", "old_key")
        args = mock_run.call_args[0][0]
        assert "property:remove" in args


def test_move_note_calls_cli():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.move_note("old/note.md", new_name="new-note")
        args = mock_run.call_args[0][0]
        assert "move" in args
        assert 'path="old/note.md"' in args
        assert 'name="new-note"' in args


def test_create_folder_uses_eval():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.create_folder("Course/Module/Topic")
        args = mock_run.call_args[0][0]
        assert "eval" in args
        assert any("createFolder" in str(a) for a in args)


def test_replace_section_uses_eval_with_process():
    from obsidian_vault import ObsidianVault
    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.replace_section("My Note", "## Learning Objectives", "- [ ] LO1\n- [ ] LO2")
        args = mock_run.call_args[0][0]
        assert "eval" in args
        assert any("process" in str(a) for a in args)
