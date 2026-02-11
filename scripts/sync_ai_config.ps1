param(
    [ValidateSet("DryRun", "Apply", "Check")]
    [string]$Mode = "DryRun"
)

Write-Warning "scripts/sync_ai_config.ps1 is deprecated. Use scripts/sync_agent_config.ps1 instead."

$scriptRoot = $PSScriptRoot
$newScript = Join-Path $scriptRoot "sync_agent_config.ps1"

if (-not (Test-Path -LiteralPath $newScript)) {
    throw "Missing required script: $newScript"
}

& $newScript -Mode $Mode
exit $LASTEXITCODE

