# Implementation Plan: Adaptive Mastery System

**Track ID:** adaptive_mastery_20260220
**Spec:** [spec.md](./spec.md)
**Created:** 2026-02-20
**Status:** [~] In Progress

## Overview

Build an adaptive mastery system in 10 phases with strict dependency order. Each phase is independently testable. TDD: write failing tests first, then implement to green.

---

## Phase 0: Contracts and Pedagogy Primitives [checkpoint: d6de1f4]

Define the foundational schemas, enums, and policy objects that every downstream phase depends on.

### Tasks

- [x] Task 0.1: Freeze `Skill` schema — `skill_id` = concept map node id; JSON Schema definition
- [x] Task 0.2: Freeze typed relation vocabulary — enum of edge types (`requires`, `part_of`, `causes`, `inhibits`, `increases`, `decreases`, `compares_to`, `defines`) with direction rules
- [x] Task 0.3: Define `Epitome` artifact template — mechanism, simplest case, boundaries, example, links to 3-7 core nodes
- [x] Task 0.4: Define `AdvanceOrganizer` artifact template — 5-10 anchor concepts + map skeleton + "what changes what"
- [x] Task 0.5: Enumerate pedagogical move library — allowed tutor moves per phase (hint, analogy, metacognitive prompt, evaluate-work, teach-back, synthesis)
- [x] Task 0.6: Mastery thresholds policy — config flags for 0.95 vs 0.98 unlock thresholds with documented behavior

### Verification

- [x] All JSON Schemas validate sample data and reject invalid data
- [x] Edge type enum covers all 20 sample edges
- [x] Artifact validators reject incomplete artifacts
- [x] Move library enforced in pattern tests

---

## Phase 1: Obsidian Vault Integration + Hygiene [checkpoint: b680b10]

Ingest Obsidian vault notes, extract frontmatter/aliases/links, store in document store, enforce lint rules, support incremental updates.

### Tasks

- [x] Task 1.1: Vault ingest scanner — `ingest_obsidian_vault(path)` discovers `.md` files
- [x] Task 1.2: Parse YAML frontmatter — extract `type`, `system`, `prereqs`, `tags`, `sources`, `aliases` (mandatory)
- [x] Task 1.3: Link extraction — parse `[[wikilinks]]` and markdown links into `(from_path, to_target, link_text)` tuples
- [x] Task 1.4: Alias normalization table — `entity_aliases(alias, canonical_id_or_title, source_path)` from YAML aliases
- [x] Task 1.5: Store vault notes in `rag_docs` — `source="obsidian"`, `path`, `checksum`; stable `doc_id`
- [x] Task 1.6: Vault lint report — YAML must contain `aliases`; optional `prereqs` for concept notes; standardized headings check
- [x] Task 1.7: Incremental updates — checksum-based; only reprocess changed notes, update links + aliases + chunks

### Verification

- [x] File count matches filesystem
- [x] Re-ingest without changes adds 0 rows
- [x] "CO" alias resolves to "Cardiac Output" canonical
- [x] Lint report is deterministic for 10 sample notes
- [x] Edit 1 file → only that file reprocessed

---

## Phase 2: Telemetry — Practice Events [checkpoint: 0b13014]

Capture every practice action as a structured event for downstream mastery computation and error analysis.

### Tasks

- [x] Task 2.1: `PracticeEvent` JSON Schema — `user_id`, `skill_id`, `timestamp`, `correct`, `confidence`, `latency_ms`, `hint_level`, `item_format`, `source`, `session_id`
- [x] Task 2.2: `practice_events` DB table + indexes on `(user_id, skill_id, timestamp)`
- [x] Task 2.3: Instrument attempts + hints — emit events for attempt outcome, hint request/level, evaluate-work calls, teach-back sessions
- [x] Task 2.4: `error_flags` table — `(user_id, skill_id, edge_id, error_type, severity, timestamp, evidence_ref)` for Phase 5 localized failure

