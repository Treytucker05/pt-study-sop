# Scripts

Automation utilities for the PT Study SOP repo.

System context: scripts support CP-MSS v1.0 operations and governance.

## Common entries
- `generate_architecture_dump.ps1` - Regenerates `docs/root/ARCHITECTURE_CONTEXT.md`.
- `harness.ps1` - Repo-local harness entrypoint. Supports `Bootstrap`, isolated `Run`, named `Eval` scenarios (`tutor-hermetic-smoke`, `tutor-hermetic-coverage-scope`, `app-live-golden-path`, `tutor-live-readonly`, `method-integrity-smoke`), root `events.jsonl` observability, and `Report` bundle generation with redacted environment data.
- `release_check.py` - Runs release checks.
- `sync_agent_config.ps1` - Repo drift check for agent instruction entrypoints and tool stubs.
- `sync_ai_config.ps1` - Deprecated (use `sync_agent_config.ps1`).
- `sync_portable_agent_config.ps1` - Convenience wrapper to sync portable vault agent config to home tool locations.
- `launch_codex_session.ps1` - Start one-off named agent sessions (`-Tool codex` default; `-Tool opencode` and `-Tool kimi` supported).
- `agent_worktrees.ps1` - Create/manage named persistent worktrees (integrate/ui/brain[/docs]) for parallel agents. Supports multi-agent launch (`open-many` / `dispatch-many`), role routing, and quick status.
- `bootstrap_parallel_agents.ps1` - One-command bootstrap: ensure worktrees + launch selected agent profile across multiple roles.
- `install_agent_guard_hooks.ps1` - Install optional local git hooks (`pre-commit`, `pre-push`) to enforce drift checks and baseline tests during parallel agent workflows.
- `parallel_launch_wizard.ps1` - Interactive launcher that prompts for role selection and agent counts (Codex/Claude) and starts all requested sessions.
- `run_scholar.bat` - Run Scholar workflows.
- `parallel launch shortcut` - Use `C:/Users/treyt/OneDrive/Desktop/Travel Laptop/Parallel Work/01_Launch_Parallel_Wizard.bat` for the one-file prompting flow.
- `check_parallel_setup.ps1` - Run health validation across scripts, worktrees, and launchers.
- `sync_tutor_category_docs.py` - One-command sync: regenerate Obsidian tutor category pages from `sop/library/methods/*.yaml`.
- `video_ingest_local.py` - Local MP4 pipeline (ffmpeg + faster-whisper + optional OCR) that emits transcript/visual-note artifacts for tutor ingest.

## Notes
- Run from repo root unless the script states otherwise.
- Check local/global agent permission policy files before running new commands (for example `.claude/permissions.json` if present and `C:/Users/treyt/.claude/CLAUDE.md` guidance).

## Harness Quickstart
```powershell
# Validate hermetic prerequisites
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Bootstrap -Profile Hermetic -Json

# Start one isolated harness run
$artifact = Join-Path $env:TEMP "pt-harness-artifacts"
$data = Join-Path $env:TEMP "pt-harness-data"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Run -Profile Hermetic -Port 5127 -DataRoot $data -ArtifactRoot $artifact -NoBrowser -SkipUiBuild

# Run the first fixture-backed Tutor scenario against that isolated run
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Eval -Scenario tutor-hermetic-smoke -ArtifactRoot $artifact -Json

# Run the second fixture-backed Tutor scenario against that same run
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Eval -Scenario tutor-hermetic-coverage-scope -ArtifactRoot $artifact -Json

# Run a retained live/operator smoke through the same Eval contract
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Eval -Scenario app-live-golden-path -ArtifactRoot $artifact -Json

# Emit the machine-readable bundle for the run
$run = Get-Content -Raw (Join-Path $artifact "run.json") | ConvertFrom-Json
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode Report -RunId $run.run_id -ArtifactRoot $artifact -Json

# Stop the isolated server when you are done
Stop-Process -Id $run.server_pid -Force
```

Hermetic note:
- Hermetic runs set `PT_HARNESS_DISABLE_VAULT_CONTEXT=1`, so Tutor turn context skips Obsidian note/vault retrieval and does not depend on personal vault state.
- `Report` writes `bundle.json` with git metadata, scenario artifact pointers, command records, timings, and a redacted environment summary.
- `events.jsonl` records redacted `command_started`, `command_completed`, and `command_failed` entries for the run.
- CI now uses the same contract in `.github/workflows/ci.yml` via the Windows `harness_contract` job.

## Parallel Agent Quickstart
```powershell
# 0) One-command bootstrap (recommended)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_parallel_agents.ps1 -Profile swarm -IncludeDocs -OpenDocs -SessionTag daily

# 0b) Focused bootstrap (ui+brain, codex+claude only)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_parallel_agents.ps1 -Roles ui,brain -Agents codex,claude -SessionTag focused

# 1) Ensure worktrees exist (adds docs role too)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action ensure -IncludeDocs

# 2) Open agents in the UI role (codex + claude)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action open-many -Role ui -Profile swarm -SessionTag ui-pass

# 3) Route by path and launch review pair (codex + claude)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action dispatch-many -Paths brain\dashboard\api_adapter.py -Profile review -SessionTag api-review

# 3b) Route by path and launch explicit trio (codex + kimi + claude)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action dispatch-many -Paths brain\dashboard\api_adapter.py -Agents codex,kimi,claude -SessionTag api-review

# 4) See branch/dirty state per role worktree
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\agent_worktrees.ps1 -Action status -IncludeDocs
```

Bootstrap dry-run preview:
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap_parallel_agents.ps1 -Profile swarm -IncludeDocs -OpenDocs -DryRun
```

## Coordination Source of Truth
- Use `README.md` as the top-level repo truth.
- Use `docs/root/TUTOR_TODO.md` as the active execution board.
- Use `docs/root/AGENT_BOARD.md` for live multi-agent ownership and handoffs.
- Use `conductor/tracks.md` as the track registry and status history.
- Use `conductor/tracks/GENERAL/log.md` for chronological updates, especially when behavior changes.

### Integrate role usage
- Integrate role path/branch is `wt/integrate` and is meant for final merge conflict resolution and release readiness tasks.
- For a dedicated integrate launch, use:
  `C:/Users/treyt/OneDrive/Desktop/Travel Laptop/Parallel Work/13_Launch_Integrate_Parallel.bat`
- Run full setup validation:
  `pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_parallel_setup.ps1`

## Optional Local Guard Hooks
```powershell
# Install checks that run on commit/push
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\install_agent_guard_hooks.ps1 -Action install

# Verify installed
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\install_agent_guard_hooks.ps1 -Action status
```

