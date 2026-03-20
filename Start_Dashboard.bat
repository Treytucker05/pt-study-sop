@echo off
setlocal EnableDelayedExpansion
rem One-click: initialize DB -> build dashboard when stale -> start Flask -> wait for readiness -> open browser.

cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
set "SERVER_DIR=%ROOT_DIR%brain"
set "REBUILD_DIR=%ROOT_DIR%dashboard_rebuild"
set "SHARED_DIR=%REBUILD_DIR%\shared"
set "UI_IMAGES_DIR=%ROOT_DIR%UI Images"
set "DIST_DIR=%SERVER_DIR%\static\dist"
set "DIST_INDEX=%DIST_DIR%\index.html"
set "DASHBOARD_URL=http://127.0.0.1:5000/brain"
set "HEALTH_URL=http://127.0.0.1:5000/api/brain/status"
set "READINESS_TIMEOUT=30"

rem Stop any existing dashboard server processes so code changes take effect.
rem This prevents multiple dashboard_web.py instances (stale routes, port conflicts).
echo [0/5] Closing any existing dashboard server processes...
rem Close prior dashboard cmd window (if any) without blocking startup.
taskkill /FI "WINDOWTITLE eq PT Study Brain Dashboard*" /T /F >nul 2>nul

rem Kill any process still bound to port 5000.
for /f "usebackq delims=" %%L in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$connections = @(Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue); $pids = @(); foreach ($conn in $connections) { if ($conn.OwningProcess -and -not ($pids -contains $conn.OwningProcess)) { $pids += $conn.OwningProcess } }; if ($pids.Count -eq 0) { Write-Output '[INFO] No process was using port 5000.' } else { foreach ($portPid in $pids) { Write-Output ('[INFO] Hard-stopping PID {0} bound to port 5000' -f $portPid); Stop-Process -Id $portPid -Force -ErrorAction SilentlyContinue }; Write-Output ('[INFO] Requested termination for port 5000 PID(s): {0}' -f ($pids -join ', ')) }; Start-Sleep -Seconds 1; $remainingConnections = @(Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue); $remaining = @(); foreach ($conn in $remainingConnections) { if ($conn.OwningProcess -and -not ($remaining -contains $conn.OwningProcess)) { $remaining += $conn.OwningProcess } }; if ($remaining.Count -gt 0) { Write-Output ('[WARN] Port 5000 still reports PID(s): {0}' -f ($remaining -join ', ')) } else { Write-Output '[INFO] Port 5000 is clear.' }"`) do echo %%L

rem Kill any repo-local Vite/dev surface on port 3000 so only the Flask-served app remains.
echo [0.5/5] Closing any repo-local Vite/dev surface on port 3000...
for /f "usebackq delims=" %%L in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$connections = @(Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }); $pids = @(); foreach ($conn in $connections) { if ($conn.OwningProcess -and -not ($pids -contains $conn.OwningProcess)) { $pids += $conn.OwningProcess } }; if ($pids.Count -eq 0) { Write-Output '[INFO] No process was using port 3000.' } else { $processes = @{}; foreach ($proc in Get-CimInstance Win32_Process) { $processes[$proc.ProcessId] = $proc }; foreach ($portPid in $pids) { $matchesRepoVite = $false; $cursor = $portPid; $visited = @(); while ($cursor -and -not ($visited -contains $cursor) -and $processes.ContainsKey($cursor)) { $visited += $cursor; $proc = $processes[$cursor]; $cmd = [string]$proc.CommandLine; if ($cmd -and (($cmd -match 'dashboard_rebuild') -or ($cmd -match 'vite(\.cmd|\.js|\s|$)') -or ($cmd -match 'npm run dev') -or ($cmd -match 'vite preview'))) { $matchesRepoVite = $true; break }; $cursor = $proc.ParentProcessId }; if ($matchesRepoVite) { Write-Output ('[INFO] Hard-stopping repo-local Vite/dev PID {0} bound to port 3000' -f $portPid); Stop-Process -Id $portPid -Force -ErrorAction SilentlyContinue } else { Write-Output ('[WARN] Port 3000 PID {0} left running because it did not match repo-local Vite/dev startup.' -f $portPid) } } }"`) do echo %%L

