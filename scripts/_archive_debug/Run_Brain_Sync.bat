@echo off
setlocal
REM Runs the one-shot brain sync: ingest all logs and regenerate the resume.
REM Place this file at repo root and double-click it, or run from a terminal.

set SCRIPT=%~dp0brain\sync_all.ps1

if not exist "%SCRIPT%" (
  echo sync_all.ps1 not found at %SCRIPT%
  pause
  exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%SCRIPT%"
pause
