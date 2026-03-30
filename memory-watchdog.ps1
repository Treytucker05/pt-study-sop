# memory-watchdog.ps1 - Prevents system lockup from memory pressure
# Usage:
#   .\memory-watchdog.ps1              # run once
#   .\memory-watchdog.ps1 -watch       # continuous monitoring every 60s
#   .\memory-watchdog.ps1 -aggressive  # lower thresholds
param(
    [switch]$watch,
    [switch]$aggressive
)

$CLAUDE_RESTART_MB = if ($aggressive) { 1500 } else { 2500 }
$SYSTEM_FREE_MIN_MB = if ($aggressive) { 2048 } else { 1536 }
$LOG_PATH = "C:\pt-study-sop\.ralph\watchdog.log"

function Write-Log {
    param([string]$msg)
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $LOG_PATH -Value $line -ErrorAction SilentlyContinue
}
function Get-SystemFreeMemMB {
    $os = Get-CimInstance Win32_OperatingSystem
    return [math]::Round($os.FreePhysicalMemory / 1024)
}

function Get-ClaudeMemMB {
    $procs = Get-Process -Name 'claude*' -ErrorAction SilentlyContinue
    if (-not $procs) { return 0 }
    $total = 0
    foreach ($p in @($procs)) { $total += $p.WorkingSet64 }
    return [math]::Round($total / 1MB)
}

function Restart-ClaudeDesktop {
    Write-Log "RESTARTING Claude Desktop to reclaim memory..."
    $claudePath = "$env:LOCALAPPDATA\Programs\claude\Claude Desktop.exe"
    if (-not (Test-Path $claudePath)) {
        $claudePath = "$env:LOCALAPPDATA\Programs\claude-desktop\Claude Desktop.exe"
    }
    # Gracefully close
    Get-Process -Name 'claude*' -ErrorAction SilentlyContinue | ForEach-Object {
        $_.CloseMainWindow() | Out-Null
    }
    Start-Sleep -Seconds 3
    # Force kill stragglers
    Get-Process -Name 'claude*' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    # Restart
    if (Test-Path $claudePath) {
        Start-Process $claudePath
        Write-Log "Claude Desktop restarted from $claudePath"
    } else {
        Write-Log "WARNING: Could not find Claude Desktop executable"
    }
}
function Invoke-MemoryCheck {
    $freeMB = Get-SystemFreeMemMB
    $claudeMB = Get-ClaudeMemMB
    $ts = Get-Date -Format 'HH:mm:ss'

    Write-Host "[$ts] Free: ${freeMB}MB | Claude: ${claudeMB}MB" -NoNewline

    $action = $null

    # Check 1: Claude memory bloat
    if ($claudeMB -gt $CLAUDE_RESTART_MB) {
        Write-Host " | Claude over ${CLAUDE_RESTART_MB}MB!" -ForegroundColor Red
        Write-Log "Claude Desktop using ${claudeMB}MB (threshold: ${CLAUDE_RESTART_MB}MB)"
        Restart-ClaudeDesktop
        $action = "restarted_claude"
    }
    # Check 2: System memory critically low
    elseif ($freeMB -lt $SYSTEM_FREE_MIN_MB) {
        Write-Host " | LOW MEMORY!" -ForegroundColor Red
        Write-Log "System free memory critically low: ${freeMB}MB (threshold: ${SYSTEM_FREE_MIN_MB}MB)"

        # Try restarting Claude first since it's usually the biggest offender
        if ($claudeMB -gt 500) {
            Write-Log "Claude using ${claudeMB}MB - restarting to free memory"
            Restart-ClaudeDesktop
            $action = "restarted_claude_lowmem"
        } else {
            Write-Log "Claude only using ${claudeMB}MB - not the main offender. Check other processes."
            $action = "warning_only"
        }
    }
    else {
        Write-Host " | OK" -ForegroundColor Green
    }

    return $action
}
# === Main ===
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MEMORY WATCHDOG" -ForegroundColor Cyan
Write-Host "  Claude restart threshold: ${CLAUDE_RESTART_MB}MB" -ForegroundColor DarkGray
Write-Host "  System free minimum: ${SYSTEM_FREE_MIN_MB}MB" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($watch) {
    Write-Host "Monitoring every 60s - Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    while ($true) {
        Invoke-MemoryCheck
        Start-Sleep -Seconds 60
    }
} else {
    Invoke-MemoryCheck
}
