# ralph-monitor.ps1 - Ralph Status Monitor + Control Panel
# Usage:
#   .\ralph-monitor.ps1              # interactive control panel with live status
#   .\ralph-monitor.ps1 -watch       # auto-refresh status only (no menu)
#   .\ralph-monitor.ps1 -killOrphans # quick kill orphans and exit

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

# ============================================================
#  STATUS DISPLAY
# ============================================================

function Show-Status {
    $ts = Get-Date -Format 'HH:mm:ss'
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host "   RALPH MONITOR - $ts" -ForegroundColor Cyan
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host ""

    # --- Process ---
    $script:codexProcs = @(Get-Process -Name 'codex*' -ErrorAction SilentlyContinue)
    $script:hasProcess = $script:codexProcs.Count -gt 0
    Write-Host "  Ralph: " -NoNewline
    if ($script:hasProcess) {
        Write-Host "RUNNING" -ForegroundColor Green -NoNewline
        foreach ($p in $script:codexProcs) {
            $mins = [math]::Floor(((Get-Date) - $p.StartTime).TotalMinutes)
            Write-Host " PID:$($p.Id) ${mins}m" -ForegroundColor DarkGray -NoNewline
        }
        Write-Host ""
    } else {
        Write-Host "STOPPED" -ForegroundColor Red
    }

    # --- Memory ---
    $os = Get-CimInstance Win32_OperatingSystem
    $freeGB = [math]::Round($os.FreePhysicalMemory/1MB, 1)
    $totalGB = [math]::Round($os.TotalVisibleMemorySize/1MB, 1)
    $pct = [math]::Round((($totalGB - $freeGB) / $totalGB) * 100)
    Write-Host "  Memory: " -NoNewline
    $memColor = if ($pct -gt 85) { "Red" } elseif ($pct -gt 70) { "Yellow" } else { "Green" }
    Write-Host "${pct}% used - ${freeGB}GB free of ${totalGB}GB" -ForegroundColor $memColor

    # --- Orphans ---
    $script:headlessProcs = @(Get-Process -Name 'chrome-headless-shell' -ErrorAction SilentlyContinue)
    if ($script:headlessProcs.Count -gt 0) {
        $orphanMB = 0
        foreach ($p in $script:headlessProcs) { $orphanMB += [math]::Round($p.WorkingSet64/1MB) }
        Write-Host "  Orphans: " -NoNewline
        Write-Host "$($script:headlessProcs.Count) headless chrome - ${orphanMB}MB wasted" -ForegroundColor Red
    }

    # --- Claude Desktop ---
    $claudeProcs = @(Get-Process -Name 'claude*' -ErrorAction SilentlyContinue)
    $claudeMB = 0
    foreach ($p in $claudeProcs) { $claudeMB += [math]::Round($p.WorkingSet64/1MB) }
    Write-Host "  Claude: ${claudeMB}MB across $($claudeProcs.Count) processes" -ForegroundColor DarkGray

    # --- Heartbeat ---
    $script:isStuck = $false
    if (Test-Path $heartbeat) {
        try {
            $hb = Get-Content $heartbeat -Raw | ConvertFrom-Json
            $hbAge = (Get-Date) - [DateTime]::Parse($hb.timestamp)
            $hbMins = [math]::Floor($hbAge.TotalMinutes)
            $phase = if ($hb.phase) { $hb.phase } else { "unknown" }
            Write-Host "  Story:  $($hb.story) iter $($hb.iteration)/$($hb.max_iterations) " -NoNewline -ForegroundColor DarkGray
            if ($hbAge.TotalMinutes -gt 10 -and $script:hasProcess) {
                Write-Host "STUCK ${hbMins}m" -ForegroundColor Red
                $script:isStuck = $true
            } elseif ($phase -eq "running") {
                Write-Host "working ${hbMins}m" -ForegroundColor Yellow
            } elseif ($phase -eq "between_iterations") {
                $ec = if ($null -ne $hb.exit_code) { [int]$hb.exit_code } else { -1 }
                if ($ec -eq 0) { Write-Host "last: OK" -ForegroundColor Green }
                else { Write-Host "last: FAIL code=$ec" -ForegroundColor Red }
            } else {
                Write-Host "${hbMins}m ago" -ForegroundColor DarkGray
            }
        } catch {}
    }

    # --- PRD progress bar ---
    if (Test-Path $prdFile) {
        try {
            $prd = Get-Content $prdFile -Raw | ConvertFrom-Json
            $stories = $prd.stories
            $doneC = @($stories | Where-Object { $_.status -eq "done" }).Count
            $ipC = @($stories | Where-Object { $_.status -eq "in_progress" }).Count
            $openC = @($stories | Where-Object { $_.status -eq "open" }).Count
            $total = @($stories).Count
            Write-Host "  PRD:    $doneC/$total done" -NoNewline -ForegroundColor DarkGray
            if ($ipC -gt 0) {
                $ip = @($stories | Where-Object { $_.status -eq "in_progress" })
                Write-Host " >> $($ip[0].title)" -ForegroundColor Yellow
            } else {
                Write-Host ""
            }
        } catch {}
    }

    # --- Latest log ---
    if (Test-Path $runsDir) {
        $latestLog = Get-ChildItem "$runsDir\*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestLog) {
            $logAge = (Get-Date) - $latestLog.LastWriteTime
            $sizeKB = [math]::Round($latestLog.Length / 1024)
            Write-Host "  Log:    $($latestLog.Name) ${sizeKB}KB" -NoNewline -ForegroundColor DarkGray
            if ($logAge.TotalSeconds -lt 30) {
                Write-Host " writing" -ForegroundColor Green
            } else {
                $idleM = [math]::Floor($logAge.TotalMinutes)
                Write-Host " idle ${idleM}m" -ForegroundColor DarkGray
            }
        }
    }

    # --- Recommendations ---
    $recs = @()
    # Orphan headless chrome
    if ($script:headlessProcs.Count -gt 0) {
        $oMB = 0
        foreach ($p in $script:headlessProcs) { $oMB += [math]::Round($p.WorkingSet64/1MB) }
        $recs += "[1] Kill headless chrome orphans - free ~${oMB}MB"
    }
    # Multiple codex = orphans
    if ($script:codexProcs.Count -gt 1) {
        $recs += "[2] Kill orphan codex processes"
    }
    # Claude bloated
    $cProcs = @(Get-Process -Name 'claude*' -ErrorAction SilentlyContinue)
    $cMB = 0
    foreach ($p in $cProcs) { $cMB += [math]::Round($p.WorkingSet64/1MB) }
    if ($cMB -gt 2000) {
        $recs += "[5] Restart Claude Desktop - using ${cMB}MB"
    } elseif ($pct -gt 85 -and $cMB -gt 1000) {
        $recs += "[5] Restart Claude Desktop - ${cMB}MB, memory critical"
    }
    # Memory critical and no obvious single fix
    if ($pct -gt 85 -and $recs.Count -eq 0) {
        $recs += "[6] Check top memory hogs to find what to kill"
    }
    # Stuck Ralph
    if ($script:isStuck) {
        $recs += "[3] Kill ALL orphans - Ralph appears stuck"
    }
    # SysMain still running
    $sysMain = Get-Service -Name SysMain -ErrorAction SilentlyContinue
    if ($sysMain -and $sysMain.Status -eq 'Running') {
        $recs += "[D] Disable SysMain - wasting RAM"
    }

    if ($recs.Count -gt 0) {
        Write-Host "  ---------- FIX IT ----------" -ForegroundColor Red
        foreach ($r in $recs) {
            Write-Host "  >> $r" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  All good." -ForegroundColor Green
    }
    Write-Host ""
}

