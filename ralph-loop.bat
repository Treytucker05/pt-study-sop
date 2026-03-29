@echo off
title Ralph Loop - PT Study SOP
color 0A

set GIT_BASH="C:\Program Files\Git\bin\bash.exe"
set REPO=/c/pt-study-sop

echo ============================================
echo   RALPH LOOP - PT Study SOP
echo   Multi-Agent Autonomous Coding
echo ============================================
echo.
echo  Commands:
echo    1) Codex Medium  - Balanced (default)
echo    2) Codex Spark   - Fast/cheap (simple fixes)
echo    3) Claude Code   - Deep reasoning (hard features)
echo    4) Gemini CLI    - Fresh perspective (unstick)
echo    5) Status        - Check progress
echo    6) Exit
echo.
echo ============================================
echo.

cd /d C:\pt-study-sop

:menu
set /p choice="Pick [1-6]: "

if "%choice%"=="1" goto codex
if "%choice%"=="2" goto spark
if "%choice%"=="3" goto claude
if "%choice%"=="4" goto gemini
if "%choice%"=="5" goto status
if "%choice%"=="6" goto end
goto menu

:codex
echo.
echo [Codex gpt-5.4 medium] Starting Ralph...
echo.
%GIT_BASH% -c "cd %REPO% && .agents/ralph/loop.sh build 40"
echo.
echo Done. Check .ralph\progress.md
echo.
goto menu

:spark
echo.
echo [Codex Spark] Starting Ralph (fast mode)...
echo.
%GIT_BASH% -c "cd %REPO% && AGENT_CMD='codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -c model=gpt-5.3-codex-spark -c model_reasoning_effort=low -' .agents/ralph/loop.sh build 40"
echo.
echo Done. Check .ralph\progress.md
echo.
goto menu

:claude
echo.
echo [Claude Code] Starting Ralph (deep reasoning)...
echo.
%GIT_BASH% -c "cd %REPO% && AGENT_CMD='claude -p --dangerously-skip-permissions' .agents/ralph/loop.sh build 40"
echo.
echo Done. Check .ralph\progress.md
echo.
goto menu

:gemini
echo.
echo [Gemini CLI] Starting Ralph (fresh perspective)...
echo.
%GIT_BASH% -c "cd %REPO% && AGENT_CMD='gemini --yolo -' .agents/ralph/loop.sh build 40"
echo.
echo Done. Check .ralph\progress.md
echo.
goto menu

:status
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
echo === Last 10 Activity ===
if exist .ralph\activity.log (
    powershell -Command "Get-Content .ralph\activity.log | Select-Object -Last 10"
) else (
    echo No activity yet.
)
echo.
goto menu

:end
exit /b 0
