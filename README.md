# PT Study OS v9.3

Structured study OS for DPT and adjacent domains. Canonical SOP lives in `sop/library/` (read-only). Runtime bundle and tools are generated under `sop/runtime/` and `sop/tools/`.

## Table of Contents
- Quick Start (Custom GPT)
- Runtime Bundle Build
- Upload Order
- Session Start
- Logging and Validation
- Multi-Domain Rules
- Repo Layout

## Quick Start (Custom GPT)
1) Build the runtime bundle:
   - `python sop/tools/build_runtime_bundle.py`
2) Upload the 6 knowledge files in order (see Upload Order below).
3) Paste `sop/runtime/runtime_prompt.md` as the first user message.
4) Run the session; at Wrap, output Tracker JSON + Enhanced JSON.

## Runtime Bundle Build
- Canonical source: `sop/library/` (do not edit).
- Generated output: `sop/runtime/knowledge_upload/` and `sop/runtime/runtime_prompt.md`.
- Rebuild any time you change canonical SOP content.

## Upload Order
Upload these files to Custom GPT Knowledge in this exact order:
1) `sop/runtime/knowledge_upload/00_INDEX_AND_RULES.md`
2) `sop/runtime/knowledge_upload/01_MODULES_M0-M6.md`
3) `sop/runtime/knowledge_upload/02_FRAMEWORKS.md`
4) `sop/runtime/knowledge_upload/03_ENGINES.md`
5) `sop/runtime/knowledge_upload/04_LOGGING_AND_TEMPLATES.md`
6) `sop/runtime/knowledge_upload/05_EXAMPLES_MINI.md`

## Session Start
- Paste `sop/runtime/runtime_prompt.md` as the first user message.
- M0 gate is mandatory: target + sources + plan + pre-test.
- Source-Lock requires a NotebookLM Source Packet for factual teaching.

## Logging and Validation
- At Wrap: Exit Ticket + spaced reviews + Tracker JSON + Enhanced JSON (v9.3).
- Save logs in `brain/session_logs/` or your preferred location.
- Validate a log:
  - `python sop/tools/validate_log_v9_3.py path/to/log.json`
- Validate golden examples:
  - `python sop/tests/run_golden_validation.py`

## Multi-Domain Rules
- `topic` must be prefixed: `[DPT]` / `[Startup]` / `[Other]`.
- Engine router:
  - `[DPT]` + regional/spatial anatomy -> Anatomy Engine
  - Otherwise -> Concept Engine
- `anki_cards` encoding (Enhanced JSON):
  - `Front|||Back|||TagsCSV|||Deck` per card
  - Cards separated by semicolons
  - Avoid semicolons inside Front/Back
  - Deck may be `AUTO`

## Repo Layout
- `sop/library/`: Canonical SOP (read-only)
- `sop/runtime/`: Generated runtime bundle + runtime prompt
- `sop/tools/`: Build + validation scripts
- `sop/tests/`: Golden JSON + behavioral prompt tests
- `brain/session_logs/`: Runtime logs (dashboard ingest)
