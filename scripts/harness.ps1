#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Bootstrap", "Run", "Eval", "Report")]
    [string]$Mode,

    [ValidateSet("Hermetic", "Live")]
    [string]$Profile = "Hermetic",

    [int]$Port,

    [string]$DataRoot,

    [string]$ArtifactRoot,

    [switch]$NoBrowser,

    [switch]$SkipUiBuild
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BrainDir = Join-Path $RepoRoot "brain"
$BuildScript = Join-Path $RepoRoot "dashboard_rebuild\build-and-sync.ps1"
$ShellExecutable = (Get-Process -Id $PID).Path

function Get-PythonLaunch {
    foreach ($candidate in @(
        @{ FilePath = "python"; Prefix = @() },
        @{ FilePath = "py"; Prefix = @("-3") }
    )) {
        if (Get-Command $candidate.FilePath -ErrorAction SilentlyContinue) {
            return $candidate
        }
    }

    throw "Python was not found on PATH. Install Python 3 or add python or py -3 to PATH."
}

function Test-PortInUse {
    param([int]$PortNumber)

    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $PortNumber)
        $listener.Start()
        return $false
    } catch {
        return $true
    } finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

function Push-EnvironmentOverrides {
    param([hashtable]$Overrides)

    $snapshot = @{}
    foreach ($entry in $Overrides.GetEnumerator()) {
        $envPath = "Env:{0}" -f $entry.Key
        $existing = Get-Item -Path $envPath -ErrorAction SilentlyContinue
        $snapshot[$entry.Key] = if ($existing) { $existing.Value } else { $null }
        Set-Item -Path $envPath -Value ([string]$entry.Value)
    }

    return $snapshot
}

function Pop-EnvironmentOverrides {
    param(
        [hashtable]$Snapshot,
        [hashtable]$Overrides
    )

    foreach ($entry in $Overrides.GetEnumerator()) {
        $envPath = "Env:{0}" -f $entry.Key
        if ($null -eq $Snapshot[$entry.Key]) {
            Remove-Item -Path $envPath -ErrorAction SilentlyContinue
        } else {
            Set-Item -Path $envPath -Value ([string]$Snapshot[$entry.Key])
        }
    }
}

function Invoke-WithinEnvironment {
    param(
        [hashtable]$Overrides,
        [scriptblock]$Script
    )

    $snapshot = Push-EnvironmentOverrides -Overrides $Overrides
    try {
        & $Script
    } finally {
        Pop-EnvironmentOverrides -Snapshot $snapshot -Overrides $Overrides
    }
}

function Wait-ForDashboard {
    param(
        [string]$Url,
        [System.Diagnostics.Process]$Process,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            return $false
        }

        try {
            $requestArgs = @{
                Uri = $Url
                TimeoutSec = 2
            }
            if ($PSVersionTable.PSVersion.Major -lt 6) {
                $requestArgs.UseBasicParsing = $true
            }

            $null = Invoke-WebRequest @requestArgs
            return $true
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }

    return $false
}

function Get-StudyRagRoot {
    param(
        [string]$RunProfile,
        [string]$FallbackRoot
    )

    if ($RunProfile -eq "Live" -and $env:PT_STUDY_RAG_DIR) {
        return $env:PT_STUDY_RAG_DIR
    }

    return $FallbackRoot
}

