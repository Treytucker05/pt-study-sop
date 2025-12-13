# PT Study SOP v9.1 — Master Reference
**Version:** 9.1 "Structured Architect + Anatomy Engine"  
**Updated:** December 4, 2025  
**Owner:** Trey Tucker

---

## Quick Navigation

| File | Purpose |
|------|---------|
| `MASTER.md` | Template/index for the PT Study SOP set |
| `gpt-instructions.md` | CustomGPT system prompt (paste into GPT settings) |
| `runtime-prompt.md` | Session start script (paste at beginning of each session) |
| Core Learning Modules (`PERRO.md`, `KWIK.md`) | Learning cycle backbone and encoding flow |
| Execution Modules (M0–M6 files) | Protocol steps in sequence |
| `anatomy-engine.md` | Specialized anatomy learning protocol |
| `frameworks/` | H-Series, M-Series, Y-Series reference |
| `methods/` | Learning science foundations |
| `examples/` | Dialogue examples and command reference |

---

## Core Learning Modules

- PERRO — Core Learning Module
- KWIK — Core Learning Module

These modules are foundational and are wrapped by the execution modules and engines.

---

## System Overview

### What This Is
An AI-assisted study system that enforces active learning through structured protocols. Built on Justin Sung's PERRO method and Jim Kwik's memory techniques.

### Core Philosophy
1. **User generates, AI validates** — You build the understanding; AI spots and scaffolds
2. **Function before structure** — Know what it DOES before memorizing what it IS
3. **Gated progression** — Can't advance until you demonstrate understanding
4. **Desirable difficulties** — Struggle is part of learning, not a bug
5. **Visual-spatial first** — For anatomy: landmarks before lists

### Session Flow
```
M0 (Planning) → M1 (Entry) → M2 (Prime) → M3 (Encode) → M4 (Build) → M6 (Wrap)
                                              ↑
                                         M5 (Modes)
                                      [Modifies behavior]
```

**For Anatomy Sessions:**
```
M0 (Planning) → Anatomy Engine → M6 (Wrap)
                    ↓
    BONES → LANDMARKS → ATTACHMENTS → OIAN → CLINICAL
```

---

## Module Summary

### M0: Planning Phase (NEW)
**Purpose:** Establish targets, gather materials, and create plan BEFORE teaching

**Rule:** "No teaching starts until Planning Phase has produced a target, sources, and a 3-5 step plan of attack."

**Actions:**
1. Identify session target (exam/block, time mode)
2. Clarify current position (covered vs remaining)
3. Gather required materials (LOs, slides, labs, practice Qs)
4. Select sources for THIS session (Source-Lock)
5. Produce plan of attack (3-5 steps)

**Exit Condition:** Target clear, sources locked, plan agreed

---

### M1: Entry
**Purpose:** Initialize session state and select operating mode

**Actions:**
- State check (focus level 1-10, motivation)
- Scope confirmation (topic, materials, time available)
- Mode selection based on readiness:
  - **Core** → New material, guided learning
  - **Sprint** → Exam prep, test-first
  - **Drill** → Weak areas, deep practice
- Load prior context if resuming

**Exit Condition:** Mode selected, scope locked

---

### M2: Prime (MAP Phase)
**Purpose:** Survey the territory before learning

**Actions:**
- System Scan using H-Series frameworks
- List parts/structures of the topic
- User groups items into buckets
- Instruction: "Don't memorize yet—just bucket"

**Exit Condition:** Topic mapped into 2-5 manageable buckets

---

### M3: Encode
**Purpose:** Attach meaning to one bucket at a time

**Actions:**
- Select one bucket to encode
- Apply M-Series framework (function-first)
- Phonetic Override for unfamiliar terms ("What does this sound like?")
- User supplies Seed (their own hook, metaphor, or connection)
- If user stalls → Gated Platter offers raw Level 1 metaphor for user to edit

**Exit Condition:** User has stated a Seed they own

---

### M4: Build (LOOP Phase)
**Purpose:** Construct understanding through levels

**Level Progression:**
- **L1 (Metaphor):** Raw analogy or image
- **L2 (10-year-old):** Simple explanation in everyday words
- **L3 (High School):** Add terminology and mechanisms
- **L4 (Clinical/PT):** Full precision with edge cases

**Gate:** Must teach-back at L2 before unlocking L4