rem Configure Study RAG drop-folder (used by Tutor -> Study sync)
set "ONEDRIVE_RAG=C:\Users\treyt\OneDrive\Desktop\PT School"
set "LOCAL_RAG=%~dp0PT School"
if exist "%ONEDRIVE_RAG%" (
    set "PT_STUDY_RAG_DIR=%ONEDRIVE_RAG%"
) else (
    if exist "%LOCAL_RAG%" (
        set "PT_STUDY_RAG_DIR=%LOCAL_RAG%"
    ) else (
        set "PT_STUDY_RAG_DIR=%ONEDRIVE_RAG%"
        echo [WARN] PT Study RAG folder not found at %ONEDRIVE_RAG% or %LOCAL_RAG%.
    )
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
goto END_FAIL

:PYFOUND
if /I "%PYEXE%"=="py" set "PYEXE_ARGS=-3"

echo [1/5] Ensuring Brain database is initialized...
cd /d "%SERVER_DIR%"
if not exist "db_setup.py" (
    echo [ERROR] Could not find brain\db_setup.py from %~dp0.
    goto END_FAIL
)
"%PYEXE%" %PYEXE_ARGS% db_setup.py
if %errorlevel% NEQ 0 (
    echo [ERROR] Failed to initialize database. Check Python installation and brain\db_setup.py.
    goto END_FAIL
)

cd /d "%~dp0"
echo [2/5] Checking dashboard UI build...
echo [INFO] Frontend builds write directly into %DIST_DIR%.

rem Allow skipping UI build (useful when you just want the server up fast)
if /I "%SKIP_UI_BUILD%"=="1" (
    echo [INFO] SKIP_UI_BUILD=1 - skipping UI build.
) else (
    set "UI_BUILD_STATE="
    if /I "%FORCE_UI_BUILD%"=="1" (
        set "UI_BUILD_STATE=forced"
    ) else (
        for /f %%R in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$dist = [System.IO.Path]::GetFullPath('%DIST_INDEX%'); $root = [System.IO.Path]::GetFullPath('%REBUILD_DIR%'); $shared = [System.IO.Path]::GetFullPath('%SHARED_DIR%'); $uiImages = [System.IO.Path]::GetFullPath('%UI_IMAGES_DIR%'); $files = @(); if (Test-Path $root) { $clientDir = Join-Path $root 'client'; if (Test-Path $clientDir) { $files += Get-ChildItem $clientDir -Recurse -File -ErrorAction SilentlyContinue }; if (Test-Path $shared) { $files += Get-ChildItem $shared -Recurse -File -ErrorAction SilentlyContinue }; foreach ($name in 'package.json','package-lock.json','vite.config.ts','vite-plugin-meta-images.ts','tsconfig.json','vitest.config.ts','build.ts','build-and-sync.ps1') { $candidate = Join-Path $root $name; if (Test-Path $candidate) { $files += Get-Item $candidate } } }; if (Test-Path $uiImages) { $files += Get-ChildItem $uiImages -Recurse -File -ErrorAction SilentlyContinue }; if (-not (Test-Path $dist)) { 'missing' } elseif (-not $files -or $files.Count -eq 0) { 'current' } else { $distTime = (Get-Item $dist).LastWriteTimeUtc; $newest = $files | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1; if ($newest.LastWriteTimeUtc -gt $distTime) { 'stale' } else { 'current' } }"') do (
            set "UI_BUILD_STATE=%%R"
        )
    )

    if /I "!UI_BUILD_STATE!"=="forced" (
        echo [INFO] FORCE_UI_BUILD=1 - rebuilding dashboard UI.
    ) else if /I "!UI_BUILD_STATE!"=="missing" (
        echo [INFO] Dashboard UI build output is missing - rebuilding.
    ) else if /I "!UI_BUILD_STATE!"=="stale" (
        echo [INFO] Dashboard UI source is newer than the build output - rebuilding.
    ) else (
        echo [INFO] Dashboard UI build is current - skipping rebuild.
    )

    if /I "!UI_BUILD_STATE!"=="forced" (
        call :BUILD_UI
        if errorlevel 1 goto END_FAIL
    ) else if /I "!UI_BUILD_STATE!"=="missing" (
        call :BUILD_UI
        if errorlevel 1 goto END_FAIL
    ) else if /I "!UI_BUILD_STATE!"=="stale" (
        call :BUILD_UI
        if errorlevel 1 goto END_FAIL
    )
)

if not exist "%DIST_INDEX%" (
    echo [WARN] Frontend build output is missing at %DIST_INDEX%.
    echo        Flask will still start, but the dashboard UI will not render until you build it.
)

echo [3/5] Starting dashboard server (window titled 'PT Study Brain Dashboard')...
if not exist "%SERVER_DIR%\dashboard_web.py" (
    echo [ERROR] Could not find brain\dashboard_web.py from %~dp0.
    goto END_FAIL
)

start "PT Study Brain Dashboard" cmd /k "cd /d "%SERVER_DIR%" && "%PYEXE%" %PYEXE_ARGS% dashboard_web.py"
if errorlevel 1 (
    echo [ERROR] Failed to launch dashboard server.
    goto END_FAIL
)

echo [4/5] Waiting for dashboard readiness...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(%READINESS_TIMEOUT%); while ((Get-Date) -lt $deadline) { try { $resp = Invoke-WebRequest -UseBasicParsing -Uri '%HEALTH_URL%' -TimeoutSec 2; if ($resp.StatusCode -eq 200) { exit 0 } } catch { } Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
    echo [ERROR] Dashboard did not become ready within %READINESS_TIMEOUT% seconds.
    echo         Check the 'PT Study Brain Dashboard' window for startup errors.
    goto END_FAIL
)

echo [5/5] Opening dashboard in browser...
start "" "%DASHBOARD_URL%"

:END_SUCCESS
echo Done. Leave the 'PT Study Brain Dashboard' window open while you use the site.
endlocal
goto :EOF

:END_FAIL
echo Startup failed.
endlocal
goto :EOF

:BUILD_UI
if not exist "%REBUILD_DIR%\package.json" (
    echo [ERROR] Could not find dashboard_rebuild\package.json from %~dp0.
    exit /b 1
)
rem Always run the PowerShell build path; npm can be exposed as npm.ps1 even when cmd cannot resolve it.
powershell -NoProfile -ExecutionPolicy Bypass -File "%REBUILD_DIR%\build-and-sync.ps1"
if errorlevel 1 (
    echo [ERROR] UI build failed.
    exit /b 1
)
if not exist "%DIST_INDEX%" (
    echo [ERROR] UI build finished but %DIST_INDEX% is missing.
    exit /b 1
)
echo [INFO] UI build completed.
exit /b 0
