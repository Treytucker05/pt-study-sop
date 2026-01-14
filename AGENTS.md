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
