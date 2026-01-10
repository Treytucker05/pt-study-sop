@echo off
REM ============================================================================
REM Scholar Launcher - runs Scholar the same way as the Dashboard
REM No specific git branch required. Works from any branch.
REM See also: brain/dashboard/scholar.py run_scholar_orchestrator()
REM ============================================================================
setlocal EnableExtensions EnableDelayedExpansion
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%"

REM Branch check removed - Scholar now works from any branch (unified with dashboard behavior)
REM Previously required: scholar-orchestrator-loop branch

set "RUN_DIR=%REPO_ROOT%\scholar\outputs\orchestrator_runs"
if not exist "%RUN_DIR%" mkdir "%RUN_DIR%"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmmss"') do set "TS=%%i"
set "LOG_PATH=%RUN_DIR%\unattended_%TS%.log"
set "FINAL_PATH=%RUN_DIR%\unattended_final_%TS%.md"
set "PROMPT_FILE=%REPO_ROOT%\scholar\workflows\orchestrator_run_prompt.md"
set "STATUS_FILE=%REPO_ROOT%\scholar\outputs\STATUS.md"

goto menu

:menu
cls
call :refresh_status
set "LATEST_FINAL="
set "LATEST_QUESTIONS="
set "LATEST_COVERAGE="
set "QUESTIONS_STATUS=MISSING"
set "QUESTIONS_NOTE="
set "FINAL_NAME=(none)"
set "FINAL_TIME=(none)"
set "COVERAGE_COUNTS="

for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "$f='%RUN_DIR%'; $p='unattended_final_*.md'; if(Test-Path $f){$x=Get-ChildItem -Path $f -Filter $p -File; $x=Sort-Object -InputObject $x -Property LastWriteTime -Descending; $x=Select-Object -InputObject $x -First 1; if($x){$x.FullName}}"`) do set "LATEST_FINAL=%%L"
if defined LATEST_FINAL (
  for %%F in ("%LATEST_FINAL%") do set "FINAL_NAME=%%~nxF"
  for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "(Get-Item '%LATEST_FINAL%').LastWriteTime"`) do set "FINAL_TIME=%%T"
)

for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "$f='%RUN_DIR%'; $p='questions_needed_*.md'; if(Test-Path $f){$x=Get-ChildItem -Path $f -Filter $p -File; $x=Sort-Object -InputObject $x -Property LastWriteTime -Descending; $x=Select-Object -InputObject $x -First 1; if($x){$x.FullName}}"`) do set "LATEST_QUESTIONS=%%L"
if defined LATEST_QUESTIONS (
  for /f "usebackq delims=" %%Q in (`powershell -NoProfile -Command "$c=Get-Content -Raw '%LATEST_QUESTIONS%'; $t=$c.Trim(); if([string]::IsNullOrWhiteSpace($t) -or $t -eq '(none)'){ 'EMPTY' } else { 'NON-EMPTY' }"`) do set "QUESTIONS_STATUS=%%Q"
)
if "%QUESTIONS_STATUS%"=="NON-EMPTY" set "QUESTIONS_NOTE= (use option 4)"

for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "$f='%REPO_ROOT%\\scholar\\outputs\\system_map'; $p='coverage_checklist_*.md'; if(Test-Path $f){$x=Get-ChildItem -Path $f -Filter $p -File; $x=Sort-Object -InputObject $x -Property LastWriteTime -Descending; $x=Select-Object -InputObject $x -First 1; if($x){$x.FullName}}"`) do set "LATEST_COVERAGE=%%L"
if defined LATEST_COVERAGE (
  for /f "usebackq delims=" %%C in (`powershell -NoProfile -Command "$l=Get-Content '%LATEST_COVERAGE%'; $c=(Where-Object -InputObject $l -FilterScript {$_ -match '\[x\]'}).Count; $p=(Where-Object -InputObject $l -FilterScript {$_ -match '\[/\]'}).Count; $n=(Where-Object -InputObject $l -FilterScript {$_ -match '\[ \]'}).Count; $sep=' / '; \"Complete=$c$sep In progress=$p$sep Not started=$n\""` ) do set "COVERAGE_COUNTS=%%C"
)

echo Scholar Launcher
if defined COVERAGE_COUNTS (
  echo Current Status: Questions=%QUESTIONS_STATUS%%QUESTIONS_NOTE% - Latest Final=%FINAL_NAME% %FINAL_TIME% - Coverage=%COVERAGE_COUNTS%
) else (
  echo Current Status: Questions=%QUESTIONS_STATUS%%QUESTIONS_NOTE% - Latest Final=%FINAL_NAME% %FINAL_TIME%
)
echo.
echo === How this works (1 minute) ===
echo - Option 1 runs Scholar in the background (repo scan + dossiers + research) and updates STATUS.md.
echo - Option 2 opens STATUS.md (your dashboard). Follow "What to do now."
echo - Most of the time you only use: 1 then 2.
echo.
echo 1) Run Scholar (unattended, web search + DANGEROUS bypass)  [default]
echo    - Run Scholar (walk away). Produces new artifacts and updates STATUS.md.
echo    - Note: after the run finishes, it opens STATUS.md and returns to this menu.
echo 2) Open STATUS.md (recommended)
echo    - Open STATUS.md (the only file you need to read).
echo 3) Open latest unattended_final_*.md
echo    - Open unattended_final (the run's summary/receipt).
echo 4) Open latest questions_needed_*.md
echo    - Open questions_needed (only matters if it's non-empty).
echo 5) Open latest verification_report_*.md
echo    - Open verification report (only if you suspect it's stuck).
echo 6) Open orchestrator_runs folder
echo    - Open run folder (debug/raw logs).
echo 7) Exit
echo    - Exit.
echo.
echo Reminder: safe_mode False = Scholar documents/researches only (no new proposals).
echo Reminder: safe_mode True = Scholar may draft one change package (RFC + experiment + patch draft) for approval.
echo.
set "CHOICE="
set /p "CHOICE=Select option [1-7] (default 1): "
if "%CHOICE%"=="" set "CHOICE=1"
if "%CHOICE%"=="1" goto run_unattended
if "%CHOICE%"=="2" goto open_status
if "%CHOICE%"=="3" goto open_latest_final
if "%CHOICE%"=="4" goto open_latest_questions
if "%CHOICE%"=="5" goto open_latest_verification
if "%CHOICE%"=="6" goto open_runs_folder
if "%CHOICE%"=="7" goto end
echo Invalid choice.
pause
goto menu

