[CmdletBinding()]
param(
  [string]$RepoRoot = "C:\pt-study-sop",

  [ValidateSet("fast", "high-confidence")]
  [string]$Mode = "fast",

  [ValidateRange(0, 32)]
  [int]$CodexCount = 2,

  [ValidateRange(0, 32)]
  [int]$ClaudeCount = 1,

  [ValidateRange(0, 32)]
  [int]$GeminiCount = 1,

  [ValidateRange(0, 32)]
  [int]$OhMyCount = 1
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section {
  param([string]$Message)
  Write-Host ""
  Write-Host ("=" * 72)
  Write-Host $Message -ForegroundColor Cyan
  Write-Host ("=" * 72)
}

function Escape-SingleQuoted {
  param([string]$Value)
  if ($null -eq $Value) { return "" }
  return $Value.Replace("'", "''")
}

function Get-FirstCommand {
  param([string[]]$Names)
  foreach ($name in $Names) {
    if ([string]::IsNullOrWhiteSpace($name)) { continue }
    $cmd = Get-Command -Name $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd }
  }
  return $null
}

function Show-InstallSteps {
  param([string]$Tool)

  switch ($Tool) {
    "node" {
      Write-Host "Install Node.js LTS (includes npm):"
      Write-Host "  winget install OpenJS.NodeJS.LTS"
      Write-Host "  or download: https://nodejs.org/"
    }
    "codex" {
      Write-Host "Install Codex CLI:"
      Write-Host "  npm install -g @openai/codex"
    }
    "oh-my-opencode" {
      Write-Host "Install Oh My OpenCode:"
      Write-Host "  npm install -g oh-my-opencode"
    }
    "claude" {
      Write-Host "Optional Claude CLI install:"
      Write-Host "  npm install -g @anthropic-ai/claude-code"
    }
    "gemini" {
      Write-Host "Optional Gemini CLI install:"
      Write-Host "  npm install -g @google/gemini-cli"
    }
    default {
      Write-Host "Install missing tool: $Tool"
    }
  }
}

function Test-PathContainsEntry {
  param([string]$Entry)

  if ([string]::IsNullOrWhiteSpace($Entry)) { return $false }

  $target = [System.IO.Path]::GetFullPath($Entry).TrimEnd('\')
  foreach ($segment in ($env:Path -split ';')) {
    if ([string]::IsNullOrWhiteSpace($segment)) { continue }
    $candidate = $segment.Trim().Trim('"')
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    try {
      $candidate = [System.IO.Path]::GetFullPath($candidate)
    } catch {
      # keep original candidate
    }
    $candidate = $candidate.TrimEnd('\')
    if ($candidate.Equals($target, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }
  return $false
}

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  $old = (Get-Location).Path
  try {
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
      Set-Location -LiteralPath $WorkingDirectory
    }
    & $FilePath @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      throw "Command failed ($exitCode): $FilePath $($Arguments -join ' ')"
    }
  } finally {
    Set-Location -LiteralPath $old
  }
}

function Get-WorktreeMap {
  param([string]$GitRepoRoot)

  $lines = & git -C $GitRepoRoot worktree list --porcelain 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read git worktree list from $GitRepoRoot"
  }

  $map = @{}
  $currentPath = ""
  $currentBranch = ""

  foreach ($line in $lines) {
    if ($line -like "worktree *") {
      if ($currentPath) {
        $map[$currentPath] = $currentBranch
      }
      $rawPath = ($line -replace "^worktree\s+", "").Trim()
      $currentPath = [System.IO.Path]::GetFullPath($rawPath)
      $currentBranch = ""
      continue
    }

    if ($line -like "branch *") {
      $currentBranch = ($line -replace "^branch\s+", "").Trim()
      continue
    }
  }

  if ($currentPath) {
    $map[$currentPath] = $currentBranch
  }

  return $map
}

