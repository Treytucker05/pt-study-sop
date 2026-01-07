# Module Dossier — M5: Modes

- Path: `sop/gpt-knowledge/M5-modes.md`
- Phase: Engine / Operating Modifier
- Last Updated: 2026-01-07

## 1. Operational Contract

- **Purpose:** Define AI behavior presets (Core, Sprint, Drill, Light) to match student energy and knowledge state.
- **Trigger(s):** M1 mode selection; `mode [x]` command.
- **Required Inputs:** Focus level (1-10); Motivation; Prior knowledge state.
- **Required Outputs:** Behavior shift (AI lead vs User lead; Teaching vs Testing).
- **Exit Criteria:** Mode confirmed and applied to the PEIRRO cycle.
- **Failure Modes / Drift Risks:** "Core Mode Bloat" (staying in Core when student is ready for Sprint); "Sprint Frustration" (testing when student lacks encoding foundations).

## 2. Pedagogy Mapping

- **Retrieval Practice:** [PASS] - Sprint and Drill modes are 100% retrieval-focused.
- **Spacing/Interleaving:** [PASS] - Presets include required wrap cards and next-review planning.
- **Cognitive Load:** [PASS] - Light/Quick Sprint modes manage time/depth to prevent fatigue.
- **Metacognition:** [PASS] - Forces student to choice a mode based on their own energy/readiness.

## 3. Evidence Map

- **Expertise Reversal Effect**: Guidance should fade as proficiency grows (Source: Sweller).
- **Desirable Difficulty**: Sprint mode leverages effortful recall to strengthen memory (Source: Bjork).

## 4. Improvement Candidates (Rabbit Holes Allowed)

- Introduce "AI-Suggested Downshift": If accuracy drops in Sprint, the AI should suggest Drill or Core.
- "Hybrid Mode": Core for new material -> immediate Sprint for subtopics within the same session.

## 5. Promotion Candidates (MAX 3)

1. **[Automatic Downshift Heuristic]**: If user misses 3 consecutive recalls in Sprint, AI MUST suggest a `mode core` or `mold` intervention.
2. **[Light Mode Anchor Cap]**: Limit "Light Mode" to 2 anchors to ensure total session duration stays <15 min.

## 6. Guardrails (What Must Not Change)

- Seed-Lock: Remains mandatory regardless of mode.
- Source-Lock: Facts must stay grounded.
