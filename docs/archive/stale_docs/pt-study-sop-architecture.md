# PT Study SOP — Hierarchical Breakdown

> Legacy hierarchical breakdown. Canonical v2 domain primitives + learning loop: `docs/root/ARCHITECTURE_V2.md`.
> Terminology note: prefer LearningModule vs CourseModule as defined in `docs/root/ARCHITECTURE_V2.md`.

## LEVEL 1: System Vision (North Star)
```
PT STUDY OS
├─ Durable Context (remembers across sessions)
├─ End-to-End Study Flows (MAP → LOOP → WRAP)
├─ RAG-First, Citation-First (grounded in learner's materials)
├─ Spaced, High-Quality Anki Cards (source-tagged, deduplicated)
├─ Deterministic Logging (every session produces a ledger)
└─ No Phantom Outputs (if it didn't happen, we don't invent it)
```

---

## LEVEL 2: Lifecycle Phases (Session-Level)
```
SESSION LIFECYCLE
├─ MAP (Planning & Entry)
│  ├─ M0: Planning
│  │  ├─ Target (exam/block/time)
│  │  ├─ Sources (source-lock)
│  │  ├─ Plan (3-5 steps)
│  │  ├─ Interleave (weak anchors from prior)
│  │  └─ Pre-test
│  └─ M1: Entry
│     ├─ State check (focus 1-10)
│     ├─ Scope check (topic, materials, time)
│     └─ Mode selection (Core/Sprint/Light/Quick Sprint/Drill)
│
├─ LOOP (Active Learning)
│  ├─ M2: Prime (Map Territory)
│  │  ├─ H1 Scan (system > subsystem > component > element)
│  │  ├─ Bucket (2-4 groups)
│  │  └─ Select first bucket to encode
│  │
│  ├─ M3: Encode (Attach Meaning)
│  │  ├─ KWIK Flow (Sound → Function → Image → Resonance → Lock)
│  │  ├─ Dual Coding (words + visuals)
│  │  └─ Active Ingestion (Cornell notes, elaboration)
│  │
│  ├─ M4: Build (Practice & Transfer)
│  │  ├─ L2 Teach-back (gate: must pass before L4)
│  │  ├─ Progressive Ladder (Guided → Faded → Independent → Interleaved)
│  │  └─ Capture all misses
│  │
│  └─ M5: Modes (M2-M4 behavior modulator)
│     ├─ Core (guided + scaffolds)
│     ├─ Sprint (test-first)
│     ├─ Light (micro-session)
│     ├─ Quick Sprint (20-30 min)
│     └─ Drill (repeated misses on one concept)
│
└─ WRAP (Close & Schedule)
   ├─ M6: Wrap (Lite v9.4)
   │  ├─ Exit Ticket
   │  │  ├─ Free recall blurt
   │  │  ├─ Muddiest point
   │  │  └─ Next action hook
   │  ├─ Session Ledger
   │  │  ├─ session_date
   │  │  ├─ covered
   │  │  ├─ not_covered
   │  │  ├─ weak_anchors
   │  │  ├─ artifacts_created
   │  │  └─ timebox_min
   │  └─ NO spacing schedule (handled by Dashboard/Planner)
   │
   └─ Post-Session Progress Tracking
      └─ Update tracker (status, last session, next review)
```

---

## LEVEL 3: Learning Cycle (Cognitive Framework)

### PEIRRO (Macro - Session-Level)
```
PEIRRO CYCLE (6 phases)
├─ Prepare (M0-M1: MAP align)
├─ Encode (M3: attach meaning via KWIK)
├─ Interrogate (M3-M4: question & explain why/how)
├─ Retrieve (M4-M5: effortful recall)
├─ Refine (M6: WRAP - correct errors)
└─ Overlearn (M6: spaced recall beyond mastery)
```

### KWIK (Micro - Encoding-Level, runs inside PEIRRO Encode)
```
KWIK FLOW (5 steps per hook)
├─ Sound (phonetic seed)
├─ Function (true function/action)
├─ Image (imagery tied to function)
├─ Resonance (learner approval "feels right")
└─ Lock (record as card/log)

CONSTRAINTS:
├─ Function before Image (gate: word+meaning before imagery)
├─ Seed-Lock (learner attempts first; ask-first rule)
└─ Never skip resonance or lock steps
```

---

## LEVEL 4: Content Engines (What to Teach)

### Anatomy Engine (regional/spatial anatomy)
```
ANATOMY ENGINE SEQUENCE
├─ Bones (scaffold: what structures exist)
├─ Landmarks (attachment points: where things connect)
├─ Attachments (map: which muscles connect where)
├─ Actions (logic: what muscles do)
├─ Nerves (wiring: what controls each muscle)
├─ Arterial Supply (blood supply)
└─ Clinical (application: what happens when things fail)

RULES:
├─ Bone-first attachment loop (visual > spatial > attachments)
├─ Landmark Pass before OIANA+ details
└─ Rollback on recall failure (visual → attachments → re-layer)
```

