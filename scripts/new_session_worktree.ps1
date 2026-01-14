$ErrorActionPreference = "Stop"

param(
  [string]$Task = "",
  [string]$WorktreesRoot = "C:\\Users\\treyt\\OneDrive\\Desktop\\pt-study-sop-worktrees",
  [string]$BaseRef = "HEAD",
  [switch]$OpenShell,
  [switch]$CopyBacklogEnv
)

function Get-RepoRoot {
  $root = (& git rev-parse --show-toplevel 2>$null)
  if (-not $root) {
    throw "Not inside a git repo."
  }
  return $root.Trim()
}

function New-SessionName {
  param([string]$TaskName)
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  if ([string]::IsNullOrWhiteSpace($TaskName)) {
    return "session_$stamp"
  }
  $slug = $TaskName.ToLowerInvariant()
  $slug = $slug -replace "[^a-z0-9\- ]", ""
  $slug = $slug -replace "\s+", "-"
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) {
    return "session_$stamp"
  }
  return "${stamp}_$slug"
}

$repoRoot = Get-RepoRoot
if (!(Test-Path $WorktreesRoot)) {
  New-Item -ItemType Directory -Force -Path $WorktreesRoot | Out-Null
}

$sessionName = New-SessionName -TaskName $Task
$worktreePath = Join-Path $WorktreesRoot $sessionName
$branchName = "session/$sessionName"

& git worktree add -b $branchName $worktreePath $BaseRef | Out-Null

$sessionNote = @()
$sessionNote += "# Codex Session"
$sessionNote += ""
$sessionNote += "- Created: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$sessionNote += "- Task: $Task"
$sessionNote += "- Repo: $repoRoot"
$sessionNote += "- Branch: $branchName"
$sessionNote += "- BaseRef: $BaseRef"
$sessionNote += ""
$sessionNote | Set-Content -Path (Join-Path $worktreePath "SESSION.md") -Encoding UTF8

$localStatePaths = @(
  "CONTINUITY.md",
  "scholar/outputs/STATUS.md",
  "scholar/outputs/STATUS_BACKLOG.md"
)
foreach ($path in $localStatePaths) {
  $fullPath = Join-Path $worktreePath $path
  if (-not (Test-Path $fullPath)) { continue }
  try {
    & git -C $worktreePath ls-files --error-unmatch -- $path 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) {
      & git -C $worktreePath update-index --skip-worktree -- $path 1>$null 2>$null
    }
  } catch {
    # Skip if git refuses the path (untracked or missing)
  }
}

if ($CopyBacklogEnv) {
  $srcEnv = Join-Path $repoRoot "scripts\\backlog-agent\\.env"
  $destEnv = Join-Path $worktreePath "scripts\\backlog-agent\\.env"
  if (Test-Path $srcEnv) {
    $destDir = Split-Path -Path $destEnv -Parent
    if (!(Test-Path $destDir)) {
      New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    Copy-Item -Path $srcEnv -Destination $destEnv -Force
  }
}

Write-Output "Worktree created: $worktreePath"
Write-Output "Branch: $branchName"

if ($OpenShell) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$worktreePath`""
}
