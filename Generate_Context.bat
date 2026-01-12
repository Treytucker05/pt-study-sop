@echo off
echo Generating Architecture Context Dump...
powershell -ExecutionPolicy Bypass -File scripts/generate_architecture_dump.ps1
if %errorlevel% neq 0 (
    echo Error generating dump!
    pause
    exit /b %errorlevel%
)
echo Done. Created ARCHITECTURE_CONTEXT.md
pause
