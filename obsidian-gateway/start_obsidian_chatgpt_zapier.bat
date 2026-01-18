@echo off
setlocal enableextensions
cd /d "%~dp0"

echo === Obsidian Gateway Launcher ===
echo Working dir: %CD%
echo.

REM --- Quick prereq checks ---
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found in PATH. Install Node LTS and try again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found in PATH. Reinstall Node.js (includes npm).
  pause
  exit /b 1
)

where ngrok >nul 2>&1
if errorlevel 1 (
  echo ERROR: ngrok not found in PATH. Install ngrok and try again.
  pause
  exit /b 1
)

REM --- Ensure deps installed (safe to re-run) ---
if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

REM --- Start server in a new window ---
echo Starting gateway server...
start "Obsidian Gateway Server" cmd /k ""%CD%\start_server.bat""

REM --- Give server a moment ---
timeout /t 2 /nobreak >nul

REM --- Start ngrok in a new window ---
echo Starting ngrok tunnel...
start "ngrok Tunnel" cmd /k ""%CD%\start_ngrok.bat""

REM --- Open health check in default browser ---
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8787/health"

echo.
echo Done.
echo - Server window: "Obsidian Gateway Server"
echo - ngrok window:  "ngrok Tunnel"
echo - Health opened: http://127.0.0.1:8787/health
echo.
echo If Zapier calls fail, confirm ngrok shows:
echo   https://treymcp.ngrok.app  ->  http://127.0.0.1:8787
echo.
pause
endlocal
