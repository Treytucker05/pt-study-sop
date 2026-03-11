"""Course map loader for live Obsidian vault routing."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml

_DEFAULT_CONFIG = Path(__file__).parent / "data" / "vault_courses.yaml"
_DEFAULT_VAULT_ROOT = "Courses"
_DEFAULT_DEPRECATED_ROOTS = ["Study Notes"]


@dataclass(frozen=True)
class Unit:
    id: str
    name: str
    topics: list[str] = field(default_factory=list)
    aliases: list[str] = field(default_factory=list)
    kind: str = "standard"

    def _candidate_names(self) -> list[str]:
        return [self.name, *self.aliases, self.id]

    def resolve_topic(self, query: str) -> Optional[str]:
        q = _normalize(query)
        if not q:
            return None
        for topic in self.topics:
            if _normalize(topic) == q:
                return topic
        for topic in self.topics:
            topic_norm = _normalize(topic)
            if topic_norm in q or q in topic_norm:
                return topic
        return None


@dataclass(frozen=True)
class Course:
    code: str
    label: str
    term: str
    unit_type: str
    aliases: list[str] = field(default_factory=list)
    units: list[Unit] = field(default_factory=list)

    def _candidate_names(self) -> list[str]:
        return [self.label, *self.aliases, self.code]

    def resolve_unit(self, query: str) -> Optional[Unit]:
        """Fuzzy-match a unit by id, name, alias, or substring."""
        q = _normalize(query)
        if not q:
            return None

        for unit in self.units:
            for candidate in unit._candidate_names():
                if _normalize(candidate) == q:
                    return unit

        for unit in self.units:
            for candidate in unit._candidate_names():
                norm_candidate = _normalize(candidate)
                if norm_candidate and (norm_candidate in q or q in norm_candidate):
                    return unit

        q_words = _significant_words(q)
        if not q_words:
            return None

        best: Optional[Unit] = None
        best_score = 0
        for unit in self.units:
            candidate_words = set()
            for candidate in unit._candidate_names():
                candidate_words |= _significant_words(_normalize(candidate))
            overlap = len(q_words & candidate_words)
            if overlap > best_score:
                best_score = overlap
                best = unit
        return best if best_score > 0 else None


@dataclass(frozen=True)
class CourseMap:
    vault_root: str
    deprecated_roots: list[str] = field(default_factory=list)
    courses: list[Course] = field(default_factory=list)

    def resolve_course(self, query: str) -> Optional[Course]:
        """Fuzzy-match a course by label, alias, or code."""
        q = _normalize(query)
        if not q:
            return None

        for course in self.courses:
            for candidate in course._candidate_names():
                if _normalize(candidate) == q:
                    return course

        for course in self.courses:
            for candidate in course._candidate_names():
                norm_candidate = _normalize(candidate)
                if norm_candidate and (norm_candidate in q or q in norm_candidate):
                    return course

        q_words = _significant_words(q)
        if not q_words:
            return None

        best: Optional[Course] = None
        best_score = 0
        for course in self.courses:
            candidate_words = set()
            for candidate in course._candidate_names():
                candidate_words |= _significant_words(_normalize(candidate))
            overlap = len(q_words & candidate_words)
            if overlap > best_score:
                best_score = overlap
                best = course
        return best if best_score > 0 else None


_STOP_WORDS = frozenset({"the", "and", "of", "a", "an", "to", "in", "for", "on"})


def _normalize(text: str) -> str:
    """Lowercase, collapse whitespace, strip non-alphanumeric (keep spaces)."""
    s = re.sub(r"[^a-z0-9 ]", " ", str(text or "").lower())
    return re.sub(r"\s+", " ", s).strip()


def _significant_words(text: str) -> set[str]:
    """Return words longer than 2 chars that aren't stop words."""
    return {word for word in text.split() if len(word) > 2 and word not in _STOP_WORDS}


def _unit_from_yaml(raw: dict) -> Unit:
    return Unit(
        id=str(raw.get("id", "")).strip(),
        name=str(raw.get("name", "")).strip(),
        topics=[str(topic).strip() for topic in (raw.get("topics") or []) if str(topic).strip()],
        aliases=[str(alias).strip() for alias in (raw.get("aliases") or []) if str(alias).strip()],
        kind=str(raw.get("kind", "standard")).strip() or "standard",
    )


def load_course_map(config_path: Optional[Path] = None) -> CourseMap:
    """Load and parse the vault_courses.yaml config file."""
    path = config_path or _DEFAULT_CONFIG
    if not path.exists():
        return CourseMap(
            vault_root=_DEFAULT_VAULT_ROOT,
            deprecated_roots=list(_DEFAULT_DEPRECATED_ROOTS),
        )

    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        return CourseMap(
            vault_root=_DEFAULT_VAULT_ROOT,
            deprecated_roots=list(_DEFAULT_DEPRECATED_ROOTS),
        )

    vault_root = str(raw.get("vault_root") or _DEFAULT_VAULT_ROOT).strip() or _DEFAULT_VAULT_ROOT
    deprecated_roots = [
        str(root).strip()
        for root in (raw.get("deprecated_roots") or _DEFAULT_DEPRECATED_ROOTS)
        if str(root).strip()
    ]

    courses: list[Course] = []
    for code, raw_course in (raw.get("courses") or {}).items():
        if not isinstance(raw_course, dict):
            continue
        units = [
            _unit_from_yaml(unit)
            for unit in (raw_course.get("units") or [])
            if isinstance(unit, dict)
        ]
        courses.append(
            Course(
                code=str(code).strip(),
                label=str(raw_course.get("label", "")).strip(),
                term=str(raw_course.get("term", "")).strip(),
                unit_type=str(raw_course.get("unit_type", "")).strip(),
                aliases=[
                    str(alias).strip()
                    for alias in (raw_course.get("aliases") or [])
                    if str(alias).strip()
                ],
                units=units,
            )
        )

    return CourseMap(
        vault_root=vault_root,
        deprecated_roots=deprecated_roots,
        courses=courses,
    )
