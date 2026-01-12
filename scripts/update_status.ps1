$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptRoot "..")).Path

$orchestratorRuns = Join-Path $repoRoot "scholar\\outputs\\orchestrator_runs"
$systemMap = Join-Path $repoRoot "scholar\\outputs\\system_map"
$planUpdates = Join-Path $repoRoot "scholar\\outputs\\plan_updates"
$proposalSeeds = Join-Path $repoRoot "scholar\\outputs\\proposal_seeds"
$moduleDossiers = Join-Path $repoRoot "scholar\\outputs\\module_dossiers"
$researchNotebook = Join-Path $repoRoot "scholar\\outputs\\research_notebook"
$gapAnalysis = Join-Path $repoRoot "scholar\\outputs\\gap_analysis"
$reports = Join-Path $repoRoot "scholar\\outputs\\reports"
$promotionQueue = Join-Path $repoRoot "scholar\\outputs\\promotion_queue"
$proposalsRoot = Join-Path $repoRoot "scholar\\outputs\\proposals"
$proposalsApproved = Join-Path $proposalsRoot "approved"
$proposalsRejected = Join-Path $proposalsRoot "rejected"
$implementationBundles = Join-Path $repoRoot "scholar\\outputs\\implementation_bundles"
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
$latestResolved = Get-LatestFile $orchestratorRuns "questions_resolved_*.md"
$latestAnswered = Get-LatestFile $orchestratorRuns "questions_answered_*.md"
$latestLog = Get-LatestFile $orchestratorRuns "unattended_*.log"
$latestVerification = Get-LatestFile $orchestratorRuns "verification_report_*.md"

$latestCoverage = Get-LatestFile $systemMap "coverage_checklist_*.md"
$latestRepoIndex = Get-LatestFile $systemMap "repo_index_*.md"
$latestPlanUpdate = Get-LatestFile $planUpdates "*.md"
$latestProposalSeed = Get-LatestFile $proposalSeeds "*.md"
$latestDossier = Get-LatestFile $moduleDossiers "*_dossier_*.md"
$latestResearch = Get-LatestFile $researchNotebook "*.md"
$latestReport = Get-LatestFile $reports "*.md"
$latestGap = Get-LatestFile $gapAnalysis "gap_analysis_*.md"
$latestPromotionQueue = Get-LatestFile $promotionQueue "*.md"
$latestProposalApproved = Get-LatestFile $proposalsApproved "*.md"
$latestProposalRejected = Get-LatestFile $proposalsRejected "*.md"
$latestImplementationBundle = Get-LatestFile $implementationBundles "*.md"

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
$linesOut += (Format-FileEntry "questions_resolved" $latestResolved)
$linesOut += (Format-FileEntry "questions_answered" $latestAnswered)
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
$linesOut += "  - plan_updates: " + $(if ($latestPlanUpdate) { "$($latestPlanUpdate.FullName) ($($latestPlanUpdate.LastWriteTime))" } else { "(not found)" })
$linesOut += "  - proposal_seeds: " + $(if ($latestProposalSeed) { "$($latestProposalSeed.FullName) ($($latestProposalSeed.LastWriteTime))" } else { "(not found)" })
$linesOut += "  - module_dossiers: " + $(if ($latestDossier) { "$($latestDossier.FullName) ($($latestDossier.LastWriteTime))" } else { "(not found)" })
$linesOut += "  - research_notebook: " + $(if ($latestResearch) { "$($latestResearch.FullName) ($($latestResearch.LastWriteTime))" } else { "(not found)" })
$linesOut += "  - reports: " + $(if ($latestReport) { "$($latestReport.FullName) ($($latestReport.LastWriteTime))" } else { "(not found)" })
$linesOut += "  - gap_analysis: " + $(if ($latestGap) { "$($latestGap.FullName) ($($latestGap.LastWriteTime))" } else { "(not found)" })
$linesOut += ""
$pendingCount = if (Test-Path $promotionQueue) { (Get-ChildItem -Path $promotionQueue -File).Count } else { 0 }
$approvedCount = if (Test-Path $proposalsApproved) { (Get-ChildItem -Path $proposalsApproved -File).Count } else { 0 }
$rejectedCount = if (Test-Path $proposalsRejected) { (Get-ChildItem -Path $proposalsRejected -File).Count } else { 0 }
$linesOut += "## Proposals Snapshot"
$linesOut += "- pending_count: $pendingCount"
$linesOut += "- approved_count: $approvedCount"
$linesOut += "- rejected_count: $rejectedCount"
$linesOut += (Format-FileEntry "promotion_queue_latest" $latestPromotionQueue)
$linesOut += (Format-FileEntry "proposals_approved_latest" $latestProposalApproved)
$linesOut += (Format-FileEntry "proposals_rejected_latest" $latestProposalRejected)
$linesOut += (Format-FileEntry "implementation_bundle_latest" $latestImplementationBundle)
$linesOut += ""
$linesOut += "## What to do now"
$linesOut += "1) Open the latest unattended_final."
$linesOut += "2) If questions_needed is non-empty, answer it. (Current: $questionsStatus)"
$linesOut += "3) Confirm questions_resolved is updated after answering."
$linesOut += "4) Review pending proposals if any."
$linesOut += "5) Review latest plan_updates (if present)."
$linesOut += "6) Generate or review latest implementation bundle."
$linesOut += "7) Ignore everything else."
$linesOut += ""
$linesOut += "## Counts Snapshot"
$linesOut += "Folder | #files | newest file"
$linesOut += "---|---:|---"
$folderList = @(
  @{Name="system_map"; Path=$systemMap},
  @{Name="plan_updates"; Path=$planUpdates},
  @{Name="proposal_seeds"; Path=$proposalSeeds},
  @{Name="module_dossiers"; Path=$moduleDossiers},
  @{Name="research_notebook"; Path=$researchNotebook},
  @{Name="gap_analysis"; Path=$gapAnalysis},
  @{Name="reports"; Path=$reports},
  @{Name="promotion_queue"; Path=$promotionQueue},
  @{Name="proposals_approved"; Path=$proposalsApproved},
  @{Name="proposals_rejected"; Path=$proposalsRejected},
  @{Name="implementation_bundles"; Path=$implementationBundles}
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
