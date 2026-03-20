Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
    $img = [System.Windows.Forms.Clipboard]::GetImage()
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $targetDir = "C:\pt-study-sop\UI Images"
    if (-not (Test-Path $targetDir)) { 
        New-Item -ItemType Directory -Force $targetDir | Out-Null 
    }
    $path = "$targetDir\clip_$timestamp.png"
    $img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output $path
} else {
    Write-Output "NONE"
}
