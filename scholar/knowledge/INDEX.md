# PT STUDY SOP - SCHOLAR KNOWLEDGE INDEX
**Last Updated:** January 2026  
**Source:** Full repo audit of C:\pt-study-sop

---

## FILES IN THIS FOLDER

| File | Lines | Content |
|------|-------|---------|
| `PT_STUDY_SOP_MASTER_OVERVIEW_v9.3.md` | 492 | Complete system reference |
| `MODULES_M0-M6_REFERENCE.md` | 389 | Detailed module protocols |
| `PT_STUDY_SOP_SUPPLEMENTAL.md` | 784 | Templates, examples, research, troubleshooting, methods |
| `PT_STUDY_SOP_REFERENCE_v9.2.md` | 216 | **DEPRECATED** - older version |

---

## WHAT'S COVERED

### Master Overview (v9.3)
- PEIRRO learning cycle
- KWIK encoding flow
- M0-M6 session phases (summary)
- Level gating (L1-L4)
- H/M/Y frameworks
- Anatomy Engine (OIANA+)
- Concept Engine
- 5 Modes (Core/Sprint/Drill/Light/Quick Sprint)
- Workload management (3+2 rotation, Ingestion Sandwich)
- Spaced retrieval (1-3-7-21)
- Metrics & logging (JSON schemas)
- Source verification (NotebookLM)
- Commands reference
- Evidence base

### Modules Reference
- M0: Planning (8-step protocol, checklists)
- M1: Entry (state check, mode selection)
- M2: Prime (H1 scan, bucketing, Ingestion Sandwich)
- M3: Encode (KWIK flow, toolkit)
- M4: Build (practice ladder, level gating, fading)
- M5: Modes (behaviors, switching heuristics)
- M6: Wrap (exit ticket, metrics, JSON output)
- Flow diagrams

### Supplemental
- Templates (weekly plan, weekly review, intake, metrics)
- Dialogue examples (Gated Platter, Sprint)
- Learning science methods (retrieval, desirable difficulties, elaboration, metacognition, drawing)
- Research backlog (open questions)
- Master Plan summary (vision, invariants, status)
- Evidence base (cited + heuristics)
- **Troubleshooting guide** (stuck detection, fix escalation, problem patterns)
- **Research notes by module** (M0-M6 with citations)
- **Legacy concepts** (NMMF hooks, HookStyles, confidence flags, triage modes)
- **Deployment checklist** (upload order, success criteria)
- **Logging schema v9.3** (Tracker JSON, Enhanced JSON, field definitions)
- **WRAP operator script** (anchor review, card selection, co-creation)
- **NotebookLM bridge** (source packet format, hard rule)
- **Core protocol flow** (MAP→LOOP step summary)

---

## AUDIT SUMMARY

### Total Files Scanned
- 251 markdown files in sop/ folder
- 674 markdown files in entire repo

### Canonical Sources (Current)
| Location | Content |
|----------|---------|
| `sop/src/modules/` | M0-M6 protocols |
| `sop/src/frameworks/` | PEIRRO, KWIK, H/M/Y, Levels |
| `sop/src/engines/` | Anatomy, Concept engines |
| `sop/src/templates/` | All templates |
| `sop/src/evidence/` | Research, citations |
| `sop/src/workload/` | 3+2 rotation |
| `sop/logging_schema_v9.3.md` | JSON schema |
| `sop/runtime/` | Runtime prompt, custom instructions |
| `gpt_bundle_v9.3/` | Production GPT files |

### Legacy/Archive (Can Delete)
| Location | Status |
|----------|--------|
| `sop/archive/old_runtime/` | Superseded by v9.3 |
| `sop/archive/library/versions/v8.6/` | Obsolete |
| `sop/archive/library/versions/v9.1/` | Superseded |
| `sop/archive/legacy/` | All obsolete |
| `v9.2/` (root) | Merged into v9.3 |
| `dist/` | Old exports |

### Cleanup Completed (January 2026)

**Deleted:**
- `sop/archive/` - 251 legacy files (content extracted to supplemental)
- `v9.2/` root folder - superseded by v9.3
- `dist/` folder - old exports
- `PT_STUDY_SOP_REFERENCE_v9.2.md` - superseded by v9.3 master overview

**Preserved:**
- `sop/src/` - canonical v9.3 sources
- `sop/examples/` - dialogue examples
- `sop/runtime/` - deployment files
- `gpt_bundle_v9.3/` - production GPT files
- All scholar knowledge files

---

## WHAT'S NEW IN v9.3 (vs v9.2)

1. **Ingestion Sandwich** — Pre/Active/Post lecture phases
2. **Enhanced JSON logging** — Tracker + Enhanced with specific fields
3. **Exit Ticket mandatory** — Blurt, muddiest, next action
4. **Calibration metrics** — RSR%, calibration gap, cognitive load
5. **3+2 weekly rotation** — Cluster system for classes
6. **Confusables list** — Explicit discrimination items
7. **Retrospective timetable** — R/Y/G status tracking
8. **Evidence nuances** — No numeric claims without citations

---

## RECOMMENDATIONS

### Keep
- All `sop/src/` content (canonical)
- `gpt_bundle_v9.3/` (production)
- `sop/examples/` (good dialogues)
- `sop/archive/library/methods/` (learning science)
- Scholar knowledge files (this folder)

### Delete (Optional Cleanup)
- `sop/archive/old_runtime/`
- `sop/archive/library/versions/v8.6/`
- `sop/archive/legacy/`
- `v9.2/` folder at root
- `dist/` old exports
- `PT_STUDY_SOP_REFERENCE_v9.2.md` in this folder

### Update
- Nothing missing from v9.3 canonical sources

---

*Index for scholar/knowledge/ folder*
