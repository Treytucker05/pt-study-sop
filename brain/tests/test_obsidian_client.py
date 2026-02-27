"""Tests for unified ObsidianClient."""
import pytest
from unittest.mock import patch, MagicMock


def _make_client(**kw):
    from obsidian_client import ObsidianClient
    defaults = {"api_key": "test-key", "base_url": "http://127.0.0.1:27123"}
    defaults.update(kw)
    return ObsidianClient(**defaults)


# -- Existing tests (search, read, list, env, URL) --------------------------

def test_obsidian_client_search_returns_list():
    client = _make_client()
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
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("connection refused")):
        results = client.search("anything")
    assert results == []


def test_obsidian_client_search_respects_max_results():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = [
            {"filename": f"note{i}.md", "score": 0.5, "matches": []}
            for i in range(20)
        ]
        results = client.search("query", max_results=3)
    assert len(results) == 3


def test_obsidian_client_read_note_returns_content():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = "# My Note\nSome content here."
        content = client.read_note("folder/note.md")
    assert "Some content here" in content


def test_obsidian_client_read_note_empty_on_error():
    client = _make_client(vault_path="/nonexistent")
    with patch.object(client, "_request", side_effect=Exception("not found")):
        content = client.read_note("missing.md")
    assert content == ""


def test_obsidian_client_list_folder_returns_files():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = {"files": ["a.md", "b.md"]}
        files = client.list_folder("/")
    assert files == ["a.md", "b.md"]


def test_obsidian_client_list_folder_empty_on_error():
    client = _make_client()
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
    client = _make_client()
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
    assert req_obj.full_url == "http://127.0.0.1:27123/vault/test.md"
    assert req_obj.get_header("Authorization") == "Bearer test-key"


def test_obsidian_client_search_uses_query_parameter():
    client = _make_client()
    seen: list[tuple[str, str]] = []

    def _fake_request(method, path, **kwargs):
        seen.append((method, path))
        return []

    with patch.object(client, "_request", side_effect=_fake_request):
        client.search("hip module", max_results=5)
    assert seen
    assert seen[0][0] == "POST"
    assert seen[0][1] == "/search/simple/?query=hip%20module"


# -- Phase 1: Default URL + vault_path + filesystem fallback ----------------

def test_default_base_url_is_27123():
    from obsidian_client import ObsidianClient
    client = ObsidianClient(api_key="k")
    assert "27123" in client.base_url
    assert client.base_url.startswith("http://")


def test_vault_path_from_env(monkeypatch):
    monkeypatch.setenv("OBSIDIAN_VAULT_PATH", "/tmp/my-vault")
    from obsidian_client import ObsidianClient
    client = ObsidianClient(api_key="k")
    assert client.vault_path == "/tmp/my-vault"


def test_vault_path_from_init():
    client = _make_client(vault_path="/custom/vault")
    assert client.vault_path == "/custom/vault"


def test_read_note_falls_back_to_filesystem():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("offline")):
        with patch.object(client, "_fs_read", return_value="# Fallback content") as fs:
            content = client.read_note("notes.md")
    fs.assert_called_once_with("notes.md")
    assert content == "# Fallback content"


def test_fs_read_returns_empty_on_missing():
    client = _make_client(vault_path="/nonexistent/path")
    assert client._fs_read("no-such-file.md") == ""


def test_fs_read_returns_empty_when_no_vault_path():
    client = _make_client(vault_path=None)
    client.vault_path = None
    assert client._fs_read("anything.md") == ""


def test_fs_read_reads_actual_file(tmp_path):
    note = tmp_path / "test.md"
    note.write_text("hello world", encoding="utf-8")
    client = _make_client(vault_path=str(tmp_path))
    assert client._fs_read("test.md") == "hello world"


# -- Phase 2: CRUD methods --------------------------------------------------

def test_write_note_sends_put():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = ""
        result = client.write_note("new.md", "# New")
    assert result is True
    args, kwargs = mock_req.call_args
    assert args[0] == "PUT"
    assert "/vault/" in args[1]
    assert kwargs["content_type"] == "text/markdown"


def test_write_note_returns_false_on_error():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("fail")):
        assert client.write_note("new.md", "# New") is False


def test_append_note_sends_post():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = ""
        result = client.append_note("existing.md", "\n## Appended")
    assert result is True
    args, kwargs = mock_req.call_args
    assert args[0] == "POST"
    assert "/vault/" in args[1]


def test_delete_note_sends_delete():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = ""
        result = client.delete_note("old.md")
    assert result is True
    args = mock_req.call_args[0]
    assert args[0] == "DELETE"


def test_delete_note_returns_false_on_error():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("fail")):
        assert client.delete_note("old.md") is False


def test_health_check_true_when_reachable():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = {"status": "OK"}
        assert client.health_check() is True
    mock_req.assert_called_once_with("GET", "/")


def test_health_check_false_when_unreachable():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("offline")):
        assert client.health_check() is False


# -- Phase 3: Advanced features (via ext) ------------------------------------

