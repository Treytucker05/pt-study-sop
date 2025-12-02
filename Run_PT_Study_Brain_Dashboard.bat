@echo off
setlocal

REM Launches the PT Study Brain web dashboard and always uses the newest dashboard_web*.py file.

REM Base directory (folder containing pt_study_brain)
set "BASE=%~dp0"
set "APP_DIR=%BASE%pt_study_brain"
set "PYTHONIOENCODING=utf-8"

REM If you want auto-update via git, uncomment this block.
REM if exist "%BASE%.git" (
REM   echo [0/4] Updating repo (git pull --ff-only)...
REM   pushd "%BASE%" >nul
REM   git pull --ff-only
REM   if errorlevel 1 echo [WARN] git pull skipped/failed; using local files.
REM   popd >nul
REM )

REM Check if Python is available
for /f "delims=" %%P in ('where python 2^>nul') do (
  set "PY_EXE=%%P"
  goto :pyfound
)
:pyfound
if not defined PY_EXE (
  echo [ERROR] Python is not in PATH. Install Python 3.8+ and try again.
  pause
  exit /b 1
)
echo       Using Python: %PY_EXE%

echo [1/4] Ensuring dependencies are installed...
cd /d "%APP_DIR%"
if errorlevel 1 (
  echo [ERROR] Failed to change to PT Study Brain directory.
  pause
  exit /b 1
)

python -m pip install --upgrade pip >nul 2>&1
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo [ERROR] pip install failed.
  pause
  exit /b 1
)

echo [2/4] Selecting newest dashboard script...
set "RUNFILE="
for /f "delims=" %%F in ('dir /b /a:-d /o:-d "%APP_DIR%\dashboard_web*.py"') do (
  if not defined RUNFILE set "RUNFILE=%%F"
)
if not defined RUNFILE (
  echo [ERROR] No dashboard_web*.py found.
  pause
  exit /b 1
)
echo       Using %RUNFILE%

echo [3/4] Opening browser at http://127.0.0.1:5000 ...
start "" http://127.0.0.1:5000

echo [4/4] Starting dashboard server (press Ctrl+C to stop)...
echo.
cd /d "%APP_DIR%"
"%PY_EXE%" %RUNFILE%

echo.
echo Server stopped.
pause
