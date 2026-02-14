$ErrorActionPreference = 'Stop'
$host.UI.RawUI.WindowTitle = 'planner'
Set-Location -LiteralPath 'C:\pt-study-sop'
$env:SWARM_REPO_ROOT = 'C:\pt-study-sop'
$env:SWARM_TASK_BOARD = 'C:\pt-study-sop\tasks\swarm_task_board.json'
$agentExe = 'C:\ProgramData\chocolatey\bin\opencode.exe'
$plannerTarget = 'C:\pt-study-sop'
$resolved = if ([string]::IsNullOrWhiteSpace($agentExe)) { $null } else { Get-Command -Name $agentExe -ErrorAction SilentlyContinue }
if (-not $resolved) {
  throw "OpenCode executable not found: $agentExe"
}
$agentExe = [string]$resolved.Source
Write-Host "Launching OpenCode: $agentExe $plannerTarget" -ForegroundColor Cyan
& $agentExe $plannerTarget
if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
  throw ("OpenCode exited with code {0}." -f $LASTEXITCODE)
}
