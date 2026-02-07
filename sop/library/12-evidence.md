# 12 — Evidence Base & Research

---

## Cited Evidence

| Claim | Source |
|-------|--------|
| Retrieval practice improves long-term retention vs. restudy | Roediger & Karpicke (2006), *Psychological Science*. [DOI](https://doi.org/10.1111/j.1467-9280.2006.01693.x) |
| Spaced practice improves long-term retention vs. massed practice | Cepeda et al. (2006), *Psychological Bulletin*. [DOI](https://doi.org/10.1037/0033-2909.132.3.354) |
| Practice testing and distributed practice are high-utility techniques | Dunlosky et al. (2013), *Psychological Science in the Public Interest*. [DOI](https://doi.org/10.1177/1529100612453266) |

Supporting findings from review literature: dual coding and self-explanation are supported; keep prompts active and brief.

---

## Heuristics (Uncited — Treat as Configurable Defaults)

- **1-3-7-21** spaced retrieval schedule (adjust with red/yellow/green status)
- **3+2 rotational interleaving** weekly schedule
- **Exit ticket:** blurt + muddiest point + next-action hook
- **Retrospective timetable** red/yellow/green adjustments
- **RSR thresholds** are adaptive, not fixed

## Evidence Nuance Rules

Canonical rules in `01-core-rules.md` § Evidence Nuance Rules. Summary:
- No numeric forgetting claims unless cited.
- Dual coding is a helpful heuristic, not a guarantee.
- Zeigarnik is not a memory guarantee; use next-action hook for friction reduction.
- If a claim lacks stable citation, list it under Heuristics above.

---

## Encoding Research (PEIRRO Encode Phase)

**Cognitive job:** Convert attended material into organized representations — chunking into schemas, linking to prior knowledge, establishing retrieval cues that preserve spatial and functional relationships.

**Poor-encode signals:**
- Cannot sketch or verbally map regions without prompts
- Inconsistent nomenclature and laterality errors
- Fragile recall outside original source context
- Facts remembered but relationships missing
- High interference between similar structures

**Strong-encode signals:**
- Can redraw/describe regions with correct landmarks and flows
- Stable chunk names and linkages
- Recall survives modality shifts (text <-> diagram <-> movement)
- Can generate analogies that predict missing details
- Faster, cleaner retrieval in spaced checks

**Common failure modes:** Rote transcription without schema-building; memorizing unlabeled structures without function; overloading with ungrouped minutiae; weak multimodal coding; superficial familiarity mistaken for memory.

**Clarification for "encodes knowledge":** Prefer "builds durable, cued schemas for the material," "binds new details to prior maps with multimodal cues," or "stabilizes anatomy chunks by pairing structure, function, and landmarks."

---

## NotebookLM Bridge

A **Source Packet** is a set of cited excerpts from learner materials (generated via NotebookLM or equivalent). It enables Source-Lock compliance for factual teaching. Without one, the AI restricts to strategy and questions.

- Source Packet format and extraction prompt: see `05-session-flow.md` § Pre-Session Material Ingestion.
- Source-Lock rule: see `01-core-rules.md`.
- Hard rule: without cited excerpts, no factual or clinical claims. Request additional excerpts if the packet is incomplete.

---

## Research Backlog

### New Engine Candidates
- [ ] **Procedure Engine:** Cognitive Apprenticeship (Collins/Brown) for physical skills (goniometry, transfers)
- [ ] **Case Engine:** Case-Based Reasoning (Kolodner) for patient vignettes / SOAP note logic
- [ ] **Debate Engine:** Dialectical Learning for defending clinical choices
- [ ] **Math/Physics Engine:** Polya's principles for Biomechanics (Given -> Find -> Formula -> Solve)

### Alternative Hierarchies
- [ ] Network vs. Tree: Rhizomatic Learning / Concept Maps alongside Tree Maps
- [ ] Chronological: Narrative Structuring (Onset -> Acute -> Chronic) for Pathology

### Deep Validation (v9.2 Components)
- [ ] Anatomy Engine: Does "visual-first" reliably improve adult retrieval? Does "bone-first" beat "region-first"?
- [ ] Concept Engine: Is Identity -> Context -> Mechanism -> Boundary superior to inquiry-based flow?
- [ ] Seed-Lock: At what point does generation fatigue set in? Auto-suggest after 45 min?
- [ ] Stop Rule: "No answers in the same message as questions." Does wait-for-retrieval friction cause drop-off? Compare errorful retrieval vs. worked examples for initial acquisition.
- [ ] Level Gating: Does L2 simplification correlate with L4 clinical competence?
- [ ] H1 System: Does `System -> Subsystem -> Component` break down for systemic diseases (e.g., Lupus) affecting multiple subsystems?
- [ ] M2 Trigger: Is the linear `Trigger -> Mechanism -> Result` sufficient for feedback loops? Should M6 default for all Physiology?
- [ ] Y1 Generalist: Is `What is it -> What does it do -> Fail state` the optimal "minimum viable context" for new terms?

### Completed (v9.1 Archive)
M0-planning, M2-prime, M3-encode, M4-build, M5-modes, M6-wrap

---

## Artifact Inventory (v9.4 Library)

All artifacts are consolidated into `sop/library/` files. Originals archived to `sop/archive/`.

| Library File | Layer | Status |
|-------------|-------|--------|
| 02-learning-cycle.md | Learning (PEIRRO + KWIK) | Complete |
| 05-session-flow.md | Execution (M0-M6) | Complete |
| 06-modes.md | Execution (modes + switching) | Complete |
| 04-engines.md | Enforcement (Anatomy + Concept) | Complete |
| 14-lo-engine.md | Enforcement (LO Engine Protocol Pack) | Complete |
| 13-custom-gpt-system-instructions.md | Enforcement (runtime rules) | Complete |
| 08-logging.md | Measurement (schema v9.4) | Complete |

### Refinement Rules
Changes require an identified gap, supporting research, and an explicit decision. Recording "no change" is acceptable when evidence supports current state.
