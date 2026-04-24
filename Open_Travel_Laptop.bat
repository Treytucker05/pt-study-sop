@echo off
setlocal EnableExtensions

set "TARGET=C:\Users\treyt\OneDrive\Desktop\Travel Laptop"

if exist "%TARGET%" (
    start "" "%TARGET%"
    exit /b 0
) else (
    echo [ERROR] Folder not found:
    echo "%TARGET%"
    pause
    exit /b 1
)