### Concept Engine (abstract/non-spatial topics)
```
CONCEPT ENGINE SEQUENCE
├─ Definition (L2 plain-language)
├─ Context (place in hierarchy)
├─ Mechanism (input > process > output)
├─ Differentiation (near neighbor comparison)
└─ Application (one problem/case)

RULES:
├─ Generation-first (ask learner first)
├─ Keep concise (6 bullets or 2 paragraphs max)
└─ L2 teach-back gate before L4 detail
```

---

## LEVEL 5: Content Rules (How to Teach)

```
SOURCE-LOCK (Invariant)
├─ All factual teaching grounded in learner's materials
├─ NotebookLM Source Packet required for teaching
└─ If offline: mark as UNVERIFIED

SEED-LOCK (Ask-First)
├─ Learner attempts hooks first
└─ AI only offers mnemonics if learner requests help

FUNCTION BEFORE STRUCTURE
├─ Teach what (function) before how (structure)
└─ L2 teach-back GATE before L4 detail

NO PHANTOM OUTPUTS (Invariant)
├─ If step didn't happen, output NOT DONE / UNKNOWN
└─ Never invent missing data

PEIRRO CYCLE ENFORCEMENT
├─ All sessions follow Prepare → Encode → Interrogate → Retrieve → Refine → Overlearn
└─ No skipping phases

LEVEL GATING
├─ L2 (teach-back / own words) must pass BEFORE L4 (detailed mechanisms)
└─ Recall failure → rollback to prior level
```

---

## LEVEL 6: System Components (Architecture)

```
TUTOR SYSTEM (Custom GPT)
├─ Receives: NL study requests
├─ Enforces: M0-M6 flow, PEIRRO, KWIK, content engines
└─ Outputs: Exit Ticket + Session Ledger (text, not JSON)

RAG SUBSYSTEM
├─ Accepts: learner materials (slides, notes, textbooks)
├─ Indexes: text chunks + image captions + metadata
└─ Returns: snippets + citations (source-lock compliance)

BRAIN (DB + Ingestion)
├─ Input: Session Ledgers from tutor (text)
├─ Produces: Structured JSON logs (via ingestion prompts)
├─ Stores: session logs, progress tracking, resume data
└─ Dashboard: readiness, coverage, spacing, calibration

ANKI BRIDGE
├─ Input: Card artifacts from tutor
├─ Operations: add/update cards, dedupe by deck+guid
├─ Output: source-tagged cards in Anki Desktop
└─ Rules: dedupe, offline fallback, source tagging

PLANNER / DASHBOARD
├─ Input: Session logs (from Brain)
├─ Outputs: coverage maps, spacing alerts, readiness scores, weekly plans
└─ Handles: spacing schedule (NOT the tutor)

CALENDAR SYNC (design only, lowest priority)
└─ Future: integrate Google Calendar for study reminders
```

---

## LEVEL 7: Data Schemas (Contracts)

### Session Log v9.4
```
FIELDS (additive only)
├─ Tracker: date, topic, mode, duration_min, understanding, retention, calibration_gap, rsr_percent, cognitive_load, transfer_check, anchors, what_worked, what_needs_fixing, error_classification, error_severity, error_recurrence, notes
└─ Enhanced: source_lock, plan_of_attack, frameworks_used, buckets, anki_cards, exit_ticket, weak_anchors, artifacts_created, spaced_reviews

JSON OUTPUT
├─ Produced: via Brain ingestion (NOT tutor at Wrap)
└─ Format: deterministic, schema-conformant, backward-compatible
```

### RAG Document v1
```
├─ id, source_path, course, module, doc_type, created_at, checksum
├─ text_chunks[], image_captions[], metadata{}
└─ Rule: Function-first definitions in glossary
```

### Card v1
```
├─ deck, guid, front, back, tags[], source_refs[], created_at, updated_at
└─ Rule: source-tagged, deduplicated by deck+guid
```

### Resume v1
```
├─ generated_at, readiness_score, recent_sessions[]
├─ topic_coverage[], gaps[], recommendations[]
└─ Input: session logs from Brain
```

---

## LEVEL 8: Operating Modes (Session-Level Behavior)

```
MODE: Core (default for new material)
├─ Tutor guides through Prime > Encode > Build
├─ Full scaffolding, metaphors, examples
└─ Pacing: 30-60 min sessions

MODE: Sprint (test-first, exam prep)
├─ Tutor tests first, teaches only on miss
├─ Rapid-fire gap-finding
└─ Pacing: 30-60 min sessions

MODE: Light (micro-session)
├─ One tiny objective
├─ 1-3 cards
└─ Pacing: 10-15 min

MODE: Quick Sprint (time-boxed)
├─ Sprint compressed to 20-30 min
├─ Mandatory wrap cards
└─ Pacing: 20-30 min hard stop

MODE: Drill (repeated misses on one concept)
├─ Learner leads reconstruction
├─ AI spots gaps
└─ Deep practice on weak anchor
```

