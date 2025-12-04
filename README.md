# PT Study SOP — v8.6 (Active Architect)

This repository hosts the PT Study SOP packages. The `current/` directory contains the **current release v8.6 (Active Architect)**, and `legacy/` stores prior versions for reference.

## Current Release (`current/v8.6/`)
The v8.6 package is ready to paste into GPT tools and session chats. Contents are grouped for quick navigation:

- `Custom_GPT_Instructions.md` — Persona and global rules (Phonetic Override, Gated Platter, Priming).
- `Runtime_Prompt.md` — Session-start script with scope check, stall fallbacks, and operating rules.
- `Master_Index.md` — Map of all current assets.
- `modules/` — Core learning tools:
  - `Module_1_Core_Protocol.md` — Prime → Encode → Gate → Build workflow with level gating.
  - `Module_2_Modes.md` — Diagnostic Sprint (fail-first), Core Mode, Drill Mode.
  - `Module_4_Recap_Engine.md` — WRAP recap with operator script and collaborative Anki creation.
  - `Module_5_Example_Flows.md` — Gated Platter, Diagnostic Sprint, Core walkthrough, and command cheat sheet.
  - `Module_6_Framework_Library.md` — Quick-reference cues plus H-Series (Priming) and M-Series (Encoding) tools with 4-10-HS-PT levels.

### Quick Start
1. Load **Custom_GPT_Instructions.md** into your GPT/custom instructions.
2. Begin a session with **Runtime_Prompt.md**.
3. Use Modules 1, 2, 4, 5, and 6 during facilitation; reference **Master_Index.md** as a guide.

## Legacy Packages
Older versions remain in `legacy/` for comparison and rollback needs:

- `legacy/v8.5.1_Spotter_Prime/` — Spotter Prime and prior v8.x archives (v8.5.1, v8.4, v8.3, v8.1.1).
- Additional historical docs (v7.x series) and indices.

Use the legacy materials only if you need historical behavior; v8.6 in `current/v8.6/` is the production build.

## Quick Run & Ingest Checklist (Brain System)
- Launch dashboard: `python Run_PT_Study_Brain_AllInOne.py` then open http://127.0.0.1:5000
- Log a session (markdown) into `pt_study_brain/session_logs/` using the template fields (Date, Time, Topic, Mode, Time Spent, ratings, reflections)
- (Optional) create a pre-filled log: `python pt_study_brain/new_session.py <topic>` → edit the new file
- Ingest: `python pt_study_brain/ingest_session.py pt_study_brain/session_logs/<your_session>.md`
- Generate AI resume (paste into chat): `python pt_study_brain/generate_resume.py`
- View analytics: `python pt_study_brain/dashboard.py` or use the web dashboard
- Backup (optional): zip `pt_study_brain/data/pt_study.db` and `session_logs/` after big study runs
- Session log template is stored at `pt_study_brain/session_logs/template.md` (copy it, fill in, then ingest)
