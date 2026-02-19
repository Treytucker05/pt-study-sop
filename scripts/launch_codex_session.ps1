param(
  [string]$Task = "",
  [string]$SessionName = "",
  [string]$WorktreesRoot = "C:\\Users\\treyt\\OneDrive\\Desktop\\pt-study-sop-worktrees",
  [string]$BaseRef = "HEAD",
  [ValidateSet("codex", "opencode", "kimi", "powershell", "custom")]
  [string]$Tool = "codex",
  [string]$ToolArgs = "",
  [string]$OpenCodeCmd = "opencode",
  [string]$CustomCommand = "",
  [string]$CodexArgs = "--dangerously-bypass-approvals-and-sandbox --search"
)

$ErrorActionPreference = "Stop"

function Resolve-OpenCodeLauncherPath {
  param()

  $candidates = New-Object System.Collections.Generic.List[string]

  $envKeys = @(
    "OHMYOPENCODE_SOLO_LAUNCHER",
    "OHMYOPENCODE_LAUNCHER",
    "OHMY_OPENCODE_LAUNCHER",
    "PT_STUDY_OHMY_OPENCODE_LAUNCHER",
    "OPENCODE_REGULAR_LAUNCHER",
    "OPEN_CODE_REGULAR_LAUNCHER"
  )
  foreach ($key in $envKeys) {
    $value = [Environment]::GetEnvironmentVariable($key)
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      $candidates.Add($value)
    }
  }

  if ($env:USERPROFILE) {
    $candidates.Add((Join-Path $env:USERPROFILE "OneDrive\Desktop\Travel Laptop\OHMYOpenCode.bat"))
    $candidates.Add((Join-Path $env:USERPROFILE "OneDrive\Desktop\Travel Laptop\OpenCodeReg.bat"))
  }

  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    try {
      $resolved = [System.IO.Path]::GetFullPath($candidate)
    } catch {
      $resolved = $candidate
    }

    if (Test-Path -LiteralPath $resolved -PathType Leaf) {
      return $resolved
    }
  }

  return ""
}

function Quote-CommandPart {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  if ($Value -match '\s') { return '"' + $Value + '"' }
  return $Value
}

function New-NameSlug {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  $slug = $Value.ToLowerInvariant()
  $slug = $slug -replace "[^a-z0-9\\-_ ]", ""
  $slug = $slug -replace "\s+", "-"
  return $slug.Trim("-_")
}

function Get-PythonLauncher {
  param()

  foreach ($candidate in @("python", "py")) {
    $cmd = Get-Command -Name $candidate -ErrorAction SilentlyContinue
    if ($cmd) {
      return [string]$cmd.Source
    }
  }

  return ""
}

function Register-TaskBoardTask {
  param(
    [string]$ScriptRoot,
    [string]$TaskText,
    [string]$SessionId,
    [string]$ToolName,
    [string]$WorktreePath
  )

  $result = @{
    TaskId = ""
    Registered = $false
  }

  if ([string]::IsNullOrWhiteSpace($TaskText)) {
    return $result
  }

  $taskBoardScript = Join-Path $ScriptRoot "agent_task_board.py"
  if (-not (Test-Path -LiteralPath $taskBoardScript)) {
    Write-Warning "Task board script missing; skipping auto registration: $taskBoardScript"
    return $result
  }

  $python = Get-PythonLauncher
  if ([string]::IsNullOrWhiteSpace($python)) {
    Write-Warning "python/py not found on PATH; skipping task board registration."
    return $result
  }

  $sessionSlug = New-NameSlug -Value $SessionId
  if ([string]::IsNullOrWhiteSpace($sessionSlug)) {
    $sessionSlug = Get-Date -Format "yyyyMMddHHmmss"
  }

  $taskId = "TASK-$sessionSlug"
  $agentName = "$ToolName-$sessionSlug"

  & $python $taskBoardScript init | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Unable to initialize task board; skipping auto registration."
    return $result
  }

  $note = "Auto-registered by launch_codex_session.ps1 from -Task."
  & $python $taskBoardScript add `
    --task-id $taskId `
    --title $TaskText `
    --priority P1 `
    --status in_progress `
    --agent $agentName `
    --role integrate `
    --tool $ToolName `
    --session $SessionId `
    --worktree $WorktreePath `
    --note $note | Out-Null

  if ($LASTEXITCODE -ne 0) {
    $reclaimNote = "Reclaimed by launch_codex_session.ps1."
    & $python $taskBoardScript claim `
      --task-id $taskId `
      --agent $agentName `
      --role integrate `
      --tool $ToolName `
      --session $SessionId `
      --worktree $WorktreePath `
      --force `
      --note $reclaimNote | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Task board add/claim failed for '$taskId'; continuing launch."
      return $result
    }
  }

  $result.TaskId = $taskId
  $result.Registered = $true
  return $result
}

