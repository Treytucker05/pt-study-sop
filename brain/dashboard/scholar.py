
import os
import re
import json
import threading
import subprocess
from pathlib import Path
from datetime import datetime
from dashboard.utils import load_api_config

# Try to import requests for OpenAI API calls
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# Maximum context size to send to API (approx 30k tokens = ~120k chars)
MAX_CONTEXT_CHARS = 100000


def cleanup_stale_pids() -> int:
    """
    Scan orchestrator_runs for *.pid files and remove any where the process is no longer running.
    Returns count of cleaned up files.
    """
    repo_root = Path(__file__).parent.parent.parent.resolve()
    run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    
    if not run_dir.exists():
        return 0
    
    cleaned = 0
    for pid_file in run_dir.glob("*.pid"):
        try:
            pid_txt = pid_file.read_text(encoding="utf-8").strip()
            pid = int(pid_txt)
            
            # Check if process is running
            is_running = False
            if pid > 0:
                if os.name == "nt":
                    try:
                        proc = subprocess.run(
                            ["tasklist", "/FI", f"PID eq {pid}"],
                            capture_output=True,
                            text=True,
                            timeout=3,
                        )
                        out = (proc.stdout or "")
                        if "No tasks are running" not in out:
                            is_running = re.search(rf"\b{re.escape(str(pid))}\b", out) is not None
                    except Exception:
                        pass
                else:
                    try:
                        os.kill(pid, 0)
                        is_running = True
                    except Exception:
                        pass
            
            if not is_running:
                pid_file.unlink()
                cleaned += 1
        except Exception:
            # If we can't read or parse the PID file, try to delete it
            try:
                pid_file.unlink()
                cleaned += 1
            except Exception:
                pass
    
    return cleaned


def _truncate_context(context: str, max_chars: int = MAX_CONTEXT_CHARS) -> str:
    """
    Truncate context to fit within token limits.
    Keeps the beginning (most important context) and truncates the end.
    """
    if not context or len(context) <= max_chars:
        return context
    
    # Truncate and add indicator
    truncated = context[:max_chars]
    # Try to cut at a natural boundary (newline or sentence)
    last_newline = truncated.rfind('\n', max_chars - 500, max_chars)
    if last_newline > max_chars - 1000:
        truncated = truncated[:last_newline]
    
    return truncated + "\n\n[... context truncated due to length ...]"

def generate_ai_answer(question, context="", api_key_override=None, api_provider_override=None, model_override=None):
    """
    Generate an answer to a Scholar question using OpenRouter or OpenAI.
    Optional overrides allow testing a key/provider without persisting it.
    """
    if not REQUESTS_AVAILABLE:
        return None, "requests library not installed. Install with: pip install requests"
    
    config = load_api_config()
    api_provider = api_provider_override or config.get("api_provider", "openrouter")
    
    if api_provider == "openrouter":
        api_key = (api_key_override or config.get("openrouter_api_key", "")).strip()
        model = model_override or config.get("model", "openrouter/auto")
        if not model or model == "zai-ai/glm-4.7":
            model = "openrouter/auto"
        api_url = "https://openrouter.ai/api/v1/chat/completions"
    else:
        # Fallback to OpenAI
        api_key = (api_key_override or config.get("openai_api_key", "")).strip()
        model = model_override or config.get("model", "gpt-4o-mini")
        api_url = "https://api.openai.com/v1/chat/completions"
    
    if not api_key:
        return None, "API key not configured"
    
    try:
        # Build context from Scholar system
        system_prompt = """You are a system design consultant helping answer architectural and design questions about a PT Study Tutor system.

Your reasoning should focus on:
1. **Design/Architecture Analysis**: Understand how system components interact (PEIRRO cycle, KWIK encoding, M6 Wrap, etc.)
2. **Trade-off Evaluation**: Weigh pros/cons of different design choices (e.g., storage locations, scheduling approaches, error handling)
3. **Context Synthesis**: Combine understanding of:
   - Current codebase structure and constraints
   - Learning science research evidence
   - Pedagogical best practices
   - Practical implementation trade-offs
4. **Domain Knowledge Application**: Apply learning science principles (spacing, retrieval practice, error typing) to specific implementation decisions

These are DESIGN DECISIONS requiring architectural thinking, not mathematical proofs, multi-step planning, or coding tasks.

Provide concise, actionable answers (2-4 sentences) that:
- Make a clear design recommendation
- Explain the trade-offs considered
- Reference relevant system constraints or research when applicable"""
        
        # Truncate context to avoid API token limits
        safe_context = _truncate_context(context) if context else ""
        
        user_prompt = f"""Question: {question}

{safe_context if safe_context else "Answer based on the PEIRRO/KWIK system design and learning science principles."}

Provide a clear, concise answer (2-4 sentences) that addresses the question directly."""
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        # Add OpenRouter-specific headers
        if api_provider == "openrouter":
            headers["HTTP-Referer"] = "https://github.com/your-repo"  # Optional but recommended
            headers["X-Title"] = "PT Study Scholar"  # Optional identifier
        
        response = requests.post(
            api_url,
            headers=headers,
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 300,
            },
            timeout=30,
        )
        
        if response.status_code == 200:
            result = response.json()
            answer = result["choices"][0]["message"]["content"].strip()
            return answer, None
        else:
            error_msg = response.json().get("error", {}).get("message", "Unknown error")
            return None, f"API error: {error_msg}"
            
    except requests.exceptions.Timeout:
        return None, "Request timed out"
    except requests.exceptions.RequestException as e:
        return None, f"Network error: {str(e)}"
    except Exception as e:
        return None, f"Error: {str(e)}"

