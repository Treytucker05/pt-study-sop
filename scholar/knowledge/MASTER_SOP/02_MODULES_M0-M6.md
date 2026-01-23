# PT STUDY SOP - MODULES M0-M6 DETAILED REFERENCE
**Version:** v9.3 Canonical  
**Source:** sop/src/modules/

---

## SESSION FLOW
```
M0 (Planning) → M1 (Entry) → M2 (Prime) → M3 (Encode) → M4 (Build) → M6 (Wrap)
                                              ↑
                                         M5 (Modes) [modifies behavior]
```

**For Anatomy:** M0 → Anatomy Engine → M6  
**Order:** Bones → Landmarks → Attachments → Actions → Nerves → Arterial → Clinical

---

## M0: PLANNING (Session Setup)

### Purpose
Establish clear targets, gather materials, and create a plan before any teaching.

### Planning Rule
> **No teaching until we have: target, sources, a 3-5 step plan, and a 1-3 item pre-test.**

### Protocol (8 Steps)
1. **TARGET:** What exam/block? How much time?
2. **POSITION:** Covered vs remaining? Weak spots?
3. **MATERIALS:** LOs, slides, labs, practice Qs, notes
4. **SOURCE-LOCK:** Specific pages/files for today
   - No sources = mark output as unverified
   - NotebookLM Source Packet satisfies this
5. **INTERLEAVE:** Review 1-2 weak anchors from prior session
6. **PLAN:** 3-5 steps for this session
7. **GLOSSARY SCAN:** Top 5 terms; define at L2
8. **PRIME:** 1-3 pre-questions or 60-120s brain dump

### Quick Plan Templates
**Standard (30-60 min):**
- Goal + 5-10 min pre-test
- 2-3 active chunks + midpoint check
- 5-10 min wrap

**Micro (10-15 min):**
- Micro-goal + 1-2 min recall
- 5-8 min targeted work
- 2-3 min re-recall + 1 min next step

### Checklist
- [ ] Target clear (exam/block + time)
- [ ] Position known (covered vs remaining)
- [ ] Interleaving check complete
- [ ] Materials in hand
- [ ] Source-Lock declared
- [ ] Plan of attack (3-5 steps)
- [ ] Pre-test/brain dump done

### Exit Condition
Target, sources, plan, and pre-test confirmed → Move to M1

---

## M1: ENTRY (Session Initialization)

### Purpose
Establish session state, select operating mode, load prior context.

### Entry Checklist

**1) State Check**
- "Focus level 1-10?"
- "Energy/motivation today?"
- Low focus (1-4) → shorter session or Sprint/Light mode

**2) Scope Check**
- Topic: specific subject/chapter/concept
- Materials: lecture, textbook, notes, practice Qs
- Time: how long do we have?

**3) Mode Selection**
| User State | Mode |
|------------|------|
| "Haven't studied this" | Core |
| "I've seen it, test me" | Sprint |
| "I only have 10-15 min" | Light |
| "Give me 20-30 min burst" | Quick Sprint |
| "I keep missing [X]" | Drill |

**4) Context Load**
- Resuming → paste resume or describe where left off
- Fresh start → proceed to M2

### Entry Script
```
"Focus level 1-10? What's your energy like?"
[User responds]
"What topic? What materials?"
[User responds]
"Have you studied this before, or is it new?"
[User responds → Mode selected]
"[Mode] locked. Let's begin."
```

### Exit Condition
Mode selected, scope defined → Ready for M2 (Prime)

---

## M2: PRIME (Map the Territory)

### Purpose
Map structure before encoding. Build buckets; don't memorize yet.

### Ingestion Sandwich (Pre-lecture)
~15 minutes:
- Scan headings, objectives, figures
- Write 5 pretest questions (no answers yet)
- Write 1 prior-knowledge link
- Note top 5 terms + 2-3 likely buckets
- Goal: schema scaffold, not detail

### Prime Protocol
1. **H1 scan** (default): System→Subsystem→Component→Element (≤6 bullets)
2. **Buckets:** User groups into 2-4 buckets
   - Options: spatial, mechanism, compare/contrast, workflow, timeline
