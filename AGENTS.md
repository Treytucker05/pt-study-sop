## Continuity Ledger (compaction-safe)
Maintain a single Continuity Ledger for this workspace in `CONTINUITY.md`. The ledger is the canonical session briefing designed to survive context compaction; do not rely on earlier chat text unless it's reflected in the ledger.

### How it works
- At the start of every assistant turn: read `CONTINUITY.md`, update it to reflect the latest goal/constraints/decisions/state, then proceed with the work.
- Update `CONTINUITY.md` again whenever any of these change: goal, constraints/assumptions, key decisions, progress state (Done/Now/Next), or important tool outcomes.
- Keep it short and stable: facts only, no transcripts. Prefer bullets. Mark uncertainty as `UNCONFIRMED` (never guess).
- If you notice missing recall or a compaction/summary event: refresh/rebuild the ledger from visible context, mark gaps `UNCONFIRMED`, ask up to 1-3 targeted questions, then continue.

### `functions.update_plan` vs the Ledger
- `functions.update_plan` is for short-term execution scaffolding while you work (a small 3-7 step plan with pending/in_progress/completed).
- `CONTINUITY.md` is for long-running continuity across compaction (the "what/why/current state"), not a step-by-step task list.
- Keep them consistent: when the plan or state changes, update the ledger at the intent/progress level (not every micro-step).

### In replies
- Begin with a brief "Ledger Snapshot" (Goal + Now/Next + Open Questions). Print the full ledger only when it materially changes or when the user asks.

### `CONTINUITY.md` format (keep headings)
- Goal (incl. success criteria):
- Constraints/Assumptions:
- Key decisions:
- State:
  - Done:
  - Now:
  - Next:
- Open questions (UNCONFIRMED if needed):
- Working set (files/ids/commands):

## 1) Mission and scope
- This repo houses the PT Study SOP and the PT Study Brain dashboard (study system + tracking and analytics).
- Runtime Canon lives in `sop/gpt-knowledge/` and is the authoritative source of instructions.
- `sop/MASTER_PLAN_PT_STUDY.md` is the stable North Star for invariants, contracts, and architecture.
- Optimize for design/architecture reasoning, trade-off analysis, context synthesis, and learning science to implementation alignment.
- Do not optimize for formal proofs, heavy coding, or long-horizon autonomous work. If requested, constrain scope, restate acceptance criteria, and proceed with minimal, well-justified changes.

## 2) Working agreements (how to think "smarter" here)
- Restate the user objective as acceptance criteria (3-7 items) before major changes.
- Ask targeted questions only when essential; otherwise proceed with best effort and label uncertainty as UNCONFIRMED.
- Prefer structured outputs: decision tables, trade-off matrices, explicit pros/cons, and constraints.
- When synthesizing context, separate: Facts from repo vs Assumptions vs Recommendations.
- Cite evidence from repo files when possible (paths and brief paraphrases).
- Avoid overconfident claims; include confidence (low/med/high) when helpful.
- Continuity discipline: read/update `CONTINUITY.md` each turn and after any state change.

## 3) Decision & trade-off discipline (architecture reasoning)
Use this lightweight template in answers:
- Problem framing (1-2 sentences)
- Constraints (bullets)
- Options (2-4)
- Trade-offs table (option | pros | cons | risks | when to choose)
- Recommendation + why (1 paragraph)
- Follow-ups (next steps or questions)

## 4) Quality gates (make long tasks reliable)
Definition of Done (SOP docs or app logic changes):
- Changes align with Runtime Canon (`sop/gpt-knowledge/`) and Master Plan invariants.
- Any new/changed behavior is documented where users expect it (README or relevant SOP canon file).
- No regressions in study flow assumptions (plan -> learn -> log -> review).
- Required commands/tests are run or explicitly noted as not run.

No-regressions checklist:
- Do not break folder structure: `sop/`, `brain/`, `scripts/`, `docs/`, `dist/`.
- Keep study mode naming consistent (Core, Sprint, Drill).
- Keep syllabus event types consistent (lecture, reading, quiz, exam, assignment, other).
- Keep schema changes additive unless Master Plan updated.

Run these checks (confirmed in repo docs):
- `python -m pytest brain/tests`
- `python scripts/release_check.py` (release readiness)
- Manual smoke test: `Run_Brain_All.bat` to start dashboard at `http://127.0.0.1:5000`

If commands are missing or unclear, mark UNCONFIRMED and ask before running destructive actions.

## 5) Repo map (most important paths)
- `sop/` - Source development; contains modules, methods, frameworks, research.
- `sop/gpt-knowledge/` - Runtime Canon (authoritative instructions).
- `sop/MASTER_PLAN_PT_STUDY.md` - Invariants, contracts, and architecture North Star.
- `brain/` - Database, ingestion, resume, dashboard code.
- `brain/README.md` - Brain system commands and API endpoints.
- `scripts/` - Release checks and Scholar utilities.
- `docs/` - Release process and roadmaps.
- `dist/` - Packaged release artifacts.
- `scholar/` - Scholar workflows and outputs.
- `v9.2/` - Development snapshot bundle.

