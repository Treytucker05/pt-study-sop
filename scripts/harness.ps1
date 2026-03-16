#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Bootstrap", "Run", "Eval", "Report")]
    [string]$Mode,

    [ValidateSet("Hermetic", "Live")]
    [string]$Profile = "Hermetic",

    [int]$Port,

    [string]$Scenario,

    [string]$BaseUrl,

    [string]$DataRoot,

    [string]$ArtifactRoot,

    [string]$FixtureRoot,

    [string]$RunId,

    [string]$InputRoot,

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
$BundleFileName = "bundle.json"
$EventsFileName = "events.jsonl"
$HarnessSecretEnvironmentKeys = @(
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY"
)
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
    "eval.missing_scenario" = 30
    "eval.missing_artifact_root" = 31
    "eval.unknown_scenario" = 32
    "eval.missing_run_metadata" = 33
    "eval.missing_base_url" = 34
    "eval.missing_db_path" = 35
    "eval.command_failed" = 36
    "report.missing_run_id" = 40
    "report.missing_artifact_root" = 41
    "report.run_id_mismatch" = 42
}
$script:HarnessLastFailureDetails = $null

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

function New-HarnessRunId {
    return "run-{0}" -f (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssfffZ")
}

function Get-HarnessBundlePath {
    param([string]$ResolvedArtifactRoot)

    return Join-Path $ResolvedArtifactRoot $BundleFileName
}

function Get-HarnessEventsPath {
    param([string]$ResolvedArtifactRoot)

    return Join-Path $ResolvedArtifactRoot $EventsFileName
}

function Get-HarnessFixtureManifestPath {
    param([string]$ResolvedFixtureRoot)

    return Join-Path $ResolvedFixtureRoot $FixtureManifestName
}

function Get-HarnessSecretValues {
    $values = [System.Collections.Generic.List[string]]::new()
    foreach ($name in $HarnessSecretEnvironmentKeys) {
        $existing = Get-Item -Path ("Env:{0}" -f $name) -ErrorAction SilentlyContinue
        if ($existing -and -not [string]::IsNullOrWhiteSpace([string]$existing.Value)) {
            $values.Add([string]$existing.Value)
        }
    }

    return @($values)
}

function Redact-HarnessText {
    param([AllowNull()][string]$Text)

    if ($null -eq $Text) {
        return $null
    }

    $redacted = [string]$Text
    foreach ($secret in Get-HarnessSecretValues) {
        if (-not [string]::IsNullOrWhiteSpace($secret)) {
            $redacted = $redacted.Replace($secret, "<redacted:secret>")
        }
    }

    return $redacted
}

function Redact-HarnessValue {
    param($Value)

    if ($null -eq $Value) {
        return $null
    }

    if ($Value -is [System.Collections.IDictionary]) {
        $dictionary = [ordered]@{}
        foreach ($key in $Value.Keys) {
            $dictionary[[string]$key] = Redact-HarnessValue -Value $Value[$key]
        }
        return $dictionary
    }

    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
        $items = @()
        foreach ($item in $Value) {
            $items += ,(Redact-HarnessValue -Value $item)
        }
        return $items
    }

    if ($Value -is [pscustomobject]) {
        $dictionary = [ordered]@{}
        foreach ($property in $Value.PSObject.Properties) {
            $dictionary[$property.Name] = Redact-HarnessValue -Value $property.Value
        }
        return $dictionary
    }

    if ($Value -is [string]) {
        return Redact-HarnessText -Text $Value
    }

    return $Value
}

function ConvertTo-HarnessDictionary {
    param($Value)

    if ($null -eq $Value) {
        return $null
    }

    if ($Value -is [System.Collections.IDictionary]) {
        $dictionary = [ordered]@{}
        foreach ($key in $Value.Keys) {
            $dictionary[[string]$key] = ConvertTo-HarnessDictionary -Value $Value[$key]
        }
        return $dictionary
    }

    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
        $items = @()
        foreach ($item in $Value) {
            $items += ,(ConvertTo-HarnessDictionary -Value $item)
        }
        return $items
    }

    if ($Value -is [pscustomobject]) {
        $dictionary = [ordered]@{}
        foreach ($property in $Value.PSObject.Properties) {
            $dictionary[$property.Name] = ConvertTo-HarnessDictionary -Value $property.Value
        }
        return $dictionary
    }

    return $Value
}

function ConvertFrom-HarnessJson {
    param([string]$JsonText)

    if ([string]::IsNullOrWhiteSpace($JsonText)) {
        return $null
    }

    if ($PSVersionTable.PSVersion.Major -ge 6) {
        return $JsonText | ConvertFrom-Json -AsHashtable
    }

    return ConvertTo-HarnessDictionary -Value ($JsonText | ConvertFrom-Json)
}

function Test-HarnessKey {
    param(
        $Collection,
        [string]$Key
    )

    if ($null -eq $Collection) {
        return $false
    }

    return @($Collection.Keys) -contains $Key
}

