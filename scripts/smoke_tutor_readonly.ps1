<#
.SYNOPSIS
  Read-only Tutor smoke test for a running dashboard.
.DESCRIPTION
  Uses GET-only tutor endpoints to verify API availability without creating
  sessions, notes, or Obsidian artifacts.
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
            TimeoutSec = 8
        }
        if ($PSVersionTable.PSVersion.Major -lt 6) {
            $requestArgs.UseBasicParsing = $true
        }
        $resp = Invoke-WebRequest @requestArgs
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
    $results.Add([ordered]@{
        path = $path
        expected_status = if ($expectedStatus) { $expectedStatus } else { 200 }
        ok = [bool]$result.ok
        status = if ($null -ne $result.status) { [int]$result.status } else { $null }
        body = if ($result.body) { $result.body } else { $null }
        error = if ($result.error) { $result.error } else { $null }
    })
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

Write-SmokeLine "`n=== Tutor Read-Only Smoke Test ===" "Cyan"
Write-SmokeLine "  Target: $base`n"

HitEndpoint "/api/tutor/config/check" 200
HitEndpoint "/api/tutor/blocks" 200
HitEndpoint "/api/tutor/chains/templates" 200
HitEndpoint "/api/tutor/content-sources" 200
HitEndpoint "/api/tutor/materials" 200
HitEndpoint "/api/tutor/sessions" 200

if ($Json) {
    [ordered]@{
        ok = ($fail -eq 0)
        scenario = "tutor-live-readonly"
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