---

## LEVEL 9: Pre-Session Material Ingestion

```
MATERIAL INGESTION (if needed, 15 min timebox)
├─ Step 1: Select 1-3 LOs
├─ Step 2: Source-lock (exact slides, pages, timestamps)
├─ Step 3: Quick scan (headings, figures, summaries) → draft 2-4 buckets
├─ Step 4: Extract (definitions, key mechanisms, 1 example + 1 boundary)
├─ Step 5: Capture 1 diagram/figure with labels
├─ Step 6: Draft 5-10 retrieval prompts
└─ Step 7: Format into Tutor-Ready Packet

TUTOR-READY PACKET (MVP)
├─ LOs, source-lock list, buckets, glossary
├─ Key mechanisms, diagram, retrieval prompts
├─ Confusions/boundary cases
└─ Input to: M0 Planning
```

---

## LEVEL 10: Weekly Planning & Spacing (Dashboard/Planner)

```
WEEKLY ROTATION (3+2 interleaving)
├─ Study 3 classes (1 session each)
├─ Then review 2 weakest anchors (spaced recall)
└─ Repeat

PROGRESS TRACKER (per topic)
├─ Module / Topic / LO
├─ Status: Not started → In progress → Needs review → Solid
├─ Last session date, next action, source-lock pointer, next review date
├─ Rule: Solid = retrieval success on 2 separate sessions

WEEKLY REVIEW (10 min)
├─ Scan "Needs review" rows
├─ Pick 1-2 to interleave next week
└─ Update spacing dates
```

---

## LEVEL 11: Evidence Guardrails (What NOT to Claim)

```
EVIDENCE NUANCE RULES (prevent overclaiming)
├─ Forgetting curves: Never state numeric claims unless citing specific study
├─ Dual coding: helpful heuristic, never claim "2x" guarantee
├─ Zeigarnik effect: Not reliable; use next-action hook for friction only
├─ RSR thresholds: Adaptive, not fixed; don't state "85%" universal
└─ Interleaving: Best for discrimination within class; 3+2 is distributed practice across classes

NO-SKIP RULES (Summary)
1. M0 Planning (target + sources + plan + pre-test)
2. Source-Lock (grounded or marked UNVERIFIED)
3. Seed-Lock ask-first (learner attempts first)
4. Level gating (L2 before L4)
5. PEIRRO cycle stages (no jumping)
6. Exit Ticket at Wrap
7. Session Ledger at Wrap
8. No Phantom Outputs
9. Evidence nuance guardrails
10. Interleaving check of prior weak anchors during M0
```

---

## CONNECTIVITY MAP (Data Flow)

```
LEARNER
  ↓ (paste materials + study request)
MATERIAL INGESTION (if needed) → TUTOR-READY PACKET
  ↓
TUTOR (Custom GPT)
  ├─ Enforces: M0-M6, PEIRRO, KWIK, content engines
  ├─ Queries: RAG subsystem (source-lock)
  ├─ Creates: Anki cards (via card bridge)
  └─ Outputs: Exit Ticket + Session Ledger (text)
    ↓
BRAIN (Ingestion & Storage)
  ├─ Ingests: Session Ledgers (via ingestion prompts → JSON)
  ├─ Produces: Resume (readiness, gaps, recommendations)
  └─ Stores: session logs, progress tracker
    ↓
DASHBOARD / PLANNER
  ├─ Reads: session logs, progress tracker
  ├─ Produces: coverage maps, spacing alerts, weekly plans
  └─ Outputs: next session recommendations

ANKI DESKTOP
  ├─ Input: cards from tutor (via bridge)
  ├─ User reviews cards on spacing schedule
  └─ Sync back to Brain (optional, low priority)

OBSERVER / LEARNER
  └─ Reads: Dashboard, Resume, Session Ledgers
```

---

# Summary: 11-Level Hierarchy

| Level | Focus | Key Entities |
|-------|-------|--------------|
| 1 | **Vision** | Durable context, end-to-end flows, RAG-first, spaced cards, deterministic logging, no phantom outputs |
| 2 | **Lifecycle** | M0-M6 phases, MAP/LOOP/WRAP, mode selection |
| 3 | **Cognitive** | PEIRRO (6 phases), KWIK (5 steps) |
| 4 | **Content** | Anatomy Engine (OIANA+), Concept Engine (5-step) |
| 5 | **Rules** | Source-Lock, Seed-Lock, Function-First, No Phantoms, Level Gating |
| 6 | **Components** | Tutor, RAG, Brain, Anki Bridge, Planner, Calendar |
| 7 | **Schemas** | Session Log v9.4, RAG Doc v1, Card v1, Resume v1 |
| 8 | **Modes** | Core, Sprint, Light, Quick Sprint, Drill |
| 9 | **Ingestion** | Material prep, Tutor-Ready Packet |
| 10 | **Spacing** | Weekly rotation (3+2), progress tracker, weekly review |
| 11 | **Guardrails** | Evidence nuance, no-skip rules |
