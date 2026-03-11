"""Tests for live vault path generation and course-map serialization."""

from __future__ import annotations

import os
import sys
import textwrap
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture()
def sample_yaml(tmp_path: Path) -> Path:
    content = textwrap.dedent("""\
        vault_root: "Courses"
        deprecated_roots:
          - "Study Notes"

        courses:
          PHYT_6220:
            label: "Evidence-Based Practice"
            term: "Spring 2026"
            unit_type: week
            units:
              - id: week_8_quiz_study
                name: "Week 8 Quiz Study"
                aliases: ["Week 8"]
                kind: special
                topics: []

          PHYT_6313:
            label: "Neuroscience"
            term: "Spring 2026"
            unit_type: week
            units:
              - id: exam_2
                name: "Exam 2"
                kind: special
                topics: []

          PHYT_6443:
            label: "Therapeutic Intervention"
            aliases: ["Therapeutic Interventions"]
            term: "Spring 2026"
            unit_type: module
            units:
              - id: exam_2_study
                name: "Exam 2 Study"
                aliases: ["Exam 2"]
                kind: special
                topics: []
    """)
    path = tmp_path / "vault_courses.yaml"
    path.write_text(content, encoding="utf-8")
    return path


def test_study_notes_base_path_uses_live_courses_root(sample_yaml: Path, monkeypatch) -> None:
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Therapeutic Interventions",
        module_or_week="Exam 2",
        subtopic="Exam 2 Study",
    )
    assert path == "Courses/Therapeutic Intervention/Exam 2 Study"


def test_study_notes_base_path_supports_special_units(sample_yaml: Path, monkeypatch) -> None:
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Evidence-Based Practice",
        module_or_week="Week 8",
        subtopic="Week 8 Quiz Study",
    )
    assert path == "Courses/Evidence-Based Practice/Week 8 Quiz Study"


def test_study_notes_base_path_strict_mode_rejects_unmapped_units(sample_yaml: Path, monkeypatch) -> None:
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor_utils import _study_notes_base_path

    with pytest.raises(ValueError, match="Unmapped vault unit"):
        _study_notes_base_path(
            course_label="Neuroscience",
            module_or_week="Week 1",
            subtopic="Week 1",
            strict=True,
        )


def test_canonical_moc_path_uses_courses_root(sample_yaml: Path, monkeypatch) -> None:
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _canonical_moc_path

    path = _canonical_moc_path(
        course_label="Neuroscience",
        module_or_week="Exam 2",
        subtopic="Exam 2",
    )
    assert path == "Courses/Neuroscience/Exam 2/_Map of Contents.md"


@pytest.fixture()
def flask_app(sample_yaml: Path, monkeypatch):
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.app import create_app

    app = create_app()
    app.config["TESTING"] = True
    return app


def test_course_map_endpoint_returns_deprecated_roots(flask_app) -> None:
    client = flask_app.test_client()
    response = client.get("/api/tutor/course-map")
    data = response.get_json()
    assert response.status_code == 200
    assert data["vault_root"] == "Courses"
    assert data["deprecated_roots"] == ["Study Notes"]
