# Module Dossier — Frameworks: Levels + H/M/Y Series

- Path: `sop/gpt-knowledge/levels.md`; `sop/gpt-knowledge/H-series.md`; `sop/gpt-knowledge/M-series.md`; `sop/gpt-knowledge/Y-series.md`
- Phase: Framework
- Last Updated: 2026-01-09

## 1. Operational Contract

- **Purpose:** Provide explanation depth gating (Levels) and structured scans/encodings (H/M/Y) to accelerate understanding while limiting load.
- **Trigger(s):** User asks for explanation/overview/encoding; M2/M3/M4 modes; unclear topic needing orientation; user jumps to L4 without L2 understanding.
- **Required Inputs:** Topic or concept; desired mode (Core/Sprint/Drill); user's current understanding (L2 gate); constraints (time, depth).
- **Required Outputs:** Concise structured output following selected framework; explicit gating status for Levels; selection rationale if non-default framework used.
- **Exit Criteria:** L2 teach-back achieved before L4; output within <=6 bullets or 2 short paragraphs; user confirms comprehension or next step.
- **Failure Modes / Drift Risks:** Skipping L2 gate, overlong outputs, wrong framework selection, missing "unverified" flags when sources are absent, mixing frameworks without clarity.

## 2. Pedagogy Mapping

- **Retrieval Practice:** PASS - teach-back at L2 and framework prompts require recall.
- **Spacing/Interleaving:** PARTIAL - repetition is implied but no explicit spacing cadence.
- **Cognitive Load:** PASS - concise structures and H3 load stack reduce overload.
- **Metacognition:** PASS - H5 ICAP, M-SRL, and Levels gating encourage self-monitoring.

## 3. Evidence Map

- `sop/gpt-knowledge/levels.md`: L1-L4 ladder; L2 gate required before L4; Core/Sprint usage examples.
- `sop/gpt-knowledge/H-series.md`: H1 default scan plus alternate H frameworks; concise output guidance.
- `sop/gpt-knowledge/M-series.md`: M2/M6/M8 + M-SRL/M-ADDIE/M-STAR; default M2 guidance.
- `sop/gpt-knowledge/Y-series.md`: Quick orientation frameworks; brevity guidance.

## 4. Improvement Candidates (Rabbit Holes Allowed)

- Add a short decision tree mapping scenario -> Levels vs H vs M vs Y.
- Define explicit handoff between Levels gating and framework selection in Core mode scripts.
- Provide one concrete example per Y-series item to reduce ambiguity.

## 5. Promotion Candidates (MAX 3)

(Actionable, ONE-change-only)

1. **None (safe_mode=false)**: Promotion Queue artifacts suppressed this run.

## 6. Guardrails (What Must Not Change)

- Source-Lock: Runtime Canon in `sop/gpt-knowledge/` remains authoritative for framework text.
- NotebookLM Gating: Preserve notebooklm-bridge constraints and read-only workflow.
- Brain Schema: No schema changes or ingestion behavior shifts.