function Ensure-CodexWorktrees {
  param(
    [string]$GitRepoRoot,
    [int]$Count
  )

  $result = New-Object System.Collections.Generic.List[object]
  if ($Count -le 0) { return @($result) }

  $worktreesRoot = Join-Path $GitRepoRoot "worktrees"
  New-Item -ItemType Directory -Path $worktreesRoot -Force | Out-Null

  $existing = Get-WorktreeMap -GitRepoRoot $GitRepoRoot
  for ($i = 1; $i -le $Count; $i++) {
    $name = "codex-$i"
    $path = Join-Path $worktreesRoot $name
    $fullPath = [System.IO.Path]::GetFullPath($path)
    $branch = "swarm/$name"

    if ($existing.ContainsKey($fullPath)) {
      Write-Host "OK: existing worktree $name -> $fullPath"
      $result.Add([pscustomobject]@{ Name = $name; Path = $fullPath; Branch = $existing[$fullPath] }) | Out-Null
      continue
    }

    if (Test-Path -LiteralPath $fullPath) {
      throw "Directory exists but is not a registered worktree: $fullPath"
    }

    & git -C $GitRepoRoot show-ref --verify --quiet "refs/heads/$branch"
    $branchExists = ($LASTEXITCODE -eq 0)

    if ($branchExists) {
      Write-Host "Creating worktree from existing branch: $branch -> $fullPath"
      & git -C $GitRepoRoot worktree add $fullPath $branch
    } else {
      Write-Host "Creating worktree branch: $branch -> $fullPath"
      & git -C $GitRepoRoot worktree add -b $branch $fullPath HEAD
    }

    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create worktree: $fullPath"
    }

    $result.Add([pscustomobject]@{ Name = $name; Path = $fullPath; Branch = $branch }) | Out-Null
  }

  return @($result)
}

function Ensure-TaskBoard {
  param([string]$GitRepoRoot)

  $tasksDir = Join-Path $GitRepoRoot "tasks"
  New-Item -ItemType Directory -Path $tasksDir -Force | Out-Null

  $boardPath = Join-Path $tasksDir "swarm_task_board.json"
  $taskBoardScript = Join-Path $GitRepoRoot "scripts\agent_task_board.py"
  $pythonCmd = Get-FirstCommand -Names @("python", "py")

  if ((Test-Path -LiteralPath $taskBoardScript) -and $pythonCmd) {
    $args = @($taskBoardScript, "--board", $boardPath, "init")
    & $pythonCmd.Source @args
    if ($LASTEXITCODE -eq 0) {
      return [pscustomobject]@{
        Kind = "agent_task_board"
        BoardPath = $boardPath
        Python = $pythonCmd.Source
        Script = $taskBoardScript
      }
    }
    Write-Warning "agent_task_board.py init failed; falling back to minimal board file."
  }

  if (-not (Test-Path -LiteralPath $boardPath)) {
    $minimal = @{
      version = 1
      created_at = (Get-Date).ToString("o")
      updated_at = (Get-Date).ToString("o")
      tasks = @()
    } | ConvertTo-Json -Depth 8
    Set-Content -LiteralPath $boardPath -Value ($minimal + "`n") -Encoding UTF8
  }

  return [pscustomobject]@{
    Kind = "minimal"
    BoardPath = $boardPath
    Python = ""
    Script = ""
  }
}

function New-WindowScript {
  param(
    [string]$RuntimeDir,
    [string]$Name,
    [string]$Content
  )

  $safeName = ($Name -replace "[^a-zA-Z0-9\-_]", "_")
  $scriptPath = Join-Path $RuntimeDir "$safeName.ps1"
  Set-Content -LiteralPath $scriptPath -Value $Content -Encoding UTF8
  return $scriptPath
}

function Start-PwshWindow {
  param(
    [string]$Title,
    [string]$ScriptPath,
    [string]$WorkingDirectory
  )

  Start-Process -FilePath "pwsh" `
    -ArgumentList @("-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $ScriptPath) `
    -WorkingDirectory $WorkingDirectory | Out-Null
  Write-Host "Launched window: $Title"
}

Write-Section "Windows Swarm Workflow Bootstrap"

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
if (-not (Test-Path -LiteralPath $RepoRoot)) {
  throw "RepoRoot not found: $RepoRoot"
}

$gitCmd = Get-FirstCommand -Names @("git")
if (-not $gitCmd) {
  throw "git is required but not found in PATH."
}

& git -C $RepoRoot rev-parse --show-toplevel 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "RepoRoot is not a git repository: $RepoRoot"
}

$runtimeRoot = Join-Path $RepoRoot ".swarm"
$runtimeScripts = Join-Path $runtimeRoot "runtime"
New-Item -ItemType Directory -Path $runtimeScripts -Force | Out-Null

