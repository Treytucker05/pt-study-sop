# PT Study SOP v9.1 Release Package

Everything you need to set up and run the PT Study Tutor system.

---

## Quick Setup

### 1. Create CustomGPT

**Instructions field:** Copy contents of `GPT-INSTRUCTIONS.md` (paste as text, don't upload)

**Knowledge files:** Upload ALL 14 files from the `gpt-knowledge/` folder

### 2. Set Up Brain (Session Tracking)

```powershell
cd releases/v9.1/brain
python db_setup.py
```

### 3. Start Studying

Open your CustomGPT and say: "Let's study"

---

## Where to Find Roadmap & Tasks

- **Open gaps:** See the project-level roadmap in [`GAP_ANALYSIS.md`](../../GAP_ANALYSIS.md).
- **Active to-do list:** Immediate/short/medium-term work is tracked in [`NEXT_STEPS.md`](../../NEXT_STEPS.md).

Use these two documents to align feature work (e.g., dashboard, new engines, tests) with the packaged release.

---

## Folder Contents

```
v9.1/
├── GPT-INSTRUCTIONS.md      ← Copy into GPT Instructions field
├── gpt-knowledge/           ← Upload ALL files to GPT Knowledge
│   ├── MASTER.md
│   ├── runtime-prompt.md
│   ├── M0-planning.md
│   ├── M1-entry.md
│   ├── M2-prime.md
│   ├── M3-encode.md
│   ├── M4-build.md
│   ├── M5-modes.md
│   ├── M6-wrap.md
│   ├── anatomy-engine.md
│   ├── H-series.md
│   ├── M-series.md
│   ├── levels.md
│   └── drawing-for-anatomy.md
├── brain/                   ← Session tracking system
│   ├── config.py
│   ├── db_setup.py
│   ├── ingest_session.py
│   ├── generate_resume.py
│   ├── README.md
│   ├── session_logs/
│   │   └── TEMPLATE.md
│   ├── data/                ← Database goes here
│   └── output/              ← Resume output goes here
└── README.md                ← This file
```

---

## Usage Workflow

### Before Session
```powershell
cd brain
python generate_resume.py    # Optional: get context from past sessions
```

### During Session
1. Open CustomGPT
2. Say "Let's study" or paste topic
3. Complete Planning Phase (target, sources, plan)
4. Study with Seed-Lock enforcement
5. Say "wrap" when done
6. Copy the session summary

### After Session
1. Create log file: `brain/session_logs/YYYY-MM-DD_topic.md`
2. Fill in from TEMPLATE.md using GPT's summary
3. Ingest to database:
```powershell
cd brain
python ingest_session.py session_logs/YYYY-MM-DD_topic.md
```

---

## Key Commands (During GPT Session)

| Command | Action |
|---------|--------|
| `plan` | Run planning phase |
| `sprint` | Switch to test-first mode |
| `core` | Switch to guided mode |
| `drill` | Switch to deep practice mode |
| `landmark` | Visual landmark protocol |
| `rollback` | Return to landmarks |
| `draw` | Get drawing instructions |
| `wrap` | End session |
| `skip` | Next item |

---

## Core Rules

1. **Seed-Lock** — You must provide your own hook/metaphor before moving on
2. **Function Before Structure** — Learn what it DOES before where it IS
3. **Level Gating** — Prove L2 (teach-back) before advancing
4. **Planning First** — No teaching until target + sources + plan established
5. **Anatomy Order** — Bones → Landmarks → Attachments → OIAN → Clinical

---

## Version Info

- Version: 9.1 "Structured Architect + Anatomy Engine"
- Date: 2025-12-05
- Schema: v9.1 (Brain database)
