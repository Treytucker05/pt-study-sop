param(
    [ValidateSet("DryRun", "Apply", "Check")]
    [string]$Mode = "DryRun",
    [string]$CanonicalRoot = "$env:USERPROFILE\.agents\skills",
    [string[]]$AdditionalSourceRoots = @()
)

$ErrorActionPreference = "Stop"

$results = New-Object System.Collections.Generic.List[string]
$statusCounts = @{}
$backupRoot = $null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

$TargetRoots = [ordered]@{
    codex       = "$env:USERPROFILE\.codex\skills"
    claude      = "$env:USERPROFILE\.claude\skills"
    cursor      = "$env:USERPROFILE\.cursor\skills"
    opencode    = "$env:USERPROFILE\.opencode\skills"
    gemini      = "$env:USERPROFILE\.gemini\skills"
    antigravity = "$env:USERPROFILE\.antigravity\skills"
    kimi        = "$env:USERPROFILE\.kimi\skills"
    hermes      = "$env:USERPROFILE\.hermes\skills"
}

$LocalOnlyNames = @{
    codex       = @(
        ".system",
        "agent-browser",
        "agent-skills",
        "chrome-cdp",
        "context7",
        "gemini-computer-use",
        "llm-council",
        "markdown-url",
        "parallel",
        "parallel-task",
        "parallel-task-spark",
        "plan-harder",
        "read-github",
        "role-creator",
        "super-swarm-spark",
        "swarm-planner",
        "vercel-react-best-practices"
    )
    claude      = @("continuous-learning", "learned")
    cursor      = @()
    opencode    = @("agent-strategy", "ensure-agent-workflow")
    gemini      = @()
    antigravity = @()
    kimi        = @()
    hermes      = @(
        ".bundled_manifest",
        "apple",
        "ask-questions-if-underspecified",
        "autonomous-ai-agents",
        "backend-development",
        "brainstormer",
        "browser-automation",
        "bug-deep",
        "bug-fast",
        "capture-learning",
        "ci-fix",
        "code-refactoring",
        "coder",
        "codex",
        "codex-subagent",
        "coding-guidelines-verify",
        "commit-work",
        "concept-map-artist",
        "conductor-implement",
        "conductor-manage",
        "conductor-new-track",
        "conductor-revert",
        "conductor-setup",
        "conductor-validator",
        "context-compression",
        "context-degradation",
        "context-fundamentals",
        "context-optimization",
        "crafting-effective-readmes",
        "create-cli",
        "create-skill",
        "creative",
        "data-science",
        "diagramming",
        "dogfood",
        "domain",
        "email",
        "evaluation",
        "feeds",
        "filesystem-context",
        "find-skills",
        "focus-coach",
        "frontend-design",
        "frontend-responsive-ui",
        "gaming",
        "gemini",
        "generative-ui",
        "gepetto",
        "gifs",
        "github",
        "inference-sh",
        "javascript-typescript",
        "json-canvas",
        "last30days",
        "learn-instinct",
        "leisure",
        "llm-application-dev",
        "log-outcome",
        "mcp",
        "mcp-builder",
        "media",
        "memory-systems",
        "mermaid-diagrams",
        "mlops",
        "multi-agent-patterns",
        "multi-model-deep",
        "multi-model-quick",
        "music-creation",
        "naming-analyzer",
        "note-taking",
        "obsidian-markdown",
        "ocr-and-documents",
        "openai-docs-skill",
        "pdf",
        "pedagogy-analyst",
        "perplexity",
        "plan-work",
        "planner",
        "playground",
        "prd",
        "productivity",
        "project-development",
        "propose-skill-edit",
        "python-development",
        "ralph",
        "react-best-practices",
        "react-components",
        "react-dev",
        "react-useeffect",
        "red-teaming",
        "reducing-entropy",
        "refactor-clean",
        "reflect",
        "regex-builder",
        "repo-cleanup",
        "requirements-clarity",
        "research",
        "researcher",
        "save-experience",
        "scorecard",
        "self-improve",
        "session-handoff",
        "shadcn",
        "smart-home",
        "social-media",
        "software-development",
        "tdd",
        "tool-design",
        "trey-autoresearch",
        "treys-swarm-planner",
        "twitter-cli",
        "verification-loop",
        "wireframe",
        "writing-clearly-and-concisely"
    )
}

function Write-PlanLine([string]$status, [string]$message) {
    if (-not $statusCounts.ContainsKey($status)) {
        $statusCounts[$status] = 0
    }
    $statusCounts[$status] += 1
    $results.Add(("{0,-12} {1}" -f $status, $message))
}

