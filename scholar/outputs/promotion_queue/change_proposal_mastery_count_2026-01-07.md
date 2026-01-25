# Change Proposal — Successive Relearning Mastery Count

- RFC ID: RFC-20260107-004
- Date: 2026-01-07
- Scope: `sop/gpt-knowledge/brain-session-log-template.md` & `M6-wrap.md`
- Status: Draft

## 1. Goal Description

Implement a "Mastery Count" (0–3) for Anchors to track Successive Relearning progress across sessions.

## 2. Evidence

- **Pedagogy Literature**: Rawson & Dunlosky (2011) demonstrate that memory stability requires multiple successful recalls across spaced sessions (Successive Relearning).
- **Brain Telemetry**: Synthesis Report 2026-01-07 identified that current sessions treat all anchors as "new" or "re-studied" without a clear mastery stabilization metric.

## 3. Proposed Changes

- **Target File**: `sop/gpt-knowledge/brain-session-log-template.md`
- **Change**: Modify the `Anchors Locked` section to include a numeric Mastery Level.
- **Format**: `[Term]: [Hook] (Mastery: X/3)`
- **Logic**:
  - New anchor: 1/3.
  - Successful recall in later session: +1.
  - Missed recall: Reset to 1/3.
  - Mastered: 3/3 (Stop scheduling for 7+ days).

## 4. Risks & Guardrails

- **Risk**: Manual tracking by student might be tedious.
- **Mitigation**: AI should automatically suggest the count based on the "Resume" or past logs.
- **Guardrail**: **Brain Schema compatibility**. The counter must be inside parentheses or a field that the ingestor can skip or optionally read.

## 5. Verification Plan

- See `experiment_mastery_count_2026-01-07.md`.
