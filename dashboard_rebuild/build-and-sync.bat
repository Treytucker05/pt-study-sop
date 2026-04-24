@echo off
setlocal EnableExtensions
echo ========================================
echo   PT Study SOP - Build
echo ========================================
echo.
echo This builds directly to brain/static/dist
echo.

set "SCRIPT=%~dp0build-and-sync.ps1"
if not exist "%SCRIPT%" (
    echo [ERROR] Missing script: "%SCRIPT%"
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*

if %errorlevel% neq 0 (
    echo.
    echo Build failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo Press any key to open browser...
pause >nul

start http://127.0.0.1:5000/brain
