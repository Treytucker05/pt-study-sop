# Tutor Study Run — Product Requirements Document

**Status:** Draft (Matt Pocock workflow — Phase 4)  
**Last updated:** 2026-05-19  
**Domain:** `CONTEXT.md`  
**Architecture:** `docs/adr/0001-tutor-transcript-and-working-summary.md`  
**Target behavior reference:** `docs/audit/TUTOR_BEHAVIOR_SPEC.md`  
**As-built inventory:** `docs/audit/TUTOR_PAGE_AUDIT_2026-05-19.md`

---

## Problem Statement

The live `/tutor` workspace (Floating Studio) conflates three different lifecycles—**study run**, **Tutor chat session** (teach leg), and ad-hoc questions—into one chat path with ambiguous hero actions (`END SESSION` / `NEW SESSION`). Learners cannot reliably:

- Ask quick **General Q&A** without accidentally starting a full SOP teach loop.
- Run multiple **Tutor** teach legs inside one **study run** while keeping prior transcripts intact.
- Trust that long teach conversations stay responsive without losing the full **transcript** for lookup and polish.

Compaction today reports token pressure but does not produce a **working summary** for the live prompt. Polish and capture paths are partially wired; General and teach traffic are not distinguished at the turn level.

---

## Solution

Deliver a study-run-centric Tutor experience on the existing Floating Studio shell:

1. **Always-on General Q&A** with promote-only handoff to polish.
2. **Gated Tutor teach mode** (materials + template chain or exactly one custom method; required topic label per new teach leg).
3. **Three explicit learner actions:** End teach, New teach, Finish study run.
4. **Two-layer memory per teach leg:** append-only **transcript** plus versioned **working summary** injected as summary + recency tail (per ADR-0001).
5. **Polish drafts** from compaction checkpoints and teach-end, with manual approval before they join the polish packet.

---

## User Stories

### Study run and lifecycle

1. As a learner, I want a **study run** to stay open until I **finish study run**, so that I can prime, teach, polish, and start another teach leg without losing workflow context.
2. As a learner, I want **End teach** to close only the current **Tutor chat session**, so that I can pause teaching without ending my whole study run.
3. As a learner, I want **New teach** to start a fresh **Tutor chat session** under the same **study run**, so that I can study a new topic without merging transcripts.
4. As a learner, I want **Finish study run** to be a distinct, deliberate action, so that I do not accidentally close my workflow when I only meant to end one teach leg.
5. As a learner, I want each new teach leg to require a **topic label**, so that I can tell legs apart in lists, polish queues, and digests.
6. As a learner, I want a list of teach legs on my study run (label, status, turn count), so that I can orient across multiple legs in one run.

### General Q&A

7. As a learner, I want to ask **General Q&A** anytime without selecting materials or a chain, so that quick questions do not block my flow.
8. As a learner, I want General answers to use a lighter teaching profile than **Tutor** teach mode, so that responses stay appropriate to ad-hoc questions.
9. As a learner, I want General replies to enter polish only when I **promote** them, so that polish is not flooded with casual chat.
10. As a learner, I want General turns stored but excluded from teach compaction, so that summaries reflect formal teaching only.

### Tutor teach mode

11. As a learner, I want **Start Tutor** to require scoped study materials, so that teach mode is grounded in my library.
12. As a learner, I want **Start Tutor** to require either a template chain or exactly one custom method, so that SOP facilitation is always defined.
13. As a learner, I want custom teach setup limited to one method block, so that I cannot accidentally build multi-block ad-hoc chains outside templates.
14. As a learner, I want **Auto tutor flow** removed from teach paths, so that I never start teach mode without an explicit SOP contract.
15. As a learner, I want a recommended prime packet when priming produced one, so that teach starts with rich context without blocking unprimed teach.
16. As a learner, I want a visible banner when teaching without a prime packet, so that I know context may be thinner.
17. As a learner, I want block facilitation, chain advance, and stage timer in teach mode, so that template chains behave as designed.
18. As a learner, I want capture, compaction drafts, and optional memory capsules to apply to teach turns, so that artifacts reflect formal teaching.

