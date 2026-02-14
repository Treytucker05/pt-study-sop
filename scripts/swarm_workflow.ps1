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
  [int]$OhMyCount = 1,

  [ValidateSet("windows", "tabs", "splits")]
  [string]$Layout = "windows"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$script:SwarmUseTabs = $false
$script:SwarmUseSplits = $false
$script:SwarmWtExe = ""
$script:SwarmBootstrapLog = "C:\pt-study-sop\logs\agents\swarm_bootstrap.log"
$script:SwarmSplitLaunches = New-Object System.Collections.Generic.List[object]

function Write-Section {
  param([string]$Message)
  Write-Host ""
  Write-Host ("=" * 72)
  Write-Host $Message -ForegroundColor Cyan
  Write-Host ("=" * 72)
}

function Quote-CommandPart {
  param([string]$Value)
  if ($null -eq $Value) { return "''" }
  return "'" + $Value.Replace("'", "''") + "'"
}

function Write-BootstrapLog {
  param([string]$Message)

  if ([string]::IsNullOrWhiteSpace($script:SwarmBootstrapLog)) { return }

  $logDir = Split-Path -Parent $script:SwarmBootstrapLog
  if (-not [string]::IsNullOrWhiteSpace($logDir) -and -not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  }

  $line = "{0} {1}" -f (Get-Date).ToString("o"), $Message
  Add-Content -LiteralPath $script:SwarmBootstrapLog -Value $line -Encoding UTF8
}

function Format-StartProcessCommandLine {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  $parts = @(
    "Start-Process",
    "-FilePath",
    (Quote-CommandPart -Value $FilePath)
  )

  if ($Arguments -and $Arguments.Count -gt 0) {
    $argText = ($Arguments | ForEach-Object { Quote-CommandPart -Value ([string]$_) }) -join ", "
    $parts += "-ArgumentList"
    $parts += "@($argText)"
  }

  if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
    $parts += "-WorkingDirectory"
    $parts += (Quote-CommandPart -Value $WorkingDirectory)
  }

  return ($parts -join " ")
}

