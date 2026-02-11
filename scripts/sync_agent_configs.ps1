param(
  [switch]$DryRun
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot "ai-config\\claude-commands"
$destDir = "C:\\Users\\treyt\\.claude\\commands"
$files = @("statusline.md", "subagents.md", "analytics.md")
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

foreach ($file in $files) {
  $src = Join-Path $sourceDir $file
  $dst = Join-Path $destDir $file

  if (-not (Test-Path $src)) {
    Write-Warning "Missing source file: $src"
    continue
  }

  if (Test-Path $dst) {
    $backup = "$dst.bak.$timestamp"
    if ($DryRun) {
      Write-Host "DRY-RUN: Backup $dst -> $backup"
    } else {
      Copy-Item $dst $backup -Force
    }
  }

  if ($DryRun) {
    Write-Host "DRY-RUN: Copy $src -> $dst"
  } else {
    Copy-Item $src $dst -Force
  }
}
