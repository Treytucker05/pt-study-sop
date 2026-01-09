$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptRoot "..")).Path

$orchestratorRuns = Join-Path $repoRoot "scholar\\outputs\\orchestrator_runs"
$systemMap = Join-Path $repoRoot "scholar\\outputs\\system_map"
$moduleDossiers = Join-Path $repoRoot "scholar\\outputs\\module_dossiers"
$researchNotebook = Join-Path $repoRoot "scholar\\outputs\\research_notebook"
$gapAnalysis = Join-Path $repoRoot "scholar\\outputs\\gap_analysis"
$reports = Join-Path $repoRoot "scholar\\outputs\\reports"
$promotionQueue = Join-Path $repoRoot "scholar\\outputs\\promotion_queue"
$auditManifestPath = Join-Path $repoRoot "scholar\\inputs\\audit_manifest.json"
$statusPath = Join-Path $repoRoot "scholar\\outputs\\STATUS.md"

function Get-LatestFile {
  param(
    [string]$Path,
    [string]$Filter
  )
  if (Test-Path $Path) {
    return Get-ChildItem -Path $Path -Filter $Filter -File |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
  }
  return $null
}

function Format-FileEntry {
  param(
    [string]$Label,
    $File
  )
  if ($null -ne $File) {
    return "- ${Label}: $($File.FullName) ($($File.LastWriteTime))"
  }
  return "- ${Label}: (not found)"
}

$latestFinal = Get-LatestFile $orchestratorRuns "unattended_final_*.md"
$latestQuestions = Get-LatestFile $orchestratorRuns "questions_needed_*.md"
$latestLog = Get-LatestFile $orchestratorRuns "unattended_*.log"
$latestVerification = Get-LatestFile $orchestratorRuns "verification_report_*.md"

$latestCoverage = Get-LatestFile $systemMap "coverage_checklist_*.md"
$latestRepoIndex = Get-LatestFile $systemMap "repo_index_*.md"
$latestDossier = Get-LatestFile $moduleDossiers "*_dossier_*.md"
$latestResearch = Get-LatestFile $researchNotebook "*.md"
$latestReport = Get-LatestFile $reports "*.md"
$latestGap = Get-LatestFile $gapAnalysis "gap_analysis_*.md"

$safeMode = "(unknown)"
if (Test-Path $auditManifestPath) {
  try {
    $audit = Get-Content -Raw -Path $auditManifestPath | ConvertFrom-Json
    if ($null -ne $audit.safe_mode) {
      $safeMode = $audit.safe_mode
    }
  } catch {
    $safeMode = "(unreadable)"
  }
}

$questionsStatus = "missing"
if ($latestQuestions) {
  $content = Get-Content -Raw -Path $latestQuestions.FullName
  $trimmed = $content.Trim()
  if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed -eq "(none)") {
    $questionsStatus = "empty"
  } else {
    $questionsStatus = "non-empty"
  }
}

$coverageComplete = "n/a"
$coverageInProgress = "n/a"
$coverageNotStarted = "n/a"
if ($latestCoverage) {
  $lines = Get-Content -Path $latestCoverage.FullName
  $coverageComplete = ($lines | Where-Object { $_ -match '\[x\]' }).Count
  $coverageInProgress = ($lines | Where-Object { $_ -match '\[/\]' }).Count
  $coverageNotStarted = ($lines | Where-Object { $_ -match '\[ \]' }).Count
}

$linesOut = @()
$linesOut += "# Scholar Status"
$linesOut += ""
$linesOut += "Updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$linesOut += "Repo: $repoRoot"
$linesOut += ""
$linesOut += "## Latest Run"
$linesOut += (Format-FileEntry "unattended_final" $latestFinal)
$linesOut += (Format-FileEntry "questions_needed" $latestQuestions)
$linesOut += (Format-FileEntry "unattended_log" $latestLog)
if ($latestVerification) {
  $linesOut += (Format-FileEntry "verification_report" $latestVerification)
} else {
  $linesOut += "- verification_report: (not found)"
}
$linesOut += ""
$linesOut += "## Progress Snapshot"
if ($latestCoverage) {
  $linesOut += (Format-FileEntry "coverage_checklist" $latestCoverage)
  $linesOut += "- Coverage counts: Complete=$coverageComplete | In progress=$coverageInProgress | Not started=$coverageNotStarted"
} else {
  $linesOut += "- coverage_checklist: (not found)"
}
if ($latestRepoIndex) {
  $linesOut += (Format-FileEntry "repo_index" $latestRepoIndex)
}
$linesOut += "- Newest artifacts:"
$linesOut += "  - module_dossiers: " + $(if ($latestDossier) { "$($latestDossier.FullName) ($($latestDossier.LastWriteTime))" } else { "(not found)" })
$linesOut += "  - research_notebook: " + $(if ($latestResearch) { "$($latestResearch.FullName) ($($latestResearch.LastWriteTime))" } else { "(not found)" })
$linesOut += "  - reports: " + $(if ($latestReport) { "$($latestReport.FullName) ($($latestReport.LastWriteTime))" } else { "(not found)" })
$linesOut += "  - gap_analysis: " + $(if ($latestGap) { "$($latestGap.FullName) ($($latestGap.LastWriteTime))" } else { "(not found)" })
$linesOut += ""
$linesOut += "## What to do now"
$linesOut += "1) Open the latest unattended_final."
$linesOut += "2) If questions_needed is non-empty, answer it. (Current: $questionsStatus)"
$linesOut += "3) Ignore everything else."
$linesOut += ""
$linesOut += "## Counts Snapshot"
$linesOut += "Folder | #files | newest file"
$linesOut += "---|---:|---"
$folderList = @(
  @{Name="system_map"; Path=$systemMap},
  @{Name="module_dossiers"; Path=$moduleDossiers},
  @{Name="research_notebook"; Path=$researchNotebook},
  @{Name="gap_analysis"; Path=$gapAnalysis},
  @{Name="reports"; Path=$reports},
  @{Name="promotion_queue"; Path=$promotionQueue}
)
foreach ($f in $folderList) {
  if (Test-Path $f.Path) {
    $files = Get-ChildItem -Path $f.Path -File
    $count = $files.Count
    $newest = if ($count -gt 0) { ($files | Sort-Object LastWriteTime -Descending | Select-Object -First 1).Name } else { "(none)" }
    $linesOut += "$($f.Name) | $count | $newest"
  } else {
    $linesOut += "$($f.Name) | 0 | (missing)"
  }
}
$linesOut += ""
$linesOut += "## Safe Mode"
$linesOut += "safe_mode: $safeMode"

$linesOut | Set-Content -Path $statusPath -Encoding UTF8
