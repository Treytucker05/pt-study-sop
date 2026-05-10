# bundle_local_data.ps1
# Bundles sensitive/local files for transfer to another machine
# Run from repo root: .\scripts\bundle_local_data.ps1

param(
    [string]$OutputPath = ".\local_data_bundle"
)

$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== PT Study Local Data Bundler ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot"
Write-Host ""

# Files to bundle (relative to repo root)
$FilesToBundle = @(
    @{ Path = "brain\data\api_config.json"; Required = $false; Description = "API keys (OpenRouter, OpenAI)" },
    @{ Path = "brain\data\pt_study.db"; Required = $false; Description = "Study database" },
    @{ Path = "brain\data\gcal_token.json"; Required = $false; Description = "Google Calendar OAuth token" },
    @{ Path = "brain\data\vault_courses.yaml"; Required = $false; Description = "Course to Obsidian folder map" },
    @{ Path = "brain\.env"; Required = $false; Description = "Environment variables" }
)

# Create output directory
$BundleDir = Join-Path $RepoRoot $OutputPath
if (Test-Path $BundleDir) {
    Remove-Item -Recurse -Force $BundleDir
}
New-Item -ItemType Directory -Path $BundleDir | Out-Null
Write-Host "Bundle directory: $BundleDir" -ForegroundColor Green
Write-Host ""

# Copy files
$CopiedCount = 0
$MissingFiles = @()

foreach ($file in $FilesToBundle) {
    $SourcePath = Join-Path $RepoRoot $file.Path
    
    if (Test-Path $SourcePath) {
        # Preserve directory structure
        $RelativeDir = Split-Path -Parent $file.Path
        $DestDir = Join-Path $BundleDir $RelativeDir
        
        if (-not (Test-Path $DestDir)) {
            New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        }
        
        Copy-Item $SourcePath -Destination (Join-Path $BundleDir $file.Path)
        Write-Host "[OK] $($file.Path)" -ForegroundColor Green
        Write-Host "     $($file.Description)" -ForegroundColor Gray
        $CopiedCount++
    } else {
        Write-Host "[--] $($file.Path) (not found)" -ForegroundColor Yellow
        Write-Host "     $($file.Description)" -ForegroundColor Gray
        $MissingFiles += $file.Path
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Files bundled: $CopiedCount"
if ($MissingFiles.Count -gt 0) {
    Write-Host "Files not found: $($MissingFiles.Count)" -ForegroundColor Yellow
}

# Create README in bundle
$ReadmeContent = @"
# PT Study Local Data Bundle

Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Source: $RepoRoot

## Contents
$(foreach ($file in $FilesToBundle) {
    $status = if (Test-Path (Join-Path $RepoRoot $file.Path)) { "[included]" } else { "[missing]" }
    "- $status $($file.Path) - $($file.Description)"
})

## To restore on new machine:

1. Clone the repo:
   git clone <your-repo-url>
   cd pt-study-sop

2. Copy bundle contents to repo:
   - Copy brain\data\* to brain\data\
   - Copy brain\.env to brain\ (if exists)

3. Or run the restore script:
   .\scripts\restore_local_data.ps1 -BundlePath "path\to\local_data_bundle"

## Security Note
This bundle contains sensitive data (API keys, OAuth tokens).
Do NOT commit to git or share publicly.
Delete after transfer.
"@

$ReadmeContent | Out-File -FilePath (Join-Path $BundleDir "README.txt") -Encoding UTF8

# Create zip
$ZipPath = "$BundleDir.zip"
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath
}
Compress-Archive -Path $BundleDir -DestinationPath $ZipPath
Write-Host ""
Write-Host "=== Bundle Created ===" -ForegroundColor Green
Write-Host "Folder: $BundleDir"
Write-Host "Zip:    $ZipPath"
Write-Host ""
Write-Host "Transfer the .zip to your other machine and run:" -ForegroundColor Cyan
Write-Host "  .\scripts\restore_local_data.ps1 -BundlePath `"path\to\local_data_bundle`"" -ForegroundColor White
