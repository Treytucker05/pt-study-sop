# PT Study System - Domain Primitives and Learning Loop (V2)

Status: CANONICAL (domain primitives + learning loop + implementation status)
Last updated: 2026-02-11
Scope: Domain model + roles + scoring philosophy + current implementation gaps

If anything conflicts with this document about the meaning of the domain primitives (LearningModule, Chain, Session, RuleSet, Artifact, Metric, Hypothesis, Proposal), this document wins.

## Terminology Policy (Avoid "Module" Collisions)

- LearningModule: The atomic, swappable learning move (the "LEGO brick"). Earlier docs may call this a "Module".
- CourseModule: A course unit / material bucket (what the current DB/UI calls `modules` today). This is NOT a LearningModule.
- RuleSet: Constraints on tutor behavior; can be global, per-learning-module, per-chain, and/or per-session.

## Mapping to Current Repo (Non-breaking)

This section is descriptive only (no code/schema changes implied).

| Primitive | Closest current repo concept(s) | Notes |
| --- | --- | --- |
| LearningModule | SOP modules (M0-M6), method blocks, named study moves (e.g., "Why-Chain") | "LearningModule" is the unit you sequence into a chain. |
| Chain | Method chains, chain templates, chain runner | A chain is a sequence of 1-6 LearningModules. |
| Session | Session logs + DB session rows | A chain executed on a specific content scope/timebox. |
| RuleSet | SOP rules + gating rules + per-module tutor behavior rules | Constraints, not content. |
| Artifact | Generated outputs (mindmap/outline/cards/error log/summary/etc.) | Artifacts are stored/linked by Brain. |
| Metric | Session/module measurements (scores/time/effort/strain/confidence/errors/etc.) | Metrics are used for optimization. |
| Hypothesis | Scholar explanations for metric patterns | Must be tied to measurable signals. |
| Proposal | Scholar change proposals to modules/chains/rules with expected effect | Prefer one-change proposals for testability. |
| CourseModule | DB/UI "modules" (material gathering / course unit tracking) | Keep this term separate from LearningModule. |

## The Stable Primitives You Are Actually Building

Lock these in. Everything else stays swappable.

### Core Entities

- LearningModule (aka "Module") = one learning move with a label + purpose + inputs/outputs + tutor rules + metrics
- Chain = 1-6 learning modules sequenced into a single session plan
- Session = a chain executed on a specific content scope
- RuleSet = constraints for tutor behavior (global + per-module + per-chain)
- Artifact = something generated (mindmap, outline, card set, error log, summary, etc.)
- Metric = numeric/ordinal measures captured per module + chain + session
- Hypothesis = Scholar's explanation for patterns in metrics
- Proposal = a concrete change to modules/chains/rules with expected effect

These are your "LEGO bricks." Everything you named (systems, blueprints, paradigms, etc.) maps onto one of these.

## Your V2 System as a Clean ASCII Flow

```text
================================================================================
                         TREY'S 3-PART LEARNING SYSTEM (V2)
================================================================================

                 +----------------------+
                 |   MODULE LIBRARY     |
                 | (labeled strategies) |
                 |  - Prime modules     |
                 |  - Encode modules    |
                 |  - Retrieve modules  |
                 |  - Refine modules    |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 |     CHAIN BUILDER    |
                 |  select 1-6 modules  |
                 |  attach RuleSets     |
                 |  save Chain template |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 |        TUTOR         |
                 | executes Chain on    |
                 | chosen content scope |
                 | obeys RuleSets       |
                 +----------+-----------+
                            |
          +-----------------+------------------+
          |                                    |
          v                                    v
+----------------------+              +----------------------+
|   OUTPUT ARTIFACTS   |              |   SESSION METRICS    |
| (notes/maps/cards/   |              | (scores/time/effort/ |
|  error logs/etc.)    |              |  confidence/errors)  |
+----------+-----------+              +----------+-----------+
           |                                     |
           +-----------------+-------------------+
                             v
                      +--------------+
                      |    BRAIN     |
                      | recordkeeper |
                      |  - stores    |
                      |  - sorts     |
                      |  - displays  |
                      +------+-------+
                             |
                             v
                      +--------------+
                      |   SCHOLAR    |
                      | interprets   |
                      |  - patterns  |
                      |  - questions |
                      |  - research  |
                      |  - proposals |
                      +------+-------+
                             |
        +--------------------+--------------------+
        |                                         |
        v                                         v
+----------------------+                 +----------------------+
| DASHBOARD QUESTIONS  |                 |   PROPOSALS QUEUE    |
| (needs your input)   |                 | (new/edited modules, |
+----------------------+                 |  chains, RuleSets)   |
                                        +----------+-----------+
                                                   |
                                                   v
                                        +----------------------+
                                        |  CONSOLIDATE / TRASH |
                                        |  compare proposals   |
                                        |  keep only winners   |
                                        +----------+-----------+
                                                   |
                                                   v
                                         (feeds back to)
                                         MODULE LIBRARY
================================================================================

SIDE SYSTEMS
- Dashboard UI = build chains, run sessions, view metrics, manage proposals
- Calendar = scheduling + spaced repetition once core loop is stable
```

