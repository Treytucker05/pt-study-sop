# Ralph config for PT Study SOP
# Using Codex as the agent — fully autonomous, no approval prompts

PRD_PATH=".agents/tasks/prd.json"
PROGRESS_PATH=".ralph/progress.md"
GUARDRAILS_PATH=".ralph/guardrails.md"
ERRORS_LOG_PATH=".ralph/errors.log"
ACTIVITY_LOG_PATH=".ralph/activity.log"
TMP_DIR=".ralph/.tmp"
RUNS_DIR=".ralph/runs"
GUARDRAILS_REF=".agents/ralph/references/GUARDRAILS.md"
CONTEXT_REF=".agents/ralph/references/PROJECT_CONTEXT.md"
ACTIVITY_CMD=".agents/ralph/log-activity.sh"
AGENT_CMD="codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -c model_reasoning_effort=medium -"
PRD_AGENT_CMD="codex --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check {prompt}"
AGENTS_PATH="AGENTS.md"
PROMPT_BUILD=".agents/ralph/PROMPT_build.md"
NO_COMMIT=false
MAX_ITERATIONS=40
STALE_SECONDS=120
