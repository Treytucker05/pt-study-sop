> Runtime Canon is sop/gpt-knowledge/
> If this document conflicts with Runtime Canon, Runtime Canon wins.
> This is a blueprint/design doc.

# PT Study SOP - Master Plan (Stable North Star)
**Owner:** Trey Tucker  
**Purpose:** Version-agnostic blueprint; only change when invariants or contracts change.

---

## 1) Vision (non-negotiable)
Build a personal AI study OS that:
- Remembers across sessions (durable context, no drift).
- Runs end-to-end study flows (plan → learn → test → log → review) with minimal manual steps.
- Grounds all generation in the learner's own materials (RAG-first, citation-first).
- Produces spaced, high-quality cards and retains outcomes over years.

## Program Goal
- Near-term (Dec 2025 finals): zero missing session logs; each session logs what worked/what didn’t; draft cards in ≥30% of sessions.
- Next semester start: stable loop (plan → learn → log → card draft); off-source drift <5%; weekly readiness/test-score trend.
- Calendar sync: design only; build after semester ends (lowest priority).

---

## 2) Invariants (do not change across versions)
- Lifecycle: MAP → LOOP → WRAP.
- Seed-Lock / Gated Platter / Teach-back: user must supply seeds; system gates progression (L2 before L4).
- RAG-first generation: answers/cards cite indexed user sources; if offline, mark as unverified.
- Single source of truth: Brain DB + session logs + resume feed every session start.
- Versioned schemas: session_log, resume, card, RAG doc are explicit and backward-compatible.
- Deterministic logging: every session emits a schema-conformant log; ingestion closes the session.
- Observability: tool calls and gating decisions are recorded (log/resume/dashboard).
- Security/Privacy: local-first; external APIs are opt-in per tool.

### MAP/PEIRRO alignment (documentation note)
- MAP → LOOP → WRAP is the execution lifecycle; PEIRRO is the learning cycle backbone.
- MAP aligns primarily with Prepare.
- LOOP spans Encode, Interrogate, Retrieve.
- WRAP covers Refine and Overlearn.

---

## 3) System architecture (stable components)
1. Desktop/Orchestration Agent — accepts NL tasks; calls tools with audit trail.
2. Content Pipeline — normalize/transcode/transcribe/index course docs; outputs metadata-rich docs.
3. RAG Index & Search — ingest API; search returns snippets+citation; supports text+image captions.
4. Study Engine (SOP Runner) — enforces MAP→LOOP→WRAP, Seed-Lock, gating; consumes RAG; emits session_log.
5. Card/Anki Bridge — add/update cards; dedupe by deck+guid; tag with sources; log status.
6. Brain (DB + Resume) — ingest session_log; generate resume/readiness; export JSON/MD; schemas versioned.
7. Multi-AI Router — route by task; return tool+model used for audit.
8. Dashboard — read-only over Brain/RAG; visualize coverage, spacing, calibration, anchors, cards.

---

## 4) Schemas (contracts to honor)
- Session Log v9.x: date, time, duration, study_mode, target_exam/block, sources, plan, main_topic, subtopics, frameworks, gates, WRAP, anki_count, anatomy fields, ratings, anchors, reflection, next_session. Additive-only changes unless this plan is updated.
- RAG Doc v1: {id, source_path, course, module, doc_type, created_at, checksum, text_chunks[], image_captions[], metadata{}}.
- Card v1: {deck, guid, front, back, tags[], source_refs[], created_at, updated_at}.
- Resume v1: {generated_at, readiness_score, recent_sessions[], topic_coverage[], gaps[], recommendations[]}.

---

## 5) Roadmap ladder (fixed rungs)
1) Download/organize course docs.  
2) Transcode/transcribe + index (text+images).  
3) RAG-backed SOP: answers/cards cite sources (no free hallucination).  
4) Card bridge hardening: dedupe/queues/offline fallback/source tags.  
5) Dashboard & spacing: coverage, readiness, spacing alerts, calibration.  
6) Multi-AI router with audit/fallbacks.  
7) Automation/scheduling: daily sync, ingest, resume, spaced notifications.

---

## 6) Governance
- Any change to Vision, Invariants, Architecture, or Schemas requires editing this file.
- Version plans (e.g., v9.2) may adjust scope but cannot violate invariants/contracts.
- New fields must be additive and documented; DB migrations must be provided when schemas change.
- PR checklist: Does this break an invariant/contract? If yes, update Master Plan or reject.

---

## 7) Operational minimums (every version)
- Session template enforced; ingestion + resume generation work.
- RAG reachable; if offline, mark outputs as unverified.
- One-command sync (downloads + ingest + resume).
- Health checks: content fetch, RAG search, Anki connect, DB integrity.

---

## 8) Current alignment (v9.1)
- Session logging/ingest/resume: working.
- Card bridge: working; needs strict source-tag gating.
- Dashboard: basic; needs coverage/spacing visuals.
- Content pipeline: downloads/transcode/transcribe not automated.
- RAG: design decided; implementation pending.

## 9) Next targets (without changing the North Star)
- Finish downloads + transcode/transcribe + RAG ingest (rungs 1–2).
- Wire SOP to use RAG for answers/cards (rung 3).
- Harden card dedupe/queue/tagging with source refs (rung 4).
- Add spacing/coverage visuals to dashboard (rung 5).

## 10) Update log
- 2025-12-06: Initial Master Plan created for PT Study SOP (applies to all future versions).
- 2025-12-08: Clarified RAG-first/citation-first, roadmap ladder, and current alignment.
