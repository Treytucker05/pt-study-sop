# Vault Organizer Design

**Date:** 2026-02-23
**Status:** Approved (direction)
**Scope:** Smart file routing + vault structure for tutor-generated Obsidian files

---

## Problem

The tutor writes files to Obsidian via `_study_notes_base_path()` but has no awareness of:

1. **Actual course structure** — Blackboard courses use different unit types (Constructs, Weeks, Modules, Topics) but the tutor treats them all the same
2. **Case mismatch** — Vault has `Study Notes/`, code generates `Study notes/`
3. **No frontmatter** — Generated files have no metadata for Obsidian queries/Dataview
4. **Flat topic naming** — `_sanitize_module_name()` flattens rich module names into generic slugs
5. **No cross-linking validation** — Wiki links are generated but never validated against actual vault files

## Solution Overview

Three components:

1. **Course Map YAML** — Config file defining each course's Blackboard structure
2. **Smart Router** — Replaces `_study_notes_base_path()` with course-map-aware path resolution
3. **Frontmatter Injector** — Adds structured metadata to every generated file

---

## Course Map: Blackboard Structure (All 5 Courses)

### PHYT 6314 — Movement Science 1 (Spring 2026)

- **Unit type:** `construct`
- **Units:**
  - Construct 1: Movement Foundations
  - Construct 2: Lower Quarter
    - Topics: Hip and Pelvis Complex, Knee Complex, Foot and Ankle Complex
  - Construct 3: Spine and Core
  - Construct 4: Upper Quarter
  - Construct 5: Movement Integrations

### PHYT 6313 — Neuroscience (Spring 2026)

- **Unit type:** `week`
- **Units:**
  - Week 1: Cell properties and transmission
  - Week 2: Spinal Cord / PNS
  - Week 3: Autonomic Nerve System
  - Week 4: Somatosensory System
  - Week 5: Motor System
  - Week 6: Cerebellum / Basal Ganglia
  - Week 7: Higher Cortical Functions
  - Week 8: Special Senses

### PHYT 6443 — Therapeutic Interventions (Spring 2026)

- **Unit type:** `module`
- **Units:**
  - Module 1: Health Promotion & Wellness
  - Module 2: Introduction to Therapeutic Exercise, Mechanotransduction, & Tissue Healing
  - Module 3: Primary Mobility Impairments

### PHYT 6502 — PT Examination Skills (Fall 2025)

- **Unit type:** `mixed` (weeks then body regions)
- **Units:**
  - Immersion 1
  - Immersion 2
  - Week 1 (9/2-9/5): Intro to patient management and documentation
  - Week 2 (9/8-9/12): History, Review of Systems, Vital signs, Posture
  - Week 3 (9/15-9/19): Gait & Balance, Intro to goniometry, muscle performance testing, surface anatomy
  - Week 4 (9/22-9/26): ROM and MMT of the spine
  - Shoulder: Surface anatomy, ROM, MMT of shoulder complex
  - Elbow, Forearm, Wrist
  - Hand
  - Hip
  - Knee
  - Foot and Ankle
  - Anthropometrics
  - Cranial Region
  - Neuro Screening
  - Outcome Measure
  - Environmental Analysis

### PHYT 6419 — Human Anatomy (Fall 2025)

- **Unit type:** `topic`
- **Units:**
  - Topic 1: Intro to anatomy, Terminology, Skin
  - Topic 2: Superficial and Deep Back Muscles, Posterior Neck, Vertebrae, Spinal cord
  - Topic 3: Anterior Chest Wall, Shoulder Joint
  - Topic 4: Axilla and Brachial plexus, Arm and Forearm
  - Topic 5: Wrist and Hand
  - Topic 6: Abdominal wall, Heart & Lung
  - Topic 8: Abdominal organ, Post abdominal wall, nerves and vasculature
  - Topic 9: Gluteal region and posterior thigh
  - Topic 10: Anterior and medial thigh, leg and foot
  - Topic 11: Neck, Face, and TMJ
  - Topic 12: Craniotomy, Brain, Circle of Willis, Cranial nerves
  - (Note: Topic 7 skipped by instructor)

---

## Component 1: vault_courses.yaml

