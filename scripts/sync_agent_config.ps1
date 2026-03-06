param(
    [ValidateSet("DryRun", "Apply", "Check")]
    [string]$Mode = "DryRun"
)

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptRoot
$results = New-Object System.Collections.Generic.List[string]
$statusCounts = @{}

function Write-PlanLine([string]$status, [string]$message) {
    if (-not $statusCounts.ContainsKey($status)) {
        $statusCounts[$status] = 0
    }
    $statusCounts[$status] += 1
    $results.Add(("{0,-7} {1}" -f $status, $message))
}

function Normalize-Text([string]$text) {
    if ($null -eq $text) {
        return ""
    }
    $normalized = $text -replace "`r`n", "`n"
    $normalized = $normalized -replace "`r", "`n"
    return ($normalized.TrimEnd("`n") + "`n")
}

function Test-JsonFile([string]$path, [bool]$optional = $false) {
    if (-not (Test-Path -LiteralPath $path)) {
        if ($optional) {
            Write-PlanLine "SKIP" "$path (missing, optional)"
            return $true
        }
        Write-PlanLine "MISSING" $path
        return $false
    }

    try {
        Get-Content -LiteralPath $path -Raw | ConvertFrom-Json | Out-Null
        Write-PlanLine "OK" $path
        return $true
    } catch {
        Write-PlanLine "INVALID" "$path (invalid JSON)"
        return $false
    }
}

