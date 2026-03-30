# ralph-monitor.ps1 - Live Ralph status dashboard
# Usage:
#   .\ralph-monitor.ps1           # one-shot status
#   .\ralph-monitor.ps1 -watch    # continuous refresh every 10s
#   .\ralph-monitor.ps1 -killOrphans  # kill old codex processes

param(
    [switch]$watch,
    [switch]$killOrphans
)

$repo = "C:\pt-study-sop"
$ralphDir = "$repo\.ralph"
$heartbeat = "$ralphDir\heartbeat.json"
$activityLog = "$ralphDir\activity.log"
$prdFile = "$repo\.agents\tasks\prd.json"
$runsDir = "$ralphDir\runs"

function Get-RalphStatus {
    Clear-Host
    Write-Host "============================================" -ForegroundColor Cyan
    $ts = Get-Date -Format 'HH:mm:ss'
    Write-Host "  RALPH MONITOR - $ts" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    # === 1. Process check ===
    $codexProcs = Get-Process -Name 'codex*' -ErrorAction SilentlyContinue
    if ($codexProcs) {
        $cnt = $codexProcs.Count
        Write-Host "  PROCESS: " -NoNewline
        Write-Host "RUNNING" -ForegroundColor Green -NoNewline
        Write-Host " - $cnt codex process(es)"
        foreach ($p in $codexProcs) {
            $age = (Get-Date) - $p.StartTime
            $mins = [math]::Floor($age.TotalMinutes)
            $startStr = $p.StartTime.ToString('HH:mm:ss')
            Write-Host "    PID $($p.Id) started $startStr - ${mins}m ago" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "  PROCESS: " -NoNewline
        Write-Host "NOT RUNNING" -ForegroundColor Red
    }
    Write-Host ""

    # === 2. Heartbeat check ===
    if (Test-Path $heartbeat) {
        try {
            $hb = Get-Content $heartbeat -Raw | ConvertFrom-Json
            $hbAge = (Get-Date) - [DateTime]::Parse($hb.timestamp)
            $stale = $hbAge.TotalMinutes -gt 5
            Write-Host "  HEARTBEAT: " -NoNewline
            if ($stale) {
                $hbMins = [math]::Floor($hbAge.TotalMinutes)
                Write-Host "STALE - ${hbMins}m old" -ForegroundColor Yellow
            } else {
                $hbSecs = [math]::Floor($hbAge.TotalSeconds)
                Write-Host "FRESH - ${hbSecs}s ago" -ForegroundColor Green
            }
            Write-Host "    Story: $($hb.story)  Iter: $($hb.iteration)/$($hb.max_iterations)  Run: $($hb.run_id)" -ForegroundColor DarkGray
        } catch {
            Write-Host "  HEARTBEAT: " -NoNewline
            Write-Host "PARSE ERROR" -ForegroundColor Red
        }
    } else {
        Write-Host "  HEARTBEAT: " -NoNewline
        Write-Host "NO FILE YET - starts after next Ralph run" -ForegroundColor Yellow
    }
    Write-Host ""
    # === 3. PRD status ===
    if (Test-Path $prdFile) {
        try {
            $prd = Get-Content $prdFile -Raw | ConvertFrom-Json
            $stories = $prd.stories
            $doneCount = ($stories | Where-Object { $_.status -eq "done" }).Count
            $ipCount = ($stories | Where-Object { $_.status -eq "in_progress" }).Count
            $openCount = ($stories | Where-Object { $_.status -eq "open" }).Count
            Write-Host "  PRD: $($prd.title)" -ForegroundColor White
            Write-Host "    Done: $doneCount  |  In Progress: $ipCount  |  Open: $openCount" -ForegroundColor DarkGray
            $inProgress = $stories | Where-Object { $_.status -eq "in_progress" }
            if ($inProgress) {
                foreach ($s in $inProgress) {
                    Write-Host "    >> $($s.title)" -ForegroundColor Yellow
                }
            }
            $open = $stories | Where-Object { $_.status -eq "open" } | Select-Object -First 2
            if ($open) {
                Write-Host "    Next up:" -ForegroundColor DarkGray
                foreach ($s in $open) {
                    Write-Host "       $($s.title)" -ForegroundColor DarkGray
                }
            }
        } catch {
            Write-Host "  PRD: parse error" -ForegroundColor Red
        }
    }
    Write-Host ""

    # === 4. Latest activity ===
    Write-Host "  RECENT ACTIVITY:" -ForegroundColor White
    if (Test-Path $activityLog) {
        Get-Content $activityLog | Select-Object -Last 5 | ForEach-Object {
            Write-Host "    $_" -ForegroundColor DarkGray
        }
    }
    Write-Host ""
    # === 5. Latest run log ===
    if (Test-Path $runsDir) {
        $latestLog = Get-ChildItem "$runsDir\*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestLog) {
            $logAge = (Get-Date) - $latestLog.LastWriteTime
            $growing = $logAge.TotalSeconds -lt 30
            $sizeKB = [math]::Round($latestLog.Length / 1024)
            Write-Host "  LATEST LOG: $($latestLog.Name)" -NoNewline
            if ($growing) {
                Write-Host " - actively writing" -ForegroundColor Green
            } else {
                $idleMins = [math]::Floor($logAge.TotalMinutes)
                Write-Host " - idle ${idleMins}m" -ForegroundColor DarkGray
            }
            Write-Host "    Size: ${sizeKB}KB" -ForegroundColor DarkGray
        }
    }
    Write-Host ""

    # === 6. Recent commits ===
    Write-Host "  RECENT COMMITS:" -ForegroundColor White
    Push-Location $repo
    git log --oneline -5 2>$null | ForEach-Object {
        Write-Host "    $_" -ForegroundColor DarkGray
    }
    Pop-Location
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Tip: run with -watch for auto-refresh" -ForegroundColor DarkGray
    Write-Host "  Tip: run with -killOrphans to clean up" -ForegroundColor DarkGray
    Write-Host "============================================" -ForegroundColor Cyan
}

# === Kill orphans mode ===
if ($killOrphans) {
    $procs = Get-Process -Name 'codex*' -ErrorAction SilentlyContinue | Sort-Object StartTime
    if (-not $procs -or $procs.Count -le 1) {
        Write-Host "No orphans found." -ForegroundColor Green
    } else {
        $keep = $procs[-1]
        Write-Host "Keeping newest: PID $($keep.Id)" -ForegroundColor Green
        $procs | Where-Object { $_.Id -ne $keep.Id } | ForEach-Object {
            Write-Host "Killing orphan: PID $($_.Id)" -ForegroundColor Red
            Stop-Process -Id $_.Id -Force
        }
    }
    exit
}

# === Main ===
if ($watch) {
    Write-Host "Ralph Monitor - Ctrl+C to stop" -ForegroundColor Cyan
    while ($true) {
        Get-RalphStatus
        Start-Sleep -Seconds 10
    }
} else {
    Get-RalphStatus
}