Write-Section "CLI Preflight"
$nodeCmd = Get-FirstCommand -Names @("node")
$npmCmd = Get-FirstCommand -Names @("npm")
$codexCmd = Get-FirstCommand -Names @("codex")
$ohMyCmd = Get-FirstCommand -Names @("oh-my-opencode", "ohmyopencode")
$claudeCmd = Get-FirstCommand -Names @("claude")
$geminiCmd = Get-FirstCommand -Names @("gemini")

if (-not $nodeCmd) {
  Write-Warning "Missing required dependency: node"
  Show-InstallSteps -Tool "node"
}
if (-not $npmCmd) {
  Write-Warning "Missing required dependency: npm"
  Show-InstallSteps -Tool "node"
}

if ($npmCmd) {
  $npmPrefix = (& $npmCmd.Source config get prefix 2>$null).Trim()
  if ($npmPrefix) {
    if (Test-PathContainsEntry -Entry $npmPrefix) {
      Write-Host "OK: npm global bin is in PATH: $npmPrefix"
    } else {
      Write-Warning "npm global bin is NOT in PATH: $npmPrefix"
      Write-Host "Add it to PATH (PowerShell):"
      Write-Host "  `$env:Path += ';$npmPrefix'"
      Write-Host "Persist for your user:"
      Write-Host "  [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','User') + ';$npmPrefix', 'User')"
    }
  }
}

if (-not $codexCmd) {
  Write-Warning "codex CLI not found; Codex windows will be skipped."
  Show-InstallSteps -Tool "codex"
  $CodexCount = 0
}

if (-not $ohMyCmd) {
  Write-Warning "Oh My OpenCode CLI not found; planner window will be skipped."
  Show-InstallSteps -Tool "oh-my-opencode"
  $OhMyCount = 0
}

if (-not $claudeCmd) {
  Write-Warning "claude CLI not found; claude-review window will be skipped."
  Show-InstallSteps -Tool "claude"
  $ClaudeCount = 0
}

if (-not $geminiCmd) {
  Write-Warning "gemini CLI not found; gemini-research window will be skipped."
  Show-InstallSteps -Tool "gemini"
  $GeminiCount = 0
}

Write-Section "Workspace Prep"
$codexWorktrees = Ensure-CodexWorktrees -GitRepoRoot $RepoRoot -Count $CodexCount
$taskBoard = Ensure-TaskBoard -GitRepoRoot $RepoRoot

Write-Host "Task board mode: $($taskBoard.Kind)"
Write-Host "Task board path: $($taskBoard.BoardPath)"

$promptDir = Join-Path $RepoRoot "scripts\swarm_prompts"
$plannerPrompt = Join-Path $promptDir ("planner_{0}.txt" -f ($Mode -replace "-", "_"))
if ($Mode -eq "fast") {
  $plannerPrompt = Join-Path $promptDir "planner_fast.txt"
} else {
  $plannerPrompt = Join-Path $promptDir "planner_high_confidence.txt"
}
$reviewerPrompt = Join-Path $promptDir "reviewer.txt"

if (-not (Test-Path -LiteralPath $plannerPrompt)) {
  throw "Planner prompt file missing: $plannerPrompt"
}
if (-not (Test-Path -LiteralPath $reviewerPrompt)) {
  throw "Reviewer prompt file missing: $reviewerPrompt"
}

Write-Section "Launching Terminals"

$escapedRepoRoot = Escape-SingleQuoted -Value $RepoRoot
$escapedBoardPath = Escape-SingleQuoted -Value $taskBoard.BoardPath
$escapedPlannerPrompt = Escape-SingleQuoted -Value $plannerPrompt
$escapedReviewerPrompt = Escape-SingleQuoted -Value $reviewerPrompt
$escapedTaskScript = Escape-SingleQuoted -Value $taskBoard.Script
$escapedPython = Escape-SingleQuoted -Value $taskBoard.Python

