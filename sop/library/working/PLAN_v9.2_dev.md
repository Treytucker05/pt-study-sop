# PT Study SOP - v9.2-dev Planning Log (2025-12-05)

Purpose
- Keep v9.1 stable for testing; stage all changes in `working/v9.2-dev` before promotion.
- Capture learnings from 9.1 sessions and decide, track, and verify changes to engines/modules.

Guardrails
- Do not edit `releases/v9.1/` or root production files until promotion.
- Every change must map to a testable hypothesis and a measurable metric.
- Promote to `releases/v9.2/` only after experiments pass and the bundle builds cleanly.

Recent evidence (2025-12-05 logs)
- Sessions: three on Module 9 (Gluteal/Posterior Thigh); WRAP reached in all; Gated Platter triggered in 2/3; 0 cards created.
- Strengths: visual anchors strong; Sprint MCQ caught pes anserinus miss; lab recognition high.
- Friction: source-lock drift (lab vs written), O/I weighting late, drawing steps too big, no card output, one log missing duration data.

Hypotheses to test (P1)
1) Source-Lock upfront reduces drift: add lab/written flag + checklist at intake; expect fewer off-track notes.
2) Micro-step drawings prevent overwhelm: enforce "one landmark per pass"; expect fewer stalls and faster anchor creation.
3) O/I mini-sprint mid-session improves written readiness: expect fewer late corrections.
4) WRAP must yield cards: require 1-2 cards per weak anchor; expect >=1 card per WRAP and better spaced-review compliance.
5) Least-to-most stall ladder shortens recovery: expect fewer full stalls after Gated Platter triggers.

Planned changes (map to modules/engines)
- Module 3 (new): Triage & Scope with Source-Lock, checklist, timebox, success criteria.
- Module 1/2 (loop): add micro-step drawing rule and O/I cue path; insert micro-quiz cadence.
- Modes: refine time+knowledge heuristics (Diagnostic vs Teaching Sprint vs Core vs Drill), context-refresh cadence, and when to suggest visual stories per course.
- Stall/Recovery engine: Stall Matrix with least-to-most ladder (no-seed, missing checklist, misweighted details).
- Recap/WRAP engine: split Lab vs Written anchors; enforce card creation and next-review tag.
- Cheat Sheet & Commands: add Source-Lock, O/I boost, micro-quiz timing, recap cadence.
- Playbook snippet: Module 9 anchors bank (tongue/snake-tongue/square, pipes/diamond, pes-anserinus hook).
- Bucket research: expand Bucket Menu (Module 6) with course-specific patterns (e.g., spatial, mechanism, compare/contrast, workflow, timeline); test which buckets fit which courses and feed back into Prime defaults.
- Drawing protocol: quality is poor; either fix (better prompts/steps) or disable/opt-in; fall back to text-only shape steps if images fail.

Tooling (dev only)
- `scripts/analyze_logs.py`: validate logs, count anchors/cards/stalls, flag missing fields, emit CSV + text report.
- `scripts/build_release.py`: bundle dev set into `releases/v9.2/` (md + pdf + checksums) when ready.

Experiment backlog
- H01: Source-Lock + checklist at intake -> metric: off-track drift notes per session.
- H02: Micro-step drawings -> metric: stalls during drawing segment.
- H03: O/I mid-sprint -> metric: late O/I corrections needed.
- H04: Forced WRAP cards -> metric: cards per WRAP (target >=1).
- H05: Stall ladder -> metric: time-to-recover from stall (<3 min target).

Next actions
- Import current findings into `TEST_FINDINGS.md` (dev area).
- Draft Module 3, Stall Matrix, Cheat Sheet with the above hypotheses embedded.
- Build log analyzer and run on 2025-12-05 logs to set baselines.
- Keep 9.1 testing separate; do not touch production release files until promotion decision.

## Approved Enhancements (to implement)
- OIANA order + arterial supply per muscle; add artery recall question.
- Web image integration: fetch labeled + unlabeled pairs on request.
- Image recall drill: unlabeled → identify → reveal → card misses.
- Light/Sprint quick modes (short session presets; wraps and card counts as specified).
- Mnemonic command: 3 options post-understanding; avoid homophones unless asked.
- Glossary/micro-dictionary: auto-capture terms per region with 1–2 sentence defs.

## Next Session Checklist
- Implement OIANA update (anatomy-engine): add Arterial Supply step, per-muscle artery field, artery recall question.
- Add web image integration + labeled/unlabeled pair logic (prompts/runtime + anatomy-engine flows).
- Add image recall drill sequence (unlabeled → identify → reveal → card misses) to anatomy flow/wrap.
- Add Light/Sprint quick modes to M5-modes and runtime prompt.
- Add mnemonic command to prompts (3 options after understanding; avoid homophones unless asked).
- Add glossary/micro-dictionary capture to anatomy wrap/summary.