### Transcript, compaction, and memory

19. As a learner, I want every teach turn kept in a **transcript**, so that I can recover exact wording later.
20. As a learner, I want compaction to create or update a **working summary** while keeping the transcript, so that the model stays within context without amnesia.
21. As a learner, I want the live prompt after compaction to use the latest summary plus the last K full turns, so that recent nuance is preserved.
22. As a learner, I want summary versions stored per teach leg, so that I can see how compaction evolved.
23. As a learner, I want manual compaction in addition to pressure-triggered compaction, so that I control when summaries refresh.
24. As a learner, I want the memory UI to show **context pressure** separately from **working summary** creation, so that telemetry is not confused with compaction.
25. As a learner, I want memory capsules to remain optional curated snapshots, not a replacement for the transcript.

### Polish

26. As a learner, I want a checkpoint digest draft when compaction runs, so that organized notes appear without manual copy-paste.
27. As a learner, I want a final digest draft when I end teach or enter Polish, so that each leg closes with reviewable material.
28. As a learner, I want polish drafts editable before approval, so that I stay in control of what enters the polish packet.
29. As a learner, I want approved items to land in the polish bundle with teach leg labels, so that multi-leg runs stay organized.
30. As a learner, I want to promote a **Tutor** reply to polish explicitly, so that high-value assistant messages are capturable on demand.

### Continuity and optional features

31. As a learner, I want prior teach legs' transcripts retained when I start **New teach**, so that earlier legs remain searchable and polishable.
32. As a learner, I want to resume an in-progress study run from the hero, so that I can return after a break.
33. As a learner, I want optional transcript search and jump (later wave), so that I can find specifics in long legs.
34. As a learner, I want Final Sync to remain optional, so that finishing a study run does not require Obsidian publish.

### Operator / system quality

35. As the system, I want teach turns tagged separately from General turns, so that compaction and analytics use the correct slice.
36. As the system, I want teach session creation to reject missing materials or chain/method, so that invalid teach legs cannot start.
37. As the system, I want regression tests on public HTTP and UI seams, so that lifecycle and tagging survive refactors.

---

## Implementation Decisions

### Deep modules (encapsulate complexity behind stable interfaces)

| Module | Responsibility | Public interface (conceptual) |
|--------|----------------|------------------------------|
| **Teach mode gate** | Validates materials + chain/method before teach starts; enforces one custom method | `canStartTeach(scope) → { ok, reasons[] }`; `buildTeachSessionConfig(scope, label, chainOrMethod)` |
| **Study run lifecycle** | Maps learner actions to workflow + session state transitions | `endTeach(workflowId, sessionId)`; `startNewTeach(workflowId, config)`; `finishStudyRun(workflowId)` |
| **Turn classifier** | Tags outbound messages and persisted turns as `general` \| `tutor` | `classifyOutbound(mode, payload) → turn_mode`; enforced at send API |
| **Transcript store** | Append-only turns per teach leg; mode-filtered reads | `appendTurn(sessionId, turn)`; `listTranscript(sessionId, { mode? })` |
| **Compaction pipeline** | On pressure or manual trigger: LLM summary from tutor turns only; version bump | `compactTeachLeg(sessionId) → { summaryVersion, summaryText }` |
| **Prompt history assembler** | Builds model history: latest working summary + recency tail of K turns | `assembleHistory(sessionId, { k }) → messages[]` |
| **Polish draft bridge** | Upserts checkpoint/final digests as editable drafts; promote-only for General | `upsertDraft(workflowId, legLabel, source, content)`; `approveDraft(draftId)` |

### UI composition (Floating Studio — no new top-level shell)

