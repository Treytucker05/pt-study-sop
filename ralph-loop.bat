@echo off
title Ralph Loop - PT Study SOP
color 0A

set GIT_BASH="C:\Program Files\Git\bin\bash.exe"
set REPO=/c/pt-study-sop

echo ============================================
echo   RALPH LOOP - PT Study SOP
echo   Autonomous AI Coding Agent
echo ============================================
echo.
echo  Repo: C:\pt-study-sop
echo  PRD: .agents\tasks\prd.json
echo.
echo  Commands:
echo    1) Codex Medium  - Standard loop (balanced)
echo    2) Codex Spark   - Fast/cheap (simple fixes)
echo    3) Claude Code   - Deep reasoning (hard features)
echo    4) Status        - Check progress
echo    5) Exit
echo.
echo ============================================
echo.

cd /d C:\pt-study-sop

:menu
set /p choice="Pick [1-5]: "

if "%choice%"=="1" goto codex
if "%choice%"=="2" goto spark
if "%choice%"=="3" goto claude
if "%choice%"=="4" goto status
if "%choice%"=="5" goto end
goto menu

:codex
echo.
echo Starting Ralph with Codex gpt-5.4 (medium reasoning)...
echo.
%GIT_BASH% -c "cd %REPO% && .agents/ralph/loop.sh build 40"
echo.
echo Ralph finished. Check .ralph\progress.md for results.
echo.
goto menu

:spark
echo.
echo Starting Ralph with Codex Spark (fast/cheap)...
echo.
%GIT_BASH% -c "cd %REPO% && AGENT_CMD='codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -c model=gpt-5.3-codex-spark -c model_reasoning_effort=low -' .agents/ralph/loop.sh build 40"
echo.
echo Ralph finished. Check .ralph\progress.md for results.
echo.
goto menu

:claude
echo.
echo Starting Ralph with Claude Code (deep reasoning)...
echo.
%GIT_BASH% -c "cd %REPO% && AGENT_CMD='claude -p --dangerously-skip-permissions' .agents/ralph/loop.sh build 40"
echo.
echo Ralph finished. Check .ralph\progress.md for results.
echo.
goto menu

:status
echo.
echo === Progress Log ===
if exist .ralph\progress.md (
    type .ralph\progress.md | more
) else (
    echo No progress yet.
)
echo.
echo === PRD Stories ===
if exist .agents\tasks\prd.json (
    findstr /i "title status" .agents\tasks\prd.json
) else (
    echo No PRD found.
)
echo.
echo === Recent Commits ===
git log --oneline -8
echo.
goto menu

:end
echo.
echo Ralph out.
exit /b 0
