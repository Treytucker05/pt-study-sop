# Environment And Bootstrap Contract

**Track ID:** trey-agent-repo-readiness_20260313  
**Task:** `T4`  
**Status:** Frozen interface, implementation deferred

## Purpose

Define the environment, prerequisite, and precedence rules the harness must follow so `Live` and `Hermetic` runs are unambiguous.

## Profiles

### `Live`

Uses the repo's current operator-oriented runtime behavior and may depend on:

- `brain/.env`
- saved config under `brain/data/`
- local study materials or vault state
- provider credentials

### `Hermetic`

Must avoid dependence on:

- Obsidian vault contents
- live course or material state
- provider credentials
- user-specific mutable paths outside the declared temp data root and fixture root

## Precedence rules

The frozen precedence order for harness runs is:

1. explicit harness CLI arguments such as `-Port`, `-DataRoot`, `-ArtifactRoot`, `-FixtureRoot`
2. harness-injected environment variables for the current run
3. repo-local config files used intentionally by the selected profile
4. machine environment variables
5. code defaults

Current repo behavior that must be preserved or intentionally overridden:

- `brain/config.py` loads `brain/.env` at import time and currently lets repo-local values override machine env vars
- `brain/data/api_config.json` `study_rag_path` overrides `PT_STUDY_RAG_DIR`
- `Start_Dashboard.bat` sets `PT_STUDY_RAG_DIR` based on OneDrive or local folder probes before the app starts

## Prerequisite and variable table

| Item | Current source | Applies to | Harness expectation | Failure class if missing |
|------|----------------|------------|---------------------|--------------------------|
| PowerShell 7 or Windows PowerShell capable of running repo scripts | local machine | `Live`, `Hermetic` | required for canonical harness entrypoint | `bootstrap.missing_powershell` |
| Python on `PATH` or `py -3` launcher | local machine, `Start_Dashboard.bat` | `Live`, `Hermetic` | required | `bootstrap.missing_python` |
| Node and npm | local machine, `dashboard_rebuild/package.json` | `Live`, `Hermetic` when UI build needed | required unless explicit `-SkipUiBuild` | `bootstrap.missing_node_toolchain` |
| repo checkout at `C:\pt-study-sop` | local filesystem | `Live`, `Hermetic` | required | `bootstrap.missing_repo_root` |
| `brain/.env` | repo-local file loaded by `brain/config.py` | `Live` | optional for hermetic, required for live features that need provider keys | `bootstrap.missing_live_env` |
| `dashboard_rebuild/.env.example` | repo-local template | `Live`, `Hermetic` planning input | source template only, not a runtime requirement | `bootstrap.missing_frontend_env_template` |
| `brain/.env.example` | missing today | `Live`, `Hermetic` planning target | must be added in `T7` | `bootstrap.missing_backend_env_template` |
| `PT_STUDY_RAG_DIR` | `Start_Dashboard.bat`, machine env, `api_config.json` override | `Live` | live-only input; hermetic runs must override with temp or fixture data | `bootstrap.missing_rag_root` |
| `brain/data/api_config.json` | repo-local config | `Live` | live-only optional config source | `bootstrap.missing_live_api_config` |
| `brain/data/gcal_token.json` | repo-local config | `Live` integrations only | not required for hermetic harness | `bootstrap.missing_calendar_token` |
| Obsidian vault path | user machine path from repo canon | `Live` only | must not be required by hermetic scenarios | `bootstrap.missing_obsidian_vault` |
| fixture asset root | future repo fixture bundle | `Hermetic` only | required for hermetic scenario execution | `bootstrap.missing_fixture_assets` |
| `-Port`, `-DataRoot`, `-ArtifactRoot` | future harness CLI | `Hermetic` and isolated `Live` runs | required for isolated runs | `bootstrap.missing_harness_run_args` |

## Required profile behavior

### Live profile

- may read `brain/.env`
- may read saved state from `brain/data/`
- may target the canonical local vault or RAG folder
- must still expose clear missing-prerequisite failures

### Hermetic profile

- must be runnable without `brain/.env`
- must not require provider credentials
- must ignore or override repo-local RAG and vault state
- must use declared fixture assets and temp data roots
- must emit a deterministic failure when fixture assets are missing

## Deterministic failure classes to preserve

- `bootstrap.missing_powershell`
- `bootstrap.missing_python`
- `bootstrap.missing_node_toolchain`
- `bootstrap.missing_live_env`
- `bootstrap.missing_backend_env_template`
- `bootstrap.missing_fixture_assets`
- `bootstrap.missing_harness_run_args`

## Verification record

`T4` is considered complete when this contract remains true:

- every prerequisite is classified as `Live`, `Hermetic`, or both
- the precedence rules reflect current repo behavior in `brain/config.py` and `Start_Dashboard.bat`
- hermetic execution explicitly rejects hidden dependence on vault state, live materials, or provider keys
- each missing prerequisite maps to a deterministic failure class
