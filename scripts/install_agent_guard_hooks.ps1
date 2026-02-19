param(
  [ValidateSet("status", "install", "uninstall")]
  [string]$Action = "status"
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $root = (& git rev-parse --show-toplevel 2>$null)
  if (-not $root) { throw "Not inside a git repo." }
  return $root.Trim()
}

function Write-HookFile {
  param(
    [string]$Path,
    [string]$Content
  )

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Test-IsManagedHook {
  param([string]$Path, [string]$Marker)
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $content = Get-Content -LiteralPath $Path -Raw
  return $content -match [Regex]::Escape($Marker)
}

function Backup-File {
  param(
    [string]$Path,
    [string]$RepoRoot
  )

  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $backupRoot = Join-Path $RepoRoot ".git/hooks/_agent_guard_backups/$timestamp"
  if (-not (Test-Path -LiteralPath $backupRoot)) {
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  }

  $name = Split-Path -Leaf $Path
  $dest = Join-Path $backupRoot $name
  Copy-Item -LiteralPath $Path -Destination $dest -Force
  return $dest
}

function Preserve-ExistingHook {
  param(
    [string]$HookPath,
    [string]$SidecarPath,
    [string]$Marker,
    [string]$RepoRoot
  )

  if (-not (Test-Path -LiteralPath $HookPath)) { return }
  if (Test-IsManagedHook -Path $HookPath -Marker $Marker) { return }

  if (Test-Path -LiteralPath $SidecarPath) {
    $sidecarBackup = Backup-File -Path $SidecarPath -RepoRoot $RepoRoot
    if ($sidecarBackup) {
      Write-Host "Backed up existing sidecar: $SidecarPath -> $sidecarBackup"
    }
    Remove-Item -LiteralPath $SidecarPath -Force
  }

  Move-Item -LiteralPath $HookPath -Destination $SidecarPath -Force
  Write-Host "Preserved existing hook for chaining: $HookPath -> $SidecarPath"
}

function Get-HookState {
  param(
    [string]$HookPath,
    [string]$SidecarPath,
    [string]$Marker
  )

  if (-not (Test-Path -LiteralPath $HookPath)) {
    if (Test-Path -LiteralPath $SidecarPath) {
      return "missing (sidecar present)"
    }
    return "missing"
  }

  if (Test-IsManagedHook -Path $HookPath -Marker $Marker) {
    if (Test-Path -LiteralPath $SidecarPath) {
      return "managed + chained"
    }
    return "managed"
  }

  return "unmanaged"
}

$repoRoot = Get-RepoRoot
$hooksDir = Join-Path $repoRoot ".git/hooks"
$preCommitPath = Join-Path $hooksDir "pre-commit"
$prePushPath = Join-Path $hooksDir "pre-push"
$preCommitSidecar = Join-Path $hooksDir "pre-commit.local-agent-guard"
$prePushSidecar = Join-Path $hooksDir "pre-push.local-agent-guard"
$marker = "# managed-by: install_agent_guard_hooks.ps1"

$preCommitBody = @'
#!/bin/sh
__MARKER__
set -e
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
cd "$REPO_ROOT"
if [ -f "$HOOK_DIR/pre-commit.local-agent-guard" ]; then
  sh "$HOOK_DIR/pre-commit.local-agent-guard"
fi

echo "[pre-commit] Agent config drift check"
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/sync_agent_config.ps1 -Mode Check

echo "[pre-commit] Docs sync check"
python scripts/check_docs_sync.py

echo "[pre-commit] Project hub check"
python scripts/validate_project_hub.py
'@
$preCommitBody = $preCommitBody.Replace("__MARKER__", $marker)

$prePushBody = @'
#!/bin/sh
__MARKER__
set -e
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
cd "$REPO_ROOT"
if [ -f "$HOOK_DIR/pre-push.local-agent-guard" ]; then
  sh "$HOOK_DIR/pre-push.local-agent-guard"
fi

echo "[pre-push] Agent config drift check"
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/sync_agent_config.ps1 -Mode Check

echo "[pre-push] Docs sync check"
python scripts/check_docs_sync.py

echo "[pre-push] Project hub check"
python scripts/validate_project_hub.py

echo "[pre-push] Brain tests"
PYTEST_LOG="$(mktemp)"
set +e
python -m pytest brain/tests -q >"$PYTEST_LOG" 2>&1
PYTEST_STATUS=$?
set -e
cat "$PYTEST_LOG"

if [ "$PYTEST_STATUS" -ne 0 ] && grep -q "ValueError: I/O operation on closed file" "$PYTEST_LOG"; then
  echo "[pre-push] Detected pytest capture teardown crash. Retrying without capture (-s)."
  set +e
  python -m pytest brain/tests -q -s >"$PYTEST_LOG" 2>&1
  PYTEST_STATUS=$?
  set -e
  cat "$PYTEST_LOG"
fi

rm -f "$PYTEST_LOG"
if [ "$PYTEST_STATUS" -ne 0 ]; then
  exit "$PYTEST_STATUS"
fi
'@
$prePushBody = $prePushBody.Replace("__MARKER__", $marker)

switch ($Action) {
  "status" {
    Write-Host "Repo: $repoRoot"
    Write-Host ("pre-commit: {0}" -f (Get-HookState -HookPath $preCommitPath -SidecarPath $preCommitSidecar -Marker $marker))
    Write-Host ("pre-push:   {0}" -f (Get-HookState -HookPath $prePushPath -SidecarPath $prePushSidecar -Marker $marker))
    exit 0
  }

  "install" {
    if (-not (Test-Path -LiteralPath $hooksDir)) {
      New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
    }

    Preserve-ExistingHook -HookPath $preCommitPath -SidecarPath $preCommitSidecar -Marker $marker -RepoRoot $repoRoot
    Preserve-ExistingHook -HookPath $prePushPath -SidecarPath $prePushSidecar -Marker $marker -RepoRoot $repoRoot

    Write-HookFile -Path $preCommitPath -Content $preCommitBody
    Write-HookFile -Path $prePushPath -Content $prePushBody
    if ($IsLinux -or $IsMacOS) {
      & chmod +x $preCommitPath $prePushPath
    }

    Write-Host "Installed managed hooks:"
    Write-Host "- $preCommitPath"
    Write-Host "- $prePushPath"
    Write-Host ""
    Write-Host "These hooks enforce:"
    Write-Host "- scripts/sync_agent_config.ps1 -Mode Check"
    Write-Host "- scripts/check_docs_sync.py"
    Write-Host "- scripts/validate_project_hub.py"
    Write-Host "- python -m pytest brain/tests -q (pre-push only; auto-retry with -s on known capture crash)"
    Write-Host ""
    Write-Host "Existing unmanaged hooks are chained via:"
    Write-Host "- $preCommitSidecar"
    Write-Host "- $prePushSidecar"
    exit 0
  }

  "uninstall" {
    if (Test-IsManagedHook -Path $preCommitPath -Marker $marker) {
      Remove-Item -LiteralPath $preCommitPath -Force
      Write-Host "Removed managed hook: $preCommitPath"
      if (Test-Path -LiteralPath $preCommitSidecar) {
        Move-Item -LiteralPath $preCommitSidecar -Destination $preCommitPath -Force
        Write-Host "Restored original hook: $preCommitPath"
      }
    } elseif (Test-Path -LiteralPath $preCommitPath) {
      Write-Host "Skipped unmanaged hook: $preCommitPath"
    } elseif (Test-Path -LiteralPath $preCommitSidecar) {
      Move-Item -LiteralPath $preCommitSidecar -Destination $preCommitPath -Force
      Write-Host "Restored original hook from sidecar: $preCommitPath"
    }

    if (Test-IsManagedHook -Path $prePushPath -Marker $marker) {
      Remove-Item -LiteralPath $prePushPath -Force
      Write-Host "Removed managed hook: $prePushPath"
      if (Test-Path -LiteralPath $prePushSidecar) {
        Move-Item -LiteralPath $prePushSidecar -Destination $prePushPath -Force
        Write-Host "Restored original hook: $prePushPath"
      }
    } elseif (Test-Path -LiteralPath $prePushPath) {
      Write-Host "Skipped unmanaged hook: $prePushPath"
    } elseif (Test-Path -LiteralPath $prePushSidecar) {
      Move-Item -LiteralPath $prePushSidecar -Destination $prePushPath -Force
      Write-Host "Restored original hook from sidecar: $prePushPath"
    }

    exit 0
  }
}