function Log-StartProcessCommand {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  $startProcessLine = Format-StartProcessCommandLine -FilePath $FilePath -Arguments $Arguments -WorkingDirectory $WorkingDirectory
  Write-BootstrapLog -Message $startProcessLine

  if (-not [string]::IsNullOrWhiteSpace($FilePath) -and [System.IO.Path]::GetFileName($FilePath).StartsWith("wt", [System.StringComparison]::OrdinalIgnoreCase)) {
    $wtLine = "{0} {1}" -f (Quote-CommandPart -Value $FilePath), (($Arguments | ForEach-Object { Quote-CommandPart -Value ([string]$_) }) -join " ")
    Write-BootstrapLog -Message ("wt command line: {0}" -f $wtLine)
  }
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

  return $result.ToArray()
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
    & $pythonCmd.Source @args | Out-Null
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

function New-PwshKeepOpenCommand {
  param([string]$ScriptPath)

  $escapedScriptPath = Escape-SingleQuoted -Value ([string]$ScriptPath)
  $lines = @(
    "& {"
    "  `$ErrorActionPreference = 'Stop'"
    "  try {"
    "    & '$escapedScriptPath'"
    "  } catch {"
    "    Write-Host (`$_ | Out-String) -ForegroundColor Red"
    "    Read-Host 'Press Enter to keep this tab open' | Out-Null"
    "  }"
    "}"
  )

  return ($lines -join "`n")
}

function New-PwshTabCommandArgs {
  param([string]$ScriptPath)

  $psCommand = New-PwshKeepOpenCommand -ScriptPath ([string]$ScriptPath)
  return @(
    "pwsh",
    "-NoExit",
    "-Command",
    $psCommand
  ) | ForEach-Object { [string]$_ }
}

function New-PwshWindowCommandArgs {
  param([string]$ScriptPath)

  $psCommand = New-PwshKeepOpenCommand -ScriptPath ([string]$ScriptPath)
  return @(
    "-NoExit",
    "-Command",
    $psCommand
  ) | ForEach-Object { [string]$_ }
}

function Invoke-SplitPaneSwarmLaunch {
  if (-not $script:SwarmUseSplits) { return }
  if ($script:SwarmSplitLaunches.Count -le 0) { return }
  if ([string]::IsNullOrWhiteSpace($script:SwarmWtExe)) {
    throw "Layout 'splits' requires wt.exe, but it was not resolved."
  }

  $queuedPanes = @($script:SwarmSplitLaunches.ToArray())
  $statusPane = @($queuedPanes | Where-Object { [string]$_.Title -eq "status" }) | Select-Object -First 1
  if ($null -eq $statusPane) {
    throw "Split layout requires a status pane, but none was queued."
  }

  $workerPanes = @($queuedPanes | Where-Object { [string]$_.Title -ne "status" })
  if ($workerPanes.Count -le 0) {
    $statusOnlyArgs = @(
      "-w",
      "0",
      "new-tab",
      "--title",
      "Swarm",
      "-d",
      [string]$statusPane.WorkingDirectory
    ) + (New-PwshTabCommandArgs -ScriptPath ([string]$statusPane.ScriptPath))
    $statusOnlyArgs = $statusOnlyArgs | ForEach-Object { [string]$_ }
    Log-StartProcessCommand -FilePath $script:SwarmWtExe -Arguments $statusOnlyArgs -WorkingDirectory ""
    Start-Process -FilePath $script:SwarmWtExe -ArgumentList $statusOnlyArgs | Out-Null
    Write-Host "Launched split swarm: tab 'Swarm' with status-only pane."
    Write-BootstrapLog -Message "Split layout launched with status-only pane."
    return
  }

  $plannerPane = $null
  foreach ($pane in $workerPanes) {
    $paneTitle = [string]$pane.Title
    if ($paneTitle.Equals("planner", [System.StringComparison]::OrdinalIgnoreCase) -or $paneTitle.StartsWith("planner-", [System.StringComparison]::OrdinalIgnoreCase)) {
      $plannerPane = $pane
      break
    }
  }
  if ($null -eq $plannerPane) {
    $plannerPane = $workerPanes[0]
  }

  $orderedWorkers = New-Object System.Collections.Generic.List[object]
  $seenWorkers = @{}

  function Add-OrderedWorkerPane {
    param([object]$Pane)

    if ($null -eq $Pane) { return }
    $paneKey = "{0}|{1}" -f [string]$Pane.Title, [string]$Pane.ScriptPath
    if ($seenWorkers.ContainsKey($paneKey)) { return }
    $orderedWorkers.Add($Pane) | Out-Null
    $seenWorkers[$paneKey] = $true
  }

  $codexPanes = @($workerPanes | Where-Object { ([string]$_.Title).StartsWith("codex-", [System.StringComparison]::OrdinalIgnoreCase) })
  $claudePanes = @($workerPanes | Where-Object { ([string]$_.Title).StartsWith("claude-review", [System.StringComparison]::OrdinalIgnoreCase) })
  $geminiPanes = @($workerPanes | Where-Object { ([string]$_.Title).StartsWith("gemini-research", [System.StringComparison]::OrdinalIgnoreCase) })

  Add-OrderedWorkerPane -Pane $plannerPane
  foreach ($pane in $codexPanes) { Add-OrderedWorkerPane -Pane $pane }
  foreach ($pane in $claudePanes) { Add-OrderedWorkerPane -Pane $pane }
  foreach ($pane in $geminiPanes) { Add-OrderedWorkerPane -Pane $pane }
  foreach ($pane in $workerPanes) { Add-OrderedWorkerPane -Pane $pane }

  $leftTopPane = $orderedWorkers[0]
  $wtArgs = @(
    "-w",
    "0",
    "new-tab",
    "--title",
    "Swarm",
    "-d",
    [string]$leftTopPane.WorkingDirectory
  ) + (New-PwshTabCommandArgs -ScriptPath ([string]$leftTopPane.ScriptPath))

  # Create right status column.
  $wtArgs += ";"
  $wtArgs += @(
    "split-pane",
    "-H",
    "-d",
    [string]$statusPane.WorkingDirectory
  )
  $wtArgs += (New-PwshTabCommandArgs -ScriptPath ([string]$statusPane.ScriptPath))

  # Move focus back to left column before stacking workers.
  $wtArgs += ";"
  $wtArgs += @(
    "focus-pane",
    "-L"
  )

  for ($i = 1; $i -lt $orderedWorkers.Count; $i++) {
    $pane = $orderedWorkers[$i]
    $wtArgs += ";"
    $wtArgs += @(
      "split-pane",
      "-V",
      "-d",
      [string]$pane.WorkingDirectory
    )
    $wtArgs += (New-PwshTabCommandArgs -ScriptPath ([string]$pane.ScriptPath))
  }

  $wtArgs = $wtArgs | ForEach-Object { [string]$_ }
  Log-StartProcessCommand -FilePath $script:SwarmWtExe -Arguments $wtArgs -WorkingDirectory ""
  Start-Process -FilePath $script:SwarmWtExe -ArgumentList $wtArgs | Out-Null
  Write-Host ("Launched split swarm: tab 'Swarm' with {0} panes." -f ($orderedWorkers.Count + 1))
  Write-BootstrapLog -Message ("Split layout launched with {0} panes in one tab (left workers, right status)." -f ($orderedWorkers.Count + 1))
}

function Start-PwshWindow {
  param(
    [string]$Title,
    [string]$ScriptPath,
    [string]$WorkingDirectory
  )

  $titleText = [string]$Title
  $scriptPathText = [string]$ScriptPath
  $workingDirectoryText = [string]$WorkingDirectory

  if ($script:SwarmUseSplits) {
    $script:SwarmSplitLaunches.Add([pscustomobject]@{
      Title = $titleText
      ScriptPath = $scriptPathText
      WorkingDirectory = $workingDirectoryText
    }) | Out-Null
    Write-Host "Queued pane: $Title"
    return
  }

  if ($script:SwarmUseTabs -and -not [string]::IsNullOrWhiteSpace($script:SwarmWtExe)) {
    $wtArgs = @(
      "-w",
      "0",
      "new-tab",
      "--title",
      $titleText,
      "-d",
      $workingDirectoryText
    ) + (New-PwshTabCommandArgs -ScriptPath $scriptPathText)
    $wtArgs = $wtArgs | ForEach-Object { [string]$_ }
    Log-StartProcessCommand -FilePath $script:SwarmWtExe -Arguments $wtArgs -WorkingDirectory ""
    Start-Process -FilePath $script:SwarmWtExe -ArgumentList $wtArgs | Out-Null
  }
  else {
    $pwshWindowArgs = New-PwshWindowCommandArgs -ScriptPath $scriptPathText
    Log-StartProcessCommand -FilePath "pwsh" -Arguments $pwshWindowArgs -WorkingDirectory $workingDirectoryText
    Start-Process -FilePath "pwsh" -ArgumentList $pwshWindowArgs -WorkingDirectory $workingDirectoryText | Out-Null
  }

  Write-Host "Launched window: $Title"
}

try {
  Write-Section "Windows Swarm Workflow Bootstrap"

  $RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
  if (-not (Test-Path -LiteralPath $RepoRoot)) {
    throw "RepoRoot not found: $RepoRoot"
  }

  Write-BootstrapLog -Message ("=" * 72)
  Write-BootstrapLog -Message ("Swarm bootstrap start RepoRoot={0} Mode={1} Layout={2}" -f $RepoRoot, $Mode, $Layout)

  $gitCmd = Get-FirstCommand -Names @("git")
  if (-not $gitCmd) {
    throw "git is required but not found in PATH."
  }

  & git -C $RepoRoot rev-parse --show-toplevel 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "RepoRoot is not a git repository: $RepoRoot"
  }

  $wtCmd = $null
  if ($Layout -in @("tabs", "splits")) {
    $wtCmd = Get-FirstCommand -Names @("wt.exe", "wt")
    if (-not $wtCmd) {
      Write-Warning ("Layout '{0}' requested but wt.exe was not found; falling back to separate windows." -f $Layout)
    }
  }

  $script:SwarmUseTabs = ($Layout -eq "tabs") -and ($null -ne $wtCmd)
  $script:SwarmUseSplits = ($Layout -eq "splits") -and ($null -ne $wtCmd)
  if ($script:SwarmUseTabs -or $script:SwarmUseSplits) {
    $script:SwarmWtExe = [string]$wtCmd.Source
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
  Write-Warning "codex CLI not found; requested Codex windows will open and show an error."
  Show-InstallSteps -Tool "codex"
}

if (-not $ohMyCmd) {
  Write-Warning "Oh My OpenCode CLI not found; requested planner windows will open and show an error."
  Show-InstallSteps -Tool "oh-my-opencode"
}

if (-not $claudeCmd) {
  Write-Warning "claude CLI not found; requested claude-review windows will open and show an error."
  Show-InstallSteps -Tool "claude"
}

if (-not $geminiCmd) {
  Write-Warning "gemini CLI not found; requested gemini-research windows will open and show an error."
  Show-InstallSteps -Tool "gemini"
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
$ohMyExe = if ($ohMyCmd) { [string]$ohMyCmd.Source } else { "" }
$ohMyLauncherBat = "C:\Users\treyt\OneDrive\Desktop\Travel Laptop\OHMYOpenCode.bat"
$escapedOhMyLauncherBat = Escape-SingleQuoted -Value $ohMyLauncherBat
$codexExe = if ($codexCmd) { [string]$codexCmd.Source } else { "" }
$claudeExe = if ($claudeCmd) { [string]$claudeCmd.Source } else { "" }
$geminiExe = if ($geminiCmd) { [string]$geminiCmd.Source } else { "" }

if ($OhMyCount -gt 0) {
  for ($i = 1; $i -le $OhMyCount; $i++) {
    $title = if ($OhMyCount -eq 1) { "planner" } else { "planner-$i" }
    $escapedTitle = Escape-SingleQuoted -Value $title

    $plannerBody = @"
`$ErrorActionPreference = 'Stop'
`$host.UI.RawUI.WindowTitle = '$escapedTitle'
Set-Location -LiteralPath '$escapedRepoRoot'
`$env:SWARM_REPO_ROOT = '$escapedRepoRoot'
`$env:SWARM_TASK_BOARD = '$escapedBoardPath'
`$launcherBat = '$escapedOhMyLauncherBat'
`$plannerTarget = '$escapedRepoRoot'
if (-not (Test-Path -LiteralPath `$launcherBat)) {
  throw "OHMYOpenCode launcher not found: `$launcherBat"
}
Write-Host "Launching OhMyOpenCode via launcher: `$launcherBat (target=`$plannerTarget, /nopause)" -ForegroundColor Cyan
`$launcherCmd = '""' + `$launcherBat + '" /nopause "' + `$plannerTarget + '""'
& cmd /k `$launcherCmd
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
    $escapedCodex = Escape-SingleQuoted -Value $codexExe

    $codexBody = @"
`$ErrorActionPreference = 'Stop'
`$host.UI.RawUI.WindowTitle = '$escapedTitle'
Set-Location -LiteralPath '$escapedWorktree'
`$env:SWARM_REPO_ROOT = '$escapedRepoRoot'
`$env:SWARM_TASK_BOARD = '$escapedBoardPath'
`$env:SWARM_AGENT_NAME = '$escapedTitle'
`$agentExe = '$escapedCodex'
`$resolved = if ([string]::IsNullOrWhiteSpace(`$agentExe)) { `$null } else { Get-Command -Name `$agentExe -ErrorAction SilentlyContinue }
if (-not `$resolved) {
  throw "Codex executable not found: `$agentExe"
}
`$agentExe = [string]`$resolved.Source
& `$agentExe
"@
    $codexScript = New-WindowScript -RuntimeDir $runtimeScripts -Name $title -Content $codexBody
    Start-PwshWindow -Title $title -ScriptPath $codexScript -WorkingDirectory $wt.Path
  }
}

if ($ClaudeCount -gt 0) {
  for ($i = 1; $i -le $ClaudeCount; $i++) {
    $title = if ($ClaudeCount -eq 1) { "claude-review" } else { "claude-review-$i" }
    $escapedTitle = Escape-SingleQuoted -Value $title
    $escapedClaude = Escape-SingleQuoted -Value $claudeExe

    $claudeBody = @"
`$ErrorActionPreference = 'Stop'
`$host.UI.RawUI.WindowTitle = '$escapedTitle'
Set-Location -LiteralPath '$escapedRepoRoot'
`$env:SWARM_REPO_ROOT = '$escapedRepoRoot'
`$env:SWARM_TASK_BOARD = '$escapedBoardPath'
`$agentExe = '$escapedClaude'
`$resolved = if ([string]::IsNullOrWhiteSpace(`$agentExe)) { `$null } else { Get-Command -Name `$agentExe -ErrorAction SilentlyContinue }
if (-not `$resolved) {
  throw "Claude executable not found: `$agentExe"
}
`$agentExe = [string]`$resolved.Source
`$promptPath = '$escapedReviewerPrompt'
`$startupPrompt = Get-Content -LiteralPath `$promptPath -Raw
Write-Host "Reviewer prompt file: `$promptPath" -ForegroundColor Cyan
if (-not [string]::IsNullOrWhiteSpace(`$startupPrompt)) {
  & `$agentExe `$startupPrompt
  if (`$LASTEXITCODE -eq 0) { return }
  Write-Warning "Could not pass startup prompt directly; opening interactive Claude CLI."
}
& `$agentExe
"@
    $claudeScript = New-WindowScript -RuntimeDir $runtimeScripts -Name $title -Content $claudeBody
    Start-PwshWindow -Title $title -ScriptPath $claudeScript -WorkingDirectory $RepoRoot
  }
}

if ($GeminiCount -gt 0) {
  for ($i = 1; $i -le $GeminiCount; $i++) {
    $title = if ($GeminiCount -eq 1) { "gemini-research" } else { "gemini-research-$i" }
    $escapedTitle = Escape-SingleQuoted -Value $title
    $escapedGemini = Escape-SingleQuoted -Value $geminiExe

    $geminiBody = @"
`$ErrorActionPreference = 'Stop'
`$host.UI.RawUI.WindowTitle = '$escapedTitle'
Set-Location -LiteralPath '$escapedRepoRoot'
`$env:SWARM_REPO_ROOT = '$escapedRepoRoot'
`$env:SWARM_TASK_BOARD = '$escapedBoardPath'
`$agentExe = '$escapedGemini'
`$resolved = if ([string]::IsNullOrWhiteSpace(`$agentExe)) { `$null } else { Get-Command -Name `$agentExe -ErrorAction SilentlyContinue }
if (-not `$resolved) {
  throw "Gemini executable not found: `$agentExe"
}
`$agentExe = [string]`$resolved.Source
`$promptPath = '$escapedReviewerPrompt'
`$startupPrompt = Get-Content -LiteralPath `$promptPath -Raw
Write-Host "Research/review prompt file: `$promptPath" -ForegroundColor Cyan
if (-not [string]::IsNullOrWhiteSpace(`$startupPrompt)) {
  & `$agentExe `$startupPrompt
  if (`$LASTEXITCODE -eq 0) { return }
  Write-Warning "Could not pass startup prompt directly; opening interactive Gemini CLI."
}
& `$agentExe
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
Invoke-SplitPaneSwarmLaunch

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
Write-BootstrapLog -Message "Swarm bootstrap completed successfully."
}
catch {
  $fatal = $_
  $fatalMessage = if ($fatal.Exception) { $fatal.Exception.Message } else { [string]$fatal }
  Write-Host ""
  Write-Host ("FATAL: {0}" -f $fatalMessage) -ForegroundColor Red
  Write-BootstrapLog -Message ("FATAL: {0}" -f $fatal)
  Read-Host "Press Enter to keep this window open" | Out-Null
}