# ============================================================
#  ACTIONS
# ============================================================

function Kill-HeadlessChrome {
    $procs = @(Get-Process -Name 'chrome-headless-shell' -ErrorAction SilentlyContinue)
    if ($procs.Count -eq 0) { Write-Host "  No headless chrome." -ForegroundColor Green; return }
    $totalMB = 0
    foreach ($p in $procs) {
        $mb = [math]::Round($p.WorkingSet64/1MB)
        $totalMB += $mb
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  Killed $($procs.Count) headless chrome procs - freed ~${totalMB}MB" -ForegroundColor Green
}

function Kill-OrphanCodex {
    $procs = @(Get-Process -Name 'codex*' -ErrorAction SilentlyContinue) | Sort-Object StartTime
    if ($procs.Count -eq 0) { Write-Host "  No codex processes." -ForegroundColor Green; return }
    if ($procs.Count -eq 1) { Write-Host "  1 codex (active Ralph) - keeping it." -ForegroundColor Green; return }
    $keep = $procs[-1]
    Write-Host "  Keeping newest PID $($keep.Id)" -ForegroundColor Green
    foreach ($p in $procs) {
        if ($p.Id -ne $keep.Id) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            Write-Host "  Killed orphan PID $($p.Id)" -ForegroundColor Red
        }
    }
}

function Stop-DevBrowser {
    foreach ($p in @(Get-Process -Name 'node' -ErrorAction SilentlyContinue)) {
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($cmd -match 'dev-browser.*daemon') {
            Stop-Process -Id $p.Id -Force
            Write-Host "  Killed dev-browser daemon PID $($p.Id)" -ForegroundColor Red
            return
        }
    }
    Write-Host "  No dev-browser daemon found." -ForegroundColor Green
}

function Kill-AllOrphans {
    Kill-HeadlessChrome
    Kill-OrphanCodex
    Stop-DevBrowser
}

function Restart-Claude {
    $procs = @(Get-Process -Name 'claude*' -ErrorAction SilentlyContinue)
    $claudeMB = 0
    foreach ($p in $procs) { $claudeMB += [math]::Round($p.WorkingSet64/1MB) }
    Write-Host "  Closing Claude Desktop (${claudeMB}MB)..." -ForegroundColor Yellow
    foreach ($p in $procs) { $p.CloseMainWindow() | Out-Null }
    Start-Sleep -Seconds 3
    Get-Process -Name 'claude*' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-Process "shell:AppsFolder\Claude_pzs8sxrjxfjjc!Claude" -ErrorAction SilentlyContinue
    Write-Host "  Restarted Claude Desktop - freed ~${claudeMB}MB" -ForegroundColor Green
}

