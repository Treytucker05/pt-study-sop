@echo off
setlocal EnableDelayedExpansion

set "REPO=C:\pt-study-sop"
set "BUN_BIN=%USERPROFILE%\.bun\bin"
set "NPM_BIN=%APPDATA%\npm"
set "CHOCO_BIN=C:\ProgramData\chocolatey\bin"
set "PRD_JSON=%REPO%\scripts\ralph\prd.json"
set "PRD_DIR=%REPO%\tasks"
set "RALPH_TUI_DIR=%REPO%\.ralph-tui"
set "RALPH_LOCK=%RALPH_TUI_DIR%\ralph.lock"
set "RALPH_SESSION=%RALPH_TUI_DIR%\session.json"
set "RALPH_SESSION_META=%RALPH_TUI_DIR%\session-meta.json"
set "STALE_MINUTES=10"

cd /d "%REPO%"
set "PATH=%NPM_BIN%;%BUN_BIN%;%CHOCO_BIN%;%PATH%"

:menu
cls
echo.
echo ========================================
echo   RALPH - Autonomous Coding Loops
echo ========================================
echo.
echo   Both tools run AI agents in a loop until done.
echo   They keep working while you're away.
echo.
echo   [1] RALPH-TUI (PRD Mode)
echo       - For planned features with multiple user stories
echo       - You create PRD with Claude Code skill first
echo       - Uses: OpenCode (your API)
echo.
echo   [2] RALPHY (Quick Task Mode)  
echo       - For single tasks, no PRD needed
echo       - Just type what you want done
echo       - Uses: OpenCode (your API)
echo.
echo   [3] Help - Show detailed instructions
echo   [4] Status - Check Ralph session health
echo.
echo   [Q] Quit
echo.
echo ========================================
echo.
set /p CHOICE="Pick an option (1/2/3/Q): "

if /i "%CHOICE%"=="1" goto :ralph_tui
if /i "%CHOICE%"=="2" goto :ralphy
if /i "%CHOICE%"=="3" goto :help
if /i "%CHOICE%"=="4" goto :status
if /i "%CHOICE%"=="q" exit /b 0
goto :menu

:help
cls
echo.
echo ========================================
echo   DETAILED INSTRUCTIONS
echo ========================================
echo.
echo   === RALPH-TUI (Option 1) ===
echo.
echo   Best for: Features with 3+ user stories
echo.
echo   Workflow:
echo     1. Open Claude Code
echo     2. Say: "Create a PRD for [your feature]"
echo     3. It saves to: tasks\prd-yourfeature.md
echo     4. Run this script, pick option 1
echo     5. It converts PRD to JSON and runs the loop
echo     6. Walk away - it works through each story
echo.
echo   ---
echo.
echo   === RALPHY (Option 2) ===
echo.
echo   Best for: Single tasks (1-2 hours of work)
echo.
echo   Workflow:
echo     1. Pick option 2
echo     2. Type your task
echo     3. Walk away - it loops until done
echo.
echo   Examples:
echo     - add date filter to the users table
echo     - fix the authentication bug in login.tsx
echo     - refactor the API to use async/await
echo.
echo ========================================
echo.
pause
goto :menu

:status
cls
echo.
echo ========================================
echo   RALPH SESSION STATUS
echo ========================================
echo.
call :print_status
echo.
pause
goto :menu

:ralphy
cls
echo.
echo ========================================
echo   RALPHY - Quick Task Mode (OpenCode)
echo ========================================
echo.
echo   Type your task (or Q to go back):
echo.
set /p TASK="Task: "

if /i "%TASK%"=="q" goto :menu
if "%TASK%"=="" goto :ralphy

echo.
echo Starting Ralphy with OpenCode...
echo.
call ralphy --opencode "%TASK%"
echo.
pause
goto :menu

:print_status
if not exist "%RALPH_SESSION%" (
    echo No session.json found at:
    echo   %RALPH_SESSION%
    goto :eof
)
powershell -NoProfile -Command "$p='%RALPH_SESSION%'; if (Test-Path $p) { $s = Get-Content -Raw $p | ConvertFrom-Json; $u = [DateTimeOffset]::Parse($s.updatedAt); $mins = [int]([DateTimeOffset]::UtcNow - $u).TotalMinutes; Write-Host ('Status: ' + $s.status); Write-Host ('Updated: ' + $s.updatedAt + ' (~' + $mins + ' min ago)'); Write-Host ('Iteration: ' + $s.currentIteration + '/' + $s.maxIterations); Write-Host ('Tasks completed: ' + $s.tasksCompleted); if ($s.activeTaskIds) { Write-Host ('Active task(s): ' + ($s.activeTaskIds -join ', ')) } if ($mins -ge %STALE_MINUTES%) { Write-Host ('WARNING: No updates for ' + $mins + ' min; likely stuck.') } } else { Write-Host 'No session.json found.' }"
goto :eof