:run_unattended
echo Tip: Walk away; when it finishes, open STATUS.md first.
echo Repo: %REPO_ROOT%
echo Running automatic auto-advancing Scholar (Unattended)...
echo Prompt: %PROMPT_FILE%
echo Log: %LOG_PATH%
echo Final: %FINAL_PATH%
echo.

if not exist "%PROMPT_FILE%" (
  echo ERROR: Prompt file not found: %PROMPT_FILE%
  pause
  exit /b 1
)

REM Unified with dashboard: use 'codex exec' (no --search flag)
codex exec --cd "%REPO_ROOT%" --dangerously-bypass-approvals-and-sandbox --output-last-message "%FINAL_PATH%" - < "%PROMPT_FILE%" >> "%LOG_PATH%" 2>&1
set "EC=%ERRORLEVEL%"

echo.
echo Codex exit code: %EC%
echo Log written: %LOG_PATH%
echo Final message written: %FINAL_PATH%
echo.

(
  echo.
  echo ===== Scholar Run Completed at %DATE% %TIME% =====
  echo Exit Code: %EC%
  echo Final: %FINAL_PATH%
) >> "%LOG_PATH%"

call :refresh_status
echo Done. Opening STATUS.md...
if exist "%STATUS_FILE%" start "" "%STATUS_FILE%"
timeout /t 2 >nul
pause
goto menu

:open_status
echo Tip: Read the "Latest Run" section first.
call :refresh_status
if exist "%STATUS_FILE%" (
  call :open_file "%STATUS_FILE%"
) else (
  call :open_file "%STATUS_FILE%"
)
goto menu

:open_latest_final
echo Tip: Read "Completed / Next / Blockers / Artifact produced" first.
call :refresh_status
set "LATEST_FINAL="
for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "$f='%RUN_DIR%'; $p='unattended_final_*.md'; if(Test-Path $f){$x=Get-ChildItem -Path $f -Filter $p -File; $x=Sort-Object -InputObject $x -Property LastWriteTime -Descending; $x=Select-Object -InputObject $x -First 1; if($x){$x.FullName}}"`) do set "LATEST_FINAL=%%L"
if not defined LATEST_FINAL (
  echo Not found: latest unattended_final_*.md
  timeout /t 2 >nul
  goto menu
)
call :open_file "%LATEST_FINAL%"
goto menu

:open_latest_questions
echo Tip: Answer each question succinctly; defaults are allowed if blocked.
call :refresh_status
set "LATEST_QUESTIONS="
for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "$f='%RUN_DIR%'; $p='questions_needed_*.md'; if(Test-Path $f){$x=Get-ChildItem -Path $f -Filter $p -File; $x=Sort-Object -InputObject $x -Property LastWriteTime -Descending; $x=Select-Object -InputObject $x -First 1; if($x){$x.FullName}}"`) do set "LATEST_QUESTIONS=%%L"
if not defined LATEST_QUESTIONS (
  echo Not found: latest questions_needed_*.md
  timeout /t 2 >nul
  goto menu
)
call :open_file "%LATEST_QUESTIONS%"
goto menu

:open_latest_verification
echo Tip: Check Mandatory Artifact Rule and Coverage auto-advance results.
call :refresh_status
set "LATEST_VERIFICATION="
for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "$f='%RUN_DIR%'; $p='verification_report_*.md'; if(Test-Path $f){$x=Get-ChildItem -Path $f -Filter $p -File; $x=Sort-Object -InputObject $x -Property LastWriteTime -Descending; $x=Select-Object -InputObject $x -First 1; if($x){$x.FullName}}"`) do set "LATEST_VERIFICATION=%%L"
if not defined LATEST_VERIFICATION (
  echo Not found: latest verification_report_*.md
  timeout /t 2 >nul
  goto menu
)
call :open_file "%LATEST_VERIFICATION%"
goto menu

:open_runs_folder
echo Tip: Sort by Date Modified to see the most recent run artifacts.
start "" "%RUN_DIR%"
goto menu

:refresh_status
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\scripts\update_status.ps1" >nul 2>&1
goto :eof

:open_file
REM usage: call :open_file "C:\path\file.md"
set "TARGET=%~1"
if not exist "%TARGET%" (
  echo Not found: "%TARGET%"
  goto :eof
)
start "" "%TARGET%"
goto :eof

:get_latest
REM usage: call :get_latest "folder" "pattern" OUTVAR
set "FOLDER=%~1"
set "PATTERN=%~2"
set "OUTVAR=%~3"
for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command ^
  "$f='%FOLDER%'; $p='%PATTERN%'; if(Test-Path $f){$x=Get-ChildItem -Path $f -Filter $p -File; $x=Sort-Object -InputObject $x -Property LastWriteTime -Descending; $x=Select-Object -InputObject $x -First 1; if($x){$x.FullName}}"`
) do set "%OUTVAR%=%%L"
goto :eof

:end
exit /b 0
