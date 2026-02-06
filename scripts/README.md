# Scripts

Automation utilities for the PT Study SOP repo.

## Common entries
- `generate_architecture_dump.ps1` - Regenerates `docs/root/ARCHITECTURE_CONTEXT.md`.
- `release_check.py` - Runs release checks.
- `sync_agent_config.ps1` - Repo drift check for agent instruction entrypoints and tool stubs.
- `sync_ai_config.ps1` - Deprecated wrapper (kept for backwards compatibility).
- `sync_portable_agent_config.ps1` - Convenience wrapper to sync portable vault agent config to home tool locations.
- `launch_codex_session.ps1` / `launch_opencode_session.ps1` - Start agent sessions.
- `run_scholar.bat` - Run Scholar workflows.

## Notes
- Run from repo root unless the script states otherwise.
- Check `C:/pt-study-sop/permissions.json` for allowed commands.
