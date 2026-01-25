@echo off
echo Testing PT Study Brain Dashboard...
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

echo [1/3] Starting dashboard server...
start "PT Study Dashboard Test" cmd /k "cd /d brain && %PYEXE% %PYEXE_ARGS% dashboard_web.py"

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
:END
