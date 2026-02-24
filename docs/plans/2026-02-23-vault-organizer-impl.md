# Vault Organizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace dumb path generation in the tutor with course-map-aware routing, fixing the casing bug and adding structured frontmatter to every generated Obsidian file.

**Architecture:** A YAML config (`vault_courses.yaml`) defines each Blackboard course's unit structure. A `CourseMap` loader provides fuzzy resolution from course labels and module names to canonical vault paths. The existing `_study_notes_base_path()` is modified to use the course map with graceful fallback for unmapped courses. Template frontmatter is enriched with course-level fields.

**Tech Stack:** Python 3.11+, PyYAML (already in requirements), Pydantic for dataclasses, pytest

**Design doc:** `docs/plans/2026-02-23-vault-organizer-design.md`

---

## Task 1: Course Map Config + Loader

**Files:**
- Create: `brain/config/vault_courses.yaml`
- Create: `brain/config/course_map.py`
- Test: `brain/tests/test_course_map.py`

### Step 1: Write failing test for CourseMap loader

Create `brain/tests/test_course_map.py`:

```python
"""Tests for brain.config.course_map — YAML loader + resolution."""
from __future__ import annotations

import textwrap
from pathlib import Path

import pytest
import yaml


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
    from config.course_map import load_course_map

    cm = load_course_map(sample_yaml)
    assert cm.vault_root == "Study Notes"
    assert len(cm.courses) == 2


def test_resolve_course_by_label(sample_yaml: Path) -> None:
    from config.course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Movement Science")
    assert course is not None
    assert course.code == "PHYT_6314"
    assert course.label == "Movement Science"


def test_resolve_course_fuzzy_match(sample_yaml: Path) -> None:
    from config.course_map import load_course_map

    cm = load_course_map(sample_yaml)
    # DB stores "Movement Science 1" — fuzzy should still match
    course = cm.resolve_course("Movement Science 1")
    assert course is not None
    assert course.code == "PHYT_6314"


def test_resolve_course_returns_none_for_unknown(sample_yaml: Path) -> None:
    from config.course_map import load_course_map

    cm = load_course_map(sample_yaml)
    assert cm.resolve_course("Basket Weaving 101") is None


def test_resolve_unit_by_name(sample_yaml: Path) -> None:
    from config.course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Movement Science")
    assert course is not None
    unit = course.resolve_unit("Construct 2")
    assert unit is not None
    assert unit.name == "Construct 2 - Lower Quarter"


def test_resolve_unit_fuzzy_partial(sample_yaml: Path) -> None:
    from config.course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Movement Science")
    assert course is not None
    # Tutor might pass "Lower Quarter" or "construct 2" — should match
    unit = course.resolve_unit("Lower Quarter")
    assert unit is not None
    assert unit.id == "construct_2"


def test_resolve_unit_returns_none_for_unknown(sample_yaml: Path) -> None:
    from config.course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Movement Science")
    assert course is not None
    assert course.resolve_unit("Nonexistent Unit") is None


def test_course_map_metadata(sample_yaml: Path) -> None:
    from config.course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Neuroscience")
    assert course is not None
    assert course.unit_type == "week"
    assert course.term == "Spring 2026"
```

### Step 2: Run test to verify it fails

Run: `cd brain && python -m pytest tests/test_course_map.py -v --no-header 2>&1 | head -20`
Expected: FAIL — `ModuleNotFoundError: No module named 'config.course_map'`

### Step 3: Create vault_courses.yaml

Create `brain/config/vault_courses.yaml` — copy the full YAML from the design doc at `docs/plans/2026-02-23-vault-organizer-design.md` lines 106–275. It defines all 5 courses with their unit structures.

### Step 4: Implement course_map.py

Create `brain/config/course_map.py`:

```python
"""Course map loader — resolves Blackboard course structures from YAML config.

Provides fuzzy matching from tutor-supplied course labels and module names
to canonical vault folder names, with graceful fallback for unmapped courses.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml

_DEFAULT_CONFIG = Path(__file__).parent / "vault_courses.yaml"


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
        # Word overlap — match if any significant word overlaps
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
```

### Step 5: Ensure `brain/config/__init__.py` exists

Create empty `brain/config/__init__.py` if it doesn't already exist (make the directory a Python package).

### Step 6: Run tests to verify they pass

