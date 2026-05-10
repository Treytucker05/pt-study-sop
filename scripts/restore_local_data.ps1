# restore_local_data.ps1
# Restores sensitive/local files from a bundle created by bundle_local_data.ps1
# Run from repo root: .\scripts\restore_local_data.ps1 -BundlePath "path\to\local_data_bundle"

param(
    [Parameter(Mandatory=$true)]
    [string]$BundlePath
)

$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== PT Study Local Data Restore ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot"
Write-Host "Bundle:    $BundlePath"
Write-Host ""

# Handle zip file
if ($BundlePath.EndsWith(".zip")) {
    $ExtractPath = $BundlePath -replace "\.zip$", "_extracted"
    Write-Host "Extracting zip to: $ExtractPath" -ForegroundColor Yellow
    
    if (Test-Path $ExtractPath) {
        Remove-Item -Recurse -Force $ExtractPath
    }
    
    Expand-Archive -Path $BundlePath -DestinationPath $ExtractPath
    
    # Find the actual bundle folder inside
    $InnerFolder = Get-ChildItem -Path $ExtractPath -Directory | Select-Object -First 1
    if ($InnerFolder) {
        $BundlePath = $InnerFolder.FullName
    } else {
        $BundlePath = $ExtractPath
    }
    
    Write-Host "Using extracted path: $BundlePath" -ForegroundColor Green
    Write-Host ""
}

if (-not (Test-Path $BundlePath)) {
    Write-Host "ERROR: Bundle path not found: $BundlePath" -ForegroundColor Red
    exit 1
}

# Files to restore
$FilesToRestore = @(
    "brain\data\api_config.json",
    "brain\data\pt_study.db",
    "brain\data\gcal_token.json",
    "brain\data\vault_courses.yaml",
    "brain\.env"
)

$RestoredCount = 0
$SkippedCount = 0

foreach ($file in $FilesToRestore) {
    $SourcePath = Join-Path $BundlePath $file
    $DestPath = Join-Path $RepoRoot $file
    
    if (Test-Path $SourcePath) {
        # Create destination directory if needed
        $DestDir = Split-Path -Parent $DestPath
        if (-not (Test-Path $DestDir)) {
            New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        }
        
        # Check if destination exists
        if (Test-Path $DestPath) {
            Write-Host "[??] $file already exists" -ForegroundColor Yellow
            $response = Read-Host "     Overwrite? (y/N)"
            if ($response -ne "y" -and $response -ne "Y") {
                Write-Host "     Skipped" -ForegroundColor Gray
                $SkippedCount++
                continue
            }
        }
        
        Copy-Item $SourcePath -Destination $DestPath -Force
        Write-Host "[OK] $file" -ForegroundColor Green
        $RestoredCount++
    } else {
        Write-Host "[--] $file (not in bundle)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Files restored: $RestoredCount"
if ($SkippedCount -gt 0) {
    Write-Host "Files skipped:  $SkippedCount" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Edit brain\.env for this machine's local paths"
Write-Host "2. Run Start_Dashboard.bat on Windows or Start_Dashboard.command on macOS"
Write-Host "3. If Google Calendar doesn't work, verify the redirect URI matches the local port and re-authenticate"
Write-Host ""