```yaml
# brain/config/vault_courses.yaml
vault_root: "Study Notes"  # Fix: capital N to match existing vault

courses:
  PHYT_6314:
    label: "Movement Science"
    term: "Spring 2026"
    unit_type: construct
    units:
      - id: construct_1
        name: "Construct 1 - Movement Foundations"
        topics: []  # populated as tutor encounters them
      - id: construct_2
        name: "Construct 2 - Lower Quarter"
        topics:
          - "Hip and Pelvis Complex"
          - "Knee Complex"
          - "Foot and Ankle Complex"
      - id: construct_3
        name: "Construct 3 - Spine and Core"
        topics: []
      - id: construct_4
        name: "Construct 4 - Upper Quarter"
        topics: []
      - id: construct_5
        name: "Construct 5 - Movement Integrations"
        topics: []

  PHYT_6313:
    label: "Neuroscience"
    term: "Spring 2026"
    unit_type: week
    units:
      - id: week_1
        name: "Week 1"
        topics: ["Cell properties and transmission"]
      - id: week_2
        name: "Week 2"
        topics: ["Spinal Cord", "PNS"]
      - id: week_3
        name: "Week 3"
        topics: ["Autonomic Nerve System"]
      - id: week_4
        name: "Week 4"
        topics: ["Somatosensory System"]
      - id: week_5
        name: "Week 5"
        topics: ["Motor System"]
      - id: week_6
        name: "Week 6"
        topics: ["Cerebellum", "Basal Ganglia"]
      - id: week_7
        name: "Week 7"
        topics: ["Higher Cortical Functions"]
      - id: week_8
        name: "Week 8"
        topics: ["Special Senses"]

  PHYT_6443:
    label: "Therapeutic Interventions"
    term: "Spring 2026"
    unit_type: module
    units:
      - id: module_1
        name: "Module 1 - Health Promotion and Wellness"
        topics: []
      - id: module_2
        name: "Module 2 - Therapeutic Exercise and Tissue Healing"
        topics: []
      - id: module_3
        name: "Module 3 - Primary Mobility Impairments"
        topics: []

  PHYT_6502:
    label: "PT Examination Skills"
    term: "Fall 2025"
    unit_type: mixed
    units:
      - id: immersion_1
        name: "Immersion 1"
        topics: []
      - id: immersion_2
        name: "Immersion 2"
        topics: []
      - id: week_1
        name: "Week 1 - Patient Management and Documentation"
        topics: []
      - id: week_2
        name: "Week 2 - History, ROS, Vitals, Posture"
        topics: []
      - id: week_3
        name: "Week 3 - Gait, Balance, Goniometry, MMT"
        topics: []
      - id: week_4
        name: "Week 4 - ROM and MMT of the Spine"
        topics: []
      - id: shoulder
        name: "Shoulder"
        topics: ["Surface anatomy", "ROM", "MMT"]
      - id: elbow_forearm_wrist
        name: "Elbow, Forearm, Wrist"
        topics: []
      - id: hand
        name: "Hand"
        topics: []
      - id: hip
        name: "Hip"
        topics: []
      - id: knee
        name: "Knee"
        topics: []
      - id: foot_ankle
        name: "Foot and Ankle"
        topics: []
      - id: anthropometrics
        name: "Anthropometrics"
        topics: []
      - id: cranial_region
        name: "Cranial Region"
        topics: []
      - id: neuro_screening
        name: "Neuro Screening"
        topics: []
      - id: outcome_measure
        name: "Outcome Measure"
        topics: []
      - id: environmental_analysis
        name: "Environmental Analysis"
        topics: []

  PHYT_6419:
    label: "Human Anatomy"
    term: "Fall 2025"
    unit_type: topic
    units:
      - id: topic_1
        name: "Topic 1 - Intro to Anatomy, Terminology, Skin"
        topics: []
      - id: topic_2
        name: "Topic 2 - Back Muscles, Posterior Neck, Vertebrae, Spinal Cord"
        topics: []
      - id: topic_3
        name: "Topic 3 - Anterior Chest Wall, Shoulder Joint"
        topics: []
      - id: topic_4
        name: "Topic 4 - Axilla, Brachial Plexus, Arm, Forearm"
        topics: []
      - id: topic_5
        name: "Topic 5 - Wrist and Hand"
        topics: []
      - id: topic_6
        name: "Topic 6 - Abdominal Wall, Heart and Lung"
        topics: []
      - id: topic_8
        name: "Topic 8 - Abdominal Organs, Post Abdominal Wall"
        topics: []
      - id: topic_9
        name: "Topic 9 - Gluteal Region, Posterior Thigh"
        topics: []
      - id: topic_10
        name: "Topic 10 - Anterior and Medial Thigh, Leg, Foot"
        topics: []
      - id: topic_11
        name: "Topic 11 - Neck, Face, TMJ"
        topics: []
      - id: topic_12
        name: "Topic 12 - Craniotomy, Brain, Circle of Willis, Cranial Nerves"
        topics: []
```

---

## Component 2: Smart Router

Replaces `_study_notes_base_path()` in `brain/dashboard/api_tutor.py`.

### Current (dumb)

```python
def _study_notes_base_path(*, course_label, module_or_week, subtopic):
    safe_course = _sanitize_path_segment(course_label, fallback="General Class")
    safe_module = _sanitize_path_segment(module_or_week, fallback="General Module")
    safe_subtopic = _sanitize_path_segment(subtopic, fallback="General Topic")
    return f"Study notes/{safe_course}/{safe_module}/{safe_subtopic}"
```