Run: `cd brain && python -m pytest tests/test_course_map.py -v --no-header`
Expected: All 8 tests PASS

### Step 7: Commit

```bash
git add brain/config/vault_courses.yaml brain/config/course_map.py brain/config/__init__.py brain/tests/test_course_map.py
git commit -m "feat(vault): course map YAML config + loader with fuzzy resolution"
```

---

## Task 2: Smart Router

**Files:**
- Modify: `brain/dashboard/api_tutor.py:310-318` (`_study_notes_base_path`, `_canonical_north_star_path`)
- Test: `brain/tests/test_course_map.py` (add router tests)

### Step 1: Write failing tests for smart router

Append to `brain/tests/test_course_map.py`:

```python
# -- Smart router tests -------------------------------------------------------


def test_smart_base_path_mapped_course(sample_yaml: Path) -> None:
    """Mapped course → rich folder names from config."""
    from config.course_map import load_course_map

    cm = load_course_map(sample_yaml)
    course = cm.resolve_course("Movement Science")
    assert course is not None
    unit = course.resolve_unit("Construct 2")
    assert unit is not None
    # Expected: Study Notes/Movement Science/Construct 2 - Lower Quarter/Knee Complex
    assert unit.name == "Construct 2 - Lower Quarter"
    assert cm.vault_root == "Study Notes"


def test_smart_base_path_unmapped_course(sample_yaml: Path) -> None:
    """Unmapped course → fallback sanitized paths."""
    from config.course_map import load_course_map

    cm = load_course_map(sample_yaml)
    assert cm.resolve_course("Basket Weaving") is None
    # Fallback path should use vault_root + sanitized segments
    assert cm.vault_root == "Study Notes"
```

### Step 2: Run tests to verify they pass (these are pure data tests)

Run: `cd brain && python -m pytest tests/test_course_map.py -v --no-header`
Expected: All 10 tests PASS

### Step 3: Modify `_study_notes_base_path()` in api_tutor.py

Replace lines 310–314 of `brain/dashboard/api_tutor.py`:

**Old (lines 310-314):**
```python
def _study_notes_base_path(*, course_label: str, module_or_week: str, subtopic: str) -> str:
    safe_course = _sanitize_path_segment(course_label, fallback="General Class")
    safe_module = _sanitize_path_segment(module_or_week, fallback="General Module")
    safe_subtopic = _sanitize_path_segment(subtopic, fallback="General Topic")
    return f"Study notes/{safe_course}/{safe_module}/{safe_subtopic}"
```

**New:**
```python
def _study_notes_base_path(*, course_label: str, module_or_week: str, subtopic: str) -> str:
    from config.course_map import load_course_map

    course_map = load_course_map()
    course = course_map.resolve_course(course_label)

    if course is None:
        # Fallback: original behavior for unmapped courses
        safe_course = _sanitize_path_segment(course_label, fallback="General Class")
        safe_module = _sanitize_path_segment(module_or_week, fallback="General Module")
        safe_subtopic = _sanitize_path_segment(subtopic, fallback="General Topic")
        return f"{course_map.vault_root}/{safe_course}/{safe_module}/{safe_subtopic}"

    unit = course.resolve_unit(module_or_week)
    unit_folder = unit.name if unit else _sanitize_path_segment(module_or_week, fallback="General Module")
    topic_folder = _sanitize_path_segment(subtopic, fallback="General Topic")

    return f"{course_map.vault_root}/{course.label}/{unit_folder}/{topic_folder}"
```

### Step 4: Add import at top of api_tutor.py if not present

No additional top-level import needed — we use a lazy local import inside the function (consistent with existing pattern in the file, e.g., `from dashboard.api_adapter import ...` at line 834).

### Step 5: Run existing tutor tests to verify no regression

Run: `cd brain && python -m pytest tests/ -v --no-header -x 2>&1 | tail -20`
Expected: All existing tests still PASS (the function signature is unchanged)

### Step 6: Commit

```bash
git add brain/dashboard/api_tutor.py brain/tests/test_course_map.py
git commit -m "feat(vault): smart router replaces _study_notes_base_path with course-map lookup"
```

---

## Task 3: Frontmatter Enrichment

