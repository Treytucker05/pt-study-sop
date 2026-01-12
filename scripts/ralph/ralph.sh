#!/bin/bash
set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEX_BIN="${CODEX_BIN:-codex}"

if ! command -v "$CODEX_BIN" >/dev/null 2>&1; then
  if [ -x "/usr/local/bin/codex" ]; then
    CODEX_BIN="/usr/local/bin/codex"
  fi
fi

echo " Starting Ralph"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo "??? Iteration $i ???"

  OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" \
    | "$CODEX_BIN" exec --dangerously-bypass-approvals-and-sandbox - 2>&1 \
    | tee /dev/stderr) || true

  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo "? Done!"
    exit 0
  fi

  sleep 2
done

echo "?? Max iterations reached"
exit 1
