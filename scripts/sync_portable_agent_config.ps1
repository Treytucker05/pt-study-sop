param(
    [ValidateSet("DryRun", "Apply", "Check")]
    [string]$Mode = "DryRun",

    # Portable canonical agent config lives in the Obsidian vault.
    # Copy-sync only (no junctions/symlinks) to keep tools predictable.
    [string]$VaultConfigRoot = "C:\\Users\\treyt\\Desktop\\Treys School\\agents\\config"
)

$ErrorActionPreference = "Stop"

$syncScript = Join-Path $VaultConfigRoot "sync_to_home.ps1"

if (-not (Test-Path -LiteralPath $syncScript)) {
    Write-Error "Missing vault sync script: $syncScript`nExpected portable agent config at: $VaultConfigRoot"
    exit 1
}

& $syncScript -Mode $Mode
exit $LASTEXITCODE

