"""Tests for artifact command routing to ObsidianVault."""
from unittest.mock import patch, MagicMock


def test_route_create_artifact():
    from vault_artifact_parser import parse_vault_artifacts
    from obsidian_vault import ObsidianVault
    from vault_artifact_router import execute_vault_artifact

    text = ':::vault:create\nname: Test Note\nfolder: Course\ntemplate: Study Session\n:::'
    artifacts = parse_vault_artifacts(text)

    vault = ObsidianVault(vault_name="Test")
    with patch.object(vault, "_run", return_value="") as mock:
        execute_vault_artifact(vault, artifacts[0])
        mock.assert_called_once()


def test_route_append_artifact():
    from vault_artifact_parser import parse_vault_artifacts
    from obsidian_vault import ObsidianVault
    from vault_artifact_router import execute_vault_artifact

    text = ':::vault:append\nfile: My Note\ncontent: New stuff\n:::'
    artifacts = parse_vault_artifacts(text)

    vault = ObsidianVault(vault_name="Test")
    with patch.object(vault, "_run", return_value="") as mock:
        execute_vault_artifact(vault, artifacts[0])
        mock.assert_called_once()


def test_route_property_artifact():
    from vault_artifact_parser import parse_vault_artifacts
    from obsidian_vault import ObsidianVault
    from vault_artifact_router import execute_vault_artifact

    text = ':::vault:property\nfile: My Note\nkey: status\nvalue: done\n:::'
    artifacts = parse_vault_artifacts(text)

    vault = ObsidianVault(vault_name="Test")
    with patch.object(vault, "_run", return_value="") as mock:
        execute_vault_artifact(vault, artifacts[0])
        mock.assert_called_once()


def test_route_prepend_artifact():
    from vault_artifact_parser import parse_vault_artifacts
    from obsidian_vault import ObsidianVault
    from vault_artifact_router import execute_vault_artifact

    text = ':::vault:prepend\nfile: My Note\ncontent: Top stuff\n:::'
    artifacts = parse_vault_artifacts(text)

    vault = ObsidianVault(vault_name="Test")
    with patch.object(vault, "_run", return_value="") as mock:
        execute_vault_artifact(vault, artifacts[0])
        mock.assert_called_once()


def test_route_search_artifact():
    from vault_artifact_parser import parse_vault_artifacts
    from obsidian_vault import ObsidianVault
    from vault_artifact_router import execute_vault_artifact

    text = ':::vault:search\nquery: biomechanics\nlimit: 5\n:::'
    artifacts = parse_vault_artifacts(text)

    vault = ObsidianVault(vault_name="Test")
    with patch.object(vault, "search", return_value=[{"path": "a.md"}]) as mock:
        result = execute_vault_artifact(vault, artifacts[0])
        mock.assert_called_once_with("biomechanics", limit=5)
        assert "a.md" in result


def test_route_move_artifact():
    from vault_artifact_parser import parse_vault_artifacts
    from obsidian_vault import ObsidianVault
    from vault_artifact_router import execute_vault_artifact

    text = ':::vault:move\npath: Old/Note.md\nname: New Name\nfolder: New/Folder\n:::'
    artifacts = parse_vault_artifacts(text)

    vault = ObsidianVault(vault_name="Test")
    with patch.object(vault, "_run", return_value="") as mock:
        execute_vault_artifact(vault, artifacts[0])
        mock.assert_called_once()


def test_route_replace_section_artifact():
    from vault_artifact_parser import parse_vault_artifacts
    from obsidian_vault import ObsidianVault
    from vault_artifact_router import execute_vault_artifact

    text = ':::vault:replace-section\nfile: My Note\nheading: ## LOs\ncontent: New content\n:::'
    artifacts = parse_vault_artifacts(text)

    vault = ObsidianVault(vault_name="Test")
    with patch.object(vault, "_eval", return_value="") as mock:
        execute_vault_artifact(vault, artifacts[0])
        mock.assert_called_once()


def test_unknown_operation_returns_error_string():
    from vault_artifact_router import execute_vault_artifact

    artifact = {"operation": "nuke", "params": {}}
    result = execute_vault_artifact(None, artifact)
    assert result.startswith("Unknown operation:")


def test_exception_returns_error_string():
    from vault_artifact_router import execute_vault_artifact

    vault = MagicMock()
    vault.create_note.side_effect = RuntimeError("Connection refused")

    artifact = {"operation": "create", "params": {"name": "Test"}}
    result = execute_vault_artifact(vault, artifact)
    assert result.startswith("Error:")
    assert "Connection refused" in result


def test_execute_all_artifacts():
    from vault_artifact_router import execute_all_artifacts

    vault = MagicMock()
    vault.append_note.return_value = ""
    vault.set_property.return_value = ""

    artifacts = [
        {"operation": "append", "params": {"file": "Note", "content": "text"}},
        {"operation": "property", "params": {"file": "Note", "key": "k", "value": "v"}},
    ]
    results = execute_all_artifacts(vault, artifacts)
    assert len(results) == 2
    assert all(r["success"] for r in results)


def test_execute_all_artifacts_partial_failure():
    from vault_artifact_router import execute_all_artifacts

    vault = MagicMock()
    vault.append_note.return_value = ""
    vault.set_property.side_effect = RuntimeError("fail")

    artifacts = [
        {"operation": "append", "params": {"file": "Note", "content": "text"}},
        {"operation": "property", "params": {"file": "Note", "key": "k", "value": "v"}},
    ]
    results = execute_all_artifacts(vault, artifacts)
    assert results[0]["success"] is True
    assert results[1]["success"] is False
