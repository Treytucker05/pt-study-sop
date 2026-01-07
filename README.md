# PT Study SOP

A structured study system for Doctor of Physical Therapy coursework, powered by the PEIRRO protocol.

## Source of Truth / Authority Chain

- Runtime Canon: `sop/gpt-knowledge/` (authoritative for all instructions).
- Packaged bundle present in this repo: `v9.2/` (development snapshot). If anything conflicts, the Runtime Canon wins.
- Release snapshots are frozen copies when present; they remain subordinate to the Runtime Canon.

**Master Plan (North Star):** See `sop/MASTER_PLAN_PT_STUDY.md` for the stable vision, invariants, and contracts every release must honor.

---

## Quick Start

1. Read `sop/gpt-knowledge/README.md`.
2. Paste `sop/gpt-knowledge/gpt-instructions.md` into your Custom GPT system instructions.
3. Upload `sop/gpt-knowledge/` files in the order listed in `BUILD_ORDER.md`.
4. Content retrieval is done via NotebookLM; paste a NotebookLM Source Packet into the Custom GPT when asked.
5. Paste `sop/gpt-knowledge/runtime-prompt.md` at the start of each session.
6. Run `python brain/db_setup.py` (or `Run_Brain_All.bat`) from the repo root for Brain setup.

**One-click launcher:** Run `Run_Brain_All.bat` (repo root) to sync logs, regenerate resume, start the dashboard server, and open http://127.0.0.1:5000 automatically. Keep the new "PT Study Brain Dashboard" window open while using the site.

**Release preparation:** Before cutting a new release, run `python scripts/release_check.py` and follow `docs/release/RELEASE_PROCESS.md`.

**Validation:** Run `python -m pytest brain/tests` from the repo root; CI runs the same command on pushes and pull requests.

---

## Repository Structure

pt-study-sop/
- v9.2/ (development snapshot bundle)
- sop/ (source / development; Runtime Canon in `sop/gpt-knowledge/`)
  - MASTER_PLAN_PT_STUDY.md
  - RESEARCH_INDEX.md
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
| `sop/gpt-knowledge/MASTER.md` | Complete system reference |
| `sop/MASTER_PLAN_PT_STUDY.md` | Stable North Star vision/invariants/contracts |
| `sop/MASTER_REFERENCE_v9.2.md` | Detailed reference for the v9.2 development snapshot |
| `sop/RESEARCH_INDEX.md` | Learning science research topics and sourcing |
| `sop/working/ROADMAP.md` | Current gaps and next steps |

---

## Housekeeping (safe deletes)
- __pycache__/, .pytest_cache/ (auto-regenerated)
- brain/data/, brain/output/, brain/session_logs/ (generated; back up logs before deleting)

## Links
- GitHub: https://github.com/Treytucker05/pt-study-sop
- Development snapshot bundle: v9.2/






