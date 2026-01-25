# Experiment Design — Probe-First Gating

- Exp ID: EXP-20260107-002
- Linked RFC: RFC-20260107-002
- Date: 2026-01-07

## 1. Hypothesis

Inverting M2 to "Probe-First" will reduce session-level friction (mold/rollback events) and improve M3 encoding speed by ~15% for partially-known topics.

## 2. Variables

- **Independent Variable**: Gating Order (Probe-then-Scan vs Scan-then-Probe).
- **Dependent Variables**:
  - Time to first "Locked Anchor" (M3 completion).

  - # of "Friction Events" (Mold/Rollback)

  - User "Boredom" signal (Passive "okay" or "next" usage).

## 3. Implementation

- **Group A (Control)**: Standard v9.2 Core Mode.
- **Group B (Test)**: Probe-First modified prompt.

## 4. Success Criteria

- [X] Decrease in `M2 -> M3` transition time by >10%.
- [X] Decrease in "Passive Agreement" responses in M2.
- [X] Primary Anchor recall score >85% in M6 Wrap.

## 5. Rollback Criteria

- User "Total Stalls" (requires >3 turns to exit M2) increase by >20%.
- Systemic degradation in first-attempt recall accuracy.
