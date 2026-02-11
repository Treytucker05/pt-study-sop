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
