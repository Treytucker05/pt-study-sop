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
