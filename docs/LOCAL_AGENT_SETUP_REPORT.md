# Hermes Agent — Local Mode Setup Report

> Generated: 2026-03-08

## Root Causes Found

### 1. Wrong working directory (CWD)

`Launch_Hermes.bat` set `TARGET=C:\Users\treyt\OneDrive\Desktop\Travel Laptop` and
ran `cd /d "%TARGET%"` before launching Hermes.  The `config.yaml` had
`terminal.cwd: .` which resolved to `os.getcwd()` at startup — so Hermes started
in `Travel Laptop`, not in the project directory.

**Fix:** Changed launcher `TARGET` → `C:\pt-study-sop`, and set `config.yaml`
`terminal.cwd: C:\pt-study-sop`.

### 2. UTF-8 decode error in `.env` (previous session fix)

`~/.hermes/.env` contained a `0xa0` byte (non-breaking space) at position 10914
inside `DISCORD_BOT_TOKEN`.  The `minisweagent.__init__` module calls
`dotenv.load_dotenv()` without encoding error handling, crashing every
`check_terminal_requirements()` call.

**Fix:** Removed the stray byte (backup at `.env.bak`).

### 3. `os.setsid` crash on Windows

`tools/environments/local.py` used `preexec_fn=os.setsid` — a Unix-only API.
Every command execution through the local environment raised
`AttributeError: module 'os' has no attribute 'setsid'`.

The same file used `bash -lic` as the shell, which doesn't exist natively on
Windows.

**Fix:** Platform-gated the process creation:
- Windows: `cmd.exe /C` + `CREATE_NEW_PROCESS_GROUP`
- Unix: `bash -lic` + `os.setsid` (unchanged)

Also fixed interrupt/timeout kill logic that used `os.getpgid`/`os.killpg`.

### 4. Missing `TERMINAL_ENV` / `TERMINAL_CWD` env vars

The launcher didn't set `TERMINAL_ENV=local` or `TERMINAL_CWD` explicitly.
While `TERMINAL_ENV` defaults to `"local"`, the CWD defaulted to `os.getcwd()`
which was wrong due to issue #1.

**Fix:** Launcher now sets both vars explicitly via PowerShell `$env:` before
calling `hermes.exe`.

---

## Files Changed

| File | Change |
|------|--------|
| `Launch_Hermes.bat` | Rewrote: correct CWD, env vars, diagnostics banner |
| `~/.hermes/config.yaml` | `terminal.cwd: .` → `terminal.cwd: C:\pt-study-sop` |
| `~/.hermes/.env` | Removed `0xa0` byte from `DISCORD_BOT_TOKEN` |
| `~/.hermes/hermes-agent/tools/environments/local.py` | Platform-gated `setsid`/`bash`/`killpg` for Windows |

---

## Validation Evidence

```
env_type = local
cwd      = C:\pt-study-sop
check_terminal_requirements() = True

Files in C:\pt-study-sop:
.agent, .claude, AGENTS.md, brain, conductor, dashboard_rebuild,
docs, README.md, scholar, scripts, sop, ...
returncode = 0

README.md read OK (first 300 chars of content returned)
brain\dashboard\app.py read OK (Flask app source returned)
```

---

## Exact Launcher Command

Double-click or run from any terminal:

```
"C:\Users\treyt\OneDrive\Desktop\Travel Laptop\Launch_Hermes.bat"
```

Or directly in PowerShell:

```powershell
$env:TERMINAL_ENV = 'local'
$env:TERMINAL_CWD = 'C:\pt-study-sop'
$env:PYTHONUTF8 = '1'
cd C:\pt-study-sop
& "$env:USERPROFILE\.hermes\hermes-agent\venv\Scripts\hermes.exe"
```

---

## Remaining Notes

- `DISCORD_BOT_TOKEN` in `.env` appears duplicated (7 dot-separated parts instead
  of 3). Re-paste the correct token from Discord Developer Portal.
- Backup of original `.env` at `~/.hermes/.env.bak`.
