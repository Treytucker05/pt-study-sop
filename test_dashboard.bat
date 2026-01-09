@echo off
echo Testing PT Study Brain Dashboard...
echo.

cd /d "%~dp0"

echo [1/3] Starting dashboard server...
start "PT Study Dashboard Test" cmd /k "cd /d brain && python dashboard_web.py"

echo [2/3] Waiting for server to start...
timeout /t 5 /nobreak >nul

echo [3/3] Opening browser...
start "" http://127.0.0.1:5000

echo.
echo Dashboard opened in browser!
echo.
echo Check the browser console (F12) for [Tab System] log messages.
echo These will show if tabs are switching correctly.
echo.
echo Press any key to stop the server...
pause >nul

echo.
echo Stopping server...
taskkill /FI "WindowTitle eq PT Study Dashboard Test*" /F >nul 2>&1

echo Done!
