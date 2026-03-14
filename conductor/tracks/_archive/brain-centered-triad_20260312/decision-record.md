# Decision Record: Brain-Centered Triad Reframe

> Historical track artifact. Product/ownership authority lives only in `README.md`.
> If wording here conflicts with the canon, the canon wins.

Date: 2026-03-12  
Track: `brain-centered-triad_20260312`

## Why This Follow-On Track Exists

The first Brain / Scholar / Tutor realignment shipped real foundations, but owner review and repo audit showed that the product center of gravity is still wrong in several places. This record freezes the learnings already agreed before implementation restarts.

## System Frame

- This is a program for one student, not an institution/admin platform.
- Brain is the true home/dashboard and learner-model command center.
- Tutor is the bread and butter of the system and the main live value surface.
- Scholar is the system-facing investigation and research layer.
- Support pages exist to serve the triad, not compete with it as peer products.

## Locked Product Decisions

### Brain

- Brain is the true home/dashboard for the product.
- Brain is the learner-model command center, not a mixed tool workspace.
- Brain is not the bread-and-butter live surface; Tutor is.
- Brain should learn from all major system signals, not only Tutor sessions.
- Brain should recommend what to do next, not only describe the learner.
- Brain should explicitly track what worked, what failed, and what the learner liked/disliked.
- Brain should stay visible and challengeable rather than becoming a black box.
- Brain should model the learner at multiple levels: overall, by course, and by topic.
- Brain should own the supporting evidence surfaces:
  - Library
  - Vault / Vault Health
  - Mastery
  - Calendar
- Dashboard should merge into Brain rather than remain a peer page.

### Brain Page Priorities

- The top of Brain should prioritize:
  1. urgent obligations and deadlines
  2. next best study actions
  3. learner-state summary
- The top queue should unify deadlines, tasks, events, and study risks.
- Queue ordering should be hybrid:
  - time urgency first
  - unless Brain sees a clearly more important study risk
- Every Brain-prioritized queue item should show its reason inline.
- Queue items should be operational and jump directly into the relevant next action.
- Stats should be split into:
  - performance / health
  - activity / output

### Tutor

- Tutor is the bread and butter of the program.
- Tutor should own the active study workspace.
- Tutor should own notes, artifacts, canvas/graph tools, and live session execution.
- If canvas and graph tools move out of Brain, they move into Tutor rather than another page.
- Tutor should consume Brain-ingested content rather than own Library as a separate content authority.
- Tutor may offer inline intake/upload controls, but the resulting records still belong to Brain-owned Library surfaces.
- Tutor-created work should be session-scoped first and only become durable knowledge when promoted.
- Durable Tutor outputs should normally be the end-of-session summary plus explicit `make a note` moments, not every raw working artifact.
- An explicit `make a note` instruction should write immediately to the vault.
- End-of-session summaries should save to the vault automatically by default.
- Tutor should write back into Brain-owned analytics and Brain-owned vault surfaces.

### Scholar

- Scholar is system-facing first.
- Scholar remains one page.
- Scholar stays completely non-teaching for course content.
- Scholar should investigate the whole system, not only Brain.
- Scholar can propose changes across the whole system, but nothing is auto-applied.
- Approval follows the target:
  - learner-facing proposals need learner approval
  - system-facing proposals need operator/owner approval
- Scholar owns the focused question layer when research is blocked.
- Scholar should ask the learner only when blocked.
- Scholar should centralize outside web/citation research.
- Scholar should support zero-data mode.
- Scholar should feel like an investigation console, not a chat-first page.
- Scholar can challenge Brain's model.
- Scholar remains the source of truth for questions and proposals.
- Brain/Tutor may mirror relevant Scholar items, but only as references back to Scholar.
- Brain/Tutor should mirror Scholar items only when they are actively relevant there.
- Scholar uses typed proposals and keeps `approved` separate from `implemented/active`.
- Scholar is the permanent ledger for investigations, proposals, approvals, rejections, and superseded ideas.
- Implemented Scholar proposals should move out of the main working view into history by default.
- Scholar should have both manual and automatic runs.
- Scholar should auto-run after every Tutor session and may also run from other major signals.
- Scholar should be visible and transparent, with deeper details expandable instead of hidden.
- Scholar investigations should pause and resume instead of staying as heavy open watches.
- Scholar investigations should link into one rolling Obsidian notebook for notes and task tracking rather than one page per investigation.
- That rolling Scholar notebook should track both research work and approved follow-up tasks.

### Brain <-> Scholar <-> Tutor Boundaries

- Brain does not directly steer Tutor.
- Brain should get the learner into the right Tutor move fast, but it should not absorb Tutor.
- Scholar starts recalibration when Brain's model needs to be challenged.
- Brain remains the place where the actual learner model is updated after accepted recalibration.
- Brain analytics is the evidence home for Tutor/session quality.
- Scholar reads Brain analytics and launches deeper investigations or proposals from that evidence.
- The same Brain-evidence / Scholar-investigation pattern should apply to Library and Vault health.
- Approved Scholar strategy may become the bounded strategy input that Tutor reads.
- Support pages should be visually and conceptually subordinate to the triad rather than treated like separate product layers.

## Immediate Consequences For Implementation

- The current `Dashboard` page is no longer the target home surface.
- The current Brain page cannot remain tool-first.
- The current Library ownership story must be corrected.
- The current Scholar learner-facing emphasis must be corrected.
- The next implementation track must start from the frozen end state and work backward into small, testable slices.
