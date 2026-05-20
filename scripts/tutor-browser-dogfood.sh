#!/usr/bin/env bash
# Full Tutor E2E (slice #161 + #162) via agent-browser.
# Prereqs: dashboard running (./Start_Dashboard.command), agent-browser installed.
set -euo pipefail

BASE_URL="${TUTOR_DOGFOOD_URL:-http://127.0.0.1:5127}"
SESSION="${TUTOR_DOGFOOD_SESSION:-pt-tutor-e2e}"
TUTOR_URL="${BASE_URL}/tutor"
POLL_MS="${TUTOR_DOGFOOD_POLL_MS:-500}"
POLL_MAX="${TUTOR_DOGFOOD_POLL_MAX:-40}"

ab() {
  agent-browser --session "$SESSION" "$@"
}

ab_eval() {
  ab eval "$1"
}

# Stub confirm/alert so hero lifecycle actions do not block automation.
ab_stub_dialogs() {
  ab_eval "(() => { window.confirm = () => true; window.alert = () => {}; return true; })()"
}

ab_wait_for_testid() {
  local testid="$1"
  local i=0
  while [ "$i" -lt "$POLL_MAX" ]; do
    if ab_eval "Boolean(document.querySelector('[data-testid=${testid}]'))" | grep -q true; then
      return 0
    fi
    ab wait "$POLL_MS"
    i=$((i + 1))
  done
  echo "TIMEOUT: [data-testid=${testid}] not found after $((POLL_MAX * POLL_MS))ms"
  return 1
}

ab_wait_for_testid_gone() {
  local testid="$1"
  local i=0
  while [ "$i" -lt "$POLL_MAX" ]; do
    if ab_eval "Boolean(document.querySelector('[data-testid=${testid}]'))" | grep -q false; then
      return 0
    fi
    ab wait "$POLL_MS"
    i=$((i + 1))
  done
  echo "TIMEOUT: [data-testid=${testid}] still present after $((POLL_MAX * POLL_MS))ms"
  return 1
}

ab_open_tutor_panel() {
  ab_eval "document.querySelector('[data-testid=studio-open-panel-tutor_chat]')?.click(); true"
  ab wait 1500
  ab_eval "document.querySelector('[data-testid=studio-tutor-panel]')?.click(); true" || true
  ab wait 500
}

ab_end_teach_if_hero_visible() {
  if ab_eval "Boolean(document.querySelector('[data-testid=tutor-hero-end-teach]'))" | grep -q true; then
    echo "==> End teach (hero) — clearing prior leg"
    ab find testid "tutor-hero-end-teach" click
    ab wait 2000
    ab_wait_for_testid_gone "tutor-hero-end-teach" || true
  fi
}

if ! command -v agent-browser >/dev/null 2>&1; then
  echo "agent-browser not found. Install: npm i -g agent-browser && agent-browser install"
  exit 1
fi

echo "==> Open ${TUTOR_URL} (session ${SESSION})"
ab open "$TUTOR_URL"
ab wait 2000
ab_stub_dialogs

echo "==> Close entry overlay if present"
ab_eval "(() => { const b = document.querySelector('[data-testid=tutor-entry-close-button]'); if (b) b.click(); return Boolean(b); })()" || true
ab wait 500

ab_end_teach_if_hero_visible

echo "==> Open Tutor floating panel"
ab_open_tutor_panel

echo "==> Empty state (GENERAL Q&A + START TUTOR)"
ab_wait_for_testid "tutor-start-general-qa"
ab_wait_for_testid "tutor-start-teach"
echo "PASS: empty-state hooks present"

echo "==> Start GENERAL Q&A"
ab find testid "tutor-start-general-qa" click
ab_wait_for_testid_gone "tutor-start-general-qa"
echo "PASS: chat replaced empty state"

echo "==> Live session chrome"
ab_wait_for_testid "tutor-hero-end-teach"
echo "PASS: hero END TEACH visible"

echo "==> End teach from hero"
ab find testid "tutor-hero-end-teach" click
ab_wait_for_testid_gone "tutor-hero-end-teach"
echo "PASS: hero END TEACH cleared"

ab_open_tutor_panel
ab_wait_for_testid "tutor-start-general-qa"
ab_wait_for_testid "tutor-start-teach"
echo "PASS: empty state restored after End teach"

echo "==> Done. Session: ${SESSION}"
