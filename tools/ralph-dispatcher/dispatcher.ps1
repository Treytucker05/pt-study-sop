param()

$ErrorActionPreference = "Stop"

function Write-TextFile {
  param(
    [string]$Path,
    [string]$Content
  )
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $normalized = $Content -replace "`r`n", "`n"
  [System.IO.File]::WriteAllText($Path, $normalized, $utf8NoBom)
}

function Convert-ToWslPath {
  param([string]$Path)
  $full = [System.IO.Path]::GetFullPath($Path)
  if ($full -match '^[A-Za-z]:\\') {
    $drive = $full.Substring(0, 1).ToLower()
    $rest = $full.Substring(2) -replace '\\', '/'
    return "/mnt/$drive$rest"
  }
  return $full -replace '\\', '/'
}

function Read-YesNo {
  param(
    [string]$Prompt,
    [bool]$DefaultYes = $true
  )
  $suffix = if ($DefaultYes) { " [Y/n]" } else { " [y/N]" }
  while ($true) {
    $input = Read-Host "$Prompt$suffix"
    if ([string]::IsNullOrWhiteSpace($input)) { return $DefaultYes }
    switch ($input.Trim().ToLower()) {
      'y' { return $true }
      'yes' { return $true }
      'n' { return $false }
      'no' { return $false }
    }
  }
}

Write-Host ""
Write-Host "Ralph Dispatcher (Codex CLI)"
Write-Host "This uses your ChatGPT login (no API keys)."
Write-Host ""

# Check WSL
try {
  & wsl.exe --status | Out-Null
} catch {
  Write-Host "WSL is not available. Install WSL, then rerun this." -ForegroundColor Red
  exit 1
}

# Check Codex CLI
$codexPath = & wsl.exe -e bash -lc "command -v codex" 2>$null
if ([string]::IsNullOrWhiteSpace($codexPath)) {
  Write-Host "Codex CLI not found in WSL." -ForegroundColor Red
  Write-Host "Install it in WSL, then run: codex login"
  exit 1
}

# Check login (best effort)
& wsl.exe -e bash -lc "test -f ~/.codex/auth.json"
if ($LASTEXITCODE -ne 0) {
  if (Read-YesNo "Codex login not found. Run 'codex login' now?" $true) {
    & wsl.exe -e bash -lc "codex login"
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Login failed or was canceled." -ForegroundColor Red
      exit 1
    }
  } else {
    Write-Host "Canceled. Run 'codex login' in WSL later." -ForegroundColor Yellow
    exit 1
  }
}

# Goal
$goal = ""
while ([string]::IsNullOrWhiteSpace($goal)) {
  $goal = Read-Host "Goal (what should the workers accomplish)?"
}

# Workspace
$defaultWorkspace = [Environment]::GetFolderPath("Desktop")
$workspace = Read-Host "Workspace folder (Enter for Desktop: $defaultWorkspace)"
if ([string]::IsNullOrWhiteSpace($workspace)) {
  $workspace = $defaultWorkspace
}
if (-not (Test-Path $workspace)) {
  if (Read-YesNo "That folder does not exist. Create it?" $true) {
    New-Item -ItemType Directory -Path $workspace | Out-Null
  } else {
    Write-Host "Canceled." -ForegroundColor Yellow
    exit 1
  }
}

# Workers
$workerCount = 3
while ($true) {
  $workersInput = Read-Host "How many workers? (default 3, 1-8)"
  if ([string]::IsNullOrWhiteSpace($workersInput)) { break }
  $tmp = 0
  if ([int]::TryParse($workersInput, [ref]$tmp) -and $tmp -ge 1 -and $tmp -le 8) {
    $workerCount = $tmp
    break
  }
  Write-Host "Please enter a number from 1 to 8." -ForegroundColor Yellow
}

