# Sync all study session logs, ingest them, and regenerate the resume in one go.
#
# Usage (from repo root):
#   pwsh -File brain\sync_all.ps1
#   pwsh -File brain\sync_all.ps1 -Force   # Re-ingest ALL files (bypass checksum tracking)
#
# What it does:
# 1) Pulls any stray markdown logs from the old location in DrCodePT-Swarm\pt-study-sop\logs.
# 2) Ingests every log under brain\session_logs\ (skips unchanged files unless -Force).
# 3) Regenerates brain\output\session_resume.md.

param(
    [switch]$Force  # When set, bypasses checksum tracking and re-ingests all files
)

$ErrorActionPreference = 'Stop'

$brainDir   = Split-Path $MyInvocation.MyCommand.Path -Parent
$root       = Split-Path $brainDir -Parent
$logsDir    = Join-Path $brainDir 'session_logs'
$oldLogsDir = Join-Path (Split-Path $root) 'DrCodePT-Swarm\pt-study-sop\logs'

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
$pythonArgs = @()
if (-not $pythonCmd) {
    $pythonCmd = Get-Command py -ErrorAction SilentlyContinue
    if ($pythonCmd) {
        $pythonArgs = @('-3')
    }
}
if (-not $pythonCmd) {
    Write-Host "Python not found. Install Python 3 or ensure py launcher is available." -ForegroundColor Red
    exit 1
}
$pythonExe = $pythonCmd.Source

Write-Host "== DrCodePT Brain Sync ==" -ForegroundColor Cyan

# Step 1: pull any stray logs from the old folder (if it exists)
if (Test-Path $oldLogsDir) {
    $oldLogs = Get-ChildItem $oldLogsDir -Filter *.md -File -ErrorAction SilentlyContinue
    if ($oldLogs) {
        Write-Host "Moving $($oldLogs.Count) log(s) from old path to $logsDir"
        foreach ($f in $oldLogs) {
            Move-Item -Force $f.FullName $logsDir
        }
    } else {
        Write-Host "No logs found in old path (good)."
    }
} else {
    Write-Host "Old path not found (skipping move)."
}

# Step 2: ingest all logs in canonical folder
$ingest = Join-Path $brainDir 'ingest_session.py'
$resume = Join-Path $brainDir 'generate_resume.py'

$logFiles = Get-ChildItem $logsDir -Filter *.md -File |
    Where-Object { $_.Name -notmatch '^TEMPLATE' } |
    Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}_.+\.md$' } |
    Sort-Object Name
if (-not $logFiles) {
    Write-Host "No session logs found in $logsDir. Nothing to ingest." -ForegroundColor Yellow
    exit 0
}

Write-Host "Ingesting $($logFiles.Count) log(s)..."
$skipped = 0
$ingested = 0
foreach ($file in $logFiles) {
    Write-Host " - $($file.Name)" -NoNewline
    $ingestArgs = @($ingest, $file.FullName)
    if ($Force) {
        $ingestArgs += '--force'
    }
    $output = & $pythonExe @pythonArgs @ingestArgs 2>&1
    if ($output -match '\[SKIP\]') {
        Write-Host " [SKIP]" -ForegroundColor DarkGray
        $skipped++
    } else {
        Write-Host " [OK]" -ForegroundColor Green
        $ingested++
    }
}

Write-Host ""
Write-Host "Summary: $ingested ingested, $skipped skipped (unchanged)" -ForegroundColor Cyan

# Step 3: regenerate resume
Write-Host "Regenerating session resume..."
& $pythonExe @pythonArgs $resume

Write-Host "Done."
