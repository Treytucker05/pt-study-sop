param(
    [ValidateSet("DryRun", "Apply", "Check")]
    [string]$Mode = "DryRun",
    [string]$CanonicalRoot = "$env:USERPROFILE\.agents\skills",
    [string[]]$AdditionalSourceRoots = @(
        "$env:USERPROFILE\.codex\skills",
        "$env:USERPROFILE\.claude\skills",
        "$env:USERPROFILE\.kimi\skills",
        "$env:USERPROFILE\.cursor\skills",
        "$env:USERPROFILE\.cursor\skills-cursor",
        "$env:USERPROFILE\.antigravity\skills"
    )
)

$ErrorActionPreference = "Stop"

$TargetRoots = [ordered]@{
    codex       = "$env:USERPROFILE\.codex\skills"
    claude      = "$env:USERPROFILE\.claude\skills"
    kimi        = "$env:USERPROFILE\.kimi\skills"
    cursor      = "$env:USERPROFILE\.cursor\skills"
    antigravity = "$env:USERPROFILE\.antigravity\skills"
}

function Write-PlanLine([string]$status, [string]$message) {
    Write-Output ("{0,-11} {1}" -f $status, $message)
}

function Normalize-PathOrEmpty([string]$path) {
    if (-not $path) { return "" }
    try {
        return [System.IO.Path]::GetFullPath($path).TrimEnd('\').ToLowerInvariant()
    } catch {
        return ""
    }
}

function Get-SkillEntries([string]$root) {
    if (-not (Test-Path -LiteralPath $root)) {
        return @()
    }

    $entries = @()
    Get-ChildItem -LiteralPath $root -Directory -Force | ForEach-Object {
        $skillPath = $_.FullName
        $skillFile = Join-Path $skillPath "SKILL.md"
        if (Test-Path -LiteralPath $skillFile) {
            $entries += [pscustomobject]@{
                Name = $_.Name
                Path = $skillPath
            }
        }
    }
    return $entries
}

function Ensure-Directory([string]$path) {
    if (Test-Path -LiteralPath $path) {
        return
    }
    if ($Mode -eq "Apply") {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-PlanLine "CREATE" $path
    } elseif ($Mode -eq "DryRun") {
        Write-PlanLine "WOULD_MKDIR" $path
    } else {
        throw "Missing required directory: $path"
    }
}

function Get-ReparseTargetOrEmpty([string]$path) {
    try {
        $item = Get-Item -LiteralPath $path -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) {
            return ""
        }
        $target = $item.Target
        if ($target -is [array]) {
            if ($target.Count -gt 0) {
                return [string]$target[0]
            }
            return ""
        }
        return [string]$target
    } catch {
        return ""
    }
}

$allRoots = @($CanonicalRoot) + $AdditionalSourceRoots + @($TargetRoots.Values)
$allRoots = $allRoots | Where-Object { $_ } | Select-Object -Unique

$skillSource = @{}
foreach ($root in $allRoots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    foreach ($entry in (Get-SkillEntries $root)) {
        if (-not $skillSource.ContainsKey($entry.Name)) {
            $skillSource[$entry.Name] = $entry.Path
        }
    }
}

if ($skillSource.Count -eq 0) {
    throw "No skills detected in any configured roots."
}

Ensure-Directory $CanonicalRoot

$copiedToCanonical = 0
$canonicalMissing = @()

foreach ($name in ($skillSource.Keys | Sort-Object)) {
    $canonicalSkillPath = Join-Path $CanonicalRoot $name
    $canonicalSkillFile = Join-Path $canonicalSkillPath "SKILL.md"
    if (Test-Path -LiteralPath $canonicalSkillFile) {
        continue
    }

    $sourcePath = [string]$skillSource[$name]
    if (-not (Test-Path -LiteralPath (Join-Path $sourcePath "SKILL.md"))) {
        $canonicalMissing += $name
        Write-PlanLine "ERROR" "Missing source SKILL.md for '$name' at $sourcePath"
        continue
    }

    if ($Mode -eq "Apply") {
        Copy-Item -LiteralPath $sourcePath -Destination $canonicalSkillPath -Recurse -Force
        $copiedToCanonical++
        Write-PlanLine "COPY" "$name -> $canonicalSkillPath"
    } elseif ($Mode -eq "DryRun") {
        Write-PlanLine "WOULD_COPY" "$name -> $canonicalSkillPath"
    } else {
        Write-PlanLine "MISSING" "Canonical skill missing: $name"
        $canonicalMissing += $name
    }
}

