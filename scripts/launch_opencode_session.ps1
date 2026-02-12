param(
  [string]$Task = "",
  [string]$SessionName = "",
  [string]$WorktreesRoot = "C:\\Users\\treyt\\OneDrive\\Desktop\\pt-study-sop-worktrees",
  [string]$BaseRef = "HEAD",
  [string]$OpenCodeCmd = "opencode",
  [string]$OpenCodeArgs = ""
)

$ErrorActionPreference = "Stop"

Write-Host "launch_opencode_session.ps1 is deprecated. Use launch_codex_session.ps1 with -Tool opencode instead."

& (Join-Path $PSScriptRoot "launch_codex_session.ps1") `
  -Task $Task `
  -SessionName $SessionName `
  -WorktreesRoot $WorktreesRoot `
  -BaseRef $BaseRef `
  -Tool "opencode" `
  -ToolArgs $OpenCodeArgs `
  -OpenCodeCmd $OpenCodeCmd