**Files:**
- Modify: `sop/templates/notes/session_note.md.tmpl` (lines 1-10)
- Modify: `sop/templates/notes/concept_note.md.tmpl` (lines 1-5)
- Modify: `brain/tutor_templates.py:53-97` (render functions to pass new fields)
- Modify: `brain/dashboard/api_tutor.py:1320-1370` (supply course fields to renderers)
- Test: `brain/tests/test_frontmatter.py`

### Step 1: Write failing test for frontmatter fields

Create `brain/tests/test_frontmatter.py`:

```python
"""Tests for course-level frontmatter in tutor-generated Obsidian notes."""
from __future__ import annotations


def test_session_note_contains_course_frontmatter() -> None:
    """Session note markdown should include course/unit fields in frontmatter."""
    from tutor_templates import render_session_note_markdown

    artifact: dict = {
        "metadata": {"control_stage": "guided", "method_id": "active-recall"},
        "session": {"stage_flow": "intro → practice → review"},
        "concepts": [],
    }
    md = render_session_note_markdown(
        artifact=artifact,
        session_id="test-123",
        topic="Knee Complex",
        module_name="Construct 2 - Lower Quarter",
        course_label="Movement Science",
        course_code="PHYT_6314",
        unit_type="construct",
    )
    assert "course: Movement Science" in md
    assert "course_code: PHYT_6314" in md
    assert "unit_type: construct" in md


def test_concept_note_contains_course_frontmatter() -> None:
    """Concept note markdown should include course/unit fields in frontmatter."""
    from tutor_templates import render_concept_note_markdown

    concept: dict = {
        "file_name": "Goniometry Basics",
        "why_it_matters": "Foundation of ROM measurement",
        "prerequisites": [],
        "retrieval_targets": [],
        "relationships": [],
    }
    md = render_concept_note_markdown(
        concept=concept,
        module_name="Construct 1 - Movement Foundations",
        course_label="Movement Science",
        course_code="PHYT_6314",
        unit_type="construct",
    )
    assert "course: Movement Science" in md
    assert "course_code: PHYT_6314" in md
    assert "unit_type: construct" in md


def test_frontmatter_defaults_when_no_course_fields() -> None:
    """Backward compat: omitted course fields should not break rendering."""
    from tutor_templates import render_session_note_markdown

    artifact: dict = {
        "metadata": {},
        "session": {},
        "concepts": [],
    }
    md = render_session_note_markdown(
        artifact=artifact,
        session_id="test-456",
        topic="General",
        module_name="General Module",
    )
    # Should still render without error — no course fields in output
    assert "note_type: tutor_session" in md
```

### Step 2: Run tests to verify they fail

Run: `cd brain && python -m pytest tests/test_frontmatter.py -v --no-header 2>&1 | head -20`
Expected: FAIL — `TypeError: unexpected keyword argument 'course_label'`

### Step 3: Update template files to include course-level frontmatter

**`sop/templates/notes/session_note.md.tmpl`** — Add 3 lines after existing frontmatter fields:

Insert after line 9 (`updated_at: {updated_at}`), before the closing `---`:

```yaml
course: {course_label}
course_code: {course_code}
unit_type: {unit_type}
```

So the full frontmatter block becomes:
```yaml
---
note_type: tutor_session
session_id: {session_id}
topic: {topic}
module_name: {module_name}
control_stage: {control_stage}
method_id: {method_id}
session_mode: {session_mode}
updated_at: {updated_at}
course: {course_label}
course_code: {course_code}
unit_type: {unit_type}
---
```

**`sop/templates/notes/concept_note.md.tmpl`** — Add 3 lines after existing frontmatter:

Insert after line 4 (`updated_at: {updated_at}`), before the closing `---`:

```yaml
course: {course_label}
course_code: {course_code}
unit_type: {unit_type}
```

### Step 4: Update `render_session_note_markdown()` signature in tutor_templates.py

Modify the function at line 53 to accept optional course fields and pass them to format_map:

```python
def render_session_note_markdown(
    *,
    artifact: dict[str, Any],
    session_id: str,
    topic: str,
    module_name: str,
    course_label: str = "",
    course_code: str = "",
    unit_type: str = "",
) -> str:
```

Add the new fields to the `_SafeFormatDict` that gets passed to `template.format_map()`:
- `"course_label": course_label`
- `"course_code": course_code`
- `"unit_type": unit_type`

### Step 5: Update `render_concept_note_markdown()` signature similarly

