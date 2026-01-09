@echo off
setlocal EnableDelayedExpansion
rem One-click: sync logs -> regenerate resume -> start dashboard -> open browser (with health check).

cd /d "%~dp0"

rem Resolve Python (prefer python, fallback to py -3)
set "PYEXE="
for %%I in (python py) do (
    where %%I >nul 2>nul && set "PYEXE=%%I" && goto :PYFOUND
)
echo [ERROR] Python was not found on PATH. Install Python 3 or add it to PATH.
echo         If you use the Python Launcher, install it so `py -3` works.
goto END

:PYFOUND
if /I "%PYEXE%"=="py" set "PYEXE=py -3"

echo [1/5] Ensuring Brain database is initialized...
cd /d "%~dp0brain"
if not exist "db_setup.py" (
    echo [ERROR] Could not find brain\db_setup.py from %~dp0.
    goto END
)
python db_setup.py
if %errorlevel% NEQ 0 (
    echo [ERROR] Failed to initialize database. Check Python installation and brain\db_setup.py.
    goto END
)

cd /d "%~dp0"
echo [2/5] Syncing logs and regenerating resume...
if not exist "brain\sync_all.ps1" (
    echo [ERROR] Could not find brain\sync_all.ps1 from %~dp0.
    goto END
)
powershell -ExecutionPolicy Bypass -File brain\sync_all.ps1

echo [3/5] Starting dashboard server (window titled 'PT Study Brain Dashboard')...
set "SERVER_DIR=%~dp0brain"
if not exist "%SERVER_DIR%\dashboard_web.py" (
    echo [ERROR] Could not find brain\dashboard_web.py from %~dp0.
    goto END
)
start "PT Study Brain Dashboard" cmd /k cd /d "%SERVER_DIR%" ^& python dashboard_web.py

echo [4/5] Giving the server a few seconds to start...
timeout /t 5 /nobreak >nul

:OPEN_BROWSER
echo [5/5] Opening dashboard in browser...
start "" http://127.0.0.1:5000

:END
echo Done. Leave the 'PT Study Brain Dashboard' window open while you use the site.
endlocal
