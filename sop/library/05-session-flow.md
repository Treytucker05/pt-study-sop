# 05 Session Flow: Planning Through Wrap

A single linear walkthrough of a complete study session. For mode-specific behavior, see [06-modes.md](06-modes.md).

---

## Pre-Session: Material Ingestion

Run this when materials are new, scattered, or you feel lost. Timebox: 15 min (hard stop: 25 min).

**Protocol:**
1. Select 1-3 LOs that define session scope.
2. Source-lock: list exact slides, pages, timestamps.
3. Quick scan: headings, figures, summaries; draft 2-4 buckets.
4. Extract: definitions (function-first), key mechanisms, 1 example + 1 boundary case.
5. Capture 1 diagram/figure with labels.
6. Draft 5-10 retrieval prompts.
7. Format into a Tutor-Ready Packet and hand off.

**Tutor-Ready Packet:**
- LOs (numbered)
- Source-lock list (exact files/pages/timestamps)
- Buckets (2-4 groups)
- Glossary (function-first definitions)
- Key mechanisms (input > process > output)
- 1 diagram/figure with labels
- 5-10 retrieval prompts
- Confusions / boundary cases

**Triggers for ingestion:**
1. Materials are new/unseen.
2. Sources are scattered across multiple files.
3. You feel lost or underprepared.
4. Tutor requests a Source Packet and you don't have one.

**Source types:** Syllabus/LO docs, slides/handouts, lecture recordings, textbook chapters, lab/practical notes, practice questions. NotebookLM is the source of truth for raw materials.

**Timebox:** 15 min default, 25 min hard stop.

**NotebookLM Workflow:**
1. Upload source materials to NotebookLM.
2. Run the LLM extraction prompt (below).
3. Format output into a Tutor-Ready Packet.
4. Hand off to session.

**LLM Extraction Prompt:**
```
From my sources only: extract learning objectives, key definitions,
mechanisms/steps, differentiators, and 5-10 practice questions;
include citations.
```

**Guardrails:** No teaching during ingestion. Mark unsourced claims UNVERIFIED.

---

## 60-Second Quick Start

If you need to skip the full protocol:
1. Check progress tracker: last session + next action.
2. Pick 1 LO or micro-target.
3. Materials ready? Yes → proceed. No → run Material Ingestion (15 min).
4. Choose mode (Core/Sprint/Drill/Light/Quick Sprint).
5. Begin M1 Entry.

**If resuming:** Paste last session log, read progress tracker row, start with "Next action."

---

## M0: Planning

> No teaching until we have: target, sources, a 3-5 step plan, and a pre-test.

**Session Inputs Checklist:**
1. Target exam/block
2. Time available
3. Materials (LOs, slides, labs)
4. Source-lock list
5. Mode selection
6. Weak anchors to interleave
7. Pre-test items

**Confusables list:** Identify items likely to interfere with each other (similar names, overlapping actions, adjacent regions). Feed these to interleaving in M4.

**Retrospective upkeep:** Check the retrospective timetable for items due today. Roll any overdue items into this session's plan.

**Mode alignment:** Mode selected in M1 must match the learner's state. If focus is low (1-4), default to Light or Sprint. If material is new, default to Core.

**Source-lock guardrail:** No factual teaching without source-lock. If sources are missing, run Material Ingestion first.

**Steps:**
1. **Target** -- exam/block + time available.
2. **Position** -- covered vs remaining; known weak spots.
3. **Materials** -- LOs, slides, labs, practice Qs, notes.
4. **Source-Lock** -- specific pages/files for today. NotebookLM packet satisfies this.
5. **Interleave** -- review 1-2 weak anchors from prior Wrap Watchlist.
6. **Plan** -- 3-5 steps.
7. **Glossary Scan** -- top 5 terms defined at L2.
8. **Prime** -- 1-3 pre-questions or 60-120s brain dump.

**Method Chain Selection (optional):**
If using Composable Methods (see `15-method-library.md`), select or build a chain during M0. The chain determines which method blocks run in M1–M5.

**Quick Plan Templates:**

