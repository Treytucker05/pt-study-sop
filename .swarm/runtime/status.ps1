$host.UI.RawUI.WindowTitle = 'status'
Set-Location -LiteralPath 'C:\pt-study-sop'
$statusScriptPath = 'C:\pt-study-sop\scripts\status_once.ps1'
$statusRepoRoot = 'C:\pt-study-sop'
$statusWorktreesRoot = 'C:\pt-study-sop\worktrees'
$statusBoardPath = 'C:\pt-study-sop\tasks\swarm_task_board.json'

while ($true) {
  Clear-Host
  if (-not (Test-Path -LiteralPath $statusScriptPath)) {
    Write-Host ("Missing status dashboard script: {0}" -f $statusScriptPath) -ForegroundColor Red
  } else {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $statusScriptPath -RepoRoot $statusRepoRoot -WorktreesRoot $statusWorktreesRoot -BoardPath $statusBoardPath
    if ($LASTEXITCODE -ne 0) {
      Write-Warning ("status_once.ps1 exited with code {0}." -f $LASTEXITCODE)
    }
  }

  Write-Host ""
  Write-Host "Refresh in 10 seconds. Press Ctrl+C to stop this status window." -ForegroundColor DarkGray
  Start-Sleep -Seconds 10
}