$canonicalSkills = Get-SkillEntries $CanonicalRoot
$canonicalNames = @($canonicalSkills | Select-Object -ExpandProperty Name | Sort-Object -Unique)

if ($canonicalNames.Count -eq 0) {
    throw "Canonical root has zero skills after sync attempt: $CanonicalRoot"
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path "$env:USERPROFILE\.agents" ("skill_backups\" + $timestamp)
$linksCreated = 0
$linksReplaced = 0
$driftFound = 0

foreach ($targetName in $TargetRoots.Keys) {
    $targetRoot = $TargetRoots[$targetName]
    Ensure-Directory $targetRoot

    foreach ($skillName in $canonicalNames) {
        $desiredPath = Join-Path $CanonicalRoot $skillName
        $desiredFile = Join-Path $desiredPath "SKILL.md"
        if (-not (Test-Path -LiteralPath $desiredFile)) {
            Write-PlanLine "ERROR" "Canonical skill missing SKILL.md: $skillName"
            $driftFound++
            continue
        }

        $targetPath = Join-Path $targetRoot $skillName
        $targetFile = Join-Path $targetPath "SKILL.md"

        if (-not (Test-Path -LiteralPath $targetPath)) {
            if ($Mode -eq "Apply") {
                New-Item -ItemType Junction -Path $targetPath -Target $desiredPath | Out-Null
                $linksCreated++
                Write-PlanLine "LINK" "$targetPath -> $desiredPath"
            } elseif ($Mode -eq "DryRun") {
                Write-PlanLine "WOULD_LINK" "$targetPath -> $desiredPath"
            } else {
                $driftFound++
                Write-PlanLine "MISSING" "$targetPath"
            }
            continue
        }

        $reparseTarget = Get-ReparseTargetOrEmpty $targetPath
        $normalizedReparseTarget = Normalize-PathOrEmpty $reparseTarget
        $normalizedDesired = Normalize-PathOrEmpty $desiredPath

        if ($normalizedReparseTarget -eq $normalizedDesired) {
            continue
        }

        $targetLooksLikeSkill = Test-Path -LiteralPath $targetFile
        if (-not $targetLooksLikeSkill -and -not $reparseTarget) {
            # Unknown directory/file occupying the name, but not a skill folder.
            $driftFound++
            Write-PlanLine "CONFLICT" "$targetPath exists and is not a skill directory"
            continue
        }

        if ($Mode -eq "Apply") {
            $backupTargetDir = Join-Path $backupRoot $targetName
            if (-not (Test-Path -LiteralPath $backupTargetDir)) {
                New-Item -ItemType Directory -Path $backupTargetDir -Force | Out-Null
            }
            $backupPath = Join-Path $backupTargetDir $skillName
            Move-Item -LiteralPath $targetPath -Destination $backupPath -Force
            New-Item -ItemType Junction -Path $targetPath -Target $desiredPath | Out-Null
            $linksReplaced++
            Write-PlanLine "RELINK" "$targetPath -> $desiredPath (backup: $backupPath)"
        } elseif ($Mode -eq "DryRun") {
            Write-PlanLine "WOULD_RELINK" "$targetPath -> $desiredPath"
        } else {
            $driftFound++
            Write-PlanLine "DRIFT" "$targetPath does not point to canonical $desiredPath"
        }
    }
}

Write-Output ""
Write-Output "Summary"
Write-Output "-------"
Write-Output ("Canonical root: {0}" -f $CanonicalRoot)
Write-Output ("Canonical skills: {0}" -f $canonicalNames.Count)
Write-Output ("Copied to canonical: {0}" -f $copiedToCanonical)
Write-Output ("Links created: {0}" -f $linksCreated)
Write-Output ("Links replaced: {0}" -f $linksReplaced)
Write-Output ("Drift/conflicts found: {0}" -f $driftFound)

if ($Mode -eq "Check" -and ($driftFound -gt 0 -or $canonicalMissing.Count -gt 0)) {
    exit 1
}

exit 0
