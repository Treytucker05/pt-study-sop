param(
  [string]$WorktreesRoot = "C:\\pt-study-sop-worktrees",
  [string]$BaseRef = "main",

  [ValidateSet("single", "review", "swarm")]
  [string]$Profile = "swarm",

  [ValidateSet("powershell", "codex", "claude", "opencode", "custom")]
  [string]$Tool = "codex",

  [string[]]$Roles = @("ui", "brain", "integrate"),
  [string[]]$Agents = @(),

  [string]$SessionTag = "parallel",

  [switch]$SkipTaskBoardInit,
  [switch]$IncludeDocs,
  [switch]$OpenDocs,
  [switch]$SkipEnsure,
  [switch]$InstallHooks,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Invoke-Action {
  param(
    [string]$Executable,
    [string[]]$Arguments
  )

  if ($DryRun) {
    Write-Host ("DRYRUN: {0} {1}" -f $Executable, ($Arguments -join " "))
    return
  }

  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Executable $($Arguments -join ' ')"
  }
}

function Normalize-Roles {
  param(
    [string[]]$InputRoles,
    [switch]$AddDocsRole
  )

  $allowed = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  @("integrate", "ui", "brain", "docs") | ForEach-Object { [void]$allowed.Add($_) }
  $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  $ordered = New-Object System.Collections.Generic.List[string]

  foreach ($r in $InputRoles) {
    if ([string]::IsNullOrWhiteSpace($r)) { continue }
    $chunks = $r -split ","
    foreach ($chunk in $chunks) {
      $role = $chunk.Trim().ToLowerInvariant()
      if ([string]::IsNullOrWhiteSpace($role)) { continue }
      if (-not $allowed.Contains($role)) {
        throw "Unknown role '$role'. Allowed: integrate, ui, brain, docs."
      }
      if ($seen.Add($role)) {
        $ordered.Add($role) | Out-Null
      }
    }
  }

  if ($AddDocsRole -and $seen.Add("docs")) {
    $ordered.Add("docs") | Out-Null
  }

  if ($ordered.Count -eq 0) {
    throw "No roles resolved. Pass -Roles with at least one role."
  }

  return @($ordered)
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$worktreeScript = Join-Path $scriptRoot "agent_worktrees.ps1"
$hookScript = Join-Path $scriptRoot "install_agent_guard_hooks.ps1"
$taskBoardScript = Join-Path $scriptRoot "agent_task_board.py"

if (-not (Test-Path -LiteralPath $worktreeScript)) {
  throw "Missing required script: $worktreeScript"
}

$effectiveRoles = Normalize-Roles -InputRoles $Roles -AddDocsRole:$OpenDocs
$effectiveIncludeDocs = $IncludeDocs.IsPresent -or ($effectiveRoles -contains "docs")

Write-Host "Bootstrap parallel agents"
Write-Host ("- Worktrees root: {0}" -f $WorktreesRoot)
Write-Host ("- Base ref: {0}" -f $BaseRef)
Write-Host ("- Profile: {0}" -f $Profile)
Write-Host ("- Roles: {0}" -f ($effectiveRoles -join ", "))
if ($Agents.Count -gt 0) {
  Write-Host ("- Explicit agents: {0}" -f ($Agents -join ", "))
}
Write-Host ("- Include docs worktree: {0}" -f $effectiveIncludeDocs)
Write-Host ("- Dry run: {0}" -f $DryRun)

if (-not $SkipEnsure) {
  $ensureArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $worktreeScript,
    "-Action", "ensure",
    "-WorktreesRoot", $WorktreesRoot,
    "-BaseRef", $BaseRef
  )
  if ($effectiveIncludeDocs) {
    $ensureArgs += "-IncludeDocs"
  }

  Write-Host ""
  Write-Host "Ensuring role worktrees..."
  Invoke-Action -Executable "pwsh" -Arguments $ensureArgs
}

if (-not $SkipTaskBoardInit) {
  if (-not (Test-Path -LiteralPath $taskBoardScript)) {
    throw "Missing required script: $taskBoardScript"
  }
  Write-Host ""
  Write-Host "Initializing shared task board..."
  $taskInitArgs = @($taskBoardScript, "init")
  Invoke-Action -Executable "python" -Arguments $taskInitArgs
}

Write-Host ""
Write-Host "Launching agents..."
foreach ($role in $effectiveRoles) {
  $roleTag = if ([string]::IsNullOrWhiteSpace($SessionTag)) { $role } else { "$SessionTag-$role" }
  $openArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $worktreeScript,
    "-Action", "open-many",
    "-Role", $role,
    "-Profile", $Profile,
    "-Tool", $Tool,
    "-WorktreesRoot", $WorktreesRoot,
    "-BaseRef", $BaseRef,
    "-SessionTag", $roleTag
  )
  if ($effectiveIncludeDocs) {
    $openArgs += "-IncludeDocs"
  }
  if ($Agents.Count -gt 0) {
    $openArgs += "-Agents"
    $openArgs += $Agents
  }

  Invoke-Action -Executable "pwsh" -Arguments $openArgs
}

if ($InstallHooks) {
  if (-not (Test-Path -LiteralPath $hookScript)) {
    throw "Missing required script: $hookScript"
  }
  Write-Host ""
  Write-Host "Installing local guard hooks..."
  $hookArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $hookScript,
    "-Action", "install"
  )
  Invoke-Action -Executable "pwsh" -Arguments $hookArgs
}

Write-Host ""
Write-Host "Done. Use status to verify role state:"
Write-Host "pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action status -IncludeDocs"
Write-Host "python .\scripts\agent_task_board.py list"