def build_scholar_stats():
    """
    Build Scholar status and progress data for dashboard.
    Reads from scholar/outputs/STATUS.md and related files.
    """
    # Clean up stale PID files whenever Scholar tab loads
    try:
        cleanup_stale_pids()
    except Exception:
        pass
    
    # Assuming this file is brain/dashboard/scholar.py
    # Repo root is ../../
    repo_root = Path(__file__).parent.parent.parent.resolve()
    scholar_outputs = repo_root / "scholar" / "outputs"
    
    result = {
        "status": "unknown",
        "last_updated": None,
        "safe_mode": False,
        "questions": [],
        "coverage": {
            "complete": 0,
            "in_progress": 0,
            "not_started": 0,
            "items": []
        },
        "next_steps": [],
        "latest_artifacts": {},
        "latest_run": None,
    }
    
    # Read STATUS.md
    status_file = scholar_outputs / "STATUS.md"
    if status_file.exists():
        try:
            status_content = status_file.read_text(encoding="utf-8")
            lines = status_content.split("\n")
            
            # Extract updated time
            for line in lines:
                if line.startswith("Updated:"):
                    result["last_updated"] = line.replace("Updated:", "").strip()
                    break
            
            # Extract coverage counts
            for line in lines:
                if "Coverage counts:" in line:
                    parts = line.split("Complete=")
                    if len(parts) > 1:
                        counts_part = parts[1]
                        for part in counts_part.split("|"):
                            if "Complete=" in part:
                                result["coverage"]["complete"] = int(part.split("=")[1].strip())
                            elif "In progress=" in part:
                                result["coverage"]["in_progress"] = int(part.split("=")[1].strip())
                            elif "Not started=" in part:
                                result["coverage"]["not_started"] = int(part.split("=")[1].strip())
                    break
            
            # Extract "What to do now" section
            in_next_steps = False
            for line in lines:
                if "## What to do now" in line:
                    in_next_steps = True
                    continue
                if in_next_steps and line.strip().startswith("##"):
                    break
                if in_next_steps and line.strip() and line.strip().startswith(("1)", "2)", "3)")):
                    result["next_steps"].append(line.strip())
            
            # Extract safe_mode
            for line in lines:
                if "safe_mode:" in line.lower():
                    mode = line.split(":")[-1].strip().lower()
                    result["safe_mode"] = mode == "true"
                    break
        except Exception as e:
            result["error"] = f"Failed to parse STATUS.md: {e}"
    
    # Read questions_needed file - check recent files (up to last 3) to find unanswered questions
    orchestrator_runs = scholar_outputs / "orchestrator_runs"
    if orchestrator_runs.exists():
        question_files = sorted(
            orchestrator_runs.glob("questions_needed_*.md"), 
            key=lambda p: p.stat().st_mtime, 
            reverse=True
        )
        for q_file in question_files[:5]:
            try:
                try:
                    file_content = q_file.read_text(encoding="utf-8-sig").strip()
                except:
                    file_content = q_file.read_text(encoding="utf-8").strip()
                
                if not file_content or file_content == "(none)":
                    continue
                
                found_unanswered = False
                
                if "Q:" in file_content:
                    current_question = None
                    question_answered = False
                    lines_list = file_content.split("\n")
                    
                    for i, line in enumerate(lines_list):
                        line = line.strip()
                        if line.startswith("Q:"):
                            if current_question and not question_answered:
                                result["questions"].append(current_question)
                                found_unanswered = True
                            
                            question_text = line.replace("Q:", "").strip()
                            current_question = question_text
                            question_answered = False
                            
                            if i + 1 < len(lines_list):
                                next_line = lines_list[i + 1].strip()
                                if next_line.startswith("A:"):
                                    answer_text = next_line.replace("A:", "").strip()
                                    if answer_text and answer_text.lower() not in ["(pending)", "(none)", ""]:
                                        question_answered = True
                        elif line.startswith("A:"):
                            continue
                        elif current_question and line and not question_answered:
                            current_question += " " + line
                    
                    if current_question and not question_answered:
                        result["questions"].append(current_question)
                        found_unanswered = True
                else:
                    for line in file_content.split("\n"):
                        line = line.strip()
                        if line and not line.startswith("#") and line != "(none)" and not line.startswith("A:"):
                            clean_line = re.sub(r"^[-*•]\s*", "", line)
                            clean_line = re.sub(r"^\d+\.\s*", "", clean_line)
                            if clean_line and not clean_line.startswith("Q:"):
                                result["questions"].append(clean_line)
                                found_unanswered = True
                
                if found_unanswered:
                    result["questions_file"] = q_file.name
                    break
                    
            except Exception as e:
                continue
    
    # Read coverage checklist
    coverage_files = sorted((scholar_outputs / "system_map").glob("coverage_checklist_*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if coverage_files:
        try:
            coverage_content = coverage_files[0].read_text(encoding="utf-8")
            in_table = False
            for line in coverage_content.split("\n"):
                if "| Grouping |" in line:
                    in_table = True
                    continue
                if in_table and line.startswith("|") and "---" not in line:
                    parts = [p.strip() for p in line.split("|")[1:-1]]
                    if len(parts) >= 3:
                        result["coverage"]["items"].append({
                            "grouping": parts[0],
                            "module": parts[1],
                            "status": parts[2],
                            "dossier": parts[3] if len(parts) > 3 else "",
                        })
                if in_table and line.strip().startswith("##"):
                    break
        except Exception as e:
            pass
    
    # Read latest unattended_final
    final_files = sorted(orchestrator_runs.glob("unattended_final_*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if final_files:
        try:
            result["latest_run"] = {
                "file": final_files[0].name,
                "content": final_files[0].read_text(encoding="utf-8")[:500],
                "modified": datetime.fromtimestamp(final_files[0].stat().st_mtime).isoformat(),
            }
        except Exception as e:
            pass
    
    # Read artifact counts from STATUS.md
    try:
        if status_file.exists():
            status_content = status_file.read_text(encoding="utf-8")
            in_counts = False
            for line in status_content.split("\n"):
                if "## Counts Snapshot" in line:
                    in_counts = True
                    continue
                if in_counts and "Folder |" in line:
                    continue
                if in_counts and line.startswith("|"):
                    parts = [p.strip() for p in line.split("|")[1:-1]]
                    if len(parts) >= 3:
                        folder = parts[0]
                        count = parts[1]
                        newest = parts[2] if len(parts) > 2 else ""
                        result["latest_artifacts"][folder] = {
                            "count": count,
                            "newest": newest,
                        }
                if in_counts and line.strip().startswith("##"):
                    break
    except Exception as e:
        pass
    
    result["status"] = "active" if result["last_updated"] else "inactive"
    return result

def run_scholar_orchestrator():
    """
    Trigger a Scholar orchestrator run.
    Returns result dict (not jsonify).
    """
    repo_root = Path(__file__).parent.parent.parent.resolve()
    prompt_file = repo_root / "scholar" / "workflows" / "orchestrator_run_prompt.md"
    run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    run_dir.mkdir(parents=True, exist_ok=True)
    
    # Check for existing unanswered questions and preserve them
    existing_questions_to_preserve = []
    question_files = sorted(
        run_dir.glob("questions_needed_*.md"), 
        key=lambda p: p.stat().st_mtime, 
        reverse=True
    )
    if question_files:
        try:
            latest_questions_content = question_files[0].read_text(encoding="utf-8").strip()
            if "Q:" in latest_questions_content:
                lines = latest_questions_content.split("\n")
                current_q = None
                current_a = None
                for i, line in enumerate(lines):
                    line_stripped = line.strip()
                    if line_stripped.startswith("Q:"):
                        if current_q and (not current_a or current_a.lower() in ["(pending)", "(none)", ""]):
                            existing_questions_to_preserve.append(current_q)
                        current_q = line_stripped.replace("Q:", "").strip()
                        current_a = None
                    elif line_stripped.startswith("A:"):
                        current_a = line_stripped.replace("A:", "").strip()
                        if current_q and current_a and current_a.lower() not in ["(pending)", "(none)", ""]:
                            current_q = None
                            current_a = None
                    elif current_q and line_stripped and not line_stripped.startswith("A:"):
                        current_q += " " + line_stripped
                    elif not line_stripped and current_q and current_a is None:
                        existing_questions_to_preserve.append(current_q)
                        current_q = None
                if current_q and (not current_a or current_a.lower() in ["(pending)", "(none)", ""]):
                    existing_questions_to_preserve.append(current_q)
            elif latest_questions_content and latest_questions_content != "(none)":
                for line in latest_questions_content.split("\n"):
                    line = line.strip()
                    if line and not line.startswith("#") and line != "(none)" and not line.startswith("A:"):
                        clean_line = re.sub(r"^[-*•]\s*", "", line)
                        clean_line = re.sub(r"^\d+\.\s*", "", clean_line)
                        if clean_line and not clean_line.startswith("Q:"):
                            existing_questions_to_preserve.append(clean_line)
        except Exception as e:
            pass
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    log_path = run_dir / f"unattended_{timestamp}.log"
    final_path = run_dir / f"unattended_final_{timestamp}.md"
    questions_path = run_dir / f"questions_needed_{timestamp}.md"
    pid_path = run_dir / f"unattended_{timestamp}.pid"
    
    preserved_count = len(existing_questions_to_preserve)
    preserved_questions_file = None
    if existing_questions_to_preserve:
        preserved_questions_file = run_dir / f"_preserved_questions_{timestamp}.txt"
        preserved_questions_file.write_text(
            "\n".join([f"- {q}" for q in existing_questions_to_preserve]) + "\n",
            encoding="utf-8"
        )
    
    # Check for Codex CLI availability - use full path from npm global
    codex_cmd = None
    npm_path = Path(os.environ.get("APPDATA", "")) / "npm" / "codex.cmd"
    
    if npm_path.exists():
        codex_cmd = str(npm_path)
    else:
        # Try to find codex in PATH
        try:
            result = subprocess.run(
                ["where.exe", "codex"],
                capture_output=True,
                timeout=5,
                text=True,
            )
            if result.returncode == 0 and result.stdout.strip():
                codex_cmd = result.stdout.strip().split('\n')[0]
        except:
            pass
    
    if not codex_cmd:
        # Codex not found
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(f"Scholar Run Requested: {datetime.now().isoformat()}\n")
            f.write(f"Run ID: {timestamp}\n\n")
            f.write("NOTE: 'codex' command not found.\n")
            f.write("Install with: npm install -g @openai/codex\n")
            f.write("Or Scholar can be executed via Cursor IDE's AI assistant.\n\n")
            if preserved_count > 0:
                f.write(f"Preserved {preserved_count} unanswered question(s) from previous run.\n")
                f.write(f"Questions saved to: {preserved_questions_file.name if preserved_questions_file else 'N/A'}\n\n")
            f.write("TO EXECUTE SCHOLAR:\n")
            f.write("1. Open this file in Cursor: scholar/workflows/orchestrator_run_prompt.md\n")
            f.write("2. Use Cursor's AI chat to execute the orchestrator workflow\n")
            f.write("3. Or use the batch script: scripts\\run_scholar.bat\n\n")
        
        instructions = f"Scholar execution requested (Run ID: {timestamp})\n\n"
        instructions += "Since 'codex' CLI is not available, Scholar needs to be executed via Cursor IDE.\n\n"
        if preserved_count > 0:
            instructions += f"NOTE: {preserved_count} unanswered question(s) from previous run will be preserved.\n"
        instructions += "TO EXECUTE:\n"
        instructions += "1. In Cursor IDE, open: scholar/workflows/orchestrator_run_prompt.md\n"
        instructions += "2. Copy the entire file content\n"
        instructions += "3. Paste into Cursor AI chat and request execution\n"
        
        final_path.write_text(instructions, encoding="utf-8")
        
        return {
            "ok": True,
            "message": "Scholar run queued (requires manual execution via Cursor)",
            "run_id": timestamp,
            "log_file": str(log_path.relative_to(repo_root)),
            "final_file": str(final_path.relative_to(repo_root)),
            "preserved_questions": preserved_count,
            "requires_manual_execution": True,
        }
    
    if not prompt_file.exists():
        return {"ok": False, "message": f"Prompt file not found: {prompt_file}"}, 404
    
    # Define internal function to run in background
    def _run_scholar_thread():
        try:
            with open(log_path, "w", encoding="utf-8") as log_file:
                log_file.write(f"Scholar Run Started: {datetime.now().isoformat()}\n")
                log_file.write(f"Using Codex: {codex_cmd}\n")
                log_file.write(f"Prompt file: {prompt_file}\n\n")
                log_file.flush()
                
                # Read prompt content to pass via stdin (like the batch script does)
                with open(prompt_file, "r", encoding="utf-8") as prompt:
                    prompt_content = prompt.read()
                
                try:
                    # Use codex exec with stdin (the '-' argument means read from stdin)
                    # This matches the batch script: codex exec ... - < prompt_file
                    process = subprocess.Popen(
                        [
                            codex_cmd, "exec",
                            "--dangerously-bypass-approvals-and-sandbox",
                            "-C", str(repo_root),
                            "--output-last-message", str(final_path),
                            "-"  # Read prompt from stdin
                        ],
                        stdin=subprocess.PIPE,
                        stdout=log_file,
                        stderr=subprocess.STDOUT,
                        cwd=str(repo_root),
                        encoding="utf-8",
                        text=True,
                    )
                    try:
                        pid_path.write_text(str(process.pid), encoding="utf-8")
                        log_file.write(f"\n[dashboard] PID: {process.pid}\n")
                        log_file.flush()
                    except Exception:
                        pass
                    
                    # Write prompt to stdin and close it
                    process.stdin.write(prompt_content)
                    process.stdin.close()
                    
                    process.wait()  # Wait for completion

                    try:
                        if pid_path.exists():
                            pid_path.unlink()
                    except Exception:
                        pass
                    
                    log_file.write(f"\n===== Scholar Run Completed at {datetime.now().isoformat()} =====\n")
                    log_file.write(f"Exit code: {process.returncode}\n")
                except Exception as e:
                    log_file.write(f"\nERROR: {str(e)}\n")
                    final_path.write_text(f"Run failed: {e}", encoding="utf-8")
                    try:
                        if pid_path.exists():
                            pid_path.unlink()
                    except Exception:
                        pass
            
            # Post-run cleanup (preservation)
            # This logic mimics the original script, simplified
            if preserved_questions_file and preserved_questions_file.exists():
                try:
                    preserved = preserved_questions_file.read_text(encoding="utf-8")
                    if questions_path.exists():
                        current = questions_path.read_text(encoding="utf-8")
                        questions_path.write_text(current + "\n\n# Preserved:\n" + preserved, encoding="utf-8")
                    else:
                        questions_path.write_text(preserved, encoding="utf-8")
                    preserved_questions_file.unlink()
                except:
                    pass
            
            # Status update script
            try:
                status_script = repo_root / "scripts" / "update_status.ps1"
                if status_script.exists():
                    subprocess.run(
                        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(status_script)],
                        cwd=str(repo_root),
                        capture_output=True,
                        timeout=30,
                    )
            except:
                pass
                
        except Exception as e:
            # Write error marker to log so status endpoint can detect it
            error_msg = f"\n\n===== SCHOLAR RUN ERROR =====\nError: {str(e)}\nTime: {datetime.now().isoformat()}\n"
            try:
                with open(log_path, 'a', encoding='utf-8') as f:
                    f.write(error_msg)
            except:
                pass
            # Clean up PID file
            try:
                if pid_path.exists():
                    pid_path.unlink()
            except:
                pass

    thread = threading.Thread(target=_run_scholar_thread, daemon=True)
    thread.start()
    
    return {
        "ok": True,
        "message": "Scholar run started",
        "run_id": timestamp,
        "log_file": str(log_path.relative_to(repo_root)),
        "final_file": str(final_path.relative_to(repo_root)),
    }


def generate_weekly_digest(days: int = 7) -> dict:
    """
    Generate a weekly digest aggregating Scholar outputs from the past N days.
    
    Scans scholar/outputs/ subdirectories and extracts key sections:
    - orchestrator_runs/unattended_final_*.md: Completed, Next, Blockers
    - module_dossiers/*_dossier_*.md: Improvement Candidates
    - research_notebook/*.md: Key Findings or first 3 bullets
    - reports/*.md: Executive summaries
    
    Returns dict with:
    - ok: bool
    - digest: str (markdown formatted)
    - period: str (date range)
    - runs_count: int
    """
    repo_root = Path(__file__).parent.parent.parent.resolve()
    scholar_outputs = repo_root / "scholar" / "outputs"
    
    cutoff = datetime.now() - timedelta(days=days)
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = cutoff.strftime("%Y-%m-%d")
    
    # Collectors
    runs_info = []          # (timestamp, completed, next_steps, blockers)
    improvement_candidates = []
    key_findings = []
    report_summaries = []
    pending_questions = []
    topics_to_review = []
    
    def get_recent_files(folder: Path, pattern: str) -> list:
        """Get files matching pattern modified after cutoff."""
        if not folder.exists():
            return []
        files = []
        for f in folder.glob(pattern):
            if f.stat().st_mtime >= cutoff.timestamp():
                files.append(f)
        return sorted(files, key=lambda x: x.stat().st_mtime, reverse=True)
    
    # --- 1. Orchestrator Runs (unattended_final_*.md) ---
    orch_folder = scholar_outputs / "orchestrator_runs"
    for f in get_recent_files(orch_folder, "unattended_final_*.md"):
        try:
            content = f.read_text(encoding="utf-8")
            run_date = f.stem.replace("unattended_final_", "")
            
            completed = []
            next_steps = []
            blockers = []
            
            # Parse Work Completed or Completed section
            in_section = None
            for line in content.split("\n"):
                line_lower = line.lower().strip()
                
                # Detect section headers
                if "work completed" in line_lower or line_lower.startswith("**completed"):
                    in_section = "completed"
                    continue
                elif "next" in line_lower and ("step" in line_lower or "follow" in line_lower):
                    in_section = "next"
                    continue
                elif "blocker" in line_lower or "open question" in line_lower:
                    in_section = "blockers"
                    continue
                elif line.startswith("##") or line.startswith("**") and in_section:
                    in_section = None
                    continue
                
                # Collect items
                if in_section and line.strip().startswith("-"):
                    item = line.strip().lstrip("-").strip()
                    if item:
                        if in_section == "completed":
                            completed.append(item[:100])
                        elif in_section == "next":
                            next_steps.append(item[:100])
                        elif in_section == "blockers":
                            blockers.append(item[:100])
            
            runs_info.append({
                "date": run_date,
                "completed": completed[:5],
                "next": next_steps[:3],
                "blockers": blockers[:3],
            })
        except Exception:
            pass
    
    # --- 2. Module Dossiers (*_dossier_*.md) ---
    dossier_folder = scholar_outputs / "module_dossiers"
    for f in get_recent_files(dossier_folder, "*_dossier_*.md"):
        try:
            content = f.read_text(encoding="utf-8")
            module_name = f.stem.split("_dossier_")[0].replace("_", " ").title()
            
            in_improvement = False
            for line in content.split("\n"):
                if "improvement candidates" in line.lower():
                    in_improvement = True
                    continue
                if in_improvement and line.startswith("##"):
                    break
                if in_improvement and line.strip().startswith("-"):
                    item = line.strip().lstrip("-").strip()
                    if item:
                        improvement_candidates.append(f"[{module_name}] {item[:80]}")
        except Exception:
            pass
    
    # --- 3. Research Notebook (*.md) ---
    research_folder = scholar_outputs / "research_notebook"
    for f in get_recent_files(research_folder, "*.md"):
        try:
            content = f.read_text(encoding="utf-8")
            topic = f.stem.replace("_", " ").title()
            
            # Look for "Key Findings", "Findings Summary", or first bullets
            in_findings = False
            bullets = []
            for line in content.split("\n"):
                if "finding" in line.lower() or "summary" in line.lower():
                    in_findings = True
                    continue
                if in_findings and line.startswith("##"):
                    break
                if line.strip().startswith("-") or line.strip().startswith("*"):
                    item = line.strip().lstrip("-*").strip()
                    if item and len(item) > 10:
                        bullets.append(item[:100])
            
            if bullets:
                key_findings.append({
                    "topic": topic,
                    "findings": bullets[:3],
                })
        except Exception:
            pass
    
    # --- 4. Reports (*.md) ---
    reports_folder = scholar_outputs / "reports"
    for f in get_recent_files(reports_folder, "*.md"):
        try:
            content = f.read_text(encoding="utf-8")
            report_name = f.stem.replace("_", " ").title()
            
            # Look for summary section or first 3 bullets
            in_summary = False
            summary_items = []
            for line in content.split("\n"):
                if "summary" in line.lower() and line.strip().startswith("#"):
                    in_summary = True
                    continue
                if in_summary and line.startswith("##"):
                    break
                if line.strip().startswith("-") or line.strip().startswith("*"):
                    item = line.strip().lstrip("-*").strip()
                    if item:
                        summary_items.append(item[:100])
            
            if summary_items:
                report_summaries.append({
                    "name": report_name,
                    "summary": summary_items[:3],
                })
        except Exception:
            pass
    
    # --- 5. Questions Pending (questions_needed_*.md) ---
    for f in get_recent_files(orch_folder, "questions_needed_*.md"):
        try:
            content = f.read_text(encoding="utf-8").strip()
            if content and content != "(none)":
                for line in content.split("\n"):
                    if line.strip().startswith("Q:"):
                        q = line.replace("Q:", "").strip()
                        if q and q not in pending_questions:
                            pending_questions.append(q[:120])
        except Exception:
            pass
    
    # --- 6. Topics to Review (from friction or gaps) ---
    # Check for friction_alerts or gap_analysis files
    gap_folder = scholar_outputs / "gap_analysis"
    for f in get_recent_files(gap_folder, "*.md"):
        try:
            content = f.read_text(encoding="utf-8")
            for line in content.split("\n"):
                if line.strip().startswith("-") and ("gap" in line.lower() or "review" in line.lower()):
                    item = line.strip().lstrip("-").strip()
                    if item:
                        topics_to_review.append(item[:80])
        except Exception:
            pass
    
    # --- Build Digest ---
    digest_parts = []
    digest_parts.append(f"# Scholar Weekly Digest")
    digest_parts.append(f"**Period:** {start_date} to {end_date}\n")
    
    # Section 1: This Week's Runs
    digest_parts.append("## This Week's Runs")
    if runs_info:
        digest_parts.append(f"- **{len(runs_info)} orchestrator runs** processed")
        for run in runs_info[:3]:
            digest_parts.append(f"- Run {run['date']}: {len(run['completed'])} items completed")
    else:
        digest_parts.append("- No orchestrator runs in this period")
    digest_parts.append("")
    
    # Section 2: Key Findings
    digest_parts.append("## Key Findings")
    if key_findings:
        for finding in key_findings[:5]:
            digest_parts.append(f"**{finding['topic']}:**")
            for bullet in finding['findings'][:2]:
                digest_parts.append(f"  - {bullet}")
    else:
        digest_parts.append("- No new research findings this week")
    digest_parts.append("")
    
    # Section 3: Action Items
    digest_parts.append("## Action Items")
    action_items = []
    # Collect from improvement candidates
    for item in improvement_candidates[:5]:
        action_items.append(item)
    # Collect from run next steps
    for run in runs_info[:2]:
        for step in run.get("next", [])[:2]:
            action_items.append(step)
    
    if action_items:
        for item in action_items[:5]:
            digest_parts.append(f"- {item}")
    else:
        digest_parts.append("- No action items identified")
    digest_parts.append("")
    
    # Section 4: Questions Pending
    digest_parts.append("## Questions Pending")
    if pending_questions:
        for q in pending_questions[:5]:
            digest_parts.append(f"- {q}")
    else:
        digest_parts.append("- No unanswered questions")
    digest_parts.append("")
    
    # Section 5: Topics to Review
    digest_parts.append("## Topics to Review")
    if topics_to_review:
        for topic in topics_to_review[:5]:
            digest_parts.append(f"- {topic}")
    elif report_summaries:
        # Fall back to report summaries if no explicit gaps
        digest_parts.append("Based on recent reports:")
        for report in report_summaries[:3]:
            digest_parts.append(f"- {report['name']}")
    else:
        digest_parts.append("- No specific review topics flagged")
    
    digest_text = "\n".join(digest_parts)
    
    return {
        "ok": True,
        "digest": digest_text,
        "period": f"{start_date} to {end_date}",
        "runs_count": len(runs_info),
    }


def get_latest_insights():
    """
    Get key Scholar insights for dashboard display.
    Returns alerts, proposals, recent findings, and pending question count.
    """
    repo_root = Path(__file__).parent.parent.parent.resolve()
    scholar_outputs = repo_root / "scholar" / "outputs"
    
    result = {
        "alerts": [],
        "proposals": [],
        "recent_findings": [],
        "questions_pending": 0,
    }
    
    # 1. Scan STATUS.md for current state and coverage
    status_file = scholar_outputs / "STATUS.md"
    if status_file.exists():
        try:
            content = status_file.read_text(encoding="utf-8")
            
            # Check for questions_needed non-empty indicator
            if "questions_needed:" in content and "(Current: non-empty)" in content:
                result["alerts"].append({
                    "type": "warning",
                    "message": "Scholar has questions awaiting your input"
                })
            
            # Extract coverage counts for alerts
            for line in content.split("\n"):
                if "Coverage counts:" in line:
                    try:
                        parts = line.split("|")
                        for part in parts:
                            if "Not started=" in part:
                                not_started = int(part.split("=")[1].strip())
                                if not_started > 5:
                                    result["alerts"].append({
                                        "type": "info",
                                        "message": f"Coverage audit: {not_started} modules not yet reviewed"
                                    })
                    except:
                        pass
                    break
        except Exception:
            pass
    
    # 2. Scan promotion_queue for proposals
    promotion_queue = scholar_outputs / "promotion_queue"
    if promotion_queue.exists():
        try:
            proposal_files = list(promotion_queue.glob("*.md"))
            for pf in proposal_files:
                try:
                    name = pf.stem
                    # Parse proposal type from filename
                    if "change_proposal" in name:
                        title = name.replace("change_proposal_", "").replace("_", " ").title()
                        proposal_type = "change"
                    elif "experiment" in name:
                        title = name.replace("experiment_", "").replace("_", " ").title()
                        proposal_type = "experiment"
                    else:
                        title = name.replace("_", " ").title()
                        proposal_type = "other"
                    
                    # Try to extract status from file content
                    status = "draft"
                    try:
                        content = pf.read_text(encoding="utf-8")[:500]
                        if "Status: " in content:
                            for line in content.split("\n"):
                                if line.strip().startswith("- Status:"):
                                    status = line.split(":")[-1].strip().lower()
                                    break
                    except:
                        pass
                    
                    result["proposals"].append({
                        "title": title,
                        "type": proposal_type,
                        "status": status,
                        "file": pf.name
                    })
                except Exception:
                    continue
        except Exception:
            pass
    
    # 3. Count pending questions
    orchestrator_runs = scholar_outputs / "orchestrator_runs"
    if orchestrator_runs.exists():
        try:
            question_files = sorted(
                orchestrator_runs.glob("questions_needed_*.md"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            for qf in question_files[:3]:
                try:
                    content = qf.read_text(encoding="utf-8-sig").strip()
                    if not content or content == "(none)":
                        continue
                    
                    # Count Q: lines without answered A: lines
                    lines = content.split("\n")
                    for i, line in enumerate(lines):
                        if line.strip().startswith("Q:"):
                            # Check if next meaningful line is an answer
                            has_answer = False
                            for j in range(i + 1, min(i + 3, len(lines))):
                                next_line = lines[j].strip()
                                if next_line.startswith("A:"):
                                    answer = next_line.replace("A:", "").strip()
                                    if answer and answer.lower() not in ["(pending)", "(none)", ""]:
                                        has_answer = True
                                    break
                                elif next_line.startswith("Q:"):
                                    break
                            if not has_answer:
                                result["questions_pending"] += 1
                    break  # Only check most recent file with questions
                except Exception:
                    continue
        except Exception:
            pass
    
    # 4. Extract recent findings from latest unattended_final files
    if orchestrator_runs.exists():
        try:
            final_files = sorted(
                orchestrator_runs.glob("unattended_final_*.md"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            for ff in final_files[:3]:
                try:
                    content = ff.read_text(encoding="utf-8")
                    # Skip placeholder files
                    if "TO EXECUTE:" in content or len(content) < 100:
                        continue
                    
                    # Extract first meaningful bullet or sentence
                    lines = content.split("\n")
                    for line in lines:
                        line = line.strip()
                        # Skip headers and empty lines
                        if not line or line.startswith("#") or line.startswith("Scholar execution"):
                            continue
                        # Clean up bullet points
                        if line.startswith("-"):
                            finding = line.lstrip("- ").strip()
                        else:
                            finding = line
                        
                        if len(finding) > 20 and len(finding) < 200:
                            result["recent_findings"].append(finding)
                            if len(result["recent_findings"]) >= 3:
                                break
                    if len(result["recent_findings"]) >= 3:
                        break
                except Exception:
                    continue
        except Exception:
            pass
    
    return result