function Ensure-StubFile([string]$path, [string]$expectedContent) {
    $exists = Test-Path -LiteralPath $path
    $current = if ($exists) { Normalize-Text (Get-Content -LiteralPath $path -Raw) } else { "" }
    $expected = Normalize-Text $expectedContent

    if ($current -eq $expected) {
        Write-PlanLine "OK" $path
        return $true
    }

    if ($Mode -eq "Check") {
        if (-not $exists) {
            Write-PlanLine "MISSING" $path
        } else {
            Write-PlanLine "MISMATCH" $path
        }
        return $false
    }

    if ($Mode -eq "DryRun") {
        $action = if ($exists) { "WOULD_WRITE" } else { "WOULD_CREATE" }
        Write-PlanLine $action $path
        return $true
    }

    # Apply
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupRoot = Join-Path $repoRoot "scripts/_agent_config_backups/$timestamp"
    $destDir = Split-Path -Parent $path

    if (-not (Test-Path -LiteralPath $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }

    if ($exists) {
        $backupPath = Join-Path $backupRoot ((Resolve-Path -LiteralPath $path).Path.Substring($repoRoot.Length).TrimStart("\"))
        $backupDir = Split-Path -Parent $backupPath
        if (-not (Test-Path -LiteralPath $backupDir)) {
            New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        }
        Copy-Item -LiteralPath $path -Destination $backupPath -Force
    }

    Set-Content -LiteralPath $path -Value $expected -Encoding UTF8 -NoNewline
    Write-PlanLine "WRITE" $path
    return $true
}

function Ensure-MirrorFile([string]$sourcePath, [string]$destPath) {
    if (-not (Test-Path -LiteralPath $sourcePath)) {
        Write-PlanLine "MISSING" $sourcePath
        return $false
    }

    $source = Normalize-Text (Get-Content -LiteralPath $sourcePath -Raw)
    $exists = Test-Path -LiteralPath $destPath
    $current = if ($exists) { Normalize-Text (Get-Content -LiteralPath $destPath -Raw) } else { "" }

    if ($exists -and $current -eq $source) {
        Write-PlanLine "OK" "$destPath (mirrors $sourcePath)"
        return $true
    }

    if ($Mode -eq "Check") {
        if (-not $exists) {
            Write-PlanLine "MISSING" $destPath
        } else {
            Write-PlanLine "MISMATCH" "$destPath (expected mirror of $sourcePath)"
        }
        return $false
    }

    if ($Mode -eq "DryRun") {
        $action = if ($exists) { "WOULD_WRITE" } else { "WOULD_CREATE" }
        Write-PlanLine $action "$destPath (mirror of $sourcePath)"
        return $true
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupRoot = Join-Path $repoRoot "scripts/_agent_config_backups/$timestamp"
    $destDir = Split-Path -Parent $destPath

    if (-not (Test-Path -LiteralPath $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }

    if ($exists) {
        $backupPath = Join-Path $backupRoot ((Resolve-Path -LiteralPath $destPath).Path.Substring($repoRoot.Length).TrimStart("\"))
        $backupDir = Split-Path -Parent $backupPath
        if (-not (Test-Path -LiteralPath $backupDir)) {
            New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        }
        Copy-Item -LiteralPath $destPath -Destination $backupPath -Force
    }

    Copy-Item -LiteralPath $sourcePath -Destination $destPath -Force
    Write-PlanLine "WRITE" "$destPath (mirror of $sourcePath)"
    return $true
}

function Write-Summary([bool]$success) {
    $orderedStatuses = @(
        "OK",
        "SKIP",
        "WRITE",
        "WOULD_CREATE",
        "WOULD_WRITE",
        "MISSING",
        "MISMATCH",
        "INVALID"
    )

    $summaryParts = @()
    foreach ($status in $orderedStatuses) {
        if ($statusCounts.ContainsKey($status) -and $statusCounts[$status] -gt 0) {
            $summaryParts += ("{0}={1}" -f $status.ToLower(), $statusCounts[$status])
        }
    }

    if ($summaryParts.Count -eq 0) {
        $summaryParts += "no_checks=0"
    }

    $results.Add("")
    $results.Add(("MODE    {0}" -f $Mode))
    $results.Add(("SUMMARY {0}" -f ($summaryParts -join " ")))
    $results.Add(("RESULT  {0}" -f ($(if ($success) { "PASS" } else { "FAIL" }))))

    Write-Output ($results -join "`n")
}

$allOk = $true

# Repo instruction entrypoints must exist.
$requiredRepoFiles = @(
    (Join-Path $repoRoot "AGENTS.md"),
    (Join-Path $repoRoot "CLAUDE.md"),
    (Join-Path $repoRoot "permissions.json"),
    (Join-Path $repoRoot ".mcp.json")
)

foreach ($path in $requiredRepoFiles) {
    if (Test-Path -LiteralPath $path) {
        Write-PlanLine "OK" $path
    } else {
        Write-PlanLine "MISSING" $path
        $allOk = $false
    }
}

# Claude Code compatibility stubs inside the repo.
$allOk = (Ensure-StubFile -path (Join-Path $repoRoot ".claude/AGENTS.md") -expectedContent @'
# Agent Rules

Compatibility stub for repo-local Claude tooling.

Read root `AGENTS.md` first and treat it as canonical.
'@) -and $allOk

$allOk = (Ensure-StubFile -path (Join-Path $repoRoot ".claude/CLAUDE.md") -expectedContent @'
# PT Study System

Compatibility stub for repo-local Claude tooling.

Read root `CLAUDE.md`, which defers to root `AGENTS.md` as canonical.
'@) -and $allOk

$allOk = (Ensure-MirrorFile -sourcePath (Join-Path $repoRoot "permissions.json") -destPath (Join-Path $repoRoot ".claude/permissions.json")) -and $allOk

# JSON validity checks (do not enforce equality between different tool configs, except the explicit permissions mirror above).
$allOk = (Test-JsonFile -path (Join-Path $repoRoot "permissions.json")) -and $allOk
$allOk = (Test-JsonFile -path (Join-Path $repoRoot ".mcp.json")) -and $allOk
$allOk = (Test-JsonFile -path (Join-Path $repoRoot ".claude/permissions.json")) -and $allOk
$allOk = (Test-JsonFile -path (Join-Path $repoRoot ".claude/mcp.json")) -and $allOk
$allOk = (Test-JsonFile -path (Join-Path $repoRoot ".claude/settings.local.json") -optional $true) -and $allOk

Write-Summary -success $allOk

if ($Mode -eq "Check" -and (-not $allOk)) {
    exit 1
}

exit 0

