# SOP Library — Navigation Guide

**Version:** v9.5 | **Owner:** Trey Tucker

This is the canonical source of truth for the PT Study OS. Runtime bundles in `sop/runtime/` are generated artifacts — if anything conflicts, these library files win.

## How to Use This Library

- **New to the system?** Start with `00-overview.md` for the big picture, then `05-session-flow.md` for execution.
- **Need stage contracts and adaptation rules?** Use `17-control-plane.md`.
- **Running a session?** Follow `05-session-flow.md` (M0-M6). Pick your engine from `04-engines.md` or `14-lo-engine.md`.
- **Deploying the Custom GPT?** Use `10-deployment.md` + `13-custom-gpt-system-instructions.md`.
- **Looking for templates?** `09-templates.md` has every fillable form.
- **Checking evidence?** `12-evidence.md` for citations and research backlog.

## File Map

| # | File | Layer | Purpose |
|---|------|-------|---------|
| 00 | [00-overview.md](00-overview.md) | Foundation | System identity, vision, architecture, file map |
| 01 | [01-core-rules.md](01-core-rules.md) | Foundation | Behavioral rules and invariants |
| 02 | [02-learning-cycle.md](02-learning-cycle.md) | Foundation | Control-plane operational flow + PEIRRO compatibility + KWIK micro-loop |
| 03 | [03-frameworks.md](03-frameworks.md) | Execution | H/M/Y/L series frameworks |
| 04 | [04-engines.md](04-engines.md) | Execution | Anatomy Engine + Concept Engine |
| 05 | [05-session-flow.md](05-session-flow.md) | Execution | M0-M6 module sequence |
| 06 | [06-modes.md](06-modes.md) | Execution | Core, Sprint, Light, Quick Sprint, Drill |
| 07 | [07-workload.md](07-workload.md) | Operations | 3+2 rotation, spacing, workload math |
| 08 | [08-logging.md](08-logging.md) | Operations | Logging schema v9.4 (reference) |
| 09 | [09-templates.md](09-templates.md) | Operations | All fillable templates |
| 10 | [10-deployment.md](10-deployment.md) | Operations | Custom GPT deployment + Brain ingestion |
| 11 | [11-examples.md](11-examples.md) | Reference | Command reference + dialogue examples |
| 12 | [12-evidence.md](12-evidence.md) | Reference | Citations, heuristics, research backlog |
| 13 | [13-custom-gpt-system-instructions.md](13-custom-gpt-system-instructions.md) | Reference | GPT system prompt (v9.5) |
| 14 | [14-lo-engine.md](14-lo-engine.md) | Reference | Learning Objective Engine |
| 15 | [15-method-library.md](15-method-library.md) | Reference | Composable Method Library |
| 17 | [17-control-plane.md](17-control-plane.md) | Reference | Control plane gates, adaptation, and deterministic bundles |

## Key Cross-References

- **Wrap output format** (Exit Ticket + Session Ledger): defined in `08-logging.md`, template in `09-templates.md`
- **Source-Lock rule**: canonical in `01-core-rules.md`
- **No Phantom Outputs**: canonical in `01-core-rules.md`
- **Protocol Pack routing**: canonical in `13-custom-gpt-system-instructions.md`
- **Control Plane contracts**: canonical in `17-control-plane.md`
