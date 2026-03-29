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
echo  Agent: Codex (default)
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
echo    2) Status  - Check progress and PRD status
echo    3) Context - View what Ralph knows about this project
echo    4) Exit
echo.
echo ============================================
echo.

cd /d C:\pt-study-sop

:menu
set /p choice="Pick [1-4]: "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto status
if "%choice%"=="3" goto context
if "%choice%"=="4" goto end
goto menu

:build
echo.
echo Starting Ralph build loop with Codex via Git Bash...
echo Each iteration = fresh Codex + build + dev-browser verify
echo Press Ctrl+C to stop at any time.
echo.
%GIT_BASH% -c "cd %REPO% && .agents/ralph/loop.sh build 40"
echo.
echo Ralph finished. Check .ralph\progress.md for results.
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
    findstr /i "title status" .agents\tasks\prd.json
) else (
    echo No PRD found.
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
goto menu

:end
echo.
echo Ralph out.
exit /b 0
