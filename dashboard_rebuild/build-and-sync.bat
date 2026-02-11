@echo off
echo ========================================
echo   PT Study SOP - Build
echo ========================================
echo.
echo This builds directly to brain/static/dist
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0build-and-sync.ps1" %*

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
