Goal (incl. success criteria):
- Make Ralph's first story an audit of the Scholar system, and document how to run Ralph next time.

Constraints/Assumptions:
- Follow pt-study-sop AGENTS.md; update this Continuity Ledger each turn and on state changes.
- Keep changes minimal and scoped; ask before destructive actions.
- Repo currently has many uncommitted changes; avoid committing unrelated files.

Key decisions:
- Use `codex exec --dangerously-bypass-approvals-and-sandbox -` in the Ralph loop (danger-full-access, no prompts).
- Update the Ralph skill file and add a repo runbook for future runs.

State:
  - Done:
    - Added a new US-001 in `scripts/ralph/prd.json` to audit the Scholar system and shifted other stories down.
    - Updated `scripts/ralph/prompt.md` to mention Codex CLI explicitly.
    - Added `scripts/ralph/README.md` runbook.
    - Updated `C:\Users\treyt\.codex\skills\ralph\SKILL.md` with runner notes and Codex guidance.
  - Now:
    - Need user guidance on how to handle existing uncommitted changes before running Ralph.
  - Next:
    - Based on user choice: stash/commit/clean worktree, then rerun `./scripts/ralph/ralph.sh`.

Open questions (UNCONFIRMED if needed):
- How should we handle the existing uncommitted changes before Ralph runs?

Working set (files/ids/commands):
- C:\Users\treyt\OneDrive\Desktop\pt-study-sop\scripts\ralph\prd.json
- C:\Users\treyt\OneDrive\Desktop\pt-study-sop\scripts\ralph\prompt.md
- C:\Users\treyt\OneDrive\Desktop\pt-study-sop\scripts\ralph\README.md
- C:\Users\treyt\.codex\skills\ralph\SKILL.md
- C:\Users\treyt\OneDrive\Desktop\pt-study-sop\CONTINUITY.md