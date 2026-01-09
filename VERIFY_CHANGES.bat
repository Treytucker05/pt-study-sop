@echo off
echo ============================================
echo VERIFYING DASHBOARD CHANGES
echo ============================================
echo.

cd /d "%~dp0brain"
rem Resolve Python (prefer python, fallback to py -3)
set "PYEXE="
set "PYEXE_ARGS="
for %%I in (python py) do (
    where %%I >nul 2>nul && set "PYEXE=%%I" && goto :PYFOUND
)
echo [ERROR] Python was not found on PATH. Install Python 3 or add it to PATH.
echo         If you use the Python Launcher, install it so `py -3` works.
goto END
:PYFOUND
if /I "%PYEXE%"=="py" set "PYEXE_ARGS=-3"

echo Checking dashboard templates and assets...
echo.

"%PYEXE%" %PYEXE_ARGS% -c "from pathlib import Path; html=Path('templates/dashboard.html').read_text(encoding='utf-8'); css=Path('static/css/dashboard.css').read_text(encoding='utf-8'); js=Path('static/js/dashboard.js').read_text(encoding='utf-8'); print('File loaded successfully'); print(''); print('=== VERIFICATION RESULTS ==='); print(''); print('1. Has v2.0 version:', 'v2.0' in html); print('2. Has new colors:', '#1a1d2e' in css); print('3. Has white text:', '#ffffff' in css); print('4. No old emojis:', chr(128202) not in html); print('5. Tabs in navbar:', 'data-tab' in html); print('6. JS loaded:', 'Dashboard JS' in js); print(''); print('HTML size:', len(html), 'chars'); print(''); all_good = 'v2.0' in html and '#1a1d2e' in css and 'data-tab' in html; print('STATUS:', 'ALL CHANGES PRESENT' if all_good else 'CHANGES MISSING'); print('');"

echo.
echo.
pause
:END
