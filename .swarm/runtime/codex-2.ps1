$ErrorActionPreference = 'Stop'
$host.UI.RawUI.WindowTitle = 'codex-2'
Set-Location -LiteralPath 'C:\pt-study-sop\worktrees\codex-2'
$env:SWARM_REPO_ROOT = 'C:\pt-study-sop'
$env:SWARM_TASK_BOARD = 'C:\pt-study-sop\tasks\swarm_task_board.json'
$env:SWARM_AGENT_NAME = 'codex-2'
$agentExe = 'C:\Users\treyt\AppData\Roaming\npm\codex.ps1'
$resolved = if ([string]::IsNullOrWhiteSpace($agentExe)) { $null } else { Get-Command -Name $agentExe -ErrorAction SilentlyContinue }
if (-not $resolved) {
  throw "Codex executable not found: $agentExe"
}
$agentExe = [string]$resolved.Source
& $agentExe
