# Ralph Runbook (pt-study-sop)

## Purpose
Use Ralph to execute one story at a time from `scripts/ralph/prd.json` with clean, auditable commits.

## Preconditions
- Ensure `codex` is installed and available in your shell.
- Start from a clean git state, or use a separate worktree to avoid committing unrelated changes.
- Confirm `scripts/ralph/prd.json` has the correct `branchName` and priorities.

## Recommended clean-run options
Pick one:
1) Stash current changes: `git stash push -u -m "ralph-prep"`
2) Create a new worktree: `git worktree add ../pt-study-sop-ralph -b <branch>`
3) Commit your current work on a separate branch before running Ralph.

## Run steps (WSL)
1) `cd /mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop`
2) Ensure the Ralph branch exists and is checked out:
   - Open prd.json, copy branchName, then run: `git checkout -b ralph/<name>` (if missing)
3) Smoke test with one iteration:
   - `./scripts/ralph/ralph.sh 1`
4) If successful, run a longer loop:
   - `./scripts/ralph/ralph.sh 10`

## Notes
- First Codex run may require sign-in.
- For Scholar stories, outputs must go in `scholar/outputs/`; do not modify `sop/`, `brain/`, or `dist/`.
- The loop runs required checks listed in `scripts/ralph/prompt.md`.