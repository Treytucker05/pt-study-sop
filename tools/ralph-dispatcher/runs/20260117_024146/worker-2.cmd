@echo off
setlocal
wsl.exe -e bash -lc ""codex exec --full-auto --sandbox workspace-write --skip-git-repo-check -C '/mnt/c/Users/treyt/OneDrive/Desktop' - < '/mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop/tools/ralph-dispatcher/runs/20260117_024146/task-2.txt' | tee '/mnt/c/Users/treyt/OneDrive/Desktop/pt-study-sop/tools/ralph-dispatcher/runs/20260117_024146/worker-2.txt'""