# Prepare run folder
$baseDir = $PSScriptRoot
$runId = Get-Date -Format "yyyyMMdd_HHmmss"
$runDir = Join-Path $baseDir ("runs\\" + $runId)
New-Item -ItemType Directory -Path $runDir | Out-Null

$schemaPath = Join-Path $baseDir "schema.json"
if (-not (Test-Path $schemaPath)) {
  $schema = @"
{
  ""type"": ""object"",
  ""properties"": {
    ""tasks"": {
      ""type"": ""array"",
      ""items"": { ""type"": ""string"" },
      ""minItems"": 1
    }
  },
  ""required"": [""tasks""],
  ""additionalProperties"": false
}
"@
  Write-TextFile -Path $schemaPath -Content $schema
}

$promptPath = Join-Path $runDir "prompt.txt"
$prompt = @"
You are a planner. Split the goal into exactly $workerCount concrete tasks that can run in parallel.
Each task must be a single sentence, start with an action verb, and be specific about expected outputs.
Do not include dependencies between tasks.
Return only JSON that matches the schema.
Goal:
$goal
"@
Write-TextFile -Path $promptPath -Content $prompt

# Run planner
$wslSchema = Convert-ToWslPath $schemaPath
$wslPrompt = Convert-ToWslPath $promptPath
$tasksPath = Join-Path $runDir "tasks.json"
$wslTasks = Convert-ToWslPath $tasksPath

Write-Host "Planning tasks with Codex..."
& wsl.exe -e bash -lc "codex exec --skip-git-repo-check --output-schema '$wslSchema' -o '$wslTasks' - < '$wslPrompt'"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Task planning failed. Check Codex login and try again." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $tasksPath)) {
  Write-Host "Task planning did not produce tasks.json." -ForegroundColor Red
  exit 1
}

$data = Get-Content -Path $tasksPath -Raw | ConvertFrom-Json
$tasks = $data.tasks
if (-not $tasks -or $tasks.Count -eq 0) {
  Write-Host "No tasks returned. Try a more specific goal." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Planned tasks:"
for ($i = 0; $i -lt $tasks.Count; $i++) {
  $num = $i + 1
  Write-Host "  $num) $($tasks[$i])"
}
Write-Host ""

if (-not (Read-YesNo "Launch workers now?" $true)) {
  Write-Host "Canceled. Tasks saved at: $tasksPath" -ForegroundColor Yellow
  exit 0
}

$wslWorkspace = Convert-ToWslPath $workspace
$wslRunDir = Convert-ToWslPath $runDir

# Create worker scripts and launch
for ($i = 0; $i -lt $tasks.Count; $i++) {
  $num = $i + 1
  $taskFile = Join-Path $runDir "task-$num.txt"
  Write-TextFile -Path $taskFile -Content $tasks[$i]

  $wslTask = Convert-ToWslPath $taskFile
  $logPath = Join-Path $runDir "worker-$num.txt"
  $wslLog = Convert-ToWslPath $logPath
  $workerCmdPath = Join-Path $runDir "worker-$num.cmd"

  $workerCmd = @"
@echo off
setlocal
wsl.exe -e bash -lc ""codex exec --full-auto --sandbox workspace-write --skip-git-repo-check -C '$wslWorkspace' - < '$wslTask' | tee '$wslLog'""
"@
  Write-TextFile -Path $workerCmdPath -Content $workerCmd

  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "`"$workerCmdPath`"" -WorkingDirectory $runDir
}

# Optional: open Ralph TUI
$ralphBat = "C:\Users\treyt\OneDrive\Desktop\pt-study-sop\Run_Ralph.bat"
if (Test-Path $ralphBat) {
  if (Read-YesNo "Open Ralph TUI as well?" $false) {
    Start-Process -FilePath $ralphBat
  }
}

Write-Host ""
Write-Host "Launched $($tasks.Count) worker(s)."
Write-Host "Run folder: $runDir"
Write-Host "Each worker log is saved as worker-#.txt in that folder."
Write-Host ""

