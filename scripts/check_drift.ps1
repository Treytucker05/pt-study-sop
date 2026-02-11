<#
.SYNOPSIS
  Drift checks for PT Study SOP v9.4.1
.DESCRIPTION
  Verifies runtime bundle and SOP files are consistent with v9.4.1 rules.
  Non-destructive, read-only checks.
#>

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pass = 0
$fail = 0

function Check($name, $condition) {
    if ($condition) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $name" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "`n=== PT Study SOP Drift Checks ===" -ForegroundColor Cyan

# 1. No TOPIC PREFIX requirement in runtime prompt
$runtimePrompt = Get-Content "$root\sop\runtime\runtime_prompt.md" -Raw
Check "No TOPIC PREFIX in runtime prompt" (-not ($runtimePrompt -match "TOPIC PREFIX"))

# 2. No JSON at Wrap
Check "No JSON output at Wrap" (-not ($runtimePrompt -match "Tracker JSON"))

# 3. No spacing schedule at Wrap
Check "No spacing schedule at Wrap" (-not ($runtimePrompt -match "Spaced retrieval schedule"))

# 4. Session Ledger format present
Check "Session Ledger in Wrap output" ($runtimePrompt -match "Session Ledger")

# 5. One-Step Rule present
Check "One-Step Rule in runtime prompt" ($runtimePrompt -match "One-Step Rule")

# 6. Six-Phase SOP present
Check "Six-Phase Topic SOP present" ($runtimePrompt -match "Six-Phase")

# 7. No GLOSSARY SCAN
Check "No GLOSSARY SCAN" (-not ($runtimePrompt -match "GLOSSARY SCAN"))

# 8. Runtime bundle generation succeeds
Write-Host "`n  Checking bundle generation..." -ForegroundColor Yellow
$bundleResult = & python "$root\sop\tools\build_runtime_bundle.py" 2>&1
$bundleSuccess = $LASTEXITCODE -eq 0
Check "Runtime bundle generates successfully" $bundleSuccess

# 9. No drift after regeneration
$gitDiff = & git -C $root diff --stat -- sop/runtime/ 2>&1
$noDrift = [string]::IsNullOrWhiteSpace($gitDiff)
Check "No drift after bundle regeneration" $noDrift

# 10. Version check
$versionMatch = $runtimePrompt -match "v9\.4\.1"
Check "Runtime prompt version is v9.4.1" $versionMatch

Write-Host "`n=== Results: $pass passed, $fail failed ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
exit $fail