function Resolve-ArtifactRelativePath {
    param(
        [string]$PathValue,
        [string]$ResolvedArtifactRoot
    )

    if (-not $PathValue) {
        return $null
    }

    $resolvedPath = Resolve-HarnessPath $PathValue
    $artifactRootNormalized = (Resolve-HarnessPath $ResolvedArtifactRoot).TrimEnd("\")
    $pathNormalized = $resolvedPath

    if ($pathNormalized.StartsWith($artifactRootNormalized, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $pathNormalized.Substring($artifactRootNormalized.Length).TrimStart("\")
        if ($relative) {
            return $relative -replace "\\", "/"
        }
    }

    return $resolvedPath
}

function Resolve-HarnessScenarioScriptPath {
    param([string]$ScriptValue)

    if (-not $ScriptValue) {
        throw "Harness scenario runner is missing a script path."
    }

    if ([System.IO.Path]::IsPathRooted($ScriptValue)) {
        return Resolve-HarnessPath $ScriptValue
    }

    return Resolve-HarnessPath (Join-Path $RepoRoot $ScriptValue)
}

function Get-HarnessScenarioDefinition {
    param(
        [string]$ResolvedFixtureRoot,
        [string]$ScenarioId
    )

    $manifestPath = Get-HarnessFixtureManifestPath -ResolvedFixtureRoot $ResolvedFixtureRoot
    if (-not (Test-Path $manifestPath)) {
        throw "Harness scenario manifest not found at $manifestPath."
    }

    $manifest = ConvertFrom-HarnessJson -JsonText (Get-Content -Raw -Path $manifestPath)
    foreach ($scenario in @($manifest.scenarios)) {
        $candidateId = if ($scenario -is [string]) { [string]$scenario } else { [string]$scenario.id }
        if (-not $candidateId -or $candidateId -ne $ScenarioId) {
            continue
        }

        $runner = if ($scenario -isnot [string] -and $scenario.runner) {
            ConvertTo-HarnessDictionary -Value $scenario.runner
        } else {
            [ordered]@{}
        }
        $definition = [ordered]@{
            id = $candidateId
            classification = if ($scenario -isnot [string] -and $scenario.classification) { [string]$scenario.classification } else { "hermetic" }
            description = if ($scenario -isnot [string]) { $scenario.description } else { $null }
            fixture_file = if ($scenario -isnot [string]) { [string]$scenario.fixture_file } else { "{0}.json" -f $candidateId }
            requires_run_metadata = @($(if ($scenario -isnot [string]) { $scenario.requires_run_metadata } else { @() }))
            expected_artifacts = @($(if ($scenario -isnot [string]) { $scenario.expected_artifacts } else { @() }))
            runner = $runner
        }

        if (-not $definition.runner.type) {
            $definition.runner.type = "python_script"
        }
        if (-not $definition.runner.script) {
            $definition.runner.script = "scripts/tutor_hermetic_smoke.py"
        }
        if (-not (Test-Path (Resolve-HarnessScenarioScriptPath -ScriptValue $definition.runner.script))) {
            throw "Harness scenario '$ScenarioId' references missing runner script '$($definition.runner.script)'."
        }

        if ($definition.fixture_file) {
            $fixturePath = Join-Path $ResolvedFixtureRoot $definition.fixture_file
            if ($definition.classification -eq "hermetic" -and -not (Test-Path $fixturePath)) {
                throw "Harness scenario '$ScenarioId' references missing fixture file '$fixturePath'."
            }
        }

        return $definition
    }

    throw "Unknown eval scenario '$ScenarioId'."
}

function Resolve-HarnessTemplateString {
    param(
        [string]$Template,
        [System.Collections.IDictionary]$Context
    )

    $value = [string]$Template
    foreach ($key in $Context.Keys) {
        $token = "{{{0}}}" -f $key
        $value = $value.Replace($token, [string]$Context[$key])
    }

    return $value
}

function Resolve-HarnessTemplateArgs {
    param(
        [object[]]$Templates,
        [System.Collections.IDictionary]$Context
    )

    $resolved = @()
    foreach ($template in @($Templates)) {
        $resolved += Resolve-HarnessTemplateString -Template ([string]$template) -Context $Context
    }
    return @($resolved)
}

function Invoke-HarnessProcess {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$WorkingDirectory,
        [string]$OutputRoot
    )

    $stdoutLog = Join-Path $OutputRoot "script.stdout.log"
    $stderrLog = Join-Path $OutputRoot "script.stderr.log"
    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru `
        -Wait

    return [ordered]@{
        exit_code = [int]$process.ExitCode
        stdout_log = $stdoutLog
        stderr_log = $stderrLog
        stdout_text = if (Test-Path $stdoutLog) { Get-Content -Raw -Path $stdoutLog } else { "" }
        stderr_text = if (Test-Path $stderrLog) { Get-Content -Raw -Path $stderrLog } else { "" }
    }
}

function Write-HarnessEvent {
    param(
        [string]$ResolvedArtifactRoot,
        [string]$ModeValue,
        [string]$Event,
        [string]$Level = "info",
        [string]$Message = "",
        [string]$RunId = $null,
        [string]$ScenarioId = $null,
        [System.Collections.IDictionary]$Details = $null
    )

    if (-not $ResolvedArtifactRoot) {
        return
    }

    $entry = [ordered]@{
        generated_at = (Get-Date).ToString("o")
        mode = $ModeValue
        event = $Event
        level = $Level
        run_id = $RunId
        scenario_id = $ScenarioId
        message = Redact-HarnessText -Text $Message
        details = if ($Details) { Redact-HarnessValue -Value $Details } else { [ordered]@{} }
    }

    $eventsPath = Get-HarnessEventsPath -ResolvedArtifactRoot $ResolvedArtifactRoot
    Add-Content -Path $eventsPath -Value ($entry | ConvertTo-Json -Depth 8 -Compress) -Encoding UTF8
}

function Resolve-HarnessFailureCode {
    param(
        [string]$ModeValue,
        [string]$Message
    )

    switch -Wildcard ($Message) {
        "Eval mode requires -Scenario.*" { return "eval.missing_scenario" }
        "Eval mode requires -ArtifactRoot.*" { return "eval.missing_artifact_root" }
        "Unknown eval scenario*" { return "eval.unknown_scenario" }
        "*requires ArtifactRoot/run.json*" { return "eval.missing_run_metadata" }
        "*requires -BaseUrl*" { return "eval.missing_base_url" }
        "*requires ArtifactRoot/run.json with db_path*" { return "eval.missing_db_path" }
        "Report mode requires -RunId.*" { return "report.missing_run_id" }
        "Report mode requires -ArtifactRoot.*" { return "report.missing_artifact_root" }
        "Report requested run_id*" { return "report.run_id_mismatch" }
        default {
            if ($ModeValue -eq "Eval") {
                return "eval.command_failed"
            }
            return "unknown"
        }
    }
}

function Get-HarnessGitMetadata {
    $gitCommand = Find-CommandCandidate -Names @("git")
    if (-not $gitCommand) {
        return [ordered]@{
            available = $false
            sha = $null
            branch = $null
        }
    }

    $sha = (& $gitCommand.Source -C $RepoRoot rev-parse HEAD 2>$null | Out-String).Trim()
    $branch = (& $gitCommand.Source -C $RepoRoot rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()

    return [ordered]@{
        available = [bool]($sha)
        sha = if ($sha) { $sha } else { $null }
        branch = if ($branch) { $branch } else { $null }
    }
}

function New-RedactedEnvironmentEntry {
    param(
        [string]$Name,
        [AllowNull()][string]$Value
    )

    $isPresent = -not [string]::IsNullOrWhiteSpace([string]$Value)
    $lowerName = $Name.ToLowerInvariant()
    $entry = [ordered]@{
        present = $isPresent
    }

    if (-not $isPresent) {
        $entry.redaction = "none"
        $entry.value = $null
        return $entry
    }

    $isSecret = $lowerName.Contains("key") -or $lowerName.Contains("token") -or $lowerName.Contains("secret") -or $lowerName.Contains("password")
    $isPath = $lowerName.EndsWith("_dir") -or $lowerName.EndsWith("_path") -or $lowerName.Contains("root")

    if ($isSecret) {
        $entry.redaction = "secret"
        $entry.value = "<redacted:secret>"
        return $entry
    }

    if ($isPath) {
        $entry.redaction = "path"
        $entry.value = "<redacted:path>"
        $entry.leaf = Split-Path -Leaf $Value
        return $entry
    }

    $entry.redaction = "none"
    $entry.value = $Value
    return $entry
}

function Get-HarnessEnvironmentSummary {
    param([hashtable]$Overrides = $null)

    $keys = @(
        "PT_BRAIN_DOTENV_OVERRIDE",
        "PT_BRAIN_PREFER_ENV_PATHS",
        "PT_BRAIN_DATA_DIR",
        "PT_BRAIN_SESSION_LOGS_DIR",
        "PT_BRAIN_OUTPUT_DIR",
        "PT_BRAIN_DB_PATH",
        "PT_BRAIN_API_CONFIG_PATH",
        "PT_STUDY_RAG_DIR",
        "PT_BRAIN_HOST",
        "PT_BRAIN_PORT",
        "PT_BRAIN_RUN_PROFILE",
        "PT_HARNESS_DISABLE_VAULT_CONTEXT",
        "GEMINI_API_KEY",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY"
    )

    $summary = [ordered]@{}
    foreach ($key in $keys) {
        $value = $null
        if ($Overrides -and $Overrides.ContainsKey($key)) {
            $value = [string]$Overrides[$key]
        } else {
            $existing = Get-Item -Path ("Env:{0}" -f $key) -ErrorAction SilentlyContinue
            $value = if ($existing) { [string]$existing.Value } else { $null }
        }

        $summary[$key] = New-RedactedEnvironmentEntry -Name $key -Value $value
    }

    return $summary
}

function Get-HarnessDurationMs {
    param(
        [datetime]$StartedAt,
        [datetime]$CompletedAt
    )

    return [int][Math]::Round(($CompletedAt - $StartedAt).TotalMilliseconds)
}

function New-HarnessCommandRecord {
    param(
        [string]$ModeValue,
        [string]$ProfileValue,
        [string]$Status,
        [int]$ExitCode,
        [datetime]$StartedAt,
        [datetime]$CompletedAt,
        [hashtable]$Arguments,
        [hashtable]$Artifacts,
        [string]$ScenarioId = $null
    )

    return [ordered]@{
        id = "{0}-{1}" -f $ModeValue.ToLowerInvariant(), [guid]::NewGuid().ToString("N").Substring(0, 8)
        mode = $ModeValue
        profile = $ProfileValue
        scenario_id = $ScenarioId
        status = $Status
        exit_code = $ExitCode
        started_at = $StartedAt.ToString("o")
        completed_at = $CompletedAt.ToString("o")
        duration_ms = Get-HarnessDurationMs -StartedAt $StartedAt -CompletedAt $CompletedAt
        arguments = if ($Arguments) { $Arguments } else { [ordered]@{} }
        artifacts = if ($Artifacts) { $Artifacts } else { [ordered]@{} }
    }
}

function Set-HarnessBundleRunSnapshot {
    param(
        [System.Collections.IDictionary]$Bundle,
        [hashtable]$RunMetadata,
        [string]$ResolvedArtifactRoot
    )

    if (-not $RunMetadata) {
        return
    }

    $Bundle["run"] = [ordered]@{
        run_id = $RunMetadata.run_id
        profile = $RunMetadata.profile
        port = $RunMetadata.port
        base_url = $RunMetadata.base_url
        dashboard_url = $RunMetadata.dashboard_url
        started_at = $RunMetadata.started_at
        server_pid = $RunMetadata.server_pid
        artifacts = [ordered]@{
            run_metadata = "run.json"
            stdout_log = Resolve-ArtifactRelativePath -PathValue $RunMetadata.stdout_log -ResolvedArtifactRoot $ResolvedArtifactRoot
            stderr_log = Resolve-ArtifactRelativePath -PathValue $RunMetadata.stderr_log -ResolvedArtifactRoot $ResolvedArtifactRoot
        }
    }
}

function Get-HarnessBundle {
    param(
        [string]$ResolvedArtifactRoot,
        [string]$DefaultProfile,
        [string]$RequestedRunId,
        [hashtable]$EnvironmentSummary
    )

    $bundlePath = Get-HarnessBundlePath -ResolvedArtifactRoot $ResolvedArtifactRoot
    $runMetadata = Get-HarnessRunMetadata -ResolvedArtifactRoot $ResolvedArtifactRoot

    if (Test-Path $bundlePath) {
        $bundle = ConvertFrom-HarnessJson -JsonText (Get-Content -Raw -Path $bundlePath)
    } else {
        $resolvedRunId = if ($RequestedRunId) { $RequestedRunId } elseif ($runMetadata -and $runMetadata.run_id) { [string]$runMetadata.run_id } else { New-HarnessRunId }
        $profileValue = if ($runMetadata -and $runMetadata.profile) { [string]$runMetadata.profile } else { $DefaultProfile }
        $bundle = [ordered]@{
            schema_version = 1
            run_id = $resolvedRunId
            profile = $profileValue
            repo = [ordered]@{
                root = $RepoRoot
                git = Get-HarnessGitMetadata
            }
            created_at = (Get-Date).ToString("o")
            updated_at = (Get-Date).ToString("o")
            artifacts = [ordered]@{
                bundle = $BundleFileName
                events = $EventsFileName
            }
            environment = [ordered]@{
                summary = if ($EnvironmentSummary) { $EnvironmentSummary } else { Get-HarnessEnvironmentSummary }
            }
            commands = @()
            scenarios = [ordered]@{}
        }
    }

    if (-not (Test-HarnessKey -Collection $bundle -Key "artifacts")) {
        $bundle.artifacts = [ordered]@{ bundle = $BundleFileName; events = $EventsFileName }
    } elseif (-not (Test-HarnessKey -Collection $bundle.artifacts -Key "bundle")) {
        $bundle.artifacts.bundle = $BundleFileName
    }
    if (-not (Test-HarnessKey -Collection $bundle.artifacts -Key "events")) {
        $bundle.artifacts.events = $EventsFileName
    }

    if (-not (Test-HarnessKey -Collection $bundle -Key "environment")) {
        $bundle.environment = [ordered]@{ summary = if ($EnvironmentSummary) { $EnvironmentSummary } else { Get-HarnessEnvironmentSummary } }
    } elseif ($EnvironmentSummary) {
        $bundle.environment.summary = $EnvironmentSummary
    }

    if (-not (Test-HarnessKey -Collection $bundle -Key "commands")) {
        $bundle.commands = @()
    }

    if (-not (Test-HarnessKey -Collection $bundle -Key "scenarios")) {
        $bundle.scenarios = [ordered]@{}
    }

    if ($RequestedRunId) {
        $bundle.run_id = $RequestedRunId
    }

    if ($runMetadata) {
        if (-not $bundle.run_id -and $runMetadata.run_id) {
            $bundle.run_id = [string]$runMetadata.run_id
        }
        Set-HarnessBundleRunSnapshot -Bundle $bundle -RunMetadata $runMetadata -ResolvedArtifactRoot $ResolvedArtifactRoot
    }

    $bundle.updated_at = (Get-Date).ToString("o")
    return $bundle
}

function Save-HarnessBundle {
    param(
        [System.Collections.IDictionary]$Bundle,
        [string]$ResolvedArtifactRoot
    )

    $Bundle.updated_at = (Get-Date).ToString("o")
    $bundlePath = Get-HarnessBundlePath -ResolvedArtifactRoot $ResolvedArtifactRoot
    $Bundle | ConvertTo-Json -Depth 8 | Set-Content -Path $bundlePath -Encoding UTF8
    return $bundlePath
}

function Add-HarnessCommandToBundle {
    param(
        [System.Collections.IDictionary]$Bundle,
        [hashtable]$CommandRecord
    )

    $commands = [System.Collections.ArrayList]::new()
    $existingEntries = @()
    if ($null -eq $Bundle["commands"]) {
        $existingEntries = @()
    } elseif ($Bundle["commands"] -is [System.Collections.IDictionary]) {
        $existingEntries = @(, $Bundle["commands"])
    } else {
        $existingEntries = @($Bundle["commands"])
    }

    foreach ($entry in $existingEntries) {
        [void]$commands.Add($entry)
    }
    [void]$commands.Add($CommandRecord)
    $Bundle["commands"] = @($commands)
}

function Merge-HarnessScenarioResults {
    param(
        [System.Collections.IDictionary]$Bundle,
        [string]$ResolvedArtifactRoot
    )

    $scenariosRoot = Join-Path $ResolvedArtifactRoot "scenarios"
    if (-not (Test-Path $scenariosRoot)) {
        return
    }

    foreach ($scenarioDirectory in Get-ChildItem -Path $scenariosRoot -Directory) {
        $resultPath = Join-Path $scenarioDirectory.FullName "result.json"
        if (-not (Test-Path $resultPath)) {
            continue
        }

        $payload = ConvertFrom-HarnessJson -JsonText (Get-Content -Raw -Path $resultPath)
        $scenarioId = [string]$payload.scenario
        $turnArtifacts = @()
        foreach ($turn in @($payload.turns)) {
            $artifactPath = $turn.artifact_path
            if ($artifactPath) {
                $turnArtifacts += Resolve-ArtifactRelativePath -PathValue $artifactPath -ResolvedArtifactRoot $ResolvedArtifactRoot
            }
        }

        $Bundle["scenarios"][$scenarioId] = [ordered]@{
            scenario_id = $scenarioId
            classification = if ($payload.scenario_type) { $payload.scenario_type } else { "hermetic" }
            description = $payload.scenario_description
            ok = [bool]$payload.ok
            generated_at = $payload.generated_at
            result_path = Resolve-ArtifactRelativePath -PathValue $resultPath -ResolvedArtifactRoot $ResolvedArtifactRoot
            turn_artifacts = @($turnArtifacts)
            summary = $payload.summary
            seeded = $payload.seeded
        }
    }
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
    $script:HarnessLastFailureDetails = $null
    $startedAt = Get-Date
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
        PT_HARNESS_DISABLE_VAULT_CONTEXT = $(if ($Profile -eq "Hermetic") { "1" } else { "0" })
    }
    $runIdValue = if ($RunId) { $RunId } else { New-HarnessRunId }
    Write-HarnessEvent -ResolvedArtifactRoot $resolvedArtifactRoot -ModeValue "Run" -Event "command_started" -RunId $runIdValue -Message "Harness run started." -Details ([ordered]@{
        profile = $Profile
        port = $Port
        data_root = Resolve-ArtifactRelativePath -PathValue $resolvedDataRoot -ResolvedArtifactRoot $resolvedArtifactRoot
    })

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
        $script:HarnessLastFailureDetails = [ordered]@{
            artifacts = [ordered]@{
                stdout_log = Resolve-ArtifactRelativePath -PathValue $stdoutLog -ResolvedArtifactRoot $resolvedArtifactRoot
                stderr_log = Resolve-ArtifactRelativePath -PathValue $stderrLog -ResolvedArtifactRoot $resolvedArtifactRoot
            }
        }
        throw "Harness run failed to reach $dashboardUrl.`nSTDOUT:`n$stdoutTail`nSTDERR:`n$stderrTail"
    }

    $metadata = [ordered]@{
        mode = "Run"
        run_id = $runIdValue
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
    $completedAt = Get-Date
    $bundle = Get-HarnessBundle -ResolvedArtifactRoot $resolvedArtifactRoot -DefaultProfile $Profile -RequestedRunId $runIdValue -EnvironmentSummary (Get-HarnessEnvironmentSummary -Overrides $runEnvironment)
    $bundle.artifacts.run_metadata = "run.json"
    Set-HarnessBundleRunSnapshot -Bundle $bundle -RunMetadata $metadata -ResolvedArtifactRoot $resolvedArtifactRoot
    Add-HarnessCommandToBundle -Bundle $bundle -CommandRecord (New-HarnessCommandRecord `
        -ModeValue "Run" `
        -ProfileValue $Profile `
        -Status "ok" `
        -ExitCode 0 `
        -StartedAt $startedAt `
        -CompletedAt $completedAt `
        -Arguments ([ordered]@{
            port = $Port
            no_browser = [bool]$NoBrowser
            skip_ui_build = [bool]$SkipUiBuild
            data_root = Resolve-ArtifactRelativePath -PathValue $resolvedDataRoot -ResolvedArtifactRoot $resolvedArtifactRoot
            artifact_root = "."
        }) `
        -Artifacts ([ordered]@{
            run_metadata = "run.json"
            stdout_log = Resolve-ArtifactRelativePath -PathValue $stdoutLog -ResolvedArtifactRoot $resolvedArtifactRoot
            stderr_log = Resolve-ArtifactRelativePath -PathValue $stderrLog -ResolvedArtifactRoot $resolvedArtifactRoot
        }))
    $bundlePath = Save-HarnessBundle -Bundle $bundle -ResolvedArtifactRoot $resolvedArtifactRoot
    Write-HarnessEvent -ResolvedArtifactRoot $resolvedArtifactRoot -ModeValue "Run" -Event "command_completed" -RunId $runIdValue -Message "Harness run completed." -Details ([ordered]@{
        dashboard_url = $dashboardUrl
        bundle = Resolve-ArtifactRelativePath -PathValue $bundlePath -ResolvedArtifactRoot $resolvedArtifactRoot
    })

    if (-not $NoBrowser) {
        Start-Process $dashboardUrl | Out-Null
    }

    Write-Host "[OK] Harness run is live at $dashboardUrl"
    Write-Host "[OK] Run metadata: $(Join-Path $resolvedArtifactRoot "run.json")"
    Write-Host "[OK] Harness bundle: $bundlePath"
}

function Get-HarnessRunMetadata {
    param([string]$ResolvedArtifactRoot)

    $runMetadataPath = Join-Path $ResolvedArtifactRoot "run.json"
    if (-not (Test-Path $runMetadataPath)) {
        return $null
    }

    return ConvertFrom-HarnessJson -JsonText (Get-Content -Raw -Path $runMetadataPath)
}

function Invoke-HarnessEval {
    $script:HarnessLastFailureDetails = $null
    $startedAt = Get-Date
    if (-not $Scenario) {
        throw "Eval mode requires -Scenario."
    }
    if (-not $ArtifactRoot) {
        throw "Eval mode requires -ArtifactRoot."
    }

    $resolvedArtifactRoot = (Resolve-Path -Path (New-Item -ItemType Directory -Force -Path $ArtifactRoot)).Path
    $scenarioArtifactRoot = (Resolve-Path -Path (New-Item -ItemType Directory -Force -Path (Join-Path $resolvedArtifactRoot "scenarios\$Scenario"))).Path
    $runMetadata = Get-HarnessRunMetadata -ResolvedArtifactRoot $resolvedArtifactRoot
    $resolvedFixtureRoot = Resolve-HarnessPath $(if ($FixtureRoot) { $FixtureRoot } else { $DefaultFixtureRoot })
    $scenarioDefinition = Get-HarnessScenarioDefinition -ResolvedFixtureRoot $resolvedFixtureRoot -ScenarioId $Scenario

    if (-not $runMetadata) {
        throw "Eval scenario '$Scenario' requires ArtifactRoot/run.json from a prior harness Run invocation."
    }

    $effectiveBaseUrl = if ($BaseUrl) { $BaseUrl } elseif ($runMetadata.base_url) { [string]$runMetadata.base_url } else { $null }
    $dbPath = if ($runMetadata.db_path) { [string]$runMetadata.db_path } else { $null }

    foreach ($requiredField in @($scenarioDefinition.requires_run_metadata)) {
        switch ([string]$requiredField) {
            "base_url" {
                if (-not $effectiveBaseUrl) {
                    throw "Eval scenario '$Scenario' requires -BaseUrl or ArtifactRoot/run.json with base_url."
                }
            }
            "db_path" {
                if (-not $dbPath) {
                    throw "Eval scenario '$Scenario' requires ArtifactRoot/run.json with db_path."
                }
            }
        }
    }

    $context = [ordered]@{
        scenario_id = $Scenario
        repo_root = $RepoRoot
        fixture_root = $resolvedFixtureRoot
        artifact_root = $resolvedArtifactRoot
        scenario_artifact_root = $scenarioArtifactRoot
        base_url = if ($effectiveBaseUrl) { $effectiveBaseUrl } else { "" }
        db_path = if ($dbPath) { $dbPath } else { "" }
    }
    Write-HarnessEvent -ResolvedArtifactRoot $resolvedArtifactRoot -ModeValue "Eval" -Event "command_started" -RunId $(if ($runMetadata.run_id) { [string]$runMetadata.run_id } else { $RunId }) -ScenarioId $Scenario -Message "Harness eval started." -Details ([ordered]@{
        scenario_id = $Scenario
        classification = [string]$scenarioDefinition.classification
        base_url = $effectiveBaseUrl
    })

    $resultPath = Join-Path $scenarioArtifactRoot "result.json"
    $defaultStdoutLog = Join-Path $scenarioArtifactRoot "script.stdout.log"
    $defaultStderrLog = Join-Path $scenarioArtifactRoot "script.stderr.log"
    $script:HarnessLastFailureDetails = [ordered]@{
        artifacts = [ordered]@{
            result = Resolve-ArtifactRelativePath -PathValue $resultPath -ResolvedArtifactRoot $resolvedArtifactRoot
            stdout_log = Resolve-ArtifactRelativePath -PathValue $defaultStdoutLog -ResolvedArtifactRoot $resolvedArtifactRoot
            stderr_log = Resolve-ArtifactRelativePath -PathValue $defaultStderrLog -ResolvedArtifactRoot $resolvedArtifactRoot
        }
        summary = [ordered]@{}
    }

    $runner = $scenarioDefinition.runner
    $scriptPath = Resolve-HarnessScenarioScriptPath -ScriptValue ([string]$runner.script)
    $scriptArgs = Resolve-HarnessTemplateArgs -Templates @($runner.args_template) -Context $context
    $workingDirectory = $RepoRoot
    switch ([string]$runner.type) {
        "python_script" {
            $python = Get-PythonLaunch
            $processResult = Invoke-HarnessProcess `
                -FilePath $python.FilePath `
                -ArgumentList @($python.Prefix + @($scriptPath) + $scriptArgs) `
                -WorkingDirectory $workingDirectory `
                -OutputRoot $scenarioArtifactRoot
        }
        "powershell_script" {
            $processResult = Invoke-HarnessProcess `
                -FilePath $ShellExecutable `
                -ArgumentList @((@("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $scriptPath) + $scriptArgs)) `
                -WorkingDirectory $workingDirectory `
                -OutputRoot $scenarioArtifactRoot
        }
        default {
            throw "Harness scenario '$Scenario' uses unsupported runner type '$($runner.type)'."
        }
    }

    $stdoutText = [string]$processResult.stdout_text
    if ($processResult.exit_code -ne 0 -and -not $stdoutText -and -not $processResult.stderr_text) {
        throw "Eval scenario '$Scenario' failed with exit code $($processResult.exit_code)."
    }

    $payload = $null
    if ($runner.expects_json) {
        $payload = ConvertFrom-HarnessJson -JsonText $stdoutText
        if (-not $payload) {
            $failureText = if ($processResult.stderr_text) {
                [string]$processResult.stderr_text
            } elseif ($stdoutText) {
                [string]$stdoutText
            } else {
                "Eval scenario '$Scenario' did not emit JSON output."
            }

            $payload = [ordered]@{
                ok = $false
                error = Redact-HarnessText -Text $failureText
                summary = [ordered]@{
                    pass_count = 0
                    fail_count = 1
                    check_count = 1
                }
            }
        }
    } else {
        $payload = [ordered]@{
            ok = ($processResult.exit_code -eq 0)
        }
    }

    $payload = ConvertTo-HarnessDictionary -Value $payload
    $payload.scenario = $Scenario
    $payload.scenario_type = [string]$scenarioDefinition.classification
    $payload.scenario_description = $scenarioDefinition.description
    $payload.exit_code = [int]$processResult.exit_code
    if (-not (Test-HarnessKey -Collection $payload -Key "ok")) {
        $payload.ok = ($processResult.exit_code -eq 0)
    }
    if (-not $payload.generated_at) {
        $payload.generated_at = (Get-Date).ToString("o")
    }
    if ($effectiveBaseUrl -and -not $payload.base_url) {
        $payload.base_url = $effectiveBaseUrl
    }
    if ($dbPath -and -not $payload.db_path) {
        $payload.db_path = $dbPath
    }
    $payload.fixture_root = $resolvedFixtureRoot
    $payload.artifact_root = $scenarioArtifactRoot
    if (-not $payload.summary) {
        $payload.summary = [ordered]@{}
    }
    if (-not (Test-HarnessKey -Collection $payload.summary -Key "pass_count") -and (Test-HarnessKey -Collection $payload -Key "checks")) {
        $checkCount = @($payload.checks).Count
        $passCount = @($payload.checks | Where-Object { $_.ok }).Count
        $payload.summary.pass_count = $passCount
        $payload.summary.fail_count = $checkCount - $passCount
        $payload.summary.check_count = $checkCount
    }
    if (-not $payload.artifacts) {
        $payload.artifacts = [ordered]@{}
    }
    $payload.artifacts.stdout_log = Split-Path -Leaf $processResult.stdout_log
    $payload.artifacts.stderr_log = Split-Path -Leaf $processResult.stderr_log
    if (@($scenarioDefinition.expected_artifacts).Count -gt 0) {
        $payload.expected_artifacts = @($scenarioDefinition.expected_artifacts)
    }
    $payload | ConvertTo-Json -Depth 10 | Set-Content -Path $resultPath -Encoding UTF8

    if ($processResult.exit_code -ne 0 -or -not [bool]$payload.ok) {
        $script:HarnessLastFailureDetails = [ordered]@{
            artifacts = [ordered]@{
                result = Resolve-ArtifactRelativePath -PathValue $resultPath -ResolvedArtifactRoot $resolvedArtifactRoot
                stdout_log = Resolve-ArtifactRelativePath -PathValue $processResult.stdout_log -ResolvedArtifactRoot $resolvedArtifactRoot
                stderr_log = Resolve-ArtifactRelativePath -PathValue $processResult.stderr_log -ResolvedArtifactRoot $resolvedArtifactRoot
            }
            summary = if ($payload.summary) { $payload.summary } else { [ordered]@{} }
        }
        $errorDetail = if ($payload.error) { [string]$payload.error } elseif ($processResult.stderr_text) { [string]$processResult.stderr_text } else { [string]$processResult.stdout_text }
        throw "Eval scenario '$Scenario' failed with exit code $($processResult.exit_code).`n$(Redact-HarnessText -Text $errorDetail)"
    }

    $completedAt = Get-Date
    $bundle = Get-HarnessBundle -ResolvedArtifactRoot $resolvedArtifactRoot -DefaultProfile $(if ($runMetadata.profile) { [string]$runMetadata.profile } else { $Profile }) -RequestedRunId $(if ($runMetadata.run_id) { [string]$runMetadata.run_id } else { $RunId }) -EnvironmentSummary (Get-HarnessEnvironmentSummary)
    Set-HarnessBundleRunSnapshot -Bundle $bundle -RunMetadata $runMetadata -ResolvedArtifactRoot $resolvedArtifactRoot
    Merge-HarnessScenarioResults -Bundle $bundle -ResolvedArtifactRoot $resolvedArtifactRoot
    Add-HarnessCommandToBundle -Bundle $bundle -CommandRecord (New-HarnessCommandRecord `
        -ModeValue "Eval" `
        -ProfileValue $(if ($runMetadata.profile) { [string]$runMetadata.profile } else { $Profile }) `
        -Status "ok" `
        -ExitCode 0 `
        -StartedAt $startedAt `
        -CompletedAt $completedAt `
        -Arguments ([ordered]@{
            scenario = $Scenario
            artifact_root = "."
            base_url = $effectiveBaseUrl
        }) `
        -Artifacts ([ordered]@{
            result = Resolve-ArtifactRelativePath -PathValue $resultPath -ResolvedArtifactRoot $resolvedArtifactRoot
            stdout_log = Resolve-ArtifactRelativePath -PathValue $processResult.stdout_log -ResolvedArtifactRoot $resolvedArtifactRoot
            stderr_log = Resolve-ArtifactRelativePath -PathValue $processResult.stderr_log -ResolvedArtifactRoot $resolvedArtifactRoot
        }) `
        -ScenarioId $Scenario)
    $bundlePath = Save-HarnessBundle -Bundle $bundle -ResolvedArtifactRoot $resolvedArtifactRoot
    Write-HarnessEvent -ResolvedArtifactRoot $resolvedArtifactRoot -ModeValue "Eval" -Event "command_completed" -RunId [string]$bundle.run_id -ScenarioId $Scenario -Message "Harness eval completed." -Details ([ordered]@{
        scenario_id = $Scenario
        classification = [string]$scenarioDefinition.classification
        result = Resolve-ArtifactRelativePath -PathValue $resultPath -ResolvedArtifactRoot $resolvedArtifactRoot
        bundle = Resolve-ArtifactRelativePath -PathValue $bundlePath -ResolvedArtifactRoot $resolvedArtifactRoot
    })

    if ($Json) {
        Write-Output ($payload | ConvertTo-Json -Depth 8)
    } else {
        Write-Host "[OK] Harness eval passed for scenario '$Scenario'."
        Write-Host "[OK] Result artifact: $(Join-Path $scenarioArtifactRoot "result.json")"
        Write-Host "[OK] Bundle: $bundlePath"
        Write-Host "[OK] Turn count: $($payload.summary.turn_count)"
    }
}

function Invoke-HarnessReport {
    $startedAt = Get-Date
    if (-not $RunId) {
        throw "Report mode requires -RunId."
    }
    if (-not $ArtifactRoot) {
        throw "Report mode requires -ArtifactRoot."
    }

    $resolvedArtifactRoot = (Resolve-Path -Path (New-Item -ItemType Directory -Force -Path $ArtifactRoot)).Path
    $inputRootValue = if ($InputRoot) { $InputRoot } else { $resolvedArtifactRoot }
    $resolvedInputRoot = Resolve-HarnessPath $inputRootValue
    $runMetadata = Get-HarnessRunMetadata -ResolvedArtifactRoot $resolvedArtifactRoot
    Write-HarnessEvent -ResolvedArtifactRoot $resolvedArtifactRoot -ModeValue "Report" -Event "command_started" -RunId $RunId -Message "Harness report started." -Details ([ordered]@{
        input_root = Resolve-ArtifactRelativePath -PathValue $resolvedInputRoot -ResolvedArtifactRoot $resolvedArtifactRoot
    })

    $bundle = Get-HarnessBundle -ResolvedArtifactRoot $resolvedArtifactRoot -DefaultProfile $(if ($runMetadata -and $runMetadata.profile) { [string]$runMetadata.profile } else { $Profile }) -RequestedRunId $RunId -EnvironmentSummary (Get-HarnessEnvironmentSummary)
    if ($bundle.run_id -and $bundle.run_id -ne $RunId) {
        throw "Report requested run_id '$RunId' but artifact bundle contains '$($bundle.run_id)'."
    }

    if ($runMetadata) {
        Set-HarnessBundleRunSnapshot -Bundle $bundle -RunMetadata $runMetadata -ResolvedArtifactRoot $resolvedArtifactRoot
    }
    Merge-HarnessScenarioResults -Bundle $bundle -ResolvedArtifactRoot $resolvedInputRoot

    $completedAt = Get-Date
    Add-HarnessCommandToBundle -Bundle $bundle -CommandRecord (New-HarnessCommandRecord `
        -ModeValue "Report" `
        -ProfileValue $(if ($bundle.profile) { [string]$bundle.profile } else { $Profile }) `
        -Status "ok" `
        -ExitCode 0 `
        -StartedAt $startedAt `
        -CompletedAt $completedAt `
        -Arguments ([ordered]@{
            run_id = $RunId
            artifact_root = "."
            input_root = Resolve-ArtifactRelativePath -PathValue $resolvedInputRoot -ResolvedArtifactRoot $resolvedArtifactRoot
        }) `
        -Artifacts ([ordered]@{
            bundle = $BundleFileName
        }))
    $bundlePath = Save-HarnessBundle -Bundle $bundle -ResolvedArtifactRoot $resolvedArtifactRoot
    Write-HarnessEvent -ResolvedArtifactRoot $resolvedArtifactRoot -ModeValue "Report" -Event "command_completed" -RunId [string]$bundle.run_id -Message "Harness report completed." -Details ([ordered]@{
        bundle = Resolve-ArtifactRelativePath -PathValue $bundlePath -ResolvedArtifactRoot $resolvedArtifactRoot
        scenario_count = @($bundle.scenarios.Keys).Count
    })

    if ($Json) {
        Write-Output ($bundle | ConvertTo-Json -Depth 8)
    } else {
        Write-Host "[OK] Harness report generated."
        Write-Host "[OK] Bundle: $bundlePath"
        Write-Host "[OK] Scenarios: $(@($bundle.scenarios.Keys).Count)"
    }
}

try {
    $script:HarnessLastFailureDetails = $null
    switch ($Mode) {
        "Bootstrap" {
            Invoke-HarnessBootstrap
        }
        "Run" {
            Invoke-HarnessRun
        }
        "Eval" {
            Invoke-HarnessEval
        }
        "Report" {
            Invoke-HarnessReport
        }
        default {
            throw "Mode '$Mode' is not implemented yet. T6 only ships Run mode."
        }
    }
} catch {
    $failureMessage = Redact-HarnessText -Text $_.Exception.Message
    $failureCode = Resolve-HarnessFailureCode -ModeValue $Mode -Message $failureMessage
    $exitCode = if ($HarnessExitCodes.ContainsKey($failureCode)) { $HarnessExitCodes[$failureCode] } else { 1 }
    $resolvedFailureArtifactRoot = $null
    if ($ArtifactRoot) {
        try {
            $resolvedFailureArtifactRoot = (Resolve-Path -Path (New-Item -ItemType Directory -Force -Path $ArtifactRoot)).Path
        } catch {
            $resolvedFailureArtifactRoot = $null
        }
    }

    if ($resolvedFailureArtifactRoot) {
        $failureDetails = [ordered]@{
            code = $failureCode
        }
        if ($script:HarnessLastFailureDetails) {
            if ($script:HarnessLastFailureDetails.artifacts) {
                $failureDetails.failure_artifacts = $script:HarnessLastFailureDetails.artifacts
            }
            if ($script:HarnessLastFailureDetails.summary) {
                $failureDetails.failure_summary = $script:HarnessLastFailureDetails.summary
            }
        }
        Write-HarnessEvent -ResolvedArtifactRoot $resolvedFailureArtifactRoot -ModeValue $Mode -Event "command_failed" -Level "error" -RunId $RunId -ScenarioId $Scenario -Message $failureMessage -Details ([ordered]@{
            code = $failureCode
            failure_artifacts = $failureDetails.failure_artifacts
            failure_summary = $failureDetails.failure_summary
        })
    }

    if ($Json) {
        $responseArtifacts = [ordered]@{}
        if ($resolvedFailureArtifactRoot) {
            $responseArtifacts.events = $EventsFileName
        }
        if ($script:HarnessLastFailureDetails -and $script:HarnessLastFailureDetails.artifacts) {
            foreach ($artifactKey in $script:HarnessLastFailureDetails.artifacts.Keys) {
                $responseArtifacts[$artifactKey] = $script:HarnessLastFailureDetails.artifacts[$artifactKey]
            }
        }
        [ordered]@{
            ok = $false
            code = $failureCode
            exit_code = $exitCode
            message = $failureMessage
            mode = $Mode
            profile = $Profile
            scenario = $Scenario
            run_id = $RunId
            generated_at = (Get-Date).ToString("o")
            artifacts = $responseArtifacts
        } | ConvertTo-Json -Depth 6 | Write-Output
    } else {
        Write-Error $failureMessage
    }

    exit $exitCode
}
