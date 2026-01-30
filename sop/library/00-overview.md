# PT Study OS -- Overview

**Version:** v9.3
**Owner:** Trey Tucker

## What This Is

A structured AI study operating system for DPT coursework. It enforces an end-to-end study flow -- plan, learn, test, log, review -- grounded in the learner's own materials. The system runs as a Custom GPT tutor backed by canonical SOP files.

## North Star Vision

- **Durable context** -- remembers across sessions with no drift.
- **End-to-end study flows** -- MAP (plan) -> LOOP (learn) -> WRAP (log) with minimal manual steps.
- **RAG-first, citation-first** -- all generated content grounded in the learner's indexed materials. Unverified outputs are explicitly marked.
- **Spaced, high-quality Anki cards** -- source-tagged, deduplicated, retained over years.
- **Deterministic logging** -- every session emits schema-conformant JSON for long-term tracking.

## Lifecycle

| Phase | Modules | PEIRRO Alignment |
|-------|---------|------------------|
| **MAP** | M0 Planning, M1 Entry | Prepare |
| **LOOP** | M2 Prime, M3 Encode, M4 Build, M5 Modes | Encode, Interrogate, Retrieve |
| **WRAP** | M6 Wrap | Refine, Overlearn |

## Quick-Start: Study Session

1. Paste `sop/runtime/runtime_prompt.md` at session start.
2. Complete M0 Planning: declare target, sources, plan, pre-test.
3. Run the session through M1-M6.
4. At Wrap, output Exit Ticket + Tracker JSON + Enhanced JSON.
5. Store logs in `sop/logs/` or preferred location.

## Architecture (Stable Components)

1. **Orchestration Agent** -- accepts NL tasks, calls tools with audit trail.
2. **Content Pipeline** -- normalize, transcode, transcribe, index course docs.
3. **RAG Index & Search** -- ingest API; returns snippets + citations.
4. **Study Engine (SOP Runner)** -- enforces MAP->LOOP->WRAP, Seed-Lock, gating.
5. **Card/Anki Bridge** -- add/update cards; dedupe by deck+guid; source-tag.
6. **Brain (DB + Resume)** -- ingest session logs; generate resume/readiness; versioned schemas.
7. **Multi-AI Router** -- route by task; audit model+tool used.
8. **Dashboard** -- read-only views of coverage, spacing, calibration, cards.

## Library File Map

| # | File | Description |
|---|------|-------------|
| 00 | `00-overview.md` | System identity, vision, quick-start, and library map (this file) |
| 01 | `01-core-rules.md` | All behavioral rules the tutor must follow |
| 02 | `02-modules.md` | M0-M6 execution flow details |
| 03 | `03-frameworks.md` | PEIRRO, KWIK, H/M/Y series, Levels |
| 04 | `04-engines.md` | Anatomy Engine and Concept Engine |
| 05 | `05-blueprint.md` | 3+2 rotation, sandwich ingestion, spacing, evidence nuance |
| 06 | `06-logging.md` | Logging schema v9.3, Tracker JSON, Enhanced JSON |
| 07 | `07-templates.md` | Exit ticket, session log, weekly plan/review templates |
| 08 | `08-workload.md` | Rotational interleaving 3+2 system |
| 09 | `09-evidence.md` | NotebookLM bridge, source-lock protocol, research grounding |
| 10 | `10-examples.md` | Mini usage examples |
| 11 | `11-schemas.md` | Session log, RAG doc, card, and resume schema contracts |
| 12 | `12-roadmap.md` | Roadmap ladder, current alignment, next targets |

## Schemas / Contracts

- **Session Log v9.x:** date, time, duration, study_mode, target_exam/block, sources, plan, main_topic, subtopics, frameworks, gates, WRAP, anki_count, anatomy fields, ratings, anchors, reflection, next_session. Additive-only changes unless Master Plan is updated.
- **RAG Doc v1:** `{id, source_path, course, module, doc_type, created_at, checksum, text_chunks[], image_captions[], metadata{}}`.
- **Card v1:** `{deck, guid, front, back, tags[], source_refs[], created_at, updated_at}`.
- **Resume v1:** `{generated_at, readiness_score, recent_sessions[], topic_coverage[], gaps[], recommendations[]}`.

---

## Governance

- Any change to Vision, Invariants, Architecture, or Schemas requires editing this file.
- Version plans (e.g., v9.2) may adjust scope but cannot violate invariants/contracts.
- New fields must be additive and documented; DB migrations must be provided when schemas change.
- PR checklist: Does this break an invariant/contract? If yes, update Master Plan or reject.

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

- **Near-term (Dec 2025 finals):** Zero missing session logs; each session logs what worked/what didn't; draft cards in ≥30% of sessions.
- **Next semester start:** Stable loop (plan → learn → log → card draft); off-source drift <5%; weekly readiness/test-score trend.
- **Calendar sync:** Design only; build after semester ends (lowest priority).

---

## Source of Truth

Canonical content lives in `sop/src/`. Runtime bundles in `sop/runtime/` are generated artifacts. If any file conflicts with canonical source, canonical wins. Do not edit runtime files directly.
