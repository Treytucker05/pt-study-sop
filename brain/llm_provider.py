
import os
import sys
import json
import time
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List, Union

# Configuration
DEFAULT_TIMEOUT_SECONDS = 60

def find_codex_cli() -> Optional[str]:
    """Find Codex CLI executable path."""
    npm_path = Path(os.environ.get("APPDATA", "")) / "npm" / "codex.cmd"
    if npm_path.exists():
        return str(npm_path)
    
    try:
        result = subprocess.run(
            ["where.exe", "codex"] if os.name == "nt" else ["which", "codex"],
            capture_output=True,
            timeout=5,
            text=True,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split('\n')[0]
    except:
        pass
    
    return None

def call_llm(
    system_prompt: str, 
    user_prompt: str, 
    provider: str = "codex", 
    model: str = "default", 
    timeout: int = DEFAULT_TIMEOUT_SECONDS
) -> Dict[str, Any]:
    """
    Centralized LLM Caller.
    Defaults to Codex CLI.
    
    Returns a dictionary:
    {
        "success": bool,
        "content": str (if success),
        "error": str (if failed),
        "fallback_available": bool,
        "fallback_models": List[str]
    }
    """
    
    if provider == "codex":
        return _call_codex(system_prompt, user_prompt, timeout)
    
    # Placeholder for other providers if we implement direction connection here
    # For now, if provider is NOT codex, we might return error or implement fallback bridging later.
    # But usually, if fallback is triggered, the UI handles calling a different endpoint 
    # OR we implement the fallback logic here?
    # The requirement says: "On Codex failure, UI prompts user to select fallback provider/model."
    # So this function just reports failure for Codex.
    
    return {
        "success": False,
        "error": f"Provider '{provider}' not implemented in backend yet.",
        "content": None,
        "fallback_available": False,
        "fallback_models": []
    }

def _call_codex(system_prompt: str, user_prompt: str, timeout: int) -> Dict[str, Any]:
    codex_cmd = find_codex_cli()
    if not codex_cmd:
        return {
            "success": False,
            "error": "Codex CLI not found. Please install: npm install -g @openai/codex",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["gpt-4o-mini", "gpt-4.1-mini", "openrouter/auto"]
        }
        
    repo_root = Path(__file__).parent.parent.resolve()
    
    full_prompt = f"""System: {system_prompt}

Human: {user_prompt}
"""
    
    try:
        # Create temp file for output
        fd, output_path = tempfile.mkstemp(suffix=".md", prefix="codex_resp_")
        os.close(fd)
        output_file = Path(output_path)
        
        # subprocess.run with timeout
        # Using the same flags as scholar.py: --dangerously-bypass-approvals-and-sandbox
        process = subprocess.Popen(
            [
                codex_cmd, "exec",
                "--cd", str(repo_root),
                "--dangerously-bypass-approvals-and-sandbox",
                "--output-last-message", str(output_file),
                "-" # stdin
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        try:
            stdout, stderr = process.communicate(input=full_prompt, timeout=timeout)
        except subprocess.TimeoutExpired:
            process.kill()
            return {
                "success": False,
                "error": f"Codex timed out after {timeout} seconds.",
                "content": None,
                "fallback_available": True,
                "fallback_models": ["gpt-4o-mini", "gpt-4.1-mini", "openrouter/auto"]
            }
            
        if process.returncode != 0:
             return {
                "success": False,
                "error": f"Codex process failed: {stderr}",
                "content": None,
                "fallback_available": True,
                "fallback_models": ["gpt-4o-mini", "gpt-4.1-mini", "openrouter/auto"]
            }
            
        # Read output
        if output_file.exists():
            content = output_file.read_text(encoding="utf-8")
            try:
                os.remove(output_path)
            except: 
                pass
            return {"success": True, "content": content, "error": None}
        else:
            return {
                "success": False, 
                "error": "No output file created by Codex.",
                "content": None,
                "fallback_available": True,
                "fallback_models": ["gpt-4o-mini", "gpt-4.1-mini", "openrouter/auto"]
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Exception calling Codex: {str(e)}",
            "content": None,
            "fallback_available": True,
            "fallback_models": ["gpt-4o-mini", "gpt-4.1-mini", "openrouter/auto"]
        }
