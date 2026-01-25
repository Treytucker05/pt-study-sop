# Digests Lifecycle (2026-01-12)

## Generation
- Weekly digests are generated via the dashboard API (`/api/scholar/digest`) which calls `generate_weekly_digest(days=7)`.
- The generator scans `scholar/outputs/` for recent artifacts and composes sections like runs summary, key findings, action items, pending questions, and review topics.
- Inputs include orchestrator run summaries (`orchestrator_runs/unattended_final_*.md`), module dossiers (improvement candidates), research notebook findings, reports, questions backlog, and gap analysis.

Evidence
- `brain/dashboard/routes.py` (api_scholar_digest -> generate_weekly_digest)
- `brain/dashboard/scholar.py` (generate_weekly_digest scans outputs + composes digest)
- Example digests: `scholar/outputs/digests/strategic_digest_2026-01-10_185544.md`, `scholar/outputs/digests/scholar_audit_digest_2026-01-12.md`

## Save / Storage
- Strategic digests are saved through `POST /api/scholar/digest/save`.
- The save flow writes a markdown file to `scholar/outputs/digests/strategic_digest_<timestamp>.md`.
- The same save flow writes a plan update draft to `scholar/outputs/plan_updates/plan_update_<timestamp>.md` and proposal seeds to `scholar/outputs/proposal_seeds/proposal_seeds_<timestamp>.md`.
- Saved digests are recorded in the database table `scholar_digests` (file path, title, digest type, hash).

Evidence
- `brain/dashboard/routes.py` (api_scholar_save_digest file writes + plan_update/proposal_seed creation + DB insert)
- `brain/db_setup.py` (scholar_digests table)
- Example digests: `scholar/outputs/digests/strategic_digest_2026-01-10_185544.md`

## Usage
- Saved digests are listed and fetched via `GET /api/scholar/digests` and `GET /api/scholar/digests/<id>` (dashboard visibility + retrieval).
- The save flow explicitly transforms digest content into plan updates and proposal seeds, which are intended to drive the planning/proposals loop.
- Loop contract states digests summarize current state and top gaps to inform plan steps and cadence decisions.
- Digests also summarize unanswered questions at the reporting layer.

Evidence
- `brain/dashboard/routes.py` (list/get digests endpoints; plan_update/proposal_seed generation)
- `scholar/outputs/reports/scholar_loop_contract_2026-01-12.md`
- `scholar/outputs/reports/questions_lifecycle_2026-01-12.md`

## Gaps / Disconnects
- Digest generation (`/api/scholar/digest`) does not automatically persist to the digests folder or DB; only the save endpoint does. This means scheduled or ad-hoc digest generation can exist without creating plan updates or proposal seeds unless a save is performed.
- The deletion endpoint removes the digest file + DB row but does not remove derived plan_update/proposal_seed artifacts (orphan risk). (Inferred from code; no cleanup present.)
- Governance/docs mismatches: digests are active outputs but are under-documented in some charter/README materials (see audit notes).

Evidence
- `brain/dashboard/routes.py` (separate generate vs save endpoints; delete endpoint)
- `scholar/outputs/audit_scholar_repo.md` (docs/output-lane mismatch notes)
