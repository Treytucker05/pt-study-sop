$ErrorActionPreference = 'Stop'
$host.UI.RawUI.WindowTitle = 'planner'
Set-Location -LiteralPath 'C:\pt-study-sop'
$env:SWARM_REPO_ROOT = 'C:\pt-study-sop'
$env:SWARM_TASK_BOARD = 'C:\pt-study-sop\tasks\swarm_task_board.json'
$launcherBat = 'C:\Users\treyt\OneDrive\Desktop\Travel Laptop\OHMYOpenCode.bat'
$plannerTarget = 'C:\pt-study-sop'
if (-not (Test-Path -LiteralPath $launcherBat)) {
  throw "OHMYOpenCode launcher not found: $launcherBat"
}
Write-Host "Launching OhMyOpenCode via launcher: $launcherBat (target=$plannerTarget, /nopause)" -ForegroundColor Cyan
$launcherCmd = '""' + $launcherBat + '" /target "' + $plannerTarget + '" /nopause"'
& cmd /k $launcherCmd
