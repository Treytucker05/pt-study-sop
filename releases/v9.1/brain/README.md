# PT Study Brain v9.1

Session tracking and analytics system for the PT Study SOP.

---

## Quick Start

### Initialize Database
```powershell
cd brain
python db_setup.py
```

### After a Study Session
```powershell
# 1. Create log file from template
cp session_logs/TEMPLATE.md session_logs/2025-12-05_topic.md

# 2. Fill in the log with your session data

# 3. Ingest to database
python ingest_session.py session_logs/2025-12-05_topic.md
```

### Before Next Session
```powershell
python generate_resume.py
# Paste output into GPT for context
```

### Dashboard
```powershell
python dashboard_web.py
# Then open http://127.0.0.1:5000 in your browser
```
Launch from this folder to ensure the release database and config are used.

---

## Directory Structure

```
brain/
- config.py              # Configuration settings
- db_setup.py            # Database initialization
- ingest_session.py      # Parse logs -> database
- generate_resume.py     # Generate session resume
- README.md              # This file
- session_logs/          # Your session logs
    TEMPLATE.md          # Copy this for each session
- data/                  # Database storage
    pt_study.db          # SQLite database
- output/                # Generated files
    session_resume.md    # Resume for GPT context
```

---

## Session Log Fields (v9.1)

### Required
- Date, Time, Duration
- Study Mode (Core / Diagnostic Sprint / Teaching Sprint / Drill)
- Main Topic

### Planning Phase
- Target Exam/Block
- Source-Lock (materials used)
- Plan of Attack

### Execution Details
- Frameworks Used
- Gated Platter Triggered (Yes/No)
- WRAP Phase Reached (Yes/No)
- Anki Cards Created (count)
- Off-source drift? (Y/N)
- Source snippets used? (Y/N)

### Anatomy-Specific
- Region Covered
- Landmarks Mastered
- Muscles Attached
- OIAN Completed For
- Rollback Events (Yes/No)
- Drawing Used (Yes/No)
- Drawings Completed

### Ratings (1-5)
- Understanding Level
- Retention Confidence
- System Performance
- Calibration Check

### Anchors
- Anchors Locked
- Weak Anchors (for WRAP cards)

### Reflection
- What Worked
- What Needs Fixing
- Gaps Identified
- Notes/Insights

### Next Session
- Topic, Focus, Materials Needed

---

## Resume Output
The resume generator provides readiness score, recent sessions, topic coverage freshness, anatomy coverage, weak areas, and recommended focus.

---

## Database Schema (v9.1)
Key fields include target_exam, source_lock, plan_of_attack, region_covered, landmarks_mastered, muscles_attached, oian_completed_for, rollback_events, drawing_used, calibration_check, off_source_drift, source_snippets_used, weak_anchors.

---

## Commands
| Command | What It Does |
|---------|--------------|
| `python db_setup.py` | Initialize or migrate database |
| `python ingest_session.py <file>` | Add session to database |
| `python generate_resume.py` | Generate resume for next session |
| `python config.py` | Show configuration |

---

## Migration from v8
If you have existing v8 data, run:
```powershell
python db_setup.py
# Answer 'y' when prompted to migrate
```
Old data is preserved in `sessions_v8` table.