### Verification

- [x] Invalid events rejected by schema
- [x] One attempt produces exactly one event row
- [x] Hint produces separate hint event
- [x] Error flag links to correct skill

---

## Phase 3: Student Model — BKT with Time-Aware Decay [checkpoint: dea8be8]

Implement Bayesian Knowledge Tracing with a forgetting-curve decay term for effective mastery.

### Tasks

- [x] Task 3.1: `skill_mastery` table — `(user_id, skill_id, p_mastery_latent, p_learn, p_guess, p_slip, last_practiced_at, updated_at)` with defaults
- [x] Task 3.2: Pure BKT update function — latent mastery update on each observation
- [x] Task 3.3: Forgetting curve — `p_effective = decay(p_latent, delta_t)` with configurable lambda
- [x] Task 3.4: Decision policy uses effective mastery — unlock/mastered status, fading level, spaced retrieval due
- [x] Task 3.5: Parameter configuration — configurable priors (prior mastery, learn rate, guess, slip, decay lambda)

### Verification

- [x] Correct streak increases latent mastery
- [x] Incorrect streak decreases/slows latent mastery
- [x] No practice for long interval → effective mastery decreases while latent stays stable
- [x] Same latent mastery yields different availability after long inactivity
- [x] Adjusting lambda changes decay rate

---

## Phase 4: Concept Map as Curriculum Controller [checkpoint: de5f2b27]

Concept map nodes drive Locked/Available/Mastered status. Advance organizer provides big-picture view.

### Tasks

- [x] Task 4.1: Prerequisites on nodes — node model supports `prereqs[]` and prerequisite edges; persisted
- [x] Task 4.2: Status computation — Locked / Available / Mastered from effective mastery + prereqs
- [x] Task 4.3: Learner control with constraints — allow out-of-sequence practice, but downstream unlock depends on prereqs; log out-of-sequence events
- [x] Task 4.4: Advance organizer view — map-level "big picture" shows only epitome cluster + anchors; expands on mastery

### Verification

- [x] Reload preserves prereqs
- [x] When prereqs cross threshold: Locked → Available
- [x] Out-of-sequence practice logs events but does not unlock gated nodes
- [x] Organizer hides peripheral nodes until unlocked

---

## Phase 5: Adaptive Scaffolding + Fading with Localized Failure [checkpoint: e3574803]

Scaffold and fade hints based on mastery. "Evaluate My Work" localizes failure to specific skills/edges.

### Tasks

- [x] Task 5.1: Fading ladder — define levels and allowed tutor behavior per level
- [x] Task 5.2: Hint dependence metric — rolling window hints/attempts per skill
- [x] Task 5.3: "Evaluate My Work" verdict — JSON with `overall_correct`, `primary_failure_skill_id`, `primary_failure_edge_id`, `failure_type`, `evidence`, `next_remediation_skill_ids[]`
- [x] Task 5.4: Log error flags from verdict — write `error_flags` rows for failure skill/edge
- [x] Task 5.5: "Why locked" panel — UI shows missing prereqs, flagged prereqs, specific edge failures
- [x] Task 5.6: Summarizers + synthesizers — after mastery: generate synthesis paragraph linking to mastered nodes; update map summary artifact
- [x] Task 5.7: Metacognitive scaffolding prompts — prompt learner to state prereq used and edge justifying step; gated by fading level

### Verification

- [x] Level selection deterministically changes prompt template
- [x] Hint dependence rises after hint-heavy attempts
- [x] Verdict without `primary_failure_skill_id` fails validation
- [x] Evaluate-work call produces at least one error flag row
- [x] "Why locked" panel shows flagged failure without manual intervention
- [x] Mastering a node triggers exactly one synthesis update
- [x] Metacognitive prompts appear at defined triggers; disappear at high mastery

---

## Phase 6: Teach-Back Gate (Feynman Technique)

