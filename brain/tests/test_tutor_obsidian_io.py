from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import dashboard.api_tutor as api_tutor
import dashboard.api_tutor_vault as api_tutor_vault


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


def test_ensure_moc_context_derives_context_without_writing_managed_pages(
    monkeypatch,
) -> None:
    save_calls: list[tuple[str, str]] = []

    monkeypatch.setattr(api_tutor_vault, "_resolve_class_label", lambda _course_id: "Neuroscience")
    monkeypatch.setattr(
        api_tutor_vault,
        "_resolve_learning_objectives_for_scope",
        lambda **_kwargs: [
            {
                "objective_id": "OBJ-1",
                "title": "Explain neurulation",
                "status": "active",
            }
        ],
    )
    monkeypatch.setattr(
        api_tutor_vault,
        "_canonical_moc_path",
        lambda **_kwargs: "Courses/Neuroscience/Week 8/_Map of Contents.md",
    )
    monkeypatch.setattr(
        api_tutor_vault,
        "_vault_save_note",
        lambda path, content: save_calls.append((path, content)) or {"success": True, "path": path},
    )

    context, error = api_tutor_vault._ensure_moc_context(
        course_id=1,
        module_id=None,
        module_name="Week 8",
        topic="Week 8",
        learning_objectives=None,
        source_ids=[],
        objective_scope="module_all",
        focus_objective_id=None,
    )

    assert error is None
    assert context is not None
    assert context["path"] == "Courses/Neuroscience/Week 8/_Map of Contents.md"
    assert context["status"] == "derived"
    assert set(context) == {
        "course_name",
        "follow_up_targets",
        "module_name",
        "objective_ids",
        "path",
        "reference_targets",
        "status",
        "subtopic_name",
    }
    assert save_calls == []
