# Findings & Decisions
<!-- 
  WHAT: Your knowledge base for the task. Stores everything you discover and decide.
  WHY: Context windows are limited. This file is your "external memory" - persistent and unlimited.
  WHEN: Update after ANY discovery, especially after 2 view/browser/search operations (2-Action Rule).
-->

## Requirements
<!-- 
  WHAT: What the user asked for, broken down into specific requirements.
  WHY: Keeps requirements visible so you don't forget what you're building.
  WHEN: Fill this in during Phase 1 (Requirements & Discovery).
  EXAMPLE:
    - Command-line interface
    - Add tasks
    - List all tasks
    - Delete tasks
    - Python implementation
-->
<!-- Captured from user request -->
- Fix smoke to be fully green: /api/scholar/digest timeout (GET must be DB-first, no orchestration), /api/scholar/proposals 404 (alias or fallback), obsidian patch duplicate content test, ignore scholar/outputs, run tests and smoke, commit/push.

## Research Findings
<!-- 
  WHAT: Key discoveries from web searches, documentation reading, or exploration.
  WHY: Multimodal content (images, browser results) doesn't persist. Write it down immediately.
  WHEN: After EVERY 2 view/browser/search operations, update this section (2-Action Rule).
  EXAMPLE:
    - Python's argparse module supports subcommands for clean CLI design
    - JSON module handles file persistence easily
    - Standard pattern: python script.py <command> [args]
-->
<!-- Key discoveries during exploration -->
- Existing DB health endpoint is /api/db/health in brain/dashboard/api_adapter.py; smoke used /api/health/db.
- Smoke script currently uses /api/health/db, /api/brain/metrics, /api/planner/queue, /api/scholar/digest, /api/scholar/proposals.
- /api/scholar/digest is defined in brain/dashboard/routes.py (api_scholar_digest); scholar digests are persisted in scholar_digests table with related list/save/get/delete endpoints.
- /api/proposals endpoint exists in brain/dashboard/api_adapter.py (comment notes mimics /api/proposals).
- /api/proposals (GET) in brain/dashboard/api_adapter.py reads scholar_proposals table and returns list; /api/scholar/proposals is not defined.
- api_scholar_digest currently calls generate_weekly_digest(days=7) and saves artifacts; this likely triggers heavy Scholar work and timeouts.
- generate_weekly_digest in brain/dashboard/scholar.py may call OpenRouter/LLM when API key is set; GET /api/scholar/digest should avoid this.
- No direct references to "/api/scholar/digest" found in dashboard_rebuild or brain/static (rg search).
- generate_obsidian_patch (brain/obsidian_merge.py) uses merge_sections then returns None only if existing == merged; merge_sections appends managed block even for duplicates.
- scholar_runs table exists in brain/db_setup.py; routes.py exposes /api/scholar/run and /api/scholar/run/status endpoints that use dashboard.scholar helpers.
- scholar_runs table fields include started_at, ended_at, status, error_message, digest_id, proposals_created, notes (DB-first status can be queried).
- dashboard.scholar.get_scholar_run_status() is a DB-only query (latest row from scholar_runs).

## Technical Decisions
<!-- 
  WHAT: Architecture and implementation choices you've made, with reasoning.
  WHY: You'll forget why you chose a technology or approach. This table preserves that knowledge.
  WHEN: Update whenever you make a significant technical choice.
  EXAMPLE:
    | Use JSON for storage | Simple, human-readable, built-in Python support |
    | argparse with subcommands | Clean CLI: python todo.py add "task" |
-->
<!-- Decisions made with rationale -->
| Decision | Rationale |
|----------|-----------|
| Make /api/scholar/digest DB-first (no generate on GET) | Ensure fast smoke checks and avoid orchestrator/LLM on GET |
| Add /api/scholar/proposals alias in api_adapter | Backward-compatible path for smoke without changing canonical /api/proposals |
| Short-circuit duplicate obsidian patch generation | Prevent unnecessary patch files and satisfy test expectation |
| Ignore scholar/outputs/ in .gitignore | Keep repo clean of generated artifacts |

## Issues Encountered
<!-- 
  WHAT: Problems you ran into and how you solved them.
  WHY: Similar to errors in task_plan.md, but focused on broader issues (not just code errors).
  WHEN: Document when you encounter blockers or unexpected challenges.
  EXAMPLE:
    | Empty file causes JSONDecodeError | Added explicit empty file check before json.load() |
-->
<!-- Errors and how they were resolved -->
| Issue | Resolution |
|-------|------------|
| session-catchup script missing at expected path | Proceeded with manual planning files and logged error |

## Resources
<!-- 
  WHAT: URLs, file paths, API references, documentation links you've found useful.
  WHY: Easy reference for later. Don't lose important links in context.
  WHEN: Add as you discover useful resources.
  EXAMPLE:
    - Python argparse docs: https://docs.python.org/3/library/argparse.html
    - Project structure: src/main.py, src/utils.py
-->
<!-- URLs, file paths, API references -->
- brain/dashboard/api_adapter.py (API endpoints)
- scripts/smoke_golden_path.ps1 (smoke test paths)

## Visual/Browser Findings
<!-- 
  WHAT: Information you learned from viewing images, PDFs, or browser results.
  WHY: CRITICAL - Visual/multimodal content doesn't persist in context. Must be captured as text.
  WHEN: IMMEDIATELY after viewing images or browser results. Don't wait!
  EXAMPLE:
    - Screenshot shows login form has email and password fields
    - Browser shows API returns JSON with "status" and "data" keys
-->
<!-- CRITICAL: Update after every 2 view/browser operations -->
<!-- Multimodal content must be captured as text immediately -->
-

---
<!-- 
  REMINDER: The 2-Action Rule
  After every 2 view/browser/search operations, you MUST update this file.
  This prevents visual information from being lost when context resets.
-->
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