Teach-back module acts as novice questioner. Rubric maps deficiencies to skill_id/edge_id.

### Tasks

- [ ] Task 6.1: Teach-back module — model acts as novice; asks probing questions only; no direct teaching
- [ ] Task 6.2: Rubric artifact + mastery impact — accuracy, simplicity, missing links, incorrect edges, boundary confusion; maps to skill_id/edge_id; weak rubric prevents crossing mastery threshold

### Verification

- [ ] Output contains no direct explanations above threshold
- [ ] Weak rubric prevents mastery even with high quiz accuracy

---

## Phase 7: Graph RAG-lite with Pruning

Build knowledge graph from Obsidian + course corpus. Hybrid retrieval with PCST subgraph pruning.

### Tasks

- [ ] Task 7.1: KG tables — `kg_nodes`, `kg_edges`, `kg_provenance`, `kg_edge_confidence` migrations
- [ ] Task 7.2: Seed graph from Obsidian links — convert wikilinks to `links_to` edges with lower confidence
- [ ] Task 7.3: Typed relation extraction — strict patterns and/or constrained LLM prompt; typed edges with confidence + provenance
- [ ] Task 7.4: Alias-aware entity resolution — use `entity_aliases` to canonicalize during extraction and retrieval
- [ ] Task 7.5: Hybrid retrieval candidate subgraph — vector top chunks → extract entities → expand neighborhood radius 2
- [ ] Task 7.6: Subgraph pruning (PCST) — node prize = relevance + curriculum value; edge cost = inverse confidence + relation penalty; budget constraint; solve for compact subgraph
- [ ] Task 7.7: Context pack assembly — pruned graph → minimal node defs + edge list with provenance excerpts + top chunks
- [ ] Task 7.8: Incremental KG updates — changed doc checksum triggers re-extraction for affected doc only

### Verification

- [ ] Every edge has provenance or `link_only=true`
- [ ] Edge count equals parsed link count (seeding)
- [ ] Sample 20 typed edges each have supporting excerpt
- [ ] "CO" and "Cardiac Output" map to same canonical node
- [ ] Candidate subgraph includes all seed entities
- [ ] Pruned graph stays under budget; includes top-k seeds; deterministic
- [ ] No uncited edge in final pack unless `link_only`
- [ ] Editing one note changes only its incident edges

---

## Phase 8: Regression and Safety Tests

Contract tests, telemetry guards, and hallucination resistance.

### Tasks

- [ ] Task 8.1: Module output contract tests — JSON Schema compliance for all structured outputs
- [ ] Task 8.2: Telemetry completeness guard — no practice action completes without event write
- [ ] Task 8.3: Hallucination resistance checks — answers must cite chunks/edges; flag uncited claims

### Verification

- [ ] Any schema violation fails test suite
- [ ] Simulated attempt without telemetry is blocked
- [ ] Uncited answer sections trigger failure state

---

## Phase 9: Measurement Loop (n-of-1 Optimization)

Dashboard metrics and session toggles for controlled comparisons.

### Tasks

- [ ] Task 9.1: Metrics dashboard — per-skill effective mastery trajectory, hint dependence, time-to-correct, error flag recurrence, retention outcomes
- [ ] Task 9.2: Session toggles — 0.95 vs 0.98 threshold, vector-only vs Graph RAG-lite, fixed vs adaptive fading, pruning on/off; config recorded per session

### Verification

- [ ] After one session, metrics populate
- [ ] Session log shows active configuration deterministically

---

## Final Verification

- [ ] All acceptance criteria met (spec.md)
- [ ] All tests passing (`pytest brain/tests/`)
- [ ] Frontend builds cleanly (`npm run build` in `dashboard_rebuild/`)
- [ ] No regressions in existing 192+ tests
- [ ] Documentation updated for new modules
- [ ] Ready for review

---

_Generated by Conductor. Tasks marked [~] in progress and [x] complete._
