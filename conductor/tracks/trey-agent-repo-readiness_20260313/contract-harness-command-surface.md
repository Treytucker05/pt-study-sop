# Harness Command Contract

**Track ID:** trey-agent-repo-readiness_20260313  
**Task:** `T3`  
**Status:** Frozen interface, implementation deferred

## Purpose

Freeze one repo-local harness command surface that every supported agent can call the same way.

This file defines the command contract only. Implementing the contract is deferred to `T6`, `T7`, `T8`, and `T9`.

## Canonical entrypoint

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\harness.ps1 -Mode <Bootstrap|Run|Eval|Report> [options]
```

Why this shape:

- `pwsh` is already the repo's main scripting surface for smoke and config scripts.
- a single entrypoint minimizes tool-specific instructions
- `-Mode` keeps the contract stable while implementation details evolve behind the wrapper

## Mode contract

| Mode | Required arguments | Primary output | Current repo surfaces it must wrap |
|------|--------------------|----------------|------------------------------------|
| `Bootstrap` | `-Profile <Hermetic\|Live>` | pass/fail + machine-readable status | `docs/root/GUIDE_DEV.md`, `brain/config.py`, `dashboard_rebuild/.env.example` |
| `Run` | `-Profile <Hermetic\|Live>` `-Port <int>` `-DataRoot <path>` `-ArtifactRoot <path>` | running app + run metadata | `Start_Dashboard.bat`, `dashboard_rebuild/build-and-sync.ps1` |
| `Eval` | `-Scenario <id>` `-ArtifactRoot <path>` | scenario result + exit code | `pytest brain/tests/`, `python scripts/check_docs_sync.py`, `python scripts/release_check.py`, `pwsh -File scripts/smoke_golden_path.ps1`, `pwsh -File scripts/smoke_tutor_readonly.ps1`, `python scripts/method_integrity_smoke.py` |
| `Report` | `-RunId <id>` `-ArtifactRoot <path>` | normalized JSON bundle | outputs produced by `Run` and `Eval`; standardized in `T9` |

## Contract details

### `Bootstrap`

Intent:

- validate prerequisites without starting the app
- optionally distinguish `Hermetic` from `Live` requirements

Frozen flags:

- `-Profile <Hermetic|Live>`
- `-Json`
- `-Fix` is reserved but not required for the first implementation

### `Run`

Intent:

- start one isolated app instance without clobbering the operator launch path

Frozen flags:

- `-Profile <Hermetic|Live>`
- `-Port <int>`
- `-DataRoot <path>`
- `-ArtifactRoot <path>`
- `-NoBrowser`
- `-SkipUiBuild`

### `Eval`

Intent:

- run one named validation scenario and return a scenario-specific exit code

Frozen flags:

- `-Scenario <id>`
- `-ArtifactRoot <path>`
- `-BaseUrl <url>` for scenarios that hit a running server

Initial scenario IDs to reserve:

- `backend-tests`
- `docs-sync`
- `release-check`
- `golden-path-live`
- `tutor-readonly-live`
- `method-integrity`
- `tutor-hermetic-smoke`

### `Report`

Intent:

- collate run metadata and scenario outputs into a single machine-readable bundle

Frozen flags:

- `-RunId <id>`
- `-ArtifactRoot <path>`
- `-InputRoot <path>`

Note:

- no standalone report generator exists yet in the repo
- this mode is still part of the frozen command surface so `T9` can implement it without revisiting the interface

## Crosswalk to current repo reality

| Harness concern | Current command or file | Why it is the source surface |
|-----------------|-------------------------|------------------------------|
| operator startup | `Start_Dashboard.bat` | canonical manual launch path in repo rules |
| frontend build | `cd dashboard_rebuild && npm run build` or `build-and-sync.ps1` | current UI build path |
| backend tests | `pytest brain/tests/` | default backend validation command |
| docs check | `python scripts/check_docs_sync.py` | current docs drift check in CI |
| release check | `python scripts/release_check.py` | current release-oriented repo check |
| live smoke | `pwsh -File scripts/smoke_golden_path.ps1` | current non-destructive endpoint smoke |
| read-only tutor smoke | `pwsh -File scripts/smoke_tutor_readonly.ps1` | current Tutor read-only smoke |
| method integrity | `python scripts/method_integrity_smoke.py` | existing domain-specific smoke surface |

## Non-goals for `T3`

- implementing `scripts/harness.ps1`
- changing `Start_Dashboard.bat`
- changing CI
- changing app startup behavior
- introducing artifacts beyond the command contract itself

## Verification record

`T3` is considered complete when this contract remains true:

- every frozen mode has a declared argument surface
- `Run` maps to real startup surfaces already in the repo
- `Eval` maps to real validation commands already in the repo
- no mode depends on a tool-private command; every agent can shell into the same repo-local entrypoint
- the only deferred area is implementation, not interface naming
