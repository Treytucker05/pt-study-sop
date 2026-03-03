"""Tests for path generation functions and course-map endpoint.

Tests cover:
- _study_notes_base_path() with all 5 unit types (topic, week, construct, module, mixed)
- _canonical_moc_path() produces path ending in _Map of Contents.md
- Deduplication when subtopic == module name
- GET /api/tutor/course-map endpoint returns 5 courses with unit_type fields
"""

from __future__ import annotations

import os
import sys
import textwrap
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture()
def sample_yaml(tmp_path: Path) -> Path:
    """Write a minimal vault_courses.yaml with all 5 unit types for tests."""
    content = textwrap.dedent("""\
        vault_root: "Study Notes"

        courses:
          PHYT_6216:
            label: "Exercise Physiology"
            term: "Spring 2026"
            unit_type: topic
            units:
              - id: topic_1
                name: "Topic 1 - Introduction"
                topics: []
              - id: topic_2
                name: "Topic 2 - Training"
                topics: []

          PHYT_6220:
            label: "Evidence-Based Practice"
            term: "Spring 2026"
            unit_type: week
            units:
              - id: week_03
                name: "Week 03"
                topics: []

          PHYT_6313:
            label: "Neuroscience"
            term: "Spring 2026"
            unit_type: week
            units:
              - id: week_1
                name: "Week 1"
                topics: ["Cell properties and transmission"]

          PHYT_6314:
            label: "Movement Science"
            term: "Spring 2026"
            unit_type: construct
            units:
              - id: construct_1
                name: "Construct 1 - Movement Foundations"
                topics: []
              - id: construct_2
                name: "Construct 2 - Lower Quarter"
                topics:
                  - "Hip and Pelvis Complex"
                  - "Knee Complex"

          PHYT_6443:
            label: "Therapeutic Interventions"
            term: "Spring 2026"
            unit_type: module
            units:
              - id: module_1
                name: "Module 1 - Health Promotion"
                topics: []
              - id: module_2
                name: "Module 2 - Therapeutic Exercise"
                topics: []
    """)
    p = tmp_path / "vault_courses.yaml"
    p.write_text(content, encoding="utf-8")
    return p


# -- Tests for _study_notes_base_path() ----------------------------------------


def test_study_notes_base_path_topic_unit_type(sample_yaml: Path, monkeypatch) -> None:
    """Exercise Physiology (topic) / Topic 1 / Intro -> correct path."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Exercise Physiology",
        module_or_week="Topic 1",
        subtopic="Intro",
    )
    assert path == "Study Notes/Exercise Physiology/Topic 1 - Introduction/Intro"


def test_study_notes_base_path_week_unit_type(sample_yaml: Path, monkeypatch) -> None:
    """Evidence-Based Practice (week) / Week 03 / Clinical Questions -> correct path."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Evidence-Based Practice",
        module_or_week="Week 03",
        subtopic="Clinical Questions",
    )
    assert path == "Study Notes/Evidence-Based Practice/Week 03/Clinical Questions"


def test_study_notes_base_path_construct_unit_type(
    sample_yaml: Path, monkeypatch
) -> None:
    """Movement Science (construct) / Construct 2 / Knee Complex -> correct path."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Movement Science",
        module_or_week="Construct 2",
        subtopic="Knee Complex",
    )
    assert (
        path == "Study Notes/Movement Science/Construct 2 - Lower Quarter/Knee Complex"
    )


def test_study_notes_base_path_module_unit_type(sample_yaml: Path, monkeypatch) -> None:
    """Therapeutic Interventions (module) / Module 2 / Exercise Types -> correct path."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Therapeutic Interventions",
        module_or_week="Module 2",
        subtopic="Exercise Types",
    )
    assert (
        path
        == "Study Notes/Therapeutic Interventions/Module 2 - Therapeutic Exercise/Exercise Types"
    )


def test_study_notes_base_path_deduplication_when_subtopic_equals_unit(
    sample_yaml: Path, monkeypatch
) -> None:
    """When subtopic == unit name, skip redundant subfolder (e.g., Week 1 / Week 1)."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    # Neuroscience / Week 1 / Week 1 -> should deduplicate to just Week 1
    path = _study_notes_base_path(
        course_label="Neuroscience",
        module_or_week="Week 1",
        subtopic="Week 1",
    )
    assert path == "Study Notes/Neuroscience/Week 1"
    # Ensure no double "Week 1" folder
    assert path.count("Week 1") == 1


def test_study_notes_base_path_unmapped_course_fallback(
    sample_yaml: Path, monkeypatch
) -> None:
    """Unmapped course -> sanitized fallback path."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Unknown Course",
        module_or_week="Week 1",
        subtopic="Topic",
    )
    assert path == "Study Notes/Unknown Course/Week 1/Topic"


# -- Tests for _canonical_moc_path() -------------------------------------------


