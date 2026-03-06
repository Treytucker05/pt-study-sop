# Skills Inventory

Date: 2026-03-06  
Purpose: document the installed skill architecture across tools, group the shared skills into practical buckets, and record the safe first cleanup pass.

## 1. Canonical Layout

Primary shared upstream:

- `C:\Users\treyt\.agents\skills`

Tool projections:

- `C:\Users\treyt\.codex\skills`
- `C:\Users\treyt\.claude\skills`
- `C:\Users\treyt\.opencode\skills`
- `C:\Users\treyt\.cursor\skills`

Key fact:

- Most tool-local entries are `Junction`s pointing to `C:\Users\treyt\.agents\skills`.
- This means the real shared cleanup surface is `.agents\skills`, not four separate duplicate trees.

## 2. Tool-Local Exceptions

These are real local directories, not junctions into `.agents\skills`.

### Codex-only local skill surfaces

- `C:\Users\treyt\.codex\skills\.system`
- `C:\Users\treyt\.codex\skills\agent-skills`
- `C:\Users\treyt\.codex\skills\dev-browser`

Do not treat these as normal shared-skill duplicates.

### Claude-only local skill surfaces

- `C:\Users\treyt\.claude\skills\continuous-learning`
- `C:\Users\treyt\.claude\skills\learned`

Treat these as Claude-local state/learning surfaces unless proven otherwise.

### OpenCode-only local skill surfaces

- `C:\Users\treyt\.opencode\skills\agent-strategy`
- `C:\Users\treyt\.opencode\skills\ensure-agent-workflow`

These currently exist as real local directories in OpenCode.

## 3. Shared Skill Groups

These groups are based on practical use and overlap, not perfect usage telemetry.

### A. Core Daily Engineering

Keep as everyday/core:

- `coder`
- `codex`
- `codex-subagent`
- `bug-fast`
- `bug-deep`
- `code-review`
- `commit-work`
- `plan-work`
- `planner`
- `session-handoff`
- `verification-loop`
- `repo-cleanup`
- `rebase-assistant`

### B. Project / Workflow Governance

Keep as core governance:

- `agents-md`
- `agent-md-refactor`
- `conductor-implement`
- `conductor-manage`
- `conductor-new-track`
- `conductor-revert`
- `conductor-setup`
- `conductor-validator`
- `coding-guidelines-verify`
- `capture-learning`

### C. Research / Multi-Model / External Search

Keep but treat as situational:

- `researcher`
- `gemini`
- `perplexity`
- `openai-docs-skill`
- `multi-agent-patterns`
- `multi-model-deep`
- `multi-model-quick`
- `gepetto`
- `evaluation`

### D. Frontend / UI / Design

Keep if still relevant to your current stack:

- `frontend-design`
- `frontend-responsive-ui`
- `react-dev`
- `react-useeffect`
- `react-best-practices`
- `shadcn`
- `wireframe`
- `mermaid-diagrams`
- `c4-architecture`
- `playground`

### E. Backend / Data / APIs

Keep if still relevant:

- `backend-development`
- `python-development`
- `javascript-typescript`
- `database-design`
- `database-schema-designer`
- `mcp-builder`
- `tool-design`
- `create-cli`

### F. Docs / Writing / Communication

Likely useful but not always daily:

- `code-documentation`
- `readme-updater`
- `crafting-effective-readmes`
- `writing-clearly-and-concisely`
- `release-notes`
- `command-creator`
- `create-pr`

### G. Obsidian / Notes / Files

Likely useful for this repo:

- `obsidian-markdown`
- `obsidian-bases`
- `json-canvas`
- `filesystem-context`
- `file-organizer`
- `organizer`

### H. Specialized Or Optional

Keep installed for now, but these are good manual review candidates:

- `agent-claude-code`
- `agent-langgraph`
- `agent-openai-sdk`
- `branch-cleaner`
- `browser-automation`
- `ci-fix`
- `create-rule`
- `create-skill`
- `dependency-updater`
- `dependency-upgrader`
- `design-system-starter`
- `find-skills`
- `focus-coach`
- `gh-address-comments`
- `github`
- `naming-analyzer`
- `pdf`
- `pptx`
- `prd`
- `project-development`
- `qa-test-planner`
- `regex-builder`
- `requirements-clarity`
- `skill-judge`
- `update-cursor-settings`
- `video-transcript-downloader`
- `xlsx`

### I. Niche / Low-Confidence / Likely Candidate Review

Do **not** auto-delete these yet, but they are good next-pass review candidates because they are niche, productized, or personal-business-oriented:

