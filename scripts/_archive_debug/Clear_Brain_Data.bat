@echo off
setlocal
rem One-click utility to clear all Brain data (for new semester/term)

cd /d "%~dp0"

echo.
echo ============================================================
echo PT Study Brain - Clear All Data
echo ============================================================
echo.
echo This will DELETE all your study sessions, courses, events,
echo topics, tasks, and RAG documents from the database.
echo.
echo The database structure will be preserved - you can start
echo adding new data immediately after clearing.
echo.
pause

rem Resolve Python (prefer python, fallback to py -3)
set "PYEXE="
for %%I in (python py) do (
    where %%I >nul 2>nul && set "PYEXE=%%I" && goto :PYFOUND
)
echo [ERROR] Python was not found on PATH. Install Python 3 or add it to PATH.
echo         If you use the Python Launcher, install it so `py -3` works.
pause
exit /b 1

:PYFOUND
if /I "%PYEXE%"=="py" set "PYEXE=py -3"

if not exist "brain\clear_data.py" (
    echo [ERROR] Could not find brain\clear_data.py from %~dp0.
    pause
    exit /b 1
)

cd /d "%~dp0brain"
%PYEXE% clear_data.py

echo.
pause
endlocal
