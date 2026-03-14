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

    [string]$FixtureRoot,

    [switch]$NoBrowser,

    [switch]$SkipUiBuild,

    [switch]$Json,

    [switch]$Fix
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BrainDir = Join-Path $RepoRoot "brain"
$BuildScript = Join-Path $RepoRoot "dashboard_rebuild\build-and-sync.ps1"
$ShellExecutable = (Get-Process -Id $PID).Path
$BackendEnvTemplatePath = Join-Path $BrainDir ".env.example"
$FrontendEnvTemplatePath = Join-Path $RepoRoot "dashboard_rebuild\.env.example"
$LiveEnvPath = Join-Path $BrainDir ".env"
$DefaultFixtureRoot = Join-Path $BrainDir "tests\fixtures\harness"
$FixtureManifestName = "manifest.json"
$HarnessExitCodes = @{
    "ok" = 0
    "bootstrap.missing_powershell" = 20
    "bootstrap.missing_python" = 21
    "bootstrap.missing_node_toolchain" = 22
    "bootstrap.missing_live_env" = 23
    "bootstrap.missing_backend_env_template" = 24
    "bootstrap.missing_fixture_assets" = 25
    "bootstrap.missing_harness_run_args" = 26
    "bootstrap.missing_repo_root" = 27
}

function Resolve-HarnessPath {
    param([string]$PathValue)

    if (-not $PathValue) {
        return $null
    }

    $expanded = [Environment]::ExpandEnvironmentVariables($PathValue)
    return [System.IO.Path]::GetFullPath($expanded)
}

function New-HarnessCheck {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Code,
        [string]$Message,
        [string]$Severity = "required"
    )

    return [ordered]@{
        name = $Name
        ok = $Passed
        code = $Code
        severity = $Severity
        message = $Message
    }
}

function Write-HarnessResultAndExit {
    param(
        [bool]$Ok,
        [string]$Code,
        [string]$Message,
        [System.Collections.IList]$Checks,
        [hashtable]$Metadata
    )

    $exitCode = if ($HarnessExitCodes.ContainsKey($Code)) { $HarnessExitCodes[$Code] } else { 1 }
    $result = [ordered]@{
        ok = $Ok
        code = $Code
        exit_code = $exitCode
        message = $Message
        mode = $Mode
        profile = $Profile
        repo_root = $RepoRoot
        generated_at = (Get-Date).ToString("o")
        checks = @($Checks)
        metadata = $Metadata
    }

    if ($Json) {
        $result | ConvertTo-Json -Depth 6
    } else {
        if ($Ok) {
            Write-Host "[OK] $Message"
        } else {
            Write-Error $Message
        }
        foreach ($check in $Checks) {
            $prefix = if ($check.ok) { "[OK]" } else { "[FAIL]" }
            Write-Host "$prefix $($check.name): $($check.message)"
        }
    }

    exit $exitCode
}

function Find-CommandCandidate {
    param([string[]]$Names)

    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command) {
            return $command
        }
    }

    return $null
}

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

