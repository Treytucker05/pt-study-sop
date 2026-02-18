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

## 2026-02-17 - Tutor Tool-Calling track (Phases 1-5 complete)

- Phase 1-3: Tool-calling infra, local tools (Obsidian/Notes/Anki), frontend SSE feedback
- Phase 4: Figma MCP integration (`brain/figma_mcp_client.py`) with 3 layout algorithms, graceful degradation
- Phase 5: Verification — 192 pytest passing, frontend build clean
- Commits: `94baf094` (Phase 4-5), earlier commits for Phases 1-3
- Track closed in `conductor/tracks.md`

## 2026-02-17 - Phase 7: Security Testing

- Backend: 62 security tests in `brain/tests/test_security.py`
  - SQL injection (11), XSS payloads (4), oversized inputs (5), type confusion (10)
  - Boundary values (10), auth gap documentation (12), CORS (3), headers (5), error disclosure (2)
- Frontend: 14 security tests in `dashboard_rebuild/client/src/test/security.test.ts`
  - innerHTML XSS surface (5), payload handling (2), API error sanitization (3), audit (4)
- Documented security issues: no auth, no CORS, missing headers, innerHTML XSS in SOPRefRenderer
- Commit: Phase 7 security tests (test-only, no source changes)

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
## 2026-02-17 - Tutor/Brain UI cleanup (Codex-only + Brain chat visibility)

- On Tutor flow, removed non-Codex engine/model controls from wizard/start path and chat request payload.
- Defaulted tutor session options to Codex-only for model selection, removed OpenRouter/Buster UI/state and related props.
- Reworked Brain workspace mode handling to remove stale chat mode:
  - Removed chat tab/button from Brain toolbar/tab navigation.
  - Brain page now always renders chat side panel on desktop/mobile right rail.
  - Added validation for persisted rain-main-mode and fallback to canvas when stale/invalid.
  - Updated ContentFilter and TutorChat API payloads/tests to match new prop surface.
- Validation run:
  - 
px vitest run --reporter=verbose (341 passed)
  - python -m pytest brain/tests/ -q (301 passed)
  - cd dashboard_rebuild && npm run build (writes to rain/static/dist)

## 2026-02-18 - KIMI agent + skills dashboard integration and push-unblock fixes

- Added `kimi` to agent launch/worktree allowlists:
  - `scripts/agent_worktrees.ps1`
  - `scripts/bootstrap_parallel_agents.ps1`
  - `scripts/launch_codex_session.ps1`
  - `scripts/parallel_launch_wizard.ps1`
- Added `AGENT_WORKTREE_KIMI_ARGS` support in `scripts/agent_worktrees.ps1`.
- Added KIMI support to skill sync/export tooling:
  - `scripts/sync_agent_skills.ps1` (`.kimi/skills` source + target roots)
  - `scripts/export_skills_library.py` (CLI root arg, coverage, dependency detection, registry availability)
- Added `kimi` command allowlist entry in `permissions.json`.
- Restored backward compatibility for legacy pre-push hooks by adding non-failing `auto-claim` command to `scripts/agent_task_board.py`.
- Local environment action: reinstalled managed git hooks via `scripts/install_agent_guard_hooks.ps1 -Action install` to remove stale hook drift.

## 2026-02-18 - Gemini 2.0 deprecation migration + Deep Agents CLI audit

- Replaced all `google/gemini-2.0-flash-001` defaults/usages with `google/gemini-2.5-flash-lite` in runtime and config paths:
  - `brain/llm_provider.py`
  - `brain/tutor_chains.py`
  - `brain/dashboard/scholar.py`
  - `scholar/deep_agent/agent.py`
  - `brain/dashboard/calendar_assistant.py`
  - `brain/dashboard/api_adapter.py`
  - `scholar/inputs/audit_manifest.json`
  - `brain/scratch/test_llm_debug.py`
- Confirmed zero remaining `gemini-2.0` references in repo (excluding none).
- Audited LangChain/LangGraph deep-agent integration and confirmed in-process usage (`langgraph.prebuilt.create_react_agent`), with no `deepagents`/LangChain Deep Agents CLI command usage found.
- Validation:
  - `python -m pytest brain/tests/ -q` fails at collection with pre-existing import issue: `ImportError: cannot import name 'get_policy_version' from 'selector_bridge'` in `brain/tests/test_selector_bridge.py`.
