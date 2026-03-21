const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const os = require('os');

function findAhkExe() {
    try {
        const localAppData = process.env.LOCALAPPDATA;
        if (!localAppData) return null;

        const ahkDir = path.join(localAppData, 'Programs', 'AutoHotkey');
        
        // Use PowerShell to find the first AutoHotkey*.exe
        const cmd = `powershell.exe -NoProfile -Command "(Get-ChildItem -Path '${ahkDir}' -Filter AutoHotkey64.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1).FullName"`;
        const result = execSync(cmd, { encoding: 'utf-8' }).trim();
        
        if (result && fs.existsSync(result)) {
            return result;
        }
    } catch (e) {
        // Fallback
    }
    return null;
}

function run() {
    const workspaceRoot = process.env.GEMINI_WORKSPACE_ROOT || process.cwd();
    const ahkScriptPath = path.join(workspaceRoot, 'tools', 'MousePaste.ahk');
    
    if (!fs.existsSync(ahkScriptPath)) {
        return;
    }

    // Check if it's already running to avoid duplicate processes
    try {
        const checkCmd = `powershell.exe -NoProfile -Command "(Get-Process AutoHotkey64 -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'MousePaste.ahk' }).Id"`;
        const runningPids = execSync(checkCmd, { encoding: 'utf-8' }).trim();
        if (runningPids) {
            // Already running
            return;
        }
    } catch (e) {
        // Continue if check fails
    }

    const ahkExe = findAhkExe();
    if (!ahkExe) {
        return;
    }

    // Spawn detached process
    const child = spawn(ahkExe, [ahkScriptPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });

    // Unref so the parent process doesn't wait for it
    child.unref();
}

run();