## The Taxonomy You Are Reaching For

Your keywords collapse into a usable ladder that stops before "physics," and matches your modular build.

### Level 1 - Paradigm

What learning is (the worldview).

- Examples: Constructivism, Cognitivism, Connectivism, Metacognition-as-control

### Level 2 - Principles

What reliably changes learning (mechanisms).

- Examples: cognitive load, retrieval practice, spacing, interleaving, elaboration, dual coding, feedback, transfer

### Level 3 - Blueprints

Reusable structures that implement principles.

- Examples: concept mapping, worked-example -> faded guidance, compare/contrast matrices, error logs, Zettelkasten-style linking, case-based reasoning

### Level 4 - Workflows

Sequenced blueprints that run end-to-end.

- Example (yours): Chain of 1-6 modules per session

### Level 5 - LearningModules

Atomic, swappable units.

- Example: "Prime: Mindmap (ASCII)"
- Example: "Prime: Mindmap (Canvas UI)"
  Same blueprint, different implementation.

### Level 6 - Tutor RuleSets

Behavior constraints that protect learning quality.

- Example: seed-lock
- Example: don't ask-and-answer in same sentence
- Example: force student output before tutor explanation

### Level 7 - Tools

Dashboard, mindmap editor, timer, flashcards, calendar, storage.

This is why you don't need to distill "all the way down" every time: pick a level and move sideways.

## The Lateral-Move Rule (The Thing You Are Trying to Name)

Pick a layer -> move laterally inside that layer -> test -> keep winners.

### When to Stop Distilling and Go Lateral

Use symptom -> layer mapping:

- Confusion / overload -> stay at Principles (cognitive load, scaffolding, segmentation)
- I "get it" but can't use it -> Blueprints (transfer structures: cases, decision trees)
- I forget after 48 hours -> Principles (retrieval + spacing) or Workflow (add a retrieval module)
- Sessions feel inconsistent -> Workflow/Chain (standardize module order, gating)
- Tutor feels "helpful" but retention is low -> RuleSets (force output, delay explanations, cite sources)
- Friction is logistical -> Tools (dashboard, calendar automation)

## The Module Card (Minimum Schema to Make Modules Testable + Swappable)

Treat every module like a product with a spec.

```text
MODULE CARD
- Name:
- Type: Prime | Encode | Retrieve | Refine | Integrate | Evaluate
- Strategy label: (e.g., Concept Map, Faded Scaffolding, Error Log)
- Goal state: (what changes in the learner)
- Inputs: (source pages, topic list, prior artifacts)
- Outputs: (artifact types + where stored)
- Tutor behavior: (micro-rules for this module)
- Learner actions: (what the student must produce)
- Time box: (min/max)
- Cognitive load target: low | medium | high
- Scoring hooks: (what gets measured here)
- Failure modes: (common ways it breaks)
- Variants: ASCII | Canvas | Table | Oral | etc.
```

Your mindmap example fits cleanly:

- Same module label ("Prime: Concept Map")
- Multiple variants (ASCII hierarchy vs dashboard canvas)
- Different users can prefer different variants without changing the chain concept

## Chain Scoring Without Pretending There Is One "Best" Chain

