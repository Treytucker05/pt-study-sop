PT Study SOP v9.2 (development)

Contents:
- GPT-INSTRUCTIONS.md
- PT_Study_SOP_v9.2_DEV.md (combined bundle, WIP)
- gpt-knowledge/ (upload set: MASTER, runtime-prompt, H/M/Y-series, modules M0–M6, anatomy-engine, concept-engine)

How to use (dev flight):
1) Copy GPT-INSTRUCTIONS.md into CustomGPT.
2) Upload gpt-knowledge/ files or the combined bundle.
3) From repo root, run `python brain/db_setup.py`, then `python -m pytest brain/tests`.
4) Run dashboard (optional): `python brain/dashboard.py` or `Run_Brain_All.bat`.

Notes:
- Staging bundle; content will change during v9.2 development.
- Keep `releases/v9.1/` untouched until promotion.
- Last updated: 2025-12-08 18:12 (dev bundle).

What changed in v9.2 (dev)
- OIANA+ adds Arterial Supply step and artery recall question.
- Light (10–15 min) and Quick Sprint (20–30 min) presets with wrap card quotas.
- Mnemonic command (3 options after understanding; avoid homophones unless asked).
- Manual image drill flow (unlabeled → identify → reveal; misses → cards); live fetch deferred.
- Glossary capture in Wrap (1–2 sentence defs per region).
- Runtime prompt and modules M0/M2/M3/M4/M5/M6 updated; anatomy engine updated.
- Process corrections: Word+Meaning before imagery, Jim Kwik Sound→Function→Image→Lock, one-step gating with resonance confirmation, function-first ordering, mandatory resonance check; Seed-Lock now requires resonance confirmation.
- Added concept-engine (non-anatomy default), /fade scaffolding, glossary scan, role-switching, calibration check.
- Added expanded H-series (H1–H8), M-series (M2/M6/M8 + M-SRL/ADDIE/STAR), and Y-series (Y1–Y4).
- Combined bundle regenerated: PT_Study_SOP_v9.2_DEV.md.
- Tests: `python -m pytest brain/tests` (pass).

