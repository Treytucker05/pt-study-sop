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

function TryGet($path, $expectedStatus) {
    if (-not $expectedStatus) { $expectedStatus = 200 }
    try {
        $resp = Invoke-WebRequest -Uri "$base$path" -Method GET -UseBasicParsing -TimeoutSec 5
        $status = $resp.StatusCode
        $body = $resp.Content.Substring(0, [Math]::Min(120, $resp.Content.Length))
        return @{
            ok = ($status -eq $expectedStatus)
            status = $status
            body = $body
        }
    } catch {
        return @{
            ok = $false
            error = $_.Exception.Message
        }
    }
}

function HitEndpoint($path, $expectedStatus) {
    $result = TryGet $path $expectedStatus
    if ($result.ok) {
        Write-Host "  [PASS] $path -> $($result.status)" -ForegroundColor Green
        Write-Host "         $($result.body)" -ForegroundColor DarkGray
        $script:pass++
    } else {
        if ($null -ne $result.status) {
            Write-Host "  [FAIL] $path -> $($result.status) (expected $expectedStatus)" -ForegroundColor Red
        } else {
            Write-Host "  [FAIL] $path -> ERROR: $($result.error)" -ForegroundColor Red
        }
        $script:fail++
    }
}

function HitHealthEndpoint() {
    $primary = "/api/health/db"
    $fallback = "/api/db/health"
    $result = TryGet $primary 200
    if ($result.ok) {
        Write-Host "  [PASS] $primary -> $($result.status)" -ForegroundColor Green
        Write-Host "         $($result.body)" -ForegroundColor DarkGray
        $script:pass++
        return
    }
    Write-Host "  [WARN] $primary unavailable; trying $fallback" -ForegroundColor Yellow
    $fallbackResult = TryGet $fallback 200
    if ($fallbackResult.ok) {
        Write-Host "  [PASS] $primary -> $($fallbackResult.status) (via $fallback)" -ForegroundColor Green
        Write-Host "         $($fallbackResult.body)" -ForegroundColor DarkGray
        $script:pass++
        return
    }
    $errMsg = if ($null -ne $fallbackResult.error) { $fallbackResult.error } else { "Unknown error" }
    Write-Host "  [FAIL] $primary -> ERROR: $errMsg" -ForegroundColor Red
    $script:fail++
}

Write-Host "`n=== Golden Path Smoke Test ===" -ForegroundColor Cyan
Write-Host "  Target: $base`n"

HitHealthEndpoint
HitEndpoint "/api/brain/metrics"
HitEndpoint "/api/planner/queue"
HitEndpoint "/api/scholar/digest"
HitEndpoint "/api/scholar/proposals"

Write-Host "`n=== Results: $pass passed, $fail failed ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
exit $fail
