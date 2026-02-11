# Scholar Orchestrator: Tutor Study Runbook

Role: Scholar Meta-System — evaluate and improve the study procedures defined in the SOP library. No telemetry required.

---

## UNATTENDED MODE (Tutor Study)

- Running non-interactively. Do **NOT** ask questions in terminal.
- Write questions to `scholar/outputs/orchestrator_runs/questions_needed_<run>.md` and continue.
- Before generating new questions, read the latest `scholar/outputs/orchestrator_runs/questions_resolved_*.md` (if present). Treat those as answered and do **NOT** re-ask them.
- Only include **open** items in `questions_needed_<run>.md`; answered items belong in `questions_resolved_*.md`.
- **No session logs or telemetry are required.** Analyze only the SOP library files in `sop/library/`.
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
Plain English summary of insights discovered about the SOP library and study procedures.

### Action Items
Mark with ⚡: `⚡ [action description]`

### Warnings
Mark with ⚠️: `⚠️ [warning description]`

### Coverage
List SOP library artifacts used (with file paths) and any gaps.

### Review Summary
Provide the path to the review summary produced in `scholar/outputs/review/`.

### Digest
Provide the path to the digest produced in `scholar/outputs/digests/`.

### Questions Dashboard
List any questions appended to `scholar/outputs/questions_dashboard.md`.

---

## EXECUTION PHASES (Tutor Study)

### Phase 0: PLAN (required)
1. Define scope + targets for this run (SOP library only).
2. Write `scholar/outputs/plan_updates/plan_update_<run>.md` with:
   - System summary (1 short paragraph describing the SOP library and study procedures)
   - Improvement questions (how to make study procedures more effective)
   - Planned improvements + rationale
   - Draft plan edits (target files in sop/library/)

### Phase 1: AUDIT (SOP Library)
1. Read SOP library files from `sop/library/` (00-overview.md through 14-*.md, README.md).
2. Evaluate study procedures for:
   - Pedagogical effectiveness (retrieval practice, spaced repetition, active recall, interleaving)
   - Clarity and completeness of rules and workflows
   - Consistency across modules (learning cycle, session flow, modes, logging)
   - Gaps vs learning science best practices
3. Surface unclear rules or missing guardrails as candidate questions.
4. Append unresolved questions to `scholar/outputs/questions_dashboard.md`.

### Phase 2: RESEARCH (required if questions exist)
1. If audit reveals unknowns or gaps, research them (web search, learning science sources).
2. Focus on: spaced repetition, testing effect, desirable difficulties, interleaving, retrieval practice, feedback timing.
3. Produce a research note: `scholar/outputs/research_notebook/note_<topic>.md` (5–10 bullets, not essays).
4. If questions exist and research is not completed, mark the run BLOCKED.

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

## LEARNING SCIENCE CHECKLIST (Tutor Study)

When evaluating SOP library content, flag gaps vs these evidence-based techniques:

| Technique | What to look for in SOP |
|-----------|-------------------------|
| **Retrieval practice** | Procedures that test before teaching; quiz-before-explain |
| **Spaced practice** | Scheduling rules; distributed vs massed practice |
| **Elaborative interrogation** | Guidance for "why" and "how" questions |
| **Self-explanation** | Steps that require explaining in own words |
| **Interleaved practice** | Mixing topics/modules vs blocking |

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
- **SOP LIBRARY ONLY**: This mode does not require or use brain/session_logs or telemetry.
