# 12 — Evidence Base & Research

---

## Cited Evidence

| Claim | Source |
|-------|--------|
| Retrieval practice improves long-term retention vs. restudy | Roediger & Karpicke (2006), *Psychological Science*. DOI: 10.1111/j.1467-9280.2006.01693.x |
| Spaced practice improves long-term retention vs. massed practice | Cepeda et al. (2006), *Psychological Bulletin*. DOI: 10.1037/0033-2909.132.3.354 |
| Practice testing and distributed practice are high-utility techniques | Dunlosky et al. (2013), *Psychological Science in the Public Interest*. DOI: 10.1177/1529100612453266 |

Supporting findings from review literature: dual coding and self-explanation are supported; keep prompts active and brief.

---

## Heuristics (Uncited — Treat as Configurable Defaults)

- **1-3-7-21** spaced retrieval schedule (adjust with red/yellow/green status)
- **3+2 rotational interleaving** weekly schedule
- **Exit ticket:** blurt + muddiest point + next-action hook
- **Retrospective timetable** red/yellow/green adjustments
- **RSR thresholds** are adaptive, not fixed

## Evidence Nuance Rules (v9.3)

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

### Source Packet Format (Required for Factual Teaching)

```
SOURCE PACKET (NotebookLM)
- Topic:
- Sources used:
- Key excerpts (with citations):
  - Excerpt A: "..." [citation]
  - Excerpt B: "..." [citation]
- Definitions:
- Mechanism / steps:
- Differentiators:
- Practice questions:
```

### Hard Rule
Without a Source Packet, the AI may help with study strategy and question-asking but must not assert factual or clinical claims. If excerpts lack citations, request them before teaching. If the packet lacks needed definitions/mechanisms/differentiators, request additional excerpts.

### NotebookLM Prompt Template
```
From my sources only: extract learning objectives, key definitions,
mechanisms/steps, differentiators, and 5-10 practice questions;
include citations.
```

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

## Artifact Inventory

| File | Layer | Cognitive Job | Research Status | Change Status |
|------|-------|---------------|-----------------|---------------|
| PEIRRO.md | Learning | Defines the Prepare-Encode-Interrogate-Retrieve-Refine-Overlearn learning cycle | Complete | None |
| KWIK.md | Learning | Defines Sound -> Function -> Image -> Resonance -> Lock encoding flow | Complete | None |
| M0-planning.md | Execution | Planning steps before sessions (target, sources, pre-test) | Complete | Implemented |
| M1-entry.md | Execution | Entry checks and readiness gating | In progress | Candidate |
| M2-prime.md | Execution | Priming steps to map structure and activate prior knowledge | Complete | Implemented |
| M3-encode.md | Execution | Encoding activities, dual coding, self-explanation | Complete | Implemented |
| M4-build.md | Execution | Practice design (interleaving, spacing, faded guidance) | Complete | Implemented |
| M5-modes.md | Execution | Operating modes and selection rules | In progress | Candidate |
| M6-wrap.md | Execution | Wrap-up, reflection, cards, and scheduling | Complete | Implemented |
| anatomy-engine.md | Enforcement | Bone -> landmark -> attachment -> OIANA+ sequence | Complete | Implemented |
| custom_instructions.md | Enforcement | Runtime identity and behavior rules | In progress | Candidate |
| runtime_prompt.md | Enforcement | Session startup prompt and gating questions | In progress | Candidate |
| notebooklm_bridge.md | Enforcement | Source packet rules for NotebookLM-based grounding | Complete | Implemented |
| logging_schema_v9.3.md | Measurement | Canonical logging schema (Tracker + Enhanced JSON) | Complete | Implemented |

### Refinement Rules
Changes require an identified gap, supporting research, and an explicit decision. Recording "no change" is acceptable when evidence supports current state.
