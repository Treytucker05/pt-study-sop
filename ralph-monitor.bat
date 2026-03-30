@echo off
title Ralph Monitor
powershell -ExecutionPolicy Bypass -File "%~dp0ralph-monitor.ps1" -watch
pause
