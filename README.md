# PT Study SOP v9.1

AI-assisted active learning system for DPT students. Enforces structured protocols while adapting to your knowledge state.

## Quick Start

1. **Set up CustomGPT:** Copy `sop/gpt-instructions.md` into your GPT's system prompt
2. **Start a session:** Paste `sop/runtime-prompt.md` at the beginning of each conversation
3. **Log sessions:** Use `brain/session_logs/TEMPLATE.md` after each study session
4. **Run tests (optional):** From the repo root, install pytest (`pip install pytest`) and execute `pytest`

## Structure

```
pt-study-sop/
├── sop/                    ← The study system
│   ├── MASTER.md           ← Full reference documentation
│   ├── gpt-instructions.md ← CustomGPT system prompt
│   ├── runtime-prompt.md   ← Session start script
│   ├── modules/
│   │   ├── M0-planning.md  ← Planning phase (NEW)
│   │   ├── M1-M6           ← Protocol steps
│   │   └── anatomy-engine.md ← Anatomy-specific protocol (NEW)
│   ├── frameworks/         ← H-Series, M-Series, Levels
│   ├── methods/            ← Learning science foundations
│   └── examples/           ← Dialogue examples
├── brain/                  ← Analytics & tracking
│   ├── README.md           ← Brain documentation
│   ├── session_logs/       ← Your logged sessions
│   └── [Python scripts]    ← Dashboard, resume, ingest
└── archive/                ← Previous versions
```

## Core Concepts

- **Planning Phase:** Target + Sources + Plan BEFORE teaching
- **Seed-Lock:** You supply the hook/metaphor, not the AI
- **Gated Platter:** If stuck, AI offers raw material you must edit
- **Phonetic Override:** "What does this sound like?" before defining
- **Level Gating:** Must teach-back at L2 before L4 clinical depth
- **Function First:** Know what it DOES before what it IS

## Anatomy Learning Engine (NEW in v9.1)

**Mandatory order for anatomy:**
```
BONES → LANDMARKS → ATTACHMENTS → OIAN → CLINICAL
```

**Key rules:**
- Visual-first landmark recognition (shape, position, neighbors)
- No OIAN until landmark map is solid
- Rollback to landmarks if struggling with muscles

## Modes

| Mode | When | Behavior |
|------|------|----------|
| Core | New material | AI guides, full protocol |
| Sprint | Exam prep | Test-first, teach on miss |
| Drill | Weak areas | User-led reconstruction |

## Documentation

- `sop/MASTER.md` — Complete system reference
- `sop/modules/anatomy-engine.md` — Anatomy learning protocol
- `brain/README.md` — Analytics and tracking guide
- `sop/methods/` — Learning science foundations

## Version

**v9.1 "Structured Architect + Anatomy Engine"** — December 2025

New in v9.1:
- M0 Planning Phase (front-loaded planning)
- Anatomy Learning Engine (bone-first, visual-first)
- Source-Lock mechanism
- Rollback Rule for anatomy struggles
