[CmdletBinding()]
param(
  [string]$RepoRoot = "C:\pt-study-sop",
  [string]$BoardPath = "",
  [int]$LogRetentionDays = 14,
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-ModeHeader {
  if ($Apply) {
    Write-Host "APPLY mode: cleanup will make changes." -ForegroundColor Yellow
  } else {
    Write-Host "DRY RUN mode: no files will be deleted." -ForegroundColor Cyan
  }
}

function Get-FullPathSafe {
  param([string]$PathValue)
  return [System.IO.Path]::GetFullPath($PathValue)
}

function Test-IsUnderRepo {
  param(
    [string]$Root,
    [string]$Candidate
  )

  $rootFull = (Get-FullPathSafe -PathValue $Root).TrimEnd('\')
  $candidateFull = (Get-FullPathSafe -PathValue $Candidate).TrimEnd('\')
  return $candidateFull.StartsWith($rootFull + "\", [System.StringComparison]::OrdinalIgnoreCase) -or
         $candidateFull.Equals($rootFull, [System.StringComparison]::OrdinalIgnoreCase)
}

function Remove-ItemSafe {
  param(
    [string]$Repo,
    [string]$PathToRemove
  )

  if (-not (Test-IsUnderRepo -Root $Repo -Candidate $PathToRemove)) {
    Write-Warning "Skip (outside repo scope): $PathToRemove"
    return
  }

  if ($PathToRemove -match "\\\.git($|\\)") {
    Write-Warning "Skip protected path: $PathToRemove"
    return
  }

  if ($Apply) {
    if (Test-Path -LiteralPath $PathToRemove) {
      Remove-Item -LiteralPath $PathToRemove -Recurse -Force
      Write-Host "Removed: $PathToRemove"
    }
  } else {
    Write-Host "[DRY RUN] Remove: $PathToRemove"
  }
}

function Get-CompletedCodexAgentsFromBoard {
  param([string]$TaskBoardPath)

  $completed = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  if (-not (Test-Path -LiteralPath $TaskBoardPath)) {
    return $completed
  }

  try {
    $raw = Get-Content -LiteralPath $TaskBoardPath -Raw
    $json = $raw | ConvertFrom-Json
  } catch {
    Write-Warning "Could not parse task board JSON: $TaskBoardPath"
    return $completed
  }

  if (-not $json.tasks) {
    return $completed
  }

  foreach ($task in $json.tasks) {
    $status = ("" + $task.status).ToLowerInvariant()
    if ($status -notin @("done", "complete", "completed", "closed")) {
      continue
    }

    $ownerAgent = "" + $task.owner_agent
    if ($ownerAgent -match "^codex-\d+$") {
      [void]$completed.Add($ownerAgent)
    }

    $assignee = "" + $task.assignee
    if ($assignee -match "^codex-\d+$") {
      [void]$completed.Add($assignee)
    }

    $ownerWorktree = "" + $task.owner_worktree
    if ($ownerWorktree -match "codex-(\d+)$") {
      [void]$completed.Add("codex-$($Matches[1])")
    }
  }

  return $completed
}

function Get-MergedBranchSet {
  param([string]$GitRepoRoot)
  $set = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

  $lines = & git -C $GitRepoRoot branch --format="%(refname:short)" --merged 2>$null
  if ($LASTEXITCODE -ne 0) {
    return $set
  }

  foreach ($line in $lines) {
    $branch = $line.Trim()
    if (-not [string]::IsNullOrWhiteSpace($branch)) {
      [void]$set.Add($branch)
    }
  }
  return $set
}

function Remove-CodexWorktreeIfEligible {
  param(
    [string]$GitRepoRoot,
    [string]$WorktreePath,
    [System.Collections.Generic.HashSet[string]]$MergedBranches,
    [System.Collections.Generic.HashSet[string]]$CompletedAgents
  )

  $name = Split-Path -Path $WorktreePath -Leaf
  if (-not (Test-Path -LiteralPath $WorktreePath)) {
    return
  }

  $status = (& git -C $WorktreePath status --porcelain 2>$null)
  $isClean = ($LASTEXITCODE -eq 0) -and ($status.Count -eq 0)

  $branch = (& git -C $WorktreePath rev-parse --abbrev-ref HEAD 2>$null).Trim()
  $isMerged = $false
  if ($branch -and $branch -ne "HEAD") {
    $isMerged = $MergedBranches.Contains($branch)
  }

  $isCompleteInBoard = $CompletedAgents.Contains($name)
  $eligible = $isClean -and ($isMerged -or $isCompleteInBoard)

  if ($eligible) {
    if ($Apply) {
      & git -C $GitRepoRoot worktree remove $WorktreePath
      if ($LASTEXITCODE -eq 0) {
        Write-Host "Removed worktree: $WorktreePath"
      } else {
        Write-Warning "Failed to remove worktree: $WorktreePath"
      }
    } else {
      Write-Host ("[DRY RUN] Remove worktree: {0} (clean={1}, merged={2}, complete={3})" -f $WorktreePath, $isClean, $isMerged, $isCompleteInBoard)
    }
  } else {
    Write-Host ("Keep worktree: {0} (clean={1}, merged={2}, complete={3})" -f $WorktreePath, $isClean, $isMerged, $isCompleteInBoard)
  }
}

Write-ModeHeader

$RepoRoot = Get-FullPathSafe -PathValue $RepoRoot
if (-not (Test-Path -LiteralPath $RepoRoot)) {
  throw "Repo root not found: $RepoRoot"
}
if (-not (Test-IsUnderRepo -Root $RepoRoot -Candidate $RepoRoot)) {
  throw "Invalid repo root scope."
}

& git -C $RepoRoot rev-parse --show-toplevel 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "RepoRoot is not a git repository: $RepoRoot"
}

if ([string]::IsNullOrWhiteSpace($BoardPath)) {
  $BoardPath = Join-Path $RepoRoot "tasks\swarm_task_board.json"
}
$BoardPath = Get-FullPathSafe -PathValue $BoardPath

Write-Host ""
Write-Host "RepoRoot: $RepoRoot"
Write-Host "BoardPath: $BoardPath"
Write-Host "Log retention: $LogRetentionDays days"

Write-Host ""
Write-Host "Scanning codex worktrees..."
$completedAgents = Get-CompletedCodexAgentsFromBoard -TaskBoardPath $BoardPath
$mergedBranches = Get-MergedBranchSet -GitRepoRoot $RepoRoot

$worktreeRoot = Join-Path $RepoRoot "worktrees"
if (Test-Path -LiteralPath $worktreeRoot) {
  $codexWorktrees = Get-ChildItem -LiteralPath $worktreeRoot -Directory -Filter "codex-*"
  foreach ($wt in $codexWorktrees) {
    Remove-CodexWorktreeIfEligible `
      -GitRepoRoot $RepoRoot `
      -WorktreePath $wt.FullName `
      -MergedBranches $mergedBranches `
      -CompletedAgents $completedAgents
  }
} else {
  Write-Host "No worktree directory found: $worktreeRoot"
}

Write-Host ""
Write-Host "Pruning agent logs older than $LogRetentionDays days..."
$logsRoot = Join-Path $RepoRoot "logs\agents"
if (Test-Path -LiteralPath $logsRoot) {
  $cutoff = (Get-Date).AddDays(-1 * [Math]::Abs($LogRetentionDays))
  $oldFiles = Get-ChildItem -LiteralPath $logsRoot -File -Recurse | Where-Object { $_.LastWriteTime -lt $cutoff }
  foreach ($file in $oldFiles) {
    if ($Apply) {
      Remove-ItemSafe -Repo $RepoRoot -PathToRemove $file.FullName
    } else {
      Write-Host ("[DRY RUN] Remove old log: {0}" -f $file.FullName)
    }
  }

  if ($Apply) {
    Get-ChildItem -LiteralPath $logsRoot -Directory -Recurse |
      Sort-Object -Property FullName -Descending |
      ForEach-Object {
        if ((Get-ChildItem -LiteralPath $_.FullName -Force | Measure-Object).Count -eq 0) {
          Remove-ItemSafe -Repo $RepoRoot -PathToRemove $_.FullName
        }
      }
  }
} else {
  Write-Host "No logs directory found: $logsRoot"
}

Write-Host ""
Write-Host "Cleaning known swarm temp artifacts..."
$knownTemps = @(
  (Join-Path $RepoRoot ".swarm\runtime"),
  (Join-Path $RepoRoot ".swarm\last_launch.json"),
  (Join-Path $RepoRoot "tasks\swarm_task_board.json.lock")
)

foreach ($item in $knownTemps) {
  if (Test-Path -LiteralPath $item) {
    Remove-ItemSafe -Repo $RepoRoot -PathToRemove $item
  } else {
    Write-Host "Not found: $item"
  }
}

Write-Host ""
Write-Host "Cleanup complete."
if (-not $Apply) {
  Write-Host "No changes were made. Re-run with -Apply to execute cleanup."
}
