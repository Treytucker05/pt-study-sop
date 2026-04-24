@echo off
setlocal EnableExtensions
set "SCRIPT=%~dp0tools\Paste_Clipboard_Image.ps1"
if not exist "%SCRIPT%" (
    echo [ERROR] Missing script: "%SCRIPT%"
    pause
    exit /b 1
)
powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%SCRIPT%"
exit /b %ERRORLEVEL%
