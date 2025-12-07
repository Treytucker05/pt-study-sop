# PT Study SOP - Codex Brief (v9.1 current, v9.2-dev staging)

Purpose (for Codex): orient before making changes. Treat root files as the v9.1 working set; stage experiments in `working/`; keep releases immutable.

## What matters right now
- Active set: `Custom_GPT_Instructions.md`, `Runtime_Prompt.md`, Modules 1/2/4/5/6, `Master_Index.md`, `Session_Log_Template.md`.
- Releases: `releases/v9.1/` is read-only. Do not edit unless explicitly told.
- Dev/staging: `working/` with `PLAN_v9.2_dev.md` holds experiments. Calendar sync is deferred until the semester ends.
- Logs live in `logs/`; every session should use `Session_Log_Template.md`.

## How to assist a session (fast path)
1) Load `Custom_GPT_Instructions.md` into custom instructions.
2) Paste `Runtime_Prompt.md` at session start (state/scope/mode check).
3) Use Modules 1/2/4/5/6 during facilitation; see `Master_Index.md` for mapping.
4) After session, fill `Session_Log_Template.md` and save to `logs/`.

## Handy commands (from repo root)
- Run log validator: `python pt-study-sop/scripts/check_logs.py`
- Launch dashboard: `python pt-study-sop/Run_PT_Study_Brain_AllInOne.py`
- Open dev plan: `code pt-study-sop/working/PLAN_v9.2_dev.md` (or your editor)

## Legacy
`legacy/` holds v7–v8.x snapshots; reference-only unless rolling back behavior.
