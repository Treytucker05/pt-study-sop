# Rollback Notes

**Track ID:** agent-ecosystem-hygiene_20260313  
**Created:** 2026-03-13

## Backup Bundle

- Backup root: `C:\Users\treyt\.agents\backups\agent-ecosystem-hygiene_20260313`
- Manifest: `C:\Users\treyt\.agents\backups\agent-ecosystem-hygiene_20260313\manifest.json`

## Captured Skill Roots

- `C:\Users\treyt\.claude\skills`
- `C:\Users\treyt\.codex\skills`
- `C:\Users\treyt\.cursor\skills`
- `C:\Users\treyt\.opencode\skills`
- `C:\Users\treyt\.gemini\skills`
- `C:\Users\treyt\.antigravity\skills`
- `C:\Users\treyt\.gemini\antigravity\skills`
- `C:\Users\treyt\.gemini\antigravity\global_skills`

Each root has a JSON snapshot under:

- `C:\Users\treyt\.agents\backups\agent-ecosystem-hygiene_20260313\skill-roots\`

## Captured Config / Fallback Files

- `C:\Users\treyt\.agents\README.md`
- `C:\Users\treyt\.claude\CLAUDE.md`
- `C:\Users\treyt\.claude\rules\agents.md`
- `C:\Users\treyt\.codex\AGENTS.md`
- `C:\Users\treyt\.codex\config.toml`
- `C:\Users\treyt\.cursor\mcp.json`
- `C:\Users\treyt\.gemini\GEMINI.md`
- `C:\Users\treyt\.gemini\settings.json`
- `C:\Users\treyt\.gemini\antigravity\mcp_config.json`
- `C:\Users\treyt\.antigravity\argv.json`
- `C:\Users\treyt\.kimi\config.toml`
- `C:\Users\treyt\.conduit\config.toml`

Backed-up copies live under:

- `C:\Users\treyt\.agents\backups\agent-ecosystem-hygiene_20260313\config-files\`

## Restore Procedure

1. Read `manifest.json` to identify the exact source and backup file paths.
2. For config/fallback files, copy the backed-up file from `config-files\...` back to its original source path.
3. For skill roots, use the JSON snapshot under `skill-roots\` to reconstruct the original immediate entries:
   - restore preserved local directories from the matching backup folder if they were moved during Apply mode
   - recreate junction targets using the recorded `target` values where needed
4. If a sync run created `C:\Users\treyt\.agents\skill_backups\YYYYMMDD_HHMMSS\`, restore any moved entries from there before rerunning the script.

## Verification

- Backup manifest created before any supported home-directory mutation.
- Manifest includes every root/config surface planned for mutation later in this track.
