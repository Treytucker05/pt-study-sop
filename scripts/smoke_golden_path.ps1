<#
.SYNOPSIS
  Golden path smoke test — hits key API endpoints on a running dashboard.
.DESCRIPTION
  Non-destructive GET requests to verify endpoints are responding.
  Requires the dashboard to already be running.
#>

[CmdletBinding()]
param(
    [string]$BaseUrl = "http://localhost:5000",
    [switch]$Json
)

$ErrorActionPreference = "Continue"
$base = $BaseUrl.TrimEnd("/")
$pass = 0
$fail = 0
$results = [System.Collections.Generic.List[object]]::new()

function Write-SmokeLine {
    param(
        [string]$Message,
        [string]$Color = $null
    )

    if ($Json) {
        return
    }

    if ($Color) {
        Write-Host $Message -ForegroundColor $Color
    } else {
        Write-Host $Message
    }
}

function TryGet($path, $expectedStatus) {
    if (-not $expectedStatus) { $expectedStatus = 200 }
    try {
        $requestArgs = @{
            Uri = "$base$path"
            Method = "GET"
            TimeoutSec = 5
        }
        if ($PSVersionTable.PSVersion.Major -lt 6) {
            $requestArgs.UseBasicParsing = $true
        }
        $resp = Invoke-WebRequest @requestArgs
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
    $entry = [ordered]@{
        path = $path
        expected_status = if ($expectedStatus) { $expectedStatus } else { 200 }
        ok = [bool]$result.ok
        status = if ($null -ne $result.status) { [int]$result.status } else { $null }
        body = if ($result.body) { $result.body } else { $null }
        error = if ($result.error) { $result.error } else { $null }
    }
    $results.Add($entry)
    if ($result.ok) {
        Write-SmokeLine "  [PASS] $path -> $($result.status)" "Green"
        Write-SmokeLine "         $($result.body)" "DarkGray"
        $script:pass++
    } else {
        if ($null -ne $result.status) {
            Write-SmokeLine "  [FAIL] $path -> $($result.status) (expected $expectedStatus)" "Red"
        } else {
            Write-SmokeLine "  [FAIL] $path -> ERROR: $($result.error)" "Red"
        }
        $script:fail++
    }
}

function HitHealthEndpoint() {
    $primary = "/api/health/db"
    $fallback = "/api/db/health"
    $result = TryGet $primary 200
    if ($result.ok) {
        $results.Add([ordered]@{
            path = $primary
            expected_status = 200
            ok = $true
            status = [int]$result.status
            body = $result.body
            error = $null
            fallback_path = $null
        })
        Write-SmokeLine "  [PASS] $primary -> $($result.status)" "Green"
        Write-SmokeLine "         $($result.body)" "DarkGray"
        $script:pass++
        return
    }
    Write-SmokeLine "  [WARN] $primary unavailable; trying $fallback" "Yellow"
    $fallbackResult = TryGet $fallback 200
    if ($fallbackResult.ok) {
        $results.Add([ordered]@{
            path = $primary
            expected_status = 200
            ok = $true
            status = [int]$fallbackResult.status
            body = $fallbackResult.body
            error = $null
            fallback_path = $fallback
        })
        Write-SmokeLine "  [PASS] $primary -> $($fallbackResult.status) (via $fallback)" "Green"
        Write-SmokeLine "         $($fallbackResult.body)" "DarkGray"
        $script:pass++
        return
    }
    $errMsg = if ($null -ne $fallbackResult.error) { $fallbackResult.error } else { "Unknown error" }
    $results.Add([ordered]@{
        path = $primary
        expected_status = 200
        ok = $false
        status = if ($null -ne $fallbackResult.status) { [int]$fallbackResult.status } else { $null }
        body = $null
        error = $errMsg
        fallback_path = $fallback
    })
    Write-SmokeLine "  [FAIL] $primary -> ERROR: $errMsg" "Red"
    $script:fail++
}

Write-SmokeLine "`n=== Golden Path Smoke Test ===" "Cyan"
Write-SmokeLine "  Target: $base`n"

HitHealthEndpoint
HitEndpoint "/api/brain/metrics"
HitEndpoint "/api/planner/queue"
HitEndpoint "/api/scholar/digest"
HitEndpoint "/api/scholar/proposals"

if ($Json) {
    [ordered]@{
        ok = ($fail -eq 0)
        scenario = "app-live-golden-path"
        scenario_type = "live/operator"
        base_url = $base
        summary = [ordered]@{
            pass_count = $pass
            fail_count = $fail
            endpoint_count = $results.Count
        }
        checks = @($results)
    } | ConvertTo-Json -Depth 6
} else {
    Write-SmokeLine "`n=== Results: $pass passed, $fail failed ===" $(if ($fail -eq 0) { "Green" } else { "Red" })
}
exit $fail