:ralph_tui
cls
echo.
echo ========================================
echo   RALPH-TUI - PRD Mode (OpenCode)
echo ========================================
echo.

REM Check for existing Ralph TUI session lock
if exist "%RALPH_LOCK%" goto :ralph_tui_lock
goto :ralph_tui_after_lock

:ralph_tui_lock
echo.
echo ========================================
echo   EXISTING SESSION DETECTED
echo ========================================
echo.
echo A Ralph TUI session lock was found:
echo   %RALPH_LOCK%
echo.
call :print_status
echo.
echo [R] Resume session
echo [F] Force resume (override lock)
echo [S] Start fresh (delete lock/session state)
echo [B] Back to menu
echo.
set /p LCHOICE="Choice: "

if /i "!LCHOICE!"=="r" (
    echo.
    echo Resuming Ralph TUI...
    call ralph-tui resume
    echo.
    pause
    goto :menu
)
if /i "!LCHOICE!"=="f" (
    echo.
    echo Force-resuming Ralph TUI...
    call ralph-tui resume --force
    echo.
    pause
    goto :menu
)
if /i "!LCHOICE!"=="s" goto :ralph_tui_clear_lock
if /i "!LCHOICE!"=="b" goto :menu
goto :ralph_tui_lock

:ralph_tui_clear_lock
echo.
echo This will delete the Ralph TUI lock and session files:
echo   %RALPH_LOCK%
if exist "%RALPH_SESSION%" echo   %RALPH_SESSION%
if exist "%RALPH_SESSION_META%" echo   %RALPH_SESSION_META%
echo.
set /p CONFIRM="Type YES to delete and start fresh: "
if /i not "!CONFIRM!"=="YES" (
    echo Cancelled.
    pause
    goto :menu
)
del /q "%RALPH_LOCK%" >nul 2>&1
del /q "%RALPH_SESSION%" >nul 2>&1
del /q "%RALPH_SESSION_META%" >nul 2>&1
echo Cleared. Continuing...
echo.

:ralph_tui_after_lock
REM Check for markdown PRDs in tasks folder
set "MD_PRD="
for %%f in ("%PRD_DIR%\prd-*.md") do (
    set "MD_PRD=%%f"
)

REM If markdown PRD exists, offer to convert
if defined MD_PRD (
    echo Found PRD: !MD_PRD!
    echo.
    echo [C] Convert to JSON and run
    echo [S] Skip and use existing JSON
    echo [B] Back to menu
    echo.
    set /p PCHOICE="Choice: "
    
    if /i "!PCHOICE!"=="c" (
        echo.
        echo Converting to JSON...
        call ralph-tui convert --to json "!MD_PRD!" -o "%PRD_JSON%" --force
        if errorlevel 1 (
            echo Conversion failed!
            pause
            goto :menu
        )
        echo Conversion complete.
        goto :run_tui
    )
    if /i "!PCHOICE!"=="b" goto :menu
)

REM Make sure PRD JSON exists
if not exist "%PRD_JSON%" (
    echo No PRD found.
    echo.
    echo Create a PRD first:
    echo   1. Open Claude Code
    echo   2. Say: "Create a PRD for [your feature]"
    echo   3. It saves to tasks\prd-yourfeature.md
    echo   4. Come back here
    echo.
    pause
    goto :menu
)

:run_tui
echo.

REM Check story count
powershell -NoProfile -Command "$c = (Get-Content '%PRD_JSON%' | ConvertFrom-Json).userStories.Count; Write-Host $c" > "%TEMP%\ralph_count.txt" 2>&1
set /p STORY_COUNT=<"%TEMP%\ralph_count.txt"

if "%STORY_COUNT%"=="" set STORY_COUNT=0
if "%STORY_COUNT%"=="0" (
    echo PRD has no user stories.
    echo Add stories to your PRD markdown and re-convert.
    pause
    goto :menu
)

echo Starting Ralph-TUI with %STORY_COUNT% stories...
echo.
call ralph-tui run --prd "%PRD_JSON%" --agent opencode
echo.
pause
goto :menu

endlocal
