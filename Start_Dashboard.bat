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


echo [3/5] Syncing dashboard UI build (if available)...
set "REBUILD_DIR=%~dp0dashboard_rebuild"
set "REBUILD_DIST=%REBUILD_DIR%\dist\public"
set "DIST_DIR=%SERVER_DIR%\static\dist"

if exist "%REBUILD_DIST%\assets\index-*.js" (
    if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"
    rem robocopy /MIR mirrors source to dest, only copying newer files.
    robocopy "%REBUILD_DIST%" "%DIST_DIR%" /MIR /NFL /NDL /NJH /NJS /NC /NS >nul
    if !errorlevel! GEQ 8 (
        echo [ERROR] UI sync failed (robocopy exit code !errorlevel!^).
        goto END
    )
    echo [INFO] UI synced.
) else (
    echo [WARN] dashboard_rebuild build not found. Run `npm run build` in dashboard_rebuild to update the UI.
)

echo [4/5] Starting dashboard server (window titled 'PT Study Brain Dashboard')...
if not exist "%SERVER_DIR%\dashboard_web.py" (
    echo [ERROR] Could not find brain\dashboard_web.py from %~dp0.
    goto END
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
