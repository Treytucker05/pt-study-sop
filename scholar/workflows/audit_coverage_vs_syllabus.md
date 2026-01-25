# Workflow: Audit Coverage vs Syllabus

**Lane:** Reports → Scholar  
**Goal:** Check whether actual study activity (Brain + RAG usage) is aligned with the syllabus and upcoming assessments.

## Inputs

- `brain/data/pt_study.db` (read-only), focusing on:
  - `courses`, `course_events`, `topics`, `study_tasks`, `sessions`, `rag_docs`.
- The original syllabus files or a syllabus import artifact (if available).
- Recent Tutor conversations for the same time window (optional, but helpful).

## Steps

1. **Choose a course + time window**
   - Select one active course.
   - Choose a time window (e.g., last 2–4 weeks leading up to an exam).

2. **Map syllabus expectations**
   - From `course_events` and `topics`, identify:
     - Upcoming or recently completed exams/quizzes/major assignments.
     - The topics and doc sets that should have been covered.

3. **Extract actual activity**
   - From `sessions` and `study_tasks`:
     - Which topics were actually studied?
     - How much time was logged per topic?
   - From `rag_docs`:
     - Which docs (notes, textbooks, transcripts) were ingested and/or tagged for these topics?

4. **Compare expected vs actual**
   - For each target exam/quiz:
     - List expected topics (from syllabus).
     - Mark each as:
       - **Well covered** – multiple sessions + notes ingested + RAG docs present.
       - **Partially covered** – some sessions or notes, but thin.
       - **Uncovered** – little or no study activity or RAG content.

5. **Identify at-risk areas**
   - Highlight:
     - Topics with upcoming high-stakes events but low coverage.
     - Syllabus sections with no corresponding RAG docs or notes.

## Outputs

- Report in `scholar/outputs/reports/`, e.g.:
  - `scholar/outputs/reports/audit_coverage_vs_syllabus_YYYY-MM-DD.md`

Include:

- Table of upcoming/just-completed assessments and coverage status.
- List of **at-risk topics** with reasons (no sessions, no notes, no RAG docs, etc.).
- Concrete “next 3 moves” recommendations for the planner.

## Change Proposals

File **ONE-change-only** proposals in:

- `scholar/outputs/promotion_queue/change_proposal_coverage_*.md`

Examples:

- “Automatically create `study_tasks` for any syllabus topic with <X minutes logged in the week before an exam.”
- “Require that each new exam-level topic has at least one ingested note document in `rag_docs`.”
- “Expose an ‘at-risk topics’ card on the dashboard Plan tab, fed by this audit.”
