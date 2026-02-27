@echo off
setlocal

set "TARGET=C:\Users\treyt\OneDrive\Desktop\Travel Laptop"

if exist "%TARGET%" (
    start "" "%TARGET%"
) else (
    echo Folder not found:
    echo %TARGET%
    pause
)

endlocal