- **General input strip:** always visible; does not require Start Tutor; sends with `general` mode.
- **Teach surface:** existing live study pane; visible only after successful Start Tutor; sends with `tutor` mode.
- **Hero controls:** replace ambiguous copy with End teach / New teach / Finish study run; teach leg list adjacent to workflow stage.
- **Start Tutor flow:** topic label modal/step before session create; remove auto-tutor option from teach configuration.
- **Memory panel:** separate context pressure meter from “Create working summary” / compact action.

### Backend / persistence

- Add `turn_mode` (or equivalent) on turn records; migration for existing rows defaulting to `tutor` where chain-backed, else `general` if inferrable.
- New table or JSON version stream for **working summaries** per `tutor_session_id` (version id, created_at, source_turn_range, text).
- `send_turn` history assembly switches from “all turns” to assembler output once a summary exists.
- Session create API rejects teach starts without material ids and without `method_chain_id` or single-block custom method payload.
- Compaction endpoint or internal job: idempotent per pressure event; manual invoke from memory UI.

### Prompt / pedagogy

- General path: lighter base rules, no block advance, no chain index mutation.
- Tutor path: unchanged SOP stack (block, chain, packet, memory capsule, retrieval) with assembler-fed history.
- Prime packet: inject when present; soft banner when absent (teach still allowed).

### Testing priorities (external behavior)

| Priority | Behavior |
|----------|----------|
| P0 | Cannot start teach without materials + chain/method; General send works without gate |
| P0 | End teach vs finish study run change different persisted flags |
| P0 | Turn mode persisted; compaction input excludes `general` |
| P1 | New teach under same workflow creates new session id; prior transcript readable |
| P1 | After compact, model history length bounded; transcript count unchanged |
| P2 | Polish draft created on compact; approve moves to bundle |
| P2 | UI copy uses glossary terms (study run, teach leg, Tutor teach mode) |

**Prior art:** existing Vitest suites for Tutor shell, live study pane, and chat; pytest tutor turn and session tests. Extend with API contract tests before UI snapshots.

### Prototype recommendation (Phase 2 — before or parallel to Wave 1 slice 1)

| Branch | Question | Recommendation |
|--------|----------|----------------|
| **UI** | General + teach layout and three hero actions | **Recommended** — one throwaway route with 2–3 layout variants; pick winner before Wave 1 UI lock |
| **LOGIC** | Summary + recency tail assembler | **Defer** — ADR-0001 is sufficient; validate in Wave 4 tracer bullet with failing API test |

---

## Testing Decisions

- Tests describe **observable behavior** at API and learner-visible UI seams, not internal hook structure.
- **Do not** bulk-write tests ahead of implementation; one vertical slice → one RED → one GREEN per `/tdd`.
- **Must test:** lifecycle transitions, teach gate rejection, turn tagging, compaction excluding General, assembler output shape (summary present + tail length ≤ K).
- **May defer:** transcript search UI, Final Sync, pixel-perfect Floating Studio layout.

---

## Out of Scope

- Replacing Floating Studio with legacy 3-column Tutor shell.
- Renaming SOP “protocol” concepts in the library (learner-facing “protocol” wording only removed in UI).
- Scholar investigations or Brain launch handoff redesign.
- Automatic polish ingest without draft approval.
- Merging multiple teach leg transcripts into one compaction stream.
- Full Final Sync mount on main `/tutor` path (optional capstone track).
- Obsidian/Anki publish automation changes.

---

## Further Notes

- **Phase 1 complete:** domain alignment via grill; `CONTEXT.md`, ADR-0001, `TUTOR_BEHAVIOR_SPEC.md`, README doc map updated.
- **Issue tracker:** GitHub `Treytucker05/pt-study-sop` — no `ready-for-agent` label yet; create on publish or use `enhancement`.
- **Execution board:** After issues are approved, mirror parent epic link in `docs/root/TUTOR_TODO.md` per repo canon.
- **Implementation order:** vertical slices below (Phase 5), not horizontal layers.
