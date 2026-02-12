#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${1:-pt-opencode}"
ROLES_CSV="${2:-ui,brain,integrate,docs}"
WORKTREES_ROOT="${WORKTREES_ROOT:-/mnt/c/pt-study-sop-worktrees}"
REPO_ROOT="${REPO_ROOT:-/mnt/c/pt-study-sop}"
OPENCODE_CMD="${OPENCODE_CMD:-opencode}"
SAFE_SESSION="${SESSION_NAME// /_}"

parse_roles() {
  local csv="$1"
  local raw
  local role
  local out=()
  IFS=',' read -r -a raw <<< "$csv"
  for role in "${raw[@]}"; do
    role="${role#"${role%%[![:space:]]*}"}"
    role="${role%"${role##*[![:space:]]}"}"
    role="$(printf '%s' "$role" | tr '[:upper:]' '[:lower:]')"
    [[ -z "$role" ]] && continue
    case "$role" in
      ui|brain|integrate|docs) out+=("$role") ;;
      *)
        echo "ERROR: invalid role '$role' in ROLES_CSV='$csv'" >&2
        echo "Allowed roles: ui, brain, integrate, docs" >&2
        exit 1
        ;;
    esac
  done
  if [[ "${#out[@]}" -eq 0 ]]; then
    echo "ERROR: no valid roles provided. ROLES_CSV='$csv'" >&2
    exit 1
  fi
  ROLES=("${out[@]}")
}

ROLES=()
parse_roles "$ROLES_CSV"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $cmd" >&2
    exit 1
  fi
}

require_cmd tmux

opencode_bin="${OPENCODE_CMD%% *}"
require_cmd "$opencode_bin"

for role in "${ROLES[@]}"; do
  role_path="${WORKTREES_ROOT}/${role}"
  if [[ ! -d "$role_path" ]]; then
    echo "ERROR: missing worktree path: $role_path" >&2
    echo "Run worktree setup from Windows first." >&2
    exit 1
  fi
done

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Attaching existing tmux session: $SESSION_NAME"
  exec tmux attach -t "$SESSION_NAME"
fi

start_role_window() {
  local role="$1"
  local role_path="${WORKTREES_ROOT}/${role}"

  if [[ "$role" == "ui" ]]; then
    tmux new-session -d -s "$SESSION_NAME" -n "$role" -c "$role_path"
  else
    tmux new-window -d -t "$SESSION_NAME" -n "$role" -c "$role_path"
  fi

  local init_cmd
  init_cmd="cd \"$role_path\"; "
  init_cmd+="export TERM=\${TERM:-xterm-256color}; "
  init_cmd+="export PT_AGENT_NAME=\"opencode-${role}-${SAFE_SESSION}\"; "
  init_cmd+="export PT_AGENT_ROLE=\"$role\"; "
  init_cmd+="export PT_AGENT_TOOL=\"opencode\"; "
  init_cmd+="export PT_AGENT_SESSION=\"$SESSION_NAME\"; "
  init_cmd+="export PT_AGENT_WORKTREE=\"$role_path\"; "
  init_cmd+="if [ -f \"$REPO_ROOT/scripts/agent_task_board.py\" ]; then alias task-board='python \"$REPO_ROOT/scripts/agent_task_board.py\"'; fi; "
  init_cmd+="echo '[task-board] task-board list | task-board claim --task-id T-001'; "
  init_cmd+="$OPENCODE_CMD"

  tmux send-keys -t "$SESSION_NAME:$role" "$init_cmd" C-m
}

for role in "${ROLES[@]}"; do
  start_role_window "$role"
done

FIRST_ROLE="${ROLES[0]}"
tmux select-window -t "$SESSION_NAME:$FIRST_ROLE"
echo "Created tmux session: $SESSION_NAME"
echo "Windows: ${ROLES[*]}"
exec tmux attach -t "$SESSION_NAME"
