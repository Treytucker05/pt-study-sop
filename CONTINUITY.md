Goal (incl. success criteria):
- Implement Brain intake pipeline: paste tutor notes into intake, use LLM to sort outputs (Anki, Obsidian, mastery, class, time spent, what worked/didn’t, tutor fixes).
- Success = intake UI wired + backend endpoint to process intake + stored outputs ready for Anki/Obsidian/mastery views.
Constraints/Assumptions:
- Follow repo AGENTS.md; avoid secrets; keep edits scoped/additive.
- LLM provider/config not yet confirmed.
Key decisions:
- Start with Brain intake flow and data shape alignment (Step 1).
State:
  - Done:
    - Identified dashboard surfaces and gaps; roadmap in `docs/roadmap/dashboard_surface_gap_plan.md`.
  - Now:
    - Inspect current Brain/Tutor intake and session data shape.
  - Next:
    - Design intake payload + storage, then implement UI + API.
Open questions (UNCONFIRMED if needed):
- Which LLM provider/config should run the intake (OpenAI/OpenRouter/local)?
- Where should outputs be stored (DB tables, files under `scholar/outputs`, or both)?
- Desired output schema for Anki/Obsidian/mastery (fields + formats)?
Working set (files/ids/commands):
- `brain/static/react/src/pages/brain.tsx`
- `brain/static/react/src/pages/tutor.tsx`
- `brain/dashboard/api_adapter.py`
- `brain/dashboard/routes.py`
