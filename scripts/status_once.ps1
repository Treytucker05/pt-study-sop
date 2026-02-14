[CmdletBinding()]
param(
  [string]$RepoRoot = "C:\pt-study-sop",
  [string]$WorktreesRoot = "C:\pt-study-sop\worktrees",
  [string]$BoardPath = "C:\pt-study-sop\tasks\swarm_task_board.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$script:GitCommand = Get-Command -Name git -ErrorAction SilentlyContinue

function Get-GitSummary {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return [pscustomobject]@{
      Exists  = $false
      Branch  = "(missing)"
      State   = "missing"
      Message = "Path not found: $Path"
    }
  }

  if (-not $script:GitCommand) {
    return [pscustomobject]@{
      Exists  = $true
      Branch  = "(unknown)"
      State   = "unknown"
      Message = "git executable not found on PATH."
    }
  }

  $branchSuccess = $false
  $branch = (& $script:GitCommand.Source -C $Path rev-parse --abbrev-ref HEAD 2>$null | Select-Object -First 1)
  $branchSuccess = $?
  if (-not $branchSuccess) {
    return [pscustomobject]@{
      Exists  = $true
      Branch  = "(unknown)"
      State   = "unknown"
      Message = "git branch check failed for $Path"
    }
  }

  $branchText = [string]$branch
  if ([string]::IsNullOrWhiteSpace($branchText)) { $branchText = "(unknown)" }
  $branchText = $branchText.Trim()

  $statusSuccess = $false
  $porcelain = @(& $script:GitCommand.Source -C $Path status --porcelain 2>$null)
  $statusSuccess = $?
  if (-not $statusSuccess) {
    return [pscustomobject]@{
      Exists  = $true
      Branch  = $branchText
      State   = "unknown"
      Message = "git status check failed for $Path"
    }
  }

  $state = if ($porcelain.Count -eq 0) { "clean" } else { "dirty" }
  return [pscustomobject]@{
    Exists  = $true
    Branch  = $branchText
    State   = $state
    Message = ""
  }
}

function Format-SummaryLine {
  param(
    [string]$Label,
    [string]$Path
  )

  $summary = Get-GitSummary -Path $Path
  if (-not $summary.Exists) {
    return ("{0}: (missing) | {1}" -f $Label, $summary.Message)
  }

  if ($summary.State -eq "unknown") {
    return ("{0}: {1} | unknown ({2})" -f $Label, $summary.Branch, $summary.Message)
  }

  return ("{0}: {1} | {2}" -f $Label, $summary.Branch, $summary.State)
}

Write-Host ("Swarm Status Dashboard - {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")) -ForegroundColor Cyan
Write-Host ""

Write-Host (Format-SummaryLine -Label "Repo root" -Path $RepoRoot)

if (Test-Path -LiteralPath $WorktreesRoot) {
  $codexWorktrees = @(Get-ChildItem -LiteralPath $WorktreesRoot -Directory -Filter "codex-*" | Sort-Object -Property Name)
  if ($codexWorktrees.Count -eq 0) {
    Write-Host ("codex-* worktrees: none found under {0}" -f $WorktreesRoot)
  } else {
    foreach ($wt in $codexWorktrees) {
      $line = Format-SummaryLine -Label $wt.FullName -Path $wt.FullName
      Write-Host $line
    }
  }
} else {
  Write-Host ("codex-* worktrees root missing: {0}" -f $WorktreesRoot)
}

Write-Host ""
Write-Host "Task Counts" -ForegroundColor Yellow

$statusOrder = @("todo", "in_progress", "blocked", "done")
$statusCounts = [ordered]@{
  todo = 0
  in_progress = 0
  blocked = 0
  done = 0
}
$unknownStatusCounts = [ordered]@{}
$tasks = @()

if (Test-Path -LiteralPath $BoardPath) {
  try {
    $boardRaw = Get-Content -LiteralPath $BoardPath -Raw
    $board = ConvertFrom-Json -InputObject $boardRaw
    if ($null -ne $board.tasks) {
      $tasks = @($board.tasks)
    }
  } catch {
    Write-Host ("Failed to parse board JSON: {0}" -f $BoardPath) -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
  }
} else {
  Write-Host ("Task board not found: {0}" -f $BoardPath) -ForegroundColor Yellow
}

foreach ($task in $tasks) {
  $statusValue = ([string]$task.status).Trim().ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($statusValue)) { $statusValue = "todo" }

  if ($statusCounts.Contains($statusValue)) {
    $statusCounts[$statusValue] = [int]$statusCounts[$statusValue] + 1
  } else {
    if (-not $unknownStatusCounts.Contains($statusValue)) {
      $unknownStatusCounts[$statusValue] = 0
    }
    $unknownStatusCounts[$statusValue] = [int]$unknownStatusCounts[$statusValue] + 1
  }
}

$countsLine = ($statusOrder | ForEach-Object { "{0}={1}" -f $_, $statusCounts[$_] }) -join "  "
Write-Host $countsLine
foreach ($entry in $unknownStatusCounts.GetEnumerator()) {
  Write-Host ("{0}={1}" -f [string]$entry.Key, [int]$entry.Value)
}

Write-Host ""
Write-Host "Claimed Tasks (id + owner)" -ForegroundColor Yellow

$claimedTasks = @(
  $tasks | Where-Object {
    $owner = [string]$_.owner_agent
    $claimedAt = [string]$_.claimed_at
    $statusValue = ([string]$_.status).Trim().ToLowerInvariant()
    (-not [string]::IsNullOrWhiteSpace($owner)) -or
    (-not [string]::IsNullOrWhiteSpace($claimedAt)) -or
    ($statusValue -eq "in_progress")
  }
)

if ($claimedTasks.Count -eq 0) {
  Write-Host "(none)"
} else {
  foreach ($task in ($claimedTasks | Sort-Object -Property id)) {
    $taskId = [string]$task.id
    if ([string]::IsNullOrWhiteSpace($taskId)) { $taskId = "(no-id)" }
    $owner = [string]$task.owner_agent
    if ([string]::IsNullOrWhiteSpace($owner)) { $owner = "(unassigned)" }
    Write-Host ("- {0} | {1}" -f $taskId, $owner)
  }
}
