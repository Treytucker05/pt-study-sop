$packPath = "C:\pt-study-sop\docs\custom_gpt_deployment_pack.md"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$acceptance = @"
Core mode, first exposure.
LO → Milestone Map first.
One-Step rule.
No MCQ in Core.
No answer leakage.
WRAP outputs ONLY Exit Ticket + Session Ledger (Lite Wrap).

LO: "Explain the muscle spindle and its role in the stretch reflex."
Start now.
"@

$files = @(
    "sop/runtime/knowledge_upload/00_INDEX_AND_RULES.md",
    "sop/runtime/knowledge_upload/01_MODULES_M0-M6.md",
    "sop/runtime/knowledge_upload/02_FRAMEWORKS.md",
    "sop/runtime/knowledge_upload/03_ENGINES.md",
    "sop/runtime/knowledge_upload/04_LOGGING_AND_TEMPLATES.md",
    "sop/runtime/knowledge_upload/05_EXAMPLES_MINI.md"
)

Write-Host "Deployment Pack: $packPath"
Write-Host ""
Write-Host "Acceptance Test Message:"
Write-Host $acceptance
Write-Host "Knowledge Upload Order:"
$files | ForEach-Object { Write-Host " - $_" }
