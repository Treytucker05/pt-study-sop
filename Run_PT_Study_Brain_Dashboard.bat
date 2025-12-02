@echo off
setlocal enabledelayedexpansion

REM Launches the PT Study Brain web dashboard, handling deps automatically.

REM Base directory (folder containing pt_study_brain)
set "BASE=%~dp0"
set "APP_DIR=%BASE%pt_study_brain"
set "PYTHONIOENCODING=utf-8"

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python is not in PATH. Install Python 3.8+ and try again.
  pause
  exit /b 1
)

echo [1/3] Ensuring dependencies are installed...
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

echo [2/3] Starting dashboard server (new UI)...
REM Start the server in a new window
start "PT Study Brain Dashboard - Dark Theme" cmd /k "python dashboard_web_new.py"

REM Wait a moment for server to start
timeout /t 2 /nobreak

echo [3/3] Opening browser at http://127.0.0.1:5000 ...
timeout /t 1 /nobreak
start http://127.0.0.1:5000

echo.
echo Done! Dashboard is running at http://127.0.0.1:5000
echo Close the server window to stop the dashboard.
echo.
pause
