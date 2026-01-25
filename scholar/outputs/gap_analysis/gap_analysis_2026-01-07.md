# Gap Analysis — 2026-01-07

- Auditor: The Scholar
- Target: Tutor System (v9.2)

## 1. Gap Inventory

| Gap Name | Description | Impact | Confidence |
|---|---|---|---|
| SR Mastery Tracking | No aggregate counter for "successive relearning" across sessions. | High (Retention) | High |
| Interleaved Scheduling | Next-review planning is siloed; doesn't cross-reference related topics. | Med (Transfer) | High |
| Automated Friction Scoring | Auditing friction is currently manual; no numeric session-level metric. | Med (Audit) | High |
| Note-to-Prompt Bridge | No direct workflow for converting session anchors into persistent notes. | Low (Workflow) | Med |

## 2. Evidence from Brain Telemetry

- **Session Log 2025-12-11 (Geriatrics)**: User missed "Normal vs Common Abnormal" landmarks multiple times; the system scheduled one 24h review but lacked a "Mastery Required" block to ensure he eventually passed them 3x.
- **Synthesis Report 2026-01-07**: Identified "Session Bloat" (60+ min) due to manual card creation and slow selection of review dates.

## 3. Evidence from Pedagogy Literature

- **Successive Relearning**: Rawson & Dunlosky (2011) demonstrate that memory stability requires multiple spaced successful recalls (n=3 is common standard).
- **Expertise Reversal**: Sweller (2024) warns that novices need different scaffolds than experts; currently, our "Core Mode" is static rather than adaptive.

## 4. Proposed Additions

- **Module M-SR (Spaced Retention)**: A module dedicated to tracking anchor mastery counts and generating interleaved schedules across the `brain/` directory.

## 5. Promotion Candidates (MAX 3)

- **[Anchor Mastery Counter]**: Add a numeric mastery count (0-3) to the `Locked Anchors` section of the log template. (ONE-change-only)
- **[Interleaved Planning Step]**: Modify M0 to require checking the "Weak Anchors" of the *previous* session before starting today's session. (ONE-change-only)

## 6. Risks & Constraints

- **Risk**: Over-complicating the log template might break the ingestion script.
- **Guardrail**: **Brain Schema Compatibility**. Any change to the log template must be backwards-compatible.
