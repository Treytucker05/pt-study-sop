@echo off
title Ralph Loop - PT Study SOP
color 0A

echo ============================================
echo   RALPH LOOP - PT Study SOP
echo   Autonomous AI Coding Agent
echo ============================================
echo.
echo  Repo: C:\pt-study-sop
echo  Agent: Codex
echo  PRD: .agents\tasks\prd.json
echo.
echo  How it works:
echo    Ralph reads prd.json for unfinished stories.
echo    Each iteration spawns a FRESH Codex with clean context.
echo    Codex makes changes, builds, runs dev-browser to verify.
echo    If verification passes, it commits and moves to next story.
echo    If it fails, next iteration retries with fresh context.
echo    Progress saved in .ralph\progress.md and git history.
echo.
echo  Commands:
echo    1) Build   - Run the loop (fix bugs autonomously)
echo    2) PRD     - Generate or edit the task list
echo    3) Status  - Check progress and PRD status
echo    4) Context - View what Ralph knows about this project
echo    5) Exit
echo.
echo ============================================
echo.

cd /d C:\pt-study-sop

:menu
set /p choice="Pick [1-5]: "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto prd
if "%choice%"=="3" goto status
if "%choice%"=="4" goto context
if "%choice%"=="5" goto end
goto menu

:build
echo.
echo Starting Ralph build loop with Codex...
echo Each iteration = fresh Codex + build + dev-browser verify
echo Press Ctrl+C to stop at any time.
echo.
ralph build --agent=codex
echo.
echo Ralph finished. Check .ralph\progress.md for results.
echo.
goto menu

:prd
echo.
echo Opening PRD generator...
echo.
ralph prd --agent=codex
echo.
goto menu

:status
echo.
echo === Progress Log ===
if exist .ralph\progress.md (
    type .ralph\progress.md
) else (
    echo No progress yet. Run a build first.
)
echo.
echo === PRD Stories ===
if exist .agents\tasks\prd.json (
    findstr /i "title passes" .agents\tasks\prd.json
) else (
    echo No PRD found. Run option 2 to create one.
)
echo.
echo === Recent Commits ===
git log --oneline -5
echo.
goto menu

:context
echo.
echo === Project Context (what Ralph knows) ===
echo.
if exist .agents\ralph\references\PROJECT_CONTEXT.md (
    type .agents\ralph\references\PROJECT_CONTEXT.md
) else (
    echo No project context found.
)
echo.
echo === Guardrails (mistakes to avoid) ===
echo.
if exist .ralph\guardrails.md (
    type .ralph\guardrails.md
) else (
    echo No guardrails found.
)
echo.
goto menu

:end
echo.
echo Ralph out.
exit /b 0
