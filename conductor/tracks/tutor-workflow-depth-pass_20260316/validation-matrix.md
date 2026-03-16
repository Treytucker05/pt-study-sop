# Validation Matrix: Tutor Workflow Depth Pass

## Purpose

Define the proof gates for the follow-on Tutor depth pass before implementation starts.

## Baseline metrics

| Metric | Current baseline | Target direction | Proof source |
|---|---:|---|---|
| Source-link coverage for Priming outputs | `0 / 7` content families | increase | `baseline-scorecard.md` |
| Extraction automation coverage for required Priming bundle fields | `0 / 7` content families | increase | `baseline-scorecard.md` |
| Publish artifact coverage | `0` richer Studio artifact families beyond notes/summaries/cards | increase | `baseline-scorecard.md` + Polish / Final Sync proof workflow |
| Brain analytics coverage | `6 / 9` target signal families | increase | `baseline-scorecard.md` + analytics response + Brain UI proof |

## Task gates

| Task | Gate | Evidence |
|---|---|---|
| `TDP-000` | sprint item + track docs exist | `TUTOR_TODO.md`, `conductor/tracks.md`, new track folder |
| `TDP-100` | baseline scorecard stored | `evidence.md` or attached baseline artifact |
| `TDP-110` | metrics locked in plan + validation matrix | updated `plan.md`, `validation-matrix.md` |
| `TDP-200` | sample workflow stores per-source priming outputs | workflow detail proof |
| `TDP-210` | source-level rerun works without bundle reset | manual rerun checklist |
| `TDP-220` | Priming assist writes back with traceability | saved priming bundle mutation |
| `TDP-300` | richer Studio artifact appears in Final Sync payload review | Polish bundle + Final Sync preview |
| `TDP-310` | richer artifact references persist in publish results | `publish_result` payload sample |
| `TDP-400` | analytics endpoint returns enriched signals | endpoint response sample |
| `TDP-410` | Brain UI renders enriched signals | UI proof note |
| `TDP-500` | full repo validation passes | build/test/smoke outputs + manual enriched workflow checklist |

## Final closeout commands

- `cd dashboard_rebuild && npm run build`
- `pytest brain/tests/`
- `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`

## Manual enriched workflow checklist

- Brain launches Tutor with the expected handoff context
- Priming produces source-linked outputs
- Tutor still records notes, feedback, and memory capsules correctly
- Polish can classify at least one richer Studio artifact class
- Final Sync can publish enriched outputs and persist durable publish results
- Brain shows enriched analytics from that workflow

## Known blockers at track creation

- none

## Replan triggers

- source-linked extraction cannot fit current bundle contract safely
- richer Studio artifacts cannot be normalized into durable publish results
- analytics expansion requires schema growth larger than this bounded track allows
- UI Production System work creates a hard conflict on the same visible surfaces
