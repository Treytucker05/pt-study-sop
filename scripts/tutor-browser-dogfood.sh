#!/usr/bin/env bash
# Dogfood slice #161 (General Q&A + teach gate) via agent-browser.
# Prereqs: dashboard running (./Start_Dashboard.command), agent-browser installed.
set -euo pipefail

BASE_URL="${TUTOR_DOGFOOD_URL:-http://127.0.0.1:5127}"
SESSION="${TUTOR_DOGFOOD_SESSION:-pt-tutor-dogfood}"
TUTOR_URL="${BASE_URL}/tutor"

ab() {
  agent-browser --session "$SESSION" "$@"
}

ab_eval() {
  ab eval "$1"
}

if ! command -v agent-browser >/dev/null 2>&1; then
  echo "agent-browser not found. Install: npm i -g agent-browser && agent-browser install"
  exit 1
fi

echo "==> Open ${TUTOR_URL}"
ab open "$TUTOR_URL"
ab wait 2000

echo "==> Close entry overlay if present"
ab_eval "(() => { const b = document.querySelector('[data-testid=tutor-entry-close-button]'); if (b) b.click(); return Boolean(b); })()" || true
ab wait 500

echo "==> Open Tutor floating panel"
ab_eval "document.querySelector('[data-testid=studio-open-panel-tutor_chat]')?.click(); true"
ab wait 2000

echo "==> Verify empty-state hooks"
if ab_eval "Boolean(document.querySelector('[data-testid=tutor-start-general-qa]'))" | grep -q true; then
  echo "PASS: tutor-start-general-qa in DOM"
else
  echo "FAIL: tutor-start-general-qa missing (is Tutor panel open?)"
  ab_eval "Array.from(document.querySelectorAll('[data-testid]')).map(e=>e.getAttribute('data-testid')).join(',')"
  exit 1
fi

if ab_eval "Boolean(document.querySelector('[data-testid=tutor-start-teach]'))" | grep -q true; then
  echo "PASS: tutor-start-teach in DOM"
else
  echo "FAIL: tutor-start-teach missing"
  exit 1
fi

echo "==> Click GENERAL Q&A (starts general session)"
ab find testid "tutor-start-general-qa" click
ab wait 3000

if ab_eval "Boolean(document.querySelector('[data-testid=tutor-start-general-qa]'))" | grep -q false; then
  echo "PASS: empty state replaced by chat after general start"
else
  echo "WARN: empty state still visible (session may have failed — check toasts)"
fi

echo "==> Optional: apply Study layout preset"
if ab_eval "(() => { const c = document.querySelector('[aria-label=\"Canvas actions\"]'); if (c) c.click(); return Boolean(c); })()" | grep -q true; then
  ab wait 400
  ab_eval "document.querySelector('[data-testid=studio-preset-study]')?.click(); true" || true
  ab wait 1000
  echo "PASS: Study preset applied (if menu was available)"
fi

echo "==> Done. Session: ${SESSION}"