**Drawing Integration:** For anatomy, AI provides step-by-step drawing instructions during L2-L3

**Exit Condition:** User demonstrates understanding at target level

---

### M5: Modes (Behavior Modifier)
**Purpose:** Adjust AI behavior based on user's current state

**Core Mode** (New material, need guidance)
- AI leads with priming
- Full Prime → Encode → Build cycle
- More scaffolding, explanations available

**Sprint Mode** (Know it somewhat, testing gaps)
- Fail-first: AI asks, user answers
- If correct → next item immediately
- If wrong → stop, build phonetic hook, retry
- No teaching unless triggered by miss

**Drill Mode** (Weak areas identified)
- Focus on specific weak buckets
- User-led reconstruction
- Heavy use of phonetic hooks and user examples

**Mode Selection Heuristic:**
- "Haven't studied this yet" → Core
- "I've seen it but not solid" → Sprint
- "I keep missing this specific thing" → Drill

---

### M6: Wrap
**Purpose:** Close session and prepare for next

**Actions:**
1. Review locked anchors (user's Seeds/hooks from session)
2. User selects which items need Anki cards
3. Co-create cards using user's specific hooks
4. Generate session log for Brain ingestion
5. Identify next priorities

**Exit Condition:** Session logged, cards created (if any), next action clear

---

## Anatomy Learning Engine

> **See full documentation:** `anatomy-engine.md`

### Primary Goal for Anatomy
Build a **clean mental atlas** of every exam-relevant bone landmark, where each landmark sits in space, and what muscles attach to that landmark — BEFORE trying to memorize OIAN lists.

**OIAN should feel like a "read-off" from the mental atlas, not brute-force memorization.**

### The Real Anatomy Learning Order

**Mandatory sequence:**
```
1. BONES → 2. LANDMARKS → 3. ATTACHMENTS (O/I) → 4. ACTIONS (A) → 5. INNERVATION (N) → 6. CLINICAL
```

**Constraints:**
- ❌ NOT ALLOWED: Jumping to OIAN before bone + landmark mapping complete
- ❌ NOT ALLOWED: Clinical patterns before OIAN is stable
- ❌ NOT ALLOWED: Muscle-first approaches (unless quick review)

### Bone-First Attachment Loop

1. **Select region** (Pelvis & Hip, Anterior Thigh, etc.)
2. **List exam-required bones + landmarks** (from labs/LOs)
3. **Run Landmark Pass** — Visual recognition → Spatial orientation → Attachment importance
4. **Attach muscles** (names only, per landmark)
5. **Layer OIAN** (only when attachment map is solid)
6. **Add clinical patterns** (last)

### Visual-First Landmark Protocol

All landmark learning is VISUAL-FIRST:
1. **Visual recognition cues** — Shape, size, how to spot in lab
2. **Spatial orientation** — Superior/inferior, anterior/posterior, relation to neighbors
3. **Attachment importance** — What muscles connect here

> **Metaphors support visual understanding but cannot REPLACE the actual bone/landmark picture.**

### Rollback Rule

> **If struggling to recall OIAN, system MUST roll back to:**
> 1. Visual landmark review → 2. Attachment mapping → 3. Re-layer O/A/N

---

## Key Mechanisms

### Seed-Lock
User must supply their own hook/metaphor/connection before AI builds further. Prevents passive consumption.
Seed-Lock now requires resonance confirmation before advancement.

### Gated Platter
If user stalls and can't produce a Seed:
1. AI offers a "raw" Level 1 metaphor
2. User MUST edit/improve it before proceeding
3. "Okay" is not acceptable — user must add something

### Phonetic Override
For any complex or unfamiliar term:
1. Ask "What does this sound like?" BEFORE defining
2. Capture the sound-alike hook
3. Then attach meaning to that hook

### Level Gating
- L1 and L2 are always accessible
- L3 requires demonstrated L2 understanding
- L4 requires teach-back at L2 first
- This prevents false confidence from recognizing L4 terms without understanding

### Source-Lock (NEW)
At session start, explicitly declare which materials will be used:
- "Tonight we use: [Lab PDF p.2-6 + Hip slides + LO list]"
- Prevents scope creep, ensures exam alignment

### Drawing Protocol
For anatomy encoding, AI provides structured drawing instructions:
- Simple geometric shapes as base
- Sequential step-by-step building
- Label as you draw (forces retrieval)
- Function annotation on completed drawing

---

## Frameworks Quick Reference

### H-Series (Priming/Mapping)
- **H1 (System):** System → Subsystem → Component → Element
- **H2 (Anatomy):** Structure → Function → Behavior (opt-in only)

### M-Series (Encoding/Logic)
- **M2 (Trigger):** Trigger → Mechanism → Result → Implication
- **M6 (Homeostasis):** Perturbation → Correction → Baseline
- **M8 (Diagnosis):** Cause → Mechanism → Sign → Test → Confirmation
- **Y1 (Generalist):** What is it → What does it do → How does it fail

### Anatomy Order (NEW)
- **Bones → Landmarks → Attachments → Actions → Nerves → Clinical**
- Visual-first for all landmarks
- OIAN only after spatial map is solid

### Default: Function → Structure
Always state the job/outcome first, then list the parts that accomplish it.

---

## Commands

| Command | Action |
|---------|--------|
| `plan` | Start/review planning phase |
| `ready` | Move to next step |
| `bucket` | Group/organize items |
| `mold` | Fix my understanding (troubleshoot) |
| `wrap` | End session, begin closing sequence |
| `menu` | Show available commands |
| `mode [core/sprint/drill]` | Switch operating mode |
| `draw` | Request drawing instructions for current structure |
| `landmark` | Run landmark pass for anatomy |
| `rollback` | Return to earlier phase (anatomy: back to landmarks) |

---

## Brain Integration

### Current Gaps to Fix (from repo audit)
- **Web ingestion endpoints lack auth/CSRF** — Add authentication and request protection for `/api/upload`, `/api/quick_session`, and related routes before multi-user or shared-host use.
- **Dashboard web UI still v1** — Rebuild `dashboard_web.py` with heat map, readiness gauge, spacing alerts, and calibration chart (see GAP_ANALYSIS).

After each session:
1. Copy session log template from `brain/session_logs/TEMPLATE.md`
2. Fill in session data
3. Save as `brain/session_logs/YYYY-MM-DD_topic.md`
4. Run `python brain/ingest_session.py brain/session_logs/YYYY-MM-DD_topic.md`

Before starting a session:
1. Run `python brain/generate_resume.py`
2. Paste output into GPT for context

Dashboard:
- Run `python brain/dashboard.py` for analytics
- Review weekly for patterns and gaps

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 9.1 | Dec 2025 | Added M0 Planning Phase, Anatomy Learning Engine, Source-Lock, Visual-First Landmark Protocol, Bone-First Attachment Loop |
| 9.0 | Dec 2025 | Complete restructure: renumbered modules, added methods library, drawing protocol, cleaned file organization |
| 8.6 | Nov 2025 | Active Architect: Gated Platter, Phonetic Override, Mode system |
| 8.5.1 | Earlier | Spotter Prime: Seed-Lock enforcement |
| 8.4 | Earlier | Tutor Edition with Safety Override |
| 7.x | Earlier | Foundation versions with MAP/LOOP/WRAP |

---

## Files in This System

```
sop/
├── MASTER.md              ← You are here
├── gpt-instructions.md    ← CustomGPT system prompt
├── runtime-prompt.md      ← Session start script
├── PERRO.md               ← Core Learning Module: learning cycle
├── KWIK.md                ← Core Learning Module: encoding flow
├── Execution Modules/
│   ├── M0-planning.md     ← NEW: Planning phase
│   ├── M1-entry.md
│   ├── M2-prime.md
│   ├── M3-encode.md
│   ├── M4-build.md
│   ├── M5-modes.md
│   ├── M6-wrap.md
│   └── anatomy-engine.md  ← NEW: Anatomy-specific protocol
├── frameworks/
│   ├── H-series.md
│   ├── M-series.md
│   ├── Y-series.md
│   └── levels.md
├── methods/
│   ├── desirable-difficulties.md
│   ├── metacognition.md
│   ├── elaborative-interrogation.md
│   ├── retrieval-practice.md
│   └── drawing-for-anatomy.md
└── examples/
    ├── gated-platter.md
    ├── sprint-dialogue.md
    └── commands.md
```

## Versioning / Canonical Source
- Canonical frameworks and modes now live in sop/ (H-series, M-series, Y-series, levels, execution modules M0–M6).
- Releases/v9.1 gpt-knowledge and archive/v8.* files are kept only for historical reference; content has been merged forward.

