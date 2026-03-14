# Agent Board

Purpose: one shared repo-native coordination surface for multiple agents working in parallel.

Use this file when 2+ agents are active on separate tasks or file scopes.

## Default 3-Agent Setup

Use this default split when running Claude, Gemini, and Codex in parallel:

- `codex-implement`
  - primary writer
  - owns code/doc edits for the claimed file scope
- `claude-review`
  - read-only reviewer
  - returns findings, risks, and validation gaps
- `gemini-research`
  - read-only researcher
  - gathers external patterns, docs, and broad-context comparisons

Default rule:

- one writable scope has one active owner
- `claude-review` and `gemini-research` stay read-only unless ownership is explicitly handed off

## What This Board Is For

This board answers:

- who owns which active task
- what file scope they are allowed to touch
- whether they are blocked
- where their artifacts/results live
- what the next agent should do at handoff

## What This Board Is Not

- It does **not** replace `docs/root/TUTOR_TODO.md`.
  - `TUTOR_TODO.md` is the active sprint/work board.
- It does **not** replace `conductor/tracks.md`.
  - `conductor/tracks.md` is the portfolio/track registry.
- It does **not** replace git history.
  - Commits remain the source of truth for actual code/document changes.

## Use Order

When multiple agents are involved:

1. Track-level work and scope claims live in `docs/root/TUTOR_TODO.md`.
2. This file is used for live coordination and handoffs.
3. Track completion and audit history live in `conductor/tracks/GENERAL/log.md`.

## Status Vocabulary

Use only these values in the live table:

- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## Live Board

