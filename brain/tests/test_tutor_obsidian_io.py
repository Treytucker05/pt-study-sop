from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import dashboard.api_tutor as api_tutor


class _FakeVault:
    def __init__(self) -> None:
        self.create_calls: list[tuple[str, str, str]] = []
        self.replace_calls: list[tuple[str, str]] = []

    def read_note(self, *, file: str) -> str:
        return (
            "2026-03-08 Loading updated app package\n"
            "Your Obsidian installer is out of date.\n"
            f'Error: File "{file}" not found.'
        )

    def get_file_info(self, *, file: str) -> dict[str, str]:
        return {}

    def create_note(self, *, name: str, folder: str = "", content: str = "", template: str = "", silent: bool = True) -> str:
        self.create_calls.append((name, folder, content))
        return ""

    def replace_content(self, *, file: str, new_content: str) -> str:
        self.replace_calls.append((file, new_content))
        return ""


def test_vault_read_note_rejects_cli_error_text(monkeypatch) -> None:
    monkeypatch.setattr(api_tutor, "_obsidian_vault_root_path", lambda: None)
    monkeypatch.setattr(api_tutor, "_get_obsidian_vault", lambda: _FakeVault())

    result = api_tutor._vault_read_note("Courses/Neuroscience/Week 8/_Map of Contents.md")

    assert result["success"] is False
    assert "not found" in result["error"].lower()


def test_vault_save_note_does_not_create_duplicates_on_bridge_error(monkeypatch) -> None:
    vault = _FakeVault()
    monkeypatch.setattr(api_tutor, "_obsidian_vault_root_path", lambda: None)
    monkeypatch.setattr(api_tutor, "_get_obsidian_vault", lambda: vault)

    result = api_tutor._vault_save_note(
        "Courses/Neuroscience/Week 8/Learning Objectives & To Do.md",
        "# patched",
    )

    assert result["success"] is False
    assert vault.create_calls == []
    assert vault.replace_calls == []


def test_vault_save_note_uses_filesystem_when_root_available(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(api_tutor, "_obsidian_vault_root_path", lambda: tmp_path)

    result = api_tutor._vault_save_note(
        "Courses/Neuroscience/Week 8/Learning Objectives & To Do.md",
        "# patched",
    )

    saved = tmp_path / "Courses" / "Neuroscience" / "Week 8" / "Learning Objectives & To Do.md"
    assert result["success"] is True
    assert saved.read_text(encoding="utf-8") == "# patched"