Make scoring multi-objective and user-weighted.

### Capture Per-Module Metrics

- Learning gain (pre -> post quiz delta)
- Time cost
- Error rate
- Hint dependence
- Confidence calibration (confidence vs correctness)
- Cognitive strain (1-5)
- Artifact quality (rubric)

### Then Compute Per-User Chain Rankings

- Store each user's weight vector:
  - Example: someone values speed; someone values depth; someone values low strain
- Rank chains per user with their weights
- Keep a "global leaderboard" only as a weak prior, not truth

This preserves modularity across people (kids/family) without forcing one learning style.

## Scholar's Job in Your V2 (Tight Scope)

Scholar is not a tutor. Scholar is an optimizer.

### Scholar Loop (Clean)

1. Detect: find metric patterns (wins, regressions, plateaus, high-strain/low-gain modules)
2. Hypothesize: produce 1-3 explanations tied to module/chain/rules
3. Design experiment: propose A/B comparisons (module variant swap, rule tweak, chain reorder)
4. Research: pull from your Obsidian "systems" vault + web only if needed
5. Propose: one-change proposals with expected measurable impact
6. Cull: consolidate duplicates, trash weak proposals, keep only testable ones
7. Feed back into module library + chain templates

## The Research Method That Fits Your System

You are not researching "learning" as a monolith. You are researching modules and blueprints.

### Research Target Conversion

Take any new idea and classify it before doing anything:

- If it's a principle -> it should change module design rules (constraints)
- If it's a blueprint -> it becomes 1-3 candidate modules
- If it's a workflow -> it becomes a chain template
- If it's a tool -> it becomes a variant implementation of an existing module

This prevents drift. It forces every new "cool concept" into your system's primitives.

## The Short Lock-In (What to Freeze Now)

Freeze these, keep everything else flexible:

- Entities: learning module, chain, session, ruleset, artifact, metric, proposal
- Execution shape: 1-6 modules per chain
- Governance: tutor executes; brain records; scholar optimizes; dashboard mediates
- Evaluation law: one-change proposals; multi-objective scoring; user-weighted ranking

## Non-goals (For This Lock-In)

- No code renames or DB/schema migrations in this step.
- No path cleanup or doc reorganization beyond adding canonical pointers.
- No changes to the repo/README layer.

---

## Research Taxonomy Integration

The system's architecture is grounded in a formal research taxonomy. The file `sop/library/16-research-terms.md` provides the canonical vocabulary used by the Scholar for meta-audits and by developers for module design. This taxonomy ensures that every system component is tied to established learning science.

### Mapping: 7-Level Ladder to Research Categories

| Ladder Level | Informing Research Categories |
| --- | --- |
| **Level 1 - Paradigm** | Systems Thinking, Metacognition/SRL |
| **Level 2 - Principles** | CLT, Retrieval/Memory, ICAP, Assessment |
| **Level 3 - Blueprints** | Instructional Design, Knowledge Representation |
| **Level 4 - Workflows** | Instructional Design, Adaptive Sequencing |
| **Level 5 - LearningModules** | CLT, Retrieval/Memory, ICAP, Knowledge Representation |
| **Level 6 - Tutor RuleSets** | Tutoring Dialogue, CLT |
| **Level 7 - Tools** | Individual Differences, Assessment |

### Mapping: Primitives to Research Categories

| Primitive | Informing Research Categories |
| --- | --- |
| **LearningModule** | CLT, Retrieval/Memory, ICAP, Knowledge Representation |
| **Chain** | Instructional Design, Adaptive Sequencing |
| **Session** | Metacognition/SRL, Individual Differences |
| **RuleSet** | Tutoring Dialogue, CLT |
| **Artifact** | Knowledge Representation, ICAP |
| **Metric** | Assessment, Metacognition/SRL |
| **Hypothesis** | Systems Thinking, Metacognition/SRL |
| **Proposal** | Systems Thinking, Instructional Design |

> **Note:** The `method_blocks` (LearningModules) now include explicit tagging dimensions for **ICAP** (Passive/Active/Constructive/Interactive), **CLT** (Intrinsic/Extraneous/Germane), and **Assessment** (Recall/Application/Transfer/Calibration) to enable precise Scholar analysis.

