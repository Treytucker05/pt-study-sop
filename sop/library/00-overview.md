# PT Study OS -- Overview

**Version:** v10.0
**Owner:** Trey Tucker

## What This Is

A structured AI study operating system for DPT coursework. It enforces an end-to-end study flow -- plan, learn, test, log, review -- grounded in the learner's own materials. The system runs as a Flask dashboard with a React frontend (retro arcade theme) backed by canonical SOP files, a composable method library (YAML), and a RAG-indexed document store.

## North Star Vision

- **Durable context** -- remembers across sessions with no drift.
- **End-to-end study flows** -- Wizard startup → Chain execution → Wrap, with minimal manual steps.
- **RAG-first, citation-first** -- all generated content grounded in the learner's indexed materials. Unverified outputs are explicitly marked.
- **Spaced, high-quality Anki cards** -- source-tagged, deduplicated, retained over years.
- **Deterministic logging** -- every session emits a Session Ledger; JSON is produced via Brain ingestion, not by the tutor.
- **No Phantom Outputs** -- if a step didn't happen, output NOT DONE / UNKNOWN; never invent.

For the theoretical foundation and PPFW paradigm stack underlying this system, see [VISION_PPFW.md](../../docs/root/VISION_PPFW.md).

## Lifecycle: Wizard → Chain → Wrap

Sessions are driven by the **Tutor Wizard** (3-step startup) and a **Method Chain** (ordered sequence of method blocks). The legacy M0-M6 naming is retired.

| Phase | What Happens | CP Stage Tags |
|-------|-------------|---------------|
| **Wizard** | Select course, upload materials, pick chain, choose mode | CONTROL PLANE (setup) |
| **Chain Execution** | Tutor walks the learner through each block in order | PRIME → CALIBRATE → ENCODE → REFERENCE → RETRIEVE (per block tags) |
| **Wrap** | Exit Ticket + Session Ledger | OVERLEARN → CONTROL PLANE (exit) |

### PEIRRO Compatibility

PEIRRO categories (`prepare`, `encode`, `interrogate`, `retrieve`, `refine`, `overlearn`) remain canonical in YAML schemas and validators. Each method block carries a PEIRRO `category` tag. Chains sequence blocks across these categories.

## Quick-Start: Study Session

1. Open the Dashboard (`http://127.0.0.1:5000/tutor`).
2. **Wizard Step 1 — Course & Materials:** Select course, set Prime Scope, choose Obsidian save folder, upload/attach source files.
3. **Wizard Step 2 — Chain:** Pick a template chain, build a custom chain, or let the system auto-select based on context.
4. **Wizard Step 3 — Start:** Confirm mode (Core/Sprint/Drill/Light/Quick Sprint) and launch.
5. Tutor executes each block in the chain sequentially, enforcing tutor rules (`01-core-rules.md`).
6. At Wrap, output **Exit Ticket + Session Ledger** (no JSON, no spacing schedule).
7. Copy Exit Ticket + Session Ledger into Brain ingestion prompts (see `10-deployment.md`) to produce JSON logs.

## Architecture (Stable Components)

1. **Dashboard + Tutor Wizard** -- Flask backend (port 5000), React frontend, 3-step wizard for session startup.
2. **Content Pipeline** -- normalize, transcode, transcribe, index course docs.
3. **RAG Index & Search** -- ingest API; returns snippets + citations.
4. **Study Engine (SOP Runner)** -- enforces tutor rules, chain execution, Seed-Lock, and deterministic stage contracts.
5. **Composable Method Library** -- 46 method blocks (YAML) + 15 template chains. See `15-method-library.md`.
6. **Card/Anki Bridge** -- add/update cards; dedupe by deck+guid; source-tag.
7. **Brain (DB + Resume)** -- ingest session logs; generate resume/readiness; versioned schemas.
8. **Multi-AI Router** -- route by task; audit model+tool used.

## Library File Map