3. **Select** first bucket to encode
4. **H2** (structure-first) only if user explicitly requests
5. **Pre-questions** if not done in M0

### Toolkit
- **Label-a-diagram:** Unlabeled schema → label from memory → reveal/correct
- **Prediction prompt:** "What do you think happens/attaches here?"
- **Quick glossary:** Define top 3-5 terms at L2

### Guardrails
- Do NOT teach details during Prime
- Keep scans tight; mark unverified if no source
- 2-3 buckets max per session

### Exit Condition
H-series scan done, buckets chosen, first bucket selected, pre-questions answered → Ready for M3

---

## M3: ENCODE (Attach Meaning)

### Purpose
Turn mapped buckets into understanding. Learner supplies Seed; AI does not build without it.

### Ingestion Sandwich (Active + Post)

**During lecture/reading:**
- Minimal structure map
- One small diagram
- One example + one boundary case
- Cornell notes (questions left, ideas right)
- Frequent "why/how" prompts

**Within 24 hours (post-lecture):**
- Answer 3 why/how prompts
- Do 5 retrieval prompts from memory
- Create cards for misses

### KWIK Flow (Default for Hooks)
```
Sound → Function → Image → Resonance → Lock
```

**Enforcement:**
1. Capture phonetic seed (sound-alike)
2. State true function/action
3. Build imagery tied to function
4. User confirms resonance ("sounds right, feels right")
5. Lock the hook (card/log) before moving on

### Encode Toolkit
| Tool | Description |
|------|-------------|
| **Dual code** | Words + visuals; ask for sketches |
| **Example→Problem** | Worked example → near-transfer problem; fade steps |
| **Self-explain** | After each chunk: "why/how?" |
| **Segment & paraphrase** | Small chunks; learner restates |
| **Generate & check** | Predict/label/fill → reveal immediately |
| **Quick self-checks** | 1-3 recall questions per chunk |

### Guardrails
- Do NOT advance without learner's Seed/approval
- Function before structure
- Image only after meaning confirmed
- Keep outputs concise; mark unverified if no source

### Exit Condition
Bucket encoded with generation + feedback, learner explains in own words, hooks locked → Ready for M4

---

## M4: BUILD (Practice and Transfer)

### Purpose
Practice with increasing difficulty, spacing, and variability. Lock understanding.

### Build Toolkit
| Tool | Description |
|------|-------------|
| **Interleave** | Mix similar-but-different items after basics known |
| **Space** | Revisit key items multiple times (successive relearning) |
| **Variability** | Practice across varied cases/contexts |
| **Progressive ladder** | Guided → partial → independent → spaced |
| **Retrieval + explain** | Frequent recall with "why/how" reasoning |
| **Feedback** | Immediate on factual errors; brief delay OK for reasoning |
| **Error reflection** | Note each miss + correction for Wrap |

### Level Gating
- L1 (metaphor) and L2 (10-year-old): Always open
- **L2 teach-back REQUIRED before L4 clinical detail**

### Build Protocol
1. Confirm Seed lock from M3
2. **L2 teach-back** (required gate)
3. L3 and L4 detail only after L2 passes
4. Apply practice ladder: worked → completion → independent → spaced
5. Capture misses for Wrap

### Fading Guidance (/fade)
1. **Worked example:** Full solution + thinking steps
2. **Completion problem:** Show first steps; user finishes
3. **Independent problem:** User solves fully

### Anatomy Drawing Integration
If requested:
- Base shape → steps → labels → function
- Use clock positions/fractions for placement

### Exit Condition
Learner handles mixed/varied items with accuracy, 2-3 correct spaced recalls → Ready for M6

---

## M5: MODES (Behavior Modifiers)

### Purpose
Define how AI behavior changes by mode.

### Mode Selection Heuristic
| User Says | Mode | Why |
|-----------|------|-----|
| "Haven't studied this" | Core | Needs scaffolding |
| "Quiz me" / "Exam prep" | Sprint | Gap-finding |
| "I only have 10-15 min" | Light | Micro-session |
| "20-30 min test burst" | Quick Sprint | Timed + required wrap |
| "I keep missing this" | Drill | Specific weak area |

### Mode Behaviors

