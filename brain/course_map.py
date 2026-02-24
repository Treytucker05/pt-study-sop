"""Course map loader -- resolves Blackboard course structures from YAML config.

Provides fuzzy matching from tutor-supplied course labels and module names
to canonical vault folder names, with graceful fallback for unmapped courses.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml

_DEFAULT_CONFIG = Path(__file__).parent / "data" / "vault_courses.yaml"


@dataclass(frozen=True)
class Unit:
    id: str
    name: str
    topics: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class Course:
    code: str
    label: str
    term: str
    unit_type: str
    units: list[Unit] = field(default_factory=list)

    def resolve_unit(self, query: str) -> Optional[Unit]:
        """Fuzzy-match a unit by id, name, or substring."""
        q = _normalize(query)
        if not q:
            return None
        # Exact id match
        for u in self.units:
            if _normalize(u.id) == q:
                return u
        # Exact name match
        for u in self.units:
            if _normalize(u.name) == q:
                return u
        # Substring match (query in name or name in query)
        for u in self.units:
            norm_name = _normalize(u.name)
            if q in norm_name or norm_name in q:
                return u
        # Word overlap
        q_words = _significant_words(q)
        if q_words:
            best: Optional[Unit] = None
            best_score = 0
            for u in self.units:
                u_words = _significant_words(_normalize(u.name))
                overlap = len(q_words & u_words)
                if overlap > best_score:
                    best_score = overlap
                    best = u
            if best_score > 0:
                return best
        return None


@dataclass(frozen=True)
class CourseMap:
    vault_root: str
    courses: list[Course] = field(default_factory=list)

    def resolve_course(self, query: str) -> Optional[Course]:
        """Fuzzy-match a course by label or code."""
        q = _normalize(query)
        if not q:
            return None
        # Exact label match
        for c in self.courses:
            if _normalize(c.label) == q:
                return c
        # Exact code match (PHYT_6314 or PHYT 6314)
        for c in self.courses:
            if _normalize(c.code) == q:
                return c
        # Substring match
        for c in self.courses:
            norm_label = _normalize(c.label)
            if norm_label in q or q in norm_label:
                return c
        return None


# -- Helpers ------------------------------------------------------------------

_STOP_WORDS = frozenset({"the", "and", "of", "a", "an", "to", "in", "for", "on"})


def _normalize(text: str) -> str:
    """Lowercase, collapse whitespace, strip non-alphanumeric (keep spaces)."""
    s = re.sub(r"[^a-z0-9 ]", " ", text.lower())
    return re.sub(r"\s+", " ", s).strip()


def _significant_words(text: str) -> set[str]:
    """Return words longer than 2 chars that aren't stop words."""
    return {w for w in text.split() if len(w) > 2 and w not in _STOP_WORDS}


def load_course_map(config_path: Optional[Path] = None) -> CourseMap:
    """Load and parse the vault_courses.yaml config file."""
    path = config_path or _DEFAULT_CONFIG
    if not path.exists():
        return CourseMap(vault_root="Study Notes")

    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        return CourseMap(vault_root="Study Notes")

    vault_root = raw.get("vault_root", "Study Notes")
    courses: list[Course] = []

    for code, cdata in (raw.get("courses") or {}).items():
        if not isinstance(cdata, dict):
            continue
        units: list[Unit] = []
        for udata in cdata.get("units") or []:
            if not isinstance(udata, dict):
                continue
            units.append(Unit(
                id=str(udata.get("id", "")),
                name=str(udata.get("name", "")),
                topics=list(udata.get("topics") or []),
            ))
        courses.append(Course(
            code=str(code),
            label=str(cdata.get("label", "")),
            term=str(cdata.get("term", "")),
            unit_type=str(cdata.get("unit_type", "")),
            units=units,
        ))

    return CourseMap(vault_root=vault_root, courses=courses)
