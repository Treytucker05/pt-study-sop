param(
  [string]$RepoRoot = "C:\pt-study-sop",
  [string]$WslRepoRoot = "/mnt/c/pt-study-sop"
)

$ErrorActionPreference = "Stop"

function Read-WithDefault {
  param(
    [string]$Prompt,
    [string]$Default
  )

  $value = Read-Host "$Prompt [$Default]"
  if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
  return $value.Trim()
}

function Read-YesNo {
  param(
    [string]$Prompt,
    [bool]$DefaultYes = $true
  )

  $suffix = if ($DefaultYes) { "Y/n" } else { "y/N" }
  while ($true) {
    $value = Read-Host "$Prompt ($suffix)"
    if ([string]::IsNullOrWhiteSpace($value)) { return $DefaultYes }

    switch ($value.Trim().ToLowerInvariant()) {
      "y" { return $true }
      "yes" { return $true }
      "n" { return $false }
      "no" { return $false }
      default { Write-Host "Enter y or n." -ForegroundColor Yellow }
    }
  }
}

function Read-NonNegativeInt {
  param(
    [string]$Prompt,
    [int]$Default
  )

  while ($true) {
    $raw = Read-Host "$Prompt [$Default]"
    if ([string]::IsNullOrWhiteSpace($raw)) { return $Default }

    $parsed = 0
    if ([int]::TryParse($raw.Trim(), [ref]$parsed) -and $parsed -ge 0) {
      return $parsed
    }
    Write-Host "Enter a whole number >= 0." -ForegroundColor Yellow
  }
}

function Normalize-Roles {
  param([string]$RolesCsv)

  $allowed = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  @("ui", "brain", "integrate", "docs") | ForEach-Object { [void]$allowed.Add($_) }

  $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  $roles = New-Object System.Collections.Generic.List[string]

  foreach ($part in ($RolesCsv -split ",")) {
    $role = $part.Trim().ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($role)) { continue }
    if (-not $allowed.Contains($role)) {
      throw "Invalid role '$role'. Allowed: ui, brain, integrate, docs."
    }
    if ($seen.Add($role)) {
      $roles.Add($role) | Out-Null
    }
  }

  if ($roles.Count -eq 0) {
    throw "No roles selected."
  }
  return @($roles)
}

function Invoke-Checked {
  param(
    [string]$Executable,
    [string[]]$Arguments,
    [string]$WorkingDirectory = ""
  )

  $previousLocation = (Get-Location).Path
  try {
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
      Set-Location -LiteralPath $WorkingDirectory
    }

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed with exit code ${LASTEXITCODE}: $Executable $($Arguments -join ' ')"
    }
  }
  finally {
    if ($previousLocation) {
      Set-Location -LiteralPath $previousLocation
    }
  }
}

$scriptsDir = Join-Path $RepoRoot "scripts"
$worktreeScript = Join-Path $scriptsDir "agent_worktrees.ps1"
$bootstrapScript = Join-Path $scriptsDir "bootstrap_parallel_agents.ps1"
$taskBoardScript = Join-Path $scriptsDir "agent_task_board.py"
$hookScript = Join-Path $scriptsDir "install_agent_guard_hooks.ps1"
$openCodeWslScript = Join-Path $scriptsDir "opencode_wsl_tmux.sh"

foreach ($requiredPath in @($worktreeScript, $bootstrapScript, $taskBoardScript, $hookScript, $openCodeWslScript)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Missing required file: $requiredPath"
  }
}

if (-not (Test-Path -LiteralPath $RepoRoot)) {
  throw "RepoRoot does not exist: $RepoRoot"
}

$repoCheck = (& git -C $RepoRoot rev-parse --show-toplevel 2>$null)
if (-not $repoCheck) {
  throw "RepoRoot is not inside a git repository: $RepoRoot"
}

Write-Host ""
Write-Host "Parallel Agent Launch Wizard" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Cyan
Write-Host "1) Session prefix: label for all new sessions (used in terminal window names)."
Write-Host "2) Roles csv: which work areas to open (ui, brain, integrate, docs)."
Write-Host "3) Codex/Claude/OpenCode counts: how many parallel sessions to start for each."
Write-Host "4) OpenCode uses WSL+tmux and opens one tmux session with a window per selected role."
Write-Host ""

$sessionPrefix = Read-WithDefault -Prompt "Session prefix" -Default "run"
$prefixHelp = "Session prefix is used to label each launched terminal/window (example: daily -> daily-codex-1)."
Write-Host "Tip: $prefixHelp" -ForegroundColor DarkGray
$rolesInput = Read-WithDefault -Prompt "Roles csv" -Default "ui,brain,integrate,docs"
$roles = Normalize-Roles -RolesCsv $rolesInput
$rolesCsv = ($roles -join ",")

