# Tutor transcript and working summary for context compaction

**Status:** accepted

When a **Tutor** teach leg grows long, the model context window fills. We persist every turn in a **transcript** (already `tutor_turns`) but must not send the full transcript on each LLM call. Learners also need to recover exact wording later and to build polish artifacts from both raw detail and organized summaries.

We adopt a **two-layer memory** per teach leg: an append-only **transcript** plus versioned **working summaries** used in the live prompt. On compaction, an LLM generates a new summary; the prompt thereafter uses **latest working summary + recency tail** (last K full turns). Summaries and checkpoint digests feed polish only through **editable drafts** that the learner approves. General Q&A turns may share the same `tutor_session_id` but are tagged `general` and are excluded from teach compaction unless explicitly promoted.

**Considered options:** (1) Summary-only prompt — rejected because it drops nuance and feels forgetful. (2) Truncate old turns without summary — rejected; loses teach continuity. (3) Ephemeral chat with no transcript — rejected; conflicts with polish and “find specifics later.”

**Consequences:** New persistence for summary versions and turn `mode` tags; `send_turn` history assembly changes; UI must stop calling token telemetry “compaction” without generating a summary. Memory capsules remain an optional curated snapshot, not a replacement for the transcript.