| # | File | Description |
|---|------|-------------|
| 00 | `00-overview.md` | System identity, vision, quick-start, and library map (this file) |
| 01 | `01-core-rules.md` | All behavioral rules the tutor must follow |
| 02 | `02-learning-cycle.md` | Control-plane stage tags + PEIRRO compatibility + KWIK encoding micro-loop |
| 03 | `03-frameworks.md` | H/M/Y series, Levels |
| 04 | `04-engines.md` | Anatomy Engine and Concept Engine |
| 05 | `05-session-flow.md` | Wizard → Chain → Wrap session flow |
| 06 | `06-modes.md` | Operating modes (Core, Sprint, Light, Quick Sprint, Drill) |
| 07 | `07-workload.md` | 3+2 rotational interleaving, sandwich, spacing |
| 08 | `08-logging.md` | Logging schema v9.4 (schema reference; JSON produced via Brain ingestion) |
| 09 | `09-templates.md` | Exit ticket, session ledger, weekly plan/review templates |
| 10 | `10-deployment.md` | Dashboard deployment guide + Brain ingestion prompts |
| 11 | `11-examples.md` | Command reference and dialogue examples |
| 12 | `12-evidence.md` | Evidence base, NotebookLM bridge, research backlog |
| 14 | `14-lo-engine.md` | Learning Objective Engine (LO Engine) protocol pack + outputs |
| 15 | `15-method-library.md` | Composable Method Library: blocks, chains, ratings, context matching |
| 17 | `17-control-plane.md` | Control plane selector, coverage map, stage gates, adaptation, override policy |

## Schemas / Contracts

- **Session Log v9.4:** Tracker + Enhanced JSON schemas. Full field reference in `08-logging.md`. JSON produced via Brain ingestion, not at Wrap. Additive-only changes unless Master Plan is updated.
- **Method Block YAML:** `{id, name, category, description, duration, energy_cost, best_stage, tags[], evidence}`. See `15-method-library.md`.
- **Chain YAML:** `{id, name, description, blocks[], context_tags{}, is_template, status}`. See `sop/library/chains/`.
- **RAG Doc v1:** `{id, source_path, course, module, doc_type, created_at, checksum, text_chunks[], image_captions[], metadata{}}`.
- **Card v1:** `{deck, guid, front, back, tags[], source_refs[], created_at, updated_at}`.
- **Resume v1:** `{generated_at, readiness_score, recent_sessions[], topic_coverage[], gaps[], recommendations[]}`.

---

## Governance

- Any change to Vision, Invariants, Architecture, or Schemas requires editing this file.
- New fields must be additive and documented; DB migrations must be provided when schemas change.
- PR checklist: Does this break an invariant/contract? If yes, update Master Plan or reject.

### Version History
- **v10.0** (2026-02-28): Wizard + Chain model. Retired M0-M6 naming. Updated architecture to reflect Flask dashboard + React frontend.
- **v9.5** (2026-02-07): M0 split-track. Material Ingestion folded into Track A (first exposure). No schema changes.
- **v9.4** (2026-01-15): Lite Wrap, Session Ledger, No Phantom Outputs, Composable Method Library.

---

## Roadmap Ladder (Fixed Rungs)

1. Download/organize course docs.
2. Transcode/transcribe + index (text+images).
3. RAG-backed SOP: answers/cards cite sources (no free hallucination).
4. Card bridge hardening: dedupe/queues/offline fallback/source tags.
5. Dashboard & spacing: coverage, readiness, spacing alerts, calibration.
6. Multi-AI router with audit/fallbacks.
7. Automation/scheduling: daily sync, ingest, resume, spaced notifications.
8. LO Engine integration into Wizard (auto-extract LOs from uploaded materials).

---

## Operational Minimums

- Session template enforced; ingestion + resume generation work.
- RAG reachable; if offline, mark outputs as unverified.
- One-command sync (downloads + ingest + resume).
- Health checks: content fetch, RAG search, Anki connect, DB integrity.
- Chain selection during Wizard includes interleaving check of prior weak anchors.

---

## Program Goals

- **Current semester:** Zero missing session logs; each session logs what worked/what didn't; draft cards in ≥30% of sessions.
- **Semester midpoint:** Stable loop (plan → learn → log → card draft); off-source drift <5%; weekly readiness/test-score trend.
- **Calendar sync:** Design only; build after semester ends (lowest priority).

---

## Source of Truth

Canonical content lives in `sop/library/`. Runtime bundles in `sop/runtime/` are generated artifacts. If any file conflicts with canonical source, canonical wins. Do not edit runtime files directly.