if ($OhMyCount -gt 0) {
  for ($i = 1; $i -le $OhMyCount; $i++) {
    $title = if ($OhMyCount -eq 1) { "planner" } else { "planner-$i" }
    $escapedTitle = Escape-SingleQuoted -Value $title
    $escapedOhMy = Escape-SingleQuoted -Value $ohMyCmd.Source

    $plannerBody = @"
`$host.UI.RawUI.WindowTitle = '$escapedTitle'
Set-Location -LiteralPath '$escapedRepoRoot'
`$env:SWARM_REPO_ROOT = '$escapedRepoRoot'
`$env:SWARM_TASK_BOARD = '$escapedBoardPath'
`$promptPath = '$escapedPlannerPrompt'
`$startupPrompt = Get-Content -LiteralPath `$promptPath -Raw
Write-Host "Using planner prompt file: `$promptPath" -ForegroundColor Cyan
`$launched = `$false
if (-not [string]::IsNullOrWhiteSpace(`$startupPrompt)) {
  & '$escapedOhMy' `$startupPrompt
  if (`$LASTEXITCODE -eq 0) {
    `$launched = `$true
  } else {
    Write-Warning "Direct prompt argument failed; retrying with stdin."
  }
}
if (-not `$launched -and -not [string]::IsNullOrWhiteSpace(`$startupPrompt)) {
  `$startupPrompt | & '$escapedOhMy'
  if (`$LASTEXITCODE -eq 0) {
    `$launched = `$true
  } else {
    Write-Warning "Startup prompt via stdin failed; launching interactive session."
  }
}
if (-not `$launched) {
  & '$escapedOhMy'
}
"@
    $plannerScript = New-WindowScript -RuntimeDir $runtimeScripts -Name $title -Content $plannerBody
    Start-PwshWindow -Title $title -ScriptPath $plannerScript -WorkingDirectory $RepoRoot
  }
}

if ($CodexCount -gt 0) {
  foreach ($wt in $codexWorktrees) {
    $title = $wt.Name
    $escapedTitle = Escape-SingleQuoted -Value $title
    $escapedWorktree = Escape-SingleQuoted -Value $wt.Path
    $escapedCodex = Escape-SingleQuoted -Value $codexCmd.Source

    $codexBody = @"
`$host.UI.RawUI.WindowTitle = '$escapedTitle'
Set-Location -LiteralPath '$escapedWorktree'
`$env:SWARM_REPO_ROOT = '$escapedRepoRoot'
`$env:SWARM_TASK_BOARD = '$escapedBoardPath'
`$env:SWARM_AGENT_NAME = '$escapedTitle'
& '$escapedCodex'
"@
    $codexScript = New-WindowScript -RuntimeDir $runtimeScripts -Name $title -Content $codexBody
    Start-PwshWindow -Title $title -ScriptPath $codexScript -WorkingDirectory $wt.Path
  }
}

if ($ClaudeCount -gt 0) {
  for ($i = 1; $i -le $ClaudeCount; $i++) {
    $title = if ($ClaudeCount -eq 1) { "claude-review" } else { "claude-review-$i" }
    $escapedTitle = Escape-SingleQuoted -Value $title
    $escapedClaude = Escape-SingleQuoted -Value $claudeCmd.Source

    $claudeBody = @"
`$host.UI.RawUI.WindowTitle = '$escapedTitle'
Set-Location -LiteralPath '$escapedRepoRoot'
`$env:SWARM_REPO_ROOT = '$escapedRepoRoot'
`$env:SWARM_TASK_BOARD = '$escapedBoardPath'
`$promptPath = '$escapedReviewerPrompt'
`$startupPrompt = Get-Content -LiteralPath `$promptPath -Raw
Write-Host "Reviewer prompt file: `$promptPath" -ForegroundColor Cyan
if (-not [string]::IsNullOrWhiteSpace(`$startupPrompt)) {
  & '$escapedClaude' `$startupPrompt
  if (`$LASTEXITCODE -eq 0) { return }
  Write-Warning "Could not pass startup prompt directly; opening interactive Claude CLI."
}
& '$escapedClaude'
"@
    $claudeScript = New-WindowScript -RuntimeDir $runtimeScripts -Name $title -Content $claudeBody
    Start-PwshWindow -Title $title -ScriptPath $claudeScript -WorkingDirectory $RepoRoot
  }
}

if ($GeminiCount -gt 0) {
  for ($i = 1; $i -le $GeminiCount; $i++) {
    $title = if ($GeminiCount -eq 1) { "gemini-research" } else { "gemini-research-$i" }
    $escapedTitle = Escape-SingleQuoted -Value $title
    $escapedGemini = Escape-SingleQuoted -Value $geminiCmd.Source

    $geminiBody = @"
`$host.UI.RawUI.WindowTitle = '$escapedTitle'
Set-Location -LiteralPath '$escapedRepoRoot'
`$env:SWARM_REPO_ROOT = '$escapedRepoRoot'
`$env:SWARM_TASK_BOARD = '$escapedBoardPath'
`$promptPath = '$escapedReviewerPrompt'
`$startupPrompt = Get-Content -LiteralPath `$promptPath -Raw
Write-Host "Research/review prompt file: `$promptPath" -ForegroundColor Cyan
if (-not [string]::IsNullOrWhiteSpace(`$startupPrompt)) {
  & '$escapedGemini' `$startupPrompt
  if (`$LASTEXITCODE -eq 0) { return }
  Write-Warning "Could not pass startup prompt directly; opening interactive Gemini CLI."
}
& '$escapedGemini'
"@
    $geminiScript = New-WindowScript -RuntimeDir $runtimeScripts -Name $title -Content $geminiBody
    Start-PwshWindow -Title $title -ScriptPath $geminiScript -WorkingDirectory $RepoRoot
  }
}

$statusBody = @"
`$host.UI.RawUI.WindowTitle = 'status'
Set-Location -LiteralPath '$escapedRepoRoot'
`$repoRoot = '$escapedRepoRoot'
`$boardPath = '$escapedBoardPath'
`$taskKind = '$($taskBoard.Kind)'
`$taskScript = '$escapedTaskScript'
`$pythonExe = '$escapedPython'
`$codexCount = $CodexCount

while (`$true) {
  Clear-Host
  Write-Host ("Swarm Status - {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")) -ForegroundColor Cyan
  Write-Host ("Mode: {0}" -f '$Mode')
  Write-Host ""
  Write-Host "Task Board" -ForegroundColor Yellow
  if (`$taskKind -eq 'agent_task_board' -and (Test-Path -LiteralPath `$taskScript)) {
    & `$pythonExe `$taskScript --board `$boardPath list
    if (`$LASTEXITCODE -ne 0) {
      Write-Warning "Task board list command failed."
    }
  } elseif (Test-Path -LiteralPath `$boardPath) {
    Get-Content -LiteralPath `$boardPath -TotalCount 120
  } else {
    Write-Host "No task board available."
  }

  Write-Host ""
  Write-Host "Git Status (repo root)" -ForegroundColor Yellow
  & git -C `$repoRoot status --short --branch

  for (`$i = 1; `$i -le `$codexCount; `$i++) {
    `$wt = Join-Path `$repoRoot "worktrees\codex-`$i"
    Write-Host ""
    Write-Host ("Git Status ({0})" -f `$wt) -ForegroundColor Yellow
    if (Test-Path -LiteralPath `$wt) {
      & git -C `$wt status --short --branch
    } else {
      Write-Host "Missing worktree: `$wt"
    }
  }

  Write-Host ""
  Write-Host "Refresh in 10 seconds. Press Ctrl+C to stop this status window." -ForegroundColor DarkGray
  Start-Sleep -Seconds 10
}
"@
$statusScript = New-WindowScript -RuntimeDir $runtimeScripts -Name "status" -Content $statusBody
Start-PwshWindow -Title "status" -ScriptPath $statusScript -WorkingDirectory $RepoRoot

$stateFile = Join-Path $runtimeRoot "last_launch.json"
$state = [ordered]@{
  launched_at = (Get-Date).ToString("o")
  repo_root = $RepoRoot
  mode = $Mode
  counts = @{
    planner = $OhMyCount
    codex = $CodexCount
    claude = $ClaudeCount
    gemini = $GeminiCount
  }
  task_board = @{
    kind = $taskBoard.Kind
    path = $taskBoard.BoardPath
  }
  prompts = @{
    planner = $plannerPrompt
    reviewer = $reviewerPrompt
  }
} | ConvertTo-Json -Depth 8
Set-Content -LiteralPath $stateFile -Value ($state + "`n") -Encoding UTF8

Write-Section "Done"
Write-Host "Swarm workflow launch complete."
Write-Host "RepoRoot: $RepoRoot"
Write-Host "Mode: $Mode"
Write-Host "Task board: $($taskBoard.BoardPath)"
Write-Host "Runtime scripts: $runtimeScripts"
