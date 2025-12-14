# PT Study SOP

A structured study system for Doctor of Physical Therapy coursework, powered by the PEIRRO protocol.

## Source of Truth

- Runtime Canon: `sop/gpt-knowledge/`.
- If any document conflicts with the Runtime Canon, the Runtime Canon wins.
- Packaged bundle present in this repo: `v9.2/` (development snapshot). Runtime Canon remains authoritative when versions diverge.

## Repository Authority Chain

- Runtime Canon = `sop/gpt-knowledge/`.
- Release snapshots (for example, `v9.2/`) are frozen copies when present.
- If conflict: Runtime Canon wins.

**Master Plan (North Star):** See `sop/MASTER_PLAN_PT_STUDY.md` for the stable vision, invariants, and contracts every release must honor.

---

## Quick Start

**Runtime canon lives in:** `sop/gpt-knowledge/`

1. Open `sop/gpt-knowledge/README.md` for setup instructions
2. From the repo root, run `python brain/db_setup.py` (Brain lives in the root repo; it is **not packaged** inside releases)
3. Copy `sop/gpt-knowledge/gpt-instructions.md` into your CustomGPT system instructions
4. Upload `sop/gpt-knowledge/` following `BUILD_ORDER.md`, and paste `runtime-prompt.md` at session start
5. Start studying

**One-click launcher:** Run `Run_Brain_All.bat` (repo root) to sync logs, regenerate resume, start the dashboard server, and open http://127.0.0.1:5000 automatically. Keep the new "PT Study Brain Dashboard" window open while using the site.

**Release preparation:** Before cutting a new release, run `python scripts/release_check.py` and follow `docs/release/RELEASE_PROCESS.md`.

---

## Repository Structure

pt-study-sop/
- v9.2/ (current development bundle)
- sop/ (source / development; Runtime Canon in `sop/gpt-knowledge/`)
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

## Highlights from the current canon (v9.2 development snapshot)

- **Planning Phase (M0):** Mandatory target/sources/plan before teaching
- **Anatomy Engine:** Bone-first protocol with visual landmark recognition
- **Rollback Rule:** Return to landmarks if OIAN struggles
- **Drawing Protocol:** AI-generated drawing instructions for anatomy
- **Condensed GPT Instructions:** Under 8k character limit
- **Packaged Release:** Bundled copies are produced when available; Runtime Canon stays authoritative.

---

## Documentation

| Document | Purpose |
|----------|---------|
| `sop/gpt-knowledge/README.md` | Setup and usage guide (Runtime Canon) |
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
- Current Development Bundle: v9.2/






