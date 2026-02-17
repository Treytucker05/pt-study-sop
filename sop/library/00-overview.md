# PT Study OS -- Overview

**Version:** v9.5
**Owner:** Trey Tucker

## What This Is

A structured AI study operating system for DPT coursework. It enforces an end-to-end study flow -- plan, learn, test, log, review -- grounded in the learner's own materials. The system runs as a Custom GPT tutor backed by canonical SOP files.

## North Star Vision

- **Durable context** -- remembers across sessions with no drift.
- **End-to-end study flows** -- CONTROL PLANE -> PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN -> CONTROL PLANE with minimal manual steps.
- **RAG-first, citation-first** -- all generated content grounded in the learner's indexed materials. Unverified outputs are explicitly marked.
- **Spaced, high-quality Anki cards** -- source-tagged, deduplicated, retained over years.
- **Deterministic logging** -- every session emits a Session Ledger; JSON is produced via Brain ingestion, not by the tutor.
- **No Phantom Outputs** -- if a step didn't happen, output NOT DONE / UNKNOWN; never invent.

For the theoretical foundation and PPFW paradigm stack underlying this system, see [VISION_PPFW.md](../../docs/root/VISION_PPFW.md).

## Lifecycle

| Phase | Modules | PEIRRO Alignment | Operational Stage Overlay |
|-------|---------|------------------|-------------------------|
| **MAP** | M0 Planning, M1 Entry | Prepare | CONTROL PLANE entry -> PRIME -> CALIBRATE |
| **LOOP** | M2 Prime, M3 Encode, M4 Build, M5 Modes | Encode, Interrogate, Retrieve | ENCODE -> REFERENCE -> RETRIEVE |
| **WRAP** | M6 Wrap | Refine, Overlearn | OVERLEARN -> CONTROL PLANE exit |

## Quick-Start: Study Session

1. Paste `sop/runtime/runtime_prompt.md` at session start.
2. Complete M0 Planning: Exposure Check → Track A (first exposure) or Track B (review). See `05-session-flow.md`.
3. Run the session through M1-M6.
4. At Wrap, output **Exit Ticket + Session Ledger** (no JSON, no spacing schedule).
5. Copy Exit Ticket + Session Ledger into Brain ingestion prompts (see `10-deployment.md`) to produce JSON logs.

## Architecture (Stable Components)

1. **Orchestration Agent** -- accepts NL tasks, calls tools with audit trail.
2. **Content Pipeline** -- normalize, transcode, transcribe, index course docs.
3. **RAG Index & Search** -- ingest API; returns snippets + citations.
4. **Study Engine (SOP Runner)** -- enforces control-plane gates, MAP->LOOP->WRAP, Seed-Lock, and deterministic stage contracts.
5. **Card/Anki Bridge** -- add/update cards; dedupe by deck+guid; source-tag.
6. **Brain (DB + Resume)** -- ingest session logs; generate resume/readiness; versioned schemas.
7. **Multi-AI Router** -- route by task; audit model+tool used.
8. **Dashboard** -- read-only views of coverage, spacing, calibration, cards.

## Library File Map

| # | File | Description |
|---|------|-------------|
| 00 | `00-overview.md` | System identity, vision, quick-start, and library map (this file) |
| 01 | `01-core-rules.md` | All behavioral rules the tutor must follow |
| 02 | `02-learning-cycle.md` | Control-plane operational flow + PEIRRO compatibility + KWIK encoding micro-loop |
| 03 | `03-frameworks.md` | H/M/Y series, Levels |
| 04 | `04-engines.md` | Anatomy Engine and Concept Engine |
| 05 | `05-session-flow.md` | M0-M6 execution flow, planning through Wrap |
| 06 | `06-modes.md` | Operating modes (Core, Sprint, Light, Quick Sprint, Drill) |
| 07 | `07-workload.md` | 3+2 rotational interleaving, sandwich, spacing |
| 08 | `08-logging.md` | Logging schema v9.4 (schema reference; JSON produced via Brain ingestion) |
| 09 | `09-templates.md` | Exit ticket, session ledger, weekly plan/review templates |
| 10 | `10-deployment.md` | Custom GPT deployment guide + Brain ingestion prompts |
| 11 | `11-examples.md` | Command reference and dialogue examples |
| 12 | `12-evidence.md` | Evidence base, NotebookLM bridge, research backlog |
| 13 | `13-custom-gpt-system-instructions.md` | Custom GPT system instructions (v9.5 Split-Track) |
| 14 | `14-lo-engine.md` | Learning Objective Engine (LO Engine) protocol pack + outputs |
| 15 | `15-method-library.md` | Composable Method Library: blocks, chains, ratings, context matching |
| 17 | `17-control-plane.md` | Control plane selector, coverage map, stage gates, adaptation, override policy |

## Schemas / Contracts

- **Session Log v9.4:** Tracker + Enhanced JSON schemas. Full field reference in `08-logging.md`. JSON produced via Brain ingestion, not at Wrap. Additive-only changes unless Master Plan is updated.
- **RAG Doc v1:** `{id, source_path, course, module, doc_type, created_at, checksum, text_chunks[], image_captions[], metadata{}}`.
- **Card v1:** `{deck, guid, front, back, tags[], source_refs[], created_at, updated_at}`.
- **Resume v1:** `{generated_at, readiness_score, recent_sessions[], topic_coverage[], gaps[], recommendations[]}`.

---

## Governance

- Any change to Vision, Invariants, Architecture, or Schemas requires editing this file.
- Version plans (e.g., v9.2) may adjust scope but cannot violate invariants/contracts.
- New fields must be additive and documented; DB migrations must be provided when schemas change.
- PR checklist: Does this break an invariant/contract? If yes, update Master Plan or reject.

### Version History
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

---

## Operational Minimums

- Session template enforced; ingestion + resume generation work.
- RAG reachable; if offline, mark outputs as unverified.
- One-command sync (downloads + ingest + resume).
- Health checks: content fetch, RAG search, Anki connect, DB integrity.
- Planning phase includes an interleaving check of prior weak anchors.

---

## Program Goals

- **Current semester:** Zero missing session logs; each session logs what worked/what didn't; draft cards in ≥30% of sessions.
- **Semester midpoint:** Stable loop (plan → learn → log → card draft); off-source drift <5%; weekly readiness/test-score trend.
- **Calendar sync:** Design only; build after semester ends (lowest priority).

---

## Source of Truth

Canonical content lives in `sop/library/`. Runtime bundles in `sop/runtime/` are generated artifacts. If any file conflicts with canonical source, canonical wins. Do not edit runtime files directly.

Method and chain YAML in `sop/library/methods/` and `sop/library/chains/` are the source of truth for inventory exports. Files in `exports/` are generated artifacts. Before any research handoff, run:

`python scripts/export_library_inventories.py`