def test_canonical_moc_path_ends_with_map_of_contents(
    sample_yaml: Path, monkeypatch
) -> None:
    """_canonical_moc_path() returns path ending in _Map of Contents.md."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _canonical_moc_path

    path = _canonical_moc_path(
        course_label="Movement Science",
        module_or_week="Construct 2",
        subtopic="Knee Complex",
    )
    assert path.endswith("_Map of Contents.md")
    assert "Knee Complex" in path


def test_canonical_moc_path_includes_base_path(sample_yaml: Path, monkeypatch) -> None:
    """_canonical_moc_path() includes the full base path + _Map of Contents.md."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _canonical_moc_path

    path = _canonical_moc_path(
        course_label="Evidence-Based Practice",
        module_or_week="Week 03",
        subtopic="Clinical Questions",
    )
    expected_base = "Study Notes/Evidence-Based Practice/Week 03/Clinical Questions"
    assert path == f"{expected_base}/_Map of Contents.md"


def test_canonical_moc_path_deduplication(sample_yaml: Path, monkeypatch) -> None:
    """_canonical_moc_path() respects deduplication in base path."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _canonical_moc_path

    # Week 1 / Week 1 should deduplicate
    path = _canonical_moc_path(
        course_label="Neuroscience",
        module_or_week="Week 1",
        subtopic="Week 1",
    )
    # Should be Study Notes/Neuroscience/Week 1/_Map of Contents.md (not double Week 1)
    assert path == "Study Notes/Neuroscience/Week 1/_Map of Contents.md"


# -- Tests for GET /api/tutor/course-map endpoint ------------------------------


@pytest.fixture()
def flask_app(sample_yaml: Path, monkeypatch):
    """Create a Flask test client with mocked course map."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.app import create_app

    app = create_app()
    app.config["TESTING"] = True
    return app


def test_get_course_map_returns_200(flask_app) -> None:
    """GET /api/tutor/course-map returns 200 OK."""
    client = flask_app.test_client()
    response = client.get("/api/tutor/course-map")
    assert response.status_code == 200


def test_get_course_map_returns_json(flask_app) -> None:
    """GET /api/tutor/course-map returns valid JSON."""
    client = flask_app.test_client()
    response = client.get("/api/tutor/course-map")
    data = response.get_json()
    assert isinstance(data, dict)


def test_get_course_map_has_vault_root(flask_app) -> None:
    """GET /api/tutor/course-map response includes vault_root."""
    client = flask_app.test_client()
    response = client.get("/api/tutor/course-map")
    data = response.get_json()
    assert "vault_root" in data
    assert data["vault_root"] == "Study Notes"


def test_get_course_map_has_courses_list(flask_app) -> None:
    """GET /api/tutor/course-map response includes courses list."""
    client = flask_app.test_client()
    response = client.get("/api/tutor/course-map")
    data = response.get_json()
    assert "courses" in data
    assert isinstance(data["courses"], list)


def test_get_course_map_returns_5_courses(flask_app) -> None:
    """GET /api/tutor/course-map returns 5 courses (topic, week, week, construct, module)."""
    client = flask_app.test_client()
    response = client.get("/api/tutor/course-map")
    data = response.get_json()
    assert len(data["courses"]) == 5


def test_get_course_map_courses_have_unit_type(flask_app) -> None:
    """GET /api/tutor/course-map courses include unit_type field."""
    client = flask_app.test_client()
    response = client.get("/api/tutor/course-map")
    data = response.get_json()
    for course in data["courses"]:
        assert "unit_type" in course
        assert course["unit_type"] in ["topic", "week", "construct", "module"]


def test_get_course_map_unit_types_match_expected(flask_app) -> None:
    """GET /api/tutor/course-map returns correct unit_type for each course."""
    client = flask_app.test_client()
    response = client.get("/api/tutor/course-map")
    data = response.get_json()

    # Build a map of label -> unit_type
    unit_types = {c["label"]: c["unit_type"] for c in data["courses"]}

    assert unit_types.get("Exercise Physiology") == "topic"
    assert unit_types.get("Evidence-Based Practice") == "week"
    assert unit_types.get("Neuroscience") == "week"
    assert unit_types.get("Movement Science") == "construct"
    assert unit_types.get("Therapeutic Interventions") == "module"


def test_get_course_map_courses_have_required_fields(flask_app) -> None:
    """GET /api/tutor/course-map courses include code, label, term, units."""
    client = flask_app.test_client()
    response = client.get("/api/tutor/course-map")
    data = response.get_json()
    for course in data["courses"]:
        assert "code" in course
        assert "label" in course
        assert "term" in course
        assert "units" in course
        assert isinstance(course["units"], list)


def test_get_course_map_units_have_required_fields(flask_app) -> None:
    """GET /api/tutor/course-map units include id, name, topics."""
    client = flask_app.test_client()
    response = client.get("/api/tutor/course-map")
    data = response.get_json()
    for course in data["courses"]:
        for unit in course["units"]:
            assert "id" in unit
            assert "name" in unit
            assert "topics" in unit
            assert isinstance(unit["topics"], list)