$codexCount = Read-NonNegativeInt -Prompt "Codex launch count" -Default 1
$claudeCount = Read-NonNegativeInt -Prompt "Claude launch count" -Default 0
$openCodeCount = Read-NonNegativeInt -Prompt "OpenCode WSL tmux session count" -Default 0

if (($codexCount + $claudeCount + $openCodeCount) -eq 0) {
  throw "At least one launch count must be greater than 0."
}

$installHooks = Read-YesNo -Prompt "Install/update guard hooks first?" -DefaultYes:$false
$showStatusAtEnd = Read-YesNo -Prompt "Show status summary at end?" -DefaultYes:$true

Write-Host ""
Write-Host "Plan" -ForegroundColor Cyan
Write-Host "- Roles: $rolesCsv"
Write-Host "- Codex: $codexCount"
Write-Host "- Claude: $claudeCount"
Write-Host "- OpenCode WSL tmux: $openCodeCount"
Write-Host "- Session prefix: $sessionPrefix"
Write-Host "- Naming pattern: [prefix]-[tool]-[count] and OpenCode WSL [prefix]-opencode-[count]"
Write-Host ""

$proceed = Read-YesNo -Prompt "Proceed?" -DefaultYes:$true
if (-not $proceed) {
  Write-Host "Cancelled."
  exit 0
}

Write-Host ""
Write-Host "[1/4] Ensuring role worktrees..." -ForegroundColor Cyan
$ensureArgs = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $worktreeScript,
  "-Action", "ensure"
)
if ($roles -contains "docs") {
  $ensureArgs += "-IncludeDocs"
}
Invoke-Checked -Executable "pwsh" -Arguments $ensureArgs -WorkingDirectory $RepoRoot

Write-Host ""
Write-Host "[2/4] Initializing shared task board..." -ForegroundColor Cyan
Invoke-Checked -Executable "python" -Arguments @($taskBoardScript, "init")

if ($installHooks) {
  Write-Host ""
  Write-Host "[3/4] Installing guard hooks..." -ForegroundColor Cyan
  Invoke-Checked -Executable "pwsh" -Arguments @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $hookScript,
    "-Action", "install"
  ) -WorkingDirectory $RepoRoot
} else {
  Write-Host ""
  Write-Host "[3/4] Skipping hook install." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "[4/4] Launching agents..." -ForegroundColor Cyan

function Launch-WindowsTool {
  param(
    [string]$Tool,
    [int]$Count
  )

  for ($i = 1; $i -le $Count; $i++) {
    $tag = "$sessionPrefix-$Tool-$i"
    Write-Host "Launching $Tool ($i/$Count) with tag '$tag'..."
    Invoke-Checked -Executable "pwsh" -Arguments @(
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", $bootstrapScript,
      "-Profile", "single",
      "-Tool", $Tool,
      "-Roles", $rolesCsv,
      "-SessionTag", $tag,
      "-SkipEnsure",
      "-SkipTaskBoardInit"
    ) -WorkingDirectory $RepoRoot
  }
}

if ($codexCount -gt 0) {
  Launch-WindowsTool -Tool "codex" -Count $codexCount
}
if ($claudeCount -gt 0) {
  Launch-WindowsTool -Tool "claude" -Count $claudeCount
}

if ($openCodeCount -gt 0) {
  if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
    throw "wsl.exe not found on PATH."
  }

  for ($i = 1; $i -le $openCodeCount; $i++) {
    $tmuxSession = "$sessionPrefix-opencode-$i"
    $wslCommand = "cd `"$WslRepoRoot`" && chmod +x ./scripts/opencode_wsl_tmux.sh && ./scripts/opencode_wsl_tmux.sh `"$tmuxSession`" `"$rolesCsv`""
    Write-Host "Starting OpenCode WSL tmux session '$tmuxSession'..."
    Start-Process -FilePath "wsl.exe" -ArgumentList "-e", "bash", "-lc", $wslCommand | Out-Null
  }
}

if ($showStatusAtEnd) {
  Write-Host ""
  Write-Host "Status summary" -ForegroundColor Cyan
  $statusArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $worktreeScript,
    "-Action", "status"
  )
  if ($roles -contains "docs") {
    $statusArgs += "-IncludeDocs"
  }
  Invoke-Checked -Executable "pwsh" -Arguments $statusArgs -WorkingDirectory $RepoRoot
  Invoke-Checked -Executable "python" -Arguments @($taskBoardScript, "status")
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
