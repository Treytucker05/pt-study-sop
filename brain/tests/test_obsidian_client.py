"""Tests for unified ObsidianClient."""
import pytest
from unittest.mock import patch, MagicMock


def test_obsidian_client_search_returns_list():
    from obsidian_client import ObsidianClient

    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = [
            {
                "filename": "note.md",
                "score": 0.9,
                "matches": [{"match": {"content": "test content"}}],
            }
        ]
        results = client.search("brachial plexus", max_results=5)
    assert isinstance(results, list)
    assert len(results) == 1
    assert results[0]["path"] == "note.md"
    assert results[0]["content"] == "test content"
    assert results[0]["score"] == 0.9


def test_obsidian_client_search_empty_on_error():
    from obsidian_client import ObsidianClient

    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    with patch.object(client, "_request", side_effect=Exception("connection refused")):
        results = client.search("anything")
    assert results == []


def test_obsidian_client_search_respects_max_results():
    from obsidian_client import ObsidianClient

    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = [
            {"filename": f"note{i}.md", "score": 0.5, "matches": []}
            for i in range(20)
        ]
        results = client.search("query", max_results=3)
    assert len(results) == 3


def test_obsidian_client_read_note_returns_content():
    from obsidian_client import ObsidianClient

    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = "# My Note\nSome content here."
        content = client.read_note("folder/note.md")
    assert "Some content here" in content


def test_obsidian_client_read_note_empty_on_error():
    from obsidian_client import ObsidianClient

    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    with patch.object(client, "_request", side_effect=Exception("not found")):
        content = client.read_note("missing.md")
    assert content == ""


def test_obsidian_client_list_folder_returns_files():
    from obsidian_client import ObsidianClient

    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = {"files": ["a.md", "b.md"]}
        files = client.list_folder("/")
    assert isinstance(files, list)
    assert files == ["a.md", "b.md"]


def test_obsidian_client_list_folder_empty_on_error():
    from obsidian_client import ObsidianClient

    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    with patch.object(client, "_request", side_effect=Exception("unreachable")):
        files = client.list_folder("/")
    assert files == []


def test_obsidian_client_defaults_from_env(monkeypatch):
    monkeypatch.setenv("OBSIDIAN_API_KEY", "env-key-123")
    monkeypatch.setenv("OBSIDIAN_API_URL", "https://10.0.0.1:9999")

    from obsidian_client import ObsidianClient

    client = ObsidianClient()
    assert client.api_key == "env-key-123"
    assert client.base_url == "https://10.0.0.1:9999"


def test_obsidian_client_request_builds_correct_url():
    """Verify _request builds URL from base_url + path."""
    from obsidian_client import ObsidianClient

    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    with patch("obsidian_client.urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"ok": true}'
        mock_resp.headers = {"Content-Type": "application/json"}
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_resp

        client._request("GET", "/vault/test.md")

    call_args = mock_urlopen.call_args
    req_obj = call_args[0][0]
    assert req_obj.full_url == "https://127.0.0.1:27124/vault/test.md"
    assert req_obj.get_header("Authorization") == "Bearer test-key"


def test_obsidian_client_search_uses_query_parameter():
    from obsidian_client import ObsidianClient

    client = ObsidianClient(api_key="test-key", base_url="https://127.0.0.1:27124")
    seen: list[tuple[str, str]] = []

    def _fake_request(method, path, **kwargs):
        seen.append((method, path))
        return []

    with patch.object(client, "_request", side_effect=_fake_request):
        client.search("hip module", max_results=5)

    assert seen
    assert seen[0][0] == "POST"
    assert seen[0][1] == "/search/simple/?query=hip%20module"
