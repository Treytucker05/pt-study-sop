Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
    $img = [System.Windows.Forms.Clipboard]::GetImage()
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    
    # Resolve path to the UI Images folder in the project
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectDir = Split-Path -Parent $scriptDir
    $targetDir = "$projectDir\UI Images"
    $path = "$targetDir\clip_$timestamp.png"
    
    if (-not (Test-Path $targetDir)) { 
        New-Item -ItemType Directory -Force $targetDir | Out-Null 
    }
    
    $img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Small delay to ensure the active window (terminal) has regained focus
    # after the shortcut triggered this script
    Start-Sleep -Milliseconds 250 
    
    # Send the keystrokes to type the path into the active window
    [System.Windows.Forms.SendKeys]::SendWait("@$path")
}
