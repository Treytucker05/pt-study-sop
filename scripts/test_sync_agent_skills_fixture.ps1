$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $PSScriptRoot "sync_agent_skills.ps1"
$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("sync-agent-skills-fixture-" + [guid]::NewGuid().ToString("N"))
$fixtureHome = Join-Path $fixtureRoot "home"
$originalUserProfile = $env:USERPROFILE

function New-SkillDir([string]$path, [string]$body) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $path "SKILL.md") -Value $body -Encoding UTF8
}

function Assert-True([bool]$condition, [string]$message) {
    if (-not $condition) {
        throw $message
    }
}

function Normalize-Target([string]$path) {
    return [System.IO.Path]::GetFullPath($path).TrimEnd('\').ToLowerInvariant()
}

function Invoke-Sync([string]$mode) {
    $output = & $scriptPath -Mode $mode 2>&1
    $exitCode = $LASTEXITCODE
    return [pscustomobject]@{
        Output = ($output -join "`n")
        ExitCode = $exitCode
    }
}

try {
    New-Item -ItemType Directory -Path $fixtureHome -Force | Out-Null
    $env:USERPROFILE = $fixtureHome

    New-SkillDir (Join-Path $fixtureHome ".agents\\skills\\alpha") "# alpha"
    New-SkillDir (Join-Path $fixtureHome ".agents\\skills\\beta") "# beta"

    New-SkillDir (Join-Path $fixtureHome ".claude\\skills\\continuous-learning") "# claude local"
    New-SkillDir (Join-Path $fixtureHome ".opencode\\skills\\agent-strategy") "# opencode local"
    New-SkillDir (Join-Path $fixtureHome ".codex\\skills\\.system") "# codex local"

    New-Item -ItemType Directory -Path (Join-Path $fixtureHome ".cursor\\skills-cursor") -Force | Out-Null
    New-SkillDir (Join-Path $fixtureHome ".cursor\\skills-cursor\\create-skill") "# cursor local"

    New-Item -ItemType Directory -Path (Join-Path $fixtureHome ".claude\\skills") -Force | Out-Null
    New-Item -ItemType Junction -Path (Join-Path $fixtureHome ".claude\\skills\\alpha") -Target (Join-Path $fixtureHome ".agents\\skills\\alpha") | Out-Null

    New-Item -ItemType Directory -Path (Join-Path $fixtureHome ".cursor\\skills") -Force | Out-Null
    New-Item -ItemType Junction -Path (Join-Path $fixtureHome ".cursor\\skills\\alpha") -Target (Join-Path $fixtureHome ".agents\\skills\\alpha") | Out-Null

    New-Item -ItemType Directory -Path (Join-Path $fixtureHome ".gemini\\skills") -Force | Out-Null
    New-SkillDir (Join-Path $fixtureHome ".gemini\\skills\\legacy-folder") "# stale"

    New-Item -ItemType Directory -Path (Join-Path $fixtureHome ".antigravity\\skills") -Force | Out-Null
    New-SkillDir (Join-Path $fixtureHome ".antigravity\\skills\\legacy-folder") "# stale"

    $dryRun = Invoke-Sync "DryRun"
    Assert-True ($dryRun.ExitCode -eq 0) "DryRun should succeed"
    Assert-True ($dryRun.Output -match "WOULD_LINK.+beta") "DryRun should report missing canonical link creation"
    Assert-True ($dryRun.Output -match "WOULD_REMOVE.+legacy-folder") "DryRun should report gemini legacy folder removal"
    Assert-True ($dryRun.Output -match "WOULD_REMOVE.+legacy-folder") "DryRun should report legacy folder removal"
    Assert-True ($dryRun.Output -match "SKIP.+continuous-learning") "DryRun should preserve Claude local exception"
    Assert-True ($dryRun.Output -notmatch "\\.kimi\\\\skills") "DryRun should not target Kimi skill roots"
    Assert-True ($dryRun.Output -notmatch "skills-cursor\\\\create-skill") "DryRun should not touch Cursor local skills"

    $apply = Invoke-Sync "Apply"
    Assert-True ($apply.ExitCode -eq 0) "Apply should succeed"

    Assert-True (Test-Path -LiteralPath (Join-Path $fixtureHome ".cursor\\skills\\beta")) "Apply should create missing cursor junction"
    $cursorBetaTarget = Get-Item -LiteralPath (Join-Path $fixtureHome ".cursor\\skills\\beta") -Force
    $resolvedTarget = if ($cursorBetaTarget.Target -is [array]) { [string]$cursorBetaTarget.Target[0] } else { [string]$cursorBetaTarget.Target }
    Assert-True ((Normalize-Target $resolvedTarget) -eq (Normalize-Target (Join-Path $fixtureHome ".agents\\skills\\beta"))) "Cursor beta should point to canonical beta"
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $fixtureHome ".gemini\\skills\\legacy-folder"))) "Apply should remove gemini legacy folder"
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $fixtureHome ".antigravity\\skills\\legacy-folder"))) "Apply should remove antigravity legacy folder"
    Assert-True (Test-Path -LiteralPath (Join-Path $fixtureHome ".claude\\skills\\continuous-learning\\SKILL.md")) "Apply should preserve Claude local exception"
    Assert-True (Test-Path -LiteralPath (Join-Path $fixtureHome ".opencode\\skills\\agent-strategy\\SKILL.md")) "Apply should preserve OpenCode local exception"
    Assert-True (Test-Path -LiteralPath (Join-Path $fixtureHome ".cursor\\skills-cursor\\create-skill\\SKILL.md")) "Apply should preserve Cursor local skill root"

    $firstCheck = Invoke-Sync "Check"
    Assert-True ($firstCheck.ExitCode -eq 0) "First Check should succeed after Apply"

    $secondCheck = Invoke-Sync "Check"
    Assert-True ($secondCheck.ExitCode -eq 0) "Second Check should also succeed"

    Write-Output "sync_agent_skills fixture PASS"
} finally {
    $env:USERPROFILE = $originalUserProfile
    if (Test-Path -LiteralPath $fixtureRoot) {
        Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
    }
}
