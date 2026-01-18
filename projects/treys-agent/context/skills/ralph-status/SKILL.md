---
name: ralph-status
description: Check if a Ralph run is active and tail the most recent log.
---

# Ralph Status

Use this to see whether Ralph is currently running and to view recent output.

## Steps (Windows)
1) List WSL Ralph processes (from PowerShell):
```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "ralph-readiness" }
```

2) Tail the newest log in the worktree:
```powershell
Get-ChildItem -Path C:\Users\treyt\OneDrive\Desktop\pt-study-sop-worktrees\ralph-readiness\scripts\ralph | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

3) Tail the log:
```powershell
Get-Content -Path C:\Users\treyt\OneDrive\Desktop\pt-study-sop-worktrees\ralph-readiness\scripts\ralph\<LOG_NAME> -Tail 50
```

## Steps (WSL)
1) Check for the Ralph run:
```bash
ps aux | grep ralph.sh
```

2) Tail the newest log (if using tee):
```bash
ls -t /mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop-worktrees/ralph-readiness/scripts/ralph | head -n 5
```

3) Tail:
```bash
tail -n 50 /mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop-worktrees/ralph-readiness/scripts/ralph/<LOG_NAME>
```
