# Install watchdog as a scheduled task that runs every 5 minutes
# Run this once as admin to set it up

$taskName = "RalphMemoryWatchdog"
$scriptPath = "C:\pt-study-sop\memory-watchdog.ps1"

# Remove existing if present
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -aggressive"

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration ([timespan]::MaxValue)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 2)

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Limited -LogonType Interactive

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Monitors system memory and restarts Claude Desktop if it exceeds thresholds to prevent lockups"

Write-Host "Scheduled task '$taskName' registered successfully" -ForegroundColor Green
Write-Host "Runs every 5 minutes, restarts Claude Desktop if memory exceeds 1.5GB" -ForegroundColor DarkGray
