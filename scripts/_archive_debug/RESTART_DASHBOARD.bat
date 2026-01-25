@echo off
echo ============================================
echo RESTARTING PT STUDY BRAIN DASHBOARD
echo ============================================
echo.

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

echo [1/3] Stopping any existing dashboard servers...
taskkill /FI "WindowTitle eq PT Study Brain Dashboard*" /F 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Clearing browser cache instructions...
echo.
echo IMPORTANT: After the browser opens, press Ctrl+Shift+R to force refresh
echo (This clears cached HTML/CSS/JavaScript)
echo.
timeout /t 3 /nobreak >nul

echo [3/3] Starting fresh dashboard server...
cd brain
start "PT Study Brain Dashboard" cmd /k "%PYEXE%" %PYEXE_ARGS% dashboard_web.py

echo.
echo Waiting 5 seconds for server to start...
timeout /t 5 /nobreak >nul

echo.
echo Opening browser...
start "" http://127.0.0.1:5000

echo.
echo ============================================
echo DASHBOARD RESTARTED!
echo ============================================
echo.
echo NEXT STEPS:
echo 1. When browser opens, press: Ctrl + Shift + R
echo    (This forces a full page reload without cache)
echo.
echo 2. Or press F12, then right-click the refresh button,
echo    and select "Empty Cache and Hard Reload"
echo.
echo 3. Check browser console (F12) for [Tab System] messages
echo.
pause
:END