function Normalize-PathOrEmpty([string]$path) {
    if (-not $path) {
        return ""
    }
    try {
        return [System.IO.Path]::GetFullPath($path).TrimEnd('\').ToLowerInvariant()
    } catch {
        return ""
    }
}

function Ensure-Directory([string]$path) {
    if (Test-Path -LiteralPath $path) {
        return $true
    }

    if ($Mode -eq "Apply") {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-PlanLine "CREATE" $path
        return $true
    }

    if ($Mode -eq "DryRun") {
        Write-PlanLine "WOULD_MKDIR" $path
        return $true
    }

    Write-PlanLine "MISSING" $path
    return $false
}

function Get-SkillEntries([string]$root) {
    if (-not (Test-Path -LiteralPath $root)) {
        return @()
    }

    $entries = @()
    foreach ($item in (Get-ChildItem -LiteralPath $root -Directory -Force)) {
        $skillFile = Join-Path $item.FullName "SKILL.md"
        if (Test-Path -LiteralPath $skillFile) {
            $entries += [pscustomobject]@{
                Name = $item.Name
                Path = $item.FullName
            }
        }
    }
    return $entries
}

function Get-RootEntries([string]$root) {
    if (-not (Test-Path -LiteralPath $root)) {
        return @()
    }

    $entries = @()
    foreach ($item in (Get-ChildItem -LiteralPath $root -Directory -Force)) {
        $isLink = ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
        $target = ""
        $targetExists = $true
        if ($isLink) {
            $resolved = Get-Item -LiteralPath $item.FullName -Force
            $rawTarget = $resolved.Target
            if ($rawTarget -is [array]) {
                if ($rawTarget.Count -gt 0) {
                    $target = [string]$rawTarget[0]
                }
            } else {
                $target = [string]$rawTarget
            }
            $targetExists = if ($target) { Test-Path -LiteralPath $target } else { $false }
        }

        $entries += [pscustomobject]@{
            Name = $item.Name
            FullName = $item.FullName
            IsLink = $isLink
            LinkType = if ($isLink) { $item.LinkType } else { "" }
            Target = $target
            TargetExists = $targetExists
            HasSkillFile = Test-Path -LiteralPath (Join-Path $item.FullName "SKILL.md")
        }
    }
    return $entries
}

function Ensure-BackupRoot() {
    if ($backupRoot) {
        return $backupRoot
    }
    $backupRoot = Join-Path "$env:USERPROFILE\.agents" ("skill_backups\" + $timestamp)
    if (-not (Test-Path -LiteralPath $backupRoot)) {
        New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    }
    return $backupRoot
}

function Move-ToBackup([string]$targetName, [string]$path, [string]$name) {
    $root = Ensure-BackupRoot
    $backupTargetDir = Join-Path $root $targetName
    if (-not (Test-Path -LiteralPath $backupTargetDir)) {
        New-Item -ItemType Directory -Path $backupTargetDir -Force | Out-Null
    }
    $backupPath = Join-Path $backupTargetDir $name
    Move-Item -LiteralPath $path -Destination $backupPath -Force
    return $backupPath
}

function Write-Summary([bool]$success, [int]$canonicalCount) {
    $orderedStatuses = @(
        "OK",
        "SKIP",
        "CREATE",
        "LINK",
        "RELINK",
        "REMOVE",
        "COPY",
        "WOULD_MKDIR",
        "WOULD_LINK",
        "WOULD_RELINK",
        "WOULD_REMOVE",
        "WOULD_COPY",
        "MISSING",
        "DRIFT",
        "EXTRA",
        "CONFLICT",
        "ERROR"
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
    $results.Add(("CANON   {0}" -f $CanonicalRoot))
    $results.Add(("COUNT   {0}" -f $canonicalCount))
    if ($backupRoot) {
        $results.Add(("BACKUP  {0}" -f $backupRoot))
    }
    $results.Add(("SUMMARY {0}" -f ($summaryParts -join " ")))
    $results.Add(("RESULT  {0}" -f ($(if ($success) { "PASS" } else { "FAIL" }))))

    Write-Output ($results -join "`n")
}

$allOk = $true
$flatLocalOnlyNames = New-Object System.Collections.Generic.HashSet[string] ([StringComparer]::OrdinalIgnoreCase)
foreach ($targetName in $LocalOnlyNames.Keys) {
    foreach ($skillName in $LocalOnlyNames[$targetName]) {
        [void]$flatLocalOnlyNames.Add($skillName)
    }
}

$allOk = (Ensure-Directory $CanonicalRoot) -and $allOk

$canonicalEntries = Get-SkillEntries $CanonicalRoot
$canonicalMap = @{}
foreach ($entry in $canonicalEntries) {
    $canonicalMap[$entry.Name] = $entry.Path
}

foreach ($sourceRoot in $AdditionalSourceRoots) {
    if (-not $sourceRoot) {
        continue
    }
    if (-not (Test-Path -LiteralPath $sourceRoot)) {
        Write-PlanLine "SKIP" "$sourceRoot (missing optional source root)"
        continue
    }

    foreach ($entry in (Get-SkillEntries $sourceRoot)) {
        if ($flatLocalOnlyNames.Contains($entry.Name)) {
            Write-PlanLine "SKIP" "$($entry.Name) stays local-only and is not promoted to canonical"
            continue
        }
        if ($canonicalMap.ContainsKey($entry.Name)) {
            continue
        }

        $canonicalSkillPath = Join-Path $CanonicalRoot $entry.Name
        if ($Mode -eq "Apply") {
            Copy-Item -LiteralPath $entry.Path -Destination $canonicalSkillPath -Recurse -Force
            Write-PlanLine "COPY" "$($entry.Name) -> $canonicalSkillPath"
        } elseif ($Mode -eq "DryRun") {
            Write-PlanLine "WOULD_COPY" "$($entry.Name) -> $canonicalSkillPath"
        } else {
            Write-PlanLine "MISSING" "Canonical skill missing: $($entry.Name)"
            $allOk = $false
        }

        $canonicalMap[$entry.Name] = $canonicalSkillPath
    }
}

$canonicalNames = @($canonicalMap.Keys | Sort-Object -Unique)
if ($canonicalNames.Count -eq 0) {
    throw "Canonical root has zero skills: $CanonicalRoot"
}

foreach ($targetName in $TargetRoots.Keys) {
    $targetRoot = $TargetRoots[$targetName]
    $allowedLocalNames = @($LocalOnlyNames[$targetName])
    $allowedLookup = New-Object System.Collections.Generic.HashSet[string] ([StringComparer]::OrdinalIgnoreCase)
    foreach ($name in $allowedLocalNames) {
        [void]$allowedLookup.Add($name)
    }

    $allOk = (Ensure-Directory $targetRoot) -and $allOk
    $existingMap = @{}
    foreach ($entry in (Get-RootEntries $targetRoot)) {
        $existingMap[$entry.Name] = $entry
    }

    foreach ($skillName in $canonicalNames) {
        $desiredPath = Join-Path $CanonicalRoot $skillName
        $desiredSkillFile = Join-Path $desiredPath "SKILL.md"
        if (-not (Test-Path -LiteralPath $desiredSkillFile)) {
            Write-PlanLine "ERROR" "Canonical skill missing SKILL.md: $skillName"
            $allOk = $false
            continue
        }

        if (-not $existingMap.ContainsKey($skillName)) {
            $targetPath = Join-Path $targetRoot $skillName
            if ($Mode -eq "Apply") {
                New-Item -ItemType Junction -Path $targetPath -Target $desiredPath | Out-Null
                Write-PlanLine "LINK" "$targetPath -> $desiredPath"
            } elseif ($Mode -eq "DryRun") {
                Write-PlanLine "WOULD_LINK" "$targetPath -> $desiredPath"
            } else {
                Write-PlanLine "MISSING" "$targetPath"
                $allOk = $false
            }
            continue
        }

        $entry = $existingMap[$skillName]
        $normalizedTarget = Normalize-PathOrEmpty $entry.Target
        $normalizedDesired = Normalize-PathOrEmpty $desiredPath
        $matchesCanonical = $entry.IsLink -and $normalizedTarget -eq $normalizedDesired -and $entry.TargetExists

        if ($matchesCanonical) {
            Write-PlanLine "OK" "$($entry.FullName) -> $desiredPath"
            continue
        }

        if ($allowedLookup.Contains($skillName)) {
            Write-PlanLine "CONFLICT" "$($entry.FullName) is a local-only name that collides with canonical skill '$skillName'"
            $allOk = $false
            continue
        }

        if ($Mode -eq "Apply") {
            $backupPath = Move-ToBackup -targetName $targetName -path $entry.FullName -name $skillName
            New-Item -ItemType Junction -Path $entry.FullName -Target $desiredPath | Out-Null
            Write-PlanLine "RELINK" "$($entry.FullName) -> $desiredPath (backup: $backupPath)"
        } elseif ($Mode -eq "DryRun") {
            Write-PlanLine "WOULD_RELINK" "$($entry.FullName) -> $desiredPath"
        } else {
            Write-PlanLine "DRIFT" "$($entry.FullName) does not point to canonical $desiredPath"
            $allOk = $false
        }
    }

    foreach ($entry in ($existingMap.Values | Sort-Object Name)) {
        if ($canonicalMap.ContainsKey($entry.Name)) {
            continue
        }

        if ($allowedLookup.Contains($entry.Name)) {
            Write-PlanLine "SKIP" "$($entry.FullName) preserved as local-only"
            continue
        }

        if ($Mode -eq "Apply") {
            $backupPath = Move-ToBackup -targetName $targetName -path $entry.FullName -name $entry.Name
            Write-PlanLine "REMOVE" "$($entry.FullName) moved to $backupPath"
        } elseif ($Mode -eq "DryRun") {
            Write-PlanLine "WOULD_REMOVE" $entry.FullName
        } else {
            Write-PlanLine "EXTRA" $entry.FullName
            $allOk = $false
        }
    }
}

Write-Summary -success $allOk -canonicalCount $canonicalNames.Count

if ($Mode -eq "Check" -and (-not $allOk)) {
    exit 1
}

if (-not $allOk) {
    exit 1
}

exit 0
