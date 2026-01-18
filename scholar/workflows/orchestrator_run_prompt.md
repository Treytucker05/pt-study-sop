# Scholar Orchestrator: Unattended Runbook

Role: Scholar Meta-System — continuous improvement loop for Tutor/SOP.

---

## UNATTENDED MODE

- Running non-interactively. Do **NOT** ask questions in terminal.
- Write questions to `scholar/outputs/orchestrator_runs/questions_needed_<run>.md` and continue.
- Before generating new questions, read the latest `scholar/outputs/orchestrator_runs/questions_resolved_*.md` (if present). Treat those as answered and do **NOT** re-ask them.
- Only include **open** items in `questions_needed_<run>.md`; answered items belong in `questions_resolved_*.md`.
- Use defaults: Module group M0–M6 + bridges.
- Always produce a plan update: `scholar/outputs/plan_updates/plan_update_<run>.md` (required every run).
- Always produce a review summary: `scholar/outputs/review/review_<run>.md`.
- Maintain the questions dashboard: append open items to `scholar/outputs/questions_dashboard.md`.
- If questions exist, **research + answers are mandatory**:
  - Create research notes in `scholar/outputs/research_notebook/`.
  - Write `scholar/outputs/orchestrator_runs/questions_answered_<run>.md` with Q → A → evidence links.
  - If you cannot answer, mark the run **BLOCKED** and explain why.
- Always draft proposals when improvement candidates exist. `safe_mode` only controls whether patch drafts are allowed.
- Always generate a digest on run completion: `scholar/outputs/digests/digest_<run>.md`.
- If approvals exist, write an implementation bundle in `scholar/outputs/implementation_bundles/` and verify the change before closing the run.


---

## OUTPUT FORMAT (Every Run)

End each run with these sections in the run log:

### What I Learned This Run (5 bullets max)
Plain English summary of insights discovered.

### Action Items
Mark with ⚡: `⚡ [action description]`

### Warnings
Mark with ⚠️: `⚠️ [warning description]`

### Coverage
List artifacts used (with file paths) and any gaps vs `scholar/inputs/ai_artifacts_manifest.json`.

### Review Summary
Provide the path to the review summary produced in `scholar/outputs/review/`.

### Digest
Provide the path to the digest produced in `scholar/outputs/digests/`.

### Questions Dashboard
List any questions appended to `scholar/outputs/questions_dashboard.md`.



---

## EXECUTION PHASES

### Phase 0: PLAN (required)
1. Define scope + targets for this run.
2. Write `scholar/outputs/plan_updates/plan_update_<run>.md` with:
   - System summary (1 short paragraph)
   - Improvement questions (how to make the system better)
   - Planned improvements + rationale
   - Draft plan edits (target files)

### Phase 1: AUDIT (Brain)
1. Read recent session logs from `brain/session_logs/` (last 7 days or since last run).
2. Check for friction patterns: confusion, rework, low ratings, skipped steps.
3. Apply the **Probe-Before-Teach Rule**: When auditing Tutor sessions, verify that retrieval was attempted BEFORE explanation was given. Flag violations.
4. Apply the **High-Utility Technique Checklist** (see below). Flag sessions missing these.

### Phase 1b: AUDIT (System)
1. Review canonical SOP files (modules/engines/frameworks) and note gaps vs telemetry.
2. Surface unclear rules or missing guardrails as candidate questions.
3. Append unresolved questions to `scholar/outputs/questions_dashboard.md`.


### Phase 2: RESEARCH (required if questions exist)
1. If audit reveals unknowns or gaps, research them (web search).
2. Produce a research note: `scholar/outputs/research_notebook/note_<topic>.md` (5–10 bullets, not essays).
3. If questions exist and research is not completed, mark the run BLOCKED.

### Phase 3: SYNTHESIZE
1. Produce **ONE** artifact with clear recommendations. Choose from:
   - Module Dossier (1–2 pages max): `scholar/outputs/module_dossiers/<group>_dossier.md`
   - Audit Report: `scholar/outputs/module_audits/<group>_audit.md`
   - Gap Analysis: `scholar/outputs/gap_analysis/<topic>.md`
2. Update run log: `scholar/outputs/orchestrator_runs/run_<YYYY-MM-DD>.md`
3. Deduplicate and rank recommendations; include source file paths for traceability.
4. If artifact not produced, write blocker summary explaining why.
5. Write review summary: `scholar/outputs/review/review_<run>.md`.
6. Generate digest: `scholar/outputs/digests/digest_<run>.md`.

### Phase 3b: IMPLEMENT (Approval-Gated)
1. Apply only approved changes.
2. Write implementation bundle: `scholar/outputs/implementation_bundles/implementation_<run>.md`.
3. Verify outcomes and record pass/fail evidence.
4. If verification fails, revert the change and document the rollback.


### Phase 4: ANSWER QUESTIONS (required if questions exist)
1. Write `scholar/outputs/orchestrator_runs/questions_answered_<run>.md`.
2. For each question, include:
   - Q: <question>
   - A: <answer>
   - Evidence: link to research note(s) or source paths

---

## HIGH-UTILITY TECHNIQUE CHECKLIST (Dunlosky Research)

Flag sessions that don't use at least one of these proven techniques:

| Technique | What to look for |
|-----------|------------------|
| **Retrieval practice** | Testing yourself before reviewing answers |
| **Spaced practice** | Distributed learning across days, not cramming |
| **Elaborative interrogation** | Asking "why" and "how" questions |
| **Self-explanation** | Explaining concepts in own words |
| **Interleaved practice** | Mixing different problem types |

---

## DIGEST TRIGGER

Every orchestrator run produces a digest:
- Output: `scholar/outputs/digests/digest_<run>.md`
- Include: recurring proposal themes, overlaps, differences, and a ranked "major proposal" summary.


---

## ARTIFACT SIZING

Keep outputs focused and scannable:
- **Dossiers**: 1–2 pages max (not exhaustive)
- **Research notes**: 5–10 bullets
- **Audits**: Key findings + recommendations, not transcripts

---

## STOP CONDITIONS

Stop the run when:
- Current phase complete and no urgent next item
- Stuck > 60 minutes → write blocker to `scholar/outputs/orchestrator_runs/blocker_<DATE>.md`
- Runtime > 60 minutes

---

## GUARDRAILS

- **READ-ONLY (until approval)**: Never modify files in `sop/`, `brain/`, or `dist/` without explicit approval.
- **BOUNDED**: Each proposal = ONE change.
- **UNATTENDED**: Output to designated lanes only.

