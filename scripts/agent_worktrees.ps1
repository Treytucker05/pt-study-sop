param(
  [ValidateSet("ensure", "list", "path", "route", "open", "dispatch", "open-many", "dispatch-many", "status", "help")]
  [string]$Action = "list",

  # Where to keep persistent named worktrees (outside the repo).
  [string]$WorktreesRoot = "C:\\pt-study-sop-worktrees",

  # Base ref for new worktrees if their branches don't exist yet.
  [string]$BaseRef = "main",

  [ValidateSet("integrate", "ui", "brain", "docs")]
  [string]$Role = "integrate",

  # Used by route/dispatch. Provide one or more files you expect to touch.
  [string[]]$Paths = @(),

  [ValidateSet("powershell", "codex", "claude", "opencode", "custom")]
  [string]$Tool = "powershell",

  # For open-many/dispatch-many, pass explicit agent list (e.g. -Agents codex,claude,opencode).
  [string[]]$Agents = @(),

  # Quick preset when -Agents is omitted.
  [ValidateSet("single", "review", "swarm")]
  [string]$Profile = "single",

  # Optional tool args appended verbatim. For open-many these apply to all tools.
  [string]$ToolArgs = "",

  # For Tool=custom (or Agents including custom), run this command in the new window.
  [string]$CustomCommand = "",

  # Optional label added to each terminal title.
  [string]$SessionTag = "",

  # Include a docs/tests-focused worktree.
  [switch]$IncludeDocs
)

$ErrorActionPreference = "Stop"

function Resolve-OpenCodeLauncherPath {
  param([string]$Mode = "solo")

  $candidates = New-Object System.Collections.Generic.List[string]

  $envKeys = @(
    "OHMYOPENCODE_LAUNCHER",
    "OHMY_OPENCODE_LAUNCHER",
    "PT_STUDY_OHMY_OPENCODE_LAUNCHER"
  )

  if ($Mode.ToLowerInvariant() -eq "swarm") {
    $envKeys = @(
      "OHMYOPENCODE_SWARM_LAUNCHER",
      "OHMYOPENCODE_LAUNCHER",
      "OHMY_OPENCODE_LAUNCHER",
      "PT_STUDY_OHMY_OPENCODE_LAUNCHER",
      "OPENCODE_SWARM_LAUNCHER",
      "OPEN_CODE_SWARM_LAUNCHER"
    ) + $envKeys
  } else {
    $envKeys = @(
      "OHMYOPENCODE_SOLO_LAUNCHER",
      "OPENCODE_REGULAR_LAUNCHER",
      "OPEN_CODE_REGULAR_LAUNCHER"
    ) + $envKeys
  }

  foreach ($key in $envKeys) {
    $value = [Environment]::GetEnvironmentVariable($key)
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      $candidates.Add($value)
    }
  }

  if ($env:USERPROFILE) {
    if ($Mode.ToLowerInvariant() -eq "swarm") {
      $candidates.Add((Join-Path $env:USERPROFILE "OneDrive\Desktop\Travel Laptop\Parallel Work\00_Parallel_Work_Center.bat"))
    } else {
      $candidates.Add((Join-Path $env:USERPROFILE "OneDrive\Desktop\Travel Laptop\OHMYOpenCode.bat"))
      $candidates.Add((Join-Path $env:USERPROFILE "OneDrive\Desktop\Travel Laptop\OpenCodeReg.bat"))
    }
  }

  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    try {
      $resolved = [System.IO.Path]::GetFullPath($candidate)
    } catch {
      $resolved = $candidate
    }

    if (Test-Path -LiteralPath $resolved -PathType Leaf) {
      return $resolved
    }
  }

  return ""
}

function Quote-CommandPart {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  if ($Value -match '\s') { return '"' + $Value + '"' }
  return $Value
}

function Normalize-FsPath {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) { return "" }
  $p = $Path.Trim() -replace '/', '\'
  try {
    return [System.IO.Path]::GetFullPath($p)
  } catch {
    return $p
  }
}

function Get-RepoRoot {
  $root = (& git rev-parse --show-toplevel 2>$null)
  if (-not $root) { throw "Not inside a git repo." }
  return (Normalize-FsPath $root)
}

