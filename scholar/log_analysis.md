# Log Analysis Guide (Scholar)

## How to use

The Scholar scans session logs to extract diagnostic signals of learning efficiency and system behavior. Analysis should be focused, time-efficient, and result in a one-page audit report that highlights patterns rather than narrating the session. Focus on the *mechanics* of the learning, not the content.

## Inputs

- Brain session logs (`brain/session_logs/*.md`).
- Must be explicitly allowlisted in `scholar/inputs/audit_manifest.json`.

## Output

- Analysis reports saved to `scholar/outputs/reports/audit_<YYYY-MM-DD>_<topic>.md`.
- Rule: Propose exactly **ONE primary recommendation** per audit.

---

## What to Extract (Checklists)

### 1) Data Integrity Checks

*Objective: Ensure the telemetry is valid for downstream processing.*

- [ ] Is the header complete (Date, Topic, Mode)?
- [ ] Is the `Source-Lock` section present?
- [ ] Are `Errors/Misconceptions` fields populated?
- [ ] Are start/stop timestamps valid (accounting for overnight shifts/scattered windows)?
- [ ] Does any section overlap or show missing data "black holes"?

### 2) Protocol Compliance Signals

*Objective: Verify if the Tutor is following the v9.2 SOP.*

- [ ] **M0 Planning:** Is there a clear target and explicit plan?
- [ ] **Source-Lock:** Did the Tutor refuse to proceed until sources were provided?
- [ ] **Retrieval-First:** Was the user quizzed *before* an explanation was started?
- [ ] **Closeout:** Did the session end with a summary and card creation?
- [ ] **Pattern:** Note any instance of "SOP Drift" (AI improvising outside the manual).

### 3) Learning Effectiveness Signals

*Objective: Identify if knowledge actually transferred.*

- [ ] **Retest Success:** Did the user correct their error upon first retest?
- [ ] **Anchor Specificity:** Are anchors specific (e.g., "Vastus medialis landmark") or vague (e.g., "The leg")?
- [ ] **Weak Anchors:** Which items were missed multiple times in one session?
- [ ] **Signal:** Improvement in confidence rating (if pre/post data exists).

### 4) Friction / Overhead Signals

*Objective: Identify what slows down the learning process.*

- [ ] **Planning Loop:** Is the AI spending >3 turns on planning for a simple topic?
- [ ] **Step Skipping:** Is the user/AI repeatedly skipping mandated steps (e.g., drawings)?
- [ ] **Fatigue Signals:** Are user responses becoming shorter or more frustrated near the end?
- [ ] **Overnight/Shift Latency:** Do long gaps between turns correlate with higher error rates?

### 5) Error Pattern Mining

*Objective: Catalog where the mental model is breaking.*

- [ ] **Categorization:** Count counts for `Conceptual`, `Discrimination`, and `Recall` errors.
- [ ] **Repeat Offenders:** Note errors that recurred in this log *after* initial corection.
- [ ] **Discrimination Pairs:** Identify specific "X vs Y" confusions (e.g., Supraspinatus vs Infraspinatus).
- [ ] **Numeric Norms:** Flag if ROM values or numeric targets are consistently weak.

### 6) Spacing / Follow-up Signals

*Objective: Track the "Health" of the spaced repetition loop.*

- [ ] **Review Tasks:** Were specific "Review in 24h" tasks generated?
- [ ] **Next-Day Checks:** Did the session start with a recall check of the *previous* session's weak anchors?
- [ ] **Gaps:** Any logs indicating a review was missed or significantly delayed?

### 7) Actionable Outputs

*Objective: Turning findings into system improvements.*

- [ ] **Recommendation Rule:** Extract ONE highest-leverage operational fix.
- [ ] **RFC Threshold:** If a rule in `sop/` is consistently failing, escalate to a **Change Proposal**.
- [ ] **Experiment Threshold:** If a new strategy is suggested, escalate to an **Experiment Design**.

---

## Common Failure Patterns (Catalog)

- **High Recall Errors:** Implying insufficient retrieval reps or poor initial encoding.
  - *Recommendation:* Increase retrieval frequency or force a phonetic hook (KWIK).
- **Discrimination Drift:** Recurring "A vs B" confusion.
  - *Recommendation:* Introduce mandatory compare/contrast drills (M3-encode).
- **High Friction / Low Throughput:** "Chatty" planning or over-engineered steps.
  - *Recommendation:* Simplify the relevant module (e.g., M0) or move to Light Mode.
- **Source-Lock Failure:** AI providing facts without an explicit packet match.
  - *Recommendation:* Audit grounding safeguards in `runtime-prompt.md`.
- **Closeout Stall:** Session ends abruptly without card extraction.
  - *Recommendation:* Enforce a "Hard Stop" rule with mandatory 1-card minimum.