- `business-competitive-ads`
- `business-content-writer`
- `business-growth-analysis`
- `brainstormer`
- `concept-map-artist`
- `context-compression`
- `context-degradation`
- `context-fundamentals`
- `context-optimization`
- `developer-growth-analysis` if present in tool-specific homes
- `last30days`
- `memory-systems`
- `pedagogy-analyst`
- `ralph`
- `reducing-entropy`
- `research-bdi-cognitive`
- `sessions-to-blog`
- `ui-ux-pro-max`

These are not condemned. They just do not look like first-wave essentials.

## 4. Safe First Cleanup

Completed first-wave cleanup:

- remove broken junctions from `C:\Users\treyt\.cursor\skills`

Reason:

- they were already unusable because the junction targets did not exist under `.agents\skills`
- removing them reduces noise without changing any working shared skill

Broken Cursor entries targeted in this pass:

- `agent-strategy`
- `backend-to-frontend-handoff-docs`
- `create-subagent`
- `daily-meeting-update`
- `datadog-cli`
- `difficult-workplace-conversations`
- `domain-name-brainstormer`
- `draw-io`
- `ensure-agent-workflow`
- `excalidraw`
- `feedback-mastery`
- `frontend-to-backend-requirements`
- `game-changing-features`
- `humanizer`
- `jira`
- `marp-slide`
- `meme-factory`
- `migrate-to-skills`
- `mui`
- `openapi-to-typescript`
- `orchestrating-swarms`
- `professional-communication`
- `ship-learn-next`
- `web-to-markdown`

Backup manifest written to:

- `C:\Users\treyt\.cursor\backups\skills-hygiene_20260306\broken-junctions.json`

Verification target after cleanup:

- zero broken junctions remaining under `C:\Users\treyt\.cursor\skills`

## 5. Recent Usage Evidence

Usage evidence is based on explicit recent history-log invocations over roughly the last 30 days.

Best signal:

- explicit `$skill`
- explicit `/skill`
- explicit `[$skill](...)`

Weak signal / excluded from deletion confidence:

- raw session-file string matches
- generic skill names that also describe products or concepts

### High-Frequency Explicit Usage

- `plan-work`
- `frontend-design`
- `ask-questions-if-underspecified`
- `codex-subagent`
- `find-skills`
- `code-review`

### Medium / Occasional Explicit Usage

- `llm-council`
- `bug-fast`
- `commit-work`
- `readme-updater`
- `wireframe`
- `x-research`

### Low But Real Explicit Usage

- `brainstormer`
- `capture-learning`
- `conductor-implement`
- `conductor-new-track`
- `conductor-setup`
- `ensure-agent-workflow`
- `planner`
- `prd`

### No-Explicit-Evidence Candidates

These had no explicit recent invocation evidence under the stricter history-log method and are good candidates for a second-pass manual review:

- `agent-langgraph`
- `agent-openai-sdk`
- `agent-md-refactor`
- `agent-worktrees`
- `agents-md`
- `browser-automation`
- `ci-fix`
- `code-documentation`
- `code-refactoring`
- `context-compression`
- `context-degradation`
- `context-fundamentals`
- `context-optimization`
- `create-cli`
- `create-pr`
- `create-rule`
- `create-skill`
- `database-design`
- `database-schema-designer`
- `dependency-updater`
- `dependency-upgrader`
- `design-system-starter`
- `docx`
- `evaluation`

There were 101 zero-explicit-evidence skills in total under the strict method.

Confidence note:

- confidence is moderate for “explicitly used recently”
- confidence is low for “safe to delete now”
- shared upstream deletion should still require a second-pass manual review

## 6. Next Cleanup Wave

Recommended next order:

1. Review the niche / low-confidence candidates in `.agents\skills`
2. Decide whether to archive them into a local `skills_archived/` area instead of deleting
3. Audit `C:\Users\treyt\.codex\skills\agent-skills` separately as a vendor/package boundary
4. Decide whether `agent-strategy` and `ensure-agent-workflow` should be promoted into `.agents\skills` or remain OpenCode-local only

## 7. Cleanup Rules

- Treat `.agents\skills` as the shared upstream until you explicitly choose a different canonical source.
- Do not delete a shared `.agents` skill just because one tool does not need it.
- Prefer archive over hard delete for any low-confidence cleanup.
- Do not touch `.codex\skills\.system`, `.codex\skills\agent-skills`, or `.codex\skills\dev-browser` in the shared cleanup pass.
