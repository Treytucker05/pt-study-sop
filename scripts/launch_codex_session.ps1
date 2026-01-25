param(
  [string]$Task = "",
  [string]$WorktreesRoot = "C:\\Users\\treyt\\OneDrive\\Desktop\\pt-study-sop-worktrees",
  [string]$BaseRef = "HEAD",
  [string]$CodexArgs = "--dangerously-bypass-approvals-and-sandbox --search"
)

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
$launcher = Join-Path $scriptRoot "new_session_worktree.ps1"

$output = & $launcher -Task $Task -WorktreesRoot $WorktreesRoot -BaseRef $BaseRef -CopyBacklogEnv
$worktreeLine = $output | Where-Object { $_ -like "Worktree created:*" } | Select-Object -First 1
if (-not $worktreeLine) {
  throw "Unable to parse worktree path from launcher output."
}
$worktreePath = $worktreeLine -replace "^Worktree created:\s*", ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$worktreePath`"; codex $CodexArgs"
