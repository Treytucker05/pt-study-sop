param(
    [ValidateSet("DryRun", "Apply", "Check")]
    [string]$Mode = "DryRun",
    [switch]$NoBackup,
    [string]$BackupDir,
    [switch]$VerbosePlan
)

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptRoot
$canonicalRoot = Join-Path $repoRoot "ai-config"

if (-not $BackupDir) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $BackupDir = Join-Path $repoRoot ("scripts/_ai_config_backups/{0}" -f $timestamp)
}

function Get-RelativePath([string]$basePath, [string]$fullPath) {
    $base = (Resolve-Path -LiteralPath $basePath).Path
    $full = (Resolve-Path -LiteralPath $fullPath).Path
    if ($full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
        $rel = $full.Substring($base.Length)
        return $rel.TrimStart("\", "/")
    }
    return $full
}

function Get-BackupRelativePath([string]$destPath) {
    $full = [System.IO.Path]::GetFullPath($destPath)
    if ($full.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        return Get-RelativePath -basePath $repoRoot -fullPath $full
    }
    $driveRoot = [System.IO.Path]::GetPathRoot($full) # e.g., C:\
    $driveId = $driveRoot.TrimEnd("\") -replace ":", ""
    $rel = $full.Substring($driveRoot.Length)
    return Join-Path ("_external\" + $driveId) $rel
}

function Get-HashSafe([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash
}

function New-PlanItem($action, $source, $dest, $note, $srcHash, $dstHash) {
    [PSCustomObject]@{
        Action    = $action
        Source    = $source
        Dest      = $dest
        Note      = $note
        SourceHash = $srcHash
        DestHash   = $dstHash
    }
}

$script:PlanMode = $Mode
$script:PlanItems = New-Object System.Collections.Generic.List[object]
$filesWritten = New-Object System.Collections.Generic.List[string]

function Add-FileMapping([string]$src, [string]$dst, [bool]$optional) {
    $planMode = $script:PlanMode
    $plan = $script:PlanItems

    if (-not (Test-Path -LiteralPath $src)) {
        if ($optional) {
            $plan.Add((New-PlanItem -action "SKIP" -source $src -dest $dst -note "missing source" -srcHash $null -dstHash $null))
            return
        }
        $plan.Add((New-PlanItem -action "MISSING" -source $src -dest $dst -note "missing source" -srcHash $null -dstHash $null))
        return
    }

    $srcHash = Get-HashSafe $src
    if (Test-Path -LiteralPath $dst) {
        $dstHash = Get-HashSafe $dst
        if ($srcHash -eq $dstHash) {
            $action = if ($planMode -eq "Check") { "OK" } else { "SKIP" }
            $plan.Add((New-PlanItem -action $action -source $src -dest $dst -note "" -srcHash $srcHash -dstHash $dstHash))
        } else {
            $action = if ($planMode -eq "Check") { "MISMATCH" } else { "COPY" }
            $plan.Add((New-PlanItem -action $action -source $src -dest $dst -note "" -srcHash $srcHash -dstHash $dstHash))
        }
    } else {
        $plan.Add((New-PlanItem -action "COPY" -source $src -dest $dst -note "dest missing" -srcHash $srcHash -dstHash $null))
    }
}

function Add-DirectoryMappings([string]$srcDir, [string]$dstDir, [bool]$optional) {
    $planMode = $script:PlanMode
    $plan = $script:PlanItems

    if (-not (Test-Path -LiteralPath $srcDir)) {
        if ($optional) {
            $plan.Add((New-PlanItem -action "SKIP" -source ($srcDir + "\\*") -dest ($dstDir + "\\*") -note "missing source dir" -srcHash $null -dstHash $null))
            return
        }
        $plan.Add((New-PlanItem -action "MISSING" -source ($srcDir + "\\*") -dest ($dstDir + "\\*") -note "missing source dir" -srcHash $null -dstHash $null))
        return
    }

    $files = Get-ChildItem -LiteralPath $srcDir -File -Recurse -Force -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        $rel = Get-RelativePath -basePath $srcDir -fullPath $file.FullName
        $dst = Join-Path $dstDir $rel
        Add-FileMapping -src $file.FullName -dst $dst -optional $false
    }
}

function Print-Plan([object[]]$items, [switch]$VerbosePlanLocal) {
    if ($VerbosePlanLocal) {
        foreach ($item in $items) {
            $line = "{0,-8} {1} -> {2}" -f $item.Action, $item.Source, $item.Dest
            if ($item.Note) { $line = $line + "  [" + $item.Note + "]" }
            Write-Output $line
            $srcHash = if ($null -ne $item.SourceHash) { $item.SourceHash } else { "" }
            $dstHash = if ($null -ne $item.DestHash) { $item.DestHash } else { "" }
            Write-Output ("         src={0} dst={1}" -f $srcHash, $dstHash)
        }
    } else {
        foreach ($item in $items) {
            $line = "{0,-8} {1} -> {2}" -f $item.Action, $item.Source, $item.Dest
            if ($item.Note) { $line = $line + "  [" + $item.Note + "]" }
            Write-Output $line
        }
    }
}

function Build-Plan([string]$planMode) {
    $script:PlanMode = $planMode
    $script:PlanItems = New-Object System.Collections.Generic.List[object]

    # File mappings
    Add-FileMapping -src (Join-Path $canonicalRoot "AGENTS.md") -dst (Join-Path $repoRoot "AGENTS.md") -optional $false
    Add-FileMapping -src (Join-Path $canonicalRoot "AGENTS.md") -dst (Join-Path $repoRoot ".claude\\AGENTS.md") -optional $false
    Add-FileMapping -src (Join-Path $canonicalRoot "CLAUDE.md") -dst (Join-Path $repoRoot "CLAUDE.md") -optional $false
    Add-FileMapping -src (Join-Path $canonicalRoot "CLAUDE.md") -dst (Join-Path $repoRoot ".claude\\CLAUDE.md") -optional $false
    Add-FileMapping -src (Join-Path $canonicalRoot "permissions.json") -dst (Join-Path $repoRoot ".claude\\permissions.json") -optional $false

    $mcpPath = Join-Path $canonicalRoot "mcp.json"
    if (($planMode -ne "Check") -or (Test-Path -LiteralPath $mcpPath)) {
        Add-FileMapping -src $mcpPath -dst (Join-Path $repoRoot ".claude\\mcp.json") -optional $false
    }

    $settingsPath = Join-Path $canonicalRoot "settings.local.json"
    if (($planMode -ne "Check") -or (Test-Path -LiteralPath $settingsPath)) {
        Add-FileMapping -src $settingsPath -dst (Join-Path $repoRoot ".claude\\settings.local.json") -optional $true
    }

    # Directory mappings
    Add-DirectoryMappings -srcDir (Join-Path $canonicalRoot "commands") -dstDir (Join-Path $repoRoot ".claude\\commands") -optional $false
    Add-DirectoryMappings -srcDir (Join-Path $canonicalRoot "subagents") -dstDir (Join-Path $repoRoot ".claude\\subagents") -optional $false
    Add-DirectoryMappings -srcDir (Join-Path $canonicalRoot "subagents") -dstDir (Join-Path $repoRoot ".claude\\agents") -optional $false

    # Optional skills mapping (silent when not configured)
    $skillsSrc = Join-Path $canonicalRoot "skills"
    $skillsDst = Join-Path $env:USERPROFILE ".codex\\skills\\pt-study-sop"
    if (Test-Path -LiteralPath $skillsSrc) {
        Add-DirectoryMappings -srcDir $skillsSrc -dstDir $skillsDst -optional $true
    }

    return $script:PlanItems
}

if ($Mode -eq "DryRun") {
    $plan = Build-Plan -planMode "DryRun"
    Print-Plan -items $plan -VerbosePlanLocal:$VerbosePlan
    exit 0
}

if ($Mode -eq "Check") {
    $plan = Build-Plan -planMode "Check"
    Print-Plan -items $plan -VerbosePlanLocal:$VerbosePlan
    $drift = $plan | Where-Object { $_.Action -in @("COPY", "MISSING", "MISMATCH") }
    if ($drift.Count -gt 0) {
        exit 1
    }
    Write-Output "0 changes"
    exit 0
}

# Apply mode
$plan = Build-Plan -planMode "Apply"
$missingRequired = $plan | Where-Object { $_.Action -eq "MISSING" }
if ($missingRequired.Count -gt 0) {
    Print-Plan -items $plan -VerbosePlanLocal:$VerbosePlan
    throw "Missing required source files. Aborting apply."
}

foreach ($item in $plan) {
    if ($item.Action -ne "COPY") { continue }

    $destDir = Split-Path -Parent $item.Dest
    if (-not (Test-Path -LiteralPath $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    if (-not $NoBackup -and (Test-Path -LiteralPath $item.Dest)) {
        $backupRel = Get-BackupRelativePath -destPath $item.Dest
        $backupPath = Join-Path $BackupDir $backupRel
        $backupDir = Split-Path -Parent $backupPath
        if (-not (Test-Path -LiteralPath $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }
        Copy-Item -LiteralPath $item.Dest -Destination $backupPath -Force
    }

    Copy-Item -LiteralPath $item.Source -Destination $item.Dest -Force
    $filesWritten.Add($item.Dest)
}

# JSON validation
$jsonTargets = @(
    (Join-Path $repoRoot ".claude\\permissions.json"),
    (Join-Path $repoRoot ".claude\\mcp.json")
)

foreach ($jsonPath in $jsonTargets) {
    if (-not (Test-Path -LiteralPath $jsonPath)) { continue }
    try {
        Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json | Out-Null
    } catch {
        if (-not $NoBackup) {
            $backupRel = Get-BackupRelativePath -destPath $jsonPath
            $backupPath = Join-Path $BackupDir $backupRel
            if (Test-Path -LiteralPath $backupPath) {
                Copy-Item -LiteralPath $backupPath -Destination $jsonPath -Force
            }
        }
        throw "JSON validation failed for $jsonPath. Restored from backup if available."
    }
}

# Post-apply verification
$postPlan = Build-Plan -planMode "Apply"
Print-Plan -items $postPlan -VerbosePlanLocal:$VerbosePlan

$changesLeft = $postPlan | Where-Object { $_.Action -ne "SKIP" }
if ($changesLeft.Count -eq 0) {
    Write-Output "0 changes"
}

if ($filesWritten.Count -gt 0) {
    Write-Output "FILES_WRITTEN:"
    $filesWritten | Sort-Object -Unique | ForEach-Object { Write-Output $_ }
}
