@echo off
echo ============================================
echo CLEAN START - Dashboard
echo ============================================
echo.
echo This will:
echo 1. Delete Python cache files (.pyc)
echo 2. Kill old dashboard servers
echo 3. Start fresh dashboard
echo 4. Open browser
echo.
pause

cd /d "%~dp0"
rem Resolve Python (prefer python, fallback to py -3)
set "PYEXE="
set "PYEXE_ARGS="
for %%I in (python py) do (
    where %%I >nul 2>nul && set "PYEXE=%%I" && goto :PYFOUND
)
echo [ERROR] Python was not found on PATH. Install Python 3 or add it to PATH.
echo         If you use the Python Launcher, install it so `py -3` works.
goto END
:PYFOUND
if /I "%PYEXE%"=="py" set "PYEXE_ARGS=-3"

echo [1/5] Deleting Python cache files...
if exist "brain\__pycache__\dashboard_web.cpython-314.pyc" (
    del "brain\__pycache__\dashboard_web.cpython-314.pyc" /F /Q
    echo [OK] Deleted dashboard_web cache
) else (
    echo [INFO] No cache file to delete
)

if exist "brain\__pycache__" (
    del "brain\__pycache__\*.pyc" /F /Q 2>nul
    echo [OK] Cleared all .pyc files
)

echo.
echo [2/5] Killing old Python dashboard processes...
taskkill /F /FI "WINDOWTITLE eq PT Study Brain Dashboard*" 2>nul
powershell -Command "Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul
timeout /t 2 /nobreak >nul
echo [OK] Old processes killed

echo.
echo [3/5] Starting fresh dashboard server...
cd brain
start "PT Study Brain Dashboard" cmd /k "%PYEXE%" %PYEXE_ARGS% dashboard_web.py
cd ..

echo.
echo [4/5] Waiting for server to start...
timeout /t 6 /nobreak >nul

echo.
echo [5/5] Opening browser...
start "" http://127.0.0.1:5000

echo.
echo ============================================
echo IMPORTANT: When browser opens
echo ============================================
echo.
echo Press: Ctrl + Shift + R
echo (Hold Ctrl and Shift, then press R)
echo.
echo This forces a hard refresh without cache.
echo.
echo You should see "PT Study Brain v2.0" in the browser tab.
echo.
echo If still showing old version:
echo 1. Press F12 (Developer Tools)
echo 2. Right-click the refresh button
echo 3. Click "Empty Cache and Hard Reload"
echo.
pause
:END
