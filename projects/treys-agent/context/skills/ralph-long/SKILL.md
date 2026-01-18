---
name: ralph-long
description: Run the Ralph loop for a multi-iteration deep run in WSL (default 100) using the pt-study-sop worktree.
---

# Ralph Long

Use this for deep audits or long research runs. Default is 100 iterations.

## Steps
1) Ensure the worktree exists:
   `/mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop-worktrees/ralph-readiness`

2) Run the long loop (100 iterations, streaming output):
```bash
wsl -e bash -lc 'cd /mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop-worktrees/ralph-readiness && bash scripts/ralph/ralph.sh 100'
```

3) Optional logging (WSL path -> Windows file):
```bash
wsl -e bash -lc 'cd /mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop-worktrees/ralph-readiness && bash scripts/ralph/ralph.sh 100 | tee /mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop-worktrees/ralph-readiness/scripts/ralph/ralph_run_long_$(date +%Y%m%d_%H%M%S).log'
```

## Notes
- Uses `scripts/ralph/prd.json` and `scripts/ralph/prompt.md`.
- If you need a single story only, use the ralph-short skill.