function Get-Worktrees {
  $lines = & git worktree list --porcelain
  $items = @()
  $current = $null

  foreach ($line in $lines) {
    if ($line -like "worktree *") {
      if ($current) { $items += $current }
      $rawPath = ($line -replace "^worktree\s+", "").Trim()
      $current = [pscustomobject]@{ path = (Normalize-FsPath $rawPath); branch = ""; head = "" }
      continue
    }
    if (-not $current) { continue }
    if ($line -like "branch *") {
      $current.branch = ($line -replace "^branch\s+", "").Trim()
      continue
    }
    if ($line -like "HEAD *") {
      $current.head = ($line -replace "^HEAD\s+", "").Trim()
      continue
    }
  }

  if ($current) { $items += $current }
  return $items
}

function Ensure-Worktree {
  param(
    [string]$WorktreePath,
    [string]$BranchName
  )

  $worktreeFull = Normalize-FsPath $WorktreePath
  $branchRef = "refs/heads/$BranchName"

  if ($env:AGENT_WORKTREES_DEBUG -eq "1") {
    Write-Host "DEBUG: want path=[$worktreeFull] branch=[$branchRef]"
    $dbg = Get-Worktrees
    foreach ($wt in $dbg) {
      Write-Host "DEBUG: have path=[$($wt.path)] branch=[$($wt.branch)]"
    }
  }

  $existing = Get-Worktrees | Where-Object { $_.path -eq $worktreeFull -or $_.branch -eq $branchRef } | Select-Object -First 1
  if ($existing) {
    Write-Host "OK: worktree exists: $($existing.path) ($($existing.branch))"
    return
  }

  if (Test-Path $worktreeFull) {
    throw "Directory exists but is not registered as a worktree: $worktreeFull"
  }

  & git show-ref --verify --quiet $branchRef 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Creating worktree from existing branch: $BranchName -> $worktreeFull"
    & git worktree add $worktreeFull $BranchName | Out-Null
    return
  }

  Write-Host "Creating worktree: $BranchName ($BaseRef) -> $worktreeFull"
  & git worktree add -b $BranchName $worktreeFull $BaseRef | Out-Null
}

function Find-RoleEntry {
  param([object[]]$RoleMap, [string]$WantedRole)
  return $RoleMap | Where-Object { $_.role -eq $WantedRole } | Select-Object -First 1
}

