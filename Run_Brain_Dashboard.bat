@echo off
setlocal

rem Launch the PT Study Brain dashboard (dev/local copy)
rem For the packaged release version, run Run_Brain_Dashboard_release.bat instead.
cd /d "%~dp0brain"
echo Starting PT Study Brain dashboard at http://127.0.0.1:5000 ...
python dashboard_web.py

endlocal