Where to add new canon content:
- Runtime Canon updates: `sop/gpt-knowledge/` (update README and BUILD_ORDER if needed).
- Long-term invariants/contracts: `sop/MASTER_PLAN_PT_STUDY.md`.
- Source content and examples: `sop/modules/`, `sop/frameworks/`, `sop/methods/`, `sop/examples/`.

Where to add implementation notes:
- `docs/roadmap/` for planned work; `docs/release/` for release process.

## 6) Conventions
- Prefer ASCII and minimal diffs; keep edits scoped and additive.
- Use short markdown bullets; avoid large rewrites unless requested.
- Keep filenames and paths stable; do not rename canon files casually.
- Study modes: Core, Sprint, Drill (use exact casing).
- Syllabus event types: lecture, reading, quiz, exam, assignment, other.
- Scholar outputs should live under `scholar/outputs/` and be organized by lane (reports, module_audits, module_dossiers, gap_analysis, digests, orchestrator_runs, research_notebook, promotion_queue, system_map); document any deviations.

## 7) Safety and data handling
- Do not store or paste API keys or secrets in docs.
- Avoid personal data; redact if present.
- For security discussions, propose cautious verification steps and avoid risky commands.

## 8) Review guidelines (for PRs / code review use)
- Correctness and alignment with SOP invariants.
- Clarity and documentation updates where needed.
- Consistency with existing schemas, naming, and workflow.
- Avoid scope creep; keep changes testable and reversible.

## 9) Legacy notes (only if needed)
- None.

