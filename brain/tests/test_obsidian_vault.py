"""Tests for ObsidianVault CLI wrapper."""

from unittest.mock import patch, MagicMock
import subprocess
import json


def test_run_calls_subprocess_with_correct_args():
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="output", stderr="")
        result = vault._run(["search", 'query="test"'])
        args = mock_run.call_args[0][0]
        assert args[0] == "obsidian"
        assert 'vault="Test Vault"' in args
        assert "search" in args


def test_run_returns_empty_string_on_nonzero_exit():
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="error")
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
        mock_run.return_value = MagicMock(returncode=0, stdout="42", stderr="")
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
        vault.create_note(
            name="Test Note", folder="Course/Module", template="Study Session"
        )
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
        mock_run.return_value = MagicMock(
            returncode=0, stdout="# Note\nContent here", stderr=""
        )
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
        assert "limit=5" in args


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
        vault.replace_section(
            "My Note", "## Learning Objectives", "- [ ] LO1\n- [ ] LO2"
        )
        args = mock_run.call_args[0][0]
        assert "eval" in args
        assert any("process" in str(a) for a in args)


def test_run_retries_on_timeout():
    """Test that _run() retries on TimeoutExpired."""
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        with patch("obsidian_vault.time.sleep") as mock_sleep:
            mock_run.side_effect = [
                subprocess.TimeoutExpired(cmd="obsidian", timeout=10),
                subprocess.TimeoutExpired(cmd="obsidian", timeout=10),
                MagicMock(returncode=0, stdout="success", stderr=""),
            ]
            result = vault._run(["search", 'query="test"'])
            assert result == "success"
            assert mock_run.call_count == 3
            assert mock_sleep.call_count == 2
            mock_sleep.assert_any_call(1)
            mock_sleep.assert_any_call(2)


def test_run_retries_on_nonzero_exit():
    """Test that _run() retries on non-zero exit code."""
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        with patch("obsidian_vault.time.sleep") as mock_sleep:
            mock_run.side_effect = [
                MagicMock(returncode=1, stdout="", stderr="error 1"),
                MagicMock(returncode=1, stdout="", stderr="error 2"),
                MagicMock(returncode=0, stdout="success", stderr=""),
            ]
            result = vault._run(["read", 'file="test"'])
            assert result == "success"
            assert mock_run.call_count == 3
            assert mock_sleep.call_count == 2


def test_run_exhausts_retries_and_returns_empty():
    """Test that _run() returns empty after all retries exhausted."""
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        with patch("obsidian_vault.time.sleep") as mock_sleep:
            mock_run.side_effect = subprocess.TimeoutExpired(cmd="obsidian", timeout=10)
            result = vault._run(["search", 'query="test"'])
            assert result == ""
            assert mock_run.call_count == 3
            assert mock_sleep.call_count == 2


def test_run_exhausts_retries_json_returns_empty_list():
    """Test that _run() returns empty list after retries when parse_json=True."""
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        with patch("obsidian_vault.time.sleep"):
            mock_run.side_effect = subprocess.TimeoutExpired(cmd="obsidian", timeout=10)
            result = vault._run(["files"], parse_json=True)
            assert result == []
            assert mock_run.call_count == 3


def test_is_available_caches_result():
    """Test that is_available() caches result for 30 seconds."""
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        with patch("obsidian_vault.time.time") as mock_time:
            mock_time.return_value = 1000.0
            mock_run.return_value = MagicMock(returncode=0, stdout="1.12.4", stderr="")

            result1 = vault.is_available()
            assert result1 is True
            assert mock_run.call_count == 1

            mock_time.return_value = 1010.0
            result2 = vault.is_available()
            assert result2 is True
            assert mock_run.call_count == 1

            mock_time.return_value = 1031.0
            result3 = vault.is_available()
            assert result3 is True
            assert mock_run.call_count == 2


def test_is_available_cache_expires_after_ttl():
    """Test that is_available() cache expires after 30 seconds."""
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        with patch("obsidian_vault.time.time") as mock_time:
            mock_time.return_value = 1000.0
            mock_run.return_value = MagicMock(returncode=0, stdout="1.12.4", stderr="")

            result1 = vault.is_available()
            assert result1 is True
            assert mock_run.call_count == 1

            mock_time.return_value = 1030.5
            result2 = vault.is_available()
            assert result2 is True
            assert mock_run.call_count == 2


def test_daily_read_returns_dict():
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    payload = {"date": "2026-03-02", "content": "# Daily Note"}
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(payload), stderr=""
        )
        result = vault.daily_read()
        assert result == payload
        args = mock_run.call_args[0][0]
        assert "daily:read" in args
        assert "format=json" in args


def test_daily_read_returns_empty_dict_on_error():
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="error")
        result = vault.daily_read()
        assert result == {}


def test_daily_append_calls_cli():
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.daily_append("New log entry")
        args = mock_run.call_args[0][0]
        assert "daily:append" in args
        assert 'content="New log entry"' in args


def test_insert_template_calls_cli():
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        vault.insert_template("notes/session.md", "Study Session")
        args = mock_run.call_args[0][0]
        assert "template:insert" in args
        assert 'file="notes/session.md"' in args
        assert 'template="Study Session"' in args


def test_get_outline_returns_list():
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    headings = [{"heading": "Overview", "level": 2}, {"heading": "Details", "level": 3}]
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout=json.dumps(headings), stderr=""
        )
        result = vault.get_outline("My Note")
        assert result == headings
        args = mock_run.call_args[0][0]
        assert "outline" in args
        assert 'file="My Note"' in args
        assert "format=json" in args


def test_get_outline_returns_empty_on_error():
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="error")
        result = vault.get_outline("Missing Note")
        assert result == []


def test_read_property_calls_cli():
    from obsidian_vault import ObsidianVault

    vault = ObsidianVault(vault_name="Test Vault")
    with patch("obsidian_vault.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="reviewed", stderr="")
        result = vault.read_property("My Note", "status")
        assert result == "reviewed"
        args = mock_run.call_args[0][0]
        assert "property:read" in args
        assert 'name="status"' in args
        assert 'file="My Note"' in args