function Show-TopMemory {
    Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 15 `
        Id, ProcessName, @{N='MB';E={[math]::Round($_.WorkingSet64/1MB)}} | Format-Table -AutoSize
}

function Show-NodeProcesses {
    $nodes = @(Get-Process -Name 'node' -ErrorAction SilentlyContinue)
    if ($nodes.Count -eq 0) { Write-Host "  No node processes." -ForegroundColor Green; return }
    foreach ($p in $nodes) {
        $mb = [math]::Round($p.WorkingSet64/1MB)
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($cmd.Length -gt 100) { $cmd = $cmd.Substring(0,100) + "..." }
        Write-Host "  PID $($p.Id)  ${mb}MB  $cmd" -ForegroundColor DarkGray
    }
}

function Show-Activity {
    if (Test-Path $activityLog) {
        Get-Content $activityLog | Select-Object -Last 15 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor DarkGray
        }
    }
}

function Show-PRD {
    if (-not (Test-Path $prdFile)) { return }
    $prd = Get-Content $prdFile -Raw | ConvertFrom-Json
    foreach ($s in $prd.stories) {
        $icon = switch ($s.status) { "done" {"[X]"} "in_progress" {"[>]"} "open" {"[ ]"} default {"[?]"} }
        $color = switch ($s.status) { "done" {"Green"} "in_progress" {"Yellow"} "open" {"DarkGray"} default {"White"} }
        Write-Host "  $icon $($s.title)" -ForegroundColor $color
    }
}

function Show-Commits {
    Push-Location $repo
    git log --oneline -8 2>$null | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    Pop-Location
}

function Tail-LatestLog {
    $latestLog = Get-ChildItem "$runsDir\*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latestLog) { Write-Host "  No logs." -ForegroundColor Red; return }
    Write-Host "  Tailing $($latestLog.Name) - Ctrl+C to stop" -ForegroundColor Yellow
    Get-Content $latestLog.FullName -Wait -Tail 30
}

function Disable-SysMainService {
    $svc = Get-Service -Name SysMain -ErrorAction SilentlyContinue
    if (-not $svc) { Write-Host "  SysMain not found." -ForegroundColor DarkGray; return }
    if ($svc.Status -eq 'Stopped' -and $svc.StartType -eq 'Disabled') {
        Write-Host "  SysMain already disabled." -ForegroundColor Green; return
    }
    try {
        Set-Service -Name SysMain -StartupType Disabled -ErrorAction Stop
        Stop-Service -Name SysMain -Force -ErrorAction Stop
        Write-Host "  SysMain disabled." -ForegroundColor Green
    } catch {
        Write-Host "  Failed - run as Administrator." -ForegroundColor Red
    }
}

function Show-Menu {
    Write-Host "  ---- CLEANUP ----              ---- RALPH ----" -ForegroundColor White
    Write-Host "  [1] Kill headless chrome       [A] Activity log" -ForegroundColor Yellow
    Write-Host "  [2] Kill orphan codex          [P] PRD stories" -ForegroundColor Yellow
    Write-Host "  [3] Kill ALL orphans           [C] Recent commits" -ForegroundColor Yellow
    Write-Host "  [4] Stop dev-browser daemon    [T] Tail live log" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  ---- MEMORY ----               ---- SYSTEM ----" -ForegroundColor White
    Write-Host "  [5] Restart Claude Desktop     [D] Disable SysMain" -ForegroundColor Yellow
    Write-Host "  [6] Top memory hogs            [N] Node.js processes" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [R] Refresh  [W] Watch mode  [Q] Quit" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================
#  MAIN
# ============================================================

# Quick kill mode
if ($killOrphans) {
    Kill-AllOrphans
    exit
}

# Watch mode (auto-refresh, no menu)
if ($watch) {
    while ($true) {
        Clear-Host
        Show-Status
        Start-Sleep -Seconds 10
    }
}

# Interactive mode (default)
while ($true) {
    Clear-Host
    Show-Status
    Show-Menu

    $choice = Read-Host "  Pick"
    Write-Host ""

    switch ($choice.ToUpper()) {
        "1" { Kill-HeadlessChrome }
        "2" { Kill-OrphanCodex }
        "3" { Kill-AllOrphans }
        "4" { Stop-DevBrowser }
        "5" { Restart-Claude }
        "6" { Show-TopMemory }
        "N" { Show-NodeProcesses }
        "A" { Show-Activity }
        "P" { Show-PRD }
        "C" { Show-Commits }
        "T" { Tail-LatestLog }
        "D" { Disable-SysMainService }
        "W" {
            while ($true) { Clear-Host; Show-Status; Start-Sleep -Seconds 10 }
        }
        "R" { continue }
        "Q" { exit }
        default { Write-Host "  Unknown option." -ForegroundColor Red }
    }

    if ($choice.ToUpper() -notin @("T","W","R")) {
        Write-Host ""
        Write-Host "  Press Enter..." -ForegroundColor DarkGray
        Read-Host | Out-Null
    }
}
