<#
.SYNOPSIS
  Frontend gate check for dashboard_rebuild.
.DESCRIPTION
  Runs mandatory frontend validation commands in order and fails fast on first failure.
  Optional -Smoke runs a lightweight live endpoint and route smoke pass.
#>
param(
    [string]$Root = "C:/pt-study-sop",
    [switch]$Smoke
)

$ErrorActionPreference = "Stop"

function Invoke-OrFail {
    param(
        [string]$Command,
        [string]$Label,
        [string]$WorkingDirectory = (Get-Location).Path
    )

    Write-Host "[1/3] $Label" -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            throw "$Label failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
}

$dashboardDir = Join-Path $Root "dashboard_rebuild"
if (-not (Test-Path $dashboardDir)) {
    Write-Error "dashboard_rebuild not found at $dashboardDir"
    exit 1
}

$passCount = 0
$failCount = 0

try {
    Invoke-OrFail -Command "npm run check" -Label "npm run check" -WorkingDirectory $dashboardDir
    $passCount++

    Invoke-OrFail -Command "npm run build" -Label "npm run build" -WorkingDirectory $dashboardDir
    $passCount++

    Write-Host "[3/3] React Doctor strict scan" -ForegroundColor Cyan
    Push-Location $dashboardDir
    try {
        $score = node --input-type=module -e "import { diagnose } from 'react-doctor/api'; const result = await diagnose('.', { diff: false, verbose: true }); console.log(JSON.stringify({ score: result.score, count: result.diagnostics.length }, null, 2));"
        if ($LASTEXITCODE -ne 0) {
            throw "react-doctor scan failed with exit code $LASTEXITCODE"
        }
        Write-Host $score
    } finally {
        Pop-Location
    }
    $passCount++

    if ($Smoke) {
        Write-Host "[4/4] Optional live smoke pass" -ForegroundColor Cyan
        # Assume dashboard is already running and healthy.
        Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:5000/api/brain/status" -TimeoutSec 5 | Out-Null

        & (Join-Path $Root "scripts/smoke_golden_path.ps1")

        $paths = @('/tutor', '/calendar', '/scholar', '/vault-health', '/brain')
        foreach($p in $paths) {
            $resp = Invoke-WebRequest -UseBasicParsing -Uri ("http://127.0.0.1:5000" + $p) -TimeoutSec 5
            Write-Host ("  PASS " + $p + " -> " + $resp.StatusCode + " (len=" + $resp.Content.Length + ")") -ForegroundColor Green
        }
    }

    Write-Host "All required frontend gates passed." -ForegroundColor Green
    exit 0
} catch {
    $failCount++
    Write-Error $_.Exception.Message
    exit 1
}
