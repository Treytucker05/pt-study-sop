# PT Study System (Trey)

Owner: Trey.

Personal study OS that captures sessions, produces metrics and Anki-ready outputs, keeps Obsidian as the primary knowledge base, and improves over time through Scholar research.

Response style: straight to the point, no fluff.

## Onboarding Order

1. Read this `AGENTS.md` first.
2. Read `docs/root/AGENT_SETUP.md` for exact agent precedence, repo/global boundaries, and maintenance rules.
3. Read `docs/root/TUTOR_STUDY_BUDDY_CANON.md` for the overall product contract.
4. Use `docs/root/GUIDE_DEV.md` for canonical run/build/test commands.
5. Then apply home-directory defaults from:
   - `C:\Users\treyt\.claude\CLAUDE.md`
   - `C:\Users\treyt\.codex\AGENTS.md`

## Instruction Canon

- This file is the only project-specific policy source for `C:\pt-study-sop`.
- Repo compatibility entrypoints (`CLAUDE.md`, `.claude/AGENTS.md`, `.claude/CLAUDE.md`) must defer to this file and must not carry independent project policy.
- Repo-local Claude agents (`.claude/agents/*`) and command shims (`.claude/commands/*`) must read this file first, then apply only their role-specific delta.
- Global home-directory defaults (`C:\Users\treyt\.claude\CLAUDE.md`, `C:\Users\treyt\.claude\rules\*`, `C:\Users\treyt\.claude\agents\*`, `C:\Users\treyt\.codex\AGENTS.md`, `C:\Users\treyt\.codex\agents\*.toml`, `C:\Users\treyt\.codex\rules\default.rules`) stay cross-project only and must defer to repo canon when this repo is active.
- If a repo-local agent name overlaps with a home-directory agent name, the repo-local agent wins for this project.
- If nested/module `AGENTS.md` files are added later, they override this root file only for their own subtree and still stay above home-directory defaults because they are repo-local canon.

## Live Sources Of Truth

- Product/system contract: `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
- Active execution board: `docs/root/TUTOR_TODO.md`
- Multi-agent live handoff board: `docs/root/AGENT_BOARD.md`
- Agent precedence and machine setup: `docs/root/AGENT_SETUP.md`
- Developer commands and build/test workflow: `docs/root/GUIDE_DEV.md`
- Technical architecture: `docs/root/PROJECT_ARCHITECTURE.md`
- Detailed incident learnings and troubleshooting: `docs/root/AGENT_GUARDRAILS.md`

## Non-Negotiable Run Rules

- **NEVER** use `npm run dev` or `vite dev` for this project.
- **ALWAYS** use `C:\pt-study-sop\Start_Dashboard.bat` to run the dashboard.
- Flask runs on port `5000`; use `http://127.0.0.1:5000`.
- If you change anything under `dashboard_rebuild/`, run `npm run build` in `dashboard_rebuild/`.
- `brain/static/dist/` is build output only. Do not hand-edit it.
- Default backend validation command: `pytest brain/tests/`

## Environment And Identity

- Repo root: `C:\pt-study-sop`
- Obsidian vault: `C:\Users\treyt\Desktop\Treys School`
- Editor: Codex CLI / Claude Code
- Git identity:
  - Name: `TreyT`
  - Email: `Treytucker05@yahoo.com`

## Critical Paths

- Database: `brain/data/pt_study.db`
- Session logs: `brain/session_logs/`
- Tutor API: `brain/dashboard/api_tutor.py`
- Frontend source: `dashboard_rebuild/`
- Frontend build output: `brain/static/dist/`
- Study materials storage: `brain/data/uploads/` + `brain/data/chroma_tutor/`
- SOP methodology: `sop/library/`
- Scholar outputs: `scholar/outputs/`
- Conductor: `conductor/`

## Critical Disambiguations

### "Library"

- **SOP Library**: `sop/library/`
  - Defines how Tutor teaches.
  - Contains methods, chains, and control-plane rules.
- **Study Materials Library**: `/library` route + `brain/data/`
  - Defines what Tutor teaches.
  - Contains the learner's PDFs, notes, slides, vectors, and material metadata.

Rule: when someone says "library" in this repo, determine which of those two they mean before editing or answering.

### Source-Of-Truth Order

- Overall product truth: `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
- Active work/status truth: `docs/root/TUTOR_TODO.md`
- Track registry/history: `conductor/tracks.md`
- Pedagogy truth: `sop/library/`

## Post-Implementation Checklist

1. Build the frontend if `dashboard_rebuild/` changed.
2. Run relevant checks. Default to `pytest brain/tests/`.
3. Update the active track plan if the work is track-scoped.
4. If the work is not track-scoped, append a dated entry to `conductor/tracks/GENERAL/log.md`.
5. Update `conductor/tracks.md` if track status changed.
6. Push after changes.

## Working Rules

1. Plan before any non-trivial change.
2. Do not begin major work until it is listed in the `Current Sprint` section of `docs/root/TUTOR_TODO.md`. If missing, add it first.
3. `dashboard_rebuild/` is frontend-only. API/runtime logic lives in `brain/`.
4. Do not edit `archive/` unless explicitly asked.
5. Safe-by-default git:
   - inspect status/diff before edits
   - do not use destructive commands like `reset --hard`, `clean`, or `rm` unless explicitly asked
6. Clean up scratch files, temp scripts, and one-off extraction outputs.
7. For multi-step work, keep a task list and complete one step at a time.
8. Use subagents for exploration, testing, and review when that reduces drift or keeps write scopes separate.

## Critical Guardrails

- When initializing React state from `localStorage`, wrap parsing in `try/catch` and validate the parsed shape.
- Destructive async UI flows must disable repeat actions, normalize optional payloads, and centralize close/reset behavior.
- Let shared dialog primitives handle centering. Do not hardcode modal `top/left/transform` positioning.
- If backend behavior looks unchanged after a fix, verify which PID is actually listening on port `5000` before trusting the result.
- Tutor scoped retrieval must carry explicit `content_filter.material_ids` and `accuracy_profile` when selected-material scope matters.
- Session delete should preserve best-effort Obsidian cleanup behavior plus persistent delete telemetry.

For the full incident log, troubleshooting snippets, and detailed guardrails, use `docs/root/AGENT_GUARDRAILS.md`.

## Reference Docs

- Agent setup: `docs/root/AGENT_SETUP.md`
- Developer guide: `docs/root/GUIDE_DEV.md`
- Technical architecture: `docs/root/PROJECT_ARCHITECTURE.md`
- Product canon: `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
- Active workboard: `docs/root/TUTOR_TODO.md`
- Multi-agent handoff board: `docs/root/AGENT_BOARD.md`
- Guardrails and troubleshooting: `docs/root/AGENT_GUARDRAILS.md`
