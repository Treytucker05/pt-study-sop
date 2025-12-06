@echo off
setlocal

rem Launch the PT Study Brain dashboard
cd /d "%~dp0brain"
echo Starting PT Study Brain dashboard at http://127.0.0.1:5000 ...
python dashboard_web.py

endlocal
