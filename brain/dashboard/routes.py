
import os
import json
from pathlib import Path
from datetime import datetime, timedelta
from flask import (
    Blueprint,
    render_template,
    jsonify,
    request,
    send_file,
    Response,
)
from werkzeug.utils import secure_filename

from config import (
    DATA_DIR,
    SESSION_LOGS_DIR,
    SCORE_MIN,
    SCORE_MAX,
    STALE_DAYS,
    FRESH_DAYS,
    WEAK_THRESHOLD,
    STRONG_THRESHOLD,
)
from db_setup import init_database, get_connection
# Use import directly for items in brain/ folder (root of execution)
from ingest_session import parse_session_log, validate_session_data, insert_session
from generate_resume import generate_resume
from tutor_api_types import TutorQueryV1, TutorSourceSelector, TutorTurnResponse
from import_syllabus import upsert_course, import_events

# Dashboard modules
from dashboard.utils import allowed_file, load_api_config, save_api_config
from dashboard.stats import build_stats
from dashboard.scholar import (
    build_scholar_stats, 
    generate_ai_answer, 
    run_scholar_orchestrator
)
from dashboard.syllabus import fetch_all_courses_and_events, attach_event_analytics
from dashboard.calendar import get_calendar_data
from dashboard.cli import get_all_sessions

dashboard_bp = Blueprint('dashboard', __name__)

# Ensure directories exist (run once at module level is okay, or in app factory)
# We can do it here just to be safe if blueprint is imported
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SESSION_LOGS_DIR, exist_ok=True)


def insert_session_data(data):
    """
    Validate and insert using the v9.1 ingest pipeline.
    Returns (ok: bool, message: str).
    """
    is_valid, error = validate_session_data(data)
    if not is_valid:
        return False, f"Validation failed: {error}"
    return insert_session(data)


@dashboard_bp.route("/")
def index():
    return render_template('dashboard.html')


@dashboard_bp.route("/favicon.ico")
def favicon():
    return "", 204


@dashboard_bp.route("/api/stats")
def api_stats():
    return jsonify(build_stats())


@dashboard_bp.route("/api/scholar")
def api_scholar():
    return jsonify(build_scholar_stats())


@dashboard_bp.route("/api/scholar/api-key", methods=["GET", "POST"])
def api_scholar_api_key():
    if request.method == "GET":
        config = load_api_config()
        api_provider = config.get("api_provider", "openrouter")
        if api_provider == "openrouter":
            api_key = config.get("openrouter_api_key", "")
        else:
            api_key = config.get("openai_api_key", "")
        
        return jsonify({
            "ok": True,
            "has_key": bool(api_key),
            "key_preview": f"{api_key[:7]}..." if api_key else None,
            "api_provider": api_provider,
            "model": config.get("model", "zai-ai/glm-4.7"),
        })
    else:
        try:
            data = request.get_json()
            if not data or "api_key" not in data:
                return jsonify({"ok": False, "message": "Missing 'api_key' field"}), 400
            
            api_key = data["api_key"].strip()
            if not api_key:
                return jsonify({"ok": False, "message": "API key cannot be empty"}), 400
            
            config = load_api_config()
            api_provider = data.get("api_provider", "openrouter")
            model = data.get("model", "zai-ai/glm-4.7")
            
            if api_provider == "openrouter":
                config["openrouter_api_key"] = api_key
            else:
                config["openai_api_key"] = api_key
            
            config["api_provider"] = api_provider
            config["model"] = model
            save_api_config(config)
            
            return jsonify({
                "ok": True,
                "message": f"API key saved successfully ({api_provider})",
                "key_preview": f"{api_key[:7]}...",
                "api_provider": api_provider,
                "model": model,
            })
        except Exception as e:
            return jsonify({"ok": False, "message": f"Error saving API key: {e}"}), 500


