# PT Study SOP — Repository Organization Audit (updated 2025-12-08)

## Top Gaps

1) **Release packaging still lacks a documented “build from source” path.**
- Current state: `releases/v9.1/` is the entry point; `sop/` is the source. There’s no scripted, repeatable “cut release” step that copies vetted SOP docs and the authoritative Brain assets into a new release folder.
- Impact: risk of drift between `sop/` and packaged release; reproducibility/audit pain.
- Recommendation: add `sop/working/release.sh` (or .ps1) that builds `PT_Study_SOP_vX.Y_ALL.md`, copies needed SOP files and a clean Brain (schema + empty data/output/logs) into `releases/vX.Y/`, and updates README links. Keep a short `RELEASING.md` checklist.

2) **Automated checks are not in the quick-start/release flow.**
- Current state: pytest lives in `brain/tests/` (ingest/trends). Quick start/release docs don’t tell users to run it.
- Impact: schema/ingest regressions could ship.
- Recommendation: add “Run `python -m pytest brain/tests`” to Quick Start and release checklist; optionally include a one-command smoke test in the release bundle.

## Next Actions
1. Add release script + `RELEASING.md` describing inputs (sop/, brain/) and outputs (releases/vX.Y/).
2. Add test step to README/Release docs; consider a minimal smoke test command for end users.
