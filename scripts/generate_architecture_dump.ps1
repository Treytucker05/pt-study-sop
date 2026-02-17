$outFile = "docs/root/ARCHITECTURE_CONTEXT.md"
$root = Get-Location
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$files = @(
    "AGENTS.md",
    "docs/root/PROJECT_ARCHITECTURE.md",
    "sop/sop_index.v1.json",
    "sop/library/00-overview.md",
    "conductor/tracks/GENERAL/log.md",
    "brain/db_setup.py",
    "brain/dashboard/routes.py",
    "brain/static/dist/index.html"
)

Write-Host "Generating context dump..."
"# ARCHITECTURE CONTEXT DUMP" | Out-File -Encoding utf8 $outFile
"Generated on: $timestamp" | Out-File -Encoding utf8 -Append $outFile
"Root: $root" | Out-File -Encoding utf8 -Append $outFile
"" | Out-File -Encoding utf8 -Append $outFile

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  Adding: $file"
        "--------------------------------------------------------------------------------" | Out-File -Encoding utf8 -Append $outFile
        "# FILE: $file" | Out-File -Encoding utf8 -Append $outFile
        "--------------------------------------------------------------------------------" | Out-File -Encoding utf8 -Append $outFile
        
        $ext = [System.IO.Path]::GetExtension($file).TrimStart('.')
        if ($ext -eq "js") { $ext = "javascript" }
        if ($ext -eq "py") { $ext = "python" }
        if ($ext -eq "md") { $ext = "markdown" }
        
        "````$ext" | Out-File -Encoding utf8 -Append $outFile
        Get-Content $file | Out-File -Encoding utf8 -Append $outFile
        "````" | Out-File -Encoding utf8 -Append $outFile
        "" | Out-File -Encoding utf8 -Append $outFile
    } else {
        Write-Warning "  MISSING: $file"
        "!!! MISSING FILE: $file !!!" | Out-File -Encoding utf8 -Append $outFile
        "" | Out-File -Encoding utf8 -Append $outFile
    }
}

Write-Host "Success! Created $outFile"
