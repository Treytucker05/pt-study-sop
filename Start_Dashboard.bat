@echo off
setlocal EnableDelayedExpansion
rem One-click: sync logs -> regenerate resume -> start dashboard -> open browser (with health check).

cd /d "%~dp0"

rem Configure Study RAG drop-folder (used by Tutor -> Study sync)
set "ONEDRIVE_RAG=C:\Users\treyt\OneDrive\Desktop\PT School"
set "LOCAL_RAG=%~dp0PT School"
if exist "%ONEDRIVE_RAG%" (
    set "PT_STUDY_RAG_DIR=%ONEDRIVE_RAG%"
) else if exist "%LOCAL_RAG%" (
    set "PT_STUDY_RAG_DIR=%LOCAL_RAG%"
) else (
    set "PT_STUDY_RAG_DIR=%ONEDRIVE_RAG%"
    echo [WARN] PT Study RAG folder not found at %ONEDRIVE_RAG% or %LOCAL_RAG%.
)

rem Configure API Keys via brain\.env (loaded by brain\config.py)

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

set "SERVER_DIR=%~dp0brain"
echo [1/5] Ensuring Brain database is initialized...
cd /d "%SERVER_DIR%"
if not exist "db_setup.py" (
    echo [ERROR] Could not find brain\db_setup.py from %~dp0.
    goto END
)
"%PYEXE%" %PYEXE_ARGS% db_setup.py
if %errorlevel% NEQ 0 (
    echo [ERROR] Failed to initialize database. Check Python installation and brain\db_setup.py.
    goto END
)

cd /d "%~dp0"
echo [2/5] Syncing logs and regenerating resume...
if not exist "brain\sync_all.ps1" (
    echo [ERROR] Could not find brain\sync_all.ps1 from %~dp0.
    goto END
)
powershell -ExecutionPolicy Bypass -File brain\sync_all.ps1

if %errorlevel% NEQ 0 (
    echo [ERROR] Failed to sync logs or regenerate resume.
    goto END
)


echo [3/5] Building dashboard UI (if available)...
set "REBUILD_DIR=%~dp0dashboard_rebuild"
set "DIST_DIR=%SERVER_DIR%\static\dist"

rem Allow skipping UI build (useful when you just want the server up fast)
if /I "%SKIP_UI_BUILD%"=="1" (
    echo [INFO] SKIP_UI_BUILD=1 - skipping UI build.
) else if exist "%REBUILD_DIR%\package.json" (
    where npm >nul 2>nul
    if errorlevel 1 (
        echo [WARN] npm not found on PATH. Skipping UI build.
    ) else (
        powershell -NoProfile -ExecutionPolicy Bypass -File "%REBUILD_DIR%\build-and-sync.ps1"
        if errorlevel 1 (
            echo [ERROR] UI build failed.
            goto END
        )
        echo [INFO] UI build completed.
    )
) else (
    echo [WARN] dashboard_rebuild not found at %REBUILD_DIR% - skipping UI build.
)

echo [4/5] Starting dashboard server (window titled 'PT Study Brain Dashboard')...
if not exist "%SERVER_DIR%\dashboard_web.py" (
    echo [ERROR] Could not find brain\dashboard_web.py from %~dp0.
    goto END
)

rem Stop any existing dashboard server processes so code/route changes take effect.
rem This prevents multiple dashboard_web.py instances (stale routes, port conflicts).
echo [INFO] Closing any existing dashboard server processes (dashboard_web.py)...
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'python*' -and $_.CommandLine -like '*dashboard_web.py*' } | Select-Object -ExpandProperty ProcessId"`) do (
    echo [INFO] Stopping PID %%P
    taskkill /PID %%P /F >nul 2>nul
)

rem Check if Frontend Build exists (expects /static/dist/assets/index-*.js)
if not exist "%DIST_DIR%\assets\index-*.js" (
    echo [ERROR] Frontend build missing in %DIST_DIR%.
    echo         The React dashboard build should be included in the repo.
    echo         If missing, run: npm run build in dashboard_rebuild, then copy dist/public to brain/static/dist
    goto END
)

start "PT Study Brain Dashboard" cmd /k "cd /d "%SERVER_DIR%" && "%PYEXE%" %PYEXE_ARGS% dashboard_web.py"

echo [5/5] Giving the server a few seconds to start...
timeout /t 5 /nobreak >nul

:OPEN_BROWSER
echo Opening dashboard in browser...
start "" http://127.0.0.1:5000/brain

:END
echo Done. Leave the 'PT Study Brain Dashboard' window open while you use the site.
endlocal
