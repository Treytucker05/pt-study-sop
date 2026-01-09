# Diagnostic Brief

A) Executive Summary
- Unattended run working: Y (latest unattended log shows the prompt executed and wrote outputs beyond orchestrator_runs, but it is a single-iteration run).
- Orchestrator prompt unattended: Y (explicitly forbids terminal questions; redirects them to a file).
- Why outputs are missing: 1) runner uses unsupported --yolo so some runs exit with help; 2) prompt only mandates module_dossier/research_note + coverage checklist, not system_map/gap_analysis/reports each run; 3) promotion_queue is blocked unless a safe-mode flag exists in the audit manifest.
- Most important next fix: Update scripts/run_scholar.bat to remove --yolo, use supported non-interactive flags, fix the timestamp, and drop the final pause so the run can fully complete unattended.
- Paste into ChatGPT next: this diagnostic brief, scripts/run_scholar.bat, first 80 lines of scholar/workflows/orchestrator_run_prompt.md, last 60 lines of the latest unattended log, and a directory listing of scholar/outputs/.

B) Environment + CLI
- Codex version: codex-cli 0.79.0 (codex --version).
- codex exec availability: Yes (listed in codex --help).
- Relevant flags: -C/--cd supported; --search supported; --yolo is NOT listed for codex or codex exec; exec supports stdin when PROMPT is omitted or "-" is used (codex exec --help).
- Git branch: scholar-orchestrator-loop.
- Git status: dirty; modified: .gitignore, scholar/outputs/orchestrator_runs/coverage_report_2026-01-07.md, scholar/outputs/orchestrator_runs/questions_backlog_2026-01-07.md, scholar/outputs/system_map/coverage_checklist_2026-01-07.md, scholar/workflows/orchestrator_run_prompt.md, scripts/run_scholar.bat; untracked: multiple brain/session_logs/* plus new output artifacts (M1/M4 dossiers, research notes, run log, unattended final, module audit).

C) Runner Behavior (BAT)
- Command line used: codex --search exec --cd "%REPO_ROOT%" --yolo --output-last-message "%FINAL_PATH%" - < "%PROMPT_FILE%" >> "%LOG_PATH%" 2>&1 (scripts/run_scholar.bat:37).
- Does it always run search+yolo unattended? It attempts search+--yolo, but --yolo is not a supported flag in codex 0.79.0; launcher_codex.log shows a help dump consistent with a failed invocation.
- Does it write log and final file paths? Yes (LOG_PATH and FINAL_PATH are set and echoed in scripts/run_scholar.bat:20-28).
- Quoting/date formatting bugs? Yes. The %date% token parsing yields filenames like unattended_07-Wed-01_175409.log instead of YYYY-MM-DD (scripts/run_scholar.bat:16-18). Also, pause at the end blocks unattended completion (scripts/run_scholar.bat:45).

D) Orchestrator Prompt Reality Check
- Interactive questions in terminal: No (scholar/workflows/orchestrator_run_prompt.md:8-14).
- Global scan first? No explicit full repo scan or repo_index refresh; it only reads the latest repo_index and coverage checklist (scholar/workflows/orchestrator_run_prompt.md:18).
- Choose next module group automatically? No; default scope is fixed to M0-M6 + bridges (scholar/workflows/orchestrator_run_prompt.md:19).
- Require artifacts outside orchestrator_runs each run? Partially; it requires research_note and module_dossier/module_audit, but does not require system_map/gap_analysis/reports each run (scholar/workflows/orchestrator_run_prompt.md:27-34).
- Work selection policy vs one cycle? One cycle only; no auto-advance beyond "Execution Cycle (One Iteration)" (scholar/workflows/orchestrator_run_prompt.md:22).

First 10 lines of orchestrator_run_prompt.md:
```text
1:# Scholar Orchestrator: Unattended Runbook Prompt
2:
3:- Role: The Scholar Meta-System
4:- Context: Continuous improvement loop for Tutor/SOP.
5:
6:## UNATTENDED MODE (Non-Interactive)
7:
8:- You are running non-interactively. Do **NOT** ask questions in the terminal.
9:- Use defaults **WITHOUT** prompting:
10:  - **Module group**: M0â€“M6 cycle + bridges.
```

Section headings:
```text
# Scholar Orchestrator: Unattended Runbook Prompt
## UNATTENDED MODE (Non-Interactive)
## Runtime Instructions for Cortex/Codex
## Execution Cycle (One Iteration)
## Stalling Rule
## Guardrails
```

E) Output Inventory Snapshot (what exists vs expected)
| Folder | Exists? | #files | Newest file | Updated today? | Notes |
| --- | --- | --- | --- | --- | --- |
| scholar/outputs/orchestrator_runs/ | Yes | 7 | unattended_07-Wed-01_175409.log | No (latest 2026-01-07) | Includes unattended log + final; filename shows date parsing bug. |
| scholar/outputs/system_map/ | Yes | 5 | coverage_checklist_2026-01-07.md | No (latest 2026-01-07) | repo_index_2026-01-07.md exists but is not refreshed in the prompt. |
| scholar/outputs/module_dossiers/ | Yes | 9 | M4-build_dossier_2026-01-07.md | No (latest 2026-01-07) | M0-M6 + bridge dossiers present. |
| scholar/outputs/research_notebook/ | Yes | 6 | M4_research_2026-01-07_successive_relearning.md | No (latest 2026-01-07) | Research notes present for some modules. |
| scholar/outputs/gap_analysis/ | Yes | 1 | gap_analysis_2026-01-07.md | No (latest 2026-01-07) | Only one gap_analysis file on record. |
| scholar/outputs/promotion_queue/ | Yes | 6 | experiment_mastery_count_2026-01-07.md | No (latest 2026-01-07) | Unattended prompt blocks new promotion_queue output unless safe-mode is set. |
| scholar/outputs/reports/ | Yes | 4 | module_audit_M0-M6-bridge_2026-01-07.md | No (latest 2026-01-07) | Reports exist but are not mandated each run. |

F) Root Cause Analysis (ranked)
1) Unsupported --yolo flag causes failed runs or help-only output.
Evidence: scripts/run_scholar.bat:37 uses --yolo; codex help does not list --yolo; scholar/outputs/orchestrator_runs/launcher_codex.log contains a codex help dump.
Fix: Replace --yolo with supported flags (for example, --dangerously-bypass-approvals-and-sandbox or --full-auto plus explicit -a never/--sandbox danger-full-access as needed).

2) Orchestrator prompt only guarantees a minimal one-iteration cycle and does not require system_map/gap_analysis/reports output each run.
Evidence: scholar/workflows/orchestrator_run_prompt.md:22-34 lists a single iteration and outputs only module_dossier/research_note + run log + coverage checklist.
Fix: Expand the prompt to require system_map refresh, gap_analysis, and report generation each run if those are expected.

3) Promotion queue is explicitly blocked unless a safe-mode flag exists in the audit manifest, but the manifest has no such flag.
Evidence: scholar/workflows/orchestrator_run_prompt.md:20; scholar/inputs/audit_manifest.json:1-26 (no safe-mode flag).
Fix: Add an explicit safe-mode flag in audit_manifest.json and update the prompt to honor it, or remove the gate for unattended runs.

4) Scope is restricted to the manifest and a prebuilt repo_index; there is no full-repo scan or update loop.
Evidence: scholar/inputs/audit_manifest.json:2-26 (paths limited to sop/gpt-knowledge and brain/session_logs); scholar/outputs/system_map/repo_index_2026-01-07.md only lists sop/gpt-knowledge.
Fix: Expand audit_manifest.json to include the full repo (or add a scan step to regenerate repo_index each run) and add a policy to pick the next unprocessed module automatically.

5) The runner is not truly unattended because it pauses at the end and uses a fragile date parser that scrambles filenames.
Evidence: scripts/run_scholar.bat:16-18 (date parsing) and :45 (pause).
Fix: Replace date parsing with a PowerShell timestamp and remove or guard pause for unattended runs.

G) Minimal Fix Plan (not implementation; just plan)
Fix 1 (highest ROI): Update scripts/run_scholar.bat to use supported non-interactive flags (remove --yolo), remove the final pause, and generate TS with PowerShell (yyyy-MM-dd_HHmmss) so filenames are stable.
Fix 2: Update scholar/workflows/orchestrator_run_prompt.md to (a) rebuild repo_index/system_map each run, (b) select the next uncompleted module based on coverage_checklist, and (c) explicitly emit gap_analysis and reports outputs each run.
Fix 3: Update scholar/inputs/audit_manifest.json to include full-repo coverage (or a larger scope list) and add a safe_mode flag if promotion_queue output should be allowed unattended.

H) What ChatGPT Needs From Me (copy/paste checklist)
- This diagnostic_brief_*.md file.
- scripts/run_scholar.bat (full file).
- First 80 lines of scholar/workflows/orchestrator_run_prompt.md.
- Last 60 lines of scholar/outputs/orchestrator_runs/unattended_07-Wed-01_175409.log (or the latest unattended_*.log).
- Directory listing of scholar/outputs/ and scholar/outputs/orchestrator_runs/.
