#!/usr/bin/env bash
set -euo pipefail

# macOS launcher for the PT Study dashboard.
# Keeps Windows Start_Dashboard.bat unchanged while giving Mac installs a
# one-command path that builds the UI, initializes the DB, and starts Flask.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/brain"
REBUILD_DIR="$ROOT_DIR/dashboard_rebuild"
DIST_INDEX="$SERVER_DIR/static/dist/index.html"

export PATH="/opt/homebrew/opt/python@3.12/libexec/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
export PT_BRAIN_HOST="${PT_BRAIN_HOST:-127.0.0.1}"
export PT_BRAIN_PORT="${PT_BRAIN_PORT:-5127}"

if [ -z "${OBSIDIAN_VAULT_FS_PATH:-}" ]; then
  if [ -d "$HOME/Desktop/Treys School/Treys School" ]; then
    export OBSIDIAN_VAULT_FS_PATH="$HOME/Desktop/Treys School/Treys School"
  elif [ -d "$HOME/Desktop/Treys School" ]; then
    export OBSIDIAN_VAULT_FS_PATH="$HOME/Desktop/Treys School"
  fi
fi

if [ -n "${OBSIDIAN_VAULT_FS_PATH:-}" ] && [ -z "${PT_OBSIDIAN_VAULT_PATH:-}" ]; then
  export PT_OBSIDIAN_VAULT_PATH="$OBSIDIAN_VAULT_FS_PATH"
fi

if [ -z "${PT_STUDY_RAG_DIR:-}" ]; then
  if [ -d "$HOME/Desktop/PT School" ]; then
    export PT_STUDY_RAG_DIR="$HOME/Desktop/PT School"
  elif [ -d "$ROOT_DIR/PT School" ]; then
    export PT_STUDY_RAG_DIR="$ROOT_DIR/PT School"
  fi
fi

echo "[0/5] Checking prerequisites..."

PYTHON_BIN="${PT_PYTHON:-}"
if [ -z "$PYTHON_BIN" ]; then
  if command -v python3.12 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3.12)"
  elif [ -x /opt/homebrew/bin/python3.12 ]; then
    PYTHON_BIN="/opt/homebrew/bin/python3.12"
  else
    PYTHON_BIN="$(command -v python3 || true)"
  fi
fi

if [ -z "$PYTHON_BIN" ]; then
  echo "[ERROR] Python 3.12+ was not found. Install it with: brew install python@3.12"
  exit 1
fi

"$PYTHON_BIN" - <<'PY'
import sys
if sys.version_info < (3, 12):
    raise SystemExit(
        "Python 3.12+ is required. Apple Python 3.9 is not enough for this app."
    )
PY

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm was not found. Install Node.js with Homebrew, nvm, or the Node installer."
  exit 1
fi

echo "[INFO] Python: $("$PYTHON_BIN" --version)"
echo "[INFO] Node: $(node --version)"
echo "[INFO] npm: $(npm --version)"

cd "$ROOT_DIR"

echo "[1/5] Preparing Python environment..."
if [ ! -x "$ROOT_DIR/.venv/bin/python" ] || ! "$ROOT_DIR/.venv/bin/python" - <<'PY' >/dev/null 2>&1
import sys
raise SystemExit(0 if sys.version_info >= (3, 12) else 1)
PY
then
  rm -rf "$ROOT_DIR/.venv"
  "$PYTHON_BIN" -m venv "$ROOT_DIR/.venv"
fi

REQ_FILE="$ROOT_DIR/brain/requirements.txt"
PY_MARKER="$ROOT_DIR/.venv/.pt-study-requirements-installed"
if [ ! -f "$PY_MARKER" ] || [ "$REQ_FILE" -nt "$PY_MARKER" ]; then
  "$ROOT_DIR/.venv/bin/python" -m pip install --upgrade pip
  "$ROOT_DIR/.venv/bin/python" -m pip install -r "$REQ_FILE"
  touch "$PY_MARKER"
else
  echo "[INFO] Python dependencies are current."
fi

echo "[2/5] Preparing frontend dependencies..."
NPM_MARKER="$REBUILD_DIR/node_modules/.pt-study-npm-installed"
if [ ! -d "$REBUILD_DIR/node_modules" ] || [ "$REBUILD_DIR/package-lock.json" -nt "$NPM_MARKER" ]; then
  cd "$REBUILD_DIR"
  npm install
  touch "$NPM_MARKER"
else
  echo "[INFO] Frontend dependencies are current."
fi

echo "[3/5] Building dashboard UI..."
if [ "${SKIP_UI_BUILD:-0}" = "1" ]; then
  echo "[INFO] SKIP_UI_BUILD=1 - skipping UI build."
else
  cd "$REBUILD_DIR"
  npm run build
fi

if [ ! -f "$DIST_INDEX" ]; then
  echo "[ERROR] Frontend build output is missing at $DIST_INDEX."
  exit 1
fi

echo "[4/5] Initializing Brain database..."
cd "$SERVER_DIR"
"$ROOT_DIR/.venv/bin/python" db_setup.py

echo "[5/5] Starting dashboard..."
DASHBOARD_URL="http://$PT_BRAIN_HOST:$PT_BRAIN_PORT/brain"
HEALTH_URL="http://$PT_BRAIN_HOST:$PT_BRAIN_PORT/api/brain/status"

open_dashboard_page() {
  if [ "${PT_NO_BROWSER:-0}" != "1" ] && command -v open >/dev/null 2>&1; then
    open "$DASHBOARD_URL" >/dev/null 2>&1 || true
  fi
}

wait_and_open_dashboard_page() {
  if [ "${PT_NO_BROWSER:-0}" = "1" ] || ! command -v open >/dev/null 2>&1; then
    return
  fi

  (
    if command -v curl >/dev/null 2>&1; then
      for _ in {1..30}; do
        if curl -fsS "$HEALTH_URL" >/dev/null 2>&1 || curl -fsS "$DASHBOARD_URL" >/dev/null 2>&1; then
          open "$DASHBOARD_URL" >/dev/null 2>&1 || true
          exit 0
        fi
        sleep 1
      done
    fi
    open "$DASHBOARD_URL" >/dev/null 2>&1 || true
  ) &
}

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PT_BRAIN_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  if command -v curl >/dev/null 2>&1 && { curl -fsS "$HEALTH_URL" >/dev/null 2>&1 || curl -fsS "$DASHBOARD_URL" >/dev/null 2>&1; }; then
    echo "[INFO] Dashboard is already running at $DASHBOARD_URL"
    open_dashboard_page
    exit 0
  fi
  echo "[ERROR] Port $PT_BRAIN_PORT is already in use, but it does not look like this dashboard."
  lsof -nP -iTCP:"$PT_BRAIN_PORT" -sTCP:LISTEN || true
  echo "Set PT_BRAIN_PORT to another port and rerun, for example: PT_BRAIN_PORT=5128 ./Start_Dashboard.command"
  exit 1
fi

echo "[INFO] Dashboard URL: $DASHBOARD_URL"
wait_and_open_dashboard_page

exec "$ROOT_DIR/.venv/bin/python" dashboard_web.py
