---
name: project-skill-audit
description: Analyze a project's past Codex sessions, memory files, and existing local skills to recommend the highest-value skills to create or update. Use when a user asks what skills a project needs, wants skill ideas grounded in real project history, wants an audit of current project-local skills, or wants recommendations for updating stale or incomplete skills instead of creating duplicates.
---

# Project Skill Audit

## Overview

Audit recurring project workflows before recommending skills. Prefer evidence from memory, rollout summaries, existing repo-local skills, and current repo conventions over generic brainstorming. Recommend updates before new skills when an existing local skill is already close to the needed behavior.

## Audit Workflow

1. Map the current project surface first.
   - Identify the repo root.
   - Read the most relevant project guidance first, usually `AGENTS.md`, `README.md`, and the current roadmap, execution board, or workflow docs.
   - Capture the repo's validation rules, ownership boundaries, and any required run or test commands.

2. Build the memory and session paths before searching.
   - Resolve the memory base as `$CODEX_HOME` when set, otherwise default to `~/.codex`.
   - Use:
     - `memories/MEMORY.md`
     - `memories/rollout_summaries/`
     - `sessions/`

3. Read past project sessions in the right order.
   - If the current prompt already includes a memory summary, start there.
   - Search `MEMORY.md` for:
     - repo name
     - repo basename
     - current `cwd`
     - important module or file names
   - Open only the 1-3 most relevant rollout summaries first.
   - Fall back to raw session JSONL only when summaries are missing exact evidence you need.

4. Scan existing project-local skills before suggesting anything new.
   - Check relative to the repo root:
     - `.agents/skills`
     - `.codex/skills`
     - `skills`
   - Read `SKILL.md` and `agents/openai.yaml` when present.

5. Compare current skills against recurring work.
   - Look for repeated:
     - validation sequences
     - failure shields
     - ownership boundaries
     - root-cause categories
     - workflows that repeatedly require the same repo-specific context
   - If a pattern recurs and is not already captured well, treat it as a candidate.

6. Separate `new skill` from `update existing skill`.
   - Recommend an update when an existing local skill already covers most of the workflow but has stale triggers, outdated paths, weak guardrails, or incomplete validation instructions.
   - Recommend a new skill only when stretching an existing skill would make it vague or confusing.

7. Check global overlap after reviewing project-local skills.
   - Review `$CODEX_HOME/skills` and `$CODEX_HOME/skills/public` only after the local scan.
   - Do not reject a project-local skill just because a global skill exists. Project-specific guardrails can still justify a local specialization.

## Session Analysis

### Search Memory First

- Search `MEMORY.md` with `rg` using the repo name, basename, and `cwd`.
- Prefer entries that already cite rollout summaries with the same repo path.
- Capture:
  - repeated workflows
  - validation commands
  - failure shields
  - ownership boundaries
  - milestone or roadmap coupling

### Open Targeted Rollout Summaries

- Open the most relevant summary files under `memories/rollout_summaries/`.
- Prefer summaries whose filenames, `cwd`, or keywords match the current repo.
- Extract:
  - what the user asked for repeatedly
  - what steps kept recurring
  - what broke repeatedly
  - what commands proved correctness
  - what project-specific context had to be rediscovered

### Use Raw Sessions Only as a Fallback

- Search raw `sessions/` JSONL only if rollout summaries are insufficient.
- Search by:
  - exact `cwd`
  - repo basename
  - thread ID from a rollout summary
  - specific file paths or commands
- Use raw sessions to recover exact prompts, command sequences, diffs, or failure text, not to replace the summary pass.

### Turn Evidence Into Skill Candidates

- A `new skill` candidate must correspond to a repeated workflow, not just a repeated topic.
- A `skill update` candidate must correspond to a workflow already covered by a local skill whose triggers, guardrails, or validation instructions no longer match recorded sessions.
- Prefer concrete evidence such as:
  - a validation sequence recurring across multiple sessions
  - repeated ownership confusion across the same subsystems
  - the same script, probe, or context file being rediscovered repeatedly

## Recommendation Rules

- Recommend a new skill when:
  - the same repo-specific workflow or failure mode appears multiple times across sessions
  - success depends on project-specific paths, scripts, ownership rules, or validation steps
  - the workflow benefits from strong defaults or failure shields

- Recommend an update when:
  - an existing project-local skill already covers most of the need
  - `SKILL.md` and `agents/openai.yaml` drift from each other
  - paths, scripts, validation commands, or milestone references are stale
  - the skill body is too generic to reflect how the project is actually worked on

- Do not recommend a skill when:
  - the pattern is a one-off bug rather than a reusable workflow
  - a generic global skill already fits with no meaningful project-specific additions
  - the workflow has not recurred enough to justify the maintenance cost

## What To Scan

- Past sessions and memory:
  - memory summary already in context, if any
  - `$CODEX_HOME/memories/MEMORY.md` or `~/.codex/memories/MEMORY.md`
  - the 1-3 most relevant rollout summaries for the current repo
  - raw `$CODEX_HOME/sessions` or `~/.codex/sessions` JSONL only if summaries are insufficient

- Project-local skill surface:
  - `./.agents/skills/*/SKILL.md`
  - `./.agents/skills/*/agents/openai.yaml`
  - `./.codex/skills/*/SKILL.md`
  - `./skills/*/SKILL.md`

- Project conventions:
  - `AGENTS.md`
  - `README.md`
  - roadmap, ledger, architecture, or validation docs
  - current worktree or recently touched areas if needed for context

## Output Contract

Return a compact audit with these sections:

1. `Existing skills`
   - List the project-local skills found and the main workflow each one covers.

2. `Suggested updates`
   - For each update candidate, include:
     - skill name
     - why it is incomplete or stale
     - the highest-value change to make

3. `Suggested new skills`
   - For each new-skill candidate, include:
     - recommended skill name
     - why it should exist
     - what would trigger it
     - the core workflow it should encode

4. `Priority order`
   - Rank the top recommendations by expected value.

## Naming Guidance

- Prefer short hyphen-case names.
- Use project prefixes for project-local skills when that improves clarity.
- Prefer verb-led or action-oriented names over vague nouns.

## Failure Shields

- Do not invent recurring patterns without session or repo evidence.
- Do not recommend duplicate skills when an update to an existing skill would suffice.
- Do not rely on a single memory note if the current repo clearly evolved since then.
- Do not bulk-load all rollout summaries; stay targeted.
- Do not skip rollout summaries and jump straight to raw sessions unless the summaries are insufficient.
- Do not recommend skills from themes alone; recommendations should come from repeated procedures, repeated validation flows, or repeated failure modes.
- Do not confuse a project's current implementation tasks with its reusable skill needs.

## Follow-up

If the user asks to actually create or update one of the recommended skills, switch to `$skill-creator` and implement the chosen skill instead of continuing the audit.
