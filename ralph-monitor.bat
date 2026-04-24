@echo off
setlocal EnableExtensions
title Ralph Monitor
set "SCRIPT=%~dp0ralph-monitor.ps1"
if not exist "%SCRIPT%" (
    echo [ERROR] Missing script: "%SCRIPT%"
    pause
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
if errorlevel 1 (
    echo [ERROR] Ralph monitor exited with an error.
    pause
    exit /b 1
)
