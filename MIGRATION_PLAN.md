# Unified Agent Config: C:\Users\treyt\.agents as Canon

## Current State

`C:\Users\treyt\.agents\skills\` exists with 31 shared skills. Claude Code, Codex CLI, and OpenCode all symlink to it. But 66 Codex skills remain local (3 skipped, 63 to migrate), and pt-study-sop\ai-config\ has drifted duplicates.

## Pre-flight Checklist

1. **Verify symlinks work**: `cmd /c mklink /D C:\Users\treyt\.agents\skills\_test_link C:\Users\treyt\.agents\skills\codex` — if fails, enable Developer Mode in Windows Settings > For Developers
2. **Backup Codex skills**: `xcopy /E /I C:\Users\treyt\.codex\skills C:\Users\treyt\.codex\skills.bak`
3. **Remove test symlink**: `rmdir C:\Users\treyt\.agents\skills\_test_link`

---

## Phase 1: Delete project-level duplicates (pt-study-sop\ai-config\)

### Problem
27 files in ai-config\. Of those, 24 are duplicates to delete and 3 are unique to keep.

### Exact files to DELETE (24 files)

**Drifted root copies:**
- `ai-config\CLAUDE.md` (missing 2 lines vs root: doc update checklist lines 5-6)
- `ai-config\AGENTS.md` (missing 2 lines vs root: doc update rule + prompt suffix)

**Mirrors of pt-study-sop\.claude\agents\:**
- `ai-config\agents\architect.md`
- `ai-config\agents\critic.md`
- `ai-config\agents\generator.md`
- `ai-config\agents\judge.md`
- `ai-config\agents\writer.md`

**Mirrors of pt-study-sop\.claude\subagents\:**
- `ai-config\subagents\architect.md`
- `ai-config\subagents\critic.md`
- `ai-config\subagents\generator.md`
- `ai-config\subagents\judge.md`
- `ai-config\subagents\writer.md`

**Mirrors of pt-study-sop\.claude\commands\:**
- `ai-config\commands\capture-fail.md`
- `ai-config\commands\commit.md`
- `ai-config\commands\generate-tests.md`
- `ai-config\commands\plan.md`
- `ai-config\commands\review.md`
- `ai-config\commands\run-eval.md`

**Mirrors of global Claude commands:**
- `ai-config\claude-commands\analytics.md`
- `ai-config\claude-commands\statusline.md`
- `ai-config\claude-commands\subagents.md`

**Config files (superseded by .claude\ equivalents):**
- `ai-config\mcp.json`
- `ai-config\settings.local.json`
- `ai-config\permissions.json`

### Files to KEEP (3 files)
- `ai-config\agent-workflow.md` — unique, referenced by root CLAUDE.md "Detailed Guidelines" section
- `ai-config\agent-prompts.md` — unique content not duplicated elsewhere
- `ai-config\README.md` — update to reflect consolidation

### Rollback
- `git checkout -- ai-config/` restores all deleted files (everything is tracked in git)

### Verification
- `dir ai-config\` shows only: README.md, agent-workflow.md, agent-prompts.md
- `findstr /s "ai-config" CLAUDE.md` confirms root still references agent-workflow.md correctly
- No other file in the repo imports from the deleted ai-config paths (search: `grep -r "ai-config/" --include="*.md" --include="*.py" --include="*.ts" --include="*.json" C:\pt-study-sop\`)

---

## Phase 2: Delete global-level duplicate rules

### Problem
`C:\Users\treyt\.claude\plugins\claude-delegator\rules\` has 4 files that duplicate `C:\Users\treyt\.claude\rules\delegator\`.

### Diff step (MUST run before deleting)
```
diff ~/.claude/rules/delegator/delegation-format.md ~/.claude/plugins/claude-delegator/rules/delegation-format.md
diff ~/.claude/rules/delegator/model-selection.md ~/.claude/plugins/claude-delegator/rules/model-selection.md
diff ~/.claude/rules/delegator/orchestration.md ~/.claude/plugins/claude-delegator/rules/orchestration.md
diff ~/.claude/rules/delegator/triggers.md ~/.claude/plugins/claude-delegator/rules/triggers.md
```

### Action
- If identical: delete the plugin copy (4 files in plugins\claude-delegator\rules\)
- If drifted: keep the version with more content in `rules\delegator\`, delete plugin copy
- KEEP `plugins\claude-delegator\prompts\` (5 files: architect.md, code-reviewer.md, plan-reviewer.md, scope-analyst.md, security-analyst.md — canonical source for Codex delegation)
- Update `C:\Users\treyt\.claude\rules\delegator\orchestration.md`: replace `${CLAUDE_PLUGIN_ROOT}/prompts/` with `C:\Users\treyt\.claude\plugins\claude-delegator\prompts\`

### Safety gate
- `C:\Users\treyt\.claude\plugins\claude-delegator\` is NOT in a git repo — it's a global config directory
- **Before deleting**: copy the 4 rule files to `C:\Users\treyt\.claude\plugins\claude-delegator\rules.bak\` as backup
- Only delete after diff confirms they match `rules\delegator\` or the newer version is preserved in `rules\delegator\`

### Rollback
- Restore from `rules.bak\` directory

### Verification
- `dir C:\Users\treyt\.claude\plugins\claude-delegator\rules\` should be empty or removed
- `dir C:\Users\treyt\.claude\plugins\claude-delegator\prompts\` still has 5 files
- Claude Code loads and `/delegator:architect` command still works

---

## Phase 3: Migrate local Codex skills to C:\Users\treyt\.agents\skills\

### Problem
66 Codex skills are local-only in `C:\Users\treyt\.codex\skills\`, not in the shared `C:\Users\treyt\.agents\skills\`.

### Pre-step: Generate authoritative move list
Run: `dir /AD C:\Users\treyt\.codex\skills\` and filter out symlinks and skip-list entries. Use that output as the definitive list — do NOT rely on the static list below if it disagrees with the live directory.

### Skills to SKIP (keep in place)
- `.system` — Codex-specific meta-skills (skill-creator, skill-installer)
- `dev-browser` — has node_modules\ directory, too heavy to move
- `agent-skills` — contains nested sub-skills with their own structure

### Skills to MOVE (63 directories)
```
agent-claude-code, agent-langgraph, agent-openai-sdk, agent-strategy,
agents-md, artifacts-builder, ask-questions-if-underspecified,
backend-development, branch-cleaner, browser-automation, bug-fast,
business-competitive-ads, business-content-writer, business-growth-analysis,
ci-fix, code-documentation, code-refactoring, code-review,
code-split_Module_Rules, codex-subagent, coding-guidelines-verify,
context-compression, context-degradation, context-fundamentals,
context-optimization, create-cli, create-pr, database-design,
dependency-upgrader, docx, ensure-agent-workflow, evaluation,
file-organizer, filesystem-context, frontend-design, frontend-responsive-ui,
gh-address-comments, javascript-typescript, llm-application-dev,
mcp-builder, memory-systems, multi-agent-patterns, multi-model-deep,
multi-model-quick, openai-docs-skill, pdf, plan-work, pptx, prd,
project-development, python-development, ralph, rebase-assistant,
refactor-clean, regex-builder, release-notes, research-bdi-cognitive,
sessions-to-blog, tdd, tool-design, ui-ux-pro-max,
video-transcript-downloader, xlsx
```

### Procedure (idempotent — safe to re-run)
1. **Test one**: Move `tdd` to `C:\Users\treyt\.agents\skills\tdd`, create symlink `C:\Users\treyt\.codex\skills\tdd` → `C:\Users\treyt\.agents\skills\tdd`, verify Codex resolves it
2. **Batch**: For each remaining skill:
   - **Pre-check**: If `C:\Users\treyt\.agents\skills\{name}` already exists, SKIP (already migrated)
   - **Pre-check**: If `C:\Users\treyt\.codex\skills\{name}` is already a symlink, SKIP
   - `move C:\Users\treyt\.codex\skills\{name} C:\Users\treyt\.agents\skills\{name}`
   - `mklink /D C:\Users\treyt\.codex\skills\{name} C:\Users\treyt\.agents\skills\{name}`
3. **Also symlink into Claude Code and OpenCode** (only if link doesn't already exist):
   - If not exists: `mklink /D C:\Users\treyt\.claude\skills\{name} C:\Users\treyt\.agents\skills\{name}`
   - If not exists: `mklink /D C:\Users\treyt\.config\opencode\skills\{name} C:\Users\treyt\.agents\skills\{name}`

### Rollback
- `xcopy /E /I C:\Users\treyt\.codex\skills.bak C:\Users\treyt\.codex\skills` restores original state

### Verification
- `dir C:\Users\treyt\.codex\skills\tdd` shows `<SYMLINK>` attribute
- `dir C:\Users\treyt\.agents\skills\tdd\SKILL.md` exists
- Codex CLI: `npx codex --help` still loads (basic sanity)
- Count: `dir /AD C:\Users\treyt\.agents\skills\ | find /c "/"` should show 94+ directories (31 original + 63 migrated). Derive expected count from live pre-step output, not this static number.

---

## Phase 4: Cross-tool connectivity

1. Create `C:\Users\treyt\.agents\README.md` documenting:
   - Purpose: single source of truth for shared agent skills
   - Structure: `skills\` directory with one subdirectory per skill
   - Consumers: Claude Code, Codex CLI, OpenCode (all via symlinks)
   - How to add: place skill in `.agents\skills\`, symlink from each tool
2. Verify all symlinks resolve:
   - `dir C:\Users\treyt\.claude\skills\ | findstr SYMLINK`
   - `dir C:\Users\treyt\.codex\skills\ | findstr SYMLINK`
   - `dir C:\Users\treyt\.config\opencode\skills\ | findstr SYMLINK`
3. Test each tool:
   - Claude Code: run `/tdd` command (should still load)
   - Codex: `npx codex "list available skills"` (should include migrated skills)
   - OpenCode: verify skills dir has symlinks

---

## Phase 5: Codex review loop

Per CLAUDE_CODEX_REVIEW_LOOP.md:
1. Collect all changes as a diff
2. Call Codex MCP to review: bugs, edge cases, broken references
3. Fix any issues found
4. Re-review if critical/major issues
5. Stop when no critical/major issues remain