## Implementation Status (as of 2026-02-11, updated after V2 architecture implementation)

This section tracks how far the actual codebase has implemented the vision above.

### Entity Implementation Matrix

| Entity | DB Table | API | UI | Status | Gap |
|--------|----------|-----|-----|--------|-----|
| **LearningModule** | `method_blocks` (36 rows) | ✅ CRUD | ✅ Methods page | ✅ 95% | All Module Card fields now implemented |
| **Chain** | `method_chains` (15 templates) | ✅ CRUD + Run | ✅ Chain builder | ✅ 95% | RuleSet attachment + execution handler complete |
| **Session** | `sessions` (90+ columns, v9.4) | ✅ CRUD | ✅ Brain page | ✅ 95% | Comprehensive schema |
| **RuleSet** | ✅ `rulesets` | ✅ CRUD | ⚠️ Pending | ✅ 85% | Table + API complete; UI pending |
| **Artifact** | `card_drafts`, notes, diagrams | ✅ Partial | ✅ Brain page | ✅ 85% | Cards, notes stored; quality scoring partial |
| **Metric** | `user_scoring_weights` + `session_scoring_hooks` | ✅ Full | ⚠️ Pending | ✅ 90% | User weights + composite scoring implemented |
| **Hypothesis** | ✅ `scholar_hypotheses` | ✅ CRUD | ⚠️ Pending | ✅ 85% | Full lifecycle; UI pending |
| **Proposal** | `scholar_proposals` | ✅ CRUD + Cull | ✅ Scholar page | ✅ 95% | Cull logic + scoring implemented |

### Module Card Fields: What Exists

```
ALL IMPLEMENTED:
  ✅ name
  ✅ category (prepare|encode|interrogate|retrieve|refine|overlearn)
  ✅ description
  ✅ default_duration_min (time box)
  ✅ energy_cost (cognitive load proxy: low|medium|high)
  ✅ best_stage (first_exposure|review|exam_prep|consolidation)
  ✅ tags (JSON array)
  ✅ evidence (research citations)
  ✅ facilitation_prompt (tutor behavior - unstructured)
  ✅ inputs — what learner brings (source pages, topic list, prior artifacts)
  ✅ outputs — what learner produces (artifact types + where stored)
  ✅ strategy_label — pedagogical strategy name
  ✅ failure_modes — common mistakes + mitigations (JSON array)
  ✅ variants — alternative implementations (JSON array)
  ✅ scoring_hooks — what gets measured for this module (JSON array)
```

### Chain Scoring Hooks: What Exists

```
IMPLEMENTED:
  ✅ effectiveness (1-5, from method_ratings)
  ✅ engagement (1-5, from method_ratings)
  ✅ understanding_level (1-5, from sessions)
  ✅ retention_confidence (1-5, from sessions)
  ✅ calibration_gap (integer, from sessions)
  ✅ rsr_percent (0-100, from sessions)
  ✅ cognitive_load (low|medium|high, from sessions)
  ✅ card_confidence_score (0-1, from anki_sync.py)
  ✅ user_weight_vectors — per-user customizable weights (user_scoring_weights table)
  ✅ composite_score — multi-objective weighted sum (POST /api/scoring/compute)

STILL MISSING (require additional instrumentation):
  ⚠️ learning_gain — needs pre/post-test tracking
  ⚠️ hint_dependence — needs scaffold usage tracking
```

### Scholar Loop: What Exists

```
IMPLEMENTED:
  ✅ 1. Detect — friction_alerts.py (8 alert types)
  ✅ 2. Hypothesize — scholar_hypotheses table with full lifecycle
  ✅ 3. Design experiment — scholar_experiments table
  ✅ 4. Research — research_notebook/ output lane
  ✅ 5. Propose — promotion_queue/ with RFC templates
  ✅ 6. Cull — proposal_cull.py with deduplication + scoring
  ⚠️ 7. Feed back — manual only; automated application still pending

ENTITIES NOW IMPLEMENTED:
  ✅ scholar_hypotheses table (status: draft/tested/validated/rejected)
  ✅ scholar_experiments table (status: planned/running/completed)
  ✅ Cull logic (POST /api/scholar/proposals/cull)
  ⚠️ Automated feedback loop (still requires manual intervention)
```