def test_patch_note_sets_headers():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = ""
        result = client.patch_note(
            "note.md", "new heading content",
            operation="replace", target_type="heading", target="## Methods",
        )
    assert result is True
    _, kwargs = mock_req.call_args
    assert kwargs["extra_headers"]["Operation"] == "replace"
    assert kwargs["extra_headers"]["Target-Type"] == "heading"
    assert kwargs["extra_headers"]["Target"] == "## Methods"
    assert kwargs["extra_headers"]["Target-Delimiter"] == "::"


def test_patch_note_frontmatter_target():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = ""
        result = client.patch_note(
            "note.md", "new-value",
            operation="replace", target_type="frontmatter", target="tags",
        )
    assert result is True
    _, kwargs = mock_req.call_args
    assert kwargs["extra_headers"]["Target-Type"] == "frontmatter"
    assert kwargs["extra_headers"]["Target"] == "tags"


def test_patch_note_returns_false_on_error():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("err")):
        assert client.patch_note("x.md", "y", target="## H") is False


def test_read_note_rich_returns_dict_with_frontmatter():
    client = _make_client()
    rich = {"content": "# Note", "frontmatter": {"tags": ["neuro"]}, "tags": ["neuro"]}
    with patch.object(client, "_request", return_value=rich):
        result = client.read_note_rich("note.md")
    assert result["frontmatter"]["tags"] == ["neuro"]
    assert result["content"] == "# Note"


def test_read_note_rich_empty_on_error():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("err")):
        assert client.read_note_rich("note.md") == {}


def test_read_document_map_returns_headings():
    client = _make_client()
    doc_map = {"headings": [{"level": 1, "text": "Title"}], "blocks": []}
    with patch.object(client, "_request", return_value=doc_map):
        result = client.read_document_map("note.md")
    assert result["headings"][0]["text"] == "Title"


def test_search_dql_sends_correct_content_type():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = [{"filename": "a.md"}]
        result = client.search_dql('TABLE file.name FROM "Notes"')
    assert len(result) == 1
    _, kwargs = mock_req.call_args
    assert kwargs["content_type"] == "application/vnd.olrapi.dataview.dql+txt"


def test_search_jsonlogic_sends_correct_content_type():
    client = _make_client()
    logic = {"and": [{"glob": ["*.md", {"var": "path"}]}]}
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = [{"filename": "b.md"}]
        result = client.search_jsonlogic(logic)
    assert len(result) == 1
    _, kwargs = mock_req.call_args
    assert kwargs["content_type"] == "application/vnd.olrapi.jsonlogic+json"


def test_search_dql_returns_empty_on_404():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("404")):
        assert client.search_dql("TABLE file.name") == []


def test_search_jsonlogic_returns_empty_on_error():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("err")):
        assert client.search_jsonlogic({"var": "x"}) == []


def test_get_periodic_note():
    client = _make_client()
    with patch.object(client, "_request", return_value="# Daily Note"):
        result = client.get_periodic_note("daily")
    assert result == "# Daily Note"


def test_get_periodic_note_empty_on_error():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("err")):
        assert client.get_periodic_note("daily") == ""


def test_save_periodic_note():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = ""
        assert client.save_periodic_note("daily", "# Today") is True
    args = mock_req.call_args[0]
    assert args[0] == "PUT"
    assert "/periodic/daily/" in args[1]


def test_list_commands():
    client = _make_client()
    cmds = [{"id": "app:reload", "name": "Reload"}]
    with patch.object(client, "_request", return_value=cmds):
        result = client.list_commands()
    assert result == cmds


def test_list_commands_empty_on_error():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("err")):
        assert client.list_commands() == []


def test_execute_command():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = ""
        assert client.execute_command("app:reload") is True
    args = mock_req.call_args[0]
    assert args[0] == "POST"
    assert "app%3Areload" in args[1] or "app:reload" in args[1]


def test_open_in_obsidian():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = ""
        assert client.open_in_obsidian("notes/test.md") is True
    args = mock_req.call_args[0]
    assert args[0] == "POST"
    assert "/open/" in args[1]


def test_open_in_obsidian_new_leaf():
    client = _make_client()
    with patch.object(client, "_request") as mock_req:
        mock_req.return_value = ""
        client.open_in_obsidian("test.md", new_leaf=True)
    _, kwargs = mock_req.call_args
    assert kwargs.get("extra_headers", {}).get("X-New-Leaf") == "true"


def test_get_active_file():
    client = _make_client()
    with patch.object(client, "_request", return_value="# Active"):
        assert client.get_active_file() == "# Active"


def test_get_active_file_empty_on_error():
    client = _make_client()
    with patch.object(client, "_request", side_effect=Exception("err")):
        assert client.get_active_file() == ""


def test_get_active_file_rich():
    client = _make_client()
    rich = {"content": "# Active", "frontmatter": {}, "tags": []}
    with patch.object(client, "_request", return_value=rich):
        result = client.get_active_file_rich()
    assert result["content"] == "# Active"