@dashboard_bp.route("/api/scholar/questions/clarify", methods=["POST"])
def api_scholar_clarify_question():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"ok": False, "message": "Missing JSON body"}), 400
            
        # Support "messages" (chat history) or single "clarifying_question"
        scholar_question = data.get("scholar_question", "")
        
        history = data.get("messages", [])
        user_message = ""
        if "clarifying_question" in data:
            user_message = data["clarifying_question"]
        elif history:
            user_message = history[-1]["content"] if history[-1]["role"] == "user" else ""
            
        if not user_message:
             return jsonify({"ok": False, "message": "No question provided"}), 400
        
        # Load Scholar context
        repo_root = Path(__file__).parent.parent.parent.resolve()
        
        # Build system context
        context_parts = []
        context_parts.append(f"Primary Scholar Question being discussed: {scholar_question}")
        
        # Load docs
        for doc_name in ["PEIRRO.md", "KWIK.md", "M6-wrap.md"]:
             doc_path = repo_root / "sop" / "gpt-knowledge" / doc_name
             if doc_path.exists():
                 try:
                     context_parts.append(f"\n--- {doc_name} ---\n{doc_path.read_text(encoding='utf-8')[:1000]}...")
                 except: pass

        system_context = "\n".join(context_parts)
        
        # If using history, pass it to generate_ai_answer if it supported list, 
        # but generate_ai_answer takes (question, context).
        # We'll prepend history to context or modify generate_ai_answer.
        # For now, let's construct a prompt with history.
        
        full_prompt = user_message
        if history:
            history_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[:-1]]) # exclude last if it became user_message
            if history_text:
                full_prompt = f"Conversation History:\n{history_text}\n\nCurrent Question: {user_message}"

        answer, error = generate_ai_answer(full_prompt, system_context)
        
        if error:
            return jsonify({"ok": False, "message": error}), 400
        
        return jsonify({
            "ok": True,
            "clarification": answer,
            "scholar_question": scholar_question,
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error generating clarification: {e}"}), 500


@dashboard_bp.route("/api/scholar/questions/generate", methods=["POST"])
def api_scholar_generate_answer():
    try:
        data = request.get_json()
        if not data:
             return jsonify({"ok": False, "message": "Missing JSON body"}), 400

        # Handle "messages" list for chat mode
        messages = data.get("messages", [])
        question = data.get("question", "")
        
        # If messages provided but no question, assume last user message is question
        if messages and not question:
            last_msg = messages[-1]
            if last_msg["role"] == "user":
                question = last_msg["content"]
        
        if not question:
            return jsonify({"ok": False, "message": "Missing 'question' or 'messages' field"}), 400
        
        context = data.get("context", "")
        
        # Load Scholar context
        repo_root = Path(__file__).parent.parent.parent.resolve()
        peirro_doc = repo_root / "sop" / "gpt-knowledge" / "PEIRRO.md"
        kwik_doc = repo_root / "sop" / "gpt-knowledge" / "KWIK.md"
        
        additional_context = ""
        if peirro_doc.exists():
            try:
                peirro_content = peirro_doc.read_text(encoding="utf-8")[:500]
                additional_context += f"\nPEIRRO Framework: {peirro_content}\n"
            except: pass
        if kwik_doc.exists():
            try:
                kwik_content = kwik_doc.read_text(encoding="utf-8")[:500]
                additional_context += f"\nKWIK Framework: {kwik_content}\n"
            except: pass
        
        full_context = context + additional_context
        
        # Append history to context if available
        if messages:
             # Filter to only previous turns
             history_str = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages if m['content'] != question])
             if history_str:
                 full_context += f"\n\nPrevious Conversation:\n{history_str}"
        
        api_key_override = data.get("api_key")
        api_provider_override = data.get("api_provider")
        model_override = data.get("model")

        answer, error = generate_ai_answer(
            question,
            full_context,
            api_key_override=api_key_override,
            api_provider_override=api_provider_override,
            model_override=model_override,
        )
        
        if error:
            return jsonify({"ok": False, "message": error}), 400
        
        return jsonify({
            "ok": True,
            "answer": answer,
            "question": question,
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error generating answer: {e}"}), 500


@dashboard_bp.route("/api/scholar/questions", methods=["POST"])
def api_scholar_answer_questions():
    """Update the questions_needed file with answers."""
    try:
        data = request.get_json()
        if not data or "answers" not in data:
            return jsonify({"ok": False, "message": "Missing 'answers' array"}), 400
        
        answers = data["answers"]
        repo_root = Path(__file__).parent.parent.parent.resolve()
        orchestrator_runs = repo_root / "scholar" / "outputs" / "orchestrator_runs"
        
        # Find the questions file with unanswered questions (check recent files)
        question_files = sorted(
            orchestrator_runs.glob("questions_needed_*.md"), 
            key=lambda p: p.stat().st_mtime, 
            reverse=True
        )
        
        if not question_files:
            return jsonify({"ok": False, "message": "No questions file found"}), 404
        
        # This logic finds the file to update - simplified from original for brevity but robust enough
        target_questions_file = question_files[0]
        
        # Check if we should use an older file that has unanswered questions
        for q_file in question_files[:3]:
            try:
                content = q_file.read_text(encoding="utf-8").strip()
                if content and content != "(none)":
                    has_unanswered = False
                    if "Q:" in content:
                        lines = content.split("\n")
                        for i, line in enumerate(lines):
                            if line.strip().startswith("Q:"):
                                # Check if next line is A:
                                if i + 1 >= len(lines) or not lines[i+1].strip().startswith("A:") or lines[i+1].replace("A:", "").strip().lower() in ["(pending)", "(none)", ""]:
                                    has_unanswered = True
                                    break
                    elif content and not content.startswith("#"):
                        has_unanswered = True
                    
                    if has_unanswered:
                        target_questions_file = q_file
                        break
            except:
                continue
        
        latest_questions_file = target_questions_file
        current_content = latest_questions_file.read_text(encoding="utf-8")
        
        # Update logic
        if "Q:" in current_content:
            lines = current_content.split("\n")
            answered_content = []
            answer_index = 0
            
            for line in lines:
                if line.strip().startswith("Q:"):
                    answered_content.append(line)
                elif line.strip().startswith("A:"):
                    if answer_index < len(answers) and answers[answer_index]:
                        answered_content.append(f"A: {answers[answer_index]}")
                    else:
                        answered_content.append(line)
                    answer_index += 1
                elif line.strip() and not line.strip().startswith("Q:") and not line.strip().startswith("A:"):
                    answered_content.append(line)
                else:
                    answered_content.append(line)
            
            while answer_index < len(answers):
                if answers[answer_index]:
                    answered_content.append(f"\nQ: (Additional question {answer_index + 1})")
                    answered_content.append(f"A: {answers[answer_index]}")
                answer_index += 1
        else:
            original_questions = [q.strip() for q in current_content.split("\n") 
                                if q.strip() and q.strip() != "(none)" 
                                and not q.strip().startswith("#")]
            
            answered_content = []
            for i, question in enumerate(original_questions):
                clean_question = re.sub(r"^[-*•]\s*", "", question)
                clean_question = re.sub(r"^\d+\.\s*", "", clean_question)
                if clean_question:
                    answered_content.append(f"Q: {clean_question}")
                    if i < len(answers) and answers[i]:
                        answered_content.append(f"A: {answers[i]}")
                    else:
                        answered_content.append(f"A: (pending)")
                    answered_content.append("")
        
        latest_questions_file.write_text("\n".join(answered_content), encoding="utf-8")
        
        return jsonify({"ok": True, "message": f"Answers saved to {latest_questions_file.name}"})
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error saving answers: {e}"}), 500


@dashboard_bp.route("/api/scholar/run", methods=["POST"])
def api_scholar_run():
    try:
        result = run_scholar_orchestrator()
        return jsonify(result)
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error starting Scholar run: {e}"}), 500


@dashboard_bp.route("/api/scholar/run/status/<run_id>")
def api_scholar_run_status(run_id):
    repo_root = Path(__file__).parent.parent.parent.resolve()
    run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    
    log_path = run_dir / f"unattended_{run_id}.log"
    final_path = run_dir / f"unattended_final_{run_id}.md"
    
    status = {
        "run_id": run_id,
        "running": False,
        "completed": False,
        "has_final": final_path.exists(),
        "log_size": 0,
        "log_tail": "",
    }
    
    if log_path.exists():
        status["log_size"] = log_path.stat().st_size
        try:
            with open(log_path, "r", encoding="utf-8") as f:
                content = f.read()
                status["log_tail"] = content[-500:] if len(content) > 500 else content
                status["running"] = "Scholar Run Completed" not in content and "ERROR:" not in content[-1000:]
                status["completed"] = "Scholar Run Completed" in content or final_path.exists()
        except:
            pass
    
    if final_path.exists():
        status["completed"] = True
        status["running"] = False
        try:
            final_content = final_path.read_text(encoding="utf-8")
            status["final_summary"] = final_content[:500]
        except:
            pass
    
    return jsonify(status)


@dashboard_bp.route("/api/scholar/safe-mode", methods=["POST"])
def api_scholar_safe_mode():
    try:
        data = request.get_json()
        if "safe_mode" not in data:
            return jsonify({"ok": False, "message": "Missing 'safe_mode' field"}), 400
        
        repo_root = Path(__file__).parent.parent.parent.resolve()
        manifest_path = repo_root / "scholar" / "inputs" / "audit_manifest.json"
        
        if not manifest_path.exists():
            return jsonify({"ok": False, "message": "audit_manifest.json not found"}), 404
        
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        
        manifest["safe_mode"] = bool(data["safe_mode"])
        
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        
        return jsonify({
            "ok": True, 
            "message": f"Safe mode set to {manifest['safe_mode']}",
            "safe_mode": manifest["safe_mode"]
        })
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error updating safe_mode: {e}"}), 500


@dashboard_bp.route("/api/scholar/execute-via-ai", methods=["POST"])
def api_scholar_execute_via_ai():
    repo_root = Path(__file__).parent.parent.parent.resolve()
    run_dir = repo_root / "scholar" / "outputs" / "orchestrator_runs"
    run_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    log_path = run_dir / f"unattended_{timestamp}.log"
    final_path = run_dir / f"unattended_final_{timestamp}.md"
    questions_path = run_dir / f"questions_needed_{timestamp}.md"
    
    # Simple preservation check (last file only)
    existing_questions_to_preserve = []
    question_files = sorted(run_dir.glob("questions_needed_*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if question_files:
        try:
            content = question_files[0].read_text(encoding="utf-8")
            # Minimal extraction for speed (assumes not empty and not answered)
            if "Q:" not in content and content != "(none)":
                 for line in content.split("\n"):
                    if line.strip() and not line.strip().startswith(("#", "A:")):
                         existing_questions_to_preserve.append(line.strip())
        except:
            pass

    execution_request = run_dir / f"_ai_execution_request_{timestamp}.md"
    request_content = f"# Scholar Execution Request - {timestamp}\n\n"
    request_content += f"Run ID: {timestamp}\n"
    request_content += f"Log: {log_path.relative_to(repo_root)}\n"
    request_content += f"Final: {final_path.relative_to(repo_root)}\n"
    
    execution_request.write_text(request_content, encoding="utf-8")
    
    return jsonify({
        "ok": True,
        "message": "Scholar execution requested via AI assistant",
        "run_id": timestamp,
        "execution_request_file": str(execution_request.relative_to(repo_root)),
    })


@dashboard_bp.route("/api/resume")
def api_resume():
    resume_md = generate_resume()
    if not resume_md:
        return Response("No sessions found.", mimetype="text/plain")
    return Response(resume_md, mimetype="text/plain")


@dashboard_bp.route("/api/resume/download")
def api_resume_download():
    resume_md = generate_resume()
    if not resume_md:
        return Response("No sessions found.", mimetype="text/plain")

    temp_path = Path("session_resume.md")
    temp_path.write_text(resume_md, encoding="utf-8")
    return send_file(
        temp_path,
        as_attachment=True,
        download_name="session_resume.md",
        mimetype="text/markdown",
    )


@dashboard_bp.route("/api/upload", methods=["POST"])
def api_upload():
    if "file" not in request.files:
        return jsonify({"ok": False, "message": "No file part in request."}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"ok": False, "message": "No selected file."}), 400
    if not allowed_file(file.filename):
        return (
            jsonify({"ok": False, "message": "Unsupported file type. Use .md/.txt."}),
            400,
        )

    filename = secure_filename(file.filename)
    dest_path = Path(SESSION_LOGS_DIR) / filename

    try:
        file.save(dest_path)
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Failed to save file: {exc}"}), 500

    try:
        data = parse_session_log(dest_path)
    except Exception as exc:
        return (
            jsonify({"ok": False, "message": f"Parse error: {exc}"}),
            400,
        )

    ok, msg = insert_session_data(data)
    status = 200 if ok else 400
    return jsonify({"ok": ok, "message": msg, "filename": filename}), status


@dashboard_bp.route("/api/quick_session", methods=["POST"])
def api_quick_session():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"ok": False, "message": "No JSON data provided."}), 400

        # Validate required fields
        required_fields = ["topic", "study_mode", "time_spent_minutes", "understanding_level"]
        for field in required_fields:
            if field not in data or data[field] in [None, ""]:
                return jsonify({"ok": False, "message": f"Missing required field: {field}"}), 400

        main_topic = (data.get("topic") or data.get("main_topic") or "").strip()
        duration_val = data.get("time_spent_minutes") or data.get("duration_minutes")
        if not main_topic:
            return jsonify({"ok": False, "message": "Missing required field: topic"}), 400
        if duration_val in [None, ""]:
            return jsonify({"ok": False, "message": "Missing required field: time_spent_minutes"}), 400

        # Map to v9.1 schema fields
        session_data = {
            "session_date": data.get("session_date", datetime.now().strftime("%Y-%m-%d")),
            "session_time": data.get("session_time", datetime.now().strftime("%H:%M")),
            "duration_minutes": int(duration_val),
            "study_mode": data["study_mode"],
            "target_exam": data.get("target_exam", "").strip(),
            "source_lock": data.get("source_lock", "").strip(),
            "plan_of_attack": data.get("plan_of_attack", "").strip(),
            "main_topic": main_topic,
            "subtopics": data.get("subtopics", "").strip(),
            "frameworks_used": data.get("frameworks_used", "").strip(),
            "gated_platter_triggered": data.get("gated_platter_triggered", "No"),
            "wrap_phase_reached": data.get("wrap_phase_reached", "No"),
            "anki_cards_count": int(data.get("anki_cards_count", 0)),
            "region_covered": data.get("region_covered", "").strip(),
            "landmarks_mastered": data.get("landmarks_mastered", "").strip(),
            "muscles_attached": data.get("muscles_attached", "").strip(),
            "oian_completed_for": data.get("oian_completed_for", "").strip(),
            "rollback_events": data.get("rollback_events", "").strip(),
            "drawing_used": data.get("drawing_used", "").strip(),
            "drawings_completed": data.get("drawings_completed", "").strip(),
            "understanding_level": int(data["understanding_level"]),
            "retention_confidence": int(data.get("retention_confidence", 3)),
            "system_performance": int(data.get("system_performance", 3)),
            "calibration_check": data.get("calibration_check", "").strip(),
            "anchors_locked": data.get("anchors_locked", "").strip(),
            "what_worked": data.get("what_worked", "").strip(),
            "what_needs_fixing": data.get("what_needs_fixing", "").strip(),
            "gaps_identified": data.get("gaps_identified", "").strip(),
            "notes_insights": data.get("notes_insights", "").strip(),
            "next_topic": data.get("next_topic", "").strip(),
            "next_focus": data.get("next_focus", "").strip(),
            "next_materials": data.get("next_materials", "").strip(),
            "created_at": datetime.now().isoformat(),
            "schema_version": "9.1",
        }

        # Validate score ranges
        for score_field in ["understanding_level", "retention_confidence", "system_performance"]:
            score = session_data[score_field]
            if score < SCORE_MIN or score > SCORE_MAX:
                return jsonify({"ok": False, "message": f"{score_field} must be between {SCORE_MIN} and {SCORE_MAX}"}), 400

        # Insert into database
        ok, msg = insert_session_data(session_data)
        status = 200 if ok else 400
        return jsonify({"ok": ok, "message": msg}), status

    except ValueError as e:
        return jsonify({"ok": False, "message": f"Invalid number format: {e}"}), 400
    except Exception as e:
        return jsonify({"ok": False, "message": f"Server error: {e}"}), 500


@dashboard_bp.route("/api/tutor/session/start", methods=["POST"])
def api_tutor_session_start():
    payload = request.get_json() or {}
    session_id = payload.get("session_id") or datetime.now().strftime(
        "sess-%Y%m%d-%H%M%S"
    )
    return jsonify({"ok": True, "session_id": session_id})


@dashboard_bp.route("/api/tutor/session/turn", methods=["POST"])
def api_tutor_session_turn():
    payload = request.get_json() or {}
    try:
        sources = TutorSourceSelector(
            allowed_doc_ids=payload.get("sources", {}).get("allowed_doc_ids", []),
            allowed_kinds=payload.get("sources", {}).get("allowed_kinds", []),
            disallowed_doc_ids=payload.get("sources", {}).get(
                "disallowed_doc_ids", []
            ),
        )
        query = TutorQueryV1(
            user_id=payload.get("user_id", "default"),
            session_id=payload.get("session_id"),
            course_id=payload.get("course_id"),
            topic_id=payload.get("topic_id"),
            mode=payload.get("mode", "Core"),
            question=payload.get("question", ""),
            plan_snapshot_json=payload.get("plan_snapshot_json", "{}"),
            sources=sources,
            notes_context_ids=payload.get("notes_context_ids", []),
        )
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Invalid TutorQuery payload: {exc}"}), 400

    # Stub answer for now.
    answer_text = (
        "Tutor stub is running.\n\n"
        f"- Mode: {query.mode}\n"
        f"- Course ID: {query.course_id}\n"
        f"- Topic ID: {query.topic_id}\n"
        f"- Question: {query.question}\n\n"
        "RAG + Brain integration will replace this stub response."
    )
    resp = TutorTurnResponse(session_id=query.session_id or "adhoc", answer=answer_text, unverified=True)
    return jsonify(
        {
            "ok": True,
            "session_id": resp.session_id,
            "answer": resp.answer,
            "citations": [],
            "unverified": resp.unverified,
        }
    )


@dashboard_bp.route("/api/syllabus/import", methods=["POST"])
def api_syllabus_import():
    payload = request.get_json() or {}
    try:
        course_data = {
            "name": (payload.get("name") or "").strip(),
            "code": (payload.get("code") or "").strip(),
            "term": (payload.get("term") or "").strip(),
            "instructor": (payload.get("instructor") or "").strip(),
            "default_study_mode": (payload.get("default_study_mode") or "Core").strip()
            or "Core",
            "time_budget_per_week_minutes": int(
                payload.get("time_budget_per_week_minutes") or 0
            ),
        }
        event = {
            "type": (payload.get("event_type") or "other").strip(),
            "title": (payload.get("event_title") or "").strip(),
            "date": (payload.get("event_date") or "").strip() or None,
            "due_date": (payload.get("event_due_date") or "").strip() or None,
            "weight": float(payload.get("event_weight") or 0.0),
            "raw_text": (payload.get("event_raw_text") or "").strip(),
        }
        if not event["title"]:
            return (
                jsonify({"ok": False, "message": "Event title is required."}),
                400,
            )

        course_id = upsert_course(course_data)
        inserted = import_events(course_id, [event], replace=False)
        return jsonify(
            {
                "ok": True,
                "course_id": course_id,
                "events_added": inserted,
                "message": f"Course saved and {inserted} event(s) added.",
            }
        )
    except Exception as exc:
        return (
            jsonify({"ok": False, "message": f"Syllabus import failed: {exc}"}),
            400,
        )


@dashboard_bp.route("/api/syllabus/import_bulk", methods=["POST"])
def api_syllabus_import_bulk():
    payload = request.get_json() or {}
    print(f"[DEBUG] api_syllabus_import_bulk payload type: {type(payload)}")
    
    try:
        # Handle list of courses (bulk)
        if isinstance(payload, list):
             print(f"[DEBUG] Received list of {len(payload)} courses")
             total_events = 0
             course_ids = []
             for course_data in payload:
                 if not isinstance(course_data, dict): continue
                 try:
                     cid = upsert_course(course_data)
                     events = course_data.get("events") or []
                     inserted = import_events(cid, events, replace=False)
                     total_events += inserted
                     course_ids.append(cid)
                 except Exception as e:
                     print(f"[ERROR] Failed to import course: {e}")
             
             return jsonify({
                 "ok": True,
                 "courses_processed": len(course_ids),
                 "events_added": total_events,
                 "message": f"Bulk import processed {len(course_ids)} courses and {total_events} events."
             })
             
        # Handle single course (original behavior but safer)
        if "name" in payload:
            print(f"[DEBUG] Received single course: {payload.get('name')}")
            course_id = upsert_course(payload)
            events = payload.get("events") or []
            inserted = import_events(course_id, events, replace=False)
            return jsonify(
                {
                    "ok": True,
                    "course_id": course_id,
                    "events_added": inserted,
                    "message": f"Bulk syllabus import complete: {inserted} event(s) added.",
                }
            )
        else:
             print("[DEBUG] Payload missing 'name', and is not a list.")
             return jsonify({"ok": False, "message": "Invalid JSON: Expected course object or list of courses."}), 400
             
    except Exception as exc:
        print(f"[ERROR] api_syllabus_import_bulk exception: {exc}")
        import traceback
        traceback.print_exc()
        return (
            jsonify({"ok": False, "message": f"Bulk syllabus import failed: {exc}"}),
            400,
        )


@dashboard_bp.route("/api/syllabus/courses")
def api_syllabus_courses():
    courses, events = fetch_all_courses_and_events()
    if not courses:
        return jsonify({"courses": [], "summary": {}})

    # Basic per-course counts
    events_by_course = {}
    for ev in events:
        cid = ev["course_id"]
        events_by_course.setdefault(cid, []).append(ev)

    today = datetime.now().date()
    summary_courses = []
    for c in courses:
        course_events = events_by_course.get(c["id"], [])
        total_events = len(course_events)
        upcoming_7 = 0
        upcoming_30 = 0
        exams_count = 0

        for ev in course_events:
            ev_type = (ev.get("type") or "").lower()
            date_str = ev.get("date") or ev.get("due_date")
            ev_date = None
            if date_str:
                try:
                    ev_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                except Exception:
                    ev_date = None

            if ev_type == "exam":
                exams_count += 1

            if ev_date and ev_date >= today:
                delta = (ev_date - today).days
                if delta <= 7:
                    upcoming_7 += 1
                if delta <= 30:
                    upcoming_30 += 1

        summary_courses.append(
            {
                **c,
                "events_total": total_events,
                "upcoming_7_days": upcoming_7,
                "upcoming_30_days": upcoming_30,
                "exams_count": exams_count,
            }
        )

    overall_summary = {
        "courses_count": len(courses),
        "events_count": len(events),
    }

    return jsonify(
        {
            "courses": summary_courses,
            "summary": overall_summary,
        }
    )


@dashboard_bp.route("/api/syllabus/events")
def api_syllabus_events():
    course_id_raw = request.args.get("course_id")
    try:
        course_id = int(course_id_raw) if course_id_raw else None
    except ValueError:
        return jsonify({"ok": False, "message": "Invalid course_id"}), 400

    courses, events = fetch_all_courses_and_events()
    if course_id is not None:
        events = [ev for ev in events if ev["course_id"] == course_id]

    raw_sessions = get_all_sessions()
    sessions = [dict(s) for s in raw_sessions]

    enriched_events = attach_event_analytics(events, sessions)

    return jsonify(
        {
            "ok": True,
            "events": enriched_events,
            "thresholds": {
                "weak": WEAK_THRESHOLD,
                "strong": STRONG_THRESHOLD,
                "stale_days": STALE_DAYS,
                "fresh_days": FRESH_DAYS,
            },
        }
    )


@dashboard_bp.route("/api/calendar/data")
def api_calendar_data():
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    course_id_raw = request.args.get("course_id")
    event_type = request.args.get("event_type")

    today = datetime.now().date()
    start_date = (
        datetime.strptime(start_date_str, "%Y-%m-%d").date()
        if start_date_str
        else today - timedelta(days=7)
    )
    end_date = (
        datetime.strptime(end_date_str, "%Y-%m-%d").date()
        if end_date_str
        else today + timedelta(days=60)
    )

    try:
        course_id = int(course_id_raw) if course_id_raw else None
    except ValueError:
        course_id = None

    result = get_calendar_data(start_date, end_date, course_id, event_type)
    return jsonify(result)


@dashboard_bp.route("/api/calendar/plan_session", methods=["POST"])
def api_calendar_plan_session():
    payload = request.get_json() or {}
    try:
        course_id = payload.get("course_id")
        topic_id = payload.get("topic_id")
        course_event_id = payload.get("course_event_id")
        scheduled_date = payload.get("scheduled_date", "").strip()
        planned_minutes = int(payload.get("planned_minutes") or 60)
        notes = (payload.get("notes") or "").strip()

        if not scheduled_date:
            return jsonify({"ok": False, "message": "scheduled_date is required"}), 400

        try:
            datetime.strptime(scheduled_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({"ok": False, "message": "Invalid date format (use YYYY-MM-DD)"}), 400

        init_database()
        conn = get_connection()
        cur = conn.cursor()

        now = datetime.now().isoformat(timespec="seconds")
        cur.execute(
            """
            INSERT INTO study_tasks (
                course_id, topic_id, course_event_id,
                scheduled_date, planned_minutes, status, notes,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
            (course_id, topic_id, course_event_id, scheduled_date, planned_minutes, notes, now),
        )
        task_id = cur.lastrowid
        conn.commit()
        conn.close()

        return jsonify(
            {
                "ok": True,
                "task_id": task_id,
                "message": f"Planned session created for {scheduled_date}",
            }
        )
    except Exception as exc:
        return jsonify({"ok": False, "message": f"Failed to create planned session: {exc}"}), 400
