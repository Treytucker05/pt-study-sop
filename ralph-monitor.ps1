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
    $ts = Get-Date -Format 'HH:mm:ss'
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  RALPH MONITOR - $ts" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    # === 1. Process check ===
    $codexProcs = Get-Process -Name 'codex*' -ErrorAction SilentlyContinue
    $hasProcess = $null -ne $codexProcs -and $codexProcs.Count -gt 0
    if ($hasProcess) {
        $cnt = @($codexProcs).Count
        Write-Host "  PROCESS: " -NoNewline
        Write-Host "RUNNING" -ForegroundColor Green -NoNewline
        Write-Host " - $cnt codex process(es)"
        foreach ($p in @($codexProcs)) {
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
    # === 2. Heartbeat + stuck detection ===
    $isStuck = $false
    if (Test-Path $heartbeat) {
        try {
            $hb = Get-Content $heartbeat -Raw | ConvertFrom-Json
            $hbAge = (Get-Date) - [DateTime]::Parse($hb.timestamp)
            $hbMins = [math]::Floor($hbAge.TotalMinutes)
            $hbSecs = [math]::Floor($hbAge.TotalSeconds)
            $phase = if ($hb.phase) { $hb.phase } else { "unknown" }

            Write-Host "  HEARTBEAT: " -NoNewline
            if ($hbAge.TotalMinutes -gt 10 -and $hasProcess) {
                Write-Host "LIKELY STUCK" -ForegroundColor Red -NoNewline
                Write-Host " - ${hbMins}m since last update, process still alive"
                $isStuck = $true
            } elseif ($hbAge.TotalMinutes -gt 5) {
                Write-Host "STALE" -ForegroundColor Yellow -NoNewline
                Write-Host " - ${hbMins}m old"
            } else {
                Write-Host "FRESH" -ForegroundColor Green -NoNewline
                Write-Host " - ${hbSecs}s ago"
            }
            # Phase display
            Write-Host "    Phase: " -NoNewline
            switch ($phase) {
                "running"            { Write-Host "WORKING" -ForegroundColor Yellow -NoNewline }
                "between_iterations" { Write-Host "BETWEEN ITERATIONS" -ForegroundColor Cyan -NoNewline }
                default              { Write-Host $phase -ForegroundColor DarkGray -NoNewline }
            }
            Write-Host "  Story: $($hb.story)  Iter: $($hb.iteration)/$($hb.max_iterations)" -ForegroundColor DarkGray

            # Show exit code if between iterations
            if ($phase -eq "between_iterations" -and $null -ne $hb.exit_code) {
                $ec = [int]$hb.exit_code
                Write-Host "    Last exit: " -NoNewline
                if ($ec -eq 0) {
                    Write-Host "SUCCESS" -ForegroundColor Green -NoNewline
                } else {
                    Write-Host "FAILED (code $ec)" -ForegroundColor Red -NoNewline
                }
                if ($hb.last_duration_s) {
                    $dur = [int]$hb.last_duration_s
                    $durMin = [math]::Floor($dur / 60)
                    $durSec = $dur % 60
                    Write-Host "  Duration: ${durMin}m ${durSec}s" -ForegroundColor DarkGray
                } else {
                    Write-Host ""
                }
            }
            # Stuck advice
            if ($isStuck) {
                Write-Host ""
                Write-Host "    !! Ralph appears stuck. Options:" -ForegroundColor Red
                Write-Host "       1. Kill it:  .\ralph-monitor.ps1 -killOrphans" -ForegroundColor Yellow
                Write-Host "       2. Check log: Get-Content $runsDir\$($hb.run_id)*.log -Tail 20" -ForegroundColor Yellow
                Write-Host "       3. Restart:   ralph-loop.bat" -ForegroundColor Yellow
            }

            # PID mismatch detection
            if ($hasProcess -and $hb.pid) {
                $hbPid = [int]$hb.pid
                $activePids = @($codexProcs) | ForEach-Object { $_.Id }
                if ($activePids -notcontains $hbPid) {
                    Write-Host ""
                    Write-Host "    WARNING: Heartbeat PID $hbPid not in running codex PIDs" -ForegroundColor Red
                    Write-Host "    Possible orphan processes from a different run" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "  HEARTBEAT: " -NoNewline
            Write-Host "PARSE ERROR" -ForegroundColor Red
        }
    } else {
        Write-Host "  HEARTBEAT: " -NoNewline
        Write-Host "NO FILE YET - starts after next Ralph run" -ForegroundColor Yellow
    }
    Write-Host ""
    # === 3. Log activity check ===
    if (Test-Path $runsDir) {
        $latestLog = Get-ChildItem "$runsDir\*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestLog) {
            $logAge = (Get-Date) - $latestLog.LastWriteTime
            $growing = $logAge.TotalSeconds -lt 30
            $sizeKB = [math]::Round($latestLog.Length / 1024)
            Write-Host "  LATEST LOG: " -NoNewline
            Write-Host "$($latestLog.Name)" -ForegroundColor White -NoNewline
            if ($growing) {
                Write-Host " - actively writing" -ForegroundColor Green
            } else {
                $idleMins = [math]::Floor($logAge.TotalMinutes)
                if ($idleMins -gt 10 -and $hasProcess) {
                    Write-Host " - idle ${idleMins}m (possibly stuck)" -ForegroundColor Red
                } else {
                    Write-Host " - idle ${idleMins}m" -ForegroundColor DarkGray
                }
            }
            Write-Host "    Size: ${sizeKB}KB" -ForegroundColor DarkGray
        }
    }
    Write-Host ""
    # === 4. PRD status ===
    if (Test-Path $prdFile) {
        try {
            $prd = Get-Content $prdFile -Raw | ConvertFrom-Json
            $stories = $prd.stories
            $doneCount = @($stories | Where-Object { $_.status -eq "done" }).Count
            $ipCount = @($stories | Where-Object { $_.status -eq "in_progress" }).Count
            $openCount = @($stories | Where-Object { $_.status -eq "open" }).Count
            $total = @($stories).Count
            Write-Host "  PRD: $($prd.title)" -ForegroundColor White
            Write-Host "    Done: $doneCount/$total  |  In Progress: $ipCount  |  Open: $openCount" -ForegroundColor DarkGray

            $bar = ""
            for ($s = 0; $s -lt $doneCount; $s++) { $bar += [char]0x2588 }
            for ($s = 0; $s -lt $ipCount; $s++) { $bar += [char]0x2592 }
            for ($s = 0; $s -lt $openCount; $s++) { $bar += [char]0x2591 }
            Write-Host "    [$bar]" -ForegroundColor Green

            $inProgress = $stories | Where-Object { $_.status -eq "in_progress" }
            if ($inProgress) {
                foreach ($st in @($inProgress)) {
                    Write-Host "    >> $($st.title)" -ForegroundColor Yellow
                }
            }
            $open = @($stories | Where-Object { $_.status -eq "open" }) | Select-Object -First 2
            if ($open.Count -gt 0) {
                Write-Host "    Next:" -ForegroundColor DarkGray
                foreach ($st in $open) {
                    Write-Host "       $($st.title)" -ForegroundColor DarkGray
                }
            }
        } catch {
            Write-Host "  PRD: parse error" -ForegroundColor Red
        }
    }
    Write-Host ""
    # === 5. Recent activity ===
    Write-Host "  RECENT ACTIVITY:" -ForegroundColor White
    if (Test-Path $activityLog) {
        Get-Content $activityLog | Select-Object -Last 5 | ForEach-Object {
            Write-Host "    $_" -ForegroundColor DarkGray
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
    if (-not $watch) {
        Write-Host "  -watch         auto-refresh every 10s" -ForegroundColor DarkGray
        Write-Host "  -killOrphans   kill zombie codex procs" -ForegroundColor DarkGray
        Write-Host "============================================" -ForegroundColor Cyan
    }
}

# === Kill orphans mode ===
if ($killOrphans) {
    $procs = @(Get-Process -Name 'codex*' -ErrorAction SilentlyContinue) | Sort-Object StartTime
    if ($procs.Count -le 1) {
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
    while ($true) {
        Get-RalphStatus
        Start-Sleep -Seconds 10
    }
} else {
    Get-RalphStatus
}
