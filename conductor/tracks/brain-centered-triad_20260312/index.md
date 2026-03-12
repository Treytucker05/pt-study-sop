# Track: Brain-Centered Triad Reframe

> Historical track artifact. Product/ownership authority lives only in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
> Use this folder for implementation evidence and closeout history only.

**ID:** brain-centered-triad_20260312  
**Status:** Complete

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Decision Record](./decision-record.md)
- [Open Questions](./open-questions.md)

## Scope

- Recenter the product around Brain as the true home/dashboard.
- Treat Tutor as the bread-and-butter live study engine for one student.
- Reframe Scholar as the system-facing investigation and proposal console.
- Demote support pages into utilities around the triad.
- Work backward from the frozen end goal into small, feasible, test-gated implementation slices.

## Progress

- Phases: 11/11 complete
- Tasks: 53/53 complete
- Tonight cut shipped:
  - Brain is now the home route and Dashboard is retired as a peer page.
  - Brain home opens with the attention queue, split stats bands, and support-system launches.
  - Scholar, Tutor, and support pages now read as one Brain / Scholar / Tutor study program.
- Follow-up wave shipped:
  - fixed the live mastery dashboard `500` and restored Brain-home live mastery rendering.
  - hardened Brain -> Tutor / Scholar / Calendar handoff context and support-page hierarchy.
  - switched Tutor RAG to Gemini Embedding 2 preview as the live default embedding model when Gemini keys are present.
  - repaired shell alias/mobile-nav/hidden-Scholar polling regressions discovered during closeout.
- Validation completed:
  - `pytest brain/tests/ -q`
  - `cd dashboard_rebuild && npm run check`
  - `cd dashboard_rebuild && npm run test`
  - `cd dashboard_rebuild && npm run build`
  - live smoke on `http://127.0.0.1:5000`
  - live API smoke on `/api/mastery/dashboard`, `/api/tutor/embed/status`, and `/api/tutor/embed`

## Outcome

- PRD published in `tasks/prd-brain-centered-triad.md`
- Brain is the canonical home surface and Dashboard is no longer a peer route.
- Tutor is the clear live execution surface, Scholar is the system-facing investigation console, and support pages are subordinate systems.
- Gemini Embedding 2 preview is the live embedding default with provider/model truth surfaced in the product.
- Follow-on improvements captured:
  - migrate deprecated LangChain `Chroma` usage to `langchain_chroma`
  - add per-document embed failure telemetry for skipped files

## Quick Links

- [Back to Tracks](../../tracks.md)
- [Product Context](../../product.md)