function Route-RoleFromPaths {
  param(
    [string[]]$InputPaths,
    [string]$RepoRoot,
    [switch]$IncludeDocsRole
  )

  if (-not $InputPaths -or $InputPaths.Count -eq 0) {
    return "integrate"
  }

  $repoRootLower = $RepoRoot.ToLowerInvariant()
  $roles = New-Object System.Collections.Generic.HashSet[string]

  foreach ($p in $InputPaths) {
    if ([string]::IsNullOrWhiteSpace($p)) { continue }

    $full = if ([System.IO.Path]::IsPathRooted($p)) {
      [System.IO.Path]::GetFullPath($p)
    } else {
      [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $p))
    }

    $fullLower = $full.ToLowerInvariant()
    if (-not $fullLower.StartsWith($repoRootLower)) {
      $roles.Add("integrate") | Out-Null
      continue
    }

    $rel = $full.Substring($RepoRoot.Length).TrimStart([char[]]@('\', '/')) -replace '\\', '/'
    $top = ($rel -split "/", 2)[0].ToLowerInvariant()

    switch ($top) {
      "dashboard_rebuild" { $roles.Add("ui") | Out-Null }
      "brain"             { $roles.Add("brain") | Out-Null }
      "docs"              { if ($IncludeDocsRole) { $roles.Add("docs") | Out-Null } else { $roles.Add("integrate") | Out-Null } }
      "conductor"         { if ($IncludeDocsRole) { $roles.Add("docs") | Out-Null } else { $roles.Add("integrate") | Out-Null } }
      "scripts"           { if ($IncludeDocsRole) { $roles.Add("docs") | Out-Null } else { $roles.Add("integrate") | Out-Null } }
      default             { $roles.Add("integrate") | Out-Null }
    }
  }

  if ($roles.Count -eq 1) { return ($roles | Select-Object -First 1) }
  return "integrate"
}

function Get-DefaultArgsForTool {
  param([string]$ToolName)

  switch ($ToolName.ToLowerInvariant()) {
    "codex"    { return $env:AGENT_WORKTREE_CODEX_ARGS }
    "claude"   { return $env:AGENT_WORKTREE_CLAUDE_ARGS }
    "opencode" { return $env:AGENT_WORKTREE_OPENCODE_ARGS }
    default    { return "" }
  }
}

function Build-ToolCommand {
  param(
    [string]$ToolName,
    [string]$CommonArgs,
    [string]$CustomCmd,
    [string]$OpenCodeMode = "solo"
  )

  $toolLower = $ToolName.Trim().ToLowerInvariant()
  $effectiveArgs = $CommonArgs
  if ([string]::IsNullOrWhiteSpace($effectiveArgs)) {
    $effectiveArgs = Get-DefaultArgsForTool -ToolName $toolLower
  }

  switch ($toolLower) {
    "powershell" { return "" }
    "codex"      { return "codex $effectiveArgs".Trim() }
    "claude"     { return "claude $effectiveArgs".Trim() }
    "opencode"   {
      $launcher = Resolve-OpenCodeLauncherPath -Mode $OpenCodeMode
      if ([string]::IsNullOrWhiteSpace($launcher)) {
        return "opencode $effectiveArgs".Trim()
      }
      $cmd = "$(Quote-CommandPart $launcher) /nopause"
      if ([string]::IsNullOrWhiteSpace($effectiveArgs)) { return $cmd }
      return "$cmd $effectiveArgs".Trim()
    }
    "custom" {
      if ([string]::IsNullOrWhiteSpace($CustomCmd)) {
        throw "Tool 'custom' requires -CustomCommand."
      }
      return $CustomCmd
    }
    default { throw "Unsupported tool: $ToolName" }
  }
}

function Resolve-AgentList {
  param(
    [string[]]$Requested,
    [string]$ProfileName,
    [string]$SingleTool
  )

  $source = @()
  if ($Requested -and $Requested.Count -gt 0) {
    $source = $Requested
  } else {
    switch ($ProfileName) {
      "single" { $source = @($SingleTool) }
      "review" { $source = @("codex", "claude") }
      "swarm"  { $source = @("codex", "claude", "opencode") }
      default  { $source = @($SingleTool) }
    }
  }

  $allowed = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  @("powershell", "codex", "claude", "opencode", "custom") | ForEach-Object { [void]$allowed.Add($_) }
  $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  $result = New-Object System.Collections.Generic.List[string]

  foreach ($item in $source) {
    if ([string]::IsNullOrWhiteSpace($item)) { continue }
    $parts = $item -split ","
    foreach ($part in $parts) {
      $name = $part.Trim().ToLowerInvariant()
      if ([string]::IsNullOrWhiteSpace($name)) { continue }
      if (-not $allowed.Contains($name)) {
        throw "Unknown agent/tool '$name'. Allowed: powershell, codex, claude, opencode, custom"
      }
      if ($seen.Add($name)) {
        $result.Add($name) | Out-Null
      }
    }
  }

  if ($result.Count -eq 0) {
    throw "No valid agents/tools resolved. Use -Agents or choose a different -Profile."
  }

  return @($result)
}

function Open-ToolInWorktree {
  param(
    [object]$Entry,
    [string]$ToolName,
    [string]$CommonArgs,
    [string]$CustomCmd,
    [string]$Tag,
    [string]$OpenCodeMode = "solo"
  )

  Ensure-Worktree -WorktreePath $Entry.dir -BranchName $Entry.branch
  $cmd = Build-ToolCommand -ToolName $ToolName -CommonArgs $CommonArgs -CustomCmd $CustomCmd -OpenCodeMode $OpenCodeMode

  $titleParts = @("pt-study-sop", $Entry.role, $ToolName)
  if (-not [string]::IsNullOrWhiteSpace($Tag)) {
    $titleParts += $Tag
  }
  $title = ($titleParts -join ":").Replace("'", "''")

  $safeRole = $Entry.role.Replace("'", "''")
  $safeTool = $ToolName.Replace("'", "''")
  $safeTag = $Tag.Replace("'", "''")
  $safeWorktree = $Entry.dir.Replace("'", "''")
  $agentNameParts = @($ToolName, $Entry.role)
  if (-not [string]::IsNullOrWhiteSpace($Tag)) {
    $agentNameParts += $Tag
  }
  $agentName = ($agentNameParts -join "-").Replace(" ", "_")
  $safeAgentName = $agentName.Replace("'", "''")

  $command = "`$host.UI.RawUI.WindowTitle = '$title'; if (-not `$env:TERM -or `$env:TERM -eq 'dumb') { `$env:TERM = 'xterm-256color' }; `$env:PT_AGENT_NAME = '$safeAgentName'; `$env:PT_AGENT_ROLE = '$safeRole'; `$env:PT_AGENT_TOOL = '$safeTool'; `$env:PT_AGENT_WORKTREE = '$safeWorktree'; `$env:PT_AGENT_SESSION = '$safeTag'; cd `"$($Entry.dir)`"; if (Test-Path '.\scripts\agent_task_board.py') { function task-board { python .\scripts\agent_task_board.py @args }; Write-Host '[task-board] use: task-board list | task-board claim --task-id T-001' -ForegroundColor Cyan }"
  if (-not [string]::IsNullOrWhiteSpace($cmd)) {
    $command = "$command $cmd"
  }

  Start-Process powershell -ArgumentList "-NoExit", "-Command", $command | Out-Null
}

function Print-Help {
  Write-Host "agent_worktrees.ps1"
  Write-Host ""
  Write-Host "Actions:"
  Write-Host "  ensure        Ensure named worktrees exist (integrate/ui/brain[/docs])"
  Write-Host "  list          Show role -> branch -> path mapping and git worktree list"
  Write-Host "  status        Show branch + dirty count per role worktree"
  Write-Host "  route         Pick role from -Paths"
  Write-Host "  open          Open one tool in one role worktree"
  Write-Host "  open-many     Open multiple tools in one role worktree"
  Write-Host "  dispatch      Route by -Paths then open one tool"
  Write-Host "  dispatch-many Route by -Paths then open multiple tools"
  Write-Host "  path          Print filesystem path for a role"
  Write-Host "  help          Show this help"
  Write-Host ""
  Write-Host "Profiles:"
  Write-Host "  single (default): one tool (from -Tool)"
  Write-Host "  review: codex + claude"
  Write-Host "  swarm: codex + claude + opencode"
  Write-Host ""
  Write-Host "Examples:"
  Write-Host "  pwsh -File .\scripts\agent_worktrees.ps1 -Action ensure -IncludeDocs"
  Write-Host "  pwsh -File .\scripts\agent_worktrees.ps1 -Action open -Role ui -Tool codex -SessionTag ui-pass"
  Write-Host "  pwsh -File .\scripts\agent_worktrees.ps1 -Action open-many -Role brain -Profile swarm -SessionTag bugfix"
  Write-Host "  pwsh -File .\scripts\agent_worktrees.ps1 -Action dispatch-many -Paths dashboard_rebuild\client\src\pages\brain.tsx -Agents codex,opencode"
  Write-Host ""
  Write-Host "Optional per-tool default args env vars:"
  Write-Host "  AGENT_WORKTREE_CODEX_ARGS"
  Write-Host "  AGENT_WORKTREE_CLAUDE_ARGS"
  Write-Host "  AGENT_WORKTREE_OPENCODE_ARGS"
}

$repoRoot = Get-RepoRoot
if (-not (Test-Path $WorktreesRoot)) {
  New-Item -ItemType Directory -Force -Path $WorktreesRoot | Out-Null
}

$map = @(
  [ordered]@{ role = "integrate"; branch = "wt/integrate"; dir = (Join-Path $WorktreesRoot "integrate") },
  [ordered]@{ role = "ui";        branch = "wt/ui";        dir = (Join-Path $WorktreesRoot "ui") },
  [ordered]@{ role = "brain";     branch = "wt/brain";     dir = (Join-Path $WorktreesRoot "brain") }
)
if ($IncludeDocs) {
  $map += [ordered]@{ role = "docs"; branch = "wt/docs"; dir = (Join-Path $WorktreesRoot "docs") }
}

switch ($Action) {
  "help" {
    Print-Help
    exit 0
  }

  "ensure" {
    Write-Host "Repo: $repoRoot"
    Write-Host "WorktreesRoot: $WorktreesRoot"
    foreach ($e in $map) {
      Ensure-Worktree -WorktreePath $e.dir -BranchName $e.branch
    }
    Write-Host ""
    & git worktree list
    exit 0
  }

  "list" {
    Write-Host "Repo: $repoRoot"
    Write-Host "WorktreesRoot: $WorktreesRoot"
    Write-Host ""
    Write-Host "Named roles:"
    foreach ($e in $map) {
      Write-Host ("- {0,-10} {1,-14} {2}" -f $e.role, $e.branch, $e.dir)
    }
    Write-Host ""
    & git worktree list
    exit 0
  }

  "status" {
    Write-Host "Repo: $repoRoot"
    Write-Host "WorktreesRoot: $WorktreesRoot"
    Write-Host ""
    foreach ($e in $map) {
      $dir = Normalize-FsPath $e.dir
      if (-not (Test-Path $dir)) {
        Write-Host ("- {0,-10} missing       {1}" -f $e.role, $dir)
        continue
      }

      $branch = (& git -C $dir branch --show-current 2>$null).Trim()
      if ([string]::IsNullOrWhiteSpace($branch)) { $branch = "(detached)" }
      $dirtyCount = @(& git -C $dir status --short 2>$null).Count
      Write-Host ("- {0,-10} branch={1,-16} dirty={2,-4} {3}" -f $e.role, $branch, $dirtyCount, $dir)
    }
    exit 0
  }

  "path" {
    $entry = Find-RoleEntry -RoleMap $map -WantedRole $Role
    if (-not $entry) { throw "Unknown role: $Role" }
    Write-Output $entry.dir
    exit 0
  }

  "route" {
    $r = Route-RoleFromPaths -InputPaths $Paths -RepoRoot $repoRoot -IncludeDocsRole:$IncludeDocs
    Write-Output $r
    exit 0
  }

  "open" {
    $entry = Find-RoleEntry -RoleMap $map -WantedRole $Role
    if (-not $entry) { throw "Unknown role: $Role" }
    Open-ToolInWorktree -Entry $entry -ToolName $Tool -CommonArgs $ToolArgs -CustomCmd $CustomCommand -Tag $SessionTag -OpenCodeMode "solo"
    Write-Host "Opened $Tool for role '$Role' at: $($entry.dir)"
    exit 0
  }

  "open-many" {
    $entry = Find-RoleEntry -RoleMap $map -WantedRole $Role
    if (-not $entry) { throw "Unknown role: $Role" }

    $toolList = Resolve-AgentList -Requested $Agents -ProfileName $Profile -SingleTool $Tool
    foreach ($toolName in $toolList) {
      $toolMode = if ($Profile -eq "swarm" -and $toolName -eq "opencode") { "swarm" } else { "solo" }
      Open-ToolInWorktree -Entry $entry -ToolName $toolName -CommonArgs $ToolArgs -CustomCmd $CustomCommand -Tag $SessionTag -OpenCodeMode $toolMode
      Write-Host "Opened $toolName for role '$Role' at: $($entry.dir)"
    }
    exit 0
  }

  "dispatch" {
    $r = Route-RoleFromPaths -InputPaths $Paths -RepoRoot $repoRoot -IncludeDocsRole:$IncludeDocs
    $entry = Find-RoleEntry -RoleMap $map -WantedRole $r
    if (-not $entry) { throw "Role not available (try -IncludeDocs?): $r" }

    Open-ToolInWorktree -Entry $entry -ToolName $Tool -CommonArgs $ToolArgs -CustomCmd $CustomCommand -Tag $SessionTag -OpenCodeMode "solo"
    Write-Host "Dispatched $Tool to role '$r' at: $($entry.dir)"
    exit 0
  }

  "dispatch-many" {
    $r = Route-RoleFromPaths -InputPaths $Paths -RepoRoot $repoRoot -IncludeDocsRole:$IncludeDocs
    $entry = Find-RoleEntry -RoleMap $map -WantedRole $r
    if (-not $entry) { throw "Role not available (try -IncludeDocs?): $r" }

    $toolList = Resolve-AgentList -Requested $Agents -ProfileName $Profile -SingleTool $Tool
    foreach ($toolName in $toolList) {
      $toolMode = if ($Profile -eq "swarm" -and $toolName -eq "opencode") { "swarm" } else { "solo" }
      Open-ToolInWorktree -Entry $entry -ToolName $toolName -CommonArgs $ToolArgs -CustomCmd $CustomCommand -Tag $SessionTag -OpenCodeMode $toolMode
      Write-Host "Dispatched $toolName to role '$r' at: $($entry.dir)"
    }
    exit 0
  }
}

throw "Unhandled action: $Action"
