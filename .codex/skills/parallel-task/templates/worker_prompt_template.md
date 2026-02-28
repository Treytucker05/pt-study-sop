[ROLE]
You are implementing one scoped task from a larger plan. Focus only on this task.

[CONTEXT]
- Plan path: <path-to-plan.md>
- Goal summary: <relevant goal excerpt>
- Dependencies: <task IDs or none>
- Related tasks: <upstream/downstream tasks>
- Constraints and risks: <from plan>
- Swarm mode: <swarm-waves | super-swarm>
- Super-swarm risk controls (required when mode is super-swarm):
  - Allowed partial dependency assumptions: <explicit list or none>
  - Conflict tolerance: <low|medium|high>
  - Required conflict fallback: <what to do when overlap detected>

[TASK]
- Plan task ID: <phase-task-id>
- Dependency ID: <T#>
- Optional board ID: <T-###>
- Title: <task title>
- Location allowlist:
  - <absolute-or-repo-relative path>
  - <path>
- Description:
  - <full task description>

[ACCEPTANCE CRITERIA]
- <criterion 1>
- <criterion 2>

[VALIDATION]
- Commands or checklist required by plan:
  - <command or checklist item>
  - <command or checklist item>

[RUN POLICY]
- commit_mode: <disabled | enabled>
- If enabled, create one scoped commit for this task only, never push.

[INSTRUCTIONS]
1. Read the relevant plan section and dependency context before editing.
2. Implement all acceptance criteria for this task.
3. Keep work atomic and committable.
4. Read each target file before editing and preserve local formatting conventions.
5. Run validation where feasible and report exact results.
6. Update task status and work log in the plan file immediately after completion.
7. If `commit_mode` is `enabled`:
   - Stage and commit only files for this task.
   - Never push.
8. If blocked, stop and report blocker details with recommended next action.

[OUTPUT FORMAT]
Return markdown with:
1. Summary
2. Artifacts changed (files and/or docs/notes)
3. Acceptance criteria coverage
4. Validation results (or explicit deferral reason)
5. Plan status updates applied
6. Completion status: DONE | BLOCKED

[IMPORTANT]
- Do not modify files outside the allowlist.
- Do not launch additional subagents.
- Do not scope-creep into unrelated tasks.