Add `course_label: str = ""`, `course_code: str = ""`, `unit_type: str = ""` as optional kwargs with defaults, and pass them into the format_map dict.

### Step 6: Update the inline fallback templates

Update the fallback string in `render_session_note_markdown()` (line 68-95) to include the new fields, matching the `.tmpl` file update.

Update the fallback in `render_concept_note_markdown()` similarly.

### Step 7: Run frontmatter tests

Run: `cd brain && python -m pytest tests/test_frontmatter.py -v --no-header`
Expected: All 3 tests PASS

### Step 8: Run full test suite for regression

Run: `cd brain && python -m pytest tests/ -v --no-header -x 2>&1 | tail -20`
Expected: All tests PASS (new kwargs have defaults, so existing callers aren't broken)

### Step 9: Commit

```bash
git add sop/templates/notes/session_note.md.tmpl sop/templates/notes/concept_note.md.tmpl brain/tutor_templates.py brain/tests/test_frontmatter.py
git commit -m "feat(vault): add course-level frontmatter to session and concept templates"
```

---

## Task 4: Wire Course Fields Through Call Sites

**Files:**
- Modify: `brain/dashboard/api_tutor.py:1320-1370` (session/concept save flow)
- Modify: `brain/dashboard/api_tutor.py:1013-1037` (`_render_tutor_session_markdown`, `_render_tutor_concept_markdown`)

### Step 1: Update `_render_tutor_session_markdown()` to pass course fields

Modify `brain/dashboard/api_tutor.py` lines 1013-1027. Add `course_label`, `course_code`, `unit_type` as keyword args and forward them:

**Old:**
```python
def _render_tutor_session_markdown(
    artifact: dict[str, Any],
    *,
    session_id: str,
    topic: str,
    module_name: str,
) -> str:
    from tutor_templates import render_session_note_markdown

    return render_session_note_markdown(
        artifact=artifact,
        session_id=session_id,
        topic=topic,
        module_name=module_name,
    )
```

**New:**
```python
def _render_tutor_session_markdown(
    artifact: dict[str, Any],
    *,
    session_id: str,
    topic: str,
    module_name: str,
    course_label: str = "",
    course_code: str = "",
    unit_type: str = "",
) -> str:
    from tutor_templates import render_session_note_markdown

    return render_session_note_markdown(
        artifact=artifact,
        session_id=session_id,
        topic=topic,
        module_name=module_name,
        course_label=course_label,
        course_code=course_code,
        unit_type=unit_type,
    )
```

### Step 2: Update `_render_tutor_concept_markdown()` similarly

**Old:**
```python
def _render_tutor_concept_markdown(
    concept: dict[str, Any],
    *,
    module_name: str,
) -> str:
    from tutor_templates import render_concept_note_markdown

    return render_concept_note_markdown(concept=concept, module_name=module_name)
```

**New:**
```python
def _render_tutor_concept_markdown(
    concept: dict[str, Any],
    *,
    module_name: str,
    course_label: str = "",
    course_code: str = "",
    unit_type: str = "",
) -> str:
    from tutor_templates import render_concept_note_markdown

    return render_concept_note_markdown(
        concept=concept,
        module_name=module_name,
        course_label=course_label,
        course_code=course_code,
        unit_type=unit_type,
    )
```

### Step 3: Wire course fields at the call site (lines ~1320-1370)

At line 1326, after `course_label = _resolve_class_label(session_row.get("course_id"))`, add course map resolution to extract `course_code` and `unit_type`:

```python
    course_label = _resolve_class_label(session_row.get("course_id"))

    # Resolve course map metadata for frontmatter
    from config.course_map import load_course_map
    _cm = load_course_map()
    _mapped_course = _cm.resolve_course(course_label)
    _course_code = _mapped_course.code.replace("_", " ") if _mapped_course else ""
    _unit_type = _mapped_course.unit_type if _mapped_course else ""
```

Then pass these to the render calls at line 1341:

```python
    session_markdown = _render_tutor_session_markdown(
        normalized_payload,
        session_id=session_id,
        topic=topic,
        module_name=module_name,
        course_label=course_label,
        course_code=_course_code,
        unit_type=_unit_type,
    )
```

And at line 1365:

```python
        concept_markdown = _render_tutor_concept_markdown(
            concept,
            module_name=module_name,
            course_label=course_label,
            course_code=_course_code,
            unit_type=_unit_type,
        )
```

### Step 4: Run full test suite

Run: `cd brain && python -m pytest tests/ -v --no-header -x 2>&1 | tail -20`
Expected: All tests PASS

### Step 5: Commit

```bash
git add brain/dashboard/api_tutor.py
git commit -m "feat(vault): wire course map metadata through session/concept renderers"
```

---

## Task 5: Integration Test

**Files:**
- Modify: `brain/tests/test_course_map.py` (add integration test)

### Step 1: Write integration test for full path + frontmatter flow

Append to `brain/tests/test_course_map.py`:

```python
# -- Integration: full path generation ----------------------------------------


def test_full_path_for_movement_science_knee(sample_yaml: Path, monkeypatch) -> None:
    """Movement Science / Construct 2 / Knee Complex → correct vault path."""
    import config.course_map as cm_module

    # Point the default config at our test fixture
    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    # Import the path function AFTER monkeypatching
    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Movement Science",
        module_or_week="Construct 2",
        subtopic="Knee Complex",
    )
    assert path == "Study Notes/Movement Science/Construct 2 - Lower Quarter/Knee Complex"


def test_full_path_unmapped_course_uses_fallback(sample_yaml: Path, monkeypatch) -> None:
    """Unmapped course → sanitized fallback path with correct vault_root."""
    import config.course_map as cm_module

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
    import config.course_map as cm_module

    monkeypatch.setattr(cm_module, "_DEFAULT_CONFIG", sample_yaml)

    from dashboard.api_tutor import _study_notes_base_path

    path = _study_notes_base_path(
        course_label="Neuroscience",
        module_or_week="Week 1",
        subtopic="Cell properties and transmission",
    )
    assert path.startswith("Study Notes/")
    assert "Study notes/" not in path
```

### Step 2: Run integration tests

Run: `cd brain && python -m pytest tests/test_course_map.py -v --no-header`
Expected: All tests PASS (including the 3 new integration tests)

### Step 3: Run full suite one final time

Run: `cd brain && python -m pytest tests/ -v --no-header 2>&1 | tail -30`
Expected: All tests PASS

### Step 4: Commit

```bash
git add brain/tests/test_course_map.py
git commit -m "test(vault): integration tests for smart router path generation"
```

---

## Task 6: Final Verification

### Step 1: Verify vault_courses.yaml completeness

Run: `cd brain && python -c "from config.course_map import load_course_map; cm = load_course_map(); print(f'{len(cm.courses)} courses loaded'); [print(f'  {c.code}: {c.label} ({c.unit_type}, {len(c.units)} units)') for c in cm.courses]"`

Expected output:
```
5 courses loaded
  PHYT_6314: Movement Science (construct, 5 units)
  PHYT_6313: Neuroscience (week, 8 units)
  PHYT_6443: Therapeutic Interventions (module, 3 units)
  PHYT_6502: PT Examination Skills (mixed, 16 units)
  PHYT_6419: Human Anatomy (topic, 12 units)
```

### Step 2: Verify no hardcoded "Study notes" remains in routing

Run: `cd brain && grep -rn '"Study notes/' dashboard/api_tutor.py`
Expected: No matches (the old casing is replaced by `course_map.vault_root`)

### Step 3: Squash commit if desired, push

```bash
git log --oneline -8  # review commits
git push origin main
```

---

## Summary of Changes

| File | Action | Lines Changed |
|------|--------|---------------|
| `brain/config/vault_courses.yaml` | Create | ~170 lines (all 5 courses) |
| `brain/config/course_map.py` | Create | ~130 lines (dataclasses + loader) |
| `brain/config/__init__.py` | Create | 0 lines (empty package marker) |
| `brain/dashboard/api_tutor.py` | Modify | ~30 lines (router + call sites) |
| `brain/tutor_templates.py` | Modify | ~15 lines (kwargs + format_map) |
| `sop/templates/notes/session_note.md.tmpl` | Modify | +3 lines (frontmatter fields) |
| `sop/templates/notes/concept_note.md.tmpl` | Modify | +3 lines (frontmatter fields) |
| `brain/tests/test_course_map.py` | Create | ~140 lines (unit + integration) |
| `brain/tests/test_frontmatter.py` | Create | ~70 lines (frontmatter tests) |

**Total:** ~560 lines added/modified across 9 files.
