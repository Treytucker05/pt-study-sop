# 05 Session Flow: Wizard → Chain → Wrap

A single linear walkthrough of a complete study session. For mode-specific behavior, see [06-modes.md](06-modes.md). For the method block and chain library, see [15-method-library.md](15-method-library.md).

---

## 60-Second Quick Start

1. Open the Dashboard at `http://127.0.0.1:5000/tutor`.
2. Complete the 3-step Wizard (Course → Chain → Start).
3. Follow the tutor through each block in the chain.
4. At Wrap: Exit Ticket + Session Ledger.

**If resuming:** Paste last session log, tutor picks up from the last completed block.

---

## Phase 1: Tutor Wizard (Session Setup)

> No teaching until the Wizard is complete and the session is launched.

The Wizard is a 3-step UI in the Dashboard that replaces the legacy M0 Planning phase.

### Step 1: Course & Materials

| Field | Description |
|-------|-------------|
| **Course** | Select the active course from the dropdown |
| **Prime Scope** | Define the topic/scope for this session |
| **Obsidian Save Folder** | Select where session notes will be saved in the Obsidian vault |
| **Source Files** | Upload or attach materials (slides, PDFs, lab guides). This satisfies Source-Lock |

**Source-Lock guardrail:** No factual teaching without source materials. Uploaded files satisfy Source-Lock. If no files are attached, the tutor restricts to strategy, questions, and Source Packet requests, marking outputs as UNVERIFIED.

### Step 2: Chain Selection

Choose how the session will be structured:

| Mode | Description |
|------|-------------|
| **Template** | Pick from 15 pre-built chains (e.g., First Exposure Core, Anatomy Deep Dive, Exam Prep). Each shows its blocks and CP stage badges |
| **Custom** | Build an ad-hoc chain by selecting individual method blocks from the library |
| **Auto** | System recommends a chain based on context (course type, stage, energy, time available) |

Each chain displays:
- Block sequence with stage badges (PRIME, CALIBRATE, ENCODE, etc.)
- Estimated duration
- Context tags (class type, stage, energy level)

For the full chain catalog, see `15-method-library.md` §4.

### Step 3: Start

| Field | Description |
|-------|-------------|
| **Mode** | Confirm operating mode: Core / Sprint / Quick Sprint / Light / Drill |
| **Launch** | Start the session. The tutor begins executing the first block in the chain |

**Mode alignment:** Mode selected must match the learner's state. If focus is low (1-4), default to Light or Sprint. If material is new, default to Core. See [06-modes.md](06-modes.md).

**Wizard Exit Gate:** Course selected, materials attached, chain chosen, mode set. Session launches.

---

## Phase 2: Chain Execution

The tutor walks through each method block in the selected chain, in order. Each block has:
- A **name** (e.g., "Brain Dump", "Teach-Back", "Free Recall Blurt")
- A **CP stage tag** (e.g., PRIME, ENCODE, RETRIEVE)
- A **duration** estimate
- A **stage contract** defining required outputs (see `02-learning-cycle.md`)

### How the Tutor Runs a Block

1. Announce the block name and purpose.
2. Execute the block's protocol (defined in the method YAML and tutor rules).
3. Capture required outputs per the stage contract.
4. Advance to the next block in the chain.

### Tutor Rules During Execution

All rules from `01-core-rules.md` apply throughout chain execution:

- **Source-Lock:** All factual content grounded in uploaded materials.
- **Seed-Lock:** Learner attempts hooks first; tutor does not invent unprompted.
- **Function Before Structure:** Teach what it does before how it's built.
- **Level Gating:** L2 teach-back before L4 detail.
- **No Phantom Outputs:** If a step didn't happen, output NOT DONE / UNKNOWN.
- **KWIK Flow** (inside ENCODE blocks): Sound → Function → Image → Resonance → Lock.

### Block-Level Stage Behaviors

#### PRIME blocks (orientation, no scoring)
- Brain dump, prior knowledge scan, structural extraction.
- Output: Spine, Unknowns, Predictions, GoalTargets.
- **First exposure:** UNKNOWN is a valid answer (can't test what you haven't learned).

#### CALIBRATE blocks (diagnostic, not testing)
- 2-5 min, 5-10 items, confidence tags H/M/L, no grading language.
- Items >45 seconds → mark miss, move on.
- Output: CalibrateResults + PrioritySet (top 3 weaknesses).

