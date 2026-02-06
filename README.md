# PT Study OS v9.4.1

Structured study OS for DPT and adjacent domains. Canonical SOP lives in `sop/library/` (read-only). Runtime bundle and tools are generated under `sop/runtime/` and `sop/tools/`.

## Table of Contents
- Quick Start (Custom GPT)
- Runtime Bundle Build
- Upload Order
- Session Start
- Logging and Validation
- Repo Layout
- More Docs

## Quick Start (Custom GPT)
1) Build the runtime bundle:
   - `python sop/tools/build_runtime_bundle.py`
2) Upload the 6 knowledge files in order (see Upload Order below).
3) Paste `sop/runtime/runtime_prompt.md` as the first user message.
4) Run the session. At Wrap, output **Exit Ticket + Session Ledger** only (Lite Wrap).
5) Post-session: produce JSON via Brain ingestion prompts (Tracker + Enhanced, schema v9.4).
   - Schema reference: `sop/library/08-logging.md`

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
- Wrap output (Lite Wrap): Exit Ticket + Session Ledger only (plain text).
- JSON is produced post-session via Brain ingestion prompts.
- Validate a JSON log:
  - `python sop/tools/validate_log_v9_4.py path/to/log.json`
- Validate golden examples:
  - `python sop/tests/run_golden_validation.py`

## Repo Layout
- `sop/library/`: Canonical SOP (read-only)
- `sop/runtime/`: Generated runtime bundle + runtime prompt
- `sop/tools/`: Build + validation scripts
- `sop/tests/`: Golden JSON + behavioral prompt tests
- `brain/session_logs/`: Runtime logs (dashboard ingest)

## More Docs
- Docs index (canonical): `docs/README.md`
- Developer guide: `docs/root/GUIDE_DEV.md`
- Architecture: `docs/root/PROJECT_ARCHITECTURE.md`