function Invoke-HarnessRun {
    if (-not $Port) {
        throw "Run mode requires -Port."
    }
    if (-not $DataRoot) {
        throw "Run mode requires -DataRoot."
    }
    if (-not $ArtifactRoot) {
        throw "Run mode requires -ArtifactRoot."
    }
    if (Test-PortInUse -PortNumber $Port) {
        throw "Port $Port is already in use."
    }

    $python = Get-PythonLaunch

    $resolvedDataRoot = (Resolve-Path -Path (New-Item -ItemType Directory -Force -Path $DataRoot)).Path
    $resolvedArtifactRoot = (Resolve-Path -Path (New-Item -ItemType Directory -Force -Path $ArtifactRoot)).Path

    $dataDir = (Resolve-Path -Path (New-Item -ItemType Directory -Force -Path (Join-Path $resolvedDataRoot "data"))).Path
    $sessionLogsDir = (Resolve-Path -Path (New-Item -ItemType Directory -Force -Path (Join-Path $resolvedDataRoot "session_logs"))).Path
    $outputDir = (Resolve-Path -Path (New-Item -ItemType Directory -Force -Path (Join-Path $resolvedDataRoot "output"))).Path
    $studyRagDir = (Resolve-Path -Path (New-Item -ItemType Directory -Force -Path (Join-Path $resolvedDataRoot "study_rag"))).Path

    $dbPath = Join-Path $dataDir "pt_study.db"
    $apiConfigPath = Join-Path $dataDir "api_config.json"
    $stdoutLog = Join-Path $resolvedArtifactRoot "server.stdout.log"
    $stderrLog = Join-Path $resolvedArtifactRoot "server.stderr.log"
    $dashboardUrl = "http://127.0.0.1:$Port/brain"

    if (-not $SkipUiBuild) {
        if (-not (Test-Path $BuildScript)) {
            throw "Could not find build script at $BuildScript."
        }
        & $ShellExecutable -NoProfile -ExecutionPolicy Bypass -File $BuildScript
        if ($LASTEXITCODE -ne 0) {
            throw "UI build failed with exit code $LASTEXITCODE."
        }
    }

    $runEnvironment = @{
        PT_BRAIN_DOTENV_OVERRIDE = "0"
        PT_BRAIN_PREFER_ENV_PATHS = "1"
        PT_BRAIN_DATA_DIR = $dataDir
        PT_BRAIN_SESSION_LOGS_DIR = $sessionLogsDir
        PT_BRAIN_OUTPUT_DIR = $outputDir
        PT_BRAIN_DB_PATH = $dbPath
        PT_BRAIN_API_CONFIG_PATH = $apiConfigPath
        PT_STUDY_RAG_DIR = (Get-StudyRagRoot -RunProfile $Profile -FallbackRoot $studyRagDir)
        PT_BRAIN_HOST = "127.0.0.1"
        PT_BRAIN_PORT = [string]$Port
        PT_BRAIN_RUN_PROFILE = $Profile
    }

    Invoke-WithinEnvironment -Overrides $runEnvironment -Script {
        Push-Location $BrainDir
        try {
            & $python.FilePath @($python.Prefix + @("db_setup.py"))
            if ($LASTEXITCODE -ne 0) {
                throw "db_setup.py failed with exit code $LASTEXITCODE."
            }
        } finally {
            Pop-Location
        }
    }

    $envSnapshot = Push-EnvironmentOverrides -Overrides $runEnvironment
    try {
        $serverProcess = Start-Process `
            -FilePath $python.FilePath `
            -ArgumentList @($python.Prefix + @("dashboard_web.py", "--host", "127.0.0.1", "--port", [string]$Port)) `
            -WorkingDirectory $BrainDir `
            -RedirectStandardOutput $stdoutLog `
            -RedirectStandardError $stderrLog `
            -PassThru
    } finally {
        Pop-EnvironmentOverrides -Snapshot $envSnapshot -Overrides $runEnvironment
    }

    if (-not (Wait-ForDashboard -Url $dashboardUrl -Process $serverProcess -TimeoutSeconds 30)) {
        if ($serverProcess -and -not $serverProcess.HasExited) {
            Stop-Process -Id $serverProcess.Id -Force
        }

        $stdoutTail = if (Test-Path $stdoutLog) { Get-Content -Path $stdoutLog -Tail 40 -ErrorAction SilentlyContinue | Out-String } else { "" }
        $stderrTail = if (Test-Path $stderrLog) { Get-Content -Path $stderrLog -Tail 40 -ErrorAction SilentlyContinue | Out-String } else { "" }
        throw "Harness run failed to reach $dashboardUrl.`nSTDOUT:`n$stdoutTail`nSTDERR:`n$stderrTail"
    }

    $metadata = [ordered]@{
        mode = "Run"
        profile = $Profile
        port = $Port
        repo_root = $RepoRoot
        data_root = $resolvedDataRoot
        artifact_root = $resolvedArtifactRoot
        data_dir = $dataDir
        session_logs_dir = $sessionLogsDir
        output_dir = $outputDir
        study_rag_dir = $runEnvironment.PT_STUDY_RAG_DIR
        db_path = $dbPath
        api_config_path = $apiConfigPath
        base_url = "http://127.0.0.1:$Port"
        dashboard_url = $dashboardUrl
        stdout_log = $stdoutLog
        stderr_log = $stderrLog
        server_pid = $serverProcess.Id
        started_at = (Get-Date).ToString("o")
        skip_ui_build = [bool]$SkipUiBuild
    }

    $metadata | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $resolvedArtifactRoot "run.json") -Encoding UTF8

    if (-not $NoBrowser) {
        Start-Process $dashboardUrl | Out-Null
    }

    Write-Host "[OK] Harness run is live at $dashboardUrl"
    Write-Host "[OK] Run metadata: $(Join-Path $resolvedArtifactRoot "run.json")"
}

switch ($Mode) {
    "Run" {
        Invoke-HarnessRun
    }
    default {
        throw "Mode '$Mode' is not implemented yet. T6 only ships Run mode."
    }
}
