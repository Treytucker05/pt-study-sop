---
name: ralph-short
description: Run the Ralph loop for a single iteration in WSL (pt-study-sop worktree).
---

# Ralph Short

Use this when you want one iteration (one story) and to stop immediately after.

## Steps
1) Ensure the worktree exists:
   `/mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop-worktrees/ralph-readiness`

2) Run one iteration (streaming output):
```bash
wsl -e bash -lc 'cd /mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop-worktrees/ralph-readiness && bash scripts/ralph/ralph.sh 1'
```

3) Optional logging (WSL path -> Windows file):
```bash
wsl -e bash -lc 'cd /mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop-worktrees/ralph-readiness && bash scripts/ralph/ralph.sh 1 | tee /mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop-worktrees/ralph-readiness/scripts/ralph/ralph_run_short_$(date +%Y%m%d_%H%M%S).log'
```

## Notes
- Uses `scripts/ralph/prd.json` and `scripts/ralph/prompt.md`.
- If you need multiple iterations, use the ralph-long skill.
