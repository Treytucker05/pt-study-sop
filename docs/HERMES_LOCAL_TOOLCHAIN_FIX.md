# Hermes Local Toolchain Fix

> Generated: 2026-03-08

## Root Cause

Python's stdout defaults to `cp1252` encoding on Windows. Hermes uses Unicode box-drawing characters (U+250x) in its `doctor` command and other output. Without `PYTHONUTF8=1` set **before** `hermes.exe` is invoked, any command that prints Unicode crashes with:

```
UnicodeEncodeError: 'charmap' codec can't encode characters in position 0-58
```

The original launcher set `PYTHONUTF8=1` inside the PowerShell child process, but that only took effect for the interactive `chat` session — not for `hermes doctor`, `hermes skills list`, or any bat-level invocations.

## Files Changed

| File | Action |
|------|--------|
| `Launch_Hermes.bat` | Updated: added `PYTHONUTF8=1` at bat level, added `--doctor` mode |
| `Launch_Hermes.bat.bak` | Created: backup of original launcher |
| `Hermes_Doctor.ps1` | Created: 11-check smoke test script |

All files at: `C:\Users\treyt\OneDrive\Desktop\Travel Laptop\`

## Launch_Hermes.bat Changes

### Before (relevant section)
```bat
:: --- Set working directory to the project ---
cd /d "%PROJECT%"

:: --- Launch with all required env vars for local mode ---
powershell -NoLogo -NoExit -Command ^
  "$env:PYTHONUTF8 = '1';" ...
```

### After (key additions)
```bat
:: --- Fix: force UTF-8 BEFORE any hermes.exe call ---
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"

:: --- Set working directory to the project ---
cd /d "%PROJECT%"

:: --- Doctor mode: Launch_Hermes.bat --doctor ---
if "%~1"=="--doctor" (
    echo === Hermes Startup Diagnostics ===
    echo   CWD      : %CD%
    echo   USER     : %USERNAME%
    echo   HERMES   : %HERMES_EXE%
    "%HERMES_EXE%" --version
    "%HERMES_EXE%" doctor
    powershell -NoLogo -ExecutionPolicy Bypass -File "%~dp0Hermes_Doctor.ps1" ...
    pause
    exit /b %ERRORLEVEL%
)
```

Normal interactive launch behavior is unchanged.

## Doctor Command

```
Launch_Hermes.bat --doctor
```

Or standalone:
```powershell
powershell -ExecutionPolicy Bypass -File Hermes_Doctor.ps1 "C:\Users\treyt\.hermes\hermes-agent\venv\Scripts\hermes.exe" "C:\pt-study-sop"
```

## Doctor Results

| Test | Result | Evidence |
|------|--------|----------|
| A1: Desktop create file | PASS | Created on OneDrive Desktop |
| A2: Desktop append line | PASS | Appended to same file |
| A3: Desktop read file | PASS | Both lines present |
| A4: Desktop delete file | PASS | Cleaned up |
| B1: Project create file | PASS | Created docs/_hermes_smoke_test.md |
| B2: Project append file | PASS | Appended timestamp |
| B3: Project read file | PASS | 96 chars, content verified |
| C1: Get-Location | PASS | CWD: C:\pt-study-sop |
| C2: Get-ChildItem | PASS | Found 5 items |
| D1: hermes skills list | PASS | Skill entries found (builtin) |
| D2: hermes skills view | PASS | 717 chars output |

**11 / 11 PASS**

## Daily Launch Command

Double-click or run:
```
"C:\Users\treyt\OneDrive\Desktop\Travel Laptop\Launch_Hermes.bat"
```

For health check:
```
"C:\Users\treyt\OneDrive\Desktop\Travel Laptop\Launch_Hermes.bat" --doctor
```

## Hermes Version

```
Hermes Agent v1.0.0
Python: 3.11.14
OpenAI SDK: 2.24.0
```

## Built-in Doctor Summary

Core tools available: file, terminal, web, skills, memory, vision, tts, todo, delegation, session_search.
Optional missing: image_gen (FAL_KEY), browser (BROWSERBASE keys), code_execution, messaging, honcho.