| Agent | Task ID / Goal | File Scope | Status | Blocked On | Artifacts / Results | Next Handoff |
|---|---|---|---|---|---|---|
| `codex-implement` | `RTC-001` compress repo truth surfaces so `README.md` becomes the single top-level truth file and stale planning/doc duplicates stop drifting | `conductor/tracks/repo-truth-surface-pruning_20260314/`, `README.md`, `AGENTS.md`, `docs/root/`, `.claude/commands/plan.md`, `.codex/skills/`, `scripts/check_docs_sync.py`, `conductor/tracks.md`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | README-first truth compression shipped; redundant active truth docs deleted; duplicate underscore Tutor launch track removed; `python scripts/check_docs_sync.py` PASS; `git diff --check` PASS with CRLF/LF warnings only | none |
| `codex-implement` | `RTC-010` archive historical drift surfaces so retired truth files stop surfacing in active repo searches | `docs/root/TUTOR_TODO.md`, `docs/archive/`, `conductor/tracks/_archive/`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | completed-history tail archived to `docs/archive/TUTOR_TODO_history_2026-03-14.md`; noisy root audit docs moved under `docs/archive/`; noisy completed tracks moved under `conductor/tracks/_archive/`; active grep over `docs/root` + non-archived `conductor/tracks` returns zero retired truth-file hits | none |
| `codex-implement` | `TLR-001` finish the Tutor launch/shell realignment track so the shipped `/tutor` surface matches the active plan | `dashboard_rebuild/client/src/pages/tutor.tsx`, `dashboard_rebuild/client/src/components/TutorStartPanel.tsx`, `dashboard_rebuild/client/src/lib/tutorClientState.ts`, `dashboard_rebuild/client/src/pages/__tests__/tutor.test.tsx`, `dashboard_rebuild/client/src/pages/__tests__/brain.test.tsx`, `dashboard_rebuild/client/src/pages/__tests__/tutor.workspace.integration.test.tsx`, `dashboard_rebuild/client/src/components/__tests__/TutorStartPanel.test.tsx`, `docs/root/PROJECT_ARCHITECTURE.md`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/tutor-launch-shell-realignment_20260313/`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | Tutor launch precedence now lives in `tutorClientState.ts`; `/tutor` renders `TutorStartPanel`; `TutorWizard` + its test were removed; active-session restore now returns directly to Tutor mode; backend targeted pytest PASS; frontend matrix PASS; `npm run check` PASS; `npm run build` PASS; docs sync PASS; live smoke PASS; track closed in `conductor/tracks.md` | none |
| `codex-implement` | `TAR-110 / T7` ship the repo-local harness bootstrap validator and backend env template | `AGENTS.md`, `scripts/harness.ps1`, `brain/.env.example`, `brain/tests/fixtures/harness/manifest.json`, `brain/tests/test_harness_bootstrap.py`, `docs/root/GUIDE_DEV.md`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/trey-agent-repo-readiness_20260313/`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | `Bootstrap` mode now validates Python, Node/npm, backend env template, `brain/.env` for Live, and fixture manifest for Hermetic; deterministic JSON + exit codes landed; `python -m pytest brain/tests/test_harness_bootstrap.py -q` PASS; `python -m pytest brain/tests/test_harness_startup.py -q` PASS; real `Live` + `Hermetic` bootstrap commands PASS | next handoff should build `T8`, the first real hermetic Tutor fixture scenario, on top of the new bootstrap validator |
| `codex-implement` | `TAR-120 / T8` ship the first hermetic Tutor fixture scenario on top of the harness contract | `scripts/harness.ps1`, `scripts/tutor_hermetic_smoke.py`, `brain/tutor_context.py`, `brain/tests/fixtures/harness/manifest.json`, `brain/tests/fixtures/harness/tutor-hermetic-smoke.json`, `brain/tests/test_harness_eval.py`, `docs/root/GUIDE_DEV.md`, `scripts/README.md`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/trey-agent-repo-readiness_20260313/`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | `Eval` mode now runs `tutor-hermetic-smoke`; the fixture seeds an isolated course + materials and exercises materials, create, two provider-free turns, restore, summary, end, and delete; Hermetic profile now disables Obsidian note/vault retrieval through `PT_HARNESS_DISABLE_VAULT_CONTEXT=1`; `python -m pytest brain/tests/test_harness_eval.py -q` PASS | next handoff should implement `T9`, the standardized machine-readable harness artifact bundle, without reopening the hermetic scenario contract |
| `codex-implement` | `TAR-130 / T9 + early T10` ship the harness artifact bundle and land the second hermetic Tutor scenario slice | `scripts/harness.ps1`, `scripts/tutor_hermetic_smoke.py`, `brain/tests/fixtures/harness/manifest.json`, `brain/tests/fixtures/harness/tutor-hermetic-coverage-scope.json`, `brain/tests/test_harness_eval.py`, `docs/root/GUIDE_DEV.md`, `scripts/README.md`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/trey-agent-repo-readiness_20260313/`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | `Report` mode now emits `bundle.json` with git metadata, command history, scenario artifact pointers, timings, and redacted environment data; `Eval` now supports `tutor-hermetic-coverage-scope`; repeated same-scenario bundle-shape + secret-redaction coverage landed in `brain/tests/test_harness_eval.py`; real `powershell` path verified `Run, Eval, Eval, Report` | next handoff should finish `T10` by normalizing the remaining live/operator validation flows into the named scenario registry, then move to `T11` structured harness diagnostics |
| `codex-implement` | `TAR-140 / T10-T12` finish the harness scenario registry, observability, and CI lane | `scripts/harness.ps1`, `scripts/smoke_golden_path.ps1`, `scripts/smoke_tutor_readonly.ps1`, `scripts/method_integrity_smoke.py`, `brain/tests/fixtures/harness/manifest.json`, `brain/tests/test_harness_eval.py`, `.github/workflows/ci.yml`, `docs/root/GUIDE_DEV.md`, `scripts/README.md`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/trey-agent-repo-readiness_20260313/`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | manifest v3 now registers hermetic + live/operator scenarios; `events.jsonl` now records redacted command lifecycle events and failure artifact pointers; induced-failure diagnostics are covered in `brain/tests/test_harness_eval.py`; `.github/workflows/ci.yml` now runs the Windows `harness_contract` job; local Windows `Bootstrap -> Run -> Eval tutor-hermetic-smoke -> Report` proof passed | next handoff should execute `T13`, the Tier 1 cross-agent harness proof, using the shared repo-local command surface |
| `codex-implement` | `TAR-150 / T13-T16` close the harness-readiness track with cross-agent proof, final doc sync, execution-split decision, and release-gate validation | `README.md`, `docs/root/GUIDE_DEV.md`, `scripts/README.md`, `conductor/tracks/trey-agent-repo-readiness_20260313/`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | `t13-cross-agent-proof.md` now stores the cross-agent evidence bundle; `Cursor` and `Antigravity` were moved to explicit pending status until stronger local launch proof exists; `t15-t16-closeout.md` records the no-queue decision plus the passing closeout gate (`Bootstrap` Hermetic/Live, hermetic `Run -> Eval -> Report`, live/operator `Run -> Eval`, docs sync, CI parse, focused harness tests, full backend suite) | none |
| `codex-implement` | `AEH-001` normalize the multi-CLI agent/skill topology and config hygiene stack | `conductor/tracks/agent-ecosystem-hygiene_20260313/`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md`, `docs/root/SKILLS_INVENTORY.md`, `docs/root/AGENT_SETUP.md`, `scripts/sync_agent_skills.ps1`, `C:\Users\treyt\.agents\README.md`, and supported active home roots under `C:\Users\treyt\.*` | `done` | none | evidence in `conductor/tracks/agent-ecosystem-hygiene_20260313/evidence.md`; topology freeze in `conductor/tracks/agent-ecosystem-hygiene_20260313/decision-record.md`; rollback bundle in `conductor/tracks/agent-ecosystem-hygiene_20260313/rollback.md`; fixture PASS from `scripts/test_sync_agent_skills_fixture.ps1`; supported-root apply/checks PASS; quarantine record in `conductor/tracks/agent-ecosystem-hygiene_20260313/quarantine.md`; secret audit + blocker docs in `security-audit.md` and `rotation-blocker.md`; docs/final validation PASS | operator should rotate the exposed GitHub and Obsidian credentials, update the user env vars, and restart Gemini/Antigravity before relying on the legacy embedded MCP path again |
| `codex-implement` | `CERT-002` implement Obsidian-backed Tutor week-page sync in preflight | `brain/dashboard/api_tutor.py`, `brain/tutor_templates.py`, `dashboard_rebuild/client/src/api.ts`, `dashboard_rebuild/client/src/components/TutorStartPanel.tsx`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | page-sync patch landed; the shipped Tutor start surface now exposes readiness through `TutorStartPanel`; live Week 8 preflight blocks correctly on real Obsidian transport failure instead of false success | next handoff should fix the local Obsidian installer/CLI path so the live Week 8 preflight can complete and session start can proceed |
| `rawls-explorer` | `CERT-002-research` inspect current MOC sync/preflight helpers and nearby tests | read-only on `brain/dashboard/api_tutor.py`, `brain/tutor_templates.py`, `brain/tests/` | `done` | none | returned exact edit points, current overwrite-vs-merge behavior, and likely test targets | none |
| `codex-implement` | `CERT-000` launch Tutor 10/10 certification program | `conductor/tracks/tutor-10-certification_20260307/`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md`, `sop/library/chains/certification_registry.yaml`, `brain/data/seed_methods.py`, `brain/dashboard/api_tutor.py`, `dashboard_rebuild/client/src/api.ts`, `brain/tests/test_seed_methods.py`, `brain/tests/test_tutor_session_linking.py` | `done` | none | certification runner refreshed to `ready`; session restore matrix landed; session-authority restore path is now backed by create/get/restore regression coverage | none |
| `codex-implement` | `VLOCK-001` close Tutor Vision Lock and freeze the reusable contract package | `conductor/tracks/tutor_vision_lock_20260301/`, `brain/tutor_prompt_builder.py`, `brain/tests/test_chain_runner.py`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md` | `done` | none | vision-lock package landed with owner vision, notes model, gap matrix, validation gate, closeout, and the explicit `No Answer Leakage` / `No Phantom Outputs` prompt rules; automated gate `64 passed`; live Tutor smoke passed | close out `neuroscience-exam-intake_20260307`, then harden note/map artifact ownership as a new Tutor cleanup slice |
| `codex-implement` | `NEURO-001` close the Week 7 neuroscience intake proof track | `conductor/tracks/neuroscience-exam-intake_20260307/`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | track metadata synced to complete; Week 7 intake proof is now recorded as superseded by the certified preflight flow and locked Tutor contract package | harden note/map artifact ownership into a true session-owned cleanup contract without regressing the live Tutor baseline |
| `codex-implement` | `ARTOWN-001` harden Tutor artifact ownership and cleanup | `conductor/tracks/tutor-artifact-ownership-hardening_20260313/`, `brain/db_setup.py`, `brain/dashboard/api_tutor_artifacts.py`, `brain/dashboard/api_tutor_sessions.py`, `brain/tests/test_tutor_artifact_certification.py`, `conductor/tracks/tutor_vision_lock_20260301/`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | note/card/map ownership is now explicit; quick-note and card rows clean up through artifact-delete and session-delete; artifact certification coverage and vision-lock docs are synced to the new baseline | none |
| `codex-implement` | `SK-001` create repo-local strategic architect skill | `.codex/skills/personal-strategic-architect/`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/GENERAL/log.md` | `done` | none | skill created + `sync_agent_config.ps1 -Mode Check` PASS | none - skill is ready for activation |
| `halley-explorer` | `SK-001-research` inspect local skill conventions and placement | read-only on `.codex/skills/` and docs | `done` | none | recommended repo-local `.codex/skills/personal-strategic-architect` + single-file start | codex writes skill and validates |
| `parfit-review` | `SK-001-review` review new skill for fidelity and conventions | read-only on `.codex/skills/personal-strategic-architect/` and docs | `done` | none | no material findings; one low-severity note on literal quote-mark fidelity in the activation payload | none |
| `codex-implement` | `AGENT-003` simplify instruction hierarchy so root `AGENTS.md` is master across tools | `AGENTS.md`, `docs/root/AGENT_SETUP.md`, `docs/root/TUTOR_TODO.md`, `docs/root/AGENT_BOARD.md`, `conductor/tracks/GENERAL/log.md`, `C:\Users\treyt\.codex\config.toml`, `C:\Users\treyt\.codex\AGENTS.md`, `C:\Users\treyt\.claude\CLAUDE.md` | `done` | none | repo canon now explicitly owns project instructions; global Codex `developer_instructions` removed; global Codex/Claude markdown files trimmed to fallback-only notes | none |
| `parfit-explorer` | `AGENT-003-research` inventory instruction surfaces and redundancy | read-only on repo/global instruction files | `done` | none | returned minimal hierarchy recommendation: repo `AGENTS.md` master, thin global fallbacks, runtime settings separated from policy | none |

## Row Rules

- `Agent`: stable nickname or tool/role label
  - recommended format: `tool-role`
  - examples: `codex-implement`, `claude-review`, `gemini-research`
- `Task ID / Goal`: one short stable identifier plus the task summary
- `File Scope`: explicit write scope, not vague domain labels
- `Status`: must use the allowed vocabulary above
- `Blocked On`: use `none` if not blocked
- `Artifacts / Results`: path, branch, diff summary, log file, or commit SHA
- `Next Handoff`: one sentence telling the next agent what to do

## Handoff Rules

When an agent finishes a pass:

1. Update its board row.
2. Add the artifact path, result path, or commit SHA.
3. Set `Next Handoff` to the exact next action.
4. If the work changed behavior, also append a dated note to `conductor/tracks/GENERAL/log.md`.

## Handoff Template

Use this block when the table row is not enough:

```md
### Handoff
- Agent: `agent-name`
- Task: `A-### short-name`
- Scope: `path/or/paths`
- Status: `done|blocked|review`
- What changed:
  - short bullet
  - short bullet
- Validation:
  - command -> result
- Next handoff:
  - exact next step
```

## Ownership Rules

- One writable file scope should have one active owner at a time.
- If two agents need the same file, one must be `review`/read-only until ownership is handed off.
- Review agents should prefer findings and validation artifacts over direct overlapping edits.

## Default Role Split

- `codex-implement`
  - writes code/docs
  - runs implementation-side validation
- `claude-review`
  - reviews the current diff or artifact output
  - reports findings with file/line references when possible
- `gemini-research`
  - gathers external references, comparisons, or broad-context synthesis
  - should not own the same writable scope as `codex-implement`

## Recommended Workflow

```text
TUTOR_TODO claim
   ->
AGENT_BOARD live ownership row
   ->
codex implementation + claude review + gemini research
   ->
GENERAL log entry if behavior changed
   ->
commit SHA / final handoff
```

## Related Docs

- Root canon: `AGENTS.md`
- Agent setup and precedence: `docs/root/AGENT_SETUP.md`
- Active sprint board: `docs/root/TUTOR_TODO.md`
- Track registry: `conductor/tracks.md`
- Change log: `conductor/tracks/GENERAL/log.md`
