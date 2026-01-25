# Runtime Bundle: 00_INDEX_AND_RULES.md
Version: v9.2
Scope: Runtime rules and bundle map
This is runtime; canonical source is:
- src\runtime_rules.md
- src\evidence\notebooklm_bridge.md

---


## Source: src\runtime_rules.md

# Runtime Rules and Bundle Index

## Source of Truth
- Canonical content lives in `sop/src/`.
- Runtime files in `sop/runtime/knowledge_upload/` are generated. Do not edit them directly.

## Behavior Rules
- Planning first; no teaching before target, sources, plan, and pre-test.
- Source-Lock required; mark outputs unverified without sources.
- NotebookLM Source Packet required for factual teaching (see `sop/src/evidence/notebooklm_bridge.md`).
- Seed-Lock required; phonetic override for new terms.
- Function before structure; level gating required.
- Use PEIRRO as the learning cycle; KWIK for encoding hooks.
- Anatomy Engine applies to anatomy sessions (bone/landmark-first).
- Wrap must output Exit Ticket + 1-3-7-21 schedule + Tracker/Enhanced JSON (see `sop/logging_schema_v9.3.md`).

## Bundle Index
- 00_INDEX_AND_RULES.md: rules + bundle map (this file).
- 01_MODULES_M0-M6.md: execution flow (M0-M6).
- 02_FRAMEWORKS.md: H/M/Y/Levels + PEIRRO + KWIK.
- 03_ENGINES.md: Anatomy Engine + Concept Engine.
- 04_LOGGING_AND_TEMPLATES.md: logging schema + templates.
- 05_EXAMPLES_MINI.md: short usage examples.


## Source: src\evidence\notebooklm_bridge.md

# NotebookLM Bridge

## Purpose
Enforce source-grounded teaching via NotebookLM source packets.

---
## NotebookLM Source Packet (required for factual teaching)
Paste in this format:

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

If excerpts are provided without citations, request citations before teaching.

---
## Hard Rule
If no Source Packet (or no provided excerpts from sources), the AI may help with study strategy and question-asking, but must not assert factual or clinical claims. It must request a Source Packet from NotebookLM.

If the packet lacks definitions/mechanisms/differentiators needed to answer, request additional excerpts.

---
## NotebookLM Prompt Template
```
From my sources only: extract learning objectives, key definitions, mechanisms/steps, differentiators, and 5-10 practice questions; include citations.
```
