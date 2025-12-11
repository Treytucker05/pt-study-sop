# Archived Engines, Frameworks, Methods, and Modules (v8.x reference)

This summarizes the decommissioned v8.6 materials and where their logic now lives in v9.1 (for historical lookup only).

## Engines / Mechanisms
- Recap Engine (WRAP): collaborative recap + card creation at session close (anchors → select → co-create → close).
  - Now: captured in `modules/M6-wrap.md` and Brain logging flow.
- Gated Platter: seed-lock; blocks progress until the learner edits/supplies a Seed/metaphor.
  - Now: `modules/M4-build.md` (Seed-Lock + gating) and example in `examples/gated-platter.md`.
- Seed-Lock & Priming-first: user Seeds plus H-Series scan before encoding (function-first).
  - Now: `modules/M2-prime.md` + `modules/M4-build.md` + `frameworks/H-series.md`.

## Frameworks
- H-Series (H1 System; opt-in H2 Structure → Function → Behavior → Outcome).
  - Now: `frameworks/H-series.md`.
- M-Series (M2 Trigger, M6 Homeostasis, M8 Diagnosis); Y-Series (Y1 Generalist).
  - Now: `frameworks/M-series.md` (M2/M6/M8/Y1) and `frameworks/levels.md` (L1–L4 pedagogy levels).

## Methods
- Phonetic Override; Active Construction/Teach-back loops.
  - Now: `modules/M3-encode.md`, `modules/M4-build.md` (levels/gating), and prompts in `runtime-prompt.md`.
- Modes as method variants (Diagnostic Sprint, Teaching Sprint, Core, Drill).
  - Now: `modules/M5-modes.md` + quick cues in `frameworks/M-series.md`.
- Learning science method library (desirable difficulties, metacognition, elaborative interrogation, retrieval practice, drawing for anatomy).
  - Now: `methods/` docs and `modules/*-research.md`; roadmap items in `working/ROADMAP.md`.

## Modules (v8.6 Active Architect → v9 mapping)
- Module 1 Core Protocol → M1 Entry + M2 Prime + M3 Encode + M4 Build (renumbered flow).
- Module 2 Modes → M5 Modes (updated rules and heuristics).
- Module 4 Recap Engine → M6 Wrap + Brain logging and card selection steps.
- Module 5 Example Flows → `examples/gated-platter.md` and flow bullets in `modules/M5-modes.md`.
- Module 6 Framework Library → `frameworks/H-series.md`, `frameworks/M-series.md`, `frameworks/levels.md`.

## Proposed Modules for v9+ (unchanged North Star)
- M1 Entry, M2 Prime, M3 Encode, M4 Build, M5 Modes, M6 Wrap remain the canonical flow. Engines (pathology, exam-prep) will plug into this via `engines/` and `content/` when built.

---
Keeping this file avoids needing the old `archive/` tree; all logic above is already incorporated into v9.1 source.