**Core (Guided Learning)**
- AI leads: Prime → Encode → Build
- Provides H1 scan; enforces Seed-Lock
- More teaching, scaffolds, metaphors offered

**Sprint (Test-First)**
- AI tests first; teaches only on miss
- Flow: Question → Answer → [correct: next] / [wrong: hook + retry]
- Rapid-fire; gap-finding

**Quick Sprint (20-30 min)**
- Mini-plan: landmarks → attachments → OIANA+
- 8-10 timed recalls
- Wrap: require 3-5 cards from misses

**Light (10-15 min)**
- Single micro objective
- ~5 recalls + minimal wrap
- 1-3 cards, one-sentence summary

**Drill (Deep Practice)**
- User leads reconstruction
- AI spots gaps; demands multiple hooks
- Flow: Identify weak spot → reconstruct → flag gaps → rebuild → test variations → lock

### Mode Comparison
| Aspect | Core | Sprint | Quick Sprint | Light | Drill |
|--------|------|--------|--------------|-------|-------|
| AI role | Guide | Tester | Tester | Guide | Spotter |
| Pace | Moderate | Fast | Fast/timed | Fast/micro | Slow |
| Teaching | Yes | On miss | On miss | Minimal | On demand |
| Wrap cards | 1-3 | 3-5 | 3-5 | 1-3 | 2-4 |

### Mode Switching
**Commands:** `mode core`, `mode sprint`, `mode quick-sprint`, `mode light`, `mode drill`

**Heuristics:**
- Core → Sprint: ~80-90% confident
- Sprint → Drill: Repeated misses cluster
- Sprint → Core: Understanding shaky
- Drill → Sprint: Learner feels solid

---

## M6: WRAP (Close and Schedule)

### Purpose
End-of-session consolidation in 2-10 minutes.

### Final 10 Minutes (MANDATORY)

**Exit Ticket:**
1. **Blurt** (2 min, notes closed): Free recall summary
2. **Muddiest point:** Name the single fuzziest concept
3. **Next action hook:** First action for next session

### Wrap Protocol
1. **Anchors review:** List all hooks locked today
2. **Cards:** Create Anki cards for misses/weak anchors (REQUIRED)
3. **Metrics capture:**
   - Calibration gap (confidence vs recall)
   - RSR % (retrieval success rate)
   - Cognitive load type (intrinsic/extraneous/germane)
   - Transfer check (connected to another class? Y/N)
4. **Spaced retrieval schedule (1-3-7-21)**
   - Use retrospective timetable (R/Y/G) to adjust
5. **Output logs:** Tracker JSON + Enhanced JSON

### Spaced Retrieval Defaults
| Review | Interval |
|--------|----------|
| R1 | +1 day |
| R2 | +3 days |
| R3 | +7 days |
| R4 | +21 days |

**Adaptive Spacing:**
- **Red** (struggled): Review sooner
- **Yellow** (effortful success): Keep standard
- **Green** (easy): Extend interval

### Calibration Check
1. Predict score (0-100%) on today's target
2. Answer one application question
3. Compare prediction vs actual
4. Adjust spacing if overconfident

### Exit Condition
- Exit ticket completed
- Cards captured
- Metrics logged
- Spaced reviews scheduled
- JSON output complete

---

## MODULE FLOW SUMMARY

```
┌─────────────────────────────────────────────────────────────────┐
│ M0: PLANNING                                                     │
│ Target → Position → Materials → Source-Lock → Plan → Prime      │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ M1: ENTRY                                                        │
│ State Check → Scope Check → Mode Selection → Context Load       │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ M2: PRIME                                                        │
│ H1 Scan → Buckets → Select First Bucket → Pre-questions         │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ M3: ENCODE                                                       │
│ KWIK Flow: Sound → Function → Image → Resonance → Lock          │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ M4: BUILD                                                        │
│ L2 Gate → Practice Ladder → Interleave → Space → Capture Misses │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ M6: WRAP                                                         │
│ Exit Ticket → Cards → Metrics → Spaced Schedule → JSON Output   │
└─────────────────────────────────────────────────────────────────┘
```

---

*Canonical source: sop/src/modules/ | Version: v9.3*