| Format | Flow |
|--------|------|
| Standard (30-60 min) | Goal + 5-10 min pre-test + 2-3 active chunks + midpoint check + 5-10 min wrap |
| Micro (10-15 min) | Micro-goal + 1-2 min recall + 5-8 min work + 2-3 min re-recall + 1 min next step |

**Exit:** Target, sources, plan, and pre-test confirmed.

---

## M1: Entry

**Entry Script (verbatim):**
> "Welcome back. Before we begin:
> 1. Focus level (1-10)?
> 2. What topic and materials today?
> 3. How much time do you have?
> 4. Resuming a prior session? If yes, paste the log."

**1) State Check** -- Focus 1-10, energy/motivation. Low focus (1-4) suggests shorter session or Light/Sprint mode.

**2) Scope Check** -- Topic, materials, time.

**3) Mode Selection:**

| Situation | Mode |
|-----------|------|
| New material | Core |
| Review / exam prep | Sprint |
| 10-15 min only | Light |
| 20-30 min test burst | Quick Sprint |
| Repeated misses on one thing | Drill |

For full mode descriptions, selection heuristics, and switching rules, see [06-modes.md](06-modes.md).

**4) Difficulty Calibration (opt-in):**

| Setting | Behavior |
|---------|----------|
| +1 Difficulty | Start one tier above comfort zone |
| Full Interleave | Mix all prior weak anchors into current session |
| Standard (default) | Normal progression |

**5) Context Load** -- Resuming: paste prior log. Fresh: proceed.

**Exit:** Mode selected, scope defined. Proceed to M2.

---

## M2: Prime (Map the Territory)

Build the structural map. Do not teach details yet.

**Protocol:**
1. **H1 Scan** -- System > Subsystem > Component > Element (6 bullets max).
2. **Bucket** -- learner groups into 2-4 buckets (spatial, mechanism, compare, workflow, etc.).
3. **Select** first bucket to encode.
4. **Pre-questions** if not done in M0 (1-3 Qs or 60-120s brain dump).

**Toolkit:** Label-a-diagram, prediction prompts, quick glossary (top 3-5 terms at L2).

**Guardrails:** Map only -- no detail. 2-3 buckets max per session. Mark unverified if no source.

**Exit:** Scan done, buckets chosen, first bucket selected, pre-questions answered and corrected.

---

## M3: Encode (Attach Meaning)

Turn buckets into understanding. Learner supplies the Seed; AI does not build without it.

**KWIK Flow (default for hooks):**
Sound > Function > Image > Resonance > Lock

1. Capture phonetic seed.
2. State true function/action.
3. Build imagery tied to function.
4. Learner confirms resonance.
5. Lock the hook (card/log).

**Toolkit:** Dual coding (words + visuals), example-then-problem pairs (faded), self-explain prompts, segment & paraphrase, generate & check, quick self-checks.

**Ingestion Sandwich (Active + Post Protocol):**
- **Active:** Cornell notes format — cue column + notes column. Write questions in cue column during encoding.
- **24hr protocol:** Within 24 hours of lecture, answer 3 why/how prompts from memory, do 5 retrieval prompts, create cards for misses.
- **Post-lecture elaboration:** Run prompts from `09-templates.md` section 8 (Why/How, Compare/Contrast, Predict/Apply, Teach-Back, Error Check).

**Desirable Difficulty (opt-in):**
- Generation before reception (attempt before reveal).
- Spacing within bucket (interleave short gaps between items within the same bucket).
- Confusable discrimination ("What distinguishes X from Y?").
- **Conditional logic:** Apply desirable difficulty only after initial encoding is stable (learner can explain in own words). If learner is struggling at baseline, reduce difficulty first.

**Guardrails:** Function before structure. No advancing without learner Seed/approval.

**Exit:** Bucket encoded, learner can explain in own words, hooks locked.

---

## M4: Build (Practice and Transfer)

Practice with increasing difficulty. Lock understanding.

**Protocol:**
1. Confirm Seed lock from M3.
2. **L2 Teach-back** (required gate) -- explain like you are teaching a 10-year-old.
3. L3/L4 detail only after L2 passes.
4. **Progressive ladder:**

