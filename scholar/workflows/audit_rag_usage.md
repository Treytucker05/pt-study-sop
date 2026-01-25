# Workflow: Audit RAG Usage & Source-Lock Adherence

**Lane:** Reports → Scholar  
**Goal:** Verify that Tutor responses are grounded in allowed RAG sources and that Source-Lock rules are followed.

## Inputs

- Sample of Tutor conversations (exported from dashboard or CustomGPT).
- `brain/data/pt_study.db` (read-only) – focus on `rag_docs`, `sessions`, `courses`, `course_events`, `topics`.
- Any retrieval logs available (if present) or manual notes on which sources were cited.

## Steps

1. **Select a window**
   - Choose a recent time window (e.g., last 7–14 days).
   - Identify 3–5 representative Tutor sessions that touched high-stakes material (exams, major assignments).

2. **Map sessions → sources**
   - For each session:
     - Identify the declared `source_lock` (Brain session logs or plan snapshot).
     - List which `rag_docs` should be in-scope (notes, textbooks, transcripts, slides).
     - Extract any citations or explicit source references used in answers.

3. **Check Source-Lock adherence**
   - For each answer in the sample:
     - Did the Tutor stay within the allowed doc types and IDs?
     - When no in-scope sources were available, did it clearly label answers as *unverified* or redirect to gathering sources?

4. **Rate compliance**
   - Assign a simple rating per session:
     - ✅ **Compliant** – all answers grounded in allowed sources or explicitly unverified.
     - ⚠️ **Mixed** – some answers ungrounded / missing citations.
     - ❌ **Non-compliant** – frequent ignoring of Source-Lock.

5. **Summarize failure modes**
   - Identify recurring patterns, e.g.:
     - RAG not consulted when it should be.
     - Notes ignored in favor of generic textbook chunks.
     - No citations even when RAG was used.

## Outputs

- A short report in `scholar/outputs/reports/`, e.g.:
  - `scholar/outputs/reports/audit_rag_usage_YYYY-MM-DD.md`

The report should include:

- Overall compliance summary for the window.
- Concrete examples of good and bad behavior.
- A prioritized list of failure modes (max 3).

## Change Proposals

For each *distinct* failure mode, file a **ONE-change-only** proposal in:

- `scholar/outputs/promotion_queue/change_proposal_rag_usage_*.md`

Examples:

- “Require Tutor to show at least one cited chunk for any explanation longer than N tokens.”
- “Bias retrieval to personal notes (`doc_type='note'`) before textbooks when available.”
- “When RAG returns zero hits, Tutor must explicitly say sources are missing and ask to ingest them.”
