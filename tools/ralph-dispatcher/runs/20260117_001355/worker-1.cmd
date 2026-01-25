@echo off
setlocal
wsl.exe -e bash -lc ""codex exec --full-auto --sandbox workspace-write --skip-git-repo-check -C '/mnt/c/Users/treyt/OneDrive/Desktop/ralph-dispatcher/test-workspace' - < '/mnt/c/Users/treyt/OneDrive/Desktop/ralph-dispatcher/runs/20260117_001355/task-1.txt' | tee '/mnt/c/Users/treyt/OneDrive/Desktop/ralph-dispatcher/runs/20260117_001355/worker-1.txt'""