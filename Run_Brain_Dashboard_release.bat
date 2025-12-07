@echo off
setlocal

rem Launch the PT Study Brain dashboard using the v9.1 release build
cd /d "%~dp0releases\v9.1\brain"
echo Starting PT Study Brain dashboard (v9.1 release) at http://127.0.0.1:5000 ...
python dashboard_web.py

endlocal
