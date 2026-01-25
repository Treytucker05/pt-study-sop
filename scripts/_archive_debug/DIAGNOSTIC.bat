@echo off
echo ============================================
echo DASHBOARD DIAGNOSTIC
echo ============================================
echo.

cd /d "%~dp0"

rem Resolve Python (prefer python, fallback to py -3)
set "PYEXE="
set "PYEXE_ARGS="
for %%I in (python py) do (
    where %%I >nul 2>nul && set "PYEXE=%%I" && goto :PYFOUND
)
echo [ERROR] Python not found!
goto END
:PYFOUND
if /I "%PYEXE%"=="py" set "PYEXE_ARGS=-3"

echo [1/5] Checking if Python is available...
echo [OK] Python found: %PYEXE% %PYEXE_ARGS%

echo.
echo [2/5] Checking dashboard_web.py file...
if not exist "brain\dashboard_web.py" (
    echo [ERROR] dashboard_web.py not found!
    goto END
)
echo [OK] dashboard_web.py exists

echo.
echo [3/5] Verifying changes in file...
cd brain
"%PYEXE%" %PYEXE_ARGS% -c "from pathlib import Path; html=Path('templates/dashboard.html').read_text(encoding='utf-8'); css=Path('static/css/dashboard.css').read_text(encoding='utf-8'); js=Path('static/js/dashboard.js').read_text(encoding='utf-8'); print('=== VERIFICATION RESULTS ==='); print('Has v2.0:', 'v2.0' in html); print('Has new colors:', '#1a1d2e' in css); print('Has tabs:', 'data-tab' in html); print('JS loaded:', 'Dashboard JS' in js)"
cd ..

echo.
echo [4/5] Killing any old dashboard servers...
powershell -Command "Get-Process python -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -like '*Dashboard*'} | Stop-Process -Force" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [5/5] Testing if server can start...
cd brain
start "Test Dashboard" cmd /k "%PYEXE%" %PYEXE_ARGS% dashboard_web.py
echo Waiting 5 seconds for server to start...
timeout /t 5 /nobreak >nul

echo.
echo Testing server response...
powershell -Command "$response = Invoke-WebRequest -Uri 'http://127.0.0.1:5000' -UseBasicParsing; if ($response.Content -like '*v2.0*') { Write-Host '[OK] Server is serving v2.0'; Write-Host '[OK] New colors present'; Write-Host '[OK] Tab buttons found' } else { Write-Host '[ERROR] Server not serving correct version' }; $response.Content.Substring(0, [Math]::Min(500, $response.Content.Length))"

echo.
echo ============================================
echo NEXT STEPS:
echo ============================================
echo 1. Open browser to: http://127.0.0.1:5000
echo 2. Press F12 to open Developer Tools
echo 3. Go to Network tab
echo 4. Press Ctrl + Shift + R to hard refresh
echo 5. Click on the first request (127.0.0.1:5000)
echo 6. Look at the Response tab
echo 7. Check if it shows "v2.0" in the HTML
echo.
echo If it shows v2.0 in Network tab but OLD version on page:
echo   - Your browser is using DISK cache
echo   - Clear all browsing data (Ctrl + Shift + Delete)
echo   - Select "All time" and "Cached images and files"
echo.

:END
pause
