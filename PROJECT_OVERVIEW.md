# PT STUDY SYSTEM - PROJECT OVERVIEW
**Created:** January 2026
**Owner:** Trey Tucker
**Purpose:** Document the complete vision, current state, and roadmap for the self-improving study system

---

## THE VISION

Build a **self-improving learning system** with three integrated components:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE LEARNING LOOP                                    │
│                                                                              │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│   │   TUTOR     │ ──► │   BRAIN     │ ──► │   SCHOLAR   │                  │
│   │             │     │             │     │             │                  │
│   │ • Teaches   │     │ • Logs      │     │ • Analyzes  │                  │
│   │ • Tests     │     │ • Tracks    │     │ • Researches│                  │
│   │ • Adapts    │     │ • Documents │     │ • Proposes  │                  │
│   └─────────────┘     └─────────────┘     └─────────────┘                  │
│          ▲                                       │                          │
│          │                                       │                          │
│          └──────────── improves ─────────────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Roles

**TUTOR (Custom GPT)**
- Teaches material using the SOP protocols
- Enforces active learning (Seed-Lock, generation, retrieval)
- Adapts to learner state (modes, difficulty progression)
- Requires material to be prepared and handed to it

**BRAIN (Database + Logs)**
- Stores session logs with metrics
- Tracks progress across modules/topics
- Documents notes, flashcards, anchors
- Records strengths, weaknesses, calibration data

**SCHOLAR (Analysis Agent)**
- Reviews all material: SOP, logs, learning patterns
- Identifies gaps in the system
- Researches improvements (learning science, new methods)
- Proposes changes that feed back into Tutor

**The Goal:** A constantly evolving system where each study session generates data that improves future sessions.

---

## THE PROBLEM WE IDENTIFIED

The SOP works **once material is ready to learn**. But there's a gap:

> "I sit down and don't know where to begin. I spend all my time gathering material or writing stuff down but it doesn't stick."

**What's missing:**
1. **Material Ingestion Protocol** — How to go from raw course content to ready-to-study material
2. **Session Start Checklist** — Dead simple steps when you sit down lost
3. **Progress Tracking** — So you don't lose your place and restart from the same spot

**The current SOP covers:**
- ✅ How to learn once you have material
- ✅ Learning principles and techniques
- ✅ Session phases and modes
- ✅ Metrics and logging

**The current SOP does NOT cover:**
- ❌ How to prepare material before studying
- ❌ What to extract from LOs, slides, videos, textbook
- ❌ How to organize raw content into learnable chunks
- ❌ Quick-start when you're lost
- ❌ Tracking progress across sessions

---

## CURRENT STATE

### Your Workflow (What Works)
1. Materials loaded into **NotebookLM** as source of truth
2. **Learning Objectives** guide what to study
3. Tutor asks for material, you fetch from NotebookLM
4. SOP protocols work once in the flow

### Your Typical Source Materials
- Learning Objectives (from syllabus)
- PowerPoint slides
- Recorded videos/lectures
- Textbook chapters

### What Breaks Down
1. **Getting started** — Sit down, don't know where to begin
2. **Material prep** — No clear process for what to extract
3. **Progress tracking** — Lose your place, restart from same spot
4. **Stickiness** — Write stuff down but it doesn't stick

---

## WHAT WE BUILT (This Session)

### 1. Consolidated the SOP Documentation

All scattered files (251+ legacy files) consolidated into one folder:

```
scholar/knowledge/MASTER_SOP/
├── 00_INDEX.md              — Master index of everything
├── 01_MASTER_OVERVIEW.md    — Complete system reference (492 lines)
├── 02_MODULES_M0-M6.md      — Detailed session phases (389 lines)
├── 03_SUPPLEMENTAL.md       — Troubleshooting, research, methods (784 lines)
├── 04_CONCEPTS_LIBRARY.md   — Learning principles by concept (858 lines)
├── 05_MATERIAL_INGESTION.md — TO BUILD
├── 06_SESSION_START.md      — TO BUILD
└── 07_PROGRESS_TRACKING.md  — TO BUILD
```

**Total documented: ~2,523 lines of organized content**

### 2. Created the Concepts Library

Reorganized all SOP content by **learning principle** instead of procedure:

| Part | Concepts |
|------|----------|
| **1. Encoding Strategies** | Dual coding, elaborative interrogation, generation effect, KWIK, NMMF |
| **2. Retrieval Strategies** | Testing effect, spaced retrieval, successive relearning, free vs cued recall |
| **3. Organization Strategies** | Chunking, hierarchical frameworks (H-series), mechanism frameworks (M-series), interleaving |
| **4. Metacognition** | Calibration, cognitive load, stuck detection, desirable difficulties |
| **5. Memory Techniques** | Phonetic hooks, visual-spatial encoding, contrastive hooks, hook quality |
| **6. Session Design** | Planning, fading, wrap/consolidation, mode selection |
| **7. Evidence Summary** | What's well-cited vs heuristic |

Each concept includes:
- What it is (definition)
- Why it works (evidence)
- How to apply it (tactics)
- Pitfalls (common mistakes)
- Research pointers (to expand)

### 3. Cleaned Up Legacy Files

**Deleted:**
- `sop/archive/` — 251 legacy files (content extracted first)
- `v9.2/` root folder — superseded by v9.3
- `dist/` folder — old exports

**Preserved:**
- `sop/src/` — canonical v9.3 source files
- `sop/examples/` — dialogue examples
- `sop/runtime/` — deployment files
- `gpt_bundle_v9.3/` — production GPT files

---

## WHAT STILL NEEDS TO BE BUILT

### 05_MATERIAL_INGESTION.md
**Purpose:** How to go from raw course content to ready-to-study material

