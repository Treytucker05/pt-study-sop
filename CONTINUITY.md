Goal (incl. success criteria):
- Audit repo and clean up unused files by deleting generated caches and temp artifacts.
- Review pre-existing modified/untracked files and revert unrelated changes.
- Keep v9.2 as current; preserve logs/runs and sensitive config files.
Constraints/Assumptions:
- Follow AGENTS.md; keep changes minimal and additive.
- Update CONTINUITY.md each turn.
- Do not delete v9.2, scholar outputs/runs/logs, .env, or GoogleCalendarTasksAPI.json.
- Ask before destructive or irreversible actions (confirmed for cleanup).
Key decisions:
- Keep all run logs and scholar outputs intact.
- Delete generated __pycache__ and .pyc files, plus tmpclaude-5fc3-cwd.
- Add ignore rule for tmpclaude-* temp folders.
State:
  - Done:
    - Completed deeper scan for orphaned files and logs.
    - Confirmed v9.2 is current and logs/runs must be kept.
    - Removed __pycache__ directories and tmpclaude-5fc3-cwd.
    - Updated .gitignore to ignore tmpclaude-* temp folders.
    - Reverted unrelated file edits and removed untracked dashboard_clean.css.
  - Now:
    - Verify cleanup is complete; only .gitignore, CONTINUITY.md, and tmpclaude deletion remain.
  - Next:
    - Optional: commit cleanup changes if desired.
Open questions (UNCONFIRMED if needed):
- None.
Working set (files/ids/commands):
- CONTINUITY.md
- .gitignore
- tmpclaude-5fc3-cwd (deleted)
