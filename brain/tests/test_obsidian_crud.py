from pathlib import Path

import pytest

from dashboard import api_adapter


@pytest.fixture()
def vault_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    root = tmp_path / "vault"
    root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(api_adapter, "_obsidian_vault_root_path", lambda: root.resolve())
    monkeypatch.setattr(
        api_adapter,
        "_request_obsidian",
        lambda *args, **kwargs: (None, "offline"),
    )
    return root


def test_create_folder(vault_root: Path) -> None:
    result = api_adapter.obsidian_create_folder("Study notes/Class A/Week 1")
    assert result["success"] is True
    assert (vault_root / "Study notes" / "Class A" / "Week 1").is_dir()


def test_delete_file_fallback_filesystem(vault_root: Path) -> None:
    note = vault_root / "Study notes" / "Class A" / "Week 1" / "A.md"
    note.parent.mkdir(parents=True, exist_ok=True)
    note.write_text("# test\n", encoding="utf-8")

    result = api_adapter.obsidian_delete_file("Study notes/Class A/Week 1/A.md")
    assert result["success"] is True
    assert not note.exists()


def test_delete_folder_requires_recursive_for_non_empty(vault_root: Path) -> None:
    folder = vault_root / "Study notes" / "Class A" / "Week 2"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "A.md").write_text("x", encoding="utf-8")

    blocked = api_adapter.obsidian_delete_folder("Study notes/Class A/Week 2")
    assert blocked["success"] is False
    assert "recursive=true" in str(blocked.get("error"))

    deleted = api_adapter.obsidian_delete_folder(
        "Study notes/Class A/Week 2", recursive=True
    )
    assert deleted["success"] is True
    assert not folder.exists()


def test_move_path(vault_root: Path) -> None:
    src = vault_root / "Study notes" / "Class A" / "Week 3" / "Old.md"
    src.parent.mkdir(parents=True, exist_ok=True)
    src.write_text("old", encoding="utf-8")

    result = api_adapter.obsidian_move_path(
        "Study notes/Class A/Week 3/Old.md",
        "Study notes/Class A/Week 3/New.md",
    )
    assert result["success"] is True
    assert not src.exists()
    assert (vault_root / "Study notes" / "Class A" / "Week 3" / "New.md").exists()


def test_path_traversal_blocked() -> None:
    with pytest.raises(ValueError):
        api_adapter._normalize_obsidian_rel_path("../outside.md")
