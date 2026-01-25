# Workflow: Audit Notes as RAG Sources

**Lane:** Reports → Scholar  
**Goal:** Ensure the learner’s own notes are (a) being ingested into RAG, and (b) actually used and cited by the Tutor.

## Inputs

- `brain/data/pt_study.db` (read-only), focusing on:
  - `rag_docs` with `doc_type='note'`
  - `sessions`, `topics`, `courses`
- File tree under `notes/` (or whichever directory is used for markdown notes).
- Recent Tutor conversations for a sample of sessions.

## Steps

1. **Inventory notes vs rag_docs**
   - Walk the `notes/` directory and count how many `.md` files exist.
   - Query `rag_docs` for `doc_type='note'` and compare:
     - How many note files exist on disk vs. how many are ingested?
     - Are there notes for recent sessions that are not in `rag_docs`?

2. **Check linkage to Brain topics/sessions**
   - For a sample of notes:
     - Does the filename or front matter clearly encode course/topic/session?
     - Are those notes linked (by path or ID) to relevant `topics` and `sessions`?

3. **Check Tutor utilization**
   - For 3–5 recent Tutor sessions where notes exist:
     - Did retrieved/cited chunks come from `doc_type='note'` or only from textbooks/transcripts?
     - Are personal anchors and examples from notes being surfaced?

4. **Rate note utilization**
   - For the sampled window, categorize:
     - **High** – notes are widely ingested and frequently cited.
     - **Medium** – many notes exist but are underused.
     - **Low** – notes exist but rarely ingested or cited.

## Outputs

- Report in `scholar/outputs/reports/`, e.g.:
  - `scholar/outputs/reports/audit_notes_as_rag_YYYY-MM-DD.md`

Include:

- Ingestion coverage (notes on disk vs `rag_docs` count).
- Qualitative assessment of how often notes are cited.
- Specific examples where notes would have improved a Tutor answer but were not used.

## Change Proposals

Create ONE-change-only proposals in:

- `scholar/outputs/promotion_queue/change_proposal_notes_*.md`

Examples:

- “Add a nightly `notes → rag_docs` sync script and a dashboard alert when notes are out-of-sync.”
- “Bias Tutor retrieval to prefer notes over textbooks for WRAP, recap, and exam review flows.”
- “Require that any ‘weak anchor’ from sessions has at least one corresponding note chunk ingested into RAG.”
