**Ledger Snapshot**
- Goal: Create a new Ralph prd.json to review Scholar question handling, proposals, health/research loop, gaps usage, improvement candidates, and strategic digests; determine if they are connected to learning or just dashboard artifacts.
- Now: Inspect `scripts/ralph/prd.json` and `scripts/ralph/progress.txt` to determine archive/overwrite steps; draft new prd.json stories.
- Next: After confirmation, archive prior run and write new prd.json.
- Open Questions: Confirm permission to archive existing Ralph run and overwrite prd.json/progress.txt.

Completed the Scholar Orchestrator unattended run outputs (audit + run log + questions), but I detected an unexpected change to `CONTINUITY.md` (it now points to the Ralph prd.json work). Per instructions, I stopped before overwriting it.

Files written:
- `scholar/outputs/module_audits/M0-M6-bridge_audit_2026-01-12_071621.md`
- `scholar/outputs/orchestrator_runs/run_2026-01-12.md` (appended a new run section)
- `scholar/outputs/orchestrator_runs/questions_needed_2026-01-12_071621.md`

**Problem Framing**
- CONTINUITY.md changed unexpectedly mid-run; I need guidance on whether to restore the ledger to the Scholar Orchestrator state or keep the current Ralph-focused content.

**Constraints**
- Must not overwrite unknown changes without your approval.
- Ledger must reflect the canonical session state.

**Options**
- Keep current CONTINUITY.md as-is and switch to the Ralph prd.json task.
- Overwrite CONTINUITY.md with the Scholar Orchestrator run context.
- Merge both goals into a single ledger state.

**Trade-offs**
| option | pros | cons | risks | when to choose |
|---|---|---|---|---|
| Keep as-is | Preserves latest ledger change | Loses Scholar run context | Orchestrator work becomes undocumented | You want to pivot to Ralph work now |
| Overwrite | Restores Scholar run context | Discards recent ledger edits | Clobbers someone else’s update | Scholar run is priority |
| Merge | Keeps both contexts | Longer ledger, more complexity | Confusing focus | You want parallel tracking |

**Recommendation + why**
- I recommend the merge option if you want to preserve both streams; otherwise choose overwrite if the Scholar run should be primary.

**Follow-ups**
1) Should I merge the Scholar run state into `CONTINUITY.md`, or overwrite it entirely?  
2) If you prefer to pivot to the Ralph prd.json work, should I leave the Scholar ledger updates out and continue with Ralph?