"""Tests for brain.config.course_map -- YAML loader + resolution."""
from __future__ import annotations

import os
import sys
import textwrap
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture()
def sample_yaml(tmp_path: Path) -> Path:
    """Write a minimal vault_courses.yaml for tests."""
    content = textwrap.dedent("""\
        vault_root: "Study Notes"

        courses:
          PHYT_6314:
            label: "Movement Science"
            term: "Spring 2026"
            unit_type: construct
            units:
              - id: construct_2
                name: "Construct 2 - Lower Quarter"
                topics:
                  - "Hip and Pelvis Complex"
                  - "Knee Complex"
                  - "Foot and Ankle Complex"
          PHYT_6313:
            label: "Neuroscience"
            term: "Spring 2026"
            unit_type: week
            units:
              - id: week_1
                name: "Week 1"
                topics: ["Cell properties and transmission"]
    """)
    p = tmp_path / "vault_courses.yaml"
    p.write_text(content, encoding="utf-8")
    return p


def test_load_course_map_returns_course_map(sample_yaml: Path) -> None:
    from course_map import load_course_map

    cm = load_course_map(sample_yaml)
    assert cm.vault_root == "Study Notes"
    assert len(cm.courses) == 2


def test_resolve_course_by_label(sample_yaml: Path) -> None:
    from course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Movement Science")
    assert course is not None
    assert course.code == "PHYT_6314"
    assert course.label == "Movement Science"


def test_resolve_course_fuzzy_match(sample_yaml: Path) -> None:
    from course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Movement Science 1")
    assert course is not None
    assert course.code == "PHYT_6314"


def test_resolve_course_returns_none_for_unknown(sample_yaml: Path) -> None:
    from course_map import load_course_map

    cm = load_course_map(sample_yaml)
    assert cm.resolve_course("Basket Weaving 101") is None


def test_resolve_unit_by_name(sample_yaml: Path) -> None:
    from course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Movement Science")
    assert course is not None
    unit = course.resolve_unit("Construct 2")
    assert unit is not None
    assert unit.name == "Construct 2 - Lower Quarter"


def test_resolve_unit_fuzzy_partial(sample_yaml: Path) -> None:
    from course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Movement Science")
    assert course is not None
    unit = course.resolve_unit("Lower Quarter")
    assert unit is not None
    assert unit.id == "construct_2"


def test_resolve_unit_returns_none_for_unknown(sample_yaml: Path) -> None:
    from course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Movement Science")
    assert course is not None
    assert course.resolve_unit("Nonexistent Unit") is None


def test_course_map_metadata(sample_yaml: Path) -> None:
    from course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Neuroscience")
    assert course is not None
    assert course.unit_type == "week"
    assert course.term == "Spring 2026"


# -- Integration: full path generation ----------------------------------------


def test_full_path_for_movement_science_knee(sample_yaml: Path, monkeypatch) -> None:
    """Movement Science / Construct 2 / Knee Complex -> correct vault path."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Movement Science",
        module_or_week="Construct 2",
        subtopic="Knee Complex",
    )
    assert path == "Study Notes/Movement Science/Construct 2 - Lower Quarter/Knee Complex"


def test_full_path_unmapped_course_uses_fallback(sample_yaml: Path, monkeypatch) -> None:
    """Unmapped course -> sanitized fallback path with correct vault_root."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Basket Weaving",
        module_or_week="Week 1",
        subtopic="Intro",
    )
    assert path == "Study Notes/Basket Weaving/Week 1/Intro"


def test_vault_root_case_fix(sample_yaml: Path, monkeypatch) -> None:
    """vault_root: 'Study Notes' fixes the old 'Study notes' casing."""
    import course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Neuroscience",
        module_or_week="Week 1",
        subtopic="Cell properties and transmission",
    )
    assert path.startswith("Study Notes/")
    assert "Study notes/" not in path
