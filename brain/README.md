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

---

## Directory Structure

```
brain/
â”œâ”€â”€ config.py              â† Configuration settings
â”œâ”€â”€ db_setup.py            â† Database initialization
â”œâ”€â”€ ingest_session.py      â† Parse logs â†’ database
â”œâ”€â”€ generate_resume.py     â† Generate session resume
â”œâ”€â”€ README.md              â† This file
â”œâ”€â”€ session_logs/          â† Your session logs
â”‚   â””â”€â”€ TEMPLATE.md        â† Copy this for each session
â”œâ”€â”€ data/                  â† Database storage
â”‚   â””â”€â”€ pt_study.db        â† SQLite database
â””â”€â”€ output/                â† Generated files
    â””â”€â”€ session_resume.md  â† Resume for GPT context
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
- `target_exam` â€” Exam/block being studied for
- `source_lock` â€” Materials used in session
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
| `../Run_Brain_Sync.bat` |Run_Brain_Sync.bat | One-click daily sync: move stray logs + ingest all + regenerate resume |
| ../Run_Brain_All.bat | One-click: sync + resume + start dashboard and open browser (http://127.0.0.1:5000) |

---

## Migration from v8

If you have existing v8 data, run:
```powershell
python db_setup.py
# Answer 'y' when prompted to migrate
```

Old data is preserved in `sessions_v8` table.