#### ENCODE blocks (attach meaning)
- PrioritySet-driven construction. Learner supplies the Seed (Seed-Lock).
- KWIK flow for hooks. Dual coding (words + visuals).
- Desirable difficulty only after initial encoding is stable.
- Output: Encoded weaknesses, hooks locked, reference artifacts.

#### REFERENCE blocks (build study references)
- One-Page Anchor, Question Bank Seed, Coverage Check.
- Compact references tied to learning objectives.

#### RETRIEVE blocks (test recall)
- Low-support retrieval, adversarial near-miss, latency tracking.
- Progressive ladder: Guided → Faded → Independent → Interleaved.
- **50% stepback rule:** If accuracy drops below 50%, step back one tier.
- Output: Retrieval results + ErrorLog updates.

#### OVERLEARN blocks (close the loop)
- Exit Ticket, Anki Card Draft, Drill Sheet Builder.
- Retention hardening and artifact capture.

### Mode Modifiers

The selected mode modifies tutor behavior across all blocks. See [06-modes.md](06-modes.md) for details.

| Mode | AI Role | Pace | Teaching |
|------|---------|------|----------|
| Core | Guide | Moderate | Yes (scaffolds, metaphors) |
| Sprint | Tester | Fast | On miss only |
| Quick Sprint | Tester (short) | Fast, time-boxed | On miss only |
| Light | Guide (micro) | Fast, micro | Minimal |
| Drill | Spotter | Slow, thorough | On demand |

**Switch commands:** `mode core`, `mode sprint`, `mode quick-sprint`, `mode light`, `mode drill`.

---

## Phase 3: Wrap (Close and Schedule)

Lite Wrap v10.0 (Close Session). 2-10 minutes. Mandatory.

### Exit Ticket
1. Free recall blurt (2 min, notes closed).
2. Muddiest point: name the fuzziest concept.
3. Next action hook: first step for next session.

### Session Ledger
Fields: session_date, covered, not_covered, weak_anchors, artifacts_created, timebox_min. Empty fields: use `NONE`.

Schema in `08-logging.md`, fillable template in `09-templates.md` §4.

### Wrap Protocol
1. **Exit Ticket** — run the three prompts above.
2. **Session Ledger** — fill in the five fields from what actually happened.
3. **Anchors review** — list all hooks locked today (feeds `weak_anchors` if shaky).
4. **Cards** — Anki-style cards for misses/weak anchors (if created, list in `artifacts_created`).
5. **Error classification** (human-readable notes, not JSON):

| Type | Definition | Action |
|------|-----------|--------|
| Careless | Knew it, slipped | Note only |
| Misunderstanding | Wrong mental model | Card + flag for review |
| Spacing | Knew before, forgot | Card + flag for review |
| Transfer | Can recall, can't apply | Rebuild hook + drill |

6. **Chain rating** (optional): effectiveness 1-5, engagement 1-5. See `15-method-library.md` §5.

**Wrap does NOT:** output JSON (see `10-deployment.md`), schedule spaced reviews, or invent data (No Phantom Outputs).

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
WIZARD (3-step setup)
  │
  ├── Step 1: Course & Materials
  │   course → prime scope → obsidian folder → source files
  │
  ├── Step 2: Chain Selection
  │   template / custom / auto → view blocks + stage badges
  │
  └── Step 3: Start
      mode selection → launch
  │
CHAIN EXECUTION (block by block)
  │
  ├── PRIME blocks → orientation, brain dump, structural extraction
  ├── CALIBRATE blocks → diagnostic, confidence tags, Priority Set
  ├── ENCODE blocks → KWIK, teach-back, draw-label, concept map
  ├── REFERENCE blocks → one-page anchor, question bank seed
  ├── RETRIEVE blocks → free recall, sprint quiz, adversarial drill
  └── OVERLEARN blocks → anki cards, drill sheets
  │
  (Mode modifies behavior across all blocks; see 06-modes.md)
  │
WRAP
  │
  ├── Exit Ticket (recall blurt, muddiest point, next action)
  ├── Session Ledger (5 fields)
  ├── Cards (from misses)
  └── Chain rating (optional)
  │
PROGRESS TRACKING (post-session)
```