$ErrorActionPreference = 'Stop'
$host.UI.RawUI.WindowTitle = 'gemini-research'
Set-Location -LiteralPath 'C:\pt-study-sop'
$env:SWARM_REPO_ROOT = 'C:\pt-study-sop'
$env:SWARM_TASK_BOARD = 'C:\pt-study-sop\tasks\swarm_task_board.json'
$agentExe = 'C:\Users\treyt\AppData\Roaming\npm\gemini.ps1'
$resolved = if ([string]::IsNullOrWhiteSpace($agentExe)) { $null } else { Get-Command -Name $agentExe -ErrorAction SilentlyContinue }
if (-not $resolved) {
  throw "Gemini executable not found: $agentExe"
}
$agentExe = [string]$resolved.Source
$promptPath = 'C:\pt-study-sop\scripts\swarm_prompts\reviewer.txt'
$startupPrompt = Get-Content -LiteralPath $promptPath -Raw
Write-Host "Research/review prompt file: $promptPath" -ForegroundColor Cyan
if (-not [string]::IsNullOrWhiteSpace($startupPrompt)) {
  & $agentExe $startupPrompt
  if ($LASTEXITCODE -eq 0) { return }
  Write-Warning "Could not pass startup prompt directly; opening interactive Gemini CLI."
}
& $agentExe
