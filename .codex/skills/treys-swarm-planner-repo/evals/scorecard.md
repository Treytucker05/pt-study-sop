# Scorecard

Score each category from `0-2`.

- `0` = failed or missing
- `1` = partially correct
- `2` = clearly correct
- `n/a` = not relevant for this benchmark case; exclude from the total

## Categories

- `mode_fit`
  - did the planner choose the lightest viable mode?
- `overplanning_control`
  - did it avoid unnecessary swarm structure?
- `validation_gate`
  - did it separate executable validation from review?
- `first_wave_correctness`
  - did it identify a truly unblocked first wave?
- `canon_alignment`
  - did it stop or adapt correctly when canon conflicted?
- `execution_surface_selection`
  - did it choose the right one of the three repo execution surfaces?
- `queue_conversion_correctness`
  - did it avoid converting blocked or later waves?
- `replan_metadata_quality`
  - were `blocked_reason`, `replan_trigger`, and `expected_evidence` specific?

## Comparison Notes

For each planner revision, also record:

- total score
- eligible category count
- biggest regression
- biggest improvement
- whether the revision should be kept or rolled back
