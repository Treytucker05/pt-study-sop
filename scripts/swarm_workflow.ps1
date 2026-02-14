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
  [string]$Layout = "windows",

  [switch]$NoPause
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

function Format-ArgumentListForLog {
  param([string[]]$Arguments)

  if (-not $Arguments -or $Arguments.Count -le 0) { return "" }
  return ($Arguments | ForEach-Object { Quote-CommandPart -Value ([string]$_) }) -join " "
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
    "opencode" {
      Write-Host "Install OpenCode CLI:"
      Write-Host "  npm install -g opencode-ai"
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
  if ($queuedPanes.Count -le 0) {
    throw "Split layout requested, but no panes were queued."
  }

  $orderedPanes = New-Object System.Collections.Generic.List[object]
  $seenPanes = @{}

  function Add-OrderedPane {
    param([object]$Pane)

    if ($null -eq $Pane) { return }
    $paneKey = "{0}|{1}" -f [string]$Pane.Title, [string]$Pane.ScriptPath
    if ($seenPanes.ContainsKey($paneKey)) { return }
    $orderedPanes.Add($Pane) | Out-Null
    $seenPanes[$paneKey] = $true
  }

  $plannerPanes = @($queuedPanes | Where-Object { $title = [string]$_.Title; $title.Equals("planner", [System.StringComparison]::OrdinalIgnoreCase) -or $title.StartsWith("planner-", [System.StringComparison]::OrdinalIgnoreCase) })
  $codexPanes = @($queuedPanes | Where-Object { ([string]$_.Title).StartsWith("codex-", [System.StringComparison]::OrdinalIgnoreCase) })
  $claudePanes = @($queuedPanes | Where-Object { ([string]$_.Title).StartsWith("claude-review", [System.StringComparison]::OrdinalIgnoreCase) })
  $geminiPanes = @($queuedPanes | Where-Object { ([string]$_.Title).StartsWith("gemini-research", [System.StringComparison]::OrdinalIgnoreCase) })
  $statusPanes = @($queuedPanes | Where-Object { ([string]$_.Title).Equals("status", [System.StringComparison]::OrdinalIgnoreCase) })

  foreach ($pane in $plannerPanes) { Add-OrderedPane -Pane $pane }
  foreach ($pane in $codexPanes) { Add-OrderedPane -Pane $pane }
  foreach ($pane in $claudePanes) { Add-OrderedPane -Pane $pane }
  foreach ($pane in $geminiPanes) { Add-OrderedPane -Pane $pane }
  foreach ($pane in $statusPanes) { Add-OrderedPane -Pane $pane }
  foreach ($pane in $queuedPanes) { Add-OrderedPane -Pane $pane }

  foreach ($pane in $orderedPanes) {
    $paneArgs = New-PwshTabCommandArgs -ScriptPath ([string]$pane.ScriptPath)
    Write-BootstrapLog -Message ("Pane launch [{0}] {1}" -f [string]$pane.Title, (Format-ArgumentListForLog -Arguments $paneArgs))
  }

  $plannerOrdered = @($orderedPanes | Where-Object { $title = [string]$_.Title; $title.Equals("planner", [System.StringComparison]::OrdinalIgnoreCase) -or $title.StartsWith("planner-", [System.StringComparison]::OrdinalIgnoreCase) } | Sort-Object { [string]$_.Title })
  $claudeOrdered = @($orderedPanes | Where-Object { ([string]$_.Title).StartsWith("claude-review", [System.StringComparison]::OrdinalIgnoreCase) } | Sort-Object { [string]$_.Title })
  $geminiOrdered = @($orderedPanes | Where-Object { ([string]$_.Title).StartsWith("gemini-research", [System.StringComparison]::OrdinalIgnoreCase) } | Sort-Object { [string]$_.Title })
  $statusOrdered = @($orderedPanes | Where-Object { ([string]$_.Title).Equals("status", [System.StringComparison]::OrdinalIgnoreCase) } | Sort-Object { [string]$_.Title })
  $codexOrdered = @($orderedPanes | Where-Object { ([string]$_.Title).StartsWith("codex-", [System.StringComparison]::OrdinalIgnoreCase) } | Sort-Object { [string]$_.Title })

  $topPanes = New-Object System.Collections.Generic.List[object]
  $bottomPanes = New-Object System.Collections.Generic.List[object]
  $layoutUsed = @{}

  function Add-LayoutPane {
    param(
      [System.Collections.Generic.List[object]]$Target,
      [object]$Pane
    )

    if ($null -eq $Pane) { return }
    $paneKey = "{0}|{1}" -f [string]$Pane.Title, [string]$Pane.ScriptPath
    if ($layoutUsed.ContainsKey($paneKey)) { return }
    $Target.Add($Pane) | Out-Null
    $layoutUsed[$paneKey] = $true
  }

  foreach ($pane in $plannerOrdered) {
    if ($topPanes.Count -ge 3) { break }
    Add-LayoutPane -Target $topPanes -Pane $pane
  }
  foreach ($pane in $codexOrdered) {
    if ($topPanes.Count -ge 3) { break }
    Add-LayoutPane -Target $topPanes -Pane $pane
  }
  foreach ($pane in $orderedPanes) {
    if ($topPanes.Count -ge 3) { break }
    Add-LayoutPane -Target $topPanes -Pane $pane
  }

  foreach ($pane in $claudeOrdered) {
    if ($bottomPanes.Count -ge 3) { break }
    Add-LayoutPane -Target $bottomPanes -Pane $pane
  }
  foreach ($pane in $geminiOrdered) {
    if ($bottomPanes.Count -ge 3) { break }
    Add-LayoutPane -Target $bottomPanes -Pane $pane
  }
  foreach ($pane in $statusOrdered) {
    if ($bottomPanes.Count -ge 3) { break }
    Add-LayoutPane -Target $bottomPanes -Pane $pane
  }
  foreach ($pane in $orderedPanes) {
    if ($bottomPanes.Count -ge 3) { break }
    Add-LayoutPane -Target $bottomPanes -Pane $pane
  }

  $topRowCount = $topPanes.Count
  $bottomRowCount = $bottomPanes.Count

  if ($topRowCount -le 0) {
    throw "Split layout requires at least one top-row pane."
  }

  function Get-HorizontalRowCommands {
    param([object[]]$RowPanes)

    $rowCommands = @()
    $count = $RowPanes.Count
    if ($count -ge 3) {
      $rightArgs = New-PwshTabCommandArgs -ScriptPath ([string]$RowPanes[2].ScriptPath)
      $rowCommands += ";"
      $rowCommands += @(
        "split-pane",
        "-H",
        "-s",
        "0.333",
        "-d",
        [string]$RowPanes[2].WorkingDirectory
      )
      $rowCommands += $rightArgs
      $rowCommands += ";"
      $rowCommands += @("move-focus", "left")

      $middleArgs = New-PwshTabCommandArgs -ScriptPath ([string]$RowPanes[1].ScriptPath)
      $rowCommands += ";"
      $rowCommands += @(
        "split-pane",
        "-H",
        "-s",
        "0.5",
        "-d",
        [string]$RowPanes[1].WorkingDirectory
      )
      $rowCommands += $middleArgs
      $rowCommands += ";"
      $rowCommands += @("move-focus", "left")
      return $rowCommands
    }

    if ($count -eq 2) {
      $rightArgs = New-PwshTabCommandArgs -ScriptPath ([string]$RowPanes[1].ScriptPath)
      $rowCommands += ";"
      $rowCommands += @(
        "split-pane",
        "-H",
        "-s",
        "0.5",
        "-d",
        [string]$RowPanes[1].WorkingDirectory
      )
      $rowCommands += $rightArgs
      $rowCommands += ";"
      $rowCommands += @("move-focus", "left")
    }

    return $rowCommands
  }

  $topRowPanes = @($topPanes.ToArray())
  $bottomRowPanes = @($bottomPanes.ToArray())

  $firstPane = $topRowPanes[0]
  $firstPaneArgs = New-PwshTabCommandArgs -ScriptPath ([string]$firstPane.ScriptPath)
  $wtArgs = @(
    "-w",
    "new",
    "new-tab",
    "--title",
    "Swarm",
    "-d",
    [string]$firstPane.WorkingDirectory
  ) + $firstPaneArgs

  if ($topRowCount -eq 3 -and $bottomRowCount -eq 3) {
    $topRightArgs = New-PwshTabCommandArgs -ScriptPath ([string]$topRowPanes[2].ScriptPath)
    $wtArgs += ";"
    $wtArgs += @(
      "split-pane",
      "-H",
      "-s",
      "0.333",
      "-d",
      [string]$topRowPanes[2].WorkingDirectory
    )
    $wtArgs += $topRightArgs
    $wtArgs += ";"
    $wtArgs += @("move-focus", "left")

    $topMiddleArgs = New-PwshTabCommandArgs -ScriptPath ([string]$topRowPanes[1].ScriptPath)
    $wtArgs += ";"
    $wtArgs += @(
      "split-pane",
      "-H",
      "-s",
      "0.5",
      "-d",
      [string]$topRowPanes[1].WorkingDirectory
    )
    $wtArgs += $topMiddleArgs
    $wtArgs += ";"
    $wtArgs += @("move-focus", "left")

    $bottomLeftArgs = New-PwshTabCommandArgs -ScriptPath ([string]$bottomRowPanes[0].ScriptPath)
    $wtArgs += ";"
    $wtArgs += @(
      "split-pane",
      "-V",
      "-s",
      "0.5",
      "-d",
      [string]$bottomRowPanes[0].WorkingDirectory
    )
    $wtArgs += $bottomLeftArgs
    $wtArgs += ";"
    $wtArgs += @("move-focus", "up")
    $wtArgs += ";"
    $wtArgs += @("move-focus", "right")

    $bottomMiddleArgs = New-PwshTabCommandArgs -ScriptPath ([string]$bottomRowPanes[1].ScriptPath)
    $wtArgs += ";"
    $wtArgs += @(
      "split-pane",
      "-V",
      "-s",
      "0.5",
      "-d",
      [string]$bottomRowPanes[1].WorkingDirectory
    )
    $wtArgs += $bottomMiddleArgs
    $wtArgs += ";"
    $wtArgs += @("move-focus", "up")
    $wtArgs += ";"
    $wtArgs += @("move-focus", "right")

    $bottomRightArgs = New-PwshTabCommandArgs -ScriptPath ([string]$bottomRowPanes[2].ScriptPath)
    $wtArgs += ";"
    $wtArgs += @(
      "split-pane",
      "-V",
      "-s",
      "0.5",
      "-d",
      [string]$bottomRowPanes[2].WorkingDirectory
    )
    $wtArgs += $bottomRightArgs
    $wtArgs += ";"
    $wtArgs += @("move-focus", "up")
    $wtArgs += ";"
    $wtArgs += @("move-focus", "left")
    $wtArgs += ";"
    $wtArgs += @("move-focus", "left")
  }
  else {
    if ($bottomRowCount -gt 0) {
      $bottomFirstArgs = New-PwshTabCommandArgs -ScriptPath ([string]$bottomRowPanes[0].ScriptPath)
      $wtArgs += ";"
      $wtArgs += @(
        "split-pane",
        "-V",
        "-s",
        "0.5",
        "-d",
        [string]$bottomRowPanes[0].WorkingDirectory
      )
      $wtArgs += $bottomFirstArgs
      $wtArgs += ";"
      $wtArgs += @("move-focus", "up")
    }

    $wtArgs += Get-HorizontalRowCommands -RowPanes $topRowPanes

    if ($bottomRowCount -gt 0) {
      $wtArgs += ";"
      $wtArgs += @("move-focus", "down")
      $wtArgs += Get-HorizontalRowCommands -RowPanes $bottomRowPanes
    }
  }

  $wtArgs = $wtArgs | ForEach-Object { [string]$_ }
  Log-StartProcessCommand -FilePath $script:SwarmWtExe -Arguments $wtArgs -WorkingDirectory ""
  Start-Process -FilePath $script:SwarmWtExe -ArgumentList $wtArgs | Out-Null
  Write-Host ("Launched split swarm: tab 'Swarm' with {0} panes ({1} top / {2} bottom)." -f $orderedPanes.Count, $topRowCount, $bottomRowCount)
  Write-BootstrapLog -Message ("Split layout launched with {0} panes in one tab ({1} top / {2} bottom)." -f $orderedPanes.Count, $topRowCount, $bottomRowCount)
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
    $splitPaneArgs = New-PwshTabCommandArgs -ScriptPath $scriptPathText
    Write-BootstrapLog -Message ("Pane queued [{0}] {1}" -f $titleText, (Format-ArgumentListForLog -Arguments $splitPaneArgs))
    $script:SwarmSplitLaunches.Add([pscustomobject]@{
      Title = $titleText
      ScriptPath = $scriptPathText
      WorkingDirectory = $workingDirectoryText
    }) | Out-Null
    Write-Host "Queued pane: $Title"
    return
  }

  if ($script:SwarmUseTabs -and -not [string]::IsNullOrWhiteSpace($script:SwarmWtExe)) {
    $tabPaneArgs = New-PwshTabCommandArgs -ScriptPath $scriptPathText
    Write-BootstrapLog -Message ("Pane launch [{0}] {1}" -f $titleText, (Format-ArgumentListForLog -Arguments $tabPaneArgs))
    $wtArgs = @(
      "-w",
      "new",
      "new-tab",
      "--title",
      $titleText,
      "-d",
      $workingDirectoryText
    ) + $tabPaneArgs
    $wtArgs = $wtArgs | ForEach-Object { [string]$_ }
    Log-StartProcessCommand -FilePath $script:SwarmWtExe -Arguments $wtArgs -WorkingDirectory ""
    Start-Process -FilePath $script:SwarmWtExe -ArgumentList $wtArgs | Out-Null
  }
  else {
    $pwshWindowArgs = New-PwshWindowCommandArgs -ScriptPath $scriptPathText
    Write-BootstrapLog -Message ("Pane launch [{0}] pwsh {1}" -f $titleText, (Format-ArgumentListForLog -Arguments $pwshWindowArgs))
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
  $opencodeCmd = Get-FirstCommand -Names @("opencode")
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

if (-not $opencodeCmd) {
  Write-Warning "OpenCode CLI not found; requested planner windows will open and show an error."
  Show-InstallSteps -Tool "opencode"
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
$statusOncePath = "C:\pt-study-sop\scripts\status_once.ps1"
$escapedStatusOncePath = Escape-SingleQuoted -Value $statusOncePath
$statusWorktreesRoot = Join-Path $RepoRoot "worktrees"
$escapedStatusWorktreesRoot = Escape-SingleQuoted -Value $statusWorktreesRoot
$opencodeExe = if ($opencodeCmd) { [string]$opencodeCmd.Source } else { "" }
$codexExe = if ($codexCmd) { [string]$codexCmd.Source } else { "" }
$claudeExe = if ($claudeCmd) { [string]$claudeCmd.Source } else { "" }
$geminiExe = if ($geminiCmd) { [string]$geminiCmd.Source } else { "" }

if ($OhMyCount -gt 0) {
  for ($i = 1; $i -le $OhMyCount; $i++) {
    $title = if ($OhMyCount -eq 1) { "planner" } else { "planner-$i" }
    $escapedTitle = Escape-SingleQuoted -Value $title
    $escapedOpenCode = Escape-SingleQuoted -Value $opencodeExe

    $plannerBody = @"
`$ErrorActionPreference = 'Stop'
`$host.UI.RawUI.WindowTitle = '$escapedTitle'
Set-Location -LiteralPath '$escapedRepoRoot'
`$env:SWARM_REPO_ROOT = '$escapedRepoRoot'
`$env:SWARM_TASK_BOARD = '$escapedBoardPath'
`$agentExe = '$escapedOpenCode'
`$plannerTarget = '$escapedRepoRoot'
`$resolved = if ([string]::IsNullOrWhiteSpace(`$agentExe)) { `$null } else { Get-Command -Name `$agentExe -ErrorAction SilentlyContinue }
if (-not `$resolved) {
  throw "OpenCode executable not found: `$agentExe"
}
`$agentExe = [string]`$resolved.Source
Write-Host "Launching OpenCode: `$agentExe `$plannerTarget" -ForegroundColor Cyan
& `$agentExe `$plannerTarget
if (`$LASTEXITCODE -ne `$null -and `$LASTEXITCODE -ne 0) {
  throw ("OpenCode exited with code {0}." -f `$LASTEXITCODE)
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
`$statusScriptPath = '$escapedStatusOncePath'
`$statusRepoRoot = '$escapedRepoRoot'
`$statusWorktreesRoot = '$escapedStatusWorktreesRoot'
`$statusBoardPath = '$escapedBoardPath'

while (`$true) {
  Clear-Host
  if (-not (Test-Path -LiteralPath `$statusScriptPath)) {
    Write-Host ("Missing status dashboard script: {0}" -f `$statusScriptPath) -ForegroundColor Red
  } else {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File `$statusScriptPath -RepoRoot `$statusRepoRoot -WorktreesRoot `$statusWorktreesRoot -BoardPath `$statusBoardPath
    if (`$LASTEXITCODE -ne 0) {
      Write-Warning ("status_once.ps1 exited with code {0}." -f `$LASTEXITCODE)
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
if ($NoPause) {
  exit 0
}
}
catch {
  $fatal = $_
  $fatalMessage = if ($fatal.Exception) { $fatal.Exception.Message } else { [string]$fatal }
  Write-Host ""
  Write-Host ("FATAL: {0}" -f $fatalMessage) -ForegroundColor Red
  Write-BootstrapLog -Message ("FATAL: {0}" -f $fatal)
  if (-not $NoPause) {
    Read-Host "Press Enter to keep this window open" | Out-Null
  }
  exit 1
}
