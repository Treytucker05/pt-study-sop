param(
  [string]$Task = "",
  [string]$SessionName = "",
  [string]$WorktreesRoot = "C:\\Users\\treyt\\OneDrive\\Desktop\\pt-study-sop-worktrees",
  [string]$BaseRef = "HEAD",
  [ValidateSet("codex", "opencode", "powershell", "custom")]
  [string]$Tool = "codex",
  [string]$ToolArgs = "",
  [string]$OpenCodeCmd = "opencode",
  [string]$CustomCommand = "",
  [string]$CodexArgs = "--dangerously-bypass-approvals-and-sandbox --search"
)

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
$launcher = Join-Path $scriptRoot "new_session_worktree.ps1"

$output = & $launcher -Task $Task -SessionName $SessionName -WorktreesRoot $WorktreesRoot -BaseRef $BaseRef -CopyBacklogEnv
$worktreeLine = $output | Where-Object { $_ -like "Worktree created:*" } | Select-Object -First 1
if (-not $worktreeLine) {
  throw "Unable to parse worktree path from launcher output."
}
$worktreePath = $worktreeLine -replace "^Worktree created:\s*", ""

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
    if ([string]::IsNullOrWhiteSpace($ToolArgs)) {
      $launchCommand = $OpenCodeCmd
    } else {
      $launchCommand = "$OpenCodeCmd $ToolArgs"
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

$terminalCommand = "cd `"$worktreePath`""
if (-not [string]::IsNullOrWhiteSpace($launchCommand)) {
  $terminalCommand = "$terminalCommand; $launchCommand"
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", $terminalCommand
