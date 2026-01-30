# Blueprint Fact-Check and Merge (v9.3)

## What to keep
- 3+2 weekly rotation (Cluster A technical / Cluster B light).
- Sandwich ingestion (pre / active / post).
- Spaced retrieval 1-3-7-21 (default heuristic, adjustable).
- Exit ticket (free recall; muddiest point; next action hook).
- Metrics: calibration gap, RSR, cognitive load type, transfer check.

## What to tighten (reframes)
- Interleaving vs spacing:
  - Interleaving is best for discrimination among confusable categories within a class.
  - The 3+2 rotation is distributed practice and spacing across classes.
- No numeric forgetting claims: replace with "rapid forgetting occurs without review."
- Dual coding: treat as a helpful heuristic, not "2x" or guaranteed gains.
- Zeigarnik: do not claim reliable memory benefit; use next-action hook as friction reducer.
- RSR "85%" is not universal; use adaptive spacing rules instead.

## Merge mapping into SOP (MAP -> LOOP -> WRAP)
- MAP (M0/M1): weekly cluster plan, source lock, confusables list, schedule reviews.
- LOOP (M2/M3/M4): sandwich ingestion; active encoding with minimal diagram/example/boundary.
- WRAP (M6): exit ticket + spaced schedule + JSON logs + metrics.

## Gaps still needing user inputs
- Class list and cluster assignments (A/B).
- Exam dates and review windows.
- Tooling targets (Calendar/Tasks, Anki, NotebookLM).
- Preferred log storage location.

## Next implementation steps
- Update logging schema to v9.3 and align runtime prompts.
- Add weekly rotational plan prompt and exit ticket prompt.
- Ensure M0/M2/M3/M6 include the blueprint items and evidence nuance.
