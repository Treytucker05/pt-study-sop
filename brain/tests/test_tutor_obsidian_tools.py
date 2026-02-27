"""Unit tests for Tutor Obsidian browse/read/search tools."""

import sys
import types
from pathlib import Path

# Add brain/ to path for imports.
brain_dir = Path(__file__).parent.parent
sys.path.insert(0, str(brain_dir))


def _patch_api_adapter(
    monkeypatch,
    *,
    list_impl=None,
    get_impl=None,
    health_impl=None,
):
    module = types.ModuleType("brain.dashboard.api_adapter")
    module.obsidian_list_files = list_impl or (lambda folder="": {"success": True, "files": []})
    module.obsidian_get_file = get_impl or (lambda path: {"success": False, "error": "not found"})
    module.obsidian_health_check = health_impl or (lambda: {"connected": True, "status": "online"})
    monkeypatch.setitem(sys.modules, "brain.dashboard.api_adapter", module)


def test_tool_schemas_include_obsidian_browse_tools():
    from tutor_tools import get_tool_schemas

    names = [s.get("name") for s in get_tool_schemas()]
    assert "list_obsidian_paths" in names
    assert "read_obsidian_note" in names
    assert "search_obsidian_notes" in names


def test_execute_list_obsidian_paths_success(monkeypatch):
    from tutor_tools import execute_list_obsidian_paths

    _patch_api_adapter(
        monkeypatch,
        list_impl=lambda folder="": {
            "success": True,
            "files": [
                "Study Notes/Movement Science/Hip.md",
                "Study Notes/Movement Science/",
                "Study Notes/Movement Science/Knee.md",
            ],
        },
    )

    result = execute_list_obsidian_paths({"folder": "Study Notes/Movement Science", "limit": 2})
    assert result["success"] is True
    assert result["count"] == 3
    assert len(result["paths"]) == 2
    assert result["truncated"] is True
    # Folder entries are sorted first.
    assert result["paths"][0].endswith("/")


def test_execute_read_obsidian_note_truncates(monkeypatch):
    from tutor_tools import execute_read_obsidian_note

    _patch_api_adapter(
        monkeypatch,
        get_impl=lambda path: {
            "success": True,
            "path": path,
            "content": "A" * 1000,
        },
    )

    result = execute_read_obsidian_note({"path": "Study Notes/Movement Science/Hip.md", "max_chars": 300})
    assert result["success"] is True
    assert result["path"] == "Study Notes/Movement Science/Hip.md"
    assert result["total_chars"] == 1000
    assert len(result["content"]) == 300
    assert result["truncated"] is True


def test_execute_search_obsidian_notes_success(monkeypatch):
    import obsidian_client
    from tutor_tools import execute_search_obsidian_notes

    class _FakeClient:
        def search(self, query: str, *, max_results: int = 10):
            assert query == "hip"
            assert max_results == 2
            return [
                {"path": "Study Notes/Movement Science/Hip.md", "score": 0.9, "content": "Hip note body"},
                {"path": "Study Notes/Movement Science/Knee.md", "score": 0.5, "content": "Knee note body"},
            ]

    _patch_api_adapter(monkeypatch)
    monkeypatch.setattr(obsidian_client, "ObsidianClient", _FakeClient)
    result = execute_search_obsidian_notes({"query": "hip", "max_results": 2})
    assert result["success"] is True
    assert result["query"] == "hip"
    assert len(result["matches"]) == 2
    assert result["matches"][0]["path"].endswith("Hip.md")


def test_execute_search_obsidian_notes_offline_returns_error(monkeypatch):
    from tutor_tools import execute_search_obsidian_notes

    _patch_api_adapter(
        monkeypatch,
        health_impl=lambda: {"connected": False, "status": "offline", "error": "connection refused"},
    )

    result = execute_search_obsidian_notes({"query": "hip"})
    assert result["success"] is False
    assert "Obsidian unavailable" in result["error"]


def test_execute_tool_routes_list_obsidian_paths(monkeypatch):
    import tutor_tools
    from tutor_tools import execute_tool

    monkeypatch.setattr(
        tutor_tools,
        "execute_list_obsidian_paths",
        lambda _args: {"success": True, "paths": ["Study Notes/"]},
    )
    monkeypatch.setitem(tutor_tools.TOOL_REGISTRY, "list_obsidian_paths", tutor_tools.execute_list_obsidian_paths)

    blocked = execute_tool("list_obsidian_paths", {"folder": ""})
    assert blocked["success"] is False

    result = execute_tool("list_obsidian_paths", {"folder": ""}, allow_obsidian_read=True)
    assert result["success"] is True
    assert "paths" in result
