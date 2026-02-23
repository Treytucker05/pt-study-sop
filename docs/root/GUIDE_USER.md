# PT Study System — User Guide

## Who This Is For
Learners using the system to run study sessions, track progress, and improve performance across DPT coursework.

## System Overview (At a Glance)
The study lifecycle is:
1. Obsidian notes + study prompts → Tutor session.
2. Tutor produces WRAP log with key points + highlights.
3. Brain ingests WRAP → metrics/issues + Anki drafts + polished notes.
4. Brain pushes WRAP highlights into Obsidian (adds to existing notes).
5. Scholar audits Brain data → questions, hypotheses, proposals.
6. Dashboard/Calendar surface priorities → next Tutor targets.

## Cold Start (No Preloaded Courses / Exams / Notes)
Minimum to start:
1. Create a Course (name only) OR log a WRAP with a course name.
2. Save WRAP to `brain/session_logs/` (or upload via Dashboard).

What the system does automatically:
- Creates missing entities (Course, Topic tags) from WRAP metadata.
- Generates a default Daily Queue even with no exams entered.
- Computes Weak Areas as an output (from misses/error themes), not an input.

Optional later:
- Add assessments (date optional).
- Add availability/time blocks.
- Connect Calendar/Tasks + Anki sync.

## Quick Start
1. Open Obsidian at `C:\Users\treyt\Desktop\Treys School`.
2. Start Tutor (Custom GPT) and use the runtime prompt: `sop/runtime/runtime_prompt.md`.
3. Launch Dashboard with `Start_Dashboard.bat` and open `http://127.0.0.1:5000`.
4. Save WRAP logs to `brain/session_logs/` or use Dashboard upload.

## Tutor Sessions
- Tutor follows the SOP (M0–M6) and ends with WRAP output.
- If no sources are provided, outputs are marked **unverified**.
- For the step-by-step tutor interaction flow and session-state behavior, see [`GUIDE_TUTOR_FLOW.md`](./GUIDE_TUTOR_FLOW.md).

## Where Your Data Lives
- Session logs: `brain/session_logs/*.md`
- Database: `brain/data/pt_study.db`
- Obsidian notes: `C:\Users\treyt\Desktop\Treys School` (see `projects/pt-study-sop/`)
- Scholar outputs: `scholar/outputs/`

## Troubleshooting
- If nothing shows in the Dashboard, confirm WRAP logs exist in `brain/session_logs/` and run ingestion.
- If Calendar sync fails, verify OAuth credentials in `brain/data/api_config.json`.
- If the Brain page goes black, you are likely running a stale frontend bundle. Restart `Start_Dashboard.bat` and hard refresh the browser (Ctrl+F5). If it persists, rebuild the UI (`cd dashboard_rebuild; npm run build`) and restart the dashboard.

## Next Milestones (User-Facing)
- Brain WRAP buckets and Anki template standardization.
- Scholar improvement loop for weekly research and proposals.
