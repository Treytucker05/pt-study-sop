param(
    [ValidateSet("DryRun", "Apply", "Check")]
    [string]$Mode = "DryRun"
)

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptRoot

function Write-PlanLine([string]$status, [string]$message) {
    Write-Output ("{0,-7} {1}" -f $status, $message)
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
    $current = if ($exists) { (Get-Content -LiteralPath $path -Raw) } else { "" }
    $expected = $expectedContent.TrimEnd("`r", "`n") + "`n"

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
$allOk = (Ensure-StubFile -path (Join-Path $repoRoot ".claude/AGENTS.md") -expectedContent @"
# Agent Rules

See root `AGENTS.md` for all agent instructions. This copy exists for Claude Code tool compatibility.
"@) -and $allOk

$allOk = (Ensure-StubFile -path (Join-Path $repoRoot ".claude/CLAUDE.md") -expectedContent @"
# PT Study System

See root `CLAUDE.md` for all project instructions. This copy exists for Claude Code tool compatibility.
"@) -and $allOk

# JSON validity checks (do not enforce equality between different tool configs).
$allOk = (Test-JsonFile -path (Join-Path $repoRoot "permissions.json")) -and $allOk
$allOk = (Test-JsonFile -path (Join-Path $repoRoot ".mcp.json")) -and $allOk
$allOk = (Test-JsonFile -path (Join-Path $repoRoot ".claude/permissions.json")) -and $allOk
$allOk = (Test-JsonFile -path (Join-Path $repoRoot ".claude/mcp.json")) -and $allOk
$allOk = (Test-JsonFile -path (Join-Path $repoRoot ".claude/settings.local.json") -optional $true) -and $allOk

if ($Mode -eq "Check" -and (-not $allOk)) {
    exit 1
}

exit 0

