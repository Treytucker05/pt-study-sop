param(
  [string]$RepoRoot = "C:\pt-study-sop",
  [string]$WorktreesRoot = "C:\pt-study-sop-worktrees",
  [string]$LauncherRoot = "$env:USERPROFILE\OneDrive\Desktop\Travel Laptop\Parallel Work"
)

$ErrorActionPreference = "Stop"

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Details = ""
  )

  $color = if ($Status -eq "PASS") { "Green" } else { "Red" }
  Write-Host ("[{0}] {1}" -f $Status, $Name) -ForegroundColor $color
  if ($Details) {
    Write-Host "    $Details"
  }
}

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )
  try {
    & $Action
    Add-Result -Name $Name -Status "PASS"
    return $true
  } catch {
    Add-Result -Name $Name -Status "FAIL" -Details $_.Exception.Message
    return $false
  }
}

$pass = 0
$fail = 0

Write-Host "Parallel Agent Setup Health Check"
Write-Host "Repo: $RepoRoot"
Write-Host "Worktrees: $WorktreesRoot"
Write-Host "Launchers: $LauncherRoot"
Write-Host ""

$requiredScripts = @(
  "parallel_launch_wizard.ps1",
  "bootstrap_parallel_agents.ps1",
  "agent_worktrees.ps1",
  "agent_task_board.py",
  "opencode_wsl_tmux.sh",
  "install_agent_guard_hooks.ps1"
)

$requiredBatch = @(
  "01_Launch_Parallel_Wizard.bat",
  "10_Launch_Codex_Parallel.bat",
  "11_Launch_Claude_Parallel.bat",
  "12_Launch_OpenCode_Parallel.bat",
  "13_Launch_Integrate_Parallel.bat",
  "20_Launch_Swarm_All_Agents.bat",
  "90_Status_Check.bat"
)

if (-not (Invoke-Step "Validate repo root" { if (-not (Test-Path -LiteralPath $RepoRoot)) { throw "RepoRoot not found: $RepoRoot" } })) { $fail++ } else { $pass++ }
if (-not (Invoke-Step "Validate git repo" { $null = (& git -C $RepoRoot rev-parse --show-toplevel 2>$null); if (-not $?) { throw "RepoRoot is not a git repository: $RepoRoot" } })) { $fail++ } else { $pass++ }
if (-not (Invoke-Step "Validate worktree root" { if (-not (Test-Path -LiteralPath $WorktreesRoot)) { throw "WorktreesRoot not found: $WorktreesRoot" } })) { $fail++ } else { $pass++ }

Set-Location -LiteralPath $RepoRoot
$scriptsDir = Join-Path $RepoRoot "scripts"

foreach ($file in $requiredScripts) {
  $path = Join-Path $scriptsDir $file
  if (-not (Invoke-Step "Script exists: $file" { if (-not (Test-Path -LiteralPath $path)) { throw "Missing file: $path" } })) {
    $fail++
  } else {
    $pass++
  }
}

foreach ($file in $requiredBatch) {
  $path = Join-Path $LauncherRoot $file
  if (-not (Invoke-Step "Launcher exists: $file" { if (-not (Test-Path -LiteralPath $path)) { throw "Missing file: $path" } })) {
    $fail++
  } else {
    $pass++
  }
}

if (-not (Invoke-Step "Worktree listing command" { pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action list -IncludeDocs })) { $fail++ } else { $pass++ }
if (-not (Invoke-Step "Worktree status command" { pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action status -IncludeDocs })) { $fail++ } else { $pass++ }
if (-not (Invoke-Step "Task board location" { python .\scripts\agent_task_board.py where })) { $fail++ } else { $pass++ }
if (-not (Invoke-Step "Task board status" { python .\scripts\agent_task_board.py status })) { $fail++ } else { $pass++ }
if (-not (Invoke-Step "Task board list" { python .\scripts\agent_task_board.py list })) { $fail++ } else { $pass++ }
if (-not (Invoke-Step "Agent scripts syntax" { pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action help })) { $fail++ } else { $pass++ }
if (-not (Invoke-Step "Wizard script non-empty" { if (-not (Get-Content .\scripts\parallel_launch_wizard.ps1 -First 1)) { throw "parallel_launch_wizard.ps1 is empty" } })) { $fail++ } else { $pass++ }

Write-Host ""
if ($fail -eq 0) {
  Write-Host "Setup health: PASS ($pass checks)" -ForegroundColor Green
  Write-Host "Everything needed for launch is present and runnable."
  exit 0
}

Write-Host "Setup health: FAIL ($fail failed, $pass passed)" -ForegroundColor Red
Write-Host "Fix failed checks above, then rerun this verifier."
exit 1
