<#
.SYNOPSIS
  Golden path smoke test — hits key API endpoints on localhost:5000
.DESCRIPTION
  Non-destructive GET requests to verify endpoints are responding.
  Requires the dashboard to be running (Start_Dashboard.bat).
#>

$ErrorActionPreference = "Continue"
$base = "http://localhost:5000"
$pass = 0
$fail = 0

function HitEndpoint($path, $expectedStatus) {
    if (-not $expectedStatus) { $expectedStatus = 200 }
    try {
        $resp = Invoke-WebRequest -Uri "$base$path" -Method GET -UseBasicParsing -TimeoutSec 5
        $status = $resp.StatusCode
        $body = $resp.Content.Substring(0, [Math]::Min(120, $resp.Content.Length))
        if ($status -eq $expectedStatus) {
            Write-Host "  [PASS] $path -> $status" -ForegroundColor Green
            Write-Host "         $body" -ForegroundColor DarkGray
            $script:pass++
        } else {
            Write-Host "  [FAIL] $path -> $status (expected $expectedStatus)" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        $errMsg = $_.Exception.Message
        Write-Host "  [FAIL] $path -> ERROR: $errMsg" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "`n=== Golden Path Smoke Test ===" -ForegroundColor Cyan
Write-Host "  Target: $base`n"

HitEndpoint "/api/health/db"
HitEndpoint "/api/brain/metrics"
HitEndpoint "/api/planner/queue"
HitEndpoint "/api/scholar/digest"
HitEndpoint "/api/scholar/proposals"

Write-Host "`n=== Results: $pass passed, $fail failed ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
exit $fail
