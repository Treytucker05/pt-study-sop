# 05 Session Flow: Planning Through Wrap

A single linear walkthrough of a complete study session. For mode-specific behavior, see [06-modes.md](06-modes.md).

---

## 60-Second Quick Start

If you need to skip the full protocol:
1. Check progress tracker: last session + next action.
2. Pick 1 LO or micro-target.
3. Materials ready? Yes → proceed. No → start M0 Track A (paste materials).
4. Choose mode (Core/Sprint/Drill/Light/Quick Sprint).
5. Begin M1 Entry.

**If resuming:** Paste last session log, read progress tracker row, start with "Next action."

---

## M0: Planning

> No teaching until M0 is complete. The gate differs by exposure level.

### Exposure Check (First Step)

Ask: **"Have you seen this material before?"**
- **No / first time** → Track A (First Exposure)
- **Yes / review / drill** → Track B (Review)

---

### Track A: First Exposure

You can't plan what you haven't mapped. Materials come first, then the AI maps structure, then you plan from the map.

**Steps:**
1. **Context** -- class, topic, time available.
2. **Input Materials** -- paste slides, LOs, handouts, or upload to NotebookLM. Pasted materials satisfy Source-Lock.
3. **AI Maps Structure** -- AI reads the materials and produces a concept/cluster map (3-5 clusters). Learner approves the map before proceeding.
4. **Plan from Map** -- 3-5 steps derived from the approved cluster map.
5. **Prime** -- 60-120s brain dump. UNKNOWN is a valid answer (you haven't learned this yet).
6. **Calibrate** -- 2-5 min diagnostic set (5-10 items), confidence tags H/M/L, no grading. Build top-3 Priority Set.
7. **Method Chain** (optional) -- select from library or build ad-hoc (see `15-method-library.md`).

**Optional NotebookLM Workflow:**
1. Upload source materials to NotebookLM.
2. Run the extraction prompt: `From my sources only: extract learning objectives, key definitions, mechanisms/steps, differentiators, and 5-10 practice questions; include citations.`
3. Format output into a Tutor-Ready Packet (LOs, source-lock list, buckets, glossary, mechanisms, diagram, retrieval prompts, confusions).
4. Hand off to session.

**Track A Exit:** Context, materials pasted, cluster map approved, plan locked, prime done, calibrate done, Priority Set recorded.

---

### Track B: Review

You've seen this before. Test what you retained, then plan around the gaps.

**Steps:**
1. **Target** -- exam/block + time available.
2. **Position** -- covered vs remaining; known weak spots.
3. **Materials + Source-Lock** -- LOs, slides, labs, practice Qs, notes. List specific pages/files for today. NotebookLM packet satisfies Source-Lock.
4. **Interleave** -- review 1-2 weak anchors from prior Wrap Watchlist.
5. **Plan** -- 3-5 steps.
6. **Calibrate** -- 2-5 min diagnostic set (5-10 items, no grading) with confidence tags; items >45s are marked miss and skipped.
7. **Priority Set** -- top 3 weaknesses used to drive ENCODE method selection.
8. **Method Chain** (optional) -- select from library or build ad-hoc (see `15-method-library.md`).

**Track B Exit:** Target, sources, plan, calibrate results, and Priority Set confirmed.

---

### Shared M0 Rules

**Confusables list:** Identify items likely to interfere with each other (similar names, overlapping actions, adjacent regions). Feed these to interleaving in M4.

**Retrospective upkeep:** Check the retrospective timetable for items due today. Roll any overdue items into this session's plan.

**Mode alignment:** Mode selected in M1 must match the learner's state. If focus is low (1-4), default to Light or Sprint. If material is new, default to Core.

**Source-lock guardrail:** No factual teaching without source-lock. Track A: pasted materials satisfy this. Track B: explicit source list required.

**Quick Plan Templates:**

| Format | Flow |
|--------|------|
| Standard (30-60 min) | Goal + 5-10 min pre-test + 2-3 active chunks + midpoint check + 5-10 min wrap |
| Micro (10-15 min) | Micro-goal + 1-2 min recall + 5-8 min work + 2-3 min re-recall + 1 min next step |

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

## M2: Prime (Map the Territory — No Scoring)

Build the structural map. Do not teach details and do not score performance in this stage.

**Track A note:** Cluster map was already approved in M0. Select the first bucket and proceed directly — no H1 Scan needed.

**Track B protocol:**
1. **H1 Scan** -- System > Subsystem > Component > Element (6 bullets max).
2. **Bucket** -- learner groups into 2-4 buckets (spatial, mechanism, compare, workflow, etc.).
3. **Select** first bucket to encode.
4. **Pre-questions** if not done in M0 (1-3 Qs or 60-120s brain dump).

**Toolkit:** Label-a-diagram, prediction prompts, quick glossary (top 3-5 terms at L2).

**Guardrails:** Map only -- no detail. 2-3 buckets max per session. Mark unverified if no source.

**Exit:** Scan done (or map carried from M0), buckets chosen, first bucket selected, orientation artifacts captured (Spine, Unknowns, Predictions, GoalTargets).

---

## M2.5: Calibrate (Diagnostic, Not Testing)

Run a short diagnostic calibration pass to determine what ENCODE should prioritize.

**Protocol:**
1. 2-5 minute timer.
2. 5-10 short items aligned to assessment mode.
3. Tag each item confidence as H/M/L.
4. If an item exceeds 45 seconds, mark miss and move on.
5. No grading language; output top-3 **Priority Set** weaknesses.

**Guardrails:** Calibration is a routing signal, not a score report.

**Exit:** CalibrateResults captured and Priority Set (top 3) locked for ENCODE.

---

## M3: Encode (Attach Meaning)

Turn buckets into understanding. ENCODE selection is deterministic from Priority Set. Learner supplies the Seed; AI does not build without it.

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

**Reference handoff required:** produce One-Page Anchor + Question Bank Seed + Coverage Check before retrieval-heavy work.

**Exit:** Bucket encoded, learner can explain in own words, hooks locked, reference artifacts generated.

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
6. Log misses in `ErrorLog.csv` format for adaptation.

**+1 Difficulty start rule:** If difficulty calibration is set to +1, begin at Faded (skip Guided).

**50% stepback rule:** If accuracy drops below 50% at any tier, step back one tier and rebuild before advancing.

**Anatomy drawing integration:** During Build for anatomy sessions, use the Drawing Protocol from `04-engines.md` — draw bone outline, mark landmarks, add muscle lines, label O/I, annotate actions.

**Toolkit:** Interleaving, spacing (successive relearning), variability across contexts, retrieval + self-explanation, adversarial near-miss prompts, timed sprint sets with latency logging. Feedback: immediate on factual errors; brief delay is OK for reasoning.

**Exit:** Learner handles mixed items accurately, timed latency captured, and ErrorLog updated for misses.

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

Lite Wrap v9.5 (Close Session).

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
M0 Planning -- Exposure Check
  |
  ├── Track A (First Exposure)           ├── Track B (Review)
  │   context → materials → AI map →     │   target → position → sources →
  │   plan from map → prime (brain dump) │   interleave → plan → pre-test
  │   → method chain (opt)               │   → method chain (opt)
  |
M1 Entry -- state check, scope, mode selection
  |
M2 Prime -- Track A: use M0 map, select bucket
            Track B: H1 scan, bucket, select first bucket
  |
M2.5 Calibrate -- 2-5 min diagnostic, confidence tags, Priority Set (top 3)
  |
M3 Encode/Reference -- Priority-driven encoding, KWIK flow, anchor + question bank artifacts
  |
M4 Build/Retrieve -- teach-back gate, progressive ladder, adversarial + timed sets, ErrorLog updates
  |
  (Mode modifies behavior across M2-M4; see 06-modes.md)
  |
M6 Wrap -- Exit Ticket + Session Ledger (no spacing)
  |
Progress Tracking (post-session)
```
