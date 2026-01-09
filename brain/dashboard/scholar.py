
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

def generate_ai_answer(question, context=""):
    """
    Generate an answer to a Scholar question using OpenRouter API (GLM 4.7).
    """
    if not REQUESTS_AVAILABLE:
        return None, "requests library not installed. Install with: pip install requests"
    
    config = load_api_config()
    api_provider = config.get("api_provider", "openrouter")
    
    if api_provider == "openrouter":
        api_key = config.get("openrouter_api_key", "").strip()
        model = config.get("model", "zai-ai/glm-4.7")
        api_url = "https://openrouter.ai/api/v1/chat/completions"
    else:
        # Fallback to OpenAI
        api_key = config.get("openai_api_key", "").strip()
        model = config.get("model", "gpt-4o-mini")
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
        
        user_prompt = f"""Question: {question}

{context if context else "Answer based on the PEIRRO/KWIK system design and learning science principles."}

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
    
    preserved_count = len(existing_questions_to_preserve)
    preserved_questions_file = None
    if existing_questions_to_preserve:
        preserved_questions_file = run_dir / f"_preserved_questions_{timestamp}.txt"
        preserved_questions_file.write_text(
            "\n".join([f"- {q}" for q in existing_questions_to_preserve]) + "\n",
            encoding="utf-8"
        )
    
    try:
        result = subprocess.run(
            ["codex", "--version"],
            capture_output=True,
            timeout=5,
            cwd=str(repo_root),
        )
        codex_available = result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        codex_available = False
    
    if not codex_available:
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(f"Scholar Run Requested: {datetime.now().isoformat()}\n")
            f.write(f"Run ID: {timestamp}\n\n")
            f.write("NOTE: 'codex' command not found in PATH.\n")
            f.write("Scholar can still be executed via Cursor IDE's AI assistant.\n\n")
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
                with open(prompt_file, "r", encoding="utf-8") as prompt:
                    prompt_content = prompt.read()
                
                try:
                    process = subprocess.Popen(
                        [
                            "codex", "--search", "exec",
                            "--cd", str(repo_root),
                            "--dangerously-bypass-approvals-and-sandbox",
                            "--output-last-message", str(final_path),
                            "-"
                        ],
                        stdin=subprocess.PIPE,
                        stdout=log_file,
                        stderr=subprocess.STDOUT,
                        cwd=str(repo_root),
                        encoding="utf-8",
                        text=True,
                    )
                    process.communicate(input=prompt_content)
                    
                    log_file.write(f"\n===== Scholar Run Completed at {datetime.now().isoformat()} =====\n")
                except Exception as e:
                    log_file.write(f"\nERROR: {str(e)}\n")
                    final_path.write_text(f"Run failed: {e}", encoding="utf-8")
            
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
