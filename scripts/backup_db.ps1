<#
.SYNOPSIS
  Backup pt_study.db with timestamp, retain last N copies.
.DESCRIPTION
  Copies brain/data/pt_study.db to brain/data/backups/ with YYYYMMDD_HHmmss suffix.
  Deletes oldest backups beyond the retention limit (default 20).
#>

param(
    [int]$Retain = 20
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dbPath = Join-Path $root "brain\data\pt_study.db"
$backupDir = Join-Path $root "brain\data\backups"

if (-not (Test-Path $dbPath)) {
    Write-Host "[ERROR] Database not found: $dbPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "[INFO] Created backup directory: $backupDir"
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "pt_study_$timestamp.db"

# Note: copying a live SQLite DB is safe for single-user apps (WAL mode handles this).
# For guaranteed consistency under concurrent writes, use: sqlite3 $dbPath ".backup $backupFile"
Copy-Item -Path $dbPath -Destination $backupFile -Force
$sizeMB = [math]::Round((Get-Item $backupFile).Length / 1MB, 2)
Write-Host "[OK] Backup created: $backupFile ($sizeMB MB)" -ForegroundColor Green

# Prune old backups
$backups = Get-ChildItem -Path $backupDir -Filter "pt_study_*.db" | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt $Retain) {
    $toDelete = $backups | Select-Object -Skip $Retain
    foreach ($old in $toDelete) {
        Remove-Item $old.FullName -Force
        Write-Host "[PRUNED] $($old.Name)" -ForegroundColor Yellow
    }
}

$remaining = (Get-ChildItem -Path $backupDir -Filter "pt_study_*.db").Count
Write-Host "[INFO] $remaining backups retained (limit: $Retain)" -ForegroundColor Cyan
