
import os
import re
import json
import sys
import time
import threading
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, List, Any
from dashboard.utils import load_api_config

# Check if requests library is available
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# Maximum context size to send to API (approx 30k tokens = ~120k chars)
MAX_CONTEXT_CHARS = 100000


# -----------------------------------------------------------------------------
# Codex CLI Integration (same as tutor_engine.py)
# -----------------------------------------------------------------------------

def find_codex_cli() -> Optional[str]:
    """Find Codex CLI executable path."""
    # Check npm global install location first (Windows)
    npm_path = Path(os.environ.get("APPDATA", "")) / "npm" / "codex.cmd"
    if npm_path.exists():
        return str(npm_path)
    
    # Try to find in PATH
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


def call_codex(prompt: str, system_prompt: str, timeout: int = 90) -> Tuple[Optional[str], Optional[str]]:
    """
    Call Codex CLI with the given prompt (matches run_scholar.bat approach).
    
    Returns: (response_text, error_message)
    """
    codex_cmd = find_codex_cli()
    if not codex_cmd:
        return None, "Codex CLI not found. Install with: npm install -g @openai/codex"
    
    repo_root = Path(__file__).parent.parent.parent.resolve()
    
    # Build the full prompt (similar to tutor_engine.py)
    full_prompt = f"""System Instructions:
{system_prompt}

---

{prompt}

---

Respond with markdown formatting. Be concise and actionable.
"""
    
    # Create a temp file for output (like --output-last-message in batch script)
    import tempfile
    output_file = None
    
    try:
        # Create temp file for output
        fd, output_path = tempfile.mkstemp(suffix=".md", prefix="codex_digest_")
        os.close(fd)
        output_file = Path(output_path)
        
        # Run codex exec with stdin and output file (matches batch script pattern)
        # codex exec --cd REPO --dangerously-bypass-approvals-and-sandbox --output-last-message OUT - < prompt
        process = subprocess.Popen(
            [
                codex_cmd, "exec",
                "--cd", str(repo_root),
                "--dangerously-bypass-approvals-and-sandbox",
                "--output-last-message", str(output_file),
                "-"  # Read from stdin
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(repo_root),
            encoding="utf-8",
            text=True,
        )
        
        # Write prompt to stdin
        stdout, stderr = process.communicate(input=full_prompt, timeout=timeout)
        
        if process.returncode == 0:
            # Read the output from the file
            if output_file.exists():
                response = output_file.read_text(encoding="utf-8").strip()
                return response, None
            else:
                # Fall back to stdout if file wasn't created
                return stdout.strip() if stdout else "No response generated", None
        else:
            error = stderr.strip() if stderr else f"Codex exited with code {process.returncode}"
            return None, error
            
    except subprocess.TimeoutExpired:
        if process:
            process.kill()
        return None, "Codex request timed out (90s)"
    except Exception as e:
        return None, f"Codex error: {str(e)}"
    finally:
        # Clean up temp file
        if output_file and output_file.exists():
            try:
                output_file.unlink()
            except:
                pass


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


def load_audit_manifest() -> Dict[str, Any]:
    """
    Load scholar/inputs/audit_manifest.json if available.
    Returns empty dict on failure.
    """
    repo_root = Path(__file__).parent.parent.parent.resolve()
    manifest_path = repo_root / "scholar" / "inputs" / "audit_manifest.json"
    if not manifest_path.exists():
        return {}
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def build_telemetry_snapshot(run_id: str, manifest: Dict[str, Any], log_file=None) -> Optional[Path]:
    """
    Run scholar/telemetry_snapshot.py to create a telemetry snapshot file.
    Returns the output path if created, else None.
    """
    repo_root = Path(__file__).parent.parent.parent.resolve()
    snapshot_cfg = (manifest or {}).get("telemetry_snapshot", {}) if manifest else {}
    enabled = snapshot_cfg.get("enabled", True)
    days_recent = int(snapshot_cfg.get("days_recent", 30)) if snapshot_cfg else 30
    if not enabled:
        return None


def extract_questions_from_text(text: str) -> List[str]:
    """
    Extract questions from a markdown section headed by 'Questions Needed'.
    Falls back to any lines starting with 'Q:' if no section is found.
    """
    if not text:
        return []
    questions: List[str] = []
    in_section = False
    for line in text.splitlines():
        line_stripped = line.strip()
        if line_stripped.lower().startswith("## questions needed"):
            in_section = True
            continue
        if in_section:
            if line_stripped.startswith("## "):
                break
            if line_stripped.startswith("-"):
                q = line_stripped.lstrip("-").strip()
                if q:
                    questions.append(q)
    if questions:
        return questions
    for line in text.splitlines():
        line_stripped = line.strip()
        if line_stripped.startswith("Q:"):
            q = line_stripped.replace("Q:", "").strip()
            if q:
                questions.append(q)
    return questions


def collect_unanswered_questions(run_dir: Path) -> List[str]:
    """
    Collect unanswered questions from the most recent questions_needed_*.md.
    """
    questions: List[str] = []
    question_files = sorted(
        run_dir.glob("questions_needed_*.md"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not question_files:
        return questions
    try:
        latest = question_files[0].read_text(encoding="utf-8").strip()
    except Exception:
        return questions

    if not latest or latest == "(none)":
        return questions

    if "Q:" in latest:
        lines = latest.split("\n")
        current_q = None
        current_a = None
        for line in lines:
            line_stripped = line.strip()
            if line_stripped.startswith("Q:"):
                if current_q and (not current_a or current_a.lower() in ["(pending)", "(none)", ""]):
                    questions.append(current_q)
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
                questions.append(current_q)
                current_q = None
        if current_q and (not current_a or current_a.lower() in ["(pending)", "(none)", ""]):
            questions.append(current_q)
    else:
        for line in latest.split("\n"):
            line = line.strip()
            if line and not line.startswith("#") and line != "(none)" and not line.startswith("A:"):
                clean_line = re.sub(r"^[-*]\s*", "", line)
                clean_line = re.sub(r"^\d+\.\s*", "", clean_line)
                if clean_line and not clean_line.startswith("Q:"):
                    questions.append(clean_line)

    return questions

    script_path = repo_root / "scholar" / "telemetry_snapshot.py"
    if not script_path.exists():
        if log_file:
            log_file.write("[WARN] telemetry_snapshot.py not found; skipping.\n")
        return None

    try:
        args = [sys.executable, str(script_path), "--run-id", run_id, "--days", str(days_recent)]
        proc = subprocess.run(args, capture_output=True, text=True, cwd=str(repo_root), timeout=60)
        if log_file:
            if proc.stdout:
                log_file.write(proc.stdout.strip() + "\n")
            if proc.stderr:
                log_file.write(proc.stderr.strip() + "\n")
        out_path = repo_root / "scholar" / "outputs" / "telemetry" / f"telemetry_snapshot_{run_id}.md"
        return out_path if out_path.exists() else None
    except Exception as exc:
        if log_file:
            log_file.write(f"[WARN] telemetry snapshot failed: {exc}\n")
        return None

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

    manifest = load_audit_manifest()
    multi_agent_cfg = (manifest or {}).get("multi_agent", {}) if manifest else {}
    multi_agent_enabled = bool(multi_agent_cfg.get("enabled", False))
    multi_agent_max = int(multi_agent_cfg.get("max_concurrency", 4)) if multi_agent_cfg else 4

    result = {
        "status": "unknown",
        "last_updated": None,
        "safe_mode": False,
        "multi_agent_enabled": multi_agent_enabled,
        "multi_agent_max_concurrency": multi_agent_max,
        "questions": [],
        "answered_questions": [],
        "proposals": [],
        "proposal_counts": {
            "pending": 0,
            "approved": 0,
            "rejected": 0,
        },
        "coverage": {
            "complete": 0,
            "in_progress": 0,
            "not_started": 0,
            "stale": 0,
            "items": []
        },
        "research_topics": [],
        "gaps": [],
        "improvements": [],
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
            
            # NOTE: Coverage counts are now calculated from parsing the actual checklist items
            # (see below), not from the potentially stale STATUS.md snapshot
            
            # Extract "What to do now" section - parse into structured actions
            in_next_steps = False
            for line in lines:
                if "## What to do now" in line:
                    in_next_steps = True
                    continue
                if in_next_steps and line.strip().startswith("##"):
                    break
                if in_next_steps and line.strip() and line.strip().startswith(("1)", "2)", "3)")):
                    step_text = line.strip()
                    # Parse into structured action
                    step_lower = step_text.lower()
                    action = None
                    action_label = None
                    if "unattended_final" in step_lower or "open the latest" in step_lower:
                        action = "open_final"
                        action_label = "Open Latest Run"
                    elif "questions_needed" in step_lower or "answer" in step_lower:
                        action = "answer_questions"
                        action_label = "Answer Questions"
                    elif "run scholar" in step_lower or "start run" in step_lower:
                        action = "start_run"
                        action_label = "Start Run"
                    elif "review" in step_lower and "proposal" in step_lower:
                        action = "review_proposals"
                        action_label = "Review Proposals"
                    
                    result["next_steps"].append({
                        "text": step_text,
                        "action": action,
                        "action_label": action_label
                    })
            
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
                    current_answer = None
                    question_answered = False
                    lines_list = file_content.split("\n")
                    
                    for i, line in enumerate(lines_list):
                        line = line.strip()
                        if line.startswith("Q:"):
                            # Save previous question
                            if current_question:
                                if question_answered and current_answer:
                                    result["answered_questions"].append({
                                        "question": current_question,
                                        "answer": current_answer
                                    })
                                elif not question_answered:
                                    result["questions"].append(current_question)
                                    found_unanswered = True
                            
                            question_text = line.replace("Q:", "").strip()
                            current_question = question_text
                            current_answer = None
                            question_answered = False
                            
                            if i + 1 < len(lines_list):
                                next_line = lines_list[i + 1].strip()
                                if next_line.startswith("A:"):
                                    answer_text = next_line.replace("A:", "").strip()
                                    if answer_text and answer_text.lower() not in ["(pending)", "(none)", ""]:
                                        question_answered = True
                                        current_answer = answer_text
                        elif line.startswith("A:"):
                            continue
                        elif current_question and line and not question_answered:
                            current_question += " " + line
                    
                    # Save last question
                    if current_question:
                        if question_answered and current_answer:
                            result["answered_questions"].append({
                                "question": current_question,
                                "answer": current_answer
                            })
                        elif not question_answered:
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
                        status_text = parts[2].lower()
                        result["coverage"]["items"].append({
                            "grouping": parts[0],
                            "module": parts[1],
                            "status": parts[2],
                            "dossier": parts[3] if len(parts) > 3 else "",
                        })
                        # Count status from parsed items
                        if "[x]" in status_text or "complete" in status_text:
                            result["coverage"]["complete"] += 1
                        elif "[/]" in status_text or "progress" in status_text:
                            result["coverage"]["in_progress"] += 1
                        else:
                            result["coverage"]["not_started"] += 1
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
    
    # Scan promotion_queue for proposals
    promotion_queue = scholar_outputs / "promotion_queue"
    pending_count = 0
    if promotion_queue.exists():
        try:
            proposal_files = list(promotion_queue.glob("*.md"))
            pending_count = len(proposal_files)
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

    # Track approved/rejected proposals (counts only)
    proposals_root = scholar_outputs / "proposals"
    approved_dir = proposals_root / "approved"
    rejected_dir = proposals_root / "rejected"
    approved_count = len(list(approved_dir.glob("*.md"))) if approved_dir.exists() else 0
    rejected_count = len(list(rejected_dir.glob("*.md"))) if rejected_dir.exists() else 0
    result["proposal_counts"] = {
        "pending": pending_count,
        "approved": approved_count,
        "rejected": rejected_count,
    }
    
    # Scan research_notebook for active research topics
    research_notebook = scholar_outputs / "research_notebook"
    if research_notebook.exists():
        try:
            research_files = sorted(research_notebook.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
            for rf in research_files[:5]:
                try:
                    name = rf.stem.replace("_", " ").title()
                    # Clean up common patterns
                    name = name.replace("Research ", "").replace(" Research", "")
                    days_ago = (datetime.now() - datetime.fromtimestamp(rf.stat().st_mtime)).days
                    result["research_topics"].append({
                        "name": name,
                        "file": rf.name,
                        "days_ago": days_ago
                    })
                except Exception:
                    continue
        except Exception:
            pass
    
    # Scan gap_analysis for identified gaps
    gap_analysis = scholar_outputs / "gap_analysis"
    if gap_analysis.exists():
        try:
            gap_files = sorted(gap_analysis.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
            for gf in gap_files[:3]:
                try:
                    content = gf.read_text(encoding="utf-8")
                    # Extract gap items (lines starting with - that mention gap, missing, need, etc.)
                    for line in content.split("\n"):
                        line_clean = line.strip()
                        if line_clean.startswith("-") and len(line_clean) > 10:
                            lower = line_clean.lower()
                            if any(kw in lower for kw in ["gap", "missing", "need", "lack", "incomplete", "todo"]):
                                gap_text = line_clean.lstrip("-").strip()[:100]
                                if gap_text and gap_text not in [g["text"] for g in result["gaps"]]:
                                    result["gaps"].append({"text": gap_text, "file": gf.name})
                                if len(result["gaps"]) >= 5:
                                    break
                    if len(result["gaps"]) >= 5:
                        break
                except Exception:
                    continue
        except Exception:
            pass
    
    # Scan module_dossiers for improvement candidates
    module_dossiers = scholar_outputs / "module_dossiers"
    if module_dossiers.exists():
        try:
            dossier_files = sorted(module_dossiers.glob("*_dossier_*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
            for df in dossier_files[:5]:
                try:
                    content = df.read_text(encoding="utf-8")
                    in_improvement = False
                    for line in content.split("\n"):
                        if "improvement" in line.lower() and line.strip().startswith("#"):
                            in_improvement = True
                            continue
                        if in_improvement and line.strip().startswith("#"):
                            break
                        if in_improvement and line.strip().startswith("-"):
                            item = line.strip().lstrip("-").strip()[:100]
                            if item and len(item) > 10:
                                module_name = df.stem.split("_dossier_")[0].replace("_", " ").title()
                                result["improvements"].append({
                                    "text": item,
                                    "module": module_name
                                })
                                if len(result["improvements"]) >= 5:
                                    break
                    if len(result["improvements"]) >= 5:
                        break
                except Exception:
                    continue
        except Exception:
            pass
    
    result["status"] = "active" if result["last_updated"] else "inactive"
    return result


def _read_text_safe(path: Path, limit: int = 20000) -> str:
    if not path or not path.exists():
        return ""
    try:
        content = path.read_text(encoding="utf-8")
    except Exception:
        content = path.read_text(encoding="utf-8", errors="replace")
    if len(content) > limit:
        return content[:limit] + "\n\n[... truncated ...]"
    return content


def _get_latest_file(folder: Path, pattern: str) -> Optional[Path]:
    if not folder.exists():
        return None
    files = sorted(folder.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def _is_questions_nonempty(path: Path) -> bool:
    if not path or not path.exists():
        return False
    try:
        content = path.read_text(encoding="utf-8").strip()
    except Exception:
        content = path.read_text(encoding="utf-8", errors="replace").strip()
    return bool(content and content != "(none)")


def _recent_files(folder: Path, pattern: str, since_ts: float) -> List[Path]:
    if not folder.exists():
        return []
    files = []
    for f in folder.glob(pattern):
        try:
            if f.stat().st_mtime >= since_ts:
                files.append(f)
        except Exception:
            continue
    return sorted(files, key=lambda p: p.stat().st_mtime, reverse=True)


def _extract_section_bullets(content: str, headers: List[str]) -> List[str]:
    if not content:
        return []
    bullets = []
    in_section = False
    for line in content.splitlines():
        stripped = line.strip()
        if not in_section:
            for header in headers:
                if header.lower() in stripped.lower():
                    in_section = True
                    break
            if in_section:
                continue
        else:
            if not stripped:
                continue
            if stripped.startswith("#") or stripped.startswith("---"):
                break
            if stripped.startswith("-"):
                bullets.append(stripped.lstrip("-").strip())
            elif stripped.startswith("⚡") or stripped.startswith("⚠"):
                bullets.append(stripped.lstrip("⚡⚠").strip())
    return bullets


def _ensure_plan_update(run_id: str, repo_root: Path, run_dir: Path, final_path: Path) -> Optional[Path]:
    plan_updates = repo_root / "scholar" / "outputs" / "plan_updates"
    plan_updates.mkdir(parents=True, exist_ok=True)
    try:
        run_start = datetime.strptime(run_id, "%Y-%m-%d_%H%M%S")
    except Exception:
        run_start = datetime.now()
    recent = _recent_files(plan_updates, "*.md", run_start.timestamp())
    if recent:
        return recent[0]

    content = _read_text_safe(final_path, limit=20000)
    actions = _extract_section_bullets(content, ["Action Items", "Next Steps"])
    warnings = _extract_section_bullets(content, ["Warnings", "Blockers"])

    plan_path = plan_updates / f"plan_update_{run_id}.md"
    lines = [
        f"# Plan Update Draft - {run_id}",
        "",
        f"Source Run: {final_path.name}",
        f"Created: {datetime.now().isoformat()}",
        "",
        "## Priority Actions (from run)",
    ]
    if actions:
        lines.extend([f"- {item}" for item in actions])
    else:
        lines.append("- (none found)")
    lines.extend([
        "",
        "## System Health Notes (from run)",
    ])
    if warnings:
        lines.extend([f"- {item}" for item in warnings])
    else:
        lines.append("- (none found)")
    lines.extend([
        "",
        "## Improvement Questions",
        "- What single change would most improve the Tutor loop next run?",
        "- What bottleneck is causing the most friction in sessions?",
        "- Which module has the weakest evidence coverage?",
        "",
        "## Plan Targets",
        "- `sop/MASTER_PLAN_PT_STUDY.md`",
        "- `sop/gpt-knowledge/M0-planning.md`",
        "",
        "## Draft Plan Edits (human-in-the-loop)",
        "- (fill in concrete edits to plan files, then apply manually)",
        "",
    ])
    plan_path.write_text("\n".join(lines), encoding="utf-8")
    return plan_path


def _write_verification_report(run_id: str, repo_root: Path, run_dir: Path, questions_path: Path) -> Optional[Path]:
    try:
        run_start = datetime.strptime(run_id, "%Y-%m-%d_%H%M%S")
    except Exception:
        run_start = datetime.now()
    since_ts = run_start.timestamp()

    plan_updates = repo_root / "scholar" / "outputs" / "plan_updates"
    research_notebook = repo_root / "scholar" / "outputs" / "research_notebook"
    promotion_queue = repo_root / "scholar" / "outputs" / "promotion_queue"
    proposals_root = repo_root / "scholar" / "outputs" / "proposals"

    plan_updates_recent = _recent_files(plan_updates, "*.md", since_ts)
    research_recent = _recent_files(research_notebook, "*.md", since_ts)
    proposals_recent = _recent_files(promotion_queue, "*.md", since_ts)
    proposals_recent += _recent_files(proposals_root, "*.md", since_ts)
    proposals_recent += _recent_files(proposals_root / "approved", "*.md", since_ts)
    proposals_recent += _recent_files(proposals_root / "rejected", "*.md", since_ts)

    questions_required = _is_questions_nonempty(questions_path)
    answered_recent = []
    if questions_required:
        answered_recent = _recent_files(run_dir, f"questions_answered_{run_id}*.md", since_ts)
        if not answered_recent:
            answered_recent = _recent_files(run_dir, "questions_answered_*.md", since_ts)

    report_lines = [
        f"# Verification Report - {run_id}",
        "",
        f"Run ID: {run_id}",
        f"Checked: {datetime.now().isoformat()}",
        "",
        "## Required Artifacts",
        f"- plan_update: {'OK' if plan_updates_recent else 'MISSING'}",
        f"- questions_answered: {'OK' if (not questions_required or answered_recent) else 'MISSING'}",
        f"- research_notes: {'OK' if (not questions_required or research_recent) else 'MISSING'}",
        f"- proposals_drafted: {'OK' if proposals_recent else 'MISSING'}",
        "",
        "## Details",
        f"- questions_required: {questions_required}",
        f"- plan_updates_recent: {len(plan_updates_recent)}",
        f"- questions_answered_recent: {len(answered_recent)}",
        f"- research_notes_recent: {len(research_recent)}",
        f"- proposals_recent: {len(proposals_recent)}",
    ]

    verification_path = run_dir / f"verification_report_{run_id}.md"
    verification_path.write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    return verification_path


def _compose_agent_prompt(template_path: Path, header_lines: List[str], context_blocks: List[str]) -> str:
    try:
        template = template_path.read_text(encoding="utf-8")
    except Exception:
        template = template_path.read_text(encoding="utf-8", errors="replace")
    parts = []
    if header_lines:
        parts.append("\n".join(header_lines))
    parts.append("\n---\n")
    parts.append(template)
    if context_blocks:
        parts.append("\n---\n")
        parts.append("\n\n".join(context_blocks))
    full = "\n".join(parts)
    return _truncate_context(full)


def run_scholar_orchestrator_multi(manifest: Dict[str, Any]) -> Dict[str, Any]:
    """
    Trigger a multi-agent Scholar orchestrator run (supervisor + specialists).
    Returns result dict (not jsonify).
    """
    repo_root = Path(__file__).parent.parent.parent.resolve()
    run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    run_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    log_path = run_dir / f"unattended_{timestamp}.log"
    final_path = run_dir / f"unattended_final_{timestamp}.md"
    questions_path = run_dir / f"questions_needed_{timestamp}.md"
    running_marker = run_dir / f"unattended_{timestamp}.running"

    preserved_questions = collect_unanswered_questions(run_dir)
    preserved_count = len(preserved_questions)
    resolved_questions_file = _get_latest_file(run_dir, "questions_resolved_*.md")
    resolved_questions_block = ""
    if resolved_questions_file:
        resolved_text = _read_text_safe(resolved_questions_file, limit=8000)
        if resolved_text:
            resolved_questions_block = (
                "## Resolved Questions (latest)\n"
                + f"Source: {resolved_questions_file.name}\n\n"
                + resolved_text
            )

    codex_cmd = find_codex_cli()
    if not codex_cmd:
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(f"Scholar Multi-Agent Run Requested: {datetime.now().isoformat()}\n")
            f.write(f"Run ID: {timestamp}\n\n")
            f.write("NOTE: 'codex' command not found.\n")
            f.write("Install with: npm install -g @openai/codex\n")
            f.write("Fallback: run scripts\\run_scholar.bat\n")
        final_path.write_text(
            "Scholar run queued, but Codex CLI not available. Use scripts\\run_scholar.bat.\n",
            encoding="utf-8",
        )
        return {
            "ok": True,
            "message": "Scholar run queued (requires Codex CLI)",
            "run_id": timestamp,
            "log_file": str(log_path.relative_to(repo_root)),
            "final_file": str(final_path.relative_to(repo_root)),
            "preserved_questions": preserved_count,
            "requires_manual_execution": True,
        }

    # Agent templates
    agent_templates = {
        "telemetry": repo_root / "scholar" / "workflows" / "agents" / "telemetry_audit.md",
        "sop": repo_root / "scholar" / "workflows" / "agents" / "sop_audit.md",
        "pedagogy": repo_root / "scholar" / "workflows" / "agents" / "pedagogy_questioner.md",
        "research": repo_root / "scholar" / "workflows" / "agents" / "research_scout.md",
        "supervisor": repo_root / "scholar" / "workflows" / "agents" / "supervisor_synthesis.md",
    }

    for key, path in agent_templates.items():
        if not path.exists():
            return {"ok": False, "message": f"Agent template missing: {path}"}

    safe_mode = bool((manifest or {}).get("safe_mode", False))
    max_conc = int((manifest or {}).get("multi_agent", {}).get("max_concurrency", 4))
    max_conc = max(1, min(max_conc, 6))

    def _run_multi_agent_thread():
        running_marker.write_text("running", encoding="utf-8")
        try:
            with open(log_path, "w", encoding="utf-8") as log_file:
                log_file.write(f"Scholar Multi-Agent Run Started: {datetime.now().isoformat()}\n")
                log_file.write(f"Run ID: {timestamp}\n")
                log_file.write(f"Safe mode: {safe_mode}\n")
                log_file.write(f"Max concurrency: {max_conc}\n\n")

                telemetry_path = build_telemetry_snapshot(timestamp, manifest, log_file=log_file)
                telemetry_content = _read_text_safe(telemetry_path, limit=24000) if telemetry_path else ""

                sop_allowlist = (manifest or {}).get("tutor_paths", [])
                sop_list = "\n".join([f"- {p}" for p in sop_allowlist]) if sop_allowlist else "(none)"

                header_common = [
                    f"Run ID: {timestamp}",
                    f"Safe mode: {safe_mode}",
                    "READ-ONLY. Do not modify files.",
                    "Your response will be saved as the output file.",
                ]

                jobs = []
                # Telemetry Auditor
                jobs.append({
                    "name": "telemetry",
                    "template": agent_templates["telemetry"],
                    "output": run_dir / f"agent_telemetry_{timestamp}.md",
                    "log": run_dir / f"agent_telemetry_{timestamp}.log",
                    "context": [
                        "## Telemetry Snapshot (truncated)",
                        telemetry_content or "(no telemetry snapshot available)",
                    ],
                    "header": header_common + [f"Agent: Telemetry Auditor"],
                })
                # SOP Auditor
                jobs.append({
                    "name": "sop",
                    "template": agent_templates["sop"],
                    "output": run_dir / f"agent_sop_{timestamp}.md",
                    "log": run_dir / f"agent_sop_{timestamp}.log",
                    "context": [
                        "## SOP Allowlist",
                        sop_list,
                        "## Master Plan",
                        "sop/MASTER_PLAN_PT_STUDY.md",
                    ],
                    "header": header_common + [f"Agent: SOP Auditor"],
                })
                # Pedagogy Questioner
                jobs.append({
                    "name": "pedagogy",
                    "template": agent_templates["pedagogy"],
                    "output": run_dir / f"agent_pedagogy_{timestamp}.md",
                    "log": run_dir / f"agent_pedagogy_{timestamp}.log",
                    "context": [
                        "## Telemetry Snapshot (truncated)",
                        telemetry_content or "(no telemetry snapshot available)",
                        "## Pedagogy Rubric",
                        "scholar/knowledge/pedagogy_audit.md",
                    ],
                    "header": header_common + [f"Agent: Pedagogy Questioner"],
                })
                # Research Scout
                jobs.append({
                    "name": "research",
                    "template": agent_templates["research"],
                    "output": run_dir / f"agent_research_{timestamp}.md",
                    "log": run_dir / f"agent_research_{timestamp}.log",
                    "context": [
                        "## Telemetry Snapshot (truncated)",
                        telemetry_content or "(no telemetry snapshot available)",
                    ],
                    "header": header_common + [f"Agent: Research Scout"],
                })

                if resolved_questions_block:
                    for job in jobs:
                        job["context"].append(resolved_questions_block)

                def _start_job(job):
                    log_file.write(f"[agent] start {job['name']} -> {job['output'].name}\n")
                    log_file.flush()
                    prompt = _compose_agent_prompt(job["template"], job["header"], job["context"])
                    agent_log = open(job["log"], "w", encoding="utf-8")
                    proc = subprocess.Popen(
                        [
                            codex_cmd, "exec",
                            "--dangerously-bypass-approvals-and-sandbox",
                            "-C", str(repo_root),
                            "--output-last-message", str(job["output"]),
                            "-",
                        ],
                        stdin=subprocess.PIPE,
                        stdout=agent_log,
                        stderr=subprocess.STDOUT,
                        cwd=str(repo_root),
                        encoding="utf-8",
                        text=True,
                    )
                    try:
                        proc.stdin.write(prompt)
                        proc.stdin.close()
                    except Exception:
                        pass
                    return {"proc": proc, "log": agent_log, "job": job}

                running = []
                completed = []
                for job in jobs:
                    while len(running) >= max_conc:
                        still_running = []
                        for item in running:
                            if item["proc"].poll() is None:
                                still_running.append(item)
                            else:
                                code = item["proc"].returncode
                                item["log"].close()
                                completed.append(item["job"]["name"])
                                log_file.write(f"[agent] done {item['job']['name']} (exit {code})\n")
                                log_file.flush()
                        running = still_running
                        time.sleep(0.5)
                    running.append(_start_job(job))

                while running:
                    still_running = []
                    for item in running:
                        if item["proc"].poll() is None:
                            still_running.append(item)
                        else:
                            code = item["proc"].returncode
                            item["log"].close()
                            completed.append(item["job"]["name"])
                            log_file.write(f"[agent] done {item['job']['name']} (exit {code})\n")
                            log_file.flush()
                    running = still_running
                    time.sleep(0.5)

                # Supervisor synthesis
                agent_outputs = []
                for job in jobs:
                    content = _read_text_safe(job["output"], limit=18000)
                    agent_outputs.append(f"## {job['name'].title()} Output\n{content}")

                supervisor_header = header_common + ["Agent: Supervisor (Synthesis)"]
                supervisor_context = []
                if telemetry_content:
                    supervisor_context.append("## Telemetry Snapshot (truncated)\n" + telemetry_content)
                supervisor_context.append("## Specialist Outputs\n" + "\n\n".join(agent_outputs))

                supervisor_prompt = _compose_agent_prompt(
                    agent_templates["supervisor"],
                    supervisor_header,
                    supervisor_context,
                )

                log_file.write("[agent] start supervisor -> unattended_final\n")
                log_file.flush()
                proc = subprocess.Popen(
                    [
                        codex_cmd, "exec",
                        "--dangerously-bypass-approvals-and-sandbox",
                        "-C", str(repo_root),
                        "--output-last-message", str(final_path),
                        "-",
                    ],
                    stdin=subprocess.PIPE,
                    stdout=log_file,
                    stderr=subprocess.STDOUT,
                    cwd=str(repo_root),
                    encoding="utf-8",
                    text=True,
                )
                try:
                    proc.stdin.write(supervisor_prompt)
                    proc.stdin.close()
                except Exception:
                    pass
                proc.wait()
                log_file.write(f"[agent] done supervisor (exit {proc.returncode})\n")

                # Extract questions from final output
                final_text = _read_text_safe(final_path, limit=20000)
                questions = extract_questions_from_text(final_text)
                if questions:
                    q_lines = []
                    for q in questions:
                        q_lines.append(f"Q: {q}")
                        q_lines.append("A: (pending)")
                    questions_path.write_text("\n".join(q_lines) + "\n", encoding="utf-8")
                else:
                    questions_path.write_text("(none)\n", encoding="utf-8")

                # Preserve prior questions if any
                if preserved_questions:
                    preserved_block = "\n".join([f"- {q}" for q in preserved_questions])
                    try:
                        existing = questions_path.read_text(encoding="utf-8")
                        questions_path.write_text(
                            existing + "\n\n# Preserved:\n" + preserved_block + "\n",
                            encoding="utf-8",
                        )
                    except Exception:
                        pass

                log_file.write(f"\n===== Scholar Run Completed at {datetime.now().isoformat()} =====\n")
        except Exception as exc:
            try:
                with open(log_path, "a", encoding="utf-8") as log_file:
                    log_file.write(f"\n\n===== SCHOLAR RUN ERROR =====\nError: {exc}\nTime: {datetime.now().isoformat()}\n")
            except Exception:
                pass
        finally:
            try:
                if running_marker.exists():
                    running_marker.unlink()
            except Exception:
                pass
            try:
                status_script = repo_root / "scripts" / "update_status.ps1"
                if status_script.exists():
                    subprocess.run(
                        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(status_script)],
                        cwd=str(repo_root),
                        capture_output=True,
                        timeout=30,
                    )
            except Exception:
                pass
            try:
                _ensure_plan_update(timestamp, repo_root, run_dir, final_path)
            except Exception:
                pass
            try:
                _write_verification_report(timestamp, repo_root, run_dir, questions_path)
            except Exception:
                pass

    thread = threading.Thread(target=_run_multi_agent_thread, daemon=True)
    thread.start()

    return {
        "ok": True,
        "message": "Scholar multi-agent run started",
        "run_id": timestamp,
        "log_file": str(log_path.relative_to(repo_root)),
        "final_file": str(final_path.relative_to(repo_root)),
        "preserved_questions": preserved_count,
    }

def run_scholar_orchestrator():
    """
    Trigger a Scholar orchestrator run.
    Returns result dict (not jsonify).
    """
    manifest = load_audit_manifest()
    if manifest.get("multi_agent", {}).get("enabled"):
        return run_scholar_orchestrator_multi(manifest)
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
                resolved_questions_file = _get_latest_file(run_dir, "questions_resolved_*.md")
                if resolved_questions_file:
                    resolved_text = _read_text_safe(resolved_questions_file, limit=8000)
                    if resolved_text:
                        prompt_content += (
                            "\n\n---\n## Resolved Questions (latest)\n"
                            + f"Source: {resolved_questions_file.name}\n\n"
                            + resolved_text
                            + "\n"
                        )
                
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

            # Verification report (post-run gate checks)
            try:
                _ensure_plan_update(timestamp, repo_root, run_dir, final_path)
            except Exception:
                pass
            try:
                _write_verification_report(timestamp, repo_root, run_dir, questions_path)
            except Exception:
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
    
    # --- 7. Get Proposals from promotion_queue ---
    proposals = []
    promotion_queue = scholar_outputs / "promotion_queue"
    if promotion_queue.exists():
        for pf in promotion_queue.glob("*.md"):
            try:
                content = pf.read_text(encoding="utf-8")[:1000]
                name = pf.stem.replace("_", " ").title()
                proposals.append({"name": name, "summary": content[:500]})
            except:
                pass

    # --- 7b. Approved/Rejected proposals (recent) ---
    proposals_root = scholar_outputs / "proposals"
    approved_dir = proposals_root / "approved"
    rejected_dir = proposals_root / "rejected"
    approved_recent = get_recent_files(approved_dir, "*.md")
    rejected_recent = get_recent_files(rejected_dir, "*.md")
    
    # --- Build context for AI ---
    context_parts = []
    context_parts.append("# Scholar System State Summary\n")
    context_parts.append(f"Period: {start_date} to {end_date}\n")
    
    if runs_info:
        context_parts.append(f"\n## Recent Runs: {len(runs_info)} orchestrator runs")
        for run in runs_info[:3]:
            context_parts.append(f"- {run['date']}: {len(run['completed'])} completed, {len(run.get('blockers', []))} blockers")
    
    if proposals:
        context_parts.append(f"\n## Pending Proposals ({len(proposals)}):")
        for p in proposals[:5]:
            context_parts.append(f"- {p['name']}")
            context_parts.append(f"  {p['summary'][:200]}...")
    if approved_recent:
        context_parts.append(f"\n## Approved Proposals (recent: {len(approved_recent)}):")
        for pf in approved_recent[:5]:
            context_parts.append(f"- {pf.stem.replace('_', ' ').title()}")
    if rejected_recent:
        context_parts.append(f"\n## Rejected Proposals (recent: {len(rejected_recent)}):")
        for pf in rejected_recent[:5]:
            context_parts.append(f"- {pf.stem.replace('_', ' ').title()}")
    
    if improvement_candidates:
        context_parts.append(f"\n## Improvement Candidates ({len(improvement_candidates)}):")
        for item in improvement_candidates[:8]:
            context_parts.append(f"- {item}")
    
    if topics_to_review:
        context_parts.append(f"\n## Identified Gaps ({len(topics_to_review)}):")
        for item in topics_to_review[:8]:
            context_parts.append(f"- {item}")
    
    if key_findings:
        context_parts.append(f"\n## Research Findings:")
        for finding in key_findings[:3]:
            context_parts.append(f"**{finding['topic']}:**")
            for bullet in finding['findings'][:2]:
                context_parts.append(f"  - {bullet}")
    
    if pending_questions:
        context_parts.append(f"\n## Unanswered Questions ({len(pending_questions)}):")
        for q in pending_questions[:5]:
            context_parts.append(f"- {q}")
    
    context_text = "\n".join(context_parts)
    
    # --- Call OpenRouter API for AI analysis ---
    ai_analysis = None
    ai_error = None
    
    try:
        import requests
        config = load_api_config()
        api_key = config.get("openrouter_api_key")
        
        if api_key:
            system_prompt = """You are a learning science expert analyzing a PT student's study system improvement tracker.
You help optimize study methods, track system health, and prioritize improvement proposals.
Be concise, actionable, and use markdown formatting."""

            user_prompt = f"""Analyze this study system data and provide strategic recommendations:

{context_text}

Based on this data, provide:

1. **Executive Summary** (2-3 sentences): What's the current state of system improvements?

2. **Top 3 Priority Actions**: What should be done first and why? Be specific.

3. **Proposals Review**: Of the pending proposals, which look most impactful? Any concerns?

4. **Research Recommendations**: What topics should be researched next based on the gaps?

5. **System Health Assessment**: Is the system being actively improved? Any staleness?"""

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://pt-study-brain.local",
            }
            
            payload = {
                "model": "anthropic/claude-3.5-sonnet",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 1500,
                "temperature": 0.7
            }
            
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                ai_analysis = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            else:
                ai_error = f"API error: {response.status_code}"
        else:
            ai_error = "No OpenRouter API key configured"
    except Exception as e:
        ai_error = f"AI analysis failed: {str(e)}"
    
    # --- Build Final Digest ---
    digest_parts = []
    digest_parts.append(f"# 🧠 Scholar Weekly Digest")
    digest_parts.append(f"**Period:** {start_date} to {end_date}")
    digest_parts.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
    
    if ai_analysis and not ai_error:
        digest_parts.append("---\n")
        digest_parts.append(ai_analysis)
        digest_parts.append("\n---\n")
    elif ai_error:
        digest_parts.append(f"\n> ⚠️ {ai_error}\n")
    
    # Raw data summary
    digest_parts.append("## 📊 Raw Data Summary")
    digest_parts.append(f"- **Orchestrator Runs:** {len(runs_info)}")
    digest_parts.append(f"- **Pending Proposals:** {len(proposals)}")
    digest_parts.append(f"- **Approved Proposals (recent):** {len(approved_recent)}")
    digest_parts.append(f"- **Rejected Proposals (recent):** {len(rejected_recent)}")
    digest_parts.append(f"- **Improvement Candidates:** {len(improvement_candidates)}")
    digest_parts.append(f"- **Identified Gaps:** {len(topics_to_review)}")
    digest_parts.append(f"- **Unanswered Questions:** {len(pending_questions)}")
    
    digest_text = "\n".join(digest_parts)
    
    # Build context summary for UI
    context_items = []
    if proposals:
        context_items.append(f"{len(proposals)} proposals")
    if approved_recent:
        context_items.append(f"{len(approved_recent)} approved")
    if rejected_recent:
        context_items.append(f"{len(rejected_recent)} rejected")
    if improvement_candidates:
        context_items.append(f"{len(improvement_candidates)} improvements")
    if topics_to_review:
        context_items.append(f"{len(topics_to_review)} gaps")
    context_summary = ", ".join(context_items) if context_items else "No data"
    
    return {
        "ok": True,
        "digest": digest_text,
        "period": f"{start_date} to {end_date}",
        "runs_count": len(runs_info),
        "ai_powered": bool(ai_analysis and not ai_error),
        "context_summary": context_summary,
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


def _git_diff_changed_files(repo_root: Path, base_commit: str, paths: List[str]) -> Optional[List[str]]:
    if not base_commit or base_commit == "unknown" or not paths:
        return None
    try:
        cmd = ["git", "-C", str(repo_root), "diff", "--name-only", base_commit, "HEAD", "--"]
        cmd.extend(paths)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            return None
        changed = [line.strip() for line in result.stdout.splitlines() if line.strip()]
        return changed
    except Exception:
        return None


def _load_proposal_metadata(meta_path: Path) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _hash_file(path: Path) -> str:
    import hashlib
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def generate_implementation_bundle() -> Dict[str, Any]:
    """
    Build an implementation bundle from approved proposals with safety checks.
    Returns dict with status and output path.
    """
    repo_root = Path(__file__).parent.parent.parent.resolve()
    proposals_root = repo_root / "scholar" / "outputs" / "proposals" / "approved"
    bundle_dir = repo_root / "scholar" / "outputs" / "implementation_bundles"
    bundle_dir.mkdir(parents=True, exist_ok=True)

    approved_files = sorted(proposals_root.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not approved_files:
        return {"ok": False, "message": "No approved proposals found."}

    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    bundle_path = bundle_dir / f"implementation_bundle_{timestamp}.md"

    bundle_lines = [
        f"# Implementation Bundle - {timestamp}",
        "",
        f"Generated: {datetime.now().isoformat()}",
        f"Approved proposals: {len(approved_files)}",
        "",
    ]

    stale = 0
    unknown = 0

    bundle_lines.append("## Approved Proposals")
    for proposal in approved_files:
        meta_path = proposal.with_suffix(proposal.suffix + ".meta.json")
        meta = _load_proposal_metadata(meta_path) if meta_path.exists() else None
        title = proposal.stem.replace("_", " ").title()
        status = "unknown"
        target_files = []
        reviewed_at = None
        base_commit = None
        target_hashes = {}

        if meta:
            title = meta.get("title") or title
            reviewed_at = meta.get("reviewed_at")
            target_files = meta.get("target_files") or []
            base_commit = meta.get("head_commit")
            target_hashes = meta.get("target_hashes") or {}
        else:
            unknown += 1

        changed_files = _git_diff_changed_files(repo_root, base_commit, target_files) if target_files else None
        if changed_files is None and target_files and target_hashes:
            changed_files = []
            for rel_path in target_files:
                try:
                    current_hash = _hash_file(repo_root / rel_path)
                except Exception:
                    current_hash = None
                if current_hash and target_hashes.get(rel_path) != current_hash:
                    changed_files.append(rel_path)

        if target_files:
            if changed_files is None:
                status = "unknown"
                unknown += 1
            elif changed_files:
                status = "stale"
                stale += 1
            else:
                status = "ok"
        else:
            status = "unknown"
            unknown += 1

        bundle_lines.append(f"### {title}")
        bundle_lines.append(f"- file: {proposal.name}")
        if reviewed_at:
            bundle_lines.append(f"- reviewed_at: {reviewed_at}")
        if target_files:
            bundle_lines.append(f"- target_files: {', '.join(target_files)}")
        bundle_lines.append(f"- safety_status: {status}")
        if status == "stale" and changed_files:
            bundle_lines.append(f"- changed_files: {', '.join(changed_files)}")
            bundle_lines.append("- action: re-review required before implementation")
        elif status == "unknown":
            bundle_lines.append("- action: verify targets before implementation")
        bundle_lines.append("")

    bundle_lines.append("## Safety Summary")
    bundle_lines.append(f"- stale: {stale}")
    bundle_lines.append(f"- unknown: {unknown}")
    bundle_lines.append("")

    bundle_lines.append("## Pre-Implementation Checklist")
    bundle_lines.append("- Review bundle for stale/unknown items")
    bundle_lines.append("- Re-approve any stale proposals after updating targets")
    bundle_lines.append("- Confirm proposal targets and scope are still valid")
    bundle_lines.append("- Run required tests: `python -m pytest brain/tests`, `python scripts/release_check.py`")
    bundle_lines.append("- Apply changes manually (Scholar remains read-only)")

    bundle_path.write_text("\n".join(bundle_lines), encoding="utf-8")

    return {
        "ok": True,
        "bundle_file": str(bundle_path.relative_to(repo_root)),
        "stale_count": stale,
        "unknown_count": unknown,
        "approved_count": len(approved_files),
    }


# -----------------------------------------------------------------------------
# Proposal Similarity Detection
# -----------------------------------------------------------------------------

def _tokenize_for_similarity(text: str) -> set:
    """
    Tokenize text for similarity comparison.
    Returns a set of lowercase word tokens, filtering out very short words.
    """
    if not text:
        return set()
    # Lowercase and split on non-alphanumeric
    words = re.split(r'[^a-z0-9]+', text.lower())
    # Filter out very short words (< 3 chars) and empty strings
    return {w for w in words if len(w) >= 3}


def _jaccard_similarity(set_a: set, set_b: set) -> float:
    """
    Compute Jaccard similarity between two sets.
    Returns 0.0 if both sets are empty.
    """
    if not set_a and not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    if union == 0:
        return 0.0
    return intersection / union


def _extract_proposal_title_from_content(content: str) -> str:
    """Extract title from first markdown heading or first line."""
    match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    # Fallback to first non-empty line
    for line in content.split("\n"):
        line = line.strip()
        if line:
            return line
    return ""


def _extract_scope_from_content(content: str) -> str:
    """Extract scope field from proposal content."""
    match = re.search(r'^-?\s*Scope\s*:\s*(.+)$', content, re.MULTILINE | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return ""


def check_proposal_similarity(title: str, scope_text: str = "") -> list:
    """
    Scan existing proposals in promotion_queue and find similar ones.
    
    Uses a combined similarity score:
    - 70% weight on title-to-title similarity (most important)
    - 30% weight on full text (title+scope) similarity
    
    Args:
        title: Title of the new/candidate proposal
        scope_text: Optional scope text to include in similarity check
    
    Returns:
        List of dicts with keys: filename, title, similarity, scope
        Only returns proposals with similarity >= 0.4
    """
    repo_root = Path(__file__).parent.parent.parent.resolve()
    promotion_queue = repo_root / "scholar" / "outputs" / "promotion_queue"
    
    if not promotion_queue.exists():
        return []
    
    # Tokenize candidate title and full text separately
    candidate_title_tokens = _tokenize_for_similarity(title)
    candidate_full_tokens = _tokenize_for_similarity(f"{title} {scope_text}")
    
    if not candidate_title_tokens:
        return []
    
    similar_proposals = []
    
    for proposal_file in promotion_queue.glob("*.md"):
        try:
            content = proposal_file.read_text(encoding="utf-8")
            existing_title = _extract_proposal_title_from_content(content)
            existing_scope = _extract_scope_from_content(content)
            
            # Tokenize existing proposal
            existing_title_tokens = _tokenize_for_similarity(existing_title)
            existing_full_tokens = _tokenize_for_similarity(f"{existing_title} {existing_scope}")
            
            if not existing_title_tokens:
                continue
            
            # Calculate weighted similarity: 70% title, 30% full text
            title_sim = _jaccard_similarity(candidate_title_tokens, existing_title_tokens)
            full_sim = _jaccard_similarity(candidate_full_tokens, existing_full_tokens)
            similarity = 0.7 * title_sim + 0.3 * full_sim
            
            if similarity >= 0.4:
                similar_proposals.append({
                    "filename": proposal_file.name,
                    "title": existing_title[:200] if existing_title else proposal_file.stem,
                    "scope": existing_scope[:200] if existing_scope else "",
                    "similarity": round(similarity, 3)
                })
        except Exception:
            continue
    
    # Sort by similarity descending
    similar_proposals.sort(key=lambda x: x["similarity"], reverse=True)
    
    return similar_proposals