| Tier | Description | Learner Does |
|------|-------------|-------------|
| Guided | Full scaffolding provided | Follow along, fill blanks |
| Faded | Partial scaffolding | Complete with hints |
| Independent | No scaffolding | Solve from scratch |
| Interleaved | Mixed items from multiple buckets | Discriminate and solve |

5. Capture all misses for Wrap.

**+1 Difficulty start rule:** If difficulty calibration is set to +1, begin at Faded (skip Guided).

**50% stepback rule:** If accuracy drops below 50% at any tier, step back one tier and rebuild before advancing.

**Anatomy drawing integration:** During Build for anatomy sessions, use the Drawing Protocol from `04-engines.md` — draw bone outline, mark landmarks, add muscle lines, label O/I, annotate actions.

**Toolkit:** Interleaving, spacing (successive relearning), variability across contexts, retrieval + self-explanation, error reflection. Feedback: immediate on factual errors; brief delay is OK for reasoning.

**Exit:** Learner handles mixed items accurately, 2-3 correct spaced recalls on key items.

---

## Modes (M5)

Mode modifies AI behavior across M2-M4. For full details, see [06-modes.md](06-modes.md).

**Switch commands:** `mode core`, `mode sprint`, `mode quick-sprint`, `mode light`, `mode drill`.

**Switch heuristics:**
- Core > Sprint: learner reports high confidence.
- Sprint > Drill: repeated misses cluster on one concept.
- Sprint > Core: understanding is shaky.
- Drill > Sprint: learner feels solid.

---

## M6: Wrap (Close and Schedule)

Lite Wrap v9.4 (Close Session).

2-10 minutes. Mandatory.

**Exit Ticket:**
1. Free recall blurt (2 min, notes closed).
2. Muddiest point: name the fuzziest concept.
3. Next action hook: first step for next session.

**Session Ledger** (schema in `08-logging.md`, fillable template in `09-templates.md` §4):
Fields: session_date, covered, not_covered, weak_anchors, artifacts_created, timebox_min. Empty fields: use `NONE`.

**Wrap Protocol:**
1. **Exit Ticket** — run the three prompts above.
2. **Session Ledger** — fill in the five fields above from what actually happened.
3. **Anchors review** — list all hooks locked today (feeds `weak_anchors` if shaky).
4. **Cards** — Anki-style cards for misses/weak anchors (if created, list in `artifacts_created`).
5. **Error classification** (human-readable notes, not JSON):

| Type | Definition | Action |
|------|-----------|--------|
| Careless | Knew it, slipped | Note only |
| Misunderstanding | Wrong mental model | Card + flag for review |
| Spacing | Knew before, forgot | Card + flag for review |
| Transfer | Can recall, can't apply | Rebuild hook + drill |

**Wrap does NOT:** output JSON (see `10-deployment.md`), schedule spaced reviews, or invent data (No Phantom Outputs — see `01-core-rules.md`).

**Exit:** Exit ticket done, session ledger filled, cards captured if applicable.

---

## Post-Session: Progress Tracking

Update the tracker during or immediately after Wrap.

**Track per topic:**
- Module / Topic / LO
- Status: Not started > In progress > Needs review > Solid
- Last session date
- Next action
- Source-lock pointer
- Next review date

**Status rules:** A topic cannot be "Solid" without a retrieval attempt on two separate sessions. Retrieval misses downgrade status.

**Weekly review (10 min):** Scan all "Needs review" rows, pick 1-2 to interleave next week, update dates.

---

## Quick Reference: Session Flow

```
Material Ingestion (pre-session, if needed)
  |
M0 Planning -- target, sources, plan, pre-test
  |
M1 Entry -- state check, scope, mode selection
  |
M2 Prime -- H1 scan, bucket, select first bucket
  |
M3 Encode -- KWIK flow, generation, hooks locked
  |
M4 Build -- teach-back gate, progressive ladder, misses captured
  |
  (Mode modifies behavior across M2-M4; see 06-modes.md)
  |
M6 Wrap -- Exit Ticket + Session Ledger (no spacing)
  |
Progress Tracking (post-session)
```
