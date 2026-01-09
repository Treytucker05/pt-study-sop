# Module Dossier — Brain Session Log Template

- Path: `sop/gpt-knowledge/brain-session-log-template.md`
- Phase: Telemetry / Framework
- Last Updated: 2026-01-07

## 1. Operational Contract

- **Purpose:** Standardize the capture of session data for Scholar auditing and Brain ingestion.
- **Trigger(s):** M6 Wrap; `wrap` command.
- **Required Inputs:** All session variables (Anchors, Errors, Ratings, Duration).
- **Required Outputs:** Formatted markdown log in `brain/session_logs/`.
- **Exit Criteria:** Log saved and checked against schema.
- **Failure Modes / Drift Risks:** Missing error details; mismatched formatting (breaking `ingest_session.py`); over-generalized reflection.

## 2. Pedagogy Mapping

- **Retrieval Practice:** [N/A]
- **Spacing/Interleaving:** [PASS] - Captures weak anchors for future cards.
- **Cognitive Load:** [N/A]
- **Metacognition:** [PASS] - Forces reflection on "What Worked" and "What Needs Fixing."

## 3. Evidence Map

- **Metacognitive Monitoring**: Self-reflection following retrieval enhances future study allocation (Source: Bjork).
- **Data-Driven Instruction**: Consistent telemetry enables precise auditing of pedagogical failure points.

## 4. Improvement Candidates (Rabbit Holes Allowed)

- "Automated Friction Scoring": AI calculates a session friction score based on user commands (e.g., # of `mold` or `rollback` events).
- "Mastery Tagging": Include a "Successive Relearning Count" for each anchor in the log.

## 5. Promotion Candidates (MAX 3)

1. **[Friction Tally]**: Add a numeric "Friction Events" counter to the `Execution Details` section to track `mold` and `rollback` usage.

## 6. Guardrails (What Must Not Change)

- Header structure (v9.1).
- Date and Duration fields.
