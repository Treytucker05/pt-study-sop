"""Tests for the live course-map loader and alias resolution."""

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
          PHYT_6313:
            label: "Neuroscience"
            term: "Spring 2026"
            unit_type: week
            units:
              - id: week_9
                name: "Week 9"
                aliases: ["Week 09"]
                topics: ["Basal Ganglia"]
              - id: exam_2_practice
                name: "Exam 2 PRactice"
                aliases: ["Exam 2 Practice"]
                kind: special
                topics: []

          PHYT_6443:
            label: "Therapeutic Intervention"
            aliases:
              - "Therapeutic Interventions"
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


def test_load_course_map_exposes_canonical_root_and_deprecated_roots(sample_yaml: Path) -> None:
    from course_map import load_course_map

    course_map = load_course_map(sample_yaml)
    assert course_map.vault_root == "Courses"
    assert course_map.deprecated_roots == ["Study Notes"]


def test_resolve_course_by_alias(sample_yaml: Path) -> None:
    from course_map import load_course_map

    course_map = load_course_map(sample_yaml)
    course = course_map.resolve_course("Therapeutic Interventions")
    assert course is not None
    assert course.label == "Therapeutic Intervention"


def test_resolve_special_unit_by_alias(sample_yaml: Path) -> None:
    from course_map import load_course_map

    course_map = load_course_map(sample_yaml)
    course = course_map.resolve_course("Neuroscience")
    assert course is not None
    unit = course.resolve_unit("Exam 2 Practice")
    assert unit is not None
    assert unit.name == "Exam 2 PRactice"


def test_resolve_week_alias(sample_yaml: Path) -> None:
    from course_map import load_course_map

    course_map = load_course_map(sample_yaml)
    course = course_map.resolve_course("Neuroscience")
    assert course is not None
    unit = course.resolve_unit("Week 09")
    assert unit is not None
    assert unit.name == "Week 9"
