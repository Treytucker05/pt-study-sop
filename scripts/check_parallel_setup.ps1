param(
  [string]$RepoRoot = "C:\pt-study-sop",
  [string]$WorktreesRoot = "",
  [string]$LauncherRoot = "$env:USERPROFILE\OneDrive\Desktop\Travel Laptop\Parallel Work"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($WorktreesRoot)) {
  $WorktreesRoot = Join-Path $RepoRoot "worktrees"
}

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Details = ""
  )

  $color = switch ($Status) {
    "PASS" { "Green" }
    "FAIL" { "Red" }
    "INFO" { "Yellow" }
    default { "Gray" }
  }

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
$info = 0

Write-Host "Parallel Agent Setup Health Check (Swarm-Only)"
Write-Host "Repo: $RepoRoot"
Write-Host "Worktrees: $WorktreesRoot"
Write-Host "Launchers: $LauncherRoot"
Write-Host ""

$requiredRepoFiles = @(
  "scripts\swarm_workflow.ps1",
  "scripts\swarm_cleanup.ps1",
  "scripts\swarm_prompts\planner_fast.txt",
  "scripts\swarm_prompts\planner_high_confidence.txt",
  "scripts\swarm_prompts\reviewer.txt"
)

$requiredLauncherFiles = @(
  "00_Parallel_Work_Center.bat",
  "90_Status_Check.bat",
  "91_Check_Parallel_Setup.bat",
  "README-Parallel-Work.txt"
)

$legacyLaunchers = @(
  "01_Launch_Parallel_Wizard.bat",
  "10_Launch_Codex_Parallel.bat",
  "11_Launch_Claude_Parallel.bat",
  "12_Launch_OpenCode_Parallel.bat",
  "13_Launch_Integrate_Parallel.bat",
  "20_Launch_Swarm_All_Agents.bat"
)

if (-not (Invoke-Step "Validate repo root" {
  if (-not (Test-Path -LiteralPath $RepoRoot)) { throw "RepoRoot not found: $RepoRoot" }
})) { $fail++ } else { $pass++ }

if (-not (Invoke-Step "Validate launcher root" {
  if (-not (Test-Path -LiteralPath $LauncherRoot)) { throw "LauncherRoot not found: $LauncherRoot" }
})) { $fail++ } else { $pass++ }

if (-not (Invoke-Step "Validate git repo" {
  $null = (& git -C $RepoRoot rev-parse --show-toplevel 2>$null)
  if ($LASTEXITCODE -ne 0) { throw "RepoRoot is not a git repository: $RepoRoot" }
})) { $fail++ } else { $pass++ }

if (-not (Invoke-Step "Worktree listing command" {
  $null = (& git -C $RepoRoot worktree list --porcelain 2>$null)
  if ($LASTEXITCODE -ne 0) { throw "git worktree list failed for repo: $RepoRoot" }
})) { $fail++ } else { $pass++ }

if (Test-Path -LiteralPath $WorktreesRoot) {
  Add-Result -Name "Worktree root path" -Status "PASS" -Details $WorktreesRoot
  $pass++
} else {
  Add-Result -Name "Worktree root path" -Status "INFO" -Details "Path not present yet (created after first swarm launch): $WorktreesRoot"
  $info++
}

foreach ($relativePath in $requiredRepoFiles) {
  $path = Join-Path $RepoRoot $relativePath
  if (-not (Invoke-Step "Repo file exists: $relativePath" {
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing file: $path" }
  })) {
    $fail++
  } else {
    $pass++
  }
}

foreach ($file in $requiredLauncherFiles) {
  $path = Join-Path $LauncherRoot $file
  if (-not (Invoke-Step "Launcher file exists: $file" {
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing file: $path" }
  })) {
    $fail++
  } else {
    $pass++
  }
}

if (-not (Invoke-Step "Swarm launcher wiring in 00_Parallel_Work_Center.bat" {
  $launcherPath = Join-Path $LauncherRoot "00_Parallel_Work_Center.bat"
  $launcherText = Get-Content -LiteralPath $launcherPath -Raw
  $requiredCallPrefix = "pwsh -NoProfile -ExecutionPolicy Bypass -File C:\pt-study-sop\scripts\swarm_workflow.ps1"
  if ($launcherText -notmatch [Regex]::Escape($requiredCallPrefix)) {
    throw "Missing required swarm workflow call prefix: $requiredCallPrefix"
  }
})) { $fail++ } else { $pass++ }

$archiveRoot = Join-Path $LauncherRoot "archive"
foreach ($legacy in $legacyLaunchers) {
  $archivePath = Join-Path $archiveRoot $legacy
  $rootPath = Join-Path $LauncherRoot $legacy

  if (Test-Path -LiteralPath $archivePath) {
    Add-Result -Name "Legacy launcher archived: $legacy" -Status "INFO" -Details $archivePath
    $info++
    continue
  }

  if (Test-Path -LiteralPath $rootPath) {
    Add-Result -Name "Legacy launcher in root (optional): $legacy" -Status "INFO" -Details $rootPath
    $info++
    continue
  }

  Add-Result -Name "Legacy launcher absent (ok): $legacy" -Status "INFO" -Details "Not required for swarm-only setup."
  $info++
}

$wslHelper = Join-Path $RepoRoot "scripts\opencode_wsl_tmux.sh"
if (Test-Path -LiteralPath $wslHelper) {
  Add-Result -Name "Optional WSL/tmux helper" -Status "INFO" -Details "Present: $wslHelper"
} else {
  Add-Result -Name "Optional WSL/tmux helper" -Status "INFO" -Details "Not present. Not required for swarm-only setup."
}
$info++

$taskBoardScript = Join-Path $RepoRoot "scripts\agent_task_board.py"
if (-not (Invoke-Step "Task board script exists" {
  if (-not (Test-Path -LiteralPath $taskBoardScript)) { throw "Missing file: $taskBoardScript" }
})) { $fail++ } else { $pass++ }

$pythonCmd = Get-Command -Name python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
  $pythonCmd = Get-Command -Name py -ErrorAction SilentlyContinue
}
if (-not $pythonCmd) {
  Add-Result -Name "Python command for task board checks" -Status "FAIL" -Details "python/py not found on PATH."
  $fail++
} else {
  Add-Result -Name "Python command for task board checks" -Status "PASS" -Details ([string]$pythonCmd.Source)
  $pass++

  if (-not (Invoke-Step "Task board location" { & $pythonCmd.Source $taskBoardScript where })) { $fail++ } else { $pass++ }
  if (-not (Invoke-Step "Task board status" { & $pythonCmd.Source $taskBoardScript status })) { $fail++ } else { $pass++ }
}

Write-Host ""
if ($fail -eq 0) {
  Write-Host ("Setup health: PASS ({0} checks, {1} info)" -f $pass, $info) -ForegroundColor Green
  Write-Host "Swarm-only launcher setup is healthy."
  exit 0
}

Write-Host ("Setup health: FAIL ({0} failed, {1} passed, {2} info)" -f $fail, $pass, $info) -ForegroundColor Red
Write-Host "Fix failed checks above, then rerun this verifier."
exit 1