## 10) Learnings
- Scholar inventories should list all output lanes plus `scholar/outputs/` root files using repo-relative paths.
- Loop contracts should explicitly map questions, proposals, gaps, digests, and system health artifacts to the loop phases with concrete file paths.
- System health schemas should require evidence paths and priority-ranked improvements for consistent cross-system summaries.
- System health reports should include a coverage note that cites representative artifacts per lane and references the latest scholar inventory.
- Questions lifecycle artifacts live in `scholar/outputs/orchestrator_runs/questions_needed_*.md`, with `scholar/outputs/STATUS.md` pointing to the latest questions file.
- Proposal approvals move files from `scholar/outputs/promotion_queue/` into `scholar/outputs/proposals/approved` or `scholar/outputs/proposals/rejected` and are tracked in `brain/data/pt_study.db` (`scholar_proposals`).
- Scholar readiness can be derived by comparing `brain/session_logs` mtimes to `scholar/outputs/orchestrator_runs` (exclude `run_*_example.md`).
- Tutor system inventories should include evidence paths per item plus a coverage note anchored on `scholar/outputs/system_map/scholar_inventory_2026-01-12.md` and representative artifacts per lane.
- Use `scholar/outputs/reports/scholar_io_matrix_2026-01-12.md` as the canonical Scholar inputs/outputs summary when mapping data flows.
- Dataflow maps should pair lifecycle reports with `brain/db_setup.py` when describing digest/proposal storage and DB tables.
- Module path maps should list runtime canon, source module, and master reference entry for each M0-M6 module.
- Engine path maps should tie Tutor engine code entrypoints (`brain/tutor_engine.py`, `brain/dashboard/routes.py`) to runtime canon and source engine docs/templates.
- Run loop maps should align plan -> learn -> test -> log -> review with MAP -> LOOP -> WRAP and cite both runtime canon modules and dashboard surfaces.
- Question lifecycle maps should point to `questions_needed_*.md` as the active queue, `STATUS.md` as the latest index, and runbook + run logs for generation/answering flow.
- Proposal lifecycle maps should include promotion_queue staging, approval/rejection moves, STATUS indexing, metadata sidecars, and the `scholar_proposals` DB table.
- System health maps should include signals, pipeline steps, outputs, and consuming surfaces, anchored on `system_health_*` reports plus `scholar/outputs/STATUS.md`.
- Evaluation metrics inventory: dashboard stats live in `brain/dashboard/stats.py`, resume metrics in `brain/generate_resume.py`, and Scholar operational/telemetry metrics in `brain/dashboard/scholar.py` + `scholar/brain_reader.py`/`scholar/friction_alerts.py`.
- Scholar automation toggles live in `scholar/inputs/audit_manifest.json` and are surfaced via dashboard UI/routes and STATUS reporting; safe_mode definitions are inconsistent across docs and should be reconciled.
- Research notebook entries should include external citations (DOI links) and a Scholar artifact coverage note referencing each output lane.
- M0 audits should flag documentation drift between runtime canon and source modules (PRIME/interleave/glossary scan vs source protocol).
- Module dossiers should cite runtime canon and source modules to keep drift visible alongside improvement candidates.
- Promotion queue proposal seeds should include Approval Required, one-change-only scope, and a Scholar artifact coverage note.
- PRIME compliance is difficult to verify without an explicit log field; note telemetry ambiguity in proposals.
- M1 pedagogy research should connect readiness checks to SRL/goal-setting evidence and flag missing M1-specific audits or proposals as gaps.
- Module audits should include Scholar Artifact Coverage and Coverage Gaps sections with lane references.
- M1 module dossiers should cite the M1 audit + pedagogy research and include per-lane artifact coverage.
- Promotion queue proposal seeds should list at least one artifact per Scholar output lane in the coverage note for traceability.
- M2 Prime research should cite advance organizers, concept map meta-analyses, and pretesting evidence; use cognitive load and expertise reversal to justify short scans.
- Crossref title searches can return irrelevant DOIs; confirm with author/title queries when validating citations.
- M2 audits should flag drift between runtime guardrails and source module (prediction prompts, scan-length guidance, bucket limits) to prevent inconsistent priming enforcement.
- M2 dossiers should align runtime vs source guardrails (scan length, bucket limits, probe-before-scan) to keep improvement candidates traceable.
- M2 proposal seeds should mirror M0/M1 structure and include per-proposal evidence paths plus a coverage gaps note when logs are sparse.
- M3 pedagogy research should pair dual coding, self-explanation, worked examples, segmentation, and drawing evidence with a seed-lock alignment check.
- M3 audits should surface runtime vs source ordering drift (Sound vs Function-first) and missing self-explanation gates to avoid inconsistent encoding enforcement.
- M3 dossiers should call out KWIK ordering ambiguity and self-explanation gate drift for alignment.
- M3 proposal seeds should address ordering drift and list `sop/gpt-knowledge/KWIK.md` when aligning canonical KWIK sequencing.
- M4 pedagogy research should anchor spacing, interleaving, successive relearning, and faded scaffolding evidence to the M4 difficulty ramp and L2 teach-back gate.
- M4 audits should compare runtime difficulty ramp tooling against source L1-L4 teach-back gates to surface drift.
- M4 dossiers should call out difficulty ramp vs L1-L4 teach-back drift and cite both the M4 audit and pedagogy research.
- M4 proposal seeds should keep ramp alignment, interleaving/spacing prompts, and successive relearning rules as separate one-change RFCs with explicit L2/Seed-Lock guardrails.
- M5 pedagogy research should connect mode selection and switching to retrieval practice, productive failure, expertise reversal, and metacognitive monitoring evidence.
- M5 audits should flag drift between runtime time-boxed modes and source Core/Sprint/Drill definitions plus missing Sprint fail-first protocol detail.
- M5 dossiers should cite the M5 audit + research note and call out runtime preset drift (Light/Quick Sprint) plus Sprint fail-first protocol details.
- M5 proposal seeds should align mode menus, clarify Sprint fail-first steps, and add explicit miss-count thresholds for mode switching.
- M6 pedagogy research should connect wrap steps to retrieval practice, self-explanation, spacing/successive relearning, calibration, and implementation intentions.
- M6 audits should flag JSON output requirements vs source markdown log formats, plus wrap-toolkit vs fixed-protocol drift and spacing/calibration enforcement gaps.
- M6 dossiers should call out JSON-vs-markdown output drift and cite `scholar/outputs/system_map/scholar_inventory_2026-01-12.md` in the evidence map for full artifact traceability.
- M6 proposal seeds should address output schema drift plus retrieval-first wrap, scheduling prompts, and calibration quick-checks with evidence paths and citations.
- Tutor Engine research notes should cite ITS effectiveness, formative feedback, cognitive load, and retrieval practice evidence with a Key Takeaways section tied to mode/RAG guardrails.
- Tutor Engine audits should cross-check `log_tutor_turn` against the `tutor_turns` schema to flag missing course/topic/source-lock fields.
- Tutor API contracts include `notes_context_ids`, but Tutor retrieval does not consume them yet; treat Source-Lock context as partial until wired.
- Tutor Engine proposal seeds should convert audit gaps into one-change RFCs (retrieval-first, feedback rubric, telemetry completeness) with explicit guardrails.
- Brain ingest/resume research notes should anchor repo evidence to `brain/ingest_session.py`, `brain/generate_resume.py`, and `scholar/outputs/reports/brain_tutor_ingest_map_2026-01-12.md` for traceable pipeline context.
- Ingest dedupe uses `ingested_files` checksums in `brain/ingest_session.py`; dashboard `/api/upload` bypasses tracking and can introduce duplicates.
- Brain log template drift: `brain/session_logs/TEMPLATE.md` is v9.1 while runtime canon log template lives at `sop/gpt-knowledge/brain-session-log-template.md` (v9.2).
- Brain ingest/resume proposal seeds should separate dedupe, template-validation, and resume-metadata changes into distinct one-change RFCs with data-quality citations.
- Scholar orchestrator research should ground loop governance in coordination theory, autonomic control loops, and mixed-initiative guidance with DOI links.
- Orchestrator runbook mandates plan_updates and questions_answered when questions exist, but run outputs may omit those lanes unless dashboard helpers run.
- Output lane manifests include plan_updates and proposal_seeds; audits should verify lane creation and run log format compliance against the runbook.
- Orchestrator proposal seeds should tie governance changes to coordination/control-loop and mixed-initiative evidence with DOI links.