$scriptRoot = $PSScriptRoot
$launcher = Join-Path $scriptRoot "new_session_worktree.ps1"

$output = & $launcher -Task $Task -SessionName $SessionName -WorktreesRoot $WorktreesRoot -BaseRef $BaseRef -CopyBacklogEnv
$worktreeLine = $output | Where-Object { $_ -like "Worktree created:*" } | Select-Object -First 1
if (-not $worktreeLine) {
  throw "Unable to parse worktree path from launcher output."
}
$worktreePath = $worktreeLine -replace "^Worktree created:\s*", ""
$resolvedSessionName = Split-Path -Path $worktreePath -Leaf
if ([string]::IsNullOrWhiteSpace($resolvedSessionName)) {
  $resolvedSessionName = $SessionName
}
if ([string]::IsNullOrWhiteSpace($resolvedSessionName)) {
  $resolvedSessionName = Get-Date -Format "yyyyMMdd_HHmmss"
}

$registration = Register-TaskBoardTask -ScriptRoot $scriptRoot -TaskText $Task -SessionId $resolvedSessionName -ToolName $Tool -WorktreePath $worktreePath
$taskId = [string]$registration.TaskId

$launchCommand = ""
switch ($Tool.ToLowerInvariant()) {
  "codex" {
    $args = if ([string]::IsNullOrWhiteSpace($ToolArgs)) { $CodexArgs } else { $ToolArgs }
    if (-not [string]::IsNullOrWhiteSpace($args)) {
      $launchCommand = "codex $args"
    } else {
      $launchCommand = "codex"
    }
  }
  "opencode" {
    $openCodeLauncher = Resolve-OpenCodeLauncherPath
    $openCodeBase = if (($OpenCodeCmd -eq "opencode") -and -not [string]::IsNullOrWhiteSpace($openCodeLauncher)) {
      "$(Quote-CommandPart $openCodeLauncher) /nopause"
    } else {
      $OpenCodeCmd
    }

    if ([string]::IsNullOrWhiteSpace($ToolArgs)) {
      $launchCommand = $openCodeBase
    } else {
      $launchCommand = "$openCodeBase $ToolArgs"
    }
  }
  "kimi" {
    if ([string]::IsNullOrWhiteSpace($ToolArgs)) {
      $launchCommand = "kimi"
    } else {
      $launchCommand = "kimi $ToolArgs"
    }
  }
  "custom" {
    if ([string]::IsNullOrWhiteSpace($CustomCommand)) {
      throw "Custom tool selected but -CustomCommand is empty."
    }
    $launchCommand = $CustomCommand
  }
  default {
    $launchCommand = ""
  }
}

$safeWorktree = $worktreePath.Replace("'", "''")
$safeTool = $Tool.Replace("'", "''")
$safeSession = $resolvedSessionName.Replace("'", "''")
$agentNameSlug = New-NameSlug -Value "$Tool-$resolvedSessionName"
if ([string]::IsNullOrWhiteSpace($agentNameSlug)) {
  $agentNameSlug = "$Tool-session"
}
$safeAgentName = $agentNameSlug.Replace("'", "''")
$safeTaskId = $taskId.Replace("'", "''")

$terminalCommand = "`$host.UI.RawUI.WindowTitle = 'pt-study-sop:session:$safeAgentName'; `$env:PT_AGENT_NAME = '$safeAgentName'; `$env:PT_AGENT_ROLE = 'integrate'; `$env:PT_AGENT_TOOL = '$safeTool'; `$env:PT_AGENT_WORKTREE = '$safeWorktree'; `$env:PT_AGENT_SESSION = '$safeSession';"
if (-not [string]::IsNullOrWhiteSpace($taskId)) {
  $terminalCommand = "$terminalCommand `$env:PT_TASK_ID = '$safeTaskId';"
}
$terminalCommand = "$terminalCommand cd `"$worktreePath`"; if (Test-Path '.\scripts\agent_task_board.py') { function task-board { python .\scripts\agent_task_board.py @args }; Write-Host '[task-board] use: task-board list | task-board claim --task-id T-001' -ForegroundColor Cyan }"
if (-not [string]::IsNullOrWhiteSpace($launchCommand)) {
  $terminalCommand = "$terminalCommand; $launchCommand"
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", $terminalCommand