### Proposed (smart)

```python
from brain.config.course_map import load_course_map

def _study_notes_base_path(*, course_label, module_or_week, subtopic):
    """Route study files using course map config."""
    course_map = load_course_map()
    course = course_map.resolve_course(course_label)

    if course is None:
        # Fallback: original behavior for unmapped courses
        safe_course = _sanitize_path_segment(course_label, fallback="General Class")
        safe_module = _sanitize_path_segment(module_or_week, fallback="General Module")
        safe_subtopic = _sanitize_path_segment(subtopic, fallback="General Topic")
        return f"{course_map.vault_root}/{safe_course}/{safe_module}/{safe_subtopic}"

    unit = course.resolve_unit(module_or_week)
    unit_folder = unit.name if unit else _sanitize_path_segment(module_or_week)
    topic_folder = _sanitize_path_segment(subtopic, fallback="General Topic")

    return f"{course_map.vault_root}/{course.label}/{unit_folder}/{topic_folder}"
```

### Key behaviors

- **Graceful fallback** — Unmapped courses use the old path logic
- **Case fix** — `vault_root: "Study Notes"` fixes the capital-N mismatch
- **Rich unit names** — "Construct 2 - Lower Quarter" instead of "construct_2"
- **Config-driven** — Adding a new course = editing YAML, not code

---

## Component 3: Frontmatter Injector

Every file the tutor generates gets YAML frontmatter.

### Template

```yaml
---
course: "Movement Science"
course_code: "PHYT 6314"
unit: "Construct 2 - Lower Quarter"
unit_type: construct
topic: "Knee Complex"
type: session | concept | north_star
created: 2026-02-23
tags:
  - movement-science
  - lower-quarter
  - knee
---
```

### Implementation

Modify `_render_tutor_session_markdown()`, `_render_tutor_concept_markdown()`, and `_build_north_star_markdown()` to prepend frontmatter using a shared helper:

```python
def _build_frontmatter(*, course_code, course_label, unit_name, unit_type, topic, file_type):
    """Build YAML frontmatter for Obsidian files."""
    tags = [
        _slugify(course_label),
        _slugify(unit_name.split(" - ")[-1]) if " - " in unit_name else _slugify(unit_name),
        _slugify(topic),
    ]
    return textwrap.dedent(f"""\
        ---
        course: "{course_label}"
        course_code: "{course_code}"
        unit: "{unit_name}"
        unit_type: {unit_type}
        topic: "{topic}"
        type: {file_type}
        created: {date.today().isoformat()}
        tags: {json.dumps(tags)}
        ---
    """)
```

---

## Target Vault Structure (Movement Science Example)

```
Study Notes/
└── Movement Science/
    ├── Construct 1 - Movement Foundations/
    │   ├── _North_Star.md
    │   └── [topic]/
    │       ├── Sessions/
    │       │   └── 2026-02-23_Session_ROM.md
    │       └── Concepts/
    │           └── Goniometry_Basics.md
    ├── Construct 2 - Lower Quarter/
    │   ├── _North_Star.md
    │   ├── Hip and Pelvis Complex/
    │   │   ├── Sessions/
    │   │   └── Concepts/
    │   ├── Knee Complex/
    │   │   ├── Sessions/
    │   │   └── Concepts/
    │   └── Foot and Ankle Complex/
    │       ├── Sessions/
    │       └── Concepts/
    ├── Construct 3 - Spine and Core/
    │   └── ...
    ├── Construct 4 - Upper Quarter/
    │   └── ...
    └── Construct 5 - Movement Integrations/
        └── ...
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `brain/config/vault_courses.yaml` | **Create** | Course map config |
| `brain/config/course_map.py` | **Create** | YAML loader + CourseMap/Course/Unit dataclasses |
| `brain/dashboard/api_tutor.py` | **Modify** | Replace `_study_notes_base_path()`, add frontmatter to renderers |
| `tests/test_course_map.py` | **Create** | Unit tests for course map resolution |
| `tests/test_frontmatter.py` | **Create** | Unit tests for frontmatter generation |

---

## Scope Boundaries (YAGNI)

**In scope:**
- Course map YAML with all 5 courses
- Smart Router with graceful fallback
- Frontmatter on new files only (no retroactive migration)
- Fix `Study notes` → `Study Notes` casing

**Out of scope (for now):**
- Retroactive frontmatter injection on existing files
- Wiki link validation / broken link repair
- Automatic topic discovery from Blackboard
- Vault-wide reorganization / migration script
- Obsidian plugin or template integration

---

## Testing Strategy

1. **Unit tests** — CourseMap resolution, path generation, frontmatter formatting
2. **Integration test** — Full tutor session → verify file lands in correct vault path with frontmatter
3. **Manual verification** — Run tutor on Movement Science topic, check Obsidian vault