Should cover:
- Starting with Learning Objectives
- What to extract from slides (key terms, diagrams, relationships)
- What to extract from videos (concepts, demonstrations)
- What to extract from textbook (definitions, mechanisms, clinical ties)
- How to organize into learnable chunks
- What format to hand to the Tutor
- Time limits (so you don't spend all your time here)
- NotebookLM workflow integration

### 06_SESSION_START.md
**Purpose:** Dead simple checklist when you sit down lost

Should cover:
- Where did I leave off? (check progress tracker)
- What's my target today? (pick from LOs)
- Do I have the material ready? (yes → go / no → ingestion protocol)
- What mode? (new material = Core, review = Sprint, weak spot = Drill)
- Go. (hand material to Tutor)

### 07_PROGRESS_TRACKING.md
**Purpose:** Track where you are so you don't restart from the same spot

Should cover:
- Module / Topic / LO tracking
- Status levels: Not started → In progress → Need review → Solid
- Last session date per topic
- Next action per topic
- Simple format (so you actually use it)

---

## THE COMPLETE SYSTEM (Once Built)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STUDY SESSION FLOW                                 │
│                                                                              │
│  ┌──────────────────┐                                                       │
│  │ 1. SIT DOWN      │  "I don't know where to start"                        │
│  └────────┬─────────┘                                                       │
│           ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 2. CHECK PROGRESS│  → 07_PROGRESS_TRACKING                               │
│  │    TRACKER       │  "Where did I leave off?"                             │
│  └────────┬─────────┘                                                       │
│           ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 3. PICK TARGET   │  → Learning Objectives                                │
│  │    (from LOs)    │  "What am I learning today?"                          │
│  └────────┬─────────┘                                                       │
│           ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 4. MATERIAL      │  → 05_MATERIAL_INGESTION                              │
│  │    READY?        │                                                       │
│  └────────┬─────────┘                                                       │
│           │                                                                  │
│     ┌─────┴─────┐                                                           │
│     ▼           ▼                                                           │
│   [YES]       [NO]                                                          │
│     │           │                                                           │
│     │     ┌─────▼─────────┐                                                 │
│     │     │ RUN INGESTION │  Extract from slides/videos/textbook            │
│     │     │ PROTOCOL      │  Organize into chunks                           │
│     │     │ (≤15 min)     │  Format for Tutor                               │
│     │     └─────┬─────────┘                                                 │
│     │           │                                                           │
│     └─────┬─────┘                                                           │
│           ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 5. HAND TO TUTOR │  → 06_SESSION_START checklist                         │
│  │    + SELECT MODE │  Core / Sprint / Drill / Light                        │
│  └────────┬─────────┘                                                       │
│           ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 6. TUTOR RUNS    │  → 01_MASTER_OVERVIEW (SOP)                           │
│  │    SOP           │  → 02_MODULES_M0-M6                                   │
│  │                  │  → 04_CONCEPTS_LIBRARY                                │
│  └────────┬─────────┘                                                       │
│           ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 7. WRAP + LOG    │  Exit ticket, cards, metrics                          │
│  │                  │  Update progress tracker                              │
│  └────────┬─────────┘                                                       │
│           ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 8. BRAIN STORES  │  Session log → Brain database                         │
│  │    SESSION       │  Cards → Anki                                         │
│  └────────┬─────────┘                                                       │
│           ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 9. SCHOLAR       │  Reviews logs, identifies patterns                    │
│  │    ANALYZES      │  Proposes improvements                                │
│  └────────┬─────────┘                                                       │
│           ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 10. SYSTEM       │  Updates feed back into Tutor                         │
│  │     IMPROVES     │  Cycle continues                                      │
│  └──────────────────┘                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## KEY PRINCIPLES (From Concepts Library)

### The Non-Negotiables

1. **Generation over reception** — You create hooks, not accept them
2. **Retrieval over re-reading** — Test yourself, don't just review
3. **Function before structure** — Know what it DOES before memorizing what it IS
4. **Spacing over massing** — Distributed practice beats cramming
5. **Calibration matters** — Track confidence vs actual performance

### The Core Mechanisms

| Mechanism | What It Does |
|-----------|--------------|
| **Seed-Lock** | User must supply hook before AI builds |
| **Gated Platter** | AI offers raw metaphor, user must edit |
| **Level Gating** | Must teach-back at L2 before L4 clinical detail |
| **KWIK Flow** | Sound → Function → Image → Resonance → Lock |
| **Active Recall Gate** | No topic "covered" without retrieval attempt |

### The Evidence Base

| Principle | Effect Size | Source |
|-----------|-------------|--------|
| Testing > restudy | g≈0.5-0.7 | Roediger & Karpicke 2006 |
| Spacing > massing | d≈0.6 | Cepeda et al. 2006 |
| Interleaving | g≈0.4 | Brunmair & Richter 2019 |
| Self-explanation | g≈0.55 | Bisra 2018 |
| Pre-testing | g≈0.54 | St. Hilaire 2024 |

---

## NEXT STEPS

### Immediate (To Complete the System)
1. ☐ Build `05_MATERIAL_INGESTION.md` — Solve the "where do I start" problem
2. ☐ Build `06_SESSION_START.md` — Quick-start checklist
3. ☐ Build `07_PROGRESS_TRACKING.md` — Don't lose your place

### Short-Term (Testing & Refinement)
4. ☐ Test the ingestion protocol with real course material
5. ☐ Test the full flow: Ingestion → Tutor → Brain → Scholar
6. ☐ Identify friction points and iterate

### Medium-Term (Scholar Integration)
7. ☐ Define what Scholar looks for in session logs
8. ☐ Define how Scholar proposes improvements
9. ☐ Build the feedback loop from Scholar → Tutor

### Long-Term (Automation)
10. ☐ Automate progress tracking updates
11. ☐ Automate spaced review scheduling
12. ☐ Dashboard for visualizing progress/gaps

---

## FILE LOCATIONS

### Scholar Knowledge (For Scholar to Review)
```
C:\pt-study-sop\scholar\knowledge\
├── MASTER_SOP\
│   ├── 00_INDEX.md
│   ├── 01_MASTER_OVERVIEW.md
│   ├── 02_MODULES_M0-M6.md
│   ├── 03_SUPPLEMENTAL.md
│   ├── 04_CONCEPTS_LIBRARY.md
│   └── (05, 06, 07 to be built)
├── INDEX.md
├── log_analysis.md
└── pedagogy_audit.md
```

### Canonical SOP Source (For Development)
```
C:\pt-study-sop\sop\src\
├── modules\        — M0-M6 protocols
├── frameworks\     — H/M/Y series, PEIRRO, KWIK, levels
├── engines\        — Anatomy, Concept engines
├── templates\      — Exit ticket, intake, logging
├── evidence\       — Research notes, citations
└── workload\       — 3+2 rotation
```

### Production GPT Files
```
C:\pt-study-sop\gpt_bundle_v9.3\
├── 1_Project_Files\
├── 2_Instructions\
└── 3_Prompts\
```

---

## SUMMARY

**What we accomplished:**
- Consolidated 251+ legacy files into organized MASTER_SOP folder
- Created Concepts Library organizing principles by learning concept
- Identified the gap: Material Ingestion (pre-study phase)
- Documented the complete vision and roadmap

**What's next:**
- Build Material Ingestion Protocol (the missing piece)
- Build Session Start Checklist
- Build Progress Tracking Template
- Test the complete flow

**The end state:**
A study system where you sit down, know exactly where to start, prepare material efficiently, learn with evidence-based methods, track your progress, and continuously improve based on data.

---

*This document lives at: `C:\pt-study-sop\PROJECT_OVERVIEW.md`*
*Last updated: January 2026*
