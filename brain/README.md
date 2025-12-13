# PT Study Brain v9.1

Session tracking and analytics system for the PT Study SOP.

Brain logs and WRAP activities map to the PEIRRO learning cycle (Prepare, Encode, Refine, Overlearn) for documentation clarity only.

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

---

## Directory Structure

```
brain/
|-- config.py              -> Configuration settings
|-- db_setup.py            -> Database initialization
|-- ingest_session.py      -> Parse logs -> database
|-- generate_resume.py     -> Generate session resume
|-- README.md              -> This file
|-- session_logs/          -> Your session logs
|   `-- TEMPLATE.md        -> Copy this for each session
|-- data/                  -> Database storage
|   `-- pt_study.db        -> SQLite database
`-- output/                -> Generated files
    `-- session_resume.md  -> Resume for GPT context
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

The resume generator provides:

- **Readiness Score** (0-100) based on coverage, understanding, confidence
- **Recent Sessions** with ratings and regions
- **Topic Coverage** with freshness indicators (FRESH/FADING/STALE)
- **Anatomy Coverage** by region with landmarks/muscles
- **Weak Areas** needing attention
- **Recommended Focus** for next session

---

## Database Schema (v9.1)

Key fields added in v9.1:
- `target_exam` - Exam/block being studied for
- `source_lock` - Materials used in session
- `plan_of_attack` - Session plan
- `region_covered` - Anatomy region
- `landmarks_mastered` - Landmarks learned
- `muscles_attached` - Muscles mapped
- `oian_completed_for` - Full OIAN completed
- `rollback_events` - Whether rollback occurred
- `drawing_used` - Whether drawing was used
- `calibration_check` - Confidence vs actual performance
- `off_source_drift` - Whether you left declared sources
- `source_snippets_used` - Whether source snippets were captured
- `weak_anchors` - Anchors needing cards in WRAP

---

## Commands

| Command | What It Does |
|---------|--------------|
| `python db_setup.py` | Initialize or migrate database |
| `python ingest_session.py <file>` | Add session to database |
| `python generate_resume.py` | Generate resume for next session |
| `python config.py` | Show configuration |
| `../Run_Brain_Sync.bat` | One-click daily sync: move stray logs + ingest all + regenerate resume |
| `../Run_Brain_All.bat` | One-click: sync + resume + start dashboard and open browser (http://127.0.0.1:5000) |

---

## Migration from v8

If you have existing v8 data, run:
```powershell
python db_setup.py
# Answer 'y' when prompted to migrate
```

Old data is preserved in `sessions_v8` table.
