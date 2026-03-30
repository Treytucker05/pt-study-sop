@echo off
title Memory Watchdog
powershell -ExecutionPolicy Bypass -File "%~dp0memory-watchdog.ps1" -watch
pause
