<#
.SYNOPSIS
  Read-only Tutor smoke test for localhost:5000
.DESCRIPTION
  Uses GET-only tutor endpoints to verify API availability without creating
  sessions, notes, or Obsidian artifacts.
  Requires dashboard to be running (Start_Dashboard.bat).
#>

$ErrorActionPreference = "Continue"
$base = "http://localhost:5000"
$pass = 0
$fail = 0

function TryGet($path, $expectedStatus) {
    if (-not $expectedStatus) { $expectedStatus = 200 }
    try {
        $resp = Invoke-WebRequest -Uri "$base$path" -Method GET -UseBasicParsing -TimeoutSec 8
        $status = $resp.StatusCode
        $body = $resp.Content.Substring(0, [Math]::Min(140, $resp.Content.Length))
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

Write-Host "`n=== Tutor Read-Only Smoke Test ===" -ForegroundColor Cyan
Write-Host "  Target: $base`n"

HitEndpoint "/api/tutor/config/check" 200
HitEndpoint "/api/tutor/blocks" 200
HitEndpoint "/api/tutor/chains/templates" 200
HitEndpoint "/api/tutor/content-sources" 200
HitEndpoint "/api/tutor/materials" 200
HitEndpoint "/api/tutor/sessions" 200

Write-Host "`n=== Results: $pass passed, $fail failed ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
exit $fail

