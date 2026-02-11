# SOP Runtime Bundle v9.3 Custom GPT Ready

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.

This plan follows `.agent/PLANS.md` and documents the steps to build a deterministic runtime bundle and validation tooling for PT Study OS v9.3 without modifying canonical SOP files in `sop/library/`.

## Purpose / Big Picture

The goal is to make the SOP Custom GPT-ready with a reproducible build pipeline that reads canonical SOP content from `sop/library/`, generates a runtime knowledge bundle and runtime prompt into `sop/runtime/`, and validates WRAP logs against schema v9.3. After this change, a user can run one build command to create six upload-ready knowledge files plus a pasteable runtime prompt, validate JSON logs with a single CLI tool, and rely on clear runtime rules for multi-domain routing and dashboard ingest formatting.

## Progress

- [x] (2026-01-30 05:00Z) Created runtime build script and validation tooling in `sop/tools/`.
- [x] (2026-01-30 05:00Z) Generated runtime bundle outputs in `sop/runtime/knowledge_upload/` and `sop/runtime/runtime_prompt.md`.
- [x] (2026-01-30 05:00Z) Added golden JSON examples and prompt contract tests in `sop/tests/`.
- [x] (2026-01-30 05:00Z) Updated root README quick-start and logged changes in `CONTINUITY.md`.

## Surprises & Discoveries

- Observation: `pytest brain/tests` fails during collection due to missing modules.
  Evidence: `ModuleNotFoundError: No module named 'dashboard'` and `ModuleNotFoundError: No module named 'anki_sync'` during test discovery.

## Decision Log

- Decision: Do not modify any files under `sop/library/` and treat it as read-only canonical source.
  Rationale: User override requires library to remain unchanged; runtime artifacts must be generated elsewhere.
  Date/Author: 2026-01-30 / Codex

- Decision: Resolve library filename mismatches via internal mapping in the build script and runtime index notes, instead of renaming files.
  Rationale: Avoid breaking existing links and keep canonical filenames stable.
  Date/Author: 2026-01-30 / Codex

- Decision: Skip optional JSON Schema files under `sop/schemas/` and keep tooling minimal.
  Rationale: Override restricts derived artifacts to `sop/runtime`, `sop/tools`, and `sop/tests`.
  Date/Author: 2026-01-30 / Codex

## Outcomes & Retrospective

A deterministic build script now generates the six required knowledge files and runtime prompt, and validation tooling confirms JSON output shape. Runtime documents explicitly include multi-domain routing and dashboard Anki ingest formatting without altering schema keys. Documentation and tests are in place for quick start and verification. Remaining gap: `sop/library/10-deployment.md` remains unchanged due to the read-only constraint; upload instructions are instead reflected in the generated runtime bundle and README.

## Context and Orientation

- Canonical SOP content lives in `sop/library/` and is read-only by policy.
- Runtime artifacts must be generated under `sop/runtime/`.
- Tooling for build and validation lives under `sop/tools/`.
- Tests and golden examples live under `sop/tests/`.
- The runtime knowledge upload expects exactly six files:
  `00_INDEX_AND_RULES.md`, `01_MODULES_M0-M6.md`, `02_FRAMEWORKS.md`, `03_ENGINES.md`, `04_LOGGING_AND_TEMPLATES.md`, `05_EXAMPLES_MINI.md`.

## Plan of Work

1) Create a deterministic build script at `sop/tools/build_runtime_bundle.py` that reads from `sop/library/`, strips relative links, and generates the six runtime files plus `sop/runtime/runtime_prompt.md` with stable headers and source attribution.
2) Add multi-domain routing and dashboard ingest encoding to the generated runtime outputs without adding schema keys.
3) Add `sop/tools/validate_log_v9_3.py` to validate Tracker and Enhanced JSON and enforce required field types and formats.
4) Add golden JSON samples and prompt contract tests under `sop/tests/`.
5) Update root `README.md` with Custom GPT quick-start instructions and log the change in `CONTINUITY.md`.

## Concrete Steps

1) Build runtime bundle:
   - From repo root, run:
     python sop/tools/build_runtime_bundle.py
   - Expect six files in `sop/runtime/knowledge_upload/` and `sop/runtime/runtime_prompt.md`.

2) Validate golden logs:
   - Run:
     python sop/tests/run_golden_validation.py
   - Expect `OK` for each file and `Golden validation passed.`

3) Run repository tests (known failures are documented):
   - Run:
     python -m pytest brain/tests
   - Expect errors about missing modules `dashboard` and `anki_sync` during collection.

## Validation and Acceptance

- Running `python sop/tools/build_runtime_bundle.py` completes without errors and generates all runtime files.
- `sop/runtime/knowledge_upload/00_INDEX_AND_RULES.md` includes M0 gate, Source-Lock + NotebookLM Source Packet rule, Seed-Lock, engine routing, and UNVERIFIED behavior.
- `sop/runtime/knowledge_upload/04_LOGGING_AND_TEMPLATES.md` and `sop/runtime/runtime_prompt.md` include the `anki_cards` encoding convention and topic prefix rule.
- `python sop/tests/run_golden_validation.py` passes.

## Idempotence and Recovery

- The build script can be re-run safely; it overwrites runtime outputs deterministically.
- Validation scripts do not mutate state; they are safe to rerun.
- If a generated runtime file looks wrong, re-run the build and inspect `sop/runtime/knowledge_upload/`.

## Artifacts and Notes

- Build output directory: `sop/runtime/knowledge_upload/`
- Runtime prompt: `sop/runtime/runtime_prompt.md`
- Validator: `sop/tools/validate_log_v9_3.py`
- Golden logs: `sop/tests/golden/*.json`

## Interfaces and Dependencies

- Python 3.12+ (tested with 3.14) for build/validation scripts.
- No external dependencies beyond the standard library.
- Build script interface:
  - `python sop/tools/build_runtime_bundle.py`
  - Output: runtime knowledge files + runtime prompt.
- Validator interface:
  - `python sop/tools/validate_log_v9_3.py path/to/log.json`
  - Returns non-zero exit code on validation failure.
