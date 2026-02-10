#!/usr/bin/env pwsh
# Build script for PT Study SOP Dashboard
# Now builds directly to brain/static/dist - no sync needed!
# Usage: .\build-and-sync.ps1

param(
    [switch]$Reload
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot

function Write-Header($text) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success($text) {
    Write-Host "[OK] $text" -ForegroundColor Green
}

function Write-Error($text) {
    Write-Host "[ERR] $text" -ForegroundColor Red
}

# Check if we're in the right directory
if (-not (Test-Path "$PSScriptRoot\package.json")) {
    Write-Error "Must run from dashboard_rebuild directory"
    exit 1
}

# Build (now goes directly to brain/static/dist)
Write-Header "Building Dashboard"
Set-Location $PSScriptRoot

# `npm run build` can emit warnings to stderr even when it succeeds (exit code 0).
# In Windows PowerShell, stderr output becomes non-terminating errors; with `$ErrorActionPreference = "Stop"`
# that would incorrectly trip the catch. Temporarily relax error handling and rely on `$LASTEXITCODE`.
$prevErrorActionPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = "Continue"
    npm run build 2>&1 | ForEach-Object {
        if ($_ -match "error|Error") { Write-Host $_ -ForegroundColor Red }
        elseif ($_ -match "built|modules transformed|rendering chunks|computing gzip size") { Write-Host $_ -ForegroundColor Green }
        else { Write-Host $_ }
    }
} finally {
    $ErrorActionPreference = $prevErrorActionPreference
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed (exit code $LASTEXITCODE)"
    exit $LASTEXITCODE
}

Write-Success "Build completed - files now in brain/static/dist"

# Get timestamp for cache busting
$timestamp = Get-Date -Format "HHmmss"

Write-Header "Done!"
Write-Host "`nNext step:" -ForegroundColor Yellow
Write-Host "  Hard refresh browser: Ctrl+Shift+R"
Write-Host "  Or open: http://127.0.0.1:5000/brain?t=$timestamp"

if ($Reload) {
    Write-Host "`nOpening browser..." -ForegroundColor Cyan
    Start-Process "http://127.0.0.1:5000/brain?t=$timestamp"
}