function Invoke-HarnessBootstrap {
    $checks = [System.Collections.Generic.List[object]]::new()
    $metadata = [ordered]@{
        shell = $ShellExecutable
        fix_requested = [bool]$Fix
        frontend_env_template = Resolve-HarnessPath $FrontendEnvTemplatePath
        backend_env_template = Resolve-HarnessPath $BackendEnvTemplatePath
        live_env = Resolve-HarnessPath $LiveEnvPath
    }

    if (-not (Test-Path (Join-Path $RepoRoot "AGENTS.md"))) {
        $check = New-HarnessCheck -Name "repo-root" -Passed $false -Code "bootstrap.missing_repo_root" -Message "Harness repo root marker AGENTS.md was not found under $RepoRoot."
        $checks.Add($check)
        Write-HarnessResultAndExit -Ok $false -Code $check.code -Message $check.message -Checks $checks -Metadata $metadata
    }
    $checks.Add((New-HarnessCheck -Name "repo-root" -Passed $true -Code "ok" -Message "Repo root marker found at $RepoRoot."))

    $checks.Add((New-HarnessCheck -Name "powershell" -Passed $true -Code "ok" -Message "Running under $ShellExecutable."))

    $pythonCommand = Find-CommandCandidate -Names @("python", "py")
    if (-not $pythonCommand) {
        $check = New-HarnessCheck -Name "python" -Passed $false -Code "bootstrap.missing_python" -Message "Python was not found on PATH. Install Python 3 or expose python or py -3."
        $checks.Add($check)
        Write-HarnessResultAndExit -Ok $false -Code $check.code -Message $check.message -Checks $checks -Metadata $metadata
    }
    $metadata.python_command = $pythonCommand.Source
    $checks.Add((New-HarnessCheck -Name "python" -Passed $true -Code "ok" -Message "Python command available via $($pythonCommand.Name)."))

    $nodeCommand = Find-CommandCandidate -Names @("node")
    $npmCommand = Find-CommandCandidate -Names @("npm")
    if ((-not $nodeCommand) -or (-not $npmCommand)) {
        $check = New-HarnessCheck -Name "node-toolchain" -Passed $false -Code "bootstrap.missing_node_toolchain" -Message "Node and npm must both be available on PATH for harness bootstrap."
        $checks.Add($check)
        Write-HarnessResultAndExit -Ok $false -Code $check.code -Message $check.message -Checks $checks -Metadata $metadata
    }
    $metadata.node_command = $nodeCommand.Source
    $metadata.npm_command = $npmCommand.Source
    $checks.Add((New-HarnessCheck -Name "node-toolchain" -Passed $true -Code "ok" -Message "Node and npm are available on PATH."))

    if (-not (Test-Path $BackendEnvTemplatePath)) {
        $check = New-HarnessCheck -Name "backend-env-template" -Passed $false -Code "bootstrap.missing_backend_env_template" -Message "Backend env template is missing at $BackendEnvTemplatePath."
        $checks.Add($check)
        Write-HarnessResultAndExit -Ok $false -Code $check.code -Message $check.message -Checks $checks -Metadata $metadata
    }
    $checks.Add((New-HarnessCheck -Name "backend-env-template" -Passed $true -Code "ok" -Message "Backend env template found at $BackendEnvTemplatePath."))

    if (Test-Path $FrontendEnvTemplatePath) {
        $checks.Add((New-HarnessCheck -Name "frontend-env-template" -Passed $true -Code "ok" -Message "Frontend env template found at $FrontendEnvTemplatePath." -Severity "info"))
    } else {
        $checks.Add((New-HarnessCheck -Name "frontend-env-template" -Passed $false -Code "bootstrap.missing_frontend_env_template" -Message "Frontend env template is missing at $FrontendEnvTemplatePath." -Severity "info"))
    }

    if ($Profile -eq "Live") {
        if (-not (Test-Path $LiveEnvPath)) {
            $check = New-HarnessCheck -Name "live-env" -Passed $false -Code "bootstrap.missing_live_env" -Message "Live profile requires brain/.env at $LiveEnvPath."
            $checks.Add($check)
            Write-HarnessResultAndExit -Ok $false -Code $check.code -Message $check.message -Checks $checks -Metadata $metadata
        }

        $checks.Add((New-HarnessCheck -Name "live-env" -Passed $true -Code "ok" -Message "Live env file found at $LiveEnvPath."))
    }

    if ($Profile -eq "Hermetic") {
        $fixtureRootInput = if ($FixtureRoot) { $FixtureRoot } else { $DefaultFixtureRoot }
        $resolvedFixtureRoot = Resolve-HarnessPath $fixtureRootInput
        $metadata.fixture_root = $resolvedFixtureRoot
        $fixtureManifestPath = Join-Path $resolvedFixtureRoot $FixtureManifestName
        $metadata.fixture_manifest = $fixtureManifestPath

        if ((-not (Test-Path $resolvedFixtureRoot)) -or (-not (Test-Path $fixtureManifestPath))) {
            $check = New-HarnessCheck -Name "fixture-assets" -Passed $false -Code "bootstrap.missing_fixture_assets" -Message "Hermetic profile requires fixture assets at $resolvedFixtureRoot with $FixtureManifestName present."
            $checks.Add($check)
            Write-HarnessResultAndExit -Ok $false -Code $check.code -Message $check.message -Checks $checks -Metadata $metadata
        }

        $checks.Add((New-HarnessCheck -Name "fixture-assets" -Passed $true -Code "ok" -Message "Hermetic fixture assets found at $resolvedFixtureRoot."))
    }

    $successMessage = "Harness bootstrap passed for $Profile profile."
    Write-HarnessResultAndExit -Ok $true -Code "ok" -Message $successMessage -Checks $checks -Metadata $metadata
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
    "Bootstrap" {
        Invoke-HarnessBootstrap
    }
    "Run" {
        Invoke-HarnessRun
    }
    default {
        throw "Mode '$Mode' is not implemented yet. T6 only ships Run mode."
    }
}
