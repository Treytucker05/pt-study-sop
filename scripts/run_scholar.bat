@echo off
setlocal enabledelayedexpansion

REM NOTE: This file must use CRLF line endings; LF-only can break CALL/GOTO label scanning.
REM Repo root = parent of scripts folder
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%"

echo.
echo === The Scholar Launcher ===
echo Repo: %REPO_ROOT%
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: git not found in PATH.
  pause
  exit /b 1
)

REM Ensure correct branch
git rev-parse --verify scholar-orchestrator-loop >nul 2>&1
if errorlevel 1 (
  echo ERROR: Branch scholar-orchestrator-loop not found. Create it first.
  pause
  exit /b 1
)

git checkout scholar-orchestrator-loop >nul 2>&1
if errorlevel 1 (
  echo ERROR: Failed to checkout scholar-orchestrator-loop.
  pause
  exit /b 1
)

set "DEBUG=0"

:menu
echo.
echo Choose:
echo   1) Run Scholar (no web search)
echo   2) Run Scholar (with web search + DANGEROUS bypass)
echo   3) Open scholar\outputs
echo   4) Toggle DEBUG (currently !DEBUG!)
echo   5) Run Scholar UNATTENDED (codex exec, web search + YOLO)
echo   6) Exit
set /p choice=Enter choice (1-6): 

if "%choice%"=="1" goto run_noweb
if "%choice%"=="2" goto run_web
if "%choice%"=="3" goto open_outputs
if "%choice%"=="4" goto toggle_debug
if "%choice%"=="5" goto run_unattended
if "%choice%"=="6" goto end

echo Invalid choice.
goto menu

:toggle_debug
if "!DEBUG!"=="0" (set "DEBUG=1") else (set "DEBUG=0")
echo DEBUG is now !DEBUG!
goto menu

:open_outputs
start "" "%REPO_ROOT%\scholar\outputs"
goto menu

:run_noweb
echo.
echo Running Codex CLI (interactive, no web search)...
echo.
if "!DEBUG!"=="1" call :debug_dump

set "PROMPT_REL=scholar\workflows\orchestrator_run_prompt.md"
set "PROMPT_ABS=%REPO_ROOT%\%PROMPT_REL%"
if not exist "%PROMPT_ABS%" (
  echo ERROR: Prompt file not found: "%PROMPT_ABS%"
  pause
  goto menu
)

set "INIT_PROMPT=Open %PROMPT_REL% and follow it exactly. Start by asking any clarifying questions required by that file. Write outputs only under scholar/outputs/. Do not modify sop/, brain/, or dist/."

start "The Scholar (Codex)" cmd /k ^
"cd /d "%REPO_ROOT%" ^&^& echo CWD: %%CD%% ^&^& echo Orchestrator: %PROMPT_REL% ^&^& codex --cd "%REPO_ROOT%" "%INIT_PROMPT%" ^& echo. ^& echo Codex exit code: %%errorlevel%% ^& echo. ^& pause"
goto menu

:run_web
echo.
echo Running Codex CLI (interactive, web search + DANGEROUS bypass)...
echo WARNING: No sandbox; no approvals. Use only if you understand the risk.
echo.
if "!DEBUG!"=="1" call :debug_dump

set "PROMPT_REL=scholar\workflows\orchestrator_run_prompt.md"
set "PROMPT_ABS=%REPO_ROOT%\%PROMPT_REL%"
if not exist "%PROMPT_ABS%" (
  echo ERROR: Prompt file not found: "%PROMPT_ABS%"
  pause
  goto menu
)

set "INIT_PROMPT=Open %PROMPT_REL% and follow it exactly. Start by asking any clarifying questions required by that file. Write outputs only under scholar/outputs/. Do not modify sop/, brain/, or dist/. Use web search whenever you hit an unanswered question."

start "The Scholar (Codex)" cmd /k ^
"cd /d "%REPO_ROOT%" ^&^& echo CWD: %%CD%% ^&^& echo Orchestrator: %PROMPT_REL% ^&^& codex --cd "%REPO_ROOT%" --search --yolo "%INIT_PROMPT%" ^& echo. ^& echo Codex exit code: %%errorlevel%% ^& echo. ^& pause"
goto menu

:run_unattended
echo.
echo Running Scholar UNATTENDED (codex exec, web search + YOLO)...
echo WARNING: This bypasses approvals/sandbox. Do not leave it unattended unless you trust this repo state.
echo.
set "PROMPT_ABS=%REPO_ROOT%\scholar\workflows\orchestrator_run_prompt.md"
if not exist "%PROMPT_ABS%" (
  echo ERROR: Prompt file not found: "%PROMPT_ABS%"
  pause
  goto menu
)

for /f "tokens=1-3 delims=/- " %%a in ("%date%") do set "YYYYMMDD=%%c-%%a-%%b"
for /f "tokens=1-3 delims=:." %%h in ("%time%") do set "HHMMSS=%%h%%i%%j"
set "RUN_DIR=%REPO_ROOT%\scholar\outputs\orchestrator_runs"
if not exist "%RUN_DIR%" mkdir "%RUN_DIR%"

set "LOG_PATH=%RUN_DIR%\unattended_%YYYYMMDD%_%HHMMSS%.log"
set "FINAL_PATH=%RUN_DIR%\unattended_final_%YYYYMMDD%_%HHMMSS%.md"
set "TMP_PROMPT=%RUN_DIR%\unattended_prompt_%YYYYMMDD%_%HHMMSS%.txt"
set "QUESTIONS_PATH=%RUN_DIR%\questions_needed_%YYYYMMDD%_%HHMMSS%.md"

echo Creating unattended prompt: "%TMP_PROMPT%"
(
  echo UNATTENDED MODE OVERRIDE:
  echo - You are running non-interactively via `codex exec`. Do NOT ask questions in the terminal.
  echo - Default scope: process M0-M6 cycle + bridges first.
  echo - If you need clarification, write questions to: %QUESTIONS_PATH%
  echo - Continue with best-effort defaults unless blocked. If blocked or looping ^> 60 minutes, stop and write a blocker summary to orchestrator_runs.
  echo - Write outputs ONLY under scholar/outputs/. Do NOT modify sop/, brain/, or dist/.
  echo - Do NOT generate Promotion Queue artifacts unless the orchestrator explicitly allows it without human approval.
  echo ---
) > "%TMP_PROMPT%"
type "%PROMPT_ABS%" >> "%TMP_PROMPT%"

echo.
echo Launching codex exec...
echo Log:   "%LOG_PATH%"
echo Final: "%FINAL_PATH%"
echo Questions: "%QUESTIONS_PATH%"
echo.

codex --search exec --cd "%REPO_ROOT%" --yolo --output-last-message "%FINAL_PATH%" - < "%TMP_PROMPT%" >> "%LOG_PATH%" 2>&1
set "EC=%ERRORLEVEL%"

echo.
echo Codex exit code: %EC%
echo --- Last message written to: %FINAL_PATH%
echo --- Full log written to: %LOG_PATH%
echo --- Any questions for you: %QUESTIONS_PATH%
echo.
pause
goto menu

:debug_dump
echo.
echo === DEBUG DUMP ===
echo Current dir: %CD%
echo Script file: "%~f0"
echo Repo root: "%REPO_ROOT%"
echo Codex version:
codex --version
echo.
echo Codex help (filtered):
codex --help | findstr /i "--cd --search --yolo"
echo.
exit /b 0

:end
endlocal
exit /b 0
