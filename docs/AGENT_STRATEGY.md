# Agent Strategy (Claude + Codex + OpenCode)

Concrete, cross-tool defaults for terminal setup, subagents, analytics, and learning workflows.

## Quick Start
1) Terminal: Ghostty, 24-bit color. Set statusline to show context usage + git branch.
2) Subagents: append `use subagents` to multi-step tasks and delegate research/tests/review.
3) Analytics: use `bq` for metrics queries; show query + result summary.
4) Learning: enable Explanatory/Learning output style or add "explain why"; include ASCII diagrams when helpful.
5) Auto-append: assume every request ends with `use subagents; use bq when asked; explain why; include ASCII diagram when helpful`.
   - Say "no suffix" (or "no subagents") to skip the auto-append behavior.

## Terminal & Environment
- Terminal: Ghostty (fast render, true color, Unicode).
- Statusline: in Claude Code, run `/statusline` and enable:
  - Context usage (%)
  - Git branch
  - CWD (optional but helpful)
- Tabs: name `repo:task` (example: `pt-study-sop:dashboard`), color by task.
- Voice dictation: Windows `Win+H` for longer prompts.

## Subagents (Default Pattern)
- Append `use subagents` to any multi-step or research-heavy request.
- Delegate:
  - Exploration/search to a read-only subagent.
  - Test running to a test-runner subagent.
  - Final review to a code-reviewer subagent.
- Main agent aggregates into a single decision-ready summary with file paths.

## Analytics (bq CLI)
Prereqs: `bq` installed and authenticated.

Workflow:
1) Confirm dataset + time window if missing.
2) Run:
   - `bq query --use_legacy_sql=false "SELECT ..."`
3) Report:
   - The exact query
   - Result summary (rows/metrics)
   - Any assumptions or data gaps

Safety: never paste secrets or credentials into prompts or logs.

## Learning Mode (Fast Comprehension)
- Claude Code: set output style to Explanatory/Learning in `/config`.
- Codex/OpenCode: add "explain why, then change" to the prompt.
- When learning new systems:
  - Ask for ASCII diagrams of flows or modules.
  - Request HTML slide decks for unfamiliar concepts.
  - Use spaced-repetition prompts: you explain, agent asks follow-ups.

## Tool-Specific Setup

### Claude Code (global)
- Commands:
  - `C:\Users\treyt\.claude\commands\statusline.md`
  - `C:\Users\treyt\.claude\commands\subagents.md`
  - `C:\Users\treyt\.claude\commands\analytics.md`
- Statusline: run `/statusline` and save defaults.

### Codex CLI (global)
- Config: `C:\Users\treyt\.codex\config.toml` includes strategy reminders.
- Enable voice dictation (Codex 0.105.0+):
  ```toml
  [features]
  voice_transcription = true
  ```
- Skill: `C:\Users\treyt\.codex\skills\agent-strategy\SKILL.md`.

### OpenCode (global)
- Skill: `C:\Users\treyt\.opencode\skills\agent-strategy\SKILL.md`.

## Repo Integration
- Prompt patterns: `ai-config/agent-prompts.md`
- Repo Claude Code commands: `.claude/commands/`
- Repo Codex subagent skills:
  - `.codex/skills/planner/`
  - `.codex/skills/plan-harder/`
  - `.codex/skills/parallel-task/`
  - `docs/CODEX_SUBAGENT_IMPLEMENTATION.md`
- Portable global config (vault canonical): `C:\Users\treyt\Desktop\PT School Semester 2\agents\config\`
