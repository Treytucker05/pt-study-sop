param(
  [string]$WorktreesRoot = "C:\\Users\\treyt\\OneDrive\\Desktop\\pt-study-sop-worktrees",
  [string[]]$Paths = @(
    "CONTINUITY.md",
    "scholar/outputs/STATUS.md",
    "scholar/outputs/STATUS_BACKLOG.md"
  ),
  [switch]$IncludeMain,
  [switch]$Undo
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $root = (& git rev-parse --show-toplevel 2>$null)
  if (-not $root) {
    throw "Not inside a git repo."
  }
  return $root.Trim()
}

function Get-Worktrees {
  $lines = & git worktree list --porcelain
  $entries = @()
  $current = @{}
  foreach ($line in $lines) {
    if ($line -match "^worktree (.+)$") {
      if ($current.Count -gt 0) {
        $entries += [pscustomobject]$current
      }
      $current = @{ Path = $Matches[1] }
    }
  }
  if ($current.Count -gt 0) {
    $entries += [pscustomobject]$current
  }
  return $entries
}

$repoRoot = Get-RepoRoot
$targets = @()
foreach ($wt in Get-Worktrees) {
  if (-not $wt.Path) { continue }
  $normalizedPath = ($wt.Path -replace "/", "\\")
  if ($normalizedPath -eq $repoRoot -and -not $IncludeMain) { continue }
  if ($normalizedPath -ne $repoRoot -and -not ($normalizedPath.StartsWith($WorktreesRoot, [System.StringComparison]::OrdinalIgnoreCase))) {
    continue
  }
  $targets += $normalizedPath
}

if ($targets.Count -eq 0) {
  Write-Output "No worktrees matched. Check -WorktreesRoot or use -IncludeMain."
  return
}

$modeLabel = if ($Undo) { "no-skip-worktree" } else { "skip-worktree" }
Write-Output "Applying $modeLabel to: $($Paths -join ', ')"

foreach ($target in $targets) {
  foreach ($path in $Paths) {
    $fullPath = Join-Path $target $path
    if (-not (Test-Path $fullPath)) { continue }
    try {
      & git -C $target ls-files --error-unmatch -- $path 1>$null 2>$null
      if ($LASTEXITCODE -ne 0) { continue }
      if ($Undo) {
        & git -C $target update-index --no-skip-worktree -- $path 1>$null 2>$null
      } else {
        & git -C $target update-index --skip-worktree -- $path 1>$null 2>$null
      }
      Write-Output "OK: $target -> $path"
    } catch {
      Write-Output "SKIP: $target -> $path"
    }
  }
}