### RuleSet Implementation: Current State

RuleSets are now a first-class DB entity:

```
NEW TABLES:
  ✅ rulesets (id, name, description, scope, rules_json, is_active)
  ✅ method_chains.ruleset_id (foreign key to rulesets)

API ENDPOINTS:
  ✅ GET/POST /api/rulesets — list/create rulesets
  ✅ GET/PUT/DELETE /api/rulesets/<id> — single ruleset CRUD
  ✅ POST /api/chains/<id>/attach-ruleset — attach ruleset to chain
  ✅ GET /api/chains/<id> — now includes ruleset if attached

STILL IN SOP MARKDOWN (canonical source):
  - sop/library/01-core-rules.md — Global invariants
  - sop/library/05-session-flow.md — Per-module gates
  - sop/library/06-modes.md — Per-mode policies

WHAT'S STILL PENDING:
  ⚠️ RuleSet attachment UI in chain builder
  ⚠️ Runtime rule evaluation in chain_runner.py (basic support added)
```

### Priority Gaps (Recommended Build Order) - UPDATED

| Priority | Gap | Impact | Status |
|----------|-----|--------|--------|
| ~~1. High~~ | ~~RuleSet as DB entity~~ | ~~Enables chain-level rule customization~~ | ✅ DONE |
| ~~2. High~~ | ~~Module Card missing fields~~ | ~~Enables proper module testing/swapping~~ | ✅ DONE |
| ~~3. High~~ | ~~User weight vectors~~ | ~~Enables multi-objective chain ranking~~ | ✅ DONE |
| ~~4. Medium~~ | ~~Hypothesis entity~~ | ~~Enables Scholar evidence tracking~~ | ✅ DONE |
| ~~5. Medium~~ | ~~Cull logic~~ | ~~Prevents proposal overload~~ | ✅ DONE |
| ~~6. Medium~~ | ~~Chain execution handler~~ | ~~Completes chain runner backend~~ | ✅ DONE |
| ~~7. Low~~ | ~~Experiment tracking~~ | ~~Enables A/B testing~~ | ✅ DONE |
| **8. Low** | Automated feedback loop | Closes Scholar loop fully | ⚠️ PENDING |

### Remaining Work

| Item | Description | Effort |
|------|-------------|--------|
| RuleSet UI | Chain builder UI for attaching/editing rulesets | Medium |
| Hypothesis UI | Dashboard for viewing/managing hypotheses | Medium |
| Experiment UI | UI for running/viewing experiments | Medium |
| User Weights UI | Settings UI for customizing scoring weights | Low |
| Automated feedback | Approved proposals auto-apply to SOP library | High |
| Learning gain tracking | Pre/post-test instrumentation | High |

### Key Files by Entity

| Entity | Primary Files |
|--------|---------------|
| LearningModule | `brain/db_setup.py` (method_blocks), `brain/data/seed_methods.py`, `brain/dashboard/api_methods.py`, `dashboard_rebuild/client/src/types/methods.ts` |
| Chain | `brain/db_setup.py` (method_chains), `brain/dashboard/api_methods.py`, `brain/chain_runner.py`, `dashboard_rebuild/client/src/components/ChainBuilder.tsx` |
| Session | `brain/db_setup.py` (sessions), `brain/dashboard/api_adapter.py`, `dashboard_rebuild/client/src/pages/brain.tsx` |
| RuleSet | `brain/db_setup.py` (rulesets), `brain/dashboard/api_methods.py` |
| Artifact | `brain/db_setup.py` (card_drafts), `brain/anki_sync.py` |
| Metric | `brain/db_setup.py` (user_scoring_weights, session_scoring_hooks), `brain/dashboard/api_methods.py` |
| Hypothesis | `brain/db_setup.py` (scholar_hypotheses), `brain/dashboard/api_adapter.py` |
| Experiment | `brain/db_setup.py` (scholar_experiments) |
| Proposal | `brain/db_setup.py` (scholar_proposals), `brain/dashboard/api_adapter.py`, `scholar/proposal_cull.py` |

