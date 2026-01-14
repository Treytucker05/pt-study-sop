Goal (incl. success criteria):
- Restore the intended dashboard header (title, buttons, shrink behavior) and ensure Scholar/Ralph panels show in main.
Constraints/Assumptions:
- Follow AGENTS.md; keep changes minimal and additive.
- Update CONTINUITY.md each turn.
- Run required checks or note skips: python -m pytest brain/tests, python scripts/release_check.py, manual Run_Brain_All.bat.
- Ask before destructive or irreversible actions.
Key decisions:
- Apply only the Scholar/Ralph dashboard + proposal running sheet + local-state session scripts to main (not unrelated changes).
State:
  - Done:
    - Copied Scholar/Ralph dashboard UI + API + proposal running sheet + local-state session scripts from ralph-readiness into main.
    - Updated opencode launcher default project path to main so session worktrees launch from pt-study-sop.
    - Copied `scripts/launch_codex_session.ps1` into main and updated `C:\Users\treyt\OneDrive\Desktop\LAUNCH_CODEX.bat` to default to main with error handling.
    - Identified a background dashboard server on port 5000 and terminated it to avoid serving the old header.
    - Restored top nav title text to "TREY'S STUDY SYSTEM" in main dashboard header.
    - Removed Overview/v3.0/TT header elements and added scroll-driven header collapse behavior.
  - Now:
    - Confirm header matches intended layout; capture correct nav button labels/order.
  - Next:
    - Adjust header buttons/labels to match your intended design.

Open questions (UNCONFIRMED if needed):
- What exact button labels/order should the header use?

Working set (files/ids/commands):
- CONTINUITY.md
- brain/templates/dashboard.html
- brain/static/js/dashboard.js
- brain/static/css/dashboard.css
- brain/dashboard/scholar.py
- brain/dashboard/routes.py
- scripts/build_proposal_sheet.py
- docs/roadmap/proposal_running_sheet.md
- scripts/new_session_worktree.ps1
- scripts/mark_local_state.ps1
- scripts/launch_opencode_session.ps1
- C:\Users\treyt\OneDrive\Desktop\opencode_openrouter.bat
- C:\Users\treyt\OneDrive\Desktop\LAUNCH_CODEX.bat
