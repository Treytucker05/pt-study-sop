# 05: Material Ingestion (Pre-Study)
**Purpose:** Turn raw course material into a Tutor-ready packet so the session can start fast.

---

## When to Use
- New topic or new set of learning objectives (LOs)
- You feel lost at the start of a session
- Materials are scattered (slides, video, textbook) and not yet organized
- You are resuming after a gap

---

## Inputs (Source-Locked)
- Learning objectives (from syllabus or course guide)
- Slides/handouts
- Lecture video(s)
- Textbook chapter(s)
- Labs or practical notes (if applicable)
- NotebookLM is the source of truth for raw materials

**Rule:** Every extracted claim must be tied to a specific source (page, slide, timestamp).

---

## Outputs (Tutor-Ready Packet)
Minimum viable packet (MVP):
- LO(s) for today (1-3 max)
- Source-lock list (pages, slide numbers, timestamps)
- 2-4 buckets (high-level map)
- Glossary: top 5-10 terms with function-first definitions
- Key mechanisms or step sequences (short, accurate)
- 1 diagram or figure with labels
- 5-10 retrieval prompts
- Confusions or boundary cases (what it is NOT)

---

## Timebox Rules
- Default: 15 minutes
- Hard stop: 25 minutes
- If you hit timebox, ship the MVP packet and start the session

---

## Protocol (15-Minute Ingestion)
1) **Select LOs**: pick 1-3 LOs that define the session scope.
2) **Source-lock**: list exact sources (slide numbers, page ranges, video timestamps).
3) **Quick scan**: headings, figures, summaries; draft 2-4 buckets.
4) **Extract essentials**:
   - Definitions (function before structure)
   - Key mechanisms or sequences
   - 1 example and 1 boundary case
5) **Capture visuals**: one diagram or figure with labels.
6) **Draft retrieval prompts**: 5-10 questions that force recall.
7) **Format packet**: use the template below and hand to Tutor.

---

## NotebookLM Workflow (Optional)
- Load all raw sources into NotebookLM.
- Ask for LO-aligned summaries with citations.
- Verify critical facts against the source.
- Copy verified items into the Tutor-ready packet.

---

## LLM Extraction Prompt (Source-Locked)
Use this when asking an AI to help extract content.

SYSTEM:
You are a study assistant. Only use the provided sources. Cite slide/page/time for every claim. If a claim is not supported, say "UNVERIFIED".

USER:
Goal: Build a Tutor-ready packet for the LO(s): [paste LOs].
Sources: [list files, pages, slide numbers, timestamps].
Return:
- Buckets (2-4)
- Glossary (function-first)
- Key mechanisms/steps
- 1 example and 1 boundary case
- 5-10 retrieval prompts
- Confusions list

---

## Tutor-Ready Packet Template
```
Topic:
LOs:
Source-lock:
Buckets:
Glossary (function-first):
Key mechanisms/steps:
Diagram/figure:
Example:
Boundary case:
Retrieval prompts:
Confusions:
```

---

## Guardrails
- Do not begin teaching during ingestion.
- Keep extraction shallow; deep learning happens in the session.
- Function before structure; no imagery before meaning.
- Mark anything without a clear source as UNVERIFIED.

---

## Exit Condition
- Tutor-ready packet completed
- Source-lock list included
- Ready to start Session Start checklist (06)
