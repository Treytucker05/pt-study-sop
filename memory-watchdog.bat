@echo off
setlocal EnableExtensions
title Memory Watchdog
set "SCRIPT=%~dp0memory-watchdog.ps1"
if not exist "%SCRIPT%" (
    echo [ERROR] Missing script: "%SCRIPT%"
    pause
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -watch
if errorlevel 1 (
    echo [ERROR] Memory watchdog exited with an error.
    pause
    exit /b 1
)
pause
