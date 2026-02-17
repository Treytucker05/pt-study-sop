# General Change Log

Changes not tied to a specific conductor track. Append dated entries below.

---

## 2026-02-17 - Consolidate tracking into conductor

- Archived 760-line CONTINUITY.md to docs/archive/
- Archived stale docs/project/ planning hub to docs/archive/project_hub/
- Created this file as catch-all for non-track changes
- Updated AGENTS.md Rule 6 + Post-Implementation Checklist
- Cleaned up dead OpenCode scripts

## 2026-02-17 - Full repo cleanup (5 tiers)

- Tier 1: Removed 19 tracked scratch files from git (method_*.json, tmp_*, extract_*, etc.), added .gitignore rules
- Tier 2: Fixed dangling OpenCode references in 5 files, deleted sync_agent_configs.ps1
- Tier 3: Archived 8 stale docs to docs/archive/stale_docs/ and .agent/context/ subdirs to docs/archive/agent_context/
- Tier 4: Archived duplicate review loop doc, gitignored regeneratable ARCHITECTURE_CONTEXT.md, archived stale roadmap docs
- Tier 5: Deleted scripts/_archive_debug/ (7 legacy .bat files), deleted deprecated sync_ai_config.ps1
- Added Rule 16 to AGENTS.md: agent self-cleanup (no scratch files at root)
- Added "Repo hygiene (agent self-cleanup)" section to conductor/product-guidelines.md

## 2026-02-17 - Skills Curation Buckets + Export Preservation

- Applied first-pass curation buckets to:
  - `C:\Users\treyt\Desktop\Trey's Vault\Study Sessions\Agent Skills Library\04_skill_registry.yaml`
  - Counts: `active=29`, `trial=29`, `defer=57`, `retire=5`
- Hardened exporter to preserve curation on reruns:
  - `scripts/export_skills_library.py`
  - Preserves `adoption_status`, `priority`, `notes`, and custom per-skill metadata fields from existing registry rows.
  - Prevents reset to `inbox` when `python scripts/export_skills_library.py` is rerun.
- Verification:
  - `python scripts/export_skills_library.py`
  - `python -m py_compile scripts/export_skills_library.py`
