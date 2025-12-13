> Runtime Canon is sop/gpt-knowledge/
> If this document conflicts with Runtime Canon, Runtime Canon wins.
> This README points to releases; runtime canon is in sop/gpt-knowledge/

## Repository Authority Chain

- Runtime Canon = `sop/gpt-knowledge/`.
- Release snapshots are frozen copies.
- If conflict: Runtime Canon wins.

# PT Study SOP

A structured study system for Doctor of Physical Therapy coursework, powered by the PERRIO protocol.

## Current Version: 9.1 "Structured Architect + Anatomy Engine"

**Master Plan (North Star):** See `sop/MASTER_PLAN_PT_STUDY.md` for the stable vision, invariants, and contracts every release must honor.

---

## Quick Start

**Everything you need is in:** `releases/v9.1/`

1. Open `releases/v9.1/README.md` for setup instructions
2. From the repo root, run `python brain/db_setup.py` (Brain lives in the root repo; it is **not packaged** inside releases)
3. Copy `GPT-INSTRUCTIONS.md` into your CustomGPT
4. Upload all files from `gpt-knowledge/` to GPT Knowledge (or just upload the combined `PT_Study_SOP_v9.1_ALL.md` bundle)
5. Start studying

**One-click launcher:** Run `Run_Brain_All.bat` (repo root) to sync logs, regenerate resume, start the dashboard server, and open http://127.0.0.1:5000 automatically. Keep the new "PT Study Brain Dashboard" window open while using the site.

**Release preparation:** Before cutting a new release, run `python scripts/release_check.py` and follow `docs/release/RELEASE_PROCESS.md`.

---

## Repository Structure

pt-study-sop/
- v9.1/ (current release bundle)
- sop/ (source / development)
  - MASTER_PLAN_PT_STUDY.md
  - RESEARCH_TOPICS.md
  - modules/
  - frameworks/
  - methods/
  - examples/
  - working/ (dev notes, PLAN_v9.2_dev.md)
- brain/ (brain system)
  - data/, output/, session_logs/
  - tests/ (brain unit tests)
- LEGACY VERSIONS/ (frozen legacy sets; referenced by SOP library)

### Library & Versions (inside `sop/`)
- Current source: modules/frameworks/methods/examples; research notes in modules/research/.
- Legacy references: version-tagged files in protocols/, modes/, engines/, examples/, frameworks/, mechanisms/, prompts/, versions/ (sourced from LEGACY VERSIONS/).
- Planning/Improvements: sop/working/ (ROADMAP, PLAN_v9.2_dev with approved v9.2 enhancements; Next Session Checklist).

---

## Core Concepts

| Concept | What It Means |
|---------|---------------|
| **Seed-Lock** | You must provide your own hook/metaphor before moving on |
| **Function Before Structure** | Learn what it DOES before where it IS |
| **Level Gating** | Prove understanding at L2 (teach-back) before advancing |
| **Gated Platter** | If stuck, GPT offers raw metaphor you must personalize |
| **Planning First** | No teaching until target + sources + plan established |
| **Anatomy Order** | Bones -> Landmarks -> Attachments -> OIAN -> Clinical |

---

## Study Modes

| Mode | When to Use |
|------|-------------|
| **Core** | New material, guided learning |
| **Sprint** | Test-first, rapid recall practice |
| **Drill** | Deep practice on specific weakness |

---

## What's New in v9.1

- **Planning Phase (M0):** Mandatory target/sources/plan before teaching
- **Anatomy Engine:** Bone-first protocol with visual landmark recognition
- **Rollback Rule:** Return to landmarks if OIAN struggles
- **Drawing Protocol:** AI-generated drawing instructions for anatomy
- **Condensed GPT Instructions:** Under 8k character limit
- **Packaged Release:** All files in `releases/v9.1/`

---

## Documentation

| Document | Purpose |
|----------|---------|
| `releases/v9.1/README.md` | Setup and usage guide |
| `sop/MASTER.md` | Complete system reference |
| `sop/MASTER_PLAN_PT_STUDY.md` | Stable North Star vision/invariants/contracts |
| `sop/CHANGELOG.md` | Version history |
| `sop/RESEARCH_TOPICS.md` | Learning science research topics |
| `sop/working/ROADMAP.md` | Current gaps and next steps |

---

## Housekeeping (safe deletes)
- __pycache__/, .pytest_cache/ (auto-regenerated)
- brain/data/, brain/output/, brain/session_logs/ (generated; back up logs before deleting)

## Links
- GitHub: https://github.com/Treytucker05/pt-study-sop
- Current Release: releases/v9.1/






